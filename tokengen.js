const oauth2 = require("simple-oauth2");
const crypto = require("crypto");
const btc = require("./bitcoinapi.js");

module.exports = class TokenGen {
    constructor(key, sec, url) {
        //creates&inits the simple-oauth2-object
        let credentials = {
            client: {
                id: key,
                secret: sec
            },
            auth: {
                tokenHost: "https://coinbase.com/oauth",
            }
        };
        this.url = url;
        this.con = oauth2.create(credentials);
    }

    genLoginUrl(st) {
        //generates a Login-URL
        return this.con.authorizationCode.authorizeURL({
            redirect_uri: this.url + "/handle",
            scope: 'wallet:accounts:read,wallet:transactions:send,wallet:transactions:request,wallet:user:email',
            state: st
        }) + "&meta[send_limit_amount]=1&meta[send_limit_currency]=USD&meta[send_limit_period]=day";
    }
    genState() {
        return crypto.createHash('md5').update(Math.random(0, 255).toString()).digest('hex');
    }

    recieveToken(cd, db, st) {
        //is called when the user is logged in and redirected
        //gets Token and saves it in the db
        let token;
        this.con.authorizationCode.getToken({
            code: cd,
            redirect_uri: this.url + "/handle"
        }).then(function(res) {
            //save Token for first time
            token = this.con.accessToken.create(res);
            db.saveToken(JSON.stringify(token.token), st);
        }.bind(this)).then(function() {
            //get Mail and save it to db
            let api = new btc(token);
            api.getMail(function(mail) {
                db.saveMail(mail, st);
            });
        }.bind(this)).catch((err) => console.log(err));
    }
    getAccessTokenObject() {
        return this.con.accessToken;
    }
}
