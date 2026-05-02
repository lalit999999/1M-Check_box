import express from 'express';
import passport from 'passport';

const router = express.Router();

// Google OAuth login route
router.get('/google',
    passport.authenticate('google', { scope: ['profile', 'email'] })
);

// Google OAuth callback
router.get('/google/callback',
    passport.authenticate('google', { failureRedirect: '/?auth=failed' }),
    (req, res) => {
        // Successful authentication, redirect to home
        res.redirect('/?auth=success');
    }
);

// Logout route
router.get('/logout', (req, res) => {
    req.logout((err) => {
        if (err) {
            return res.status(500).json({ error: 'Logout failed' });
        }
        res.redirect('/');
    });
});

// Get current user info
router.get('/me', (req, res) => {
    if (req.isAuthenticated?.()) {
        return res.json({ user: req.user, authenticated: true });
    }
    res.json({ authenticated: false });
});

export default router;
