# Polo

Polo is a zero configuration (zeroconf, mdns or dns-sd) service discovery module written completely in Javascript. Unlike some other tools (https://github.com/agnat/node_mdns) it does not require the installation of Apple's Bonjour SDK.
It's available through npm:

	npm install polo

## What problem does it solve?

Polo allows your servers/programs to discover eachother without having to talk to a central server and
without the use of any static configuration as long as they are connected to the same local network.

## Usage

First create a polo instance:

``` js
var polo = require('polo');
var apps = polo();
```

Now let's add a service to the app repository:

``` js
apps.put({
	name:'hello-world', // required - the name of the service
	host:'example.com', // defaults to the network ip of the machine
	port: 8080          // we are listening on port 8080.
});
```

If you put multiple services with the same name Polo will load balance them for you by choosing a random service.
Now spin up another node process and polo will automatically distribute information about this service:

``` js
// in another process
var polo = require('polo');
var apps = polo();

apps.once('up', function(name, service) {                   // up fires everytime some service joins
	console.log(apps.get(name));                        // should print out the joining service, e.g. hello-world
});
```

Additionally there is a `down` event which fires when a services leaves the repository - it's that easy!

## Options

Per default Polo will discover all services running on a network using UDP multicast.
When developing it can often be very useful to disable this. To do so either provide `multicast: false` or set your `NODE_ENV=development` environment variable

``` js
var apps = polo({
	multicast: false     // disables network multicast,
	monitor: true        // fork a monitor for faster failure detection,
	heartbeat: 2*60*1000 // set the service heartbeat interval (defaults to 2min)
});
```

or using development mode from the shell

	$ NODE_ENV=development node my-polo-app.js # also disables network multicast

## Example

Let's create an HTTP service. Try to run the program below on different machines in the same network:

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

## License

**This software is licensed under "MIT"**

> Copyright (c) 2012 Mathias Buus Madsen <mathiasbuus@gmail.com>
>
> Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the 'Software'), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
>
> The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
>
> THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
