var common = require('common');
var buckets = require('./buckets');

var funkify = function(emitter, name) {
	var fn = emitter[name].bind(emitter);

	Object.keys(emitter).concat(Object.getOwnPropertyNames(emitter.__proto__)).forEach(function(method) {
		if (method === 'constructor') return;
		fn[method] = emitter[method].bind(emitter);
	});

	return fn;
};
var host = function(protocol, host, port) {
	if (protocol === 'http://' && port === 80) return host;
	if (protocol === 'https://' && port === 443) return host;

	return host+':'+port;
};
var polo = function(port) {
	var that = common.createEmitter();
	var robin = {};
	var bucket = buckets(port);
	var replace = function(_, protocol, key) {
		var service = that.get(key);

		return (protocol || '') + (service ? host(protocol, service.host, service.port) : key);
	};

	bucket.on('pop', function(name, service) {
		that.emit('down', name, service);
		that.emit('down::'+name, service);
	});
	bucket.on('push', function(name, service) {
		that.emit('up', name, service);
		that.emit('up::'+name, service);
	});

	that.put = function(service, port) {
		if (typeof service === 'string' && typeof port === 'string') return that.put({name:service, host:host});
		if (typeof service === 'string' && typeof port === 'number') return that.put({name:service, port:port});
		if (!service.name) throw new Error('invalid arguments - name required');

		service.host = service.host || bucket.address;

		if (!service.port) {
			var parts = service.host.split(':');

			if (parts.length !== 2) throw new Error('invalid arguments - port required');
			service.host = parts[0];
			service.port = parseInt(parts[1], 10);
		}

		bucket.push(service.name, service);
		return that;
	};

	that.get = function(name) {
		var list = that.all(name);

		robin[name] = ((name in robin) ? robin[name] : -1)+1;
		return list[robin[name] %= list.length];
	};
	that.all = function(name) {
		return bucket.get(name);
	};
	that.map = function(url) {
		return url.replace(/^(\w+:\/\/)?([^\/+]+)/g, replace);
	};

	return funkify(that, 'map');
};

module.exports = polo;