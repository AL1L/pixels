function drawSquare(x, y, length, width, set) {
    let offset = 1;
    const delay = 250;
    for(let x1=x; x < x + width; x++) {
        for(let y1=y; y< y + width; y++) {
            if (client.canvas.getPixel(x, y) !== set) {
                setTimeout(() => {client.emitPixel(x1,y1, set)}, offset * delay);
                offset++;
            }
        }
    }
}

