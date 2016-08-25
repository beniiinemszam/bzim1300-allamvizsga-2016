var neo4j         = require('neo4j-driver').v1;
var path          = require("path");
var winston       = require("winston");
var QuestionType  = require(path.join(__dirname + "/../models/QuestionType"));
var Question      = require(path.join(__dirname + "/../models/Question"));
var Answer        = require(path.join(__dirname + "/../models/Answer"));
var User          = require(path.join(__dirname + "/../models/User"));


var driver        = neo4j.driver("bolt://localhost", neo4j.auth.basic("neo4j", "neo4jpassword"));

/*var graphenedbURL   = process.env.GRAPHENEDB_BOLT_URL;
var graphenedbUser  = process.env.GRAPHENEDB_BOLT_USER;
var graphenedbPass  = process.env.GRAPHENEDB_BOLT_PASSWORD;
var driver = neo4j.driver(graphenedbURL, neo4j.auth.basic(graphenedbUser, graphenedbPass));*/

var logger = new(winston.Logger)({
    transports: [
        new(winston.transports.Console)({
          level: 'debug'
        }),
        new(winston.transports.File)({
          filename  : __dirname + '/../logs/logs.log',
          level   : 'info',   
          json    : true
        })
    ]
});

var self = module.exports = {
  authenticateUser: function (name, pass, admin, callback) {
    try{
      var session = driver.session();
    	var exist   = false;
    	session
    		.run("Match (p:Person{name:{username},password:{password}}) return p.name as name, p.admin as admin, p.editor as editor",{username: name, password: pass})
    		.subscribe({
    			onNext: function(record){
            if(admin && !(record.get("admin") || record.get("editor"))){
              exist = false;
            }
            else{
    				  exist = true;
              logger.info("%s loged in!", username, {editor: admin});
            }
    			},
    			onCompleted: function(){
    				session.close();
    				return callback(null, exist);
    			},
    			onError: function(error){
            logger.error('Error in neo4jConnection-authenticateUser: ', error.stack);
            session.close();
            return callback(new Error("Internal server error."));
    			}
    	   });
    } catch(err){
      return callback(new Error("Internal server error."));
    }
  },
  newUser: function (name, password, email, callback) {
    try{
      var session = driver.session();
      var succes  = false;
      self.isExist(name, email, function(exist){
        if(exist){
          return callback(null, succes);
        }
        else{
          session
            .run("Create (p:Person{name:{username},password:{password},email:{emailpar}}) return p.name as name",{username: name, password: pass, emailpar: email})
            .then(function(result){
              if(result.records.length >= 0){
                succes = true;
                logger.info("%s signed up!", username);
              }
              session.close();
              return callback(null, succes);
            })
            .catch(function(error){
              logger.error('Error in neo4jConnection-newUser: ', error.stack);
              session.close();
              return callback(new Error("Internal server error."));
            });
        }
      });
    } catch(err){
      return callback(new Error("Internal server error."));
    }
  },
  newEditor: function(email, callback){
    try{
      var session = driver.session();
      var succes  = false;
      self.isExist("", email, function(err, exist){
        if(err){
          return callback(err);
        }
        if(exist){
          session
            .run("Match(p:Person) where p.email={emailpar} set p.editor = true return p.name",{emailpar: email})
            .then(function(record){
              succes = true;
              logger.info("%s is a new editor!", email);
              session.close();
              return callback(null, succes);
            })
            .catch(function(error){
              logger.error(error.stack);
              session.close();
              return callback(null, false);
            });
        }
        else{
           return callback(null, false);
        }
      });
    } catch(err){
      return callback(new Error("Internal server error."));
    }
  },
  isExist: function (name, email, callback){
    try{
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
    				return callback(null, exist);
    			},
    			onError: function(error){
    				console.log('Error in neo4jConnection-isExist: ', error);
            session.close();
            return callback(new Error("Internal server error."));
    			}
    		});
    } catch(err){
      return callback(new Error("Internal server error."));
    }
  },
  getQuestionTypes: function (callback){
    try{
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
          return callback(null, array);
        })
        .catch(function(error){
            logger.error('Error in neo4jConnection-getQuestionType: ', error.stack);
            session.close();
            return callback(new Error("Internal server error."));
        });
    } catch(err){
      return callback(new Error("Internal server error."));
    }
  },
  getQuestionTypeNames: function(callback){
    try{
      var session = driver.session();
      var data = [];
      session
        .run("match (t:Type) return distinct t.name as name")
        .subscribe({
          onNext: function(record){
            data.push(record.get('name'));
          },
          onCompleted: function(){
            session.close();
            return callback(null, data);
          },
          onError: function(error){
            session.close();
            logger.error('Error in neo4jConnection-getQuestionTypeName: ', error.stack);
            return callback(new Error("Internal server error."));
          }
        });
    } catch(err){
      return callback(new Error("Internal server error."));
    }
  },
  getQuestionAnswers: function(question, callback){
    try{
      var session = driver.session();
      var data = [];
      session
        .run("match (q:Question{id: {qid}})<-[ar:answer]-(a:Answer) return a.name as name a.id as id, ar.isCorrect as correct")
        .subscribe({
          onNext: function(record){
            data.push(new Answer(record.get('name'), record.get('correct'), record.get('id')));
          },
          onCompleted: function(){
            session.close();
            return callback(null, data);
          },
          onError: function(error){
            session.close();
            logger.error('Error in neo4jConnection-getQuestionAnswers: ', error.stack);
            return callback(new Error("Internal server error."));
          }
        });
    } catch(err){
      return callback(new Error("Internal server error."));
    }
  },
  getQuestionNames: function(callback){
    try{
      var session = driver.session();
      var data = {};
      session
        .run("match (q:Question) return q.question as question, q.id as id")
        .subscribe({
          onNext: function(record){
            data[record.get("id")] = record.get("question");
          },
          onCompleted: function(){
            session.close();
            return callback(null, data);
          },
          onError: function(error){
            session.close();
            logger.error('Error in neo4jConnection-getQuestionName: ', error.stack);
            return callback(new Error("Internal server error."));
          }
        });
    } catch(err){
      return callback(new Error("Internal server error."));
    }
  },
  getQuestionType: function(name, callback){
    try{
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
            return callback(null, data);
          },
          onError: function(error){
            session.close();
            logger.error('Error in neo4jConnection-getQuestionType: ', error.stack);
            return callback(new Error("Internal server error."));
          }
        });
    } catch(err){
      return callback(new Error("Internal server error."));
    }
  },
  isAdmin: function(name, callback){
    try{
      var session = driver.session();
      session
        .run("match(p:Person) where p.name={username} and p.admin = true return p.name",{username: name})
        .then(function(result){
          session.close();
          if(result.records.length==0){
            return callback(null, false);
          }
          else{
            return callback(null, true);
          }
        })
        .catch(function(error){
          logger.error('Error in neo4jConnection-isAdmin: ', error.stack);
          session.close();
          return callback(new Error("Internal server error."));
        });
    } catch(err){
      return callback(new Error("Internal server error."));
    }
  },
  newType: function(type, callback){
    try{
      var session = driver.session();
      session
        .run("Create (t:Type{name:{typename}, questionNumber:{qnumber}, description:{descriptionpar}}) return t.name",
          {
            typename:       type.getName(),
            qnumber:        type.getQuestionNumber(),
            descriptionpar: type.getDescription()
          })
        .then(function(result){
          session.close();
          if(result.records.length==0){
            return callback(null, false);
          }
          else{
            return callback(null, true);
            logger.info("New type: %s!", type);
          }
        })
        .catch(function(error){
          logger.error('Error in neo4jConnection-newType: ', error.stack);
          session.close();
          return callback(new Error("Internal server error."));
        });
    } catch(err){
      return callback(new Error("Internal server error."));
    }
  },
  newQuestion: function(question, callback){
    try{
      logger.debug(question.getCorrect().getName());
      logger.debug(question.getQuestion());
      logger.debug(question.getWrong1().getName());
      logger.debug(question.getWrong2().getName());
      logger.debug(question.getWrong3().getName());
      logger.debug(question.getCorrect().getID());
      logger.debug(question.getWrong1().getID());
      logger.debug(question.getWrong2().getID());
      logger.debug(question.getWrong3().getID());
      logger.debug(question.getID());
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
          logger.debug("s1");
          return session.run('Match (q:Question{id:{qid}}), (t:Type{name: {name}}) create (q)-[:TypeOfQuestion]->(t)',{qid: question.getID(), name: question.getType()})
        })
        .then(function(result){
          logger.debug("s2");
          session.close();
          if(result.records.length==0){
            return callback(null, false);
          }
          else{
            return callback(null, true);
            logger.info("New question: %s!", type);
          }
        })
        .catch(function(error){
          logger.error('Error in neo4jConnection-newQuestion: ', error.message);
          session.close();
          return callback(new Error("Internal server error."));
        });
    } catch(err){
      return callback(new Error("Internal server error."));
    }
  },
  isCorrect: function(id, callback){
    try{
      var session = driver.session();
      session
        .run('match(a:Answer{id: {aid}})-[:answer{isCorrect: true}]->(:Question) return a.id as aid',{aid: neo4j.int(id)})
        .then(function(result){
          session.close();
          if(result.records.length==0){
            return callback(null, false);
          }
          else{
            return callback(null, true);
          }
        })
        .catch(function(error){
          logger.error('Error in neo4jConnection-isCorrect: ', error.stack);
          session.close();
          return callback(new Error("Internal server error."));
        });
    } catch(err){
      return callback(new Error("Internal server error."));
    }
  },
  getQuestionsID: function(type, callback){
    try{
      var session = driver.session();
      session
        .run("Match (:Type{name:{tname}})<-[:TypeOfQuestion]-(q:Question) return q.id as qid",{tname: type})
        .then(function(result){
          var array = [];
          for(var i=0;i<result.records.length;i++){
            array.push(result.records[i].get("qid"));
          }

          session.close();
          return callback(null, array);
        })
        .catch(function(error){
          logger.error('Error in neo4jConnection-getQuestionsID: ', error.stack);
          session.close();
          return callback(new Error("Internal server error."));
        });
    } catch(err){
      return callback(new Error("Internal server error."));
    }
  }, 
  getQuestion: function(id, callback){
    try{
      var session = driver.session();
      session
        .run('Match (t:Type)<-[:TypeOfQuestion]-(q:Question{id:{parid}})<-[ar:answer]-(a:Answer) \
          return q.id as qid, q.question as question, ar.isCorrect as correct, a.id as aid, a.name as answer, t.name as typename limit 4',{parid: neo4j.int(id)})
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

          var question = new Question(records[0].get("question"), ans[0], ans[1], ans[2], ans[3], records[0].get("qid"), records[0].get("typename"));
          session.close();
          callback(null, question);
        })
        .catch(function(error){
          logger.error('Error in neo4jConnection-getQuestion: ', error.stack);
          session.close();
          return callback(new Error("Internal server error."));
        });
    } catch(err){
      return callback(new Error("Internal server error."));
    }
  },
  getQuestionTypeByAnswer: function(id, callback){
    try{
      var session = driver.session();
      session
        .run("Match (t:Type)<-[:TypeOfQuestion]-(:Question)<-[:answer]-(:Answer{id: {aid}}) return t.name as name, t.questionNumber as questionNumber, t.description as description",{aid: neo4j.int(id)})
        .then(function (result) {
          var records = [];
          for (i = 0; i < result.records.length; i++) {
            records.push(result.records[i]);
          }
          return records;
        })
        .then(function (records) {
          session.close();
          var type;
          var type = new QuestionType(records[0].get("name"), records[0].get("questionNumber"), records[0].get("description"));
          callback(null, type);
        })
        .catch(function(error){
          logger.error('Error in neo4jConnection-getQuestionTypeByAnswer: ', error.stack);
          session.close();
          return callback(new Error("Internal server error."));
        });
    }
    catch(err){
      return callback(new Error("Internal server error."));
    }
  },
  updateType: function(type, callback){
    try{
      var session = driver.session();
      session
        .run("match(t:Type{name:{tname}}) set t.description={tdescription} set t.questionNumber={tnumber}",
        {
          tname: type.getName(),
          tnumber: type.getQuestionNumber(),
          tdescription: type.getDescription()
        })
        .then(function (result) {
          session.close();
          callback(null, true);
        })
        .catch(function(error){
          logger.error('Error in neo4jConnection-updateType: ', error.stack);
          session.close();
          return callback(new Error("Internal server error."));
        });
    }
    catch(err){
      return callback(new Error("Internal server error."));
    }
  },
  deleteType: function(type, callback){
    try{
      var session = driver.session();
      session
        .run("match(t:Type{name:{tname}, description:{tdescription}, questionNumber: {tnumber}})<-[tq:TypeOfQuestion]-(q:Question)<-[a:answer]-(ans:Answer) \
          delete a,ans,tq,q",
        {
          tname: type.getName(),
          tnumber: type.getQuestionNumber(),
          tdescription: type.getDescription()
        })
        .then(function (result) {
          return session.run('match(t:Type{name:{tname}, description:{tdescription}, questionNumber: {tnumber}}) delete t',
          {
            tname: type.getName(),
            tnumber: type.getQuestionNumber(),
            tdescription: type.getDescription()
          })
        })
        .then(function (){
          callback(null, true);
        })
        .catch(function(error){
          logger.error('Error in neo4jConnection-updateType: ', error.stack);
          session.close();
          return callback(new Error("Internal server error."));
        });
    }
    catch(err){
      return callback(new Error("Internal server error."));
    }
  },
  deleteQuestion: function(id, callback){
    try{
      var session = driver.session();
      session
        .run("match (q:Question{id:{qid}})<-[a:answer]-(ans:Answer) \
          delete a, ans",
        {
          qid: neo4j.int(id)
        })
        .then(function (result) {
          return session.run('match (:Type)<-[tq:TypeOfQuestion]-(q:Question{id:{qid}}) delete tq, q',
          {
            qid: neo4j.int(id)
          })
        })
        .then(function (){
          callback(null, true);
        })
        .catch(function(error){
          logger.error('Error in neo4jConnection-updateType: ', error.stack);
          session.close();
          return callback(new Error("Internal server error."));
        });
    }
    catch(err){
      return callback(new Error("Internal server error."));
    }
  }
};
/*
Match(q:Question{question:'ques'})<-[t:answer]-(a:Answer)
delete t,a,q
*/