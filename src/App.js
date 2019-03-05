const express = require('express');
const http = require('http');
const io = require('socket.io');
const fs = require('fs');
const Client = require('./Client').default;
const Room = require('./Room').default;
const Cleanup = require('./cleanup').Cleanup;
const { createCanvas } = require('canvas');
const path = require('path');
const bodyParser = require('body-parser');


class App {
  constructor() {
    this.app = express();
    this.http = http.Server(this.app);
    this.io = io(this.http, {
      transports: ['websocket']
    });

    this.clients = {};
    this.config = {};
    this.users = {};
    this.rooms = {}

    this.io.of(/room-./i).on("connect", socket => {
      const name = socket.nsp.name.substring(6);
      const client = this.clients[socket.id.split("#")[1]];
      let room = this.getRoom(name, socket.nsp);

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
    this.app.use(bodyParser.urlencoded({ extended: false }));

    this.app.get('/preview/:room', (req, res) => {
      let name = req.params.room.substring(0, req.params.room.length - path.extname(req.params.room).length);
      const type = path.extname(req.params.room).substring(1) || 'png';
      const room = this.getRoom(name);
      let scale;
      try {
        scale = parseInt(req.query.s) || 3;
      } catch(e) {
        scale = 3;
      }

      const canvas = createCanvas(room.pixels[0].length * scale, room.pixels.length * scale);
      const ctx = canvas.getContext('2d');


      for(let y = 0; y < room.pixels.length; y++) {
        for(let x = 0; x < room.pixels[y].length; x++) {
          ctx.fillStyle = room.colors[room.pixels[y][x]];
          ctx.fillRect(x * scale, y * scale, scale, scale);
        }
      }

      let stream;

      switch(type) {
        case 'png':
          stream = canvas.createPNGStream();
          break;
        case 'jpeg':
        case 'jpg':
          stream = canvas.createJPEGStream();
          break;
        default:
          throw "Invalid type";
      }

      stream.pipe(res);

    });

    this.http.listen(this.config["port"], this.config["host"], (() => {
      console.log('[DEBUG] Listening on ' + this.config["host"] + ':' + this.config["port"]);
    }).bind(this));

    setInterval(() => {
      this.saveAll();
    }, this.config.save_interval)

    setInterval(() => {
      this.sendAll();
    }, this.config.init_interval);

    Cleanup(this.saveAll);
  }

  getRoom(name, nsp) {
    if (name in this.rooms) {
      return this.rooms[name];
    }

    if(!nsp)
      nsp = this.io.of("/room-" + name);

    const room = new Room(this, nsp);
    this.rooms[name] = room;

    return room;
  }

  sendAll() {
    for(let clientId of Object.keys(this.clients)) {
      const client = this.clients[clientId];

      if(!client.room)
        return;

      client.sendRoom();
    }
  }

  saveAll() {
    for(let roomName of Object.keys(this.rooms)) {
      const room = this.rooms[roomName];

      room.saveFile();
    }
  }

  loadConfig() {
    this.config = JSON.parse(fs.readFileSync("config.json", "utf8"));
    this.config = JSON.parse(fs.readFileSync("users.json", "utf8"));
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
