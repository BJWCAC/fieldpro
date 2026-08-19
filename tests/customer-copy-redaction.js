// Customer copy content rule checks (see docs/CAPSTONE_DEVELOPMENT_RULES.md).
//
// A customer copy must never carry an equipment part, model, order, or serial
// number, or pricing, and must never lose a reading, unit, date, plant loop tag,
// or job reference. Both directions are checked here.
//
//   node tests/customer-copy-redaction.js
//
// The redaction block is lifted out of src/app.js so the app stays a single
// browser file with no module system.
var fs=require("fs");
var path=require("path");

var src=fs.readFileSync(path.join(__dirname,"..","src","app.js"),"utf8");
var START="var CUSTOMER_COPY_PDF_NOTE";
var END="function customerCopyRedactionCount()";
var start=src.indexOf(START),end=src.indexOf(END);
if(start<0||end<0){console.error("Could not find the customer copy block in src/app.js");process.exit(1);}
eval(src.slice(start,end));

var failures=[],checks=0;
function check(name,ok,detail){
  checks++;
  if(ok)return;
  failures.push(name+(detail?"\n    "+detail:""));
}
// The value must be gone, it must be counted, and nothing may be left in its
// place: a customer copy never says that something was withheld.
function withholds(text,value){
  var r=redactCustomerCopyText(text);
  check("withholds "+JSON.stringify(value)+" from "+JSON.stringify(text),
    r.text.indexOf(value)<0&&r.count>0,"got: "+r.text);
  check("leaves no placeholder in "+JSON.stringify(text),!marksWithheld(r.text),"got: "+r.text);
}
// Wording the copy must never carry, plus the control character the passes use
// to mark a removal, which has to be gone by the time the text is returned.
function marksWithheld(text){
  return /not shown|withheld|redact|\[|\]|\u0001/i.test(String(text||""));
}
// Reads like prose: no double spaces, no space before a comma or period, no
// dangling separator at either end, and nothing left of an empty bullet.
function readsClean(text,label){
  String(text||"").split("\n").forEach(function(line){
    var ok=!/ {2,}/.test(line)&&!/\s[,;:.!?]/.test(line)&&!/[,;:\-–—]$/.test(line)&&
      !/^\s*[-*]\s*$/.test(line)&&!/[(\[]\s*[)\]]/.test(line)&&line===line.replace(/[ \t]+$/,"");
    check("reads clean ("+label+"): "+JSON.stringify(line),ok);
  });
}
function keeps(text,value){
  var r=redactCustomerCopyText(text);
  check("keeps "+JSON.stringify(value)+" in "+JSON.stringify(text),
    r.text.indexOf(value)>=0,"got: "+r.text);
}
function unchanged(text){
  var r=redactCustomerCopyText(text);
  check("leaves alone "+JSON.stringify(text),r.text===text&&r.count===0,"got: "+r.text);
}

// --- labeled identifiers -----------------------------------------------------
withholds("Part number: 4X-9921B was replaced.","4X-9921B");
withholds("Serial: 220-4471","220-4471");
withholds("Serial number ABC1234 noted.","ABC1234");
withholds("P/N GK-4471 installed.","GK-4471");
withholds("Model number: FMU90","FMU90");
withholds("Order code: R11CA111AA3A","R11CA111AA3A");
withholds("Ext. order code FMU90-R11CA111AA3A","FMU90-R11CA111AA3A");
withholds("Model 90 transmitter","Model 90");
withholds("Catalog number 51404671","51404671");
withholds("Item #: 51404671","51404671");
withholds("SKU 12345-A replaced.","12345-A");
withholds("MPN 24001660-001","24001660-001");
withholds("Assembly number 900E","900E");
withholds("Product number DPR250","DPR250");
withholds("Type: DR4500A","DR4500A");
// A manufacturer name in front of the code used to make the whole value invisible
// to the filter — this is the chart recorder leak from deal 4641.
withholds("Chart recorder model: Honeywell DR4500A","DR4500A");
withholds("Chart recorder model: Honeywell DR4500A","Honeywell DR4500A");
withholds("Part number: Honeywell 51404671-501","51404671-501");
withholds("Model: Partlow MRC 7000","MRC 7000");
withholds("Model: Endress+Hauser FMU90-R11CA111AA3A","FMU90");
withholds("P/N: 900E 01","900E");
withholds("P/N: 900E 01","01");
withholds("Serial: 6M-4471, Model: DR4500A","6M-4471");
withholds("Serial: 6M-4471, Model: DR4500A","DR4500A");
keeps("Model: DR4500A installed in panel 3.","nstalled in panel 3.");
keeps("Serial number ABC1234 noted.","oted.");
// The label goes with the value: a customer copy carries no "Serial:" with
// nothing after it, and a sentence that lost its opening keeps its capital.
var labeled=redactCustomerCopyText("Chart recorder model: Honeywell DR4500A").text;
check("the label goes with the value",labeled==="Chart recorder",labeled);
check("a sentence that lost its opening is recapitalized",
  redactCustomerCopyText("Serial number ABC1234 noted.").text==="Noted.",
  redactCustomerCopyText("Serial number ABC1234 noted.").text);
