var fs = require('fs');
var exec = require('child_process').exec;

var tests = fs.readdirSync(__dirname).filter(function(file) {
	return !fs.statSync(__dirname+'/'+file).isDirectory();
}).filter(function(file) {
	return file !== 'index.js';
});

var cnt = 0;
var all = tests.length;

var loop = function() {
	var next = tests.shift();

	if (!next) {
		console.log('\033[32m[ok]\033[39m  all ok');
		return;
	}

	exec('node '+__dirname+'/'+next, function(err) {
		cnt++;

		if (err) {
			console.error('\033[31m[err]\033[39m '+cnt+'/'+all+' - '+next);
			console.error('\n      '+(''+err.stack).split('\n').join('\n      ')+'\n');
			process.exit(1);
			return;
		} else {
			console.log('\033[32m[ok]\033[39m  '+cnt+'/'+all+' - '+next);
		}

		setTimeout(loop, 300);
	});
};

loop();