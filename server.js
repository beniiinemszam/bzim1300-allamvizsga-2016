var express 		= require('express');
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

var app 			= express();


app.set('view engine', 'vash');
app.disable('view cache');

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

	encoding.encode(username, '/authenticate', function(cb){
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

	encoding.encode(username + "admin", "/authenticateAdmin", function(cb){
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

function addZero(i) {
	if(i){
	    if (i < 10) {
	    	i = "0" + i;
	    }
	    return i;
	}
}

function renderError(res, name, msg, ecode){
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
	//res.send({ some: 'json' });
	/*res.set({
	  'Content-Type': 'text/plain',
	  'Content-Length': '123',
	  'ETag': '12345'
	});*/
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

function shuffle(array) {
    var j, x, i;
    for (i = array.length; i; i--) {
        j = Math.floor(Math.random() * i);
        x = array[i - 1];
        array[i - 1] 	= array[j];
        array[j] 		= x;
    }

    return array;
}

function sendQuestion(res, array, data){
	res.render('question',
	{
		question: 	data.getQuestion(),
		ans1: 		array[0].getName(),
		ans2: 		array[1].getName(),
		ans3: 		array[2].getName(),
		ans4: 		array[3].getName(),
		qid: 		data.getID(),
		aid1: 		array[0].getID(),
		aid2: 		array[1].getID(),
		aid3: 		array[2].getID(),
		aid4: 		array[3].getID()
	});
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

app.post("/trysignup", function(req, res){
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
			sessionNewPage(req, '/authenticate', username);
			redirect(res,'/types');
		}
		else{
			renderError(res, 'signup', 'Username or Email is exist!', 403);
		}
	})
});

app.post("/authenticate", function(req, res){
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
			sessionNewPage(req, '/authenticate', username);
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
		}
	});
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
		}
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

	if(point==null || qn==null || qt!=type || qtn==null || befques==null){
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
					}
				});
			},
			function(qtn, result, callback){
				result = shuffle(result);
				if(result.length > qtn){
					result.length = qtn;
				}

				befques 		= result;
				sess.befques 	= befques;

				neo4j.getQuestion(befques[0], type, function(err, data){
					if(err==null){
						var array = [data.getWrong1(),data.getWrong2(),data.getWrong3(),data.getCorrect()];
						array = shuffle(array);
						sendQuestion(res, array, data);
					}
					else{
						renderError(res, 'error', err.message, 500);
					}
				});
			}
		],function(err){
			console.log(err);
			renderError(res, 'error', err.message, 500);
		});
		return;
	}
	
	var ansID = req.body.ansID;
	if (ansID==null){
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
					}
				});
			},
			function(qtn, result, callback){
				result = shuffle(result);
				if(result.length > qtn){
					result.length = qtn;
				}

				befques 		= result;
				sess.befques 	= befques;

				neo4j.getQuestion(befques[0], type, function(err, data){
					if(err==null){
						var array = [data.getWrong1(),data.getWrong2(),data.getWrong3(),data.getCorrect()];
						array = shuffle(array);
						sendQuestion(res, array, data);
					}
					else{
						renderError(res, 'error', err.message, 500);
					}
				});
			}
		],function(err){
			console.log(err);
			renderError(res, 'error', err.message, 500);
		});
		return;
	}

	async.waterfall([
		function(callback){
			neo4j.isCorrect(ansID, function(err, correct){
				if(err==null){
					sess.userpoint = point + 1;
				}
				else{
					renderError(res, 'error', err, 404);
				}
				qn 				= qn + 1;
				sess.qnumber 	= qn;

				if(qtn == qn){
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
					callback(null,"newquestion");
				}
			});
		},
		function(msg, callback){
			neo4j.getQuestion(befques[qn], type, function(err, data){
				if(err==null){
					var array 		= [data.getWrong1(),data.getWrong2(),data.getWrong3(),data.getCorrect()];
					array 			= shuffle(array);
					sendQuestion(res, array, data);
				}
				else{
					renderError(res, 'error', err.message, 500);
				}
			});
		}
	],function(err){
		console.log(err);
		renderError(res, 'error', err.message, 500);
	});
});

function quizeinit(){

}

app.get("/admin", checkAuthAdmin, function(req, res){
	var sess 		= req.session;
	var username 	= sess.username;
	var isAdmin		= sess.isAdmin || false;		
	res.render('admin',
	{
		admin: isAdmin
	});
});

app.post("/authenticateAdmin",function(req, res){
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
				}
				if(success){
					callback(null, success);
				}
				else{
					renderError(res, 'error', err.message, 500);
				}
			});
		},
		function(success, callback){
			if(success){
				res.writeHead(301,
				  {Location: '/admin'}
				);

				var sess = req.session;

				encoding.encode(username+"admin", "/authenticateAdmin", function(cb){
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
			}
		}
	], function(err){
		renderError(res, 'error', err.message, 500);
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
	}
});

app.post("/tryneweditor", checkAuthAdmin, function(req, res){
	var email 	= req.body.email;
	var sess 	= req.session;
	var isAdmin	= sess.isAdmin || false;

	if(email == null){
		renderError(res, 'error', 'All parameter is required!', 403);
		return;
	}

	neo4j.newEditor(email, function(err, success){
		if(err==null){
			res.render('admin',
			{
				admin: isAdmin
			});
		}
		else{
			renderError(res, 'neweditor', err.message, 403);
		}
	})
});

app.get("/newtype", checkAuthAdmin, function(req, res){
	res.render('newType');
});

app.post("/trynewtype", checkAuthAdmin, function(req, res){
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
		}
	})
});

app.post("/trynewquestion", checkAuthAdmin, function(req, res){
	var sess 		= req.session;
	var isAdmin		= sess.isAdmin || false;

	var d 	= new Date();
    var h 	= addZero(d.getHours(), 2);
    var m 	= addZero(d.getMinutes(), 2);
    var s 	= addZero(d.getSeconds(), 2);
    var ms 	= addZero(d.getMilliseconds(), 3);

	var id 			= (h*1000000 + m*10000 + s*100 + ms)*10;

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
		}
	})
});

app.get('/test', function(req, res){
	logger.info(" %s test message", 'my string');
	logger.debug('debug');
	renderError(res, 'error', 'Not Found!', 404);
});

app.use(function(req, res){
	renderError(res, 'error', 'Not Found!', 404);
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