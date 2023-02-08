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

/**
 * @template T
 * @extends {Map<string, T>} */
class Manager extends Map{
  /** @type {(data: T, key: string)} */
  onset = () => {};
  /** @param {(data: T, key: string) boolean} predicate */
  find(predicate){
    for(const [key, data] of this){
      if(predicate(data, key) === true)
        return data;
    }
    return null;
  }
};

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