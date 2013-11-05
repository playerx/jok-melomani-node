// *******************************************************************************
// Jok.ge (c) 2012
// *******************************************************************************


var RadioPlugin = function(titleObj, playButton, stopButton, volumeLogo, volumeSlider, volume, isMusicPlaying, itemid, activeChannels) {
	this._title = titleObj;
	this._playButton = playButton;
	this._stopButton = stopButton;
	this._volumeLogo = volumeLogo;
	this._volumeSlider = volumeSlider;
	this._activeChannels = activeChannels;

	this._volume = volume / 100;
	this._itemid = itemid;

	jok.audio.setVolume(this._volume);

	var changeVolumeEvent = function() {
		var newVolume = this._volumeSlider.slider("option", "value");
		this.volumeChange(newVolume);

		$.cookie('volume', newVolume, { expires: 300, path: '/' });
	}

	volumeSlider.slider({
        orientation: "vertical",
        range: "min",
        min: 1,
        max: 100,
        step: 1,
        value: volume
    });
    volumeSlider.bind("slidestop", changeVolumeEvent.bind(this));
    volumeSlider.bind("touchend", changeVolumeEvent.bind(this));


    if (isMusicPlaying) {
    	if (!this.play())
    		this.stop();
    }
}


// Visual Elements
RadioPlugin.prototype._title = null;
RadioPlugin.prototype._playButton = null;
RadioPlugin.prototype._stopButton = null;
RadioPlugin.prototype._volumeLogo = null;
RadioPlugin.prototype._volumeSlider = null;

// Properties
RadioPlugin.prototype._volume = 40;
RadioPlugin.prototype._itemid = 1;
RadioPlugin.prototype._isMuted = false;
RadioPlugin.prototype._activeChannels = [];


// API methods
RadioPlugin.prototype.play = function() {
	if (this._activeChannels.length == 0) return;

	var item = this._activeChannels[this._itemid];
	if (!item) return;

	var src = "/stream/" + item.channel;
	jok.audio.play(src);

	this._playButton.hide();
	this._stopButton.show();

	this._title.html(item.channel.toUpperCase().replace('_', ' '));


	// cookies stuff
	var date = new Date();
	date.setTime(date.getTime() + (1000 * 60 * 60 * 3 /* Hours */));

	var date2 = new Date();
	date2.setTime(date2.getTime() + (1000 * 60 * 60 * 24 /* Hours */));

	$.cookie('isMusicPlaying', '1', { expires: date, path: '/' });
    $.cookie('channel', item.channel, { expires: 300, path: '/' });
    $.cookie('isActiveListener', '1', { expires: date2, path: '/' });
}

RadioPlugin.prototype.stop = function() {
	jok.audio.stop();

	this._playButton.show();
	this._stopButton.hide();

	this._title.html('.FM');

	// cookies stuff
	$.removeCookie('isMusicPlaying');
}

RadioPlugin.prototype.playNext = function() {
	this._itemid = this._activeChannels.length > this._itemid + 1 ? this._itemid + 1 : 0;
	this.play();
}

RadioPlugin.prototype.playPrevious = function() {
	this._itemid = this._itemid - 1 >= 0 ? this._itemid - 1 : this._activeChannels.length - 1;
	this.play();
}

RadioPlugin.prototype.volumeChange = function(volume) {
	jok.audio.setVolume(volume / 100);
	this._volume = volume / 100;
}

RadioPlugin.prototype.toggleMute = function() {
	if (this._isMuted) {
		this.unmute.call(this);
		return;
	}

	this.mute.call(this);
}

RadioPlugin.prototype.mute = function() {
	this._isMuted = true;
	jok.audio.mute();

	this._volumeLogo.attr('class', 'logo mute');
	this._volumeSlider.slider('value', 1);
}

RadioPlugin.prototype.unmute = function() {
	this._isMuted = false;
	jok.audio.unmute();

	this._volumeLogo.attr('class', 'logo');
	this._volumeSlider.slider('value', this._volume * 100);
}



$(function() {
	$.get('/channels', function(data) {
        var list = data;
        var activeChannels = [];

        var channel = $.cookie('channel');
      	var volume = $.cookie('volume') || 40;
      	var activeItemID = 0;
      	var isMusicPlaying = $.cookie('isMusicPlaying');

        for (var i = 0; i < list.length; i++) {

        	if (list[i].name == channel) {
        		activeItemID = i;
        	}

        	activeChannels.push({
        		id: i,
        		channel: list[i].name
        	});
        };

		$('.active_channel').bind('click touchstart', function() {
			window.open('http://jok.fm/?source=ez')
		})

		$('.play_button').bind('click touchstart', function() {
			$.radio.play();
		})

		$('.stop_button').bind('click touchstart', function() {
			$.radio.stop();
		})

		$('.next_button').bind('click touchstart', function() {
			$.radio.playNext();
		})

		$('.previous_button').bind('click touchstart', function() {
			$.radio.playPrevious();
		})

		$('.jokfm_plugin_volume > .logo').bind('click touchstart', function() {
			$.radio.toggleMute();
		})

		$.radio = new RadioPlugin(
			$('.active_channel'), 
			$('.play_button'), 
			$('.stop_button'), 
			$('.jokfm_plugin_volume > .logo'),
			$('.volume-selector'),
			volume,
			isMusicPlaying,
			activeItemID,
			activeChannels
		);
    })
})


