const { Schema, model } = require("mongoose");
const Logger = require("../util/logger");
const Message = require("./message");
const Participant = require("./participant");

class Chat{

  static #logger = new Logger("CHAT");

  static #schema = new Schema({
    title: String,
    isGroup: {
      type: Boolean,
      default: false
    },
    admins: [{
      type: Schema.Types.ObjectId,
      ref: "User"
    }]
  }, { timestamps: true });

  static #model = model("Chat", this.#schema);

  static async createGroup(title, adminId, user_ids = []){
    const userIds = new Set([adminId, ...user_ids.filter(id => id.trim())]);
    if(userIds.size === 1){
      throw "Can not create group with yourself";
    }
    try{
      const document = new this.#model({
        isGroup: true,
        admins: [ adminId ],
        title
      });
      await Participant.createMany(document._id, [...userIds]);
      return await document.save();
    }catch(ex){
      this.#logger.error(ex.message);
      throw "Unable to create group chat";
    }
  }

  static async createNonGroup(user_a_id, user_b_id){
    if(user_a_id === user_b_id){
      throw "Can not create chat with yourself";
    }
    try{
      const document = new this.#model({ admins: [ user_a_id, user_b_id ] });
      await Participant.createMany(document._id, [ user_a_id, user_b_id ]);
      return await document.save();
    }catch(ex){
      this.#logger.error(ex);
      throw "Unable to create chat";
    }
  }

  static async getChat(_id){
    try{
      const document = await this.#model.findById(_id);
      if(!document){
        throw "Chat not found";
      }
      return document;
    }catch(ex){
      this.#logger.error(ex);
      throw "Unable to get chat";
    }
  }

  static async doesExist(userAId, userBId){
    try{
      return await Participant.hasDoc(userAId, userBId);
    }catch(ex){
      throw ex;
    }
  }
};

module.exports = Chat;