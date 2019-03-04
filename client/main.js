(function() {
    const debug = true;

    class Mode {
        get name() {
            return this._name;
        }

        onLeftClick(client) {
            return;
        }
    }

    class SetMode extends Mode {
        constructor() {
            super();
            this._name = 'Set';
        }

        onLeftClick(client) {
            const p = {
                x: client.canvas.mouse[0],
                y: client.canvas.mouse[1],
                c: client.canvas.selectedColor
            };

            client.io.emit("set", p);
            client.canvas.setPixel(p.x, p.y, p.c)
            client.canvas.renderPixel(p.x,p.y, p.c);
        }
    }

    class Canvas {
        constructor(id, client) {
            this.canvas = document.getElementById(id)
            this.ctx = this.canvas.getContext('2d');
            this.client = client;

            this.dims = [0,0];
            this.state = [];
            this.colors = [];
            this.overlay = {};
            this.mouse = [-1,-1];
            this.scale = 10;
            this.colors = [];
            this.selectedColor = 1;
        }

        updateMousePos(evt) {
            const rct = this.canvas.getBoundingClientRect();
            const x = Math.floor((evt.clientX - rct.left) / this.scale)
            const y = Math.floor((evt.clientY - rct.top) / this.scale);
            this.mouse = [x, y];
        }

        getPixel(x, y) {
            x = Math.min(x, this.dims[0]);
            y = Math.min(y, this.dims[1]);

            var px = false;
            try {
                px = this.state[y][x] ;
            } catch(ignored) {
            }
            return px;
        }

        setPixel(x, y, set, color=null) {
            x = Math.min(x, this.dims[0]);
            y = Math.min(y, this.dims[1]);
            color = parseInt(color);

            this.state[y][x] = Boolean(set);

            if(x === this.mouse[0] && y === this.mouse[1]) {
                this.client.updateStatus();
            }
            return this.colors[this.getPixel(x, y)]
        }

        setOverlayPixel(x, y, color) {
            x = Math.min(x, this.dims[0]);
            y = Math.min(y, this.dims[1]);
            color = color;

            this.overlay[`${x},${y}`] = color;
        }

        clearOverlay() {
            this.overlay = {};
        }

        renderPixel(x, y, color=null) {
            if (!color) {
                color = this.getPixel(x,y)
            }
            this.ctx.fillStyle = this.colors[color];
            this.ctx.fillRect( x*this.scale, y*this.scale, this.scale, this.scale);
        }

        render() {
          this.canvas.width  = this.scale * this.dims[0];
          this.canvas.height = this.scale * this.dims[1];

          for (let y = 0; y < this.dims[1] + 1; y++) {
              for (let x = 0; x < this.dims[0] + 1; x++) {
                  this.renderPixel(x, y);
              }
          }

          this.renderPixel(this.mouse[0], this.mouse[1], this.getPixel(this.mouse[0], this.mouse[1]));
        }
    }

    class Client {
        constructor(url, id) {
            // this.scrollbar = new SimpleBar(document.body);

            this.setOverlay('Connecting...');
            this.clients = 0;
            this.mode = new SetMode();

            this.canvas = new Canvas(id, this);
            this.io = io({
                transports: ['websocket']
              });
            this.roomName = null;
            this.joinRoom(window.location.hash.substr(1) || "global");

            this.io.on("connect", (d) => this.onConnect(d));
            this.io.on("disconnect", (d) => this.onDisconnect(d));
            this.io.on("stats", (d) => this.onStats(d));

            this.canvas.canvas.addEventListener('click', (e) => {
                if(e.altKey) return;
                this.canvas.updateMousePos(e);

                this.updateStatus();

                if (!this.mode) return;
                this.mode.onLeftClick(this);
            });

            /*
            this.mouseMoveBefore = [0,0];
            this.mouseMoveInterval = setInterval(() => {
                if(this.canvas.mouse[0] !== this.mouseMoveBefore[0] || this.canvas.mouse[1] !== this,this.mouseMoveBefore[1]) {
                    this.io.emit('cursor', this.canvas.mouse);
                }
            }, 500);
            */

            this.canvas.canvas.addEventListener('mousemove', (e) => {
                const mbX = this.canvas.mouse[0];
                const mbY = this.canvas.mouse[1];
                this.canvas.updateMousePos(e);
                if(mbX !== this.canvas.mouse[0] || mbY !== this.canvas.mouse[1]) {
                    this.canvas.renderPixel(mbX, mbY);
                    this.canvas.renderPixel(this.canvas.mouse[0], this.canvas.mouse[1], this.canvas.selectedColor);
                }

                this.updateStatus();
            });

            this.canvas.canvas.addEventListener('contextmenu', (e) => {
                this.canvas.updateMousePos(e);
                this.updateStatus();
            });

            const siht = this
            function dlCanvas() {
              var dt = siht.canvas.canvas.toDataURL('image/png');
              /* Change MIME type to trick the browser to downlaod the file instead of displaying it */
              dt = dt.replace(/^data:image\/[^;]*/, 'data:application/octet-stream');

              /* In addition to <a>'s "download" attribute, you can define HTTP-style headers */
              dt = dt.replace(/^data:application\/octet-stream/, 'data:application/octet-stream;headers=Content-Disposition%3A%20attachment%3B%20filename=Canvas.png');

              this.href = dt;
            }
            document.getElementById("dl").addEventListener('click', dlCanvas, false);



            var settings = {
              scrollVertical: true,
              scrollHorizontal: true,
              cursor: null
            };

            var clicked = false,
              clickY, clickX;

            var getCursor = function() {
              if (settings.cursor) return settings.cursor;
              if (settings.scrollVertical && settings.scrollHorizontal) return 'move';
              if (settings.scrollVertical) return 'row-resize';
              if (settings.scrollHorizontal) return 'col-resize';
            }

            var updateScrollPos = function(e, el) {
               window.event = e
              $('html').css('cursor', getCursor());
              var $el = $(el);
              settings.scrollVertical && $el.scrollTop($el.scrollTop() + (clickY - e.pageY));
              settings.scrollHorizontal && $el.scrollLeft($el.scrollLeft() + (clickX - e.pageX));
            }

            $(document).on({
              'mousemove': function(e) {
                clicked && updateScrollPos(e, this);
              },
              'mousedown': function(e) {
                  if(e.altKey || e.which === 2) {
                    clicked = true;
                    clickY = e.pageY;
                    clickX = e.pageX;
                    e.preventDefault();
                  }
              },
              'mouseup': function(e) {
                clicked = false;
                $('html').css('cursor', 'auto');
                        e.preventDefault();
              }
            });

            $(window).bind('keydown', function(event) {
                if (event.ctrlKey || event.metaKey) {
                    switch (String.fromCharCode(event.which).toLowerCase()) {
                    case 's':
                        event.preventDefault();
                        document.getElementById("dl").click();
                        break;
                    case 'f':
                    case 'g':
                        // event.preventDefault();
                        break;
                    case 'c':
                        alert('Use Right Click to save the canvas');
                        break;
                    }
                }
            });

            $(document).on('wheel', (e) => {
                if(!e.ctrlKey)
                    return;
                if(e.originalEvent.deltaY === 0) {
                    return true;
                }

                if(e.originalEvent.deltaY <= 0) {
                    this.canvas.scale = Math.min(siht.canvas.scale + 1, 20);
                } else {
                    this.canvas.scale = Math.max(siht.canvas.scale - 1, 1);
                }
                console.log(`[Client] Zoom Level: ${siht.canvas.scale}`);
                this.canvas.render();
                return false;
            });

            $(window).on('hashchange', () => {
                this.joinRoom(window.location.hash.substr(1) || "global");
            });
        }

        joinRoom(name) {
            if (this.room) {
                this.room.disconnect();
            }

            if (this.roomName && name === this.roomName) {
                return;
            }

            this.setOverlay("Joining room " + name);

            this.room = io('/room-' + encodeURIComponent(name));

            this.room.on("room", (d) => this.onInit(d));
            this.room.on("set", (d) => this.onSet(d));

            this.roomName = name;
            if (name === 'global') {
                window.location.hash = '';
            } else {
                window.location.hash = '#' + name;
            }
            console.log(`[Client] Joined room: ` + name);
            // this.setOverlay("Geting pixels...");
        }

        login(username, password) {
            this.io.emit('login', {username, password});
        }

        emitPixel(x, y, set) {
            x = Math.min(x, this.canvas.dims[0]);
            y = Math.min(y, this.canvas.dims[1]);
            if (this.canvas.getPixel(x, y) !== set) {
                var p = {x: x, y: y, c: set}
                this.io.emit("set", p);
            }
        }

        setOverlay(txt) {
            const o = document.getElementById('overlay');
            const s = document.getElementById('overlay-status');
            if (!txt) {
                s.innerText = '';
                o.classList.add('hidden');
            } else {
                s.innerText = txt;
                o.classList.remove('hidden');
            }
        }

        onConnect(d) {
            console.log(`[Client] Connected`);
            // this.setOverlay("Geting pixels...");
        }

        onDisconnect() {
            console.log(`[Client] Disconnected, retrying connection...`);
            this.setOverlay('Disconnected, retrying...');
        }

        onInit(data) {
            const px = data.pixels;
            this.canvas.colors = data.colors;
          $("#info").text(this.toString());
          this.setOverlay(null);
          console.log(`[Client] Init`);
          this.canvas.dims = [px[0].length,px.length];
          this.canvas.state = px;
          this.canvas.render();

            const form = $('#colorpicker').clone()[0]
            form.innerHTML = ''
            for(let i = 0; i < this.canvas.colors.length; i++) {
                const color = this.canvas.colors[i];
                const active = this.canvas.selectedColor === i ? 'checked' : '';
                form.innerHTML += '<input class="colorbutton" type="radio" name="c" value="'+i+'" style="background-color: '+color+'" '+active+' />\n';
            }

            $('#colorpicker').replaceWith(form)
            $('input[name="c"]').on('change', () => {
                this.canvas.selectedColor = parseInt(document.querySelector('input[name="c"]:checked').value);
            })
        }

        onSet(p) {
          this.canvas.setPixel(p.x, p.y, p.c)
          this.canvas.renderPixel(p.x,p.y, p.c);
        }

        onStats(stats) {
            const users = stats.globalCount;
            if(users != this.clients) {
                this.clients = users;
                console.log(`[Client] Users connected: ${this.clients}`);
            }
          this.canvas.render();
            window.document.title = "AL1L Draw | " + users + " Online!"
        }

        updateStatus() {
            $("#info").text(this.toString());
        }

        toString() {
            const x = this.canvas.mouse[0];
            const y = this.canvas.mouse[1];
            const sel = 'None';
            const colored = this.canvas.getPixel(x, y) ? 'filled' : 'empty';
            const mode = this.mode.name;

            return `x: ${x}, y: ${y}`;
        }
    }

    const client = new Client(undefined, 'can');

    if(debug) window.client = client;


})();

