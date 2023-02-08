class SocketClient{
  static #socket;
  static init(onEvents = { message(){} }){
    this.#socket = io();
    this.#socket.on("connect", () => {
      console.log("mubarak ho!");
    });
    this.#socket.on("disconnect", () => {
      console.log("oh ho!");
    });
    this.#socket.on("message", onEvents.message);
  }
  static message(...data){
    this.#socket.emit("message", ...data);
  }
};