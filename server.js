var express 		= require('express');
var compression 	= require('compression');
var path    		= require("path");
var url 			= require("url");
var async 			= require("async");
var winston			= require("winston");
var bodyParser 		= require('body-parser');
var session 		= require('express-session');
var vash 			= require('vash');
var neo4j			= require(path.join(__dirname + "/services/neo4jConnection"));
var encoding		= require(path.join(__dirname + "/services/encoding"));
var Question		= require(path.join(__dirname + "/models/Question"));
var QuestionType	= require(path.join(__dirname + "/models/QuestionType"));
var Answer        	= require(path.join(__dirname + "/models/Answer"));
//pasport.js authentication
var app 			= express();


app.set('view engine', 'vash');
app.disable('view cache');

app.use(compression());
app.use(express.static(__dirname + "/public"));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({
	secret: 'secret',
  	resave: false,
  	saveUninitialized: true
}));

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

function checkAuth(req, res, next){
	var sess 		= req.session;
	var username 	= sess.username;
	var success		= true;
	if(!sess.secretkey){
		renderError(res, 'error', "You don't have permission to view this page!", 403);
		return;
	}

	encoding.encode(username, '/login', function(cb){
		if(sess.secretkey != cb){
			renderError(res, 'error', "You don't have permission to view this page!", 403);
			success = false;
			return;
		}
	});

	if(!success){
		return;
	}

	next();
}

function checkAuthAdmin(req, res, next){
	var sess 		= req.session;
	var username 	= sess.username;
	var success		= true;

	if(sess.secretadminkey == null){
		res.render('adminLogin');
		return;
	}

	encoding.encode(username + "admin", "/admin", function(cb){
		if(sess.secretadminkey != cb){
			renderError(res, 'error', "You don't have permission to view this page!", 403);
			success = false;
			return;
		}
	});

	if(!success){
		return;
	}

	next();
}

function addZero(i, callback) {
	if(i){
	    if (i < 10) {
	    	i = "0" + i;
	    }
	    return callback(null, i);
	}
	logger.error("Missing number in adZero!");
	callback(new Error("Internal server error!"));
}

function renderError(res, name, msg, ecode){
	res.status(ecode);
	res.render(name,
	{
		message: msg,
		code: ecode
	});
}

function redirect(res, url, params){
	res.setHeader('Cache-Control', 'no-cache');
	res.writeHead(301,
	  {Location: url}
	);
	res.end();
}

function sessionNewPage(req, url, username){
	encoding.encode(username, url, function(cb){
		var sess 		= req.session;
		sess.secretkey 	= cb;
		if(username){
			sess.username = username;
		}
	});
}

