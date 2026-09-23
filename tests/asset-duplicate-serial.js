// Checks the v409 rule that a serial number is not an identity: Add New always
// creates a new Zoho record even when the same serial is already on another
// asset, and only an asset the technician loaded is updated. Also checks the
// Zoho-side DUPLICATE_DATA message. Run: node tests/asset-duplicate-serial.js
var fs=require("fs");
var path=require("path");
var src=fs.readFileSync(path.join(__dirname,"../src/app.js"),"utf8");
var failed=0,passed=0;
function check(name,cond,detail){
  if(cond){passed++;return;}
  failed++;
  console.error("FAIL: "+name+(detail?"\n  "+detail:""));
}
function declIndex(name,from){
  var plain=src.indexOf("\nfunction "+name+"(",from||0);
  var async=src.indexOf("\nasync function "+name+"(",from||0);
  if(plain<0)return async;
  if(async<0)return plain;
  return Math.min(plain,async);
}
function sliceFn(name,nextName){
  var start=declIndex(name);
  if(start<0)throw new Error("missing "+name);
  var end=declIndex(nextName,start+1);
  if(end<0)throw new Error("missing end marker "+nextName+" for "+name);
  return src.slice(start+1,end);
}

// Stubs for everything saveEquipmentRecord leans on, so the test exercises the
// real save path and the real proxy call assembly.
var calls=[];
var confirms=[];
var assetState;
function fakeResponse(obj,status){
  status=status||200;
  return{ok:status<400,status:status,text:function(){return Promise.resolve(JSON.stringify(obj));},json:function(){return Promise.resolve(obj);}};
}
var proxyReply=function(){return fakeResponse({data:[{code:"SUCCESS",status:"success",details:{id:"7788990011223344"}}]});};
function zohoProxyFetch(body){calls.push(body);return Promise.resolve(proxyReply(body));}
// Answers the way the technician did in the field — yes at the prompt — so a
// returning serial upsert fails these checks loudly instead of quietly cancelling.
function confirm(msg){confirms.push(msg);return true;}
function findExistingEquipmentBySerial(){
  calls.push({action:"find_equipment",serial_number:assetInput("asset-serial")});
  return Promise.resolve({equipment_id:"9999888877776666",equipment:{Name:"Another asset with the same serial"}});
}
function ast(){return assetState;}
function ensureActiveAssetConfig(){return Promise.resolve();}
function prepareAssetDynamicFieldsForSave(){return Promise.resolve();}
function assertResolvedDynamicLookupsBeforeSave(){}
function syncSubformRowsFromDom(){}
function isInternalAssetModule(){return false;}
function isAssetBgSpecsEnabled(){return true;}
function assetInput(id){return({"asset-serial":"SN-1001","asset-name":"Rogers influent recorder","asset-brand":"Honeywell","asset-model":"DR4500A"})[id]||"";}
function assetPayload(){return{Name:"Rogers influent recorder",Serial_Number:"SN-1001",Account:{id:"1122334455667788"}};}
function splitAssetPayloadForCategoryLayout(p){return{core:p,category:"",extension:{}};}
function assetPayloadWithoutSubform(p){var o=Object.assign({},p);delete o.Subform_1;return o;}
function assetPayloadWithoutCategory(p){return p;}
function assetPayloadWithoutCategoryExtensions(p){return p;}
function assetSubformPayload(){return[];}
function prepareSubformRowsForSave(){return Promise.resolve();}
function assetStatus(){}
function enqueueAssetSpecsJob(){}
function assetModuleProxyActions(){
  return{create:"create_equipment",update:"update_equipment",delete:"delete_equipment",get:"get_equipment",search:"search_equipment_assets",findBySerial:"find_equipment",uploadPhoto:"upload_equipment_photo",saveNote:"save_equipment_note",activateLayout:"activate_equipment_category_layout"};
}
function postEquipmentCategoryLayoutActivation(){return Promise.resolve();}
function checkZohoProxyDeploy(){return Promise.resolve({ok:true});}
function getEquipmentRecord(){return Promise.resolve({});}
function generateModelAiSpecsIfNeeded(){return Promise.resolve({ok:true});}
function combineModelAiSpecsForUpdate(a){return a;}

