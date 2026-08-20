// Replacement part research checks (see docs/CAPSTONE_DEVELOPMENT_RULES.md).
//
// A report that says a part was replaced, or has to be, must come back with the
// manufacturer's replacement part number written into section 9, Materials /
// Parts Used. Three things are checked here: that a report which needs a part
// is noticed and one that does not is left alone, that the researched lines are
// read out of the model's answer without its preamble, and that the block lands
// in the parts section — once, wherever the report put that section, without
// disturbing what the report already wrote there.
//
//   node tests/replacement-part-research.js
//
// The blocks are lifted out of src/app.js so the app stays a single browser
// file with no module system.
var fs=require("fs");
var path=require("path");

var src=fs.readFileSync(path.join(__dirname,"..","src","app.js"),"utf8");
function slice(start,end,label){
  var a=src.indexOf(start),b=src.indexOf(end);
  if(a<0||b<0||b<=a){console.error("Could not find the "+label+" block in src/app.js");process.exit(1);}
  return src.slice(a,b);
}
// The customer copy filter comes along because the codes a parts lookup works
// from are read with it, and because the researched lines have to survive it.
eval(slice("var CUSTOMER_COPY_GAP","function customerCopyRedactionCount()","customer copy"));
eval(slice("var SEC_LABELS=","var SORT_FIELDS=","section labels"));
eval(slice("function isModelAiSpecsSkip(","function isValidGeminiApiKey(","SKIP reply"));
eval(slice("var REPLACEMENT_PART_BLOCK_LEAD","// GENERATE","replacement part"));

var failures=[],checks=0;
function check(name,ok,detail){
  checks++;
  if(ok)return;
  failures.push(name+(detail?"\n    "+detail:""));
}
function eq(name,got,want){
  check(name,got===want,"got:  "+JSON.stringify(got)+"\n    want: "+JSON.stringify(want));
}

// --- noticing that a part is involved ---------------------------------------
// The field wording for deal 4641: the pen arm was replaced and the chart paper
// has to be. Every one of these has to reach the lookup.
["The DR4500A pen drive was binding at mid-span and the pen arm was replaced.",
 "Pen arm P/N 51404671-501 was replaced.",
 "Recommend replacing the chart paper before the next visit.",
 "The recorder needs a new pen.",
 "Recorder is out of chart paper.",
 "Requires a new pen assembly.",
 "Pen tip is worn and skipping on the chart.",
 "The pen well cap was cracked.",
 "Ordered a replacement pen kit.",
 "Installed a new drive belt.",
 "The DR4500A is discontinued; recorder swap quoted.",
 "Sensor cap is expired and reading low.",
 "Stock two spare pen assemblies.",
 "Rebuilt the pen carriage.",
 "Chart drive motor seized."].forEach(function(line){
  check("notices a part is needed: "+line,replacementPartIntentLines(line).length===1,
    JSON.stringify(replacementPartIntentLines(line)));
});
// A visit where nothing was replaced must not spend a search.
["Annual calibration of the circular chart recorder completed.",
 "As-found error 1.8% of span at 50%; as-left 0.2%.",
 "Loop verified at 4.00 mA, 12.01 mA, 19.98 mA.",
 "Chart speed verified at 1 in/hr and the recorder passed.",
 "Calibrated with a Fluke 754 documenting calibrator, cal due 2027-02-14.",
 "Work order 44821 closed on job CAC-4641.",
 "Site contact confirmed access to the influent building."].forEach(function(line){
  check("leaves a report with no part alone: "+line,replacementPartIntentLines(line).length===0,
    JSON.stringify(replacementPartIntentLines(line)));
});
// Headings are the report's own scaffolding, and the block's own lead line is
// not a finding either.
check("a heading is not a finding",replacementPartIntentLines("## 9. Materials / Parts Used").length===0);
check("the block's lead line is not a finding",replacementPartIntentLines(REPLACEMENT_PART_BLOCK_LEAD).length===0);
check("the same line is only sent once",
  replacementPartIntentLines(["Pen arm was replaced.","Pen arm was replaced."].join("\n")).length===1);
