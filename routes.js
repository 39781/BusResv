var express 		= require('express');
var router			= express.Router();	 
var careerConfig	= require("./config");	
var fs 				= require("fs");	
var request			= require('request');
var path			= require("path");	

router.get('/', function(req, res) {
	console.log('hari');
  res.redirect("/richowebsite");
});

router.get('/richowebsite', function(req, res) {
  res.redirect('/home.html');
});

router.get('/chat', function(req, res) {
  res.redirect('/chat.html');
});

router.post('/botHandler',function(req, res){
	//console.log('Dialogflow Request headers: ' + JSON.stringify(req.headers));
	console.log('Dialogflow Request body: ' + JSON.stringify(req.body));	
	console.log(req.body.result.parameters);
	var sessionId = (req.body.sessionId)?req.body.sessionId:'';	
	
	console.log(JSON.stringify('hari'));
	res.status(200);
	res.json({}).end();
});

module.exports = router;



			