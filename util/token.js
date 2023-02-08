const jwt = require("jsonwebtoken");
const { Token } = require("../config");

function createJWT(payload, options){

  return new Promise(function(resolve, reject){

    jwt.sign(payload, Token.key, options, function(error, token){
      if(error){
        console.log(error);
        return void reject("Something went wrong");
      }
      resolve(token);
    });

  });
}

/** @type {(token: string) Promise<string | jwt.JwtPayload>} */
function readJWT(token){
  return new Promise(function(resolve, reject){
    jwt.verify(token, Token.key, function(error, payload){
      if(error){
        console.log(error);
        return void reject("Invalid token");
      }
      if(payload.exp >= Date.now()){
        return void reject("Token expired");
      }
      resolve(payload);
    });
  });
}

module.exports = { createJWT, readJWT };