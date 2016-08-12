var chai 		= require('chai');
var chaiHttp 	= require('chai-http');
var server 		= require('../server');
var should 		= chai.should();

chai.use(chaiHttp);

describe('requestMechanism', function(done) {
	//var url	= "http://0.0.0.0:8081";
	var url	= "http://http://bzim1300-allamvizsga-2016.herokuapp.com/";
	it('bad request path returns status code 404', function(done) {
		chai.request(server)
	    .get('/wrge')
	    .end(function(err, res){
		    res.should.have.status(404);
		    done();
	    });
	});

	it('index request returns status code 200', function(done) {
		chai.request(server)
	    .get('/')
	    .end(function(err, res){
		    res.should.have.status(200);
		    done();
	    });
	});

	it('post /authenticate without parameters request returns status code 403', function(done) {
		chai.request(server)
	    .post('/authenticate')
	    .end(function(err, res){
		    res.should.have.status(403);
		    done();
	    });
	});

	it('post /authenticate with wrong parameters request returns status code 403', function(done) {
		chai.request(server)
	    .post('/authenticate')
	    .send({'username': 'userteszt', 'password':'wrongpassword'})
	    .end(function(err, res){
		    res.should.have.status(403);
		    done();
	    });
	});
});