var async 		= require("async");
var Logger		= require("./logger");

var logger;

Logger.getLogger(function(loggerobj){
	logger = loggerobj;
});

var self = module.exports = {
	/*
		Egyedi azonosító generálása
	*/
	generateID: function(callback){
		var d = new Date();
		async.waterfall([
			function(callback){
				self.addZero(d.getMonth(), function(err, data){
			    	if(err){
						logger.debug("month");
			    		return callback(err);
			    	}
			    	callback(null, data);
			    });
			},
			function(month, callback){
				self.addZero(d.getDay()+1, function(err, data){
			    	if(err){
			    		return callback(err);
			    	}
			    	callback(null, month, data);
			    });
			},
			function(day, month, callback){
				self.addZero(d.getHours(), function(err, data){
			    	if(err){
			    		return callback(err);
			    	}
			    	callback(null, day, month, data);
			    });
			},
			function(day, month, hours, callback){
				self.addZero(d.getMinutes(), function(err, data){
			    	if(err){
			    		return callback(err);
			    	}
			    	min = data;
			    	var id = (month*100000 + day*10000 + hours*100 + min)*10;
			    	callback(null, id);
			    });
			}
		], function (err, result) {
		    if(err){
	    		return callback(err);
	    	}
	    	callback(null, result);
		});
	},
	/*
		Kétszámjegyű számokat hoz létre és térít vissza, ha a paraméter meg volt adva
		különben hiba
	*/
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
	/*
		Összekeveri egy tömb adatait
		Üres tömb esetén hiba
	*/
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