const io = require('socket.io');

class Client {
  constructor(app, socket) {
    /** @type {App} */
    this.app = app;
    /** @type {SocketIO.Socket} */
    this.socket = socket;
    this.id = socket.id;
    this.nickname = this.app.newNickname();
    this.rateLimit;
    this.setup = false;
    this.user = false;

    this.app.sendStats();

    this.sendAuth();

    this.socket.on('login', details => {
        if (details.username.toLowerCase() in this.app.users) {
            if (details.password === this.app.users[details.username.toLowerCase()]) {
                this.user = details.username;
                socket.emit('auth', true);
            }
        }
    });
    this.socket.on('set', p => {
        if(!this.room)
          return;
        if(p.c === this.room.pixels[p.y][p.x])
          return;
        if(!this.user) {
          if (this.rateLimit && ((new Date()).getTime() - this.rateLimit) < this.app.config["ratelimit"]) {
              return;
          }

          this.rateLimit = (new Date()).getTime();
        }

        try {
          this.room.setPixel(p.x, p.y, p.c, this.nickname);
        } catch (e) {
          console.error(e);
        }
    });

  }

  setRoom(room, socket) {
    this.room = room;
    this.roomSocket = socket;

    if(socket && room) {
      this.sendRoom();
      this.sendAuth();
    }
  }

  sendRoom() {
    const users = [];
    for(let clientId of Object.keys(this.room.clients)) {
      const user = this.room.clients[clientId];
      users.push(user.nickname);
    }
    this.roomSocket.emit("room", {
      users: users,
      colors: this.room.colors,
      pixels: this.room.pixels
    });
  }

  sendAuth() {
    this.socket.emit("auth", {
      nickname: this.nickname,
      id: this.socket.id,
      loggedIn: false
    });
  }
}

module.exports.default = Client;
