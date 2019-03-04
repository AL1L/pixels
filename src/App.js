const express = require('express');
const http = require('http');
const io = require('socket.io');
const fs = require('fs');
const Client = require('./Client').default;
const Room = require('./Room').default;


class App {
  constructor() {
    this.app = express();
    this.http = http.Server(this.app);
    this.io = io(this.http, {
      transports: ['websocket']
    });

    this.clients = {};
    this.rooms = {}

    this.io.of(/room-./i).on("connect", socket => {
      const name = socket.nsp.name.substring(6);
      const client = this.clients[socket.id.split("#")[1]];
      let room;

      if (name in this.rooms) {
        room = this.rooms[name];
      } else {
        room = new Room(this, socket.nsp);
        this.rooms[name] = room;
      }

      room.addClient(client, socket);
    });

    this.io.on('connection', ((socket) => {
      console.log("[CONNECTION] Online: " + this.io.engine.clientsCount);
      const client = new Client(this, socket);

      this.clients[socket.id] = client;

      socket.on('disconnect', () => {
        delete this.clients[socket.id];
        console.log("[DISCONNECT] Online: " + this.io.engine.clientsCount);
      });
    }).bind(this));

    this.nicknames = 0;

    this.loadConfig();

    this.app.use(express.static(__dirname + '/../client'));

    this.http.listen(this.config["port"], this.config["host"], (() => {
      console.log('[DEBUG] Listening on ' + this.config["host"] + ':' + this.config["port"]);
    }).bind(this));

    setInterval(() => {
      for(let roomName of Object.keys(this.rooms)) {
        const room = this.rooms[roomName];

        room.saveFile();
      }
    }, this.config.save_interval)

    setInterval(() => {
      for(let clientId of Object.keys(this.clients)) {
        const client = this.clients[clientId];

        if(!client.room)
          return;

        client.sendRoom();
      }
    }, this.config.init_interval)
  }

  loadConfig() {
    this.config = JSON.parse(fs.readFileSync("config.json", "utf8"));
  }

  newNickname() {
    return "User " + this.nicknames++;
  }

  sendStats() {
    this.io.emit("stats", {
      globalCount: this.io.engine.clientsCount
    });
  }
}

module.exports.default = App;
