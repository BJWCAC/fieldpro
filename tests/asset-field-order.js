// Serial Number sits with the nameplate identity fields: under Model Number
// on Assets, under Part Number on IA. Run: node tests/asset-field-order.js
var fs=require("fs");
var path=require("path");
var html=fs.readFileSync(path.join(__dirname,"../FieldPro.html"),"utf8");
var app=fs.readFileSync(path.join(__dirname,"../src/app.js"),"utf8");
var failed=0,passed=0;
function check(name,cond,detail){
  if(cond){passed++;return;}
  failed++;
  console.error("FAIL: "+name+(detail?"\n  "+detail:""));
}

var model=html.indexOf('id="asset-model"');
var serialCell=html.indexOf('id="asset-serial-cell"');
var serialInput=html.indexOf('id="asset-serial"');
var eqSlot=html.indexOf('id="asset-serial-slot-equipments"');
var iaPart=html.indexOf('id="asset-ia-part"');
var iaSlot=html.indexOf('id="asset-serial-slot-ia"');
var series=html.indexOf('id="asset-series"');
var categoryFields=html.indexOf('id="asset-category-fields"');
var nameplate=html.indexOf('id="asset-nameplate-additional"');

check("Assets form still has Model Number",model>0);
check("Serial lives in a movable cell",serialCell>0&&serialInput>serialCell);
check("Equipments serial slot sits just after Model Number",eqSlot>model&&eqSlot<series, "model="+model+" eqSlot="+eqSlot+" series="+series);
check("Serial cell starts in the Equipments slot (Assets tab)",serialCell>eqSlot&&serialCell<series);
check("Serial is above Series, category fields, and nameplate notes",serialInput>0&&serialInput<series&&serialInput<categoryFields&&serialInput<nameplate);
check("IA Part Number comes before the IA serial slot",iaPart>0&&iaSlot>iaPart);
check("IA serial slot is before Use Status / later IA fields",iaSlot>0&&iaSlot<html.indexOf('id="asset-use-status"'));
check("placeAssetSerialCell moves the one serial input between tabs",app.indexOf("function placeAssetSerialCell(")>=0);
check("renderAssetModuleUi places serial after GPS",/placeAssetGpsCell\(internal\);\s*placeAssetSerialCell\(internal\);/.test(app));
check("only one Serial Number input", (html.match(/id="asset-serial"/g)||[]).length===1);

if(failed){
  console.error("\n"+failed+" failed, "+passed+" passed");
  process.exit(1);
}
console.log(passed+" passed");
