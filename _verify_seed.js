// Temporary browser verification harness for the v392 replacement part lookup.
// Not part of the app: it seeds the deal 4641 report the field reported on and
// stands in for the one network call, so the whole pipeline runs for real.
// Deleted before commit.
(function(){
  A.sel={id:"d4641",Account_Name:"Rogers WWTP",Deal_Name:"CAC-4641 chart recorder calibration",Stage:"Work In Progress"};
  A.technician="Quintin";
  setReportTechnician("Quintin");
  A.currentHistoryId="r"+Date.now();
  A.reportCopyType="internal";
  A.reportPhotos=[];A.photos=[];
  A.partsResearch=null;
  // An instrument saved on the Assets tab this visit — the identity the report
  // prompt never used to receive.
  A.asset.savedItems=[{id:"eq1",cacId:"AMD-2291",brand:"Honeywell",brandOther:"",type:"Chart Recorder",
    series:"DR4500",model:"DR4500AY-1000-0-0-0",serial:"6M-4471",category:"General",
    name:"Influent circular chart recorder",nameplateAdditional:"120 VAC, 12 in circular chart, 0-100 range"}];
  A.report=[
    "# FIELD SERVICE REPORT",
    "## 1. Site Visit Summary",
    "Annual calibration of the influent circular chart recorder at Rogers WWTP on Wednesday, August 19, 2026. Work order 44821 on job CAC-4641.",
    "",
    "## 2. Equipment / Systems Serviced",
    "- Chart recorder, Honeywell, Model number: DR4500AY-1000-0-0-0, Serial: 6M-4471, panel LCP-3",
    "- Loop FIT-101, 0-1500 GPM, 4-20 mA output, 24 VDC loop power",
    "",
    "## 3. Work Performed",
    "Calibrated the recorder at three points and verified chart speed at 1 in/hr.",
    "The pen drive was binding at mid-span, so the pen arm was replaced.",
    "",
    "## 4. Calibration Results & Readings",
    "As-found error 1.8% of span at 50%; as-left 0.2%. Loop verified at 4.00 mA, 12.01 mA, and 19.98 mA.",
    "",
    "## 6. Issues / Deficiencies",
    "The recorder is nearly out of chart paper and needs a new roll before the next visit.",
    "",
    "## 7. Recommendations & Next Steps",
    "- Stock a spare pen assembly and chart paper on site.",
    "",
    "## KEY POINTS SUMMARY",
    "- Pen arm replaced; recorder within 0.2% as-left",
    "- Chart paper has to be replaced before the next visit",
    "- Work order 44821 closed on job CAC-4641"
  ].join("\n");
  // Stands in for the single web-search call, with the answer shaped the way the
  // system prompt asks for it (preamble and markdown included, because a model
  // adds them). Everything else runs for real: both gates, the parser, the
  // section merge, the History save, and the render.
  window.__seenResearchPrompt="";
  fetchReplacementPartsDraft=async function(provider,content){
    window.__seenResearchPrompt=content;
    await new Promise(function(r){setTimeout(r,600);});
    return ["Here are the replacement parts for the recorder:",
      "1. **Chart paper**, 12 in circular, 0-100 range, fits the Honeywell DR4500AY-1000-0-0-0 (Part number: 24001660-001; box of 100 charts; source: honeywell.com)",
      "2. **Pen arm assembly**, purple ink, fits the Honeywell DR4500A recorder (Part number: 51404671-501; sold singly; source: honeywell.com)",
      "",
      "Let me know if you need anything else."].join("\n");
  };
  API_KEY="verification-stub";
  renderReport();
  go("report");
  console.log("SEEDED — intent lines:",replacementPartIntentLines(A.report).length,
    "| identities:",replacementPartIdentities().length,
    "| codes:",replacementPartReportCodes(A.report).join(", "));
})();
