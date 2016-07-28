var method = Question.prototype;

function Question(question, correct, wrong1, wrong2, wrong3, ID, type){
	this._question 	= question;
	this._correct 	= correct;
	this._wrong1 	= wrong1;
	this._wrong2 	= wrong2;
	this._wrong3 	= wrong3;
	this._ID	 	= ID;
	this._type		=type;
}

method.getQuestion = function(){
	return this._question;
}

method.getCorrect = function(){
	return this._correct;
};

method.getWrong1 = function(){
	return this._wrong1;
}

method.getWrong2 = function(){
	return this._wrong2;
}

method.getWrong3 = function(){
	return this._wrong3;
}

method.getID = function(){
	return this._ID;
}

method.getType = function(){
	return this._type;
}

module.exports = Question;