check("a line that was only the value is dropped",
  redactCustomerCopyText("Serial: 6M-4471, Model: DR4500A").text==="",
  JSON.stringify(redactCustomerCopyText("Serial: 6M-4471, Model: DR4500A").text));

// --- unlabeled codes (the AI and technicians do not always label) -----------
withholds("Replaced the Honeywell DR4500A chart recorder in panel 3.","DR4500A");
withholds("The Partlow MRC7000 chart recorder was calibrated.","MRC7000");
withholds("The Partlow MRC 7000 chart recorder was calibrated.","MRC 7000");
withholds("Existing recorder is a Yokogawa uR1800 unit.","uR1800");
withholds("Replaced chart paper, 24001660-001, on the recorder.","24001660-001");
withholds("Installed a Rosemount 3051S transmitter.","3051S");
withholds("Honeywell ST3000 transmitter re-ranged.","ST3000");
withholds("Recorder is a DR-4500 unit.","DR-4500");
// "in" after a spaced code is the word, not inches — this one reached a customer
// copy through the AI Synthesis.
withholds("- Backup unit is a Partlow MRC 7000 in panel LCP-3","MRC 7000");
keeps("- Backup unit is a Partlow MRC 7000 in panel LCP-3","panel LCP-3");
withholds("Replaced the DR 4500 in panel 3.","DR 4500");
unchanged("SPAN 1500 in H2O verified; RANGE 0-1500 GPM confirmed.");
unchanged("MLSS 3200 mg/L and TSS 250 mg/L sampled in the aeration basin.");
withholds("Chart recorder (DR4500AY-1000-0-0-0) verified.","DR4500AY-1000-0-0-0");
keeps("Replaced the Honeywell DR4500A chart recorder in panel 3.","Honeywell");
keeps("Replaced the Honeywell DR4500A chart recorder in panel 3.","chart recorder in panel 3.");

// --- the gap closes, so the copy reads as a report and not as a redaction ----
[["The DR4500A pen drive was binding at mid-span.","The pen drive was binding at mid-span."],
 ["- Chart recorder, Honeywell DR4500A, Serial: 6M-4471, panel LCP-3","- Chart recorder, Honeywell, panel LCP-3"],
 ["Chart recorder (DR4500AY-1000-0-0-0) verified.","Chart recorder verified."],
 ["Replaced chart paper, 24001660-001, on the recorder.","Replaced chart paper on the recorder."],
 ["- Stock two spare pen assemblies, Model 90 pen kit, order code R11CA111AA3A.","- Stock two spare pen assemblies, pen kit."],
 ["Existing recorder is a Yokogawa uR1800 unit.","Existing recorder is a Yokogawa unit."],
 // A determiner with nothing noun-like after it goes with the value.
 ["- Replace the MRC 7000 within 12 months.","- Replace within 12 months."],
 ["Pen arm P/N 51404671-501 was replaced.","Pen arm was replaced."],
 // Codes listed together close as one gap rather than as a row of holes.
 ["Spares on hand: DR4500A, MRC7000 and 51404671-501.","Spares on hand."],
 // A heading keeps its line even when the only thing on it was withheld.
 ["## Model: DR4500A","##"]].forEach(function(pair){
  var got=redactCustomerCopyText(pair[0]).text;
  check("closes the gap in "+JSON.stringify(pair[0]),got===pair[1],"got: "+JSON.stringify(got));
});
// Every removal is named for the technician, who has no marker in the copy to
// go by.
var listed=redactCustomerCopyText("Recorder model: Honeywell DR4500A, serial 6M-4471. Quoted $412.00.");
check("what went is listed",listed.removed.indexOf("model Honeywell DR4500A")>=0&&listed.removed.indexOf("$412.00")>=0,
  JSON.stringify(listed.removed));

