var crypto = require('crypto');

var secret = 'impossible';

module.exports = {
  encode: function (user, page, callback) {
  	user += page + secret;
  	var answ = require('crypto').createHash('sha1').update(user).digest('base64');

  	callback(answ);
  }
};