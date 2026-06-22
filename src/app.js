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

var ASSET_AI_FIELD_IDS=["asset-description","asset-deal-notes","asset-building","asset-designator"];
var ASSET_EXTRACT_JSON_KEYS="manufacturer, asset_type, device_name, model_number, order_number, part_number, series, serial_number, k_factor, cal_factor, nominal_diameter, ratings, visible_text";
var ASSET_PART_PREFIX_SERIES=[{prefix:"174111",series:"Ultra 4",brand:"Pulsar",assetType:"Ultrasonic Flow"}];
var ASSET_EXTRACT_ULTRA4="Pulsar Ultra 4 flow controller: If Part Number (P/N) or model/order code digits start with 174111 (example 1741110002XX-XXP), Asset Series = Ultra 4, Brand = Pulsar, Asset Type = Ultrasonic Flow. Keep the full catalog string as Model Number.";
var ASSET_EXTRACT_MAGMETER_CAL="Magnetic flow meter calibration (all brands): Most magmeters show Cal Factor, Cal. Fact., Calibration Factor, K-Factor, or K Factor on the nameplate. Put that numeric value in k_factor (and cal_factor if needed). This maps to the Zoho Cal Factor field — do not omit when visible on the plate.";
var ASSET_EXTRACT_EH_MAGMETER="Endress+Hauser magnetic flow meter (Promag) nameplate rules:\n- device_name → Asset Series: transmitter/product family exactly as printed (e.g. Proline Promag W 400, Promag 50P). NOT the order code.\n- order_number → Asset Model Number: FULL Order Code (Ord. Cd. / Order code), e.g. 5W4B80-AAI7/0. Copy the entire string including slashes and suffixes.\n- serial_number: Ser. No. exactly (often ~11 chars, e.g. M801B416000).\n- k_factor / cal_factor: Cal. Fact. / Calibration Factor / K-Factor (e.g. 1.2345) → Cal Factor field.\n- nominal_diameter: DN / pipe size if shown (e.g. DN 80 / 3 inch).\n- ratings: combine DN, PN, liner, electrodes, power supply, enclosure IP, outputs if readable (exclude cal factor if already in k_factor).\n- asset_type: Magnetic Flow Meter when applicable.\nDo NOT put Order Code in series. Do NOT truncate Order Code.";
var ASSET_EXTRACT_PROMPT="Extract equipment nameplate details from these photos for a Zoho Equipments record. Return ONLY minified valid JSON, no markdown, no comments, no trailing commas. Use exactly these keys: "+ASSET_EXTRACT_JSON_KEYS+". All values must be strings or null.\n\nMap to Zoho CRM fields (critical):\n- series → Asset Series: SHORT family/product line OR Endress+Hauser device_name (Promag family).\n- model_number → Asset Model Number: FULL model/order string exactly as printed.\n- order_number: Endress+Hauser Order Code (Ord. Cd.) — full value, also use for model_number.\n- device_name: Endress+Hauser transmitter type (maps to series).\n- part_number: only if separate P/N different from Model/Order.\n- serial_number → Serial Number.\n- k_factor / cal_factor → Cal Factor field on magnetic flow meters.\n- nominal_diameter: capture when visible.\n\n"+ASSET_EXTRACT_MAGMETER_CAL+"\n\nRosemount example: Series 8750, Model Number 8750WM4AXD1DA2, Serial 210642244.\n\n"+ASSET_EXTRACT_ULTRA4+"\n\n"+ASSET_EXTRACT_EH_MAGMETER+"\n\nDo not guess unreadable characters.";
var ASSET_EXTRACT_SENSOR_JSON_KEYS="sensor_model_number, sensor_serial_number, order_number, part_number, manufacturer, model_number, serial_number, k_factor, cal_factor, nominal_diameter, ratings, visible_text";
var ASSET_EXTRACT_EH_SENSOR="Endress+Hauser Promag sensor / flow-tube label rules:\n- sensor_model_number → Sensor Model Number: FULL order code on the sensor or flow-tube tag (often different from the transmitter Order Code).\n- sensor_serial_number → Sensor Serial Number: Ser. No. on the sensor tag.\n- order_number / part_number: use for sensor_model_number when that is the order or part code on the sensor label.\n- serial_number: use for sensor_serial_number when Ser. No. is on the sensor tag.\n- k_factor / cal_factor: Cal. Fact. / Calibration Factor / K-Factor on the sensor tag → Cal Factor field (same Zoho field as transmitter).\n- nominal_diameter / ratings: capture DN, liner, electrodes, PN when visible.";
var ASSET_EXTRACT_SENSOR_PROMPT="Extract sensor / flow-tube / measuring-tube nameplate details from these photos for a Zoho Equipments record. Return ONLY minified valid JSON, no markdown, no comments, no trailing commas. Use exactly these keys: "+ASSET_EXTRACT_SENSOR_JSON_KEYS+". All values must be strings or null.\n\nMap to Zoho CRM fields:\n- sensor_model_number → Sensor Model Number (sensor body model, order code, or part number on the sensor label).\n- sensor_serial_number → Sensor Serial Number (Ser. No. on the sensor label).\n- order_number / part_number / model_number: map to sensor_model_number when they are the sensor order or part code.\n- serial_number: map to sensor_serial_number when it is the sensor serial.\n- k_factor / cal_factor → Cal Factor field (Cal. Fact., calibration factor, K-factor on sensor or flow-tube label).\n- manufacturer: sensor brand if shown.\n- nominal_diameter / ratings / visible_text: liner, electrodes, DN, PN, or other sensor-only details.\n\n"+ASSET_EXTRACT_MAGMETER_CAL+"\n\n"+ASSET_EXTRACT_EH_SENSOR+"\n\nDo not guess unreadable characters.";
var ASSET_PHOTO_ROLES={transmitter:{label:"Transmitter label",short:"transmitter-label"},sensor:{label:"Sensor label",short:"sensor-label"},other:{label:"Other",short:"other"}};
var ASSET_PHOTO_ROLE_LIMITS={transmitter:3,sensor:3,other:6};
var ASSET_PHOTO_ROLE_DEFAULT="transmitter";
var A={deals:[],sel:null,photos:[],location:null,report:"",reportPhotos:[],reportTechnician:"",dealPdfAttached:false,lastSaveResult:null,lastSaveIssue:null,zohoToken:ZOHO_ACCESS,recording:false,paused:false,stream:null,mRec:null,videoChunks:[],videoBlob:null,inclPhotos:true,sortF:"Account_Name",sortD:"asc",recordAudio:false,autoSaveZoho:true,autoSavePhonePhotos:true,savingToZoho:false,currentHistoryId:null,zohoNoteId:null,technician:"",technicians:[],assetPhotoDescResolver:null,assetPhotoLabelPhoto:null,assetPhotoLabelResolver:null,assetPhotoLabelRole:ASSET_PHOTO_ROLE_DEFAULT,pendingRetrying:false,pendingRetryTimer:null,lastPendingAutoRetry:0,pendingAiRetrying:false,pendingAiRetryTimer:null,lastPendingAiAutoRetry:0,draftRestored:false,draftTimer:null,historySaveTimer:null,assetDraftRestored:false,assetDraftTimer:null,equipmentConfig:null,engineeringUnitLookups:null,engineeringUnitLookupsLoading:false,assetReqHandlersBound:false,inboxPickerItemId:null,dealPickerContext:null,assetAccountsCache:null,asset:{photos:[],lastUploadedPhotoFingerprints:{},saving:false,saved:false,currentAssetId:null,activeDealKey:"",mode:"add",intent:null,linkMode:"deal",standaloneAccount:null,searchResults:[],loadedOriginal:null,replacementMode:false,savedItems:[],dynamicValues:{},dynamicSuggested:{},dynamicTouched:{},subformRows:[],subformTouched:{},entryStateResetting:false,_draftRestoreFields:null}};
var FP_VERSION="301";
var MIN_ZOHO_PROXY_BUILD=278;
var _fpBusyCount=0;
var _fpActiveBtn=null;
var _fpLastClickedBtn=null;
var _fpScrollY=0;
var _fpFocusEl=null;
var _fpBtnReleaseTimer=null;
function fpActionSelector(){return "button, label.fbtn, .tab, .deal-card, .tog-row, .asset-setup-btn, .asset-path-btn, .map-popup-btn, .map-site-btn, .field-ai-btn, .pending-sync-tab, .asset-photo-item";}
function fpRememberView(){
  _fpScrollY=window.pageYOffset||document.documentElement.scrollTop||0;
  _fpFocusEl=document.activeElement;
}
function fpRestoreView(){
  requestAnimationFrame(function(){
    requestAnimationFrame(function(){
      window.scrollTo({top:_fpScrollY,left:0,behavior:"auto"});
      if(_fpFocusEl&&document.contains(_fpFocusEl)&&typeof _fpFocusEl.focus==="function"){
        try{_fpFocusEl.focus({preventScroll:true});}catch(e){try{_fpFocusEl.focus();}catch(e2){}}
      }
    });
  });
}
function fpAfterDomUpdate(fn){
  fpRememberView();
  var result=fn();
  fpRestoreView();
  return result;
}
var AUTO_ADVANCE_SELECTOR="input:not([type=checkbox]):not([type=radio]):not([type=file]):not([type=hidden]):not([type=button]):not([type=submit]):not([type=password]),select,textarea[data-auto-advance='enter']";
function isAutoAdvanceEligible(e){
  if(!e||e.disabled||e.readOnly)return false;
  if(e.getAttribute("data-no-auto-advance")!==null)return false;
  if(e.tagName==="TEXTAREA"&&e.getAttribute("data-auto-advance")!=="enter")return false;
  return true;
}
function isAutoAdvanceFieldVisible(e){
  if(!e||!isAutoAdvanceEligible(e))return false;
  var p=e;
  while(p&&p!==document.body){
    if(p.style&&p.style.display==="none")return false;
    p=p.parentElement;
  }
  try{
    var st=getComputedStyle(e);
    if(st.display==="none"||st.visibility==="hidden")return false;
  }catch(ve){}
  return!!(e.offsetWidth||e.offsetHeight||e.getClientRects().length);
}
function autoAdvanceFocusRoots(){
  var modals=[];
  document.querySelectorAll(".smodal").forEach(function(m){
    if(m.style.display&&m.style.display!=="none")modals.push(m);
  });
  if(modals.length)return modals;
  var pane=document.querySelector(".pane.on");
  return pane?[pane]:[];
}
function collectAutoAdvanceFields(root){
  var list=[];
  if(!root)return list;
  root.querySelectorAll(AUTO_ADVANCE_SELECTOR).forEach(function(e){
    if(isAutoAdvanceFieldVisible(e))list.push(e);
  });
  return list;
}
function autoAdvanceFocusableElements(){
  var all=[];
  autoAdvanceFocusRoots().forEach(function(root){
    collectAutoAdvanceFields(root).forEach(function(e){
      if(all.indexOf(e)<0)all.push(e);
    });
  });
  return all;
}
function focusAutoAdvanceElement(e){
  if(!e)return false;
  try{e.focus({preventScroll:true});}catch(err){try{e.focus();}catch(e2){return false;}}
  if(e.tagName==="INPUT"&&e.type!=="date"&&typeof e.select==="function"){
    try{e.select();}catch(se){}
  }
  return true;
}
function focusNextAutoAdvanceField(fromEl){
  var all=autoAdvanceFocusableElements();
  var idx=-1;
  for(var i=0;i<all.length;i++){if(all[i]===fromEl){idx=i;break;}}
  if(idx<0)return false;
  for(var j=idx+1;j<all.length;j++){
    if(focusAutoAdvanceElement(all[j]))return true;
  }
  return false;
}
function fieldHasAutoAdvanceValue(e){
  if(!e)return false;
  if(e.tagName==="SELECT")return!!String(e.value||"").trim();
  return!!String(e.value||"").trim();
}
function maybeAutoAdvanceField(e,evt){
  if(!e||!isAutoAdvanceEligible(e))return;
  if(!fieldHasAutoAdvanceValue(e))return;
  if(e.tagName==="TEXTAREA"){
    if(!evt||evt.type!=="keydown"||evt.key!=="Enter"||evt.shiftKey)return;
    evt.preventDefault();
  }else if(evt&&evt.type==="keydown"){
    if(evt.key!=="Enter")return;
    evt.preventDefault();
  }else if(e.tagName!=="SELECT")return;
  setTimeout(function(){focusNextAutoAdvanceField(e);},50);
}
function bindAutoAdvanceField(node){
  if(!node||node._autoAdvanceBound||!isAutoAdvanceEligible(node))return;
  node._autoAdvanceBound=true;
  node.addEventListener("change",function(){maybeAutoAdvanceField(node);});
  node.addEventListener("keydown",function(evt){maybeAutoAdvanceField(node,evt);});
}
function installAutoAdvanceInRoot(root){
  var scope=root||document;
  scope.querySelectorAll(AUTO_ADVANCE_SELECTOR).forEach(bindAutoAdvanceField);
}
function installAutoAdvanceAll(){
  document.querySelectorAll(".pane, .smodal").forEach(installAutoAdvanceInRoot);
}
function initNoAutofill(root){
  var scope=root||document;
  var noAutofillNames={
    "asset-account-search":"fp-acct-filter-q",
    "asset-photo-desc-input":"fp-photo-label",
    "asset-search":"fp-asset-q",
    "inbox-d-search":"fp-inbox-deal-q"
  };
  var skipReadonlyIds={"asset-account-search":1,"asset-search":1,"inbox-d-search":1,"asset-photo-desc-input":1};
  scope.querySelectorAll("input:not([type=file]):not([type=checkbox]):not([type=radio]), textarea, select").forEach(function(node){
    if(node.id==="key-in"){node.setAttribute("autocomplete","off");return;}
    node.setAttribute("autocomplete","off");
    node.setAttribute("autocorrect","off");
    node.setAttribute("autocapitalize","off");
    node.setAttribute("spellcheck","false");
    if(!node.getAttribute("data-lpignore"))node.setAttribute("data-lpignore","true");
    if(!node.getAttribute("data-1p-ignore"))node.setAttribute("data-1p-ignore","true");
    if(!node.getAttribute("data-bwignore"))node.setAttribute("data-bwignore","true");
    if(!node.getAttribute("data-form-type"))node.setAttribute("data-form-type","other");
    var safeName=noAutofillNames[node.id];
    if(!safeName&&node.id)safeName="fp-"+String(node.id).replace(/^asset-/,"").replace(/account/gi,"acct");
    if(safeName)node.setAttribute("name",safeName);
    if(node.tagName==="INPUT"&&node.type==="text"&&!node.readOnly)node.setAttribute("inputmode","text");
    if(node.id==="asset-account-search"&&node.type!=="search")node.setAttribute("type","search");
    if(node._fpNoAutofillBound)return;
    node._fpNoAutofillBound=true;
    if(node.readOnly||node.tagName==="SELECT"||skipReadonlyIds[node.id])return;
    node.addEventListener("focus",function(){
      if(node.readOnly||skipReadonlyIds[node.id])return;
      node.setAttribute("readonly","readonly");
      setTimeout(function(){node.removeAttribute("readonly");},120);
    });
  });
  installAutoAdvanceInRoot(scope);
}
function resolveEngineeringUnitDefault(names){
  var list=Array.isArray(names)?names:[names];
  for(var i=0;i<list.length;i++){
    var id=resolveEngineeringUnitLookupId(list[i]);
    if(id)return id;
  }
  return resolveEngineeringUnitLookupId(list[0])||list[0]||"";
}
function isOpenChannelFlowCategory(category){
  var s=String(category||"").trim();
  if(!s)return false;
  if(/^flow\s*meter$/i.test(s))return false;
  return /flow\s*open\s*channel|open\s*channel\s*flow/i.test(s);
}
var INBOX_SUBMIT_URL="https://dulcet-sherbet-40f8f6.netlify.app/.netlify/functions/submit-recording";
var INBOX_TRANSCRIPT_URL="https://dulcet-sherbet-40f8f6.netlify.app/.netlify/functions/get-transcript";
var PLAUD_PROXY_URL="https://dulcet-sherbet-40f8f6.netlify.app/.netlify/functions/plaud-proxy";
var PICKLIST_REQUEST_URL="https://dulcet-sherbet-40f8f6.netlify.app/.netlify/functions/picklist-request";
var INBOX_AUDIO_MAX_BYTES=5*1024*1024;
var PLAUD_AUTO_PULL_MS=3*60*1000;
var PLAUD_FOREGROUND_PULL_MS=15000;
var PLAUD_FIRST_PULL_DAYS=7;
var CAPTURE_STORAGE_WARN_PHOTOS=8;
var CAPTURE_STORAGE_WARN_MB=4;
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
  if(typeof saveAssetDraftNow==="function"&&typeof assetDraftHasWork==="function"&&assetDraftHasWork())saveAssetDraftNow();
  if(typeof saveCaptureDraftNow==="function"&&typeof captureDraftHasWork==="function"&&captureDraftHasWork())saveCaptureDraftNow();
  ["deals","capture","assets","inbox","report","history","map","settings"].forEach(function(x){
    var p=el("p-"+x),t=el("t-"+x);
    if(p)p.classList.toggle("on",x===n);
    if(t)t.classList.toggle("on",x===n);
  });
  if(n==="capture"&&typeof updateCaptureModeStatus==="function")updateCaptureModeStatus();
  if(n==="assets"&&typeof renderAssetForm==="function")renderAssetForm();
  if(n==="inbox"&&typeof renderInbox==="function"){renderInbox();startInboxPollIfNeeded();startPlaudAutoPullIfNeeded();}
  if(n==="history"&&typeof renderHistory==="function")renderHistory();
  if(n==="map"&&typeof initAccountsMapTab==="function")initAccountsMapTab();
  if(n==="settings"){if(typeof updateStorageInfo==="function")updateStorageInfo();if(typeof renderCorrections==="function")renderCorrections();if(typeof setTechnicianUI==="function")setTechnicianUI();if(typeof renderPendingUploads==="function")renderPendingUploads();if(typeof renderPendingAi==="function")renderPendingAi();if(typeof renderPlaudSettingsUI==="function")renderPlaudSettingsUI();if(typeof checkZohoProxyDeploy==="function")checkZohoProxyDeploy(true);}
  if(typeof installAutoAdvanceAll==="function")installAutoAdvanceAll();
}
function bindHelpBoxes(){
  var boxes=document.querySelectorAll("details.help-box[data-help-id]");
  for(var i=0;i<boxes.length;i++){
    (function(box){
      var id=box.getAttribute("data-help-id");
      if(!id)return;
      try{if(localStorage.getItem("fp_help_"+id)==="1")box.open=true;}catch(e){}
      box.addEventListener("toggle",function(){
        try{localStorage.setItem("fp_help_"+id,box.open?"1":"0");}catch(e){}
      });
    })(boxes[i]);
  }
}
function requireOnline(actionLabel){
  if(typeof navigator!=="undefined"&&navigator.onLine===false)throw new Error("Device appears offline. "+actionLabel+" will queue for Pending Sync when connection returns.");
}
function captureModeText(){
  if(A.lastSaveResult&&A.lastSaveResult.note)return{label:"Saved to Zoho",detail:"Report saved. Continue editing and save again to update the Deal note."};
  if(A.report)return{label:"Generated report ready",detail:"Report is ready. Open the Report tab to review and save to Zoho."};
  if(A.currentHistoryId)return{label:"Continuing report from History",detail:"Opened from History. Saving again updates the same report."};
  if(typeof captureDraftHasWork==="function"&&captureDraftHasWork())return{label:"New report in progress",detail:"Capture notes, photos, and sections. Generate when ready."};
  return{label:"New report",detail:"Select a deal and start capturing field data."};
}
function updateCaptureModeStatus(){
  var e=el("capture-mode-status");if(!e)return;
  var m=captureModeText();
  e.innerHTML="<strong>"+esc(m.label)+"</strong><div style='font-size:11px;color:#64748b;margin-top:2px'>"+esc(m.detail)+"</div>";
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
    updateAssetOsmLink();
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
  if(el("asset-account")){setAssetInput("asset-account",A.sel?A.sel.Account_Name:assetSaveAccountName());}
  if(typeof renderAssetSetupUi==="function")renderAssetSetupUi();
  updateInboxDealUI();
}
function updateInboxDealUI(){
  var nd=el("no-deal-inbox"),bar=el("inbox-deal-bar"),da=el("idb-acct"),di=el("idb-info");
  if(!nd&&!bar)return;
  if(A.sel){
    if(bar)bar.style.display="block";
    if(nd)nd.style.display="none";
    if(da)da.textContent=A.sel.Account_Name||"";
    if(di)di.textContent=(A.sel.Deal_Name||"")+(A.sel.Stage?" — "+A.sel.Stage:"")+(A.sel.Closing_Date?" — "+A.sel.Closing_Date:"");
  }else{
    if(bar)bar.style.display="none";
    if(nd)nd.style.display="flex";
    if(da)da.textContent="";if(di)di.textContent="";
  }
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
function stripHistoryPhotoDisplay(photo){
  return{id:photo.id,display:"",label:photo.label||"",desc:photo.desc||"",time:photo.time,w:photo.w||0,h:photo.h||0,aiDesc:photo.aiDesc||"",synthesis:photo.synthesis||"",syncStatus:photo.syncStatus||"not_synced",syncMessage:photo.syncMessage||"",savedToPhone:!!photo.savedToPhone,phoneFileName:photo.phoneFileName||"",phoneSource:photo.phoneSource||""};
}
function persistHistoryRecords(h,keepPhotosIndex){
  var saved=false,out=h;
  try{localStorage.setItem("fp_history",JSON.stringify(h));saved=true;}catch(e){}
  if(!saved){
    var trimmed=h.map(function(r,i){
      if(typeof keepPhotosIndex==="number"&&i===keepPhotosIndex)return r;
      var s=Object.assign({},r);
      if(s.photoData)s.photoData=s.photoData.map(stripHistoryPhotoDisplay);
      return s;
    });
    try{localStorage.setItem("fp_history",JSON.stringify(trimmed));saved=true;out=trimmed;}catch(e){}
  }
  if(!saved){
    var minimal=h.slice(0,5).map(function(r,i){
      var s=Object.assign({},r);
      if(i!==0)s.photoData=[];
      return s;
    });
    try{localStorage.setItem("fp_history",JSON.stringify(minimal));saved=true;out=minimal;}catch(e){}
  }
  return{saved:saved,records:out};
}
function saveOrUpdateHistory(meta){
  if(A.currentHistoryId){
    var h=getHistory(),idx=-1;
    for(var i=0;i<h.length;i++){if(h[i].id===A.currentHistoryId){idx=i;break;}}
    if(idx>=0){
      h[idx]=Object.assign({},h[idx],meta,{id:A.currentHistoryId,zohoNoteId:A.zohoNoteId||meta.zohoNoteId||h[idx].zohoNoteId||null});
      var pr=persistHistoryRecords(h,idx);
      if(!pr.saved)return null;
      badge("tb-hist",pr.records.filter(function(r){return!r.archived;}).length||"");
      renderHistory();
      return pr.records[idx]||h[idx];
    }
  }
  A.currentHistoryId=meta.id;
  return saveHistory(meta)?meta:null;
}
function updateCurrentHistory(fields){
  var h=getHistory(),idx=currentHistoryIndex();
  if(idx<0&&h.length>0)idx=0;
  if(idx<0)return;
  h[idx]=Object.assign({},h[idx],fields);
  A.currentHistoryId=h[idx].id;
  if(Object.prototype.hasOwnProperty.call(fields,"zohoNoteId"))A.zohoNoteId=fields.zohoNoteId||null;
  if(persistHistoryRecords(h,idx).saved)renderHistory();
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
  var r=await fetchWithTimeout(PROXY,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"find_note",token:A.zohoToken||ZOHO_ACCESS,deal_id:A.sel.id,note_title:zohoNoteTitle(),marker:marker})},ZOHO_FETCH_MS);
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
  renderTechnicianSelects(getTechnicianNames());
  ["tech-select","tech-prompt-select"].forEach(function(id){var e=el(id);if(e)e.value=A.technician||"";});
  var err=el("tech-prompt-err");if(err)err.textContent="";
}
function getTechnicianNames(){
  if(A.technicians&&A.technicians.length)return A.technicians.slice();
  return getTechnicianCache();
}
function getTechnicianCache(){
  try{
    var raw=localStorage.getItem("fp_technicians")||"";
    if(!raw)return[];
    var d=JSON.parse(raw);
    return Array.isArray(d)?d:(d.technicians||[]);
  }catch(e){return[];}
}
function saveTechnicianCache(names){
  A.technicians=names||[];
  try{localStorage.setItem("fp_technicians",JSON.stringify({savedAt:new Date().toISOString(),technicians:A.technicians}));}catch(e){}
}
function renderTechnicianSelects(names){
  names=names||[];
  ["tech-select","tech-prompt-select"].forEach(function(id){
    var e=el(id);if(!e)return;
    var cur=e.value||A.technician||"";
    e.innerHTML="<option value=''>Select technician</option>"+names.map(function(n){return"<option value='"+esc(n)+"'>"+esc(n)+"</option>";}).join("");
    if(cur&&(names.indexOf(cur)>=0||cur))e.value=cur;
  });
  var st=el("tech-load-status");
  if(st)st.textContent=names.length?names.length+" technicians from Zoho Internal_Assets.Users":"No technicians loaded — tap Refresh from Zoho";
}
async function techniciansFromLocalConfig(){
  try{
    var cfg=await loadEquipmentConfig();
    var users=cfg&&cfg.modules&&cfg.modules.Internal_Assets&&cfg.modules.Internal_Assets.picklists&&cfg.modules.Internal_Assets.picklists.Users;
    var active=(users&&users.active_values)||[];
    return active.filter(function(n){return n&&n!=="Spare";});
  }catch(e){return[];}
}
async function loadTechniciansFromZoho(opts){
  opts=opts||{};
  var cached=getTechnicianCache();
  if(cached.length&&!opts.force)renderTechnicianSelects(cached);
  try{
    await refreshZohoToken();
    var r=await fetchWithTimeout(PROXY,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"get_technicians",token:A.zohoToken,field_api_name:"Users"})},30000);
    var txt=await r.text();
    if(!r.ok)throw new Error("Technician list "+r.status+": "+txt.substring(0,120));
    var d={};try{d=JSON.parse(txt);}catch(e){}
    var names=(d.technicians||[]).filter(function(n){return n&&n!=="Spare";});
    if(!names.length)throw new Error("Zoho returned no active technicians.");
    saveTechnicianCache(names);
    renderTechnicianSelects(names);
    setTechnicianUI();
    if(!opts.silent)showToast("Technicians updated from Zoho",2500);
    return names;
  }catch(e){
    var fallback=await techniciansFromLocalConfig();
    if(fallback.length){
      saveTechnicianCache(fallback);
      renderTechnicianSelects(fallback);
      setTechnicianUI();
      if(!opts.silent)showToast("Using cached technician list",3000);
      return fallback;
    }
    if(!opts.silent)showToast("Could not load technicians: "+e.message,6000);
    throw e;
  }
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
  initNoAutofill(m);
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
function openQuickStart(){var m=el("quickstartmodal");if(m)m.style.display="flex";}
function closeQuickStart(){var m=el("quickstartmodal");if(m)m.style.display="none";}
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
  initNoAutofill(m);
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
  restoreZohoTokenCache();
  try{
    var sm=el("sync-msg");if(sm){sm.textContent="Starting CapStone v"+FP_VERSION+"...";sm.style.color="var(--dim)";}
    A.technician=localStorage.getItem("fp_technician")||"";
    var k=localStorage.getItem("fp_api_key");
    if(k&&k.startsWith("sk-ant")){API_KEY=k;setKeyUI(true);}else setKeyUI(false);
    if(localStorage.getItem("fp_theme")==="light"){document.body.classList.add("light");var td=el("tog-dark");if(td)td.classList.remove("on");}
    if(localStorage.getItem("fp_record_audio")==="1"){A.recordAudio=true;var rt=el("audio-tog");if(rt)rt.classList.add("on");}
    A.autoSaveZoho=localStorage.getItem("fp_auto_save_zoho")!=="0";
    A.autoSavePhonePhotos=localStorage.getItem("fp_auto_save_phone_photos")!=="0";
    var az=el("tog-auto-zoho");if(az)az.classList.toggle("on",A.autoSaveZoho);
    var ap=el("tog-auto-phone-photos");if(ap)ap.classList.toggle("on",A.autoSavePhonePhotos);
    setTechnicianUI();
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
    var lu=el("fp-latest-url");
    if(lu){
      var testUrl=appBaseUrl()+"?v="+FP_VERSION;
      lu.innerHTML="Latest update: <a href=\""+testUrl+"\" style=\"color:var(--amber)\">FieldPro.html?v="+FP_VERSION+"</a>";
    }
    maybePromptForTechnician();
    updateCaptureModeStatus();
    bindHelpBoxes();
    initButtonFeedback();
    initNoAutofill();
    installAutoAdvanceAll();
    installActionWrappers();
    loadTechniciansFromZoho({silent:true}).catch(function(){});
    setupAssetFieldAiButtons();
    restoreFieldAiUiFromQueue();
    renderInboxBadge();
    if(typeof renderPlaudSettingsUI==="function")renderPlaudSettingsUI();
    if(isPlaudConnected()&&isPlaudAutoPullEnabled())startPlaudAutoPullIfNeeded();
    startInboxPollIfNeeded();
  }catch(e){
    showDealsErr("CapStone failed to start: "+e.message);
    alert("CapStone failed to start: "+e.message+"\n\nTry: Settings → Reset App Cache, or clear browser data for this site.");
  }
}
async function startCapStone(){
  if(await checkForAppUpdate())return;
  bootApp();
  setTimeout(maybeRestoreCaptureDraft,500);
  setTimeout(maybeRestoreAssetDraft,900);
  setupPendingUploadAutoRetry();
  setupPendingAiAutoRetry();
  setupPlaudForegroundPull();
  try{
    document.addEventListener("visibilitychange",function(){
      if(document.visibilityState!=="hidden")return;
      if(typeof captureDraftHasWork==="function"&&captureDraftHasWork())saveCaptureWorkLocally({silent:true});
      if(typeof assetDraftHasWork==="function"&&assetDraftHasWork())saveAssetDraftNow();
    });
    window.addEventListener("pagehide",function(){
      if(typeof captureDraftHasWork==="function"&&captureDraftHasWork())saveCaptureDraftNow();
      if(typeof assetDraftHasWork==="function"&&assetDraftHasWork())saveAssetDraftNow();
    });
  }catch(e){}
}
window.onload=startCapStone;
window.enterKey=enterKey;
window.saveApiKey=saveApiKey;
window.openQuickStart=openQuickStart;
window.closeQuickStart=closeQuickStart;
window.closeKeyModal=closeKeyModal;
window.dismissTechnicianPrompt=dismissTechnicianPrompt;
window.saveTechnicianPrompt=saveTechnicianPrompt;
window.go=go;
window.retryCapturePhotoUpload=retryCapturePhotoUpload;
window.saveTechnicianSetting=saveTechnicianSetting;
window.loadTechniciansFromZoho=loadTechniciansFromZoho;
window.confirmAssetPhotoDescription=confirmAssetPhotoDescription;
window.cancelAssetPhotoDescription=cancelAssetPhotoDescription;
window.pickAssetPhotoRole=pickAssetPhotoRole;
window.editAssetPhotoLabel=editAssetPhotoLabel;
window.retryPendingUploads=retryPendingUploads;
window.clearPendingUploads=clearPendingUploads;
window.runFieldPolishAi=runFieldPolishAi;
window.retryPendingAi=retryPendingAi;
window.clearPendingAi=clearPendingAi;
window.inboxAudioSelected=inboxAudioSelected;
window.addInboxManualNote=addInboxManualNote;
window.editInboxTranscript=editInboxTranscript;
window.linkInboxToDealPrompt=linkInboxToDealPrompt;
window.openInboxDealPicker=openInboxDealPicker;
window.closeInboxDealPicker=closeInboxDealPicker;
window.applyInboxDealPickerFilters=applyInboxDealPickerFilters;
window.linkInboxToActiveDeal=linkInboxToActiveDeal;
window.generateInboxSummary=generateInboxSummary;
window.saveInboxToZoho=saveInboxToZoho;
window.deleteInboxItem=deleteInboxItem;
window.pullFromPlaud=pullFromPlaud;
window.savePlaudRefreshToken=savePlaudRefreshToken;
window.verifyPlaudConnection=verifyPlaudConnection;
window.clearPlaudConnection=clearPlaudConnection;
window.togglePlaudAutoPull=togglePlaudAutoPull;
window.assetPhotoSelected=assetPhotoSelected;
window.extractAssetFromPhoto=extractAssetFromPhoto;
window.saveAssetToZoho=saveAssetToZoho;
window.checkZohoProxyDeploy=checkZohoProxyDeploy;
window.resetAssetFormForNext=resetAssetFormForNext;
window.searchExistingAssets=searchExistingAssets;
window.searchAssetByCurrentField=searchAssetByCurrentField;
window.loadExistingAssetFromSearch=loadExistingAssetFromSearch;
window.reopenSavedAsset=reopenSavedAsset;
window.setAssetMode=setAssetMode;
window.setAssetSetupMode=setAssetSetupMode;
window.setAssetIntent=setAssetIntent;
window.resetAssetIntent=resetAssetIntent;
window.startAssetAccountAdd=startAssetAccountAdd;
window.startAssetDealAdd=startAssetDealAdd;
window.setAssetLinkMode=setAssetLinkMode;
window.openAssetAccountPicker=openAssetAccountPicker;
window.closeAssetAccountPicker=closeAssetAccountPicker;
window.applyAssetAccountPickerFilters=applyAssetAccountPickerFilters;
window.pickAssetAccount=pickAssetAccount;
window.applyAssetPicklistNearMatch=applyAssetPicklistNearMatch;
window.requestAssetPicklistValue=requestAssetPicklistValue;
window.addAssetSubformRow=addAssetSubformRow;
window.removeAssetSubformRow=removeAssetSubformRow;
window.startAssetReplacement=startAssetReplacement;
window.retryReportSave=retryReportSave;
window.retryReportUploads=retryReportUploads;
window.saveCaptureWorkLocally=saveCaptureWorkLocally;
window.saveCapturePhotoToPhone=saveCapturePhotoToPhone;
window.saveAllCapturePhotosToPhone=saveAllCapturePhotosToPhone;
function showUploadStatus(msg,isErr){
  var u=el("upload-status");if(!u)return;
  if(msg){u.textContent=msg;u.style.display="block";u.style.borderColor=isErr?"#ef4444":"#006050";u.style.color=isErr?"#fca5a5":"var(--amber)";}
  else u.style.display="none";
}
function fetchTimeoutMessage(ms){return "Request timed out after "+Math.round(ms/1000)+"s";}
function setGlobalBusy(on){
  var g=el("fp-global-busy");
  if(g)g.classList.toggle("fp-show",!!on);
}
function clearActiveButtonBusy(){
  if(_fpActiveBtn){
    _fpActiveBtn.classList.remove("is-busy");
    if(!_fpActiveBtn.hasAttribute("data-keep-disabled")){
      if(_fpActiveBtn.tagName==="BUTTON"||_fpActiveBtn.tagName==="INPUT"||(_fpActiveBtn.tagName==="LABEL"&&_fpActiveBtn.classList.contains("fbtn")))_fpActiveBtn.disabled=false;
    }
    _fpActiveBtn=null;
  }
  if(_fpBtnReleaseTimer){clearTimeout(_fpBtnReleaseTimer);_fpBtnReleaseTimer=null;}
}
function incGlobalBusy(){
  _fpBusyCount++;
  setGlobalBusy(true);
}
function decGlobalBusy(){
  _fpBusyCount=Math.max(0,_fpBusyCount-1);
  setGlobalBusy(_fpBusyCount>0);
  if(_fpBusyCount===0)clearActiveButtonBusy();
}
function markButtonBusy(btn){
  if(!btn||btn.disabled||btn.getAttribute("data-no-busy")!==null)return;
  clearActiveButtonBusy();
  _fpActiveBtn=btn;
  btn.classList.add("is-busy");
  if(btn.tagName==="BUTTON"||btn.tagName==="INPUT"||(btn.tagName==="LABEL"&&btn.classList.contains("fbtn")))btn.disabled=true;
  if(_fpBtnReleaseTimer)clearTimeout(_fpBtnReleaseTimer);
  _fpBtnReleaseTimer=setTimeout(function(){
    if(_fpBusyCount===0)clearActiveButtonBusy();
    _fpBtnReleaseTimer=null;
  },120000);
}
function wrapAction(fn){
  if(typeof fn!=="function"||fn._fpWrapped)return fn;
  var wrapped=function(){
    var btn=_fpLastClickedBtn;
    markButtonBusy(btn);
    incGlobalBusy();
    var result;
    try{result=fn.apply(this,arguments);}
    catch(err){decGlobalBusy();throw err;}
    if(result&&typeof result.then==="function"){
      return result.then(function(v){return v;},function(e){throw e;}).finally(function(){decGlobalBusy();});
    }
    decGlobalBusy();
    return result;
  };
  wrapped._fpWrapped=true;
  wrapped._fpOriginal=fn;
  return wrapped;
}
var FP_ACTION_NAMES=["go","newProject","loadDeals","resetDealsUI","getLocation","toggleRecordAudio","startCam","snap","togglePause","stopCam","saveVideo","saveAllCapturePhotosToPhone","saveCaptureWorkLocally","generate","setAssetIntent","resetAssetIntent","setAssetSetupMode","startAssetDealAdd","startAssetAccountAdd","openAssetAccountPicker","closeAssetAccountPicker","pickAssetAccount","searchExistingAssets","searchAssetByCurrentField","loadExistingAssetFromSearch","startAssetReplacement","extractAssetFromPhoto","saveAssetToZoho","checkZohoProxyDeploy","resetAssetFormForNext","reopenSavedAsset","applyAssetPicklistNearMatch","requestAssetPicklistValue","addAssetSubformRow","removeAssetSubformRow","saveNote","openShare","togPhotos","dlPDF","retryReportSave","retryReportUploads","openInboxDealPicker","pullFromPlaud","addInboxManualNote","generateInboxSummary","saveInboxToZoho","loadAccountsMap","applyMapFilters","applyMapClusterMode","clearMapStageFilter","toggleMapLegend","toggleMapMissingPanel","toggleMapSitePanel","loadTechniciansFromZoho","retryPendingUploads","clearPendingUploads","retryPendingAi","clearPendingAi","exportHistory","clearOldPhotos","clearAllHistory","resetAppCache","clearWorkDriveFolderCache","clearDealCache","savePlaudRefreshToken","verifyPlaudConnection","clearPlaudConnection","togglePlaudAutoPull","toggleAutoSaveZoho","toggleAutoSavePhonePhotos","toggleDark","enterKey","saveApiKey","openQuickStart","runFieldPolishAi","editAssetPhotoLabel","linkInboxToActiveDeal","mapSelectDeal","mapSelectDealForAccount","mapZoomPendingSite","selectDeal","applyFilters","setSort","importCSV","retryCapturePhotoUpload","saveCapturePhotoToPhone","addPhotos","autoSync","uploadToWorkDriveAll","dlHistPDF"];
var FP_WRAP_SKIP={wrapAction:1,withBusy:1,fetchWithTimeout:1,incGlobalBusy:1,decGlobalBusy:1,markButtonBusy:1,clearActiveButtonBusy:1,initButtonFeedback:1,installActionWrappers:1,fpRememberView:1,fpRestoreView:1,fpAfterDomUpdate:1,initNoAutofill:1,el:1,esc:1,showToast:1};
function installActionWrappers(){
  FP_ACTION_NAMES.forEach(function(name){
    if(typeof window[name]==="function")window[name]=wrapAction(window[name]);
  });
  Object.keys(window).forEach(function(name){
    if(FP_WRAP_SKIP[name])return;
    var fn=window[name];
    if(typeof fn==="function"&&fn.constructor&&fn.constructor.name==="AsyncFunction"&&!fn._fpWrapped){
      window[name]=wrapAction(fn);
    }
  });
}
function initButtonFeedback(){
  document.addEventListener("pointerdown",function(e){
    var btn=e.target.closest(fpActionSelector());
    _fpLastClickedBtn=btn;
    if(btn&&!btn.disabled&&btn.getAttribute("data-no-busy")===null)btn.classList.add("btn-armed");
  },true);
  document.addEventListener("pointerup",function(e){
    var btn=e.target.closest(fpActionSelector());
    if(btn)btn.classList.remove("btn-armed");
  },true);
  document.addEventListener("pointercancel",function(e){
    var btn=e.target.closest(fpActionSelector());
    if(btn)btn.classList.remove("btn-armed");
  },true);
}
async function withBusy(btnOrId,fn){
  var btn=typeof btnOrId==="string"?el(btnOrId):btnOrId;
  markButtonBusy(btn);
  incGlobalBusy();
  try{return await fn();}
  finally{decGlobalBusy();}
}
function fetchWithTimeout(url,opts,ms){
  ms=ms||UPLOAD_FETCH_MS;
  opts=opts||{};
  incGlobalBusy();
  function finish(p){
    return p.finally(function(){decGlobalBusy();});
  }
  if(typeof AbortController!=="undefined"){
    var ac=new AbortController();
    var timer=setTimeout(function(){try{ac.abort(fetchTimeoutMessage(ms));}catch(e){ac.abort();}},ms);
    var o={method:opts.method,headers:opts.headers,body:opts.body,signal:ac.signal};
    return finish(fetch(url,o).then(function(r){clearTimeout(timer);return r;},function(e){
      clearTimeout(timer);
      var msg=String((e&&e.message)||e||"");
      if(e&&e.name==="AbortError"||msg.indexOf("aborted")>=0||msg.indexOf("abort")>=0)throw new Error(fetchTimeoutMessage(ms));
      throw e;
    }));
  }
  return finish(Promise.race([
    fetch(url,opts),
    new Promise(function(resolve,reject){
      setTimeout(function(){reject(new Error(fetchTimeoutMessage(ms)));},ms);
    })
  ]));
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
function toggleAutoSavePhonePhotos(){
  A.autoSavePhonePhotos=!A.autoSavePhonePhotos;
  var t=el("tog-auto-phone-photos");if(t)t.classList.toggle("on",A.autoSavePhonePhotos);
  try{localStorage.setItem("fp_auto_save_phone_photos",A.autoSavePhonePhotos?"1":"0");}catch(e){}
  showToast(A.autoSavePhonePhotos?"Phone photo backup ON":"Phone photo backup OFF",2500);
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

function setCaptureDraftStatus(msg,isErr){var e=el("capture-draft-status");if(!e)return;if(msg){e.textContent=msg;e.style.display="block";e.style.color=isErr?"#991b1b":"#2d6b60";e.style.background=isErr?"#fee2e2":"#fff";e.style.borderColor=isErr?"#ef4444":"#b2ddd6";}else e.style.display="none";}
function captureDraftSections(){var sd={};SEC_IDS.forEach(function(id){var e=el(id);if(e)sd[id]=e.value||"";});return sd;}
function captureDraftHasWork(){
  var tx=(el("tx")||{value:""}).value.trim();
  var tx2=(el("tx2")||{value:""}).value.trim();
  var hasSec=SEC_IDS.some(function(id){var e=el(id);return e&&e.value.trim();});
  return !!(A.sel||A.location||tx||tx2||hasSec||A.photos.length||A.report);
}
function buildCaptureDraft(){
  return{version:1,savedAt:new Date().toISOString(),dealId:A.sel&&A.sel.id||null,deal:A.sel||null,location:A.location||null,photos:A.photos.map(function(p){return{id:p.id,display:p.display,label:p.label||"",desc:p.desc||"",time:p.time,w:p.w||0,h:p.h||0,aiDesc:p.aiDesc||"",synthesis:p.synthesis||"",syncStatus:p.syncStatus||"not_synced",syncMessage:p.syncMessage||"",savedToPhone:!!p.savedToPhone,phoneFileName:p.phoneFileName||"",phoneSource:p.phoneSource||""};}),reportPhotos:A.reportPhotos||[],report:A.report||"",voiceNotes:getVoiceNotesValue(),sections:captureDraftSections(),technician:A.reportTechnician||currentTechnicianName(),currentHistoryId:A.currentHistoryId||null,zohoNoteId:A.zohoNoteId||null,dealPdfAttached:!!A.dealPdfAttached,workdrivePdfUrl:A.workdrivePdfUrl||null};
}
function buildCaptureHistoryMeta(){
  var vn=(el("tx")||{value:""}).value;
  var sd={};SEC_IDS.forEach(function(id){var e=el(id);if(e)sd[id]=e.value;});
  var sp=A.photos.map(function(p){return{id:p.id,display:p.display,label:p.label||"",desc:p.desc||"",time:p.time,w:p.w||0,h:p.h||0,aiDesc:p.aiDesc||"",synthesis:p.synthesis||"",syncStatus:p.syncStatus||"not_synced",syncMessage:p.syncMessage||"",savedToPhone:!!p.savedToPhone,phoneFileName:p.phoneFileName||"",phoneSource:p.phoneSource||""};});
  if(!A.currentHistoryId)A.currentHistoryId="r"+Date.now();
  return{
    id:A.currentHistoryId,
    date:new Date().toISOString(),
    account:A.sel?A.sel.Account_Name:"No deal",
    deal:A.sel?(A.sel.Deal_Name||""):"",
    stage:A.sel?(A.sel.Stage||""):"",
    location:A.location?(A.location.address||A.location.lat.toFixed(4)+","+A.location.lng.toFixed(4)):"",
    locationData:locationMeta(),
    photos:sp.length,
    photoData:sp,
    sections:sd,
    report:A.report||"",
    voiceNotes:vn,
    technician:currentTechnicianName(),
    dealPdfAttached:!!A.dealPdfAttached,
    dealId:A.sel?A.sel.id:null,
    zohoNoteId:A.zohoNoteId||null,
    zohoSaved:!!(A.lastSaveResult&&A.lastSaveResult.note),
    captureInProgress:!A.report,
    localSavedAt:new Date().toISOString()
  };
}
function saveCaptureWorkLocally(opts){
  opts=opts||{};
  if(!captureDraftHasWork())return false;
  var saved=!!saveOrUpdateHistory(buildCaptureHistoryMeta());
  if(saved){
    var t=new Date().toLocaleTimeString();
    setCaptureDraftStatus("Saved locally to History "+t+" — Zoho can wait for better signal");
    if(!opts.silent)showToast("Capture saved locally to History",3500);
  }else{
    setCaptureDraftStatus("Local History save failed — storage may be full. Export older History from Settings.",true);
    updateCaptureStorageWarning();
    if(!opts.silent)showToast("Could not save locally — storage may be full",7000);
  }
  return saved;
}
function scheduleCaptureHistorySave(){
  if(A.draftRestored===false&&document.readyState==="loading")return;
  if(A.historySaveTimer)clearTimeout(A.historySaveTimer);
  A.historySaveTimer=setTimeout(function(){A.historySaveTimer=null;saveCaptureWorkLocally({silent:true});},5000);
}
function saveCaptureDraftNow(){
  if(!captureDraftHasWork())return;
  try{
    localStorage.setItem("fp_capture_draft",JSON.stringify(buildCaptureDraft()));
    setCaptureDraftStatus("Draft saved "+new Date().toLocaleTimeString());
  }catch(e){
    console.log("capture draft save",e);
    if(saveCaptureWorkLocally({silent:true}))setCaptureDraftStatus("Draft full — saved to History "+new Date().toLocaleTimeString());
    else setCaptureDraftStatus("Local save failed — tap Save Locally or free History storage",true);
  }
  scheduleCaptureHistorySave();
}
function scheduleCaptureDraftSave(){
  if(A.draftRestored===false&&document.readyState==="loading")return;
  if(A.draftTimer)clearTimeout(A.draftTimer);
  A.draftTimer=setTimeout(function(){A.draftTimer=null;saveCaptureDraftNow();},800);
}
function clearCaptureDraft(){try{localStorage.removeItem("fp_capture_draft");}catch(e){}setCaptureDraftStatus("",false);}
function restoreCaptureDraft(d){
  if(!d)return;
  A.sel=d.deal||null;A.location=d.location||null;A.photos=d.photos||[];A.reportPhotos=d.reportPhotos||[];A.report=d.report||"";A.reportTechnician=d.technician||"";A.currentHistoryId=d.currentHistoryId||null;A.zohoNoteId=d.zohoNoteId||null;A.dealPdfAttached=!!d.dealPdfAttached;A.workdrivePdfUrl=d.workdrivePdfUrl||null;
  if(el("tx"))el("tx").value=d.voiceNotes||"";if(el("tx2"))el("tx2").value=d.voiceNotes||"";
  if(d.sections)SEC_IDS.forEach(function(id){var e=el(id);if(e)e.value=d.sections[id]||"";});
  updateDealUI();updateLocationUI();renderPhotoCards();checkGen();scheduleCaptureDraftSave();if(A.report)renderReport();badge("tb-photos",A.photos.length||"");
}
function captureDraftSummary(d,label){
  var sections=d&&d.sections?Object.keys(d.sections).filter(function(k){return String(d.sections[k]||"").trim();}).length:0;
  var notes=String(d&&d.voiceNotes||"").trim();
  return [
    "Restore unsaved CapStone capture draft saved "+label+"?",
    "",
    "Account/Deal: "+(d&&d.deal?dealHeaderText(d.deal):"No deal selected"),
    "Technician: "+((d&&d.technician)||"Not selected"),
    "GPS: "+(d&&d.location?"Captured":"Missing"),
    "Photos: "+((d&&d.photos&&d.photos.length)||0),
    "Voice Notes: "+(notes?"Present":"Missing"),
    "Filled Sections: "+sections,
    "Report: "+(d&&d.report?"Generated":"Not generated")
  ].join("\n");
}
function maybeRestoreCaptureDraft(){
  var raw="";try{raw=localStorage.getItem("fp_capture_draft")||"";}catch(e){}
  if(!raw)return;
  var d=null;try{d=JSON.parse(raw);}catch(e){clearCaptureDraft();return;}
  var label=d&&d.savedAt?new Date(d.savedAt).toLocaleString():"recently";
  if(confirm(captureDraftSummary(d,label))){restoreCaptureDraft(d);A.draftRestored=true;showToast("Capture draft restored",3000);setCaptureDraftStatus("Draft restored");updateCaptureModeStatus();go("capture");}
  else clearCaptureDraft();
}
function newProject(){
  if((A.photos.length>0||(el("tx")&&el("tx").value.trim()))&&!confirm("Start new project? Current work will be saved to History first."))return;
  if(captureDraftHasWork())saveCaptureWorkLocally({silent:true});
  clearCapture();go("capture");
}
function clearCapture(){
  clearCaptureDraft();
  A.photos=[];A.reportPhotos=[];A.reportTechnician="";A.dealPdfAttached=false;A.lastSaveResult=null;A.lastSaveIssue=null;A.location=null;A.report="";A.sel=null;A.videoBlob=null;A.videoChunks=[];A.workdrivePdfUrl=null;A.currentHistoryId=null;A.zohoNoteId=null;
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
  updateCaptureModeStatus();
}
function saveCurrentToHistory(){return saveCaptureWorkLocally({silent:true});}

// ZOHO
function restoreZohoTokenCache(){
  try{
    var raw=sessionStorage.getItem("fp_zoho_tok");
    if(!raw)return;
    var j=JSON.parse(raw);
    if(j.t&&j.e&&Date.now()<j.e-60000){A.zohoToken=j.t;A.zohoTokenExpiresAt=j.e;}
  }catch(e){}
}
function saveZohoTokenCache(){
  try{
    if(A.zohoToken&&A.zohoTokenExpiresAt)sessionStorage.setItem("fp_zoho_tok",JSON.stringify({t:A.zohoToken,e:A.zohoTokenExpiresAt}));
  }catch(e){}
}
async function refreshZohoToken(force){
  A.zohoRefreshError=null;
  if(!force&&A.zohoToken&&A.zohoTokenExpiresAt&&Date.now()<A.zohoTokenExpiresAt-120000)return true;
  for(var attempt=0;attempt<2;attempt++){
    try{
      var r=await fetchWithTimeout(PROXY,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"refresh_token",refresh_token:ZOHO_REFRESH,client_id:ZOHO_CLIENT,client_secret:ZOHO_SECRET})},45000);
      var txt=await r.text();
      var d={};
      try{d=JSON.parse(txt);}catch(pe){}
      if(d.error_description&&!d.access_token)A.zohoRefreshError=String(d.error_description);
      else if(d.error&&!d.access_token)A.zohoRefreshError=String(d.error);
      if(d.access_token){
        A.zohoToken=d.access_token;
        A.zohoTokenExpiresAt=Date.now()+(parseInt(d.expires_in,10)||3600)*1000;
        saveZohoTokenCache();
        return true;
      }
      if(!A.zohoRefreshError)A.zohoRefreshError=String(d.error||d.message||("HTTP "+r.status+(txt?": "+txt.substring(0,100):""))).trim();
    }catch(e){
      A.zohoRefreshError=e.message||String(e);
    }
    if(attempt===0&&!/too many requests|Access Denied/i.test(A.zohoRefreshError||""))await waitMs(1500);
    else break;
  }
  return false;
}
function zohoRefreshFailMsg(){
  var err=A.zohoRefreshError||"";
  if(/too many requests|Access Denied|rate limit/i.test(err))return"Zoho rate limit — too many token requests. Wait 10–15 minutes, then tap Refresh once. Do not tap repeatedly.";
  if(err.indexOf("timed out")>=0||err.indexOf("Timeout")>=0)return"Zoho connection timed out — check cell/Wi‑Fi signal and try again.";
  if(/invalid|expired|revoked|REFRESH/i.test(err))return"Zoho login expired — contact admin to refresh CapStone OAuth credentials.";
  if(/Failed to fetch|NetworkError|offline|Load failed/i.test(err))return"Cannot reach Zoho — device appears offline or Netlify proxy blocked.";
  if(err)return"Zoho error: "+err;
  return"Zoho token refresh failed — check connection and try again.";
}
async function loadDeals(){
  var btn=el("ref-btn");if(btn){btn.disabled=true;btn.textContent="Syncing...";}
  var sm=el("sync-msg");showDealsErr("");
  if(sm){sm.textContent="Connecting to Zoho CRM (20s timeout)...";sm.style.color="var(--dim)";}
  try{
    var tokOk=await refreshZohoToken();
    if(!tokOk)throw new Error(zohoRefreshFailMsg());
    var allDeals=[],page=1,hasMore=true;
    while(hasMore&&page<=10){
      var r=await fetchWithTimeout(PROXY,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"get_deals",token:A.zohoToken,page:page})},ZOHO_FETCH_MS);
      if(!r.ok){if(r.status===401){await refreshZohoToken(true);r=await fetchWithTimeout(PROXY,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"get_deals",token:A.zohoToken,page:page})},ZOHO_FETCH_MS);if(!r.ok)throw new Error("Zoho auth failed");}else throw new Error("Proxy error "+r.status);}
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
function selectDeal(id,opts){
  opts=opts||{};
  var d=A.deals.find(function(x){return x.id===id;});if(!d)return;
  var prevDealId=A.sel&&A.sel.id;
  if(prevDealId&&prevDealId!==id){A.currentHistoryId=null;A.zohoNoteId=null;}
  A.sel=d;
  A.asset.linkMode="deal";
  A.asset.standaloneAccount=null;
  if(prevDealId&&prevDealId!==id&&typeof resetAssetContextForSelectedDeal==="function")resetAssetContextForSelectedDeal("Asset form cleared for the newly selected deal.");
  A.workdriveFolderUrl=null;
  try{
    var cf=localStorage.getItem("fp_wd_folder_"+d.id);
    if(cf){var cj=JSON.parse(cf);if(cj.folder_id&&cj.folder_id!==WORKDRIVE_FOLDER&&cj.folder_url)A.workdriveFolderUrl=cj.folder_url;}
  }catch(e){}
  updateDealUI();
  applyFilters();
  updateCaptureModeStatus();
  if(opts.linkInboxItemId){
    linkInboxToDeal(opts.linkInboxItemId,d.id);
    closeInboxDealPicker();
    return;
  }
  var tab=opts.stayOnTab||"capture";
  if(tab==="inbox"){
    go("inbox");
    return;
  }
  if(tab==="assets"){
    go("assets");
    return;
  }
  if(tab==="deals"){
    go("deals");
    return;
  }
  go("capture");
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
function assetStatus(msg,isErr){var e=el("asset-status");if(!e)return;if(msg){e.textContent=msg;e.style.display="block";if(isErr){e.style.borderColor="#ef4444";e.style.color="#fca5a5";e.style.background="#1a0a0a";}else if(/saved to zoho/i.test(msg)){e.style.borderColor="#86efac";e.style.color="#166534";e.style.background="#f0fdf4";}else{e.style.borderColor="#006050";e.style.color="var(--amber)";e.style.background="#1a0a0a";}}else e.style.display="none";}
function assetInput(id){var e=el(id);return e?(e.value||"").trim():"";}
function setAssetInput(id,val){var e=el(id);if(e){e.value=val||"";if(id.indexOf("asset-")===0&&id!=="asset-status"&&typeof updateAssetSaveState==="function"){setTimeout(updateAssetSaveState,0);if(id!=="asset-draft-status")scheduleAssetDraftSave();}if((id==="asset-brand-other"||id==="asset-series-other")&&assetInput("asset-category")&&categoryLayout(assetInput("asset-category")))setTimeout(refreshCategoryFieldDefaultsOnly,0);}}
function assetPicklists(){return A.equipmentConfig&&A.equipmentConfig.modules&&A.equipmentConfig.modules.Equipments&&A.equipmentConfig.modules.Equipments.picklists||{};}
var ASSET_CATEGORY_PICKLIST_ORDER=["Flow Meter","Flow Open Channel","Gas Detector","General","Lift Station","Scales & Balances"];
var DEPRECATED_ASSET_CATEGORIES={"Flow":true,"Open Channel Flow":true,"Analytical":true};
function mergeAssetCategoryPicklistValues(extra){
  var seen={},out=[];
  function add(v){
    var s=String(v||"").trim();
    if(!s||DEPRECATED_ASSET_CATEGORIES[s]||seen[s])return;
    seen[s]=true;
    out.push(s);
  }
  ASSET_CATEGORY_PICKLIST_ORDER.forEach(add);
  var cfgVals=assetPicklists().Asset_Category&&assetPicklists().Asset_Category.values;
  if(cfgVals)cfgVals.forEach(add);
  var layouts=(A.equipmentConfig&&A.equipmentConfig.categoryLayouts)||{};
  Object.keys(layouts).forEach(add);
  (extra||[]).forEach(add);
  return out;
}
function setAssetCategoryPicklistValues(vals){
  if(!A.equipmentConfig||!A.equipmentConfig.modules||!A.equipmentConfig.modules.Equipments)return;
  var picklists=A.equipmentConfig.modules.Equipments.picklists;
  if(!picklists.Asset_Category)picklists.Asset_Category={label:"Asset Category",type:"picklist",values:[]};
  picklists.Asset_Category.values=vals;
}
async function refreshAssetCategoryPicklist(){
  await loadEquipmentConfig();
  var merged=mergeAssetCategoryPicklistValues();
  setAssetCategoryPicklistValues(merged);
  if(!A.zohoToken)return merged;
  try{
    var r=await fetchWithTimeout(PROXY,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"get_asset_category_picklist",token:A.zohoToken})},30000);
    if(!r.ok)return merged;
    var d={};try{d=await r.json();}catch(e){}
    var zohoVals=d&&d.data;
    if(Array.isArray(zohoVals)&&zohoVals.length){
      merged=mergeAssetCategoryPicklistValues(zohoVals);
      setAssetCategoryPicklistValues(merged);
    }
  }catch(e){console.log("asset category picklist",e);}
  return merged;
}
function assetPicklistValues(field){var p=assetPicklists()[field];return p&&p.values||[];}
function fillAssetSelect(id,field,placeholder){var e=el(id);if(!e)return;var cur=e.value;var vals=assetPicklistValues(field);e.innerHTML="<option value=''>"+(placeholder||"Select")+"</option>"+vals.map(function(v){return"<option value='"+esc(v)+"'>"+esc(v)+"</option>";}).join("");if(cur)e.value=cur;}
async function loadEquipmentConfig(){
  if(A.equipmentConfig)return A.equipmentConfig;
  var r=await fetch("src/config/zohoEquipmentFields.json",{cache:"no-store"});
  if(!r.ok)throw new Error("Could not load equipment field config");
  A.equipmentConfig=await r.json();
  return A.equipmentConfig;
}
function assetFieldRegistry(){return(A.equipmentConfig&&A.equipmentConfig.assetFieldRegistry)||{};}
function engineeringUnitsLookupConfig(){return A.equipmentConfig&&A.equipmentConfig.engineeringUnitsLookup||null;}
function engineeringUnitLookupOptions(){
  var opts;
  if(A.engineeringUnitLookups&&A.engineeringUnitLookups.length)opts=A.engineeringUnitLookups;
  else opts=assetPicklistValues("Engineering_Units").map(function(name){return{id:name,name:name};});
  if(!Array.isArray(opts))opts=assetPicklistValues("Engineering_Units").map(function(name){return{id:name,name:name};});
  return opts.map(function(o){
    if(typeof o==="string")return{id:o,name:o};
    return{id:o.id!=null?o.id:o.name,name:o.name||o.id||""};
  });
}
function resolveEngineeringUnitLookupId(val){
  var s=String(val||"").trim();if(!s)return null;
  var opts=engineeringUnitLookupOptions();
  for(var i=0;i<opts.length;i++){
    if(String(opts[i].id)===s)return String(opts[i].id);
    if(String(opts[i].name)===s)return String(opts[i].id);
  }
  return/^\d{10,}$/.test(s)?s:null;
}
function engineeringUnitLookupLabel(val){
  var s=String(val||"").trim();if(!s)return"";
  var opts=engineeringUnitLookupOptions();
  for(var i=0;i<opts.length;i++){
    if(String(opts[i].id)===s||String(opts[i].name)===s)return opts[i].name||opts[i].id;
  }
  return s;
}
async function loadEngineeringUnitLookups(){
  if(A.engineeringUnitLookups&&A.engineeringUnitLookups.length)return A.engineeringUnitLookups;
  if(A.engineeringUnitLookupsLoading)return A.engineeringUnitLookups||[];
  var cfg=engineeringUnitsLookupConfig();
  if(!cfg||!cfg.moduleApiName||!A.zohoToken)return [];
  A.engineeringUnitLookupsLoading=true;
  try{
    var r=await fetchWithTimeout(PROXY,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"list_engineering_units",token:A.zohoToken,module_api_name:cfg.moduleApiName,name_field:cfg.nameField||"Name"})},30000);
    if(!r.ok)throw new Error("Engineering units "+r.status);
    var d={};try{d=await r.json();}catch(e){}
    A.engineeringUnitLookups=(d&&d.data)||[];
  }catch(e){
    console.log("engineering unit lookups",e);
    A.engineeringUnitLookups=[];
  }finally{
    A.engineeringUnitLookupsLoading=false;
  }
  return A.engineeringUnitLookups;
}
function zohoApiNameForRegistryKey(key){
  var def=assetFieldRegistry()[key];
  return(def&&def.zohoApiName)||key;
}
function registryKeyForZohoApi(zohoApi){
  var reg=assetFieldRegistry();
  var keys=Object.keys(reg);
  for(var i=0;i<keys.length;i++){
    if(reg[keys[i]].zohoApiName===zohoApi)return keys[i];
  }
  return reg[zohoApi]?zohoApi:null;
}
function zohoFieldValueFromRecord(r,registryKey){
  if(!r)return null;
  var def=assetFieldRegistry()[registryKey];
  var zohoApi=zohoApiNameForRegistryKey(registryKey);
  var raw=null;
  if(r[zohoApi]!=null&&r[zohoApi]!=="")raw=r[zohoApi];
  else if(r[registryKey]!=null&&r[registryKey]!=="")raw=r[registryKey];
  if(raw==null||raw==="")return null;
  if(def&&def.widget==="multiselect"){
    if(Array.isArray(raw))return raw.filter(function(v){return v&&v!=="None";});
    return String(raw).split(";").map(function(s){return s.trim();}).filter(function(v){return v&&v!=="None";});
  }
  if(def&&def.widget==="lookup"){
    if(typeof raw==="object")return raw.id||raw.name||"";
    return String(raw);
  }
  return typeof raw==="object"?(raw.name||raw.id||""):String(raw);
}
function mapDynamicValuesToZohoPayload(dyn){
  var out={};
  Object.keys(dyn||{}).forEach(function(key){
    var def=assetFieldRegistry()[key];
    if(def&&def.note&&def.note.indexOf("No separate Zoho field")>=0)return;
    out[zohoApiNameForRegistryKey(key)]=dyn[key];
  });
  return out;
}
function normalizeAssetCategoryKey(cat){
  var c=String(cat||"").trim();
  if(!c)return"";
  var layouts=(A.equipmentConfig&&A.equipmentConfig.categoryLayouts)||{};
  if(/^flow$/i.test(c)&&layouts["Flow Meter"])return "Flow Meter";
  if(layouts[c])return c;
  var keys=Object.keys(layouts);
  for(var i=0;i<keys.length;i++){
    if(keys[i].toLowerCase()===c.toLowerCase())return keys[i];
  }
  if(/flow\s*open\s*channel|open\s*channel\s*flow/i.test(c)){
    if(layouts["Flow Open Channel"])return "Flow Open Channel";
    for(var j=0;j<keys.length;j++){
      if(/flow\s*open\s*channel|open\s*channel\s*flow/i.test(keys[j])&&!/^flow\s*meter$/i.test(keys[j]))return keys[j];
    }
  }
  if(/^flow\s*meter$/i.test(c)&&layouts["Flow Meter"])return "Flow Meter";
  if(/^analytical$/i.test(c)||/^general$/i.test(c)){
    if(layouts["General"])return "General";
    return "General";
  }
  return c;
}
function categoryLayout(cat){
  var layouts=(A.equipmentConfig&&A.equipmentConfig.categoryLayouts)||{};
  return layouts[normalizeAssetCategoryKey(cat)]||null;
}
function isDynamicFieldSkippable(def){
  return def&&def.note&&def.note.indexOf("No separate Zoho field")>=0;
}
function isDynamicFieldOptionalReminder(def){
  return !!(def&&def.optionalReminder);
}
function categoryDynamicFieldDefs(category){
  var layout=categoryLayout(category);
  if(!layout||!layout.sections)return[];
  var registry=assetFieldRegistry();
  var defs=[];
  layout.sections.forEach(function(sec){
    if(sec.subform)return;
    (sec.fields||[]).forEach(function(api){
      var d=registry[api];
      if(d&&!isDynamicFieldSkippable(d))defs.push(Object.assign({apiName:api},d));
    });
  });
  return defs;
}
function markDynamicFieldTouched(api){
  if(!A.asset.dynamicTouched)A.asset.dynamicTouched={};
  A.asset.dynamicTouched[api]=true;
}
function isDynamicFieldTouched(api){
  return!!(A.asset.dynamicTouched&&A.asset.dynamicTouched[api]);
}
function dynamicFieldSuggestedHint(api,def){
  var s=A.asset.dynamicSuggested&&A.asset.dynamicSuggested[api];
  if(!s)return"";
  if(def&&def.widget==="lookup")return engineeringUnitLookupLabel(s)||String(s);
  return String(s);
}
function dynamicFieldDisplayValue(api,def){
  if(!isDynamicFieldTouched(api))return def&&def.widget==="multiselect"?[]:"";
  var val=A.asset.dynamicValues&&A.asset.dynamicValues[api];
  if(val==null)return def&&def.widget==="multiselect"?[]:"";
  return val;
}
function dynamicFieldIsFilled(def,val){
  if(def&&def.widget==="multiselect"){
    var arr=Array.isArray(val)?val: String(val||"").split(";").map(function(s){return s.trim();}).filter(Boolean);
    return arr.length>0;
  }
  if(def&&def.widget==="number")return val!==""&&val!=null&&!isNaN(parseFloat(val));
  return String(val==null?"":val).trim().length>0;
}
function dynamicFieldMissingClass(api,def,val){
  if(isDynamicFieldSkippable(def))return"";
  if(isDynamicFieldOptionalReminder(def)){
    if(!dynamicFieldIsFilled(def,val))return" asset-required-missing";
    return"";
  }
  if(!isDynamicFieldTouched(api)||!dynamicFieldIsFilled(def,val))return" asset-required-missing";
  return"";
}
function dynamicFieldLabel(def){
  var val=dynamicFieldDisplayValue(def.apiName,def);
  var hint=dynamicFieldSuggestedHint(def.apiName,def);
  if(isDynamicFieldTouched(def.apiName)&&dynamicFieldIsFilled(def,val))hint="";
  var req=isDynamicFieldOptionalReminder(def)?"":" *";
  return esc(def.label)+req+(hint?" <span style='font-weight:400;color:var(--dim)'>(suggested: "+esc(hint)+")</span>":"");
}
function ensureSelectHasOption(selectEl,value,label){
  if(!selectEl||value==null||value==="")return;
  var v=String(value);
  for(var i=0;i<selectEl.options.length;i++){
    if(String(selectEl.options[i].value)===v)return;
  }
  var opt=document.createElement("option");
  opt.value=v;
  opt.textContent=label||v;
  selectEl.appendChild(opt);
}
function syncCategoryDefaultValuesToDom(){
  var cat=normalizeAssetCategoryKey(assetInput("asset-category"));
  if(!cat)return;
  categoryDynamicFieldDefs(cat).forEach(function(def){
    var api=def.apiName;
    if(!isDynamicFieldTouched(api))return;
    var val=A.asset.dynamicValues&&A.asset.dynamicValues[api];
    if(val==null||val==="")return;
    var e=el(assetDynId(api));
    if(!e)return;
    if(def.widget==="lookup"){
      var id=resolveEngineeringUnitLookupId(val)||String(val);
      ensureSelectHasOption(e,id,engineeringUnitLookupLabel(id)||engineeringUnitLookupLabel(val)||String(val));
      e.value=String(id);
    }else if(def.widget==="select"){
      ensureSelectHasOption(e,String(val),String(val));
      e.value=String(val);
    }else{
      e.value=String(val);
    }
  });
}
function assetRuleContext(){
  return{
    brand:String(assetInput("asset-brand")||"").trim(),
    series:String(assetInput("asset-series")||"").trim(),
    brandOther:String(assetInput("asset-brand-other")||"").trim(),
    seriesOther:String(assetInput("asset-series-other")||"").trim()
  };
}
function matchesSuggestedWhen(when,ctx){
  if(!when)return true;
  if(when.brand){
    var brand=ctx.brand;
    if(brand==="1 Other"||brand==="Other")brand=ctx.brandOther||brand;
    if(!picklistContextMatch(when.brand,brand,"Asset_Brand"))return false;
  }
  if(when.series){
    var series=ctx.series;
    if(series==="Other")series=ctx.seriesOther||series;
    if(!picklistContextMatch(when.series,series,"Asset_Series"))return false;
  }
  return true;
}
function picklistContextMatch(expected,actual,fieldApi){
  expected=String(expected||"").trim();
  actual=String(actual||"").trim();
  if(!expected)return true;
  if(!actual)return false;
  if(expected===actual)return true;
  if(expected.toLowerCase()===actual.toLowerCase())return true;
  if(fieldApi&&exactPicklistMatch(fieldApi,actual)===expected)return true;
  if(fieldApi&&assetPicklistNearMatch(fieldApi,actual)===expected)return true;
  var np=normalizePicklistCompare(expected),na=normalizePicklistCompare(actual);
  return !!(np&&na&&np===na);
}
function applyOneSuggestedField(has,api,spec,force){
  if(!has[api]||spec==null)return;
  if(!A.asset.dynamicSuggested)A.asset.dynamicSuggested={};
  if(!force&&A.asset.dynamicSuggested[api]!=null)return;
  if(typeof spec==="string"){
    A.asset.dynamicSuggested[api]=spec;
    return;
  }
  if(spec&&spec.lookup){
    var resolved=resolveEngineeringUnitDefault(spec.lookup);
    if(resolved)A.asset.dynamicSuggested[api]=resolved;
    else if(Array.isArray(spec.lookup)&&spec.lookup[0])A.asset.dynamicSuggested[api]=spec.lookup[0];
  }
}
function categorySuggestedDefaultsRule(category){
  var cfg=(A.equipmentConfig&&A.equipmentConfig.categorySuggestedDefaults)||{};
  var norm=normalizeAssetCategoryKey(category);
  if(cfg[norm])return cfg[norm];
  if(isOpenChannelFlowCategory(norm)&&cfg["Flow Open Channel"])return cfg["Flow Open Channel"];
  return null;
}
function applyCategorySuggestedRule(rule,has,ctx){
  if(!rule||!A.asset.dynamicSuggested)A.asset.dynamicSuggested={};
  Object.keys(rule.fields||{}).forEach(function(api){
    applyOneSuggestedField(has,api,rule.fields[api],false);
  });
  (rule.conditional||[]).forEach(function(block){
    Object.keys(block.fields||{}).forEach(function(api){
      delete A.asset.dynamicSuggested[api];
    });
  });
  (rule.conditional||[]).forEach(function(block){
    if(!matchesSuggestedWhen(block.when,ctx))return;
    Object.keys(block.fields||{}).forEach(function(api){
      applyOneSuggestedField(has,api,block.fields[api],true);
    });
  });
}
function resolveSuggestedValueForField(def,suggested){
  if(suggested==null||suggested==="")return"";
  if(!def)return String(suggested);
  if(def.widget==="lookup"){
    var resolved=resolveEngineeringUnitLookupId(suggested);
    if(resolved)return resolved;
    return String(suggested);
  }
  if(def.widget==="select"&&def.picklist){
    var opts=picklistValuesForDynamicField(def);
    var s=String(suggested);
    for(var i=0;i<opts.length;i++){
      if(opts[i]===s||opts[i].toLowerCase()===s.toLowerCase())return opts[i];
    }
    return s;
  }
  return String(suggested);
}
function applyCategorySuggestedValues(category){
  if(!category||!A.asset.dynamicSuggested)return;
  if(!A.asset.dynamicValues)A.asset.dynamicValues={};
  var norm=normalizeAssetCategoryKey(category);
  categoryDynamicFieldDefs(norm).forEach(function(def){
    var api=def.apiName;
    var suggested=A.asset.dynamicSuggested[api];
    if(!suggested)return;
    if(isDynamicFieldTouched(api)&&dynamicFieldIsFilled(def,A.asset.dynamicValues[api]))return;
    var storeVal=resolveSuggestedValueForField(def,suggested);
    if(!storeVal)return;
    A.asset.dynamicValues[api]=storeVal;
    markDynamicFieldTouched(api);
  });
}
function applyCategoryFieldDefaults(category){
  if(!category)return;
  if(!A.asset.dynamicSuggested)A.asset.dynamicSuggested={};
  var norm=normalizeAssetCategoryKey(category);
  var defs=categoryDynamicFieldDefs(norm);
  var has={};
  defs.forEach(function(d){has[d.apiName]=true;});
  var rule=categorySuggestedDefaultsRule(category);
  if(rule){
    applyCategorySuggestedRule(rule,has,assetRuleContext());
    applyCategorySuggestedValues(category);
    return;
  }
  if(has.Engineering_Units&&!A.asset.dynamicSuggested.Engineering_Units)A.asset.dynamicSuggested.Engineering_Units="GPM US";
  applyCategorySuggestedValues(category);
}
function refreshCategoryFieldSuggestionsIfReady(){
  var cat=assetInput("asset-category");
  if(!cat||!categoryLayout(cat))return;
  refreshCategoryFieldSuggestions();
}
function categoryFieldsAreRendered(){
  var box=el("asset-category-fields");
  if(!box||box.style.display==="none")return false;
  return !!box.querySelector(".asset-cat-section");
}
function refreshCategoryFieldDefaultsOnly(){
  var cat=normalizeAssetCategoryKey(assetInput("asset-category"));
  if(!cat||!categoryLayout(cat))return;
  if(!categoryFieldsAreRendered()){
    syncAssetCategoryLayoutUi();
    return;
  }
  syncDynamicFieldValuesFromDom();
  syncSubformRowsFromDom();
  categoryDynamicFieldDefs(cat).forEach(function(d){
    if(A.asset.dynamicSuggested)delete A.asset.dynamicSuggested[d.apiName];
  });
  applyCategoryFieldDefaults(cat);
  syncCategoryDefaultValuesToDom();
  updateAssetSaveState();
}
function refreshCategoryFieldSuggestions(){
  var cat=assetInput("asset-category");
  if(!cat||!categoryLayout(cat))return;
  syncDynamicFieldValuesFromDom();
  syncSubformRowsFromDom();
  categoryDynamicFieldDefs(normalizeAssetCategoryKey(cat)).forEach(function(d){
    if(A.asset.dynamicSuggested)delete A.asset.dynamicSuggested[d.apiName];
  });
  applyCategoryFieldDefaults(cat);
  renderAssetCategoryFields({skipDomSync:true});
  updateAssetSaveState();
}
function onAssetBrandOrSeriesChange(){
  refreshCategoryFieldDefaultsOnly();
  renderAssetPicklistRequestPanel();
}
function resetCategoryDynamicStateForCategory(category){
  var cat=normalizeAssetCategoryKey(category);
  var keep={};
  categoryDynamicFieldDefs(cat).forEach(function(d){keep[d.apiName]=true;});
  if(!A.asset.dynamicValues)A.asset.dynamicValues={};
  if(!A.asset.dynamicTouched)A.asset.dynamicTouched={};
  Object.keys(A.asset.dynamicValues).forEach(function(api){
    if(!keep[api]){delete A.asset.dynamicValues[api];delete A.asset.dynamicTouched[api];}
  });
}
function markDynamicRequiredFields(){
  var cat=normalizeAssetCategoryKey(assetInput("asset-category"));
  if(!cat)return[];
  syncDynamicFieldValuesFromDom();
  var missing=[];
  categoryDynamicFieldDefs(cat).forEach(function(def){
    var api=def.apiName;
    if(isDynamicFieldOptionalReminder(def))return;
    var val=A.asset.dynamicValues&&A.asset.dynamicValues[api];
    if(!isDynamicFieldTouched(api)||!dynamicFieldIsFilled(def,val))missing.push(def.label||api);
  });
  var box=el("asset-category-fields");
  if(box){
    categoryDynamicFieldDefs(cat).forEach(function(def){
      var api=def.apiName;
      var id=assetDynId(api);
      if(def.widget==="multiselect"){
        var wrap=box.querySelector(".asset-multiselect[data-api='"+api+"']");
        if(wrap){
          var vals=A.asset.dynamicValues&&A.asset.dynamicValues[api];
          wrap.classList.toggle("asset-required-missing",dynamicFieldMissingClass(api,def,vals).indexOf("asset-required-missing")>=0);
        }
        return;
      }
      var e=el(id);
      if(!e)return;
      e.classList.toggle("asset-required-missing",dynamicFieldMissingClass(api,def,e.value||"").indexOf("asset-required-missing")>=0);
    });
  }
  return missing;
}
function categoryLayoutExtensionApis(category){
  var layout=categoryLayout(category);
  if(!layout||!layout.sections||!layout.sections.length)return[];
  var apis={};
  layout.sections.forEach(function(sec){
    if(sec.subform)return;
    (sec.fields||[]).forEach(function(registryKey){
      var def=assetFieldRegistry()[registryKey];
      var api=def&&def.zohoApiName?def.zohoApiName:registryKey;
      if(def&&def.note&&def.note.indexOf("No separate Zoho field")>=0)return;
      apis[api]=true;
    });
  });
  return Object.keys(apis);
}
function splitAssetPayloadForCategoryLayout(payload){
  var category=normalizeAssetCategoryKey(payload.Asset_Category||"");
  var extApis=categoryLayoutExtensionApis(category);
  var core=Object.assign({},payload);
  var extension={};
  if(!extApis.length)return{core:core,extension:extension,category:category};
  extApis.forEach(function(api){
    if(core[api]==null||core[api]==="")return;
    extension[api]=core[api];
    delete core[api];
  });
  return{core:core,extension:extension,category:category};
}
var _assetCategoryLayoutSeq=0;
function syncAssetCategoryLayoutUi(){
  var cat=normalizeAssetCategoryKey(assetInput("asset-category"));
  if(!cat){renderAssetCategoryFields();return Promise.resolve();}
  var seq=++_assetCategoryLayoutSeq;
  var box=el("asset-category-fields");
  if(box){
    box.style.display="block";
    box.innerHTML="<div class='e-sub' style='padding:10px 0;color:var(--dim)'>Loading category fields…</div>";
  }
  return loadEquipmentConfig().then(function(){
    if(seq!==_assetCategoryLayoutSeq)return;
    resetCategoryDynamicStateForCategory(cat);
    categoryDynamicFieldDefs(cat).forEach(function(d){
      if(A.asset.dynamicSuggested)delete A.asset.dynamicSuggested[d.apiName];
    });
    applyCategoryFieldDefaults(cat);
    renderAssetCategoryFields({skipDomSync:true});
    mirrorInputPvToOutput();
    updateAssetSaveState();
    scrollAssetCategoryFieldsIntoView();
    return loadEngineeringUnitLookups().catch(function(e){
      console.log("engineering unit lookups follow-up",e);
      return [];
    });
  }).then(function(){
    if(seq!==_assetCategoryLayoutSeq)return;
    if(normalizeAssetCategoryKey(assetInput("asset-category"))!==cat)return;
    applyCategoryFieldDefaults(cat);
    renderAssetCategoryFields({skipDomSync:true});
    mirrorInputPvToOutput();
    updateAssetSaveState();
  }).catch(function(err){
    if(seq!==_assetCategoryLayoutSeq)return;
    if(box)box.innerHTML="<div class='e-sub' style='padding:10px 0;color:#991b1b'>Could not load category fields: "+esc(err&&err.message?err.message:String(err))+"</div>";
    throw err;
  }).finally(function(){
    if(seq!==_assetCategoryLayoutSeq)return;
    if(categoryFieldsAreRendered())return;
    if(normalizeAssetCategoryKey(assetInput("asset-category"))!==cat)return;
    renderAssetCategoryFields({skipDomSync:true});
  });
}
function scrollAssetCategoryFieldsIntoView(){
  var box=el("asset-category-fields");
  if(!box||box.style.display==="none")return;
  requestAnimationFrame(function(){
    try{box.scrollIntoView({behavior:"smooth",block:"nearest"});}catch(e){}
  });
}
function assetDynId(api){return"asset-dyn-"+String(api||"").replace(/[^a-zA-Z0-9_]/g,"_");}
function assetSubformConfig(){
  var eq=A.equipmentConfig&&A.equipmentConfig.modules&&A.equipmentConfig.modules.Equipments;
  return eq&&eq.subform||null;
}
function assetSubformColumns(){
  var sf=assetSubformConfig();
  if(sf&&sf.capstoneColumns&&sf.capstoneColumns.length)return sf.capstoneColumns;
  return[
    {apiName:"Output_Type",label:"Function",widget:"select",picklist:"Output_Type"},
    {apiName:"Input_Output_Type",label:"Engineering Unit",widget:"lookup",lookupSource:"engineeringUnits"},
    {apiName:"Zero_Parameter",label:"LRV Parameter",widget:"text"},
    {apiName:"Output_Zero",label:"LRV",widget:"number"},
    {apiName:"Span_Parameter",label:"URV Parameter",widget:"text"},
    {apiName:"Output_Span",label:"URV",widget:"number"},
    {apiName:"Pulses_per_Unit",label:"Units per pulse",widget:"number"},
    {apiName:"Description",label:"Other",widget:"text"}
  ];
}
function syncDynamicFieldValuesFromDom(){
  if(!A.asset.dynamicValues)A.asset.dynamicValues={};
  var box=el("asset-category-fields");if(!box)return;
  var msDone={};
  box.querySelectorAll(".asset-multiselect[data-api]").forEach(function(wrap){
    var api=wrap.getAttribute("data-api");
    msDone[api]=true;
    if(!isDynamicFieldTouched(api))return;
    var vals=[];
    wrap.querySelectorAll("input[type=checkbox][data-ms-val]:checked").forEach(function(cb){
      vals.push(cb.getAttribute("data-ms-val"));
    });
    A.asset.dynamicValues[api]=vals;
  });
  box.querySelectorAll("[data-api]").forEach(function(e){
    if(e.type==="checkbox")return;
    var api=e.getAttribute("data-api");
    if(msDone[api])return;
    var domVal=e.value||"";
    if(isDynamicFieldTouched(api)){
      if(domVal||!dynamicFieldIsFilled(assetFieldRegistry()[api],A.asset.dynamicValues[api]))A.asset.dynamicValues[api]=domVal;
    }
  });
}
function normalizeCalFactorForZoho(val){
  var v=extractValTrim(val);if(!v)return null;
  var m=String(v).match(/([0-9]+(?:\.[0-9]+)?)/);
  if(!m)return v;
  var n=parseFloat(m[1]);
  return isNaN(n)?v:n;
}
function isZohoLookupRecordId(id){
  return/^\d{10,}$/.test(String(id||"").trim());
}
function formatDynamicValueForZoho(api,val){
  var def=assetFieldRegistry()[api];
  if(def&&def.widget==="multiselect"){
    var arr=Array.isArray(val)?val.slice():String(val==null?"":val).split(";").map(function(s){return s.trim();}).filter(Boolean);
    arr=arr.filter(function(v){return v&&v!=="None";});
    if(!arr.length)return null;
    return arr;
  }
  if(def&&def.widget==="lookup"){
    var lookupId=resolveEngineeringUnitLookupId(val);
    if(!lookupId||!isZohoLookupRecordId(lookupId))return null;
    return{id:String(lookupId)};
  }
  if(def&&def.widget==="date"){
    var d=String(val==null?"":val).trim();
    if(!d)return null;
    var m=d.match(/^(\d{4}-\d{2}-\d{2})/);
    return m?m[1]:d;
  }
  var s=String(val==null?"":val).trim();
  if(!s)return null;
  if(api==="Cal_Factor_K_Factor"){
    var cal=normalizeCalFactorForZoho(s);
    return cal==null||cal===""?null:String(cal);
  }
  if(api==="Duration"||api==="Damping_Seconds"||api==="Exponent"||(def&&def.zohoType==="double")){
    var n=parseFloat(s);
    return isNaN(n)?null:n;
  }
  return s;
}
async function prepareAssetDynamicFieldsForSave(){
  finalizeDynamicValuesBeforeSave();
  syncDynamicFieldValuesFromDom();
  try{await loadEngineeringUnitLookups();}catch(e){console.log("engineering units before asset save",e);}
  var registry=assetFieldRegistry();
  Object.keys(A.asset.dynamicValues||{}).forEach(function(api){
    if(!isDynamicFieldTouched(api))return;
    var def=registry[api];
    if(!def||def.widget!=="lookup")return;
    var raw=A.asset.dynamicValues[api];
    var lookupId=resolveEngineeringUnitLookupId(raw);
    if(lookupId&&isZohoLookupRecordId(lookupId)){
      A.asset.dynamicValues[api]=String(lookupId);
      return;
    }
    var opts=engineeringUnitLookupOptions();
    var rawStr=String(raw==null?"":raw).trim().toLowerCase();
    for(var i=0;i<opts.length;i++){
      var oid=String(opts[i].id||"").trim();
      var oname=String(opts[i].name||"").trim().toLowerCase();
      if(!isZohoLookupRecordId(oid))continue;
      if(oname===rawStr||oid===rawStr){
        A.asset.dynamicValues[api]=oid;
        return;
      }
    }
  });
}
function finalizeDynamicValuesBeforeSave(){
  if(!A.asset.dynamicValues)A.asset.dynamicValues={};
  syncDynamicFieldValuesFromDom();
  var calEl=el(assetDynId("Cal_Factor_K_Factor"));
  var calVal=(calEl&&calEl.value)||A.asset.dynamicValues.Cal_Factor_K_Factor||"";
  calVal=normalizeCalFactorForZoho(calVal);
  if(calVal!=null&&calVal!=="")A.asset.dynamicValues.Cal_Factor_K_Factor=String(calVal);
}
function collectDynamicAssetPayload(includeBlank){
  finalizeDynamicValuesBeforeSave();
  var out={};
  Object.keys(A.asset.dynamicValues||{}).forEach(function(api){
    if(!isDynamicFieldTouched(api))return;
    var raw=A.asset.dynamicValues[api];
    var v=formatDynamicValueForZoho(api,raw);
    if(v==null||v===""||(Array.isArray(v)&&!v.length)){if(includeBlank)out[api]=Array.isArray(raw)?[]:"";return;}
    out[api]=v;
  });
  return out;
}
function picklistValuesForDynamicField(def){
  var cat=assetInput("asset-category");
  if(def&&def.categoryPicklistValues&&cat&&def.categoryPicklistValues[cat])return def.categoryPicklistValues[cat].slice();
  return assetPicklistValues(def.picklist);
}
function mirrorInputPvToOutput(){
  if(!A.asset.dynamicValues)A.asset.dynamicValues={};
  syncDynamicFieldValuesFromDom();
  [["Input_PV_Zero","Output_PV_Zero"],["Input_PV_Span","Output_PV_Span"]].forEach(function(pair){
    if(!isDynamicFieldTouched(pair[0]))return;
    var v=A.asset.dynamicValues[pair[0]];
    if(v==null||v==="")return;
    A.asset.dynamicValues[pair[1]]=String(v);
    markDynamicFieldTouched(pair[1]);
    var outEl=el(assetDynId(pair[1]));
    if(outEl)outEl.value=A.asset.dynamicValues[pair[1]];
  });
}
function subformPicklistValues(fieldApi){
  var sf=assetSubformConfig();
  var f=sf&&sf.fields&&sf.fields[fieldApi];
  return f&&f.values?f.values:[];
}
function assetSubformRequiredApis(){
  return["Output_Type","Input_Output_Type","Zero_Parameter","Output_Zero","Span_Parameter","Output_Span"];
}
function assetSubformOptionalReminderApis(){
  return["Pulses_per_Unit","Description"];
}
function subformRowIsSaveable(row,ri){
  var fn=String(row&&row.Output_Type||"").trim();
  if(!fn)return false;
  return isSubformFieldTouched(ri,"Output_Type")||subformRowHasAnyValue(row);
}
function subformTouchKey(ri,api){return String(ri)+"_"+String(api||"");}
function markSubformFieldTouched(ri,api){
  if(!A.asset.subformTouched)A.asset.subformTouched={};
  A.asset.subformTouched[subformTouchKey(ri,api)]=true;
}
function isSubformFieldTouched(ri,api){
  return!!(A.asset.subformTouched&&A.asset.subformTouched[subformTouchKey(ri,api)]);
}
function markSubformRowTouchedFromData(row,ri){
  if(!row)return;
  assetSubformRequiredApis().concat(assetSubformOptionalReminderApis()).forEach(function(api){
    if(row[api]!=null&&String(row[api]).trim())markSubformFieldTouched(ri,api);
  });
}
function subformFieldMissingClass(ri,api,val){
  var optional=assetSubformOptionalReminderApis().indexOf(api)>=0;
  if(assetSubformRequiredApis().indexOf(api)<0&&!optional)return"";
  var touched=isSubformFieldTouched(ri,api);
  var filled=String(val||"").trim();
  if(optional){
    if(!filled)return" asset-required-missing";
    return"";
  }
  return!touched||!filled?" asset-required-missing":"";
}
function subformEngineeringUnitHint(row){
  var fn=String(row&&row.Output_Type||"").trim().toLowerCase();
  if(fn==="output")return" (suggested: 4-20 mA)";
  return"";
}
function subformRowHasAnyValue(row){
  return Object.keys(row||{}).some(function(k){return String(row[k]||"").trim();});
}
function markSubformRequiredFields(){
  syncSubformRowsFromDom();
  var missing=[];
  var cols=assetSubformColumns();
  var colLabel={};
  cols.forEach(function(c){colLabel[c.apiName]=c.label;});
  (A.asset.subformRows||[]).forEach(function(row,ri){
    if(!subformRowHasAnyValue(row))return;
    assetSubformRequiredApis().forEach(function(api){
      var touched=isSubformFieldTouched(ri,api);
      var filled=String(row[api]||"").trim();
      if(!touched||!filled)missing.push("Subform row "+(ri+1)+": "+(colLabel[api]||api));
    });
  });
  var body=el("asset-subform-body");
  if(body){
    body.querySelectorAll("[data-subform][data-api]").forEach(function(e){
      var ri=parseInt(e.getAttribute("data-subform"),10);
      var api=e.getAttribute("data-api");
      var val=e.value||"";
      e.classList.toggle("asset-required-missing",subformFieldMissingClass(ri,api,val).indexOf("asset-required-missing")>=0);
    });
  }
  return missing;
}
function renderDynFieldBlock(def,fullWidth){
  var id=assetDynId(def.apiName);
  var val=dynamicFieldDisplayValue(def.apiName,def);
  var missCls=dynamicFieldMissingClass(def.apiName,def,val);
  var wrapCls="asset-cat-field"+(fullWidth?" asset-cat-field-span2":"");
  var wrapStart="<div class='"+wrapCls+"'>";
  var wrapEnd="</div>";
  if(def.widget==="multiselect"&&def.picklist){
    var opts=assetPicklistValues(def.picklist).filter(function(v){return v!=="None";});
    var selected=Array.isArray(val)?val.slice():String(val||"").split(";").map(function(s){return s.trim();}).filter(Boolean);
    var html=wrapStart+"<label class='lbl'>"+dynamicFieldLabel(def)+"</label><div class='asset-multiselect"+missCls+"' data-api='"+esc(def.apiName)+"'>";
    opts.forEach(function(v){
      html+="<label class='asset-multiselect-opt'><input type='checkbox' data-ms-val='"+esc(v)+"'"+(selected.indexOf(v)>=0?" checked":"")+"/> "+esc(v)+"</label>";
    });
    html+="</div>"+wrapEnd;
    return html;
  }
  if(def.widget==="select"&&def.picklist){
    var opts=picklistValuesForDynamicField(def);
    var sval=String(val||"");
    return wrapStart+"<label class='lbl' for='"+id+"'>"+dynamicFieldLabel(def)+"</label><select id='"+id+"' class='"+missCls.trim()+"' data-api='"+esc(def.apiName)+"'><option value=''>Select</option>"+opts.map(function(v){return"<option value='"+esc(v)+"'"+(v===sval?" selected":"")+">"+esc(v)+"</option>";}).join("")+"</select>"+wrapEnd;
  }
  if(def.widget==="lookup"){
    var luOpts=engineeringUnitLookupOptions();
    var luVal=isDynamicFieldTouched(def.apiName)?(resolveEngineeringUnitLookupId(val)||String(val||"")):"";
    var luLabel=isDynamicFieldTouched(def.apiName)?(engineeringUnitLookupLabel(val)||engineeringUnitLookupLabel(luVal)||String(val||"")):"";
    var hasOpt=false;
    if(luVal){
      for(var li=0;li<luOpts.length;li++){
        var o=luOpts[li];
        if(String(o.id)===String(luVal)||String(o.name)===String(val)||String(o.name)===String(luVal)){hasOpt=true;break;}
      }
    }
    var extraOpt=(luVal&&!hasOpt)?"<option value='"+esc(luVal)+"' selected>"+esc(luLabel||luVal)+"</option>":"";
    return wrapStart+"<label class='lbl' for='"+id+"'>"+dynamicFieldLabel(def)+"</label><select id='"+id+"' class='"+missCls.trim()+"' data-api='"+esc(def.apiName)+"'><option value=''>Select</option>"+extraOpt+luOpts.map(function(o){return"<option value='"+esc(o.id)+"'"+(String(o.id)===String(luVal)||String(o.name)===String(val)||String(o.name)===String(luVal)?" selected":"")+">"+esc(o.name||o.id)+"</option>";}).join("")+"</select>"+wrapEnd;
  }
  if(def.widget==="textarea"){
    return wrapStart+"<label class='lbl' for='"+id+"'>"+dynamicFieldLabel(def)+"</label><textarea id='"+id+"' class='"+missCls.trim()+"' data-api='"+esc(def.apiName)+"' rows='"+(def.rows||2)+"'>"+esc(String(val||""))+"</textarea>"+wrapEnd;
  }
  if(def.widget==="date"){
    return wrapStart+"<label class='lbl' for='"+id+"'>"+dynamicFieldLabel(def)+"</label><input id='"+id+"' class='"+missCls.trim()+"' data-api='"+esc(def.apiName)+"' type='date' value='"+esc(String(val||""))+"'/>"+wrapEnd;
  }
  var inputType=def.widget==="number"?"number":"text";
  return wrapStart+"<label class='lbl' for='"+id+"'>"+dynamicFieldLabel(def)+"</label><input id='"+id+"' class='"+missCls.trim()+"' data-api='"+esc(def.apiName)+"' type='"+inputType+"' value='"+esc(String(val||""))+"'/>"+wrapEnd;
}
function renderAssetSubformSection(sec){
  if(!A.asset.subformRows)A.asset.subformRows=[];
  if(!A.asset.subformTouched)A.asset.subformTouched={};
  var cols=assetSubformColumns();
  var html="<div class='asset-cat-section'><div class='asset-cat-section-title'>"+esc(sec.title)+"</div><div class='asset-subform-wrap'><table class='asset-subform-table'><thead><tr>";
  cols.forEach(function(c){
    var hint=c.apiName==="Input_Output_Type"?subformEngineeringUnitHint({Output_Type:"Output"}):"";
    html+="<th>"+esc(c.label)+esc(hint)+"</th>";
  });
  html+="<th></th></tr></thead><tbody id='asset-subform-body'>";
  A.asset.subformRows.forEach(function(row,ri){
    html+="<tr"+(row.id?" data-row-id='"+esc(String(row.id))+"'":"")+">";
    cols.forEach(function(c){
      var v=row[c.apiName]!=null?String(row[c.apiName]):"";
      var missCls=subformFieldMissingClass(ri,c.apiName,v);
      html+="<td>";
      if(c.widget==="select"){
        var opts=subformPicklistValues(c.apiName);
        html+="<select class='"+missCls.trim()+"' data-subform='"+ri+"' data-api='"+esc(c.apiName)+"'>";
        html+="<option value=''>Select</option>"+opts.map(function(o){return"<option value='"+esc(o)+"'"+(o===v?" selected":"")+">"+esc(o)+"</option>";}).join("");
        html+="</select>";
      }else if(c.widget==="lookup"){
        var luOpts=engineeringUnitLookupOptions();
        var luVal=resolveEngineeringUnitLookupId(v)||String(v||"");
        html+="<select class='"+missCls.trim()+"' data-subform='"+ri+"' data-api='"+esc(c.apiName)+"'" +(c.apiName==="Input_Output_Type"?" title='Select engineering unit (4-20 mA typical for Output)'":"")+">";
        html+="<option value=''>Select</option>"+luOpts.map(function(o){return"<option value='"+esc(o.id)+"'"+(String(o.id)===String(luVal)||String(o.name)===String(v)?" selected":"")+">"+esc(o.name||o.id)+"</option>";}).join("");
        html+="</select>";
      }else{
        html+="<input class='"+missCls.trim()+"' data-subform='"+ri+"' data-api='"+esc(c.apiName)+"' type='"+(c.widget==="number"?"number":"text")+"' value='"+esc(v)+"'/>";
      }
      html+="</td>";
    });
    html+="<td><button type='button' class='bg bsm' onclick='removeAssetSubformRow("+ri+")'>Remove</button></td></tr>";
  });
  html+="</tbody></table></div><button type='button' class='bg bsm' onclick='addAssetSubformRow()' style='margin-bottom:8px'>+ Add row</button></div>";
  return html;
}
function syncSubformRowsFromDom(){
  var body=el("asset-subform-body");if(!body)return;
  var rows=[];
  body.querySelectorAll("tr").forEach(function(tr,ri){
    var row={};
    var rid=tr.getAttribute("data-row-id");
    if(rid)row.id=rid;
    else if(A.asset.subformRows&&A.asset.subformRows[ri]&&A.asset.subformRows[ri].id)row.id=A.asset.subformRows[ri].id;
    tr.querySelectorAll("[data-subform][data-api]").forEach(function(e){
      row[e.getAttribute("data-api")]=e.value||"";
    });
    rows.push(row);
  });
  A.asset.subformRows=rows;
}
function addAssetSubformRow(){
  syncSubformRowsFromDom();
  A.asset.subformRows.push({});
  renderAssetCategoryFields({skipDomSync:true});
  scheduleAssetDraftSave();
  updateAssetSaveState();
}
function removeAssetSubformRow(idx){
  syncSubformRowsFromDom();
  A.asset.subformRows.splice(idx,1);
  renderAssetCategoryFields({skipDomSync:true});
  scheduleAssetDraftSave();
  updateAssetSaveState();
}
function assetSubformPayload(){
  syncSubformRowsFromDom();
  return(A.asset.subformRows||[]).filter(function(row,ri){
    return subformRowIsSaveable(row,ri);
  }).map(function(row){
    var out={};
    assetSubformColumns().forEach(function(c){
      var v=row[c.apiName];
      if(v===""||v==null)return;
      if(c.widget==="lookup"){
        var lookupId=resolveEngineeringUnitLookupId(v);
        if(!lookupId||!isZohoLookupRecordId(lookupId))return;
        out[c.apiName]={id:String(lookupId)};
      }else if(c.widget==="number"){var n=parseFloat(v);if(!isNaN(n))out[c.apiName]=n;}else out[c.apiName]=String(v);
    });
    if(row.id)out.id=row.id;
    return out;
  });
}
function applyDynamicFieldsFromRecord(r){
  if(!r)return;
  if(!A.asset.dynamicValues)A.asset.dynamicValues={};
  var registry=assetFieldRegistry();
  Object.keys(registry).forEach(function(api){
    var v=zohoFieldValueFromRecord(r,api);
    if(v==null||v===""||(Array.isArray(v)&&!v.length))return;
    A.asset.dynamicValues[api]=v;
    markDynamicFieldTouched(api);
  });
  if(r.Subform_1&&Array.isArray(r.Subform_1)){
    A.asset.subformRows=r.Subform_1.map(function(row){
      var copy={};
      if(row.id)copy.id=row.id;
      assetSubformColumns().forEach(function(c){
        var v=row[c.apiName];
        if(v==null)return;
        if(c.widget==="lookup"&&typeof v==="object")copy[c.apiName]=v.id||v.name||"";
        else copy[c.apiName]=typeof v==="object"?(v.name||v.id||""):String(v);
      });
      return copy;
    });
    A.asset.subformTouched={};
    A.asset.subformRows.forEach(function(row,ri){markSubformRowTouchedFromData(row,ri);});
  }else{A.asset.subformRows=[];A.asset.subformTouched={};}
}
function bindDynamicFieldHandlers(){
  var box=el("asset-category-fields");if(!box)return;
  var inputPvApis={Input_PV_Zero:true,Input_PV_Span:true};
  box.querySelectorAll("[data-api]").forEach(function(e){
    if(e._dynBound)return;
    e._dynBound=true;
    function onDynEdit(){
      markDynamicFieldTouched(e.getAttribute("data-api"));
      syncDynamicFieldValuesFromDom();
      if(inputPvApis[e.getAttribute("data-api")])mirrorInputPvToOutput();
      scheduleAssetDraftSave();
      updateAssetSaveState();
    }
    e.addEventListener("input",onDynEdit);
    e.addEventListener("change",onDynEdit);
    e.addEventListener("blur",onDynEdit);
  });
  box.querySelectorAll(".asset-multiselect input[type=checkbox]").forEach(function(e){
    if(e._msBound)return;
    e._msBound=true;
    e.addEventListener("change",function(){
      var wrap=e.closest(".asset-multiselect");
      if(wrap)markDynamicFieldTouched(wrap.getAttribute("data-api"));
      syncDynamicFieldValuesFromDom();
      scheduleAssetDraftSave();
      updateAssetSaveState();
    });
  });
  box.querySelectorAll("[data-subform]").forEach(function(e){
    if(e._subBound)return;
    e._subBound=true;
    function onSubformEdit(){
      var ri=parseInt(e.getAttribute("data-subform"),10);
      var api=e.getAttribute("data-api");
      markSubformFieldTouched(ri,api);
      syncSubformRowsFromDom();
      scheduleAssetDraftSave();
      updateAssetSaveState();
    }
    e.addEventListener("input",onSubformEdit);
    e.addEventListener("change",onSubformEdit);
    e.addEventListener("blur",onSubformEdit);
  });
}
function renderAssetCategoryFields(opts){
  opts=opts||{};
  var box=el("asset-category-fields");if(!box)return;
  if(!opts.skipDomSync){
    syncDynamicFieldValuesFromDom();
    syncSubformRowsFromDom();
  }
  var cat=assetInput("asset-category");
  var layout=categoryLayout(cat);
  if(!layout||!layout.sections||!layout.sections.length){
    fpAfterDomUpdate(function(){box.innerHTML="";box.style.display="none";});
    return;
  }
  if(!A.asset.dynamicValues)A.asset.dynamicValues={};
  if(!A.asset.subformRows)A.asset.subformRows=[];
  var registry=assetFieldRegistry();
  var html="";
  try{
  layout.sections.forEach(function(sec){
    if(sec.subform){html+=renderAssetSubformSection(sec);return;}
    html+="<div class='asset-cat-section'><div class='asset-cat-section-title'>"+esc(sec.title)+"</div><div class='asset-cat-grid'>";
    var defs=(sec.fields||[]).map(function(api){var d=registry[api];return d?Object.assign({apiName:api},d):null;}).filter(Boolean);
    defs.forEach(function(d){
      html+=renderDynFieldBlock(d,d.widget==="textarea");
    });
    html+="</div></div>";
  });
  }catch(err){
    console.log("renderAssetCategoryFields",err);
    fpAfterDomUpdate(function(){
      box.innerHTML="<div class='e-sub' style='padding:10px 0;color:#991b1b'>Could not render category fields: "+esc(err.message||String(err))+"</div>";
      box.style.display="block";
    });
    return;
  }
  fpAfterDomUpdate(function(){
    box.innerHTML=html;
    box.style.display="block";
    bindDynamicFieldHandlers();
    initNoAutofill(box);
    syncCategoryDefaultValuesToDom();
    updateAssetSaveState();
  });
}
function onAssetCategoryChange(){
  var catEl=el("asset-category");
  if(catEl){
    var norm=normalizeAssetCategoryKey(catEl.value);
    if(norm&&catEl.value!==norm)catEl.value=norm;
  }
  syncAssetCategoryLayoutUi();
  scheduleAssetDraftSave();
}
function setAssetDraftStatus(msg,isErr){var e=el("asset-draft-status");if(!e)return;if(msg){e.textContent=msg;e.style.display="block";e.style.color=isErr?"#991b1b":"#2d6b60";e.style.background=isErr?"#fee2e2":"#fff";e.style.borderColor=isErr?"#ef4444":"#b2ddd6";}else e.style.display="none";}
function assetDraftHasWork(){
  if(A.asset.entryStateResetting)return false;
  if(A.asset.intent)return true;
  if(A.asset.mode&&A.asset.mode!=="add")return true;
  if(A.asset.linkMode==="account"&&A.asset.standaloneAccount)return true;
  if(A.asset.currentAssetId||A.asset.photos.length||A.asset.replacementMode)return true;
  if(assetFieldIdsToClear().some(function(id){return assetInput(id);}))return true;
  if(assetInput("asset-search"))return true;
  if(A.asset.dynamicValues&&Object.keys(A.asset.dynamicValues).some(function(k){
    var v=A.asset.dynamicValues[k];
    return v!=null&&v!==""&&!(Array.isArray(v)&&!v.length);
  }))return true;
  if(A.asset.subformRows&&A.asset.subformRows.some(function(row){
    return Object.keys(row||{}).some(function(k){return String(row[k]||"").trim();});
  }))return true;
  return false;
}
function saveAllTabDraftsNow(){
  if(typeof captureDraftHasWork==="function"&&captureDraftHasWork())saveCaptureDraftNow();
  if(typeof assetDraftHasWork==="function"&&assetDraftHasWork())saveAssetDraftNow();
}
function buildAssetDraft(){var fields={};assetFieldIdsToClear().concat(["asset-search"]).forEach(function(id){fields[id]=assetInput(id);});syncDynamicFieldValuesFromDom();syncSubformRowsFromDom();return{version:1,savedAt:new Date().toISOString(),deal:A.sel||null,location:A.location||null,mode:A.asset.mode,intent:A.asset.intent,linkMode:A.asset.linkMode,standaloneAccount:A.asset.standaloneAccount,currentAssetId:A.asset.currentAssetId,activeDealKey:A.asset.activeDealKey,loadedOriginal:A.asset.loadedOriginal,replacementMode:A.asset.replacementMode,photos:A.asset.photos,lastUploadedPhotoFingerprints:A.asset.lastUploadedPhotoFingerprints,dynamicValues:A.asset.dynamicValues||{},dynamicSuggested:A.asset.dynamicSuggested||{},dynamicTouched:A.asset.dynamicTouched||{},subformRows:A.asset.subformRows||[],subformTouched:A.asset.subformTouched||{},fields:fields};}
function saveAssetDraftNow(){if(!assetDraftHasWork())return;try{localStorage.setItem("fp_asset_draft",JSON.stringify(buildAssetDraft()));setAssetDraftStatus("Asset draft saved "+new Date().toLocaleTimeString());}catch(e){console.log("asset draft save",e);setAssetDraftStatus("Asset draft save failed",true);}}
function scheduleAssetDraftSave(){if(A.assetDraftTimer)clearTimeout(A.assetDraftTimer);A.assetDraftTimer=setTimeout(function(){A.assetDraftTimer=null;saveAssetDraftNow();},800);}
function clearAssetDraft(){try{localStorage.removeItem("fp_asset_draft");}catch(e){}setAssetDraftStatus("",false);}
var ASSET_DRAFT_SELECT_IDS=["asset-category","asset-function","asset-brand","asset-type","asset-series","asset-environment","asset-confined"];
function applyAssetDraftFieldValues(fields,opts){
  if(!fields)return;
  opts=opts||{};
  Object.keys(fields).forEach(function(id){
    var v=fields[id]||"";
    if(ASSET_DRAFT_SELECT_IDS.indexOf(id)>=0)setAssetSelectIfPresent(id,v,{silent:!!opts.silent});
    else setAssetInput(id,v);
  });
}
function markRestoredAssetDynamicTouched(){
  if(!A.asset.dynamicValues)return;
  if(!A.asset.dynamicTouched)A.asset.dynamicTouched={};
  Object.keys(A.asset.dynamicValues).forEach(function(api){
    var v=A.asset.dynamicValues[api];
    if(v!=null&&v!==""&&!(Array.isArray(v)&&!v.length))A.asset.dynamicTouched[api]=true;
  });
}
function restoreAssetDraft(d){
  if(!d)return Promise.resolve();
  A.sel=d.deal||A.sel;
  A.location=d.location||A.location;
  A.asset.mode=d.mode||"add";
  A.asset.intent=d.intent||(d.mode==="update"?"update":(d.currentAssetId?"update":"add"));
  A.asset.linkMode=d.linkMode||"deal";
  A.asset.standaloneAccount=d.standaloneAccount||null;
  A.asset.currentAssetId=d.currentAssetId||null;
  A.asset.activeDealKey=d.activeDealKey||selectedAssetDealKey();
  A.asset.loadedOriginal=d.loadedOriginal||null;
  A.asset.replacementMode=!!d.replacementMode;
  A.asset.photos=d.photos||[];
  A.asset.lastUploadedPhotoFingerprints=d.lastUploadedPhotoFingerprints||{};
  A.asset.dynamicValues=d.dynamicValues||{};
  A.asset.dynamicSuggested=d.dynamicSuggested||{};
  A.asset.dynamicTouched=d.dynamicTouched||{};
  A.asset.subformRows=d.subformRows||[];
  A.asset.subformTouched=d.subformTouched||{};
  A.asset._draftRestoreFields=d.fields||null;
  normalizeAssetPhotos();
  markRestoredAssetDynamicTouched();
  renderAssetSetupUi();
  renderAssetPhotos();
  applyAssetDraftFieldValues(d.fields,{silent:true});
  updateDealUI();
  updateLocationUI();
  return syncAssetCategoryLayoutUi().then(function(){
    syncCategoryDefaultValuesToDom();
    renderAssetPhotos();
    renderAssetReplacementPanel();
    renderSavedAssets();
    updateAssetSaveState();
  });
}
function assetDraftSummary(d,label){
  var f=d&&d.fields||{};
  var deal=d&&d.deal;
  return [
    "Restore unsaved CapStone asset draft saved "+label+"?",
    "",
    "Account/Deal: "+(deal?dealHeaderText(deal):"No deal selected"),
    "Mode: "+((d&&d.mode)==="update"?"Update Existing Asset":"Add New Asset"),
    "Asset: "+(f["asset-name"]||"(blank)"),
    "Model: "+(f["asset-model"]||"(blank)"),
    "Serial: "+(f["asset-serial"]||"(blank)"),
    "Photos: "+((d&&d.photos&&d.photos.length)||0)
  ].join("\n");
}
function maybeRestoreAssetDraft(){var raw="";try{raw=localStorage.getItem("fp_asset_draft")||"";}catch(e){}if(!raw)return;var d=null;try{d=JSON.parse(raw);}catch(e){clearAssetDraft();return;}var label=d&&d.savedAt?new Date(d.savedAt).toLocaleString():"recently";if(confirm(assetDraftSummary(d,label))){loadEquipmentConfig().then(function(){return restoreAssetDraft(d);}).then(function(){A.assetDraftRestored=true;setAssetDraftStatus("Asset draft restored");showToast("Asset draft restored",3000);go("assets");}).catch(function(e){console.log("asset draft restore",e);showToast("Asset draft restore failed",5000);});}else clearAssetDraft();}
function selectedAssetDealKey(){return A.sel?((A.sel.id||"")+":"+(A.sel.Account_Id||"")+":"+(A.sel.Account_Name||"")):"";}
function assetSaveAccountId(){
  if(A.asset.linkMode==="account"&&A.asset.standaloneAccount&&A.asset.standaloneAccount.id)return A.asset.standaloneAccount.id;
  if(A.sel&&A.sel.Account_Id)return A.sel.Account_Id;
  return"";
}
function assetSaveAccountName(){
  if(A.asset.linkMode==="account"&&A.asset.standaloneAccount&&A.asset.standaloneAccount.name)return A.asset.standaloneAccount.name;
  if(A.sel)return A.sel.Account_Name||"";
  return assetInput("asset-account")||"";
}
function assetSetupMode(){
  if(A.asset.mode==="update")return"update";
  if(A.asset.linkMode==="account")return"account_add";
  return"deal_add";
}
function assetEntryReady(){
  if(!A.asset.intent)return false;
  if(A.asset.intent==="update")return!!A.asset.currentAssetId;
  if(A.asset.linkMode==="deal")return!!A.sel;
  return!!assetSaveAccountId();
}
function setAssetIntent(intent){
  A.asset.intent=intent;
  if(intent==="update"){
    A.asset.mode="update";
    A.asset.linkMode="account";
    clearAssetEntryState("Search and load an existing asset before saving.",true);
  }else{
    A.asset.mode="add";
    clearAssetEntryState("",true);
  }
  renderAssetSetupUi();
  updateAssetSaveState();
  if(intent==="update"){var s=el("asset-search");if(s){try{s.focus();}catch(e){}}}
}
function resetAssetIntent(){
  A.asset.intent=null;
  A.asset.currentAssetId=null;
  clearAssetEntryState("Choose Add New or Update Existing to begin.",true);
  renderAssetSetupUi();
  updateAssetSaveState();
}
function setAssetSetupMode(setup){
  var prev=assetSetupMode();
  if(setup==="deal_add")A.asset.intent="add";
  else if(setup==="account_add")A.asset.intent="add";
  else if(setup==="update")A.asset.intent="update";
  if(prev===setup){renderAssetSetupUi();updateAssetSaveState();return;}
  if(setup==="deal_add"){
    A.asset.mode="add";A.asset.linkMode="deal";A.asset.standaloneAccount=null;
    if(prev!=="deal_add")clearAssetEntryState("",true);
    if(A.sel)setAssetInput("asset-account",A.sel.Account_Name||"");
    else{startAssetDealAdd();return;}
  }else if(setup==="account_add"){
    A.asset.mode="add";A.asset.linkMode="account";
    clearAssetEntryState("",true);
    setAssetInput("asset-account",A.asset.standaloneAccount?A.asset.standaloneAccount.name:"");
  }else{
    A.asset.mode="update";
    clearAssetEntryState("Search and load an existing asset before saving.",true);
  }
  renderAssetSetupUi();
  updateAssetSaveState();
  if(setup==="update"){var s=el("asset-search");if(s){try{s.focus();}catch(e){}}}
}
function setAssetLinkMode(mode){
  setAssetSetupMode(mode==="account"?"account_add":(A.sel?"deal_add":"account_add"));
}
function startAssetAccountAdd(){
  if(A.asset.intent!=="add")A.asset.intent="add";
  if(assetSetupMode()==="account_add"&&assetSaveAccountId()){
    openAssetAccountPicker();
    return;
  }
  setAssetSetupMode("account_add");
  if(!assetSaveAccountId())openAssetAccountPicker();
}
function startAssetDealAdd(){
  if(!A.asset.intent)A.asset.intent="add";
  A.asset.mode="add";
  A.asset.linkMode="deal";
  A.dealPickerContext="assets";
  var openPicker=function(){openDealPickerModal();};
  if(A.deals.length){openPicker();return;}
  var cached=0;
  try{cached=loadDealsFromCache()||0;}catch(e){}
  if(cached){openPicker();return;}
  showToast("Loading deals from Zoho...",3500);
  loadDeals().then(function(){
    if(A.deals.length)openPicker();
    else showToast("No deals found — try Refresh from Zoho on Deals tab",5000);
  });
}
function applyAssetDealPick(){
  A.asset.intent="add";
  A.asset.mode="add";
  A.asset.linkMode="deal";
  A.asset.standaloneAccount=null;
  setAssetInput("asset-account",A.sel?A.sel.Account_Name:"");
  renderAssetSetupUi();
  updateAssetSaveState();
  if(A.sel)showToast("Deal linked: "+(A.sel.Deal_Name||A.sel.Account_Name||"deal"),3500);
}
function renderAssetSetupUi(){
  fpRememberView();
  var intent=A.asset.intent;
  var setup=assetSetupMode();
  var intentStep=el("asset-intent-step"),addPathStep=el("asset-add-path-step"),changeRow=el("asset-intent-change-row"),entryPanel=el("asset-entry-panel");
  var dealBtn=el("asset-setup-deal-add"),acctBtn=el("asset-setup-account-add");
  var dealCtx=el("asset-setup-deal-context"),pickRow=el("asset-account-pick-row"),updPanel=el("asset-setup-update-panel"),picked=el("asset-account-picked");
  if(intentStep)intentStep.style.display=intent? "none":"flex";
  if(addPathStep)addPathStep.style.display=intent==="add"?"block":"none";
  if(updPanel)updPanel.style.display=intent==="update"?"block":"none";
  if(changeRow)changeRow.style.display=intent?"block":"none";
  if(entryPanel)entryPanel.style.display=assetEntryReady()?"block":"none";
  if(dealBtn){
    dealBtn.className="asset-setup-btn asset-path-btn"+(setup==="deal_add"?" on":"");
    dealBtn.textContent=setup==="deal_add"&&A.sel?"Linked to deal — change":"Pick deal & link new asset";
  }
  if(acctBtn){
    acctBtn.className="asset-setup-btn asset-path-btn"+(setup==="account_add"?" on":"");
    acctBtn.textContent=setup==="account_add"&&assetSaveAccountId()?"Account picked — change":"Account only — pick account";
  }
  if(dealCtx){
    if(setup==="deal_add"&&A.sel){
      dealCtx.style.display="block";
      var pickDeal=!A.sel.Account_Id?"<div class='asset-setup-pick-deal'><button type='button' class='bg bsm' onclick='loadDeals()'>Refresh deals</button> <span style='font-size:11px;color:#92400e'>Account ID missing — refresh deals from Zoho.</span></div>":"";
      dealCtx.innerHTML="<strong>Deal:</strong> "+esc(A.sel.Deal_Name||"—")+"<br><strong>Account:</strong> "+esc(A.sel.Account_Name||"—")+pickDeal+"<div style='margin-top:8px'><button type='button' class='bg bsm' onclick='startAssetDealAdd()'>Change deal</button></div>";
    }else dealCtx.style.display="none";
  }
  var needsAccountPick=setup==="account_add"&&!assetSaveAccountId();
  if(pickRow)pickRow.style.display=(intent==="add"&&setup==="account_add"&&assetSaveAccountId())?"block":"none";
  if(picked){
    if(A.asset.standaloneAccount&&A.asset.standaloneAccount.name)picked.textContent="Account: "+A.asset.standaloneAccount.name;
    else if(needsAccountPick)picked.textContent="Choose the Zoho Account for this new equipment.";
    else if(setup==="account_add"&&assetSaveAccountId())picked.textContent="Account: "+assetSaveAccountName();
    else picked.textContent="";
  }
  if(A.asset.currentAssetId&&setup==="update"){
    var b=el("asset-mode-banner");
    if(b){b.style.display="block";b.style.background="#f0fdf4";b.style.border="1px solid #86efac";b.style.color="#166534";b.innerHTML="<strong>Loaded:</strong> "+esc(assetInput("asset-name")||"Asset")+" — save to add a new update note.";}
  }else{var b2=el("asset-mode-banner");if(b2)b2.style.display="none";}
  fpRestoreView();
}
async function ensureAssetAccountsLoaded(){
  if(A.assetAccountsCache&&A.assetAccountsCache.length)return A.assetAccountsCache;
  await refreshZohoToken();
  var all=[],page=1;
  while(page<=25){
    var r=await fetchWithTimeout(PROXY,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"get_accounts",token:A.zohoToken,page:page})},30000);
    if(!r.ok)throw new Error("Could not load accounts from Zoho ("+r.status+")");
    var d={};try{d=await r.json();}catch(e){}
    var rows=d.data||[];
    if(!rows.length)break;
    rows.forEach(function(rec){
      var n=rec.Account_Name;
      var name=!n?(rec.id||""):(typeof n==="object"?(n.name||rec.id||""):String(n));
      if(name)all.push({id:rec.id,name:name});
    });
    if(!d.info||!d.info.more_records)break;
    page++;
  }
  A.assetAccountsCache=all.sort(function(a,b){return a.name.localeCompare(b.name);});
  return A.assetAccountsCache;
}
function openAssetAccountPicker(){
  ensureAssetAccountsLoaded().then(function(){
    applyAssetAccountPickerFilters();
    var m=el("assetaccountmodal");if(m){
      m.style.display="flex";
      initNoAutofill(m);
      var qEl=el("asset-account-search");
      if(qEl){try{qEl.focus();}catch(e){}}
    }
  }).catch(function(e){showToast(e.message||"Could not load accounts",5000);});
}
function closeAssetAccountPicker(){var m=el("assetaccountmodal");if(m)m.style.display="none";}
function applyAssetAccountPickerFilters(){
  var list=el("asset-account-list"),count=el("asset-account-count"),qEl=el("asset-account-search");
  if(!list)return;
  var q=(qEl&&qEl.value||"").toLowerCase().trim();
  var accounts=A.assetAccountsCache||[];
  var filtered=!q?accounts:accounts.filter(function(a){return a.name.toLowerCase().indexOf(q)>=0;});
  if(count)count.textContent=filtered.length+" account"+(filtered.length!==1?"s":"");
  if(!filtered.length){list.innerHTML="<div class='empty' style='padding:16px 0'><div class='e-sub'>No accounts match</div></div>";return;}
  list.innerHTML=filtered.map(function(a){
    var sel=A.asset.standaloneAccount&&A.asset.standaloneAccount.id===a.id;
    return"<div class='deal-card"+(sel?" sel":"")+"' onclick='pickAssetAccount("+JSON.stringify(a.id)+")'><div class='d-acct'>"+esc(a.name)+"</div></div>";
  }).join("");
}
function pickAssetAccount(accountId){
  var accounts=A.assetAccountsCache||[];
  var acct=null;
  for(var i=0;i<accounts.length;i++){if(accounts[i].id===accountId){acct=accounts[i];break;}}
  if(!acct)return;
  A.asset.standaloneAccount={id:acct.id,name:acct.name};
  A.asset.linkMode="account";
  setAssetInput("asset-account",acct.name);
  closeAssetAccountPicker();
  renderAssetSetupUi();
  updateAssetSaveState();
  showToast("Account set: "+acct.name,3000);
}
function resetAssetContextForSelectedDeal(msg){
  clearAssetEntryState(msg||"Asset form cleared for the selected deal.");
  A.asset.activeDealKey=selectedAssetDealKey();
}
function ensureAssetContext(){
  var key=selectedAssetDealKey();
  if(key&&A.asset.activeDealKey&&A.asset.activeDealKey!==key){resetAssetContextForSelectedDeal("Asset form cleared for this account/deal.");}
  else if(key&&!A.asset.activeDealKey)A.asset.activeDealKey=key;
}
function renderAssetSaveChecklist(){
  var box=el("asset-save-checklist");if(!box)return;
  var missing=markAssetRequiredFields();
  var hasDeal=!!A.sel&&A.asset.linkMode!=="account";
  var hasAccount=!!assetSaveAccountId();
  var hasIntent=!!A.asset.intent;
  var updateReady=A.asset.intent!=="update"||!!A.asset.currentAssetId;
  var photoCount=A.asset.photos.length,pendingCount=getPendingUploads().length;
  var html="<div class='stitle' style='margin-bottom:8px'>Asset Save Checklist</div>"+
    reportChecklistItem(hasIntent,"Add or update selected",A.asset.intent==="update"?"Update Existing Asset":(A.asset.intent==="add"?"Add New Asset":"Choose Add New or Update Existing first."))+
    reportChecklistItem(assetEntryReady()||A.asset.intent!=="add","Setup complete",assetEntryReady()?(A.asset.intent==="update"?"Asset loaded — form ready.":(A.asset.linkMode==="deal"?"Deal linked — form ready.":"Account picked — form ready.")):(A.asset.intent==="update"?"Search and load an existing asset.":(A.asset.intent==="add"?(A.asset.linkMode==="deal"?"Pick a deal to continue.":"Pick an account to continue."):"Select Add New or Update Existing.")))+
    reportChecklistItem(hasAccount,"Account for Equipments",hasAccount?(assetSaveAccountName()||"Account ready"):"Pick a deal or use Account only — pick account.")+
    reportChecklistItem(!hasDeal||hasAccount,"Deal link (optional)",hasDeal?"Will link asset to the active Deal after save.":"Saving to account only — no deal link.")+
    reportChecklistItem(!missing.length,"Required fields complete",missing.length?missing.join(", "):"All required asset fields are complete.")+
    reportChecklistItem(updateReady,"Existing asset loaded",A.asset.intent==="update"?(updateReady?"Loaded existing asset will be updated.":"Search and load an existing asset first."):"Not required for Add New Asset.")+
    reportChecklistItem(true,"Photos",photoCount?photoCount+" photo"+(photoCount!==1?"s":"")+" selected.":"No asset photos selected.")+
    reportChecklistItem(true,"Deal Asset Notes",hasDeal?(assetInput("asset-deal-notes")||"Default note will be used."):"Not used without a deal.")+
    reportChecklistItem(!pendingCount,"Pending Sync",pendingCount?pendingCount+" item"+(pendingCount!==1?"s":"")+" pending sync.":"No pending sync items.");
  fpAfterDomUpdate(function(){box.innerHTML=html;});
}
function renderAssetForm(){
  ensureAssetContext();
  if(A.sel&&A.asset.mode==="add"&&A.asset.linkMode!=="account"){A.asset.linkMode="deal";A.asset.standaloneAccount=null;}
  else if(!A.sel&&A.asset.mode==="add"&&A.asset.linkMode==="deal")A.asset.linkMode="account";
  setAssetInput("asset-account",assetSaveAccountName());
  setAssetInput("asset-location",A.location?(A.location.lat.toFixed(6)+", "+A.location.lng.toFixed(6)):"");
  var draftRestore=A.assetDraftRestored;
  var draftFields=A.asset._draftRestoreFields;
  loadEquipmentConfig().then(function(){
    return refreshAssetCategoryPicklist();
  }).then(function(){
    return loadEngineeringUnitLookups();
  }).then(function(){
    fillAssetSelect("asset-category","Asset_Category","Select category");
    fillAssetSelect("asset-function","Asset_Function","Select function");
    fillAssetSelect("asset-brand","Asset_Brand","Select brand");
    fillAssetSelect("asset-type","Asset_Type","Select type");
    fillAssetSelect("asset-series","Asset_Series","Select series");
    fillAssetSelect("asset-environment","Asset_Environment","Select environment");
    fillAssetSelect("asset-confined","Confined_Space","Select yes/no");
    setupAssetRequiredHandlers();
    if(A.sel&&A.asset.mode==="add"&&A.asset.linkMode!=="account"){A.asset.linkMode="deal";A.asset.standaloneAccount=null;}
    else if(!A.sel&&A.asset.mode==="add"&&A.asset.linkMode==="deal")A.asset.linkMode="account";
    if(draftFields){
      applyAssetDraftFieldValues(draftFields,{silent:true});
      A.asset._draftRestoreFields=null;
    }
    setAssetInput("asset-account",assetSaveAccountName());
    setAssetInput("asset-location",A.location?(A.location.lat.toFixed(6)+", "+A.location.lng.toFixed(6)):"");
    renderAssetSetupUi();
    if(draftRestore){
      markRestoredAssetDynamicTouched();
      return syncAssetCategoryLayoutUi().then(function(){
        syncCategoryDefaultValuesToDom();
        renderAssetPhotos();
        updateAssetSaveState();
      }).finally(function(){A.assetDraftRestored=false;});
    }
    if(assetInput("asset-category"))syncAssetCategoryLayoutUi();
    else renderAssetCategoryFields();
    updateAssetSaveState();
  }).catch(function(e){assetStatus(e.message,true);});
  renderSavedAssets();
  setupAssetFieldAiButtons();
  restoreFieldAiUiFromQueue();
  var next=el("asset-next-btn");if(next)next.style.display=A.asset.saved?"flex":"none";
}
function renderAssetModeControls(){renderAssetSetupUi();}
function setAssetMode(mode){setAssetSetupMode(mode==="update"?"update":(A.sel?"deal_add":"account_add"));}
function renderAssetModeBanner(){renderAssetSetupUi();}
function equipmentRecordAccount(r){
  if(!r||!r.Account)return{id:"",name:""};
  if(typeof r.Account==="string")return{id:r.Account,name:""};
  return{id:r.Account.id||"",name:r.Account.name||""};
}
function applyLoadedAssetAccount(r){
  var acct=equipmentRecordAccount(r);
  if(!acct.id&&!acct.name)return;
  A.asset.standaloneAccount={id:acct.id,name:acct.name||assetLookupName(r.Account)||""};
  A.asset.linkMode="account";
  setAssetInput("asset-account",A.asset.standaloneAccount.name);
  renderAssetSetupUi();
}
function assetLookupId(v){if(!v)return"";if(typeof v==="string")return v;return v.id||"";}
function assetLookupName(v){if(!v)return"";if(typeof v==="string")return v;return v.name||v.id||"";}
function originalAssetSnapshot(r){return r?{id:r.id,cacId:r.CAC_Asset_ID||"",name:r.Name||"",account:assetLookupName(r.Account)||"",brand:r.Asset_Brand||"",type:r.Asset_Type||"",model:r.Asset_Model_Number||"",serial:r.Serial_Number||"",series:r.Asset_Series||"",building:r.Building||"",designator:r.Additional_Designator||"",description:r.Description_Instructions||"",nameplateAdditional:r.Nameplate_Additional_Info||""}:null;}
function assetReplacementHistoryEntries(){
  var txt=(A.asset.loadedOriginal&&A.asset.loadedOriginal.description)||assetInput("asset-description")||"";
  return String(txt).split(/\n\n+/).filter(function(block){return block.indexOf("Replacement recorded by CapStone")>=0;});
}
function parseReplacementBlock(block){
  var o={date:"",previousModel:"",previousSerial:"",previousBrand:"",previousType:"",newModel:"",newSerial:"",newBrand:"",newType:""};
  String(block||"").split("\n").forEach(function(line){
    var idx=line.indexOf(":");
    if(line.indexOf("Replacement recorded by CapStone on ")===0)o.date=line.replace("Replacement recorded by CapStone on ","").trim();
    else if(idx>0){var k=line.slice(0,idx).trim(),v=line.slice(idx+1).trim();
      if(k==="Previous Model")o.previousModel=v;if(k==="Previous Serial")o.previousSerial=v;if(k==="Previous Brand")o.previousBrand=v;if(k==="Previous Type")o.previousType=v;if(k==="New Model")o.newModel=v;if(k==="New Serial")o.newSerial=v;if(k==="New Brand")o.newBrand=v;if(k==="New Type")o.newType=v;
    }
  });
  return o;
}
function replacementCardHtml(block){
  var r=parseReplacementBlock(block);
  return "<div class='replacement-card'><div class='replacement-card-title'>Replacement "+esc(r.date||"")+"</div>"+
    "<div class='replacement-row'><span>Previous:</span> "+esc([r.previousBrand,r.previousType,r.previousModel?("Model "+r.previousModel):"",r.previousSerial?("Serial "+r.previousSerial):""].filter(Boolean).join(" — ")||"-")+"</div>"+
    "<div class='replacement-row'><span>New:</span> "+esc([r.newBrand,r.newType,r.newModel?("Model "+r.newModel):"",r.newSerial?("Serial "+r.newSerial):""].filter(Boolean).join(" — ")||"-")+"</div></div>";
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
    (history.length?"<div style='margin-top:8px;color:var(--dim)'>Replacement History</div>"+history.map(replacementCardHtml).join(""):"<div style='margin-top:8px;color:var(--dim)'>No replacement notes recorded yet.</div>");
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
  var lines=["Replacement recorded by CapStone on "+new Date().toLocaleDateString(),"Technician: "+(A.technician||"Not selected"),"Previous Model: "+(o.model||""),"Previous Serial: "+(o.serial||""),"Previous Brand: "+(o.brand||""),"Previous Type: "+(o.type||""),"New Model: "+assetInput("asset-model"),"New Serial: "+assetInput("asset-serial"),"New Brand: "+assetInput("asset-brand"),"New Type: "+assetInput("asset-type")];
  return lines.join("\n");
}
function renderAssetSearchResults(){
  var box=el("asset-search-results");if(!box)return;
  if(!A.asset.searchResults.length){box.style.display="block";box.innerHTML="<div style='font-size:12px;color:var(--dim);line-height:1.5'>No matching assets found. If this is new equipment, complete the required fields and save it as a new asset.</div>";return;}
  box.style.display="block";
  box.innerHTML=A.asset.searchResults.map(function(r,i){
    var title=esc(r.CAC_Asset_ID||r.Name||"Asset");
    var acct=esc(assetLookupName(r.Account)||"");
    var meta=[acct?"Account: "+acct:"",r.Asset_Brand,r.Asset_Type,r.Asset_Series,r.Name,r.Asset_Model_Number,r.Serial_Number,r.Customer_Asset_Number,r.Building,r.Additional_Designator].filter(Boolean).map(esc).join(" — ");
    return "<div style='border-top:1px solid #b2ddd6;padding:8px 0'><div style='font-family:Barlow Condensed,sans-serif;font-weight:700;color:#2d6b60'>"+title+"</div><div style='font-size:12px;color:var(--dim);line-height:1.5'>"+(meta||"No additional details")+"</div><button type='button' class='bg bsm' onclick='loadExistingAssetFromSearch("+i+")' style='margin-top:6px'>Load Existing Asset</button></div>";
  }).join("");
}
async function searchExistingAssets(){
  try{
    var q=assetInput("asset-search");if(!q){assetStatus("Enter a CAC ID (AMD####), serial, model, brand, type, name, building, or designator.",true);return;}
    await refreshZohoToken();
    assetStatus("Searching Zoho assets for \""+q+"\"...",false);
    var acctId=assetSaveAccountId()||"";
    var r=await fetchWithTimeout(PROXY,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"search_equipment_assets",token:A.zohoToken,account_id:acctId,query:q})},30000);
    var txt=await r.text();if(!r.ok)throw new Error("Asset search "+r.status+": "+txt.substring(0,160));
    var d=JSON.parse(txt);A.asset.searchResults=d.data||[];renderAssetSearchResults();
    if(!A.asset.searchResults.length){
      assetStatus("No matching assets found for \""+q+"\". Try the exact AMD/CAC ID (e.g. AMD2913). Account is optional for AMD searches.",true);
      return;
    }
    assetStatus("Found "+A.asset.searchResults.length+" asset(s). Select one to load for update.",false);
  }catch(e){assetStatus("Asset search failed: "+e.message,true);}
}
function searchAssetByCurrentField(id){
  var v=assetInput(id);
  if(!v){assetStatus(id==="asset-serial"?"Enter a serial number first.":"Enter a model number first.",true);return;}
  setAssetInput("asset-search",v);
  return searchExistingAssets();
}
function setAssetSelectIfPresent(id,value,opts){
  opts=opts||{};
  var e=el(id);if(!e)return;
  var v=String(value||"");
  if(id==="asset-category"&&v)v=normalizeAssetCategoryKey(v);
  e.value=v;
  if(v&&e.value!==v){
    var opt=document.createElement("option");
    opt.value=v;
    opt.textContent=v;
    e.appendChild(opt);
    e.value=v;
  }
  if(!opts.silent){
    if(id==="asset-category"&&v&&assetInput("asset-category")===v)syncAssetCategoryLayoutUi();
    else if((id==="asset-brand"||id==="asset-series")&&assetInput("asset-category")&&categoryLayout(assetInput("asset-category")))refreshCategoryFieldDefaultsOnly();
  }
}
function loadExistingAssetFromSearch(idx){
  var r=A.asset.searchResults[idx];if(!r)return;
  A.asset.entryStateResetting=true;
  try{
    clearAssetEntryState("Loaded existing asset for update.",true,true);
    A.asset.intent="update";
    A.asset.mode="update";
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
    applyDynamicFieldsFromRecord(r);
    applyLoadedAssetAccount(r);
    setAssetInput("asset-nameplate-additional",r.Nameplate_Additional_Info||"");
    setAssetInput("asset-description",r.Description_Instructions||"");
    setAssetInput("asset-search",r.CAC_Asset_ID||r.Serial_Number||r.Name||"");
    var box=el("asset-search-results");if(box)box.style.display="none";
    renderAssetReplacementPanel();
    renderAssetSetupUi();
    syncAssetCategoryLayoutUi();
  }finally{
    A.asset.entryStateResetting=false;
    saveAssetDraftNow();
  }
}
function assetPhotoFingerprint(dataUrl){
  var s=String(dataUrl||"");
  return s.length+":"+s.slice(0,80)+":"+s.slice(-80);
}
function normalizeAssetPhotoRole(desc,explicitRole){
  if(explicitRole&&ASSET_PHOTO_ROLES[explicitRole])return explicitRole;
  var s=String(desc||"").toLowerCase();
  if(/\bsensor\b|\bflow[\-\s]?tube\b|\bmeasuring[\-\s]?tube\b|\bsensor[\-\s]?body\b/.test(s))return "sensor";
  if(/\btransmitter\b/.test(s)||/\bmain\b/.test(s)||/\bnameplate\b/.test(s))return "transmitter";
  return "other";
}
function normalizeAssetPhoto(photo){
  if(!photo)return photo;
  if(photo.shortDescription||photo.photoRole){
    if(!photo.photoRole)photo.photoRole=normalizeAssetPhotoRole(photo.shortDescription);
    if(!photo.shortDescription){
      var roleDef=ASSET_PHOTO_ROLES[photo.photoRole]||ASSET_PHOTO_ROLES.other;
      photo.shortDescription=roleDef.short;
    }
  }
  return photo;
}
function assetPhotoRoleDefaults(){
  return Object.keys(ASSET_PHOTO_ROLES).map(function(k){return ASSET_PHOTO_ROLES[k].short;});
}
function assetPhotoCountByRole(role,excludePhoto){
  normalizeAssetPhotos();
  return A.asset.photos.filter(function(p){
    if(excludePhoto&&p===excludePhoto)return false;
    var r=p.photoRole||normalizeAssetPhotoRole(p.shortDescription);
    return r===role;
  }).length;
}
function assetPhotoRoleLimit(role){return ASSET_PHOTO_ROLE_LIMITS[role]!=null?ASSET_PHOTO_ROLE_LIMITS[role]:99;}
function assetPhotoRoleNumber(photo,idx){
  var role=photo.photoRole||normalizeAssetPhotoRole(photo.shortDescription)||"other";
  var n=0;
  for(var i=0;i<=idx&&i<A.asset.photos.length;i++){
    var p=A.asset.photos[i];
    var r=p.photoRole||normalizeAssetPhotoRole(p.shortDescription)||"other";
    if(r===role)n++;
  }
  return n||1;
}
function normalizeAssetPhotos(){A.asset.photos.forEach(normalizeAssetPhoto);}
function assetPhotoRoleLabel(photo){
  photo=photo||{};
  if(!photo.shortDescription&&!photo.photoRole)return "Unlabeled";
  photo=normalizeAssetPhoto(photo);
  var roleDef=ASSET_PHOTO_ROLES[photo.photoRole]||ASSET_PHOTO_ROLES.other;
  return photo.shortDescription||roleDef.short;
}
function assetPhotosForExtract(kind){
  normalizeAssetPhotos();
  return A.asset.photos.filter(function(p){
    if(!p.shortDescription&&!p.photoRole)return false;
    var role=p.photoRole||normalizeAssetPhotoRole(p.shortDescription);
    if(kind==="sensor")return role==="sensor";
    return role!=="sensor";
  });
}
function setDynamicAssetField(api,val){
  if(!val)return;
  if(!A.asset.dynamicValues)A.asset.dynamicValues={};
  A.asset.dynamicValues[api]=String(val);
  markDynamicFieldTouched(api);
  var dEl=el(assetDynId(api));
  if(dEl)dEl.value=A.asset.dynamicValues[api];
}
function renderAssetPhotos(){
  normalizeAssetPhotos();
  var grid=el("asset-photo-grid");if(!grid)return;
  grid.innerHTML=A.asset.photos.map(function(p,i){
    var lbl=esc(assetPhotoRoleLabel(p));
    return"<button type='button' class='asset-photo-item' onclick='editAssetPhotoLabel("+i+")' title='Tap to change label'><img src='"+p.data+"' alt='Asset photo'/><span class='asset-photo-label'>"+lbl+"</span></button>";
  }).join("");
  var extractBtn=el("asset-extract-btn");
  if(A.asset.photos.length){
    showEl("asset-photo-wrap");
    if(extractBtn)extractBtn.style.display="block";
  }else{
    hideEl("asset-photo-wrap");
    if(extractBtn)extractBtn.style.display="none";
  }
}
async function labelNewAssetPhotos(startIdx){
  for(var i=startIdx;i<A.asset.photos.length;i++){
    await requestAssetPhotoLabel(A.asset.photos[i],i,{required:true});
  }
}
function assetPhotosToUpload(){
  return A.asset.photos.filter(function(p){return p.fingerprint&&!A.asset.lastUploadedPhotoFingerprints[p.fingerprint];});
}
function primaryAssetPhoto(){return A.asset.photos[0]||null;}
function assetPhotoSelected(input){
  var files=Array.from(input.files||[]);if(!files.length)return;
  A.asset.saved=false;
  var startIdx=A.asset.photos.length;
  var remaining=files.length;
  files.forEach(function(file){
    var reader=new FileReader();
    reader.onload=function(ev){
      var data=ev.target.result,fp=assetPhotoFingerprint(data);
      A.asset.photos.push({data:data,name:file.name||("asset-nameplate-"+A.asset.photos.length+".jpg"),fingerprint:fp,shortDescription:"",photoRole:""});
      remaining--;
      if(remaining===0){
        (async function(){
          await labelNewAssetPhotos(startIdx);
          renderAssetPhotos();
          var mainCount=assetPhotosForExtract("main").length,sensorCount=assetPhotosForExtract("sensor").length;
          assetStatus(A.asset.photos.length+" photo(s) labeled. "+mainCount+" transmitter/main, "+sensorCount+" sensor. Tap a photo to relabel.",false);
          scheduleAssetDraftSave();
        })();
      }
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
var PICKLIST_REQUEST_FIELDS={
  Asset_Brand:{selectId:"asset-brand",otherId:"asset-brand-other",otherValue:"1 Other",label:"Asset Brand"},
  Asset_Type:{selectId:"asset-type",otherId:"asset-type-other",otherValue:"1 Other",label:"Asset Type"}
};
function picklistRequestKey(fieldApi,value){return fieldApi+":"+String(value||"").trim().toLowerCase();}
function getPicklistRequestsSent(){try{return JSON.parse(localStorage.getItem("fp_picklist_requests_sent")||"[]");}catch(e){return[];}}
function markPicklistRequestSent(key){
  var arr=getPicklistRequestsSent();
  if(arr.indexOf(key)<0){arr.push(key);if(arr.length>200)arr=arr.slice(-200);}
  try{localStorage.setItem("fp_picklist_requests_sent",JSON.stringify(arr));}catch(e){}
}
function isPicklistRequestSent(key){return getPicklistRequestsSent().indexOf(key)>=0;}
function assetPicklistNearMatch(field,val){
  val=String(val||"").trim();if(!val)return"";
  var exact=exactPicklistMatch(field,val);if(exact)return exact;
  var vals=assetPicklistValues(field),low=val.toLowerCase(),best="",bestLen=999;
  for(var i=0;i<vals.length;i++){
    var v=String(vals[i]);if(!v||v==="1 Other"||v==="_"||v==="Other")continue;
    var vl=v.toLowerCase();
    if(vl.indexOf(low)>=0||low.indexOf(vl)>=0){
      if(v.length<bestLen){best=v;bestLen=v.length;}
    }
  }
  return best;
}
function normalizePicklistCompare(val){return String(val||"").toLowerCase().replace(/[^a-z0-9]+/g,"");}
function assetPicklistIsStrongNear(proposed,candidate){
  proposed=String(proposed||"").trim();candidate=String(candidate||"").trim();
  if(!proposed||!candidate)return false;
  if(proposed.toLowerCase()===candidate.toLowerCase())return true;
  var np=normalizePicklistCompare(proposed),nc=normalizePicklistCompare(candidate);
  return !!(np&&np===nc);
}
function applyAssetPicklistNearMatch(fieldApi,nearValue){
  var cfg=PICKLIST_REQUEST_FIELDS[fieldApi];
  if(!cfg||!nearValue)return;
  setAssetSelectIfPresent(cfg.selectId,nearValue);
  setAssetInput(cfg.otherId,"");
  updateAssetSaveState();
  renderAssetPicklistRequestPanel();
  showToast(cfg.label+" set to "+nearValue,3500);
}
function applyExtractedPicklistField(fieldApi,cfg,rawVal){
  rawVal=String(rawVal||"").trim();if(!rawVal||!cfg)return;
  var exact=exactPicklistMatch(fieldApi,rawVal);
  if(exact){setAssetSelectIfPresent(cfg.selectId,exact);setAssetInput(cfg.otherId,"");return;}
  var near=assetPicklistNearMatch(fieldApi,rawVal);
  if(near&&assetPicklistIsStrongNear(rawVal,near)){setAssetSelectIfPresent(cfg.selectId,near);setAssetInput(cfg.otherId,"");return;}
  setAssetSelectIfPresent(cfg.selectId,cfg.otherValue);
  setAssetInput(cfg.otherId,rawVal);
}
function getAssetPicklistMisses(){
  var misses=[];
  Object.keys(PICKLIST_REQUEST_FIELDS).forEach(function(fieldApi){
    var cfg=PICKLIST_REQUEST_FIELDS[fieldApi];
    var sel=assetInput(cfg.selectId),other=assetInput(cfg.otherId);
    if(sel===cfg.otherValue&&other){
      var proposed=other.trim();
      if(proposed)misses.push({fieldApi:fieldApi,fieldLabel:cfg.label,proposedValue:proposed,nearMatch:assetPicklistNearMatch(fieldApi,proposed)||""});
    }
  });
  return misses;
}
function buildPicklistRequestPayload(miss){
  miss=miss||{};
  return{
    fieldApi:miss.fieldApi||"",
    fieldLabel:miss.fieldLabel||miss.fieldApi||"Picklist field",
    proposedValue:miss.proposedValue||"",
    nearMatch:miss.nearMatch||"",
    technician:technicianDisplayName()||A.technician||"",
    accountName:A.sel&&A.sel.Account_Name||assetInput("asset-account")||"",
    dealName:A.sel&&A.sel.Deal_Name||"",
    dealId:A.sel&&A.sel.id||"",
    equipmentId:A.asset.currentAssetId||"",
    assetName:assetInput("asset-name")||"",
    model:assetInput("asset-model")||"",
    serial:assetInput("asset-serial")||"",
    requestedAt:new Date().toISOString()
  };
}
function ensurePicklistRequestPanelHandlers(){
  var panel=el("asset-picklist-request-panel");
  if(!panel||panel._picklistClickBound)return;
  panel._picklistClickBound=true;
  panel.addEventListener("click",function(ev){
    var useBtn=ev.target.closest("[data-picklist-use]");
    if(useBtn){
      ev.preventDefault();
      applyAssetPicklistNearMatch(useBtn.getAttribute("data-field-api"),useBtn.getAttribute("data-near-value"));
      return;
    }
    var reqBtn=ev.target.closest("[data-picklist-request]");
    if(reqBtn){
      ev.preventDefault();
      requestAssetPicklistValue(reqBtn.getAttribute("data-field-api"));
    }
  });
}
function renderAssetPicklistRequestPanel(){
  ensurePicklistRequestPanelHandlers();
  var panel=el("asset-picklist-request-panel");if(!panel)return;
  var misses=getAssetPicklistMisses();
  if(!misses.length){panel.style.display="none";panel.innerHTML="";return;}
  panel.style.display="block";
  fpAfterDomUpdate(function(){
  var rows=misses.map(function(m){
    var key=picklistRequestKey(m.fieldApi,m.proposedValue);
    var sent=isPicklistRequestSent(key);
    var near=m.nearMatch&&m.nearMatch.toLowerCase()!==m.proposedValue.toLowerCase()?("<div style='margin-top:6px;display:flex;flex-wrap:wrap;gap:6px;align-items:center'><span style='font-size:11px;color:#92400e'>Similar in Zoho:</span><button type='button' class='bb bsm' data-picklist-use='1' data-field-api='"+esc(m.fieldApi)+"' data-near-value='"+esc(m.nearMatch)+"'>Use "+esc(m.nearMatch)+"</button></div>"):"";
    var action=sent?"<span class='asset-picklist-request-sent'>Request sent</span>":"<button type='button' class='bg bsm' data-picklist-request='1' data-field-api='"+esc(m.fieldApi)+"'>Request addition</button>";
    return"<div class='asset-picklist-request-row'><div><strong>"+esc(m.fieldLabel)+"</strong> isn&rsquo;t in Zoho yet: <strong>"+esc(m.proposedValue)+"</strong>"+near+"<div style='font-size:11px;color:var(--dim);margin-top:4px'>Tap Use if the Zoho value matches, or Request addition for a new picklist value.</div></div><div style='flex-shrink:0;display:flex;flex-direction:column;gap:6px;align-items:flex-end'>"+action+"</div></div>";
  }).join("");
  panel.innerHTML="<div class='stitle'>Picklist requests</div><div style='font-size:11px;color:var(--dim);margin-bottom:6px'>Email Brad to add new Brand or Type values found by AI or entered as Other.</div>"+rows;
  });
}
async function sendPicklistRequestPayload(payload){
  var r=await fetchWithTimeout(PICKLIST_REQUEST_URL,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)},30000);
  var txt=await r.text();
  if(!r.ok)throw new Error((r.status===503?"Email not configured":"Picklist request "+r.status)+": "+txt.substring(0,160));
  try{return JSON.parse(txt);}catch(e){return{ok:true};}
}
function enqueuePicklistRequest(payload,error){
  if(!payload||!payload.fieldApi||!payload.proposedValue)return;
  var key=picklistRequestKey(payload.fieldApi,payload.proposedValue);
  var items=getPendingUploads();
  if(items.some(function(i){return i.type==="picklist_request"&&(i.requestKey===key||(i.payload&&picklistRequestKey(i.payload.fieldApi,i.payload.proposedValue)===key));}))return;
  enqueuePendingUpload({type:"picklist_request",requestKey:key,payload:payload,assetLabel:"Picklist request — "+payload.fieldLabel,filename:payload.proposedValue,error:error||""});
}
async function uploadPendingPicklistRequest(item){
  if(!item||!item.payload)throw new Error("Pending picklist request missing data");
  await sendPicklistRequestPayload(item.payload);
  markPicklistRequestSent(item.requestKey||picklistRequestKey(item.payload.fieldApi,item.payload.proposedValue));
}
async function requestAssetPicklistValue(fieldApi){
  var miss=null;
  getAssetPicklistMisses().forEach(function(m){if(m.fieldApi===fieldApi)miss=m;});
  if(!miss){showToast("Nothing to request for that field",2500);return;}
  if(miss.nearMatch&&miss.nearMatch.toLowerCase()!==miss.proposedValue.toLowerCase()){
    if(!confirm("Zoho already has \""+miss.nearMatch+"\" which looks similar.\n\nRequest \""+miss.proposedValue+"\" anyway?"))return;
  }
  var payload=buildPicklistRequestPayload(miss);
  var key=picklistRequestKey(payload.fieldApi,payload.proposedValue);
  if(isPicklistRequestSent(key)){renderAssetPicklistRequestPanel();showToast("Request already sent for this value",3000);return;}
  try{
    await sendPicklistRequestPayload(payload);
    markPicklistRequestSent(key);
    renderAssetPicklistRequestPanel();
    showToast("Picklist request emailed to Brad",4000);
  }catch(e){
    if(shouldQueueAiError(e)||String(e.message||"").indexOf("not configured")>=0){
      enqueuePicklistRequest(payload,e.message||String(e));
      renderAssetPicklistRequestPanel();
      showToast("Picklist request queued in Pending Sync",4500);
      return;
    }
    showToast("Could not send picklist request: "+(e.message||e),5000);
  }
}
function applyAssetExtraction(x){
  x=normalizeExtractedPartModelSeries(x||{});
  x.k_factor=resolveExtractedCalFactor(x)||x.k_factor;
  var manufacturer=x.manufacturer||x.brand||"";
  applyExtractedPicklistField("Asset_Brand",PICKLIST_REQUEST_FIELDS.Asset_Brand,manufacturer);
  applyExtractedPicklistField("Asset_Type",PICKLIST_REQUEST_FIELDS.Asset_Type,x.asset_type||x.equipment_type||"");
  var fullModel=x.model_number||x.model||"";
  var seriesVal=x.series||"";
  if(seriesVal&&fullModel&&extractAlnumKey(seriesVal)===extractAlnumKey(fullModel))seriesVal="";
  var series=exactPicklistMatch("Asset_Series",seriesVal);
  if(series)setAssetSelectIfPresent("asset-series",series);
  else if(seriesVal){setAssetSelectIfPresent("asset-series","Other");setAssetInput("asset-series-other",seriesVal);}
  setAssetInput("asset-model",fullModel);
  setAssetInput("asset-serial",x.serial_number||x.serial||"");
  applyExtractedDynamicFields(x);
  var nameParts=[];if(manufacturer)nameParts.push(manufacturer);if(x.asset_type||x.equipment_type)nameParts.push(x.asset_type||x.equipment_type);
  if(seriesVal&&!nameParts.some(function(p){return p===seriesVal;}))nameParts.push(seriesVal);
  if(fullModel)nameParts.push(fullModel);
  if(!assetInput("asset-name"))setAssetInput("asset-name",nameParts.join(" "));
  var notes=[];
  if(x.part_number&&x.part_number!==fullModel)notes.push("Part Number: "+x.part_number);
  if(x.order_number&&x.order_number!==fullModel)notes.push("Order Code: "+x.order_number);
  if(x.nominal_diameter)notes.push("Nominal Diameter: "+x.nominal_diameter);
  if(x.ratings)notes.push("Process / Electrical: "+x.ratings);
  if(x.visible_text)notes.push("Visible text: "+x.visible_text);
  if(notes.length)setAssetInput("asset-nameplate-additional",notes.join("\n"));
  var cat=normalizeAssetCategoryKey(assetInput("asset-category"));
  if(cat&&categoryLayout(cat)){
    if(categoryFieldsAreRendered())refreshCategoryFieldDefaultsOnly();
    else syncAssetCategoryLayoutUi();
  }
  updateAssetSaveState();
  renderAssetPicklistRequestPanel();
}
function ensureFlowMeterCategoryForSensor(){
  if(categoryLayout(assetInput("asset-category")))return false;
  setAssetSelectIfPresent("asset-category","Flow Meter");
  if(!categoryLayout(assetInput("asset-category")))return false;
  showToast("Asset Category set to Flow Meter to show sensor fields",4000);
  syncAssetCategoryLayoutUi();
  return true;
}
function applySensorExtraction(x){
  if(!x)return 0;
  syncDynamicFieldValuesFromDom();
  if(!A.asset.dynamicValues)A.asset.dynamicValues={};
  x=Object.assign({},x||{});
  x.k_factor=resolveExtractedCalFactor(x)||x.k_factor;
  var sensorModel=extractValTrim(x.sensor_model_number)||extractValTrim(x.order_number)||extractValTrim(x.model_number)||extractValTrim(x.part_number)||"";
  var sensorSerial=extractValTrim(x.sensor_serial_number)||extractValTrim(x.serial_number)||"";
  var cal=resolveExtractedCalFactor(x);
  var notes=[];
  if(x.manufacturer)notes.push("Manufacturer: "+x.manufacturer);
  if(x.nominal_diameter)notes.push("Nominal Diameter: "+x.nominal_diameter);
  if(x.ratings)notes.push("Ratings: "+x.ratings);
  if(x.visible_text)notes.push("Visible text: "+x.visible_text);
  var count=0;
  if(sensorModel){A.asset.dynamicValues.Sensor_Model_Number=String(sensorModel);markDynamicFieldTouched("Sensor_Model_Number");count++;}
  if(sensorSerial){A.asset.dynamicValues.Sensor_Serial_Number=String(sensorSerial);markDynamicFieldTouched("Sensor_Serial_Number");count++;}
  if(cal){
    var calVal=normalizeCalFactorForZoho(cal);
    A.asset.dynamicValues.Cal_Factor_K_Factor=String(calVal);
    markDynamicFieldTouched("Cal_Factor_K_Factor");
    count++;
  }
  if(x.nominal_diameter){
    var pipeMatch=matchPipeSizeFromDiameter(String(x.nominal_diameter));
    if(pipeMatch){A.asset.dynamicValues.Pipe_Size=pipeMatch;markDynamicFieldTouched("Pipe_Size");count++;}
  }
  if(notes.length){A.asset.dynamicValues.Sensor_Additional_Information=notes.join("\n");markDynamicFieldTouched("Sensor_Additional_Information");count++;}
  if(count)ensureFlowMeterCategoryForSensor();
  return syncAssetCategoryLayoutUi().then(function(){return count;});
}
function applyExtractedDynamicFields(x){
  if(!x)return;
  if(!A.asset.dynamicValues)A.asset.dynamicValues={};
  var cal=resolveExtractedCalFactor(x);
  if(cal)setCalFactorField(cal);
  if(x.nominal_diameter){
    var dn=String(x.nominal_diameter);
    var pipeMatch=matchPipeSizeFromDiameter(dn);
    if(pipeMatch){
      A.asset.dynamicValues.Pipe_Size=pipeMatch;
      markDynamicFieldTouched("Pipe_Size");
      var pEl=el(assetDynId("Pipe_Size"));
      if(pEl)pEl.value=pipeMatch;
    }
  }
  if(typeof renderAssetCategoryFields==="function"&&assetInput("asset-category"))syncAssetCategoryLayoutUi();
}
function setCalFactorField(val){
  if(!val)return;
  var calVal=normalizeCalFactorForZoho(val);
  if(calVal==null||calVal==="")return;
  if(!A.asset.dynamicValues)A.asset.dynamicValues={};
  A.asset.dynamicValues.Cal_Factor_K_Factor=String(calVal);
  markDynamicFieldTouched("Cal_Factor_K_Factor");
  var kEl=el(assetDynId("Cal_Factor_K_Factor"));
  if(kEl)kEl.value=A.asset.dynamicValues.Cal_Factor_K_Factor;
}
function resolveExtractedCalFactor(x){
  if(!x)return null;
  var v=extractValTrim(x.k_factor)||extractValTrim(x.cal_factor);
  if(v)return v;
  return extractCalFactorFromText([x.ratings,x.visible_text].filter(Boolean).join("\n"));
}
function extractCalFactorFromText(text){
  if(!text)return null;
  var s=String(text);
  var patterns=[
    /(?:cal(?:\.|ibration)?\s*fact(?:or)?|k[\-\s]?factor|cal\s*factor)[:\s=]+([0-9]+(?:\.[0-9]+)?)/i,
    /(?:cal\.?\s*fact\.?)[:\s=]+([0-9]+(?:\.[0-9]+)?)/i
  ];
  for(var i=0;i<patterns.length;i++){
    var m=s.match(patterns[i]);
    if(m&&m[1])return m[1];
  }
  return null;
}
function matchPipeSizeFromDiameter(dn){
  var s=String(dn||""),vals=assetPicklistValues("Pipe_Size");
  for(var i=0;i<vals.length;i++){if(s.indexOf(vals[i])>=0||vals[i].indexOf(s)>=0)return vals[i];}
  var inch=s.match(/(\d+)\s*"/);if(inch){
    var q=inch[1]+" Inch";
    for(var j=0;j<vals.length;j++){if(vals[j].indexOf(q)===0)return vals[j];}
  }
  var dnNum=s.match(/DN\s*(\d+)/i);if(dnNum){
    for(var k=0;k<vals.length;k++){if(vals[k].indexOf(dnNum[1]+" ")>=0||vals[k].indexOf(" "+dnNum[1]+" DN")>=0)return vals[k];}
  }
  return null;
}
function extractValTrim(v){v=String(v||"").trim();return v||null;}
function extractAlnumKey(s){return String(s||"").toLowerCase().replace(/[^a-z0-9]/g,"");}
function partNumberDigits(s){return String(s||"").replace(/\D/g,"");}
function matchKnownPartPrefixRule(fields){
  for(var ri=0;ri<ASSET_PART_PREFIX_SERIES.length;ri++){
    var rule=ASSET_PART_PREFIX_SERIES[ri];
    for(var fi=0;fi<fields.length;fi++){
      var digits=partNumberDigits(fields[fi]);
      if(digits&&digits.indexOf(rule.prefix)===0)return rule;
    }
  }
  return null;
}
function inferSeriesFromKnownPartPrefixes(fields){
  var rule=matchKnownPartPrefixRule(fields);
  return rule?rule.series:null;
}
function inferSeriesFromModel(model){
  if(!model)return null;
  var m=String(model),best="";
  assetPicklistValues("Asset_Series").forEach(function(v){
    if(m.indexOf(v)===0&&v.length>best.length)best=v;
  });
  if(best)return best;
  var numMatch=m.match(/^(\d{3,5}[A-Za-z]{0,3}?)(?=[A-Z]{2,}|\d|[\-]|$)/);
  if(numMatch&&numMatch[1]&&numMatch[1].length<m.length)return numMatch[1];
  numMatch=m.match(/^(\d{4})/);
  if(numMatch&&numMatch[1].length<m.length)return numMatch[1];
  return null;
}
function isEndressHauserManufacturer(mfg){
  var s=String(mfg||"").toLowerCase();
  return s.indexOf("endress")>=0||s.indexOf("e+h")>=0||/\be\s*h\b/.test(s);
}
function normalizeExtractedPartModelSeries(x){
  x=Object.assign({},x);
  var pn=extractValTrim(x.part_number);
  var ord=extractValTrim(x.order_number);
  var mn=extractValTrim(x.model_number)||extractValTrim(x.model);
  var ser=extractValTrim(x.series);
  var dev=extractValTrim(x.device_name);
  var mfg=x.manufacturer||x.brand||"";
  var eh=isEndressHauserManufacturer(mfg);
  if(ord){
    if(!mn||ord.length>=mn.length)mn=ord;
    else if(eh)mn=ord;
  }
  if(eh&&pn&&!mn)mn=pn;
  if(pn&&mn){
    if(pn.length>=mn.length)mn=pn;
    else if(mn.length>pn.length)pn=null;
  }else if(pn&&!mn)mn=pn;
  if(eh){
    if(dev)ser=dev;
    if(ser&&mn&&extractAlnumKey(ser)===extractAlnumKey(mn))ser=dev||null;
  }else{
    if(ser&&mn&&extractAlnumKey(ser)===extractAlnumKey(mn))ser=null;
    if(ser&&mn&&ser.length>=mn.length){
      var swap=ser;ser=inferSeriesFromModel(swap)||null;mn=swap;
    }
    if(!ser&&mn)ser=inferSeriesFromModel(mn);
    if(ser&&mn&&extractAlnumKey(mn).indexOf(extractAlnumKey(ser))!==0){
      var inferred=inferSeriesFromModel(mn);
      if(inferred)ser=inferred;
    }
  }
  if(pn&&mn&&extractAlnumKey(pn)===extractAlnumKey(mn))pn=null;
  var prefixRule=matchKnownPartPrefixRule([pn,ord,mn,x.visible_text]);
  if(prefixRule){
    ser=prefixRule.series;
    if(prefixRule.brand&&!mfg)x.manufacturer=prefixRule.brand;
    if(prefixRule.assetType&&!x.asset_type&&!x.equipment_type)x.asset_type=prefixRule.assetType;
  }
  var cf=extractValTrim(x.cal_factor);
  if(cf&&!x.k_factor)x.k_factor=cf;
  x.part_number=pn;
  x.model_number=mn;
  x.model=mn;
  x.series=ser;
  return x;
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
    var repair=[{type:"text",text:"Convert this asset extraction response into valid minified JSON only. Use exactly these keys: "+ASSET_EXTRACT_JSON_KEYS.replace(/,\s/g,", ")+". Zoho: series/device_name=Asset Series; order_number/model_number=full Order Code for E+H Promag; serial_number; k_factor; nominal_diameter. "+ASSET_EXTRACT_EH_MAGMETER+" All values strings or null. No markdown.\n\n"+String(txt||"").slice(0,2500)}];
    var repaired=await callAPI({content:repair,maxTok:500,ms:30000});
    try{return parseAssetJson(getText(repaired));}catch(secondErr){throw firstErr;}
  }
}
async function parseAssetSensorJsonWithRepair(txt){
  try{return parseAssetJson(txt);}catch(firstErr){
    var repair=[{type:"text",text:"Convert this sensor extraction response into valid minified JSON only. Use exactly these keys: "+ASSET_EXTRACT_SENSOR_JSON_KEYS.replace(/,\s/g,", ")+". Zoho: sensor_model_number, sensor_serial_number, k_factor/cal_factor for Cal Factor. All values strings or null. No markdown.\n\n"+String(txt||"").slice(0,2500)}];
    var repaired=await callAPI({content:repair,maxTok:500,ms:30000});
    try{return parseAssetJson(getText(repaired));}catch(secondErr){throw firstErr;}
  }
}
async function buildAssetExtractContent(photos,maxCount){
  var content=[];
  for(var pi=0;pi<Math.min(maxCount||3,photos.length);pi++){
    var b64=await compressPhoto(photos[pi].data,900,0.55);
    if(b64)content.push({type:"image",source:{type:"base64",media_type:"image/jpeg",data:b64}});
  }
  return content;
}
async function extractMainAssetPhotos(photos){
  var content=await buildAssetExtractContent(photos,3);
  content.push({type:"text",text:ASSET_EXTRACT_PROMPT});
  var data=await callAPI({content:content,maxTok:750,ms:45000});
  applyAssetExtraction(await parseAssetJsonWithRepair(getText(data)));
  removePendingAiByTypeTarget("asset_extract","asset");
}
async function extractSensorAssetPhotos(photos){
  var content=await buildAssetExtractContent(photos,3);
  var labels=photos.map(function(p){return assetPhotoRoleLabel(p);}).join(", ");
  content.push({type:"text",text:ASSET_EXTRACT_SENSOR_PROMPT+"\n\nThese photos are labeled: "+labels+". Extract sensor / flow-tube fields including Cal Factor / K-factor when visible on the sensor label — not the transmitter head."});
  var data=await callAPI({content:content,maxTok:600,ms:45000});
  var count=applySensorExtraction(await parseAssetSensorJsonWithRepair(getText(data)));
  removePendingAiByTypeTarget("asset_extract_sensor","asset");
  if(!count)throw new Error("No sensor model, serial, cal factor, or notes found on sensor label photo(s)");
}
async function queueAssetExtractFailure(kind,photos,err){
  if(!shouldQueueAiError(err)||!photos.length)return false;
  var b64Photos=[];
  for(var pi=0;pi<Math.min(3,photos.length);pi++){
    var b64=await compressPhoto(photos[pi].data,900,0.55);
    if(b64)b64Photos.push(b64);
  }
  if(!b64Photos.length)return false;
  var type=kind==="sensor"?"asset_extract_sensor":"asset_extract";
  var label=kind==="sensor"?"Sensor photo extraction":"Asset photo extraction";
  enqueuePendingAi({type:type,target:"asset",photos:b64Photos,extractKind:kind,label:label,error:err.message||String(err)});
  return true;
}
async function extractAssetFromPhoto(){
  A.asset.saved=false;
  normalizeAssetPhotos();
  if(!A.asset.photos.length){assetStatus("Take or upload at least one nameplate photo first.",true);return;}
  if(!API_KEY){enterKey();assetStatus("Add your Anthropic API key, then tap Extract again.",true);return;}
  var mainPhotos=assetPhotosForExtract("main");
  var sensorPhotos=assetPhotosForExtract("sensor");
  if(!mainPhotos.length&&!sensorPhotos.length){assetStatus("Label photos as transmitter or sensor, then tap Extract again.",true);return;}
  var parts=[],errors=[],queued=false;
  if(mainPhotos.length){
    try{
      assetStatus("Extracting transmitter/main fields from "+Math.min(3,mainPhotos.length)+" photo(s)...",false);
      await extractMainAssetPhotos(mainPhotos);
      parts.push("main");
    }catch(e){
      errors.push(e);
      queued=await queueAssetExtractFailure("main",mainPhotos,e)||queued;
    }
  }
  if(sensorPhotos.length){
    try{
      assetStatus("Extracting sensor fields from "+Math.min(3,sensorPhotos.length)+" photo(s)...",false);
      await extractSensorAssetPhotos(sensorPhotos);
      parts.push("sensor");
    }catch(e){
      errors.push(e);
      queued=await queueAssetExtractFailure("sensor",sensorPhotos,e)||queued;
      if(!queued)showToast("Sensor extract: "+(e.message||e),6000);
    }
  }
  if(parts.length&&!errors.length)assetStatus("AI extraction complete ("+parts.join(" + ")+"). Review all fields before saving.",false);
  else if(parts.length&&errors.length)assetStatus("Partial extraction ("+parts.join(" + ")+"). Some fields queued for retry.",false);
  else if(queued){
    assetStatus("Extraction queued — will retry when connection improves.",false);
    showToast("Asset extraction queued for when signal returns",4500);
  }else if(errors.length)assetStatus("Asset extraction failed: "+(errors[0].message||String(errors[0])),true);
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
  var missing=markAssetRequiredFields().concat(markDynamicRequiredFields()).concat(markSubformRequiredFields());
  var btn=el("asset-save-btn");
  if(btn){
    var needsExisting=A.asset.mode==="update"&&!A.asset.currentAssetId;
    var blocked=missing.length>0||needsExisting;
    btn.disabled=A.asset.saving||blocked;
    btn.className="bs-lg"+(A.asset.saved&&!A.asset.saving?" saved":"")+(blocked&&!A.asset.saving?" blocked":"");
    btn.title=needsExisting?"Search and load an existing asset before saving.":(missing.length?"Complete required fields: "+missing.join(", "):"");
    if(!A.asset.saving)btn.textContent=A.asset.saved?"Saved":(A.asset.currentAssetId?"Update Existing Asset":(A.asset.mode==="update"?"Load Existing Asset First":"Save New Asset to Zoho"));
  }
  if(typeof renderAssetReplacementPanel==="function")renderAssetReplacementPanel();
  if(typeof renderAssetModeControls==="function")renderAssetModeControls();
  if(typeof renderAssetModeBanner==="function")renderAssetModeBanner();
  renderAssetPicklistRequestPanel();
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
  ["asset-brand-other","asset-type-other"].forEach(function(id){
    var e=el(id);if(!e)return;
    e.addEventListener("input",renderAssetPicklistRequestPanel);
    e.addEventListener("change",renderAssetPicklistRequestPanel);
  });
  var catEl=el("asset-category");
  if(catEl&&!catEl._categoryLayoutBound){
    catEl._categoryLayoutBound=true;
    catEl.addEventListener("change",onAssetCategoryChange);
  }
  ["asset-brand","asset-series"].forEach(function(id){
    var e=el(id);if(!e||e._suggestBound)return;
    e._suggestBound=true;
    e.addEventListener("change",onAssetBrandOrSeriesChange);
  });
  installAutoAdvanceInRoot(el("p-assets"));
  A.assetReqHandlersBound=true;
}
function assetFieldIdsToClear(){return ["asset-name","asset-category","asset-function","asset-building","asset-designator","asset-brand","asset-type","asset-brand-other","asset-type-other","asset-model","asset-serial","asset-series","asset-series-other","asset-nameplate-additional","asset-description","asset-deal-notes"];}
function savedAssetSnapshot(equipmentId,dealLinked){
  return{id:equipmentId,name:assetInput("asset-name"),category:assetInput("asset-category"),assetFunction:assetInput("asset-function"),building:assetInput("asset-building"),designator:assetInput("asset-designator"),brand:assetInput("asset-brand"),type:assetInput("asset-type"),brandOther:assetInput("asset-brand-other"),typeOther:assetInput("asset-type-other"),model:assetInput("asset-model"),serial:assetInput("asset-serial"),series:assetInput("asset-series"),seriesOther:assetInput("asset-series-other"),environment:assetInput("asset-environment"),confined:assetInput("asset-confined"),nameplateAdditional:assetInput("asset-nameplate-additional"),description:assetInput("asset-description"),dealNotes:assetInput("asset-deal-notes"),dealLinked:!!dealLinked,accountOnly:!dealLinked&&(A.asset.linkMode==="account"||!A.sel)};
}
function renderSavedAssets(){
  var box=el("asset-saved-list");if(!box)return;
  if(!A.asset.savedItems.length){box.style.display="none";box.innerHTML="";return;}
  box.style.display="block";
  box.innerHTML="<div class='stitle'>Saved This Visit</div>"+A.asset.savedItems.map(function(a,i){
    return"<div style='font-size:12px;color:#2d6b60;margin-bottom:8px;border-top:1px solid #b2ddd6;padding-top:8px'><div>"+(i+1)+". "+esc(a.name||"Asset")+(a.model?" — "+esc(a.model):"")+(a.serial?" — S/N "+esc(a.serial):"")+(a.dealLinked?" — linked to deal":(a.accountOnly?" — account only":""))+"</div><button type='button' class='bg bsm' onclick='reopenSavedAsset("+i+")' style='margin-top:6px'>Reopen</button></div>";
  }).join("");
}
function clearAssetEntryState(msg,keepSavedItems,preserveDraft){
  if(!preserveDraft)clearAssetDraft();
  assetFieldIdsToClear().forEach(function(id){setAssetInput(id,"");});
  A.asset.photos=[];A.asset.lastUploadedPhotoFingerprints={};
  A.asset.dynamicValues={};A.asset.dynamicSuggested={};A.asset.dynamicTouched={};A.asset.subformRows=[];A.asset.subformTouched={};
  A.asset.saved=false;A.asset.currentAssetId=null;A.asset.loadedOriginal=null;A.asset.replacementMode=false;if(!keepSavedItems)A.asset.savedItems=[];
  renderAssetPhotos();renderSavedAssets();renderAssetCategoryFields();
  var next=el("asset-next-btn");if(next)next.style.display="none";
  if(msg)assetStatus(msg,false);else assetStatus("",false);
  renderAssetPicklistRequestPanel();
  updateAssetSaveState();
}
function resetAssetFormForNext(){
  clearAssetEntryState(A.asset.mode==="update"?"Ready to search for the next existing asset. Saved This Visit is still retained.":"Ready for next new asset. Account, GPS, and Saved This Visit are still retained.",true);
  try{var first=el("asset-photo-input");if(first)first.focus();}catch(e){}
}
function reopenSavedAsset(idx){
  var a=A.asset.savedItems[idx];if(!a)return;
  clearAssetEntryState("Reopened saved asset for review or another update.",true);
  A.asset.intent="update";
  A.asset.mode="update";
  A.asset.currentAssetId=a.id;A.asset.loadedOriginal={id:a.id,cacId:"",name:a.name||"",account:assetInput("asset-account")||"",brand:a.brand||"",type:a.type||"",model:a.model||"",serial:a.serial||"",series:a.series||"",building:a.building||"",designator:a.designator||"",description:a.description||"",nameplateAdditional:a.nameplateAdditional||""};A.asset.replacementMode=false;
  setAssetInput("asset-name",a.name||"");setAssetSelectIfPresent("asset-category",a.category||"");setAssetSelectIfPresent("asset-function",a.assetFunction||"");setAssetInput("asset-building",a.building||"");setAssetInput("asset-designator",a.designator||"");setAssetSelectIfPresent("asset-brand",a.brand||"");setAssetSelectIfPresent("asset-type",a.type||"");setAssetInput("asset-brand-other",a.brandOther||"");setAssetInput("asset-type-other",a.typeOther||"");setAssetInput("asset-model",a.model||"");setAssetInput("asset-serial",a.serial||"");setAssetSelectIfPresent("asset-series",a.series||"");setAssetInput("asset-series-other",a.seriesOther||"");setAssetSelectIfPresent("asset-environment",a.environment||"");setAssetSelectIfPresent("asset-confined",a.confined||"");setAssetInput("asset-nameplate-additional",a.nameplateAdditional||"");setAssetInput("asset-description",a.description||"");setAssetInput("asset-deal-notes",a.dealNotes||"");setAssetInput("asset-search",a.serial||a.model||a.name||"");
  renderSavedAssets();renderAssetReplacementPanel();renderAssetSetupUi();syncAssetCategoryLayoutUi();
}
function validateAssetForm(){
  var missing=markAssetRequiredFields().concat(markDynamicRequiredFields()).concat(markSubformRequiredFields());
  if(A.asset.linkMode==="account"){
    if(!assetSaveAccountId())missing.unshift("Zoho Account (tap Account only — pick account)");
  }else{
    if(!A.sel)missing.unshift("Deal (pick Add New → Pick deal & link)");
    if(A.sel&&!A.sel.Account_Id)missing.unshift("Zoho Account ID (refresh deals from Zoho)");
  }
  return missing;
}
function equipmentIdFromResponse(d){var rec=d&&d.data&&d.data[0];return rec&&(rec.details&&rec.details.id||rec.id)||null;}
function equipmentSaveError(parsed,httpStatus,txt){
  var row=parsed&&parsed.data&&parsed.data[0];
  if(row&&row.status==="error")throw new Error(row.message||row.code||"Zoho rejected equipment save");
  if(!httpStatus||httpStatus<200||httpStatus>=300)throw new Error("Zoho equipment "+(httpStatus||"?")+": "+String(txt||"").substring(0,160));
}
async function postEquipmentToZoho(action,equipmentId,payload,opts){
  opts=opts||{};
  var body={action:action,token:A.zohoToken,equipment:payload||{}};
  if(equipmentId)body.equipment_id=equipmentId;
  if(opts.applyLayoutRules)body.apply_layout_rules=true;
  var r=await fetchWithTimeout(PROXY,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)},30000);
  var txt=await r.text();
  var parsed={};try{parsed=JSON.parse(txt);}catch(e){}
  equipmentSaveError(parsed,r.status,txt);
  return parsed;
}
/* Zoho Asset_Category layout activation — required for EVERY category (see CAPSTONE_DEVELOPMENT_RULES.md). */
async function checkZohoProxyDeploy(silent){
  var statusEl=el("zoho-proxy-status");
  if(statusEl&&!silent)statusEl.textContent="Checking Zoho proxy...";
  try{
    await refreshZohoToken();
    var r=await fetchWithTimeout(PROXY,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"ping_proxy",token:A.zohoToken})},15000);
    var txt=await r.text();
    var d={};try{d=JSON.parse(txt);}catch(e){}
    if(!r.ok||!d.ok){
      var failMsg="Zoho proxy check failed ("+(r.status||"?")+"). In Netlify: Deploys → Trigger deploy → Clear cache and deploy site. Then Settings → Check Zoho Proxy.";
      if(statusEl)statusEl.textContent=failMsg;
      return{ok:false,message:failMsg};
    }
    var build=parseInt(d.proxy_build,10)||0;
    if(build<MIN_ZOHO_PROXY_BUILD||!d.layout_activation){
      var oldMsg="Zoho proxy build "+(d.proxy_build||"?")+" is too old — CapStone v"+FP_VERSION+" needs build "+MIN_ZOHO_PROXY_BUILD+"+. Netlify: Deploys → Clear cache and deploy site.";
      if(statusEl)statusEl.textContent=oldMsg;
      return{ok:false,message:oldMsg,proxy_build:build};
    }
    var okMsg="Zoho proxy OK (build "+d.proxy_build+") — category layout activation ready.";
    if(statusEl)statusEl.textContent=okMsg;
    return{ok:true,message:okMsg,proxy_build:build};
  }catch(e){
    var errMsg="Zoho proxy unreachable: "+(e.message||e);
    if(statusEl)statusEl.textContent=errMsg;
    return{ok:false,message:errMsg};
  }
}
async function postEquipmentCategoryLayoutActivation(equipmentId,category,extension){
  if(!equipmentId||!category)return;
  category=normalizeAssetCategoryKey(category);
  var ext=extension&&Object.keys(extension).length?Object.assign({},extension):{};
  delete ext.Subform_1;
  assetStatus("Applying asset category layout in Zoho (first pass)...",false);
  var body={
    action:"activate_equipment_category_layout",
    token:A.zohoToken,
    equipment_id:equipmentId,
    category:category,
    extension:ext,
    category_values:assetPicklistValues("Asset_Category")
  };
  var r=await fetchWithTimeout(PROXY,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)},120000);
  var txt=await r.text();
  var parsed={};try{parsed=JSON.parse(txt);}catch(e){}
  if(!r.ok||parsed.ok===false){
    var detail=parsed&&parsed.error?parsed.error:String(txt||"").substring(0,220);
    if(/Unknown action/i.test(detail))detail="Netlify proxy missing layout support — deploy with Clear cache and deploy site, then Settings → Check Zoho Proxy.";
    throw new Error("Zoho category layout failed: "+detail);
  }
  assetStatus("Confirming category layout in Zoho (reopen + reselect pass)...",false);
  await waitMs(2500);
  var body2=Object.assign({},body,{reopen_confirm:true});
  var r2=await fetchWithTimeout(PROXY,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body2)},120000);
  var txt2=await r2.text();
  var parsed2={};try{parsed2=JSON.parse(txt2);}catch(e){}
  if(!r2.ok||parsed2.ok===false){
    var detail2=parsed2&&parsed2.error?parsed2.error:String(txt2||"").substring(0,220);
    throw new Error("Zoho category layout confirm failed: "+detail2);
  }
  return parsed2;
}
function assetPayloadWithoutCategory(payload){
  var out=Object.assign({},payload||{});
  delete out.Asset_Category;
  return out;
}
function assetPayloadWithoutCategoryExtensions(payload,category){
  var out=assetPayloadWithoutCategory(payload);
  categoryLayoutExtensionApis(category).forEach(function(api){delete out[api];});
  return out;
}
function assetPayload(opts){
  opts=opts||{};
  var includeBlank=!!opts.includeBlank;
  var payload={
    Asset_Category:normalizeAssetCategoryKey(assetInput("asset-category")),
    Account:{id:assetSaveAccountId()},
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
  function setOptional(apiName,value){
    if(value==null||value===""){if(includeBlank)payload[apiName]="";return;}
    payload[apiName]=value;
  }
  setOptional("Asset_Series",assetInput("asset-series"));
  setOptional("If_Asset_Brand_Other_explain",assetInput("asset-brand-other"));
  setOptional("If_Asset_Type_other_explain",assetInput("asset-type-other"));
  setOptional("If_Asset_Series_is_Other_Function_explain",assetInput("asset-series-other"));
  setOptional("Nameplate_Additional_Info",assetInput("asset-nameplate-additional"));
  var desc=assetInput("asset-description");
  var repl=replacementNote();
  if(repl)desc=desc?(desc+"\n\n"+repl):repl;
  setOptional("Description_Instructions",desc);
  setOptional("Location_Coordinates",A.location?(A.location.lat.toFixed(6)+", "+A.location.lng.toFixed(6)):"");
  var dyn=mapDynamicValuesToZohoPayload(collectDynamicAssetPayload(includeBlank));
  Object.keys(dyn).forEach(function(k){setOptional(k,dyn[k]);});
  var subRows=assetSubformPayload();
  if(subRows.length)payload.Subform_1=subRows;
  return payload;
}
async function findExistingEquipmentBySerial(){
  if(A.asset.currentAssetId)return A.asset.currentAssetId;
  var serial=assetInput("asset-serial");
  var acctId=assetSaveAccountId();
  if(!serial||!acctId)return null;
  var r=await fetchWithTimeout(PROXY,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"find_equipment",token:A.zohoToken,account_id:acctId,serial_number:serial})},30000);
  if(!r.ok)return null;
  var d={};try{d=await r.json();}catch(e){}
  if(d&&d.equipment_id)return d;
  return null;
}
async function saveEquipmentRecord(){
  await loadEquipmentConfig();
  await prepareAssetDynamicFieldsForSave();
  syncSubformRowsFromDom();
  var includeBlank=!!A.asset.currentAssetId;
  var fullPayload=assetPayload({includeBlank:includeBlank});
  if(!fullPayload.Account||!fullPayload.Account.id)throw new Error("Account is required — pick a deal or tap Account only — pick account");
  var existing=A.asset.currentAssetId?{equipment_id:A.asset.currentAssetId}:await findExistingEquipmentBySerial();
  if(existing&&existing.equipment_id&&!A.asset.currentAssetId){
    var label=(existing.equipment&&existing.equipment.Name)||assetInput("asset-name")||"this asset";
    if(!confirm("An asset with this serial number already exists for this account ("+label+"). Update the existing asset instead of creating a duplicate?"))throw new Error("Asset save cancelled to avoid duplicate serial number");
    A.asset.currentAssetId=existing.equipment_id;
    includeBlank=true;
    fullPayload=assetPayload({includeBlank:true});
  }
  var split=splitAssetPayloadForCategoryLayout(fullPayload);
  var hasExtension=Object.keys(split.extension).length>0;
  var coreSavePayload=split.category?assetPayloadWithoutCategoryExtensions(split.core,split.category):assetPayloadWithoutCategory(split.core);
  var equipmentId=A.asset.currentAssetId;
  var isCreate=!equipmentId;
  if(isCreate){
    assetStatus("Creating equipment asset in Zoho...",false);
    var created;
    try{
      created=await postEquipmentToZoho("create_equipment",null,coreSavePayload);
    }catch(createErr){
      if(!split.category||!/mandatory|required/i.test(String(createErr&&createErr.message||createErr)))throw createErr;
      created=await postEquipmentToZoho("create_equipment",null,split.core);
    }
    equipmentId=equipmentIdFromResponse(created);
    if(!equipmentId)throw new Error("Zoho did not return an equipment ID");
    A.asset.currentAssetId=equipmentId;
    if(split.category){
      var proxyCheck=await checkZohoProxyDeploy(true);
      if(!proxyCheck.ok)throw new Error(proxyCheck.message);
      await postEquipmentCategoryLayoutActivation(equipmentId,split.category,split.extension);
    }else if(hasExtension){
      assetStatus("Saving category-specific fields in Zoho...",false);
      await postEquipmentToZoho("update_equipment",equipmentId,split.extension);
    }
  }else{
    assetStatus("Updating existing equipment asset in Zoho...",false);
    await postEquipmentToZoho("update_equipment",equipmentId,coreSavePayload);
    if(split.category){
      var proxyCheck=await checkZohoProxyDeploy(true);
      if(!proxyCheck.ok)throw new Error(proxyCheck.message);
      await postEquipmentCategoryLayoutActivation(equipmentId,split.category,split.extension);
    }else if(hasExtension){
      assetStatus("Saving category-specific fields in Zoho...",false);
      await postEquipmentToZoho("update_equipment",equipmentId,split.extension);
    }
  }
  var subRowsFinal=assetSubformPayload();
  if(subRowsFinal.length){
    assetStatus("Saving Input/Output subform rows in Zoho...",false);
    await postEquipmentToZoho("update_equipment",equipmentId,{Subform_1:subRowsFinal});
  }
  return equipmentId;
}
function assetDealDescription(){
  var parts=[];
  if(assetInput("asset-name"))parts.push(assetInput("asset-name"));
  var catFn=[assetInput("asset-category"),assetInput("asset-function")].filter(Boolean).join(" / ");
  if(catFn)parts.push(catFn);
  var brandType=[assetInput("asset-brand"),assetInput("asset-type")].filter(Boolean).join(" ");
  if(brandType)parts.push(brandType);
  if(assetInput("asset-series"))parts.push(assetInput("asset-series"));
  if(assetInput("asset-model"))parts.push("Model "+assetInput("asset-model"));
  if(assetInput("asset-serial"))parts.push("Serial "+assetInput("asset-serial"));
  var loc=[assetInput("asset-building"),assetInput("asset-designator")].filter(Boolean).join(" / ");
  if(loc)parts.push(loc);
  if(A.asset.replacementMode&&A.asset.loadedOriginal){
    var oldBits=[];
    if(A.asset.loadedOriginal.brand)oldBits.push(A.asset.loadedOriginal.brand);
    if(A.asset.loadedOriginal.type)oldBits.push(A.asset.loadedOriginal.type);
    if(A.asset.loadedOriginal.model)oldBits.push("Model "+A.asset.loadedOriginal.model);
    if(A.asset.loadedOriginal.serial)oldBits.push("Serial "+A.asset.loadedOriginal.serial);
    if(oldBits.length)parts.push("Replacement from "+oldBits.join(" "));
  }
  if(A.technician)parts.push("Tech: "+A.technician);
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
  var registry=assetFieldRegistry();
  syncDynamicFieldValuesFromDom();
  Object.keys(registry).forEach(function(api){
    var v=A.asset.dynamicValues&&A.asset.dynamicValues[api];
    if(Array.isArray(v)?v.length:v){
      var label=registry[api].widget==="lookup"?engineeringUnitLookupLabel(v):(Array.isArray(v)?v.join(", "):v);
      lines.push("- "+registry[api].label+": "+label);
    }
  });
  if(A.asset.subformRows&&A.asset.subformRows.length){
    lines.push("- Input/Output setups: "+A.asset.subformRows.length+" row(s)");
  }
  var nameplate=assetInput("asset-nameplate-additional");if(nameplate){lines.push("");lines.push("Nameplate Additional Info:");lines.push(nameplate);}
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
function zohoNoteTitleLimit(s){
  s=String(s||"").replace(/\s+/g," ").trim();
  return s.length>120?s.slice(0,117)+"...":s;
}
async function saveDealAssetUpdateNote(equipmentId){
  if(!A.sel||!A.sel.id||!equipmentId)return;
  var assetLabel=(assetInput("asset-name")||assetInput("asset-model")||assetInput("asset-serial")||"Asset");
  var title=zohoNoteTitleLimit("CapStone Asset Update — "+assetLabel+" — "+new Date().toLocaleDateString());
  var content=assetUpdateNoteContent()+"\n\nZoho Equipment ID: "+equipmentId;
  var r=await fetchWithTimeout(PROXY,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"save_note",token:A.zohoToken,deal_id:A.sel.id,note_title:title,note_content:content})},30000);
  if(!r.ok){var txt=await r.text();throw new Error("Deal asset note "+r.status+": "+txt.substring(0,120));}
}
function enqueueDealAssetLink(equipmentId,error){
  if(!A.sel||!A.sel.id||!equipmentId)return;
  enqueuePendingUpload({type:"deal_asset_link",dealId:A.sel.id,equipmentId:equipmentId,description:assetDealDescription(),notes:assetDealNotes(),assetLabel:"Deal asset link",filename:assetInput("asset-name")||equipmentId,error:error||""});
}
function enqueueEquipmentNote(equipmentId,error){
  if(!equipmentId)return;
  enqueuePendingUpload({type:"equipment_note",equipmentId:equipmentId,noteTitle:"CapStone Asset Update — "+new Date().toLocaleDateString(),noteContent:assetUpdateNoteContent(),assetLabel:"Equipment asset note",filename:assetInput("asset-name")||equipmentId,error:error||""});
}
function enqueueDealAssetNote(equipmentId,error){
  if(!A.sel||!A.sel.id||!equipmentId)return;
  var assetLabel=(assetInput("asset-name")||assetInput("asset-model")||assetInput("asset-serial")||"Asset");
  enqueuePendingUpload({type:"deal_asset_note",dealId:A.sel.id,equipmentId:equipmentId,noteTitle:zohoNoteTitleLimit("CapStone Asset Update — "+assetLabel+" — "+new Date().toLocaleDateString()),noteContent:assetUpdateNoteContent()+"\n\nZoho Equipment ID: "+equipmentId,assetLabel:"Deal asset note",filename:assetLabel,error:error||""});
}
async function uploadPendingDealAssetLink(item){await refreshZohoToken();var r=await fetchWithTimeout(PROXY,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"link_equipment_to_deal",token:A.zohoToken,deal_id:item.dealId,equipment_id:item.equipmentId,description:item.description||"",notes:item.notes||""})},30000);if(!r.ok){var txt=await r.text();throw new Error("Deal asset link "+r.status+": "+txt.substring(0,120));}}
async function uploadPendingEquipmentNote(item){await refreshZohoToken();var r=await fetchWithTimeout(PROXY,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"save_equipment_note",token:A.zohoToken,equipment_id:item.equipmentId,note_title:item.noteTitle,note_content:item.noteContent})},30000);if(!r.ok){var txt=await r.text();throw new Error("Equipment note "+r.status+": "+txt.substring(0,120));}}
async function uploadPendingDealAssetNote(item){await refreshZohoToken();var r=await fetchWithTimeout(PROXY,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"save_note",token:A.zohoToken,deal_id:item.dealId,note_title:item.noteTitle,note_content:item.noteContent})},30000);if(!r.ok){var txt=await r.text();throw new Error("Deal asset note "+r.status+": "+txt.substring(0,120));}}
function enqueueReportNoteSave(payload,error){
  if(!payload||!payload.deal_id||!payload.note_content)return;
  var items=getPendingUploads();
  var key=(payload.deal_id||"")+":"+(payload.note_id||"")+":"+(payload.note_title||"");
  var exists=items.some(function(i){return i.type==="report_note"&&i.key===key;});
  if(exists)return;
  enqueuePendingUpload({type:"report_note",key:key,dealId:payload.deal_id,noteId:payload.note_id||null,noteTitle:payload.note_title,noteContent:payload.note_content,action:payload.action,assetLabel:"Zoho report note",filename:payload.note_title||"report note",error:error||""});
}
async function uploadPendingReportNote(item){
  await refreshZohoToken();
  var payload={action:item.noteId?"update_note":"save_note",token:A.zohoToken,deal_id:item.dealId,note_id:item.noteId||null,note_title:item.noteTitle,note_content:item.noteContent};
  var r=await fetchWithTimeout(PROXY,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)},30000);
  if(!r.ok){var txt=await r.text();throw new Error("Zoho note "+r.status+": "+txt.substring(0,120));}
}
async function buildReportPdfPayload(){
  if(!A.report)return null;
  var pdfPhotos=A.reportPhotos&&A.reportPhotos.length>0?A.reportPhotos:A.photos;
  if(A.inclPhotos&&pdfPhotos.length>0){await Promise.all(pdfPhotos.map(function(p){return new Promise(function(res){var img=new Image();img.onload=function(){p._rw=img.naturalWidth;p._rh=img.naturalHeight;res();};img.onerror=res;img.src=p.display;});}));}
  var doc=buildPDF(A.report,A.sel,A.inclPhotos?pdfPhotos:[],A.location,currentTechnicianName());
  var b64=(doc.output("datauristring").split(",")[1]||"").trim();
  var acct=(A.sel?A.sel.Account_Name:"report").replace(/[^a-z0-9]/gi,"-").toLowerCase();
  var fname="capstone-report-"+acct+"-"+new Date().toISOString().slice(0,10)+".pdf";
  return b64?{b64:b64,filename:fname,dealId:A.sel&&A.sel.id,folderId:null}:null;
}
function enqueuePendingUpload(item){var items=getPendingUploads();item.id=item.id||("pu"+Date.now()+Math.random());item.created=item.created||new Date().toISOString();item.attempts=item.attempts||0;items.push(item);savePendingUploads(items);}
function enqueueReportPdfUpload(type,payload,error){
  if(!payload||!payload.b64)return;
  var items=getPendingUploads();
  var exists=items.some(function(i){return i.type===type&&i.dealId===payload.dealId&&i.filename===payload.filename;});
  if(exists)return;
  enqueuePendingUpload({type:type,dealId:payload.dealId,folderId:payload.folderId||null,filename:payload.filename,fileB64:payload.b64,mimeType:"application/pdf",assetLabel:type==="deal_pdf"?"Deal PDF attachment":"WorkDrive report PDF",error:error||""});
}
async function uploadPendingDealPdf(item){await refreshZohoToken();var r=await fetchWithTimeout(PROXY,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"upload_deal_attachment",token:A.zohoToken,deal_id:item.dealId,filename:item.filename,file_b64:item.fileB64,mime_type:item.mimeType||"application/pdf"})},90000);if(!r.ok){var txt=await r.text();throw new Error("Deal PDF "+r.status+": "+txt.substring(0,120));}}
async function uploadPendingWorkDrivePdf(item){await refreshZohoToken();var folderId=item.folderId||WORKDRIVE_FOLDER;var link=await uploadToWorkDrive(item.fileB64,item.filename,item.mimeType||"application/pdf",folderId,90000);if(link)A.workdrivePdfUrl=link;}
function getPendingUploads(){try{return JSON.parse(localStorage.getItem("fp_pending_uploads")||"[]");}catch(e){return[];}}
function savePendingUploads(items){try{localStorage.setItem("fp_pending_uploads",JSON.stringify(items));}catch(e){showToast("Could not save pending sync item",5000);}renderPendingUploads();if(typeof renderHistory==="function")renderHistory();if(items&&items.length)schedulePendingUploadRetry("queue_saved",5000);}
function pendingUploadLabel(item){
  if(item.type==="capture_photo")return "Capture photo — "+(item.filename||"photo");
  if(item.type==="picklist_request")return "Picklist request — "+((item.payload&&item.payload.fieldLabel)||"field")+": "+((item.payload&&item.payload.proposedValue)||item.filename||"value");
  return (item.assetLabel||"Pending sync")+" — "+(item.filename||"file");
}
function enqueueCapturePhotoUpload(photo,idx,folderId,error){
  if(!photo||!A.sel)return;
  var items=getPendingUploads();
  if(items.some(function(i){return i.type==="capture_photo"&&i.photoId===photo.id;}))return;
  enqueuePendingUpload({type:"capture_photo",dealId:A.sel.id,photoId:photo.id,filename:workdrivePhotoFileName(photo,idx),imageData:photo.display,photoIndex:idx,folderId:folderId||WORKDRIVE_FOLDER,historyId:A.currentHistoryId||null,assetLabel:"Capture photo",error:error||""});
}
async function uploadPendingCapturePhoto(item){
  if(!item||!item.imageData||!item.dealId)throw new Error("Pending capture photo missing data");
  var b64=await compressPhoto(item.imageData,1200,0.8);
  if(!b64)throw new Error("Could not compress pending photo");
  await refreshZohoToken();
  await uploadToWorkDrive(b64,item.filename||"photo.jpg","image/jpeg",item.folderId||WORKDRIVE_FOLDER);
  [A.photos,A.reportPhotos].forEach(function(arr){
    if(!arr)return;
    var p=arr.find(function(x){return x.id===item.photoId;});
    if(p){p.syncStatus="uploaded";p.syncMessage="";}
  });
  renderPhotoCards();scheduleCaptureDraftSave();
}
function enqueueAssetPhotoUpload(equipmentId,photo,filename,error){
  var items=getPendingUploads();
  var fingerprint=photo&&photo.fingerprint||"";
  var existing=items.some(function(i){return i.type==="asset_photo"&&i.equipmentId===equipmentId&&i.fingerprint===fingerprint;});
  if(existing)return;
  items.push({id:"pu"+Date.now()+Math.random(),type:"asset_photo",equipmentId:equipmentId,filename:filename,imageData:photo&&photo.data||"",fingerprint:fingerprint,assetLabel:assetInput("asset-name")||equipmentId,error:error||"",created:new Date().toISOString(),attempts:0});
  savePendingUploads(items);
}
async function uploadPendingAssetPhoto(item){
  if(!item||!item.imageData||!item.equipmentId)throw new Error("Pending sync is missing data");
  var b64=await compressPhoto(item.imageData,1200,0.8);
  if(!b64)throw new Error("Could not compress pending photo");
  await refreshZohoToken();
  var r=await fetchWithTimeout(PROXY,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"upload_equipment_photo",token:A.zohoToken,equipment_id:item.equipmentId,filename:item.filename||"asset-photo.jpg",image_b64:b64})},45000);
  if(!r.ok){var txt=await r.text();throw new Error("Photo upload "+r.status+": "+txt.substring(0,120));}
}
async function retryPendingUploads(opts){
  opts=opts||{};
  if(A.pendingRetrying)return;
  var items=getPendingUploads();
  if(!items.length){if(!opts.auto)showToast("No pending sync items",2500);return;}
  A.pendingRetrying=true;
  if(!opts.auto)showToast("Retrying "+items.length+" pending sync item(s)...",3000);
  var remaining=[];
  for(var i=0;i<items.length;i++){
    var item=items[i];
    try{if(item.type==="asset_photo")await uploadPendingAssetPhoto(item);else if(item.type==="capture_photo")await uploadPendingCapturePhoto(item);else if(item.type==="deal_pdf")await uploadPendingDealPdf(item);else if(item.type==="workdrive_pdf")await uploadPendingWorkDrivePdf(item);else if(item.type==="report_note")await uploadPendingReportNote(item);else if(item.type==="deal_asset_link")await uploadPendingDealAssetLink(item);else if(item.type==="equipment_note")await uploadPendingEquipmentNote(item);else if(item.type==="deal_asset_note")await uploadPendingDealAssetNote(item);else if(item.type==="picklist_request")await uploadPendingPicklistRequest(item);else throw new Error("Unknown pending upload type");}
    catch(e){item.error=e.message;item.attempts=(item.attempts||0)+1;item.lastAttempt=new Date().toISOString();remaining.push(item);}
  }
  A.pendingRetrying=false;
  savePendingUploads(remaining);
  if(typeof renderAssetPicklistRequestPanel==="function")renderAssetPicklistRequestPanel();
  if(!opts.auto||items.length!==remaining.length)showToast(remaining.length?remaining.length+" sync item(s) still pending":"All pending sync items complete",5000);
}
function schedulePendingUploadRetry(reason,delayMs){
  if(!getPendingUploads().length||A.pendingRetrying)return;
  if(A.pendingRetryTimer)clearTimeout(A.pendingRetryTimer);
  A.pendingRetryTimer=setTimeout(function(){A.pendingRetryTimer=null;autoRetryPendingUploads(reason);},delayMs||15000);
}
function autoRetryPendingUploads(reason){
  var now=Date.now();
  if(A.pendingRetrying||!getPendingUploads().length)return;
  if(now-A.lastPendingAutoRetry<30000){schedulePendingUploadRetry(reason,30000);return;}
  A.lastPendingAutoRetry=now;
  retryPendingUploads({auto:true,reason:reason});
}
function setupPendingUploadAutoRetry(){
  schedulePendingUploadRetry("startup",12000);
  try{window.addEventListener("online",function(){schedulePendingUploadRetry("online",2000);});}catch(e){}
  try{document.addEventListener("visibilitychange",function(){if(!document.hidden)schedulePendingUploadRetry("visible",3000);});}catch(e){}
  try{setInterval(function(){schedulePendingUploadRetry("interval",0);},120000);}catch(e){}
}
function updatePendingTabBadge(){
  var total=getPendingUploads().length+getPendingAi().length;
  var tab=el("pending-sync-tab"),cnt=el("pending-sync-count");
  if(cnt)cnt.textContent=total;
  if(tab)tab.style.display=total?"block":"none";
}
function renderPendingBadge(items){
  updatePendingTabBadge();
}
function renderPendingUploads(){
  var box=el("pending-uploads-list"),count=el("pending-uploads-count");if(!box&&!count)return;
  var items=getPendingUploads();
  renderPendingBadge(items);
  if(count)count.textContent=items.length+" pending";
  if(typeof renderAssetSaveChecklist==="function")renderAssetSaveChecklist();
  if(box)box.innerHTML=items.length?items.map(function(item){return"<div style='font-size:12px;color:#2d6b60;margin-bottom:5px'>"+esc(pendingUploadLabel(item))+"<br><span style='color:var(--dim)'>Attempts: "+(item.attempts||0)+(item.error?" — "+esc(item.error):"")+"</span></div>";}).join(""):"<div style='font-size:12px;color:var(--dim)'>No pending sync items.</div>";
}
function clearPendingUploads(){if(!confirm("Clear all pending sync items?"))return;savePendingUploads([]);showToast("Pending sync cleared",2500);}
function shouldQueueAiError(err){
  var msg=String(err&&err.message||err||"").toLowerCase();
  if(err&&err.name==="AbortError")return true;
  if(msg.indexOf("failed to fetch")>=0||msg.indexOf("network")>=0||msg.indexOf("offline")>=0||msg.indexOf("timeout")>=0||msg.indexOf("aborted")>=0)return true;
  if(/^api 5/.test(msg)||msg.indexOf("api 429")>=0)return true;
  return false;
}
function fieldAiLabel(target){
  if(target==="voice")return "Voice notes";
  if(target.indexOf("photo:")===0)return "Photo description";
  if(target.indexOf("asset:")===0){
    var id=target.slice(6);
    if(id==="asset-nameplate-additional")return "Nameplate additional info";
    if(id==="asset-description")return "Asset description";
    if(id==="asset-deal-notes")return "Deal asset notes";
    if(id==="asset-building")return "Building";
    if(id==="asset-designator")return "Designator";
    return "Asset field";
  }
  var idx=SEC_IDS.indexOf(target);
  if(idx>=0)return SEC_LABELS[idx];
  if(target==="report")return "Generate AI Report";
  if(target==="asset")return "Asset photo extraction";
  return target;
}
function getVoiceNotesValue(){
  var t2=el("tx2"),t=el("tx");
  if(t2&&t2.offsetParent!==null)return t2.value||"";
  return t? t.value||"":"";
}
function setVoiceNotesValue(v){
  var t=el("tx"),t2=el("tx2");
  if(t)t.value=v;
  if(t2)t2.value=v;
  if(typeof checkGen==="function")checkGen();
  if(typeof scheduleCaptureDraftSave==="function")scheduleCaptureDraftSave();
}
function getFieldTargetValue(target){
  if(target==="voice")return getVoiceNotesValue();
  if(target.indexOf("photo:")===0){
    var pid=target.slice(6);
    var p=A.photos.find(function(x){return x.id===pid;});
    return p?p.desc||"":"";
  }
  if(target.indexOf("asset:")===0){var node=el(target.slice(6));return node?node.value||"" :"";}
  var node=el(target);
  return node?node.value||"":"";
}
function setFieldTargetValue(target,val){
  if(target==="voice"){setVoiceNotesValue(val);return;}
  if(target.indexOf("photo:")===0){
    var pid=target.slice(6);
    var p=A.photos.find(function(x){return x.id===pid;});
    if(p){p.desc=val;if(typeof scheduleCaptureDraftSave==="function")scheduleCaptureDraftSave();if(typeof renderPhotoCards==="function")renderPhotoCards();}
    return;
  }
  if(target.indexOf("asset:")===0){var an=el(target.slice(6));if(an){an.value=val;if(typeof scheduleAssetDraftSave==="function")scheduleAssetDraftSave();if(typeof updateAssetSaveState==="function")updateAssetSaveState();}return;}
  var node=el(target);
  if(node){node.value=val;if(typeof checkGen==="function")checkGen();if(typeof scheduleCaptureDraftSave==="function")scheduleCaptureDraftSave();}
}
function fieldAiStatusNode(target){
  if(target.indexOf("photo:")===0)return el("field-ai-status-"+target.slice(6));
  return el("field-ai-status-"+fieldAiTargetKey(target));
}
function setFieldAiUi(target,state,msg){
  var st=fieldAiStatusNode(target);
  if(!st)return;
  var labels={idle:"",processing:"AI working...",queued:"Pending AI — will retry when online",done:"AI updated",failed:"AI failed"};
  st.className="field-ai-status"+(state&&state!=="idle"?" field-ai-"+state:"");
  st.textContent=msg||(labels[state]||"");
  var btn=document.querySelector('[data-field-ai-target="'+target+'"]');
  if(btn){
    btn.disabled=state==="processing";
    btn.classList.toggle("field-ai-spin",state==="processing");
  }
}
function restoreFieldAiUiFromQueue(){
  getPendingAi().forEach(function(item){
    if(item.type==="field_polish"&&item.target)setFieldAiUi(item.target,"queued");
  });
}
function getPendingAi(){try{return JSON.parse(localStorage.getItem("fp_pending_ai")||"[]");}catch(e){return[];}}
function savePendingAi(items){
  try{localStorage.setItem("fp_pending_ai",JSON.stringify(items));}catch(e){showToast("Could not save pending AI item",5000);}
  renderPendingAi();
  if(items&&items.length)schedulePendingAiRetry("queue_saved",5000);
}
function pendingAiLabel(item){
  if(item.type==="field_polish")return "Field AI — "+(item.label||fieldAiLabel(item.target||""));
  if(item.type==="report_generate")return "Generate AI Report";
  if(item.type==="asset_extract")return "Asset photo extraction";
  if(item.type==="asset_extract_sensor")return "Sensor photo extraction";
  return item.label||"Pending AI";
}
function removePendingAiByTarget(target){
  savePendingAi(getPendingAi().filter(function(i){return!(i.target===target&&i.type==="field_polish");}));
}
function removePendingAiByTypeTarget(type,target){
  savePendingAi(getPendingAi().filter(function(i){return!(i.type===type&&i.target===target);}));
}
function fieldAiTargetKey(target){return String(target||"").replace(/:/g,"-");}
function removePendingAiById(id){
  savePendingAi(getPendingAi().filter(function(i){return i.id!==id;}));
}
function enqueuePendingAi(item){
  var items=getPendingAi();
  item.id=item.id||("pai"+Date.now()+Math.random());
  item.created=item.created||new Date().toISOString();
  item.attempts=item.attempts||0;
  item.label=item.label||fieldAiLabel(item.target||"");
  var dupIdx=-1;
  for(var i=0;i<items.length;i++){
    if(items[i].type===item.type&&items[i].target===item.target){dupIdx=i;break;}
  }
  if(dupIdx>=0){item.id=items[dupIdx].id;items[dupIdx]=item;}else items.push(item);
  savePendingAi(items);
}
async function requestFieldPolish(rawText,label,target){
  if(!API_KEY)throw new Error("Add your Anthropic API key in Settings first.");
  var context="water/wastewater treatment field service documentation";
  if(target.indexOf("asset:")===0)context="equipment asset record for Zoho CRM";
  if(target.indexOf("photo:")===0)context="photo description for a field service report";
  var prompt="Convert this rough voice-dictated note into clear, professional "+context+" language. Keep every factual detail from the original. Do not invent equipment, readings, or actions. Return only the polished text — no headings, labels, or markdown.\n\nField: "+label+"\n\nRaw note:\n"+rawText;
  var data=await callAPI({content:[{type:"text",text:prompt}],maxTok:500,ms:25000});
  var out=getText(data).trim();
  if(!out)throw new Error("AI returned empty text");
  return out;
}
async function runFieldPolishAi(targetId,opts){
  opts=opts||{};
  var raw=getFieldTargetValue(targetId).trim();
  if(!raw){if(!opts.silent)showToast("Dictate or type text first, then tap → AI",3000);return;}
  if(!API_KEY&&!opts.fromQueue){enterKey();if(!opts.silent)showToast("Add API key, then tap → AI again",3000);return;}
  setFieldAiUi(targetId,"processing");
  try{
    var polished=await requestFieldPolish(raw,fieldAiLabel(targetId),targetId);
    setFieldTargetValue(targetId,polished);
    removePendingAiByTarget(targetId);
    setFieldAiUi(targetId,"done");
    if(!opts.silent)showToast("Field updated with AI",2500);
    setTimeout(function(){setFieldAiUi(targetId,"idle");},4000);
    return polished;
  }catch(e){
    if(shouldQueueAiError(e)){
      enqueuePendingAi({type:"field_polish",target:targetId,rawText:raw,label:fieldAiLabel(targetId),error:e.message||String(e)});
      setFieldAiUi(targetId,"queued");
      if(!opts.silent)showToast("AI queued — will retry when connection improves",4500);
    }else{
      setFieldAiUi(targetId,"failed",e.message||String(e));
      if(!opts.silent)showToast("AI failed: "+(e.message||e),6000);
    }
    throw e;
  }
}
async function retryQueuedReportGenerate(item){
  if(item.historyId&&A.currentHistoryId!==item.historyId){
    var h=getHistory(),r=null;
    for(var hi=0;hi<h.length;hi++){if(h[hi].id===item.historyId){r=h[hi];break;}}
    if(r){
      A.reportPhotos=r.photoData||[];
      A.photos=(r.photoData||[]).map(function(p){return{id:p.id,display:p.display,label:p.label||"",desc:p.desc,time:p.time,w:p.w||0,h:p.h||0,aiDesc:p.aiDesc||"",synthesis:p.synthesis||"",syncStatus:p.syncStatus||"not_synced",syncMessage:p.syncMessage||"",savedToPhone:!!p.savedToPhone,phoneFileName:p.phoneFileName||"",phoneSource:p.phoneSource||""};});
      A.report=r.report||"";
      setReportTechnician(r.technician||"");
      A.dealPdfAttached=!!r.dealPdfAttached;A.currentHistoryId=r.id;A.zohoNoteId=r.zohoNoteId||null;A.sel=dealFromRecord(r);A.location=restoreLocationFromRecord(r);
      updateDealUI();updateLocationUI();
      if(r.sections)SEC_IDS.forEach(function(id){var e=el(id);if(e&&r.sections[id])e.value=r.sections[id];});
      if(r.voiceNotes){var ta=el("tx");if(ta)ta.value=r.voiceNotes;if(el("tx2"))el("tx2").value=r.voiceNotes;}
      renderPhotoCards();checkGen();
    }
  }
  await generate();
}
async function retryQueuedAssetExtract(item){
  if(!item.photos||!item.photos.length)throw new Error("Queued extraction missing photos");
  if(!API_KEY)throw new Error("API key required");
  var isSensor=item.type==="asset_extract_sensor"||item.extractKind==="sensor";
  assetStatus(isSensor?"Retrying sensor extraction...":"Retrying asset extraction...",false);
  var content=[];
  item.photos.forEach(function(b64){if(b64)content.push({type:"image",source:{type:"base64",media_type:"image/jpeg",data:b64}});});
  content.push({type:"text",text:isSensor?ASSET_EXTRACT_SENSOR_PROMPT:ASSET_EXTRACT_PROMPT});
  var data=await callAPI({content:content,maxTok:isSensor?500:750,ms:45000});
  if(isSensor){
    var count=applySensorExtraction(await parseAssetSensorJsonWithRepair(getText(data)));
    removePendingAiByTypeTarget("asset_extract_sensor","asset");
    if(!count)throw new Error("No sensor model, serial, cal factor, or notes found on sensor label photo(s)");
  }else{
    applyAssetExtraction(await parseAssetJsonWithRepair(getText(data)));
    removePendingAiByTypeTarget("asset_extract","asset");
  }
  assetStatus("AI extraction complete. Review all required fields before saving.",false);
}
async function processPendingAiItem(item){
  if(item.type==="field_polish"){
    var raw=(getFieldTargetValue(item.target)||item.rawText||"").trim();
    if(!raw&&item.rawText)raw=item.rawText;
    if(!raw)throw new Error("Field text missing");
    item.rawText=raw;
    var polished=await requestFieldPolish(raw,item.label||fieldAiLabel(item.target),item.target);
    setFieldTargetValue(item.target,polished);
    setFieldAiUi(item.target,"done");
    setTimeout(function(){setFieldAiUi(item.target,"idle");},4000);
    return;
  }
  if(item.type==="report_generate"){await retryQueuedReportGenerate(item);return;}
  if(item.type==="asset_extract"||item.type==="asset_extract_sensor"){await retryQueuedAssetExtract(item);return;}
  throw new Error("Unknown pending AI type");
}
async function retryPendingAi(opts){
  opts=opts||{};
  if(A.pendingAiRetrying)return;
  var items=getPendingAi();
  if(!items.length){if(!opts.auto)showToast("No pending AI items",2500);return;}
  if(!API_KEY){if(!opts.auto)showToast("Add API key before retrying AI",4000);return;}
  A.pendingAiRetrying=true;
  if(!opts.auto)showToast("Retrying "+items.length+" pending AI item(s)...",3000);
  var remaining=[];
  for(var i=0;i<items.length;i++){
    var item=items[i];
    try{
      if(item.type==="field_polish")setFieldAiUi(item.target,"processing");
      await processPendingAiItem(item);
    }catch(e){
      item.error=e.message||String(e);
      item.attempts=(item.attempts||0)+1;
      item.lastAttempt=new Date().toISOString();
      remaining.push(item);
      if(item.type==="field_polish"&&item.target)setFieldAiUi(item.target,"queued",item.error);
    }
  }
  A.pendingAiRetrying=false;
  savePendingAi(remaining);
  if(!opts.auto||items.length!==remaining.length)showToast(remaining.length?remaining.length+" AI item(s) still pending":"All pending AI items complete",5000);
}
function schedulePendingAiRetry(reason,delayMs){
  if(!getPendingAi().length||A.pendingAiRetrying)return;
  if(A.pendingAiRetryTimer)clearTimeout(A.pendingAiRetryTimer);
  A.pendingAiRetryTimer=setTimeout(function(){A.pendingAiRetryTimer=null;autoRetryPendingAi(reason);},delayMs||15000);
}
function autoRetryPendingAi(reason){
  var now=Date.now();
  if(A.pendingAiRetrying||!getPendingAi().length||!API_KEY)return;
  if(now-A.lastPendingAiAutoRetry<30000){schedulePendingAiRetry(reason,30000);return;}
  A.lastPendingAiAutoRetry=now;
  retryPendingAi({auto:true,reason:reason});
}
function setupPendingAiAutoRetry(){
  schedulePendingAiRetry("startup",15000);
  try{window.addEventListener("online",function(){schedulePendingAiRetry("online",2000);});}catch(e){}
  try{document.addEventListener("visibilitychange",function(){if(!document.hidden)schedulePendingAiRetry("visible",3000);});}catch(e){}
  try{setInterval(function(){schedulePendingAiRetry("interval",0);},120000);}catch(e){}
}
function renderPendingAi(){
  var box=el("pending-ai-list"),count=el("pending-ai-count");
  var items=getPendingAi();
  updatePendingTabBadge();
  if(count)count.textContent=items.length+" pending";
  if(box)box.innerHTML=items.length?items.map(function(item){return"<div style='font-size:12px;color:#2d6b60;margin-bottom:5px'>"+esc(pendingAiLabel(item))+"<br><span style='color:var(--dim)'>Attempts: "+(item.attempts||0)+(item.error?" — "+esc(item.error):"")+"</span></div>";}).join(""):"<div style='font-size:12px;color:var(--dim)'>No pending AI items.</div>";
}
function clearPendingAi(){if(!confirm("Clear all pending AI items?"))return;savePendingAi([]);SEC_IDS.forEach(function(id){setFieldAiUi(id,"idle");});setFieldAiUi("voice","idle");showToast("Pending AI cleared",2500);}
function setupAssetFieldAiButtons(){
  ASSET_AI_FIELD_IDS.forEach(function(id){
    var input=el(id);if(!input||input.getAttribute("data-ai-ready"))return;
    var wrap=input.parentElement;
    if(!wrap||wrap.querySelector("[data-field-ai-target='asset:"+id+"']"))return;
    var row=document.createElement("div");
    row.className="field-ai-row";
    var lbl=wrap.querySelector(".lbl");
    if(lbl){row.appendChild(lbl);}
    else{var lab=document.createElement("label");lab.className="lbl";lab.style.marginBottom="0";lab.textContent=id.replace("asset-","").replace(/-/g," ");row.appendChild(lab);}
    var btn=document.createElement("button");
    btn.type="button";btn.className="field-ai-btn bg bsm";btn.setAttribute("data-field-ai-target","asset:"+id);
    btn.title="Polish dictated text with AI";btn.textContent="→ AI";
    btn.onclick=function(){runFieldPolishAi("asset:"+id);};
    row.appendChild(btn);
    var st=document.createElement("div");st.className="field-ai-status";st.id="field-ai-status-"+fieldAiTargetKey("asset:"+id);
    wrap.insertBefore(row,input);
    wrap.insertBefore(st,input);
    input.setAttribute("data-ai-ready","1");
  });
}
function sanitizeAssetFilePart(s){return String(s||"").replace(/[^a-z0-9_-]+/gi,"-").replace(/^-+|-+$/g,"").slice(0,80)||"asset";}
async function getEquipmentRecord(equipmentId){
  var r=await fetchWithTimeout(PROXY,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"get_equipment",token:A.zohoToken,equipment_id:equipmentId})},30000);
  if(!r.ok)return null;
  var d={};try{d=await r.json();}catch(e){}
  return d&&d.data&&d.data[0]||null;
}
async function assetPhotoFilePrefix(equipmentId){
  var rec=await getEquipmentRecord(equipmentId);
  var cac=(rec&&rec.CAC_Asset_ID)||(A.asset.loadedOriginal&&A.asset.loadedOriginal.cacId)||equipmentId;
  return sanitizeAssetFilePart(cac);
}
function updateAssetPhotoRoleButtons(role){
  Object.keys(ASSET_PHOTO_ROLES).forEach(function(key){
    var btn=el("asset-photo-role-"+key);
    if(btn)btn.classList.toggle("on",key===role);
  });
}
function updateAssetPhotoLabelUi(){
  var role=A.assetPhotoLabelRole||ASSET_PHOTO_ROLE_DEFAULT;
  var inp=el("asset-photo-desc-input");
  var confirmBtn=el("asset-photo-label-confirm");
  var text=inp?String(inp.value||"").trim():"";
  var ok=role!=="other"||text.length>0;
  if(confirmBtn){
    confirmBtn.disabled=!ok;
    confirmBtn.classList.toggle("blocked",!ok);
    confirmBtn.style.opacity=ok?"1":"0.55";
  }
  updateAssetPhotoRoleButtons(role);
}
function finalizeAssetPhotoLabel(desc,role){
  var photo=A.assetPhotoLabelPhoto;
  var resolver=A.assetPhotoLabelResolver||A.assetPhotoDescResolver;
  role=role||A.assetPhotoLabelRole||ASSET_PHOTO_ROLE_DEFAULT;
  if(!ASSET_PHOTO_ROLES[role])role=normalizeAssetPhotoRole(desc,role);
  var roleDef=ASSET_PHOTO_ROLES[role]||ASSET_PHOTO_ROLES.other;
  desc=String(desc||"").trim();
  if(role==="other"){
    if(!desc){
      showToast("Enter a short description for Other photos.",4500);
      var inpOther=el("asset-photo-desc-input");
      if(inpOther)try{inpOther.focus();}catch(e){}
      updateAssetPhotoLabelUi();
      return;
    }
  }else{
    desc=desc||roleDef.short;
  }
  if(photo){
    var limit=assetPhotoRoleLimit(role);
    if(assetPhotoCountByRole(role,photo)>=limit){
      showToast("Maximum "+limit+" "+roleDef.label+" photo"+(limit!==1?"s":"")+" allowed.",5000);
      return;
    }
    photo.shortDescription=desc;
    photo.photoRole=role;
    normalizeAssetPhoto(photo);
  }
  A.assetPhotoLabelPhoto=null;
  A.assetPhotoLabelResolver=null;
  A.assetPhotoDescResolver=null;
  A.assetPhotoLabelRole=ASSET_PHOTO_ROLE_DEFAULT;
  closeAssetPhotoDescriptionModal();
  renderAssetPhotos();
  scheduleAssetDraftSave();
  if(resolver)resolver(desc);
}
function requestAssetPhotoLabel(photo,idx,opts){
  opts=opts||{};
  normalizeAssetPhoto(photo);
  if(!opts.force&&photo.shortDescription)return Promise.resolve(photo.shortDescription);
  return new Promise(function(resolve){
    A.assetPhotoLabelPhoto=photo;
    A.assetPhotoLabelResolver=resolve;
    A.assetPhotoDescResolver=resolve;
    A.assetPhotoLabelRole=photo.photoRole||ASSET_PHOTO_ROLE_DEFAULT;
    var img=el("asset-photo-desc-img"),inp=el("asset-photo-desc-input"),m=el("assetphotomodal");
    if(img)img.src=photo.data||"";
    if(inp){
      inp.value=photo.shortDescription||ASSET_PHOTO_ROLES[A.assetPhotoLabelRole].short;
      if(A.assetPhotoLabelRole==="other"&&!photo.shortDescription)inp.value="";
      inp.placeholder=A.assetPhotoLabelRole==="other"?"Describe this photo (required)":"transmitter-label, sensor-label, wiring";
      if(!inp._photoLabelInputBound){
        inp._photoLabelInputBound=true;
        inp.addEventListener("input",updateAssetPhotoLabelUi);
        inp.addEventListener("change",updateAssetPhotoLabelUi);
      }
    }
    updateAssetPhotoLabelUi();
    if(m){
      m.style.display="flex";
      initNoAutofill(m);
    }
    setTimeout(function(){try{if(inp){inp.focus();if(A.assetPhotoLabelRole!=="other")inp.select();}}catch(e){}},50);
  });
}
function requestAssetPhotoDescription(photo,idx){
  normalizeAssetPhoto(photo);
  if(photo.shortDescription)return Promise.resolve(photo.shortDescription);
  return requestAssetPhotoLabel(photo,idx,{force:false});
}
function editAssetPhotoLabel(idx){
  var photo=A.asset.photos[idx];
  if(!photo)return;
  requestAssetPhotoLabel(photo,idx,{force:true});
}
function pickAssetPhotoRole(role){
  if(!ASSET_PHOTO_ROLES[role])return;
  A.assetPhotoLabelRole=role;
  updateAssetPhotoRoleButtons(role);
  var inp=el("asset-photo-desc-input"),roleDef=ASSET_PHOTO_ROLES[role];
  if(!inp||!roleDef)return;
  var cur=String(inp.value||"").trim();
  var defaults=assetPhotoRoleDefaults();
  if(role==="other"){
    inp.placeholder="Describe this photo (required)";
    if(!cur||defaults.indexOf(cur)>=0)inp.value="";
    updateAssetPhotoLabelUi();
    try{inp.focus();}catch(e){}
    return;
  }
  inp.placeholder="transmitter-label, sensor-label, wiring";
  if(!cur||defaults.indexOf(cur)>=0)inp.value=roleDef.short;
  updateAssetPhotoLabelUi();
}
function closeAssetPhotoDescriptionModal(){var m=el("assetphotomodal");if(m)m.style.display="none";}
function confirmAssetPhotoDescription(){
  var inp=el("asset-photo-desc-input");
  finalizeAssetPhotoLabel(inp&&inp.value,A.assetPhotoLabelRole);
}
function cancelAssetPhotoDescription(){
  var role=A.assetPhotoLabelRole||ASSET_PHOTO_ROLE_DEFAULT;
  if(role==="other")role=ASSET_PHOTO_ROLE_DEFAULT;
  finalizeAssetPhotoLabel(ASSET_PHOTO_ROLES[role].short,role);
}
async function assetPhotoAttachmentName(prefix,photo,idx){
  var desc=photo.shortDescription;
  if(!desc)desc=await requestAssetPhotoDescription(photo,idx);
  var role=photo.photoRole||normalizeAssetPhotoRole(desc)||"other";
  var roleNum=assetPhotoRoleNumber(photo,idx);
  return prefix+"-"+sanitizeAssetFilePart(desc)+"-"+role+"-"+roleNum+".jpg";
}
async function saveAssetToZoho(){
  if(A.asset.saving){showToast("Asset save already in progress",2500);return;}
  try{requireOnline("Asset save");}catch(e){assetStatus(e.message,true);showToast(e.message,6000);return;}
  var missing=validateAssetForm();if(missing.length){assetStatus("Cannot save yet: "+missing.join(", "),true);showToast(missing[0]+" required",5000);updateAssetSaveState();return;}
  if(A.asset.mode==="update"&&!A.asset.currentAssetId){assetStatus("Search and load an existing asset before saving an update.",true);updateAssetSaveState();return;}
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
    try{if(A.sel&&A.asset.linkMode!=="account"){var linkResult=await linkEquipmentToSelectedDeal(equipmentId);dealLinked=!!linkResult.linked;}}catch(linkErr){dealLinkWarning=linkErr&&linkErr.message?linkErr.message:String(linkErr);enqueueDealAssetLink(equipmentId,dealLinkWarning);console.log("Asset saved but deal subform link failed:",linkErr);showToast("Asset saved, but deal link failed",7000);}
    try{await saveEquipmentUpdateNote(equipmentId);}catch(noteErr){noteWarning=noteErr&&noteErr.message?noteErr.message:String(noteErr);enqueueEquipmentNote(equipmentId,noteWarning);console.log("Asset saved but update note failed:",noteErr);showToast("Asset saved, but note failed",7000);}
    if(A.sel&&A.asset.linkMode!=="account"){try{await saveDealAssetUpdateNote(equipmentId);}catch(dealNoteErr){dealNoteWarning=dealNoteErr&&dealNoteErr.message?dealNoteErr.message:String(dealNoteErr);enqueueDealAssetNote(equipmentId,dealNoteWarning);console.log("Asset saved but deal update note failed:",dealNoteErr);showToast("Asset saved, but deal note failed",7000);}}
    var photosToUpload=assetPhotosToUpload();
    if(photosToUpload.length){
      try{
        assetStatus("Asset created. Attaching "+photosToUpload.length+" nameplate photo(s)...",false);
        var assetFilePrefix=await assetPhotoFilePrefix(equipmentId);
        for(var upi=0;upi<photosToUpload.length;upi++){
          var ap=photosToUpload[upi];
          var b64=await compressPhoto(ap.data,1200,0.8);
          if(!b64)throw new Error("Could not compress nameplate photo");
          var photoFilename=await assetPhotoAttachmentName(assetFilePrefix,ap,upi);
          try{
            var pr=await fetchWithTimeout(PROXY,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"upload_equipment_photo",token:A.zohoToken,equipment_id:equipmentId,filename:photoFilename,image_b64:b64})},45000);
            if(!pr.ok){var pt=await pr.text();throw new Error("Photo upload "+pr.status+": "+pt.substring(0,120));}
            A.asset.lastUploadedPhotoFingerprints[ap.fingerprint]=true;
          }catch(onePhotoErr){
            enqueueAssetPhotoUpload(equipmentId,ap,photoFilename,onePhotoErr.message||String(onePhotoErr));
            throw onePhotoErr;
          }
        }
      }catch(photoErr){
        photoWarning=photoErr&&photoErr.message?photoErr.message:String(photoErr);
        console.log("Asset photo attachment failed after asset create:",photoErr);
        showToast("Asset saved, but photo attachment failed",7000);
      }
    }
    A.asset.saved=true;
    clearAssetDraft();
    var savedItem=A.asset.savedItems.find(function(a){return a.id===equipmentId;});
    var savedSnap=savedAssetSnapshot(equipmentId,dealLinked);
    if(savedItem)Object.assign(savedItem,savedSnap,{dealLinked:savedItem.dealLinked||dealLinked});
    else A.asset.savedItems.push(savedSnap);
    renderSavedAssets();
    var next=el("asset-next-btn");if(next)next.style.display="flex";
    var warn=photoWarning||noteWarning||dealNoteWarning||dealLinkWarning;
    if(A.asset.loadedOriginal){A.asset.loadedOriginal=Object.assign({},A.asset.loadedOriginal,{model:assetInput("asset-model"),serial:assetInput("asset-serial"),brand:assetInput("asset-brand"),type:assetInput("asset-type"),building:assetInput("asset-building"),designator:assetInput("asset-designator"),nameplateAdditional:assetPayload({includeBlank:true}).Nameplate_Additional_Info||"",description:assetPayload({includeBlank:true}).Description_Instructions||""});renderAssetHistoryPanel();}
    var acctLabel=assetSaveAccountName()||"account";
    var okMsg=(A.asset.linkMode==="account"||!A.sel)
      ? "Saved to Zoho on "+acctLabel+" — Equipment record created (no deal linked). Equipment update note added."
      : (dealLinked
        ? "Asset saved to Zoho, linked to this Deal, and update notes added to the Asset and Deal. Tap Save Another Asset for the next instrument."
        : "Asset saved to Zoho on "+acctLabel+". Deal link did not complete — check Pending Sync.");
    assetStatus(warn?okMsg+" Issue: "+warn:okMsg,!!warn);
    showToast("Asset saved to Zoho",4000);
  }catch(e){assetStatus("Asset save failed: "+e.message,true);showToast("Asset save failed",5000);}
  finally{A.asset.saving=false;updateAssetSaveState();}
}

