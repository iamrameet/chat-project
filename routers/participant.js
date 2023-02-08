const { Router, urlencoded, json } = require("express");
const Message = require("../models/message");
const Participant = require("../models/participant");

const apiRouter = Router();

apiRouter.use(urlencoded({ extended: true }));
apiRouter.use(json());

apiRouter.get("/user", async function(request, response){
  const userId = request.tokenData.id;
  const { chats = false, user = false } = request.query;
  try{
    const documents = await Participant.getDocsOf(userId, { chats, user });
    const leanDocs = await Promise.all(documents.map(async document => {
      const data = { ...document.toObject(), recentMessage: null };
      try{
        data.chat.recentMessage = await Message.getRecent(document.chat.id);
      } catch(ex) {
        console.log(ex);
      }
      return data;
    }));
    response.status(200).json(leanDocs);
  } catch(error) {
    response.status(500).send(error);
  }
});

module.exports = { apiRouter };