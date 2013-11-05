var dgram = require('dgram');

exports.send = function(msg) {
	var client = dgram.createSocket("udp4");
	var message = new Buffer(msg);
	client.send(message, 0, message.length, 41235, "localhost", function(err, bytes) {
	  client.close();
	});
}