var chai 		= require('chai');
var expect  	= chai.expect;
var chaiHttp 	= require('chai-http');
var neo4j 		= require('../services/neo4jConnection');
var should 		= chai.should();

chai.use(chaiHttp);

describe('databaseTest', function(done) {
	it('isExist without parameters will return false', function(done) {
		neo4j.isExist(null, null, function(err, exist){
			expect(exist).to.equal(false);
			done();
		});
	});

	it('getQuestionType with test44 parameter will return test44', function(done) {
		neo4j.getQuestionType('test44', function(err, data){
			expect(parseInt(data.getQuestionNumber())).to.equal(2);
			done();
		});
	});

	it('isAdmin with beniii parameter will return true', function(done) {
		neo4j.isAdmin('beniii', function(err, exist){
			expect(exist).to.equal(true);
			done();
		});
	});

	it('isAdmin with notAdmin parameter will return false', function(done) {
		neo4j.isAdmin('notAdmin', function(err, exist){
			expect(exist).to.equal(false);
			done();
		});
	});

	it('isAdmin without parameter will return false', function(done) {
		neo4j.isAdmin(null, function(err, exist){
			expect(exist).to.equal(false);
			done();
		});
	});
});