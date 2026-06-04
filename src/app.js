var PROXY="https://dulcet-sherbet-40f8f6.netlify.app/.netlify/functions/zoho-proxy";
var API_KEY="";
var ZOHO_ACCESS="1000.39fd57b7add67f6ba0e4d91e6ca20e3a.70c26aa136b9f09533b93cdd5c5a092b";
var ZOHO_REFRESH="1000.af6da2ff9d130330225e2ab88148fb79.980d490ffc49507250b6ed925f534a45";
var ZOHO_CLIENT="1000.YXEEB4LIVO90TM5SOFP1IXNF3Z8NMT";
var ZOHO_SECRET="4a11be5bd1410d4678d7d45b2444bf1ca5f8db5dc6";
var WORKDRIVE_FOLDER="t16759780cbaabd3647cf897be2931dfa11ae";
var WORKDRIVE_FOLDER_URL="https://workdrive.zoho.com/folder/"+WORKDRIVE_FOLDER;
var UPLOAD_FETCH_MS=50000;
var UPLOAD_WAIT_MS=70000;
var VIDEO_MAX_BYTES=2*1024*1024;
var ZOHO_FETCH_MS=20000;
var SEC_LABELS=["1. Site Visit Summary","2. Equipment / Systems Serviced","3. Work Performed","4. Calibration Results & Readings","5. Findings & Observations","6. Issues / Deficiencies","7. Recommendations & Next Steps","8. Follow-Up Required","9. Materials / Parts Used"];
var SEC_IDS=["sec1","sec2","sec3","sec4","sec5","sec6","sec7","sec8","sec9"];
var SORT_FIELDS=[{k:"Account_Name",l:"Account"},{k:"Deal_Name",l:"Deal"},{k:"Stage",l:"Stage"},{k:"Amount",l:"Amount"},{k:"Closing_Date",l:"Date"}];
var VOICE_CORRECTIONS=[
  {from:/quinton/gi,to:"Quintin",label:"quinton"},
  {from:/quentin/gi,to:"Quintin",label:"quentin"},
  {from:/quinn tin/gi,to:"Quintin",label:"quinn tin"}
];
function applyCorrections(t){VOICE_CORRECTIONS.forEach(function(c){t=t.replace(c.from,c.to);});return t;}

var A={deals:[],sel:null,photos:[],location:null,report:"",reportPhotos:[],reportTechnician:"",dealPdfAttached:false,zohoToken:ZOHO_ACCESS,recording:false,paused:false,stream:null,mRec:null,videoChunks:[],videoBlob:null,inclPhotos:true,sortF:"Account_Name",sortD:"asc",recordAudio:false,autoSaveZoho:true,savingToZoho:false,currentHistoryId:null,zohoNoteId:null,technician:"",equipmentConfig:null,assetReqHandlersBound:false,asset:{photos:[],lastUploadedPhotoFingerprints:{},saving:false,saved:false,currentAssetId:null,activeDealKey:"",searchResults:[],loadedOriginal:null,replacementMode:false,savedItems:[]}};
var FP_VERSION="156";
var FP_VERSION_CHECK_URL="https://raw.githubusercontent.com/BJWCAC/fieldpro/main/src/app.js";

function appBaseUrl(){
  var p=location.pathname||"";
  if(p.indexOf("FieldPro.html")>=0)return location.origin+p;
  return "https://BJWCAC.github.io/fieldpro/FieldPro.html";
}
function parseUrlBuild(){
  try{var m=location.search.match(/[?&]v=(\d+)/);return m?parseInt(m[1],10):0;}catch(e){return 0;}
}
function parseBuildVer(txt){
  var m=String(txt||"").match(/FP_VERSION="(\d+)"/);
  return m?parseInt(m[1],10):0;
}
async function checkForAppUpdate(){
  try{
    if(sessionStorage.getItem("fp_update_skip")==="1")return false;
    var local=parseInt(FP_VERSION,10)||0;
    var guardKey="fp_reload_"+local;
    if(sessionStorage.getItem(guardKey))return false;
    var r=await fetch(FP_VERSION_CHECK_URL+"?fpchk="+Date.now(),{cache:"no-store"});
    if(!r.ok)return false;
    var remote=parseBuildVer(await r.text());
    if(!remote||remote<=local)return false;
    sessionStorage.setItem(guardKey,"1");
    location.replace(appBaseUrl()+"?v="+remote+"&_cb="+Date.now());
    return true;
  }catch(e){console.log("update check:",e);return false;}
}
function el(id){return document.getElementById(id);}
function go(n){
  ["deals","capture","assets","report","history","settings"].forEach(function(x){
    var p=el("p-"+x),t=el("t-"+x);
    if(p)p.classList.toggle("on",x===n);
    if(t)t.classList.toggle("on",x===n);
  });
  if(n==="assets"&&typeof renderAssetForm==="function")renderAssetForm();
  if(n==="history"&&typeof renderHistory==="function")renderHistory();
  if(n==="settings"){if(typeof updateStorageInfo==="function")updateStorageInfo();if(typeof renderCorrections==="function")renderCorrections();if(typeof setTechnicianUI==="function")setTechnicianUI();}
}
function badge(id,n){var e=el(id);if(!e)return;e.textContent=n||"";e.style.display=n?"inline":"none";}
function esc(s){if(!s)return"";if(typeof s==="object")s=s.name||s.id||"";return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");}
function fmtAmt(a){return a?"$"+Number(a).toLocaleString():"";}
function ownerStr(d){return typeof d.Owner==="string"?d.Owner:(d.Owner&&d.Owner.name)||"";}
function showEl(id,d){var e=el(id);if(e)e.style.display=(d||"block");}
function hideEl(id){var e=el(id);if(e)e.style.display="none";}
function dealHeaderText(d){
  if(!d)return"";
  var acct=d.Account_Name||"",deal=d.Deal_Name||"";
  return acct&&deal?acct+" — "+deal:(deal||acct);
}
function setHeaderDeal(d){
  var hdn=el("hdr-deal-name");if(!hdn)return;
  var txt=dealHeaderText(d);
  hdn.textContent=txt;hdn.style.display=txt?"block":"none";
}
function updateReportContext(){
  var acct=el("ctx-account"),deal=el("ctx-deal"),gps=el("ctx-gps"),site=el("ctx-site");
  if(acct)acct.value=A.sel?(A.sel.Account_Name||""):"";
  if(deal)deal.value=A.sel?(A.sel.Deal_Name||""):"";
  if(gps)gps.value=A.location?(A.location.lat.toFixed(6)+", "+A.location.lng.toFixed(6)):"";
  if(site)site.value=A.location?(A.location.address||""):"";
}
function updateLocationUI(){
  if(A.location){
    updLocUI();
    var lbtn=el("loc-btn");if(lbtn)lbtn.textContent="REFRESH";
    var vg=el("vb-gps");if(vg){vg.textContent=A.location.lat.toFixed(4)+","+A.location.lng.toFixed(4);showEl("vb-gps");}
    showEl("hb-gps");
  }else{
    var lb=el("loc-body");if(lb)lb.innerHTML="Tap Get Location to capture GPS";
    var btn=el("loc-btn");if(btn)btn.textContent="GET LOCATION";
    hideEl("hb-gps");hideEl("vb-gps");
    updateReportContext();
  }
}
function updateDealUI(){
  var da=el("db-acct"),di=el("db-info");
  if(A.sel){
    showEl("deal-bar");hideEl("no-deal-bar");
    if(da)da.textContent=A.sel.Account_Name||"";
    if(di)di.textContent=(A.sel.Deal_Name||"")+(A.sel.Stage?" — "+A.sel.Stage:"")+(A.sel.Closing_Date?" — "+A.sel.Closing_Date:"");
  }else{
    hideEl("deal-bar");showEl("no-deal-bar");
    if(da)da.textContent="";if(di)di.textContent="";
  }
  setHeaderDeal(A.sel);
  updateReportContext();
  if(el("asset-account")){setAssetInput("asset-account",A.sel?A.sel.Account_Name:"");}
}
function locationMeta(){
  return A.location?{lat:A.location.lat,lng:A.location.lng,accuracy:A.location.accuracy||null,address:A.location.address||null}:null;
}
function restoreLocationFromRecord(r){
  if(r&&r.locationData&&typeof r.locationData.lat==="number"&&typeof r.locationData.lng==="number"){
    return{lat:r.locationData.lat,lng:r.locationData.lng,accuracy:r.locationData.accuracy||null,address:r.locationData.address||null};
  }
  if(r&&r.location){
    var m=String(r.location).match(/(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/);
    if(m)return{lat:parseFloat(m[1]),lng:parseFloat(m[2]),accuracy:null,address:null};
  }
  return null;
}
function dealFromRecord(r){
  if(!r)return null;
  if(r.dealId){
    var d=A.deals.find(function(x){return x.id===r.dealId;});
    if(d)return d;
  }
  if(r.account==="No deal"&&!r.deal&&!r.dealId)return null;
  if(r.account||r.deal||r.stage)return{id:r.dealId||("hist-"+r.id),Account_Name:r.account||"",Deal_Name:r.deal||"",Stage:r.stage||"",Amount:r.amount||null,Closing_Date:r.closingDate||""};
  return null;
}
function currentHistoryIndex(){
  if(!A.currentHistoryId)return -1;
  var h=getHistory();
  for(var i=0;i<h.length;i++){if(h[i].id===A.currentHistoryId)return i;}
  return -1;
}
function saveOrUpdateHistory(meta){
  if(A.currentHistoryId){
    var h=getHistory(),idx=-1;
    for(var i=0;i<h.length;i++){if(h[i].id===A.currentHistoryId){idx=i;break;}}
    if(idx>=0){
      h[idx]=Object.assign({},h[idx],meta,{id:A.currentHistoryId,zohoNoteId:A.zohoNoteId||meta.zohoNoteId||h[idx].zohoNoteId||null});
      try{localStorage.setItem("fp_history",JSON.stringify(h));}catch(e){}
      badge("tb-hist",h.filter(function(r){return!r.archived;}).length||"");
      renderHistory();
      return h[idx];
    }
  }
  A.currentHistoryId=meta.id;
  saveHistory(meta);
  return meta;
}
function updateCurrentHistory(fields){
  var h=getHistory(),idx=currentHistoryIndex();
  if(idx<0&&h.length>0)idx=0;
  if(idx<0)return;
  h[idx]=Object.assign({},h[idx],fields);
  A.currentHistoryId=h[idx].id;
  if(Object.prototype.hasOwnProperty.call(fields,"zohoNoteId"))A.zohoNoteId=fields.zohoNoteId||null;
  try{localStorage.setItem("fp_history",JSON.stringify(h));}catch(e){}
  renderHistory();
}
function zohoNoteIdFromResponse(d){
  var rec=d&&d.data&&d.data[0];
  return rec&&(rec.details&&rec.details.id||rec.id)||null;
}
function isStaleZohoNoteError(status,body){
  var t=String(body||"").toLowerCase().trim();
  return status===404||(status===400&&(!t||t.indexOf("invalid_data")>=0||t.indexOf("not found")>=0||t.indexOf("invalid")>=0));
}
function zohoReportMarker(){return A.currentHistoryId?("CapStone Report ID: "+A.currentHistoryId):"";}
function zohoNoteTitle(){
  return "CapStone Report — "+A.sel.Account_Name+" — "+new Date().toLocaleDateString();
}
async function findExistingZohoNote(){
  if(A.zohoNoteId||!A.sel)return A.zohoNoteId||null;
  var marker=zohoReportMarker();
  if(!marker)return null;
  var r=await fetch(PROXY,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"find_note",token:A.zohoToken||ZOHO_ACCESS,deal_id:A.sel.id,note_title:zohoNoteTitle(),marker:marker})});
  if(!r.ok)return null;
  var d={};try{d=await r.json();}catch(e){}
  if(d&&d.note_id){A.zohoNoteId=d.note_id;return A.zohoNoteId;}
  return null;
}
var toastTimer=null;
function showToast(msg,ms){
  var t=el("toast");if(!t)return;
  if(toastTimer)clearTimeout(toastTimer);
  t.textContent=msg;t.classList.add("show");
  toastTimer=setTimeout(function(){t.classList.remove("show");toastTimer=null;},ms||3500);
}
function setTechnicianUI(){
  ["tech-select","tech-prompt-select"].forEach(function(id){var e=el(id);if(e)e.value=A.technician||"";});
  var err=el("tech-prompt-err");if(err)err.textContent="";
}
function saveTechnicianSetting(v){
  A.technician=v||"";
  try{localStorage.setItem("fp_technician",A.technician);}catch(e){}
  setTechnicianUI();
  showToast(A.technician?("Technician: "+A.technician):"Technician cleared",2000);
}
function currentTechnicianName(){return(A.reportTechnician||A.technician||"").trim();}
function technicianDisplayName(){return currentTechnicianName()||"Not selected";}
function setReportTechnician(v){A.reportTechnician=(v||A.technician||"").trim();}
function openTechnicianPrompt(){
  var m=el("techmodal");if(!m)return;
  setTechnicianUI();
  m.style.display="flex";
  var s=el("tech-prompt-select");if(s){try{s.focus();}catch(e){}}
}
function closeTechnicianPrompt(){var m=el("techmodal");if(m)m.style.display="none";}
function dismissTechnicianPrompt(){
  try{sessionStorage.setItem("fp_technician_prompt_skipped","1");}catch(e){}
  closeTechnicianPrompt();
  showToast("Choose technician anytime in Settings",3000);
}
function saveTechnicianPrompt(){
  var s=el("tech-prompt-select"),err=el("tech-prompt-err"),v=(s&&s.value||"").trim();
  if(!v){if(err)err.textContent="Select a technician to continue, or tap Later.";return;}
  saveTechnicianSetting(v);
  closeTechnicianPrompt();
}
function maybePromptForTechnician(){
  if(A.technician)return;
  try{if(sessionStorage.getItem("fp_technician_prompt_skipped")==="1")return;}catch(e){}
  setTimeout(openTechnicianPrompt,250);
}
function setKeyUI(on){var b=el("key-btn");if(!b)return;b.textContent=on?"KEY SET":"KEY";b.style.color=on?"var(--green)":"var(--dim)";b.style.borderColor=on?"var(--green)":"var(--bdr)";b.style.background=on?"#051a18":"transparent";}
function closeKeyModal(){var m=el("keymodal");if(m)m.style.display="none";}
function enterKey(){
  var m=el("keymodal"),inp=el("key-in"),err=el("key-err");
  if(!m){
    var k=prompt("Paste your Anthropic API key:");
    if(!k)return;k=k.trim();
    if(!k.startsWith("sk-ant")){alert("Key should start with sk-ant-");return;}
    API_KEY=k;try{localStorage.setItem("fp_api_key",k);}catch(e){alert("Could not save key");return;}
    setKeyUI(true);showToast("API key saved",2000);return;
  }
  if(err)err.textContent="";
  var saved="";try{saved=localStorage.getItem("fp_api_key")||"";}catch(e){}
  if(inp)inp.value=saved||API_KEY||"";
  m.style.display="flex";
  if(inp){try{inp.focus();}catch(e){}}
}
function saveApiKey(){
  var inp=el("key-in"),err=el("key-err");
  var k=(inp&&inp.value||"").trim();
  if(!k){if(err)err.textContent="Paste your API key first";return;}
  if(!k.startsWith("sk-ant")){if(err)err.textContent="Key must start with sk-ant-";return;}
  API_KEY=k;
  try{localStorage.setItem("fp_api_key",k);}catch(e){if(err)err.textContent="Could not save: "+e.message;return;}
  setKeyUI(true);closeKeyModal();showToast("API key saved",3000);
}
function showDealsErr(msg){
  var d=el("deals-err");if(!d)return;
  if(msg){d.textContent=msg;d.style.display="block";}else d.style.display="none";
}
function resetDealsUI(){
  var btn=el("ref-btn");if(btn){btn.disabled=false;btn.textContent="Refresh from Zoho";}
  showDealsErr("");
  var sm=el("sync-msg");
  if(A.deals&&A.deals.length){
    if(sm){sm.textContent=A.deals.length+" deals (cached) — tap Refresh to update";sm.style.color="var(--dim)";}
    if(typeof renderDeals==="function")renderDeals();
  }else if(sm){sm.textContent="Tap Refresh to load deals from Zoho";sm.style.color="var(--dim)";}
}
function loadDealsFromCache(){
  var sd=localStorage.getItem("fp_deals");
  if(!sd)return 0;
  var p=JSON.parse(sd);
  if(!p||!p.length)return 0;
  var strVal=function(v){if(!v)return"";if(typeof v==="object")return v.name||v.id||"";return String(v);};
  p=p.map(function(d){return{id:d.id,Deal_Name:strVal(d.Deal_Name),Account_Name:strVal(d.Account_Name),Account_Id:d.Account_Id||"",Stage:strVal(d.Stage),Amount:d.Amount||null,Description:strVal(d.Description),Owner:strVal(d.Owner),Closing_Date:strVal(d.Closing_Date)};});
  A.deals=p;
  if(typeof renderDeals==="function")renderDeals();
  badge("tb-deals",p.length);
  return p.length;
}
function clearDealCache(){try{localStorage.removeItem("fp_deals");}catch(e){}A.deals=[];resetDealsUI();showToast("Deal cache cleared",2000);}
function bootApp(){
  try{
    var sm=el("sync-msg");if(sm){sm.textContent="Starting CapStone v"+FP_VERSION+"...";sm.style.color="var(--dim)";}
    A.technician=localStorage.getItem("fp_technician")||"";
    var k=localStorage.getItem("fp_api_key");
    if(k&&k.startsWith("sk-ant")){API_KEY=k;setKeyUI(true);}else setKeyUI(false);
    if(localStorage.getItem("fp_theme")==="light"){document.body.classList.add("light");var td=el("tog-dark");if(td)td.classList.remove("on");}
    if(localStorage.getItem("fp_record_audio")==="1"){A.recordAudio=true;var rt=el("audio-tog");if(rt)rt.classList.add("on");}
    A.autoSaveZoho=localStorage.getItem("fp_auto_save_zoho")!=="0";
    var az=el("tog-auto-zoho");if(az)az.classList.toggle("on",A.autoSaveZoho);setTechnicianUI();
    if(typeof renderHistory==="function")renderHistory();
    try{
      var n=loadDealsFromCache();
      if(sm){sm.textContent=n?n+" deals from cache — tap Refresh to update":"Tap Refresh to load deals from Zoho";sm.style.color="var(--dim)";}
    }catch(e){
      try{localStorage.removeItem("fp_deals");}catch(e2){}
      if(sm){sm.textContent="Deal cache reset — tap Refresh from Zoho";sm.style.color="var(--red)";}
      showDealsErr("Deal cache was reset: "+e.message);
    }
    go("deals");
    var fv=el("fp-ver");if(fv)fv.textContent=FP_VERSION;
    var hv=el("hdr-ver");if(hv)hv.textContent="v"+FP_VERSION;
    maybePromptForTechnician();
  }catch(e){
    showDealsErr("CapStone failed to start: "+e.message);
    alert("CapStone failed to start: "+e.message+"\n\nTry: Settings → Reset App Cache, or clear browser data for this site.");
  }
}
async function startCapStone(){
  if(await checkForAppUpdate())return;
  bootApp();
}
window.onload=startCapStone;
window.enterKey=enterKey;
window.saveApiKey=saveApiKey;
window.closeKeyModal=closeKeyModal;
window.dismissTechnicianPrompt=dismissTechnicianPrompt;
window.saveTechnicianPrompt=saveTechnicianPrompt;
window.go=go;
window.saveTechnicianSetting=saveTechnicianSetting;
window.assetPhotoSelected=assetPhotoSelected;
window.extractAssetFromPhoto=extractAssetFromPhoto;
window.saveAssetToZoho=saveAssetToZoho;
window.resetAssetFormForNext=resetAssetFormForNext;
window.searchExistingAssets=searchExistingAssets;
window.searchAssetByCurrentField=searchAssetByCurrentField;
window.loadExistingAssetFromSearch=loadExistingAssetFromSearch;
window.startAssetReplacement=startAssetReplacement;
function showUploadStatus(msg,isErr){
  var u=el("upload-status");if(!u)return;
  if(msg){u.textContent=msg;u.style.display="block";u.style.borderColor=isErr?"#ef4444":"#006050";u.style.color=isErr?"#fca5a5":"var(--amber)";}
  else u.style.display="none";
}
function fetchTimeoutMessage(ms){return "Request timed out after "+Math.round(ms/1000)+"s";}
function fetchWithTimeout(url,opts,ms){
  ms=ms||UPLOAD_FETCH_MS;
  opts=opts||{};
  if(typeof AbortController!=="undefined"){
    var ac=new AbortController();
    var timer=setTimeout(function(){try{ac.abort(fetchTimeoutMessage(ms));}catch(e){ac.abort();}},ms);
    var o={method:opts.method,headers:opts.headers,body:opts.body,signal:ac.signal};
    return fetch(url,o).then(function(r){clearTimeout(timer);return r;},function(e){
      clearTimeout(timer);
      var msg=String((e&&e.message)||e||"");
      if(e&&e.name==="AbortError"||msg.indexOf("aborted")>=0||msg.indexOf("abort")>=0)throw new Error(fetchTimeoutMessage(ms));
      throw e;
    });
  }
  return Promise.race([
    fetch(url,opts),
    new Promise(function(resolve,reject){
      setTimeout(function(){reject(new Error(fetchTimeoutMessage(ms)));},ms);
    })
  ]);
}
function waitMs(ms){return new Promise(function(r){setTimeout(r,ms);});}
async function waitForUploads(ms){
  if(!A.uploadPromise)return{timedOut:false};
  try{
    await Promise.race([A.uploadPromise,waitMs(ms).then(function(){throw new Error("__upload_wait_timeout__");})]);
    return{timedOut:false};
  }catch(e){
    if(e&&e.message==="__upload_wait_timeout__")return{timedOut:true};
    console.log("Upload wait error:",e);
    return{timedOut:false};
  }
}
function toggleDark(){var isD=!document.body.classList.contains("light");document.body.classList.toggle("light",isD);var td=el("tog-dark");if(td)td.classList.toggle("on",!isD);localStorage.setItem("fp_theme",isD?"light":"dark");}
function toggleAutoSaveZoho(){
  A.autoSaveZoho=!A.autoSaveZoho;
  var t=el("tog-auto-zoho");if(t)t.classList.toggle("on",A.autoSaveZoho);
  try{localStorage.setItem("fp_auto_save_zoho",A.autoSaveZoho?"1":"0");}catch(e){}
  showToast(A.autoSaveZoho?"Auto-save to Zoho ON":"Auto-save to Zoho OFF",2500);
}
function syncTx(){var t2=el("tx2"),t=el("tx");if(t2&&t)t.value=t2.value;checkGen();}
function clearWorkDriveFolderCache(){
  try{
    var keys=[];
    for(var i=0;i<localStorage.length;i++){
      var k=localStorage.key(i);
      if(k&&k.indexOf("fp_wd_folder_")===0)keys.push(k);
    }
    keys.forEach(function(k){localStorage.removeItem(k);});
    showToast("WorkDrive folder cache cleared ("+keys.length+")",3000);
  }catch(e){showToast("Could not clear folder cache",3000);}
}
function resetAppCache(){
  if(!confirm("Reset CapStone on this device? Clears cached deals and WorkDrive folder IDs, then reloads."))return;
  try{localStorage.removeItem("fp_deals");}catch(e){}
  clearWorkDriveFolderCache();
  location.reload();
}

