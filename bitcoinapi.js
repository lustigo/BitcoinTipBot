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
    getMail(callback) {
        //gets the Mailadress
        this.client.getCurrentUser(function(err, res) {
            callback(res.email);
        });
    }
    sendMoney(user, amount, recievermail, recieverusername, ctx, tfaCallback) {
        //sends amount BTC to reciever from User. Then sends message to user and reciever
        //third: check if balance > amount
        if (!isNaN(amount)) {
            this.getBalance(function(b, n) {
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
            }.bind(this));
        } else {
            ctx.reply("Amount is not a Number");
        }
    }
    executeSend(options, ctx, tfaCallback, tfacode) {
        //fourth: get Account
        this.client.getAccounts({}, function(err, acc) {
            //fifth: send Money
            //  acc[0].id

            acc[0].sendMoney(options, function(err, tx) {
                console.log(tx);
                if (err) {
                    if (err.status != 402) {
                        ctx.reply("ERROR! " + err.message);
                    } else {
                        //Two Factor Authentication is required
                        ctx.reply("You are about to send " + options.amount + " BTC to " + options.to + "\n Two-Factor-Authentication required! Type /tfa <CODE> and enter the Code you have recieved via SMS or Authy");;
                        tfaCallback(options);
                    }
                } else {
                    ctx.reply("SUCCESS!");
                }
            }, tfacode);
        }.bind(this));

    }
    getPrice(callback) {
        //returns the current BTC price to callback
        this.client.getExchangeRates({
            'currency': 'BTC'
        }, (err, rates) => {
            callback(rates.data.rates.USD);
        });
    }
    getBalance(callback) {
        //get's balance in BTC and native
        this.client.getAccounts({}, function(err, acc) {
            callback(acc[0].balance, acc[0].native_balance);
        });
    }
}
