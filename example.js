var http = require('http');
var polo = require('./index');

var apps = polo();

apps.on('up', function(name, service) {
	console.log('[up]', service.host+':'+service.port);
});
apps.on('down', function(name, service) {
	console.log('[down]', service.host+':'+service.port);
});

var server = http.createServer(function(req, res) {
	if (req.url !== '/') {
		res.writeHead(404);
		res.end();
		return;
	}

	res.end(JSON.stringify({
		service: apps.get('hello-world'),
		url: apps.get('http://{hello-world}/#test')
	}));
});

server.listen(0, function() {
	apps.put({
		name: 'hello-world',
		port: server.address().port
	});

	console.log('visit: http://localhost:'+server.address().port);
});