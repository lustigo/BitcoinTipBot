const moment=require("moment");

module.exports = class User{
  constructor(binaryrow,ato,db){
    //constructs User from database output
    this.chatID = binaryrow["chatID"];
    this.username = binaryrow["username"];
    if(binaryrow["authToken"]){
      let token=JSON.parse(binaryrow["authToken"]);
          let today= new moment();
          let expiring = new moment(token.expires_at);
          let expire = expiring.diff(today,'seconds');
          console.log(expire);
          this.authToken = ato.create({access_token:token.access_token,refresh_token:token.refresh_token,expires_in:expire});
    }else{
      this.authToken = null;
    }
    console.log(this.authToken);
    this.state = binaryrow["state"];
    this.mail = binaryrow["mail"];
    this.db = db;
  }
  isLoggedin(){
    //returns if the user is logged in (when the Token is not expired and the Token is existing)
    if(this.authToken){
      this.refresh();
      return true;
    }
    return false;
  }
  refresh(){
    if(this.authToken.expired()){
      this.authToken.refresh().then(function(res){
          //save new Token in DB
          let token = this.con.accessToken.create(res);
          this.db.saveToken(JSON.stringify(token.token),this.state);
      }.bind(this));
    }
  }
}
