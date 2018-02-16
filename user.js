const moment = require("moment");
const bitcoinapi = require("./bitcoinapi");

module.exports = class User {
    constructor(binaryrow, ato, db) {
        //constructs User from database output
        this.chatID = binaryrow["chatID"];
        this.username = binaryrow["username"];
        this.ato = ato;
        if (binaryrow["authToken"]) {
            let token = JSON.parse(binaryrow["authToken"]);
            let today = new moment();
            let expiring = new moment(token.expires_at);
            let expire = expiring.diff(today, 'seconds');
            this.authToken = ato.create({
                access_token: token.access_token,
                refresh_token: token.refresh_token,
                expires_in: expire
            });
        } else {
            this.authToken = null;
        }
        this.state = binaryrow["state"];
        this.mail = binaryrow["mail"];
        this.db = db;
        this.tx = JSON.parse(binaryrow["tx"]);
    }
    isLoggedin() {
        //returns if the user is logged in (when the Token is not expired and the Token is existing)
        if (this.authToken) {
            this.refresh();
            return true;
        }
        return false;
    }

    refresh() {
        //refresh the authKey when it is expired
        if (this.authToken.expired()) {
            //console.log(this.authToken);
            const api = new bitcoinapi(this.authToken);
            api.refresh((err,res)=>{
                let token = this.ato.create(res);
                this.authToken = token;
                this.db.saveToken(JSON.stringify(token.token), this.state);
            });
        }
    }
    revoke() {
        //revokes auth and refresh Token
        if (this.isLoggedin()) {
            this.authToken.revoke('access_token').then(function() {
                return this.authToken.revoke('refresh_token');
            }.bind(this)).then(function() {
                //removes Key from DB
                this.db.removeTokenState(this.chatID);
            }.bind(this)).then(function() {
                this.authToken = null;
                this.state = null;
            }.bind(this)).catch((err) => {
                console.log(err);
            });
        }
    }

}
