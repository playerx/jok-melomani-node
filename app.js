
/**
 * Jok.ge (c) All Rights Reserved.
 *
 * .FM - online radios
 */

process.env.ENV = 'production'


var express = require('express')
  , app = express()
  , server = require('http').createServer(app)
  , io = require('socket.io').listen(server)
  , game = require('./lib/game')(io)
  , pusher = require('./lib/pusher')(io)
  , radioStation = require('./lib/radio-station')
  , routes = require('./routes')
  , user = require('./routes/user')
  , path = require('path')
  , routeStream = require('./routes/stream')



process.pusher = pusher;
process.game = game;



app.configure(function() {

  if (process.env.ENV =='production')
    app.set('port', process.env.PORT || 9005);
  else
    app.set('port', process.env.PORT || 9005);

  app.set('views', __dirname + '/views');
  app.set('view engine', 'ejs');
  // app.use(express.logger('dev'));
  app.use(express.bodyParser());
  app.use(express.cookieParser());
  app.use(express.methodOverride());
  app.use(app.router);
  app.use(express.static(path.join(__dirname, 'public')));
  io.enable('browser client minification');
  io.enable('browser client etag');          // apply etag caching logic based on version number
  io.enable('browser client gzip');          // gzip the file
  io.set('log level', 1);                    // reduce logging
});

app.configure('development', function() {
  app.use(express.errorHandler());
});

app.configure('production', function() {
});

app.get('/', routes.index);
app.get('/game', routes.game);
app.get('/plugin', routes.plugin);
app.get('/channel/:name', routes.channel);
app.get('/channels', routes.channels);
app.get('/status', routes.status);
app.get('/stream/:channel', routeStream.processor);
app.get('/reconnect/:channel', routes.reconnect);
app.get('/proxymode/:value', routes.proxymode);
app.get('/channelinfo/:name', routes.channelinfo);
// app.get('/profiler/:action', routes.profiler);


io.configure(function (){
  io.set('authorization', function (handshakeData, callback) {
    callback(null, true); // error first callback style 
  });
  io.set('transports', [
    //'websocket',
    // 'flashsocket',
    'xhr-polling',
    'htmlfile',
    'jsonp-polling'
  ]);
});



server.listen(app.get('port'), function() {
  console.log("Express server listening on port " + app.get('port'));
});

setTimeout(function() {
  radioStation.createAllChannels();
}, 1000);
