var polo = require('./index');
var root = require('root');

var map = polo();
var app = root();

map.on('up', function(name, service) {
	console.log('[up]', service.host+':'+service.port);
});
map.on('down', function(name, service) {
	console.log('[down]', service.host+':'+service.port);
});

app.get('/', function(req, res) {
	res.end('it like a dynamic hostname: '+map('http://hello-world/'));
});

app.listen(0, function() {
	map.put({
		name: 'hello-world',
		port: app.address().port
	});

	console.log('visit:', map('hello-world'));
});