/// <reference path="../../helper/response.ts"/>
/// <reference path="ui-component.js"/>
/// <reference path="../../node_modules/socket.io/client-dist/socket.io.js"/>

const sleep = timeout => new Promise(resolve => setTimeout(resolve, timeout));

class Color{
  static #counter = 0;
  static #colors = "#A5B4FC #5EEAD4 #86EFAC #93C5FD #FDE047 #FDBA74 #D8B4FE #F0ABFC #FDA4AF #6EE7B7".split(" ");
  static next(){
    const oldCounter = this.#counter;
    this.#counter = (this.#counter + 1) % this.#colors.length;
    return this.#colors[oldCounter];
  }
};

class Chat{
  /** @type {null | Chat} */
  static #selectedChat = null;
  #id;
  #title;
  #isGroup;
  #createdAt;
  #admins;
  #chatItem;
  #recentMessage;
  /** @type {UIComponent<HTMLDivElement, "messagesArea">} */
  #chatArea = null;
  /** @type {Manager<GetEndPointResponseMap["/api/chat/:chatId/messages"][0]>} */
  #messages = new Manager;
  #toRead = 0;
  #loadingMessages = false;
  #readAt = null;

  /** @param {ChatCreateResponse} chatResponse */
  constructor(chatResponse){
    this.#id = chatResponse._id;
    this.#title = chatResponse.title;
    this.#isGroup = chatResponse.isGroup;
    this.#createdAt = chatResponse.createdAt;
    this.#admins = chatResponse.admins;
    this.#recentMessage = chatResponse.recentMessage;
    if(this.#recentMessage){
      this.#recentMessage.createdAt = new Date(this.#recentMessage.createdAt).getTime();
    }
    this.#chatItem = Chat.#chatItemComponent(this);
    if(chatResponse.messages){
      chatResponse.messages.forEach(messageResponse => this.addMessage(messageResponse));
    }
  }
  get id(){
    return this.#id;
  }
  get title(){
    return this.#title;
  }
  get isGroup(){
    return this.#isGroup;
  }
  get createdAt(){
    return this.#createdAt;
  }
  get admins(){
    return this.#admins;
  }
  get chatItem(){
    return this.#chatItem;
  }
  get chatArea(){
    return this.#chatArea;
  }
  get messagesCount(){
    return this.#messages.size;
  }

