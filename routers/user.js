const { Router, urlencoded, json } = require("express");
const { createJWT } = require("../util/token");
const userAuth = require("../middlewares/auth");
const User = require("../models/user");

const apiRouter = Router();

apiRouter.use(urlencoded({ extended: true }));
apiRouter.use(json());

apiRouter.get("/", userAuth, async function(request, response){
  try{
    const document = await User.getUser(response.locals.tokenData.id);
    response.status(200).json({
      _id: document._id,
      name: document.name,
      username: document.username
    });
  } catch(error) {
    response.status(500).send(error);
  }
});

apiRouter.get("/logout", function(request, response){
  response.clearCookie("auth-token").redirect("/");
});

apiRouter.post("/", async function(request, response){
  const { name, username, password } = request.body;
  console.log(request.body);
  try{
    const document = await User.create(name, username, password);
    response.cookie("auth-token", await createJWT({ id: document.id }), { httpOnly: true, secure: false })
    .status(200)
    .json(document.toObject({
      transform: (obj, ref) => {
        delete ref.password;
      }
    }));
  } catch(error) {
    response.status(500).send(error);
  }
});

apiRouter.post("/auth", async function(request, response){
  const { username, password } = request.body;
  try{
    const document = await User.getUserByUsername(username);
    if(document.password !== password){
      return void response.status(500).send("Password mismatch");
    }
    response.cookie("auth-token", await createJWT({ id: document.id }), { httpOnly: true, secure: false })
    .status(200)
    .json({
      _id: document._id,
      name: document.name,
      username: document.username
    });
  } catch(error) {
    response.status(500).send(error);
  }
});

apiRouter.get("/find/:username", userAuth, async function(request, response){
  const { username } = request.params;
  try{
    const document = await User.getUserByUsername(username);
    response.status(200).json(document.toObject({
      transform: (obj, ref) => {
        delete ref.password;
      }
    }));
  } catch(error) {
    response.status(500).send(error);
  }
});

apiRouter.get("/search", userAuth, async function(request, response){
  let { query = "" } = request.query;
  query = query.trim();
  if(query.length < 1){
    return void response.status(500).send("Query must have atleast 4 characcters");
  }
  try{
    const documents = await User.getUsers(query);
    response.status(200).json(documents);
  } catch(error) {
    response.status(500).send(error);
  }
});

module.exports = { apiRouter };