function newProject(){
  if((A.photos.length>0||(el("tx")&&el("tx").value.trim()))&&!confirm("Start new project? Current work saved to History."))return;
  if(A.report)saveCurrentToHistory();
  clearCapture();go("capture");
}
function clearCapture(){
  A.photos=[];A.reportPhotos=[];A.reportTechnician="";A.dealPdfAttached=false;A.location=null;A.report="";A.sel=null;A.videoBlob=null;A.videoChunks=[];A.workdrivePdfUrl=null;A.currentHistoryId=null;A.zohoNoteId=null;
  var pc=el("photo-cards");if(pc)pc.innerHTML="";
  if(el("tx"))el("tx").value="";if(el("tx2"))el("tx2").value="";
  SEC_IDS.forEach(function(id){var e=el(id);if(e)e.value="";});
  var lb=el("loc-body");if(lb)lb.innerHTML="Tap Get Location to capture GPS";
  var lbtn=el("loc-btn");if(lbtn)lbtn.textContent="GET LOCATION";
  hideEl("hb-gps");hideEl("vb-gps");hideEl("vb-pc");
  updateDealUI();
  hideEl("video-save-bar");
  badge("tb-photos","");
  if(el("gen-btn"))el("gen-btn").style.display="none";
  if(el("gen-summary"))el("gen-summary").style.display="none";
  hideEl("rpt-content");showEl("rpt-empty");
  if(A.recording)stopCam();
}
function saveCurrentToHistory(){
  var vn=(el("tx")||{value:""}).value;
  var sd={};SEC_IDS.forEach(function(id){var e=el(id);if(e)sd[id]=e.value;});
  var sp=A.photos.map(function(p){return{id:p.id,display:p.display,desc:p.desc||"",time:p.time,w:p.w||0,h:p.h||0,aiDesc:p.aiDesc||"",synthesis:p.synthesis||""};});
  saveOrUpdateHistory({id:A.currentHistoryId||("r"+Date.now()),date:new Date().toISOString(),account:A.sel?A.sel.Account_Name:"No deal",deal:A.sel?(A.sel.Deal_Name||""):"",stage:A.sel?(A.sel.Stage||""):"",location:A.location?(A.location.address||A.location.lat.toFixed(4)+","+A.location.lng.toFixed(4)):"",locationData:locationMeta(),photos:A.photos.length,photoData:sp,sections:sd,report:A.report,voiceNotes:vn,technician:currentTechnicianName(),dealPdfAttached:!!A.dealPdfAttached,dealId:A.sel?A.sel.id:null,zohoNoteId:A.zohoNoteId||null});
}

// ZOHO
async function refreshZohoToken(){
  var r=await fetchWithTimeout(PROXY,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"refresh_token",refresh_token:ZOHO_REFRESH,client_id:ZOHO_CLIENT,client_secret:ZOHO_SECRET})},30000);
  var d=await r.json();if(d.access_token){A.zohoToken=d.access_token;return true;}return false;
}
async function loadDeals(){
  var btn=el("ref-btn");if(btn){btn.disabled=true;btn.textContent="Syncing...";}
  var sm=el("sync-msg");showDealsErr("");
  if(sm){sm.textContent="Connecting to Zoho CRM (20s timeout)...";sm.style.color="var(--dim)";}
  try{
    var tokOk=await refreshZohoToken();
    if(!tokOk)throw new Error("Zoho token refresh failed — proxy or credentials");
    var allDeals=[],page=1,hasMore=true;
    while(hasMore&&page<=10){
      var r=await fetchWithTimeout(PROXY,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"get_deals",token:A.zohoToken,page:page})},ZOHO_FETCH_MS);
      if(!r.ok){if(r.status===401){await refreshZohoToken();r=await fetchWithTimeout(PROXY,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"get_deals",token:A.zohoToken,page:page})},ZOHO_FETCH_MS);if(!r.ok)throw new Error("Zoho auth failed");}else throw new Error("Proxy error "+r.status);}
      var d=await r.json();
      function str(v){if(!v)return"";if(typeof v==="object")return v.name||v.id||"";return String(v);}
      (d.data||[]).forEach(function(rec){allDeals.push({id:rec.id,Deal_Name:str(rec.Deal_Name),Account_Name:str(rec.Account_Name),Account_Id:(rec.Account_Name&&rec.Account_Name.id)||"",Stage:str(rec.Stage),Amount:rec.Amount||null,Description:str(rec.Description),Owner:str(rec.Owner&&rec.Owner.name?rec.Owner.name:rec.Owner),Closing_Date:str(rec.Closing_Date)});});
      hasMore=d.info&&d.info.more_records;page++;
      if(sm)sm.textContent="Loading deals... page "+page+" ("+allDeals.length+" so far)";
    }
    if(allDeals.length){A.deals=allDeals;localStorage.setItem("fp_deals",JSON.stringify(allDeals));if(sm){sm.textContent=allDeals.length+" deals loaded — "+new Date().toLocaleTimeString();sm.style.color="var(--green)";}renderDeals();badge("tb-deals",allDeals.length);}
    else{if(sm){sm.textContent="No deals found in Zoho";sm.style.color="var(--amber)";}}
  }catch(e){
    if(sm){sm.textContent="Zoho error: "+e.message;sm.style.color="var(--red)";}
    showDealsErr("Could not load deals: "+e.message+". API key is only for AI reports — tap Refresh from Zoho for deals.");
    try{
      var n=loadDealsFromCache();
      if(n&&sm){sm.textContent=n+" cached deals shown — Zoho sync failed above";sm.style.color="var(--amber)";}
    }catch(e2){}
  }finally{
    if(btn){btn.disabled=false;btn.textContent="Refresh from Zoho";}
  }
}

// DEALS UI
function renderDeals(){
  if(!A.deals.length){hideEl("filter-area");el("deals-list").innerHTML="<div class='empty'><div class='e-icon'>&#128452;</div><div class='e-title'>No Deals</div><div class='e-sub'>Tap Refresh or Import CSV</div></div>";return;}
  showEl("filter-area");
  var accounts=Array.from(new Set(A.deals.map(function(d){return d.Account_Name;}).filter(Boolean))).sort();
  var stages=Array.from(new Set(A.deals.map(function(d){return d.Stage;}).filter(Boolean))).sort();
  var fA=el("f-acct"),fS=el("f-stage");var ca=fA?fA.value:"",cs=fS?fS.value:"";
  if(fA)fA.innerHTML="<option value=''>All Accounts</option>"+accounts.map(function(a){return"<option value='"+esc(a)+"'>"+esc(a)+"</option>";}).join("");
  if(fS)fS.innerHTML="<option value=''>All Stages</option>"+stages.map(function(s){return"<option value='"+esc(s)+"'>"+esc(s)+"</option>";}).join("");
  if(fA)fA.value=ca;if(fS)fS.value=cs;
  var sb=el("sort-bar");if(sb){sb.innerHTML="";SORT_FIELDS.forEach(function(f){var btn=document.createElement("button");btn.className="sbtn"+(A.sortF===f.k?" on":"");btn.textContent=f.l+(A.sortF===f.k?(A.sortD==="asc"?" A":" D"):"");(function(fk){btn.onclick=function(){setSort(fk);};})(f.k);sb.appendChild(btn);});}
  applyFilters();
}
function applyFilters(){
  var q=(el("f-search")||{value:""}).value.toLowerCase();
  var acct=(el("f-acct")||{value:""}).value;var stage=(el("f-stage")||{value:""}).value;
  var filtered=A.deals.filter(function(d){return(!q||(d.Account_Name||"").toLowerCase().indexOf(q)>=0||(d.Description||"").toLowerCase().indexOf(q)>=0||(d.Deal_Name||"").toLowerCase().indexOf(q)>=0)&&(!acct||(d.Account_Name||"")===acct)&&(!stage||(d.Stage||"")===stage);}).sort(function(a,b){var va=a[A.sortF]||"",vb=b[A.sortF]||"";if(A.sortF==="Amount"){va=parseFloat(va)||0;vb=parseFloat(vb)||0;return A.sortD==="asc"?va-vb:vb-va;}return A.sortD==="asc"?String(va).localeCompare(String(vb)):String(vb).localeCompare(String(va));});
  var dc=el("deal-count");if(dc)dc.textContent=filtered.length+" of "+A.deals.length+" deals";
  var dl=el("deals-list");if(!dl)return;dl.innerHTML="";
  filtered.forEach(function(d){
    var sel=A.sel&&A.sel.id===d.id;var amt=fmtAmt(d.Amount);var own=ownerStr(d);
    var dc2=document.createElement("div");dc2.className="deal-card"+(sel?" sel":"");
    (function(did){dc2.onclick=function(){selectDeal(did);};})(d.id);
    dc2.innerHTML="<div style='display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:2px'><div class='d-acct'>"+esc(d.Account_Name||"---")+"</div>"+(amt?"<div style='color:var(--green);font-weight:700;font-size:13px;flex-shrink:0;margin-left:8px'>"+amt+"</div>":"")+"</div><div class='d-deal'>"+esc(d.Deal_Name||"")+"</div><div class='d-meta'><span class='stage-pill'>"+esc(d.Stage||"")+"</span>"+(own?"<span style='font-size:11px;color:var(--dim)'>"+esc(own)+"</span>":"")+(d.Closing_Date?"<span style='font-size:11px;color:var(--dim)'>"+d.Closing_Date+"</span>":"")+"</div>"+(d.Description?"<div class='d-desc'>"+esc(d.Description)+"</div>":"");
    dl.appendChild(dc2);
  });
}
function setSort(f){if(A.sortF===f)A.sortD=A.sortD==="asc"?"desc":"asc";else{A.sortF=f;A.sortD="asc";}renderDeals();}
function selectDeal(id){
  var d=A.deals.find(function(x){return x.id===id;});if(!d)return;
  var prevDealId=A.sel&&A.sel.id;
  if(prevDealId&&prevDealId!==id){A.currentHistoryId=null;A.zohoNoteId=null;}
  A.sel=d;
  if(prevDealId&&prevDealId!==id&&typeof resetAssetContextForSelectedDeal==="function")resetAssetContextForSelectedDeal("Asset form cleared for the newly selected deal.");
  A.workdriveFolderUrl=null;
  try{
    var cf=localStorage.getItem("fp_wd_folder_"+d.id);
    if(cf){var cj=JSON.parse(cf);if(cj.folder_id&&cj.folder_id!==WORKDRIVE_FOLDER&&cj.folder_url)A.workdriveFolderUrl=cj.folder_url;}
  }catch(e){}
  updateDealUI();
  applyFilters();
  go("capture");
  setTimeout(function(){window.scrollTo({top:0,behavior:"smooth"});},50);
}
function importCSV(input){
  var file=input.files[0];if(!file)return;
  var reader=new FileReader();
  reader.onload=function(e){
    var lines=e.target.result.split(/\r?\n/).filter(function(l){return l.trim();});
    if(lines.length<2){alert("CSV empty");return;}
    var headers=parseCSVLine(lines[0]);var deals=[];
    for(var i=1;i<lines.length;i++){var vals=parseCSVLine(lines[i]);if(!vals.length)continue;var row={};headers.forEach(function(h,idx){row[h.trim()]=(vals[idx]||"").trim();});var deal={id:row["Deal Id"]||("csv-"+i),Deal_Name:row["Deal Name"]||"",Account_Name:row["Account Name"]||"",Account_Id:row["Account Id"]||"",Stage:row["Stage"]||"",Amount:parseFloat(row["Amount"])||null,Description:row["Description"]||"",Owner:row["Deal Owner"]||"",Closing_Date:row["Closing Date"]||null};if(deal.Account_Name||deal.Deal_Name)deals.push(deal);}
    if(deals.length){A.deals=deals;localStorage.setItem("fp_deals",JSON.stringify(deals));var sm=el("sync-msg");if(sm){sm.textContent="Imported "+deals.length+" deals";sm.style.color="var(--green)";}renderDeals();badge("tb-deals",deals.length);}
  };
  reader.readAsText(file);input.value="";
}
function parseCSVLine(l){var res=[],cur="",inQ=false;for(var i=0;i<l.length;i++){var ch=l[i];if(ch==='"')inQ=!inQ;else if(ch===","&&!inQ){res.push(cur);cur="";}else cur+=ch;}res.push(cur);return res;}


