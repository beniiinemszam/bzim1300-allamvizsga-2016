var method = CustomError.prototype;

function CustomError(errorMessage, code, path){
	this._errorMessage 	= errorMessage;
	this._code 			= code;
	this._path 			= path;
}

method.getErrorMessage = function(){
	return this._errorMessage;
}

method.getCode = function(){
	return this._code;
};

method.getPath = function(){
	return this._path;
};

module.exports = CustomError;