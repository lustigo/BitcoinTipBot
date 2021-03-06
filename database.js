const mysql = require("mysql2");
const fs = require("fs");
const User = require("./user.js");

module.exports = class Database {
    constructor(databaseConfig, ato) {
        //inits connection with username and password
        this.connection = mysql.createConnection(databaseConfig);
        this.generateTables();
        this.ato = ato;
    }
    generateTables() {
        //will init the table-structure
        let sql = fs.readFileSync("structure.sql").toString();
        this.connection.query(sql);
    }
    saveToken(authToken, state) {
        //saves a recieved Token for a existing User
        this.connection.execute("UPDATE `users` SET `authToken`=? WHERE `state`=?", [authToken, state]);
    }
    newUser(chatID, username) {
        //creates a new User-Entry
        this.connection.execute("INSERT INTO `users` (chatID ,username ,authToken ,state ,mail) VALUES (?,? , NULL , NULL , NULL)", [chatID, username]);
    }
    getUserByID(chatID, callback, ctx, next) {
        //returns the Entry for a specific user
        this.connection.execute("SELECT * FROM `users` WHERE chatID =?", [chatID], function(err, res, field) {
            callback(new User(res[0], this.ato, this), ctx, next);
        }.bind(this));
    }
    getUserByName(username, callback, ctx, next) {
        //returns the Entry for a specific User
        this.connection.execute("SELECT * FROM `users` WHERE username =?", [username], function(err, res, field) {
            callback(new User(res[0], this.ato, this), ctx, next);
        }.bind(this));
    }
    saveState(state, chatID) {
        //saves the state for a existing user
        this.connection.execute("UPDATE `users` SET `state`=? WHERE `chatID`=?", [state, chatID]);
    }
    saveMail(mail, state) {
        //saves the Mail for a existing user
        this.connection.execute("UPDATE `users` SET `mail`=? WHERE `state`=?", [mail, state]);
    }
    getMail(username, callback) {
        //calls callback with the usermail
        this.connection.execute("SELECT mail FROM `users` WHERE username=?", [username], callback);
    }
    isExisting(chatID, username, callbackTrue, callbackFalse) {
        //checks if User with that chatID and/or that Username does already exists, if so it calls callbackTrue, else it calls callbackFalse
        let sql = "SELECT COUNT(*) AS C,mail IS NOT NULL AS mail FROM `users` WHERE";
        let input = [];
        //Builds the SQL-Statement and Parameter Array wheter chatID & username or only one of both is set
        if (chatID && username) {
            sql = sql + " `chatID` = ? && `username` = ?";
            input.push(chatID);
            input.push(username);
        } else if (chatID) {
            sql = sql + " `chatID` = ?";
            input.push(chatID);
        } else if (username) {
            sql = sql + " `username` = ?";
            input.push(username);
        }
        sql += ' GROUP BY chatID';
        //makes Database-Query and passes all things to existingExecutrer-Function
        this.connection.execute(sql, input, function(err, res, fields) {
            this.existingExecuter(err, res, fields, callbackTrue, callbackFalse)
        }.bind(this));
    }
    existingExecuter(err, res, fields, callbackTrue, callbackFalse) {
        //helper Function for isExisting
        if (res.length == 0 || res[0]["C"] == 0) {
            callbackFalse();
        } else if (res[0]["C"] == 1) {
            callbackTrue(res[0]["mail"] == 1);
        }
    }
    isStateExisting(state, callbackTrue, callbackFalse) {
        //checks if State is existing
        this.connection.execute("SELECT COUNT(*) AS C FROM `users` WHERE state=?", [state], function(err, res, fields) {
            this.existingExecuter(err, res, fields, callbackTrue, callbackFalse);
        }.bind(this));
    }
    removeTokenState(chatID) {
        //Sets Auth Token and State to NULL
        this.connection.execute("UPDATE `users` SET `authToken` = NULL, `state`=NULL WHERE `chatID` = ?", [chatID]);
    }
    deleteUser(chatID) {
        //deletes Database Entry
        this.connection.execute("DELETE FROM `users` WHERE `chatID` = ?", [chatID]);
    }
    saveTx(chatID, tx) {
        //saves Transaction for further use to chatID
        this.connection.execute("UPDATE `users` SET `tx` = ? WHERE `chatID` = ?", [tx, chatID]);
    }
    removeTx(chatID) {
        //after a sucessfull Transaction remove Transaction
        this.connection.execute("UPDATE `users` SET `tx` = NULL WHERE `chatID` = ?", [chatID]);
    }
}
