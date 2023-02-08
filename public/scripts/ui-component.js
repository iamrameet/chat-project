/**
 * @typedef {{class: string, classList: string[], id: string, html: string, children: HTMLElement[]}} AttrsObject
 * @typedef {{[key in keyof HTMLElementEventMap]: (event: HTMLElementEventMap[key])}} EventsObject
 */

/**
 * @template {HTMLElement} T
 * @template {string} C */
class UIComponent{

  /** @type {{[elementId in C]: UIComponent<HTMLElement>}} */
  components = {};

  /** @param {T} element */
  constructor(element){
    this.element = element;
  }

  /** @param {{[attributeName: string]: string}} attributes */
  attr(attributes){
    for(const property in attributes){
      if(typeof attributes[property] === "boolean"){
        this.element.toggleAttribute(property, attributes[property]);
        continue;
      }
      this.element.setAttribute(property, attributes[property]);
    }
    return this;
  }

  /**
   * @template {keyof T} P
   * @param {P} property */
  getProperty(property){
    return this.element[property];
  }

  /** @param {T} properties */
  property(properties){
    for(const property in properties){
      this.element[property] = properties[property];
    }
    return this;
  }

  /** @param {CSSStyleDeclaration} styles */
  style(styles){
    for(const property in styles){
      this.element.style[property] = styles[property];
    }
    return this;
  }

  /**
   * @param {EventsObject} events
   * @param {boolean | AddEventListenerOptions} [options]*/
  on(events, options){
    for(const eventName in events){
      this.element.addEventListener(eventName, events[eventName], options);
    }
    return this;
  }

  clear(){
    this.element.innerText = "";
    return this;
  }

  /** @param {HTMLElement[]} elements */
  append(...elements){
    this.element.append(...elements);
    return this;
  }

  /** @param {HTMLElement[]} elements */
  prepend(...elements){
    this.element.prepend(...elements);
    return this;
  }
  get children(){
    return new Array(...this.element.children).map(childElement => new UIComponent(childElement));
  }

  /** @param {(component: this)} fn */
  scope(fn){
    fn(this);
    return this;
  }

  /**
   * @param {P} id
   * @param {UIComponent<HTMLElement>} component */
  addComponentAs(id, component){
    this.components[id] = component;
    return this;
  }

  /** @param {UIComponent<HTMLElement>[]} components */
  addComponent(...components){
    for(const component of components){
      const id = component.element.id;
      if(!id){
        throw "Element must have a valid Id";
      }
      this.components[id] = component;
    }
    return this;
  }

  /**
   * Creates a new Component using tagName
   * @template {keyof HTMLElementTagNameMap} T
   * @param {T} tagName
   * @param {HTMLElementTagNameMap[T]} properties
   * @returns {UIComponent<HTMLElementTagNameMap[T]>}
   */
  static fromTagName(tagName, properties = {}) {
    const element = document.createElement(tagName);
    return new UIComponent(element).property(properties);
  }

  /**
   * @template {HTMLElement} T
   * @param {UIComponent<T>[]} components
   * @param {T} properties */
  static property(components, properties){
    for(const component of components){
      component.property(properties);
    }
    return this;
  }
};