eval(sliceFn("isZohoLookupRecordId","sanitizeZohoRecordId"));
eval(sliceFn("sanitizeZohoRecordId","formatDynamicValueForZoho"));
eval(sliceFn("equipmentIdFromResponse","equipmentSaveError"));
eval(sliceFn("equipmentSaveError","postEquipmentToZoho"));
eval(sliceFn("postEquipmentToZoho","checkZohoProxyDeploy"));
eval(sliceFn("saveEquipmentRecord","assetDealDescription"));

function freshState(currentAssetId){
  return{currentAssetId:currentAssetId||null,mode:currentAssetId?"update":"add",intent:currentAssetId?"update":"add",loadedOriginal:null,aiSpecsText:"",aiSpecsKey:"",subformRows:[]};
}
function actionsUsed(){return calls.map(function(c){return c.action;});}

function run(){
  return Promise.resolve()
    .then(function(){
      calls=[];confirms=[];assetState=freshState(null);
      return saveEquipmentRecord();
    })
    .then(function(id){
      check("Add New creates a record even though the serial is already in Zoho",actionsUsed().indexOf("create_equipment")>=0,JSON.stringify(actionsUsed()));
      check("Add New never updates another asset",actionsUsed().indexOf("update_equipment")<0,JSON.stringify(actionsUsed()));
      check("Add New never looks the serial up in Zoho",actionsUsed().indexOf("find_equipment")<0,JSON.stringify(actionsUsed()));
      check("Add New never asks about a duplicate serial",confirms.length===0,confirms.join(" | "));
      check("Add New returns the new record id",id==="7788990011223344",String(id));
      check("Add New keeps the serial the technician typed",calls[0]&&calls[0].equipment&&calls[0].equipment.Serial_Number==="SN-1001",JSON.stringify(calls[0]&&calls[0].equipment));
    })
    .then(function(){
      calls=[];confirms=[];assetState=freshState("1234567890123456");
      return saveEquipmentRecord();
    })
    .then(function(id){
      check("A loaded asset is still updated",actionsUsed().indexOf("update_equipment")>=0&&actionsUsed().indexOf("create_equipment")<0,JSON.stringify(actionsUsed()));
      check("The update targets the loaded record",calls[0]&&calls[0].equipment_id==="1234567890123456",JSON.stringify(calls[0]&&calls[0].equipment_id));
      check("The update returns the loaded record id",id==="1234567890123456",String(id));
    })
    .then(function(){
      var msg="";
      try{
        equipmentSaveError({data:[{code:"DUPLICATE_DATA",status:"error",message:"duplicate data",details:{api_name:"Serial_Number"}}]},200,"");
      }catch(e){msg=e.message;}
      check("A Zoho unique-field rejection names the field",/Serial_Number/.test(msg),msg);
      check("A Zoho unique-field rejection says where to turn it off",/unique/i.test(msg)&&/Zoho/.test(msg),msg);
      var other="";
      try{
        equipmentSaveError({data:[{code:"MANDATORY_NOT_FOUND",status:"error",message:"required field not found",details:{api_name:"Asset_Category"}}]},200,"");
      }catch(e){other=e.message;}
      check("Other Zoho errors keep their own wording",/required field not found/.test(other)&&/Asset_Category/.test(other),other);
    })
    .then(function(){
      check("The serial upsert helper is gone",src.indexOf("findExistingEquipmentBySerial")<0);
      check("The duplicate-serial prompt is gone",src.indexOf("already exists for this account")<0);
    });
}

run().then(function(){
  console.log((failed?"FAILED":"PASSED")+": "+passed+" passed, "+failed+" failed");
  process.exit(failed?1:0);
},function(e){
  console.error("ERROR: "+(e&&e.stack||e));
  process.exit(1);
});
