var async = require("async");
var winston			= require("winston");

var logger = new(winston.Logger)({
    transports: [
        new(winston.transports.Console)({
        	level: 'debug'
        }),
        new(winston.transports.File)({
        	filename	: __dirname + '/logs/logs.log',
        	level		: 'info',		
        	json		: true
        })
    ]
});

var self = module.exports = {
	generateID: function(callback){
		var d 	= new Date();
		async.waterfall([
			function(callback){
				self.addZero(d.getHours(), function(err, data){
			    	if(err!=null){
			    		return callback(err);
			    	}
			    	callback(null, data);
			    });
			},
			function(h, callback){
				self.addZero(d.getMinutes(), function(err, data){
			    	if(err!=null){
			    		return callback(err);
			    	}
			    	callback(null, h, data);
			    });
			},
			function(h, m, callback){
				self.addZero(d.getSeconds(), function(err, data){
			    	if(err!=null){
			    		return callback(err);
			    	}
			    	callback(null, h, m, data);
			    });
			},
			function(h, m, s, callback){
				self.addZero(d.getMilliseconds(), function(err, data){
			    	if(err!=null){
			    		return callback(err);
			    	}
			    	ms = data;
			    	var id = (h*1000000 + m*10000 + s*100 + ms)*10;
			    	callback(null, id);
			    });
			}
		], function (err, result) {
		    if(err!=null){
	    		return callback(err);
	    	}
	    	callback(null, result);
		});
	},
	addZero: function(i, callback) {
		if(i){
		    if (i < 10) {
		    	i = "0" + i;
		    }
		    return callback(null, i);
		}
		logger.error("Missing number in adZero!");
		callback(new Error("Internal server error!"));
	},
	shuffle: function(array, callback) {
		if(array==null){
			return callback(new Error("Array is empty - in shuffle!"));
		}
	    var j, x, i;
	    for (i = array.length; i; i--) {
	        j = Math.floor(Math.random() * i);
	        x = array[i - 1];
	        array[i - 1] 	= array[j];
	        array[j] 		= x;
	    }
	    callback(null, array);
	}
}