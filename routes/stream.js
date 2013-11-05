
var radioStation = require('../lib/radio-station')


exports.proxyEnabled = false;

exports.processor = function(req, res) {

    var channel = radioStation.getChannel(req.params.channel);

    // თუ ორიგინალი url-ები უნდა გაიგზავნოს და არ დაპროქსოს
    if (!exports.proxyEnabled) {

        res.writeHead(302, { "Location": channel.url });
        res.end();

        return;
    }

    // დაპროქსვა
    res.writeHead(200, {
        "Content-Type": "audio/mpeg",
        "Connection": "close",
        "Transfer-Encoding": "identity"
    });

    channel.connectionsCount++;

    var dataCallback = function(chunk) {
        if (!res.write(chunk))
        {
            channel.removeListener('data', dataCallback);
            waitingBufferComplete = true;
        }
    }

    // წიინასწარ დაქეშირებული ბოლო 100 kb-ის გაგზავნა პირველ რიგში, დაკვრის სწრაფი დაწყებისთვის
    for (var i=0, l=channel.bocData.length; i<l; i++) {
        res.write(channel.bocData[i]);
    }

    channel.on("data", dataCallback);

    var waitingBufferComplete = false;

    req.connection.on("drain", function() {
        if (!waitingBufferComplete) return;

        channel.on('data', dataCallback);
        waitingBufferComplete = false;
    });

    req.connection.on("close", function() {
      	channel.connectionsCount--;
        channel.removeListener('data', dataCallback);
        channel = null;
    });
};