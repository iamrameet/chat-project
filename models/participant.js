const { Schema, model } = require("mongoose");
const Logger = require("../util/logger");
const Message = require("./message");

class Participant{

  static #logger = new Logger("PARTICIPANT");

  static #schema = new Schema({
    chat: {
      type: Schema.Types.ObjectId,
      ref: "Chat",
      required: [true, "Chat ID is required"]
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User ID is required"]
    }
  }, { timestamps: true })
    .index({ user: 1, chat: 1 }, { unique: true });

  static #model = model("Participant", this.#schema);

  static async create(chatId, userId){
    try{
      const document = new this.#model({
        chat: chatId,
        user: userId
      });
      return await document.save();
    }catch(ex){
      this.#logger.error(error.message);
      throw "Unable to create user";
    }
  }

  static async createMany(chatId, userIds = []){
    try{
      const documents = userIds.map(user => new this.#model({ chat: chatId, user }));
      return await this.#model.insertMany(documents);
    }catch(ex){
      this.#logger.error(ex.message);
      throw "Unable to create users";
    }
  }

  static async getDocsOf(userId, populateOptions = { chats: false, user: false }){
    try{
      const populate = [];
      if(populateOptions.chats){
        populate.push("chat");
      }
      if(populateOptions.user){
        populate.push("user");
      }
      const documents = await this.#model.find({ user: userId }, null, { populate: populate.join(" ") });
      if(!populateOptions.chats){
        return documents;
      }
      return await Promise.all(documents.map(async document => {
        if(!document.chat.isGroup){
          await document.populate("chat.admins", "name");
          const anotherUser = document.chat.admins.find(user => user.id !== userId);
          if(anotherUser){
            document.chat.title = anotherUser.name;
          }else{
            document.chat.title = document.chat.admins[0].name;
          }
          return document;
        }
        return document;
      }));
    } catch(ex) {
      this.#logger.error(ex);
      throw "Unable to get chats";
    }
  }

  static async getByChatId(chatId, populateOptions = { chats: false, user: false }){
    try{
      const populate = [];
      if(populateOptions.chats){
        populate.push("chat");
      }
      if(populateOptions.user){
        populate.push("user");
      }
      return await this.#model.find({ chat: chatId }, null, { populate: populate.join(" ") });
    } catch(ex) {
      this.#logger.error(ex);
      throw "Unable to get chats";
    }
  }

  static async hasDoc(userAId, userBId){
    try {
      const documents = await this.getDocsOf(userAId, { chats: true });
      if(documents.length === 0){
        return false;
      }
      const foundDoc = documents.find(document => {
        return document.chat.admins.some(user => {
          return user.id === userBId;
        });
      });
      return foundDoc ? true : false;
    } catch(ex) {
      this.#logger.error(ex);
      throw "Unable to check for participant";
    }
  }

};

module.exports = Participant;