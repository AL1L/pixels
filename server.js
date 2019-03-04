const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const fs = require('fs');

let config, users, pixels;

function load_config() {
    config = JSON.parse(fs.readFileSync("config.json", "utf8"));
    users = JSON.parse(fs.readFileSync("users.json", "utf8"));
}

load_config();

var ratelimits = {};

function dimensional_array(dimensions,default_value) {
    var array = [];
    for (var i = 0; i < dimensions[0]; ++i) {
        array.push(dimensions.length == 1 ? default_value : dimensional_array(dimensions.slice(1), default_value));
    }
    return array;
}

try {
    pixels = JSON.parse(fs.readFileSync(config["pixels_path"], "utf8"));
} catch (e) {
    pixels = dimensional_array([config.dim[1], config.dim[0]], config["default_color"]);
}

app.use(express.static(__dirname + '/./client'));

io.on('connection', socket => {
    console.log("[CONNECTION] Online: " + io.engine.clientsCount);
    socket.emit('init', {colors: config.colors, pixels: pixels});
    socket.emit("users", io.engine.clientsCount);
    socket.on('login', details => {
        if (details.username.toLowerCase() in users) {
            if (details.password === users[details.username.toLowerCase()]) {
                socket.user = details.username;
                socket.emit('auth', true);
            }
        }
    });
    socket.on('set', p => {
        if (ratelimits[socket.id] && ((new Date()).getTime() - ratelimits[socket.id]) < config["ratelimit"]) {
            return;
        }

        ratelimits[socket.id] = (new Date()).getTime();

        try {
            if (p.y < config.dim[1] && p.x < config.dim[0] && p.y>=0 && p.x >= 0 && Number.isInteger(p.c) && p.c >=0 && p.c < colors.length) {
                pixels[p.y][p.x] = p.c
                io.emit('set', {
                    x: p.x,
                    y: p.y,
                    c: p.c
                });
            }
        } catch (e) {
        }
    });
});

setInterval(() => {
    io.emit("init", {colors: config.colors, pixels: pixels});
    io.emit("users", io.engine.clientsCount);
}, config["init_interval"]);

setInterval(() => {
    fs.writeFile(
        config["pixels_path"],
        JSON.stringify(pixels),
        err => {
            if (err) {}
        }
    );
}, config["save_interval"]);


http.listen(config["port"], config["host"], function() {
    console.log('[DEBUG] Listening on ' + config["host"] + ':' + config["port"]);
});
