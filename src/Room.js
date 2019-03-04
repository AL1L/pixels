const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

class Room {
  constructor(app, nsp) {
    this.config = {};
    this.clients = {};
    this.app = app;
    this.nsp = nsp;
    this.name = nsp.name.substring(6);
    this.hash = crypto.createHash("md5").update(this.name).digest('hex');
    this.filePath = path.join("./rooms", this.hash + ".json");
    this.changes = false;

    this.loadFile();
  }

  setPixel(x, y, c) {
    if(!(Number.isInteger(x) && Number.isInteger(y) && Number.isInteger(c)))
      return;
    if(x >= this.config.pixels.length || y >= this.config.pixels[x].length || x < 0 || y < 0)
      return;
    if(c >= this.config.colors.length || c < 0)
      return;
    if(c === this.config.pixels[y][x])
      return;

    this.config.pixels[y][x] = c;
    this.changes = true;

    this.nsp.emit("set", {
      x, y, c
    })
  }

  get pixels() {
    return this.config.pixels;
  }

  set pixels(p) {
    this.config.pixels = p;
  }

  get colors() {
    return this.config.colors;
  }

  set colors(c) {
    this.config.colors = c;
  }

  addClient(client, socket) {
    client.setRoom(this, socket);
    this.clients[client.id] = client;

    const onDisconnect = (reason => {
      socket.removeListener('disconnect', onDisconnect);
      this.removeClient(client);
    }).bind(this);

    socket.on('disconnect', onDisconnect);
  }

  removeClient(client) {
    delete this.clients[client.id];
    client.setRoom(null, null);
  }

  loadFile() {
    try {
      this.config = JSON.parse(fs.readFileSync(this.filePath, "utf8"));
    } catch (e) {
      this.config = {
        name: this.name,
        admins: null,
        colors: this.app.config.colors,
        pixels: Room.dimensionalArray([this.app.config.dim[1], this.app.config.dim[0]], this.app.config.default_color)
      };

      this.saveFile();
    }
  }

  saveFile() {
    // if(this.changes)
    // return;
    fs.writeFile(this.filePath, JSON.stringify(this.config), () => {});
    this.changes = false;
  }

  static dimensionalArray(dimensions, defaultValue) {
      const arr = [];

      for (var i = 0; i < dimensions[0]; ++i) {
          arr.push(dimensions.length == 1 ? defaultValue : Room.dimensionalArray(dimensions.slice(1), defaultValue));
      }

      return arr;
  }
}

module.exports.default = Room;
