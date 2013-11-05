(function() {
    socket = io.connect('/pusher');
    socket.on('track changed', function(data) {
      var splittedData = data.split(':');
      if (splittedData.length < 3) return;

      pendingTrackInfos.push({
        channel: splittedData[0],
        users_count: splittedData[1],
        info: splittedData[2],
        start_time: new Date()
      })
    });

    socket.on('online stats', function(onlineUsers, onlineChannels) {
      $('.channels_count').find('span').html(onlineChannels);
      $('.listening_users').find('span').html(onlineUsers);
    })

    var pendingTrackInfos = [];
    var favorites = [];
    var currentChannel = '';
    var isCurrentChannelStarred = false;

    function addNewTrackInfo(channel, users_count, track, start_time) {
      var displaychannel = channel.replace('_', ' ').toUpperCase();

      var _time = '';
      if (start_time != null) {
        var currentMinutes = start_time.getHours();
        var currentSeconds = start_time.getMinutes();

        if (currentMinutes.toString().length == 1)
          currentMinutes = '0' + currentMinutes;

        if (currentSeconds.toString().length == 1)
          currentSeconds = '0' + currentSeconds;

        _time = currentMinutes+':'+currentSeconds;
      }

      var isFavorite = ($.inArray(channel, favorites) > -1);

      var trackInfo = $('<div class="track_info'+ (currentChannel != channel ? "":" active") +'" style="display: none;" data-channel="'+channel+'"></div>');
      trackInfo.append('<div class="_time">'+_time+' <div class="_star"></div></div>');
      trackInfo.append('<div class="_play'+ (currentChannel != channel ? "":" playing") +'"></div> ');
      trackInfo.append('<span class="_name">'+displaychannel+'</span>');
      trackInfo.append('<span class="_count">:</span> ');
      trackInfo.append('<span class="_track">'+track+'</span>');
      if (track && track != '') {
        trackInfo.append('<span class="_video"><img src="/images/youtube_play_gary.png" /></span>');
      }

      if (currentChannel == channel) {
        updateActiveTrack(track);
      }

      var items_container = $(isFavorite ? '#favorites_list' : '#normal_list');

      var oldItem = items_container.find('div.track_info[data-channel='+channel+']');
      if (oldItem.length > 0) {
        oldItem.hide(function() {
          oldItem.remove();
        });
      }

      items_container.prepend(trackInfo);
      if (start_time = null)
        trackInfo.css('display', 'block');
      else
        trackInfo.show('fast');
    }

    function updateActiveTrack(track) {

      if (!track) return;

      var displaychannel = currentChannel.replace('_', ' ').toUpperCase();

      // var trackInfo = $('<div class="track_info"></div>');
      // trackInfo.append('<div class="_play playing"></div> ');
      // trackInfo.append('<span class="_name">'+displaychannel+'</span>');
      // trackInfo.append('<span class="_count">:</span> ');
      // trackInfo.append('<span class="_track">'+track+'</span>');

      $('.active_track').show('fast');
      $('.active_track > div.channel').html(displaychannel);
      $('.active_track > input.track').val(track);
    }

    var isMuted = false;
    function toggleMute() {
      if (!isMuted) {
        jok.audio.mute();
        isMuted = true;
        $('#joklogo').attr('class', 'disabled');
        $('.volume_icon').attr('class', 'volume_icon disabled');
      }
      else {
        jok.audio.unmute();
        isMuted = false;
        $('#joklogo').attr('class', '');
        $('.volume_icon').attr('class', 'volume_icon');
      }
    }


    function play(channel) {

      channel = channel.toLowerCase().replace(/ /g,"_");
      displaychannel = channel.replace('_', ' ');

      var newSrc = "/stream/" + channel;
      currentChannel = channel;
      isCurrentChannelStarred = $.inArray(channel, favorites) != -1;
      refreshFavoriteImage();

      jok.audio.play(newSrc);

      $('._play.playing').each(function(i, v){
        $(v).attr('class', '_play');
      });
      $('.track_info.active').each(function(i, v){
        $(v).attr('class', 'track_info');
      });
      var trackInfoObj = $('.track_info[data-channel='+channel+']');
      trackInfoObj.find('._play').attr('class', '_play playing');
      trackInfoObj.attr('class', 'track_info active');
      var track = trackInfoObj.find('._track').html();

      $("#target").val(displaychannel);
      $("#target").select();

      if (isMuted)
        toggleMute();

      $('#like_area').empty();
      $('#like_area').append('<iframe src="//www.facebook.com/plugins/like.php?href=http%3A%2F%2Fjok.fm%3Fchannel%3D'+channel+'&amp;send=false&amp;layout=button_count&amp;width=100&amp;show_faces=true&amp;action=like&amp;colorscheme=light&amp;font&amp;height=21&amp;appId=247484735307677" scrolling="no" frameborder="0" style="border:none; overflow:hidden; width:100px; height:21px;" allowTransparency="true"></iframe>');

      updateActiveTrack(track);

      $.cookie('channel', channel, { expires: 300, path: '/' });
      window.document.title = ' Jok.FM - ' + displaychannel.toUpperCase();
    }

    function refreshFavoriteImage() {
      if (isCurrentChannelStarred)
        $('#fav_action').attr('class', 'star');
      else
        $('#fav_action').attr('class', 'unstar');
    }

    function starChannel(_channel) {
      if (_channel == '') return;

      var items_container = $('#normal_list');

      var oldItem = items_container.find('div.track_info[data-channel='+_channel+']');
      if (oldItem.length > 0) {
        oldItem.remove();
      }

      oldItem.css('display', 'none');
      $('#favorites_list').prepend(oldItem);
      oldItem.show('normal');

      isCurrentChannelStarred = true;

      favorites.push(_channel);
      refreshFavoriteImage();

      $.cookie('favorites', favorites.join(','), { expires: 300, path: '/' });
    }

    function unstarChannel(_channel) {
      if (_channel == '') return;

      var items_container = $('#favorites_list');

      var oldItem = items_container.find('div.track_info[data-channel='+_channel+']');
      if (oldItem.length > 0) {
        oldItem.hide('fast', function(){
          oldItem.remove();

          $('#normal_list').prepend(oldItem);
          oldItem.show();
        });
      }

      var index = favorites.indexOf(_channel);
      if (index != -1)
        favorites.splice(index, 1);

      isCurrentChannelStarred = false;
      refreshFavoriteImage();

      $.cookie('favorites', favorites.join(','), { expires: 300, path: '/' });
    }

    function refreshTimer() {
      setTimeout(function() {

        var popedCount = 0;

        while (pendingTrackInfos.length > 0 && popedCount < 5) // ერთ ჯერზე, მხოლოდ 5 ახალი სიმღერის გამოჩენა ხდება
        {
          track = pendingTrackInfos.pop();
          popedCount++;

          addNewTrackInfo(track.channel, track.users_count, track.info, track.start_time);
        }

        refreshTimer();
      }, 1000);
    }

    refreshTimer();

    var tryReconnectOnEnd = true;

    $(function(){
      $('.track_info').live('click', function() {
        var channel = $(this).attr('data-channel');
        play(channel);
        console.log('2');
      });

      $('.track_info').live('touchstart', function() {
        var channel = $(this).attr('data-channel');
        play(channel);
      });

      $("#target").keypress(function(event) {
        if (event.which == 13) {
          var channel_name = $("#target").val();

          play(channel_name);
          event.preventDefault();
        }
      });

      $("#volume").change(function() {
        var volume = $("#volume").val() / 100;

        jok.audio.setVolume(volume);

        $.cookie('volume', volume * 100, { expires: 300, path: '/' });
      });

      $('#joklogo').bind('touchstart click', function() {
        toggleMute();
      });

      $('.volume_icon').bind('touchstart click', function() {
        toggleMute();
      });

      $('#fav_action').bind('touchstart click', function() {
        if (isCurrentChannelStarred)
          unstarChannel(currentChannel);
        else
          starChannel(currentChannel);
      });

      $('.search_video').bind('touchstart click', function() {
        var url = 'https://www.google.com/search?q=site%3Awww.songlyrics.com+' + $('.active_track > .track').val();
        window.open(url);
        // $('#search_bar').show();
        // $('.active_track > .track').select();
      });

      $('#search_bar > .close').bind('touchstart click', function() {
        $('#search_bar').hide();
      });

      $('._video').live('click', function(e) {
        var track = $(this).parent().find('._track').html();

        window.open('http://www.youtube.com/results?search_query=' + track)

        e.stopPropagation();
      });

      $('._video').live('mouseenter', function() {
        $(this).find('img').attr('src', '/images/youtube_play.png');
      });

      $('._video').live('mouseleave', function() {
        $(this).find('img').attr('src', '/images/youtube_play_gary.png');
      });


      var unfavoritesdChannel = '';
      $('._star').live('click', function(e) {
        var channel = $(this).parent().parent().attr('data-channel');
        var isFavorite = $.inArray(channel, favorites) > -1;

        if (!isFavorite)
          starChannel(channel);
        else
          unstarChannel(channel);

        e.stopPropagation();
      });

      var channel = $.cookie('channel');
      var volume = $.cookie('volume') || 40;

      jok.audio.setVolume(volume / 100);
      $("#volume").val(volume);


      if (isGameMode) return;

      var _favorites = $.cookie('favorites');
      if (_favorites)
        favorites = _favorites.split(',');

      if (passedChannel && passedChannel != 'undefined')
        channel = passedChannel;

      $.get('/channels', function(data) {
        var list = data;
        for (var i = 0; i < list.length; i++) {
          var trackInfo = list[i];

          addNewTrackInfo(trackInfo.name, trackInfo.count, trackInfo.track, null);
        };
      })
      
      play(channel);
    });
})();