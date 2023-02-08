/// <reference path="fetch-request.js"/>

class User{
  static #id;
  static #username;
  static #name;
  static onInit = () => {};
  static async init(){
    try{
      const userResponse = await FetchRequest.get("/api/user");
      this.#id = userResponse._id;
      this.#username = userResponse.username;
      this.#name = userResponse.name;
      this.onInit(this);
    } catch(ex) {
      throw ex;
    }
  }
  static get id(){ return this.#id; }
  static get username(){ return this.#username; }
  static get name(){ return this.#name; }
  /** @param {string} text */
  static getInitials(text){
    return text.split(" ", 2).map(part => part[0]).join("").toUpperCase();
  }
};