// ASSETS / EQUIPMENTS
function assetStatus(msg,isErr){var e=el("asset-status");if(!e)return;if(msg){e.textContent=msg;e.style.display="block";e.style.borderColor=isErr?"#ef4444":"#006050";e.style.color=isErr?"#fca5a5":"var(--amber)";}else e.style.display="none";}
function assetInput(id){var e=el(id);return e?(e.value||"").trim():"";}
function setAssetInput(id,val){var e=el(id);if(e){e.value=val||"";if(id.indexOf("asset-")===0&&id!=="asset-status"&&typeof updateAssetSaveState==="function")setTimeout(updateAssetSaveState,0);}}
function assetPicklists(){return A.equipmentConfig&&A.equipmentConfig.modules&&A.equipmentConfig.modules.Equipments&&A.equipmentConfig.modules.Equipments.picklists||{};}
function assetPicklistValues(field){var p=assetPicklists()[field];return p&&p.values||[];}
function fillAssetSelect(id,field,placeholder){var e=el(id);if(!e)return;var cur=e.value;var vals=assetPicklistValues(field);e.innerHTML="<option value=''>"+(placeholder||"Select")+"</option>"+vals.map(function(v){return"<option value='"+esc(v)+"'>"+esc(v)+"</option>";}).join("");if(cur)e.value=cur;}
async function loadEquipmentConfig(){
  if(A.equipmentConfig)return A.equipmentConfig;
  var r=await fetch("src/config/zohoEquipmentFields.json",{cache:"no-store"});
  if(!r.ok)throw new Error("Could not load equipment field config");
  A.equipmentConfig=await r.json();
  return A.equipmentConfig;
}
function selectedAssetDealKey(){return A.sel?((A.sel.id||"")+":"+(A.sel.Account_Id||"")+":"+(A.sel.Account_Name||"")):"";}
function resetAssetContextForSelectedDeal(msg){
  clearAssetEntryState(msg||"Asset form cleared for the selected deal.");
  A.asset.activeDealKey=selectedAssetDealKey();
}
function ensureAssetContext(){
  var key=selectedAssetDealKey();
  if(key&&A.asset.activeDealKey&&A.asset.activeDealKey!==key){resetAssetContextForSelectedDeal("Asset form cleared for this account/deal.");}
  else if(key&&!A.asset.activeDealKey)A.asset.activeDealKey=key;
}
function renderAssetForm(){
  ensureAssetContext();
  var nd=el("no-deal-assets");if(nd)nd.style.display=A.sel?"none":"flex";
  setAssetInput("asset-account",A.sel?A.sel.Account_Name:"");
  setAssetInput("asset-location",A.location?(A.location.lat.toFixed(6)+", "+A.location.lng.toFixed(6)):"");
  loadEquipmentConfig().then(function(){
    fillAssetSelect("asset-category","Asset_Category","Select category");
    fillAssetSelect("asset-function","Asset_Function","Select function");
    fillAssetSelect("asset-brand","Asset_Brand","Select brand");
    fillAssetSelect("asset-type","Asset_Type","Select type");
    fillAssetSelect("asset-series","Asset_Series","Select series");
    fillAssetSelect("asset-environment","Asset_Environment","Select environment");
    fillAssetSelect("asset-confined","Confined_Space","Select yes/no");
    setupAssetRequiredHandlers();
    updateAssetSaveState();
  }).catch(function(e){assetStatus(e.message,true);});
  renderSavedAssets();
  renderAssetModeBanner();
  var next=el("asset-next-btn");if(next)next.style.display=A.asset.saved?"flex":"none";
}
function renderAssetModeBanner(){
  var b=el("asset-mode-banner");if(!b)return;
  b.style.display="block";
  if(A.asset.currentAssetId){
    b.style.background="#f0fdf4";b.style.border="1px solid #86efac";b.style.color="#166534";
    b.innerHTML="<strong>Update Existing Asset</strong><br>"+esc(assetInput("asset-name")||"Loaded asset")+" will update the existing Equipment record and add a new update note to both the Asset and Deal.";
  }else{
    b.style.background="#fff7ed";b.style.border="1px solid #fdba74";b.style.color="#9a3412";
    b.innerHTML="<strong>Create New Asset</strong><br>Search by serial, model, CAC ID, name, building, or designator before saving if this equipment may already exist.";
  }
}
function assetLookupId(v){if(!v)return"";if(typeof v==="string")return v;return v.id||"";}
function assetLookupName(v){if(!v)return"";if(typeof v==="string")return v;return v.name||v.id||"";}
function originalAssetSnapshot(r){return r?{id:r.id,cacId:r.CAC_Asset_ID||"",name:r.Name||"",account:assetLookupName(r.Account)||"",brand:r.Asset_Brand||"",type:r.Asset_Type||"",model:r.Asset_Model_Number||"",serial:r.Serial_Number||"",series:r.Asset_Series||"",building:r.Building||"",designator:r.Additional_Designator||"",description:r.Description_Instructions||""}:null;}
function assetReplacementHistoryEntries(){
  var txt=(A.asset.loadedOriginal&&A.asset.loadedOriginal.description)||assetInput("asset-description")||"";
  return String(txt).split(/\n\n+/).filter(function(block){return block.indexOf("Replacement recorded by CapStone")>=0;});
}
function renderAssetHistoryPanel(){
  var panel=el("asset-history-panel");if(!panel)return;
  var o=A.asset.loadedOriginal;
  if(!o){panel.style.display="none";panel.innerHTML="";return;}
  var rows=[
    ["AMD/CAC ID",o.cacId||"-"],
    ["Account",o.account||assetInput("asset-account")||"-"],
    ["Current Model",assetInput("asset-model")||o.model||"-"],
    ["Current Serial",assetInput("asset-serial")||o.serial||"-"],
    ["Building",assetInput("asset-building")||o.building||"-"],
    ["Designator",assetInput("asset-designator")||o.designator||"-"]
  ];
  var history=assetReplacementHistoryEntries();
  panel.style.display="block";
  panel.innerHTML="<div class='stitle' style='margin-bottom:6px'>Asset History</div>"+
    rows.map(function(r){return"<div><span style='color:var(--dim)'>"+esc(r[0])+": </span><span style='color:#2d6b60'>"+esc(r[1])+"</span></div>";}).join("")+
    (history.length?"<div style='margin-top:8px;color:var(--dim)'>Replacement Notes</div>"+history.map(function(h){return"<pre style='white-space:pre-wrap;background:#fff;border:1px solid #b2ddd6;border-radius:6px;padding:6px;color:#2d6b60;margin-top:4px'>"+esc(h)+"</pre>";}).join(""):"<div style='margin-top:8px;color:var(--dim)'>No replacement notes recorded yet.</div>");
}
function replacementSummaryText(){
  var o=A.asset.loadedOriginal;if(!o)return"";
  return "Replacing existing asset:<br>Old Brand/Type: "+esc([o.brand,o.type].filter(Boolean).join(" / ")||"-")+"<br>Old Model: "+esc(o.model||"-")+"<br>Old Serial: "+esc(o.serial||"-")+"<br>New Model: "+esc(assetInput("asset-model")||"-")+"<br>New Serial: "+esc(assetInput("asset-serial")||"-");
}
function renderAssetReplacementPanel(){
  var panel=el("asset-replace-panel"),summary=el("asset-replace-summary");
  if(panel)panel.style.display=A.asset.currentAssetId?"block":"none";
  if(summary){summary.style.display=A.asset.replacementMode?"block":"none";summary.innerHTML=A.asset.replacementMode?replacementSummaryText():"";}
  renderAssetHistoryPanel();
}
function startAssetReplacement(){
  if(!A.asset.currentAssetId){assetStatus("Load an existing asset first.",true);return;}
  A.asset.replacementMode=true;
  renderAssetReplacementPanel();
  assetStatus("Replacement mode on. Enter the new instrument model, serial, photos, and notes, then save.",false);
}
function replacementNote(){
  var o=A.asset.loadedOriginal;if(!A.asset.replacementMode||!o)return"";
  var lines=["Replacement recorded by CapStone on "+new Date().toLocaleDateString(),"Previous Model: "+(o.model||""),"Previous Serial: "+(o.serial||""),"Previous Brand: "+(o.brand||""),"Previous Type: "+(o.type||""),"New Model: "+assetInput("asset-model"),"New Serial: "+assetInput("asset-serial"),"New Brand: "+assetInput("asset-brand"),"New Type: "+assetInput("asset-type")];
  return lines.join("\n");
}
function renderAssetSearchResults(){
  var box=el("asset-search-results");if(!box)return;
  if(!A.asset.searchResults.length){box.style.display="block";box.innerHTML="<div style='font-size:12px;color:var(--dim);line-height:1.5'>No matching assets found. If this is new equipment, complete the required fields and save it as a new asset.</div>";return;}
  box.style.display="block";
  box.innerHTML=A.asset.searchResults.map(function(r,i){
    var title=esc(r.CAC_Asset_ID||r.Name||"Asset");
    var meta=[r.Name,r.Asset_Model_Number,r.Serial_Number,r.Building,r.Additional_Designator].filter(Boolean).map(esc).join(" — ");
    return "<div style='border-top:1px solid #b2ddd6;padding:8px 0'><div style='font-family:Barlow Condensed,sans-serif;font-weight:700;color:#2d6b60'>"+title+"</div><div style='font-size:12px;color:var(--dim);line-height:1.5'>"+(meta||"No additional details")+"</div><button type='button' class='bg bsm' onclick='loadExistingAssetFromSearch("+i+")' style='margin-top:6px'>Load Existing Asset</button></div>";
  }).join("");
}
async function searchExistingAssets(){
  try{
    if(!A.sel){assetStatus("Select a deal/account first.",true);return;}
    var q=assetInput("asset-search");if(!q){assetStatus("Enter an AMD/CAC ID, serial, model, name, building, or designator.",true);return;}
    await refreshZohoToken();
    assetStatus("Searching existing assets...",false);
    var r=await fetchWithTimeout(PROXY,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"search_equipment_assets",token:A.zohoToken,account_id:A.sel.Account_Id||"",query:q})},30000);
    var txt=await r.text();if(!r.ok)throw new Error("Asset search "+r.status+": "+txt.substring(0,160));
    var d=JSON.parse(txt);A.asset.searchResults=d.data||[];renderAssetSearchResults();assetStatus(A.asset.searchResults.length?"Select an existing asset to load it for update.":"No matching assets found.",!A.asset.searchResults.length);
  }catch(e){assetStatus("Asset search failed: "+e.message,true);}
}
function searchAssetByCurrentField(id){
  var v=assetInput(id);
  if(!v){assetStatus(id==="asset-serial"?"Enter a serial number first.":"Enter a model number first.",true);return;}
  setAssetInput("asset-search",v);
  searchExistingAssets();
}
function setAssetSelectIfPresent(id,value){var e=el(id);if(!e)return;var v=String(value||"");e.value=v;if(v&&e.value!==v){var opt=document.createElement("option");opt.value=v;opt.textContent=v;e.appendChild(opt);e.value=v;}}
function loadExistingAssetFromSearch(idx){
  var r=A.asset.searchResults[idx];if(!r)return;
  clearAssetEntryState("Loaded existing asset for update.");
  A.asset.currentAssetId=r.id;
  A.asset.loadedOriginal=originalAssetSnapshot(r);
  A.asset.replacementMode=false;
  setAssetInput("asset-name",r.Name||"");
  setAssetSelectIfPresent("asset-category",r.Asset_Category||"");
  setAssetSelectIfPresent("asset-function",r.Asset_Function||"");
  setAssetInput("asset-building",r.Building||"");
  setAssetInput("asset-designator",r.Additional_Designator||"");
  setAssetSelectIfPresent("asset-brand",r.Asset_Brand||"");
  setAssetSelectIfPresent("asset-type",r.Asset_Type||"");
  setAssetInput("asset-brand-other",r.If_Asset_Brand_Other_explain||"");
  setAssetInput("asset-type-other",r.If_Asset_Type_other_explain||"");
  setAssetInput("asset-model",r.Asset_Model_Number||"");
  setAssetInput("asset-serial",r.Serial_Number||"");
  setAssetSelectIfPresent("asset-series",r.Asset_Series||"");
  setAssetInput("asset-series-other",r.If_Asset_Series_is_Other_Function_explain||"");
  setAssetSelectIfPresent("asset-environment",r.Asset_Environment||"");
  setAssetSelectIfPresent("asset-confined",r.Confined_Space||"");
  setAssetInput("asset-description",r.Description_Instructions||"");
  setAssetInput("asset-search",r.CAC_Asset_ID||r.Serial_Number||r.Name||"");
  var box=el("asset-search-results");if(box)box.style.display="none";
  renderAssetReplacementPanel();
  updateAssetSaveState();
}
function assetPhotoFingerprint(dataUrl){
  var s=String(dataUrl||"");
  return s.length+":"+s.slice(0,80)+":"+s.slice(-80);
}
function renderAssetPhotos(){
  var grid=el("asset-photo-grid");if(!grid)return;
  grid.innerHTML=A.asset.photos.map(function(p){return"<img src='"+p.data+"' alt='Asset photo'/>";}).join("");
  if(A.asset.photos.length)showEl("asset-photo-wrap");else hideEl("asset-photo-wrap");
}
function assetPhotosToUpload(){
  return A.asset.photos.filter(function(p){return p.fingerprint&&!A.asset.lastUploadedPhotoFingerprints[p.fingerprint];});
}
function primaryAssetPhoto(){return A.asset.photos[0]||null;}
function assetPhotoSelected(input){
  var files=Array.from(input.files||[]);if(!files.length)return;
  A.asset.saved=false;
  var remaining=files.length;
  files.forEach(function(file){
    var reader=new FileReader();
    reader.onload=function(ev){
      var data=ev.target.result,fp=assetPhotoFingerprint(data);
      A.asset.photos.push({data:data,name:file.name||("asset-nameplate-"+A.asset.photos.length+".jpg"),fingerprint:fp});
      remaining--;if(remaining===0){renderAssetPhotos();assetStatus(A.asset.photos.length+" asset photo(s) ready. AI extraction uses up to the first 3.",false);}
    };
    reader.onerror=function(){remaining--;if(remaining===0)renderAssetPhotos();};
    reader.readAsDataURL(file);
  });
  input.value="";
}
function exactPicklistMatch(field,val){
  val=String(val||"").trim();if(!val)return"";
  var vals=assetPicklistValues(field),low=val.toLowerCase();
  for(var i=0;i<vals.length;i++){if(String(vals[i]).toLowerCase()===low)return vals[i];}
  return"";
}
function applyAssetExtraction(x){
  x=x||{};
  var manufacturer=x.manufacturer||x.brand||"";
  var brand=exactPicklistMatch("Asset_Brand",manufacturer);
  if(brand)setAssetInput("asset-brand",brand);else if(manufacturer){setAssetInput("asset-brand","1 Other");setAssetInput("asset-brand-other",manufacturer);}
  var type=exactPicklistMatch("Asset_Type",x.asset_type||x.equipment_type||"");
  if(type)setAssetInput("asset-type",type);else if(x.asset_type||x.equipment_type){setAssetInput("asset-type","1 Other");setAssetInput("asset-type-other",x.asset_type||x.equipment_type);}
  var series=exactPicklistMatch("Asset_Series",x.series||"");
  if(series)setAssetInput("asset-series",series);else if(x.series){setAssetInput("asset-series","Other");setAssetInput("asset-series-other",x.series);}
  setAssetInput("asset-model",x.model_number||x.model||x.part_number||"");
  setAssetInput("asset-serial",x.serial_number||x.serial||"");
  var nameParts=[];if(manufacturer)nameParts.push(manufacturer);if(x.asset_type||x.equipment_type)nameParts.push(x.asset_type||x.equipment_type);if(x.model_number||x.model)nameParts.push(x.model_number||x.model);
  if(!assetInput("asset-name"))setAssetInput("asset-name",nameParts.join(" "));
  var notes=[];if(x.part_number)notes.push("Part Number: "+x.part_number);if(x.ratings)notes.push("Ratings: "+x.ratings);if(x.visible_text)notes.push("Visible text: "+x.visible_text);
  if(notes.length)setAssetInput("asset-description",notes.join("\n"));
  updateAssetSaveState();
}
function assetJsonCandidate(txt){
  txt=String(txt||"").trim().replace(/^```(?:json)?/i,"").replace(/```$/g,"").trim();
  var start=txt.indexOf("{");if(start<0)return"";
  var depth=0,inStr=false,escp=false;
  for(var i=start;i<txt.length;i++){
    var ch=txt[i];
    if(inStr){if(escp)escp=false;else if(ch==="\\")escp=true;else if(ch==='"')inStr=false;continue;}
    if(ch==='"')inStr=true;
    else if(ch==="{")depth++;
    else if(ch==="}"){depth--;if(depth===0)return txt.slice(start,i+1);}
  }
  return txt.slice(start);
}
function parseAssetJson(txt){
  var raw=assetJsonCandidate(txt);
  if(!raw)throw new Error("AI did not return JSON");
  try{return JSON.parse(raw);}catch(e1){}
  var cleaned=raw.replace(/[“”]/g,'"').replace(/[‘’]/g,"'").replace(/,\s*([}\]])/g,"$1");
  try{return JSON.parse(cleaned);}catch(e2){throw new Error(e2.message+". Raw AI text: "+raw.substring(0,300));}
}
async function parseAssetJsonWithRepair(txt){
  try{return parseAssetJson(txt);}catch(firstErr){
    var repair=[{type:"text",text:"Convert this asset extraction response into valid minified JSON only. Use exactly these keys: manufacturer, asset_type, model_number, part_number, series, serial_number, ratings, visible_text. All values must be strings or null. No markdown.\n\n"+String(txt||"").slice(0,2500)}];
    var repaired=await callAPI({content:repair,maxTok:500,ms:30000});
    try{return parseAssetJson(getText(repaired));}catch(secondErr){throw firstErr;}
  }
}
async function extractAssetFromPhoto(){
  try{
    A.asset.saved=false;
    if(!A.asset.photos.length){assetStatus("Take or upload at least one nameplate photo first.",true);return;}
    if(!API_KEY){enterKey();assetStatus("Add your Anthropic API key, then tap Extract again.",true);return;}
    assetStatus("Extracting asset details from photo...",false);
    var content=[];
    for(var pi=0;pi<Math.min(3,A.asset.photos.length);pi++){var b64=await compressPhoto(A.asset.photos[pi].data,900,0.55);if(b64)content.push({type:"image",source:{type:"base64",media_type:"image/jpeg",data:b64}});}
    content.push({type:"text",text:"Extract equipment nameplate details from these photos for a Zoho equipment asset. Return ONLY minified valid JSON, no markdown, no comments, no trailing commas. Use exactly these keys: manufacturer, asset_type, model_number, part_number, series, serial_number, ratings, visible_text. All values must be strings or null. Do not guess."});
    var data=await callAPI({content:content,maxTok:600,ms:45000});
    var txt=getText(data);
    applyAssetExtraction(await parseAssetJsonWithRepair(txt));
    assetStatus("AI extraction complete. Review all required fields before saving.",false);
  }catch(e){assetStatus("Asset extraction failed: "+e.message,true);}
}
function assetRequiredFields(){return [
  ["asset-name","Asset Name"],
  ["asset-category","Asset Category"],
  ["asset-function","Asset Function"],
  ["asset-building","Building"],
  ["asset-designator","Additional Designator"],
  ["asset-brand","Asset Brand"],
  ["asset-type","Asset Type"],
  ["asset-model","Model Number"],
  ["asset-serial","Serial Number"],
  ["asset-environment","Environment"],
  ["asset-confined","Confined Space"]
];}
function markAssetRequiredFields(){
  var missing=[];
  assetRequiredFields().forEach(function(r){
    var e=el(r[0]),isMissing=!assetInput(r[0]);
    if(e)e.classList.toggle("asset-required-missing",isMissing);
    if(isMissing)missing.push(r[1]);
  });
  return missing;
}
function updateAssetSaveState(){
  var missing=markAssetRequiredFields();
  var btn=el("asset-save-btn");
  if(btn){
    btn.disabled=A.asset.saving||missing.length>0;
    btn.title=missing.length?"Complete required fields: "+missing.join(", "):"";
    if(!A.asset.saving)btn.textContent=A.asset.saved?"Saved":(A.asset.currentAssetId?"Update Existing Asset":"Save New Asset to Zoho");
  }
  if(typeof renderAssetReplacementPanel==="function")renderAssetReplacementPanel();
  if(typeof renderAssetModeBanner==="function")renderAssetModeBanner();
  return missing;
}
function setupAssetRequiredHandlers(){
  if(A.assetReqHandlersBound)return;
  assetRequiredFields().forEach(function(r){
    var e=el(r[0]);if(!e)return;
    e.addEventListener("input",updateAssetSaveState);
    e.addEventListener("change",updateAssetSaveState);
    e.addEventListener("blur",updateAssetSaveState);
  });
  A.assetReqHandlersBound=true;
}
function assetFieldIdsToClear(){return ["asset-name","asset-category","asset-function","asset-building","asset-designator","asset-brand","asset-type","asset-brand-other","asset-type-other","asset-model","asset-serial","asset-series","asset-series-other","asset-description","asset-deal-notes"];}
function renderSavedAssets(){
  var box=el("asset-saved-list");if(!box)return;
  if(!A.asset.savedItems.length){box.style.display="none";box.innerHTML="";return;}
  box.style.display="block";
  box.innerHTML="<div class='stitle'>Saved This Visit</div>"+A.asset.savedItems.map(function(a,i){return"<div style='font-size:12px;color:#2d6b60;margin-bottom:4px'>"+(i+1)+". "+esc(a.name||"Asset")+(a.model?" — "+esc(a.model):"")+(a.serial?" — S/N "+esc(a.serial):"")+(a.dealLinked?" — linked to deal":"")+"</div>";}).join("");
}
function clearAssetEntryState(msg){
  assetFieldIdsToClear().forEach(function(id){setAssetInput(id,"");});
  A.asset.photos=[];A.asset.lastUploadedPhotoFingerprints={};
  A.asset.saved=false;A.asset.currentAssetId=null;A.asset.loadedOriginal=null;A.asset.replacementMode=false;A.asset.savedItems=[];
  renderAssetPhotos();renderSavedAssets();
  var next=el("asset-next-btn");if(next)next.style.display="none";
  if(msg)assetStatus(msg,false);else assetStatus("",false);
  updateAssetSaveState();
}
function resetAssetFormForNext(){
  clearAssetEntryState("Ready for next asset. Account and GPS are still retained.");
  try{var first=el("asset-photo-input");if(first)first.focus();}catch(e){}
}
function validateAssetForm(){
  var missing=markAssetRequiredFields();
  if(!A.sel)missing.unshift("Zoho Deal");
  if(A.sel&&!A.sel.Account_Id)missing.unshift("Zoho Account ID (refresh deals from Zoho)");
  return missing;
}
function equipmentIdFromResponse(d){var rec=d&&d.data&&d.data[0];return rec&&(rec.details&&rec.details.id||rec.id)||null;}
function assetPayload(opts){
  opts=opts||{};
  var includeBlank=!!opts.includeBlank;
  var payload={
    Asset_Category:assetInput("asset-category"),
    Account:{id:A.sel.Account_Id},
    Name:assetInput("asset-name"),
    Asset_Function:assetInput("asset-function"),
    Building:assetInput("asset-building"),
    Additional_Designator:assetInput("asset-designator"),
    Asset_Brand:assetInput("asset-brand"),
    Asset_Type:assetInput("asset-type"),
    Asset_Model_Number:assetInput("asset-model"),
    Serial_Number:assetInput("asset-serial"),
    Asset_Environment:assetInput("asset-environment"),
    Confined_Space:assetInput("asset-confined")
  };
  function setOptional(apiName,value){if(includeBlank||value)payload[apiName]=value||"";}
  setOptional("Asset_Series",assetInput("asset-series"));
  setOptional("If_Asset_Brand_Other_explain",assetInput("asset-brand-other"));
  setOptional("If_Asset_Type_other_explain",assetInput("asset-type-other"));
  setOptional("If_Asset_Series_is_Other_Function_explain",assetInput("asset-series-other"));
  var desc=assetInput("asset-description");
  var repl=replacementNote();
  if(repl)desc=desc?(desc+"\n\n"+repl):repl;
  setOptional("Description_Instructions",desc);
  setOptional("Location_Coordinates",A.location?(A.location.lat.toFixed(6)+", "+A.location.lng.toFixed(6)):"");
  payload.Date=new Date().toISOString().slice(0,10);
  return payload;
}
async function findExistingEquipmentBySerial(){
  if(A.asset.currentAssetId)return A.asset.currentAssetId;
  var serial=assetInput("asset-serial");
  if(!serial||!A.sel||!A.sel.Account_Id)return null;
  var r=await fetchWithTimeout(PROXY,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"find_equipment",token:A.zohoToken,account_id:A.sel.Account_Id,serial_number:serial})},30000);
  if(!r.ok)return null;
  var d={};try{d=await r.json();}catch(e){}
  if(d&&d.equipment_id)return d;
  return null;
}
async function saveEquipmentRecord(){
  var payload=assetPayload({includeBlank:!!A.asset.currentAssetId});
  var existing=A.asset.currentAssetId?{equipment_id:A.asset.currentAssetId}:await findExistingEquipmentBySerial();
  if(existing&&existing.equipment_id&&!A.asset.currentAssetId){
    var label=(existing.equipment&&existing.equipment.Name)||assetInput("asset-name")||"this asset";
    if(!confirm("An asset with this serial number already exists for this account ("+label+"). Update the existing asset instead of creating a duplicate?"))throw new Error("Asset save cancelled to avoid duplicate serial number");
    A.asset.currentAssetId=existing.equipment_id;
    payload=assetPayload({includeBlank:true});
  }
  var action=A.asset.currentAssetId?"update_equipment":"create_equipment";
  assetStatus((action==="update_equipment"?"Updating existing":"Creating")+" equipment asset in Zoho...",false);
  var body={action:action,token:A.zohoToken,equipment:payload};
  if(A.asset.currentAssetId)body.equipment_id=A.asset.currentAssetId;
  var r=await fetchWithTimeout(PROXY,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)},30000);
  var txt=await r.text();if(!r.ok)throw new Error("Zoho equipment "+r.status+": "+txt.substring(0,160));
  var equipmentId=A.asset.currentAssetId||equipmentIdFromResponse(JSON.parse(txt));
  if(!equipmentId)throw new Error("Zoho did not return an equipment ID");
  A.asset.currentAssetId=equipmentId;
  return equipmentId;
}
function assetDealDescription(){
  var parts=[];
  var brandType=[assetInput("asset-brand"),assetInput("asset-type")].filter(Boolean).join(" ");
  if(assetInput("asset-name"))parts.push(assetInput("asset-name"));
  if(brandType)parts.push(brandType);
  if(assetInput("asset-model"))parts.push("Model: "+assetInput("asset-model"));
  if(assetInput("asset-serial"))parts.push("Serial: "+assetInput("asset-serial"));
  if(A.asset.replacementMode&&A.asset.loadedOriginal){
    var oldBits=[];
    if(A.asset.loadedOriginal.model)oldBits.push("Previous Model "+A.asset.loadedOriginal.model);
    if(A.asset.loadedOriginal.serial)oldBits.push("Previous Serial "+A.asset.loadedOriginal.serial);
    if(oldBits.length)parts.push("Replacement: "+oldBits.join(", "));
  }
  return parts.join(" — ");
}
function assetDealNotes(){
  var note=assetInput("asset-deal-notes");
  if(note)return note;
  if(A.asset.replacementMode)return "Replaced instrument during this visit.";
  return "Added from CapStone";
}
async function linkEquipmentToSelectedDeal(equipmentId){
  if(!A.sel||!A.sel.id||!equipmentId)return{linked:false};
  var r=await fetchWithTimeout(PROXY,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"link_equipment_to_deal",token:A.zohoToken,deal_id:A.sel.id,equipment_id:equipmentId,description:assetDealDescription(),notes:assetDealNotes()})},30000);
  var txt=await r.text();
  if(!r.ok)throw new Error("Deal asset link "+r.status+": "+txt.substring(0,160));
  var d={};try{d=JSON.parse(txt);}catch(e){}
  return{linked:true,alreadyLinked:!!d.already_linked};
}
function assetUpdateNoteContent(){
  var lines=["CapStone Asset Update","===================="];
  lines.push("Date: "+new Date().toLocaleString());
  lines.push("Technician: "+(A.technician||"Not selected"));
  if(A.sel){lines.push("Account: "+(A.sel.Account_Name||""));lines.push("Deal: "+(A.sel.Deal_Name||""));}
  if(A.asset.loadedOriginal&&A.asset.loadedOriginal.cacId)lines.push("CAC Asset ID: "+A.asset.loadedOriginal.cacId);
  lines.push("");lines.push("Fields Recorded:");
  [
    ["Asset Name",assetInput("asset-name")],
    ["Asset Category",assetInput("asset-category")],
    ["Asset Function",assetInput("asset-function")],
    ["Building",assetInput("asset-building")],
    ["Additional Designator",assetInput("asset-designator")],
    ["Asset Brand",assetInput("asset-brand")],
    ["Asset Type",assetInput("asset-type")],
    ["Model Number",assetInput("asset-model")],
    ["Serial Number",assetInput("asset-serial")],
    ["Asset Series",assetInput("asset-series")],
    ["Environment",assetInput("asset-environment")],
    ["Confined Space",assetInput("asset-confined")],
    ["Location Coordinates",A.location?(A.location.lat.toFixed(6)+", "+A.location.lng.toFixed(6)):""]
  ].forEach(function(r){if(r[1])lines.push("- "+r[0]+": "+r[1]);});
  var desc=assetInput("asset-description");if(desc){lines.push("");lines.push("Description / Instructions:");lines.push(desc);}
  var dealNote=assetDealNotes();if(dealNote){lines.push("");lines.push("Deal Asset Notes:");lines.push(dealNote);}
  var repl=replacementNote();if(repl){lines.push("");lines.push(repl);}
  lines.push("");lines.push("Generated by CapStone");
  return lines.join("\n");
}
async function saveEquipmentUpdateNote(equipmentId){
  if(!equipmentId)return;
  var r=await fetchWithTimeout(PROXY,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"save_equipment_note",token:A.zohoToken,equipment_id:equipmentId,note_title:"CapStone Asset Update — "+new Date().toLocaleDateString(),note_content:assetUpdateNoteContent()})},30000);
  if(!r.ok){var txt=await r.text();throw new Error("Asset note "+r.status+": "+txt.substring(0,120));}
}
async function saveDealAssetUpdateNote(equipmentId){
  if(!A.sel||!A.sel.id||!equipmentId)return;
  var title="CapStone Asset Update — "+(assetInput("asset-name")||assetInput("asset-model")||"Asset")+" — "+new Date().toLocaleDateString();
  var content=assetUpdateNoteContent()+"\n\nZoho Equipment ID: "+equipmentId;
  var r=await fetchWithTimeout(PROXY,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"save_note",token:A.zohoToken,deal_id:A.sel.id,note_title:title,note_content:content})},30000);
  if(!r.ok){var txt=await r.text();throw new Error("Deal asset note "+r.status+": "+txt.substring(0,120));}
}
async function saveAssetToZoho(){
  if(A.asset.saving){showToast("Asset save already in progress",2500);return;}
  var missing=validateAssetForm();if(missing.length){assetStatus("Complete required fields: "+missing.join(", "),true);updateAssetSaveState();return;}
  if(!A.asset.currentAssetId){
    var searchHint=assetInput("asset-search")||assetInput("asset-serial")||assetInput("asset-model");
    if(!confirm("Create a new Zoho Equipment asset? If this asset may already exist, tap Cancel and search first"+(searchHint?" using: "+searchHint:"")+"."))return;
  }
  A.asset.saved=false;
  A.asset.saving=true;var btn=el("asset-save-btn");if(btn){btn.disabled=true;btn.textContent="Saving Asset...";}
  try{
    await refreshZohoToken();
    var equipmentId=await saveEquipmentRecord();
    var photoWarning="";
    var noteWarning="";
    var dealNoteWarning="";
    var dealLinkWarning="";
    var dealLinked=false;
    try{var linkResult=await linkEquipmentToSelectedDeal(equipmentId);dealLinked=!!linkResult.linked;}catch(linkErr){dealLinkWarning=linkErr&&linkErr.message?linkErr.message:String(linkErr);console.log("Asset saved but deal subform link failed:",linkErr);showToast("Asset saved, but deal link failed",7000);}
    try{await saveEquipmentUpdateNote(equipmentId);}catch(noteErr){noteWarning=noteErr&&noteErr.message?noteErr.message:String(noteErr);console.log("Asset saved but update note failed:",noteErr);showToast("Asset saved, but note failed",7000);}
    try{await saveDealAssetUpdateNote(equipmentId);}catch(dealNoteErr){dealNoteWarning=dealNoteErr&&dealNoteErr.message?dealNoteErr.message:String(dealNoteErr);console.log("Asset saved but deal update note failed:",dealNoteErr);showToast("Asset saved, but deal note failed",7000);}
    var photosToUpload=assetPhotosToUpload();
    if(photosToUpload.length){
      try{
        assetStatus("Asset created. Attaching "+photosToUpload.length+" nameplate photo(s)...",false);
        for(var upi=0;upi<photosToUpload.length;upi++){
          var ap=photosToUpload[upi];
          var b64=await compressPhoto(ap.data,1200,0.8);
          if(!b64)throw new Error("Could not compress nameplate photo");
          var pr=await fetchWithTimeout(PROXY,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"upload_equipment_photo",token:A.zohoToken,equipment_id:equipmentId,filename:ap.name||("asset-nameplate-"+(upi+1)+".jpg"),image_b64:b64})},45000);
          if(!pr.ok){var pt=await pr.text();throw new Error("Photo upload "+pr.status+": "+pt.substring(0,120));}
          A.asset.lastUploadedPhotoFingerprints[ap.fingerprint]=true;
        }
      }catch(photoErr){
        photoWarning=photoErr&&photoErr.message?photoErr.message:String(photoErr);
        console.log("Asset photo attachment failed after asset create:",photoErr);
        showToast("Asset saved, but photo attachment failed",7000);
      }
    }
    A.asset.saved=true;
    var savedItem=A.asset.savedItems.find(function(a){return a.id===equipmentId;});
    if(savedItem){savedItem.name=assetInput("asset-name");savedItem.model=assetInput("asset-model");savedItem.serial=assetInput("asset-serial");savedItem.dealLinked=savedItem.dealLinked||dealLinked;}
    else A.asset.savedItems.push({id:equipmentId,name:assetInput("asset-name"),model:assetInput("asset-model"),serial:assetInput("asset-serial"),dealLinked:dealLinked});
    renderSavedAssets();
    var next=el("asset-next-btn");if(next)next.style.display="flex";
    var warn=photoWarning||noteWarning||dealNoteWarning||dealLinkWarning;
    if(A.asset.loadedOriginal){A.asset.loadedOriginal=Object.assign({},A.asset.loadedOriginal,{model:assetInput("asset-model"),serial:assetInput("asset-serial"),brand:assetInput("asset-brand"),type:assetInput("asset-type"),building:assetInput("asset-building"),designator:assetInput("asset-designator"),description:assetPayload({includeBlank:true}).Description_Instructions||""});renderAssetHistoryPanel();}
    assetStatus(warn?"Asset saved to Zoho, but follow-up step failed: "+warn:"Asset saved to Zoho, linked to this Deal, and update notes added to the Asset and Deal. Tap Save Another Asset to add the next one for this same account/deal.",!!warn);showToast("Asset saved to Zoho",4000);
  }catch(e){assetStatus("Asset save failed: "+e.message,true);showToast("Asset save failed",5000);}
  finally{A.asset.saving=false;updateAssetSaveState();}
}

