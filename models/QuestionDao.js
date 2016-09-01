var path    		= require("path");
var async 			= require("async");
var Question     	= require(path.join(__dirname + "/Question"));
var Answer        	= require(path.join(__dirname + "/Answer"));
var CustomError     = require(path.join(__dirname + "/CustomError"));
var neo4j    		= require(path.join(__dirname + "/../services/neo4jConnection"));
var generate   		= require(path.join(__dirname + "/../services/generateID"));

var self = module.exports = {
	/*
		Kérdés mentése no4j segítségével
		Visszatérítés: igaz vagy hamis sikerességtől függően vagy hiba
	*/
	save : function(question, callback){
		//sorba, de nem blokálva ID kigenerálása, mentés megívása és eredmény/hiba kezelés
		async.waterfall([
			function(callback){
				generate.generateID(function(err, data){
					if(err){
						return callback(new CustomError(err.message, 500, 'error'));
					}
					callback(null, data);
				});
			},
			function(id, callback){
				question.setID(id);
				question.getCorrect().setID(id + 1);
				question.getWrong1().setID(id + 2);
				question.getWrong2().setID(id + 3);
				question.getWrong3().setID(id + 4);
				
				neo4j.newQuestion(question, function(err, success){
					if(err){
						return callback(new CustomError(err.message, 500, 'error'));
					}
					callback(null, success);
				});
			}
		], function(err, result){
			if(err){
				return callback(err);
			}
			callback(null, result);
		});
	},
	/*
		adott kérdés törlése neo4j használatával
		Visszatéríti igaz/hamis sikeresség függvényében vagy hibát dob
	*/
	delete : function(question, callback){
		neo4j.deleteQuestion(question, function(err, success){
			if(err){
				return callback(new CustomError(err.message, 500, 'error'));
			}
			callback(null, success);
		});
	},
	/*
		Kérdés módosítása
		Visszatéríti igaz/hamis sikeresség függvényében vagy hibát dob
	*/
	update : function(question, callback){
		//sorba, de nem blokálva elöző kérdés és válaszok törlése, ID kigenerálása, mentés megívása és eredmény/hiba kezelés
		async.waterfall([
			function(callback){
				neo4j.deleteQuestion(question, function(err, success){
					if(err){
						return callback(new CustomError(err.message, 500, 'error'));
					}
					callback(null, success);
				});
			},
			function(success, callback){
				generate.generateID(function(err, data){
					if(err){
						return callback(new CustomError(err.message, 500, 'error'));
					}
					callback(null, data);
				});
			},
			function(aid, callback){
				var canswerobj 	= new Answer(question.getCorrect().getName(), true, aid + 1);
				var wanswer1obj	= new Answer(question.getWrong1().getName(), false, aid + 2);
				var wanswer2obj	= new Answer(question.getWrong2().getName(), false, aid + 3);
				var wanswer3obj	= new Answer(question.getWrong3().getName(), false, aid + 4);

				var newquestion = new Question(question.getQuestion(), canswerobj, wanswer1obj, wanswer2obj, wanswer3obj, aid, question.getType());
				neo4j.newQuestion(newquestion, function(err, success){
					if(err){
						return callback(new CustomError(err.message, 500, 'error'));
					}
					callback(null, true);
				});
			}
		], function(err, result){
			if(err){
	          return callback(new CustomError(err.message, 500, 'error'));
	        }
	        return callback(null, result);
		});
	},
	/*
		Adott kérdés adatainak lekérése
		Visszatérített érték a kérdés vagy hibát dob
	*/
	getQuestion : function(question, callback){
		neo4j.getQuestion(question, function(err, data){
			if(err==null){
				return callback(null, data);
			}
			return callback(new CustomError(err.message, 500, null));
		});
	},
	/*
		Visszaadja az összes kérdést és a hozzá tartozó azonosítót, különben hibát dob
	*/
	getAllName : function(callback){
		neo4j.getQuestionNames(function(err, records){
			if(err==null){
				var ids = [];
				var names = [];
				for(var key in records) {
			        if(records.hasOwnProperty(key)) {
			            ids.push(key);
			            names.push(records[key]);
			         }
			    }
				return callback(null, names, ids);
			}
			else{
				return callback(new CustomError(err.message, 500, 'error'));
			}
		});
	},
	/*
		Adott típushoz tartozó kérdéssor kigenerálása és az első kérédés meghatározása
	*/
	getNewQuestion : function(type, callback){
		//sorba, de nem blokálva a típus meghatározása, a típushoz tartozó kérdések meghatározása, kérdések összekeverése, felesleges kérdések levágása, kérdés kigenerálása, válaszok sorrendjének összekeverése
		// végeredmény/hiba kezelés
		async.waterfall([
			function(callback){
				neo4j.getQuestionType(type, function(err, qtype){
					if(err){
						return callback(new CustomError(err.message, 500, 'error'));
					}
					callback(null, qtype);
				});
			},
			function(qtype, callback){
				var qtn = parseInt(qtype.getQuestionNumber());
				neo4j.getQuestionsID(type, function(err, result){
					if(err){
						return callback(new CustomError(err.message, 500, 'error'));
					}
					callback(null, qtn, result);
				});
			},
			function(qtn, result, callback){
				generate.shuffle(result, function(err, array){
					if(err){
						return callback(new CustomError(err.message, 500, 'error'));
					}
					callback(null, qtn, array);
				});
			},
			function(qtn, result, callback){
				if(result.length > qtn){
					result.length = qtn;
				}

				var befques = result;
				var question = new Question(null, null, null, null, null, befques[0], null);

				neo4j.getQuestion(question, function(err, data){
					if(err){
						return callback(new CustomError(err.message, 500, 'error'));
					}
					var array = [data.getWrong1(), data.getWrong2(), data.getWrong3(), data.getCorrect()];
					callback(null, data, array, befques, qtn);
				});
			},
			function(data, array, befques, qtn, callback){
				generate.shuffle(array, function(err, array2){
					if(err){
						return callback(new CustomError(err.message, 500, 'error'));
					}
				callback(null, array2, data, befques, qtn);
				});
			}
		],function(err, array, data, befques, qtn){
			if(err){
				return callback(new CustomError(err.message, 500, 'error'));
			}
			callback(null, array, data, befques, qtn);
		});
	},
	/*
		Következő kérédés meghatározása
	*/
	getNextQuestion : function(answer, befques, index, callback){
		//sorba, de nem blokálva a válasz helyességének ellenörzése, következő kérdések meghatározása, válaszok sorrendjének összekeverése
		// végeredmény/hiba kezelés
		async.waterfall([
			function(callback){
				neo4j.isCorrect(answer, function(err, correct){
					if(err){
						return callback(new CustomError(err.message, 500, 'error'));
					}
					callback(null, correct);
				});
			},
			function(correct, callback){
				if(befques[index + 1]){
					var question = new Question(null, null, null, null, null, befques[index + 1], null);
					neo4j.getQuestion(question, function(err, data){
						if(err){
							return callback(new CustomError(err.message, 500, 'error'));
						}
						var array = [data.getWrong1(), data.getWrong2(), data.getWrong3(), data.getCorrect()];
						return callback(null, data, array, correct);
					});
				}
				else{
					callback(null, null, null, correct);
				}
			},
			function(data, array, correct, callback){
				if(array){
					generate.shuffle(array, function(err, array2){
						if(err){
							return callback(new CustomError(err.message, 500, 'error'));
						}
						return callback(null, array2, data, correct);
					});
				}
				else{
					callback(null, null, null, correct);
				}
			}
		],function(err, array, data, correct){
			if(err){
				return callback(new CustomError(err.message, 500, 'error'));
			}
			callback(null, array, data, correct);
		});
	}
};