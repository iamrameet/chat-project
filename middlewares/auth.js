const { readJWT } = require("../util/token");
const express = require("express");

/**
 * @param {express.Request} request
 * @param {express.Response} response
 * @param {express.NextFunction} next
*/
module.exports = async function userAuth(request, response, next){
  const authToken = request.cookies["auth-token"];
  if(!authToken){
  }
  try{
    const data = await readJWT(authToken);
    request.tokenData = data;
    response.locals.tokenData = data;
    next();
  } catch(ex) {
    console.log(ex);
    response.status(500).send(ex);
  }
}