  /** @param {GetEndPointResponseMap["/api/chat/:chatId/messages"][0]} message */
  addMessage(message, prepend = false){
    const dateTime = new Date(message.createdAt);
    message.createdAt = dateTime;
    this.#messages.set(message._id, message);
    const messageElement = Create.message(message, message.sender._id === User.id);
    if(this.#chatArea){
      const { messagesArea } = this.#chatArea.components;
      if(prepend){
        messagesArea.prepend(messageElement);
      }else{
        // console.log(messageElement);
        messagesArea.append(messageElement);
        messageElement.scrollIntoView({ behavior:"smooth" });
      }
    }
    const { subTitle, time, badge } = this.#chatItem.components;
    if(this.#recentMessage === null || dateTime > this.#recentMessage.createdAt){
      subTitle.property({ innerText: message.content });
      time.element.dataset.timestamp = dateTime.getTime();
      time.element.innerHTML = formatDate(dateTime)
      this.#recentMessage = message;
      $E.chats.prepend(this.#chatItem.element);
      if(Chat.#selectedChat !== this){
        this.#chatItem.element.classList.add("unread");
        this.#toRead++;
        badge.property({ innerText: this.#toRead });
      }
    }
  }

  async showChat(){
    if(this.#loadingMessages){
      return;
    }
    if(Chat.#selectedChat){
      Chat.#selectedChat.chatItem.element.classList.remove("active");
      if(Chat.#selectedChat.#chatArea){
        Chat.#selectedChat.#chatArea.element.remove();
      }
    }
    Chat.#selectedChat = this;
    Chat.#selectedChat.chatItem.element.classList.add("active");
    if(this.#chatArea === null){
      this.#loadingMessages = true;
      const spinner = Create.spinnerHTML;
      $E.chatArea.innerHTML = spinner;
      await sleep(1000);

      try{

        /** @type {GetEndPointResponseMap["/api/chat/:chatId/messages"]} */
        const messages = await FetchRequest.get(`/api/chat/${this.#id}/messages?skip=${this.#messages.size}`);
        this.#chatArea = Chat.#chatAreaComponent(this);
        const { messagesArea } = this.#chatArea.components;
        if(messages.length !== 0){
          messagesArea.clear();
        }
        messages.forEach(message => {
          this.#messages.set(message._id, message);
          messagesArea.prepend(Create.message(message, message.sender._id === User.id));
        });

      } catch(error) {
        console.log(error);
      }

      this.#loadingMessages = false;
    }

    if(Chat.#selectedChat.#id === this.#id){
      $E.chatArea.innerText = "";
      $E.chatArea.append(this.#chatArea.element);
      this.#chatArea.components.messagesArea.element.scroll({
        top: this.#chatArea.components.messagesArea.element.scrollHeight
      });
      this.#chatItem.element.classList.remove("unread");
      this.#toRead = 0;
    }

    this.#readAt = Date.now();

  }

  /** @param {Chat} chat */
  static #chatItemComponent(chat){
    return Create.userItem(chat.#title, chat.#recentMessage?.content, chat.#recentMessage?.createdAt)
      .scope(component => {
        component.element.classList.add("chat-item");
      })
      .on({
        async click(){
          chat.showChat();
        }
      });
  }

  /**
   * @param {Chat} chat
   * @returns {UIComponent<HTMLDivElement, "messagesArea">} */
  static #chatAreaComponent(chat){
    const messagesArea = UIComponent.fromTagName("div", {
      className: "container w-fill h-fill no-padding overflow-auto"
    })
    .append(
      UIComponent.fromTagName("div", {
        className: "container w-fill center info",
        innerText: "No messages yet"
      }).element
    )
    .on({
      async scroll(){
        if(chat.#loadingMessages){
          return;
        }
        const spinnerParent = UIComponent.fromTagName("div", {
          className: "container w-fill center",
          innerHTML: Create.spinnerHTML
        });
        chat.#loadingMessages = true;
        if(this.scrollTop < 5){
          messagesArea.prepend(spinnerParent.element);
          try{
            /** @type {GetEndPointResponseMap["/api/chat/:chatId/messages"]} */
            const messages = await FetchRequest.get(`/api/chat/${chat.#id}/messages?skip=${chat.#messages.size}`);
            messages.forEach(message => chat.addMessage(message, true));
          } catch(ex) {
            console.log(ex);
          }
          spinnerParent.element.remove();
        }
        chat.#loadingMessages = false;
      }
    });

    return UIComponent.fromTagName("div", { className: "container w-fill h-fill no-padding" })
      .append(
        UIComponent.fromTagName("div", { className: "container w-fill row gap center start header" })
          .append(
            UIComponent.fromTagName("div", {
              className: "container box dark size-1 circle no-padding center",
              innerText: User.getInitials(chat.title)
            })
            .style({ backgroundColor: Color.next() }).element,
            UIComponent.fromTagName("div", { className: "container no-padding", innerText: chat.title }).element
          ).element,
        messagesArea.element,
        UIComponent.fromTagName("div", { className: "container w-fill no-padding" })
          .append(
            UIComponent.fromTagName("form", { className: "container row w-fill center gap-2", action: "/api/message/", method: "post" })
              .append(
                UIComponent.fromTagName("input", { type: "hidden", name: "chat_id", value: chat.id }).element,
                UIComponent.fromTagName("div", { className: "container inline-input w-fill no-padding" })
                  .append(
                    UIComponent.fromTagName("input", { type: "text", name: "content", placeholder: "Type here..." }).element
                  ).element,
                UIComponent.fromTagName("button", { type: "submit", innerText: "Send" }).element
              )
              .on({
                async submit(event){
                  event.preventDefault();
                  try{
                    SocketClient.message({
                      chat_id: this.elements.chat_id.value,
                      content: this.elements.content.value
                    });
                    this.reset();
                  } catch(ex){
                    console.log(ex);
                  }
                }
              }).element
          ).element
      )
      .addComponentAs("messagesArea", messagesArea);
  }
};

/**
 * @template T
 * @extends {Map<string, T>} */
class Manager extends Map{
  /** @param {(data: T, key: string) boolean} predicate */
  find(predicate){
    for(const [key, data] of this){
      if(predicate(data, key) === true)
        return data;
    }
    return null;
  }
};

/** @type {Manager<Chat>} */
const Chats = new Manager();

class Create{

