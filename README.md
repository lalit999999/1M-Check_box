# Real-Time Checkbox App with Redis Pub/Sub

A scalable real-time checkbox synchronization system using Node.js, Express, Socket.IO, and Redis.

## Architecture

The system uses Redis Pub/Sub to synchronize checkbox states across multiple server instances:

```
Client 1 (Browser) ---> Server 1 ---> Redis Pub/Sub ---> Server 2 ---> Client 2 (Browser)
                        |                                  |
                        Socket.IO                          Socket.IO
```

## Features

✅ Real-time checkbox synchronization across multiple clients
✅ Multi-server support via Redis Pub/Sub
✅ Horizontal scalability
✅ In-memory state management
✅ RESTful API endpoints
✅ Docker containerization
✅ Health checks and error handling

## Installation

### Local Development (without Docker)

1. **Install dependencies:**

   ```bash
   npm install
   ```

2. **Start Redis server** (requires Redis installed):

   ```bash
   redis-server
   ```

3. **Start the application:**

   ```bash
   npm run dev
   ```

   Or for production:

   ```bash
   npm start
   ```

### Using Docker Compose

```bash
docker-compose up
```

This starts both Redis and the Node.js server.

## Environment Variables

- `REDIS_HOST`: Redis server hostname (default: `localhost`)
- `REDIS_PORT`: Redis server port (default: `6379`)
- `PORT`: Server port (default: `8000`)

## API Endpoints

- `GET /health` - Health check
- `GET /checkboxes` - Get all checkbox states
- Static files served from `/public` folder

## Socket.IO Events

### Client to Server

- `client:checkbox:change` - Emit when checkbox is toggled
  ```javascript
  { index: 0, checked: true }
  ```

### Server to Client

- `server:checkbox:initial` - Initial checkbox states on connect
- `server:checkbox:change` - Broadcast checkbox change updates

## Project Structure

```
.
├── index.js                 # Main application
├── redis-connection.js      # Redis pub/sub setup
├── public/
│   └── index.html          # Frontend
├── package.json
├── Dockerfile
├── docker-compose.yml
└── README.md
```

## How It Works

1. **Socket Connection**: When a client connects, they receive the initial checkbox states
2. **Checkbox Toggle**: Client emits `client:checkbox:change` event
3. **Server Processing**: Server updates its state and publishes to Redis
4. **Redis Pub/Sub**: Message is published to `internal-server:checkbox:change` channel
5. **Other Servers**: All subscribed servers receive and broadcast to their clients
6. **Client Update**: All clients display the updated state in real-time

## Scaling to Multiple Servers

To run multiple server instances:

```bash
# Terminal 1
PORT=8000 npm start

# Terminal 2
PORT=8001 npm start

# Terminal 3
PORT=8002 npm start
```

All instances will sync through Redis automatically!

## Testing

1. Open `http://localhost:8000` in multiple browser tabs/windows
2. Toggle checkboxes in one tab
3. See them update in real-time across all tabs

## Production Deployment

For production deployment:

1. Use a managed Redis service (AWS ElastiCache, Azure Cache, etc.)
2. Set `REDIS_HOST` and `REDIS_PORT` environment variables
3. Deploy containers using Docker/Kubernetes
4. Use a load balancer (Nginx, HAProxy) to distribute traffic

## Performance Considerations

- Current: 100 checkboxes (adjustable via `CHECKBOX_COUNT`)
- For 1M checkboxes: Consider using database persistence instead of in-memory state
- Use Redis Streams for event logging
- Implement state sharding across multiple Redis instances
