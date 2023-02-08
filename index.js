const http = require("http");
const express = require("express");
const { Server, Socket } = require("socket.io");
const { connectDB } = require("./database");
const route = require("./routers");
const Logger = require("./util/logger");
const userAuth = require("./middlewares/auth");
const cookieParser = require("cookie-parser");
const { readJWT } = require("./util/token");
const Message = require("./models/message");
const Participant = require("./models/participant");

const PORT = 80;

const expressServer = express();
const httpServer = http.createServer(expressServer);
const socketServer = new Server(httpServer);

expressServer.use(cookieParser());

expressServer.use("/", express.static(__dirname + "/public"));
expressServer.use("/socket.io", express.static(__dirname + "/node_modules/socket.io/client-dist"));

expressServer.use("/api/participant", userAuth, route.participant.apiRouter);
expressServer.use("/api/user", route.user.apiRouter);
expressServer.use("/api/chat", userAuth, route.chat.apiRouter);
expressServer.use("/api/message", userAuth, route.message.apiRouter);

httpServer.listen(PORT, function(){
  Logger.log("SERVER", `started on ${expressServer.get("protocol")}://${expressServer.get("host")}:${PORT}/`);
});

connectDB().then(() => {
  Logger.log("DATABASE", "connected");
}).catch(console.log)

class Connections{
  /** @type {Map<string, Map<string, Socket>>} */
  static #sockets = new Map();
  /** @param {Socket} socket */
  static set(userId, socket){
    if(!this.#sockets.has(userId)){
      this.#sockets.set(userId, new Map());
    }
    this.#sockets.get(userId).set(socket.id, socket);
    socket.once("disconnect", () => {
      const map = this.#sockets.get(userId);
      if(map){
        map.delete(socket.id);
        if(map.size === 0){
          this.delete(userId);
        }
      }
    });
  }
  /** @param {(socket: Socket, socketId: string)} callback */
  static forEach(userId, callback){
    if(this.#sockets.has(userId)){
      this.#sockets.get(userId).forEach(callback);
    }
  }
  static delete(userId){
    this.#sockets.delete(userId);
  }
};

socketServer.on("connection", async function(socket){
  // Logger.log("SOCKET", "connected");
  const cookie = (socket.request.headers.cookie ?? "").split(";");
  const cookies = new Map(cookie.map(pair => pair.trim().split("=")));
  socket.on("disconnect", function(){
    Logger.log("SOCKET", "disconnected");
  });
  try {
    const { id: userId } = await readJWT(cookies.get("auth-token"));
    Connections.set(userId, socket);

    socket.on("message", async function(data){
      try{
        const { chat_id, content } = data;
        console.log(chat_id, content, userId)
        const messageDoc = await Message.create(chat_id, userId, content);
        const participantDocs = await Participant.getByChatId(chat_id);
        participantDocs.forEach(participant => {
          console.log(participant.user._id.toString(), userId);
          Connections.forEach(participant.user._id.toString(), client => client.emit("message", messageDoc));
        });
      } catch(error) {
        console.log(error);
        socket.emit("message-error", error);
      }
    });

  } catch(ex) {
    console.log(ex);
    socket.disconnect(true);
  }

});