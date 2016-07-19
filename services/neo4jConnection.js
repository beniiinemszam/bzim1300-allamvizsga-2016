var neo4j = require('neo4j-driver').v1;

// var driver = neo4j.driver("bolt://localhost", neo4j.auth.basic("neo4j", "neo4jpassword"));

var graphenedbURL   = process.env.GRAPHENEDB_BOLT_URL;
var graphenedbUser  = process.env.GRAPHENEDB_BOLT_USER;
var graphenedbPass  = process.env.GRAPHENEDB_BOLT_PASSWORD;
var driver = neo4j.driver(graphenedbURL, neo4j.auth.basic(graphenedbUser, graphenedbPass));

var self = module.exports = {
  authenticateUser: function (name, pass , callback) {
    var session = driver.session();
  	var exist = false;
  	session
  		.run("Match (p:Person{name:{username},password:{password}}) return p.name as name",{username: name, password: pass})
  		.subscribe({
  			onNext: function(record){
  				exist = true;
  			},
  			onCompleted: function(){
  				session.close();
  				callback(exist);
  			},
  			onError: function(error){
  				console.log(error.stack);
          session.close();
          callback(false);
  			}
  		});
  },
  newUser: function (name, password, email, callback) {
    var session = driver.session();
    var succes = false;
    self.isExist(name, email, function(exist){
      if(exist){
        callback(succes);
      }
      else{
        session
          .run("Create (p:Person{name:{username},password:{password},email:{emailpar}}) return p.name as name",{username: name, password: pass, emailpar: email})
          .then(function(record){
              session.close();
              callback(true);
          })
          .catch(function(error){
              console.log(error);
              session.close();
              callback(false);
          });
      }
    });
  },
  isExist: function (name, email, callback){
    var session = driver.session();
  	var exist = false;
  	session
  		.run("Match (p:Person) where p.name={username} or p.email={emailpar} return p.name, p.email",{username: name, emailpar: email})
  		.subscribe({
  			onNext: function(record){
  				exist = true;
  			},
  			onCompleted: function(){
  				session.close();
  				callback(exist);
  			},
  			onError: function(error){
  				console.log(error);
          session.close();
          callback(false);
  			}
  		});
  }
};