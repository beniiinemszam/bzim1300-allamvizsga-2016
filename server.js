var express 		= require('express');
var compression 	= require('compression');
var path    		= require("path");
var url 			= require("url");
var async 			= require("async");
var bodyParser 		= require('body-parser');
var session 		= require('express-session');
var vash 			= require('vash');
// var engine 			= require('express-dot-engine');
var neo4j			= require(path.join(__dirname + "/services/neo4jConnection"));
var encoding		= require(path.join(__dirname + "/services/encoding"));
var Logger			= require(path.join(__dirname + "/services/logger"));
var Question		= require(path.join(__dirname + "/models/Question"));
var QuestionType	= require(path.join(__dirname + "/models/QuestionType"));
var Answer        	= require(path.join(__dirname + "/models/Answer"));
var User        	= require(path.join(__dirname + "/models/User"));
var UserDao        	= require(path.join(__dirname + "/models/UserDao"));
var TypeDao        	= require(path.join(__dirname + "/models/TypeDao"));
var QuestionDao   	= require(path.join(__dirname + "/models/QuestionDao"));
//pasport.js authentication
var app 			= express();


/*app.engine('dot', engine.__express);
app.set('views', path.join(__dirname, './views'));
app.set('view engine', 'dot');*/
app.set('view engine', 'vash');

app.use(compression());
app.use(express.static(__dirname + "/public"));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({
	secret: 'secret',
  	resave: false,
  	saveUninitialized: true
}));

/*app.get('/test', function(req, res){
  res.render('error', 
  {
  	message: "uzenet",
	code: 200
  })
});*/

var logger;

Logger.getLogger(function(loggerobj){
	logger = loggerobj;
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
		return renderError(res, 'error', 'All parameter is required!', 403);
	}

	var user = new User(username, pass, email, null, null);
	UserDao.save(user, function (err, success) {
		if(err){
			return renderError(res, err.getPath(), err.getErrorMessage(), err.getCode());
		}
		sessionNewPage(req, '/login', username);
		redirect(res,'/types');
	});
});

app.post("/login", function(req, res){
	username 	= req.body.username;
	pass 		= req.body.password;

	if(username == null || pass == null){
		renderError(res, 'error', 'All parameter is required!', 403);
		return;
	}

	var user = new User(username, pass, null, false, null);

	UserDao.getUser(user, function(err, success){
		if(err){
			return renderError(res, 'login', err.getErrorMessage(), err.getCode());
		}
		sessionNewPage(req, '/login', username);
		redirect(res,'/types');
	});
});

app.get("/types", checkAuth, function(req, res){
	var point = req.body.point;
	
	TypeDao.getAll(function(err, records){
		if(err){
			return renderError(res, err.getPath(), err.getErrorMessage(), err.getCode());
		}
		res.render('types',
		{
			data: records
		});
	});
});

app.get("/type/:typename", function(req, res){
	res.setHeader('Cache-Control', 'no-cache');
	
	var type = new QuestionType(req.params.typename, null, null);
	TypeDao.getType(type, function(err, data){
		if(err){
			return res.json({error: err.getErrorMessage()});
		}
		res.json({
			descr: 	data.getDescription(),
			type:	data.getName(),
			number: parseInt(data.getQuestionNumber())
		});
	});
});

app.put("/type/:typename", checkAuthAdmin, function(req, res){
	var sess 		= req.session;
	var typename 	= req.body.type;
	var qnumber 	= req.body.number;
	var descr 		= req.body.description;	
	var isAdmin		= sess.isAdmin || false;
	var type 		= new QuestionType(typename, qnumber, descr);

	TypeDao.update(type, function(err, data){
		if(err){
			return renderError(res, err.getPath(), err.getErrorMessage(), err.getCode());
		}
		res.render('admin',
		{
			admin: isAdmin
		});
	});
});

app.delete('/type/:typename', checkAuthAdmin, function(req, res){
	var sess 		= req.session;
	var typename 	= req.body.type;
	var qnumber 	= req.body.number;
	var descr 		= req.body.description;	
	var isAdmin		= sess.isAdmin || false;
	var type 		= new QuestionType(typename, qnumber, descr);

	TypeDao.delete(type, function(err, data){
		if(err){
			return renderError(res, err.getPath(), err.getErrorMessage(), err.getCode());
		}
		res.render('admin',
		{
			admin: isAdmin
		});
	});
});

