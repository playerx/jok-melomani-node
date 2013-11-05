
/*
 * GET users listing.
 */

 var radioStation = require('./stream').radioStation;

exports.list = function(req, res){

  res.setHeader("Content-Type", "text/html");
  
  var channels = radioStation.getChannels();

  var total = 0;

  for (var i = 0; i < channels.length; i++) {
  	res.write(channels[i].name + ': ' + channels[i].connectionsCount + ' user(s)<br/>');
  	total += channels[i].connectionsCount;
  };

  res.write('<b>Total:</b> ' + total);
  res.end();
};