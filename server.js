function dimensional_array(dimensions,default_value) {
    var array = [];
    for (var i = 0; i < dimensions[0]; ++i) {
        array.push(dimensions.length == 1 ? default_value : dimensional_array(dimensions.slice(1), default_value));
    }
    return array;
}

var cfg = require('./config.json');

var DIM = cfg["dim"];
var pixels;
var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var fs = require('fs');

var colors = cfg["colors"];

var ratelimits = {};

try {
    pixels = JSON.parse(fs.readFileSync(cfg["pixels_path"], "utf8"));
} catch (e) {
    pixels = dimensional_array([DIM[1], DIM[0]], cfg["default_color"]);
}

app.use(express.static(__dirname + '/./client'));


io.on('connection', socket => {
    console.log("[CONNECTION] Online: " + io.engine.clientsCount)
    socket.emit('init', {colors: colors, pixels: pixels});
    socket.emit("users", io.engine.clientsCount);
    socket.on('set', p => {
        if (ratelimits[socket.id] && ((new Date()).getTime() - ratelimits[socket.id]) < cfg["ratelimit"]) {
            return;
        }

        ratelimits[socket.id] = (new Date()).getTime();

        try {
            if (p.y < DIM[1] && p.x < DIM[0] && p.y>=0 && p.x >= 0 && Number.isInteger(p.c) && p.c >=0 && p.c < colors.length) {
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
    io.emit("init", {colors: colors, pixels: pixels});
    io.emit("users", io.engine.clientsCount);
}, cfg["init_interval"]);

setInterval(() => {
    fs.writeFile(
        cfg["pixels_path"],
        JSON.stringify(pixels),
        err => {
            if (err) {}
        }
    );
}, cfg["save_interval"]);


http.listen(cfg["port"], cfg["host"], function() {
    console.log('[DEBUG] Listening on ' + cfg["host"] + ':' + cfg["port"]);
});
