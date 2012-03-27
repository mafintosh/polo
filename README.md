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
var map = polo();
```

Now let's add a service:

``` js
map.put({
	name:'hello-world', // required - the name of the service
	host:'example.com', // defaults to the network ip of the machine
	http: 8080 // we speak http on port 8080. 
	           // Instead of http it could be https or any other protocol you supply
});
```

If you put multiple services with the same name Polo will load balance them for you.
Now spin up another node process and polo will automatically distribute information about this service:

``` js
// in another process
var polo = require('polo');
var map = polo();

setTimeout(function() { // let's give polo a little time to discover it self
	console.log(map('http://hello-world/')); // should print http://example.com:8080/
}, 1000);
```

It's that easy!

## Example

Let's create an HTTP service. Try to run the program below in a couple of processes:

``` js
var http = require('http');
var polo = require('polo');
var map = polo();

var server = http.createServer(function(req, res) {
	res.end('hello-http is available at '+map('http://hello-http/')); 
})

server.listen(0, function() {
	var port = server.address().port; // let's find out which port we binded to

	console.log('visit: http://localhost:'+port);
	
	map.put({
		name: 'hello-http',
		http: port
	});
});
```