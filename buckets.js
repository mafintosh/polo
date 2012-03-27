var root = require('root');
var request = require('request');
var common = require('common');
var announce = require('./announce');

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

var Bucket = common.emitter(function(uri) {
	this.uri = uri;
	this.all = {};
});

Bucket.prototype.keys = function() {
	return Object.keys(this.all);
};
Bucket.prototype.pushAll = function(vals) {
	var self = this;

	Object.keys(vals).forEach(function(key) {
		self.push(key, vals[key]);
	});
};
Bucket.prototype.push = function(key, val) {
	var list = this.all[key] = this.get(key);

	val = Array.isArray(val) ? val : [val];
	list.push.apply(list, val);
	this.emit('push', key, val);
};
Bucket.prototype.pop = function(key) {
	var list = this.all[key];

	if (!list) return;
	delete this.all[key];
	this.emit('pop', key, list);
};
Bucket.prototype.get = function(key) {
	return this.all[key] || [];
};
Bucket.prototype.destroy = function(pop) {
	if (pop) this.keys().forEach(this.pop.bind(this));
	this.emit('destroy');
};
Bucket.prototype.toJSON = function() {
	return this.all;
};

var PING_TIMEOUT = 10*0000;
var HEARTBEAT = 2*60*1000;

var listen = function(port) {
	var that = common.createEmitter();
	var app = root();
	var id = process.pid.toString(16)+Math.random().toString(16).substr(2);
	var heartbeat;

	var cache = {};
	var own = new Bucket(id);
	var buckets = {me:own};
	var proxy = function(buck) {
		buck.on('push', function(key, values) {
			cache = {};
			if (!that.listeners('push').length) return;
			values.forEach(function(val) {
				that.emit('push', key, val);
			});
		});
		buck.on('pop', function(key, values) {
			values.forEach(function(val) {
				that.emit('pop', key, val);
			});
		});
	};
	var bucket = function(uri) {
		var buck = buckets[uri];

		if (buck) return buck;

		buck = buckets[uri] = new Bucket(uri);
		buck.on('destroy', function() {
			cache = {};
			delete buckets[uri];			
		});

		proxy(buck);
		return buck;
	};
	var gc = function() {
		remote(function(buck) {
			request({
				uri: buck.uri+'/ping',
				json: true,
				timeout: PING_TIMEOUT
			}, onresponse(buck));
		});

		clearTimeout(heartbeat);
		heartbeat = setTimeout(gc, HEARTBEAT);
	};
	var onresponse = function(buck) {
		return function(err, res, body) {
			if (!err && res.statusCode === 200 && body.ack) return;
			buck.destroy(that.listeners('pop').length);
		};
	};
	var remote = function(fn) {
		Object.keys(buckets).forEach(function(uri) {
			if (uri === 'me') return;
			fn(buckets[uri]);
		});
	};

	proxy(own);
	own.on('push', function(key, values) {
		cache = {};
		remote(function(buck) {
			request.post({
				uri: buck.uri+'/data/'+key,
				headers: {'x-bucket': buck.uri},
				json: true,
				body: values
			}, onresponse(buck));
		});
	});

	app.use(root.json);

	app.get('/'+id, function(req, res) {
		res.json(own);
	});
	app.get('/'+id+'/ping', function(req, res) {
		res.json({ack:true});
	});
	app.post('/'+id+'/data/:key', function(req, res) {
		var buck = bucket(req.headers['x-bucket'] || own.uri);
		
		buck.push(req.params.key, req.json);
		res.json({ack:true});
	});

	app.listen(0, function() {
		own.uri = 'http://'+ME+':'+app.address().port+'/'+id;
		gc();

		announce(own.uri, function(uri) {
			request({
				uri: uri,
				json: true
			}, function(err, res, body) {
				if (err || res.statusCode !== 200) return;

				bucket(uri).pushAll(body);
				gc();
			});
		});
	});

	that.push = function(key, val) {
		own.push(key, val);
	};
	that.get = function(key) {
		if (cache[key]) return cache[key];

		var list = cache[key] = [];

		Object.keys(buckets).forEach(function(uri) {
			Array.prototype.push.apply(list, buckets[uri].get(key));
		});

		return list;
	};

	return that;
};

listen.address = ME;
module.exports = listen;