import Redis from 'ioredis';

const REDIS_HOST = process.env.REDIS_HOST || 'localhost';
const REDIS_PORT = process.env.REDIS_PORT || 6379;

function createRedisConnection() {
    return new Redis({
        host: REDIS_HOST,
        port: REDIS_PORT
    });
}

export const redis = createRedisConnection();
export const publisher = createRedisConnection();
export const subscriber = createRedisConnection();

// Error handlers
subscriber.on('error', (err) => console.log('Redis Subscriber Error: ', err));
publisher.on('error', (err) => console.log('Redis Publisher Error: ', err));

export const connectRedis = async () => {
    try {
        await subscriber.connect();
        await publisher.connect();
        console.log('Connected to Redis');
    } catch (err) {
        console.error('Failed to connect to Redis:', err);
        process.exit(1);
    }
};

export const subscribeToCheckboxChanges = async (callback) => {
    await subscriber.subscribe('internal-server:checkbox:change', (err) => {
        if (err) {
            console.error('Failed to subscribe:', err);
        } else {
            console.log('Subscribed to internal-server:checkbox:change channel');
        }
    });

    subscriber.on('message', (channel, message) => {
        if (channel === 'internal-server:checkbox:change') {
            callback(JSON.parse(message));
        }
    });
};

export const publishCheckboxChange = async (data) => {
    try {
        await publisher.publish('internal-server:checkbox:change', JSON.stringify(data));
    } catch (err) {
        console.error('Failed to publish message:', err);
    }
};

export const disconnectRedis = async () => {
    try {
        await subscriber.disconnect();
        await publisher.disconnect();
        console.log('Disconnected from Redis');
    } catch (err) {
        console.error('Error disconnecting from Redis:', err);
    }
};
