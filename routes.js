var express 		= require('express');
var router			= express.Router();	 
var busConfig		= require("./config");	
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

router.get('/getBookedSeats/:src/:dest/:bustype/:date',function(req, res){
	var bookedSeats = [];
	if(bookingInfo['seatsInfo'][req.params.src])
		if(bookingInfo['seatsInfo'][req.params.src][req.params.dest])
			if(bookingInfo['seatsInfo'][req.params.src][req.params.dest][req.params.bustype])
				if(bookingInfo['seatsInfo'][req.params.src][req.params.dest][req.params.bustype][req.params.date])
					bookedSeats = bookingInfo['seatsInfo'][req.params.src][req.params.dest][req.params.bustype][req.params.date];
	res.status(200);
	res.json({"bookedseats":bookedSeats}).end();
})

router.post('/botHandler',function(req, res){
	//console.log('Dialogflow Request headers: ' + JSON.stringify(req.headers));
	console.log('Dialogflow Request body: ' + JSON.stringify(req.body));	
	console.log(req.body.result.parameters);
	var keys = Object.keys(req.body.result.parameters);
	keys.forEach(function(key){		
		if(key == 'Date'&&req.body.result.parameters[key].length>1){
			req.body.result.parameters[key] = req.body.result.parameters[key][0]+'T'+req.body.result.parameters[key][1]
		}else{
			req.body.result.parameters[key] = req.body.result.parameters[key].toString().toLowerCase();
		}
	});
	var sessionId = (req.body.sessionId)?req.body.sessionId:'';	
	var busExist = false, respText="";
	console.log(busConfig.fare);
	if(busConfig.fare[req.body.result.parameters.source]){
		if(busConfig.fare[req.body.result.parameters.source][req.body.result.parameters.Destination]){
			busExist = true;
		}
	}
	if(busConfig.fare[req.body.result.parameters.Destination]){
		if(busConfig.fare[req.body.result.parameters.Destination][req.body.result.parameters.source]){
			busExist = true;
		}
	}
	console.log(req.body.result.parameters);
	if(busExist){
		respText = "/booking.html?name="+req.body.result.parameters.Name+"phone="+req.body.result.parameters.phone+"date="+req.body.result.parameters.Date+"from="+req.body.result.parameters.source+"to="+req.body.result.parameters.Destination+"bustype="+req.body.result.parameters.bustype+"fare="+busConfig.fare[req.body.result.parameters.source][req.body.result.parameters.Destination][req.body.result.parameters.bustype].fare;
	}else{
		respText = "Sorry right now we are not providing bus service between "+req.body.result.parameters.source+" to "+req.body.result.parameters.Destination; 
	}
	res.status(200);
	res.json({			
			"speech": "",								
			"messages": [{
			  "type": 0,
			  "platform": "facebook",
			  "speech": respText
			},	
			{
			  "type": 0,
			  "speech": ""
			}]
		}).end();
});

router.get("/ticket",function(req, res){
	console.log(bookingInfo['tickets'][req.query.transCode],req.query.transCode);
	if(bookingInfo['tickets'][req.query.transCode]){
		var ticket = "<table id='ticket' align='center'><thead><tr><th colspan=2>TICKET</th></tr></thead><tr><td>Name : <span class='ticketspan'>"+bookingInfo['tickets'][req.query.transCode].name+"</span></td><td>Date : <span class='ticketspan'>"+bookingInfo['tickets'][req.query.transCode].date+"</span></td></tr><tr><td>Soruce : <span class='ticketspan'>"+bookingInfo['tickets'][req.query.transCode].source+"</span></td><td>Destination : <span class='ticketspan'>"+bookingInfo['tickets'][req.query.transCode].dest+"</span></td></tr><tr><td>Bus Type : <span class='ticketspan'>"+bookingInfo['tickets'][req.query.transCode].bustype+"</span></td><td>Fare : <span class='ticketspan'>"+bookingInfo['tickets'][req.query.transCode].fare+"</span></td></tr><tr><td>Total Tickets : <span class='ticketspan'>"+bookingInfo['tickets'][req.query.transCode].totTics+"</span></td><td>Total fare <span class='ticketspan'>: "+bookingInfo['tickets'][req.query.transCode].tcost+"</span></td></tr><tr><td colspan=2>booked seats <span class='ticketspan'>: "+bookingInfo['tickets'][req.query.transCode].bookedSeats+"</span></td></tr></table>";
		res.status(200);
		res.end(ticket);
	}else{
		res.status(200);
		res.end("Invalid Ticket");
	}
});

router.post("/paymentGateway",function(req, res){	
	var cardNo = req.body.cardNo;
	var expDate = req.body.expDate;
	var cvv = req.body.cvv;
	if(cvv == '000'){
		res.status(400);
		res.json({responseMsg:"transaction failed","transactionCode":"trans1999","reason":"invalid card details"}).end();		
	}else{
		bookingInfo['tickets']["trans2000"] = req.body;	
		console.log(req.body);
		if(!bookingInfo['seatsInfo'][req.body.source])
			bookingInfo['seatsInfo'][req.body.source]={};
		
		if(!bookingInfo['seatsInfo'][req.body.source][req.body.dest])
			bookingInfo['seatsInfo'][req.body.source][req.body.dest]={};
		if(!bookingInfo['seatsInfo'][req.body.source][req.body.dest][req.body.bustype])
			bookingInfo['seatsInfo'][req.body.source][req.body.dest][req.body.bustype]={};
		if(bookingInfo['seatsInfo'][req.body.source][req.body.dest][req.body.bustype][req.body.date]){
			bookingInfo['seatsInfo'][req.body.source][req.body.dest][req.body.bustype][req.body.date] = bookingInfo['seatsInfo'][req.body.source][req.body.dest][req.body.bustype][req.body.date].concat(req.body.bookedSeats);
		}else{
			bookingInfo['seatsInfo'][req.body.source][req.body.dest][req.body.bustype][req.body.date]=req.body.bookedSeats;		
		}					
		res.status(200);
		res.json({responseMsg:"transaction successful","transactionCode":"trans2000","redirectUrl":"/ticket?transCode=trans2000"}).end();		
	}
})
module.exports = router;



			