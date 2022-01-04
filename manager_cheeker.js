//https://chek.glitch.me
//var puppeteer = require('puppeteer');
var Public_key='BAnlkboOC-XU-l8uHkWHCbngrPRBOBJynF82sYZXoxiB6FUQHjnOLkV58EFbnMLjI13e1J7CQUJO5_twB7nR7lU';
var private_key='CbgQji_fZR6uY-Y0ppXMy60mZwgh9-vuWvI56D2P8VA'
const express = require('express')
var cors = require('cors')
var path = require('path')
const webpush = require('web-push');
const bodyParser = require('body-parser');
var Manager_worker=require('./manager_worker.js');
const jsonfile = require('jsonfile')
var fs=require('fs')

class manager_cheker{
	constructor(props) {
		this.defult_file_data={};
		this.file_data_path=path.join(__dirname,'./data.json')
		this.before_get_cycle_beriods=[400,500,600];
		this.password=505066;
		//this.manager_worker=new Manager_worker;
		this.listener_sockets=new Set()
		this.notification_listener_subscription=new Set();
		this.uvalid_notification_listener_subscription_endpoints=new Set();
		this.valed_disise=new Set()
		this.accounts=[];
		this.last_notification_subscrip_key=0;
		this.statistecs={
			up_time_in_secund:process.uptime(),
			up_time_in_hours:Math.floor(process.uptime() / 3600),
			sockets_in_connect:null,
			sycile_time:null,
			prodcast_to:null,
			prodcast_time:null,
			last_supscription_update:null,
			last_city_time:null,
			last_city_name:null,
			errors_count:0,
			last_error_time:null,
			last_error_type:null,
			last_error:null
		}
		this.start()
	}

	async load_file_data(){
		var {accounts}=await jsonfile.readFile(this.file_data_path)
		this.accounts=accounts;
	}

	async save_file_data(){
		var file_object={
			accounts:this.accounts,
		}
	    try{
	      await jsonfile.writeFile(this.file_data_path,file_object,{ spaces: 2, EOL: '\r\n' })
	    }catch(err){
			this.statistecs.errors_count+=1;
			this.statistecs.last_error=err;
			this.statistecs.last_error_type='save_file_data';
			this.statistecs.last_error_time=new Date().toLocaleString('en')	
	    }	
	}

	start_http_server(){
		this.http_server = express()
		this.http_server.use(cors())
		this.http_server.use(bodyParser.json())
		this.http_server.use(express.static(path.join(__dirname,"app")));
		var expressWs = require('express-ws')(this.http_server);	
		this.http_server.ws('/data', (ws, req)=> {
			this.set_socket(ws)
		});
		this.http_server.get('/app',(req,res)=>{
			res.sendFile(path.join(__dirname, 'app/index.html'));
		})
		this.http_server.post('/reserver_data',async(req,res)=>{
			var account=req.body.account;
			var reserver_data=await this.get_reserver_data_by_account(account)
			res.json(reserver_data);
		})		
		webpush.setVapidDetails('mailto:mercymeave@section.com', Public_key,private_key);
		this.http_server.listen(3000)
	}

	get_reserver_data_by_account(account){
		return {host:'192.168.1.200:5000',account:account}
	}

	cheek_if_socket_in_listener_socket_by_user_name_and_return_socket(user_name){
		try{
			for(var socket of this.listener_sockets){
				if(socket['user_name']==user_name){
					return socket;
				}
			}
			return false
		}catch(err){
			this.statistecs.errors_count+=1;
			this.statistecs.last_error=err;
			this.statistecs.last_error_time=new Date().toLocaleString('en')			
		}			
	}

	cheek_if_disise_in_valed_disise_and_return_disise(object){
		try{
			for(var disise of this.valed_disise){
				if(object['city']==disise['city']&&object['disise']==disise['disise']){
					return disise;
				}
			}
			return false
		}catch(err){
			this.statistecs.errors_count+=1;
			this.statistecs.last_error=err;
			this.statistecs.last_error_type='cheek_if_disise_in_valed_disise_and_return_disise';
			this.statistecs.last_error_time=new Date().toLocaleString('en')			
		}		
	}


