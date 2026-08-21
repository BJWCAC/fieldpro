// PDF first-page layout checks (see docs/CAPSTONE_DEVELOPMENT_RULES.md).
//
// A report PDF used to leave page 1 as letterhead only: a phone photo scaled
// to ~140mm plus a 50mm caption reserve did not fit under the header, so
// buildPDF() jumped to page 2 before any picture or body text. Page 1 must
// carry the first picture (or the report body when there are no photos).
//
//   node tests/pdf-layout.js
//
// buildPDF() is lifted out of src/app.js and run against a mock jsPDF.
var fs=require("fs");
var path=require("path");

var src=fs.readFileSync(path.join(__dirname,"..","src","app.js"),"utf8");
var failures=[],checks=0;
function check(name,ok,detail){
  checks++;
  if(ok)return;
  failures.push(name+(detail?"\n    "+detail:""));
}

var buildAt=src.indexOf("function buildPDF(");
check("buildPDF() is in src/app.js",buildAt>=0);
var buildBody=buildAt<0?"":src.slice(buildAt,src.indexOf("\n}",buildAt)+2);
check("no longer reserves picture plus 50mm before drawing",buildBody.indexOf("guard(fh+50)")<0,buildBody.slice(0,200));
check("fits a picture into the space left on the current page",
  buildBody.indexOf("function remaining(")>=0&&buildBody.indexOf("function fitPhoto(")>=0&&
  buildBody.indexOf("fitPhoto(p,remaining())")>=0);
check("captions paginate on their own",buildBody.indexOf("function captionBox(")>=0);

function FakePdf(){
  var pages=[{ops:[]}];
  var w=210,h=297;
  function cur(){return pages[pages.length-1];}
  function rec(op,extra){cur().ops.push(Object.assign({op:op},extra||{}));}
  this.internal={
    pageSize:{getWidth:function(){return w;},getHeight:function(){return h;}},
    getNumberOfPages:function(){return pages.length;}
  };
  this.setFillColor=function(){rec("fill");};
  this.setDrawColor=function(){rec("draw");};
  this.setFont=function(){rec("font");};
  this.setFontSize=function(){rec("size");};
  this.setTextColor=function(){rec("color");};
  this.rect=function(x,y,rw,rh){rec("rect",{x:x,y:y,w:rw,h:rh});};
  this.roundedRect=function(x,y,rw,rh){rec("round",{x:x,y:y,w:rw,h:rh});};
  this.line=function(){rec("line");};
  this.text=function(t,x,y){rec("text",{t:String(t),x:x,y:y,page:pages.length});};
  this.splitTextToSize=function(t,width){
    var s=String(t||"");
    var n=Math.max(8,Math.floor((width||80)/4));
    var out=[];
    for(var i=0;i<s.length;i+=n)out.push(s.slice(i,i+n));
    return out.length?out:[""];
  };
  this.addImage=function(data,fmt,x,y,iw,ih){
    rec("image",{page:pages.length,x:x,y:y,w:iw,h:ih,data:data,fmt:fmt});
  };
  this.addPage=function(){pages.push({ops:[]});};
  this._pages=pages;
}

var photoDisplay="data:image/jpeg;base64,"+Array(80).join("A");
var deal={Account_Name:"Rogers WWTP",Deal_Name:"CAC-4641 chart recorder calibration",Stage:"Site Visit",Closing_Date:"2026-08-21"};
var location={address:"123 Plant Rd, Rogers, MN",lat:45.188,lng:-93.553};
var report=["## 1. Site Visit Summary","Calibrated the chart recorder at Rogers WWTP.","",
  "## 4. Calibration Results & Readings","As-found 4.02 mA at 0 GPM. As-left 4.00 mA."].join("\n");
var phonePhoto={display:photoDisplay,time:"10:14 AM",desc:"Nameplate on the recorder.",
  aiDesc:"Chart recorder on a panel.",synthesis:"Recorder calibrated; as-left 4.00 mA.",
  _rw:4032,_rh:3024};

function runBuild(copyLabel,photos,body){
  var window={jspdf:{jsPDF:FakePdf}};
  var fn=new Function(
    "window","isCustomerCopyLabel","fpHasPhotoDisplay",
    "report","deal","photos","location","technician","copyLabel",
    src.slice(buildAt)+"\nreturn buildPDF(report,deal,photos,location,technician,copyLabel);"
  );
  return fn(window,function(){return false;},function(d){return typeof d==="string"&&d.length>=100;},
    body,deal,photos,location,"Quintin",copyLabel);
}

function firstPhotoPage(doc){
  for(var i=0;i<doc._pages.length;i++){
    var ops=doc._pages[i].ops;
    for(var j=0;j<ops.length;j++){
      if(ops[j].op==="image"&&ops[j].data===photoDisplay)return i+1;
    }
  }
  return 0;
}
function pageHasText(doc,page,snippet){
  var ops=doc._pages[page-1]&&doc._pages[page-1].ops||[];
  return ops.some(function(o){return o.op==="text"&&String(o.t).indexOf(snippet)>=0;});
}

["Customer Copy","Internal Copy","Other"].forEach(function(copy){
  var doc=runBuild(copy,[phonePhoto],report);
  check(copy+" keeps the letterhead on page 1",pageHasText(doc,1,"FIELD SERVICE REPORT"));
  check(copy+" prints the first picture on page 1",firstPhotoPage(doc)===1,
    "picture started on page "+firstPhotoPage(doc)+" of "+doc.internal.getNumberOfPages());
  check(copy+" still names the copy on page 1",pageHasText(doc,1,"REPORT COPY"));
});

var noPhoto=runBuild("Internal Copy",[],report);
check("a report with no photos starts the body on page 1",
  pageHasText(noPhoto,1,"Site Visit Summary")||pageHasText(noPhoto,1,"SITE VISIT SUMMARY")||
  noPhoto._pages[0].ops.some(function(o){return o.op==="text"&&/Visit Summary/i.test(o.t);}),
  JSON.stringify(noPhoto._pages[0].ops.filter(function(o){return o.op==="text";}).map(function(o){return o.t;}).slice(0,20)));

var tall=runBuild("Internal Copy",[{display:photoDisplay,time:"10:14 AM",desc:"Nameplate.",
  _rw:3024,_rh:4032}],report);
check("a portrait phone photo still starts on page 1",firstPhotoPage(tall)===1,
  "picture started on page "+firstPhotoPage(tall));

if(failures.length){
  console.error(failures.length+" failed of "+checks+"\n"+failures.join("\n"));
  process.exit(1);
}
console.log("pdf-layout: "+checks+" checks passed");
