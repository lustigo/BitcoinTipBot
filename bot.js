const Telegraf = require("telegraf");
const crypto = require("crypto");
const fs = require("fs");

module.exports = class Bot{
  constructor(url,token,express,user,database,tg){
    //saves DB connection
    this.db = database;
    //sets the Telegraf Bot
    this.bot = new Telegraf(token,{username:user});
    //creates a new random, secret Path for each session
    this.path = crypto.createHash('md5').update(Math.random(0,255).toString()).digest('hex');
    //saves Express Reference
    this.express = express;
    //sets up Webhook
    this.setHook(url);
    //sets up Tokengen
    this.tg = tg;
    //sets Routes
    this.initRoutes();
  }
  setHook(url){
    //TODO: CHANGE
    //sets the URL for the Webhook
    this.bot.telegram.setWebhook(url+"/"+this.path);
    //connects ExpressApp with Webhook
    //this.bot.startWebhook("/tipbot",null,3000);
    this.express.use(this.bot.webhookCallback("/"+this.path));
  }
  initRoutes(){
    //TODO: Remove DEV
    //this.bot.use(function(ctx,next){console.log(ctx);next();});
    this.bot.command("start",this.existsnot.bind(this),this.start.bind(this));
    this.bot.command("register",this.exists.bind(this),this.getUser.bind(this),this.isNotLoggedin.bind(this),this.registerCmd.bind(this));
    this.bot.command("login",this.exists.bind(this),this.getUser.bind(this),this.isNotLoggedin.bind(this),this.loginCmd.bind(this));
    this.bot.command("tip",this.exists.bind(this),this.getUser.bind(this),this.isLoggedin.bind(this),this.tipCmd.bind(this));
    this.bot.command("rain",this.exists.bind(this),this.getUser.bind(this),this.isLoggedin.bind(this),this.rainCmd.bind(this));
    this.bot.command("help",this.helpCmd.bind(this));
  }
  start(ctx){
    //starts a Conversation and saves User Info
    if(ctx.from.username){
      this.db.newUser(ctx.from.id,ctx.from.username);
      ctx.reply("Welcome to the BitcoinTipBot! If you need help type /help or start directly with /login to your Coinbase Account or /register one right now!");
    }else{
      ctx.reply("You need an existing Username. Create one and then type /start");
    }
  }
  getUser(ctx,next){
    //Middleware that gets the User Object from the Database
        this.db.getUserByID(ctx.from.id,this.setUser.bind(this),ctx,next);
  }
  isLoggedin(ctx,next){
    //Middleware that checks if user is logged in
    if(ctx.state.user.isLoggedin()){
      next();
    }else{
      ctx.reply("You are not logged in! Please /login");
    }
  }
  isNotLoggedin(ctx,next){
    //Middleware that checks if user is not logged in
    if(!ctx.state.user.isLoggedin()){
      next();
    }else{
      ctx.reply("You are already logged in!");
    }
  }
  setUser(user,ctx,next){
    //will be called from the Database-Object after the User is recieved
    //saves User in the Context State
    ctx.state.user = user;
    next();
  }
  registerCmd(ctx){
    //Is Called when User calls /register
    ctx.reply("Register now a Coinbase Account for Free, have your Bitcoin Wallet always with you and tip and be tipped via Telegram free of charge! <a href='https://www.coinbase.com/join/553f6c61345343f7c50000d4'>REGISTER NOW</a> (then come back and /login)",{parse_mode:"HTML"});
  }
  loginCmd(ctx){
    //Is Called when User calls /login
    let state = this.tg.genState();
    this.db.saveState(state,ctx.from.id);
    ctx.reply("Please visit <a href='" + this.tg.genLoginUrl(state)  +"'>Login with Coinbase</a>",{parse_mode:"HTML"});
  }
  tipCmd(ctx){
    //Is Called when User calls /tip
    console.log("TIPPING");
  }
  rainCmd(ctx){
    //Is Called when User calls /rain
  }
  exists(ctx,next){
    //Middleware that checks if user exists
    this.db.isExisting(ctx.from.id,ctx.from.username,next,()=>ctx.reply("Use /start first"));
  }
  existsnot(ctx,next){
    //Middleware that checks if user does not exist
    this.db.isExisting(ctx.from.id,ctx.from.username,()=>ctx.reply("You have already started the bot"),next);
  }
  helpCmd(ctx){
    //sends the Help-Message located in the commands.txt-File
    //console.log(fs.readFileSync("commands.txt").toString());
    ctx.reply(fs.readFileSync("commands.txt").toString());
  }
}
