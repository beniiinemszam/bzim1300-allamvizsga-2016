var neo4j = require('neo4j-driver').v1;

// var driver = neo4j.driver("bolt://localhost", neo4j.auth.basic("neo4j", "neo4jpassword"));

var graphenedbURL = process.env.GRAPHENEDB_BOLT_URL;
var graphenedbUser = process.env.GRAPHENEDB_BOLT_USER;
var graphenedbPass = process.env.GRAPHENEDB_BOLT_PASSWORD;

var driver = neo4j.driver(graphenedbURL, neo4j.auth.basic(graphenedbUser, graphenedbPass));

var self = module.exports = {
  authenticateUser: function (name, pass , callback) {
  	var session = driver.session();
  	var exist = false;
    console.log(name+" "+pass);
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
  				console.log(error);
          callback(false);
  			}
  		});
  },
  /*newUser: function (name, password, email, callback) {
    var succes = false;
  	self.isExist(name, email, function(exist){
      if(exist){
        callback(succes);
        console.log("van");
      }
      else{
        console.log("nincs");
        var session = driver.session();
        session
          .run("Create (p:Person{name:{username},password:{password},email:{emailpar}}) return p.name as name",{username: name, password: pass, emailpar: email})
          .subscribe({
            onNext: function(record){
              succes = true;
            },
            onCompleted: function(){
              session.close();
              callback(succes);
            },
            onError: function(error){
              console.log(error);
              callback(false);
            }
        });
      }
    });
  },*/
  newUser: function (name, password, email, callback) {
    var succes = false;
    self.isExist(name, email, function(exist){
      if(exist){
        callback(succes);
        console.log("van");
      }
      else{
        console.log("nincs");
        var session = driver.session();
        session
          .run("Create (p:Person{name:{username},password:{password},email:{emailpar}}) return p.name as name",{username: name, password: pass, emailpar: email})
          .then(function(record){
              session.close();
              callback(true);
          })
          .catch(function(error){
              console.log(error);
              callback(false);
          });
        }
      });
    });
  },
  isExist: function (name, email, callback){
  	var session = driver.session();
  	var exist = false;
  	session
  		.run("match (p:Person) where p.name={username} or p.email={emailpar} return p.name, p.email",{username: name, emailpar: email})
  		.subscribe({
  			onNext: function(record){
  				exist = true;
  			},
  			onCompleted: function(){
  				session.close();
          console.log(exist);
  				callback(exist);
  			},
  			onError: function(error){
  				console.log(error);
          callback(false);
  			}
  		});
  }
};