app.get('/question/:id', function(req, res){
	res.setHeader('Cache-Control', 'no-cache');
	var question = new Question(null, null, null, null, null, req.params.id, null);

	QuestionDao.getQuestion(question, function(err, data){
		if(err){
			return res.json({error: err.getErrorMessage()});
		}
		res.json({
			id: 		data.getID(),
			correct: 	data.getCorrect().getName(),
			wrong1:		data.getWrong1().getName(),
			wrong2: 	data.getWrong2().getName(),
			wrong3: 	data.getWrong3().getName(),
			type: 		data.getType()
		});
	});
});

app.put('/question', checkAuthAdmin, function(req, res){
	var sess 		= req.session;
	var canswer 	= req.body.canswer;
	var wrong1 		= req.body.wanswer1;
	var wrong2 		= req.body.wanswer2;
	var wrong3 		= req.body.wanswer3;
	var typename 	= req.body.edittype;
	var question 	= req.body.editquestion;
	var id 			= req.body.squestion;	
	var isAdmin		= sess.isAdmin || false;

	if(canswer == null || wrong1 == null || wrong2 == null || wrong3 == null || typename == null || question == null || id == null){
		renderError(res, 'error', 'All parameter is required!', 403);
		return;
	}
	var cansobj 	= new Answer(canswer, true, null);
	var wrong1obj 	= new Answer(wrong1, true, null);
	var wrong2obj 	= new Answer(wrong2, true, null);
	var wrong3obj 	= new Answer(wrong3, true, null);
	var questionobj = new Question(question, cansobj, wrong1obj, wrong2obj, wrong3obj, id, typename);

	QuestionDao.update(questionobj, function(err, data){
		if(err){
			return renderError(res, err.getPath(), err.getErrorMessage(), err.getCode());
		}
		res.render('admin',
		{
			admin: isAdmin
		});
	});
});

app.delete('/question/:id', checkAuthAdmin, function(req, res){
	var sess 		= req.session;
	var isAdmin		= sess.isAdmin || false;

	var question = new Question(null, null, null, null, null, req.params.id, null);

	QuestionDao.delete(question, function(err, data){
		if(err){
			return renderError(res, err.getPath(), err.getErrorMessage(), err.getCode());
		}
		res.render('admin',
		{
			admin: isAdmin
		});
	});
});

app.get('/editquestion', checkAuthAdmin, function(req, res){
	async.waterfall([
		function(callback){
			TypeDao.getAllName(function(err, data){
				if(err){
					return renderError(res, err.getPath(), err.getErrorMessage(), err.getCode());
				}
				callback(null, data);
			});
		},
		function(types, callback){
			QuestionDao.getAllName(function(err, names, ids){
				if(err){
					return renderError(res, err.getPath(), err.getErrorMessage(), err.getCode());
				}
				res.render('editQuestion',
				{
					data: 		types,
					question: 	names,
					ids: 		ids
				});
			});
		}
	]);	
});


