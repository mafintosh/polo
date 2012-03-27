var url = require('url');
var buckets = require('./buckets');

var DEFAULTS = {http:80, https:443};

var normalize = function(input, to) {
	input = typeof input === 'string' ? {host:input} : input;
	input.host = input.host || input.hostname || buckets.address;
	to = to || {};

	var parts = input.host.split(':');

	to.host = parts[0];
	to.port = input.port || parts[1] && parseInt(parts[1], 10);

	return to;
};
var parseService = function(options) {
	var service = normalize(options, {});
	var protocol = options.protocol;

	service.name = options.name;

	if (protocol) {
		service.protocol = protocol.replace(/:$/, '')+':';
		options[protocol] = options[protocol] || service.port;
	}

	Object.keys(options).forEach(function(key) {
		if (key in {name:1, host:1, hostname:1, port:1, protocol:1}) return;

		var value = options[key];

		if (!value) return;

		if (value === true) {
			value = DEFAULTS[key];
		}
		if (typeof value === 'number') {
			value = service.host+':'+value;
		}
		if (typeof value === 'object') {
			value.host = value.host || service.host;
			value.port = value.port || DEFAULTS[key];
		}

		var protocol = key.replace(/:$/, '')+':';

		service[key] = normalize(value);
		service[key].protocol = protocol;
		service.protocol = service.protocol || protocol;
		service.port = service.port || service[key].port;
		service.host = service.host || service[key].host;
	});

	return service;
};


module.exports = function(port) {
	var data = buckets(port);

	var choose = function(name) {
		var all = data.get(name);

		return all[(Math.random()*all.length)|0];
	};
	var that = function(name) {	
		name = /^\w+:\/\//.test(name) ? name : 'auto://'+name;

		var parsed = url.parse(name);
		var service = choose(parsed.host);

		if (!service) return null;

		var protocol = parsed.protocol.replace('auto:', service.protocol).replace(/:$/, '');
		var result = service[protocol];

		if (!result) return null;
		if (parsed.path === '/' && name[name.length-1] !== '/') parsed.path = '';

		return result.protocol+'//'+result.host+(DEFAULTS[protocol] === result.port ? '' : ':'+result.port)+(parsed.path || '');
	};

	that.parse = function(name) {
		return url.parse(that(name));
	};
	that.put = function(options) {
		if (typeof options === 'string') return zero.get(options);
		if (!options || !options.name) throw new Error('options.name is required');

		data.push(options.name, parseService(options));
		return that;
	};

	Object.keys(DEFAULTS).forEach(function(method) {
		that[method] = function(options) {
			if (typeof options === 'string') options = {name:options};

			options.protocol = method;
			options.port = options.port || DEFAULTS[method];
			return that.service(options);
		};
	});

	return that;
};