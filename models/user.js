const { Schema, Document, model } = require("mongoose");
const Logger = require("../util/logger");

class User{

  static #logger = new Logger("USER");

  static #schema = new Schema({
    username: {
      type: String,
      unique: true,
      required: [true, "Username is required"]
    },
    password: {
      type: String,
      required: [true, "Password is required"]
    },
    name: {
      type: String,
      required: [true, "Name is required"]
    },
  }, { timestamps: true });

  static #model = model("User", User.#schema);

  static async create(name, username, password){
    try{
      const document = new this.#model({ name, username, password });
      return await document.save();
    }catch(ex){
      this.#logger.error(ex.message);
      return void reject("Unable to create user");
    }
  }

  static async getUser(_id){
    try{
      const document = await this.#model.findById(_id);
      if(!document){
        throw "User not found";
      }
      return document;
    } catch(ex) {
      this.#logger.error(ex);
      throw "Unable to get user";
    }
  }

  static async getUserByUsername(username){
    try{
      const document = await this.#model.findOne({ username });
      if(!document){
        throw "User not found";
      }
      return document;
    } catch(ex) {
      this.#logger.error(ex);
      throw "Unable to get user";
    }
  }

  static async getUsers(query){
    try{
      const regex = new RegExp(query, "i");
      return await this.#model.find({ $or: [
        { username: regex }, { name: regex }
      ] }, { id: 1, username: 1, name: 1 });
    } catch(ex) {
      this.#logger.error(ex);
      throw "Unable to get users";
    }
  }
};

module.exports = User;