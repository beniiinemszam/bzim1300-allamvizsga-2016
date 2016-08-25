var method = Error.prototype;

function Error(errorMessage, code){
	this._errorMessage 	= errorMessage;
	this._code 			= code;
}

method.getErrorMessage = function(){
	return this._errorMessage;
}

method.getCode = function(){
	return this._code;
};

module.exports = Error;