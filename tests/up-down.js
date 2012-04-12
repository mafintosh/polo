var exec = require('child_process').exec;
var assert = require('assert');
var polo = require('polo');
var apps = polo();

apps.once('up', function(name, service) {
	if (name !== 'up-down') return;

	assert.ok(service.port === 5555);
});
apps.once('down', function(name, service) {
	if (name !== 'up-down') return;

	assert.ok(service.port === 5555);
	process.exit(0);
});

exec('node '+__dirname+'/fixtures/put-and-close.js up-down', function(err) {
	assert.ok(!err);
});

setTimeout(function() {
	assert.ok(false, 'timeout');
}, 1000);