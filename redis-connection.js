import Redis from "ioredis";

function createRedisConnection() {
    const redis = new Redis({
        host: process.env.REDIS_CONNECT_URL?.split(':')[1].replace('//', '') || 'localhost',
        port: parseInt(process.env.REDIS_CONNECT_URL?.split(':')[2]) || 6379,
    });

    return redis;
}

export const RedisClient = createRedisConnection();
export const publisher = createRedisConnection();
export const subscriber = createRedisConnection();
