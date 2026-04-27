import http from 'node:http';
import path from 'node:path';
import express from 'express';
import { Server } from 'socket.io';
import { publisher, subscriber, RedisClient } from './redis-connection.js';

const CHECKBOX_COUNT = 100;
const CHECKBOX_STATE_KEY = 'checkbox-state';
const state = {
    checkboxes: Array(CHECKBOX_COUNT).fill(false),
}

// rate limiting 
const rateLimitMap = new Map();

async function main() {

    const app = express();
    const server = http.createServer(app);


    const io = new Server();
    io.attach(server);
    await subscriber.subscribe('internal-server:checkbox:changes');
    subscriber.on('message', (channel, message) => {
        if (channel === 'internal-server:checkbox:changes') {
            const data = JSON.parse(message);
            console.log(`Received checkbox change from Redis:`, data);
            state.checkboxes[data.index] = data.checked;
            io.emit('server:checkbox:update', { id: data.id, ...data });
        }
    });
    io.on('connection', (socket) => {
        console.log(`Socket connected`, { id: socket.id });

        socket.on('client:checkbox:change', async (data) => {
            console.log(`Received checkbox change from client ${socket.id}:`, data);

            const lastOperationTime = rateLimitMap.get(socket.id);
            console.log(`Last operation time for ${socket.id}:`, lastOperationTime);

            if (lastOperationTime) {
                const timeElepsed = Date.now() - lastOperationTime;
                console.log(`Time elapsed: ${timeElepsed}ms`);

                if (timeElepsed < 5 * 1000) {
                    console.warn(`Rate limit exceeded for socket ${socket.id}. Time elapsed: ${timeElepsed}ms (< 5000ms)`);
                    console.log(`Sending error event to client`);
                    socket.emit('server:error', { error: 'Rate limit exceeded. Please wait before making another change.' });
                    return;
                }
            }
            rateLimitMap.set(socket.id, Date.now());
            console.log(`Rate limit time set for ${socket.id}`);

            state.checkboxes[data.index] = data.checked;

            await RedisClient.set(CHECKBOX_STATE_KEY, JSON.stringify(state.checkboxes));
            io.emit('server:checkbox:update', { id: socket.id, ...data });

            publisher.publish('internal-server:checkbox:changes', JSON.stringify({ id: socket.id, ...data }));
        });
    });


    // Express handlers
    app.use(express.static(path.resolve('./public')));

    app.get('/health', (req, res) => {
        res.json({ healthy: true });
    });
    app.get('/checkboxes', async (req, res) => {
        const existingState = await RedisClient.get(CHECKBOX_STATE_KEY);
        if (existingState) {
            const remotedata = JSON.parse(existingState);
            res.json({ checkboxes: remotedata });
        } else {
            res.json({ checkboxes: state.checkboxes });
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