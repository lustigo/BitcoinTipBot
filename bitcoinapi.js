const Coinbase = require("coinbase");
const crypto = require("crypto");

module.exports = class BitcoinAPI {
    constructor(tokenObj) {
        //recieves TokenObject from simple-oauth2
        this.token = tokenObj;
        this.client = new Coinbase.Client({
            'accessToken': this.token.token.access_token,
            'refreshToken': this.token.token.refresh_token
        });
        this.idem = crypto.createHash('md5').update(Math.random(0, 255).toString()).digest('hex');
    }

    /** API functions ordered by Name*/

    executeSend(options, ctx, tfaCallback, tfacode) {
        //fourth: get Account
        this.client.getAccounts({}, function(err, acc) {
            //fifth: send Money
            //  acc[0].id
            if (!err) {
                acc[0].sendMoney(options, (err,tx) => {
                    if (err) {
                        if (err.status != 402) {
                            this.errorhandling(err, (msg)=>{
                                ctx.reply(msg);
                            });
                        } else {
                            //Two Factor Authentication is required
                            ctx.reply("You are about to send " + options.amount + " BTC to " + options.to + "\n Two-Factor-Authentication required! Type /tfa <CODE> and enter the Code you have recieved via SMS or Authy");;
                            tfaCallback(options);
                        }
                    } else {
                        ctx.reply("SUCCESS!");
                    }
                }, tfacode);
            } else {
                this.errorhandling(err, function(msg) {
                    ctx.reply(msg);
                });
            }
        }.bind(this));

    }

    getBalance(callback, errcb) {
        //get's balance in BTC and native
        this.client.getAccounts({}, (err,acc)=>{
            if (!err) {
                callback(acc[0].balance, acc[0].native_balance);
            } else {
                this.errorhandling(err, errcb);
            }
        });
    }

    getMail(callback, errcb) {
        //gets the Mailadress
        this.client.getCurrentUser((err,res)=>{
            if (!err) {
                callback(res.email);
            } else {
                this.errorhandling(err, errcb);
            }
        });
    }

    getPrice(callback, errcb) {
        //returns the current BTC price to callback
        this.client.getExchangeRates({
            'currency': 'BTC'
        }, (err, rates) => {
            if (!err) {
                callback(rates.data.rates.USD);
            } else {
                this.errorhandling(err, errcb);
            }
        });
    }

    sendMoney(user, amount, recievermail, recieverusername, ctx, tfaCallback) {
        //sends amount BTC to reciever from User. Then sends message to user and reciever
        //third: check if balance > amount
        if (!isNaN(amount)) {
            this.getBalance((b,n)=> {
                if (b.amount >= amount) {
                    let options = {
                        "to": recievermail,
                        "amount": amount,
                        "currency": "BTC",
                        "idem": this.idem //idem used for recognition
                    };
                    this.executeSend(options, ctx, tfaCallback, null);

                } else {
                    ctx.reply("Not enough money!");
                }
            });
        } else {
            ctx.reply("Amount is not a Number");
        }
    }

    /**
     * refreshes the auth Token
     * @param {function} callback Called after execution
     */
    refresh(callback){
        this.client.refresh(callback);
    }

    /**Misc**/
    errorhandling(err, callback) {
        //Returns a User message when an Error occurs
        switch (err.status) {
            case 400:
                switch (err.name) {
                    case "personal_details_required":
                        callback("Error! You need to fill out personal information on Coinbase.");
                        break;
                    case "unverified_email":
                        callback("Error! Please verify your E-Mail first!");
                        break;
                    default:
                        callback("Server Error, please contact @Lustigo and try it again later");
                        console.log(err);
                }
                break;
            case 401:
                callback("Authentication Error! Please log out an in again");
                break;
            case 404:
                callback("Boterror! Please contact @Lustigo");
                console.log(err);
                break;
            case 429:
                callback("Servererror 429! Please contact @Lustigo");
                console.log("RATE LIMIT EXCEEDED!!!!!!!!!!");
                break;
            case 500:
                callback("Servererror! Please try again later!");
                console.log(err);
                break;
            default:
                callback("ERROR! " + err.message + " Please contact @Lustigo");
                console.log(err);
        }
    }
}
