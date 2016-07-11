var express 	= require('express');
var app 		= express();
var path    	= require("path");
var url 		= require("url");
var bodyParser 	= require('body-parser');
var neo4j		= require(path.join(__dirname + "/../services/neo4jConnection"));
var encoding	= require(path.join(__dirname + "/../services/encoding"));
var session 	= require('express-session');

app.use(express.static(__dirname + "/../public"));
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
		res.status(404).send("you don't have permission to view this page");
	}

	console.log(pathname);

	encoding.encode(username,pathname,function(cb){
		if(sess.secretkey != cb){
			res.status(404).send("you don't have permission to view this page");
		}
	});

	console.log("checked");
	next();
}

app.get("/",function(req,res){
	res.sendFile(path.join(__dirname+"/../views/index.html"));
});

app.get("/login",function(req,res){
	res.sendFile(path.join(__dirname+"/../views/login.html"));
});

app.get("/signup",function(req,res){
	res.sendFile(path.join(__dirname+"/../views/signup.html"));
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
			res.status(400).send('Username or Email is exist!');
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
			console.log("Error: wrong username or password!");
			res.status(404).send('Wrong username or password!');
		}
	})
});

app.get("/test",checkAuth,function(req,res){
	console.log("ok");
	res.writeHead(301,
			  {Location: '/'}
			);
	res.end();
})

app.use(function(req, res){
	res.status(404).send('Not Found');
});

var server = app.listen(8081,function(){
	var host = server.address().address;
	var port = server.address().port;
	console.log("Server listening at http://%s:%s",host,port);
});