var manyLines=[];for(var i=0;i<40;i++)manyLines.push("Pen arm "+i+" was replaced.");
check("the lookup is not handed the whole report",
  replacementPartIntentLines(manyLines.join("\n")).length===REPLACEMENT_PART_MAX_INTENT_LINES,
  String(replacementPartIntentLines(manyLines.join("\n")).length));

// --- the instrument's own numbers, read out of the report --------------------
// This is the lookup's input when no asset was saved on the Assets tab: the
// customer copy filter finds an identifier in field prose, and the same reader
// is used here in the opposite direction.
function codesFor(text){return replacementPartReportCodes(text).join(" | ");}
check("reads a labeled model out of the report",
  /DR4500A/.test(codesFor("Chart recorder model: Honeywell DR4500A")),codesFor("Chart recorder model: Honeywell DR4500A"));
check("reads an unlabeled model out of the report",
  /DR4500A/.test(codesFor("Replaced the pen arm on the Honeywell DR4500A chart recorder.")),
  codesFor("Replaced the pen arm on the Honeywell DR4500A chart recorder."));
check("reads a part number out of the report",
  /51404671-501/.test(codesFor("Pen arm P/N 51404671-501 was replaced.")),codesFor("Pen arm P/N 51404671-501 was replaced."));
check("reads a serial out of the report",
  /6M-4471/.test(codesFor("Recorder serial 6M-4471 verified.")),codesFor("Recorder serial 6M-4471 verified."));
// Readings, tags, and job numbers are not instrument identity, and a price is
// not an identifier at all.
["Loop verified at 4-20 mA on 0-150 in H2O.","Recorder is in panel LCP-3 on loop FIT-101.",
 "Work order 44821 closed; purchase order 7781 referenced.","As-left error 0.2% of span at 1 in/hr."].forEach(function(line){
  check("a reading is not an identifier: "+line,replacementPartReportCodes(line).length===0,codesFor(line));
});
check("a price is not an identifier",!/412/.test(codesFor("Quoted $412.00 for the pen kit.")),codesFor("Quoted $412.00 for the pen kit."));
check("no report means no codes",replacementPartReportCodes("").length===0);

// --- reading the researched lines out of the model's answer ------------------
var answer=["Here are the replacement parts I found:",
  "1. **Chart paper**, 12 in circular, fits the Honeywell DR4500A — Part number: 24001660-001 (Honeywell; box of 100; source: honeywell.com)",
  "- Pen arm assembly, purple, fits the Honeywell DR4500A — Part number: 51404671-501 (Honeywell; sold singly; source: honeywell.com)",
  "",
  "Let me know if you need anything else."].join("\n");
var parsed=parseReplacementPartLines(answer);
eq("the preamble is not a part",parsed.length,2);
check("the bullet is normalized",parsed.every(function(l){return l.indexOf("- ")===0;}),JSON.stringify(parsed));
check("the numbering is stripped",parsed[0].indexOf("1.")<0,parsed[0]);
check("markdown bold is stripped",parsed.join("").indexOf("*")<0,JSON.stringify(parsed));
check("the part number keeps its label",/Part number: 24001660-001/.test(parsed[0]),parsed[0]);
check("a closing remark is not a part",parsed.join("").indexOf("Let me know")<0,JSON.stringify(parsed));
eq("SKIP yields no parts",parseReplacementPartLines("SKIP").length,0);
eq("a stray-punctuation SKIP yields no parts",parseReplacementPartLines("\"SKIP.\"").length,0);
eq("a heading is not a part",parseReplacementPartLines("## Parts").length,0);
eq("a repeated line is listed once",
  parseReplacementPartLines(["- Chart paper — Part number: 24001660-001","- Chart paper — Part number: 24001660-001"].join("\n")).length,1);
var overrun=[];for(i=0;i<12;i++)overrun.push("- Part "+i+" — Part number: 2400166"+i+"-001");
eq("the list is capped",parseReplacementPartLines(overrun.join("\n")).length,REPLACEMENT_PART_MAX_ITEMS);

