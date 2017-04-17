const Bot = require("./bot.js");
const Express= require("express");
const Database = require("./database.js");
//TODO: CHANGE
const Config = require("./config_production.json");
const app = Express();
const TokenGen = require("./tokengen.js");
//Creates a new TokenGen-Objekt
let tg = new TokenGen(Config.coinbase.client,Config.coinbase.secret,Config.url);
//creates a new Database Object
let db = new Database(Config.database,tg.getAccessTokenObject());
//creates a new bot
let bot = new Bot(Config.url,Config.bot.token,app,Config.bot.username,db,tg);
//recieving Code from Redirect
app.get("/handle",function(req,res,next){
  db.isStateExisting(req.query.state,function(){
    res.send("Worked! Go back to Telegram!");
    tg.recieveToken(req.query.code,db,req.query.state);
  }.bind(null,req,res),function(){
    res.send("Something went wrong, try again!");
  }.bind(null,req,res));
});
//recieve AuthToken
app.get("/access",function(req,res,next){
  console.log(req.query);
})
//starts the Express-App
app.listen(3000,()=>console.log("LISTENING"));
