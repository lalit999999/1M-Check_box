import { RedisClient } from '../redish/redis-connection.js';

/**
 * Redis-based Rate Limiter
 * Implements rate limiting using Redis with TTL for scalability
 * Supports multiple strategies: by user ID, by IP address, or combined
 */

const RATE_LIMIT_PREFIX = 'ratelimit:';

/**
 * Rate limit configuration
 */
const LIMITS = {
    // Checkbox update: 1 action per second per user
    checkbox_update: {
        maxRequests: 1,
        windowSeconds: 1,
    },
    // HTTP API calls: 30 requests per minute per IP
    http_api: {
        maxRequests: 30,
        windowSeconds: 60,
    },
    // Auth attempts: 5 failed attempts per 15 minutes per IP
    auth_attempt: {
        maxRequests: 5,
        windowSeconds: 900,
    },
};

/**
 * Check if a request/action is rate limited
 * @param {string} identifier - Unique key (user ID, IP, session ID, etc.)
 * @param {string} limitType - Type of limit to apply (checkbox_update, http_api, auth_attempt)
 * @returns {Promise<{isLimited: boolean, remaining: number, resetIn: number}>}
 */
export const checkRateLimit = async (identifier, limitType = 'checkbox_update') => {
    try {
        if (!identifier || !LIMITS[limitType]) {
            return { isLimited: false, remaining: Infinity, resetIn: 0 };
        }

        const limit = LIMITS[limitType];
        const key = `${RATE_LIMIT_PREFIX}${limitType}:${identifier}`;

        // Get current count
        const currentCount = await RedisClient.get(key);
        const count = currentCount ? parseInt(currentCount, 10) : 0;

        // Check if limit exceeded
        if (count >= limit.maxRequests) {
            const ttl = await RedisClient.ttl(key);
            return {
                isLimited: true,
                remaining: 0,
                resetIn: Math.max(ttl, 0),
            };
        }

        // Increment counter
        const newCount = count + 1;
        const ttl = await RedisClient.ttl(key);

        if (ttl === -1) {
            // Key exists but has no expiration, set it now
            await RedisClient.setex(key, limit.windowSeconds, newCount.toString());
        } else if (ttl === -2 || ttl === 0) {
            // Key doesn't exist, create it
            await RedisClient.setex(key, limit.windowSeconds, newCount.toString());
        } else {
            // Key exists with TTL, just increment
            await RedisClient.incr(key);
        }

        return {
            isLimited: false,
            remaining: Math.max(limit.maxRequests - newCount, 0),
            resetIn: limit.windowSeconds,
        };
    } catch (err) {
        console.error('[RateLimit] Error checking rate limit:', err.message || err);
        // On Redis error, allow the request but log it
        return { isLimited: false, remaining: Infinity, resetIn: 0 };
    }
};

/**
 * Middleware for Express routes
 * Checks rate limit based on user ID (if authenticated) or IP address
 */
export const rateLimitMiddleware = (limitType = 'http_api') => {
    return async (req, res, next) => {
        try {
            // Get identifier: user ID if authenticated, otherwise IP address
            const identifier = req.user?.id || req.ip || req.connection.remoteAddress || 'unknown';

            const result = await checkRateLimit(identifier, limitType);

            // Add rate limit info to response headers
            res.set('X-RateLimit-Remaining', result.remaining.toString());
            res.set('X-RateLimit-Reset', result.resetIn.toString());

            if (result.isLimited) {
                console.warn(`[RateLimit] Rate limit exceeded for ${identifier} (${limitType})`);
                return res.status(429).json({
                    error: 'Rate limit exceeded',
                    detail: `Too many requests. Please try again in ${result.resetIn} seconds.`,
                    resetIn: result.resetIn,
                });
            }

            next();
        } catch (err) {
            console.error('[RateLimit] Middleware error:', err.message || err);
            next();
        }
    };
};

/**
 * Check rate limit for WebSocket events
 * @param {Object} socket - Socket.IO socket object
 * @param {string} limitType - Type of limit to apply
 * @returns {Promise<{allowed: boolean, remaining: number, resetIn: number}>}
 */
export const checkSocketRateLimit = async (socket, limitType = 'checkbox_update') => {
    try {
        const user = socket.data?.user || socket.request?.user;
        const socketId = socket.id;

        // Use user ID if authenticated, otherwise socket ID
        const identifier = user?.id || socketId;

        const result = await checkRateLimit(identifier, limitType);

        return {
            allowed: !result.isLimited,
            remaining: result.remaining,
            resetIn: result.resetIn,
        };
    } catch (err) {
        console.error('[RateLimit] Socket rate limit error:', err.message || err);
        return { allowed: true, remaining: Infinity, resetIn: 0 };
    }
};

/**
 * Reset rate limit for a specific identifier
 * Useful for admin operations or after user logout
 */
export const resetRateLimit = async (identifier, limitType = 'checkbox_update') => {
    try {
        const key = `${RATE_LIMIT_PREFIX}${limitType}:${identifier}`;
        await RedisClient.del(key);
        console.log(`[RateLimit] Reset limit for ${identifier} (${limitType})`);
    } catch (err) {
        console.error('[RateLimit] Error resetting rate limit:', err.message || err);
    }
};

export default {
    checkRateLimit,
    rateLimitMiddleware,
    checkSocketRateLimit,
    resetRateLimit,
    LIMITS,
};
