var exec = require('child_process').exec;
var assert = require('assert');
var polo = require('../index.js');
var repo = polo(require('./fixtures/conf.json'));

var up = 0;
var down = 0;

repo.on('up', function(name, service) {
	if (name !== '2-up-down') return;

	up++;

	assert.ok(service.port === 5555);
});
repo.on('down', function(name, service) {
	if (name !== '2-up-down') return;

	down++;

	assert.ok(service.port === 5555);

	if (down === 2) {
		assert.ok(up === 2);
		process.exit(0);
	}
});

for (var i = 0; i < 2; i++) {
	exec('node '+__dirname+'/fixtures/put-and-close.js 2-up-down', function(err) {
		assert.ok(!err);
	});
}

setTimeout(function() {
	assert.ok(false, 'timeout');
}, 5000);