var dgram = require('dgram');

var BROADCAST = '224.0.0.234';
var PORT = 60547;

module.exports = function(me, port, callback) {
	if (!callback) {
		callback = port;
		port = PORT;
	}

	var server = dgram.createSocket('udp4');
	var env = process.env;
	var hosts = {};
	var found = 0;

	var clear = function() {
		hosts = {};
	};
	var encode = function() {
		return 'ann;'+me+(Object.keys(hosts).length ? ';'+Object.keys(hosts).join(';') : '');
	};
	var send = function(msg) {
		msg = new Buffer(msg);
		server.send(msg, 0, msg.length, PORT, BROADCAST);
	};
	var find = function() {
		var then = found;
		var timeout = 10;
		var loop = function() {
			if (then < found) return find();
			if (timeout > 15000) return clear();

			send(encode());
			setTimeout(loop, timeout *= 2);
		};

		loop();
	};

	process.env = {};
	server.bind(port || PORT);
	process.env = env;

	me = Math.random().toString(16).substr(2)+'@'+me;
	server.setBroadcast(true);
	server.addMembership(BROADCAST);
	server.on('message', function(message, rinfo) {
		var parts = message.toString().split(';');
		var type = parts[0];
		var from = parts[1];

		if (parts.indexOf(me, 2) > -1) return;
		if (from === me) return;
		if (!from) return;

		if (type === 'ann') {
			send('ack;'+me);
		}
		if (!hosts[from]) {
			found++;
			hosts[from] = 1;
			callback(from.split('@')[1]);
		}
	});

	find();

	return find;
};