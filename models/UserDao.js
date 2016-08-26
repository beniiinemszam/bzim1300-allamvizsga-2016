var path    		= require("path");
var User     		= require(path.join(__dirname + "/User"));
var CustomError     = require(path.join(__dirname + "/CustomError"));
var neo4j    		= require(path.join(__dirname + "/../services/neo4jConnection"));

var self = module.exports = {
	save : function(user, callback){
		neo4j.newUser(user, function(err, success){
			if(err){
				return callback(new CustomError(err.message, 500, 'error'));
			}
			if(success){
				return callback(null, true);
			}
			else{
				return callback(new CustomError('Username or Email is exist!', 403, 'signup'));
			}
		});
	},
	delete : function(user, callback){
		
	},
	update : function(user, callback){
		
	},
	getUser : function(user, callback){
		neo4j.authenticateUser(user, function(err, success){
			if(err){
				return callback(new CustomError(err.message, 500, 'error'));
			}
			if(success){
				return callback(null, true);
			}
			else{
				if(user.getIsAdmin){
					return callback(new CustomError("Wrong username or password!", 403, 'admin'));
				}
				return callback(new CustomError("Wrong username or password!", 403, 'login'));
			}
		});
	},
	isAdmin : function(user, callback){
		neo4j.isAdmin(user,function(err, exist){
			if(err){
				return callback(new CustomError(err.message, 500, 'error'));
			}
			callback(null, exist);
		});
	},
	addNewEditor : function(user, callback){
		neo4j.newEditor(user, function(err, success){
			if(err){
				return callback(new CustomError(err.message, 500, 'error'));
			}
			if(success){			
				callback(null, success);
			}
			else{
				return callback(new CustomError("E-mail is not exist!", 403, 'newEditor'));
			}
		});
	}
};