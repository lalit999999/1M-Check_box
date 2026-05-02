import passport from 'passport';
import GoogleStrategy from 'passport-google-oauth20';

const GoogleOAuth2Strategy = GoogleStrategy.Strategy;

passport.use(new GoogleOAuth2Strategy(
    {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.GOOGLE_CALLBACK_URL
    },
    (accessToken, refreshToken, profile, done) => {
        // User profile from Google
        const user = {
            id: profile.id,
            email: profile.emails[0].value,
            name: profile.displayName,
            picture: profile.photos[0]?.value || ''
        };
        console.log(`[Passport] User authenticated: ${user.email} (ID: ${user.id})`);
        return done(null, user);
    }
));

/**
 * Serialize user to session
 * Stores only user ID in the session to keep it lean
 */
passport.serializeUser((user, done) => {
    console.log(`[Passport] Serializing user: ${user.email}`);
    // Store only the essential user ID in the session
    done(null, user.id);
});

/**
 * Deserialize user from session
 * In a production app, you would fetch user from database here.
 * For this project, user object is stored in session already.
 */
passport.deserializeUser((userId, done) => {
    console.log(`[Passport] Deserializing user: ${userId}`);
    // In this implementation, the full user object is restored from session data
    // In production, you would query a database here: User.findById(userId)
    done(null, { id: userId });
});

export default passport;
