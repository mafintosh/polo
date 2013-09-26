var exec = require('child_process').exec;
var assert = require('assert');
var polo = require('../index.js');
var repo = polo(require('./fixtures/conf.json'));
var count = 0;

repo.on('up', function(name, service) {
	assert.ok(name === 'hello-test');
	assert.ok(service.port === 5555);

	count++;

	if (count === 2) {
		process.exit(0);
	}
});

repo.put({
	name: 'hello-test',
	port: 5555
});

exec('node '+__dirname+'/fixtures/put-and-close.js', function(err) {
	assert.ok(!err);
});

setTimeout(function() {
	assert.ok(false, 'timeout');
}, 1000);