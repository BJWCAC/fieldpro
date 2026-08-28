// Checks for the v398 copy-visit-to-other-deals helpers: a History record
// cloned onto another deal is independent (new id, new deal, no Zoho/PDF
// linkage) and shared photo/video blob keys are not deleted while another
// record still shows them. Run: node tests/copy-capture-to-deals.js
var fs=require("fs");
var path=require("path");
var src=fs.readFileSync(path.join(__dirname,"../src/app.js"),"utf8");
var failed=0,passed=0;
function check(name,cond,detail){
  if(cond){passed++;return;}
  failed++;
  console.error("FAIL: "+name+(detail?"\n  "+detail:""));
}
function sliceFn(name,nextName){
  var start=src.indexOf("function "+name+"(");
  if(start<0)throw new Error("missing "+name);
  var end=src.indexOf("\nfunction "+nextName+"(",start+1);
  if(end<0)end=src.indexOf("\nasync function "+nextName+"(",start+1);
  if(end<0)throw new Error("missing end marker "+nextName+" for "+name);
  return src.slice(start,end);
}
eval(sliceFn("newHistoryId","cloneHistoryRecordForDeal"));
eval(sliceFn("cloneHistoryRecordForDeal","historyRecordActiveBlobKeys"));
eval(sliceFn("historyRecordActiveBlobKeys","historyRecordsActiveBlobKeySet"));
eval(sliceFn("historyRecordsActiveBlobKeySet","unreferencedHistoryBlobKeys"));
eval(sliceFn("unreferencedHistoryBlobKeys","deleteUnreferencedHistoryBlobs"));

var source={
  id:"r-source",
  dealId:"deal-a",
  account:"Rogers WWTP",
  deal:"CAC-4641 recorder",
  stage:"Site Visit",
  location:"Basin 12",
  locationData:{lat:45.1,lng:-93.2,address:"Rogers WWTP"},
  photos:2,
  photoData:[
    {id:"p1",display:"data:image/jpeg;base64,aaa",idb:1,label:"nameplate",desc:"Pen arm",aiDesc:"DR4500A",synthesis:"Replaced"},
    {id:"p2",display:"",idb:1,label:"install",desc:"After"}
  ],
  videos:[{id:"v1",vidKey:"vid-1",audioKey:"aud-1"}],
  videoId:"legacy-vid",
  report:"Calibrated the recorder at Basin 12.",
  voiceNotes:"Pen arm binding",
  sections:{sec6:"Pen drive binding",sec10:"Red pen kit"},
  parts:[{name:"Pen arm",partNumber:"51404671-501",selected:true}],
  partsMeta:{provider:"gemini"},
  technician:"Quintin",
  copyType:"customer",
  copyLabel:"Customer Copy",
  zohoNoteId:"note-99",
  zohoSaved:true,
  dealPdfAttached:true,
  dealPdfAttachments:{"Customer Copy":"att-1"},
  pdfSaved:true,
  workdrivePdfUrl:"https://workdrive.example/file/1"
};
var dealB={id:"deal-b",Account_Name:"Rogers WWTP",Deal_Name:"CAC-4642 analyzer",Stage:"Scheduled",Amount:1200,Closing_Date:"2026-08-30"};

var copy=cloneHistoryRecordForDeal(source,dealB,{id:"r-copy",now:"2026-08-26T12:00:00.000Z"});
check("clone returns a record",!!copy);
check("clone has a new History id",copy.id==="r-copy",copy&&copy.id);
check("clone points at the target deal",copy.dealId==="deal-b"&&copy.deal==="CAC-4642 analyzer",JSON.stringify(copy&&{dealId:copy.dealId,deal:copy.deal}));
check("clone keeps the account and stage from the target",copy.account==="Rogers WWTP"&&copy.stage==="Scheduled");
check("clone keeps the report text",copy.report===source.report);
check("clone keeps voice notes and sections",copy.voiceNotes===source.voiceNotes&&copy.sections.sec6==="Pen drive binding");
check("clone keeps parts without sharing the array",copy.parts[0].partNumber==="51404671-501"&&copy.parts!==source.parts);
check("clone keeps photo bytes under the same ids",copy.photoData[0].id==="p1"&&copy.photoData[0].display===source.photoData[0].display);
check("clone does not share the photo array",copy.photoData!==source.photoData&&copy.photoData[0]!==source.photoData[0]);
check("clone keeps the copy name",copy.copyType==="customer"&&copy.copyLabel==="Customer Copy");
check("clone is not linked to the original Zoho note",copy.zohoNoteId==null&&copy.zohoSaved===false);
check("clone is not marked as already attached to the target deal",copy.dealPdfAttached===false&&copy.pdfSaved===false&&copy.workdrivePdfUrl==null);
check("clone remembers where it came from",copy.copiedFromId==="r-source");
check("clone with a report is not in-progress",copy.captureInProgress===false);
check("missing source or deal returns null",cloneHistoryRecordForDeal(null,dealB)==null&&cloneHistoryRecordForDeal(source,{Account_Name:"x"})==null);

var inProgress=cloneHistoryRecordForDeal({id:"r-open",voiceNotes:"notes only"},dealB,{id:"r-open-copy"});
check("a capture without a report stays in progress",inProgress.captureInProgress===true);

var used=unreferencedHistoryBlobKeys(["p1","p2","vid-1","gone"],[copy,source]);
check("shared photo keys stay while any record still shows them",used.indexOf("p1")<0&&used.indexOf("p2")<0&&used.indexOf("vid-1")<0,JSON.stringify(used));
check("a key no record shows is unused",used.indexOf("gone")>=0,JSON.stringify(used));

var afterDelete=unreferencedHistoryBlobKeys(["p1","p2","vid-1","legacy-vid"],[copy]);
check("deleting the original does not free blobs the copy still shows",afterDelete.length===0,JSON.stringify(afterDelete));

var stripped={id:"r-old",photoData:[{id:"p1",display:"",idb:0}],videos:[]};
var afterStrip=unreferencedHistoryBlobKeys(["p1"],[stripped,copy]);
check("clearing an old record keeps blobs a newer copy still shows",afterStrip.length===0,JSON.stringify(afterStrip));
var afterBothGone=unreferencedHistoryBlobKeys(["p1"],[stripped]);
check("a blob is unused once no record still shows it",afterBothGone.indexOf("p1")>=0,JSON.stringify(afterBothGone));

check("Copy to Deals is on History cards",src.indexOf("copyHistToDeals(")>=0);
check("Capture and Report both open the copy picker",src.indexOf("function openCopyCaptureDealPicker(")>=0);
check("Zoho save of copies restores the original visit",src.indexOf("saveCopiedHistoryRecordsToZoho")>=0&&src.indexOf("loadHistoryRecordIntoCapture(back)")>=0);
check("permDeleteHist does not delete shared blobs",src.indexOf("deleteUnreferencedHistoryBlobs(ids,h)")>=0);
check("clearOldPhotos does not delete shared blobs",src.indexOf("deleteUnreferencedHistoryBlobs(delIds,h)")>=0);

if(failed){
  console.error("\n"+failed+" failed, "+passed+" passed");
  process.exit(1);
}
console.log(passed+" passed");