// LOCATION
function openStreetMapUrl(lat,lng){
  var la=Number(lat),ln=Number(lng);
  return "https://www.openstreetmap.org/?mlat="+encodeURIComponent(la)+"&mlon="+encodeURIComponent(ln)+"#map=17/"+la+"/"+ln;
}
function openLocationOnOsm(){
  if(!A.location){showToast("Capture GPS first",2500);return;}
  window.open(openStreetMapUrl(A.location.lat,A.location.lng),"_blank","noopener,noreferrer");
}
function locationMapLinkHtml(){
  if(!A.location)return "";
  var url=openStreetMapUrl(A.location.lat,A.location.lng);
  return "<div style='margin-top:8px'><a href='"+esc(url)+"' target='_blank' rel='noopener noreferrer' style='font-size:12px;color:var(--green);font-weight:600'>View on OpenStreetMap</a></div>";
}
function updateAssetOsmLink(){
  var box=el("asset-osm-link");
  if(!box)return;
  box.innerHTML=A.location?locationMapLinkHtml():"";
}
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
  h+=locationMapLinkHtml();
  el("loc-body").innerHTML=h;
  updateReportContext();
  if(el("asset-location"))setAssetInput("asset-location",A.location.lat.toFixed(6)+", "+A.location.lng.toFixed(6));
  updateAssetOsmLink();
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
function sanitizePhoneFilePart(s){
  return String(s||"").replace(/[^a-z0-9_-]+/gi,"-").replace(/^-+|-+$/g,"").slice(0,60)||"field";
}
function capturePhonePhotoFileName(photo,index,source){
  var acct=sanitizePhoneFilePart(A.sel&&A.sel.Account_Name||"field");
  var day=new Date().toISOString().slice(0,10);
  var n=String((index||0)+1).padStart(2,"0");
  var tag=sanitizePhoneFilePart(photo&&photo.label)||source||"photo";
  return "capstone-"+acct+"-"+day+"-"+tag+"-"+n+".jpg";
}
function downloadDataUrlToPhone(dataUrl,filename){
  if(!dataUrl||!filename)return false;
  try{
    var parts=String(dataUrl).split(",");
    if(parts.length<2)return false;
    var mimeMatch=parts[0].match(/data:(.*?);/);
    var mime=mimeMatch?mimeMatch[1]:"image/jpeg";
    var bin=atob(parts[1]);
    var len=bin.length;
    var bytes=new Uint8Array(len);
    for(var i=0;i<len;i++)bytes[i]=bin.charCodeAt(i);
    var blob=new Blob([bytes],{type:mime});
    var url=URL.createObjectURL(blob);
    var a=document.createElement("a");
    a.href=url;a.download=filename;
    document.body.appendChild(a);a.click();document.body.removeChild(a);
    setTimeout(function(){URL.revokeObjectURL(url);},5000);
    return true;
  }catch(e){console.log("downloadDataUrlToPhone",e);return false;}
}
function saveCapturePhotoToPhone(photo,index,opts){
  opts=opts||{};
  if(!photo||!photo.display)return false;
  var fname=capturePhonePhotoFileName(photo,index,opts.source||photo.phoneSource||"photo");
  var ok=downloadDataUrlToPhone(photo.display,fname);
  if(ok){
    photo.savedToPhone=true;photo.phoneFileName=fname;if(opts.source)photo.phoneSource=opts.source;
    if(!opts.silent)showToast("Photo saved to Downloads",2500);
  }else if(!opts.silent){showToast("Could not save photo to Downloads",4000);}
  return ok;
}
async function saveAllCapturePhotosToPhone(){
  if(!A.photos.length){showToast("No photos to save",2500);return;}
  var saved=0;
  for(var i=0;i<A.photos.length;i++){
    if(saveCapturePhotoToPhone(A.photos[i],i,{silent:true,source:A.photos[i].phoneSource||"photo"}))saved++;
    if(i<A.photos.length-1)await waitMs(350);
  }
  renderPhotoCards();scheduleCaptureDraftSave();
  showToast(saved+" photo"+(saved!==1?"s":"")+" saved to Downloads",4500);
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
  var photo={id:"p"+Date.now(),display:c.toDataURL("image/jpeg",.72),label:"",desc:"",syncStatus:"not_synced",syncMessage:"",time:new Date().toLocaleTimeString(),w:v.videoWidth||640,h:v.videoHeight||480,phoneSource:"snap",savedToPhone:false,phoneFileName:""};
  A.photos.push(photo);
  if(A.autoSavePhonePhotos)saveCapturePhotoToPhone(photo,A.photos.length-1,{silent:true,source:"snap"});
  renderPhotoCards();checkGen();scheduleCaptureHistorySave();
  var vpc=el("vb-pc");if(vpc){vpc.textContent=A.photos.length+" photo"+(A.photos.length!==1?"s":"");vpc.style.display="block";}
  showToast("Photo "+A.photos.length+" captured"+(photo.savedToPhone?" — also on phone":""),2200);
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
          var photo={id:"p"+Date.now()+Math.random(),display:c.toDataURL("image/jpeg",.72),label:"",desc:"",syncStatus:"not_synced",syncMessage:"",time:new Date().toLocaleTimeString(),w:img.width,h:img.height,phoneSource:"gallery",savedToPhone:false,phoneFileName:""};
          A.photos.push(photo);
          if(A.autoSavePhonePhotos)saveCapturePhotoToPhone(photo,A.photos.length-1,{silent:true,source:"gallery"});
          resolve();
        };
        img.onerror=resolve;img.src=ev.target.result;
      };
      reader.readAsDataURL(file);
    });
  }
  input.value="";renderPhotoCards();checkGen();scheduleCaptureHistorySave();
}
function removePhoto(id){A.photos=A.photos.filter(function(p){return p.id!==id;});renderPhotoCards();checkGen();scheduleCaptureDraftSave();}
function photoCardNode(pid){
  var cardWrap=el("photo-cards");if(!cardWrap)return null;
  var nodes=cardWrap.querySelectorAll(".pcard");
  for(var i=0;i<nodes.length;i++){if(nodes[i].getAttribute("data-photo-id")===pid)return nodes[i];}
  return null;
}
function updatePhotoFilenamePreview(pid){
  var p=A.photos.find(function(x){return x.id===pid;});var node=photoCardNode(pid);
  if(!p||!node)return;
  var idx=Math.max(0,A.photos.findIndex(function(x){return x.id===pid}));
  var fn=node.querySelector(".pc-filename");
  if(fn)fn.textContent="WorkDrive: "+workdrivePhotoFileName(p,idx);
}
function updatePhotoSyncStatusElement(pid){
  var p=A.photos.find(function(x){return x.id===pid;});var node=photoCardNode(pid);
  if(!p||!node)return;
  var ps=node.querySelector(".photo-sync-status");
  if(!ps)return;
  ps.className="photo-sync-status "+(p.syncStatus||"not_synced");
  ps.textContent=photoSyncLabel(p);
  if(p.syncMessage)ps.title=p.syncMessage;else ps.removeAttribute("title");
}
function capturePhotoFocusState(){
  var active=document.activeElement;
  if(!active||!active.classList||(!active.classList.contains("pc-label")&&!active.classList.contains("pc-desc")))return null;
  var card=active.closest?active.closest(".pcard"):null;
  if(!card)return null;
  return{id:card.getAttribute("data-photo-id"),field:active.classList.contains("pc-label")?"label":"desc",start:active.selectionStart,end:active.selectionEnd};
}
function restorePhotoFocusState(state){
  if(!state||!state.id)return;
  var node=photoCardNode(state.id);if(!node)return;
  var target=node.querySelector(state.field==="label"?".pc-label":".pc-desc");
  if(!target)return;
  target.focus();
  try{if(typeof state.start==="number")target.setSelectionRange(state.start,state.end);}catch(e){}
}
function updatePhotoDesc(pid,val){var p=A.photos.find(function(x){return x.id===pid;});if(p)p.desc=val;scheduleCaptureDraftSave();}
function updatePhotoLabel(pid,val){
  var p=A.photos.find(function(x){return x.id===pid;});if(!p)return;
  p.label=val;
  if((p.syncStatus||"not_synced")==="uploaded"){p.syncStatus="not_synced";p.syncMessage="";updatePhotoSyncStatusElement(pid);}
  scheduleCaptureDraftSave();
  updatePhotoFilenamePreview(pid);
}
function photoSyncLabel(p){
  var s=p&&p.syncStatus||"not_synced";
  if(s==="uploading")return"Uploading";
  if(s==="uploaded")return"Uploaded to WorkDrive";
  if(s==="failed")return"Pending Sync";
  return"Not synced";
}
function setPhotoSyncStatus(p,status,msg){if(!p)return;p.syncStatus=status;p.syncMessage=msg||"";renderPhotoCards();scheduleCaptureDraftSave();}
async function retryCapturePhotoUpload(photoId){
  var p=A.photos.find(function(x){return x.id===photoId;})||(A.reportPhotos||[]).find(function(x){return x.id===photoId;});
  if(!p){showToast("Photo not found",2500);return;}
  if(!A.sel){showToast("Select a deal before retrying photo sync",4000);return;}
  var idx=Math.max(0,A.photos.findIndex(function(x){return x.id===photoId;}));
  var dealFolder=WORKDRIVE_FOLDER;
  try{
    setPhotoSyncStatus(p,"uploading","");
    await refreshZohoToken();
    dealFolder=await resolveDealFolder();
    var b64=await compressPhoto(p.display,1200,0.8);
    if(!b64)throw new Error("Could not compress photo");
    var fname=workdrivePhotoFileName(p,idx);
    await uploadToWorkDrive(b64,fname,"image/jpeg",dealFolder);
    setPhotoSyncStatus(p,"uploaded","");
    showToast("Photo synced",2500);
  }catch(e){setPhotoSyncStatus(p,"failed",e.message);enqueueCapturePhotoUpload(p,idx,dealFolder,e.message);showToast("Photo retry failed: "+e.message,5000);}
}
function renderPhotoCards(){
  var focusState=capturePhotoFocusState();
  badge("tb-photos",A.photos.length||"");
  var c=el("photo-cards");if(!c)return;c.innerHTML="";
  A.photos.forEach(function(p,i){
    var div=document.createElement("div");div.className="pcard";div.setAttribute("data-photo-id",p.id);
    var img=document.createElement("img");img.src=p.display;img.alt="Photo "+(i+1);
    var body=document.createElement("div");body.className="pc-body";
    var tm=document.createElement("div");tm.className="pc-time";tm.textContent="Photo "+(i+1)+" — "+p.time;
    var label=document.createElement("input");label.className="pc-label";label.setAttribute("inputmode","text");label.placeholder="Photo label (overview, issue, wiring, reading)";label.value=p.label||"";
    (function(pid){label.addEventListener("input",function(){updatePhotoLabel(pid,this.value);});})(p.id);
    var ta=document.createElement("textarea");ta.className="pc-desc";ta.setAttribute("inputmode","text");ta.id="ta-"+p.id;ta.placeholder="Tap to add description with Wispr...";ta.value=p.desc||"";
    (function(pid){ta.addEventListener("input",function(){updatePhotoDesc(pid,this.value);});})(p.id);
    var aiRow=document.createElement("div");aiRow.className="field-ai-row";
    var aiLbl=document.createElement("span");aiLbl.className="pc-ai-lbl";aiLbl.textContent="Description (Wispr)";
    var aiBtn=document.createElement("button");aiBtn.type="button";aiBtn.className="field-ai-btn bg bsm";aiBtn.setAttribute("data-field-ai-target","photo:"+p.id);aiBtn.title="Polish dictated text with AI";aiBtn.textContent="→ AI";
    (function(pid){aiBtn.onclick=function(){runFieldPolishAi("photo:"+pid);};})(p.id);
    aiRow.appendChild(aiLbl);aiRow.appendChild(aiBtn);
    var aiSt=document.createElement("div");aiSt.className="field-ai-status";aiSt.id="field-ai-status-"+p.id;
    if(getPendingAi().some(function(i){return i.type==="field_polish"&&i.target==="photo:"+p.id;}))aiSt.className="field-ai-status field-ai-queued",aiSt.textContent="Pending AI — will retry when online";
    var acts=document.createElement("div");acts.className="pc-acts";
    if((p.syncStatus||"not_synced")==="failed"){
      var retry=document.createElement("button");retry.className="bs bsm";retry.textContent="Retry Photo";
      (function(pid){retry.onclick=function(){retryCapturePhotoUpload(pid);};})(p.id);
      acts.appendChild(retry);
    }
    var phoneBtn=document.createElement("button");phoneBtn.className="bg bsm";phoneBtn.textContent=p.savedToPhone?"On Phone":"Save to Phone";
    (function(pid,idx){phoneBtn.onclick=function(){var ph=A.photos.find(function(x){return x.id===pid;});if(ph&&saveCapturePhotoToPhone(ph,idx,{source:ph.phoneSource||"photo"}))renderPhotoCards();};})(p.id,i);
    acts.appendChild(phoneBtn);
    var rm=document.createElement("button");rm.className="bd bsm";rm.textContent="Remove";
    (function(pid){rm.onclick=function(){removePhoto(pid);};})(p.id);
    acts.appendChild(rm);
    var fn=document.createElement("div");fn.className="pc-filename";fn.textContent="WorkDrive: "+workdrivePhotoFileName(p,i);
    var ps=document.createElement("div");ps.className="photo-sync-status "+(p.syncStatus||"not_synced");ps.textContent=photoSyncLabel(p);if(p.syncMessage)ps.title=p.syncMessage;
    body.appendChild(tm);body.appendChild(ps);
    if(p.savedToPhone){var pp=document.createElement("div");pp.className="photo-sync-status uploaded";pp.textContent="Saved on phone";if(p.phoneFileName)pp.title=p.phoneFileName;body.appendChild(pp);}
    body.appendChild(label);body.appendChild(fn);body.appendChild(aiRow);body.appendChild(aiSt);body.appendChild(ta);body.appendChild(acts);
    div.appendChild(img);div.appendChild(body);c.appendChild(div);
  });
  restorePhotoFocusState(focusState);
  var allBtn=el("phone-save-all-btn");if(allBtn)allBtn.style.display=A.photos.length?"block":"none";
  updateCaptureStorageWarning();
}
function checkGen(){
  scheduleCaptureDraftSave();
  var tx=el("tx");var t2=el("tx2");
  var hasP=A.photos.length>0,hasN=(tx&&tx.value.trim().length>0)||(t2&&t2.value.trim().length>0);
  var hasSec=SEC_IDS.some(function(id){var e=el(id);return e&&e.value.trim().length>0;});
  var show=hasP||hasN||hasSec;
  var gb=el("gen-btn");if(gb)gb.style.display=show?"flex":"none";
  var lsb=el("local-save-btn");if(lsb)lsb.style.display=show?"flex":"none";
  var psb=el("phone-save-all-btn");if(psb)psb.style.display=hasP?"flex":"none";
  var gs=el("gen-summary"),gt=el("gen-summary-txt");
  if(show&&gs&&gt){
    gs.style.display="block";
    var fc=SEC_IDS.filter(function(id){var e=el(id);return e&&e.value.trim();}).length;
    var assetCount=A.asset&&A.asset.savedItems?A.asset.savedItems.length:0;
    var rows=[
      [!!A.sel,"Deal selected",A.sel?dealHeaderText(A.sel):"Pick the correct Deal before generating if this report goes to Zoho."],
      [!!currentTechnicianName(),"Technician selected",currentTechnicianName()||"Select technician so the report identifies who performed the work."],
      [!!A.location,"GPS captured",A.location?(A.location.address||A.location.lat.toFixed(6)+", "+A.location.lng.toFixed(6)):"Tap Get Location if site/GPS should be included."],
      [hasN,"Field notes",hasN?"Voice/typed notes included.":"Add notes describing what was found or completed."],
      [hasP,"Photos",hasP?(A.photos.length+" photo"+(A.photos.length!==1?"s":"")+" added."):"Add photos when visual evidence matters."],
      [hasSec,"Structured sections",hasSec?(fc+" section"+(fc!==1?"s":"")+" filled."):"Optional, but useful for forcing details into report sections."],
      [assetCount>0,"Asset updates",assetCount?(assetCount+" asset update"+(assetCount!==1?"s":"")+" saved this visit."):"If equipment was added/changed, save it on Assets first."]
    ];
    gt.innerHTML=rows.map(function(r){return"<div class='rsc-row "+(r[0]?"rsc-ok":"rsc-warn")+"'><span class='rsc-dot'>"+(r[0]?"✓":"!")+"</span><div><strong>"+esc(r[1])+"</strong><div style='color:#64748b'>"+esc(r[2])+"</div></div></div>";}).join("")+
      "<div class='rsc-note'><strong>Minimum to generate:</strong> add notes, photos, or structured section text. Review warnings before creating the report.</div>";
  }else if(gs)gs.style.display="none";
}

