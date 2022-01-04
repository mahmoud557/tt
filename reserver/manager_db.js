var LinvoDB = require("linvodb3");
LinvoDB.defaults.store = { db: require("leveldown") };
LinvoDB.dbPath = process.cwd();

class Manager_db{

	constructor(props) {
		this.db={}
		this.db.waiting_list= new LinvoDB("waiting_list", { /* schema, can be empty */ })

	}

	add_waiting_cill_to_Waiting_list(form_object){
		return new Promise((res,rej)=>{
			this.db.waiting_list.save(form_object,async(err,docs)=>{
	           	res(docs)
	        })			
		})
	}

	get_all_waiting_cill_from_Waiting_list(){
		return new Promise((res,rej)=>{
			this.db.waiting_list.find({}, function (err, docs) {
				res(docs)
			});	        		
		})
	}

	get_waiting_cile_by_id(id){
		return new Promise((res,rej)=>{
			this.db.waiting_list.findOne({ _id: id }, function (err, doc) {
				res(doc)
			});	        		
		})		
	}

	remove_waiting_cill_from_Waiting_list(form_object){
		return new Promise((res,rej)=>{
			this.db.waiting_list.remove({ _id: form_object['_id'] }, {}, function (err, numRemoved) {
			  // numRemoved = 1
			  console.log(numRemoved)
			  res(true)
			});		
		})
	}

	update_waiting_cill_from_Waiting_list(form_object){
		return new Promise(async(res,rej)=>{
			this.db.waiting_list.update({ _id: form_object['_id'] }, form_object, {}, async function (err, numReplaced) {
				var doc=await this.get_waiting_cile_by_id(form_object['_id'])
				res(doc)
			});	
		})		
	}

	get_waiting_cills_from_waiting_list_by_majec_key(majec_key){
		return new Promise((res,rej)=>{
			this.db.waiting_list.find({ majec_key: majec_key }, function (err, docs) {
				res(docs)
			});
		})
	}

	async start(){
		console.log(true)
	}


}

module.exports = Manager_db;