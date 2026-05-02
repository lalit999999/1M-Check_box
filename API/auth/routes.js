import express from 'express';
import passport from 'passport';
import { storeSessionData, deleteSessionData, getAllActiveSessions } from '../config/sessionManager.js';

const router = express.Router();

// Google OAuth login route
router.get('/google',
    passport.authenticate('google', { scope: ['profile', 'email'] })
);

// Google OAuth callback
router.get('/google/callback',
    passport.authenticate('google', { failureRedirect: '/?auth=failed' }),
    async (req, res) => {
        try {
            // Store comprehensive session data after successful authentication
            const sessionId = req.sessionID;
            const user = req.user;

            if (sessionId && user) {
                await storeSessionData(sessionId, user);
                console.log(`[Auth] Session established for user ${user.email}`);
            }

            // Make sure the session is persisted before redirecting back home.
            req.session.save((saveErr) => {
                if (saveErr) {
                    console.error('[Auth] Session save error:', saveErr.message || saveErr);
                    return res.redirect('/?auth=failed');
                }

                // Successful authentication, redirect to home
                res.redirect('/?auth=success');
            });
        } catch (err) {
            console.error('[Auth] Error in callback:', err.message || err);
            res.redirect('/?auth=failed');
        }
    }
);

/**
 * Logout route
 * Destroys session and removes user session data
 */
router.get('/logout', async (req, res) => {
    try {
        const sessionId = req.sessionID;
        const userEmail = req.user?.email || 'unknown';

        console.log(`[Auth] Logout initiated for user ${userEmail}`);

        // Delete session data from Redis
        if (sessionId) {
            await deleteSessionData(sessionId);
        }

        // Destroy the session
        req.logout((err) => {
            if (err) {
                console.error('[Auth] Logout error:', err.message || err);
                return res.status(500).json({ error: 'Logout failed' });
            }

            // Clear session cookie
            req.session.destroy((destroyErr) => {
                if (destroyErr) {
                    console.error('[Auth] Session destroy error:', destroyErr.message || destroyErr);
                }

                console.log(`[Auth] User logged out: ${userEmail}`);
                res.redirect('/');
            });
        });
    } catch (err) {
        console.error('[Auth] Error during logout:', err.message || err);
        res.status(500).json({ error: 'Logout failed' });
    }
});

/**
 * Get current user info
 * Returns authenticated user information
 */
router.get('/me', (req, res) => {
    if (req.isAuthenticated?.() && req.user) {
        return res.json({
            user: req.user,
            authenticated: true,
            sessionId: req.sessionID
        });
    }
    res.json({ authenticated: false });
});

/**
 * Get active sessions (admin only in production)
 * Returns list of all currently active sessions
 */
router.get('/sessions', async (req, res) => {
    try {
        const sessions = await getAllActiveSessions();
        const count = sessions.length;

        res.json({
            activeSessionCount: count,
            sessions: sessions.map(s => ({
                sessionId: s.sessionId.substring(0, 10) + '...',
                email: s.email,
                name: s.name,
                loginTime: s.loginTime,
                lastActivity: s.lastActivity
            }))
        });
    } catch (err) {
        console.error('[Auth] Error getting sessions:', err.message || err);
        res.status(500).json({ error: 'Failed to fetch sessions' });
    }
});

export default router;