// LOCATION
function getLocation(){
  el("loc-body").innerHTML="<em style='color:var(--dim)'>Locating...</em>";el("loc-btn").textContent="...";
  updateReportContext();
  if(!navigator.geolocation){el("loc-body").innerHTML="GPS not available";return;}
  navigator.geolocation.getCurrentPosition(async function(pos){
    var lat=pos.coords.latitude,lng=pos.coords.longitude,acc=pos.coords.accuracy;
    A.location={lat:lat,lng:lng,accuracy:acc,address:null};
    updLocUI();el("loc-btn").textContent="REFRESH";
    el("vb-gps").textContent=lat.toFixed(4)+","+lng.toFixed(4);showEl("vb-gps");showEl("hb-gps");
    try{var r=await fetch("https://nominatim.openstreetmap.org/reverse?format=json&lat="+lat+"&lon="+lng,{headers:{"User-Agent":"CapStone/1.0"}});var d=await r.json();A.location.address=d.display_name||null;updLocUI();}catch(e){}
  },function(err){el("loc-body").innerHTML="<span style='color:var(--red)'>"+err.message+"</span>";el("loc-btn").textContent="RETRY";},{enableHighAccuracy:true,timeout:14000});
}
function updLocUI(){
  if(!A.location)return;var h="";
  if(A.location.address)h+="<div style='font-size:12px;margin:6px 0'>"+esc(A.location.address)+"</div>";
  h+="<span style='font-size:11px;color:var(--amber);font-family:monospace'>"+A.location.lat.toFixed(6)+", "+A.location.lng.toFixed(6)+"</span>";
  if(A.location.accuracy)h+="<span style='font-size:11px;color:var(--dim);margin-left:8px'>±"+Math.round(A.location.accuracy)+"m</span>";
  el("loc-body").innerHTML=h;
  updateReportContext();
  if(el("asset-location"))setAssetInput("asset-location",A.location.lat.toFixed(6)+", "+A.location.lng.toFixed(6));
}

