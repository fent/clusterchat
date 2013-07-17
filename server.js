var cluster = require('cluster');
var store = new (require('socket.io-clusterhub'))();
//var numCPUs = require('os').cpus().length;
var numCPUs = 4;


if (cluster.isMaster) {
  for (var i = 0; i < numCPUs; i++) {
    cluster.fork();
  }

} else {
  var http = require('http');
  var express = require('express');
  var app = express();
  var server = http.createServer(app);
  var io = require('socket.io').listen(server);

  app.configure(function() {
    app.use(express.favicon());
    app.use(express.static(__dirname + '/public'));
  });

  app.get('/', function(req, res) {
    res.sendfile(__dirname + '/index.html');
  });

  server.listen(3000);
  console.log('Listening on port 3000');


  // setup socket.io
  io.configure(function() {
    io.set('log level', 1);
    io.set('store', store);
  });

  // listen for new connections
  io.sockets.on('connection', function(socket) {
    console.log('New client on', process.pid);
    store.hub.get('users', function(users) {
      if (!users) return;
      socket.emit('online', users);
    });

    store.hub.get('messages', function(messages) {
      if (!messages) return;
      socket.emit('messages', messages);
    });

    socket.once('name', function(name) {
      name = name.substring(0, 20);
      socket.name = name;
      store.hub.rpush('users', name);
      io.sockets.emit('enter', name);

      // flood protection
      var queue = [], busy = false, tid;

      function flushQ() {
        var m = queue.shift();
        if (!m) return busy = false;
        processMsg(m);
      }

      function processMsg(message) {
        busy = true;
        store.hub.rpush('messages', message, function(len) {
          if (len <= 10) return;
          // only keep track of the last 15 messages
          store.hub.ltrim('messages', -15);
        });
        io.sockets.emit('msg', message);
        tid = setTimeout(flushQ, 1000);
      }

      socket.on('msg', function queueMsg(msg) {
        if (queue.length > 10) {
          socket.emit('flood');
          socket.removeListener('msg', queueMsg);
          setTimeout(function() {
            socket.on('msg', queueMsg);
          }, 10000);
          return;
        }

        msg = msg.substring(0, 200);
        var message = { user: socket.name, msg: msg };
        if (busy) {
          queue.push(message);
        } else {
          processMsg(message);
        }
      });

    });

    socket.on('disconnect', function() {
      if (socket.name) {
        store.hub.lrem('users', 1, socket.name);
        io.sockets.emit('leave', socket.name);
      }
    });

  });
}
