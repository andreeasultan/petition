var spicedPg = require("spiced-pg");
let dbUrl = process.env.DATABASE_URL;

if (!dbUrl) {
    var { dbUser, dbPass } = require("./secrets.json");
    dbUrl = `postgres:${dbUser}:${dbPass}@localhost:5432/petition`;
}

var db = spicedPg(dbUrl);

function signPetition(userId, signature) {
    console.log("running signpetition", userId);
    return db
        .query(
            "INSERT INTO signatures (user_id, signature) VALUES ($1, $2) RETURNING id",
            [userId, signature]
        )
        .then(function(results) {
            return results;
        });
}
function getSigners() {
    return db
        .query(
            `SELECT users.first_name, users.last_name, user_profiles.age, user_profiles.city, user_profiles.homepage
            FROM users
            JOIN user_profiles
                ON users.id=user_profiles.user_id`
        )
        .then(function(results) {
            return results;
        });
}

function getSignersByCity(city) {
    return db
        .query(
            `SELECT users.first_name, users.last_name, user_profiles.age, user_profiles.city, user_profiles.homepage
            FROM users
            JOIN user_profiles
                ON users.id=user_profiles.user_id
                WHERE LOWER (city)= LOWER($1)`,
            [city]
        )
        .then(function(results) {
            return results;
        });
}

function countSigners() {
    return db.query("SELECT COUNT(*) FROM signatures").then(function(results) {
        console.log("count signers", results);
        return results;
    });
}

function getSigImage(signatureID) {
    return db
        .query("SELECT signature FROM signatures WHERE id = $1", [signatureID])
        .then(function(results) {
            console.log("signature", results);
            return results;
        });
}

function userRegistration(firstName, lastName, email, hashed_password) {
    return db
        .query(
            "INSERT INTO users (first_name, last_name, email, hashed_password) VALUES ($1, $2, $3, $4) RETURNING id",
            [firstName, lastName, email, hashed_password]
        )
        .then(function(results) {
            return results;
        });
}

function getUserData(passedEmail) {
    return db
        .query("SELECT * from users WHERE email = $1", [passedEmail])
        .then(function(results) {
            return results;
        });
}

function checkIfPetitionisSigned(userid) {
    return db
        .query("SELECT * from signatures WHERE user_id = $1", [userid])
        .then(function(results) {
            return results;
        });
}

function userProfileData(userId, age, city, homepage) {
    return db
        .query(
            "INSERT INTO user_profiles (user_id, age, city, homepage) VALUES ($1, $2, $3, $4) RETURNING id",
            [userId || null, age || null, city || null, homepage || null]
        )
        .then(function(results) {
            return results;
        });
}

function fetchDataToUpdateProfile(userId) {
    return db
        .query(
            `SELECT users.first_name, users.last_name, users.email, users.hashed_password, user_profiles.age, user_profiles.city, user_profiles.homepage
        FROM users
        JOIN user_profiles
            ON users.id=user_profiles.user_id
            WHERE user_id=$1`,
            [userId]
        )
        .then(function(results) {
            return results;
        });
}

function updateUsersTableWithPassword(
    firstName,
    lastName,
    email,
    hashed_password,
    userid
) {
    return db
        .query(
            `UPDATE users SET first_name=$1, last_name=$2, email=$3, hashed_password=$4
        WHERE id=$5`,
            [firstName, lastName, email, hashed_password, userid]
        )
        .then(function(results) {
            return results;
        });
}

function updateUsersTableWithoutPassword(firstName, lastName, email, userid) {
    return db.query(
        `UPDATE users SET first_name=$1, last_name=$2, email=$3
        WHERE id=$4`,
        [firstName, lastName, email, userid]
    );
}

function checkForRowInUserProfiles(userId) {
    return db
        .query(`SELECT*FROM user_profiles WHERE user_id = $1`, [userId])
        .then(results => {
            if (results.rows.length == 0) {
                return false;
            } else {
                return true;
            }
        });
}

function updateUserProfilesTable(age, city, homepage, userId) {
    return db.query(
        `UPDATE user_profiles SET age=$1, city=$2, homepage=$3
        WHERE user_id=$4`,
        [age || null, city || null, homepage || null, userId]
    );
}

function insertIntoUserProfilesTable(userId, age, city, homepage) {
    return db
        .query(
            `INSERT INTO user_profiles (user_id, age, city, homepage)
         VALUES ($1, $2, $3, $4)
         WHERE
         user_id=$5 RETURNING id`,
            [userId || null, age || null, city || null, homepage || null]
        )
        .then(function() {
            return;
        });
}

function deleteSignature(userId) {
    return db.query(
        `DELETE FROM signatures
         WHERE user_id=$1`,
        [userId]
    );
}

module.exports = {
    signPetition,
    getSigners,
    countSigners,
    getSigImage,
    userRegistration,
    getUserData,
    checkIfPetitionisSigned,
    userProfileData,
    getSignersByCity,
    fetchDataToUpdateProfile,
    updateUsersTableWithPassword,
    updateUsersTableWithoutPassword,
    checkForRowInUserProfiles,
    updateUserProfilesTable,
    insertIntoUserProfilesTable,
    deleteSignature
};
