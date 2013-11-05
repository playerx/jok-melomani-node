var mongo = require('mongodb')
  , Server = mongo.Server
  , Db = mongo.Db


//mongodb://<user>:<password>@alex.mongohq.com:10055/Jokfm
var server = new Server('alex.mongohq.com', 10055, {auto_reconnect: true});
var db = new Db('Jokfm', server);

db.open(function(err, db) {
  if(err) {
    console.log('db error: ' + err);
    return;
  }
  

  // Authenticate
  db.authenticate('ez', '123', function(err, result) {
    if (!result) {
      console.log('db login failed. user: ' + 'ez');
      return;
    }
    console.log('db authenticated!');

    db.collection('channels', function(err, channels) {
      if (err) {
        console.log(err);
        return;
      }

      for (var i = 0; i < channels.length; i++) {
        console.log(JSON.stringify(channels[i]));
      };
    });
  });
});
