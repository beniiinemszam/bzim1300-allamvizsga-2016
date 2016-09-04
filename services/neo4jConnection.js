var neo4j         = require('neo4j-driver').v1;
var path          = require("path");
var async         = require("async");
var Logger        = require(path.join(__dirname + "/logger"));
var QuestionType  = require(path.join(__dirname + "/../models/QuestionType"));
var Question      = require(path.join(__dirname + "/../models/Question"));
var Answer        = require(path.join(__dirname + "/../models/Answer"));
var User          = require(path.join(__dirname + "/../models/User"));


// var driver        = neo4j.driver("bolt://localhost", neo4j.auth.basic("neo4j", "neo4jpassword"));

var graphenedbURL   = process.env.GRAPHENEDB_BOLT_URL;
var graphenedbUser  = process.env.GRAPHENEDB_BOLT_USER;
var graphenedbPass  = process.env.GRAPHENEDB_BOLT_PASSWORD;
var driver = neo4j.driver(graphenedbURL, neo4j.auth.basic(graphenedbUser, graphenedbPass));

var logger;

Logger.getLogger(function(loggerobj){
  logger = loggerobj;
});

var self = module.exports = {
  /*
    Felhasználó beléptetés
    Sikeres bejelnetkezéskor visszatérít true-e, különben false-t
  */
  authenticateUser: function (user, callback) {
    try{
      var session = driver.session();
    	var exist   = false;
    	session
    		.run("Match (p:Person{name:{username},password:{password}}) return p.name as name, p.admin as admin, p.editor as editor",
          {
            username: user.getUserName(),
            password: user.getPassword()
          })
    		.subscribe({
    			onNext: function(record){
            if(user.getIsAdmin() && !(record.get("admin") || record.get("editor"))){
              exist = false;
            }
            else{
    				  exist = true;
              logger.info("%s loged in!-authenticateUser", user.getUserName(), {editor: user.getIsAdmin()});
            }
    			},
    			onCompleted: function(){
    				session.close();
    				return callback(null, exist);
    			},
    			onError: function(err){
            logger.error('Error in neo4jConnection-authenticateUser: ', err.message);
            session.close();
            return callback(new Error("Internal server error."));
    			}
    	   });
    } catch(err){
      logger.error('Error in neo4jConnection-authenticateUser: ', err.message);
      return callback(new Error("Internal server error."));
    }
  },
  /*
    Uj felhasználó létrehozása
    Ha szabad a felhasználó és email akkor létrehozza és visszatérít egy true-t
    különben false-t
  */
  newUser: function (user, callback) {
      async.waterfall([
        function(callback){
          try{
            var session = driver.session();
            var succes  = false;
            callback(null, session);
          }catch(err){
            logger.error('Error in neo4jConnection-newUser: ', err.message);
           return callback(new Error("Internal server error."));
          }
        },
        function(sess, callback){
          self.isExist(user, function(err, exist){
            if(err){
              logger.error('Error in neo4jConnection-newUser: ', err.message);
              return callback(new Error("Internal server error."));
            }
            callback(null, exist, sess)
          });
        },
        function(exist, session, callback){
          if(!exist){
            session
              .run("Create (p:Person{name:{username},password:{password},email:{emailpar}}) return p.name as name",
                {
                  username: user.getUserName(),
                  password: user.getPassword(),
                  emailpar: user.getEmail()
                })
              .then(function(result){
                if(result.records.length >= 0){
                  succes = true;
                  logger.info("%s signed up!-newUser", user.getUserName());
                }
                session.close();
                return callback(null, succes);
              })
              .catch(function(err){
                logger.error('Error in neo4jConnection-newUser: ', err.message);
                session.close();
                return callback(new Error("Internal server error."));
              });
          }
          else{
            logger.info("%s Username or %s E-mail is exist!-newUser", user.getUserName(), user.getEmail());
            callback(null, false);
          }
        }
      ], function(err, result){
        if(err){
          logger.error('Error in neo4jConnection-newUser: ', err.message);
          return callback(new Error("Internal server error."));
        }
        return callback(null, result);
      });
  },
  /*
    Meglévő felhasználónak email alapján szerkesztői szerepkör megadása
    Ha létezik az email akkor true különben false
  */
  newEditor: function(user, callback){
    try{
      var session = driver.session();
      var succes  = false;
      self.isExist(user, function(err, exist){
        if(err){
          logger.error('Error in neo4jConnection-newEditor: ', err.message);
          return callback(new Error("Internal server error."));
        }
        if(exist){
          session
            .run("Match(p:Person) where p.email={emailpar} set p.editor = true return p.name",{emailpar: user.getEmail()})
            .then(function(record){
              succes = true;
              logger.info("%s is a new editor!-newEditor", user.getEmail());
              session.close();
              return callback(null, succes);
            })
            .catch(function(err){
              logger.error('Error in neo4jConnection-newEditor: ', err.message);
              session.close();
              return callback(null, false);
            });
        }
        else{
          logger.info("%s is a wrong email!-newEditor", user.getEmail());
          return callback(null, false);
        }
      });
    } catch(err){
      logger.error('Error in neo4jConnection-newEditor: ', err.message);
      return callback(new Error("Internal server error."));
    }
  },
  /*
    Ellenörzi, hogy a felhasználó létezik-e
    Ha igen, akkor true különben false
  */
  isExist: function (user, callback){
    try{
      var session = driver.session();
    	var exist   = false;
    	session
    		.run("Match (p:Person) where p.name={username} or p.email={emailpar} return p.name, p.email",
          {
            username: user.getUserName(),
            emailpar: user.getEmail()
          })
    		.subscribe({
    			onNext: function(record){
    				exist = true;
    			},
    			onCompleted: function(){
    				session.close();
    				return callback(null, exist);
    			},
    			onError: function(err){
    				logger.error('Error in neo4jConnection-isExist: ', err.message);
            session.close();
            return callback(new Error("Internal server error."));
    			}
    		});
    } catch(err){
      logger.error('Error in neo4jConnection-isExist: ', err.message);
      return callback(new Error("Internal server error."));
    }
  },
  /*
    Visszatéríti az összes tipusról, hogy hány kérdésből kell álljon és hogy mennyi van jelenleg
  */
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
            if(parseInt(records[i].get("count"))>=parseInt(records[i].get("number"))){
              array.push(records[i].get("name"));
            }
          }
          session.close();
          return callback(null, array);
        })
        .catch(function(err){
            logger.error('Error in neo4jConnection-getQuestionTypes: ', err.message);
            session.close();
            return callback(new Error("Internal server error."));
        });
    } catch(err){
      logger.error('Error in neo4jConnection-getQuestionTypes: ', err.message);
      return callback(new Error("Internal server error."));
    }
  },
  /*
    Visszatéríti az összes típus nevét, minden csak egyszer
  */
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
          onError: function(err){
            session.close();
            logger.error('Error in neo4jConnection-getQuestionTypeName: ', err.message);
            return callback(new Error("Internal server error."));
          }
        });
    } catch(err){
      logger.error('Error in neo4jConnection-getQuestionTypeName: ', err.message);
      return callback(new Error("Internal server error."));
    }
  },
  /*
    Adott kérdés ID alapján megkeresi a válaszait és visszatéríti azokat
  */
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
          onError: function(err){
            session.close();
            logger.error('Error in neo4jConnection-getQuestionAnswers: ', err.message);
            return callback(new Error("Internal server error."));
          }
        });
    } catch(err){
      logger.error('Error in neo4jConnection-getQuestionAnswers: ', err.message);
      return callback(new Error("Internal server error."));
    }
  },
  /*
    Visszatéríti az összes kérdést és a hozzá tartozó azonosítót
  */
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
          onError: function(err){
            session.close();
            logger.error('Error in neo4jConnection-getQuestionName: ', err.message);
            return callback(new Error("Internal server error."));
          }
        });
    } catch(err){
      logger.error('Error in neo4jConnection-getQuestionName: ', err.message);
      return callback(new Error("Internal server error."));
    }
  },
  /*
    Megadja egy adott tipushoz tartozó információkat
  */
  getQuestionType: function(type, callback){
    try{
      var session = driver.session();
      var data    = null;
      session
        .run("match(t:Type) where t.name={typename} return t.questionNumber as questionNumber, t.description as description limit 1",{typename: type.getName()})
        .subscribe({
          onNext: function(record){
            data = new QuestionType(type.getName(), record.get("questionNumber"), record.get("description"));
          },
          onCompleted: function(){
            session.close();
            if(data){
              return callback(null, data);
            }
            else{
              return callback(new Error(type.getName() + " is not exist!"));
            }
          },
          onError: function(err){
            session.close();
            logger.error('Error in neo4jConnection-getQuestionType: ', err.message);
            return callback(new Error("Internal server error."));
          }
        });
    } catch(err){
      logger.error('Error in neo4jConnection-getQuestionType: ', err.message);
      return callback(new Error("Internal server error."));
    }
  },
  /*
    Ha egy adott felhasználó admin akkor true, különben false
  */
  isAdmin: function(user, callback){
    try{
      var session = driver.session();
      session
        .run("match(p:Person) where p.name={username} and p.admin = true return p.name",{username: user.getUserName()})
        .then(function(result){
          session.close();
          if(result.records.length==0){
            return callback(null, false);
          }
          else{
            return callback(null, true);
          }
        })
        .catch(function(err){
          logger.error('Error in neo4jConnection-isAdmin: ', err.message);
          session.close();
          return callback(new Error("Internal server error."));
        });
    } catch(err){
      logger.error('Error in neo4jConnection-isAdmin: ', err.message);
      return callback(new Error("Internal server error."));
    }
  },
  /*
    Új típus létrehozása
    Ha sikeres a létrehozás, akkor true, különben false
  */
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
            logger.info("Something wrong: %s!-newType", type);
          }
          else{
            return callback(null, true);
            logger.info("New type: %s!-newType", type);
          }
        })
        .catch(function(err){
          logger.error('Error in neo4jConnection-newType: ', err.message);
          session.close();
          return callback(new Error("Internal server error."));
        });
    } catch(err){
      logger.error('Error in neo4jConnection-newType: ', err.message);
      return callback(new Error("Internal server error."));
    }
  },
  /*
    Új kérdés és válasz csomópontok létrehozása és a kapcsolatokkal való összekötés
  */
  newQuestion: function(question, callback){
    try{
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
          return callback(null, true);
          logger.info("New question: %s!-newQuestion", type);
        })
        .catch(function(err){
          logger.error('Error in neo4jConnection-newQuestion: ', err.message);
          session.close();
          return callback(new Error("Internal server error."));
        });
    } catch(err){
      logger.error('Error in neo4jConnection-newQuestion: ', err.message);
      return callback(new Error("Internal server error."));
    }
  },
  /*
    Válasz ellenörzése ID alapján
    Ha helyes, akkor true, különben false
  */
  isCorrect: function(answer, callback){
    try{
      var session = driver.session();
      session
        .run('match(a:Answer{id: {aid}})-[:answer{isCorrect: true}]->(:Question) return a.id as aid',{aid: neo4j.int(answer.getID())})
        .then(function(result){
          session.close();
          if(result.records.length==0){
            return callback(null, false);
          }
          else{
            return callback(null, true);
          }
        })
        .catch(function(err){
          logger.error('Error in neo4jConnection-isCorrect: ', err.message);
          session.close();
          return callback(new Error("Internal server error."));
        });
    } catch(err){
      logger.error('Error in neo4jConnection-isCorrect: ', err.message);
      return callback(new Error("Internal server error."));
    }
  },
  /*
    Adott típushoz tartozó kérdéseknek az azonosítóinak a meghatározása
  */
  getQuestionsID: function(type, callback){
    try{
      var session = driver.session();
      session
        .run("Match (:Type{name:{tname}})<-[:TypeOfQuestion]-(q:Question) return q.id as qid",{tname: type.getName()})
        .then(function(result){
          var array = [];
          for(var i=0;i<result.records.length;i++){
            array.push(result.records[i].get("qid"));
          }

          session.close();
          return callback(null, array);
        })
        .catch(function(err){
          logger.error('Error in neo4jConnection-getQuestionsID: ', err.message);
          session.close();
          return callback(new Error("Internal server error."));
        });
    } catch(err){
      logger.error('Error in neo4jConnection-getQuestionsID: ', err.message);
      return callback(new Error("Internal server error."));
    }
  }, 
  /*
    Kérdés ID alapján a kérdés objektum felépítése és visszatérítése
    Ha létezik, akkor visszatéríti az objektumot, különben null
  */
  getQuestion: function(question, callback){
    try{
      var session = driver.session();
      session
        .run('Match (t:Type)<-[:TypeOfQuestion]-(q:Question{id:{parid}})<-[ar:answer]-(a:Answer) \
          return q.id as qid, q.question as question, ar.isCorrect as correct, a.id as aid, a.name as answer, t.name as typename limit 4',{parid: neo4j.int(question.getID())})
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

          session.close();

          if(records.length>0){
            var questionNew = new Question(records[0].get("question"), ans[0], ans[1], ans[2], ans[3], records[0].get("qid"), records[0].get("typename"));
            callback(null, questionNew);
          }
          else{
            callback(new Error(question.getID() + " is not exist"));
          }
        })
        .catch(function(err){
          logger.error('Error in neo4jConnection-getQuestion: ', err.message);
          session.close();
          return callback(new Error("Internal server error."));
        });
    } catch(err){
      logger.error('Error in neo4jConnection-getQuestion: ', err.message);
      return callback(new Error("Internal server error."));
    }
  },
  /*
    Kérdés objektum visszatérítése egy hozzá tartozó válasz azonosító alapján
    Ha létezik, akkor visszatéríti a kérés objektumot, különben null
  */
  getQuestionTypeByAnswer: function(answer, callback){
    try{
      var session = driver.session();
      session
        .run("Match (t:Type)<-[:TypeOfQuestion]-(:Question)<-[:answer]-(:Answer{id: {aid}}) return t.name as name, t.questionNumber as questionNumber, t.description as description",{aid: neo4j.int(answer.getID())})
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
        .catch(function(err){
          logger.error('Error in neo4jConnection-getQuestionTypeByAnswer: ', err.message);
          session.close();
          return callback(new Error("Internal server error."));
        });
    }
    catch(err){
      logger.error('Error in neo4jConnection-getQuestionTypeByAnswer: ', err.message);
      return callback(new Error("Internal server error."));
    }
  },
  /*
    Típus módosítása
  */
  updateType: function(type, callback){
    try{
      var session = driver.session();
      session
        .run("match(t:Type{name:{tname}}) set t.description={tdescription} set t.questionNumber={tnumber}",
        {
          tname:        type.getName(),
          tnumber:      type.getQuestionNumber(),
          tdescription: type.getDescription()
        })
        .then(function (result) {
          session.close();
          logger.info('%s type was updated!-updateType', type.getName());
          callback(null, true);
        })
        .catch(function(error){
          logger.error('Error in neo4jConnection-updateType: ', error.message);
          session.close();
          return callback(new Error("Internal server error."));
        });
    }
    catch(err){
      logger.error('Error in neo4jConnection-updateType: ', error.message);
      return callback(new Error("Internal server error."));
    }
  },
  /*
    Adott típus és a hozzá terozó bejövő élek törlése
  */
  deleteType: function(type, callback){
    try{
      var session = driver.session();
      session
        .run("match(t:Type{name:{tname}, description:{tdescription}, questionNumber: {tnumber}})<-[tq:TypeOfQuestion]-(q:Question)<-[a:answer]-(ans:Answer) \
          delete a,ans,tq,q",
        {
          tname:        type.getName(),
          tnumber:      type.getQuestionNumber(),
          tdescription: type.getDescription()
        })
        .then(function (result) {
          return session.run('match(t:Type{name:{tname}, description:{tdescription}, questionNumber: {tnumber}}) delete t',
          {
            tname:        type.getName(),
            tnumber:      type.getQuestionNumber(),
            tdescription: type.getDescription()
          })
        })
        .then(function (){
          logger.info('%s type was deleted!-deleteType', type.getName());
          callback(null, true);
        })
        .catch(function(err){
          logger.error('Error in neo4jConnection-deleteType: ', err.message);
          session.close();
          return callback(new Error("Internal server error."));
        });
    }
    catch(err){
      logger.error('Error in neo4jConnection-deleteType: ', err.message);
      return callback(new Error("Internal server error."));
    }
  },
  /*
    Adott kérdés azonosítóval rendelkező kérdés, hozzá kapcsolódó válaszok és kapcsolatok törlése
  */
  deleteQuestion: function(question, callback){
    try{
      var session = driver.session();
      session
        .run("match (q:Question{id:{qid}})<-[a:answer]-(ans:Answer) \
          delete a, ans",
        {
          qid: neo4j.int(question.getID())
        })
        .then(function (result) {
          return session.run('match (:Type)<-[tq:TypeOfQuestion]-(q:Question{id:{qid}}) delete tq, q',
          {
            qid: neo4j.int(question.getID())
          })
        })
        .then(function (){
          logger.info("%d question was deleted!-deleteQuestion", question.getID());
          callback(null, true);
        })
        .catch(function(err){
          logger.error('Error in neo4jConnection-deleteQuestion: ', err.message);
          session.close();
          return callback(new Error("Internal server error."));
        });
    }
    catch(err){
      logger.error('Error in neo4jConnection-deleteQuestion: ', err.message);
      return callback(new Error("Internal server error."));
    }
  }
};