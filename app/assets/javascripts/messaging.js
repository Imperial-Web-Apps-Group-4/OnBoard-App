/* exported Message GameMessage Action Movement */

class Message {
  constructor(type) {
    this.type = type;
  }

  serialise() {
    return JSON.stringify(this);
  }
}

class GameMessage extends Message {
  constructor(action) {
    super('game');
    this.action = action;
  }
}

class Action {
  constructor(type) {
    this.type = type;
  }
}

class Movement extends Action {
  constructor(componentID, newX, newY) {
    super('movement');
    this.componentID = componentID;
    this.newX = newX;
    this.newY = newY;
  }
}