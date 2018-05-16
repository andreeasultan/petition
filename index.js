const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const hb = require("express-handlebars");
const cookies = require("cookies");
const db = require("./db.js");
const bcrypt = require("bcryptjs");
const csurf = require("csurf");

app.engine("handlebars", hb());
app.set("view engine", "handlebars");

app.use(express.static(__dirname + "/public"));

app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());

const cookieSession = require("cookie-session");
//not finished
app.use(
    cookieSession({
        secret: process.env.SESSION_SECRET || require("./secrets").secret,
        maxAge: 1000 * 60 * 60 * 24 * 14
    })
);
app.use(csurf());
//req.session is an object that contains another object called session and stores whatever we put inside of it, i.e. cookies
//we are putting data of the cookie inside of it

//this function saves the hashed password in the database
function hashPassword(plainTextPassword) {
    return new Promise(function(resolve, reject) {
        bcrypt.genSalt(function(err, salt) {
            if (err) {
                return reject(err);
            }
            bcrypt.hash(plainTextPassword, salt, function(err, hash) {
                if (err) {
                    return reject(err);
                }
                resolve(hash);
            });
        });
    });
}

//this function checks if the data that the user passes at login stage
//matches the one saved in the database at registration stage
function checkPassword(textEnteredInLoginForm, hashedPasswordFromDatabase) {
    return new Promise(function(resolve, reject) {
        bcrypt.compare(
            textEnteredInLoginForm,
            hashedPasswordFromDatabase,
            function(err, doesMatch) {
                if (err) {
                    reject(err);
                } else {
                    resolve(doesMatch);
                }
            }
        );
    });
}

//this is a middleware to check if petition is already signed
const checkForSigId = function(req, res, next) {
    if (req.session.signatureID) {
        // res.redirect("/thankyou");
        next();
    } else {
        res.redirect("/petition");
    }
};
//this is a middleware to check if user is logged in
const checkedForLoggedIn = function(req, res, next) {
    if (!req.session.userid) {
        res.redirect("/");
    } else {
        next();
    }
};
//clears the cookies and returns the user to registration page
app.get("/logout", (req, res) => {
    req.session = null;
    res.redirect("/");
});

app.get("/", (req, res) => {
    if (req.session.userid) {
        res.redirect("/petition");
    } else {
        res.render("register", {
            layout: "main",
            csrfToken: req.csrfToken()
        });
    }
});

app.post("/", (req, res) => {
    console.log(req.body);
    if (
        !req.body.first ||
        !req.body.last ||
        !req.body.email ||
        !req.body.password
    ) {
        console.log("what's rong?");
        res.render("register", {
            layout: "main",
            error: true,
            csrfToken: req.csrfToken()
        });
    } else {
        console.log("What's wrong second time?");
        hashPassword(req.body.password)
            .then(hash =>
                db.userRegistration(
                    req.body.first,
                    req.body.last,
                    req.body.email,
                    hash
                )
            )
            .then(results => {
                req.session.userid = results.rows[0].id;
                req.session.first = req.body.first;
                req.session.last = req.body.last;
                req.session.email = req.body.email;
                console.log("registration cookies session", req.session);
                res.redirect("/profile");
            })
            .catch(err => {
                console.log(err);
                res.render("register", {
                    layout: "main",
                    csrfToken: req.csrfToken(),
                    error: true
                });
            });
    }
});

app.get("/profile", checkedForLoggedIn, (req, res) => {
    res.render("profile", {
        layout: "main",
        csrfToken: req.csrfToken()
    });
});

app.post("/profile", checkedForLoggedIn, (req, res) => {
    db.userProfileData(
        req.session.userid,
        req.body.age,
        req.body.city,
        req.body.homepage
    );
    res.redirect("/petition");
});

app.get("/login", (req, res) => {
    if (req.session.userid) {
        res.redirect("/petition");
    } else {
        res.render("login", {
            layout: "main",
            csrfToken: req.csrfToken()
        });
    }
});

app.post("/login", (req, res) => {
    db
        .getUserData(req.body.email)
        .then(results => {
            return checkPassword(
                req.body.password,
                results.rows[0].hashed_password
            ).then(doesMatch => {
                if (doesMatch) {
                    // you should also probably set the sigId here
                    req.session.userid = results.rows[0].id;
                    req.session.first = results.rows[0].first;
                    req.session.last = results.rows[0].last;
                    req.session.email = results.rows[0].email;
                    return db
                        .checkIfPetitionisSigned(req.session.userid)
                        .then(petitionInfo => {
                            if (petitionInfo.rows.length == 0) {
                                res.redirect("/petition");
                            } else {
                                req.session.signatureID =
                                    petitionInfo.rows[0].id;
                                res.redirect("/thankyou");
                            }
                        });
                } else {
                    res.render("login", {
                        layout: "main",
                        csrfToken: req.csrfToken(),
                        error: true
                    });
                }
            });
        })
        .catch(err => {
            console.log(err);
            res.render("login", {
                layout: "main",
                csrfToken: req.csrfToken(),
                error: true
            });
        });
});