  static get spinnerWithParent(){
    return UIComponent.fromTagName("div", {
      className: "container w-fill center h-fill",
      innerHTML: `<div class="spinner small"></div>`
    }).element;
  }
  static get spinner(){
    return UIComponent.fromTagName("div", { className: "spinner" }).element;
  }
  static get spinnerHTML(){
    return "<div class=\"spinner\"></div>";
  }
  static svgIcon(iconId){
    return `<svg viewBox="0 0 32 32"> <use href="icons/icon.svg#${iconId}"></use> </svg>`;
  }

  /** @returns {UIComponent<HTMLDivElement, "foundUser">} */
  static findUserArea(){
    let isResponsePending = false;
    const foundUser = UIComponent.fromTagName("div", { className: "container w-fill no-padding center" });
    return UIComponent.fromTagName("div", { className: "container w-fill h-fill no-padding overflow-auto" })
      .append(
        UIComponent.fromTagName("form", {
          className: "container w-fill no-padding",
          method: "get",
          action: "/api/user/find"
        })
          .append(
            UIComponent.fromTagName("div", { className: "container row w-fill center gap-2" })
              .append(
                UIComponent.fromTagName("input", {
                  type: "search",
                  name: "username",
                  id: "find-username",
                  placeholder: "Enter username",
                  required: true
                }).element,
                UIComponent.fromTagName("button", {
                  type: "submit",
                  className: "container icon",
                  innerHTML: Create.svgIcon("search")
                }).element,
                UIComponent.fromTagName("label", { htmlFor: "find-username" }).element
              ).element
          )
          .on({
            async submit(event){
              event.preventDefault();
              if(isResponsePending){
                return;
              }
              isResponsePending = true;
              foundUser.property({ innerHTML: Create.spinnerHTML });
              await sleep(1000);

              const chatButton = UIComponent.fromTagName("button", {
                className: "container box size-1 small pad-1 center",
                innerHTML: Create.svgIcon("chat"),
                title: "Start chat"
              });

              try{
                /** @type {GetEndPointResponseMap["/api/user/find"]} */
                const userResponse = await FetchRequest.get(this.action + "/" + this.elements.username.value);
                console.log(userResponse)
                const userItem = Create.userItem(userResponse.name, "@" + userResponse.username);
                foundUser.clear().append(userItem.element);
                if(userResponse._id === User.id){
                  isResponsePending = false;
                  return;
                }
                userItem.append(
                  chatButton.on({
                    async click(){
                      const chat = Chats.find(function(chat){
                        return !chat.isGroup && chat.admins.some(user => user._id === userResponse._id);
                      });
                      if(chat){
                        return void chat.showChat();
                      }
                      chatButton.clear().property({
                        disabled: true,
                        innerHTML: Create.spinnerHTML
                      });
                      try{
                        /** @type {ChatCreateResponse} */
                        const chatResponse = await FetchRequest.post("/api/chat", { user_id: userResponse._id });
                        chatResponse.title = userResponse.name;
                        const chat = new Chat(chatResponse);
                        Chats.set(chat.id, chat);
                        if(chatResponse.recentMessage){
                          $E.chats.appendChild(chat.chatItem.element);
                        }
                      } catch(ex) {
                        console.log(ex);
                      }
                      chatButton.clear().property({
                        disabled: false,
                        innerHTML: Create.svgIcon("chat")
                      });
                    }
                  }).element
                );
              }catch(ex){
                foundUser.property({ innerHTML: `<div class="container error">User not found. Try using a different username.</div>` });
              }
              isResponsePending = false;
            }
          }).element,
        foundUser.element
      )
      .addComponentAs("foundUser", foundUser);
  }

