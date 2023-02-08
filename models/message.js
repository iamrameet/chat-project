const { Schema, model, Types } = require("mongoose");
const Logger = require("../util/logger");

class Message{

  static #logger = new Logger("MESSAGE");

  static #schema = new Schema({
    chat: {
      type: Schema.Types.ObjectId,
      ref: "Chat",
      required: [true, "Chat ID is required"],
      index: true
    },
    sender: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Sender ID is required"]
    },
    content: {
      type: String,
      required: [true, "Message content is required"]
    }
  }, { timestamps: true }).index({ createdAt: -1 });

  static #model = model("Message", this.#schema);

  static async create(chatId, userId, content){
    try{
      const document = new this.#model({ chat: chatId, sender: userId, content });
      await document.save();
      return await document.populate("sender"); // do not populate password
    }catch(ex){
      this.#logger.error(ex.message);
      throw "Unable to create message";
    }
  }

  static async getMessage(_id){
    try{
      const document = await this.#model.findById(_id);
      if(!document){
        throw "Message not found";
      }
      return document;
    }catch(ex){
      throw "Unable to get message";
    }
  }

  static async getRecent(chatId){
    try{
      return await this.#model.findOne({ chat: chatId }, null, {
        sort: { createdAt: -1 }
      });
    }catch(ex){
      this.#logger.error(ex);
      throw "Unable to get message";
    }
  }

  static async getMessages(chatId, options = { skip: 0, limit: 20 }){
    try{
      const documents = await this.#model.find({ chat: chatId }, null, {
        limit: options.limit ?? 20,
        skip: options.skip ?? 0,
        sort: { createdAt: -1 },
        populate: "sender"
      });
      console.log(documents.map(doc => doc.sender))
      return documents;
    }catch(ex){
      throw "Unable to get messages";
    }
  }

};

module.exports = Message;