var path    		= require("path");
var Type     		= require(path.join(__dirname + "/QuestionType"));
var CustomError     = require(path.join(__dirname + "/CustomError"));
var neo4j    		= require(path.join(__dirname + "/../services/neo4jConnection"));

var self = module.exports = {
	save : function(type, callback){
		neo4j.newType(type, function(err, success){
			if(err){
				return callback(new CustomError(err.message, 500, 'error'));
			}
			callback(null, success);
		});
	},
	delete : function(type, callback){
		neo4j.deleteType(type, function(err, data){
			if(err==null){
				callback(null, data);
			}
			else{
				return callback(new CustomError(err.message, 500, 'error'));
			}
		});
	},
	update : function(type, callback){
		neo4j.updateType(type, function(err, data){
			if(err==null){
				callback(null, data);
			}
			else{
				return callback(new CustomError(err.message, 500, 'error'));
			}
		});
	},
	getType : function(type, callback){
		neo4j.getQuestionType(type, function(err, data){
			if(err==null){
				return callback(null, data);
			}
			return callback(new CustomError(err.message, 500, null));
		});
	},
	getAll : function(callback){
		neo4j.getQuestionTypes(function(err, records){
			if(err==null){
				return callback(null, records);
			}
			else{
				return callback(new CustomError(err.message, 500, 'error'));
			}
		});
	},
	getAllName : function(callback){
		neo4j.getQuestionTypeNames(function(err, records){
			if(err==null){
				callback(null, records);
			}
			else{
				return callback(new CustomError(err.message, 500, 'error'));
			}
		});
	},
	getByID : function(answer, callback){
		neo4j.getQuestionTypeByAnswer(answer, function(err, data){
			if(err){
				return callback(new CustomError(err.message, 500, 'error'));
			}
			callback(null, data);
		});
	}
};