app.get("/description/:type", checkAuth, function(req, res){
	var type = new QuestionType(req.params.type, null, null);

	TypeDao.getType(type, function(err, data){
		if(err){
			return renderError(res, err.getPath(), err.getErrorMessage(), err.getCode());
		}
		res.render('description', 
		{
			descr: 	data.getDescription(),
			type:	data.getName(),
			numbr: 	data.getQuestionNumber()
		});
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

	sess.userpoint 	= 0;
	sess.qnumber 	= 0;
	sess.qtype 		= type;

	var typeobj = new QuestionType(type, null, null);

	QuestionDao.getNewQuestion(typeobj, function(err, array, data, befques, qtn){
		if(err){
			return renderError(res, err.getPath(), err.getErrorMessage(), err.getCode());
		}

		sess.qtnumber = qtn;
		sess.befques  = befques;
		sendQuestion(res, array, data, sess.userpoint, sess.qnumber, sess.qtnumber);
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
		sess.userpoint 	= 0;
		sess.qnumber 	= 0;
		sess.qtype 		= type;

		var typeobj = new QuestionType(type, null, null);

		QuestionDao.getNewQuestion(typeobj, function(err, array, data, befques, qtn){
			if(err){
				return renderError(res, err.getPath(), err.getErrorMessage(), err.getCode());
			}

			sess.qtnumber = qtn;
			sess.befques  = befques;
			sendQuestion(res, array, data, sess.userpoint, sess.qnumber, sess.qtnumber);
		});
		return;
	}

	var answer = new Answer(null, null, parseInt(ansID));
	QuestionDao.getNextQuestion(answer, befques, qn, function(err, array, data, correct){
		if(err){
			return renderError(res, err.getPath(), err.getErrorMessage(), err.getCode());
		}
		if(correct){
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
			return;
		}
		sendNewQuestion(res, array, data, sess.userpoint, sess.qnumber, sess.qtnumber);
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

app.post("/admin", function(req, res){
	username 	= req.body.username;
	pass 		= req.body.password;

	if(username == null || pass == null){
		return renderError(res, 'error', 'All parameter is required!', 403);
	}

	var user = new User(username, pass, null, true, null);

	async.waterfall([
		function(callback){
			UserDao.getUser(user, function(err, success){
				if(err){
					return callback(err);
				}
				callback(null, success);
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

				UserDao.isAdmin(user, function(err, exist){
					if(err==null){
						sess.isAdmin = exist;
					}
					res.end();
				});
			}
			else{
				return renderError(res, err.getPath(), err.getErrorMessage(), err.getCode());
			}
		}
	], function(err, result){
		return renderError(res, 'adminLogin', err.getErrorMessage(), err.getCode());
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

	var user = new User(null, null, email, null, null);

	UserDao.addNewEditor(user, function(err, success){
		if(err){
			return renderError(res, err.getPath(), err.getErrorMessage(), err.getCode());
		}
		res.render('admin',
		{
			admin: isAdmin
		});
	});
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
		return renderError(res, 'error', 'Type name is required!', 403);
	}

	var type = new QuestionType(typename, qnumber, descr);

	TypeDao.save(type, function(err, success){
		if(err){
			return renderError(res, err.getPath(), err.getErrorMessage(), err.getCode());
		}
		res.render('admin',
		{
			admin: isAdmin
		});
	});
});

app.get("/newquestion", checkAuthAdmin, function(req, res){
	TypeDao.getAllName(function(err, records){
		if(err){
			return renderError(res, err.getPath(), err.getErrorMessage(), err.getCode());
		}
		res.render('newQuestion',
		{
			data: records
		});
	});
});

app.post("/newquestion", checkAuthAdmin, function(req, res){
	var sess 		= req.session;
	var isAdmin		= sess.isAdmin || false;

	if(req.body.question == null || req.body.canswer == null || req.body.wanswer1 == null || req.body.wanswer2 == null || req.body.wanswer3 == null || req.body.type == null){
		return renderError(res, 'error', 'All parameter is required!', 403);
	}

	var question 	= req.body.question;
	var canswer 	= new Answer(req.body.canswer, true, null);
	var wanswer1 	= new Answer(req.body.wanswer1, false, null);
	var wanswer2 	= new Answer(req.body.wanswer2, false, null);
	var wanswer3 	= new Answer(req.body.wanswer3, false, null);
	var type 		= req.body.type;

	var newquestion = new Question(question, canswer, wanswer1, wanswer2, wanswer3, null, type);

	QuestionDao.save(newquestion, function(err, success){
		if(err){
			return renderError(res, err.getPath(), err.getErrorMessage(), err.getCode());
		}
		res.render('admin',
		{
			admin: isAdmin
		});
	});
});

app.get('/getquestionnumber/:id', checkAuth, function(req, res){
	var id = req.params.id;
	var answer = new Answer(null, null, id);

	TypeDao.getByID(answer, function(err, data){
		if(err){
			return renderError(res, err.getPath(), err.getErrorMessage(), err.getCode());
		}
		res.json({
			qnumber: data.getQuestionNumber()
		});
		res.end();
	});
});

app.get('/edittype', checkAuthAdmin, function(req, res){
	TypeDao.getAllName(function(err, data){
		if(err){
			return renderError(res, err.getPath(), err.getErrorMessage(), err.getCode());
		}
		res.render('editType',
		{
			data: data
		});
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
    logger.info(err.message);
});

process.on('uncaughtException', function(err) {
    logger.info('process.on handler');
    logger.error(err.message);
});

module.exports = server;