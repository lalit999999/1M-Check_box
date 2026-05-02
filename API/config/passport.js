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
 * Store user object in session for this project so UI can directly use
 * name/email/picture from req.user after refresh and OAuth callback.
 */
passport.serializeUser((user, done) => {
    console.log(`[Passport] Serializing user: ${user.email}`);
    done(null, user);
});

/**
 * Deserialize user from session
 * For this project, user object is already in session.
 */
passport.deserializeUser((user, done) => {
    console.log(`[Passport] Deserializing user: ${user?.email || user?.id || 'unknown'}`);
    done(null, user);
});

export default passport;
