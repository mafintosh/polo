var assert = require('assert');
var polo = require('../index.js');
var repo = polo(require('./fixtures/conf.json'));

repo.once('up', function(name, service) {
	if (name !== '1-up') return;

	assert.ok(service.port === 5555);
	process.exit(0);
});

repo.put({
	name: '1-up',
	port: 5555
});

setTimeout(function() {
	assert.ok(false, 'timeout');
}, 1000);