// CAMERA
function toggleRecordAudio(){
  if(A.recording){showToast("Stop recording first to change audio setting",2500);return;}
  A.recordAudio=!A.recordAudio;
  var t=el("audio-tog");if(t)t.classList.toggle("on",A.recordAudio);
  try{localStorage.setItem("fp_record_audio",A.recordAudio?"1":"0");}catch(e){}
  showToast(A.recordAudio?"Audio in video: ON (Wispr blocked while recording)":"Audio in video: OFF (Wispr enabled)",2500);
}
async function startCam(){
  hideEl("cam-err");
  var wantAudio=!!A.recordAudio;
  try{A.stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:"environment",width:{ideal:1280},height:{ideal:720}},audio:wantAudio});}
  catch(e){
    try{A.stream=await navigator.mediaDevices.getUserMedia({video:true,audio:wantAudio});}
    catch(e2){
      if(wantAudio){
        try{A.stream=await navigator.mediaDevices.getUserMedia({video:true,audio:false});showToast("Mic unavailable — recording video only",3000);}
        catch(e3){showEl("cam-err");el("cam-err").textContent="Camera error: "+e3.name+" - "+e3.message;return;}
      }else{
        showEl("cam-err");el("cam-err").textContent="Camera error: "+e2.name+" - "+e2.message;return;
      }
    }
  }
  A.recording=true;A.paused=false;A.videoChunks=[];
  var v=el("vid-el");v.srcObject=A.stream;v.style.display="block";v.play();
  hideEl("vid-ph");
  try{
    var mime=["video/webm;codecs=vp9","video/webm","video/mp4"].find(function(t){return MediaRecorder.isTypeSupported(t);})||"";
    var rec=new MediaRecorder(A.stream,mime?{mimeType:mime}:{});
    rec.ondataavailable=function(e){if(e.data&&e.data.size>0)A.videoChunks.push(e.data);};
    rec.start(1000);A.mRec=rec;
  }catch(e){}
  getLocation();
  hideEl("cam-idle");showEl("cam-live");
  var vr=el("vb-rec");if(vr)vr.style.display="flex";
  // Sync tx to tx2
  var t=el("tx"),t2=el("tx2");if(t&&t2)t2.value=t.value;
}
function togglePause(){
  var btn=el("pause-btn");
  if(!A.paused){try{if(A.mRec&&A.mRec.state==="recording")A.mRec.pause();}catch(e){}A.paused=true;if(btn)btn.textContent="RESUME";var vr=el("vb-rec");if(vr)vr.style.opacity=".4";}
  else{try{if(A.mRec&&A.mRec.state==="paused")A.mRec.resume();}catch(e){}A.paused=false;if(btn)btn.textContent="PAUSE";var vr2=el("vb-rec");if(vr2)vr2.style.opacity="1";}
}
function stopCam(){
  // Sync tx2 back to tx before stopping
  var t=el("tx"),t2=el("tx2");if(t&&t2&&t2.value)t.value=t2.value;
  if(A.mRec){
    A.mRec.onstop=function(){
      if(A.videoChunks&&A.videoChunks.length>0){
        A.videoBlob=new Blob(A.videoChunks,{type:A.mRec.mimeType||"video/webm"});
        A.videoChunks=[];
        showToast("Video ready — tap Save Video",3000);
        showEl("video-save-bar");
      }
    };
    try{A.mRec.stop();}catch(e){}
  }
  if(A.stream)A.stream.getTracks().forEach(function(t){t.stop();});
  var v=el("vid-el");v.srcObject=null;v.style.display="none";
  showEl("vid-ph");hideEl("cam-live");showEl("cam-idle");
  var vr=el("vb-rec");if(vr)vr.style.display="none";
  hideEl("vb-pc");A.recording=false;A.paused=false;
  checkGen();
}
function saveVideo(){
  if(!A.videoBlob){showToast("No video yet",2000);return;}
  var url=URL.createObjectURL(A.videoBlob);
  var a=document.createElement("a");
  a.href=url;a.download="capstone-"+(A.sel?A.sel.Account_Name.replace(/[^a-z0-9]/gi,"-").toLowerCase():"video")+"-"+new Date().toISOString().slice(0,10)+".webm";
  document.body.appendChild(a);a.click();document.body.removeChild(a);
  setTimeout(function(){URL.revokeObjectURL(url);},5000);
  showToast("Video saved to Downloads",2000);
}
function snap(){
  if(!A.recording)return;
  var f=el("vflash");if(f){f.style.display="block";setTimeout(function(){f.style.display="none";},150);}
  var v=el("vid-el"),c=document.createElement("canvas");
  c.width=v.videoWidth||640;c.height=v.videoHeight||480;c.getContext("2d").drawImage(v,0,0);
  A.photos.push({id:"p"+Date.now(),display:c.toDataURL("image/jpeg",.72),desc:"",time:new Date().toLocaleTimeString(),w:v.videoWidth||640,h:v.videoHeight||480});
  renderPhotoCards();checkGen();
  var vpc=el("vb-pc");if(vpc){vpc.textContent=A.photos.length+" photo"+(A.photos.length!==1?"s":"");vpc.style.display="block";}
  showToast("Photo "+A.photos.length+" captured",1500);
}

// PHOTOS
async function addPhotos(input){
  var files=Array.from(input.files);
  for(var i=0;i<files.length;i++){
    var file=files[i];if(!file.type.startsWith("image/"))continue;
    await new Promise(function(resolve){
      var reader=new FileReader();
      reader.onload=function(ev){
        var img=new Image();
        img.onload=function(){
          var scale=Math.min(1,1280/img.width);var c=document.createElement("canvas");
          c.width=Math.round(img.width*scale);c.height=Math.round(img.height*scale);
          c.getContext("2d").drawImage(img,0,0,c.width,c.height);
          A.photos.push({id:"p"+Date.now()+Math.random(),display:c.toDataURL("image/jpeg",.72),desc:"",time:new Date().toLocaleTimeString(),w:img.width,h:img.height});
          resolve();
        };
        img.onerror=resolve;img.src=ev.target.result;
      };
      reader.readAsDataURL(file);
    });
  }
  input.value="";renderPhotoCards();checkGen();
}
function removePhoto(id){A.photos=A.photos.filter(function(p){return p.id!==id;});renderPhotoCards();checkGen();}
function updatePhotoDesc(pid,val){var p=A.photos.find(function(x){return x.id===pid;});if(p)p.desc=val;}
function renderPhotoCards(){
  badge("tb-photos",A.photos.length||"");
  var c=el("photo-cards");if(!c)return;c.innerHTML="";
  A.photos.forEach(function(p,i){
    var div=document.createElement("div");div.className="pcard";
    var img=document.createElement("img");img.src=p.display;img.alt="Photo "+(i+1);
    var body=document.createElement("div");body.className="pc-body";
    var tm=document.createElement("div");tm.className="pc-time";tm.textContent="Photo "+(i+1)+" — "+p.time;
    var ta=document.createElement("textarea");ta.className="pc-desc";ta.setAttribute("inputmode","text");ta.id="ta-"+p.id;ta.placeholder="Tap to add description with Wispr...";ta.value=p.desc||"";
    (function(pid){ta.addEventListener("input",function(){updatePhotoDesc(pid,this.value);});})(p.id);
    var acts=document.createElement("div");acts.className="pc-acts";
    var rm=document.createElement("button");rm.className="bd bsm";rm.textContent="Remove";
    (function(pid){rm.onclick=function(){removePhoto(pid);};})(p.id);
    acts.appendChild(rm);
    body.appendChild(tm);body.appendChild(ta);body.appendChild(acts);
    div.appendChild(img);div.appendChild(body);c.appendChild(div);
  });
}
function checkGen(){
  var tx=el("tx");var hasP=A.photos.length>0,hasN=tx&&tx.value.trim().length>0;
  var hasSec=SEC_IDS.some(function(id){var e=el(id);return e&&e.value.trim().length>0;});
  var show=hasP||hasN||hasSec;
  var gb=el("gen-btn");if(gb)gb.style.display=show?"flex":"none";
  var gs=el("gen-summary"),gt=el("gen-summary-txt");
  if(show&&gs&&gt){gs.style.display="block";var parts=[];
    if(hasP)parts.push(A.photos.length+" photo"+(A.photos.length!==1?"s":""));
    if(hasN)parts.push("Voice notes");
    if(hasSec){var fc=SEC_IDS.filter(function(id){var e=el(id);return e&&e.value.trim();}).length;parts.push(fc+" section"+(fc!==1?"s":"")+" filled");}
    if(A.location)parts.push("GPS");if(A.sel)parts.push(dealHeaderText(A.sel));
    gt.textContent=parts.join(" — ");
  }else if(gs)gs.style.display="none";
}

// API
async function callAPI(opts){
  var body={model:"claude-sonnet-4-6",max_tokens:opts.maxTok||4000,messages:[{role:"user",content:opts.content}]};
  if(opts.sys)body.system=opts.sys;
  var ctrl=new AbortController();var timer=setTimeout(function(){ctrl.abort();},opts.ms||60000);
  var r=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json","x-api-key":API_KEY,"anthropic-version":"2023-06-01","anthropic-dangerous-direct-browser-access":"true"},body:JSON.stringify(body),signal:ctrl.signal});
  clearTimeout(timer);if(!r.ok){var e=await r.text();throw new Error("API "+r.status+": "+e.substring(0,150));}
  return r.json();
}
function getText(d){return(d.content||[]).filter(function(b){return b.type==="text";}).map(function(b){return b.text;}).join("\n");}
function compressPhoto(dataUrl,maxW,quality){
  return new Promise(function(resolve){
    var img=new Image();
    img.onload=function(){var scale=Math.min(1,(maxW||800)/img.width);var c=document.createElement("canvas");c.width=Math.round(img.width*scale);c.height=Math.round(img.height*scale);c.getContext("2d").drawImage(img,0,0,c.width,c.height);resolve(c.toDataURL("image/jpeg",quality||0.5).split(",")[1]);};
    img.onerror=function(){resolve(null);};img.src=dataUrl;
  });
}

