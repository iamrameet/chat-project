const mongoose = require("mongoose");
const { DB } = require("./config");

mongoose.set("strictQuery", true);

function connectDB(){
  const uri = `mongodb+srv://${DB.username}:${DB.password}@appcluster.shilt.mongodb.net/${DB.name}?retryWrites=true&w=majority`;
  return mongoose.connect(uri);
}

module.exports = { connectDB };