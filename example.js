var polo = require('./index');
var root = require('root');

var map = polo();
var app = root();

var linkify = function(url) {
	return '<html><body><a href="'+url+'">'+url+'</a></body></html>';
};

app.get(function(req, res) {
	res.end(linkify(map('http://hello-world/')));
});

app.listen(0, function() {
	map.put({
		name: 'hello-world',
		http: app.address().port
	});

	console.log('visit:', map('hello-world'));
});