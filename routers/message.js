const { Router, urlencoded, json } = require("express");
const Message = require("../models/message");

const apiRouter = Router();

apiRouter.use(urlencoded({ extended: true }));
apiRouter.use(json());

apiRouter.get("/:messageId", async function(request, response){
  const { messageId } = request.params;
  try{
    const document = await Message.getMessage(messageId);
    response.send(document.toObject());
  } catch(error) {
    response.status(500).send(error);
  }
});

apiRouter.post("/", async function(request, response){
  try{
    const userId = request.tokenData.id;
    const { chat_id, content } = request.body;
    const document = await Message.create(chat_id, userId, content);
    response.send(document.toObject());
  } catch(error) {
    response.status(500).send(error);
  }
});

module.exports = { apiRouter };