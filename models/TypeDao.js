var path    		= require("path");
var Type     		= require(path.join(__dirname + "/QuestionType"));
var CustomError     = require(path.join(__dirname + "/CustomError"));
var neo4j    		= require(path.join(__dirname + "/../services/neo4jConnection"));

var self = module.exports = {
	/*
		Új típus létrehozása
		Siker függvényében true/false vagy hibát dob
	*/
	save : function(type, callback){
		neo4j.newType(type, function(err, success){
			if(err){
				return callback(new CustomError(err.message, 500, 'error'));
			}
			callback(null, success);
		});
	},
	/*
		Adott típus törlése
		Siker függvényében true/false vagy hibát dob
	*/
	delete : function(type, callback){
		neo4j.deleteType(type, function(err, data){
			if(err){
				return callback(new CustomError(err.message, 500, 'error'));
			}
			callback(null, data);
		});
	},
	/*
		Adott típus módosítása
		Siker függvényében true/false vagy hibát dob
	*/
	update : function(type, callback){
		neo4j.updateType(type, function(err, data){
			if(err){
				return callback(new CustomError(err.message, 500, 'error'));
			}
			callback(null, data);
		});
	},
	/*
		Adott típushoz tartozó információk meghatározása
		Visszatéríti a típust vagy hibát dob
	*/
	getType : function(type, callback){
		neo4j.getQuestionType(type, function(err, data){
			if(err){
				return callback(new CustomError(err.message, 500, null));
			}
			callback(null, data);		
		});
	},
	/*
		Összes típus megkeresése és visszatérítése vagy hibát dob
	*/
	getAll : function(callback){
		neo4j.getQuestionTypes(function(err, records){
			if(err){
				return callback(new CustomError(err.message, 500, 'error'));
			}
			callback(null, records);
		});
	},
	/*
		Az összes típus nevének a mehatározás
		Hiba esetén hibát dob vissza
	*/
	getAllName : function(callback){
		neo4j.getQuestionTypeNames(function(err, records){
			if(err){
				return callback(new CustomError(err.message, 500, 'error'));
			}
			callback(null, records);
		});
	},
	/*
		Típus mehatározása válasz azonosító által
		Visszatéríti a típust vagy hibát dob
	*/
	getByID : function(answer, callback){
		neo4j.getQuestionTypeByAnswer(answer, function(err, data){
			if(err){
				return callback(new CustomError(err.message, 500, 'error'));
			}
			callback(null, data);
		});
	}
};