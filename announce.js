var dgram = require('dgram');

var MULTICAST_ADDRESS = '224.0.0.234';
var MULTICAST_PORT = 60547;

module.exports = function(me, options, callback) {
	var server = dgram.createSocket({type: 'udp4', reuseAddr: true, toString: function () { return 'udp4' }});
	var env = process.env;
	var hosts = {};
	var found = 0;
	var loopTimer;

	var port = options.port || MULTICAST_PORT;
	var host = options.host || MULTICAST_ADDRESS;
	var multicast = !(options.multicast === false || (options.multicast === undefined && process.env.NODE_ENV === 'development'));

	var clear = function() {
		hosts = {};
	};
	var encode = function() {
		return 'ann;' + me + (Object.keys(hosts).length ? ';' + Object.keys(hosts).join(';') : '');
	};
	var send = function(msg) {
		msg = new Buffer(msg);
		server.send(msg, 0, msg.length, port, host);
	};
	var find = function() {
		var then = found;
		var timeout = 10;
		var loop = function() {
			if (then < found) return find();
			if (timeout > 15000) return clear();

			send(encode());
			loopTimer = setTimeout(loop, timeout *= 2);
		};

		loop();
	};

	me = Math.random().toString(16).substr(2) + '@' + me;

	process.env = {};
	server.bind(port);
	process.env = env;

	server.on('listening', function() {
		if (!multicast) server.setMulticastTTL(0);
		try {
			server.addMembership(host);
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
			send('ack;' + me);
		}
		if (!hosts[from]) {
			found++;
			hosts[from] = 1;
			callback(null, from.split('@')[1]);
		}
	});

	find();

	var announcer = {};
	announcer.close = function() {
		if (server) {
			server.close();
			server = null;
		}
		clearTimeout(loopTimer);
	};

	return announcer;
};
