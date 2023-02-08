/// <reference path="fetch-request.js"/>
/// <reference path="extra.js"/>
/// <reference path="fn-stack.js"/>
/// <reference path="chat.js"/>
/// <reference path="user.js"/>
/// <reference path="../../node_modules/socket.io/client-dist/socket.io.js"/>

/** @type {Manager<Chat>} */
const Chats = new Manager();
Chats.onset = function(chat, id){};

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

window.addEventListener("load", main);