// API
async function callAPI(opts){
  var body={model:"claude-sonnet-4-6",max_tokens:opts.maxTok||4000,messages:[{role:"user",content:opts.content}]};
  if(opts.sys)body.system=opts.sys;
  incGlobalBusy();
  var ctrl=new AbortController();var timer=setTimeout(function(){ctrl.abort();},opts.ms||60000);
  try{
    var r=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json","x-api-key":API_KEY,"anthropic-version":"2023-06-01","anthropic-dangerous-direct-browser-access":"true"},body:JSON.stringify(body),signal:ctrl.signal});
    clearTimeout(timer);if(!r.ok){var e=await r.text();throw new Error("API "+r.status+": "+e.substring(0,150));}
    return r.json();
  }catch(err){
    clearTimeout(timer);
    throw err;
  }finally{
    decGlobalBusy();
  }
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
  A.workdrivePdfUrl=null;A.lastSaveResult=null;A.lastSaveIssue=null;
  var btn=el("gen-btn"),regen=el("regen-btn");
  if(btn){btn.disabled=true;btn.textContent="Generating...";}
  if(regen)regen.disabled=true;
  var tx=el("tx");var txVal=getVoiceNotesValue();
  saveCaptureWorkLocally({silent:false});
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
    var savedPhotos=photoSrc.map(function(p){return{id:p.id,display:p.display,label:p.label||"",desc:p.desc||"",time:p.time,w:p.w||0,h:p.h||0,aiDesc:p.aiDesc||"",synthesis:p.synthesis||"",syncStatus:p.syncStatus||"not_synced",syncMessage:p.syncMessage||"",savedToPhone:!!p.savedToPhone,phoneFileName:p.phoneFileName||"",phoneSource:p.phoneSource||""};});
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
    var meta=buildCaptureHistoryMeta();
    meta.photos=savedPhotos.length;meta.photoData=savedPhotos;meta.report=A.report;meta.voiceNotes=txVal;meta.captureInProgress=false;meta.localSavedAt=new Date().toISOString();
    A.lastSaveResult=null;A.lastSaveIssue=null;
    saveOrUpdateHistory(meta);saveCaptureDraftNow();renderReport();updateCaptureModeStatus();go("report");
    removePendingAiByTypeTarget("report_generate","report");
    if(A.sel){
      A.uploadPromise=uploadToWorkDriveAll();
      if(A.autoSaveZoho){
        if(btn)btn.textContent="Saving report to Zoho...";
        try{
          await saveNoteToZoho({fromGenerate:true});
          showToast("Report saved to Zoho — Deal note, PDF attachment, and WorkDrive links",6000);
          updateCaptureModeStatus();
        }catch(se){
          A.lastSaveIssue="Auto-save failed: "+se.message+". Use Retry Report Save after checking connection.";
          renderReportRetryActions();
          var reSave=el("rpt-err");if(reSave){reSave.textContent="Auto-save failed: "+se.message+". Tap Save Report to Zoho to retry.";reSave.style.display="block";}
          showToast("Auto-save failed — tap Save Report to Zoho",8000);
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
  }catch(e){
    saveCaptureWorkLocally({silent:false});
    if(shouldQueueAiError(e)){
      enqueuePendingAi({type:"report_generate",target:"report",historyId:A.currentHistoryId||null,label:"Generate AI Report",error:e.message||String(e)});
      showToast("Report generation queued — capture saved locally",5000);
      var reQ=el("rpt-err");if(reQ){reQ.textContent="Weak signal — report generation queued. Your capture is in History. Pending AI retries automatically when connection improves.";reQ.style.display="block";}
    }else{
      var re=el("rpt-err");if(re){re.textContent="Report error: "+e.message+". Your capture was saved locally to History — open History → Open + Continue.";re.style.display="block";}
      alert("Report error: "+e.message+"\n\nYour capture was saved locally to History. Open History and tap Open + Continue to pick up where you left off.");
    }
  }
  if(btn){btn.disabled=false;btn.textContent="Generate AI Report";}if(regen)regen.disabled=false;
}

// REPORT
function reportChecklistItem(ok,label,detail){
  return"<div class='rsc-row "+(ok?"rsc-ok":"rsc-warn")+"'><span class='rsc-dot'>"+(ok?"✓":"!")+"</span><div><strong>"+esc(label)+"</strong>"+(detail?"<div style='color:#64748b'>"+esc(detail)+"</div>":"")+"</div></div>";
}
function renderReportSaveChecklist(){
  var box=el("report-save-checklist");if(!box)return;
  var hasDeal=!!A.sel,hasTech=!!currentTechnicianName(),hasGps=!!A.location,photoCount=A.reportPhotos&&A.reportPhotos.length||0,assetCount=A.asset&&A.asset.savedItems?A.asset.savedItems.length:0;
  box.innerHTML="<div class='stitle' style='margin-bottom:8px'>Before Saving Report to Zoho</div>"+
    reportChecklistItem(hasDeal,"Deal selected",hasDeal?dealHeaderText(A.sel):"Pick the correct Deal before saving.")+
    reportChecklistItem(hasTech,"Technician selected",hasTech?technicianDisplayName():"Select technician in Settings or the startup prompt.")+
    reportChecklistItem(hasGps,"GPS captured",hasGps?(A.location.address||A.location.lat.toFixed(6)+", "+A.location.lng.toFixed(6)):"Capture GPS if location should appear in the report.")+
    reportChecklistItem(true,"Photos reviewed",photoCount?photoCount+" photo"+(photoCount!==1?"s":"")+" included.":"No photos attached to this report.")+
    reportChecklistItem(true,"Asset updates",assetCount?assetCount+" asset update"+(assetCount!==1?"s":"")+" saved this visit.":"If equipment changed, save it on the Assets tab first.")+
    "<div class='rsc-note'><strong>Save Report to Zoho will:</strong> create/update the Deal note, attach the report PDF to the Deal, upload the PDF/photos/video to WorkDrive, and keep History available for continuing this report.</div>";
}
function renderReportSaveConfirmation(){
  var box=el("report-save-confirmation");if(!box)return;
  var r=A.lastSaveResult;
  if(!r){box.style.display="none";box.innerHTML="";return;}
  box.style.display="block";
  box.innerHTML="<div class='stitle' style='margin-bottom:8px;color:#166534'>Report Saved to Zoho</div>"+
    reportChecklistItem(!!r.note,"Deal note",r.note?"Created or updated on the selected Deal.":"Not confirmed.")+
    reportChecklistItem(!!r.dealPdf,"Report PDF attached to Deal",r.dealPdf?"PDF attachment confirmed or already attached.":"Not confirmed; use Retry File Sync.")+
    reportChecklistItem(!!r.workdrive,"WorkDrive files/links",r.workdrive?"PDF/photos/video uploaded or WorkDrive PDF link saved.":"No WorkDrive upload confirmed; use Retry File Sync.")+
    reportChecklistItem(true,"History updated","This report can be reopened from History.")+
    reportChecklistItem(true,"Asset update notes",r.assets?r.assets+" asset update"+(r.assets!==1?"s":"")+" saved this visit.":"No asset updates saved this visit.")+
    (r.warning?"<div class='rsc-note'><strong>Warning:</strong> "+esc(r.warning)+"</div>":"");
}
function renderReportRetryActions(){
  var box=el("report-retry-actions"),msg=el("report-retry-message");if(!box)return;
  var issue=A.lastSaveIssue;
  if(!issue){box.style.display="none";if(msg)msg.textContent="";return;}
  box.style.display="block";
  if(msg)msg.textContent=issue;
}
function renderReport(){
  if(!A.report){hideEl("rpt-content");showEl("rpt-empty");return;}
  hideEl("rpt-empty");showEl("rpt-content");
  renderReportSaveChecklist();
  renderReportSaveConfirmation();
  renderReportRetryActions();
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
    var r=await fetchWithTimeout(PROXY,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)},ZOHO_FETCH_MS);
    if(r.ok){
      var d={};try{d=await r.json();}catch(pe){}
      var noteId=zohoNoteIdFromResponse(d)||A.zohoNoteId||null;
      if(noteId)A.zohoNoteId=noteId;
      return noteId;
    }
    var e=await r.text();
    if(r.status===401&&attempt===0){var ref=await refreshZohoToken();if(ref)continue;enqueueReportNoteSave(payload,"Token refresh failed");throw new Error("Token refresh failed");}
    if(payload.action==="update_note"&&isStaleZohoNoteError(r.status,e)){
      console.log("Stored Zoho note was not found; creating a replacement note.",e);
      A.zohoNoteId=null;
      updateCurrentHistory({zohoNoteId:null,zohoSaved:false});
      continue;
    }
    enqueueReportNoteSave(payload,"Proxy error "+r.status+": "+e.substring(0,100));
    throw new Error("Proxy error "+r.status+": "+e.substring(0,100));
  }
}
async function saveNote(){
  if(!A.sel||!A.report)return;
  if(A.savingToZoho){showToast("Save already in progress",3000);return;}
  try{
    await saveNoteToZoho({});
    showToast("Report saved to Zoho",4000);
    updateCaptureModeStatus();
  }catch(e){
    A.lastSaveIssue="Save failed: "+e.message+". Use Retry Report Save after checking connection.";
    renderReportRetryActions();
    var re=el("rpt-err");if(re){re.textContent="Save failed: "+e.message;re.style.display="block";}
    showToast("Save failed: "+e.message,7000);
  }
}
async function retryReportSave(){
  if(A.savingToZoho){showToast("Save already in progress",3000);return;}
  A.lastSaveIssue=null;renderReportRetryActions();
  try{await saveNoteToZoho({});showToast("Retry report save complete",4000);updateCaptureModeStatus();}
  catch(e){A.lastSaveIssue="Retry report save failed: "+e.message;renderReportRetryActions();showToast("Retry report save failed",6000);}
}
async function retryReportUploads(){
  if(!A.sel||!A.report){showToast("Select a deal and generate a report first",4000);return;}
  try{
    A.lastSaveIssue=null;renderReportRetryActions();
    showUploadStatus("Retrying report sync items...",false);
    await refreshZohoToken();
    A.uploadPromise=uploadToWorkDriveAll();
    await A.uploadPromise;
    await refreshZohoToken();
    await uploadReportPdfToWorkDrive();
    await uploadReportPdfToDealAttachment();
    var savedNoteId=await zohoSave();
    updateCurrentHistory({pdfSaved:true,zohoSaved:true,dealPdfAttached:!!A.dealPdfAttached,zohoNoteId:savedNoteId||A.zohoNoteId||null});
    A.lastSaveResult={note:true,dealPdf:!!A.dealPdfAttached,workdrive:!!(A.workdrivePdfUrl||A.workdriveUploadCount>0),assets:A.asset&&A.asset.savedItems?A.asset.savedItems.length:0,warning:""};
    renderReportSaveConfirmation();renderReportRetryActions();
    showUploadStatus("Retry complete: file sync items checked and Zoho note refreshed.",false);
    showToast("Retry file sync complete",4000);
    updateCaptureModeStatus();
  }catch(e){
    A.lastSaveIssue="Retry file sync failed: "+e.message;
    renderReportRetryActions();
    showUploadStatus(A.lastSaveIssue,true);
    showToast("Retry uploads failed",6000);
  }
}
async function saveNoteToZoho(opts){
  opts=opts||{};
  if(!A.sel||!A.report)throw new Error("Select a deal and generate a report first");
  if(A.savingToZoho)throw new Error("Save already in progress");
  saveCaptureWorkLocally({silent:true});
  requireOnline("Report save");
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
      try{var dealPdfPayload=await buildReportPdfPayload();enqueueReportPdfUpload("deal_pdf",dealPdfPayload,attErr&&attErr.message?attErr.message:String(attErr));}catch(qe){console.log("Queue deal PDF:",qe);}
      console.log("Continuing Zoho save after attachment warning:",attErr);
      showUploadStatus("Deal PDF attachment did not finish. Saving Zoho note now...",true);
    }
    setStatus(A.zohoNoteId?"Updating Zoho...":"Saving report to Zoho...");
    showUploadStatus(A.zohoNoteId?"Updating existing Zoho CRM note...":"Saving report note to Zoho CRM...",false);
    var savedNoteId=await zohoSave();
    setStatus("Saved");
    if(btn){btn.style.background="var(--green)";btn.style.color="#001a18";}
    var uploadWarning=uploadWarnings.join("; ");
    showUploadStatus(uploadWarning?"Saved to Zoho. Some upload steps need retry: "+uploadWarning:"Saved successfully: Deal note updated, report PDF attached to Deal, and WorkDrive files/links saved.",!!uploadWarning);
    if(A.workdriveUploadCount>0){
      var reOk=el("rpt-err");if(reOk){reOk.style.display="none";}
    }else if(A.reportPhotos&&A.reportPhotos.length>0){
      var reWarn=el("rpt-err");if(reWarn){reWarn.textContent="Note saved, but no files confirmed in WorkDrive. Open the deal folder in WorkDrive.";reWarn.style.display="block";}
    }
    updateCurrentHistory({pdfSaved:true,zohoSaved:true,dealPdfAttached:!!A.dealPdfAttached,zohoNoteId:savedNoteId||A.zohoNoteId||null});
    A.lastSaveResult={note:true,dealPdf:!!A.dealPdfAttached,workdrive:!!(A.workdrivePdfUrl||A.workdriveUploadCount>0),assets:A.asset&&A.asset.savedItems?A.asset.savedItems.length:0,warning:uploadWarning};
    A.lastSaveIssue=uploadWarning?("Some save/upload steps need retry: "+uploadWarning):null;
    renderReportSaveChecklist();
    renderReportSaveConfirmation();
    renderReportRetryActions();
    updateCaptureModeStatus();
    if(btn&&!opts.fromGenerate){
      setTimeout(function(){btn.textContent="Save Report to Zoho";btn.style.background="";btn.style.color="";btn.disabled=false;},3000);
    }
  }finally{
    A.savingToZoho=false;
    if(btn&&opts.fromGenerate){btn.textContent="Save Report to Zoho";btn.style.background="";btn.style.color="";btn.disabled=false;}
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
function workdrivePhotoFileName(p,i){var label=p&&p.label?p.label:((p&&p.id)||("photo-"+(i+1)));return workdriveStableFileName("Photo",label,"jpg");}
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
        setPhotoSyncStatus(p,"uploading","");
        var b64=await compressPhoto(p.display,1200,0.8);
        if(!b64){skipped++;showToast("Photo "+(i+1)+" skipped (compress failed)",5000);continue;}
        var fname=workdrivePhotoFileName(p,i);
        showUploadStatus("Uploading photo "+(i+1)+" of "+total+"...",false);
        showToast("Uploading photo "+(i+1)+" of "+total+"...",4000);
        await uploadToWorkDrive(b64,fname,"image/jpeg",dealFolder);
        setPhotoSyncStatus(p,"uploaded","");
        ok++;A.workdriveUploadCount=ok;showToast("Photo "+(i+1)+" uploaded OK",5000);
      }catch(e){fail++;setPhotoSyncStatus(p,"failed",e.message);enqueueCapturePhotoUpload(p,i,dealFolder,e.message);showToast("Photo "+(i+1)+" error: "+e.message,7000);}
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
    try{var wdPdfPayload=await buildReportPdfPayload();if(typeof dealFolder!=="undefined")wdPdfPayload.folderId=dealFolder;enqueueReportPdfUpload("workdrive_pdf",wdPdfPayload,e&&e.message?e.message:String(e));}catch(qe){console.log("Queue WorkDrive PDF:",qe);}
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
        setPhotoSyncStatus(p,"uploading","");
        var b64=await compressPhoto(p.display,1200,0.8);
        if(!b64)continue;
        var fname=workdrivePhotoFileName(p,i);
        showToast("Uploading photo "+(i+1)+" of "+A.reportPhotos.length+"...",2000);
        await uploadToWorkDrive(b64,fname,"image/jpeg",dealFolder);
        setPhotoSyncStatus(p,"uploaded","");
        ok++;A.workdriveUploadCount=ok;showToast("Photo "+(i+1)+" uploaded",1500);
      }catch(e){setPhotoSyncStatus(p,"failed",e.message);showToast("Photo "+(i+1)+" error: "+e.message,3000);console.error("Photo upload error:",e);}
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
  var pr=persistHistoryRecords(h,0);
  if(pr.saved)badge("tb-hist",pr.records.length);
  renderHistory();
  return pr.saved;
}
function getHistory(){try{var h=localStorage.getItem("fp_history");return h?JSON.parse(h):[];}catch(e){return[];}}
function getPlaudTokens(){try{return JSON.parse(localStorage.getItem("fp_plaud_tokens")||"null")||null;}catch(e){return null;}}
function savePlaudTokens(tokens){
  try{
    if(!tokens)localStorage.removeItem("fp_plaud_tokens");
    else localStorage.setItem("fp_plaud_tokens",JSON.stringify(tokens));
  }catch(e){showToast("Could not save Plaud connection",5000);}
  if(typeof renderPlaudSettingsUI==="function")renderPlaudSettingsUI();
}
function isPlaudConnected(){var t=getPlaudTokens();return!!(t&&(t.refresh_token||t.access_token));}
function plaudAccessTokenUsable(tokens){
  return !!(tokens&&tokens.access_token&&(!tokens.expires_at||Date.now()<tokens.expires_at-60000));
}
function isPlaudAutoPullEnabled(){try{return localStorage.getItem("fp_plaud_auto_pull")!=="0";}catch(e){return true;}}
function applyPlaudProxyTokens(d){
  if(!d||!d.tokens)return;
  var cur=getPlaudTokens()||{};
  savePlaudTokens({
    refresh_token:d.tokens.refresh_token||cur.refresh_token,
    access_token:d.tokens.access_token||cur.access_token,
    expires_at:d.tokens.expires_at||cur.expires_at,
    email:cur.email||"",
    connectedAt:cur.connectedAt||new Date().toISOString()
  });
}
async function plaudProxyRequest(payload){
  var tokens=getPlaudTokens();
  if(tokens&&tokens.refresh_token)payload.refresh_token=tokens.refresh_token;
  else if(tokens&&tokens.access_token)payload.access_token=tokens.access_token;
  var r=await fetchWithTimeout(PLAUD_PROXY_URL,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)},45000);
  var txt=await r.text();
  var d={};try{d=JSON.parse(txt);}catch(e){}
  if(!r.ok||!d.ok)throw new Error(d.error||("Plaud request failed "+r.status));
  applyPlaudProxyTokens(d);
  return d;
}
function renderPlaudSettingsUI(){
  var st=el("plaud-conn-status"),inp=el("plaud-refresh-input"),tog=el("tog-plaud-auto");
  var t=getPlaudTokens();
  if(inp&&!inp.dataset.bound){inp.dataset.bound="1";inp.addEventListener("input",function(){if(st)st.textContent="";});}
  if(st){
    if(t&&t.email)st.textContent="Connected — "+t.email+(t.connectedAt?" (since "+new Date(t.connectedAt).toLocaleDateString()+")":"");
    else if(t&&t.refresh_token)st.textContent="Refresh token saved — tap Verify to confirm account";
    else st.textContent="Not connected — paste a Plaud refresh token from plaud login (see docs/PLAUD_STAGE2_SETUP.md)";
  }
  if(tog)tog.classList.toggle("on",isPlaudAutoPullEnabled());
}
function parsePlaudTokenInput(raw){
  raw=String(raw||"").trim();
  if(!raw)return"";
  if(raw.charAt(0)==="{"){
    try{
      var j=JSON.parse(raw);
      return String(j.refresh_token||j.refreshToken||"").trim();
    }catch(e){}
  }
  return raw;
}
function savePlaudRefreshToken(){
  var inp=el("plaud-refresh-input");
  var token=parsePlaudTokenInput(inp?inp.value:"");
  if(!token){showToast("Paste your Plaud refresh_token (or whole tokens.json)",4000);return;}
  savePlaudTokens({refresh_token:token,connectedAt:new Date().toISOString()});
  if(inp)inp.value="";
  showToast("Plaud token saved — tap Verify Connection",3000);
  verifyPlaudConnection();
}
async function verifyPlaudConnection(){
  if(!isPlaudConnected()){showToast("Paste and save a Plaud refresh token first",4000);return;}
  var st=el("plaud-conn-status");if(st)st.textContent="Verifying Plaud connection...";
  try{
    var d=await plaudProxyRequest({action:"verify"});
    var user=d.user||{};
    var email=user.email||user.name||user.nickname||"Plaud account";
    var cur=getPlaudTokens()||{};
    savePlaudTokens({
      refresh_token:cur.refresh_token,
      access_token:cur.access_token,
      expires_at:cur.expires_at,
      email:email,
      connectedAt:cur.connectedAt||new Date().toISOString()
    });
    showToast("Plaud connected — "+email,4000);
    renderPlaudSettingsUI();
  }catch(e){
    if(st)st.textContent="Connection failed — "+e.message;
    showToast("Plaud verify failed: "+e.message,7000);
  }
}
function clearPlaudConnection(){
  if(!confirm("Disconnect Plaud from this device?"))return;
  savePlaudTokens(null);
  stopPlaudAutoPull();
  showToast("Plaud disconnected",2500);
  renderPlaudSettingsUI();
}
function togglePlaudAutoPull(){
  var on=!isPlaudAutoPullEnabled();
  try{localStorage.setItem("fp_plaud_auto_pull",on?"1":"0");}catch(e){}
  var tog=el("tog-plaud-auto");if(tog)tog.classList.toggle("on",on);
  if(on&&isPlaudConnected())startPlaudAutoPullIfNeeded();
  else stopPlaudAutoPull();
  showToast(on?"Plaud auto-pull enabled":"Plaud auto-pull paused",2500);
}
var plaudPullTimer=null;
var plaudPullInFlight=false;
var lastPlaudForegroundPull=0;
function stopPlaudAutoPull(){
  if(plaudPullTimer){clearInterval(plaudPullTimer);plaudPullTimer=null;}
}
function startPlaudAutoPullIfNeeded(){
  if(!isPlaudConnected()||!isPlaudAutoPullEnabled()){stopPlaudAutoPull();return;}
  if(!plaudPullTimer){
    plaudPullTimer=setInterval(function(){
      pullFromPlaud({silent:true,notifyOnAdd:true});
    },PLAUD_AUTO_PULL_MS);
  }
  pullFromPlaud({silent:true,notifyOnAdd:true});
}
function setupPlaudForegroundPull(){
  try{
    document.addEventListener("visibilitychange",function(){
      if(document.hidden||!isPlaudConnected()||!isPlaudAutoPullEnabled())return;
      if(Date.now()-lastPlaudForegroundPull<PLAUD_FOREGROUND_PULL_MS)return;
      lastPlaudForegroundPull=Date.now();
      pullFromPlaud({silent:true,notifyOnAdd:true});
    });
  }catch(e){}
}
function getKnownPlaudFileIds(items){
  var ids={};
  (items||getInboxItems()).forEach(function(i){if(i.plaudFileId)ids[i.plaudFileId]=true;});
  return ids;
}
function getPlaudPullCutoffMs(){
  var last="";try{last=localStorage.getItem("fp_plaud_last_pull")||"";}catch(e){}
  if(last){var t=new Date(last).getTime();if(!isNaN(t))return t;}
  return Date.now()-PLAUD_FIRST_PULL_DAYS*24*60*60*1000;
}
async function pullFromPlaud(opts){
  opts=opts||{};
  if(!isPlaudConnected()){
    if(!opts.silent){showToast("Connect Plaud in Settings first (docs/PLAUD_STAGE2_SETUP.md)",6000);go("settings");}
    return;
  }
  if(plaudPullInFlight)return;
  plaudPullInFlight=true;
  if(!opts.silent)showToast("Pulling new Plaud recordings...",3000);
  var added=0;
  try{
    var items=getInboxItems();
    var known=getKnownPlaudFileIds(items);
    var cutoff=getPlaudPullCutoffMs();
    var dealFields=inboxDealFieldsFromSel();
    var candidates=[];
    for(var page=1;page<=3;page++){
      var list=await plaudProxyRequest({action:"list_files",page:page,page_size:50});
      var rows=(list.result&&list.result.data)||[];
      if(!rows.length)break;
      for(var ri=0;ri<rows.length;ri++){
        var row=rows[ri];
        if(!row||!row.id||known[row.id])continue;
        var created=new Date(row.created_at||row.start_at||0).getTime();
        if(isNaN(created)||created<cutoff)continue;
        candidates.push(row);
      }
      if(rows.length<50)break;
    }
    candidates.sort(function(a,b){return new Date(b.created_at||0)-new Date(a.created_at||0);});
    for(var ci=0;ci<candidates.length;ci++){
      var fileMeta=candidates[ci];
      try{
        var detail=await plaudProxyRequest({action:"get_file",file_id:fileMeta.id});
        var file=detail.file||{};
        var audioUrl=String(file.presigned_url||"").trim();
        if(!audioUrl){known[fileMeta.id]=true;continue;}
        var submit=await fetchWithTimeout(INBOX_SUBMIT_URL,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({inbox_id:"plaud"+fileMeta.id,filename:file.name||fileMeta.name||"Plaud recording",source:"plaud",audio_url:audioUrl})},120000);
        var stxt=await submit.text();
        var sd={};try{sd=JSON.parse(stxt);}catch(e){}
        if(!submit.ok||!sd.ok)throw new Error(sd.error||("Submit failed "+submit.status));
        var transcribing=!!sd.assemblyTranscriptId;
        items.push({
          id:sd.id||("plaud"+fileMeta.id),
          created:file.created_at||file.start_at||new Date().toISOString(),
          source:"plaud",
          status:transcribing?"transcribing":(dealFields.dealId?"linked":(sd.status||"received")),
          title:file.name||fileMeta.name||"Plaud recording",
          filename:file.name||fileMeta.name||"Plaud recording",
          transcript:sd.transcript||"",
          assemblyTranscriptId:sd.assemblyTranscriptId||"",
          plaudFileId:fileMeta.id,
          dealId:dealFields.dealId,dealName:dealFields.dealName,accountName:dealFields.accountName,summary:"",
          error:"",pipelineMessage:sd.message||""
        });
        known[fileMeta.id]=true;
        added++;
      }catch(fe){
        console.log("plaud file pull",fileMeta.id,fe);
        if(!opts.silent)showToast("Plaud pull issue: "+fe.message,6000);
      }
    }
    try{localStorage.setItem("fp_plaud_last_pull",new Date().toISOString());}catch(e){}
    if(added){
      saveInboxItems(items);
      if(!opts.silent){
        showToast(added+" Plaud recording"+(added!==1?"s":"")+" added to Inbox",4000);
        go("inbox");
      }else if(opts.notifyOnAdd){
        showToast(added+" new Plaud recording"+(added!==1?"s":"")+" in Inbox",4000);
      }
    }else if(!opts.silent){
      showToast(candidates.length?"No new Plaud recordings to import":"No recent Plaud recordings found",4000);
    }
  }catch(e){
    if(!opts.silent)showToast("Plaud pull failed: "+e.message,7000);
    console.log("plaud pull",e);
  }finally{
    plaudPullInFlight=false;
    renderPlaudSettingsUI();
  }
}
function getInboxItems(){try{return JSON.parse(localStorage.getItem("fp_inbox")||"[]");}catch(e){return[];}}
function saveInboxItems(items){try{localStorage.setItem("fp_inbox",JSON.stringify(items));}catch(e){showToast("Could not save Inbox item",5000);}renderInboxBadge();if(typeof renderInbox==="function")renderInbox();startInboxPollIfNeeded();}
var inboxPollTimer=null;
function startInboxTranscriptPolling(){
  if(inboxPollTimer)return;
  pollInboxTranscripts();
  inboxPollTimer=setInterval(pollInboxTranscripts,8000);
}
function stopInboxTranscriptPolling(){
  if(inboxPollTimer){clearInterval(inboxPollTimer);inboxPollTimer=null;}
}
function startInboxPollIfNeeded(){
  var needs=getInboxItems().some(function(i){return i.assemblyTranscriptId&&i.status==="transcribing";});
  if(needs)startInboxTranscriptPolling();
  else stopInboxTranscriptPolling();
}
async function pollInboxTranscripts(){
  var items=getInboxItems();
  var pending=items.filter(function(i){return i.assemblyTranscriptId&&i.status==="transcribing";});
  if(!pending.length){stopInboxTranscriptPolling();return;}
  var changed=false;
  for(var pi=0;pi<pending.length;pi++){
    var item=pending[pi];
    try{
      var r=await fetch(INBOX_TRANSCRIPT_URL,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({transcript_id:item.assemblyTranscriptId})});
      var txt=await r.text();
      var d={};try{d=JSON.parse(txt);}catch(e){}
      if(d.status==="completed"&&d.transcript){
        item.transcript=String(d.transcript).trim();
        item.status="ready";
        item.pipelineMessage="";
        item.error="";
        changed=true;
        showToast("Transcript ready — "+(item.title||item.filename||"recording"),4000);
      }else if(d.status==="error"){
        item.status="ready";
        item.error=d.error||"Transcription failed";
        item.pipelineMessage="Paste Plaud transcript manually or re-upload audio";
        changed=true;
        showToast("Transcription failed — paste transcript manually",6000);
      }
    }catch(e){console.log("inbox transcript poll",e);}
  }
  if(changed)saveInboxItems(items);
}
function inboxDealFieldsFromSel(){
  if(!A.sel)return{dealId:null,dealName:"",accountName:"",status:"ready"};
  var acct=A.sel.Account_Name;
  return{
    dealId:A.sel.id,
    dealName:A.sel.Deal_Name||"",
    accountName:typeof acct==="object"?acct.name||"":acct||"",
    status:"linked"
  };
}
function openDealPickerModal(){
  if(!A.deals.length){showToast("No deals loaded",4000);return;}
  var title=el("inbox-deal-picker-title");
  if(title){
    if(A.inboxPickerItemId)title.textContent="Link to Deal";
    else if(A.dealPickerContext==="assets")title.textContent="Pick deal for new asset";
    else title.textContent="Select Deal";
  }
  var accounts=Array.from(new Set(A.deals.map(function(d){return d.Account_Name;}).filter(Boolean))).sort();
  var stages=Array.from(new Set(A.deals.map(function(d){return d.Stage;}).filter(Boolean))).sort();
  var fA=el("inbox-d-acct"),fS=el("inbox-d-stage"),fQ=el("inbox-d-search");
  var ca=fA?fA.value:"",cs=fS?fS.value:"",cq=fQ?fQ.value:"";
  if(fA)fA.innerHTML="<option value=''>All Accounts</option>"+accounts.map(function(a){return"<option value='"+esc(a)+"'>"+esc(a)+"</option>";}).join("");
  if(fS)fS.innerHTML="<option value=''>All Stages</option>"+stages.map(function(s){return"<option value='"+esc(s)+"'>"+esc(s)+"</option>";}).join("");
  if(fA)fA.value=ca;if(fS)fS.value=cs;if(fQ)fQ.value=cq;
  var sb=el("inbox-d-sort-bar");
  if(sb){
    sb.innerHTML="";
    SORT_FIELDS.forEach(function(f){
      var btn=document.createElement("button");
      btn.className="sbtn"+(A.sortF===f.k?" on":"");
      btn.textContent=f.l+(A.sortF===f.k?(A.sortD==="asc"?" A":" D"):"");
      (function(fk){btn.onclick=function(){setInboxDealSort(fk);};})(f.k);
      sb.appendChild(btn);
    });
  }
  applyInboxDealPickerFilters();
  var m=el("inboxdealmodal");
  if(m){
    m.style.display="flex";
    initNoAutofill(m);
  }
}
function openInboxDealPicker(itemId){
  if(!A.deals.length){showToast("Refresh deals on Deals tab first",4000);go("deals");return;}
  A.inboxPickerItemId=itemId||null;
  A.dealPickerContext=A.inboxPickerItemId?"inbox":null;
  openDealPickerModal();
}
function closeInboxDealPicker(){
  A.inboxPickerItemId=null;
  A.dealPickerContext=null;
  var m=el("inboxdealmodal");if(m)m.style.display="none";
}
function setInboxDealSort(f){
  if(A.sortF===f)A.sortD=A.sortD==="asc"?"desc":"asc";
  else{A.sortF=f;A.sortD="asc";}
  var sb=el("inbox-d-sort-bar");
  if(sb){
    sb.innerHTML="";
    SORT_FIELDS.forEach(function(sf){
      var btn=document.createElement("button");
      btn.className="sbtn"+(A.sortF===sf.k?" on":"");
      btn.textContent=sf.l+(A.sortF===sf.k?(A.sortD==="asc"?" A":" D"):"");
      (function(fk){btn.onclick=function(){setInboxDealSort(fk);};})(sf.k);
      sb.appendChild(btn);
    });
  }
  applyInboxDealPickerFilters();
  if(typeof applyFilters==="function")applyFilters();
}
function applyInboxDealPickerFilters(){
  if(!A.deals.length)return;
  var q=(el("inbox-d-search")||{value:""}).value.toLowerCase();
  var acct=(el("inbox-d-acct")||{value:""}).value;
  var stage=(el("inbox-d-stage")||{value:""}).value;
  var filtered=A.deals.filter(function(d){
    return(!q||(d.Account_Name||"").toLowerCase().indexOf(q)>=0||(d.Description||"").toLowerCase().indexOf(q)>=0||(d.Deal_Name||"").toLowerCase().indexOf(q)>=0)&&(!acct||(d.Account_Name||"")===acct)&&(!stage||(d.Stage||"")===stage);
  }).sort(function(a,b){
    var va=a[A.sortF]||"",vb=b[A.sortF]||"";
    if(A.sortF==="Amount"){va=parseFloat(va)||0;vb=parseFloat(vb)||0;return A.sortD==="asc"?va-vb:vb-va;}
    return A.sortD==="asc"?String(va).localeCompare(String(vb)):String(vb).localeCompare(String(va));
  });
  var dc=el("inbox-d-count");if(dc)dc.textContent=filtered.length+" of "+A.deals.length+" deals";
  var dl=el("inbox-d-list");if(!dl)return;
  if(!filtered.length){dl.innerHTML="<div class='empty' style='padding:16px 0'><div class='e-sub'>No deals match your search</div></div>";return;}
  dl.innerHTML="";
  filtered.forEach(function(d){
    var sel=A.sel&&A.sel.id===d.id;var amt=fmtAmt(d.Amount);var own=ownerStr(d);
    var dc2=document.createElement("div");dc2.className="deal-card"+(sel?" sel":"");
    (function(did){dc2.onclick=function(){pickInboxDeal(did);};})(d.id);
    dc2.innerHTML="<div style='display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:2px'><div class='d-acct'>"+esc(d.Account_Name||"---")+"</div>"+(amt?"<div style='color:var(--green);font-weight:700;font-size:13px;flex-shrink:0;margin-left:8px'>"+amt+"</div>":"")+"</div><div class='d-deal'>"+esc(d.Deal_Name||"")+"</div><div class='d-meta'><span class='stage-pill'>"+esc(d.Stage||"")+"</span>"+(own?"<span style='font-size:11px;color:var(--dim)'>"+esc(own)+"</span>":"")+(d.Closing_Date?"<span style='font-size:11px;color:var(--dim)'>"+d.Closing_Date+"</span>":"")+"</div>"+(d.Description?"<div class='d-desc'>"+esc(d.Description)+"</div>":"");
    dl.appendChild(dc2);
  });
}
function pickInboxDeal(dealId){
  if(A.inboxPickerItemId){
    linkInboxToDeal(A.inboxPickerItemId,dealId);
    closeInboxDealPicker();
    return;
  }
  if(A.dealPickerContext==="assets"){
    selectDeal(dealId,{stayOnTab:"assets"});
    closeInboxDealPicker();
    applyAssetDealPick();
    return;
  }
  selectDeal(dealId,{stayOnTab:"inbox"});
  closeInboxDealPicker();
}
function linkInboxToActiveDeal(itemId){
  if(!A.sel){openInboxDealPicker(itemId);return;}
  linkInboxToDeal(itemId,A.sel.id);
}
function inboxStatusLabel(s){
  if(s==="transcribing")return"Transcribing";
  if(s==="ready")return"Ready for review";
  if(s==="linked")return"Deal linked";
  if(s==="pending_sync")return"Zoho Pending";
  if(s==="synced")return"Saved to Zoho";
  if(s==="received")return"Received";
  return"New";
}
function inboxStatusChip(item){
  var ok=item.status==="synced"||item.status==="linked";
  var warn=!ok&&item.status!=="pending_sync";
  return "<span class='h-chip "+(item.status==="synced"?"ok":item.status==="pending_sync"?"warn":ok?"ok":"warn")+"'>"+esc(inboxStatusLabel(item.status))+"</span>";
}
function inboxSaveButtonHtml(item,transcript){
  if(item.status==="synced")return "<button type='button' class='bs bsm' disabled>Saved to Zoho</button>";
  if(!item.dealId||!(item.summary||transcript))return"";
  if(item.status==="pending_sync")return "<button class='bp bsm' onclick='saveInboxToZoho(\""+esc(item.id)+"\")'>Retry Save to Zoho</button>";
  return "<button class='bp bsm' onclick='saveInboxToZoho(\""+esc(item.id)+"\")'>Save to Zoho</button>";
}
function renderInboxBadge(){
  var unlinked=getInboxItems().filter(function(i){return!i.dealId&&i.status!=="synced";}).length;
  badge("tb-inbox",unlinked||"");
}
function renderInbox(){
  updateInboxDealUI();
  var box=el("inbox-list"),st=el("inbox-status"),ps=el("plaud-inbox-status");
  var items=getInboxItems().slice().sort(function(a,b){return new Date(b.created)-new Date(a.created);});
  renderInboxBadge();
  if(ps){
    if(isPlaudConnected()){
      var pt=getPlaudTokens()||{};
      ps.textContent="Plaud connected"+(pt.email?" — "+pt.email:"")+(isPlaudAutoPullEnabled()?" · auto-pull every 3 min":" · auto-pull paused");
      ps.style.color="var(--green)";
    }else{
      ps.textContent="Plaud not connected — Settings → Plaud Cloud Sync to enable auto-pull";
      ps.style.color="var(--dim)";
    }
  }
  if(st)st.textContent=items.length?items.length+" inbox item"+(items.length!==1?"s":""):"No recordings yet — pull from Plaud, upload audio, or add a manual note.";
  if(!box)return;
  if(!items.length){box.innerHTML="<div class='empty'><div class='e-icon'>&#128236;</div><div class='e-title'>Inbox Empty</div><div class='e-sub'>Plaud calls and unassigned voice land here</div></div>";return;}
  box.innerHTML=items.map(function(item){
    var ds=new Date(item.created).toLocaleString();
    var dealLine=item.dealId?(esc(item.accountName||"")+" — "+esc(item.dealName||"Deal")):"<span style='color:#92400e'>No deal linked</span>";
    var transcript=(item.transcript||"").trim();
    var preview=transcript?esc(transcript.substring(0,180))+(transcript.length>180?"…":""):"<span style='color:var(--dim);font-style:italic'>No transcript yet — Plaud auto-pull, paste from MCP, or upload audio</span>";
    var summary=(item.summary||"").trim();
    return "<div class='hist-card inbox-card' data-inbox-id='"+esc(item.id)+"'>"+
      "<div class='h-acct'>"+esc(item.title||item.filename||"Recording")+"</div>"+
      "<div class='h-meta'>"+ds+" — "+esc(item.source||"upload")+"</div>"+
      "<div style='font-size:12px;margin:6px 0'>"+dealLine+"</div>"+
      "<div class='h-status'>"+inboxStatusChip(item)+"</div>"+
      "<div style='font-size:12px;color:var(--sub);margin:8px 0;line-height:1.5;white-space:pre-wrap'>"+preview+"</div>"+
      (summary?"<div style='font-size:12px;color:#14532d;background:#f0fdf4;border:1px solid #86efac;border-radius:6px;padding:8px;margin-bottom:8px;white-space:pre-wrap'>"+esc(summary.substring(0,400))+(summary.length>400?"…":"")+"</div>":"")+
      (item.status==="transcribing"?"<div style='font-size:12px;color:#1e40af;background:#eff6ff;border:1px solid #93c5fd;border-radius:6px;padding:8px;margin-bottom:8px'>AssemblyAI transcribing… transcript will appear automatically (usually 1–3 min).</div>":"")+
      (item.status==="synced"?"<div style='font-size:12px;color:#166534;background:#f0fdf4;border:1px solid #86efac;border-radius:6px;padding:8px;margin-bottom:8px'>Saved to Zoho — deal note filed"+(item.zohoSavedAt?" on "+esc(new Date(item.zohoSavedAt).toLocaleString()):"")+".</div>":"")+
      (item.status==="pending_sync"?"<div style='font-size:12px;color:#92400e;background:#fffbeb;border:1px solid #fcd34d;border-radius:6px;padding:8px;margin-bottom:8px'>Zoho save queued — retry when signal improves or use Pending Sync in Settings.</div>":"")+
      (item.error&&item.status!=="transcribing"?"<div style='font-size:12px;color:#92400e;background:#fffbeb;border:1px solid #fcd34d;border-radius:6px;padding:8px;margin-bottom:8px'>"+esc(item.error)+(item.pipelineMessage?" — "+esc(item.pipelineMessage):"")+"</div>":"")+
      "<div class='h-action-group'><div class='h-action-label'>Review</div><div class='h-acts'>"+
      "<button class='bg bsm' onclick='editInboxTranscript(\""+esc(item.id)+"\")'>Edit Transcript</button>"+
      (item.dealId?"":"<button class='bp bsm' onclick='linkInboxToDealPrompt(\""+esc(item.id)+"\")'>Link to Deal</button>")+
      (item.dealId||!A.sel?"":"<button class='bb bsm' onclick='linkInboxToActiveDeal(\""+esc(item.id)+"\")'>Use Active Deal</button>")+
      (transcript?"<button class='bs bsm' onclick='generateInboxSummary(\""+esc(item.id)+"\")'>Generate Summary</button>":"")+
      inboxSaveButtonHtml(item,transcript)+
      "<button class='bd bsm' onclick='deleteInboxItem(\""+esc(item.id)+"\")'>Remove</button>"+
      "</div></div></div>";
  }).join("");
}
function addInboxManualNote(){
  var title=prompt("Manual note title (e.g. Phone call with customer):","Manual note");
  if(title===null)return;
  var transcript=prompt("Paste transcript or rough notes:","");
  if(transcript===null)return;
  var items=getInboxItems();
  var id="inbox"+Date.now();
  var dealFields=inboxDealFieldsFromSel();
  items.push({id:id,created:new Date().toISOString(),source:"manual",status:dealFields.status,title:title.trim()||"Manual note",transcript:transcript.trim(),filename:"",dealId:dealFields.dealId,dealName:dealFields.dealName,accountName:dealFields.accountName,summary:"",error:""});
  saveInboxItems(items);
  showToast(dealFields.dealId?"Manual note added and linked to active deal":"Manual note added to Inbox",2500);
  go("inbox");
}
async function inboxAudioSelected(input){
  var file=input&&input.files&&input.files[0];
  if(!file)return;
  input.value="";
  if(file.size>INBOX_AUDIO_MAX_BYTES){showToast("Audio file too large (max 5 MB for AssemblyAI upload)",6000);return;}
  showToast("Uploading audio for transcription...",3000);
  try{
    var b64=await new Promise(function(res,rej){
      var r=new FileReader();
      r.onload=function(){var p=String(r.result||"");res(p.indexOf(",")>=0?p.split(",")[1]:p);};
      r.onerror=rej;
      r.readAsDataURL(file);
    });
    var r=await fetchWithTimeout(INBOX_SUBMIT_URL,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({filename:file.name,source:"upload",audio_b64:b64})},120000);
    var txt=await r.text();
    var d={};try{d=JSON.parse(txt);}catch(e){}
    if(!r.ok||!d.ok)throw new Error(d.error||("Upload failed "+r.status));
    var dealFields=inboxDealFieldsFromSel();
    var transcribing=!!d.assemblyTranscriptId;
    var items=getInboxItems();
    items.push({
      id:d.id||("inbox"+Date.now()),
      created:new Date().toISOString(),
      source:"upload",
      status:transcribing?"transcribing":(dealFields.dealId?"linked":(d.status||"received")),
      title:file.name,
      filename:file.name,
      transcript:d.transcript||"",
      assemblyTranscriptId:d.assemblyTranscriptId||"",
      dealId:dealFields.dealId,dealName:dealFields.dealName,accountName:dealFields.accountName,summary:"",
      error:"",pipelineMessage:d.message||""
    });
    saveInboxItems(items);
    showToast(transcribing?"Transcribing with AssemblyAI…":(dealFields.dealId?"Audio added and linked to active deal":(d.message||"Audio added to Inbox")),4000);
    go("inbox");
  }catch(e){showToast("Upload failed: "+e.message,7000);}
}
function editInboxTranscript(itemId){
  var items=getInboxItems();
  var item=items.find(function(i){return i.id===itemId;});
  if(!item)return;
  var t=prompt("Edit transcript:",item.transcript||"");
  if(t===null)return;
  item.transcript=t.trim();
  item.status=item.transcript?"ready":item.status;
  saveInboxItems(items);
}
function linkInboxToDealPrompt(itemId){openInboxDealPicker(itemId);}
function linkInboxToDeal(itemId,dealId){
  var items=getInboxItems();
  var item=items.find(function(i){return i.id===itemId;});
  var deal=A.deals.find(function(d){return d.id===dealId;});
  if(!item||!deal)return;
  item.dealId=deal.id;
  item.dealName=deal.Deal_Name||"";
  item.accountName=typeof deal.Account_Name==="object"?deal.Account_Name.name||"":deal.Account_Name||"";
  item.status="linked";
  saveInboxItems(items);
  showToast("Linked to "+dealHeaderText(deal),3000);
}
async function generateInboxSummary(itemId){
  var items=getInboxItems();
  var item=items.find(function(i){return i.id===itemId;});
  if(!item||!(item.transcript||"").trim()){showToast("Add a transcript first",3000);return;}
  if(!API_KEY){enterKey();return;}
  showToast("Generating summary...",3000);
  try{
    var promptText="Turn this field-service transcript into a concise structured note for a Zoho CRM deal. Use professional language. Include: visit summary, work discussed, findings, and next steps if present. Do not invent facts.\n\nTranscript:\n"+item.transcript;
    var data=await callAPI({content:[{type:"text",text:promptText}],maxTok:1200,ms:60000});
    item.summary=getText(data).trim();
    saveInboxItems(items);
    showToast("Summary generated",2500);
    renderInbox();
  }catch(e){showToast("Summary failed: "+e.message,6000);}
}
async function saveInboxToZoho(itemId){
  var items=getInboxItems();
  var item=items.find(function(i){return i.id===itemId;});
  if(!item||!item.dealId){showToast("Link to a deal first",3000);return;}
  var body=(item.summary||item.transcript||"").trim();
  if(!body){showToast("Generate a summary or add a transcript first",3000);return;}
  showToast("Saving to Zoho...",3000);
  try{
    await refreshZohoToken();
    var title="CapStone Inbox — "+(item.dealName||"Deal")+" — "+new Date().toLocaleDateString();
    var content=body+"\n\n---\nSource: "+(item.source||"inbox")+"\nInbox item: "+item.id;
    var r=await fetchWithTimeout(PROXY,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"save_note",token:A.zohoToken,deal_id:item.dealId,note_title:title,note_content:content})},30000);
    if(!r.ok){var err=await r.text();throw new Error("Zoho save "+r.status+": "+err.substring(0,120));}
    item.status="synced";
    item.zohoSavedAt=new Date().toISOString();
    item.error="";
    saveInboxItems(items);
    showToast("Saved to Zoho",4000);
  }catch(e){
    item.status="pending_sync";
    item.error=e.message;
    saveInboxItems(items);
    enqueueReportNoteSave({
      action:"save_note",
      deal_id:item.dealId,
      note_title:"CapStone Inbox — "+(item.dealName||"Deal")+" — "+new Date().toLocaleDateString(),
      note_content:(item.summary||item.transcript||"")+"\n\nInbox: "+item.id
    },e.message);
    showToast("Queued for Pending Sync — retry in Settings",6000);
  }
}
function deleteInboxItem(itemId){
  if(!confirm("Remove this inbox item?"))return;
  saveInboxItems(getInboxItems().filter(function(i){return i.id!==itemId;}));
  showToast("Inbox item removed",2000);
}
function historyChip(label,ok){return "<span class='h-chip "+(ok?"ok":"warn")+"'>"+esc(label)+"</span>";}
function historyPendingCountForRecord(r){
  if(!r)return 0;
  return getPendingUploads().filter(function(i){
    if(r.dealId&&i.dealId===r.dealId)return true;
    if(r.id&&i.historyId===r.id)return true;
    return false;
  }).length;
}
function historyStatusHtml(r){
  var chips=[];
  if(r.captureInProgress||(!r.report&&r.photos>0))chips.push(historyChip("Capture Saved Locally",true));
  else if(r.report)chips.push(historyChip("Report Ready",true));
  chips.push(historyChip(r.zohoSaved?"Zoho Saved":"Zoho Pending",!!r.zohoSaved));
  chips.push(historyChip(r.dealPdfAttached||r.pdfSaved?"PDF Attached":"PDF Pending",!!(r.dealPdfAttached||r.pdfSaved)));
  var pending=historyPendingCountForRecord(r);
  if(pending)chips.push(historyChip(pending+" Pending Sync",false));
  if(r.technician)chips.push("<span class='h-chip'>Tech: "+esc(r.technician)+"</span>");
  if(r.deal)chips.push("<span class='h-chip'>Deal Linked</span>");
  return "<div class='h-status'>"+chips.join("")+"</div>";
}
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
      return "<div class='hist-card'><div class='h-acct'>"+esc(r.account)+"</div><div class='h-meta'>"+ds+(r.stage?" — "+esc(r.stage):"")+" — "+r.photos+" photo"+(r.photos!==1?"s":"")+(r.location?"<br>"+esc(r.location.substring(0,60)):"")+
      "</div>"+(r.deal?"<div style='font-size:12px;color:var(--sub);margin-bottom:6px'>"+esc(r.deal)+"</div>":"")+historyStatusHtml(r)+
      "<div class='h-action-group'><div class='h-action-label'>Continue</div><div class='h-acts'><button class='bs bsm' onclick='continueHist("+i+")'>Open + Continue</button><button class='bp bsm' onclick='viewHist("+i+")'>View</button></div><div class='h-action-label'>Share / Export</div><div class='h-acts'><button class='bpu bsm' onclick='shareHist("+i+")'>Share</button><button class='bg bsm' onclick='dlHistPDF("+i+")'>PDF</button></div><div class='h-action-label'>Manage</div><div class='h-acts'><button class='bg bsm' onclick='archiveHist("+i+")'>Archive</button></div></div></div>";
    }).join("");
    if(archived.length){
      html+="<div style='font-family:Barlow Condensed,sans-serif;font-size:11px;font-weight:700;color:var(--dim);letter-spacing:.1em;text-transform:uppercase;margin:16px 0 8px;padding-top:12px;border-top:1px solid var(--bdr)'>Archived ("+archived.length+")</div>";
      html+=archived.map(function(r){var i=hist.indexOf(r);var d=new Date(r.date);var ds=d.toLocaleDateString("en-US",{weekday:"short",month:"short",day:"numeric"})+" — "+d.toLocaleTimeString();
        return "<div class='hist-card' style='opacity:.7;border-style:dashed'><div class='h-acct'>"+esc(r.account)+"</div><div class='h-meta'>"+ds+" — "+r.photos+" photo"+(r.photos!==1?"s":"")+"</div>"+historyStatusHtml(r)+
        "<div class='h-action-group'><div class='h-action-label'>Review</div><div class='h-acts'><button class='bp bsm' onclick='viewHist("+i+")'>View</button><button class='bg bsm' onclick='dlHistPDF("+i+")'>PDF</button></div><div class='h-action-label'>Manage</div><div class='h-acts'><button class='bs bsm' onclick='unarchiveHist("+i+")'>Restore</button><button class='bd bsm' onclick='permDeleteHist("+i+")'>Delete</button></div></div></div>";
      }).join("");
    }
  }
  var hl=el("hist-list");if(hl)hl.innerHTML=html;
}
function viewHist(i){var h=getHistory();var r=h[i];if(!r)return;A.currentHistoryId=r.id;A.zohoNoteId=r.zohoNoteId||null;A.dealPdfAttached=!!r.dealPdfAttached;A.report=r.report;A.reportPhotos=r.photoData||[];A.lastSaveResult=r.zohoSaved?{note:true,dealPdf:!!(r.dealPdfAttached||r.pdfSaved),workdrive:!!r.pdfSaved,assets:0,warning:""}:null;setReportTechnician(r.technician||"");A.sel=dealFromRecord(r);A.location=restoreLocationFromRecord(r);updateDealUI();updateLocationUI();renderReport();updateCaptureModeStatus();go("report");}
function captureHistorySavedLabel(r){
  if(!r)return"";
  var t=r.localSavedAt||r.date;
  if(!t)return"";
  try{return new Date(t).toLocaleString();}catch(e){return String(t);}
}
function continueHist(i){
  var h=getHistory();var r=h[i];if(!r)return;
  if(!confirm("Open this project to continue?"))return;
  A.reportPhotos=r.photoData||[];A.photos=(r.photoData||[]).map(function(p){return{id:p.id,display:p.display,label:p.label||"",desc:p.desc,time:p.time,w:p.w||0,h:p.h||0,aiDesc:p.aiDesc||"",synthesis:p.synthesis||"",syncStatus:p.syncStatus||"not_synced",syncMessage:p.syncMessage||"",savedToPhone:!!p.savedToPhone,phoneFileName:p.phoneFileName||"",phoneSource:p.phoneSource||""};});
  A.report=r.report||"";
  setReportTechnician(r.technician||"");
  A.dealPdfAttached=!!r.dealPdfAttached;A.currentHistoryId=r.id;A.zohoNoteId=r.zohoNoteId||null;A.sel=dealFromRecord(r);A.location=restoreLocationFromRecord(r);updateDealUI();updateLocationUI();
  if(r.sections){SEC_IDS.forEach(function(id){var e=el(id);if(e&&r.sections[id])e.value=r.sections[id];});}
  if(r.voiceNotes){var ta=el("tx");if(ta)ta.value=r.voiceNotes;if(el("tx2"))el("tx2").value=r.voiceNotes;}
  renderPhotoCards();checkGen();updateCaptureModeStatus();
  var savedLabel=captureHistorySavedLabel(r);
  if(r.captureInProgress||!r.report){
    setCaptureDraftStatus("Opened from History"+(savedLabel?" — last saved locally "+savedLabel:"")+" — edits autosave to History");
    scheduleCaptureDraftSave();
    scheduleCaptureHistorySave();
  }else if(savedLabel){
    setCaptureDraftStatus("Opened from History — last saved "+savedLabel+". Edits autosave to History.");
    scheduleCaptureDraftSave();
    scheduleCaptureHistorySave();
  }
  go("capture");
}
function archiveHist(i){var h=getHistory();if(!h[i])return;h[i].archived=true;localStorage.setItem("fp_history",JSON.stringify(h));renderHistory();}
function unarchiveHist(i){var h=getHistory();if(!h[i])return;h[i].archived=false;localStorage.setItem("fp_history",JSON.stringify(h));renderHistory();}
function permDeleteHist(i){if(!confirm("Permanently delete?"))return;var h=getHistory();h.splice(i,1);localStorage.setItem("fp_history",JSON.stringify(h));renderHistory();}
function shareHist(i){var h=getHistory();var r=h[i];if(!r)return;A.report=r.report;setReportTechnician(r.technician||"");A.sel=dealFromRecord(r);A.location=restoreLocationFromRecord(r);openShare();}
async function dlHistPDF(i){var h=getHistory();var r=h[i];if(!r)return;var doc=buildPDF(r.report,dealFromRecord(r),r.photoData||[],restoreLocationFromRecord(r),r.technician||"");var acct=(r.account||"report").replace(/[^a-z0-9]/gi,"-").toLowerCase();doc.save("capstone-"+acct+"-"+new Date(r.date).toISOString().slice(0,10)+".pdf");}

