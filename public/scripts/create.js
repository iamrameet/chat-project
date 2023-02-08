/// <reference path="ui-component.js"/>

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