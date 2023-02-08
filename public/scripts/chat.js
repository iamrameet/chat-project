/// <reference path="create.js"/>

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