// Day / night surface rule for neutral secondary buttons.
// Capture cards are dark at night and white in day mode — .bg must not stay
// navy on a white card. Run: node tests/day-night-buttons.js
var fs=require("fs");
var path=require("path");
var app=fs.readFileSync(path.join(__dirname,"../src/app.js"),"utf8");
var css=fs.readFileSync(path.join(__dirname,"../src/styles.css"),"utf8");
var failed=0,passed=0;
function check(name,cond,detail){
  if(cond){passed++;return;}
  failed++;
  console.error("FAIL: "+name+(detail?"\n  "+detail:""));
}

check("day-mode card .bg rule is in styles.css",css.indexOf("body.light .card .bg:not(.on)")>=0);
check("day-mode card .bg-lg rule is in styles.css",css.indexOf("body.light .card .bg-lg")>=0);
check("day-mode History card .bg rule is in styles.css",css.indexOf("body.light .hist-card .bg:not(.on)")>=0);
check("day-mode photo/video cards follow the parent card",css.indexOf("body.light .pcard{background:#fff")>=0||css.indexOf("body.light .pcard{background:#fff;")>=0);
check("always-white Assets setup keeps the .bw treatment",css.indexOf(".asset-setup-card .bg:not(.on)")>=0);
check("always-white Report cards keep the .bw treatment",css.indexOf("#p-report .card .bg:not(.on)")>=0);

var light=false;
var document={body:{classList:{contains:function(c){return c==="light"&&light;}}}};
var start=app.indexOf("function isLightTheme(");
var end=app.indexOf("\nfunction toggleDark(",start);
if(start<0||end<0)throw new Error("missing isLightTheme / toggleDark");
eval(app.slice(start,end));

light=false;
check("night Capture uses .bg",surfaceNeutralClass()==="bg");
check("Report is .bw even at night",surfaceNeutralClass(true)==="bw");
light=true;
check("day Capture uses .bw",surfaceNeutralClass()==="bw");
check("Report is .bw in day mode",surfaceNeutralClass(true)==="bw");

check("copy picker chooses from the theme",app.indexOf("var neutral=surfaceNeutralClass(scope===\"report\")")>=0);
check("theme toggle re-renders the copy picker",/function toggleDark\(\)\{[^}]*renderReportCopyPickers\(\)/.test(app));
check("theme toggle re-renders photo cards",/function toggleDark\(\)\{[^}]*renderPhotoCards\(\)/.test(app));
check("theme toggle re-renders History cards",/function toggleDark\(\)\{[^}]*renderHistory\(\)/.test(app));
check("photo Save to Phone uses the surface class",app.indexOf("phoneBtn.className=surfaceNeutralClass()+\" bsm\"")>=0);
check("photo → AI uses the surface class",app.indexOf("aiBtn.className=\"field-ai-btn \"+surfaceNeutralClass()+\" bsm\"")>=0);
check("Copy to Other Deals on Capture uses the surface class",app.indexOf("cdb.className=surfaceNeutralClass()+\"-lg\"")>=0);
check("theme toggle re-renders Copy to Other Deals",/function toggleDark\(\)\{[^}]*copy-deals-btn/.test(app));

if(failed){
  console.error("\n"+failed+" failed, "+passed+" passed");
  process.exit(1);
}
console.log(passed+" passed");