  /** @returns {UIComponent<HTMLDivElement, "image" | "subTitle" | "time" | "badge">} */
  static userItem(title, sub_title = "click to start a conversation", time = null){

    const image = UIComponent.fromTagName("div", {
      className: "container box dark size-2 circle no-padding center",
      innerText: User.getInitials(title)
    })
    .style({ backgroundColor: Color.next() });

    const badge = UIComponent.fromTagName("div", {
      className: "container box dark size-0-1 circle no-padding center badge",
      innerText: 0
    });

    const subTitle = UIComponent.fromTagName("div", { className: "sub-title w-fill", innerText: sub_title });

    const timeComponent = UIComponent.fromTagName("div", { className: "sub-title" });

    return UIComponent.fromTagName("div", {
      className: "container row w-fill center hover half-padding pad-wide",
      tabIndex: 0
    })
      .on({
        keyup(event){
          if(["Enter", " "].includes(event.key)){
            this.click();
          }
        }
      })
      .append(
        image.element,
        UIComponent.fromTagName("div", { className: "container w-fill gap overflow-hide" })
          .append(
            UIComponent.fromTagName("div", { className: "container row w-fill gap no-padding center" })
              .append(
                UIComponent.fromTagName("div", { className: "container no-padding w-fill", innerText: title }).element,
                badge.element
              ).element,
            UIComponent.fromTagName("div", { className: "container row w-fill gap no-padding" })
              .append(subTitle.element)
              .scope(component => {
                if(time){
                  timeComponent.element.dataset.timestamp = time;
                  ContentUpdater.addElement(timeComponent.element);
                  component.append(timeComponent.element);
                }
              }).element
          ).element,
      )
      .addComponentAs("image", image)
      .addComponentAs("subTitle", subTitle)
      .addComponentAs("time", timeComponent)
      .addComponentAs("badge", badge);
  }

  static message(message, posToRight = true){
    return UIComponent.fromTagName("div", {
      className: "container w-fill message" + ( posToRight ? " right" : "")
    })
      .append(UIComponent.fromTagName("div", {
        className: "container content",
        innerText: message.content
      }).element)
      .scope(component => {
        if(!posToRight){
          component.prepend(UIComponent.fromTagName("div", {
            className: "container name",
            innerText: message.sender.name
          }).element);
        }
      }).element;
  }

