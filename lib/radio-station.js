/*
 Modules
*/
require("colors");
var radio = require('./radio-stream')
  , fs = require('fs')
  , EventEmitter = require('events').EventEmitter
  , udpService = require('./udpService')




/*
 ყველა კანალის ინფორმაციის აღება channels.json ფაილიდან.
*/
var all_channels = JSON.parse(fs.readFileSync(__dirname + '/channels.json'));
var all_ignore_titles = JSON.parse(fs.readFileSync(__dirname + '/ignore-titles.json'));

/* 
 რადიო კანალის ინფორმაციის აღება, სახელის მიხედვით
 რეზულტატად ბრუნდება: name და url
 თუ ვერ იქნა ნაპოვნი სახელის შესაბამისი, უკან ბრუნდება default რადიო კანალი.
*/
var getChannelInfo = function(channel_name) {
  for (var i = all_channels.length - 1; i >= 0; i--) {
    if (all_channels[i][0] == channel_name) {
      return {
        name: all_channels[i][0],
        url: all_channels[i][1]
      }; 
    }
  };

  // default send first channel
  return {
    name: all_channels[0][0],
    url: all_channels[0][1]
  }; 
}


// ყველა კანალიდა, ბოლო 100 შემსრულებელი არის მხოლოდ ჩაყრილი ამ სიაში
var lastActiveTracks = [];

/*
 ახალი რადიოს კანალის შექმნა, ინფორმაციის აღება ხდება სახელიდან გამომდინარე
 გათიშვის შემთხვევაში ავტომატურად ცდილობს reconnect-ს.
*/
var ChannelClass = function(channel_name) {
  
  var channelInfo = getChannelInfo(channel_name);
  var events = new EventEmitter();
  var self = this;

  // A simple "Burst-on-Connect" implementation. We'll store the previous 2mb
  // of raw PCM data, and send it each time a new connection is made.
  this.bocData = [];
  this.name = channelInfo.name;
  this.url = channelInfo.url;
  this.connectionsCount = 0;
  this.currentTrack = '';
  this.isOnline = false;
  this.errorMessage = '';
  this.lastReconnectDate = null;
  var bocSize = 100 * 1024; // 100kb in bytes
  this.lastActiveTracks = [];
  this.isAdsRunning = false;

  this.lastReceivedMetadatas = [];
  
  this.strm = null;
  
  var createStream = function() {
	var stream = radio.createReadStream(channelInfo.url);
	stream.setMaxListeners(0);

	self.strm = stream;
	self.lastReconnectDate = new Date();

	var connectCallback = function() {
		console.log('[' + (new Date()).toJSON() + ']' + channelInfo.name + ' - radio stream connected.');
		// console.log(stream.headers);
	}

	var metadataCallback = function(metadata) {
		var title = radio.parseMetadata(metadata).StreamTitle;

		self.currentTrack = title;

		// console.log(channelInfo.name.green + ' ' + title.white);
		self.emit('metadata', channelInfo.name, title);

		// შემოწმება, რეკლამა ხომ არ არის გაშვებული
		var isGoodTitle = (title && title != '' && title != null);
		for (var i = 0; i < all_ignore_titles.length; i++) {
			if (title.indexOf(all_ignore_titles[i]) != -1) {
				isGoodTitle = false;
				break;
			}
		}

		self.lastReceivedMetadatas.push({
			info: metadata,
			date: new Date(),
			isValid: isGoodTitle
		});


		while(self.lastReceivedMetadatas.length > 10) {
			self.lastReceivedMetadatas.shift();
		}


		// თუ ნამდვილად სიმღერაა
		if (isGoodTitle)
		{
			lastActiveTracks.push({ 
				channel: channelInfo.name,
				title: title
			});

			while(lastActiveTracks.length > 100) {
				lastActiveTracks.shift();
			}
			
			// გაგზავნა მომხმარებლებისთვის
			var sendData = channelInfo.name + ':' + self.connectionsCount + ':' + title;
			if (process.pusher)
				process.pusher.emitTrackChanged(sendData);
			udpService.send(sendData);
		}

		self.isAdsRunning = !isGoodTitle;
		self.isOnline = true;
		self.errorMessage = '';
		self.lastReconnectDate = null;
	}

	var dataCallback = function(chunk) {

		while (currentBocSize() > bocSize) {
	        self.bocData.shift();
	    }
	    self.bocData.push(chunk);

		self.emit('data', chunk);
	}

	var reconnectCallback = function() {

		self.isOnline = false;
		console.log('[' + (new Date()).toJSON() + ']' + channelInfo.name + ' - reconnecting...');
	}

	var closeCallback = function() {

		self.errorMessage = stream.errorMessage;

		stream.removeAllListeners();
		stream = null;
		self.strm = null;
	}

    function currentBocSize() {
      var size = 0, i=0, l=self.bocData.length;
      for (; i<l; i++) {
        size += self.bocData[i].length;
      }
      return size;
    }

	stream.on("connect", connectCallback);
	stream.on("metadata", metadataCallback);
	stream.on("data", dataCallback);
	stream.on("reconnect",  reconnectCallback);
	stream.on("close",  closeCallback);
  }

  createStream();
}
// Make `ChannelClass` inherit from `EventEmitter`
ChannelClass.prototype = Object.create(EventEmitter.prototype, {
  constructor: {
    value: ChannelClass,
    enumerable: false
  }
});
ChannelClass.prototype.reconnect = function() {
	this.strm.onClose();
}