// GENERATE
async function generate(){
  A.workdrivePdfUrl=null;
  var btn=el("gen-btn"),regen=el("regen-btn");
  if(btn){btn.disabled=true;btn.textContent="Generating...";}
  if(regen)regen.disabled=true;
  var tx=el("tx");var txVal=tx?tx.value:"";
  try{
    setReportTechnician(A.technician);
    var content=[];
    var photoSrc=A.photos.length>0?A.photos:A.reportPhotos;
    for(var i=0;i<Math.min(4,photoSrc.length);i++){var b64=await compressPhoto(photoSrc[i].display,768,0.45);if(b64)content.push({type:"image",source:{type:"base64",media_type:"image/jpeg",data:b64}});}
    var sectionText="";SEC_IDS.forEach(function(id,idx){var e=el(id);if(e&&e.value.trim())sectionText+=SEC_LABELS[idx]+": "+e.value.trim()+"\n";});
    var locInfo=A.location?"\nSite: "+(A.location.address||"See GPS")+"\nGPS: "+A.location.lat.toFixed(6)+", "+A.location.lng.toFixed(6):"";
    var dealInfo=A.sel?"\nAccount: "+A.sel.Account_Name+"\nDeal: "+(A.sel.Deal_Name||"N/A")+"\nStage: "+(A.sel.Stage||"N/A")+"\nAmount: "+(A.sel.Amount?"$"+Number(A.sel.Amount).toLocaleString():"N/A"):"\nNo deal selected.";
    content.push({type:"text",text:"Generate a professional field service report for a water/wastewater treatment facility.\n\nDate: "+new Date().toLocaleDateString("en-US",{weekday:"long",year:"numeric",month:"long",day:"numeric"})+"\nTime: "+new Date().toLocaleTimeString()+"\nTechnician: "+technicianDisplayName()+"\n"+locInfo+"\n"+dealInfo+"\n\nGENERAL VOICE NOTES:\n"+(txVal||"None.")+"\n\n"+(sectionText?"PRE-FILLED SECTIONS:\n"+sectionText+"\n":"")+"INSTRUCTIONS:\n1. Only report facts provided. Do not fabricate.\n2. Do NOT describe or mention photos in the report text.\n3. Only include sections with content.\n4. Professional field service language.\n5. End with ## KEY POINTS SUMMARY with 4-6 bullet points using -.\n\n# FIELD SERVICE REPORT\n## 1. Site Visit Summary\n## 2. Equipment / Systems Serviced\n## 3. Work Performed\n## 4. Calibration Results & Readings\n## 5. Findings & Observations\n## 6. Issues / Deficiencies\n## 7. Recommendations & Next Steps\n## 8. Follow-Up Required\n## 9. Materials / Parts Used\n## KEY POINTS SUMMARY"});
    var data=await callAPI({content:content,maxTok:3500,ms:90000});
    A.report=getText(data)||"Report generation failed.";
    var savedPhotos=photoSrc.map(function(p){return{id:p.id,display:p.display,desc:p.desc||"",time:p.time,w:p.w||0,h:p.h||0,aiDesc:p.aiDesc||"",synthesis:p.synthesis||""};});
    // AI captions in batches
    try{
      for(var bi=0;bi<savedPhotos.length;bi+=4){
        var batch=savedPhotos.slice(bi,bi+4);var cc=[];
        for(var ci=0;ci<batch.length;ci++){var cb=await compressPhoto(batch[ci].display,500,0.3);if(cb)cc.push({type:"image",source:{type:"base64",media_type:"image/jpeg",data:cb}});cc.push({type:"text",text:"[Photo "+(bi+ci+1)+": technician said: "+(batch[ci].desc||"nothing")+"]"});}
        cc.push({type:"text",text:"Write a 1-2 sentence technical field service observation for each of the "+batch.length+" photos. Return ONLY a JSON array of "+batch.length+" strings, no markdown."});
        var cd=await callAPI({content:cc,maxTok:800,ms:45000});var ct=getText(cd);
        var m=ct.match(/\[[\s\S]*?\]/);if(m){var caps=JSON.parse(m[0]);caps.forEach(function(cap,i){if(batch[i])batch[i].aiDesc=cap;});}
      }
      // AI synthesis per photo
      for(var si=0;si<savedPhotos.length;si++){
        var sp=savedPhotos[si];if(!(sp.desc||sp.aiDesc))continue;
        try{
          var sc=[];var scb=await compressPhoto(sp.display,400,0.3);if(scb)sc.push({type:"image",source:{type:"base64",media_type:"image/jpeg",data:scb}});
          sc.push({type:"text",text:"Technician note: "+(sp.desc||"none")+"\\nAI observation: "+(sp.aiDesc||"none")+"\\n\\nCreate 2-4 concise bullet points synthesizing both into a clear field service summary. Start each with -. Return only bullets."});
          var sd2=await callAPI({content:sc,maxTok:200,ms:20000});sp.synthesis=getText(sd2).trim();
        }catch(e){}
      }
    }catch(e){}
    A.reportPhotos=savedPhotos;
    var meta={id:A.currentHistoryId||("r"+Date.now()),date:new Date().toISOString(),account:A.sel?A.sel.Account_Name:"No deal",deal:A.sel?(A.sel.Deal_Name||""):"",stage:A.sel?(A.sel.Stage||""):"",location:A.location?(A.location.address||A.location.lat.toFixed(4)+","+A.location.lng.toFixed(4)):"",locationData:locationMeta(),photos:savedPhotos.length,photoData:savedPhotos,sections:(function(){var sd={};SEC_IDS.forEach(function(id){var e=el(id);if(e)sd[id]=e.value;});return sd;})(),report:A.report,voiceNotes:txVal,technician:currentTechnicianName(),dealPdfAttached:!!A.dealPdfAttached,dealId:A.sel?A.sel.id:null,zohoNoteId:A.zohoNoteId||null};
    saveOrUpdateHistory(meta);renderReport();go("report");
    if(A.sel){
      A.uploadPromise=uploadToWorkDriveAll();
      if(A.autoSaveZoho){
        if(btn)btn.textContent="Saving to Zoho...";
        try{
          await saveNoteToZoho({fromGenerate:true});
          showToast("Saved to Zoho — Deal PDF + WorkDrive + note",6000);
        }catch(se){
          var reSave=el("rpt-err");if(reSave){reSave.textContent="Auto-save failed: "+se.message+". Tap Save to Zoho to retry.";reSave.style.display="block";}
          showToast("Auto-save failed — tap Save to Zoho",8000);
        }
      }
    }else{A.uploadPromise=null;}
    if(!A.autoSaveZoho||!A.sel){
      try{
        var pdfPhotos=A.reportPhotos.length>0?A.reportPhotos:A.photos;
        await Promise.all(pdfPhotos.map(function(p){return new Promise(function(res){var img=new Image();img.onload=function(){p._rw=img.naturalWidth;p._rh=img.naturalHeight;res();};img.onerror=res;img.src=p.display;});}));
        var doc=buildPDF(A.report,A.sel,A.inclPhotos?pdfPhotos:[],A.location,currentTechnicianName());
        var acct=(A.sel?A.sel.Account_Name:"report").replace(/[^a-z0-9]/gi,"-").toLowerCase();
        doc.save("capstone-"+acct+"-"+new Date().toISOString().slice(0,10)+".pdf");
      }catch(e){}
    }
  }catch(e){var re=el("rpt-err");if(re){re.textContent="Report error: "+e.message;re.style.display="block";}alert("Report error: "+e.message);}
  if(btn){btn.disabled=false;btn.textContent="Generate AI Report";}if(regen)regen.disabled=false;
}

// REPORT
function renderReport(){
  if(!A.report){hideEl("rpt-content");showEl("rpt-empty");return;}
  hideEl("rpt-empty");showEl("rpt-content");
  var rb=el("rpt-body");if(rb)rb.textContent=A.report;
  var h="";
  h+="<div class='rh-row'><span class='rh-k'>Technician: </span>"+esc(technicianDisplayName())+"</div>";
  if(A.sel){h+="<div class='rh-row'><span class='rh-k'>Account: </span>"+esc(A.sel.Account_Name)+"</div>";if(A.sel.Deal_Name)h+="<div class='rh-row'><span class='rh-k'>Deal: </span>"+esc(A.sel.Deal_Name)+"</div>";if(A.sel.Stage)h+="<div class='rh-row'><span class='rh-k'>Stage: </span>"+esc(A.sel.Stage)+"</div>";if(A.sel.Amount)h+="<div class='rh-row'><span class='rh-k'>Amount: </span>"+fmtAmt(A.sel.Amount)+"</div>";}
  if(A.location){if(A.location.address)h+="<div class='rh-row'><span class='rh-k'>Site: </span>"+esc(A.location.address)+"</div>";h+="<div class='rh-row'><span class='rh-k'>GPS: </span><span style='font-family:monospace;color:var(--amber)'>"+A.location.lat.toFixed(6)+", "+A.location.lng.toFixed(6)+"</span></div>";}
  h+="<div class='rh-row' style='color:var(--dim);font-size:11px;margin-top:4px'>"+A.reportPhotos.length+" photo"+(A.reportPhotos.length!==1?"s":"")+" — "+new Date().toLocaleDateString()+"</div>";
  var rhr=el("rpt-hdr-rows");if(rhr)rhr.innerHTML=h;
  var ndl=el("no-deal-rpt");if(ndl)ndl.style.display=A.sel?"none":"flex";
  var sb=el("save-btn");if(sb)sb.disabled=!A.sel;
  var photos=A.reportPhotos;var rp=el("rpt-photos"),rg=el("rpt-photo-grid");
  if(photos.length>0&&rp&&rg){
    rp.style.display="block";
    rg.innerHTML=photos.map(function(p,i){
      return "<div class='pgcard'><img src='"+p.display+"' alt='Photo "+(i+1)+"'/><div class='pgbody'><div class='pgblk'><div style='font-size:10px;color:var(--amber);font-weight:700;letter-spacing:.08em;margin-bottom:5px;text-transform:uppercase'>Photo "+(i+1)+" — "+p.time+"</div></div>"+
      "<div class='pgblk'><div style='font-size:10px;color:var(--amber);font-weight:700;letter-spacing:.08em;margin-bottom:5px;text-transform:uppercase'>Your Description</div>"+(p.desc?"<div style='font-size:13px;color:var(--amber);line-height:1.6'>"+esc(p.desc)+"</div>":"<div style='font-size:11px;color:var(--dim);font-style:italic'>No description</div>")+"</div>"+
      "<div class='pgblk pgdiv'><div style='font-size:10px;color:#60a5fa;font-weight:700;letter-spacing:.08em;margin-bottom:5px;text-transform:uppercase'>AI Observation</div>"+(p.aiDesc?"<div style='font-size:13px;color:#93c5fd;line-height:1.6'>"+esc(p.aiDesc)+"</div>":"<div style='font-size:11px;color:var(--dim);font-style:italic'>Generates with report</div>")+"</div>"+
      "<div class='pgblk pgdiv'><div style='font-size:10px;color:var(--green);font-weight:700;letter-spacing:.08em;margin-bottom:5px;text-transform:uppercase'>AI Synthesis</div>"+(p.synthesis?"<div style='font-size:13px;color:var(--green);line-height:1.8;white-space:pre-line'>"+esc(p.synthesis)+"</div>":"<div style='font-size:11px;color:var(--dim);font-style:italic'>Generates with report</div>")+"</div>"+
      "</div></div>";
    }).join("");
  }else if(rp)rp.style.display="none";
}

