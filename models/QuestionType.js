var method 					= QuestionType.prototype;
var defaultQuestionNumber	= 10;

function QuestionType(name, questionNumber){
	this._name 				= name;
	this._questionNumber 	= questionNumber || defaultQuestionNumber;
}

method.getName = function(){
	return this._name;
};

method.getQuestionNumber = function(){
	return this._questionNumber;
}

module.exports = QuestionType;