// --- readings, units, and dates must survive --------------------------------
unchanged("Loop calibrated 4-20 mA at 0-150 in H2O, 0.5% span, pH 7.01");
unchanged("Flow verified at 1200 GPM with 24 VDC supply.");
unchanged("Supply measured 23.9 VDC on a 24VDC loop; output 11.98 mA.");
unchanged("Chart speed 1 in/hr; range 0-100 PSI; 3/4in tubing.");
unchanged("Control power is 120VAC/24VDC.");
unchanged("MLSS 3200 mg/L, TSS 250 mg/L, TDS 450, ORP 250 mV.");
unchanged("Calibration due 2026-08-19; last done 08/19/2025 at 13:45.");
unchanged("Recorder within 1.5% of span over a 30 min soak.");
unchanged("Replaced the 4-wire RTD with a 3-wire RTD.");
unchanged("Dosing H2SO4 and NaOCl; residual CL2 0.8 ppm.");
unchanged("Enclosure is NEMA Type 4X, IP65, wiring 14 AWG in 3/4in conduit.");
unchanged("Piping is SS316 with 316L fittings, Sch 40 PVC downstream.");
unchanged("Calibrated per ISO 17025 with a Fluke 754 documenting calibrator.");
unchanged("Cat 5e cable pulled to the panel.");
unchanged("Firmware v2.1 verified; Rev 3 nameplate.");
unchanged("Work order 44821 completed; purchase order 7781 referenced.");
unchanged("Parts used were on hand; part of the line was isolated in order to test 2 meters.");
unchanged("Tags FIT-101, LT-200, AIT-2301, and FIT101 were all verified.");
unchanged("Site phone is 763-972-1001.");
unchanged("Totalizer read 1284567 gallons at 10:42.");
unchanged("Range 1200-1500 GPM, setpoint 1350 GPM.");
unchanged("Recorder is in panel LCP-3, fed from MCC-2 through VFD-1.");
unchanged("Site: 13400 Main St NW, Rogers, MN 55374");
unchanged("WO 44821 and PO 7781 referenced; JOB 2291 closed.");
unchanged("Pump P1 and P2 checked; MCC 3 breaker reset; LCP 2 verified.");
keeps("Quoted for a swap within 12 months, 4 rolls of chart paper included.","12 months");
keeps("Quoted for a swap within 12 months, 4 rolls of chart paper included.","4 rolls");
keeps("Cost of the visit covered 2 hr 30 min onsite and 0.2% as-left error.","0.2%");
keeps("Calibrated per ISO 17025 with a Fluke 754 documenting calibrator.","ISO 17025");
keeps("Tags FIT-101, LT-200, AIT-2301, and FIT101 were all verified.","FIT-101");

// --- pricing ----------------------------------------------------------------
withholds("Part total $412.00 plus tax.","412.00");
withholds("Quoted 18,750 for the replacement.","18,750");
withholds("Labor cost 950 for the visit.","950");
unchanged("Recorded 412 gallons and 950 GPM peak flow.");

