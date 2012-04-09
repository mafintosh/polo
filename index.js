var common = require('common');
var buckets = require('./buckets');

var pool = {}; // since we dont require any config we should be able to safely pool the buckets
var host = function(protocol, host, port) {
	if (protocol === 'http://' && port === 80) return host;
	if (protocol === 'https://' && port === 443) return host;

	return host+':'+port;
};

var polo = function(port) {
	var that = common.createEmitter();
	var robin = {};
	var bucket = pool[port] || (pool[port] = buckets(port));
	var replace = function(_, protocol, key) {
		var service = that.get(key);

		return (protocol || '') + (service ? host(protocol, service.host, service.port) : key);
	};
	var next = function(name) {
		var list = that.all(name);

		robin[name] = ((name in robin) ? robin[name] : -1)+1;
		return list[robin[name] %= list.length];
	};

	bucket.on('pop', function(name, service) {
		that.emit('down', name, service);
		that.emit(name+'/down', service);
	});
	bucket.on('push', function(name, service) {
		that.emit('up', name, service);
		that.emit(name+'/up', service);
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

		service.address = service.address || service.host+':'+service.port;
		bucket.push(service.name, service);
		return that;
	};
	that.get = function(name) {
		var formatted = false;

		name = name.replace(/\{([^\}]+)\}/g, function(_, name) {
			formatted = true;
			return (next(name) || {address:name}).address;
		});

		return formatted ? name : next(name);
	};
	that.all = function(name) {
		return name ? bucket.get(name) : bucket.all();
	};
	that.url = function(url) {
		return url.replace(/^(\w+:\/\/)?([^\/+]+)/g, replace);
	};

	return that;
};

module.exports = polo;