function shuffle(array, callback) {
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

function sendQuestion(res, array, data, correctNumber, questionNumber, questionTypeNumber){
	res.render('question',
	{
		question: 	data.getQuestion(),
		ans1: 		array[0].getName(),
		ans2: 		array[1].getName(),
		ans3: 		array[2].getName(),
		ans4: 		array[3].getName(),
		aid1: 		array[0].getID(),
		aid2: 		array[1].getID(),
		aid3: 		array[2].getID(),
		aid4: 		array[3].getID(),
		qtn:  		questionTypeNumber,
		cn: 		correctNumber,
		qn: 		questionNumber
	});
	
}

function sendNewQuestion(res, array, data, correctNumber, questionNumber, questionTypeNumber){
	res.json({
		question: 	data.getQuestion(),
		ans1: 		array[0].getName(),
		ans2: 		array[1].getName(),
		ans3: 		array[2].getName(),
		ans4: 		array[3].getName(),
		aid1: 		array[0].getID(),
		aid2: 		array[1].getID(),
		aid3: 		array[2].getID(),
		aid4: 		array[3].getID(),
		qtn:  		questionTypeNumber,
		cn: 		correctNumber,
		qn: 		questionNumber
	});
	res.end();
}

function deleteSession(req){
	var sess 			= req.session;	
	sess.userpoint 		= null;
	sess.username 		= null;
	sess.qnumber 		= null;
	sess.qtype 			= null;
	sess.befques 		= null;
	sess.secretadminkey = null;
	sess.secretkey 		= null;
}

function generateID(callback){
	var d 	= new Date();
	async.waterfall([
		function(callback){
			addZero(d.getHours(), function(err, data){
		    	if(err!=null){
		    		return callback(err);
		    	}
		    	callback(null, data);
		    });
		},
		function(h, callback){
			addZero(d.getMinutes(), function(err, data){
		    	if(err!=null){
		    		return callback(err);
		    	}
		    	callback(null, h, data);
		    });
		},
		function(h, m, callback){
			addZero(d.getSeconds(), function(err, data){
		    	if(err!=null){
		    		return callback(err);
		    	}
		    	callback(null, h, m, data);
		    });
		},
		function(h, m, s, callback){
			addZero(d.getMilliseconds(), function(err, data){
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
}

app.get("/", function(req, res){
	var sess 		= req.session;
	var username 	= sess.secretkey;
	var guest 		= null;
	if(username == null){
		guest = true;
	}

	res.render('index',
	{
		user: 	sess.secretkey,
		guest: 	guest
	});
});

app.get("/login", function(req, res){
	res.render('login');
});

app.get("/logout", function(req, res){
	deleteSession(req);
	redirect(res,'/');
});

app.get("/signup", function(req, res){
	res.render('signup');
});

app.post("/signup", function(req, res){
	username 	= req.body.username;
	pass 		= req.body.password;
	email 		= req.body.email;

	if(username == null || pass == null || email== null){
		renderError(res, 'error', 'All parameter is required!', 403);
		return;
	}

	neo4j.newUser(username, pass, email, function(err, success){
		if(err){
			renderError(res, 'error', err.message, 500);
			return;
		}
		if(success){
			sessionNewPage(req, '/login', username);
			redirect(res,'/types');
		}
		else{
			renderError(res, 'signup', 'Username or Email is exist!', 403);
		}
	})
});

app.post("/login", function(req, res){
	username 	= req.body.username;
	pass 		= req.body.password;

	if(username == null || pass == null){
		renderError(res, 'error', 'All parameter is required!', 403);
		return;
	}

	neo4j.authenticateUser(username, pass, false, function(err, success){
		if(err){
			renderError(res, 'error', err.message, 403);
			return;
		}
		if(success){
			sessionNewPage(req, '/login', username);
			redirect(res,'/types');
		}
		else{
			renderError(res, 'login', 'Wrong username or password!', 403);
		}
	})
});

app.get("/types", checkAuth, function(req, res){
	var point = req.body.point;
	neo4j.getQuestionTypes(function(err, records){
		if(err==null){
			res.render('types',
			{
				data: records
			});
		}
		else{
			renderError(res, 'error', err.message, 500);
			return;
		}
	});
});

app.get("/type/:typename", function(req, res){
	res.setHeader('Cache-Control', 'no-cache');
	neo4j.getQuestionType(req.params.typename, function(err, data){
		if(err==null){
			res.json({
				descr: 	data.getDescription(),
				type:	data.getName(),
				number: parseInt(data.getQuestionNumber())
			});
		}
		else{
			res.json({
				error: 	err.message
			});
		}
	});
});

app.put("/type/:typename", function(req, res){
	var sess 		= req.session;
	var typename 	= req.body.type;
	var qnumber 	= req.body.number;
	var descr 		= req.body.description;	
	var isAdmin		= sess.isAdmin || false;
	var type 		= new QuestionType(typename, qnumber, descr);

	neo4j.updateType(type, function(err, data){
		if(err==null){
			res.render('admin',
			{
				admin: isAdmin
			});
		}
		else{
			renderError(res, 'error', err.message, 500);
			return;
		}
	});
});

app.delete('/type/:typename', function(req, res){
	var sess 		= req.session;
	var typename 	= req.body.type;
	var qnumber 	= req.body.number;
	var descr 		= req.body.description;	
	var isAdmin		= sess.isAdmin || false;
	var type 		= new QuestionType(typename, qnumber, descr);

	neo4j.deleteType(type, function(err, data){
		if(err==null){
			res.render('admin',
			{
				admin: isAdmin
			});
		}
		else{
			renderError(res, 'error', err.message, 500);
			return;
		}
	});
});

app.get('/question/:id', function(req, res){
	res.setHeader('Cache-Control', 'no-cache');
	neo4j.getQuestion(req.params.id, function(err, data){
		if(err==null){
			res.json({
				id: 		data.getID(),
				correct: 	data.getCorrect().getName(),
				wrong1:		data.getWrong1().getName(),
				wrong2: 	data.getWrong2().getName(),
				wrong3: 	data.getWrong3().getName(),
				type: 		data.getType() 
			});
		}
		else{
			res.json({
				error: 	err.message
			});
		}
	});
});

app.put('/question', function(req, res){
	var sess 		= req.session;
	var canswer 	= req.body.canswer;
	var wrong1 		= req.body.wanswer1;
	var wrong2 		= req.body.wanswer2;
	var wrong3 		= req.body.wanswer3;
	var typename 	= req.body.edittype;
	var question 	= req.body.editquestion;
	var id 			= req.body.squestion;	
	var isAdmin		= sess.isAdmin || false;

	logger.debug(question);

	if(canswer == null || wrong1 == null || wrong2 == null || wrong3 == null || typename == null || question == null || id == null){
		renderError(res, 'error', 'All parameter is required!', 403);
		return;
	}

	async.waterfall([
		function(callback){
			logger.debug('1');
			neo4j.deleteQuestion(id, function(err, success){
				if(err){
					return renderError(res, 'error', err.message, 500);
				}
				callback(null, success);
			});
		},
		function(success, callback){
			logger.debug('2');
			generateID(function(err, data){
				if(err){
					renderError(res, 'error', err.message, 500);
					return;
				}
				callback(null, data);
			});
		},
		function(aid, callback){
			logger.debug('3');
			var canswerobj 	= new Answer(canswer, true, aid + 1);
			var wanswer1obj	= new Answer(wrong1, false, aid + 2);
			var wanswer2obj	= new Answer(wrong2, false, aid + 3);
			var wanswer3obj	= new Answer(wrong3, false, aid + 4);

			var newquestion = new Question(question, canswerobj, wanswer1obj, wanswer2obj, wanswer3obj, aid, typename);
			
			neo4j.newQuestion(newquestion, function(err, success){
				if(err==null){
					res.render('admin',
					{
						admin: isAdmin
					});
				}
				else{
					renderError(res, 'error', err.message, 500);
					return;
				}
			});
		}
	]);
});

app.delete('/question/:id', function(req, res){
	var sess 		= req.session;
	var isAdmin		= sess.isAdmin || false;
	neo4j.deleteQuestion(req.params.id, function(err, success){
		if(err){
			return renderError(res, 'error', err.message, 500);
		}
		res.render('admin',
		{
			admin: isAdmin
		});
	});
});

app.get('/editquestion',  function(req, res){
	async.waterfall([
		function(callback){
			neo4j.getQuestionTypeNames(function(err, records){
				if(err==null){
					callback(null, records);
				}
				else{
					renderError(res, 'error', err.message, 500);
					return;
				}
			});
		},
		function(types, callback){
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
					res.render('editQuestion',
					{
						data: 		types,
						question: 	names,
						ids: 		ids
					});
				}
				else{
					renderError(res, 'error', err.message, 500);
					return;
				}
			});
		}
	])
	
});


app.get("/description/:type", checkAuth, function(req, res){
	neo4j.getQuestionType(req.params.type, function(err, data){
		if(err==null){
			res.render('description', 
			{
				descr: 	data.getDescription(),
				type:	data.getName(),
				numbr: 	data.getQuestionNumber()
			});
		}
		else{
			renderError(res, 'error', err.message, 500);
			return;
		}
	});
});

app.get('/quiz/:type',checkAuth, function(req, res){
	var sess 		= req.session;
	var username 	= sess.username;
	var point		= sess.userpoint;
	var qn 			= sess.qnumber;
	var qtn 		= sess.qtnumber;
	var qt 	 		= sess.qtype;
	var type 		= req.params.type;
	var befques 	= sess.befques;

	async.waterfall([
		function(callback){
			sess.userpoint 	= 0;
			sess.qnumber 	= 0;
			sess.qtype 		= type;
			neo4j.getQuestionType(type, function(err, qtype){
				if(err==null){
					callback(null, qtype);
				}
				else{
					renderError(res, 'error', err.message, 500);
					return;
				}
			});
		},
		function(qtype, callback){
			qtn = parseInt(qtype.getQuestionNumber());
			sess.qtnumber = qtn;
			neo4j.getQuestionsID(type, function(err, result){
				if(err==null){
					callback(null, qtn, result);
				}
				else{
					renderError(res, 'error', err.message, 500);
					return;
				}
			});
		},
		function(qtn, result, callback){
			shuffle(result, function(err, array){
				if(err!=null){
					renderError(res, 'error', err.message, 500);
					return;
				}
				callback(null, qtn, array);
			});
		},
		function(qtn, result, callback){
			if(result.length > qtn){
				result.length = qtn;
			}

			befques 		= result;
			sess.befques 	= befques;

			neo4j.getQuestion(befques[0], function(err, data){
				if(err==null){
					var array = [data.getWrong1(), data.getWrong2(), data.getWrong3(), data.getCorrect()];
					callback(null, data, array);
				}
				else{
					renderError(res, 'error', err.message, 500);
					return;
				}
			});
		},
		function(data, array, callback){
			shuffle(array, function(err, array2){
				if(err!=null){
					renderError(res, 'error', err.message, 500);
					return;
				}
				sendQuestion(res, array2, data, sess.userpoint, sess.qnumber, sess.qtnumber);
			});
		}
	],function(err){
		console.log(err);
		renderError(res, 'error', err.message, 500);
		return;
	});
});

app.post("/quiz/:type", checkAuth, function(req, res){
	var sess 		= req.session;
	var username 	= sess.username;
	var point		= sess.userpoint;
	var qn 			= sess.qnumber;
	var qtn 		= sess.qtnumber;
	var qt 	 		= sess.qtype;
	var type 		= req.params.type;
	var befques 	= sess.befques;
	var ansID 		= req.body.aid;

	if (ansID==null || point==null || qn==null || qt!=type || qtn==null || befques==null){
		async.waterfall([
			function(callback){
				sess.userpoint 	= 0;
				sess.qnumber 	= 0;
				sess.qtype 		= type;
				neo4j.getQuestionType(type, function(err, qtype){
					if(err==null){
						callback(null, qtype);
					}
					else{
						renderError(res, 'error', err.message, 500);
						return;
					}

				});
			},
			function(qtype, callback){
				qtn = parseInt(qtype.getQuestionNumber());
				sess.qtnumber = qtn;
				neo4j.getQuestionsID(type, function(err, result){
					if(err==null){
						callback(null, qtn, result);
					}
					else{
						renderError(res, 'error', err.message, 500);
						return;
					}
				});
			},
			function(qtn, result, callback){
				shuffle(result, function(err, array){
					if(err!=null){
						renderError(res, 'error', err.message, 500);
						return;
					}
					callback(null, qtn, array);
				});
			},
			function(qtn, result, callback){
				if(result.length > qtn){
					result.length = qtn;
				}

				befques 		= result;
				sess.befques 	= befques;

				neo4j.getQuestion(befques[0], function(err, data){
					if(err==null){
						var array = [data.getWrong1(),data.getWrong2(),data.getWrong3(),data.getCorrect()];
						callback(null, data, array);
					}
					else{
						renderError(res, 'error', err.message, 500);
						return;
					}
				});
			},
			function(data, array, callback){
				shuffle(array, function(err, array2){
					if(err!=null){
						renderError(res, 'error', err.message, 500);
						return;
					}
					sendQuestion(res, array2, data, sess.userpoint, sess.qnumber, sess.qtnumber);
				});
			}
		],function(err){
			console.log(err);
			renderError(res, 'error', err.message, 500);
			return;
		});
		return;
	}

	async.waterfall([
		function(callback){
			neo4j.isCorrect(ansID, function(err, correct){
				if(err!=null){
					renderError(res, 'error', err, 404);
					return;
				}
				if(err==null && correct){
					sess.userpoint = point + 1;
				}
				qn 				= qn + 1;
				sess.qnumber 	= qn;

				if(qtn <= qn){
					var params 			= {};
					var userpoint		= sess.userpoint;
					var qnumber 		= sess.qnumber;
					sess.userpoint 		= null;
					sess.qnumber 		= null;
					sess.qtype 			= null;
					sess.befques 		= null;
					res.render('complete',
					{
						qnum: qnumber,
						corr: userpoint
					});
				}
				else{
					callback(null, "newquestion");
				}
			});
		},
		function(msg, callback){
			neo4j.getQuestion(befques[qn], function(err, data){
				if(err==null){
					var array 		= [data.getWrong1(), data.getWrong2(), data.getWrong3(), data.getCorrect()];
					callback(null, data, array);
				}
				else{
					renderError(res, 'error', err.message, 500);
					return;
				}
			});
		},
		function(data, array, callback){
			shuffle(array, function(err, array2){
				if(err!=null){
					renderError(res, 'error', err.message, 500);
					return;
				}
				sendNewQuestion(res, array2, data, sess.userpoint, sess.qnumber, sess.qtnumber);
			});
		}
	],function(err){
		console.log(err);
		renderError(res, 'error', err.message, 500);
		return;
	});
});

app.get("/admin", checkAuthAdmin, function(req, res){
	var sess 		= req.session;
	var username 	= sess.username;
	var isAdmin		= sess.isAdmin || false;		
	res.render('admin',
	{
		admin: isAdmin
	});
});

app.post("/admin",function(req, res){
	username 	= req.body.username;
	pass 		= req.body.password;

	if(username == null || pass == null){
		renderError(res, 'error', 'All parameter is required!', 403);
		return;
	}

	async.waterfall([
		function(callback){
			neo4j.authenticateUser(username, pass, true, function(err, success){
				if(err){
					renderError(res, 'error', err.message, 500);
					return;
				}
				if(success){
					callback(null, success);
				}
				else{
					renderError(res, 'adminLogin', "Wrong username or password!", 403);
					return;
				}
			});
		},
		function(success, callback){
			if(success){
				res.writeHead(301,
				  {Location: '/admin'}
				);

				var sess = req.session;

				encoding.encode(username+"admin", "/admin", function(cb){
					sess.secretadminkey = cb;
					sess.username 		= username;
				});

				neo4j.isAdmin(username,function(err, exist){
					if(err==null){
						sess.isAdmin = exist;
					}
					res.end();
				});
			}
			else{
				renderError(res, 'adminLogin', 'Wrong username or password!', 403);
				return;
			}
		}
	], function(err){
		renderError(res, 'error', err.message, 500);
		return;
	});
});

app.get("/addeditor", checkAuthAdmin, function(req, res){
	var sess 	= req.session;
	var isAdmin	= sess.isAdmin || false;
	if(isAdmin){		
		res.render('newEditor');
	}
	else{
		renderError(res, 'error', "You don't have permission to view this page!", 403);
		return;
	}
});

app.post("/addeditor", checkAuthAdmin, function(req, res){
	var email 	= req.body.email;
	var sess 	= req.session;
	var isAdmin	= sess.isAdmin || false;

	if(email == null){
		renderError(res, 'error', 'All parameter is required!', 403);
		return;
	}

	neo4j.newEditor(email, function(err, success){
		if(err!=null){
			renderError(res, 'newEditor', err.message, 403);
			return;
		}
		if(success){			
			res.render('admin',
			{
				admin: isAdmin
			});
		}
		else{
			renderError(res, 'newEditor', "E-mail is not exist!", 403);
			return;
		}
	})
});

app.get("/newtype", checkAuthAdmin, function(req, res){
	res.render('newType');
});

app.post("/newtype", checkAuthAdmin, function(req, res){
	var typename 	= req.body.typename;
	var qnumber 	= req.body.number;
	var descr 		= req.body.description;
	var type 		= new QuestionType(typename, qnumber, descr);
	var sess 		= req.session;
	var isAdmin		= sess.isAdmin || false;

	if(typename == null){
		renderError(res, 'error', 'Type name is required!', 403);
		return;
	}

	neo4j.newType(type, function(err, success){
		if(err==null){
			res.render('admin',
			{
				admin: isAdmin
			});
		}
		else{
			renderError(res, 'error', err.message, 500);
			return;
		}
	});
});

app.get("/newquestion", checkAuthAdmin, function(req, res){
	neo4j.getQuestionTypeNames(function(err, records){
		if(err==null){
			res.render('newQuestion',
			{
				data: records
			});
		}
		else{
			renderError(res, 'error', err.message, 500);
			return;
		}
	});
});

app.post("/newquestion", checkAuthAdmin, function(req, res){
	var sess 		= req.session;
	var isAdmin		= sess.isAdmin || false;

	var id;

	async.waterfall([
		function(callback){
			generateID(function(err, data){
				if(err){
					renderError(res, 'error', err.message, 500);
					return;
				}
				callback(null, data);
			});
		},
		function(id, callback){
			if(req.body.question == null || req.body.canswer == null || req.body.wanswer1 == null || req.body.wanswer2 == null || req.body.wanswer3 == null || req.body.type==null){
				renderError(res, 'error', 'All parameter is required!', 403);
				return;
			}

			var question 	= req.body.question;
			var canswer 	= new Answer(req.body.canswer, true, id + 1);
			var wanswer1 	= new Answer(req.body.wanswer1, false, id + 2);
			var wanswer2 	= new Answer(req.body.wanswer2, false, id + 3);
			var wanswer3 	= new Answer(req.body.wanswer3, false, id + 4);
			var type 		= req.body.type;

			var newquestion = new Question(question, canswer, wanswer1, wanswer2, wanswer3, id, type);
			
			neo4j.newQuestion(newquestion, function(err, success){
				if(err==null){
					res.render('admin',
					{
						admin: isAdmin
					});
				}
				else{
					renderError(res, 'error', err.message, 500);
					return;
				}
			});
		}
	]);
});

app.get('/getquestionnumber/:id', function(req, res){
	var id = req.params.id;
	neo4j.getQuestionTypeByAnswer(id, function(err, data){
		if(err){
			renderError(res, 'error', err.message, 500);
			return;
		}
		res.json({
			qnumber: data.getQuestionNumber()
		});
		res.end();
	});
});

app.get('/edittype', checkAuthAdmin, function(req, res){
	neo4j.getQuestionTypeNames(function(err, records){
		if(err==null){
			res.render('editType',
			{
				data: records
			});
		}
		else{
			renderError(res, 'error', err.message, 500);
			return;
		}
	});
});

app.use(function(req, res){
	renderError(res, 'error', 'Not Found!', 404);
	return;
});

var server = app.listen(process.env.PORT || 8081 ,function(){
	var host = server.address().address;
	var port = server.address().port;
	logger.info("Server listening at http://%s:%s",host,port);
}).on('error', function(err){
    logger.info('on error handler');
    logger.info(err.stack);
});

process.on('uncaughtException', function(err) {
    logger.info('process.on handler');
    logger.error(err.stack);
});

module.exports = server;