const copyToClipboard = str => {
  const el = document.createElement('textarea');  // Create a <textarea> element
  el.value = str;                                 // Set its value to the string that you want copied
  el.setAttribute('readonly', '');                // Make it readonly to be tamper-proof
  el.style.position = 'absolute';
  el.style.left = '-9999px';                      // Move outside the screen to make it invisible
  document.body.appendChild(el);                  // Append the <textarea> element to the HTML document
  const selected =
    document.getSelection().rangeCount > 0        // Check if there is any content selected previously
      ? document.getSelection().getRangeAt(0)     // Store selection if found
      : false;                                    // Mark as false to know no selection existed before
  el.select();                                    // Select the <textarea> content
  document.execCommand('copy');                   // Copy - only works as a result of a user action (e.g. click events)
  document.body.removeChild(el);                  // Remove the <textarea> element
  if (selected) {                                 // If a selection existed before copying
    document.getSelection().removeAllRanges();    // Unselect everything on the HTML document
    document.getSelection().addRange(selected);   // Restore the original selection
  }
};


//Cross-browser function to select content
function SelectText(element) {
    var doc = document;
    if (doc.body.createTextRange) {
        var range = document.body.createTextRange();
        range.moveToElementText(element);
        range.select();
    } else if (window.getSelection) {
        var selection = window.getSelection();
        var range = document.createRange();
        range.selectNodeContents(element);
        selection.removeAllRanges();
        selection.addRange(range);
    }
}
