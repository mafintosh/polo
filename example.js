var http = require('http');
var polo = require('./index');

var repo = polo();

repo.on('up', function(name, service) {
	console.log('[up]', service.host+':'+service.port);
});
repo.on('down', function(name, service) {
	console.log('[down]', service.host+':'+service.port);
});

var server = http.createServer(function(req, res) {
	if (req.url !== '/') {
		res.writeHead(404);
		res.end();
		return;
	}

	res.end(JSON.stringify({
		service: repo.get('hello-world'),
		url: repo.get('http://{hello-world}/#test')
	}));
});

server.listen(0, function() {
	repo.put({
		name: 'hello-world',
		port: server.address().port
	});

	console.log('visit:', 'localhost:'+server.address().port);
});