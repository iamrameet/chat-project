class FnStack{
  /** @type {{ action: () void, args: any[], id: symbol | string }[]} */
  #actions = [];
  /**
   * @template T
   * @param {T} args
   * @param {(...args: T) void} action
   */
  push(action, ...args){
    const id = Symbol();
    this.#actions.push({ action, args, id });
    return id;
  }
  /**
   * @template T
   * @param {symbol | string} id
   * @param {T} args
   * @param {(...args: T) void} action
   */
  removeAndPush(id, action, ...args){
    this.remove(id);
    this.#actions.push({ action, args, id });
    return id;
  }
  /** @param {symbol | string} id */
  remove(id){
    const index = this.#actions.findIndex(fn => fn.id === id);
    if(index !== -1){
      this.#actions.splice(index, 1);
    }
  }
  pop(){
    const fn = this.#actions.pop();
    if(fn){
      fn.action(...fn.args);
    }
  }
  pop(){
    for(const fn of this.#actions){
      fn.action(...fn.args);
    }
  }
};