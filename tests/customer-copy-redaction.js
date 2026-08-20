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
var START="var CUSTOMER_COPY_GAP";
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
  return /not shown|withheld|redact|omitted|\bn\/a\b|\[|\]|\u0001/i.test(String(text||""));
}
// Wording that announces a removal has to go the way a value goes: gone, counted,
// and with nothing left in its place.
function scrubs(text,expected){
  var r=redactCustomerCopyText(text);
  check("scrubs the placeholder in "+JSON.stringify(text),!marksWithheld(r.text)&&r.count>0,"got: "+JSON.stringify(r.text));
  if(expected!==undefined)
    check("placeholder line reads "+JSON.stringify(expected),r.text===expected,"got: "+JSON.stringify(r.text));
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

// --- a model number written as a plain number -------------------------------
// The leak the report body kept showing: a brand and a plain number is a model
// number, and no shape can tell that number from a reading, so the equipment
// noun standing beside it is what identifies it.
withholds("Calibrated the Rosemount 3051 differential pressure transmitter.","3051");
withholds("Installed an Endress+Hauser Promag 400 magnetic flow meter.","400");
withholds("The Promag 53 sensor was verified at 1200 GPM.","53");
withholds("Grundfos DME 60 metering pump stroke set to 40%.","60");
withholds("Verified the Fisher 667 actuator travel.","667");
withholds("Micro Motion 2700 transmitter checked.","2700");
withholds("Masoneilan 21000 valve stroked.","21000");
withholds("Magnetrol Kotron 805 probe cleaned.","805");
withholds("Krohne Optiflux 4000 meter verified.","4000");
withholds("GF Signet 2551 sensor replaced.","2551");
// The identifier can be written after the equipment it names, the way an
// equipment list writes it.
withholds("- Chart recorder, Rosemount 3051, panel LCP-3","3051");
withholds("- Backup unit: Partlow 7000","7000");
keeps("Calibrated the Rosemount 3051 differential pressure transmitter.","Rosemount");
keeps("- Chart recorder, Rosemount 3051, panel LCP-3","panel LCP-3");
check("the model number is named for the technician with its series word",
  redactCustomerCopyText("Calibrated the Rosemount 3051 transmitter.").removed.indexOf("Rosemount 3051")>=0,
  JSON.stringify(redactCustomerCopyText("Calibrated the Rosemount 3051 transmitter.").removed));
// The same number in the same copy, where the sentence says nothing about what
// it is: a number withheld once is withheld everywhere.
var repeated=redactCustomerCopyText(["Installed a Rosemount 3051 transmitter.",
  "Re-ranged the Rosemount 3051 to 0-150 in H2O."].join("\n")).text;
check("a repeat mention goes with the first",repeated.indexOf("3051")<0,repeated);
var labeledRepeat=redactCustomerCopyText("Model: Rosemount 3051. Re-ranged the 3051 and verified span.").text;
check("a labeled number goes where the report writes it again",labeledRepeat.indexOf("3051")<0,labeledRepeat);
// A reading still wins, even for a number this copy withholds elsewhere.
keeps("Model: Rosemount 3051. Totalizer read 3051 gallons.","3051 gallons");
// A model wearing the shape of a plant tag: the brand in front of it is what
// tells it from a tag the plant assigned itself.
withholds("Replaced the Hach SC200 controller.","SC200");
check("a tag-shaped model goes wherever it is written again",
  redactCustomerCopyText("Replaced the Hach SC200 controller. The SC200 controller passed.").text.indexOf("SC200")<0,
  redactCustomerCopyText("Replaced the Hach SC200 controller. The SC200 controller passed.").text);
// A word is not a brand just because it opens the sentence, and a verb is never
// one: a plant tag written after either of them stays.
unchanged("Recorded FIT101 at the transmitter.");
unchanged("Read FIT101 at the meter.");
unchanged("Verified FIT101 on the recorder.");
unchanged("FIT101 transmitter verified at 4-20 mA.");
unchanged("Loop FIT-101 transmitter verified.");
unchanged("SC-1 speed controller for Blower 2 verified.");
// The same code typed in lower case.
withholds("Replaced the dr4500a pen arm.","dr4500a");
withholds("Existing recorder is a partlow mrc7000 unit.","mrc7000");

// --- what a plain number can otherwise be, all of which must survive --------
unchanged("Totalizer read 1284567 gallons at 10:42.");
unchanged("The meter read 45231 at 10:00 and again at 14:30.");
unchanged("Meter reading 45231 recorded on the totalizer.");
unchanged("Basin 2 and Clarifier 3 were inspected; Well 4 offline.");
unchanged("Room 101 recorder checked; Building 2B riser verified.");
unchanged("Manhole 12 sampled; Lift Station 3 pump verified.");
unchanged("Blower 12 motor and Drive 2 restarted.");
unchanged("Feeder 3 valve cycled; Screen 2 sensor cleaned.");
unchanged("Pump 12 rebuilt and Pump 14 sensor replaced.");
unchanged("Panel 250 transmitter wiring corrected.");
unchanged("Loop 101 transmitter verified at 4-20 mA.");
unchanged("Work order 44821 covered the transmitter calibration.");
unchanged("Purchase order 7781 referenced for the recorder pen kit.");
unchanged("Ticket 5521 valve repair closed.");
unchanged("Ambient 72 F at the transmitter; 45% RH.");
unchanged("Supply measured 480 volt at the drive; 24 VDC at the transmitter.");
unchanged("Torqued 25 ft-lb on the transmitter flange bolts.");
unchanged("Setpoint 1350 GPM on the meter; range 0-1500 GPM.");
unchanged("TDS 450 and ORP 250 mV read at the probe.");
unchanged("Verified 10-32 screws on the transmitter cover.");
unchanged("Since 2019 the recorder has drifted 1.8% of span.");
unchanged("Calibrated 2026-08-19; the transmitter passed.");
unchanged("Sampled at 10:42; the analyzer was stable.");
unchanged("Replaced 250 valves across the plant.");
unchanged("Installed 200 ft of cable to the transmitter.");
unchanged("Ordered 12 pen assemblies for the recorder.");
unchanged("Sampled 10am and 5pm at the analyzer.");
unchanged("Sch 40 PVC downstream of the valve.");
unchanged("Rev 3 nameplate on the transmitter; firmware v2.1 verified.");
unchanged("Class I Div 2 area; Zone 4 gauge inspected.");
unchanged("45 min soak on the recorder chart.");
unchanged("Replaced the 4-wire RTD with a 3-wire RTD at the transmitter.");
// The shop's own test equipment is the calibration's traceability record, not
// the customer's asset, so its model stays.
unchanged("Calibrated per ISO 17025 with a Fluke 754 documenting calibrator.");
unchanged("Fluke 754 calibrator used at the transmitter, cal due 2027-02-14.");
// A price is still a price on a line that names equipment.
withholds("Quoted 1,850 for a new transmitter.","1,850");
check("a price on an equipment line leaves no half of itself behind",
  redactCustomerCopyText("Quoted 1,850 for a new transmitter.").text==="Quoted for a new transmitter.",
  redactCustomerCopyText("Quoted 1,850 for a new transmitter.").text);

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
 // A value at the end of a clause can leave a preposition hanging too.
 ["- Pen arm P/N 51404671-501 replaced on the DR4500A","- Pen arm replaced"],
 ["- Backup unit is a Partlow MRC 7000 in panel LCP-3","- Backup unit is a Partlow in panel LCP-3"],
 // Codes listed together close as one gap rather than as a row of holes.
 ["Spares on hand: DR4500A, MRC7000 and 51404671-501.","Spares on hand."],
 // A whole sentence going does not leave two periods behind (seen in the PDF's
 // AI Observation block).
 ["Recorder mounted in panel LCP-3. Model: Honeywell DR4500A, Serial: 6M-4471. Chart speed 1 in/hr.",
  "Recorder mounted in panel LCP-3. Chart speed 1 in/hr."],
 // Punctuation with nothing left in front of it goes with the value.
 ["Parts: DR4500A. Also replaced chart paper.","Also replaced chart paper."],
 ["Order code R11CA111AA3A; ship to Rogers, MN 55374.","Ship to Rogers, MN 55374."],
 // A dash keeps its spacing.
 ["Recorder — DR4500A — calibrated.","Recorder — calibrated."],
 // A heading keeps its line even when the only thing on it was withheld.
 ["## Model: DR4500A","##"]].forEach(function(pair){
  var got=redactCustomerCopyText(pair[0]).text;
  check("closes the gap in "+JSON.stringify(pair[0]),got===pair[1],"got: "+JSON.stringify(got));
});
// The technician's list names each removal once: a code named with its label or
// its series word and the same code named on its own are one removal.
var listedOnce=redactCustomerCopyText(["Installed a Rosemount 3051 transmitter.",
  "Re-ranged the 3051 and verified span.",
  "Chart paper part number 24001660-001 restocked.",
  "- Chart paper 24001660-001, 12 rolls"].join("\n")).removed;
