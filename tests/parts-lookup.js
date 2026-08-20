// Checks for the v394 Parts Lookup assembly: the entire capture is turned into
// text, a photo can designate something as bad, History/other jobs are not
// inputs, and Claude-style image blocks become Gemini parts.
// Lift the helpers straight out of src/app.js — same pattern as
// tests/customer-copy-redaction.js. Run: node tests/parts-lookup.js
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
  var end=src.indexOf("\nasync function "+nextName+"(",start+1);
  if(end<0)end=src.indexOf("\nfunction "+nextName+"(",start+1);
  if(end<0)throw new Error("missing end marker "+nextName+" for "+name);
  return src.slice(start,end);
}
eval(sliceFn("partsPhotoNoteLines","partsLookupHasEvidence"));
eval(sliceFn("partsLookupHasEvidence","assemblePartsLookupText"));
eval(sliceFn("assemblePartsLookupText","partsHasLookupEvidence"));
eval(sliceFn("geminiPartsFromClaudeContent","callGeminiAPI"));

// --- photo notes carry every text block on the picture ----------------------
var notes=partsPhotoNoteLines([
  {label:"nameplate",desc:"Pen arm binding, replace",aiDesc:"Model number: DR4500A",synthesis:"- Serial: 6M-4471"}
]);
check("photo notes include the technician designation",notes[0].indexOf("Pen arm binding, replace")>=0,notes[0]);
check("photo notes include the label",notes[0].indexOf("Label: nameplate")>=0,notes[0]);
check("photo notes include the AI observation (nameplate number)",notes[0].indexOf("Model number: DR4500A")>=0,notes[0]);
check("photo notes include the AI synthesis",notes[0].indexOf("Serial: 6M-4471")>=0,notes[0]);
check("a photo with no text is omitted",partsPhotoNoteLines([{desc:""}]).length===0);

// --- evidence: written, spoken, or a photo of the failed part --------------
check("empty capture is not a lookup",!partsLookupHasEvidence({}));
check("a written deficiency is enough",partsLookupHasEvidence({deficiency:"Pen drive binding at mid-span"}));
check("work performed (section 3) is enough",partsLookupHasEvidence({otherSections:"3. Work Performed: Replaced cracked electrode"}));
check("a photo note is enough",partsLookupHasEvidence({photoNotes:"Photo 1:\n- Technician: cell will not span"}));
check("voice is enough",partsLookupHasEvidence({voice:"Need a new pen arm"}));
check("transcript is enough",partsLookupHasEvidence({transcript:"This cell is dead"}));
check("a photo of the failed part is enough even with no text",partsLookupHasEvidence({photoCount:1}));
check("a nameplate photo is enough",partsLookupHasEvidence({assetPhotoCount:2}));

// --- assembled text is this visit only -------------------------------------
var text=assemblePartsLookupText({
  deal:"Account: Rogers WWTP\nDeal: CAC-4641 recorder\nStage: Service",
  equipment:["Brand: Honeywell, Model: DR4500A, Serial: 6M-4471"],
  allSections:"6. Issues / Deficiencies: Pen drive binding at mid-span",
  photoNotes:"Photo 1:\n- Technician: replace the pen arm",
  voice:"Need the red pen kit",
  transcript:"Nameplate reads DR4500A",
  used:"Chart paper installed today",
  already:"- Door gasket already listed",
  imageCount:3
});
[
  "THIS VISIT ONLY",
  "Do not use a remembered catalog, a prior capture, History, or a shop parts database",
  "Search the live web",
  "ENTIRE CAPTURE",
  "Pen drive binding at mid-span",
  "replace the pen arm",
  "Need the red pen kit",
  "Nameplate reads DR4500A",
  "Honeywell",
  "DR4500A",
  "3 photo(s) from this visit are attached",
  "Chart paper installed today",
  "Door gasket already listed"
].forEach(function(v){
  check("assembled text carries "+JSON.stringify(v),text.indexOf(v)>=0,"got:\n"+text);
});
["fp_history","past capture","shop stock","Model_AI_Specs"].forEach(function(v){
  check("assembled text does not invite "+v,text.toLowerCase().indexOf(v.toLowerCase())<0,"got:\n"+text);
});
check("empty assemble still forbids past jobs",assemblePartsLookupText({}).indexOf("THIS VISIT ONLY")>=0);

// --- Gemini conversion keeps text callers working and sends images ----------
var asText=geminiPartsFromClaudeContent("hello");
check("a string stays one text part",asText.length===1&&asText[0].text==="hello",JSON.stringify(asText));
var mixed=geminiPartsFromClaudeContent([
  {type:"image",source:{type:"base64",media_type:"image/jpeg",data:"abc123"}},
  {type:"text",text:"Read the nameplate"},
  {type:"text",text:""},
  null
]);
check("images become inline_data",mixed[0].inline_data&&mixed[0].inline_data.data==="abc123"&&mixed[0].inline_data.mime_type==="image/jpeg",JSON.stringify(mixed[0]));
check("text follows the image",mixed[1]&&mixed[1].text==="Read the nameplate",JSON.stringify(mixed));
check("empty and null blocks are dropped",mixed.length===2,JSON.stringify(mixed));

// --- prompt and fetch keep the live-web / photo contract -------------------
check("system prompt reads this visit first",src.indexOf("READ THIS VISIT FIRST")>=0);
check("system prompt forbids past jobs",src.indexOf("never from a remembered catalog, a prior capture, History, a shop parts database")>=0);
check("system prompt searches the live internet",src.indexOf("THEN DO A DEEP WEB SEARCH of the live internet")>=0);
check("system prompt searches the nameplate code",src.indexOf("<full nameplate model/order code>")>=0);
check("Claude search uses were raised",src.indexOf("var PARTS_LOOKUP_SEARCH_USES=10;")>=0);
check("payload attaches photos",src.indexOf("async function appendPartsLookupImages(")>=0);
check("Gemini fetch sends the multimodal payload",/callGeminiAPI\(\{sys:PARTS_LOOKUP_SYSTEM_PROMPT,content:content/.test(src));
check("queued retry keeps photo ids",src.indexOf("photoIds:item.photoIds,assetPhotoIds:item.assetPhotoIds")>=0);

if(failed){
  console.error(failed+" failed, "+passed+" passed");
  process.exit(1);
}
console.log(passed+" passed");
