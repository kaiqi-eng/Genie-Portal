const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User');
require('dotenv').config();

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findByPk(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        // Check if user exists
        let user = await User.findOne({ where: { googleId: profile.id } });

        if (user) {
          return done(null, user);
        }

        // Check if this is the first user (make them admin)
        const userCount = await User.count();
        const isFirstUser = userCount === 0;

        // Create new user
        user = await User.create({
          googleId: profile.id,
          email: profile.emails[0].value,
          name: profile.displayName,
          picture: profile.photos[0]?.value || null,
          isApproved: isFirstUser, // First user is auto-approved
          isAdmin: isFirstUser,    // First user is auto-admin
        });

        return done(null, user);
      } catch (error) {
        return done(error, null);
      }
    }
  )
);

module.exports = passport;
