import { RedisClient } from '../redish/redis-connection.js';

/**
 * Session Manager
 * Handles session lifecycle, tracking, and cleanup
 */

const SESSION_PREFIX = 'session:user:';
const SESSION_ACTIVITY_PREFIX = 'session:activity:';

/**
 * Store user session information with metadata
 */
export const storeSessionData = async (sessionId, user) => {
    try {
        if (!sessionId || !user) return;

        const sessionData = {
            userId: user.id,
            email: user.email,
            name: user.name,
            picture: user.picture || '',
            loginTime: new Date().toISOString(),
            lastActivity: new Date().toISOString(),
        };

        // Store session data in Redis with 24-hour expiration
        const TTL = 24 * 60 * 60; // 24 hours
        await RedisClient.setex(
            `${SESSION_PREFIX}${sessionId}`,
            TTL,
            JSON.stringify(sessionData)
        );

        console.log(`[SessionManager] Session stored: ${sessionId} for user ${user.email}`);
    } catch (err) {
        console.error('[SessionManager] Error storing session:', err.message || err);
    }
};

/**
 * Retrieve user session information
 */
export const getSessionData = async (sessionId) => {
    try {
        if (!sessionId) return null;

        const data = await RedisClient.get(`${SESSION_PREFIX}${sessionId}`);
        return data ? JSON.parse(data) : null;
    } catch (err) {
        console.error('[SessionManager] Error retrieving session:', err.message || err);
        return null;
    }
};

/**
 * Update last activity time for session
 */
export const updateSessionActivity = async (sessionId) => {
    try {
        if (!sessionId) return;

        const sessionKey = `${SESSION_PREFIX}${sessionId}`;
        const sessionData = await RedisClient.get(sessionKey);

        if (sessionData) {
            const parsed = JSON.parse(sessionData);
            parsed.lastActivity = new Date().toISOString();

            // Refresh the TTL on update
            const TTL = 24 * 60 * 60;
            await RedisClient.setex(sessionKey, TTL, JSON.stringify(parsed));
        }
    } catch (err) {
        console.error('[SessionManager] Error updating session activity:', err.message || err);
    }
};

/**
 * Delete session data
 */
export const deleteSessionData = async (sessionId) => {
    try {
        if (!sessionId) return;

        await RedisClient.del(`${SESSION_PREFIX}${sessionId}`);
        console.log(`[SessionManager] Session deleted: ${sessionId}`);
    } catch (err) {
        console.error('[SessionManager] Error deleting session:', err.message || err);
    }
};

/**
 * Get all active sessions
 */
export const getAllActiveSessions = async () => {
    try {
        const keys = await RedisClient.keys(`${SESSION_PREFIX}*`);
        const sessions = [];

        for (const key of keys) {
            const data = await RedisClient.get(key);
            if (data) {
                sessions.push({
                    sessionId: key.replace(SESSION_PREFIX, ''),
                    ...JSON.parse(data),
                });
            }
        }

        return sessions;
    } catch (err) {
        console.error('[SessionManager] Error getting active sessions:', err.message || err);
        return [];
    }
};

/**
 * Get count of active sessions
 */
export const getActiveSessionCount = async () => {
    try {
        const count = await RedisClient.keys(`${SESSION_PREFIX}*`);
        return count.length;
    } catch (err) {
        console.error('[SessionManager] Error counting sessions:', err.message || err);
        return 0;
    }
};

export default {
    storeSessionData,
    getSessionData,
    updateSessionActivity,
    deleteSessionData,
    getAllActiveSessions,
    getActiveSessionCount,
};
