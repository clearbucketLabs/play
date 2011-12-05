/* 
 * RabbitMQ connection handler for failover
 * 
 * Attempts to re-connect to server if dissapears, can be used
 * to redirect queue's to a tempoary backup service such as SQS.
 *  
 * TODO: handle quing and Add multiple-providers such as SQS and Alternate Servers to "try".
 */

var events = require('events');
var util = require('util');
var amqp = require('amqp');

var _connection;
var _retryCount = 0;	
var _connected = false;
var _hasError = false;


function connector(o){		
		events.EventEmitter.call(this);		
				
					
		_options = { url: "amqp://localhost",
						  retryForever: false,
						  retryCount: 20,
						  retryDelay: 2000, //in MS... 
						}


		//_connection = 'undefined';
		_retrycount = 0;
		_connected = false;
		_hasError = false;						
		return this;							
}


util.inherits(connector,events.EventEmitter);


connector.prototype.connection = function (){
	 
	 var self = this;
	 
	 	 			
	 if (typeof(_connection) !== 'undefined'){	 	
	 	_connection.reconnect();
	 }
	 else{
	 	_connection = amqp.createConnection(_options);
	 }
	 	 		 	 	 
	
		 if (_retryCount == 0){	 	//Setup listeners only once...
	
			 	_connection.on("ready", function (){	 	
			 			_connected = true;
			 			_retrycount = 0;	 	 	
			 	});
			 
			 	 
			 	_connection.on('error', function (){
										
						_hasError = true;
						_retryCount +=1;
								
						if (_retryCount > _options.retryCount){
							self.emit('fail');
							_retryCount = 0;			 
							_hasError = false;						
						}																					
					});	
					
				_connection.on('close', function(){
														
					if (_hasError){		
									
						if (_connected === true){
							_connected = false;
							self.emit('dropped'); //Connecion dropped from active state...
						}
							
										
						setTimeout(function(){
								self.emit('retry');
								connector.prototype.connection()
							},							
							_options.retryDelay);							
							
						_hasError = false;
					}			
				});			 
		 }
		 			
	return _connection;				
};



exports.rmqConnect = connector;
