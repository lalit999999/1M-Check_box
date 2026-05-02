import Redis from "ioredis";

function parseRedisUrl() {
    const url = process.env.REDIS_CONNECT_URL || 'redis://127.0.0.1:6379';
    try {
        const parts = url.split(':');
        const host = parts[1].replace('//', '');
        const port = parseInt(parts[2], 10);
        return { host, port };
    } catch (e) {
        return { host: '127.0.0.1', port: 6379 };
    }
}

function createRedisConnection() {
    const { host, port } = parseRedisUrl();
    const redis = new Redis({
        host,
        port,
        // reduce noisy reconnect attempts in dev; adjust in production
        maxRetriesPerRequest: 5,
        enableOfflineQueue: true,
    });

    // Attach handlers to avoid unhandled error events
    redis.on('error', (err) => {
        console.error('[ioredis] error connecting to redis:', err.message || err);
    });
    redis.on('connect', () => {
        console.log('[ioredis] connecting to redis', host + ':' + port);
    });
    redis.on('ready', () => {
        console.log('[ioredis] redis ready', host + ':' + port);
    });

    return redis;
}

export const RedisClient = createRedisConnection();
export const publisher = createRedisConnection();
export const subscriber = createRedisConnection();
