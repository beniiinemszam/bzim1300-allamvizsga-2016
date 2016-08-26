var method 			= User.prototype;
var defaultAdmin 	= false;
var defaultEditor 	= false;

function User(userName, password, email, isAdmin, isEditor){
	this._userName 	= userName;
	this._password 	= password;
	this._email 	= email;
	this._isAdmin 	= isAdmin  || defaultAdmin;
	this._isEditor 	= isEditor || defaultEditor;
}

method.getUserName = function(){
	return this._userName;
}

method.getPassword = function(){
	return this._password;
};

method.getEmail = function(){
	return this._email;
}

method.getIsAdmin = function(){
	return this._isAdmin;
}

method.getIsEditor = function(){
	return this._isEditor;
}

module.exports = User;