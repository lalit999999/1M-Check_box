import http from 'node:http';
import path from 'node:path';
import express from 'express';
import { Server } from 'socket.io';
import { connectRedis, subscribeToCheckboxChanges, publishCheckboxChange } from './redis-connection.js';

const CHECKBOX_COUNT = 100;
const state = {
    checkboxes: new Array(CHECKBOX_COUNT).fill(false)
};

async function main() {
    // Connect to Redis
    await connectRedis();

    const app = express();
    const server = http.createServer(app);
    const io = new Server();
    io.attach(server);

    // Subscribe to Redis pub/sub for checkbox changes from other servers
    await subscribeToCheckboxChanges((data) => {
        console.log(`[Redis]:checkbox:change`, data);

        // Update the in-memory state
        state.checkboxes[data.index] = data.checked;

        // Broadcast to all clients on this server
        io.emit('server:checkbox:change', data);
    });

    // Socket IO Handler
    io.on('connection', (socket) => {
        console.log(`Socket connected`, { id: socket.id });

        // Send initial state to newly connected client
        socket.emit('server:checkbox:initial', state.checkboxes);

        socket.on('client:checkbox:change', async (data) => {
            console.log(`[Socket:${socket.id}]:client:checkbox:change`, data);

            // Update the in-memory state
            state.checkboxes[data.index] = data.checked;

            // Publish to Redis so other servers get the update
            await publishCheckboxChange(data);

            // Broadcast to all connected clients on this server
            io.emit('server:checkbox:change', data);
        });

        socket.on('disconnect', () => {
            console.log(`Socket disconnected`, { id: socket.id });
        });
    });

    // Express handlers
    app.use(express.static(path.resolve('./public')));

    app.get('/health', (req, res) => {
        res.json({ healthy: true });
    });

    app.get('/checkboxes', (req, res) => {
        res.json({ checkboxes: state.checkboxes });
    });

    const port = process.env.PORT ?? 8000;

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