  /**
   * @param {string} innerText
   * @returns {UIComponent<HTMLDivElement, "closeButton">}
   */
  static capsule(innerText){
    const closeButton = UIComponent.fromTagName("button", {
      type: "button",
      className: "button icon",
      innerHTML: Create.svgIcon("close")
    });
    return UIComponent.fromTagName("div", { className: "capsule" })
      .append(
        UIComponent.fromTagName("div", { className: "container no-padding", innerText }).element,
        closeButton.element
      )
      .addComponentAs("closeButton", closeButton);
  }
};

class FetchRequest{
  /**
   * @template {keyof GetEndPointResponseMap} E
   * @param {E} endPoint
   * @returns {Promise<GetEndPointResponseMap[E]>} */
  static get(endPoint){
    return new Promise((resolve, reject) => {
      fetch(endPoint)
      .then(async response => {
        if(!response.ok){
          return void reject(await response.text());
        }
        const object = await response.json();
        resolve(object);
      })
      .catch(ex => {
        console.log(ex);
        reject("GET request failed");
      });
    });
  }
  /**
   * @template {keyof PostEndPointResponseMap} E
   * @param {E} endPoint
   * @returns {PostEndPointResponseMap[E]} */
  static post(endPoint, data){
    return new Promise((resolve, reject) => {
      fetch(endPoint, {
        method: "post",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      })
      .then(async response => {
        if(!response.ok){
          return void reject(await response.text());
        }
        const object = await response.json();
        resolve(object);
      })
      .catch(ex => {
        console.log(ex);
        reject("POST request failed");
      });
    });
  }
  /** @param {HTMLFormElement} form */
  static sendForm(form){
    return new Promise((resolve, reject) => {
      fetch(form.action, {
        method: form.method,
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams(new FormData(form))
      })
      .then(async response => {
        if(!response.ok){
          return void reject(await response.text());
        }
        const object = await response.json();
        resolve(object);
      })
      .catch(ex => {
        console.log(ex);
        reject("POST request failed");
      });
    });
  }
};

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

/** @type {Object<string, HTMLDivElement>} */
const $E = {};
const EscapeStack = new FnStack();

window.addEventListener("keyup", event => {
  if(event.key === "Escape"){
    EscapeStack.pop();
  }
});

async function main(){

  document.querySelectorAll("[id]:not(form)").forEach(element => {
    $E[element.id] = element;
  });

  const $C = {
    findUserArea: Create.findUserArea(),
    chatList: new UIComponent($E.chats),
    userPicture: new UIComponent($E.userPicture),
    userSearchSuggetions: new UIComponent($E.userSearchSuggetions),
    /** @type {UIComponent<HTMLDetailsElement>} */
    menu: new UIComponent($E.menu)
  };

  $C.menu.on({
    toggle(){
      if(this.open){
        EscapeStack.removeAndPush("closeMenu", function(element){
          element.open = false;
        }, this);
      }
    }
  });

  $E.addGroupButton.addEventListener("click", function(){
    $E.mainArea.appendChild($E.addGroupArea);
    EscapeStack.removeAndPush("addGroup", function(component){
      component.remove();
    }, $E.addGroupArea);
  });

  $E.findButton.addEventListener("click", function(){
    $C.chatList.element.remove();
    $E.leftPane.appendChild($C.findUserArea.element);
    $E.chatsButton.classList.remove("active");
    $E.findButton.classList.add("active");
  });

  $E.chatsButton.addEventListener("click", function(){
    $C.findUserArea.element.remove();
    $E.leftPane.appendChild($C.chatList.element);
    $E.findButton.classList.remove("active");
    $E.chatsButton.classList.add("active");
  });

  /** @type {Object<string, HTMLFormElement>} */
  const { registrationForm, loginForm } = document.forms;
  loginForm.addEventListener("submit", async function(event){
    event.preventDefault();
    event.submitter.innerHTML = Create.spinnerHTML;
    event.submitter.disabled = true;
    try{
      const data = await FetchRequest.sendForm(this);
      await User.init();
      console.log(data);
      this.reset();
      $E.loginArea.remove();
    } catch(ex){
      console.log(ex);
    }
    event.submitter.innerHTML = "Login";
    event.submitter.disabled = false;
  });
  registrationForm.addEventListener("submit", async function(event){
    event.preventDefault();
    event.submitter.innerHTML = Create.spinnerHTML;
    event.submitter.disabled = true;
    try{
      const data = await FetchRequest.sendForm(this);
      await User.init();
      this.reset();
      $E.registerArea.remove();
    } catch(ex){
      console.log(ex);
    }
    event.submitter.innerHTML = "Register";
    event.submitter.disabled = false;
  });

  $E.registerSwitch.addEventListener("click", function(){
    $E.loginArea.remove();
    $E.mainArea.appendChild($E.registerArea);
  });
  $E.loginSwitch.addEventListener("click", function(){
    $E.registerArea.remove();
    $E.mainArea.appendChild($E.loginArea);
  });

  /** @type {Object<string, HTMLFormElement>} */
  const { addGroupForm } = document.forms;
  /** @type {HTMLInputElement} */
  const user_ids = addGroupForm.elements.user_ids;

  let timeout, oldValue = "";
  $E.addGroupQuery.addEventListener("keyup", function(){
    const query = $E.addGroupQuery.value.trim();
    if(query.length < 4 || query === oldValue){
      return;
    }
    clearTimeout(timeout);
    oldValue = query;
    $C.userSearchSuggetions.clear().append(Create.spinnerWithParent);
    timeout = setTimeout(async function(query){
      try{
        /** @type {UserResponse[]} */
        const usersResponse = await FetchRequest.get("/api/user/search?query=" + query);
        $C.userSearchSuggetions.clear();
        usersResponse.forEach(user => {
          if(user_ids.value.includes(user._id)){
            return;
          }
          const userItem = Create.userItem(user.name, "@" + user.username).property({
            className: "container row suggestion"
          }).on({
            click(){
              const capsule = Create.capsule("@" + user.username);
              capsule.components.closeButton.on({
                click(){
                  const array = user_ids.value.split(" ");
                  const index = array.indexOf(user._id);
                  if(index > -1){
                    array.splice(index, 1);
                    user_ids.value = array.join(" ");
                  }
                  capsule.element.remove();
                }
              });
              user_ids.value += " " + user._id;
              $E.addGroupQuery.value = "";
              $C.userSearchSuggetions.clear()
              $E.addGroupUserCapsules.appendChild(capsule.element);
              $E.addGroupQuery.focus();
            }
          });
          const { classList } = userItem.components.image.element;
          classList.add("size-1");
          classList.remove("size-2");
          $C.userSearchSuggetions.append(userItem.element);
        });
        if(usersResponse.length === 0){
          $C.userSearchSuggetions.property({ innerHTML: `<div class="container error w-fill center">No users found</div>` });
        }
      } catch(ex){
        console.log(ex);
      }
    }, 500, query);
  });
  // $E.addGroupQuery.addEventListener("focus", function(){
  //   $C.userSearchSuggetions.style({ display: "initial" });
  // });
  // $E.addGroupQuery.addEventListener("blur", function(){
  //   $C.userSearchSuggetions.style({ display: "none" });
  // });

  $E.loginArea.remove();
  $E.registerArea.remove();
  $E.addGroupArea.remove();

  User.onInit = async function(){

    $E.userFullname.innerText = User.name;

    $C.userPicture.property({ innerText: User.getInitials(User.name) })
      .style({ backgroundColor: Color.next() });
    /** @type {ChatsResponse[]} */
    const chats = await FetchRequest.get("/api/participant/user?chats=true");
    chats.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).forEach(data => {
      const chat = new Chat(data.chat);
      Chats.set(chat.id, chat);
      $E.chats.appendChild(chat.chatItem.element);
    });

  };

