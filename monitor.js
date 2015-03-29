var net = require('net');
var request = require('request');

var sockets = 0;
var timeout;

var noop = function() {};
var gc = function() {
	if (sockets) return;

	clearTimeout(timeout);
	server.close();

};
var server = net.createServer(function(socket) {
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
		});
	});
	socket.on('error', function() {
		socket.destroy();
	});
	socket.on('end', function() {
		socket.destroy();
	});
	socket.on('close', function() {
		sockets--;

		Object.keys(hosts).forEach(function(host) {
			request.post(host + '/gc', noop);
		});

		gc();
	});
});

timeout = setTimeout(gc, 10000);
server.listen(63567, '127.0.0.1');
