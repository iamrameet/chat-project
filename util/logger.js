class Logger{
  #type;
  constructor(type){
    this.#type = type;
  }
  log(...args){
    Logger.log(this.#type, ...args);
  }
  error(error){
    Logger.error(this.#type, error);
  }

  static log(type, ...args){
    console.log(`[LOG] [${type}]: `, ...args);
  }
  static error(type, error){
    console.trace(`[ERR] [${type}]: `, error);
  }
};

module.exports = Logger;