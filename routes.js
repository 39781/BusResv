var express 		= require('express');
var router			= express.Router();	 
var careerConfig	= require("./config");	
var fs 				= require("fs");	
var request			= require('request');
router.get('/',function(req, res){
	console.log('req received');
	res.send("req received");
	res.end();
})

router.post('/botHandler',function(req, res){
	//console.log('Dialogflow Request headers: ' + JSON.stringify(req.headers));
	console.log('Dialogflow Request body: ' + JSON.stringify(req.body));	
	console.log(req.body.result.parameters);
	var sessionId = (req.body.sessionId)?req.body.sessionId:'';	
	if(!inputs[sessionId]){
		inputs[sessionId]={"currentInput":null};
	}
	if(inputs[sessionId]["currentInput"]){
		req.body.result.parameters[inputs[sessionId]["currentInput"]]=req.body.result.resolvedQuery;
	}	
	var responseObj = JSON.parse(JSON.stringify(careerConfig.input.inputResJson));
	responseObj.contextOut[0].name = "542f6844-1eaa-4b89-8f3a-1e6b5ad5e3d0_id_dialog_context";
	responseObj.contextOut[0].parameters = req.body.result.parameters;	

	console.log(responseObj);
	if(req.body.result.parameters.infotype.length<=0){
		inputs[sessionId]["currentInput"] = "infotype";
		responseObj.messages[0].title = "Please select which information you need?";
		responseObj.messages[0].replies = ["Jobs","Further Studies","Exit"];
	}else if(req.body.result.parameters.qualification.length<=0){
		if(req.body.result.parameters.branch.length>0){
			req.body.result.parameters["qualification"] = findQualification(req.body.result.parameters.branch);
			req.body.result.parameters["qualification.original"] = findQualification(req.body.result.parameters.branch);
			console.log(req.body.result.parameters);
			console.log('qualif',req.body.result.parameters["qualification"]);
			delete responseObj.messages;
		}else{
			inputs[sessionId]["currentInput"] = "qualification";
			responseObj.messages[0].title = "Please select your qualification";
			responseObj.messages[0].replies = ["SSC","Intermediate","Graduation","Post graduation"];
		}
	}else if(req.body.result.parameters.qualification != 'SSC'&& req.body.result.parameters.branch.length<=0){
		inputs[sessionId]["currentInput"]= "branch";
		responseObj.messages[0].title = "Please select your branch";
		responseObj.messages[0].replies = careerConfig.input[req.body.result.parameters.qualification.toLowerCase()]
	}else{
		delete inputs[sessionId];
		let contextParams;
		if(req.body.result.contexts.length>0){
			contextParams ={
				qualification:req.body.result.contexts[0].parameters.qualification.toLowerCase(),
				infoType:req.body.result.contexts[0].parameters.infotype.toLowerCase()
			}	
		}else{
			contextParams ={
				qualification:req.body.result.parameters.qualification.toLowerCase(),
				infoType:req.body.result.parameters.infotype.toLowerCase()
			}
		}
		 responseObj = {
		  "speech": "",
		  "contextOut": [{
				 "name":"542f6844-1eaa-4b89-8f3a-1e6b5ad5e3d0_id_dialog_context", 
				 "lifespan":2, 
				 "parameters":{
					 "infotype":"",
					 "qualification":"",
					 "branch":""					 
				 }
			}],
		  "messages": [{
			  "type": 4,
			  "platform": "facebook",
			  "payload": {
				"facebook": {
				  "attachment": {
					"type": "template",
					"payload": {
					  "template_type": "button",
					  "text": "Click below button to view details",
					  "buttons": [{
						  "type": "web_url",
						  //"url": "https://limitless-lake-62312.herokuapp.com/index.html",
						  "url": "https://limitless-lake-62312.herokuapp.com/getInfo/"+contextParams.qualification+"/"+contextParams.infoType+"/"+req.body.originalRequest.data.sender.id,
						  "title": "view",
						  "webview_height_ratio": "tall",
						  "messenger_extensions": "true"
						}]
					}
				  }
				}
			  }
			},
			{
			  "type": 0,
			  "speech": ""
			}
		  ]
		}		
	}
	console.log(JSON.stringify(responseObj));
	res.status(200);
	res.json(responseObj).end();
});
router.get('/shareMessageToBot/:recipientId',function(req, res){
	var queryParams = {};	
	var messageToSend = {
		recipient: {
			id: req.params.recipientId,
		},
		message:{
			'text': 'please select which information you need?',
			'quick_replies':[
				{'content_type':'text','title':'Jobs','payload':'Jobs'},
				{'content_type':'text','title':'Further studies','payload':'Further studies'},
				{'content_type':'text','title':'Exit','payload':'Exit'}
			]
		}
	};
	const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;	
	const query = Object.assign({access_token: PAGE_ACCESS_TOKEN}, queryParams);	
	request({
		uri: `https://graph.facebook.com/v2.6/me/messages`,
		qs: query,
		method: 'POST',
		json: messageToSend,
		}, (error, response, body) => {
			if (!error && response.statusCode === 200) {
				// Message has been successfully received by Facebook.
				console.log(JSON.stringify(body));
			} else {		
				// Message has not been successfully received by Facebook.
				console.error(
					`Failed calling Messenger API endpoint`,
					response.statusCode,
					response.statusMessage,
					body.error,
					queryParams
				);      
			}
		}
	);
	res.status(200);
	res.end();
});
router.get('/getInfo/:qualification/:infoType/:recipientId',function(req, res){	
	var	contextParams ={
		qualification:req.params.qualification,
		infoType:req.params.infoType,
		recipientId:req.params.recipientId
	}	
	processRequest(contextParams)
	.then((resp)=>{	
		console.log(resp);	
		res.end(resp);	
	})
	.catch((err)=>{
		res.json(err).end();
	});	
});
var processRequest = function(contextParams){
	return new Promise(function(resolve, reject){
		var html = careerConfig.html;		
		console.log(contextParams);
		html = html.replace('recipientId',contextParams.recipientId);
		html = html.replace('infoTitle',contextParams.qualification+" Related "+contextParams.infoType);		
		if(typeof(careerConfig[contextParams.qualification])=='undefined'){
			html = html.replace("htmlContent","Sorry ! for "+contextParams.qualification+" qualification data not available right now");
			resolve(html);
		}else if(typeof(careerConfig[contextParams.qualification][contextParams.infoType])=='undefined'){
			html = html.replace("htmlContent","Sorry ! for "+contextParams.qualification+" qualification "+contextParams.infoType+"data not available right now");
			resolve(html);
		}else{			
			constructJson(careerConfig[contextParams.qualification][contextParams.infoType])
			.then(function(resp){
				html = html.replace("htmlContent","<center>Click on contentType</center><div class='chart' id='collapsable-example'></div>");
				html = html.replace('contentType',contextParams.infoType);
				html = html.replace('configJson', "var careerConfig="+JSON.stringify(resp));			
				resolve(html);		
			})
			.catch((err)=>{
				reject(err);
			})
		}		
	})
}
var constructJson = function(infoObj){
	return new Promise(function(resolve, reject){		
		var careerConfig = {
				chart: {
					container: '#collapsable-example',
					rootOrientation:  'WEST', // NORTH || EAST || WEST || SOUTH					
					levelSeparation:200,					
					siblingSeparation:   100,					
					scrollbar: "fancy",
					animateOnInit: true,
					connectors: {
						type: 'bCurve'
					},
					node: {
						 HTMLclass: 'nodeExample1'
					},
					animation: {
						nodeAnimation: 'easeOutBounce',
						nodeSpeed: 700,
						connectorsAnimation: 'bounce',
						connectorsSpeed: 700
					}
				},
				nodeStructure: {
					text: {
						name: 'SSC',
						title: ''
					},
					children: [infoObj]
				}
			};
			
		resolve(careerConfig);	
	})
	
}

var findQualification = function(branch){
	if(careerConfig.input['intermediate'].indexOf(branch)>=0){
		console.log('intermediate');
		return "intermediate";
	}
	if(careerConfig.input['graduation'].indexOf(branch)>=0){
		return "graduation";
	}
	if(careerConfig.input['post graduation'].indexOf(branch)>=0){
		return "post graduation";
	}
}
module.exports = router;



			