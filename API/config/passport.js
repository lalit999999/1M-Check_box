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
        return done(null, user);
    }
));

// Serialize user to session
passport.serializeUser((user, done) => {
    done(null, user);
});

// Deserialize user from session
passport.deserializeUser((user, done) => {
    done(null, user);
});

export default passport;
