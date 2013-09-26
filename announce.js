var dgram = require('dgram');

var MULTICAST_ADDRESS = '224.0.0.234';
var MULTICAST_PORT = 60547;

module.exports = function(me, options, callback) {
	var server = dgram.createSocket('udp4');
	var env = process.env;
	var hosts = {};
	var found = 0;

	var port = options.port || MULTICAST_PORT;
	var multicast = !(options.multicast === false || (options.multicast === undefined && process.env.NODE_ENV === 'development'));

	var clear = function() {
		hosts = {};
	};
	var encode = function() {
		return 'ann;'+me+(Object.keys(hosts).length ? ';'+Object.keys(hosts).join(';') : '');
	};
	var send = function(msg) {
		msg = new Buffer(msg);
		server.send(msg, 0, msg.length, port, MULTICAST_ADDRESS);
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

	me = Math.random().toString(16).substr(2)+'@'+me;

	process.env = {};
	server.bind(port);
	process.env = env;

	server.on('listening', function() {
		if (!multicast) server.setMulticastTTL(0);
		try {
			server.addMembership(MULTICAST_ADDRESS);
		} catch (e) {
			callback(e);
		}
	});

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
			callback(null, from.split('@')[1]);
		}
	});

	find();

	return find;
};