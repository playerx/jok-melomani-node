var radioStation = require('./radio-station')

module.exports = function(io) {


	var pusher = io.of('/pusher').on('connection', function (socket) {

	});

	pusher.emitTrackChanged = function(event_data) {
		pusher.emit('track changed', event_data);
	}

	// ონლაინ მომხმარებლების და ჩანელების ინფორმაციის განახლება ონლაინ მომხმარებლებთან
	setInterval(function() {

		var stats = radioStation.getStats();

		pusher.emit('online stats', io.sockets.clients().length, stats.onlineChannels);

	}, 1000);


	return pusher;
}