// ZOHO SAVE
function workdriveFolderUrl(){
  if(A.workdriveFolderUrl)return A.workdriveFolderUrl;
  try{
    var u=localStorage.getItem("fp_wd_folder_url");
    if(u&&u.indexOf("workdrive")>=0)return u.trim();
  }catch(e){}
  return WORKDRIVE_FOLDER_URL;
}
function buildZohoNote(){
  var lines=["CapStone FIELD SERVICE REPORT","=============================="];
  var marker=zohoReportMarker();if(marker)lines.push(marker);
  if(A.sel){lines.push("Account: "+(A.sel.Account_Name||""));lines.push("Deal: "+(A.sel.Deal_Name||""));lines.push("Stage: "+(A.sel.Stage||""));if(A.sel.Amount)lines.push("Amount: "+fmtAmt(A.sel.Amount));if(A.sel.Closing_Date)lines.push("Date: "+A.sel.Closing_Date);}
  lines.push("Technician: "+technicianDisplayName());
  lines.push("Report Date: "+new Date().toLocaleDateString("en-US",{weekday:"long",year:"numeric",month:"long",day:"numeric"}));
  if(A.location){if(A.location.address)lines.push("Site: "+A.location.address);lines.push("GPS: "+A.location.lat.toFixed(6)+", "+A.location.lng.toFixed(6));}
  lines.push("");lines.push(A.report);lines.push("");
  lines.push("--------------------");
  if(A.workdrivePdfUrl){
    lines.push("REPORT PDF (WorkDrive):");
    lines.push(A.workdrivePdfUrl);
    lines.push("");
  }
  if(A.dealPdfAttached){
    lines.push("REPORT PDF:");
    lines.push("Attached directly to this Zoho Deal.");
    lines.push("");
  }
  if(A.workdriveUploadCount>0){
    var folderLabel=A.sel?((A.sel.Account_Name||"Account")+" — "+(A.sel.Deal_Name||"Deal")):"CapStone";
    lines.push("FIELD FILES (WorkDrive — "+folderLabel+"):");
    lines.push(A.workdriveFolderUrl||workdriveFolderUrl());
    lines.push(A.workdriveUploadCount+" file(s) in this visit folder (photos, video, and PDF when uploaded).");
    lines.push("");
  }
  lines.push("Generated by CapStone — Calibrations & Controls");
  return lines.join("\n");
}
function buildReportExportText(){
  var lines=["CapStone FIELD SERVICE REPORT","=============================="];
  lines.push("Technician: "+technicianDisplayName());
  lines.push("Report Date: "+new Date().toLocaleDateString("en-US",{weekday:"long",year:"numeric",month:"long",day:"numeric"}));
  if(A.sel){lines.push("Account: "+(A.sel.Account_Name||""));if(A.sel.Deal_Name)lines.push("Deal: "+A.sel.Deal_Name);if(A.sel.Stage)lines.push("Stage: "+A.sel.Stage);}
  if(A.location){if(A.location.address)lines.push("Site: "+A.location.address);lines.push("GPS: "+A.location.lat.toFixed(6)+", "+A.location.lng.toFixed(6));}
  lines.push("");lines.push(A.report||"");
  return lines.join("\n");
}
async function zohoSave(){
  for(var attempt=0;attempt<2;attempt++){
    if(!A.zohoNoteId){try{await findExistingZohoNote();}catch(fe){console.log("findExistingZohoNote:",fe);}}
    var payload={
      action:A.zohoNoteId?"update_note":"save_note",
      token:A.zohoToken||ZOHO_ACCESS,
      deal_id:A.sel.id,
      note_id:A.zohoNoteId||null,
      note_title:zohoNoteTitle(),
      note_content:buildZohoNote()
    };
    var r=await fetch(PROXY,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)});
    if(r.ok){
      var d={};try{d=await r.json();}catch(pe){}
      var noteId=zohoNoteIdFromResponse(d)||A.zohoNoteId||null;
      if(noteId)A.zohoNoteId=noteId;
      return noteId;
    }
    var e=await r.text();
    if(r.status===401&&attempt===0){var ref=await refreshZohoToken();if(ref)continue;throw new Error("Token refresh failed");}
    if(payload.action==="update_note"&&isStaleZohoNoteError(r.status,e)){
      console.log("Stored Zoho note was not found; creating a replacement note.",e);
      A.zohoNoteId=null;
      updateCurrentHistory({zohoNoteId:null,zohoSaved:false});
      continue;
    }
    throw new Error("Proxy error "+r.status+": "+e.substring(0,100));
  }
}
async function saveNote(){
  if(!A.sel||!A.report)return;
  if(A.savingToZoho){showToast("Save already in progress",3000);return;}
  try{
    await saveNoteToZoho({});
    showToast("Saved to Zoho",4000);
  }catch(e){
    var re=el("rpt-err");if(re){re.textContent="Save failed: "+e.message;re.style.display="block";}
    showToast("Save failed: "+e.message,7000);
  }
}
async function saveNoteToZoho(opts){
  opts=opts||{};
  if(!A.sel||!A.report)throw new Error("Select a deal and generate a report first");
  if(A.savingToZoho)throw new Error("Save already in progress");
  A.savingToZoho=true;
  var btn=el("save-btn");
  var genBtn=opts.fromGenerate?el("gen-btn"):null;
  var regen=el("regen-btn");
  function setStatus(txt){if(btn)btn.textContent=txt;if(genBtn)genBtn.textContent=txt;}
  if(btn){btn.disabled=true;}
  if(regen)regen.disabled=true;
  try{
    if(!A.uploadPromise&&A.sel)A.uploadPromise=uploadToWorkDriveAll();
    if(A.uploadPromise){
      setStatus("Uploading...");
      showUploadStatus("Waiting for WorkDrive uploads (max ~70s)...",false);
      var w=await waitForUploads(UPLOAD_WAIT_MS);
      if(w.timedOut){
        showUploadStatus("Upload still running — saving now with any links ready so far.",true);
        showToast("Stopped waiting for uploads — saving note with photos uploaded so far",8000);
      }
    }
    var uploadWarnings=[];
    setStatus("Uploading PDF...");
    showUploadStatus("Uploading report PDF to WorkDrive...",false);
    try{
      await refreshZohoToken();
      await uploadReportPdfToWorkDrive();
    }catch(upErr){
      uploadWarnings.push("WorkDrive/PDF: "+(upErr&&upErr.message?upErr.message:String(upErr)));
      console.log("Continuing Zoho save after upload warning:",upErr);
      showUploadStatus("WorkDrive/PDF upload did not finish. Continuing...",true);
    }
    setStatus("Attaching PDF...");
    showUploadStatus(A.dealPdfAttached?"Report PDF already attached to this deal.":"Attaching report PDF directly to Zoho Deal...",false);
    try{
      await refreshZohoToken();
      var attached=await uploadReportPdfToDealAttachment();
      if(!attached&&!A.dealPdfAttached)uploadWarnings.push("Deal attachment: PDF too large or skipped");
    }catch(attErr){
      uploadWarnings.push("Deal attachment: "+(attErr&&attErr.message?attErr.message:String(attErr)));
      console.log("Continuing Zoho save after attachment warning:",attErr);
      showUploadStatus("Deal PDF attachment did not finish. Saving Zoho note now...",true);
    }
    setStatus(A.zohoNoteId?"Updating Zoho...":"Saving to Zoho...");
    showUploadStatus(A.zohoNoteId?"Updating existing Zoho CRM note...":"Saving note to Zoho CRM...",false);
    var savedNoteId=await zohoSave();
    setStatus("Saved!");
    if(btn){btn.style.background="var(--green)";btn.style.color="#001a18";}
    var uploadWarning=uploadWarnings.join("; ");
    showUploadStatus(uploadWarning?"Saved to Zoho. Some upload steps need retry: "+uploadWarning:"Saved to Zoho — WorkDrive folder, deal PDF attachment, PDF, and CRM note.",!!uploadWarning);
    if(A.workdriveUploadCount>0){
      var reOk=el("rpt-err");if(reOk){reOk.style.display="none";}
    }else if(A.reportPhotos&&A.reportPhotos.length>0){
      var reWarn=el("rpt-err");if(reWarn){reWarn.textContent="Note saved, but no files confirmed in WorkDrive. Open the deal folder in WorkDrive.";reWarn.style.display="block";}
    }
    updateCurrentHistory({pdfSaved:true,zohoSaved:true,dealPdfAttached:!!A.dealPdfAttached,zohoNoteId:savedNoteId||A.zohoNoteId||null});
    if(btn&&!opts.fromGenerate){
      setTimeout(function(){btn.textContent="Save to Zoho";btn.style.background="";btn.style.color="";btn.disabled=false;},3000);
    }
  }finally{
    A.savingToZoho=false;
    if(btn&&opts.fromGenerate){btn.textContent="Save to Zoho";btn.style.background="";btn.style.color="";btn.disabled=false;}
    if(regen)regen.disabled=false;
  }
}
function sanitizeWdFolderName(s){
  return String(s||"").replace(/[\\/:*?"<>|]/g,"-").replace(/\s+/g," ").trim().slice(0,120);
}
function dealFolderName(){
  if(!A.sel)return "CapStone";
  return sanitizeWdFolderName((A.sel.Account_Name||"Account")+" — "+(A.sel.Deal_Name||"Deal"));
}
function workdriveFilePrefix(){
  if(!A.sel)return "";
  return sanitizeWdFolderName(dealFolderName()).replace(/\s+/g," ")+" - ";
}
function workdriveReportKey(){
  var key=A.currentHistoryId||(A.sel&&A.sel.id)||("report-"+new Date().toISOString().slice(0,10));
  return sanitizeWdFolderName(key).replace(/\s+/g,"-")||"report";
}
function workdriveStableFileName(kind,suffix,ext){
  var cleanSuffix=suffix?sanitizeWdFolderName(suffix).replace(/\s+/g,"-"):"";
  return workdriveFilePrefix()+kind+"-"+workdriveReportKey()+(cleanSuffix?"-"+cleanSuffix:"")+"."+ext;
}
function workdrivePhotoFileName(p,i){return workdriveStableFileName("Photo",(p&&p.id)||("photo-"+(i+1)),"jpg");}
function workdriveVideoFileName(){return workdriveStableFileName("Video","","webm");}
function workdrivePdfFileName(){return workdriveStableFileName("Report","","pdf");}
async function resolveDealFolder(){
  A.workdriveFolderFallback=false;
  if(!A.sel)return WORKDRIVE_FOLDER;
  var cacheKey="fp_wd_folder_"+A.sel.id;
  try{
    var cached=localStorage.getItem(cacheKey);
    if(cached){
      var c=JSON.parse(cached);
      if(c.folder_id&&c.folder_id!==WORKDRIVE_FOLDER&&!c.fallback){
        A.workdriveFolderUrl=c.folder_url||("https://workdrive.zoho.com/folder/"+c.folder_id);
        return c.folder_id;
      }
      try{localStorage.removeItem(cacheKey);}catch(e){}
    }
  }catch(e){}
  try{
    await refreshZohoToken();
    var name=dealFolderName();
    showUploadStatus("Opening WorkDrive folder: "+name,false);
    var r=await fetchWithTimeout(PROXY,{method:"POST",headers:{"Content-Type":"application/json"},
      body:JSON.stringify({action:"workdrive_get_or_create_folder",token:A.zohoToken,parent_id:WORKDRIVE_FOLDER,folder_name:name})},ZOHO_FETCH_MS);
    var d=JSON.parse(await r.text());
    if(d.ok&&d.folder_id&&d.folder_id!==WORKDRIVE_FOLDER&&!d.fallback){
      A.workdriveFolderUrl=d.folder_url||("https://workdrive.zoho.com/folder/"+d.folder_id);
      try{localStorage.setItem(cacheKey,JSON.stringify({folder_id:d.folder_id,folder_url:A.workdriveFolderUrl,name:name}));}catch(e){}
      showToast("WorkDrive folder ready: "+name,5000);
      return d.folder_id;
    }
    A.workdriveFolderFallback=true;
    var hint="";
    if(d.debug&&d.debug.create&&d.debug.create[0]){
      var c0=d.debug.create[0];
      hint=" ("+c0.host+" create "+c0.status+")";
    }else if(d.debug&&d.debug.list&&d.debug.list[0]){
      hint=" (list "+d.debug.list[0].status+")";
    }
    showToast("Deal folder failed"+hint+" — files go to CapStone root with deal name in filename",10000);
    console.log("WorkDrive folder fallback:",d);
  }catch(e){console.log("resolveDealFolder:",e);A.workdriveFolderFallback=true;}
  A.workdriveFolderUrl=WORKDRIVE_FOLDER_URL;
  return WORKDRIVE_FOLDER;
}
function parseWorkDriveLink(txt){
  try{
    var d=JSON.parse(txt);
    if(d.ok&&d.link)return d.link;
    if(d.ok&&d.resource_id)return"https://workdrive.zoho.com/file/"+d.resource_id;
    var rec=(d.data&&d.data[0])||{};
    var attrs=rec.attributes||{};
    var rid=attrs.resource_id||rec.id||d.resource_id||null;
    if(!rid&&attrs["File INFO"]){
      try{var fi=JSON.parse(attrs["File INFO"]);rid=fi.RESOURCE_ID||rid;}catch(e){}
    }
    return attrs.permalink||attrs.download_url||attrs.web_url||(rid?"https://workdrive.zoho.com/file/"+rid:null);
  }catch(e){
    var m=txt.match(/[a-z0-9]{30,}/i);
    if(m&&txt.indexOf("error")<0)return"https://workdrive.zoho.com/file/"+m[0];
    return null;
  }
}
async function uploadToWorkDrive(b64,filename,mimeType,folderId,timeoutMs){
  var target=folderId||WORKDRIVE_FOLDER;
  var r=await fetchWithTimeout(PROXY,{method:"POST",headers:{"Content-Type":"application/json"},
    body:JSON.stringify({action:"workdrive_upload",token:A.zohoToken,folder_id:target,filename:filename,file_b64:b64,mime_type:mimeType})},timeoutMs||UPLOAD_FETCH_MS);
  var txt=await r.text();
  console.log("WorkDrive response:",r.status,txt.substring(0,300));
  if(!r.ok)throw new Error("WorkDrive "+r.status+": "+txt.substring(0,120));
  var link=parseWorkDriveLink(txt);
  console.log("WorkDrive link:",link);
  return link;
}

async function uploadToWorkDriveAll(){
  if(!A.sel)return;
  var ok=0,fail=0,skipped=0;
  try{
    showUploadStatus("WorkDrive upload starting...",false);
    await refreshZohoToken();
    var dealFolder=await resolveDealFolder();
    A.workdriveUploadCount=0;
    var total=A.reportPhotos.length;
    if(total>0)showToast("Uploading "+total+" photos to WorkDrive...",5000);
    for(var i=0;i<A.reportPhotos.length;i++){
      var p=A.reportPhotos[i];if(!p.display){skipped++;continue;}
      try{
        var b64=await compressPhoto(p.display,1200,0.8);
        if(!b64){skipped++;showToast("Photo "+(i+1)+" skipped (compress failed)",5000);continue;}
        var fname=workdrivePhotoFileName(p,i);
        showUploadStatus("Uploading photo "+(i+1)+" of "+total+"...",false);
        showToast("Uploading photo "+(i+1)+" of "+total+"...",4000);
        await uploadToWorkDrive(b64,fname,"image/jpeg",dealFolder);
        ok++;A.workdriveUploadCount=ok;showToast("Photo "+(i+1)+" uploaded OK",5000);
      }catch(e){fail++;showToast("Photo "+(i+1)+" error: "+e.message,7000);}
    }
    if(A.videoBlob){
      if(A.videoBlob.size>VIDEO_MAX_BYTES){
        fail++;
        showUploadStatus("Video skipped (over 2 MB) — photos still upload. Save when ready.",true);
        showToast("Video skipped — too large for proxy ("+(A.videoBlob.size/1048576).toFixed(1)+" MB). Photos are fine.",8000);
      }else{
        try{
          showUploadStatus("Uploading video (may take up to 50s)...",false);
          showToast("Uploading video to WorkDrive...",5000);
          var vreader=new FileReader();
          var vb64=await new Promise(function(res,rej){vreader.onload=function(e){res(e.target.result.split(",")[1]);};vreader.onerror=function(){rej(new Error("Could not read video"));};vreader.readAsDataURL(A.videoBlob);});
          var vfname=workdriveVideoFileName();
          await uploadToWorkDrive(vb64,vfname,"video/webm",dealFolder,45000);
          ok++;A.workdriveUploadCount=ok;showToast("Video uploaded OK",5000);
        }catch(e){fail++;showToast("Video error: "+e.message,7000);}
      }
    }
    var summary=ok+" file"+(ok!==1?"s":"")+" uploaded";
    if(fail)summary+=", "+fail+" problem"+(fail!==1?"s":"");
    if(skipped)summary+=", "+skipped+" skipped";
    summary+=". Check CapStone folder in WorkDrive.";
    if(ok>0&&!A.workdrivePdfUrl&&A.report){
      try{await uploadReportPdfToWorkDrive();}catch(pe){console.log("PDF upload:",pe);}
    }
    if(ok>0){
      showUploadStatus(summary+" Folder link will be in Zoho note.",false);
      showToast(summary,6000);
    }else{
      showUploadStatus(summary,true);
      showToast("No files uploaded to WorkDrive. "+summary,8000);
    }
  }catch(e){
    showUploadStatus("WorkDrive error: "+e.message,true);
    showToast("WorkDrive error: "+e.message,8000);
  }finally{
    A.uploadPromise=null;
  }
}

async function uploadReportPdfToWorkDrive(){
  if(!A.sel||!A.report)return null;
  if(A.workdrivePdfUrl)return A.workdrivePdfUrl;
  try{
    var dealFolder=await resolveDealFolder();
    var pdfPhotos=A.reportPhotos&&A.reportPhotos.length>0?A.reportPhotos:A.photos;
    if(A.inclPhotos&&pdfPhotos.length>0){
      await Promise.all(pdfPhotos.map(function(p){
        return new Promise(function(res){
          var img=new Image();
          img.onload=function(){p._rw=img.naturalWidth;p._rh=img.naturalHeight;res();};
          img.onerror=res;img.src=p.display;
        });
      }));
    }
    var doc=buildPDF(A.report,A.sel,A.inclPhotos?pdfPhotos:[],A.location,currentTechnicianName());
    var dataUri=doc.output("datauristring");
    var b64=(dataUri.split(",")[1]||"").trim();
    if(!b64)throw new Error("Could not build PDF");
    if(b64.length>5500000){
      showToast("PDF too large to upload from phone — use Download PDF; photos are in WorkDrive",9000);
      return null;
    }
    var fname=workdrivePdfFileName();
    var link=await uploadToWorkDrive(b64,fname,"application/pdf",dealFolder,90000);
    if(link){
      A.workdrivePdfUrl=link;
      A.workdriveUploadCount=(A.workdriveUploadCount||0)+1;
      showToast("Report PDF uploaded to WorkDrive",5000);
      return link;
    }
  }catch(e){
    console.log("uploadReportPdfToWorkDrive:",e);
    showToast("PDF upload failed: "+e.message,8000);
  }
  return null;
}
async function uploadReportPdfToDealAttachment(){
  if(!A.sel||!A.report)return false;
  if(A.dealPdfAttached)return true;
  var pdfPhotos=A.reportPhotos&&A.reportPhotos.length>0?A.reportPhotos:A.photos;
  if(A.inclPhotos&&pdfPhotos.length>0){
    await Promise.all(pdfPhotos.map(function(p){
      return new Promise(function(res){
        var img=new Image();
        img.onload=function(){p._rw=img.naturalWidth;p._rh=img.naturalHeight;res();};
        img.onerror=res;img.src=p.display;
      });
    }));
  }
  var doc=buildPDF(A.report,A.sel,A.inclPhotos?pdfPhotos:[],A.location,currentTechnicianName());
  var dataUri=doc.output("datauristring");
  var b64=(dataUri.split(",")[1]||"").trim();
  if(!b64)throw new Error("Could not build PDF attachment");
  if(b64.length>5500000){
    showToast("PDF too large for direct deal attachment — WorkDrive link remains in note",9000);
    return false;
  }
  var fname=workdrivePdfFileName();
  var r=await fetchWithTimeout(PROXY,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"upload_deal_attachment",token:A.zohoToken,deal_id:A.sel.id,filename:fname,file_b64:b64,mime_type:"application/pdf"})},90000);
  var txt=await r.text();
  if(!r.ok)throw new Error("Deal attachment "+r.status+": "+txt.substring(0,120));
  A.dealPdfAttached=true;
  showToast("Report PDF attached to Zoho Deal",5000);
  return true;
}

async function autoSync(){
  if(!A.sel||!A.report)return;
  try{
    await refreshZohoToken();
    var dealFolder=await resolveDealFolder();
    var ok=0;
    A.workdriveUploadCount=0;
    if(A.reportPhotos.length>0){
      showToast("Uploading "+A.reportPhotos.length+" photos to WorkDrive...",3000);
    }
    for(var i=0;i<A.reportPhotos.length;i++){
      var p=A.reportPhotos[i];if(!p.display)continue;
      try{
        var b64=await compressPhoto(p.display,1200,0.8);
        if(!b64)continue;
        var fname=workdrivePhotoFileName(p,i);
        showToast("Uploading photo "+(i+1)+" of "+A.reportPhotos.length+"...",2000);
        await uploadToWorkDrive(b64,fname,"image/jpeg",dealFolder);
        ok++;A.workdriveUploadCount=ok;showToast("Photo "+(i+1)+" uploaded",1500);
      }catch(e){showToast("Photo "+(i+1)+" error: "+e.message,3000);console.error("Photo upload error:",e);}
    }
    if(A.videoBlob&&A.videoBlob.size<=VIDEO_MAX_BYTES){
      try{
        showToast("Uploading video to WorkDrive...",3000);
        var vreader=new FileReader();
        var vb64=await new Promise(function(resolve){vreader.onload=function(e){resolve(e.target.result.split(",")[1]);};vreader.readAsDataURL(A.videoBlob);});
        var vfname=workdriveVideoFileName();
        await uploadToWorkDrive(vb64,vfname,"video/webm",dealFolder);
        ok++;A.workdriveUploadCount=ok;showToast("Video uploaded!",2000);
      }catch(e){showToast("Video error: "+e.message,3000);console.error("Video upload error:",e);}
    }
    await zohoSave();
    if(ok>0)showToast(ok+" files uploaded to WorkDrive",3000);
    else showToast("No files uploaded to WorkDrive",3000);
  }catch(e){showToast("Sync error: "+e.message,4000);console.error("AutoSync error:",e);}
}

