// Checks for WO tab helpers: Host is the technician, Meeting Status
// defaults to Active, and meetings sort start-of-day first.
// Run: node tests/wo-tab.js
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
var A={deals:[
  {id:"deal-1",Deal_Name:"CAC-4641 recorder",Account_Name:"Rogers WWTP",Account_Id:"acct-1",Stage:"Active"},
  {id:"deal-2",Deal_Name:"Sanitary McDonalds",Account_Name:"McDonalds",Account_Id:"acct-2",Stage:"Active"}
]};
eval(sliceFn("woLookupName","woLookupId"));
eval(sliceFn("woLookupId","woNormalizeName"));
eval(sliceFn("woNormalizeName","woIsActiveStatus"));
eval(sliceFn("woIsActiveStatus","woMeetingStatus"));
eval(sliceFn("woMeetingStatus","woHostName"));
eval(sliceFn("woHostName","woMatchesTechnician"));
eval(sliceFn("woMatchesTechnician","woMatchesStatusFilter"));
eval(sliceFn("woMatchesStatusFilter","woStartMs"));
eval(sliceFn("woStartMs","sortWorkOrdersByStart"));
eval(sliceFn("sortWorkOrdersByStart","filterWorkOrders"));
eval(sliceFn("filterWorkOrders","woAttachDealAccount"));
eval(sliceFn("woAttachDealAccount","normalizeZohoMeeting"));
eval(sliceFn("normalizeZohoMeeting","woDefaultStatusFilter"));
eval(sliceFn("woDefaultStatusFilter","woStatusFilterFromStorage"));
eval(sliceFn("collectWorkOrderStatuses","formatWoWhen"));

check("Host name comes off the Host lookup",woLookupName({id:"u1",name:"Quintin"})==="Quintin");
check("blank Host is empty",woLookupName(null)==="");
check("name normalize folds case and spaces",woNormalizeName("  Quintin   White ")==="quintin white");
check("Active status is recognized in any case",woIsActiveStatus("ACTIVE")&&woIsActiveStatus("Active"));
check("Completed is not Active",woIsActiveStatus("Completed")===false);

var quintin={id:"m1",title:"Morning cal",start:"2026-09-01T08:00:00-05:00",host:"Quintin",status:"Active",cancelled:false,accountName:"Rogers WWTP"};
var later={id:"m2",title:"Afternoon service",start:"2026-09-01T14:00:00-05:00",host:"Quintin",status:"Active",cancelled:false,accountName:"McDonalds"};
var otherTech={id:"m3",title:"Someone else",start:"2026-09-01T07:00:00-05:00",host:"Brad White",status:"Active",cancelled:false};
var completed={id:"m4",title:"Done last week",start:"2026-08-20T09:00:00-05:00",host:"Quintin",status:"Completed",cancelled:false};
var cancelled={id:"m5",title:"Cancelled",start:"2026-09-01T06:00:00-05:00",host:"Quintin",status:"Active",cancelled:true};

check("Host match uses the technician picker name",woMatchesTechnician(quintin,"Quintin")===true);
check("Host match ignores extra spaces",woMatchesTechnician(quintin," quintin ")===true);
check("Owner-like names do not count — Host must match",woMatchesTechnician({host:"Dispatcher",owner:"Quintin"},"Quintin")===false);
check("no technician selected matches nothing",woMatchesTechnician(quintin,"")===false);

check("Active filter keeps Active",woMatchesStatusFilter(quintin,["Active"])===true);
check("Active filter drops Completed",woMatchesStatusFilter(completed,["Active"])===false);
check("selecting Completed includes that status",woMatchesStatusFilter(completed,["Active","Completed"])===true);

var sorted=sortWorkOrdersByStart([later,quintin]);
check("start of day is first",sorted[0].id==="m1"&&sorted[1].id==="m2",JSON.stringify(sorted.map(function(m){return m.id;})));

var filtered=filterWorkOrders([later,otherTech,completed,cancelled,quintin],{technician:"Quintin",statuses:["Active"]});
check("filter is Host + Active + not cancelled",filtered.length===2&&filtered[0].id==="m1"&&filtered[1].id==="m2",JSON.stringify(filtered.map(function(m){return m.id;})));
check("Completed appears when that status is selected",filterWorkOrders([completed,quintin],{technician:"Quintin",statuses:["Completed"]}).length===1);

var rec=normalizeZohoMeeting({
  id:"ev1",
  Meeting_Title:"Sanitary McDonalds",
  Start_DateTime:"2026-09-01T08:00:00-05:00",
  Host:{id:"u1",name:"Quintin"},
  Who_Id:{id:"c1",name:"Site Contact"},
  What_Id:{id:"deal-2",name:"Sanitary McDonalds"},
  Meeting_Status:{name:"Active"},
  $se_module:"Deals",
  Venue:"Drive-thru"
}, {deals:A.deals,eventModule:"Meetings"});
check("normalized Host is the technician field",rec.host==="Quintin");
check("normalized contact is Who_Id",rec.contact==="Site Contact"&&rec.contactId==="c1");
check("normalized status is Meeting Status",rec.status==="Active");
check("deal link comes from What_Id",rec.dealId==="deal-2"&&rec.dealName==="Sanitary McDonalds");
check("account is filled from the cached deal",rec.accountName==="McDonalds"&&rec.accountId==="acct-2");

var statuses=collectWorkOrderStatuses([completed,quintin],["Cancelled"]);
check("Active is always offered first",statuses[0]==="Active");
check("other statuses from the Meetings picklist stay available",statuses.indexOf("Completed")>=0&&statuses.indexOf("Cancelled")>=0);
check("default status filter is Active",woDefaultStatusFilter().length===1&&woDefaultStatusFilter()[0]==="Active");

if(failed){
  console.error(failed+" failed, "+passed+" passed");
  process.exit(1);
}
console.log("wo-tab: "+passed+" passed");
