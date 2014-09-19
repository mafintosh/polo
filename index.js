var common = require('common');
var repository = require('./repository');

var polo = function(options) {
	var that = common.createEmitter();
	var ups = common.createEmitter();
	var repo = repository(options || {});

	var next = function(name) {
		var list = that.all(name);

		return list[Math.floor(Math.random() * list.length)];
	};
	var parse = function(name) {
		var result = {
			name: name
		};

		name.replace(/\{([^\}]+)\}/g, function(_, app) {
			result.name = app;
			result.format = name;
		});

		return result;
	};
	var formatURL = function(url) {
		if (url.substring(0, 7) === 'http://') return url.replace(':80', '');
		if (url.substring(0, 8) === 'https://') return url.replace(':443', '');
		return url;
	};
	var format = function(parsed) {
		var app = next(parsed.name);

		if (!app) return null;

		return parsed.format ? formatURL(parsed.format.replace('{' + parsed.name + '}', app.address)) : app;
	};

	ups.setMaxListeners(0);
	repo.on('pop', function(name, service) {
		that.emit('down', name, service);
		that.emit(name + '/down', service);
	});
	repo.on('push', function(name, service) {
		that.emit('up', name, service);
		that.emit(name + '/up', service);
		ups.emit(name);
	});
	repo.on('error', function(error) {
		that.emit('error', error);
	});

	that.put = function(service, port) {
		// passed a http server as second argument
		if (port && typeof port.address === 'function') port = port.address().port;
		// passed host:port as second argument
		if (typeof service === 'string' && typeof port === 'string') {
			return that.put({
				name: service,
				host: port
			});
		}
		// passed port as second argument
		if (typeof service === 'string' && typeof port === 'number') {
			return that.put({
				name: service,
				port: port
			});
		}
		// name is required
		if (!service.name) throw new Error('invalid arguments - name required');

		service.host = service.host || repo.address;

		if (!service.port) {
			var parts = service.host.split(':');

			if (parts.length !== 2) throw new Error('invalid arguments - port required');
			service.host = parts[0];
			service.port = parseInt(parts[1], 10);
		}

		service.address = service.address || service.host + ':' + service.port;
		repo.push(service.name, service);
		return service;
	};
	that.get = function(name, onup) {
		var parsed = parse(name);

		onup = typeof onup === 'function' && onup;

		if (onup && !repo.get(parsed.name).length) {
			ups.once(parsed.name, function() {
				onup(format(parsed));
			});
			return;
		}

		return onup ? onup(format(parsed)) : format(parsed);
	};
	that.all = function(name) {
		return name ? repo.get(name) : repo.all();
	};

	that.stop = function() {
		repo.close();
	};

	return that;
};

module.exports = polo;
