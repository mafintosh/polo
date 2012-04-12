var assert = require('assert');
var polo = require('polo');
var apps = polo();

apps.put({
	name: 'format',
	port: 5555,
	host: 'example.com'
});

assert.equal(apps.get('http://{format}/'), 'http://example.com:5555/');

var get = apps.get('format');

assert.deepEqual({name:get.name, port:get.port, host:get.host}, {name:'format', port:5555, host:'example.com'});

process.exit(0);