// --- where the block lands --------------------------------------------------
var partLines=["- Chart paper, 12 in circular, fits the Honeywell DR4500A — Part number: 24001660-001 (Honeywell; box of 100; source: honeywell.com)"];
var withSection=["## 3. Work Performed","Replaced the pen arm.","",
  "## 9. Materials / Parts Used","- Chart paper, 12 rolls on hand","",
  "## KEY POINTS SUMMARY","- Pen arm replaced"].join("\n");
var merged=mergeReplacementPartsIntoReport(withSection,partLines);
eq("the block joins the parts section the report already wrote",merged,
  ["## 3. Work Performed","Replaced the pen arm.","",
   "## 9. Materials / Parts Used","- Chart paper, 12 rolls on hand",REPLACEMENT_PART_BLOCK_LEAD,partLines[0],"",
   "## KEY POINTS SUMMARY","- Pen arm replaced"].join("\n"));
var noSection=["## 3. Work Performed","Replaced the pen arm.","",
  "## KEY POINTS SUMMARY","- Pen arm replaced"].join("\n");
eq("a report with no parts section gets one, ahead of the summary",mergeReplacementPartsIntoReport(noSection,partLines),
  ["## 3. Work Performed","Replaced the pen arm.","",
   "## 9. Materials / Parts Used",REPLACEMENT_PART_BLOCK_LEAD,partLines[0],"",
   "## KEY POINTS SUMMARY","- Pen arm replaced"].join("\n"));
var noSummary=["## 3. Work Performed","Replaced the pen arm."].join("\n");
eq("a report with no summary gets the section at the end",mergeReplacementPartsIntoReport(noSummary,partLines),
  ["## 3. Work Performed","Replaced the pen arm.","",
   "## 9. Materials / Parts Used",REPLACEMENT_PART_BLOCK_LEAD,partLines[0]].join("\n"));
// However the model wrote the heading, the parts go under it rather than into a
// second parts section of their own.
["## 9. Materials / Parts Used","## MATERIALS / PARTS USED","## Parts Used","## 9. Materials and Parts",
 "### Consumables","## Materials"].forEach(function(heading){
  var report=[heading,"- Chart paper, 12 rolls","","## KEY POINTS SUMMARY","- Done"].join("\n");
  var out=mergeReplacementPartsIntoReport(report,partLines);
  check("the block goes under "+heading,out.indexOf("## 9. Materials / Parts Used\n"+REPLACEMENT_PART_BLOCK_LEAD)<0&&
    out.split(REPLACEMENT_PART_BLOCK_LEAD).length===2&&out.indexOf(heading)>=0,"got:\n"+out);
});
check("a report that carries the block says so",reportHasReplacementPartBlock(merged));
check("a report without it does not",!reportHasReplacementPartBlock(withSection));
eq("no researched parts leaves the report untouched",mergeReplacementPartsIntoReport(withSection,[]),withSection);

// --- researching twice replaces the list ------------------------------------
var second=["- Pen arm assembly, fits the Honeywell DR4500A — Part number: 51404671-501 (Honeywell; sold singly; source: honeywell.com)"];
eq("the second lookup replaces the first block",mergeReplacementPartsIntoReport(merged,second),
  mergeReplacementPartsIntoReport(withSection,second));
eq("taking the block back restores the report",stripReplacementPartBlock(merged),withSection);
eq("taking back a block whose section was added restores the report too",
  stripReplacementPartBlock(mergeReplacementPartsIntoReport(noSection,partLines)),noSection);
eq("and at the end of the report",
  stripReplacementPartBlock(mergeReplacementPartsIntoReport(noSummary,partLines)),noSummary);
eq("a report that never had a block is untouched",stripReplacementPartBlock(withSection),withSection);
check("three lookups do not stack",
  mergeReplacementPartsIntoReport(mergeReplacementPartsIntoReport(merged,second),partLines)
    .split(REPLACEMENT_PART_BLOCK_LEAD).length===2);

