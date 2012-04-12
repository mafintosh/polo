# Polo

Polo is a zero configuration service discovery module written completely in Javascript.
It's available through npm:

	npm install polo

## What problem does it solve?

Polo allows your servers/programs to discover eachother without having to talk to a central server and
without the use of any static configuration as long as they are connected to the same network.

## Usage

First create a polo instance:

``` js
var polo = require('polo');
var apps = polo();
```

Now let's add a service:

``` js
apps.put({
	name:'hello-world', // required - the name of the service
	host:'example.com', // defaults to the network ip of the machine
	port: 8080          // we are listening on port 8080. 
});
```

If you put multiple services with the same name Polo will load balance them for you.
Now spin up another node process and polo will automatically distribute information about this service:

``` js
// in another process
var polo = require('polo');
var apps = polo();

apps.once('up', function() {                       // up fires everytime some service joins
	console.log(apps.get('hello-world'));          // should print out the joining service
	console.log(apps.get('http://{hello-world}/')) // shorthand for formatting the address
	                                               // of a service into a string
});
```

It's that easy!

## Example

Let's create an HTTP service. Try to run the program below in a couple of processes:

``` js
var http = require('http');
var polo = require('polo');
var apps = polo();

var server = http.createServer(function(req, res) {
	if (req.url !== '/') {
		res.writeHead(404);
		res.end();
		return;
	}

	res.end('hello-http is available at http://'+apps.get('hello-http').address); 
});

server.listen(0, function() {
	var port = server.address().port; // let's find out which port we binded to
	
	apps.put({
		name: 'hello-http',
		port: port
	});

	console.log('visit: http://localhost:'+port);
});
```