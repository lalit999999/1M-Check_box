import session from 'express-session';
import RedisStore from 'connect-redis';
import { RedisClient } from '../redish/redis-connection.js';

export const sessionMiddleware = session({
    store: new RedisStore({ client: RedisClient }),
    secret: process.env.SESSION_SECRET || 'dev-secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        sameSite: 'lax'
    }
});