// --- the block is report text, so a customer copy filters it -----------------
// Nothing here filters anything: the block goes into the report body, which is
// what buildPDF() and buildReportExportText() filter. What matters is that the
// researched line still reads once its number is gone.
var copy=redactCustomerCopyText(mergeReplacementPartsIntoReport(withSection,partLines).replace(/\u0001/g,""));
["24001660-001","DR4500A"].forEach(function(v){
  check("a customer copy withholds the researched "+v,copy.text.indexOf(v)<0,"got:\n"+copy.text);
});
["Chart paper","12 in circular","Honeywell","box of 100","honeywell.com",REPLACEMENT_PART_BLOCK_LEAD].forEach(function(v){
  check("a customer copy keeps "+v,copy.text.indexOf(v)>=0,"got:\n"+copy.text);
});
check("the researched line says nothing about what was withheld",
  !/not shown|withheld|redact|omitted|\bn\/a\b|\[|\]|\u0001/i.test(copy.text),"got:\n"+copy.text);
copy.text.split("\n").forEach(function(line){
  // The block's own lead line introduces the list, so its colon is the label's,
  // not a separator a removed value left behind.
  var lead=line.trim()===REPLACEMENT_PART_BLOCK_LEAD;
  check("the researched line reads clean: "+JSON.stringify(line),
    !/ {2,}/.test(line)&&!/\s[,;:.!?]/.test(line)&&(lead||!/[,;:\-–—]$/.test(line))&&!/^\s*[-*]\s*$/.test(line));
});
// Which is only true because a line the copy would empty out is never treated
// as a part in the first place: the label must never stand over an empty list.
["- Part number: 24001660-001","- 24001660-001","- Model: Honeywell DR4500A"].forEach(function(line){
  eq("a line that is only a number is not a part: "+line,parseReplacementPartLines(line).length,0);
});
// A line the lookup could not put a number on carries no hole either.
var noNumber=["- Pen arm assembly, fits the Honeywell DR4500A — order through Honeywell quoting the recorder's serial number"];
var noNumberCopy=redactCustomerCopyText(mergeReplacementPartsIntoReport(withSection,noNumber));
check("a part with no number survives the copy",
  noNumberCopy.text.indexOf("order through Honeywell quoting the recorder's serial number")>=0,"got:\n"+noNumberCopy.text);

// --- what the report prompt is told about the instrument ---------------------
// The report never saw the instrument's numbers before, which is why it could
// not name a part to research. Every value goes in labeled, the same way the
// report prompt asks the model to write one.
var identityText=replacementPartIdentityText([{brand:"Honeywell",brandOther:"",type:"Chart Recorder",series:"DR4500",
  model:"DR4500AY-1000-0-0-0",serial:"6M-4471",category:"General",name:"Influent chart recorder",nameplate:"120 VAC, 12 in chart"}]);
["Brand: Honeywell","Model/order number: DR4500AY-1000-0-0-0","Serial: 6M-4471","Type: Chart Recorder",
 "Series: DR4500","Nameplate details: 120 VAC, 12 in chart"].forEach(function(v){
  check("the instrument goes to the report labeled: "+v,identityText.indexOf(v)>=0,identityText);
});
eq("no instrument means nothing to say",replacementPartIdentityText([]),"");

// --- the lookup's own prompt -------------------------------------------------
// The two rules the customer copy and the calibration rules both depend on.
check("the lookup is told to search before it answers",/DEEP WEB SEARCH/.test(REPLACEMENT_PART_SYSTEM_PROMPT));
check("the lookup is told never to invent a number",/NEVER invent, guess, or pattern-match a part number/.test(REPLACEMENT_PART_SYSTEM_PROMPT));
check("the lookup is told to label every number",/Part number: <value>/.test(REPLACEMENT_PART_SYSTEM_PROMPT));
check("the lookup is told to write no placeholder",/never write a placeholder/i.test(REPLACEMENT_PART_SYSTEM_PROMPT));
check("the lookup can answer SKIP",/respond with exactly: SKIP/.test(REPLACEMENT_PART_SYSTEM_PROMPT));

var total=failures.length;
if(total){
  console.error(total+" replacement part check"+(total!==1?"s":"")+" failed:\n");
  failures.forEach(function(f,i){console.error("  "+(i+1)+". "+f);});
  process.exit(1);
}
console.log("All "+checks+" replacement part research checks passed.");
