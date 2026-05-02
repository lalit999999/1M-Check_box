// Middleware to check if user is authenticated
export const isAuthenticated = (req, res, next) => {
    if (req.isAuthenticated?.()) {
        return next();
    }
    res.status(401).json({ error: 'Unauthorized. Please login first.' });
};

// Middleware for optional authentication (for WebSocket)
export const checkAuth = (req, res, next) => {
    if (req.isAuthenticated?.()) {
        req.user = req.user;
    }
    next();
};