// HISTORY
function saveHistory(meta){
  var h=getHistory();h.unshift(meta);
  var saved=false;
  // Try full save
  try{localStorage.setItem("fp_history",JSON.stringify(h));saved=true;}catch(e){}
  // If full - strip photos from older entries
  if(!saved){
    var trimmed=h.map(function(r,i){
      if(i===0)return r;
      var s=Object.assign({},r);
      if(s.photoData)s.photoData=s.photoData.map(function(p){return{id:p.id,display:"",desc:p.desc||"",time:p.time,w:p.w||0,h:p.h||0,aiDesc:p.aiDesc||"",synthesis:p.synthesis||""};});
      return s;
    });
    try{localStorage.setItem("fp_history",JSON.stringify(trimmed));saved=true;}catch(e){}
  }
  // Last resort - keep only 5 most recent without photos
  if(!saved){
    var minimal=h.slice(0,5).map(function(r){var s=Object.assign({},r);s.photoData=[];return s;});
    try{localStorage.setItem("fp_history",JSON.stringify(minimal));}catch(e){}
  }
  badge("tb-hist",h.length);
  renderHistory();
}
function getHistory(){try{var h=localStorage.getItem("fp_history");return h?JSON.parse(h):[];}catch(e){return[];}}
function renderHistory(){
  var hist=getHistory();
  var active=hist.filter(function(r){return!r.archived;});
  var archived=hist.filter(function(r){return r.archived;});
  badge("tb-hist",active.length||"");
  var hc=el("hist-count");if(hc)hc.textContent=active.length+" report"+(active.length!==1?"s":"")+(archived.length?" ("+archived.length+" archived)":"");
  var html="";
  if(!active.length&&!archived.length){html="<div class='empty'><div class='e-icon'>&#128203;</div><div class='e-title'>No History Yet</div><div class='e-sub'>Reports save here automatically</div></div>";}
  else{
    html+=active.map(function(r){var i=hist.indexOf(r);var d=new Date(r.date);var ds=d.toLocaleDateString("en-US",{weekday:"short",month:"short",day:"numeric",year:"numeric"})+" — "+d.toLocaleTimeString();
      return "<div class='hist-card'><div class='h-acct'>"+esc(r.account)+"</div><div class='h-meta'>"+ds+(r.stage?" — "+esc(r.stage):"")+" — "+r.photos+" photo"+(r.photos!==1?"s":"")+(r.pdfSaved?" ✓ PDF":"")+(r.location?"<br>"+esc(r.location.substring(0,60)):"")+
      "</div>"+(r.deal?"<div style='font-size:12px;color:var(--sub);margin-bottom:8px'>"+esc(r.deal)+"</div>":"")+
      "<div class='h-acts'><button class='bp bsm' onclick='viewHist("+i+")'>View</button><button class='bs bsm' onclick='continueHist("+i+")'>Open + Continue</button><button class='bpu bsm' onclick='shareHist("+i+")'>Share</button><button class='bg bsm' onclick='dlHistPDF("+i+")'>PDF</button><button class='bg bsm' onclick='archiveHist("+i+")'>Archive</button></div></div>";
    }).join("");
    if(archived.length){
      html+="<div style='font-family:Barlow Condensed,sans-serif;font-size:11px;font-weight:700;color:var(--dim);letter-spacing:.1em;text-transform:uppercase;margin:16px 0 8px;padding-top:12px;border-top:1px solid var(--bdr)'>Archived ("+archived.length+")</div>";
      html+=archived.map(function(r){var i=hist.indexOf(r);var d=new Date(r.date);var ds=d.toLocaleDateString("en-US",{weekday:"short",month:"short",day:"numeric"})+" — "+d.toLocaleTimeString();
        return "<div class='hist-card' style='opacity:.7;border-style:dashed'><div class='h-acct'>"+esc(r.account)+"</div><div class='h-meta'>"+ds+" — "+r.photos+" photo"+(r.photos!==1?"s":"")+"</div>"+
        "<div class='h-acts'><button class='bp bsm' onclick='viewHist("+i+")'>View</button><button class='bs bsm' onclick='unarchiveHist("+i+")'>Restore</button><button class='bg bsm' onclick='dlHistPDF("+i+")'>PDF</button><button class='bd bsm' onclick='permDeleteHist("+i+")'>Delete</button></div></div>";
      }).join("");
    }
  }
  var hl=el("hist-list");if(hl)hl.innerHTML=html;
}
function viewHist(i){var h=getHistory();var r=h[i];if(!r)return;A.currentHistoryId=r.id;A.zohoNoteId=r.zohoNoteId||null;A.dealPdfAttached=!!r.dealPdfAttached;A.report=r.report;A.reportPhotos=r.photoData||[];setReportTechnician(r.technician||"");A.sel=dealFromRecord(r);A.location=restoreLocationFromRecord(r);updateDealUI();updateLocationUI();renderReport();go("report");}
function continueHist(i){
  var h=getHistory();var r=h[i];if(!r)return;
  if(!confirm("Open this project to continue?"))return;
  A.reportPhotos=r.photoData||[];A.photos=(r.photoData||[]).map(function(p){return{id:p.id,display:p.display,desc:p.desc,time:p.time,w:p.w||0,h:p.h||0,aiDesc:p.aiDesc||"",synthesis:p.synthesis||""};});
  A.report=r.report;
  setReportTechnician(r.technician||"");
  A.dealPdfAttached=!!r.dealPdfAttached;A.currentHistoryId=r.id;A.zohoNoteId=r.zohoNoteId||null;A.sel=dealFromRecord(r);A.location=restoreLocationFromRecord(r);updateDealUI();updateLocationUI();
  if(r.sections){SEC_IDS.forEach(function(id){var e=el(id);if(e&&r.sections[id])e.value=r.sections[id];});}
  if(r.voiceNotes){var ta=el("tx");if(ta)ta.value=r.voiceNotes;}
  renderPhotoCards();checkGen();go("capture");
}
function archiveHist(i){var h=getHistory();if(!h[i])return;h[i].archived=true;localStorage.setItem("fp_history",JSON.stringify(h));renderHistory();}
function unarchiveHist(i){var h=getHistory();if(!h[i])return;h[i].archived=false;localStorage.setItem("fp_history",JSON.stringify(h));renderHistory();}
function permDeleteHist(i){if(!confirm("Permanently delete?"))return;var h=getHistory();h.splice(i,1);localStorage.setItem("fp_history",JSON.stringify(h));renderHistory();}
function shareHist(i){var h=getHistory();var r=h[i];if(!r)return;A.report=r.report;setReportTechnician(r.technician||"");A.sel=dealFromRecord(r);A.location=restoreLocationFromRecord(r);openShare();}
async function dlHistPDF(i){var h=getHistory();var r=h[i];if(!r)return;var doc=buildPDF(r.report,dealFromRecord(r),r.photoData||[],restoreLocationFromRecord(r),r.technician||"");var acct=(r.account||"report").replace(/[^a-z0-9]/gi,"-").toLowerCase();doc.save("capstone-"+acct+"-"+new Date(r.date).toISOString().slice(0,10)+".pdf");}

// SETTINGS STORAGE
function getStorageSize(){var total=0;try{for(var k in localStorage){if(localStorage.hasOwnProperty(k))total+=localStorage[k].length+k.length;}}catch(e){}return(total*2/1024/1024).toFixed(2);}
function updateStorageInfo(){var e=el("storage-info");if(!e)return;var h=getHistory();e.textContent=h.length+" reports — approx "+getStorageSize()+" MB used of 5 MB";}
function renderCorrections(){var e=el("corrections-list");if(!e)return;}
function exportHistory(){var h=getHistory();if(!h.length){alert("No history");return;}var data=JSON.stringify({app:"CapStone",exported:new Date().toISOString(),version:1,history:h},null,2);var blob=new Blob([data],{type:"application/json"});var url=URL.createObjectURL(blob);var a=document.createElement("a");a.href=url;a.download="capstone-history-"+new Date().toISOString().slice(0,10)+".json";document.body.appendChild(a);a.click();document.body.removeChild(a);URL.revokeObjectURL(url);}
function importHistory(input){var file=input.files[0];if(!file)return;var reader=new FileReader();reader.onload=function(e){try{var data=JSON.parse(e.target.result);if(!data.history||!Array.isArray(data.history)){alert("Invalid file");return;}var existing=getHistory();var existingIds=new Set(existing.map(function(r){return r.id;}));var toAdd=data.history.filter(function(r){return!existingIds.has(r.id);});var merged=toAdd.concat(existing).sort(function(a,b){return new Date(b.date)-new Date(a.date);});localStorage.setItem("fp_history",JSON.stringify(merged));renderHistory();updateStorageInfo();alert("Imported "+toAdd.length+" reports.");}catch(err){alert("Could not read file");}};reader.readAsText(file);input.value="";}
function clearOldPhotos(){if(!confirm("Remove photos from reports older than 7 days?"))return;var h=getHistory();var cutoff=Date.now()-(7*24*60*60*1000);var count=0;h=h.map(function(r){if(new Date(r.date).getTime()<cutoff&&r.photoData&&r.photoData.some(function(p){return p.display;})){count++;r=Object.assign({},r);r.photoData=r.photoData.map(function(p){return{id:p.id,display:"",desc:p.desc,time:p.time,w:p.w,h:p.h,aiDesc:p.aiDesc,synthesis:p.synthesis};});}return r;});localStorage.setItem("fp_history",JSON.stringify(h));renderHistory();updateStorageInfo();alert("Removed photos from "+count+" older reports.");}
function clearAllHistory(){if(!confirm("Delete ALL history? Cannot be undone."))return;localStorage.removeItem("fp_history");renderHistory();updateStorageInfo();}

// SHARE
function openShare(){if(!A.report){alert("Generate a report first");return;}el("smodal").style.display="flex";}
function closeShare(){el("smodal").style.display="none";}
function shareEmail(){var subj="CapStone Report — "+(A.sel?A.sel.Account_Name:"Field Service")+" — "+new Date().toLocaleDateString();window.location.href="mailto:?subject="+encodeURIComponent(subj)+"&body="+encodeURIComponent(buildReportExportText().substring(0,1800));closeShare();}
function shareCopy(){var txt=buildReportExportText();if(navigator.clipboard){navigator.clipboard.writeText(txt).then(function(){showToast("Copied!",2000);}).catch(function(){fbCopy(txt);});}else fbCopy(txt);closeShare();}
function fbCopy(txt){var ta=document.createElement("textarea");ta.value=txt||buildReportExportText();ta.style.position="fixed";ta.style.opacity="0";document.body.appendChild(ta);ta.select();try{document.execCommand("copy");}catch(e){}document.body.removeChild(ta);}

// PDF
function togPhotos(){A.inclPhotos=!A.inclPhotos;var tp=el("tog-photos");if(tp)tp.classList.toggle("on",A.inclPhotos);}
async function dlPDF(){
  if(!A.report){alert("Generate a report first");return;}
  var btn=el("pdf-btn");if(btn){btn.disabled=true;btn.textContent="Building PDF...";}
  try{
    var pdfPhotos=A.reportPhotos&&A.reportPhotos.length>0?A.reportPhotos:A.photos;
    if(A.inclPhotos&&pdfPhotos.length>0){await Promise.all(pdfPhotos.map(function(p){return new Promise(function(res){var img=new Image();img.onload=function(){p._rw=img.naturalWidth;p._rh=img.naturalHeight;res();};img.onerror=res;img.src=p.display;});}));}
    var doc=buildPDF(A.report,A.sel,A.inclPhotos?pdfPhotos:[],A.location,currentTechnicianName());
    var acct=(A.sel?A.sel.Account_Name:"report").replace(/[^a-z0-9]/gi,"-").toLowerCase();
    doc.save("capstone-"+acct+"-"+new Date().toISOString().slice(0,10)+".pdf");
    if(btn){btn.textContent="PDF Saved!";btn.className="bs-lg";setTimeout(function(){btn.textContent="Download PDF";btn.className="bg-lg";btn.disabled=false;},3000);}
  }catch(e){if(btn){btn.disabled=false;btn.textContent="Download PDF";}}
}


function buildPDF(report,deal,photos,location,technician){
  var jsPDF=window.jspdf.jsPDF;
  var doc=new jsPDF({orientation:"portrait",unit:"mm",format:"a4"});
  var pw=doc.internal.pageSize.getWidth(),ph=doc.internal.pageSize.getHeight(),ML=14,MR=14,CW=pw-ML-MR,y=0;
  function footer(){doc.setDrawColor(0,192,160);doc.line(ML,ph-9,pw-MR,ph-9);doc.setFont("helvetica","normal");doc.setFontSize(7.5);doc.setTextColor(80,100,98);doc.text("CapStone by Calibrations & Controls | Page "+doc.internal.getNumberOfPages(),pw/2,ph-5,{align:"center"});}
  function np(){footer();doc.addPage();y=14;}
  function guard(h){if(y+(h||8)>ph-16)np();}
  doc.setFillColor(255,255,255);doc.rect(0,0,pw,30,"F");
  doc.setFillColor(0,192,160);doc.rect(0,28.5,pw,1.5,"F");
  var logoW=60,logoH=Math.round(60*(157/500)*10)/10;
  try{doc.addImage("data:image/png;base64,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","PNG",ML,2,logoW,logoH);}catch(e){}
  doc.setFont("helvetica","bold");doc.setFontSize(18);doc.setTextColor(0,192,160);
  doc.text("763-972-1001",ML+logoW,logoH+8,{align:"right"});
  doc.setFont("helvetica","bold");doc.setFontSize(9);doc.setTextColor(40,60,58);
  doc.text("FIELD SERVICE REPORT",pw-MR,10,{align:"right"});
  doc.setFont("helvetica","normal");doc.setFontSize(8);doc.setTextColor(80,100,98);
  doc.text(new Date().toLocaleDateString("en-US",{weekday:"long",year:"numeric",month:"long",day:"numeric"}),pw-MR,17,{align:"right"});
  doc.text(new Date().toLocaleTimeString(),pw-MR,23,{align:"right"});
  doc.setFontSize(7.5);doc.text("Technician: "+((technician||"").trim()||"Not selected"),pw-MR,27.5,{align:"right"});
  y=34;
  if(location){var ha=!!location.address,bh=ha?22:14;doc.setFillColor(245,247,252);doc.setDrawColor(210,215,228);doc.roundedRect(ML,y,CW,bh,2,2,"FD");doc.setFont("helvetica","bold");doc.setFontSize(7);doc.setTextColor(100,116,139);doc.text("SITE LOCATION",ML+3,y+5.5);if(ha){doc.setFont("helvetica","normal");doc.setFontSize(8.5);doc.setTextColor(15,23,42);doc.splitTextToSize(location.address,CW-52).slice(0,2).forEach(function(l,i){doc.text(l,ML+3,y+11+i*4.5);});}doc.setFont("helvetica","bold");doc.setFontSize(8.5);doc.setTextColor(0,150,130);doc.text(location.lat.toFixed(6)+",",pw-MR-2,y+9,{align:"right"});doc.text(location.lng.toFixed(6),pw-MR-2,y+14,{align:"right"});y+=bh+5;}
  if(deal){doc.setFillColor(245,247,252);doc.setDrawColor(210,215,228);doc.roundedRect(ML,y,CW,36,2,2,"FD");var c2=ML+CW*0.52;[[ML+4,y+8,"ACCOUNT",deal.Account_Name],[ML+4,y+20,"DEAL NAME",deal.Deal_Name],[c2,y+8,"STAGE",deal.Stage],[c2,y+20,"AMOUNT",deal.Amount?"$"+Number(deal.Amount).toLocaleString():"---"]].forEach(function(r){doc.setFont("helvetica","bold");doc.setFontSize(7);doc.setTextColor(100,116,139);doc.text(r[2],r[0],r[1]-3);doc.setFont("helvetica","bold");doc.setFontSize(9);doc.setTextColor(15,23,42);doc.text((r[3]||"---").substring(0,36),r[0],r[1]+3);});if(deal.Closing_Date){doc.setFont("helvetica","normal");doc.setFontSize(7.5);doc.setTextColor(100,116,139);doc.text("Date: "+deal.Closing_Date,ML+4,y+30);}y+=41;}
  doc.setDrawColor(210,215,228);doc.line(ML,y,pw-MR,y);y+=6;
  if(photos&&photos.length>0){
    guard(14);y+=4;doc.setFont("helvetica","bold");doc.setFontSize(13);doc.setTextColor(0,192,160);doc.text("SITE PHOTO DOCUMENTATION",ML,y);doc.setDrawColor(0,192,160);doc.line(ML,y+2,pw-MR,y+2);y+=8;
    for(var idx=0;idx<photos.length;idx++){
      var p=photos[idx];var rw=p._rw||p.w||640;var rh=p._rh||p.h||480;
      var naturalW=rw/150*25.4;var naturalH=rh/150*25.4;var maxW=CW;var maxH=140;
      var scale=Math.min(1,maxW/naturalW,maxH/naturalH);var fw=Math.round(naturalW*scale*10)/10;var fh=Math.round(naturalH*scale*10)/10;var fx=ML+(CW-fw)/2;
      guard(fh+50);
      doc.setFont("helvetica","bold");doc.setFontSize(9);doc.setTextColor(0,192,160);doc.text("Photo "+(idx+1)+" — "+p.time,ML,y);doc.setDrawColor(200,200,200);doc.line(ML,y+2,pw-MR,y+2);y+=6;
      try{doc.addImage(p.display,"JPEG",fx,y,fw,fh,undefined,"MEDIUM");}catch(e){}y+=fh+3;
      if(p.desc){var vl=doc.splitTextToSize(p.desc,CW-8);var vh=vl.length*4.8+10;doc.setFillColor(255,255,255);doc.setDrawColor(200,200,200);doc.rect(ML,y,CW,vh,"FD");doc.setFont("helvetica","bold");doc.setFontSize(7);doc.setTextColor(0,150,120);doc.text("YOUR DESCRIPTION",ML+3,y+5);doc.setFont("helvetica","normal");doc.setFontSize(8.5);doc.setTextColor(0,192,160);vl.forEach(function(l,i){doc.text(l,ML+3,y+10+i*4.8);});y+=vh+3;}
      if(p.aiDesc){var al=doc.splitTextToSize(p.aiDesc,CW-8);var ah=al.length*4.8+10;doc.setFillColor(255,255,255);doc.setDrawColor(200,200,200);doc.rect(ML,y,CW,ah,"FD");doc.setFont("helvetica","bold");doc.setFontSize(7);doc.setTextColor(30,80,180);doc.text("AI OBSERVATION",ML+3,y+5);doc.setFont("helvetica","normal");doc.setFontSize(8.5);doc.setTextColor(30,80,180);al.forEach(function(l,i){doc.text(l,ML+3,y+10+i*4.8);});y+=ah+3;}
      if(p.synthesis){var sl=doc.splitTextToSize(p.synthesis,CW-8);var sh=sl.length*4.8+10;doc.setFillColor(240,253,244);doc.setDrawColor(167,243,208);doc.rect(ML,y,CW,sh,"FD");doc.setFont("helvetica","bold");doc.setFontSize(7);doc.setTextColor(6,95,70);doc.text("AI SYNTHESIS",ML+3,y+5);doc.setFont("helvetica","normal");doc.setFontSize(8.5);doc.setTextColor(6,95,70);sl.forEach(function(l,i){doc.text(l,ML+3,y+10+i*4.8);});y+=sh+3;}
      y+=6;
    }
    y+=4;
  }
  (report||"").split("\n").forEach(function(raw){
    var line=raw.trim();if(!line){y+=2.5;return;}
    if(/^#{1,3}\s/.test(line)){guard(16);if(y>34)y+=5;doc.setFont("helvetica","bold");doc.setFontSize(13);doc.setTextColor(0,192,160);doc.text(line.replace(/^#{1,3}\s*/,""),ML,y);doc.setDrawColor(0,192,160);doc.line(ML,y+1.5,pw-MR,y+1.5);y+=8;}
    else if(/^[-*]\s/.test(line)){doc.splitTextToSize("- "+line.replace(/^[-*]\s/,""),CW-8).forEach(function(chunk){guard(5.5);doc.setFont("helvetica","normal");doc.setFontSize(9.5);doc.setTextColor(30,41,59);doc.text(chunk,ML+5,y);y+=5.2;});}
    else{doc.splitTextToSize(line,CW-4).forEach(function(chunk){guard(5.5);doc.setFont("helvetica","normal");doc.setFontSize(9.5);doc.setTextColor(30,41,59);doc.text(chunk,ML+2,y);y+=5.2;});}
  });
  footer();return doc;
}
