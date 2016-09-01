var winston	= require("winston");

var logger  = new(winston.Logger)({
    transports: [
        new(winston.transports.Console)({
        	level: 'debug'
        }),
        new(winston.transports.File)({
        	filename	: __dirname + '/../logs/logs.log',
        	level		: 'info',		
        	json		: true
        })
    ]
});

/*
	Visszatíti a logger objektumot
*/
var self = module.exports = {
	getLogger : function(callback){
		callback(logger);
	}
}