var express 		= require('express');
var path    		= require("path");
var url 			= require("url");
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

app.use(express.static(__dirname + "/public"));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({
	secret: 'secret',
  	resave: false,
  	saveUninitialized: true
}));

function checkAuth(req,res,next){
	var sess 		= req.session;
	var username 	= sess.username;
	// var pathname 	= url.parse(req.url).pathname;
	var success		= true;
	// var previous	= url.parse(req.header('Referer')).path;
	// console.log(previous);
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

function checkAuthAdmin(req,res,next){
	var sess 		= req.session;
	var username 	= sess.username;
	//var pathname 	= url.parse(req.url).pathname;
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

app.get("/",function(req,res){
	res.sendFile(path.join(__dirname+"/views/index.html")); 
});

app.get("/login",function(req,res){
	res.render('login');
});

app.get("/signup",function(req,res){
	res.render('signup');
});

app.post("/trysignup",function(req,res){
	username 	= req.body.username;
	pass 		= req.body.password;
	email 		= req.body.email;

	if(username == null || pass == null || email== null){
		renderError(res, 'error', 'All parameter is required!', 403);
		return;
	}

	neo4j.newUser(username,pass,email,function(success){
		if(success){
			sessionNewPage(req, '/authenticate', username);
			redirect(res,'/types');
		}
		else{
			renderError(res, 'signup', 'Username or Email is exist!', 403);
		}
	})
});

app.post("/authenticate",function(req,res){
	username 	= req.body.username;
	pass 		= req.body.password;

	if(username == null || pass == null){
		renderError(res, 'error', 'All parameter is required!', 403);
		return;
	}

	neo4j.authenticateUser(username, pass, false, function(success){
		if(success){
			sessionNewPage(req, '/authenticate', username);
			redirect(res,'/types');
		}
		else{
			renderError(res, 'login', 'Wrong username or password!', 403);
		}
	})
});

app.get("/types", checkAuth, function(req,res){
	var point = req.body.point;
	neo4j.getQuestionTypes(function(records){
		if(records){
			res.render('types',
			{
				data: records
			});
		}
		else{
			renderError(res, 'error', 'Internal Server Error!', 500);
		}
	});
});

/*lekerni az osszes kviz id, osszekeverni, elso n-et megmutatni*/

app.post("/quiz/:type", checkAuth, function(req,res){
	var sess 		= req.session;
	var username 	= sess.username;
	var point		= sess.userpoint;
	var qn 			= sess.qnumber;
	var qt 	 		= sess.qtype;
	var type 		= req.params.type;
	var befques 	= sess.befques;

	if(point==null || qn==null || qt!=type ||befques==null){
		sess.userpoint 	= 0;
		sess.qnumber 	= 0;
		sess.qtype 		= type;
		neo4j.getQuestion(null, type, function(data){
			if(data){
				var array = [data.getWrong1(),data.getWrong2(),data.getWrong3(),data.getCorrect()];
				array = shuffle(array);				
				sess.befques 	= [data.getID()];
				sendQuestion(res, array, data);
			}
			else{
				renderError(res, 'error', 'Internal Server Error!', 500);
			}
		});
		return;
	}
	
	var ansID = req.body.ansID;
	if (ansID==null){
		sess.userpoint 	= null;
		sess.qnumber 	= null;
		sess.qtype 		= null;
		sess.befques 	= null;
		neo4j.getQuestion(null, type, function(data){
			if(data){
				var array 		= [data.getWrong1(),data.getWrong2(),data.getWrong3(),data.getCorrect()];
				array 			= shuffle(array);
				sess.befques 	= [data.getID()];
				sendQuestion(res, array, data);
			}
			else{
				renderError(res, 'error', 'Internal Server Error!', 500);
			}
		});
		return;
	}

	neo4j.isCorrect(ansID, function(correct){
		if(correct){
			sess.userpoint = point + 1;
		}
		sess.qnumber = qn + 1;

		neo4j.getQuestionType(type, function(qtype){
			if(qtype.getQuestionNumber()==qn + 1){
				console.log("correct(s) nr.:" + sess.userpoint);
				var params 			= {};
				params['point'] 	= sess.userpoint;
				params['qnumber'] 	= sess.qnumber;
				sess.userpoint 	= null;
				sess.qnumber 	= null;
				sess.qtype 		= null;
				sess.befques 	= null;
				redirect(res, '/types', params);
			}
			else{
				neo4j.getQuestion(sess.befques, type, function(data){
					if(data){
						var array 		= [data.getWrong1(),data.getWrong2(),data.getWrong3(),data.getCorrect()];
						array 			= shuffle(array);
						sess.befques 	= [data.getID()];
						sendQuestion(res, array, data);
					}
					else{
						renderError(res, 'error', 'Internal Server Error!', 500);
					}
				});
			}
		});		
	});
})

app.get("/admin", checkAuthAdmin, function(req,res){
	var sess 		= req.session;
	var username 	= sess.username;
	neo4j.isAdmin(username,function(exist){		
		res.render('admin',
		{
			admin: exist
		});
	});
});

app.post("/authenticateAdmin",function(req,res){
	username 	= req.body.username;
	pass 		= req.body.password;

	if(username == null || pass == null){
		renderError(res, 'error', 'All parameter is required!', 403);
		return;
	}

	neo4j.authenticateUser(username, pass, true, function(success){
		if(success){
			res.writeHead(301,
			  {Location: '/admin'}
			);
			encoding.encode(username+"admin", "/authenticateAdmin", function(cb){
				var sess 			= req.session;
				sess.secretadminkey = cb;
				sess.username 		= username;
			});
			res.end();
		}
		else{
			renderError(res, 'adminLogin', 'Wrong username or password!', 403);
		}
	})
});

app.get("/addeditor", checkAuthAdmin, function(req, res){
	res.render('newEditor');
});

app.post("/tryneweditor", checkAuthAdmin, function(req, res){
	var email = req.body.email;

	if(email == null){
		renderError(res, 'error', 'All parameter is required!', 403);
		return;
	}

	neo4j.newEditor(email, function(success){
		if(success){
			res.render('admin',
			{
				admin: true
			});
		}
		else{
			renderError(res, 'newEditor', 'User does not exist!', 403);
		}
	})
});

app.get("/newtype", checkAuthAdmin, function(req, res){
	res.render('newType');
});

app.post("/trynewtype", checkAuthAdmin, function(req, res){
	var typename 	= req.body.typename;
	var qnumber 	= req.body.number;
	var type 		= new QuestionType(typename, qnumber);

	if(typename == null || qnumber==null || type== null){
		renderError(res, 'error', 'All parameter is required!', 403);
		return;
	}

	neo4j.newType(type, function(success){
		if(success){
			res.render('admin');
		}
		else{
			renderError(res, 'error', 'Internal Server Error!', 500);
		}
	});
});

app.get("/newquestion", checkAuthAdmin, function(req, res){
	neo4j.getQuestionTypeNames(function(records){
		if(records){
			res.render('newQuestion',
			{
				data: records
			});
		}
		else{
			renderError(res, 'error', 'Internal Server Error!', 500);
		}
	})
});

app.post("/trynewquestion", checkAuthAdmin, function(req, res){
	var sess 		= req.session;

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
	
	neo4j.newQuestion(newquestion, function(success){
		if(success){
			res.render('admin');
		}
		else{
			renderError(res, 'error', 'Internal Server Error!', 500);
		}
	})
});

app.get("/test",function(req,res){
	var params 			= {};
				params['point'] 	= "asd";
				params['qnumber'] 	= "222";
				redirect(res, '/types', params);
});

app.use(function(req, res){
	renderError(res, 'error', 'Not Found!', 404);
});

var server = app.listen(process.env.PORT || 8081,function(){
	var host = server.address().address;
	var port = server.address().port;
	console.log("Server listening at http://%s:%s",host,port);
}).on('error', function(err){
    console.log('on error handler');
    console.log(err.stack);
});

process.on('uncaughtException', function(err) {
    console.log('process.on handler');
    console.log(err.stack);
});