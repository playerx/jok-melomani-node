
var streamRoute = require('./stream')
  , radioStation = require('../lib/radio-station')

/*
 * GET home page.
 */

exports.index = function(req, res){

	var referer = req.get('Referrer') || req.get('Referer');
	if ((referer && referer.indexOf('jok.ge') > -1) || (req.query.plugin == 1)) {
		if (!req.query.source) {

			var isActiveListener = req.cookies.isActiveListener;

    		res.render('plugin', { title: 'Jok.FM - O-Sum Radio!', channel: req.query.channel, isActiveListener: isActiveListener });
    		return;
		}
	}

    res.render('index', { title: 'Jok.FM - O-Sum Radio!', channel: req.query.channel });
};

exports.game = function(req, res){
	if (!req.query.sid) {

		var port = process.env.PORT || 9005;

		var returnUrl = req.protocol + '://' + req.host  + ( port == 80 || port == 443 ? '' : ':'+port ) + req.path;

		res.writeHead(302, {
			"location": "http://old.jok.ge/node/getsid?returnUrl=" + returnUrl
		});
		res.end();
		return;
	}

    res.render('game', { title: 'Jok.FM - The Game!' });
};

exports.channel = function(req, res) {
	res.setHeader("Content-Type", "text/html");
  
	var channels = radioStation.getChannels();

	for (var i = 0; i < channels.length; i++) {
		if (channels[i].name == req.params.name) {
			res.write(JSON.stringify({
				name: channels[i].name,
				track: channels[i].currentTrack,
				count: channels[i].connectionsCount
			}));
			break;
		}
	};

	res.end();
};

exports.plugin = function(req, res) {
    res.render('plugin', { title: 'Jok.FM - O-Sum Radio!', channel: req.query.channel });
};

exports.channels = function(req, res) {
	res.setHeader("Content-Type", "application/json");
  
	var result = [];
	var channels = radioStation.getChannels();

	for (var i = 0; i < channels.length; i++) {
		if (channels[i].isOnline) {
			result.push({
				name: channels[i].name,
				track: channels[i].currentTrack,
				count: channels[i].connectionsCount
			});
		}
	};

	res.end(JSON.stringify(result));
};

exports.reconnect = function(req, res) {
	res.setHeader("Content-Type", "text/html");
  
  	radioStation.reconnect(req.params.channel);

	res.end(req.params.channel + ' reloaded successfuly!');
};

exports.status = function(req, res) {
	res.setHeader("Content-Type", "text/html");
  
	var result = [];
	var channels = radioStation.getChannels();

	for (var i = 0; i < channels.length; i++) {
		var channel = channels[i];
		if (channel.isOnline) {
			res.write('<span style="color:green">'+channel.name+'</span>');
			res.write(' <span style="color:silver">(' + channel.connectionsCount + ')</span> ');
			res.write('<br/>');
		}
	};

	for (var i = 0; i < channels.length; i++) {
		var channel = channels[i];
		if (!channel.isOnline) {
			res.write('<span style="color:red">'+channel.name+'</span>');
			res.write(' <span style="color:silver">(' + channel.connectionsCount + ')</span> ');
			res.write('last reconnect: ' + channel.lastReconnectDate.toLocaleString());
			res.write(' <a href="' + channel.url + '" target="_blank">'+ channel.url +'</a>');
			res.write('<br/>');
		}
	};

	res.end();
};


exports.channelinfo = function(req, res) {

	res.setHeader("Content-Type", "text/html");

	var currentDate = new Date();

	var metadatas = radioStation.getLastMetadatas(req.params.name);
	for (var i = 0; i < metadatas.length; i++) {
		var tt = Math.round((currentDate - metadatas[i].date) / 1000);
		res.write(tt + ' sec. ago ...');
		res.write(' ' + metadatas[i].info);
		if (!metadatas[i].isValid)
			res.write(' (Ignored)');
		res.write('<br/>');
	};
	metadatas = null;

	res.end();
}


exports.proxymode = function(req, res) {
	streamRoute.proxyEnabled = (req.params.value == 1);

	res.end();
}

// var snapshot;

// exports.profiler = function(req, res) {
// 	if (req.params.action == "start") {
// 		snapshot = new memwatch.HeapDiff();
// 		res.end("started");
// 		return;
// 	}

// 	if (req.params.action == "end") {
// 		if (!snapshot) return;

// 		var diff = snapshot.end();

// 		res.write(JSON.stringify(diff, null, 2));

// 		// for (var i = 0; i < diff.change.details.length; i++) {
// 	 //      	res.write(JSON.stringify(diff.change.details[i]));
// 	 //    };

// 		return;
// 	}

// 	res.end("invalid command");
// }