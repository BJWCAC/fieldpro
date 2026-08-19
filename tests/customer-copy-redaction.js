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

var failures=[];
function check(name,ok,detail){
  if(ok)return;
  failures.push(name+(detail?"\n    "+detail:""));
}
// The value must be gone and the sentence must still say something was withheld.
function withholds(text,value){
  var r=redactCustomerCopyText(text);
  check("withholds "+JSON.stringify(value)+" from "+JSON.stringify(text),
    r.text.indexOf(value)<0&&r.count>0,"got: "+r.text);
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
keeps("Model: DR4500A installed in panel 3.","installed in panel 3.");
keeps("Serial number ABC1234 noted.","noted.");
keeps("Chart recorder model: Honeywell DR4500A","Chart recorder model:");

// --- unlabeled codes (the AI and technicians do not always label) -----------
withholds("Replaced the Honeywell DR4500A chart recorder in panel 3.","DR4500A");
withholds("The Partlow MRC7000 chart recorder was calibrated.","MRC7000");
withholds("The Partlow MRC 7000 chart recorder was calibrated.","MRC 7000");
withholds("Existing recorder is a Yokogawa uR1800 unit.","uR1800");
withholds("Replaced chart paper, 24001660-001, on the recorder.","24001660-001");
withholds("Installed a Rosemount 3051S transmitter.","3051S");
withholds("Honeywell ST3000 transmitter re-ranged.","ST3000");
withholds("Recorder is a DR-4500 unit.","DR-4500");
withholds("Chart recorder (DR4500AY-1000-0-0-0) verified.","DR4500AY-1000-0-0-0");
keeps("Replaced the Honeywell DR4500A chart recorder in panel 3.","Honeywell");
keeps("Replaced the Honeywell DR4500A chart recorder in panel 3.","chart recorder in panel 3.");

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
// The PDF header cell only fits 36 characters, so a withheld deal-name code has
// to stay short enough to still read as a deal name.
var dealName=customerSafeDealName("4641 — DR4500A chart recorder swap");
check("deal name withholds its code",dealName.indexOf("DR4500A")<0,dealName);
check("deal name stays readable",dealName.indexOf("[withheld]")>=0&&dealName.indexOf("4641")>=0&&dealName.indexOf("chart recorder")>=0,dealName);
check("clean deal name is untouched",customerSafeDealName("Rogers WWTP annual calibration")==="Rogers WWTP annual calibration");

var total=failures.length;
if(total){
  console.error(total+" customer copy check"+(total!==1?"s":"")+" failed:\n");
  failures.forEach(function(f,i){console.error("  "+(i+1)+". "+f);});
  process.exit(1);
}
console.log("All customer copy redaction checks passed.");
