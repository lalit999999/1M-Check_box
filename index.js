import 'dotenv/config';
import http from 'node:http';
import path from 'node:path';
import express from 'express';
import { Server } from 'socket.io';
import { publisher, subscriber, RedisClient } from './API/redish/redis-connection.js';
import { sessionMiddleware } from './API/config/session.js';
import passport from './API/config/passport.js';
import authRoutes from './API/auth/routes.js';
import { getSocketUser, isAuthenticated, requireSocketAuth, isSocketReadOnly } from './API/auth/middleware.js';
import { updateSessionActivity } from './API/config/sessionManager.js';
import { checkSocketRateLimit, rateLimitMiddleware } from './API/config/rateLimiter.js';

const CHECKBOX_COUNT = 100;
const CHECKBOX_STATE_KEY = 'checkbox-state';
const state = {
    checkboxes: Array(CHECKBOX_COUNT).fill(false),
}

async function main() {

    const app = express();
    const server = http.createServer(app);

    // Session middleware
    app.use(sessionMiddleware);

    // Passport middleware
    app.use(passport.initialize());
    app.use(passport.session());

    // Socket.IO with session support
    const io = new Server(server, {
        serveClient: true,
        cors: {
            origin: '*',
            methods: ['GET', 'POST']
        }
    });

    // Middleware for socket.io to share sessions
    io.use((socket, next) => {
        sessionMiddleware(socket.request, socket.request.res || {}, (err) => {
            if (err) return next(err);

            passport.initialize()(socket.request, socket.request.res || {}, (err2) => {
                if (err2) return next(err2);

                passport.session()(socket.request, socket.request.res || {}, next);
            });
        });
    });

    // Reject unauthenticated websocket connections before they can subscribe to
    // the checkbox channel.
    io.use(requireSocketAuth);

    try {
        await subscriber.subscribe('internal-server:checkbox:changes');
        subscriber.on('message', (channel, message) => {
            if (channel === 'internal-server:checkbox:changes') {
                const data = JSON.parse(message);
                console.log(`Received checkbox change from Redis:`, data);
                state.checkboxes[data.index] = data.checked;
                io.emit('server:checkbox:update', { id: data.id, ...data });
            }
        });
    } catch (err) {
        console.warn('Redis subscriber.subscribe failed, continuing without pub/sub:', err && err.message ? err.message : err);
    }
    io.on('connection', (socket) => {
        const user = getSocketUser(socket);
        const isReadOnly = isSocketReadOnly(socket);
        const sessionId = socket.request.sessionID;

        console.log(`Socket connected`, {
            id: socket.id,
            authenticated: !!user,
            userId: user?.id,
            email: user?.email,
            sessionId: sessionId,
            readOnly: isReadOnly
        });

        // Check authentication for WebSocket events
        socket.on('client:checkbox:change', async (data) => {
            // Only authenticated users can change checkboxes
            if (isReadOnly || !user) {
                socket.emit('server:error', {
                    error: isReadOnly
                        ? 'Read-only mode: Please login to modify checkboxes.'
                        : 'You must be logged in to modify checkboxes.'
                });
                return;
            }

            // Track session activity
            if (sessionId) {
                await updateSessionActivity(sessionId);
            }

            console.log(`Received checkbox change from user ${user.email} (socket: ${socket.id}):`, data);

            // Check Redis-based rate limit
            const rateLimitResult = await checkSocketRateLimit(socket, 'checkbox_update');
            if (!rateLimitResult.allowed) {
                console.warn(`Rate limit exceeded for user ${user.email}. Reset in ${rateLimitResult.resetIn}s`);
                socket.emit('server:error', {
                    error: `Rate limit exceeded. Please wait ${rateLimitResult.resetIn} seconds.`,
                    resetIn: rateLimitResult.resetIn
                });
                return;
            }

            state.checkboxes[data.index] = data.checked;

            try {
                await RedisClient.set(CHECKBOX_STATE_KEY, JSON.stringify(state.checkboxes));
            } catch (err) {
                console.warn('Failed to persist checkbox state to Redis:', err && err.message ? err.message : err);
            }

            io.emit('server:checkbox:update', { id: socket.id, userId: user.id, ...data });

            try {
                publisher.publish('internal-server:checkbox:changes', JSON.stringify({ id: socket.id, userId: user.id, ...data }));
            } catch (err) {
                console.warn('Failed to publish checkbox change to Redis pub/sub:', err && err.message ? err.message : err);
            }
        });

        // Emit current user info to socket including read-only status
        socket.emit('server:user-info', {
            authenticated: !!user,
            isReadOnly: isReadOnly,
            user: user || null
        });
    });


    // Express handlers
    app.use(express.static(path.resolve('./public')));
    app.use(express.json());

    // Auth routes
    app.use('/auth', authRoutes);

    app.get('/health', (req, res) => {
        res.json({ healthy: true });
    });

    // Protected endpoint - only authenticated users with rate limiting
    app.get('/checkboxes', rateLimitMiddleware('http_api'), isAuthenticated, async (req, res) => {
        const existingState = await RedisClient.get(CHECKBOX_STATE_KEY);
        if (existingState) {
            const remotedata = JSON.parse(existingState);
            res.json({ checkboxes: remotedata });
        } else {
            res.json({ checkboxes: state.checkboxes });
        }
    });

    // Public endpoint - read-only for anonymous users with rate limiting
    app.get('/api/checkboxes/view', rateLimitMiddleware('http_api'), async (req, res) => {
        const existingState = await RedisClient.get(CHECKBOX_STATE_KEY);
        if (existingState) {
            const remotedata = JSON.parse(existingState);
            res.json({ checkboxes: remotedata, readOnly: !req.isAuthenticated?.() });
        } else {
            res.json({ checkboxes: state.checkboxes, readOnly: !req.isAuthenticated?.() });
        }
    });

    const port = process.env.PORT ?? 3300;

    server.on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
            console.error(`Port ${port} is already in use. Please stop other processes or use a different port.`);
            process.exit(1);
        }
        throw err;
    });

    server.listen(port, () => {
        console.log(`Server is listening on port ${port}`);
    });
}

