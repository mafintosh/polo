var assert = require('assert');
var polo = require('polo');
var apps = polo();

apps.once('up', function(name, service) {
	if (name !== '1-up') return;

	assert.ok(service.port === 5555);
	process.exit(0);
});

apps.put({
	name: '1-up',
	port: 5555
});

setTimeout(function() {
	assert.ok(false, 'timeout'); 
}, 1000);