// --- a whole report, the way the AI writes one -------------------------------
var report=[
  "## SUMMARY OF WORK",
  "Annual calibration of the circular chart recorder at the Rogers WWTP influent flume on Wednesday, August 19, 2026. Work order 44821.",
  "",
  "## EQUIPMENT SERVICED",
  "- Chart recorder, Honeywell DR4500A, Serial: 6M-4471, panel LCP-3",
  "- Backup recorder: Partlow MRC 7000 (Serial number 88-2214)",
  "- Chart paper part number 24001660-001 restocked, 12 rolls on hand",
  "- Loop FIT-101, 0-1500 GPM, 4-20 mA output, 24 VDC loop power",
  "",
  "## FINDINGS",
  "The DR4500A pen drive was binding at mid-span. Pen arm P/N 51404671-501 was replaced.",
  "As-found error 1.8% of span at 50%; as-left 0.2%. Chart speed verified at 1 in/hr.",
  "Loop verified at 4.00 mA (0 GPM), 12.01 mA (750 GPM), 19.98 mA (1500 GPM). Ambient 72 F, 45% RH.",
  "Enclosure is NEMA Type 4X, IP65, wired with 18 AWG in 3/4in conduit, SS316 fittings.",
  "Calibrated with a Fluke 754 documenting calibrator, cal due 2027-02-14, per ISO 17025.",
  "",
  "## RECOMMENDATIONS",
  "- Replace the MRC 7000 within 12 months; quoted 1,850 for a like-for-like swap.",
  "- Stock two spare pen assemblies, Model 90 pen kit, order code R11CA111AA3A.",
  "",
  "## KEY POINTS SUMMARY",
  "- Pen arm replaced; total onsite time 2 hr 30 min",
  "- Purchase order 7781 referenced for the pen kit",
  "- Site is at 13400 Main St NW, Rogers, MN 55374"
].join("\n");
var out=redactCustomerCopyText(report);
["DR4500A","6M-4471","MRC 7000","MRC7000","88-2214","24001660-001","51404671-501","Model 90","R11CA111AA3A","1,850"].forEach(function(v){
  check("report withholds "+v,out.text.indexOf(v)<0,"got:\n"+out.text);
});
["Honeywell","Partlow","LCP-3","FIT-101","0-1500 GPM","4-20 mA","24 VDC","1.8%","0.2%","1 in/hr","4.00 mA","19.98 mA","72 F","45% RH",
 "NEMA Type 4X","IP65","18 AWG","3/4in","SS316","Fluke 754","2027-02-14","ISO 17025","Work order 44821","Purchase order 7781",
 "MN 55374","12 rolls","12 months","2 hr 30 min","August 19, 2026"].forEach(function(v){
  check("report keeps "+v,out.text.indexOf(v)>=0,"got:\n"+out.text);
});
check("report counts every withheld item",out.count>=9,"count: "+out.count);
check("the report never says anything was withheld",!marksWithheld(out.text),"got:\n"+out.text);
readsClean(out.text,"whole report");
// The line whose only content was a serial number goes with it, so the copy has
// no empty bullets.
check("a bullet that was only a value is dropped",out.text.indexOf("- Backup recorder: Partlow")>=0,"got:\n"+out.text);
check("headings and blank lines survive",out.text.indexOf("## FINDINGS")>=0&&/\n\n## RECOMMENDATIONS/.test(out.text),"got:\n"+out.text);

// --- rendering guarantees ---------------------------------------------------
check("customer copy label matches a typed name",isCustomerCopyLabel("Customer Walkthrough")&&!isCustomerCopyLabel("Internal Copy"));
var photos=[{desc:"Recorder DR4500A",aiDesc:"Serial: 6M-4471",synthesis:"- Model: Partlow MRC 7000"}];
var safe=customerSafePhotos(photos);
check("photo fields are filtered",
  safe[0].desc.indexOf("DR4500A")<0&&safe[0].aiDesc.indexOf("6M-4471")<0&&safe[0].synthesis.indexOf("MRC 7000")<0,
  JSON.stringify(safe[0]));
check("captured photo text is never mutated",
  photos[0].desc==="Recorder DR4500A"&&photos[0].aiDesc==="Serial: 6M-4471"&&photos[0].synthesis==="- Model: Partlow MRC 7000");
check("empty text is safe",customerSafeText("")===""&&customerSafeText(null)==="");
// The code comes out of the deal name, which is also what keeps the name inside
// the 36-character header cell.
var dealName=customerSafeDealName("4641 — DR4500A chart recorder swap","");
check("deal name withholds its code",dealName.indexOf("DR4500A")<0,dealName);
check("deal name stays readable",dealName==="4641 — chart recorder swap",dealName);
check("deal name carries no placeholder",!marksWithheld(dealName),dealName);
check("clean deal name is untouched",customerSafeDealName("Rogers WWTP annual calibration","")==="Rogers WWTP annual calibration");

// --- the deal's job number is part of the deal name and always stays ---------
// Every shape this shop writes a job number in. The number is the customer's own
// reference for the visit, like a work order number.
["4641 chart recorder calibration","4641 - Rogers WWTP annual calibration","Rogers WWTP 4641","Rogers WWTP - 4641 chart recorder",
 "CAC 4641 chart recorder","CAC-4641 chart recorder","IA-4641 recorder swap","WO 4641 recorder swap","Job 4641 - recorder",
 "4641-2 recorder calibration","#4641 recorder calibration","Deal 4641 recorder","P4641 recorder calibration",
 "4641 / 4642 recorder calibrations","ROGERS 4641 CHART RECORDER CALIBRATION"].forEach(function(name){
  check("deal name keeps its job number: "+name,customerSafeDealName(name,"").indexOf("4641")>=0,customerSafeDealName(name,""));
});
check("job number survives beside a withheld model",customerSafeDealName("4641 Honeywell DR4500A swap","")==="4641 Honeywell swap",
  customerSafeDealName("4641 Honeywell DR4500A swap",""));
check("a grouped part number in a deal name still goes",customerSafeDealName("4641 pen kit 51404671-501","").indexOf("51404671")<0);
// A code in the deal name that shares the job-number shape goes only when the
// report carried the same one under a label — evidence rather than shape.
var withEvidence="Recorder replaced. Model: DR-4500. Serial: 6M-4471. Job CAC-4641 closed.";
check("deal name follows a labeled mention in the report",
  customerSafeDealName("CAC-4641 DR-4500 swap",withEvidence)==="CAC-4641 swap",
  customerSafeDealName("CAC-4641 DR-4500 swap",withEvidence));
check("deal name keeps an ambiguous code the report never labeled",
  customerSafeDealName("CAC-4641 recorder swap",withEvidence)==="CAC-4641 recorder swap");
check("spaced model in a deal name goes when the report labeled it",
  customerSafeDealName("4641 MRC 7000 replacement","Model: Partlow MRC 7000 verified.")==="4641 replacement",
  customerSafeDealName("4641 MRC 7000 replacement","Model: Partlow MRC 7000 verified."));
// Caught in the browser: the report says "job CAC-4641" too, so evidence taken
// from unlabeled mentions withheld the job number from its own deal name.
var jobInBody=["Annual calibration of the chart recorder at Rogers WWTP. Work order 44821 on job CAC-4641.",
  "- Chart recorder, Honeywell DR4500A, Serial: 6M-4471, panel LCP-3",
  "- Chart paper part number 24001660-001 restocked, 12 rolls on hand"].join("\n");
check("the report mentioning the job number does not cost the deal name its number",
  customerSafeDealName("CAC-4641 DR4500A chart recorder calibration",jobInBody)==="CAC-4641 chart recorder calibration",
  customerSafeDealName("CAC-4641 DR4500A chart recorder calibration",jobInBody));
check("and the body keeps it too",
  customerSafeText(jobInBody,customerCopyKeepTokens("CAC-4641 DR4500A chart recorder calibration",jobInBody)).indexOf("job CAC-4641")>=0,
  customerSafeText(jobInBody,customerCopyKeepTokens("CAC-4641 DR4500A chart recorder calibration",jobInBody)));
// The same job number survives in the report body and photo notes.
var evidence="Recorder replaced. Model: DR-4500. Serial: 6M-4471. Job 4641 closed.";
var jobRefs=customerCopyKeepTokens("CAC-4641 chart recorder calibration",evidence);
check("keep tokens come from the deal name",jobRefs.indexOf("CAC-4641")>=0,JSON.stringify(jobRefs));
var body=customerSafeText("Job CAC-4641 completed. Replaced the Honeywell DR4500A recorder in panel LCP-3.",jobRefs);
check("report body keeps this deal's job number",body.indexOf("CAC-4641")>=0,body);
check("report body still withholds the model beside it",body.indexOf("DR4500A")<0,body);
// The header and the body can never disagree about the same number: what the deal
// name withholds is withheld everywhere, so a deal named after the model does not
// license that model in the body.
var namedAfterModel=customerCopyKeepTokens("4641 DR-4500 recorder swap",evidence);
check("a model in the deal name is not protected in the body",namedAfterModel.indexOf("DR-4500")<0,JSON.stringify(namedAfterModel));
check("the job number beside it still is",namedAfterModel.indexOf("4641")>=0,JSON.stringify(namedAfterModel));
var bothWays=customerSafeText("Job 4641: replaced the DR-4500 recorder.",namedAfterModel);
check("body follows the header on that model",bothWays.indexOf("DR-4500")<0&&bothWays.indexOf("4641")>=0,bothWays);
check("no deal name means no keep list",customerCopyKeepTokens("","").length===0);

// --- generated sweeps -------------------------------------------------------
// The same code in different sentence positions, because a neighbouring word is
// what let "Partlow MRC 7000 in panel LCP-3" through once.
var sweepCodes=["MRC 7000","DR 4500","DPR 250","MRC7000","DR4500A","3051S","51404671-501"];
var sweepAfter=["in","at","on","a","x","m","s","h","c","f","k","l","g","mo","and","with","was","replaced","unit","recorder,","recorder.","(spare)","panel"];
var sweepBefore=["a","the","one","spare","new","existing","Partlow","PARTLOW","model","with","to","and"];
var sweepLeaks=[],sweepCount=0;
function sweepFails(text,code){
  var got=redactCustomerCopyText(text).text;
  return got.indexOf(code)>=0||marksWithheld(got)?text+" -> "+got:"";
}
sweepCodes.forEach(function(code){
  sweepAfter.forEach(function(word){
    var t="Replaced the Partlow "+code+" "+word+" the influent panel.";sweepCount++;
    var bad=sweepFails(t,code);if(bad)sweepLeaks.push(bad);
  });
  sweepBefore.forEach(function(word){
    var t="Verified "+word+" "+code+" today.";sweepCount++;
    var bad=sweepFails(t,code);if(bad)sweepLeaks.push(bad);
  });
});
["Part number","Part No.","P/N","PN","Serial","Serial number","S/N","Model","Model number","Model No.","Mdl","Order code",
 "Order number","Catalog number","Item #","SKU","MPN","Assembly number","Product number","Type"].forEach(function(label){
  ["DR4500A","Honeywell DR4500A","Partlow MRC 7000","51404671-501","Honeywell 51404671-501","FMU90-R11CA111AA3A","6M-4471"].forEach(function(value){
    [": "," "].forEach(function(sep){
      var t="Recorder "+label+sep+value+" was verified onsite.";sweepCount++;
      var bad=sweepFails(t,value.split(" ").pop());if(bad)sweepLeaks.push(bad);
    });
  });
});
check(sweepCount+" generated code sentences all withhold their code",!sweepLeaks.length,sweepLeaks.slice(0,5).join("\n    "));

var sweepReadings=["4-20 mA","4-20mA","0-150 in H2O","0-1500 GPM","24 VDC","24VDC","120VAC/24VDC","480 V","0.5%","1.8% of span",
 "pH 7.01","0.8 ppm","0.12 NTU","250 mV","3200 mg/L","72 F","23.9 VDC","1 in/hr","3/4in","1-1/2 in","18 AWG","10-32 screws",
 "1/4-20 bolts","2 hr 30 min","30 min","12 months","1284567 gal","1200-1500 GPM","0.010 in","0.15 in/s","60 Hz","1750 RPM",
 "25 ft-lb","2026-08-19","08/19/2026","10:42:15","Q3 2026","v2.1","Rev 3","H2SO4","NaOCl","CL2","SS316","316L","Sch 40",
 "NEMA 4X","IP65","SIL2","CAT5e","ISO 17025","FIT-101","LT-200","AIT-2301","FIT101","LCP-3","MCC-2","VFD-1","MN 55374",
 "WO 44821","Work order 44821","Purchase order 7781","PO 7781","Room 101","Panel 3A","Building 2B","Zone 4","Class I Div 2"];
var sweepFrames=[
  function(v){return "Verified "+v+" during the visit.";},
  function(v){return "Recorded "+v+" at the panel.";},
  function(v){return v+" confirmed by the technician.";},
  function(v){return "Loop reads "+v+" as found.";},
  function(v){return "- "+v;},
  function(v){return "Setpoint "+v+" and alarm cleared.";}
];
var sweepLosses=[],readingCount=0;
sweepReadings.forEach(function(value){
  sweepFrames.forEach(function(frame){
    var t=frame(value);readingCount++;
    if(redactCustomerCopyText(t).text!==t)sweepLosses.push(t+" -> "+redactCustomerCopyText(t).text);
  });
});
check(readingCount+" generated reading sentences are left alone",!sweepLosses.length,sweepLosses.slice(0,5).join("\n    "));

var total=failures.length;
if(total){
  console.error(total+" customer copy check"+(total!==1?"s":"")+" failed:\n");
  failures.forEach(function(f,i){console.error("  "+(i+1)+". "+f);});
  process.exit(1);
}
console.log("All "+checks+" customer copy redaction checks passed.");