main().catch(err => {
    console.error('Failed to start server:', err);
    process.exit(1);
});




// how many connections can handle a socket server ?

// The number of connections a Socket.IO server can handle depends on various factors, including the server's hardware capabilities, network bandwidth, and the efficiency of the code handling the connections. In general, a well-optimized Socket.IO server can handle thousands of concurrent connections. However, it's essential to monitor performance and scale the server as needed to ensure it can handle the expected load without issues.

// answer is : limited connections 

// scaling a socket server
// 1. vertical scaling: Upgrade the server's hardware (CPU, RAM) to handle more connections.
//2. horizontal scaling: Use a load balancer to distribute incoming connections across multiple server instances.


// websocket are stateful or stateless ?
// WebSockets are stateful. Once a WebSocket connection is established between a client and a server, it remains open and allows for continuous, bidirectional communication. This means that both the client and server can send messages to each other at any time without needing to re-establish the connection, which is a key characteristic of stateful communication.

// is valkey and redis same ?
// No, Valkey and Redis are not the same. Redis is an open-source, in-memory data structure store that can be used as a database, cache, and message broker. It supports various data structures such as strings, hashes, lists, sets, and more. Valkey, on the other hand, is not a widely recognized term in the context of databases or caching systems. It may refer to a specific library or tool that is not as commonly known as Redis.

//can we use valkey here ,it is just testing application for learning purposes?
// Yes, you can use Valkey for testing purposes in your application if it meets your requirements. Valkey is a simple key-value store that can be used for caching or storing data temporarily. If your application does not require the advanced features of Redis and you want a lightweight solution for testing, Valkey can be a suitable choice. Just keep in mind that Valkey may not be as robust or feature-rich as Redis, so it's essential to evaluate its capabilities based on your specific use case.



// User --> Socket.IO --> redis publisher --> redis subscriber --> socket io --> User