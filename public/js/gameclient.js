(function() {
	// common ---------------------------------------------------------------------------------------------------
	var currentUserID;
	var waitingUserReaction = true;

	var timerValue;

    setInterval(function() {

        processProgressBar();

        if (!timerValue || timerValue < 0) return;

        timerValue--;
        $('.timer').html(timerValue);

    }, 1000);

    var progressWidth = 0;
    var progressProfit = 0;
    var processProgressBar = function() {

    	if (progressWidth <= 0) return;

    	progressWidth -= progressProfit;

    	$('.progressBar > .inner').width(progressWidth);
    }

	// real time communication ----------------------------------------------------------------------------------
	socket = io.connect('/game');

	socket.on('connect', function() {
	  console.log('connected event [' + (new Date()).toJSON() + ']')
	  socket.emit('game ready');
	})

	socket.on('game current info', function(userid) {
		currentUserID = userid;
	})

	socket.on('game start', function(time, isGameStarted, totalSeconds) {
	    ui.reset(isGameStarted);
	    ui.answersLogClear();

	    if (isGameStarted) {
	    	$('.results').hide();
	    	$('.playingUI').show();
	    	$('.game_title > .points').show();

	    	var percent = time * 100 / totalSeconds;

	    	$('.progressBar > .inner').css('width', percent +'%');
	    	progressWidth = $('.progressBar > .inner').width();
	    	progressProfit = progressWidth / time;
		} else {
	    	$('.playingUI').hide();
	    	$('.game_title > .points').hide();

	    	timerValue = time;

	    	$('.results').show();
		}
	})

	socket.on('game listen', function(url, answers) {

	    ui.showAnswers(answers);

		jok.audio.play(url);

	    waitingUserReaction = true;
	})

	socket.on('game score', function(answerid, score, iscorrect, addedScore, correctTrack, channel) {

	  	ui.highlightCorrectAnswer(answerid);
	  	ui.updateScore(score);

	  	if (iscorrect)
	  		ui.scoreAddAnimation(addedScore);

	  	ui.answersLogAdd(channel, correctTrack, iscorrect, addedScore);
	})

	socket.on('game finished', function(score, idleTimeInSeconds) {

	  	ui.reset();
	  	ui.showFinishResult(score);

    	$('.playingUI').hide();
    	$('.game_title > .points').hide();
    	$('.results').show();
    	timerValue = idleTimeInSeconds;
	})

	socket.on('game result update', function(info) {
		ui.updateResult(info.userid, info.nick, info.score);
	})

	socket.on('game result adduser', function(info) {
		ui.resultsAddUser(info.userid, info.nick, info.score);
	})

	socket.on('game result removeuser', function(userid) {
		ui.resultsRemoveUser(userid);
	})

	socket.on('game results', function(results) {
		ui.updateResults(results);

		var sortedList = results.sort(function(a, b) {
			return b.score - a.score;
		})

		$('.results > .top_players > div.table').empty();
		// $('.results > .top_players_day > div.table').empty();

		var table = '<table cellpadding="0" cellspacing="0">';

		for (var i = 0; i < sortedList.length; i++) {
			if (i > 10) break;

			var userid = sortedList[i].userid.substring(1);

			table += '<tr><td>' + (i + 1) + '</td><td style="text-align: left"><a href="http://jok.ge/' + userid + '" target="_blank" style="color: black; text-decoration: none">' + sortedList[i].nick + '</a></td><td style="color: #55B919">' + sortedList[i].score + '</td></tr>'
		};

		table += '</table>';

		$('.results > .top_players > div.table').append(table);
		// $('.results > .top_players_day > div.table').append(table);
	})


	// user interface api ----------------------------------------------------------------------------------------
	var ui = {

	    reset: function(isGameStarted) {
	        $('.rules').hide();
	        $('.answers').hide();
	        $('.player').show();
	        $('.results').hide();
	        $('.added_score').html('');

	        ui.updateScore(0);
	    },

	    showAnswers: function(answers) {
	        var answersObj = $('.answers');
	        answersObj.hide();

	        var answerSymbols = ['A', 'B', 'C', 'D'];
	        answersObj.empty();
	        for (var i = 0; i < answers.length; i++) {
	            answersObj.append('<div class="answer" data-answerid="' + answers[i].id + '"><div class="circle">'+answerSymbols[i]+'.</div>' + answers[i].name + '</div>');
	        }

	        setTimeout(function() { answersObj.show('fast'); }, 700);
	    },

	    updateScore: function(score) {
	 		$('.score').find('span').html(score);
	 		$('.score').html(score);
	    },

	    scoreAddAnimation: function(addedScore) {
	    	var msg = '+' + addedScore + (addedScore > 50 ? '!' : '');
	    },

	    highlightCorrectAnswer: function(answerid) {
	        $('.answer').each(function() {
	            if ($(this).attr('data-answerid') == answerid)
	                $(this).attr('class', 'answer correct');
	        })
	        $(this).attr('class', 'answer selected');
	    },

	    showFinishResult: function(score) {
	        $('.results > .points_info > .result_score').html(score);
	        $('.results > .points_info').show();
	  		$('.results').show();
	    },

	    updateResult: function (userid, nick, score) {

	    	var item = $('.game_results').find('.items').find('div[data-tag=' + userid + ']');
	    	if (item.length == 0) return;

	    	item.attr('data-score', score);

	    	item.html(nick + ' <span>(' + score + ')</span>');

	    	ui.resultsSortByScore();
	    },

	    resultsAddUser: function(userid, nick, score) {
	    	if (userid == currentUserID) return;

	    	var item = $('.game_results').find('.items').find('div[data-tag=' + userid + ']');
	    	if (item.length > 0) return;

	    	ui.resultsAddOneUser(userid, nick, score);
	    	ui.resultsSortByScore();
	    },

	    resultsRemoveUser: function(userid) {
			var item = $('.game_results').find('.items').find('div[data-tag=' + userid + ']');
			item.remove();
	    },

	    updateResults: function (results) {
	    	var items = $('.game_results').find('.items');

	    	items.empty();
	    	for (var i = 0; i < results.length; i++) {
	    		if ($('.game_results').find('.items').find('div[data-tag=' + results[i].userid + ']').length > 0) continue;

	    		ui.resultsAddOneUser(results[i].userid, results[i].nick, results[i].score);
	    	};

	    	ui.resultsSortByScore();
	    },

	    answersLogAdd: function(channel, track, isCorrect, addedScore) {
	    	var answersLog = $('.answers_log');
	    	var scoreText = ' (' + (addedScore > 0 ? '+' : '') + addedScore + ')';
	    	if (addedScore == 0) scoreText = '';

	    	var className = isCorrect ? 'scoreadd' : 'scoreremove';

	    	if (channel)
	    		channel = channel.toUpperCase();

	    	answersLog.prepend('<div><span class="channel">' + channel + '</span>: <span>' + track + '</span> <span class="'+className+'">' + scoreText + '</span></div>');

	    	var items = answersLog.children();
	    	if (items.length > 5) {
	    		items.splice(6, items.length - 5);
	    		answersLog.empty();
	    		answersLog.append(items);
	    	}
	    },

	    answersLogClear: function(channel, track, isCorrect, addedScore) {
	    	$('.answers_log').empty();
	    },


	    // for internal use
	    resultsAddOneUser: function(userid, nick, score) {
	    	var isCurrent = userid == currentUserID;

	    	$('.game_results').find('.items').append('<div class="item ' + (isCurrent ? 'current_user' : '') + '" data-tag="'+userid+'" data-score="' + score + '">' + nick + ' <span>(' + score + ')</span>' + '</div>');
	    },

	    resultsSortByScore: function() {
	    	var items = $('.game_results').find('.items');
	    	var sortedList = items.find('div').sort(function(a, b) { 
	    		var tt = $(b).attr('data-score') - $(a).attr('data-score'); 
	    		return tt;
	    	})
	    	items.empty();
	    	items.append(sortedList);
	    }
	}


	// user events processing ------------------------------------------------------------------------------------
	$('.start_btn').live('click', function() {
	  if (!waitingUserReaction) {
	    console.log('start_btn click returned')
	    return;
	  }
	  
	  $('.rules').hide();
	  $('.player').show();
	  socket.emit('game ready');

	  waitingUserReaction = false;
	});

	$('.fbshare').live('click', function() {
		var link = 'https://www.facebook.com/dialog/feed?'
				 + 'app_id=247484735307677&'
				 + 'link=https://jok.ge&'
				 + 'picture=jok.fm/images/jokfm_logo.png&'
				 + 'name=Melomani&'
				 + 'caption=My%20score%20in%20MELOMANI%20is%20' + $('.points_info > .result_score').html() + '%20points&'
				 + 'description=&'
				 + 'redirect_uri=https://jok.ge/';

		window.open(link);
	});

	$('.exit').live('click', function() {
		window.location.assign('http://jok.io/lobby/melomani');
	});

	$('.answer').live('click', function() {
	  if (!waitingUserReaction) {
	    console.log('answer click returned')
	    return;
	  }

	  var answerID = $(this).attr('data-answerid');
	  if (!answerID) return;

	  $(this).attr('class', 'answer selected');

	  waitingUserReaction = false;
	  setTimeout(function() {
	    socket.emit('game answer', answerID);
	  }, 500);
	});

})();