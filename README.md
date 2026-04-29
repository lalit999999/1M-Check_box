# 1M Check_box

A real-time checkbox synchronization app built with Node.js, Express, Socket.IO, and Redis-compatible storage. The app renders 100 checkboxes in the browser and syncs changes instantly across connected clients.

## Overview

This project demonstrates:

- real-time communication with Socket.IO
- shared state persistence with Redis/Valkey
- Pub/Sub messaging for multi-instance syncing
- a simple frontend built with plain HTML, CSS, and JavaScript

## Features

- 100 checkboxes rendered on page load
- instant sync across all connected clients
- Redis persistence for checkbox state
- Pub/Sub broadcasting between server instances
- server-side rate limiting
- `/health` and `/checkboxes` HTTP endpoints
- clean, dependency-light frontend

## Tech Stack

| Layer       | Technology                    |
| ----------- | ----------------------------- |
| Backend     | Node.js, Express              |
| Real-time   | Socket.IO                     |
| Storage     | Redis / Valkey via ioredis    |
| Frontend    | HTML, CSS, Vanilla JavaScript |
| Development | Nodemon                       |

## Project Structure

```text
1Mcheck_box/
├── index.js
├── package.json
├── package-lock.json
├── docker-compose.yml
├── .env
├── .env.example
├── .gitignore
├── README.md
├── public/
│   ├── index.html
│   ├── clientjs.js
│   └── style.css
└── redish/
    └── redis-connection.js
```

## Prerequisites

Install the following before running the project:

- Node.js 16 or newer
- npm
- Redis or Valkey running on port `6379`

Check your versions:

```bash
node --version
npm --version
```

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Create your environment file

```bash
cp .env.example .env
```

Then set the Redis connection string and, optionally, the port:

```env
REDIS_CONNECT_URL=redis://localhost:6379
PORT=3300
```

> If `PORT` is not set, the server falls back to `3300`.

### 3. Start Redis / Valkey

You can run it locally or with Docker:

```bash
redis-server
```

or

```bash
docker compose up -d
```

## Run the app

### Development mode

```bash
npm run dev
```

### Production mode

```bash
npm start
```

Open the app in your browser:

```text
http://localhost:3300
```

If you changed `PORT`, use that value instead.

## How it works

1. The browser loads `public/index.html`.
2. `clientjs.js` requests the current checkbox state from `GET /checkboxes`.
3. When a checkbox changes, the client emits `client:checkbox:change`.
4. The server updates in-memory state and saves it to Redis.
5. The server broadcasts `server:checkbox:update` to all connected clients.
6. A Redis Pub/Sub message keeps other server instances in sync.

## API

### HTTP endpoints

| Method | Route         | Description                        |
| ------ | ------------- | ---------------------------------- |
| `GET`  | `/health`     | Returns `{ healthy: true }`        |
| `GET`  | `/checkboxes` | Returns the current checkbox array |

### Socket.IO events

| Direction       | Event                    | Payload                  | Purpose                          |
| --------------- | ------------------------ | ------------------------ | -------------------------------- |
| Client → Server | `client:checkbox:change` | `{ index, checked }`     | Update a checkbox                |
| Server → Client | `server:checkbox:update` | `{ id, index, checked }` | Broadcast a state change         |
| Server → Client | `server:error`           | `{ error }`              | Show rate-limit or server errors |

### Redis / Pub/Sub

| Item            | Value                              |
| --------------- | ---------------------------------- |
| State key       | `checkbox-state`                   |
| Pub/Sub channel | `internal-server:checkbox:changes` |

## Current behavior

- The server initializes **100** checkboxes.
- Checkbox state is stored in Redis under `checkbox-state`.
- Rate limiting blocks repeated changes from the same socket if they happen within **1 second**.
- The frontend displays a live timer and error alerts.

## Troubleshooting

### Redis connection errors

If the app logs connection problems, make sure Redis/Valkey is running and `REDIS_CONNECT_URL` is correct.

### Empty checkbox list

Check that:

- the server is running
- `/checkboxes` returns data
- the browser can load `/socket.io/socket.io.js`

### Port already in use

If the server fails to start, another process may already be using the selected port.

### State not syncing

Make sure all clients are connected to the same running server and that Redis Pub/Sub is available.

## Notes

- This project uses plain HTML and JavaScript rather than a frontend framework.
- Redis connection files are kept inside the `redish/` folder.
- `docker-compose.yml` starts a Valkey container for local development.

## License

This project is for educational use.

Happy coding... 🙏
