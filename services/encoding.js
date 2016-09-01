var crypto = require('crypto');

var secret = 'impossible';

module.exports = {
	/*
		összefűzi a pareméterként megadott user és page paremetereket és a secret kulcsot
		hasheli és visszatéríti a kapott stringet
	*/
  	encode: function (user, page, callback) {
  		user += page + secret;
  		var answ = require('crypto').createHash('sha1').update(user).digest('base64');

  		callback(answ);
  	}
};