app.get("/petition", checkedForLoggedIn, (req, res) => {
    if (req.session.signatureID) {
        res.redirect("/thankyou");
    } else {
        res.render("petition", {
            layout: "main",
            csrfToken: req.csrfToken()
        });
    }
});

app.post("/petition", checkedForLoggedIn, (req, res) => {
    if (!req.body.signature) {
        res.render("petition", {
            layout: "main",
            csrfToken: req.csrfToken(),
            error: true
        });
    } else {
        db
            .signPetition(req.session.userid, req.body.signature)
            .then(results => {
                req.session.signatureID = results.rows[0].id;
                // res.cookie("signed", true); we used this first time to set a simple cookie
                res.redirect("/thankyou");
            })
            .catch(err => {
                console.log(err);
                res.render("petition", {
                    layout: "main",
                    csrfToken: req.csrfToken(),
                    error: true
                });
            });
    }
});

app.get("/thankyou", checkForSigId, checkedForLoggedIn, (req, res) => {
    db.getSigImage(req.session.signatureID).then(sigUrl => {
        db
            .countSigners()
            .then(results => {
                res.render("thankyou", {
                    layout: "main",
                    csrfToken: req.csrfToken(),
                    data: results.rows[0].count,
                    sigUrl: sigUrl.rows[0].signature
                });
            })
            .catch(err => {
                console.log(err);
                res.sendStatus(404);
            });
    });
});

app.get("/profile/edit", checkedForLoggedIn, (req, res) => {
    db.fetchDataToUpdateProfile(req.session.userid).then(results => {
        console.log("this is fetched data", results.rows);
        res.render("edit", {
            layout: "main",
            firstName: results.rows[0].first_name,
            lastName: results.rows[0].last_name,
            email: results.rows[0].email,
            age: results.rows[0].age,
            city: results.rows[0].city,
            homepage: results.rows[0].homepage,
            csrfToken: req.csrfToken()
        });
    });
});

app.post("/profile/edit", checkedForLoggedIn, (req, res) => {
    if (req.body.password) {
        //the user has typed in a new password and we need to hash it and save it
        hashPassword(req.body.password).then(hash => {
            db
                .updateUsersTableWithPassword(
                    req.body.first,
                    req.body.last,
                    req.body.email,
                    hash,
                    req.session.userid
                )
                .then(results => {
                    db
                        .checkForRowInUserProfiles(req.session.userid)
                        .then(results => {
                            if (results === true) {
                                db
                                    .updateUserProfilesTable(
                                        req.body.age,
                                        req.body.city,
                                        req.body.homepage,
                                        req.session.userid
                                    )
                                    .then(() => {
                                        req.session.first = req.body.first;
                                        req.session.last = req.body.last;
                                        req.session.email = req.body.email;
                                        res.redirect("/thankyou");
                                    });
                            }
                        });
                });
        });
    } else {
        console.log("are you updating my password?");
        db
            .updateUsersTableWithoutPassword(
                req.body.first,
                req.body.last,
                req.body.email,
                req.session.userid
            )
            .then(results => {
                db
                    .checkForRowInUserProfiles(req.session.userid)
                    .then(results => {
                        if (results === true) {
                            //update table
                            db
                                .updateUserProfilesTable(
                                    req.body.age,
                                    req.body.city,
                                    req.body.homepage,
                                    req.session.userid
                                )
                                .then(() => {
                                    req.session.first = req.body.first;
                                    req.session.last = req.body.last;
                                    req.session.email = req.body.email;
                                    res.redirect("/thankyou");
                                });
                        } else {
                            //insert into table
                            db
                                .insertIntoUserProfilesTable(
                                    req.session.userid,
                                    req.body.age,
                                    req.body.city,
                                    req.body.homepage
                                )
                                .then(() => {
                                    req.session.first = req.body.first;
                                    req.session.last = req.body.last;
                                    req.session.email = req.body.email;
                                    res.redirect("/thankyou");
                                });
                        }
                    });
            });
    }
});

app.get("/delete", (req, res) => {
    res.render("delete", {
        layout: "main"
    });
});
app.post("/delete", (req, res) => {
    db.deleteSignature(req.session.userid);
    req.session.signatureID = null;
    res.redirect("/delete");
});

app.get("/signers", checkForSigId, checkedForLoggedIn, (req, res) => {
    db
        .getSigners()
        .then(results => {
            res.render("signers", {
                layout: "main",
                data: results.rows,
                csrfToken: req.csrfToken()
            });
        })
        .catch(err => {
            console.log(err);
            res.sendStatus(404);
        });
});

app.get("/signers/:city", checkForSigId, checkedForLoggedIn, (req, res) => {
    db
        .getSignersByCity(req.params.city)
        .then(results => {
            console.log("this is req.params", req.params.city);
            console.log("this is results.row", results.rows);
            res.render("signers", {
                layout: "main",
                csrfToken: req.csrfToken(),
                myData: results.rows,
                selectedCity: req.params.city
            });
        })
        .catch(err => {
            console.log(err);
            res.sendStatus(404);
        });
});

app.listen(process.env.PORT || 8080, () => console.log("I am listening!"));