	get_listener_socket_by_supscription_endpoit(endpoint){
		try{
			for(var socket of this.listener_sockets){
				if(socket['notification_subscribe']['endpoint']==endpoint){
					return socket;
				}
			}
			return false
		}catch(err){
			this.statistecs.errors_count+=1;
			this.statistecs.last_error=err;
			this.statistecs.last_error_type='get_listener_socket_by_supscription_endpoit';
			this.statistecs.last_error_time=new Date().toLocaleString('en')			
		}				
	}

	remove_disise_from_valid_disise(object){
		try{
			for(var disise of this.valed_disise){
				if(object['city']==disise['city']&&object['disise']==disise['disise']){
					this.valed_disise.delete(disise)
				}
			}
		}catch(err){
			this.statistecs.errors_count+=1;
			this.statistecs.last_error=err;
			this.statistecs.last_error_type='remove_disise_from_valid_disise';
			this.statistecs.last_error_time=new Date().toLocaleString('en')			
		}
	}

	handel_manager_worker_city_data_event(){
		this.manager_worker.events.on('city_data',async(data)=>{
			var city_name=(Object.keys(data))[0];
			this.statistecs.last_city_name=city_name;
			this.statistecs.last_city_time=new Date().toLocaleString('en')
	      	this.send_last_update_to_all_sockets(new Date().toLocaleString('en')) 
			for(var disise_key in data[city_name]){
				switch(data[city_name][disise_key]['state']){
					case true:
						switch(data[city_name][disise_key]['dates_state']){
							case true:
								var disise_object={city:city_name,disise:disise_key,dates_state:true}
								var valid_disise=this.cheek_if_disise_in_valed_disise_and_return_disise(disise_object)
								if(!valid_disise){
									this.valed_disise.add(disise_object)
									await this.send_valide_disise_to_all_notification_listener(disise_object)
									this.send_disise_update('valid',disise_object)
								}else{
									if(valid_disise['dates_state']==false){
										valid_disise['dates_state']=true;
										await this.send_valide_disise_to_all_notification_listener(disise_object)
										this.send_disise_update('valid',disise_object)
									}
								}
								break;
							case false:
								var disise_object={city:city_name,disise:disise_key,dates_state:false}
								var valid_disise=this.cheek_if_disise_in_valed_disise_and_return_disise(disise_object)
								if(!valid_disise){
									this.valed_disise.add(disise_object)
									await this.send_valide_disise_to_all_notification_listener(disise_object)
									this.send_disise_update('valid',disise_object)
								}else{
									if(valid_disise['dates_state']==true){
										valid_disise['dates_state']=false;
										await this.send_valide_disise_to_all_notification_listener(disise_object)
										this.send_disise_update('valid',disise_object)
									}
								}							
								break;
						}
						break;
					case false:
						var disise_object={city:city_name,disise:disise_key}
						var valid_disise=this.cheek_if_disise_in_valed_disise_and_return_disise(disise_object)
						if(valid_disise){
							this.remove_disise_from_valid_disise(disise_object)
							this.send_disise_update('unvalid',disise_object)
						}					
						break
				}
			}
		})
	}

	async send_valide_disise_to_all_notification_listener(disise_object){
		try{
			var dates_state_text=disise_object['dates_state']?'المواعيد : يوجد':'المواعيد : لايوجد';
			var mesage_object={
				title:disise_object['city'],
				body:`(${disise_object['disise']}) \n ${dates_state_text}`
			}
			await this.send_to_all_notification_listener(mesage_object)		
		}catch(err){
			this.statistecs.errors_count+=1;
			this.statistecs.last_error=err;
			this.statistecs.last_error_type='send_valide_disise_to_all_notification_listener';
			this.statistecs.last_error_time=new Date().toLocaleString('en')			
		}		
	}

	send_disise_update(update_by,disise){
		for(var socket of this.listener_sockets){
			try{
				var message=JSON.stringify({function:'disise_update',update_by,disise})
				socket.send(message)
			}catch(err){
				this.statistecs.errors_count+=1;
				this.statistecs.last_error=err;
				this.statistecs.last_error_time=new Date().toLocaleString('en')	
			}
		}
	}


