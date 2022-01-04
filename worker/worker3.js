//node-fetch@2
const express = require('express')
var cors = require('cors')
var fetch = require('node-fetch');
var xml2js = require('xml2js');
var path = require('path')
var parser = new xml2js.Parser(/* options */);
class Worker{
	constructor() {
		this.http_server = express()
		this.http_server.use(cors())
		this.in_sycil=false;
		this.listener_sockets=new Set();
		this.before_get_city_periods=[600,500,300,100];
		this.before_get_disise_periods=[100,200,300,400];	
		this.country_map={
			'13':"الشرقية",
			'14':"القليوبية",
			'15':"كفر الشيخ",
			'22':"بنى سويف",			
		}
		this.desise_map={
			"1":'أمراض الدم',
			"3":'الإعاقة البصرية',
			"4":'الإعاقة السمع بصرية',
			"5":'الإعاقة السمعية',
			"6":'الإعاقة الذهنية',
			"7":'الإعاقة الحركية',
			"8":'اضطراب طيف توحد',
			"11":'القزامة',
			"14":'الإعاقة المتعددة',
		}	
		this.start()	
	}

	start(){
		var expressWs = require('express-ws')(this.http_server);
		this.http_server.ws('/data', (ws, req)=> {
			this.add_socket_to_listener_sockets(ws)
			this.set_functions_to_socket(ws)
		});	
		this.http_server.listen(3004)	
	}

	add_socket_to_listener_sockets(ws){
		this.listener_sockets.add(ws)
	}

	remove_socket_from_listener_sockets(ws){
		this.listener_sockets.delete(ws)
	}

	set_functions_to_socket(ws){
		this.socket=ws;
		ws.on('message',(msg)=> {
			console.log(msg)
			if(msg=='something'){return}
		  	var msg=JSON.parse(msg)
		    switch(msg.function){
		    	case 'get_cycil':
		    		if(!this.in_sycil){
			    		console.log('get_cycil')
			    		this.get_cycil()
			    		break;		    			
		    		}
		    }
		});

		ws.once('close',(msg)=> {
			this.remove_socket_from_listener_sockets(ws)
		});	

		ws.once('error',(msg)=> {
			this.remove_socket_from_listener_sockets(ws)
		});				
	}



 	abort_after_time(time){
 		return new Promise((res,rej)=>{
		    setTimeout(async () => { // abort fetch request
		            console.log('borted after',time)
		            res(undefined)
		    }, time)
 		})
 	}

 	async get_fk_centers(url,timeout){
		var p1 = new Promise(async(res,rej)=>{
	 		try{
		 		const response = await fetch(url);
				const data = await response.text()
				var result=await parser.parseStringPromise(data);
				var fk_centers=result['data']['item'].slice(1);
				if(fk_centers.length>0){
					res(fk_centers)
				}else{
					res(undefined)
				}			
	 		}catch(err){
	 			res(undefined)	
	 		}
 		})
		var p2 = new Promise(function(resolve, reject) { 
		    setTimeout(resolve, timeout, undefined); 
		});
		var value=await Promise.race([p1, p2])
		return value
 	}

 	async get_dates_for_fk_center(url,timeout){
		var p1 = new Promise(async(res,rej)=>{
	 		try{
		 		const response = await fetch(url);
				const data = await response.text()
				var result=await parser.parseStringPromise(data);
				res(result['data']['item'][1])		
	 		}catch(err){
	 			res(undefined)	
	 		}
 		})
		var p2 = new Promise(function(resolve, reject) { 
		    setTimeout(resolve, timeout, undefined); 
		});
		var value=await Promise.race([p1, p2])
		return value
 	}

 	async ask_for_dates_for_all_fk_centers(fk_ceters_array,disise_key){
 		for(var itime of fk_ceters_array){
 			var code=itime['$']['value'];
 			var url=`http://pod.mohp.gov.eg/apps/lookups/centers_visit.php?fk_center_id=${code}&major_dismed=${disise_key}&dhxr1639923828325=1`
 			var date=await this.get_dates_for_fk_center(url,6000)
 			console.log(date)
 			if(date){
 				return true;
 				break;
 			}
 		}
 		return false
 	}

	async get_cycil(){
		this.in_sycil=true;
		for(var country_key in this.country_map){
			await this.delay(this.before_get_city_periods.random())
			if(!this.socket){return}
			var city_object=await this.get_city(country_key);
			this.send_city_data(city_object)
		}
		this.send_cycil_end();
		this.in_sycil=false;
	}

 	async get_city(city_code){
 		var city_object=new Object;
 		city_object[this.country_map[city_code]]={};
 		for(var disise_key in this.desise_map){
 			if(!this.socket){return}
 			var url=`http://pod.mohp.gov.eg/apps/lookups/centers.php?lk_governments=${city_code}&major_dismed=${disise_key}&dhxr1638123344142=1`
 			await this.delay(this.before_get_disise_periods.random())
 			var fk_centers=await this.get_fk_centers(url,6000);	
 			if(fk_centers){
 				var dates=await this.ask_for_dates_for_all_fk_centers(fk_centers,disise_key)
 				if(dates){
	 				city_object[this.country_map[city_code]][this.desise_map[disise_key]]={state:true,dates_state:true};
 				}else{
 					city_object[this.country_map[city_code]][this.desise_map[disise_key]]={state:true,dates_state:false};
 				}	
 			}else{
 				city_object[this.country_map[city_code]][this.desise_map[disise_key]]={state:false};
 			}
 		}
 		return city_object;
 	} 

 	send_city_data(city_object){
 		for(var socket of this.listener_sockets){
	 		try{
		 		var message=JSON.stringify(city_object);
		 		socket.send(message)			
	 		}catch(err){
	 			console.log(err)
	 		}
 		}
 	}

 	send_cycil_end(){
 		for(var socket of this.listener_sockets){
	 		try{
		  		var message=JSON.stringify({end:true});
		 		socket.send(message)			
	 		}catch(err){
	 			console.log(err)
	 		}
 		}
 	}
 	delay(time){
		return new Promise((res,rej)=>{
			setTimeout(()=>{res()},time)
		})
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

var worker=new Worker