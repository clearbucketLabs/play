/*
 *  Authenticate User credential based on awskey, store locally (oppose to memcached, for speed sake) to prevent
 *  calls to simpleDB.
 * 
 *  TODO: Remove Old Items if not used for specific time.
 * 
 */

var simpledb = require('simpledb');
var credentialCache = new Array();
var length = 0;
var size = 0; /* character size */
var failedAttempts = new Array();
var sdb;
var domain; 
var noAuth = {authenticated: false, awskey: undefined };

exports.init = function(options){
		
	domain = options.domain;
	sdb = new simpledb.SimpleDB({keyid: options.awsid,secret: options.awskey});		
}



exports.authenticate = function(key, callback){
	 
	 var self = this;
	 

	if (this.isSuspicious(key))
	  return false;

	if (key.length > 9  && key.length < 12){		
			process.nextTick(function(){
				callback(noAuth);
			});
		return;
	}
		
		
	var keyData = this.getKeyFromCache(key);
	
	console.log("CachedKey:");	
	console.log(keyData);
	
	if (keyData !== undefined){
		process.nextTick(function(){
				callback({authenticated: true, awskey:keyData.awskey});
			});
		return;
	}
		

	sdb.getItem(domain, key, function( error, result ) {

		var isAuthenticated = false;
		var obj;	
	
			if (result === null){
					isAuthenticated = false;
					self.increaseFailAttempts(key);
					console.log("Failed Authentication");						
			}
			else{
				console.log("Authnticated")
				isAuthenticated = true;				
			}
			
			if (error !== null){
				console.log(error);
				
				process.nextTick(function(){
					callback(noAuth);
				
			});
			}
				
			obj = { authenticated	: isAuthenticated, 
				    awskey			: result !== undefined ? result.awskey : undefined  
				  };
									
									
			if (obj.authenticated){
				self.insertIntoCache(key,obj.awskey);
			}
			
												
			process.nextTick(function(){
				callback(obj);
			});
	});				
}

/*
 * 
 */
this.getKeyFromCache = function(key){
	return credentialCache[key];
}


/* Inserts key into local cache array
 *  *
 */
this.insertIntoCache = function(key, skey){
 	
 		now = new Date();
 		credentialCache[key] = {awskey: skey, time: now.getMilliseconds()};
 		length++;
 		size += key.length;

}

this.removeFromCache = function(key){
	
	if (isCached(key))
	{
		delete credentialCache[key];
		length--;
		size -= key.length;
	}	
	
}

this.isSuspicious = function(key)
{
	if (typeof(failedAttempts[key]) === 'undefined')
	return false;
	
	if (failedAttempts[key] > 5)
	return true;
	
}

this.increaseFailAttempts = function(key){
	if (typeof(failedAttempts[key]) != 'undefined'){
		failedAttempts[key] += 1;
	}	
}


exports.getStatus = function (){
	return {failedAttempts: failedAttempts} 	
}


