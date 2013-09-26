var exec = require('child_process').exec;
var assert = require('assert');
var polo = require('../index.js');
var repo = polo(require('./fixtures/conf.json'));

repo.once('up', function(name, service) {
	if (name !== 'up-down') return;

	assert.ok(service.port === 5555);
});
repo.once('down', function(name, service) {
	if (name !== 'up-down') return;

	assert.ok(service.port === 5555);
	process.exit(0);
});

exec('node '+__dirname+'/fixtures/put-and-close.js up-down', function(err) {
	assert.ok(!err);
});

setTimeout(function() {
	assert.ok(false, 'timeout');
}, 5000);