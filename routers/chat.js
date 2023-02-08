const { Router, urlencoded, json } = require("express");
const Chat = require("../models/chat");
const Message = require("../models/message");
const Participant = require("../models/participant");

const apiRouter = Router();

apiRouter.use(urlencoded({ extended: true }));
apiRouter.use(json());

apiRouter.get("/:chatId", async function(request, response){
  const { chatId } = request.params;
  try{
    const document = await Chat.getChat(chatId);
    response.send(document.toObject());
  } catch(error) {
    response.status(500).send(error);
  }
});

function parseInteger(value){
  const parsed = parseInt(value);
  if(!Number.isNaN(parsed)){
    return parsed;
  }
  return undefined;
}

apiRouter.get("/:chatId/messages", async function(request, response){
  const { chatId } = request.params;
  const skip = parseInteger(request.query.skip);
  const limit = parseInteger(request.query.limit);
  try{
    const documents = await Message.getMessages(chatId, { skip, limit });
    response.send(documents);
  } catch(error) {
    response.status(500).send(error);
  }
});

apiRouter.get("/:chatId", async function(request, response){
  const { chatId } = request.params;
  const skip = parseInteger(request.query.skip);
  const limit = parseInteger(request.query.limit);
  try{
    const chatDoc = await Chat.getChat(chatId);
    const documents = await Message.getMessages(chatId, { skip, limit });
    response.send({
      ...chatDoc.toObject(),
      messages: documents
    });
  } catch(error) {
    response.status(500).send(error);
  }
});

apiRouter.post("/", async function(request, response){
  const { is_group = false } = request.query;
  const userId = request.tokenData.id;
  try{
    let document;
    if(is_group){
      const { title, user_ids } = request.body;
      document = await Chat.createGroup(title, userId, user_ids.split(" "));
    }else{
      const { user_id } = request.body;
      const hasDoc = await Participant.hasDoc(userId, user_id);
      if(hasDoc){
        throw "Chat already exists";
      }
      document = await Chat.createNonGroup(userId, user_id);
    }
    response.send(document.toObject());
  } catch(error) {
    response.status(500).send(error);
  }
});

module.exports = { apiRouter };