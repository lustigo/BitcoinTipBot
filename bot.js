const Telegraf = require("telegraf");
const crypto = require("crypto");
const fs = require("fs");
const btcapi = require("./bitcoinapi.js");

module.exports = class Bot {
    constructor(url, token, express, user, database, tg) {
        //saves DB connection
        this.db = database;
        //sets the Telegraf Bot
        this.bot = new Telegraf(token, {
            username: user
        });
        //creates a new random, secret Path for each session
        this.path = crypto.createHash('md5').update(Math.random(0, 255).toString()).digest('hex');
        //saves Express Reference
        this.express = express;
        //sets up Webhook
        this.setHook(url);
        //sets up Tokengen
        this.tg = tg;
        //sets Routes
        this.initRoutes();
    }
    setHook(url) {
        //TODO: CHANGE
        //sets the URL for the Webhook
        this.bot.telegram.setWebhook(url + "/" + this.path);
        //connects ExpressApp with Webhook
        //this.bot.startWebhook("/tipbot",null,3000);
        this.express.use(this.bot.webhookCallback("/" + this.path));
    }
    initRoutes() {
        //this.bot.use(function(ctx,next){console.log(ctx);next();});
        this.bot.command("balance", this.exists.bind(this), this.getUser.bind(this), this.isLoggedin.bind(this), this.getApi.bind(this), this.balanceCmd.bind(this));
        this.bot.command("delete", this.exists.bind(this), this.getUser.bind(this), this.deleteCmd.bind(this));
        this.bot.command("help", this.helpCmd.bind(this));
        this.bot.command("login", this.exists.bind(this), this.getUser.bind(this), this.isNotLoggedin.bind(this), this.loginCmd.bind(this));
        this.bot.command("logout", this.exists.bind(this), this.getUser.bind(this), this.isLoggedin.bind(this), this.logoutCmd.bind(this));
        this.bot.command("price", this.exists.bind(this), this.getUser.bind(this), this.isLoggedin.bind(this), this.getApi.bind(this), this.priceCmd.bind(this))
        //this.bot.command("rain", this.exists.bind(this), this.getUser.bind(this), this.isLoggedin.bind(this), this.rainCmd.bind(this));
        //this.bot.command("request", this.exists.bind(this), this.getUser.bind(this), this.isLoggedin.bind(this), this.requestCmd.bind(this));
        this.bot.command("register", this.exists.bind(this), this.getUser.bind(this), this.isNotLoggedin.bind(this), this.registerCmd.bind(this));
        this.bot.command("start", this.existsnot.bind(this), this.startCmd.bind(this));
        this.bot.command("tfa", this.exists.bind(this), this.getUser.bind(this), this.isLoggedin.bind(this), this.getApi.bind(this), this.tfaCmd.bind(this));
        this.bot.command("tip", this.exists.bind(this), this.getUser.bind(this), this.isLoggedin.bind(this), this.getApi.bind(this), this.tipCmd.bind(this));
    }

    /**
     *Middleware
     */
    getApi(ctx, next) {
        //Middleware that uses the User-Object in the Context State and attaches a BitcoinAPI-Object to the State (ctx.api)
        ctx.state.api = new btcapi(ctx.state.user.authToken);
        next();
    }
    getUser(ctx, next) {
        //Middleware that gets the User Object from the Database
        this.db.getUserByID(ctx.from.id, this.setUser.bind(this), ctx, next);
    }
    setUser(user, ctx, next) {
        //will be called from the Database-Object after the User is recieved
        //saves User in the Context State
        ctx.state.user = user;
        next();
    }
    exists(ctx, next) {
        //Middleware that checks if user exists
        this.db.isExisting(ctx.from.id, ctx.from.username, next, () => ctx.reply("Use /start first"));
    }
    existsnot(ctx, next) {
        //Middleware that checks if user does not exist
        this.db.isExisting(ctx.from.id, ctx.from.username, () => ctx.reply("You have already started the bot"), next);
    }
    isLoggedin(ctx, next) {
        //Middleware that checks if user is logged in
        if (ctx.state.user.isLoggedin()) {
            next();
        } else {
            ctx.reply("You are not logged in! Please /login");
        }
    }
    isNotLoggedin(ctx, next) {
        //Middleware that checks if user is not logged in
        if (!ctx.state.user.isLoggedin()) {
            next();
        } else {
            ctx.reply("You are already logged in!");
        }
    }

    /**
     * Commands in alphabetical order
     */


    balanceCmd(ctx) {
        //returns the current balance
        ctx.state.api.getBalance((b, n) => {
            ctx.reply("Your total Bitcoin-Balance is: " + b.amount + " BTC or " + n.amount + " " + n.currency);
        });
    }
    deleteCmd(ctx) {
        //deletes User from Database
        if (ctx.state.user.isLoggedin()) {
            this.logoutCmd(ctx);
        }
        this.db.deleteUser(ctx.from.id);
        ctx.reply("We have now no personal data saved.");
    }
    helpCmd(ctx) {
        //sends the Help-Message located in the commands.txt-File
        //console.log(fs.readFileSync("commands.txt").toString());
        ctx.reply(fs.readFileSync("commands.txt").toString());
    }
    loginCmd(ctx) {
        //Is Called when User calls /login
        let state = this.tg.genState();
        this.db.saveState(state, ctx.from.id);
        ctx.reply("Please visit <a href='" + this.tg.genLoginUrl(state) + "'>Login with Coinbase</a>", {
            parse_mode: "HTML"
        });
    }
    logoutCmd(ctx) {
        //revokes Auth Key
        ctx.state.user.revoke();
        ctx.reply("You are now logged out.");
    }
    priceCmd(ctx) {
        //is called when User calls /price
        ctx.state.api.getPrice(function(price) {
            //sends User the current Price:
            ctx.reply("The current Bitcoin-Price is: " + price + " USD");
        });
    }
    rainCmd(ctx) {
        //Is Called when User calls /rain
    }
    requestCmd(ctx) {
        //is called when User calls /request
    }
    registerCmd(ctx) {
        //Is Called when User calls /register
        ctx.reply("Register now a Coinbase Account for Free, have your Bitcoin Wallet always with you and tip and be tipped via Telegram free of charge! <a href='https://www.coinbase.com/join/553f6c61345343f7c50000d4'>REGISTER NOW</a> (then come back and /login)", {
            parse_mode: "HTML"
        });
    }
    startCmd(ctx) {
        //starts a Conversation and saves User Info
        if (ctx.from.username) {
            this.db.newUser(ctx.from.id, ctx.from.username);
            ctx.reply("Welcome to the BitcoinTipBot! If you need help type /help or start directly with /login to your Coinbase Account or /register one right now!");
        } else {
            ctx.reply("You need an existing Username. Create one and then type /start");
        }
    }
    tfaCmd(ctx) {
        //is called when User calls /tfa <CODE>
        let params = ctx.message.text.split(" ");
        if (params.length == 2 && !isNaN(params[1])) {
            //first: check if parameter is Number and not empty
            if (ctx.state.user.tx) {
                //second: check if user has a pending tx
                //third: send Money
                ctx.state.api.executeSend(ctx.state.user.tx, ctx, function() {}, params[1]);
            } else {
                ctx.reply("You have no pending transaction. Use /tip @Username <Amount>");
            }

        } else {
            ctx.reply("Wrong parameters! Use /tfa <CODE> (e.g. /tfa 55065582)");
        }


    }

    tipCmd(ctx) {
        //Is Called when User calls /tip
        //(fifth: handle 2FA)

        //first:check if three Parameters are set: Command @Username Amount
        let params = ctx.message.text.split(" ");
        if (params.length == 3) {
            //second: check if @Username is registered and has a mail-adress
            this.db.isExisting(null, params[1].slice(1), (hasMail) => {
                //SecurityCheck: Has username changed?
                this.hasUsernameChanged(params[1].slice(1), function(bool) {
                    if (bool) {
                        ctx.reply("<b>SECURITY WARNING! USERNAME WAS CHANGED RECENTLY!</b>", {
                            parse_mode: "HTML"
                        });
                    }
                });
                if (hasMail) {
                    this.db.getMail(params[1].slice(1), function(err, res, fields) {
                        //gets Mailadress and sends the Parameters to the BitcoinAPI
                        ctx.state.api.sendMoney(ctx.state.user, params[2], res[0]["mail"], params[1], ctx, function(options) {
                            //TFA required->save tx
                            delete(options.type);
                            this.db.saveTx(ctx.from.id, JSON.stringify(options));
                        }.bind(this));
                    }.bind(this));

                } else {
                    ctx.reply(params[1] + " is not logged in via Coinbase, tell him to do so!");
                }

            }, function() {
                //User does not exist
                ctx.reply(params[1] + " is not using @BitcoinTipBot, tell him to start the Bot and login with Coinbase!");
            });
        } else {
            //some Parameter too much or missing
            ctx.reply("Some Parameters are missing, Use /tip @Username Amount (e.g. /tip @lustigo 0.0001)");
        }
    }

    /**
     * Misc
     */
    hasUsernameChanged(username, callback) {
        //returns true if username has changed
        this.getUserByName(username, function(user) {
            this.bot.telegram.getChat(user.chatID).then(function(chat) {
                callback(chat.username == user.username);
            });
        }.bind(this));


    }




}
