var passport = require('passport');
var GoogleStrategy = require('passport-google-oauth').OAuth2Strategy;

var GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "-put-your-creadentials-";
var GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || "-put-your-creadentials-";

var users = require('../user');  

var loginRedirect = '/';
var registrationRedirect = '/company';

passport.serializeUser(function(user, done) {
    done(null, user._id);
});
 
passport.deserializeUser(function(id, done) {
    users.findById(id, function(error, user) {
        if(error) {
            done(err);
        } else {
            done(null, user);
        }
    });
    
});

passport.use(new GoogleStrategy({
        clientID: GOOGLE_CLIENT_ID,
        clientSecret: GOOGLE_CLIENT_SECRET,
        callbackURL: 'http://127.0.0.1:1313/oauth2callback',
        passReqToCallback: true
    },
    function(req, accessToken, refreshToken, profile, done) {
        // asynchronous verification, for effect...
        process.nextTick(function () {
            var email = profile.emails[0].value;
            users.findByEmail(email, function(err, user){
                if(err) {
                  return done(null, false);
                } else {
                    console.log(user);
                    console.log(profile);
                    if(user) {
                        user.external = profile; //need to update user, because google data can be changed
                        return done(null, user); 
                    } else {
                        var user = {
                            email: email,
                            external: profile
                        }
                        createUser(user, done);
                    }
                    
                    //Does we really need 'req' object? (Now we have only one button)
                    // if(req.session.redirect_to === loginRedirect) {
                    //     console.log("LOGIN!!!!");
                    // }
                    // if(req.session.redirect_to === registrationRedirect) {
                    //     console.log("REGISTRATION!!!!");
                    // }
                    
                }
            });
        });
      }
));

exports.ensureAuthenticated = function (req, res, next) {
    if (req.isAuthenticated()) { 
        return next(); 
    }
    res.redirect(loginRedirect);
};

exports.logout = function(req, res) {
    req.logout();
    res.redirect(loginRedirect);
};

exports.init = function(app) {
    app.use(passport.initialize());
    app.use(passport.session());

    app.get('/login', function (req, res, next) {
        req.session.redirect_to = loginRedirect;
        passport.authenticate('google', 
            {
                scope: ['https://www.googleapis.com/auth/userinfo.email',
                      'https://www.googleapis.com/auth/userinfo.profile']
            })(req, res, next);
    });

    app.get('/registration', function (req, res, next) {
        req.session.redirect_to = registrationRedirect;
        passport.authenticate('google', 
            {
                scope: ['https://www.googleapis.com/auth/userinfo.email',
                      'https://www.googleapis.com/auth/userinfo.profile']
            })(req, res, next);
    });

    app.get('/oauth2callback', 
        passport.authenticate('google', { failureRedirect: loginRedirect }),
            function(req, res) {
                console.log('Redirect:' + req.session.redirect_to);
                res.redirect(req.session.redirect_to || loginRedirect);
            }
    );
};

//private part
function createUser(user, done) {
    users.save(user, function(err, savedUser){
        if(err) {
            return done(err, false); 
        } else {
            return done(null, user);
        }
    });
}