var root = require('root');
var request = require('request');
var common = require('common');
var proc = require('child_process');
var net = require('net');
var path = require('path');
var announce = require('./announce');

var Repository = common.emitter(function(uri) {
	this.uri = uri;
	this.all = {};
});

Repository.prototype.keys = function() {
	return Object.keys(this.all);
};
Repository.prototype.pushAll = function(vals) {
	var self = this;

	Object.keys(vals).forEach(function(key) {
		self.push(key, vals[key]);
	});
};
Repository.prototype.push = function(key, val) {
	var list = this.all[key] = this.get(key);

	val = Array.isArray(val) ? val : [val];
	list.push.apply(list, val);
	this.emit('push', key, val);
};
Repository.prototype.pop = function(key) {
	var list = this.all[key];

	if (!list) return;
	delete this.all[key];
	this.emit('pop', key, list);
};
Repository.prototype.get = function(key) {
	return this.all[key] || [];
};
Repository.prototype.destroy = function() {
	this.emit('destroy');
	this.keys().forEach(this.pop.bind(this));
};
Repository.prototype.toJSON = function() {
	return this.all;
};

var PROXY = 'address get all push'.split(' ');
var PING_TIMEOUT = 10 * 1000;
var HEARTBEAT = 2 * 60 * 1000;
var ME = function() {
	var nets = require('os').networkInterfaces();

	for (var i in nets) {
		var candidate = nets[i].filter(function(item) {
			return item.family === 'IPv4' && !item.internal;
		})[0];

		if (candidate) {
			return candidate.address;
		}
	}

	return '127.0.0.1';
}();

var startMonitor = function(callback) {
	var retry = function() {
		connect(function(err, socket) {
			if (err) return setTimeout(retry, 100);
			callback(null, socket);
		});
	};
	var fork = function() {
		var child = proc.fork(path.join(__dirname, 'monitor.js'), {
			detached: true,
			stdio: ['ignore', 'ignore', 'ignore']
		});
		child.unref();
		retry();
	};
	var connect = function(callback) {
		var socket = net.connect(63567, '127.0.0.1');
		var onerror = function(err) {
			callback(err);
		};

		socket.on('error', onerror);
		socket.on('connect', function() {
			socket.removeListener('error', onerror);
			callback(null, socket);
		});
	};

	connect(function(err, socket) {
		if (err) return fork();
		callback(null, socket);
	});
};

var pool = {};
var listen = function(options) {
	var that = common.createEmitter();
	var app = root();
	var announcer;
	var id = process.pid.toString(16) + Math.random().toString(16).substr(2);
	var heartbeat;

	var onmonitor = common.future();
	var monitor = function(message) {
		onmonitor.get(function(err, daemon) {
			if (!daemon || !daemon.writable) return;
			daemon.write(JSON.stringify(message) + '\n');
		});
	};

	if (options.useMonitor || options.monitor) {
		startMonitor(onmonitor.put);
	}

	var cache = {};
	var own = new Repository(id);
	var repos = {
		me: own
	};
	var proxy = function(repo) {
		repo.on('push', function(key, values) {
			cache = {};
			values.forEach(function(val) {
				that.emit('push', key, val);
			});
		});
		repo.on('pop', function(key, values) {
			values.forEach(function(val) {
				that.emit('pop', key, val);
			});
		});
	};
	var repository = function(uri) {
		var repo = repos[uri];

		if (repo) return repo;

		monitor({
			up: uri
		});
		repo = repos[uri] = new Repository(uri);
		repo.on('destroy', function() {
			cache = {};
			delete repos[uri];
			monitor({
				down: uri
			});
		});

		proxy(repo);
		return repo;
	};
	var gc = function() {
		remote(function(repo) {
			request({
				uri: repo.uri + '/ping',
				json: true,
				timeout: PING_TIMEOUT
			}, onresponse(repo));
		});

		clearTimeout(heartbeat);
		heartbeat = setTimeout(gc, options.heartbeat || HEARTBEAT);
	};
	var onresponse = function(repo) {
		return function(err, res, body) {
			if (!err && res.statusCode === 200 && body.ack) return;
			repo.destroy();
		};
	};
	var remote = function(fn) {
		Object.keys(repos).forEach(function(uri) {
			if (uri === 'me') return;
			fn(repos[uri]);
		});
	};

	proxy(own);
	own.on('push', function(key, values) {
		cache = {};
		remote(function(repo) {
			request.post({
				uri: repo.uri + '/data/' + key,
				headers: {
					'x-repository': own.uri
				},
				json: true,
				body: values
			}, onresponse(repo));
		});
	});

	app.get('/' + id, function(req, res) {
		res.send(own);
	});
	app.get('/' + id + '/ping', function(req, res) {
		res.send({
			ack: true
		});
	});
	app.post('/' + id + '/gc', function(req, res) {
		gc();
		res.send({
			ack: true
		});
	});
	app.post('/' + id + '/data/:key', function(req, res) {
		var repo = repository(req.headers['x-repository'] || own.uri);

		req.on('json', function(body) {
			repo.push(req.params.key, body);
			res.json({
				ack: true
			});
		})
	});

	app.listen(function(addr, server) {
		own.uri = 'http://' + ME + ':' + server.address().port + '/' + id;
		gc();
		announcer = announce(own.uri, options, function(error, uri) {
			if (error) {
				that.emit('error', error);
				return;
			}

			request({
				uri: uri,
				json: true
			}, function(err, res, body) {
				if (err || res.statusCode !== 200) return;

				repository(uri).pushAll(body);
				gc();
			});
		});
	});


	that.address = ME;
	that.push = function(key, val) {
		own.push(key, val);
	};
	that.get = function(key) {
		if (cache[key]) return cache[key];

		var list = cache[key] = [];

		Object.keys(repos).forEach(function(uri) {
			Array.prototype.push.apply(list, repos[uri].get(key));
		});

		return list;
	};
	that.all = function() {
		if (cache._all) return cache._all;

		var all = cache._all = {};

		Object.keys(repos).forEach(function(uri) {
			var repo = repos[uri];

			repo.keys().forEach(function(key) {
				Array.prototype.push.apply(all[key] = all[key] || [], repo.get(key));
			});
		});

		return all;
	};

	that.close = function() {
		app.close();
		clearTimeout(heartbeat);
		announcer.close();
	};

	return that;
};
var proxy = function(options) {
	var key = 'host=' + options.host + ',port=' + options.port + ',multicast=' + options.multicast;
	var shared = pool[key] || (pool[key] = listen(options));
	var that = common.createEmitter();

	process.nextTick(function() {
		var all = shared.all();

		Object.keys(all).forEach(function(key) {
			all[key].forEach(function(val) {
				that.emit('push', key, val);
			});
		});

		shared.on('push', function(key, val) {
			that.emit('push', key, val);
		});
		shared.on('pop', function(key, val) {
			that.emit('pop', key, val);
		});
		shared.on('error', function(error) {
			that.emit('error', error);
		});
	});

	PROXY.forEach(function(method) {
		that[method] = shared[method];
	});

	that.close = function() {
		shared.close();
	};

	return that;
};

module.exports = proxy;
