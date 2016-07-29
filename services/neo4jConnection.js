var neo4j         = require('neo4j-driver').v1;
var path          = require("path");
var QuestionType  = require(path.join(__dirname + "/../models/QuestionType"));
var Question      = require(path.join(__dirname + "/../models/Question"));
var Answer        = require(path.join(__dirname + "/../models/Answer"));

var driver        = neo4j.driver("bolt://localhost", neo4j.auth.basic("neo4j", "neo4jpassword"));

/*var graphenedbURL   = process.env.GRAPHENEDB_BOLT_URL;
var graphenedbUser  = process.env.GRAPHENEDB_BOLT_USER;
var graphenedbPass  = process.env.GRAPHENEDB_BOLT_PASSWORD;
var driver = neo4j.driver(graphenedbURL, neo4j.auth.basic(graphenedbUser, graphenedbPass));*/

var self = module.exports = {
  authenticateUser: function (name, pass, admin, callback) {
    var session = driver.session();
  	var exist   = false;
  	session
  		.run("Match (p:Person{name:{username},password:{password}}) return p.name as name, p.admin as admin, p.editor as editor",{username: name, password: pass})
  		.subscribe({
  			onNext: function(record){
          if(admin && !(record.get("admin")||record.get("editor"))){
            exist = false;
          }
          else{
  				  exist = true;
          }
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
    var succes  = false;
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
              console.log(error.stack);
              session.close();
              callback(false);
          });
      }
    });
  },
  newEditor: function(email, callback){
    var session = driver.session();
    self.isExist("", email, function(exist){
      if(exist){
        session
          .run("Match(p:Person) where p.email={emailpar} set p.editor = true return p.name",{emailpar: email})
          .then(function(record){
            session.close();
            callback(true);
          })
          .catch(function(error){
            console.log(error.stack);
            session.close();
            callback(false);
          });
      }
      else{
        callback(false);
      }
    });
  },
  isExist: function (name, email, callback){
    var session = driver.session();
  	var exist   = false;
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
  },
  getQuestionTypes: function (callback){
    var session = driver.session();
    var array   = [];
    session
      .run('Match (t:Type)<-[tq:TypeOfQuestion]-(q:Question) \
            return t.name as name, t.questionNumber as number, count(tq) as count')
      .then(function(result){
        var records = [];
        for (i = 0; i < result.records.length; i++){
          records.push(result.records[i]);
        }
        return records;
      })
      .then(function (records) {
        for(i = 0; i < records.length; i ++){
          if(records[i].get("count")>=records[i].get("number")){
            array.push(records[i].get("name"));
          }
        }
        session.close();
        callback(array);
      })
      .catch(function(error){
          console.log(error.stack);
          session.close();
          callback(null);
      });
  },
  getQuestionTypeNames: function(callback){
    var session = driver.session();
    var data = [];
    session
      .run("match (t:Type) return t.name as name")
      .subscribe({
        onNext: function(record){
          data.push(record.get('name'));
        },
        onCompleted: function(){
          session.close();
          callback(data);
        },
        onError: function(error){
          session.close();
          console.log(error.stack);
          callback(null);
        }
      });
  },
  getQuestionType: function(name, callback){
    var session = driver.session();
    var data    = null;
    session
      .run("match(t:Type) where t.name={typename} return t.questionNumber as questionNumber, t.description as description limit 1",{typename: name})
      .subscribe({
        onNext: function(record){
          data = new QuestionType(name, record.get("questionNumber"), record.get("description"));
        },
        onCompleted: function(){
          session.close();
          callback(data);
        },
        onError: function(error){
          session.close();
          console.log(error.stack);
          callback(null);
        }
      });
  },
  isAdmin: function(name, callback){
    var session = driver.session();
    session
      .run("match(p:Person) where p.name={username} and p.admin = true return p.name",{username: name})
      .then(function(result){
        session.close();
        if(result.records.length==0){
          callback(false);
        }
        else{
          callback(true);
        }
      })
      .catch(function(error){
        console.log(error.stack);
        session.close();
        callback(false);
      });
  },
  newType: function(type, callback){
    var session = driver.session();
    session
      .run("Create (t:Type{name:{typename}, questionNumber:{qnumber}, description:{descriptionpar}}) return t.name",
        {
          typename:       type.getName(),
          qnumber:        type.getQuestionNumber(),
          descriptionpar: type.getDescription()
        })
      .then(function(record){
        session.close();
        callback(true);
      })
      .catch(function(error){
        console.log(error.stack);
        session.close();
        callback(false);
      });
  },
  newQuestion: function(question, callback){
    var session = driver.session();
    session
      .run('create  (a1:Answer{name: {canswer}, id: {aid1}})-[:answer{isCorrect: true}]->(q:Question{question: {question}, id: {qid}}), \
                    (a2:Answer{name: {wanswer1}, id: {aid2}})-[:answer{isCorrect: false}]->(q), \
                    (a3:Answer{name: {wanswer2}, id: {aid3}})-[:answer{isCorrect: false}]->(q), \
                    (a4:Answer{name: {wanswer3}, id: {aid4}})-[:answer{isCorrect: false}]->(q)',
            {
              canswer:  question.getCorrect().getName(),
              question: question.getQuestion(),
              wanswer1: question.getWrong1().getName(),
              wanswer2: question.getWrong2().getName(),
              wanswer3: question.getWrong3().getName(),
              aid1:     question.getCorrect().getID(),
              aid2:     question.getWrong1().getID(),
              aid3:     question.getWrong2().getID(),
              aid4:     question.getWrong3().getID(),
              qid:      question.getID(),
            })
      .then(function(){
        return session.run('Match (q:Question{id:{qid}}), (t:Type{name: {name}}) create (q)-[:TypeOfQuestion]->(t)',{qid: question.getID(), name: question.getType()})
      })
      .then(function(result){
        session.close();
        callback(true);
      })
      .catch(function(error){
        console.log(error.stack);
        session.close();
        callback(false);
      });
  },
  isCorrect: function(id, callback){
    var session = driver.session();
    session
      .run('match(a:Answer{id: {aid}})-[:answer{isCorrect: true}]->(:Question) return a.id as aid',{aid: neo4j.int(id)})
      .then(function(result){
        session.close();
        if(result.records.length==0){
          callback(false);
        }
        else{
          callback(true);
        }
      })
      .catch(function(error){
        console.log(error.stack);
        session.close();
        callback(false);
      });
  },
  getQuestionsID: function(type, callback){
    var session = driver.session();
    session
      .run("Match (:Type{name:{tname}})<-[:TypeOfQuestion]-(q:Question) return q.id as qid",{tname: type})
      .then(function(result){
        var array = [];
        for(var i=0;i<result.records.length;i++){
          array.push(result.records[i].get("qid"));
        }

        session.close();
        callback(array);
      })
      .catch(function(error){
        console.log(error.stack);
        session.close();
        callback(null);
      });
  }, 
  getQuestion: function(id, type, callback){
    /*var str = '';
    if(array!=null){
      str = "where ";
      for(var i=0;i<array.length-1;i++){
        str+="q.id<>"+array[i]+", ";
      }
      str+="q.id<>"+array[array.length-1];
    }*/

    var session = driver.session();
    session
      .run('Match (q:Question{id:{parid}})<-[ar:answer]-(a:Answer) \
        return q.id as qid, q.question as question, ar.isCorrect as correct, a.id as aid, a.name as answer limit 4',{tname: type, parid: id})
      .then(function (result) {
        var records = [];
        for (i = 0; i < result.records.length; i++) {
          records.push(result.records[i]);
        }
        return records;
      })
      .then(function (records) {
        var ans = [];
        var j = 1;

        for(i = 0; i < records.length; i ++){
          var answer = new Answer(records[i].get("answer"), records[i].get("correct"), records[i].get("aid"));
          if(answer.getCorrect()){
            ans[0] = answer;
          }
          else{
            ans[j] = answer;
            j++;
          }
        }

        var question = new Question(records[0].get("question"), ans[0], ans[1], ans[2], ans[3], records[0].get("qid"), type);
        session.close();
        callback(question);
      })
      .catch(function(error){
          console.log(error.stack);
          session.close();
          callback(null);
      });
  }
};
/*
Match(q:Question{question:'ques'})<-[t:answer]-(a:Answer)
delete t,a,q
*/