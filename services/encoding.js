var secret = 'impossible';

module.exports = {
  encode: function (user, page, callback) {
  	user += page + secret;
  	var answ = new Buffer(user).toString('base64');

  	callback(answ);
  }
};