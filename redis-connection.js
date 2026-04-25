import redis from 'redis';

const REDIS_HOST = process.env.REDIS_HOST || 'localhost';
const REDIS_PORT = process.env.REDIS_PORT || 6379;

const subscriber = redis.createClient({
    host: REDIS_HOST,
    port: REDIS_PORT
});

const publisher = redis.createClient({
    host: REDIS_HOST,
    port: REDIS_PORT
});

subscriber.on('error', (err) => console.log('Redis Subscriber Error: ', err));
publisher.on('error', (err) => console.log('Redis Publisher Error: ', err));

export const subscribeToCheckboxChanges = async (callback) => {
    await subscriber.subscribe('internal-server:checkbox:change', (message) => {
        callback(JSON.parse(message));
    });
};

export const publishCheckboxChange = async (data) => {
    await publisher.publish('internal-server:checkbox:change', JSON.stringify(data));
};

export const connectRedis = async () => {
    await subscriber.connect();
    await publisher.connect();
    console.log('Connected to Redis');
};

export const disconnectRedis = async () => {
    await subscriber.disconnect();
    await publisher.disconnect();
    console.log('Disconnected from Redis');
};