check("the withheld list names a code once",
  listedOnce.indexOf("Rosemount 3051")>=0&&listedOnce.indexOf("3051")<0&&
  listedOnce.indexOf("part number 24001660-001")>=0&&listedOnce.indexOf("24001660-001")<0,
  JSON.stringify(listedOnce));
// Every removal is named for the technician, who has no marker in the copy to
// go by.
var listed=redactCustomerCopyText("Recorder model: Honeywell DR4500A, serial 6M-4471. Quoted $412.00.");
check("what went is listed",listed.removed.indexOf("model Honeywell DR4500A")>=0&&listed.removed.indexOf("$412.00")>=0,
  JSON.stringify(listed.removed));

// --- wording that announces a removal goes with the value -------------------
// The AI is told a customer copy withholds numbers, so it sometimes writes the
// withholding instead of the number. A customer copy must show neither.
scrubs("Serial: [redacted]","");
scrubs("- Serial number: REDACTED","");
scrubs("Order code: [not shown on customer copy]","");
scrubs("Part number: ***","");
scrubs("Serial: N/A","");
scrubs("Model: removed","");
scrubs("Model number: [redacted] on the chart recorder.","On the chart recorder.");
scrubs("The nameplate shows Model number: [redacted] and Serial: [redacted].","The nameplate shows.");
scrubs("Serial number redacted for the customer copy.","");
scrubs("Part number withheld.","");
scrubs("Chart recorder installed; model number not shown on customer copy.","Chart recorder installed.");
scrubs("Pen arm replaced (part number redacted).","Pen arm replaced.");
scrubs("Recorder [redacted] verified.","Recorder verified.");
scrubs("Pricing withheld from this copy.","");
scrubs("- Pen arm replaced; serial number withheld on the customer copy","- Pen arm replaced");
// Ordinary field wording that happens to use the same words has to survive: a
// part really is removed on a service call.
unchanged("Pen arm was removed and replaced.");
unchanged("Pen arm part removed and replaced.");
unchanged("The bypass step was omitted at the customer's request.");
unchanged("Removed the recorder door and cleaned the pen well.");
unchanged("Chart recorder (spare) verified.");
unchanged("Amount removed: 5 gallons of NaOCl.");
unchanged("Parts used were on hand; part of the line was isolated in order to test 2 meters.");
unchanged("Nameplate was not legible (model number not readable in the field).");
// The AI Synthesis as it came back from the field, placeholders and all.
var placeholderSynthesis=[
  "- Chart recorder calibrated; Model number: [redacted], Serial: [redacted]",
  "- As-found error 1.8% of span, as-left 0.2% at 1 in/hr chart speed",
  "- Pen arm replaced (part number withheld on customer copy)",
  "- Recorder verified in panel LCP-3 on work order 44821"
].join("\n");
var scrubbed=redactCustomerCopyText(placeholderSynthesis);
check("the synthesis carries no redaction wording",!marksWithheld(scrubbed.text),"got:\n"+scrubbed.text);
["1.8% of span","0.2%","1 in/hr","LCP-3","work order 44821","Pen arm replaced","Chart recorder calibrated"].forEach(function(v){
  check("the scrubbed synthesis keeps "+v,scrubbed.text.indexOf(v)>=0,"got:\n"+scrubbed.text);
});
readsClean(scrubbed.text,"synthesis with placeholders");

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
// A job reference is not a price, even on a line that talks about money.
keeps("Quoted $1,200.00 for the swap; work order 44821 stays.","work order 44821");
keeps("Labor cost 950 against PO 7781 for the visit.","PO 7781");

