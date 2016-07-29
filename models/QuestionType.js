var method 					= QuestionType.prototype;
var defaultQuestionNumber	= 10;
var defaultDescription 		= "This type is no description.";

function QuestionType(name, questionNumber, descripion){
	this._name 				= name;
	this._questionNumber 	= questionNumber || defaultQuestionNumber;
	this._description 		= descripion || defaultDescription;
}

method.getName = function(){
	return this._name;
};

method.getQuestionNumber = function(){
	return this._questionNumber;
}

method.getDescription = function(){
	return this._description;
}

module.exports = QuestionType;