  try{
    await User.init();
    SocketClient.init({
      async message(data){
        // noMessageInfo.remove();
        if(Chats.has(data.chat)){
          const chat = Chats.get(data.chat);
          chat.addMessage(data);
        }else{
          try{
            /** @type {GetEndPointResponseMap["/api/chat/:chatId"]} */
            const chatResponse = await FetchRequest.get("/api/chat/" + data.chat);
            const chat = new Chat(chatResponse);
            Chats.set(chat.id, chat);
          } catch(ex){
            console.log(ex);
          }
        }
      }
    });
  } catch(ex) {
    console.log(ex);
    $E.mainArea.appendChild($E.loginArea);
  }

  $E.spinnerArea.remove();

}

function formatDate(date) {
  if (date instanceof Date === false) {
    date = new Date(date);
  }
  let deltaDate = Date.now() - date;
  deltaDate = Math.floor(deltaDate / 1000);
  if (deltaDate < 1)
    return "just now";
  else if (deltaDate < 60)
    return deltaDate + "s";
  deltaDate = Math.floor(deltaDate / 60);
  if (deltaDate < 60)
    return deltaDate + "min";
  deltaDate = Math.floor(deltaDate / 60);
  if (deltaDate < 24)
    return deltaDate + "hr";
  deltaDate = Math.floor(deltaDate / 24);
  if (deltaDate < 28)
    return deltaDate + "d";
  return (date);
}

class ContentUpdater{
  /** @type {Set<WeakRef<HTMLElement>>} */
  static #elements = new Set();
  static #interval_id;
  static #timeout = 60000;

  static addElement(element){
    this.#elements.add(new WeakRef(element));
    this.#start();
  }

  static #start(){
    if(this.interval_id !== undefined){
      return;
    }
    const handler = () => {
      if(this.#elements.size === 0){
        return this.#pause();
      }
      for(const reference of this.#elements){
        const element = reference.deref();
        if(element){
          const integer = parseInt(element.dataset["timestamp"]);
          if(integer > 0){
            element.innerHTML = formatDate(integer);
          }else console.log(element.dataset)
        }else{
          this.#elements.delete(reference);
        }
      }
    };
    this.#interval_id = setInterval(handler, this.#timeout);
    handler();
  }

  static #pause(){
    this.#interval_id = clearInterval(this.#interval_id);
  }

};

window.addEventListener("load", main);