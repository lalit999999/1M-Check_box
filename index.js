import http from 'node:http';
import path from 'node:path';
import express from 'express';
import { Server } from 'socket.io';


async function main() {

    const app = express();
    const server = http.createServer(app);


    const io = new Server();
    io.attach(server);

    io.on('connection', (socket) => {
        console.log(`Socket connected`, { id: socket.id });

        socket.on('client:checkbox:change', (data) => {
            console.log(`Received checkbox change from client ${socket.id}:`, data);
            io.emit('server:checkbox:update', { id: socket.id, ...data });
        });
    });


    // Express handlers
    app.use(express.static(path.resolve('./public')));

    app.get('/health', (req, res) => {
        res.json({ healthy: true });
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