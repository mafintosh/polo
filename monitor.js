var net = require('net');
var request = require('request');

var timeout;
var sockets = 0;

var server = net.createServer(function(socket) {
	clearTimeout(timeout);
	sockets++;

	var buf = '';
	var hosts = {};

	socket.setEncoding('utf-8');
	socket.on('data', function(message) {
		var messages = (buf + message).split('\n');

		buf = messages.pop();
		messages.forEach(function(message) {
			message = JSON.parse(message);

			if (message.up) {
				hosts[message.up] = 1;
			} else {
				delete hosts[message.down];
			}

			console.log(message);
		});
	});
	socket.on('close', function() {
		sockets--;

		Object.keys(hosts).forEach(function(host) {
			request.post(host+'/gc');
		});

		if (!sockets) {
			timeout = setTimeout(function() {
				process.exit(0);
			}, 10000);
		}
	});
});

server.on('error', function() {
	process.exit(0);
});

server.listen('/tmp/monitor.sock');