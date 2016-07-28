var method = Answer.prototype;

function Answer(name, correct, ID){
	this._name 		= name;
	this._correct 	= correct;
	this._ID		= ID;
}

method.getName = function(){
	return this._name;
}

method.getCorrect = function(){
	return this._correct;
};

method.getID = function(){
	return this._ID;
};

module.exports = Answer;