	send_last_update_to_all_sockets(date){
		for(var socket of this.listener_sockets){
			try{
				var message=JSON.stringify({function:'last_update',date})
				socket.send(message)	
			}catch(err){
				this.statistecs.errors_count+=1;
				this.statistecs.last_error=err;
				this.statistecs.last_error_type='send_last_update_to_all_sockets';
				this.statistecs.last_error_time=new Date().toLocaleString('en')	
			}
		}		
	}

	async set_socket(ws){
   		this.handel_socket_disconnect(ws)
	   	this.set_on_message_functions_to_socket(ws)
		await this.cheek_account(ws)
		await this.make_prev_account_not_listen(ws)
		await this.set_notification_subscription_to_account(ws)
		this.listener_sockets.add(ws)
		console.log('connected')
	}

	cheek_account(ws){
		return new Promise((res,rej)=>{
			ws.once('message',(msg)=> {		
				try{
				  	var msg=JSON.parse(msg)
				  	if(msg.password&&msg.user_name){
				  		var account=this.get_account_from_accounts_by_user_name(msg.user_name);
				  		if(account){
				  			if(msg.password==account.password){
				  				ws.password=msg.password;
				  				ws.user_name=msg.user_name;
				  				ws.notification_subscribe=msg.Notification_subscrip
				  				res()
				  			}
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

	get_account_from_accounts_by_user_name(user_name){
		try{
			for(var account of this.accounts){
				if(account['Username']==user_name){
					return account
				}
			}
			return false
		}catch(err){
			this.statistecs.errors_count+=1;
			this.statistecs.last_error=err;
			this.statistecs.last_error_type='get_account_from_accounts_by_user_name';
			this.statistecs.last_error_time=new Date().toLocaleString('en')			
		}		
	}

	async make_prev_account_not_listen(ws){
		try{
			var socket=this.cheek_if_socket_in_listener_socket_by_user_name_and_return_socket(ws.user_name)
			if(socket){
				this.listener_sockets.delete(socket);
			}			
		}catch(err){
			this.statistecs.errors_count+=1;
			this.statistecs.last_error=err;
			this.statistecs.last_error_type='make_prev_account_not_listen';
			this.statistecs.last_error_time=new Date().toLocaleString('en')
		}

	}

	handel_socket_disconnect(ws){
	    ws.once('close', (wes)=> {
	        this.listener_sockets.delete(ws)
	    });	
		ws.once('error', (err)=>{
			this.listener_sockets.delete(ws)
		})	    	
	}

	async set_notification_subscription_to_account(ws){
		try{
			var account=this.get_account_from_accounts_by_user_name(ws.user_name);
			account.notification_subscribe=ws.notification_subscribe;
			await this.save_file_data()			
		}catch(err){
			this.statistecs.errors_count+=1;
			this.statistecs.last_error=err;
			this.statistecs.last_error_type='set_notification_subscription_to_account';
			this.statistecs.last_error_time=new Date().toLocaleString('en')
		}		
	}

	send_to_all_notification_listener(mesage_object){
		return new Promise(async(res,rej)=>{
			try{
				var begin=Date.now();
				for(var account of this.accounts){
					if(!account.notification_subscribe){continue}
					const payload = JSON.stringify(mesage_object);	
					await webpush.sendNotification(account.notification_subscribe, payload)
					.catch((err)=> {
						if(err.statusCode==410){
							this.uvalid_notification_listener_subscription_endpoints.add(err.endpoint)
						}
					});
				}
				var end= Date.now();
				this.statistecs.prodcast_time=(end-begin)/1000+"secs";
				res(true)		
			}catch(err){
				this.statistecs.errors_count+=1;
				this.statistecs.last_error=err;
				this.statistecs.last_error_type='send_to_all_notification_listener';
				this.statistecs.last_error_time=new Date().toLocaleString('en')
			}						
		})
	}

	async handel_uvalid_notification_listener_subscription(){
		try{
			if(this.uvalid_notification_listener_subscription_endpoints.size>0){
				var temp_array=[...this.uvalid_notification_listener_subscription_endpoints];
				var endpoint=temp_array[0];
				await this.remove_unvalid_notification_subscription(endpoint)
				this.uvalid_notification_listener_subscription_endpoints.delete(endpoint)
				this.send_update_supscripe_to_socket(endpoint)
			}				
		}catch(err){
			this.statistecs.errors_count+=1;
			this.statistecs.last_error=err;
			this.statistecs.last_error_type='handel_uvalid_notification_listener_subscription';
			this.statistecs.last_error_time=new Date().toLocaleString('en')
		}
	}

	show_statistics(){
		console.clear();
		this.statistecs.up_time_in_secund=process.uptime()
		this.statistecs.up_time_in_hours=Math.floor(process.uptime() / 3600);
		this.statistecs.sockets_in_connect=this.listener_sockets.size;
		this.statistecs.prodcast_to=this.accounts.length;
		console.log('----------------------')
		for(var key in this.statistecs){
			console.log(key,' : ',this.statistecs[key])
		}
		console.log('----------------------')
	}

	five_sucond_task(){
		setInterval(async()=>{
			await this.handel_uvalid_notification_listener_subscription()
			this.show_statistics()
		},5000)		
	}

	send_erros_to_file(err){

		var log_file_err=fs.createWriteStream(__dirname + '/error.log',{flags:'a'});  
		log_file_err.write(util.format('Caught exception: '+err) + '\n');	
	}

	send_update_supscripe_to_socket(endpoint){
		try{
			var socket=this.get_listener_socket_by_supscription_endpoit(endpoint);
			if(socket){
				var message=JSON.stringify({function:'update_supscripe'})
				socket.send(message)			
			}
		}catch(err){
			this.statistecs.errors_count+=1;
			this.statistecs.last_error=err;
			this.statistecs.last_error_type='send_update_supscripe_to_socket';
			this.statistecs.last_error_time=new Date().toLocaleString('en')
		}		
	}

	async remove_unvalid_notification_subscription(unvalid_subscription_endpoint){
		for(var account of this.accounts){
			if(!account.notification_subscribe){continue}
			if(account.notification_subscribe.endpoint==unvalid_subscription_endpoint){
				account.notification_subscribe=null;
				break;
			}
		}
		await this.save_file_data()
	}

	send_all_valid_disise(ws){
		var disise_objects=[];
		for(var disise of this.valed_disise){
			disise_objects.push(disise)
		}
		var message=JSON.stringify({function:'all_valid_disise',disise_objects:disise_objects})
		ws.send(message)
	}

	set_on_message_functions_to_socket(ws){
		ws.on('message',async(msg)=> {
		  	var msg=JSON.parse(msg)
		    switch(msg.function){
		    	case 'get_all_valid_disise':
		            if(!ws.password){return}
			    		this.send_all_valid_disise(ws)
			    		break; 
		    	case 'update_supscripe':
		    		try{
		            	if(!ws.password){return}
				    		ws.notification_subscribe=msg.Notification_subscrip;
				    		await this.set_notification_subscription_to_account(ws)
				    		this.statistecs.last_supscription_update=new Date().toLocaleString();
				    		break;  		    			
				    }catch(err){
				    	console.log(err)
				    }
 			    		          
		    }
		});
	}

	delay(time){
		return new Promise((res,rej)=>{
			setTimeout(()=>{res()},time)
		})
	}

	async get_cycil_recertion(){
		await this.delay(this.before_get_cycle_beriods.random())	
		await this.manager_worker.ready()
		var begin=Date.now();
		await this.manager_worker.get_cycil()
		var end= Date.now();
		this.statistecs.sycile_time=(end-begin)/1000+"secs";
		await this.get_cycil_recertion()
	}

	async start(){
		this.start_http_server()
		//this.send_erros_to_file()
		this.five_sucond_task()
		//this.handel_prossess_exet()
		await this.load_file_data()
		//this.handel_manager_worker_city_data_event()
		//await this.get_cycil_recertion()
	}

}


Object.defineProperty(Array.prototype, 'random', {
  value: function(chunkSize) {
  	  if(this.length==0){return new Error('Cant Use Roundom With Empty Array')}
	  min = Math.ceil(0);
	  max = Math.floor(this.length);
	  r=Math.floor(Math.random() * (max - min) + min);
	  return this[r]
  }
});



var MC=new manager_cheker
//27904241500274
//http://pod.mohp.gov.eg/register

//http://pod.mohp.gov.eg/apps/lookups/centers.php?lk_governments=21&major_dismed=3&dhxr1638123344142=1

//http://pod.mohp.gov.eg/apps/lookups/centers.php?lk_governments=12&major_dismed=3&dhxr1638123344142=1