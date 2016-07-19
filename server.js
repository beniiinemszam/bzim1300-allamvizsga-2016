var express 	= require('express');
var path    	= require("path");
var url 		= require("url");
var bodyParser 	= require('body-parser');
var session 	= require('express-session');
var vash 		= require('vash');
var neo4j		= require(path.join(__dirname + "/services/neo4jConnection"));
var encoding	= require(path.join(__dirname + "/services/encoding"));

var app 		= express();


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
	var sess = req.session;
	var username = sess.username;
	var pathname = url.parse(req.url).pathname;
	if(!sess.secretkey){
		res.render('error',
		{
			message: "You don't have permission to view this page!",
			code: '403'
		});
		return;
	}

	encoding.encode(username,pathname,function(cb){
		if(sess.secretkey != cb){
			res.render('error',
			{
				message: "You don't have permission to view this page!",
				code: '403'
			});
			return;
		}
	});

	next();
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
	username = req.body.username;
	pass = req.body.password;
	email = req.body.email;

	neo4j.newUser(username,pass,email,function(success){
		if(success){
			res.writeHead(301,
			  {Location: '/test'}
			);
			encoding.encode(username,"/test",function(cb){
				var sess = req.session;
				sess.secretkey = cb;
				sess.username = username;
			});
			res.end();
		}
		else{
			res.render('signup',
			{
				message: 'Username or Email is exist!',
				code: '403'
			});
		}
	})
});

app.post("/authenticate",function(req,res){
	username = req.body.username;
	pass = req.body.password;

	neo4j.authenticateUser(username, pass, function(success){
		if(success){
			res.writeHead(301,
			  {Location: '/test'}
			);
			encoding.encode(username,"/test",function(cb){
				var sess = req.session;
				sess.secretkey = cb;
				sess.username = username;
			});
			res.end();
		}
		else{
			res.render('login',
			{
				message: 'Wrong username or password!',
				code: '403'
			});
		}
	})
});

app.get("/test",checkAuth,function(req,res){
	res.writeHead(301,
			  {Location: '/'}
			);
	res.end();
})

app.use(function(req, res){
	res.render('error',
	{
		message: 'Not Found!',
		code: '404'
	});
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
    console.log(err);
});