/*
 რადიო სადგურის შექმნა, რომელიც უზრუნველყოფს აქტიურ რადიო კანალებთან ურთიერთობას
 getChannel - აბრუნებს კანალს სახელის მიხედვით.
*/
module.exports = (function() {
	// ყველა აქტიური რადიო კანალი
	var channels = [];

	var getChannelInternal = function(name) {
		name = getChannelInfo(name).name;

		for (var i = channels.length - 1; i >= 0; i--) {
		    // მოძებნა არსებულ ქეშში
		    if (channels[i].name == name) {
		      return channels[i];
		    }
		};

		// თუ არ იქნა ნაპოვნი ახალის შექმნა
		var newChannel = new ChannelClass(name);
		newChannel.setMaxListeners(0);


		// თუ არსებლი სახელით არ არის დარეგისტრირებული კანალი
		if (newChannel == null) {
			return null;
		}

		channels.push(newChannel);
		return newChannel;
	};

	return {
		getChannel: function(name) {
			return getChannelInternal(name);
		},
		log: function() {
			for (var i = channels.length - 1; i >= 0; i--) {
		      console.log(channels[i].name.green + ': ' + channels[i].connectionsCount + ' user(s)');
		    };
		},
		reconnectAll: function() {
			all_channels = JSON.parse(fs.readFileSync(__dirname + '/channels.json'));

			for (var i = 0; i < channels.length; i++) {
				channels[i].reconnect();
			};
		},
		reconnect: function(name) {
			var channel = getChannelInternal(name);
			var index = channels.indexOf(channel);
			if (index == -1) return;

			channels.splice(index, 1);

			all_channels = JSON.parse(fs.readFileSync(__dirname + '/channels.json'));
			getChannelInternal(name);
		},
		getChannels: function() {
			return channels;
		},
		createAllChannels: function() {
			
			var length = process.env.ENV == 'production' ? all_channels.length : 15;

			for (var i = 0; i < length; i++) { //
				console.log(all_channels[i][1]);
				getChannelInternal(all_channels[i][0]);
			};
		},
		getStats: function() {
			var total = 0;
			var onlineChannelsCount = 0;

		  	for (var i = 0; i < channels.length; i++) {
		  		total += channels[i].connectionsCount;
		  		onlineChannelsCount += channels[i].isOnline ? 1 : 0;
		  	}

		  	return {
		  		onlineUsers: total,
		  		onlineChannels: onlineChannelsCount
		  	}
		},
		getLastActiveTracks: function() {
			return lastActiveTracks;
		},
		getRandomChannel: function() {
			if (channels.length == 0)
				return null;

			var validChannels = [];

			for (var i = 0; i < channels.length; i++) {
				if ((channels[i].name.indexOf('jazz') == -1) && (channels[i].name != 'duduki') && !channels[i].isAdsRunning)
					validChannels.push(channels[i]);
			};

			// random(0 - channels.length)
			var index = Math.floor((Math.random() * validChannels.length));

			return validChannels[index];
		},
		getLastMetadatas: function(name) {
			return getChannelInternal(name).lastReceivedMetadatas;
		}
	}
})();