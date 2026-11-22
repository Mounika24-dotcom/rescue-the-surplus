const fs=require('fs'),path=require('path'),vm=require('vm');
const html=fs.readFileSync(path.join(process.cwd(),'rescue-the-surplus','index.html'),'utf8');
const SRC=html.match(/<script>([\s\S]*?)<\/script>/)[1];
const MIN=60000,HOUR=3600000,KEY='rescueSurplus.v1',ACC='rts.account';
const el=()=>({hidden:false,value:'',style:{},dataset:{},innerHTML:'',textContent:'',classList:{toggle(){},add(){},remove(){}},setAttribute(){},removeAttribute(){},addEventListener(){},remove(){},querySelector(){return null},querySelectorAll(){return []}});
const base=(o)=>({donorId:1,foodType:'Test food',quantity:10,unit:'meals',allergens:['none'],storageNote:'',foodCategory:'Cooked food',consumeWithinHours:4,postedAt:Date.now()-3*HOUR,pickupBy:Date.now()+2*HOUR,status:'posted',history:[],...o});
const cases={
 A:[{id:400,donorId:99,status:'posted'},{role:'receiver',id:1,name:'Hope Foundation'}],
 B:[{id:400,donorId:99,status:'posted'},{role:'overview',id:'judges',name:'Overview (judges)'}],
 C:[{id:400,donorId:99,status:'posted'},{role:'donor',id:1,name:'Saffron Caterers'}],
 D:[{id:401,status:'posted',history:[{step:'teleported',by:'x',at:Date.now()}]},{role:'donor',id:1,name:'Saffron Caterers'}],
 E:[{id:402,status:'claimed',history:[null]},{role:'donor',id:1,name:'Saffron Caterers'}]};
for(const k of Object.keys(cases)){
 const [l,acc]=cases[k]; const storage={[KEY]:JSON.stringify({listings:[base(l)],nextId:200,impact:{kgPerMeal:0.42,co2PerKg:4},business:{},businessCity:'Hyderabad'}),[ACC]:JSON.stringify(acc)};
 const sb={document:{getElementById:()=>el(),querySelector:()=>el(),querySelectorAll:()=>[]},FormData:class{},console,setInterval:()=>0,clearInterval(){},setTimeout,addEventListener(){},confirm:()=>true,
  localStorage:{getItem:(x)=>(x in storage?storage[x]:null),setItem:(x,v)=>{storage[x]=String(v)},removeItem:(x)=>{delete storage[x]}}};
 sb.window=sb; const ctx=vm.createContext(sb); let err=null;
 try{vm.runInContext(SRC,ctx,{filename:'index.html'})}catch(e){err=e}
 let after=null; try{after=vm.runInContext('JSON.stringify(state.listings.map(l=>l.id).filter(i=>i>=400))',ctx)}catch(e){after='ERR '+e.message}
 let saved=storage[KEY]; console.log(k,'loadErr:',err?err.message:'none','| listings in memory:',after,'| saved ids:',saved?JSON.parse(saved).listings.filter(x=>x.id>=400).map(x=>x.id).join(','):'(none)');
}
process.exit(0);