// SETTINGS STORAGE
function getStorageSize(){var total=0;try{for(var k in localStorage){if(localStorage.hasOwnProperty(k))total+=localStorage[k].length+k.length;}}catch(e){}return(total*2/1024/1024).toFixed(2);}
function estimateCapturePhotoStorageMB(){
  var bytes=0;
  A.photos.forEach(function(p){bytes+=String(p.display||"").length;});
  return bytes*2/1024/1024;
}
function updateCaptureStorageWarning(){
  var box=el("capture-storage-warning");if(!box)return;
  var photoCount=A.photos.length;
  var photoMB=estimateCapturePhotoStorageMB();
  var totalMB=parseFloat(getStorageSize())||0;
  var reasons=[];
  if(photoCount>=CAPTURE_STORAGE_WARN_PHOTOS)reasons.push(photoCount+" photos in this capture");
  if(photoMB>=2.5)reasons.push("~"+photoMB.toFixed(1)+" MB of photo data");
  if(totalMB>=CAPTURE_STORAGE_WARN_MB)reasons.push(totalMB+" MB total browser storage used");
  if(!reasons.length){box.style.display="none";box.innerHTML="";return;}
  box.style.display="block";
  box.innerHTML="<strong>Storage getting full</strong> — "+reasons.join("; ")+". Use <strong>Save All Photos to Phone</strong>, export older History from Settings, or remove unused photos so poor signal does not block local saves.";
}
function updateStorageInfo(){var e=el("storage-info");if(!e)return;var h=getHistory();e.textContent=h.length+" reports — approx "+getStorageSize()+" MB used of 5 MB";updateCaptureStorageWarning();}
function renderCorrections(){var e=el("corrections-list");if(!e)return;}
function exportHistory(){var h=getHistory();if(!h.length){alert("No history");return;}var data=JSON.stringify({app:"CapStone",exported:new Date().toISOString(),version:1,history:h},null,2);var blob=new Blob([data],{type:"application/json"});var url=URL.createObjectURL(blob);var a=document.createElement("a");a.href=url;a.download="capstone-history-"+new Date().toISOString().slice(0,10)+".json";document.body.appendChild(a);a.click();document.body.removeChild(a);URL.revokeObjectURL(url);}
function importHistory(input){var file=input.files[0];if(!file)return;var reader=new FileReader();reader.onload=function(e){try{var data=JSON.parse(e.target.result);if(!data.history||!Array.isArray(data.history)){alert("Invalid file");return;}var existing=getHistory();var existingIds=new Set(existing.map(function(r){return r.id;}));var toAdd=data.history.filter(function(r){return!existingIds.has(r.id);});var merged=toAdd.concat(existing).sort(function(a,b){return new Date(b.date)-new Date(a.date);});localStorage.setItem("fp_history",JSON.stringify(merged));renderHistory();updateStorageInfo();alert("Imported "+toAdd.length+" reports.");}catch(err){alert("Could not read file");}};reader.readAsText(file);input.value="";}
function clearOldPhotos(){if(!confirm("Remove photos from reports older than 7 days?"))return;var h=getHistory();var cutoff=Date.now()-(7*24*60*60*1000);var count=0;h=h.map(function(r){if(new Date(r.date).getTime()<cutoff&&r.photoData&&r.photoData.some(function(p){return p.display;})){count++;r=Object.assign({},r);r.photoData=r.photoData.map(function(p){return{id:p.id,display:"",label:p.label||"",desc:p.desc,time:p.time,w:p.w,h:p.h,aiDesc:p.aiDesc,synthesis:p.synthesis};});}return r;});localStorage.setItem("fp_history",JSON.stringify(h));renderHistory();updateStorageInfo();alert("Removed photos from "+count+" older reports.");}
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
