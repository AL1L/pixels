function drawSquare(x, y, length, width, set) {
    for(let x1=x; x < x + width; x++) {
        for(let y1=y; y< y + width; y++) {
            if (client.canvas.getPixel(x, y) !== set) {
                client.io.emit('set', {
                    x: x1,
                    y: y1,
                    c: set
                });
            }
        }
    }
}
