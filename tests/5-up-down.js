var exec = require('child_process').exec;
var assert = require('assert');
var polo = require('../index.js');
var repo = polo(require('./fixtures/conf.json'));

var up = 0;
var down = 0;

var ports = {1:false,2:false,3:false,4:false,5:false};

repo.on('up', function(name, service) {
	if (name !== '5-up-down') return;

	up++;

	assert.ok(!ports[service.port]);
	assert.ok(service.port < 6, service.port+'');

	ports[service.port] = true;
});
repo.on('down', function(name, service) {
	if (name !== '5-up-down') return;

	down++;

	assert.ok(ports[service.port]);
	assert.ok(service.port < 6);

	if (down === 5) {
		for (var i in ports) {
			assert(ports[i]);
		}

		assert.ok(up === 5);
		process.exit(0);
	}
});

for (var i = 0; i < 5; i++) {
	exec('node '+__dirname+'/fixtures/put-and-close.js 5-up-down '+(1+i), function(err, stdout) {
		assert.ok(!err, err && err.message);
	});
}

setTimeout(function() {
	assert.ok(false, 'timeout');
}, 5000);