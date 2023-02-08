/// <reference path="../../helper/response.ts"/>

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