// --- a whole report, the way the AI writes one -------------------------------
var report=[
  "## SUMMARY OF WORK",
  "Annual calibration of the circular chart recorder at the Rogers WWTP influent flume on Wednesday, August 19, 2026. Work order 44821.",
  "",
  "## EQUIPMENT SERVICED",
  "- Chart recorder, Honeywell DR4500A, Serial: 6M-4471, panel LCP-3",
  "- Backup recorder: Partlow MRC 7000 (Serial number 88-2214)",
  "- Influent flow transmitter, Rosemount 3051 differential pressure transmitter on loop FIT-101",
  "- Endress+Hauser Promag 400 magnetic flow meter, 0-1500 GPM, and a Hach SC200 controller",
  "- Chart paper part number 24001660-001 restocked, 12 rolls on hand",
  "- Loop FIT-101, 0-1500 GPM, 4-20 mA output, 24 VDC loop power",
  "",
  "## FINDINGS",
  "The DR4500A pen drive was binding at mid-span. Pen arm P/N 51404671-501 was replaced.",
  "Re-ranged the Rosemount 3051 to 0-150 in H2O; the SC200 controller passed.",
  "Blower 12 motor and Drive 2 were restarted after Manhole 12 was sampled.",
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
["DR4500A","6M-4471","MRC 7000","MRC7000","88-2214","24001660-001","51404671-501","Model 90","R11CA111AA3A","1,850",
 "3051","Promag 400","SC200"].forEach(function(v){
  check("report withholds "+v,out.text.indexOf(v)<0,"got:\n"+out.text);
});
["Honeywell","Partlow","Rosemount","Promag","Hach","Blower 12","Drive 2","Manhole 12","0-150 in H2O",
 "LCP-3","FIT-101","0-1500 GPM","4-20 mA","24 VDC","1.8%","0.2%","1 in/hr","4.00 mA","19.98 mA","72 F","45% RH",
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

// --- a section left with nothing in it goes too ------------------------------
// A heading standing over a blank space says the report had something there, so
// it goes with its last line — along with the gap the line left behind.
var emptySection=redactCustomerCopyText(["## SUMMARY OF WORK","Annual calibration completed.","",
  "## EQUIPMENT SERVICED","- Serial: 6M-4471","- Model: Partlow MRC 7000","",
  "## FINDINGS","Loop verified at 4-20 mA."].join("\n")).text;
check("an emptied section takes its heading with it",
  emptySection==="## SUMMARY OF WORK\nAnnual calibration completed.\n\n## FINDINGS\nLoop verified at 4-20 mA.",
  "got:\n"+emptySection);
readsClean(emptySection,"emptied section");
var lastSection=redactCustomerCopyText(["Recorder calibrated.","","## PARTS USED","- Model: DR4500A"].join("\n")).text;
check("an emptied last section leaves no trailing blank",lastSection==="Recorder calibrated.","got:\n"+JSON.stringify(lastSection));
// A section that arrived empty is the report's own formatting, not a removal.
var alreadyEmpty=redactCustomerCopyText(["## FINDINGS","","## RECOMMENDATIONS","- Replace the pen arm."].join("\n")).text;
check("a section that was always empty is left alone",
  alreadyEmpty==="## FINDINGS\n\n## RECOMMENDATIONS\n- Replace the pen arm.","got:\n"+JSON.stringify(alreadyEmpty));
// A section whose every line was the AI's own announcement goes the same way as
// one whose every line was a real number: announcement removal feeds the same gap.
var placeholderSection=redactCustomerCopyText(["## EQUIPMENT SERVICED","- Serial: [redacted]","- Model number: [redacted]","",
  "## CALIBRATION RESULTS","As-found 1.8% of span at 1 in/hr on loop FIT-101."].join("\n")).text;
check("a section of nothing but announcements takes its heading with it",
  placeholderSection==="## CALIBRATION RESULTS\nAs-found 1.8% of span at 1 in/hr on loop FIT-101.",
  "got:\n"+JSON.stringify(placeholderSection));

// --- the document itself must not announce the filtering ---------------------
// The copy carried a note under its name in the PDF and a line in the shared
// text ("Customer copy — … are not included."), which said what the filtering
// exists not to say. Nothing may put it back.
check("no customer-copy note constant remains",src.indexOf("CUSTOMER_COPY_PDF_NOTE")<0);
["buildReportExportText","buildPDF"].forEach(function(fn){
  var at=src.indexOf("function "+fn+"(");
  var body=at<0?"":src.slice(at,src.indexOf("\n}",at));
  check(fn+"() is in src/app.js",at>=0);
  check(fn+"() says nothing about what a customer copy leaves out",
    !/not included|not shown|withheld|redact/i.test(body),"in "+fn+"()");
});

// --- rendering guarantees ---------------------------------------------------
check("customer copy label matches a typed name",isCustomerCopyLabel("Customer Walkthrough")&&!isCustomerCopyLabel("Internal Copy"));
var photos=[{desc:"Recorder DR4500A",aiDesc:"Serial: 6M-4471",synthesis:"- Model: Partlow MRC 7000 calibrated at 4-20 mA"}];
var safe=customerSafePhotos(photos);
check("photo fields are filtered",
  safe[0].desc.indexOf("DR4500A")<0&&safe[0].synthesis.indexOf("MRC 7000")<0,
  JSON.stringify(safe[0]));
// A customer copy prints one AI block per photo: the synthesis, which already
// merges the technician's note with the observation.
check("the AI Observation is left off a customer copy",safe[0].aiDesc==="",JSON.stringify(safe[0].aiDesc));
check("the AI Synthesis stays on a customer copy",safe[0].synthesis.indexOf("4-20 mA")>=0,JSON.stringify(safe[0].synthesis));
check("captured photo text is never mutated",
  photos[0].desc==="Recorder DR4500A"&&photos[0].aiDesc==="Serial: 6M-4471"&&
  photos[0].synthesis==="- Model: Partlow MRC 7000 calibrated at 4-20 mA");
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
// Caught in the browser: a deal named after a model whose number is written in
// the job-number shape ("CAC-4641 Rosemount 3051 transmitter calibration") had
// 3051 protected as a job number — and the keep list then shielded it in the
// body as well, which is the leak the field reported. A brand in front of the
// number in the report body is as deliberate as a label, so it counts as
// evidence and the name gives the number up.
var namedAfterModelNumber="CAC-4641 Rosemount 3051 transmitter calibration";
var brandedBody=["- Influent flow transmitter, Rosemount 3051 differential pressure transmitter on loop FIT-101",
  "Re-ranged the Rosemount 3051 to 0-150 in H2O at 1200 GPM.",
  "Work order 44821 on job CAC-4641."].join("\n");
check("a branded model number in the body is evidence for the deal name",
  customerSafeDealName(namedAfterModelNumber,brandedBody,"Rogers WWTP")==="CAC-4641 Rosemount transmitter calibration",
  customerSafeDealName(namedAfterModelNumber,brandedBody,"Rogers WWTP"));
var brandedKeep=customerCopyKeepTokens(namedAfterModelNumber,brandedBody,"Rogers WWTP");
check("the keep list stops shielding it in the body",brandedKeep.indexOf("3051")<0&&brandedKeep.indexOf("CAC-4641")>=0,
  JSON.stringify(brandedKeep));
var brandedOut=customerSafeText(brandedBody,brandedKeep);
check("the body then withholds it everywhere",brandedOut.indexOf("3051")<0,brandedOut);
check("and the job number and readings still stand",
  brandedOut.indexOf("CAC-4641")>=0&&brandedOut.indexOf("Work order 44821")>=0&&brandedOut.indexOf("1200 GPM")>=0&&brandedOut.indexOf("FIT-101")>=0,
  brandedOut);
// A bare mention is still not evidence, and neither is the site's own name in
// front of the number — both are how a report writes the visit's job number.
[["4641 chart recorder calibration","Annual calibration of the chart recorder at Rogers WWTP. Work order 44821 on job 4641."],
 ["Rogers WWTP - 4641 chart recorder","Job 4641 closed on the chart recorder."],
 ["CAC 4641 chart recorder","Job CAC 4641 recorder calibration completed."],
 ["Rogers WWTP 4641","Calibrated the Rogers WWTP 4641 chart recorder today."],
 ["4641 chart recorder","Calibrated the Rogers 4641 chart recorder today."],
 ["Deal 4641 recorder","Recorder calibrated on job 4641."]].forEach(function(pair){
  check("the deal keeps its job number: "+pair[0],
    customerSafeDealName(pair[0],pair[1],"Rogers WWTP").indexOf("4641")>=0,
    customerSafeDealName(pair[0],pair[1],"Rogers WWTP"));
});

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

// A plain model number beside every kind of equipment the report names, and the
// same shapes used as a plant reference or a reading, which must all survive.
var sweepModels=["3051","400","667","2700","805","2551","21000","53"];
var sweepNouns=["transmitter","sensor","meter","recorder","analyzer","controller","gauge","valve","actuator","probe","pump","totalizer"];
var modelLeaks=[],modelCount=0;
sweepModels.forEach(function(code){
  sweepNouns.forEach(function(noun){
    ["Installed a Rosemount "+code+" "+noun+" at the influent.",
     "- Influent "+noun+", Rosemount "+code+", panel LCP-3",
     "The Rosemount "+code+" "+noun+" was calibrated."].forEach(function(t){
      modelCount++;
      var got=redactCustomerCopyText(t).text;
      if(got.indexOf(code)>=0||marksWithheld(got))modelLeaks.push(t+" -> "+got);
    });
  });
});
check(modelCount+" generated model-number sentences all withhold their number",!modelLeaks.length,modelLeaks.slice(0,5).join("\n    "));
var sweepPlaces=["Basin","Clarifier","Well","Room","Building","Manhole","Blower","Drive","Feeder","Screen","Pump","Panel","Loop","Zone","Bay","Station"];
var placeLosses=[],placeCount=0;
sweepPlaces.forEach(function(place){
  ["2","12","101"].forEach(function(n){
    sweepNouns.slice(0,6).forEach(function(noun){
      var t=place+" "+n+" "+noun+" was verified.";placeCount++;
      if(redactCustomerCopyText(t).text!==t)placeLosses.push(t+" -> "+redactCustomerCopyText(t).text);
    });
  });
});
check(placeCount+" generated plant references are left alone",!placeLosses.length,placeLosses.slice(0,5).join("\n    "));

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
  function(v){return "Setpoint "+v+" and alarm cleared.";},
  // An equipment noun beside a reading must not make the reading look like a
  // model number, in either direction.
  function(v){return "Recorded "+v+" at the transmitter.";},
  function(v){return "The recorder logged "+v+" during the visit.";}
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
