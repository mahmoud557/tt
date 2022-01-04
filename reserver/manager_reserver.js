const express = require('express')
var cors = require('cors')
var path = require('path')
var Manager_Db=require('./Manager_db.js');
var Manager_Browser=require('./manager_browser.js');
class Manager_reserver{
	constructor(props) {
		this.manager_db=new Manager_Db;
		this.manager_browser=new Manager_Browser;
		this.account={
			Username:'d3',
			password:'3'
		}
		this.start()
		this.manager_db.start()
	}

	async start(){
		this.start_http_server()
	}
	start_http_server(){
		this.http_server = express()
		this.http_server.use(cors())
		this.http_server.use(express.static(path.join(__dirname,"app")));
		var expressWs = require('express-ws')(this.http_server);	
		this.http_server.ws('/data', (ws, req)=> {
			console.log('connect')
			this.set_socket(ws)
		});
		this.http_server.listen(5000)
	}

	async set_socket(ws){
   		//this.handel_socket_disconnect(ws)
	   	this.set_on_message_functions_to_socket(ws)
		await this.cheek_account(ws)
	}	

	set_on_message_functions_to_socket(ws){
		ws.on('message',async(msg)=> {
			if(!ws.password){return}
		  	var msg=JSON.parse(msg)
		    switch(msg.function){
		    	case 'add_waiting_cile':
	            	await this.add_waiting_cile(msg.parameters[0],msg.parameters[1])
		    		break;  
		    	case 'get_all_waiting_cile':
	            	await this.get_all_waiting_cile(msg.parameters[0])
		    		break; 	
		    	case 'remove_waiting_cill':
	            	await this.remove_waiting_cile(msg.parameters[0],msg.parameters[1])
		    		break; 	  
		    	case 'edite_waiting_cill':
	            	await this.edite_waiting_cile(msg.parameters[0],msg.parameters[1])
		    		break; 		    		  			    		 		          
		    }
		});
	}

	async add_waiting_cile(form_object,ack){
		var add_doc=await this.manager_db.add_waiting_cill_to_Waiting_list(form_object)
    	var message=JSON.stringify({function:'ack',ack_id:ack,payload:add_doc})
		this.socket.send(message)
	}

	async get_all_waiting_cile(ack){
		var waiting_ciles=await this.manager_db.get_all_waiting_cill_from_Waiting_list()
    	var message=JSON.stringify({function:'ack',ack_id:ack,payload:waiting_ciles})
		this.socket.send(message)
	}

	async remove_waiting_cile(ack,form_object){
		await this.manager_db.remove_waiting_cill_from_Waiting_list(form_object)
    	var message=JSON.stringify({function:'ack',ack_id:ack})
		this.socket.send(message)
	}

	async edite_waiting_cile(form_object,ack){
		var edite_doc=await this.manager_db.add_waiting_cill_to_Waiting_list(form_object)
    	var message=JSON.stringify({function:'ack',ack_id:ack,payload:edite_doc})
		this.socket.send(message)
	}

	cheek_account(ws){
		return new Promise((res,rej)=>{
			ws.once('message',(msg)=> {		
				try{
				  	var msg=JSON.parse(msg)
				  	if(msg.password&&msg.user_name){
			  			if(msg.password==this.account.password){
			  				ws.password=msg.password;
			  				ws.user_name=msg.user_name;
			  				ws.notification_subscribe=msg.Notification_subscrip;
			  				this.socket=ws;
			  				res()
			  			}
				  	}
				}catch(err){
					this.statistecs.errors_count+=1;
					this.statistecs.last_error=err;
					this.statistecs.last_error_time=new Date().toLocaleString('en')			
				}				
			});
		})
	}			

}

var MR=new Manager_reserver