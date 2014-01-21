var radioStation = require('./radio-station')
  , http = require('http')


function parseArtistName(title) {
    if (title.indexOf('-') == -1)
        return title;

    return title.substring(0, title.indexOf('-')).trim();
}

function getUserInfo(sid, cb) {

    // console.log('1')

    var req = http.request({
        hostname: 'api.jok.io',
        port: 80,
        path: '/User/InfoBySID?sid=' + sid + '&ipAddress=127.0.0.1',
        method: 'GET'
    }, function (res) {
        // console.log('2')

        var response = '';
        res.setEncoding('utf8');
        res.on('data', function (chunk) {
            response += chunk;
            // console.log('3')
        });
        res.on('end', function () {
            // console.log('4')
            var data = JSON.parse(response);

            if (!data.IsSuccess) {
                cb(0, '');
                return;
            }

            cb(data.UserID, data.Nick)
        });
    }).on('error', function (e) {
        console.log('problem with request: ' + e.message);
    });

    req.end();

    // $.get('http://old.jok.ge/node/userinfo/' + sid, function(data) {
    // 	if (!data.isSuccess) {
    // 		cb(0, '');
    // 		return;
    // 	}

    // 	cb(data.user.UserID, data.user.Nick)
    // })
}


module.exports = function (io) {

    var isGameStarted = false;
    var secondsLeft = 0;
    var totalSeconds = process.env.ENV == 'production' ? 2 * 60 : 2;
    var guestNumber = 0;

    var users = [];

    var tempos = 0;

    var getTotalResults = function () {
        var totalResults = [];
        for (var i = 0; i < users.length; i++) {
            var user = users[i];

            totalResults.push(user.getScoreInfo());
        };

        totalResults.sort(function (a, b) {
            return a.score - b.score;
        });

        return totalResults;
    }

    var globalStartGame = function () {
        isGameStarted = true;
        secondsLeft = totalSeconds;

        for (var i = 0; i < users.length; i++) {
            users[i].gameStarting();
        };

        if (game)
            game.emit('game results', getTotalResults());


        setTimeout(globalEndGame, secondsLeft * 1000);
    }

    var globalEndGame = function () {
        isGameStarted = false;

        secondsLeft = process.env.ENV == 'production' ? 30 : 30;

        game.emit('game results', getTotalResults());

        for (var i = 0; i < users.length; i++) {
            var user = users[i];

            user.emit('game finished', user.score, secondsLeft);

            if (true || process.env.ENV == 'production') {
                var pathValue = '/node/addpoints?userid=' + user.userid2 + '&points=' + user.score + '&secret=sercet';

                var req = http.request({
                    hostname: 'old.jok.ge',
                    port: 80,
                    path: pathValue,
                    method: 'GET'
                })
			    .on('error', function (e) {
			        console.log('problem with request: ' + e.message);
			    });

                //console.log(pathValue);

                req.end();
                // $.get('http://old.jok.ge/node/addpoints?userid=' + user.userid2 + '&points=' + user.score + '&secret=sercet')
            }

            user.clearState();
        };

        setTimeout(globalStartGame, secondsLeft * 1000)
    }

    globalStartGame();
    setInterval(function () {
        secondsLeft--;
        if (secondsLeft < 0)
            secondsLeft = 0;
    }, 1000)



    var game = io.of('/game').on('connection', function (socket) {

        try {
            var index = socket.handshake.headers.referer.indexOf('?sid=')
            var sid = socket.handshake.headers.referer.substring(index + 5);
            var correctAnswerID = -1;
        }
        catch (err) {
            return;
        }

        socket.score = 0;
        socket.addedScore = 0;
        socket.lastChannels = [];

        socket.correctAnswerFullText;

        var sendMusicQuest = function () {

            if (!isGameStarted) return;

            // 0. შემოწმება
            var stats = radioStation.getStats();
            if (stats.onlineChannels < 10) {
                console.log('not enough channels, for playing');
                return;
            }


            // 1. კანალის აღება
            do {
                var channel = radioStation.getRandomChannel();
            }
            while ((channel != null && socket.lastChannels.indexOf(channel) > -1) || !channel.currentTrack);

            if (channel == null) {
                console.log('no active channels found, game cant start');
                return;
            }

            socket.lastChannels.push(channel);

            while (socket.lastChannels.length > 5) {
                socket.lastChannels.shift();
            }


            // 2. პასუხები შერჩევა
            var answerTracks = [channel.currentTrack];
            var lastActiveTracks = radioStation.getLastActiveTracks();

            socket.correctAnswerFullText = channel.currentTrack;


            if (lastActiveTracks.length < 10) {
                var j = 1;
                for (var i = lastActiveTracks.length; i < 10; i++) {
                    lastActiveTracks.push({
                        channel: 'hits',
                        title: 'Answer ' + j++
                    });
                };
            }

            for (var i = 0; i < 3; i++) {
                var randomTrack;
                do {
                    var index = Math.floor((Math.random() * lastActiveTracks.length));
                    randomTrack = lastActiveTracks[index].title;
                }
                while (answerTracks.indexOf(randomTrack) > -1);

                answerTracks.push(randomTrack);
            };


            // 3. პასუხებიდან მხოლოდ მომღერლის სახელების დატოვება და პასუხების არევა
            var answers = [];

            correctAnswerID = Math.floor((Math.random() * 4));
            var j = 1;
            for (var i = 0; i < 4; i++) {
                if (correctAnswerID == i)
                    answers[i] = {
                        id: i,
                        name: parseArtistName(answerTracks[0])
                    };
                else
                    answers[i] = {
                        id: i,
                        name: parseArtistName(answerTracks[j++])
                    };
            };

            // კლიენტისთვის ინფორმაციის გაგზავნა
            socket.emit('game listen', '/stream/' + channel.name, answers);
        }


        getUserInfo(sid, function (userid, nick) {
            users.push(socket);

            socket.userid = userid > 0 ? 'g' + userid : 'g' + guestNumber;
            socket.userid2 = userid;
            socket.nick = userid > 0 ? nick : 'Guest' + guestNumber++;

            if (guestNumber > 99999)
                guestNumber = 0;


            socket.clearState = function () {
                socket.lastChannels.splice(0, socket.lastChannels.length - 1);
                socket.score = 0;
                socket.addedScore = 0;
            }

            socket.gameStarting = function () {
                socket.emit('game start', secondsLeft, isGameStarted, totalSeconds);
                sendMusicQuest();
            }

            socket.getScoreInfo = function () {
                return {
                    userid: socket.userid,
                    nick: socket.nick,
                    score: socket.score
                }
            }


            socket.emit('game current info', socket.userid);
            socket.emit('game results', getTotalResults());
            game.emit('game result adduser', socket.getScoreInfo());

            socket.gameStarting();
        });



        socket.on('disconnect', function () {
            game.emit('game result removeuser', socket.userid);

            var index = users.indexOf(socket);
            if (index != -1)
                users.splice(index, 1);
        })

        // socket.on('game ready', function() {
        // 	socket.gameStarting();
        // })

        socket.on('game answer', function (answerid) {
            if (!isGameStarted) return;

            var isCorrect = (answerid == correctAnswerID);

            if (socket.addedScore < 0)
                socket.addedScore = 0;

            socket.addedScore = isCorrect ? socket.addedScore + 10 : (socket.score == 0 ? 0 : -5);
            socket.score += socket.addedScore;

            var answerchannel = socket.lastChannels[socket.lastChannels.length - 1];

            socket.emit('game score', correctAnswerID, socket.score, isCorrect, socket.addedScore, socket.correctAnswerFullText, answerchannel.name);
            game.emit('game result update', socket.getScoreInfo());

            setTimeout(sendMusicQuest, 500);
        })
    });

    return game;
}