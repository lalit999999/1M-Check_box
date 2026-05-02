# Nebula CheckGrid

A real-time collaborative checkbox app built with **Node.js, Express, Socket.IO, Redis, and Google OAuth 2.0**.

It lets authenticated users toggle checkboxes in real time, while anonymous users can open the app in **read-only mode**.

---

## Live Demo

- **Live App:** https://onem-check-box.onrender.com/
- **GitHub Repository:** _add your repo link here_
- **Demo Video:** _add your YouTube unlisted link here_

---

## What This Project Does

Nebula CheckGrid is inspired by the "1 Million Checkboxes" idea, but built as a practical full-stack real-time app for learning and evaluation.

### Main features

- Google login using OAuth 2.0
- Session-based authentication
- Auth-protected HTTP routes
- Auth-protected WebSocket updates
- Redis-backed checkbox state storage
- Redis Pub/Sub for scalable broadcasts
- Custom rate limiting using Redis TTL
- Read-only mode for anonymous visitors
- Responsive, modern UI

---

## Tech Stack

### Frontend

- HTML
- CSS
- JavaScript

### Backend

- Node.js
- Express
- Socket.IO
- Passport.js
- express-session

### Data & Infra

- Redis / Valkey
- Redis Pub/Sub
- connect-redis
- Google OAuth 2.0

---

## Project Structure

```bash
.
├── index.js
├── API/
│   ├── auth/
│   │   ├── middleware.js
│   │   └── routes.js
│   ├── config/
│   │   ├── passport.js
│   │   ├── rateLimiter.js
│   │   ├── session.js
│   │   └── sessionManager.js
│   └── redish/
│       └── redis-connection.js
├── public/
│   ├── clientjs.js
│   ├── index.html
│   ├── login.html
│   └── style.css
├── .env.example
└── docker-compose.yml
```

---

## How It Works

### 1) Authentication

- User clicks **Sign in with Google**
- Passport handles Google OAuth 2.0 login
- On success, the user session is stored in Redis using `express-session` + `connect-redis`
- The session is available to both HTTP routes and Socket.IO connections

### 2) Checkbox State

- Checkbox state is stored in Redis as a shared source of truth
- When a checkbox changes, the server updates Redis and broadcasts the update to all connected clients
- Redis Pub/Sub helps the app stay ready for horizontal scaling later

### 3) WebSockets

- Socket.IO keeps the UI in sync in real time
- Authenticated users can send checkbox change events
- Anonymous users can connect, see updates, but cannot change boxes

### 4) Rate Limiting

- Rate limiting is implemented manually
- Redis stores counters with TTL
- HTTP requests and WebSocket checkbox updates are both protected
- This prevents spam clicks and abusive traffic

---

## Authentication Flow

1. User opens the app
2. If not logged in, they can go to `/login.html`
3. Clicking Google sign-in starts OAuth login
4. Google redirects to the callback URL
5. The app creates a session and stores user info in Redis
6. The app loads the checkbox grid with full access for logged-in users

---

## Read-Only Mode

Anonymous users are allowed to:

- view the checkbox grid
- receive live updates

Anonymous users cannot:

- toggle checkboxes
- send checkbox update events

This keeps the app usable for visitors while still protecting write access.

---

## Rate Limiting Logic

The app uses Redis keys with TTL to track request frequency.

### Strategy

- **Authenticated users:** rate limited by user ID
- **Anonymous users:** rate limited by IP address or socket ID
- **HTTP routes:** limited separately from WebSocket events
- **WebSocket checkbox updates:** one update per short time window

### Why this helps

- prevents spam clicks
- reduces abuse
- avoids unnecessary write load on Redis and Socket.IO

---

## Environment Variables

Create a `.env` file with values like these:

```env
REDIS_CONNECT_URL=redis://localhost:6379
PORT=3301
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=http://localhost:3301/auth/google/callback
SESSION_SECRET=your-session-secret-key
NODE_ENV=development
```

### Important

Make sure `GOOGLE_CALLBACK_URL` matches the same port your app is running on.

---

## How to Run Locally

### 1. Install dependencies

```bash
npm install
```

### 2. Start Redis

You can use Docker:

```bash
docker compose up -d
```

### 3. Start the app

```bash
npm start
```

### 4. Open in browser

- App: `http://localhost:3301`
- Login page: `http://localhost:3301/login.html`

---

## How to Test

### Auth flow

- Open `/login.html`
- Click **Sign in with Google**
- Complete Google login
- You should return to the app as an authenticated user

### Checkbox sync

- Open the app in two browser windows
- Toggle a checkbox in one window
- The other window should update instantly

### Read-only mode

- Open the app in an incognito window
- You should be able to view the grid
- You should not be able to toggle checkboxes

### Rate limiting

- Click a checkbox repeatedly very fast
- The app should block spammy updates with a rate limit message

---

## Key Implementation Notes

### HTTP routes

- `/health` for basic server status
- `/checkboxes` for authenticated access
- `/api/checkboxes/view` for public read-only access

### Socket events

- `client:checkbox:change` from browser to server
- `server:checkbox:update` from server to all clients
- `server:user-info` tells the browser if it is authenticated or read-only

### Redis usage

- checkbox state storage
- session storage
- rate limit counters
- Pub/Sub message broadcasting

---

## What I Learned

This project taught me a lot about how real-time apps are built beyond just "sending messages over sockets".

### Main learnings

- **Authentication matters early**: protecting sockets and routes is part of the core design, not an afterthought.
- **Sessions must be shared**: if HTTP and WebSockets both need user identity, the session strategy must work across both.
- **Redis is more than a cache**: it can store app state, sessions, counters, and Pub/Sub messages.
- **Rate limiting should be intentional**: using TTL and counters gives simple, reliable abuse protection.
- **Read-only fallback improves UX**: anonymous users can still explore the app instead of hitting a dead end.
- **Clean structure helps debugging**: splitting auth, session, rate limiting, and socket logic makes the system much easier to maintain.

---

## Future Improvements

If I had more time, I would add:

- persistent user activity logs
- optimistic UI updates
- better loading states for the grid
- admin dashboard for live usage stats
- stronger distributed rate limiting logic
- support for a larger checkbox dataset

---

## Developer

**Lalit Gujar**  
LinkedIn: https://www.linkedin.com/in/lalitgujar

---

## Submission Checklist

- [x] Real-time checkbox sync
- [x] Google OAuth login
- [x] Redis state storage
- [x] Redis Pub/Sub integration
- [x] Custom rate limiting
- [x] Anonymous read-only mode
- [x] Responsive frontend
- [x] Clear README

---

## Notes

This app is intentionally built as a learning-focused real-time system. It is not production-perfect, but it demonstrates the core ideas of:

- auth
- sessions
- sockets
- Redis
- rate limiting
- user experience

and it does them without too much drama. Which, in software, is already a small victory.
