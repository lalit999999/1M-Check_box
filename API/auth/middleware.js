// Middleware to check if user is authenticated for HTTP routes
export const isAuthenticated = (req, res, next) => {
    if (req.isAuthenticated?.() && req.user) {
        return next();
    }

    return res.status(401).json({
        error: 'Unauthorized. Please login first.',
    });
};

/**
 * Socket.IO middleware to handle authentication
 * Allows both authenticated and anonymous (read-only) connections
 * - Authenticated users: full access
 * - Anonymous users: read-only access (can receive updates but cannot make changes)
 */
export const requireSocketAuth = (socket, next) => {
    const request = socket.request;
    const authenticated = Boolean(request?.isAuthenticated?.() && request.user);

    if (authenticated) {
        socket.data.user = request.user;
        socket.data.isReadOnly = false;
        console.log(`[SocketAuth] Authenticated user connected: ${request.user.email}`);
    } else {
        // Allow anonymous connections but mark as read-only
        socket.data.user = null;
        socket.data.isReadOnly = true;
        console.log(`[SocketAuth] Anonymous user connected (read-only mode)`);
    }

    return next();
};

export const getSocketUser = (socket) => socket.data?.user ?? socket.request?.user ?? null;

export const isSocketReadOnly = (socket) => socket.data?.isReadOnly ?? true;
