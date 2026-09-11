// Checks for WO tab helpers: Settings User / Technician (Users) is the
// technician, Meeting Status defaults to all statuses, and meetings sort
// start-of-day first.
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
  {id:"deal-1",Deal_Name:"CAC-4641 recorder",Account_Name:"Rogers WWTP",Account_Id:"acct-1",Stage:"Active",Description:"Recorder due for annual calibration"},
  {id:"deal-2",Deal_Name:"Sanitary McDonalds",Account_Name:"McDonalds",Account_Id:"acct-2",Stage:"Active"}
]};
eval(sliceFn("woLookupName","woLookupId"));
eval(sliceFn("woLookupId","woNormalizeName"));
eval(sliceFn("woNormalizeName","woIsActiveStatus"));
eval(sliceFn("woIsActiveStatus","woMeetingStatus"));
eval(sliceFn("woMeetingStatus","woHostName"));
eval(sliceFn("woHostName","woNameTokens"));
eval(sliceFn("woNameTokens","woNamesMatch"));
eval(sliceFn("woNamesMatch","woMatchesTechnician"));
eval(sliceFn("woMatchesTechnician","woStatusKeyList"));
eval(sliceFn("woStatusKeyList","woMatchesStatusFilter"));
eval(sliceFn("woMatchesStatusFilter","woYmd"));
eval(sliceFn("woYmd","woTodayYmd"));
eval(sliceFn("woTodayYmd","woParseYmd"));
eval(sliceFn("woParseYmd","woAddDaysYmd"));
eval(sliceFn("woAddDaysYmd","woDefaultDateRange"));
eval(sliceFn("woDefaultDateRange","woNormalizeDateRange"));
eval(sliceFn("woNormalizeDateRange","woInDateRange"));
eval(sliceFn("woInDateRange","woRangeLabel"));
eval(sliceFn("woRangeLabel","woRangeStartIso"));
eval(sliceFn("woRangeStartIso","woRangeEndIso"));
eval(sliceFn("woRangeEndIso","woStartMs"));
eval(sliceFn("woStartMs","sortWorkOrdersByStart"));
eval(sliceFn("sortWorkOrdersByStart","filterWorkOrders"));
eval(sliceFn("filterWorkOrders","woCountMap"));
eval(sliceFn("woCountMap","woLoadedHint"));
eval(sliceFn("woLoadedHint","woFilterExplain"));
eval(sliceFn("woFilterExplain","woAttachDealAccount"));
eval(sliceFn("woAttachDealAccount","normalizeZohoMeeting"));
eval(sliceFn("normalizeZohoMeeting","woDefaultStatusFilter"));
eval(sliceFn("woDefaultStatusFilter","woStatusFilterFromStorage"));
eval(sliceFn("collectWorkOrderStatuses","formatWoWhen"));
eval(sliceFn("woActionTab","selectWorkOrder"));

check("Host name comes off the Host lookup",woLookupName({id:"u1",name:"Quintin"})==="Quintin");
check("Host object can use email when name is blank",woLookupName({id:"u1",email:"quintin@shop.com"})==="quintin@shop.com");
check("Users lookup can use Name",woLookupName({id:"u1",Name:"Brad White"})==="Brad White");
check("Users picklist can use display_value",woLookupName({display_value:"Brad White"})==="Brad White");
check("Users multi-select is joined",woLookupName([{name:"Brad White"},{name:"Daniel Olson"}])==="Brad White, Daniel Olson");
check("blank Host is empty",woLookupName(null)==="");
check("name normalize folds case and spaces",woNormalizeName("  Quintin   White ")==="quintin white");
check("Active status is recognized in any case",woIsActiveStatus("ACTIVE")&&woIsActiveStatus("Active"));
check("Completed is not Active",woIsActiveStatus("Completed")===false);

var quintin={id:"m1",title:"Morning cal",start:"2026-09-01T08:00:00-05:00",host:"Quintin",status:"Active",cancelled:false,accountName:"Rogers WWTP"};
var later={id:"m2",title:"Afternoon service",start:"2026-09-01T14:00:00-05:00",host:"Quintin",status:"Active",cancelled:false,accountName:"McDonalds"};
var otherTech={id:"m3",title:"Someone else",start:"2026-09-01T07:00:00-05:00",host:"Brad White",status:"Active",cancelled:false};
var completed={id:"m4",title:"Done last week",start:"2026-08-20T09:00:00-05:00",host:"Quintin",status:"Completed",cancelled:false};
var cancelled={id:"m5",title:"Cancelled",start:"2026-09-01T06:00:00-05:00",host:"Quintin",status:"Active",cancelled:true};
var nextMonth={id:"m6",title:"Next month cal",start:"2026-10-15T09:00:00-05:00",host:"Quintin",status:"Active",cancelled:false};

check("Host match uses the technician picker name",woMatchesTechnician(quintin,"Quintin")===true);
check("Host match ignores extra spaces",woMatchesTechnician(quintin," quintin ")===true);
check("first-name picker matches Host First Last",woMatchesTechnician({host:"Quintin Smith"},"Quintin")===true);
check("Host email local-part matches first name",woMatchesTechnician({host:"quintin@shop.com"},"Quintin")===true);
check("blank Host is not the signed-in technician",woMatchesTechnician({host:""},"Quintin")===false);
check("blank Host uses Owner when it matches the technician",woMatchesTechnician({host:"",owner:"Brad White"},"Brad White")===true);
check("Brad White matches Host White, Brad",woMatchesTechnician({host:"White, Brad"},"Brad White")===true);
check("Brad White matches Host Bradley White",woMatchesTechnician({host:"Bradley White"},"Brad White")===true);
check("Owner matches even when Host is a dispatcher",woMatchesTechnician({host:"Dispatcher",owner:"Quintin"},"Quintin")===true);
check("Users picklist matches when Host is a dispatcher",woMatchesTechnician({host:"Dispatcher",users:"Brad White"},"Brad White")===true);
check("Users array matches Settings User / Technician",woMatchesTechnician({host:"",users:[{Name:"Brad White"}]},"Brad White")===true);
check("no technician selected matches nothing",woMatchesTechnician(quintin,"")===false);

check("empty status filter keeps Planned",woMatchesStatusFilter({status:"Planned"},[])===true);
check("Active filter keeps Active",woMatchesStatusFilter(quintin,["Active"])===true);
check("blank Meeting Status still shows when Active is selected",woMatchesStatusFilter({status:""},["Active"])===true);
check("Active filter drops Completed",woMatchesStatusFilter(completed,["Active"])===false);
check("selecting Completed includes that status",woMatchesStatusFilter(completed,["Active","Completed"])===true);
check("Complete chip matches Completed status",woMatchesStatusFilter(completed,["Complete"])===true);

var sorted=sortWorkOrdersByStart([later,quintin]);
check("start of day is first",sorted[0].id==="m1"&&sorted[1].id==="m2",JSON.stringify(sorted.map(function(m){return m.id;})));

var filtered=filterWorkOrders([later,otherTech,completed,cancelled,quintin],{technician:"Quintin",statuses:["Active"]});
check("filter is technician + Active + not cancelled",filtered.length===2&&filtered[0].id==="m1"&&filtered[1].id==="m2",JSON.stringify(filtered.map(function(m){return m.id;})));
var usersOnly={id:"m7",title:"Users field only",start:"2026-09-01T09:00:00-05:00",host:"Dispatcher",users:"Brad White",status:"Planned",cancelled:false};
check("Users field lists for Brad when Host is not Brad",filterWorkOrders([usersOnly],{technician:"Brad White",statuses:[]}).length===1);
check("all-status default keeps Planned Users meetings",filterWorkOrders([usersOnly],{technician:"Brad White",statuses:woDefaultStatusFilter()}).length===1);
check("All hosts includes the other technician",filterWorkOrders([later,otherTech,quintin],{technician:"Quintin",statuses:["Active"],hostMode:"all"}).length===3);
check("Completed appears when that status is selected",filterWorkOrders([completed,quintin],{technician:"Quintin",statuses:["Completed"]}).length===1);
check("without a date picker next month still lists",filterWorkOrders([nextMonth],{technician:"Quintin",statuses:["Active"]}).length===1);
check("Today date range keeps the same day",filterWorkOrders([quintin],{technician:"Quintin",statuses:["Active"],from:"2026-09-01",to:"2026-09-01"}).length===1);
check("Today date range drops next month",filterWorkOrders([nextMonth],{technician:"Quintin",statuses:["Active"],from:"2026-09-01",to:"2026-09-01"}).length===0);
var swapped=woNormalizeDateRange("2026-09-10","2026-09-01");
check("from/to swap when reversed",swapped.from==="2026-09-01"&&swapped.to==="2026-09-10");
var defRange=woDefaultDateRange();
check("default date range is more than today",defRange.from<defRange.to);
check("same-day today labels as Today",woRangeLabel(woTodayYmd(),woTodayYmd())==="Today");

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
check("normalized Host is kept",rec.host==="Quintin");
var usersRec=normalizeZohoMeeting({
  id:"ev2",
  Meeting_Title:"Chart recorder",
  Start_DateTime:"2026-09-01T08:00:00-05:00",
  Host:{id:"d1",name:"Dispatcher"},
  Users:"Brad White",
  Meeting_Status:"Planned"
},{deals:A.deals,eventModule:"Meetings"});
check("normalized Users is the Settings technician field",usersRec.users==="Brad White");
check("Users picklist matches Brad White",woMatchesTechnician(usersRec,"Brad White")===true);
var usersArr=normalizeZohoMeeting({
  id:"ev3",
  Meeting_Title:"Array users",
  Start_DateTime:"2026-09-01T08:00:00-05:00",
  Users:[{id:"u2",Name:"Brad White"}]
},{deals:A.deals,eventModule:"Meetings"});
check("Users array normalizes to Brad White",usersArr.users==="Brad White"&&woMatchesTechnician(usersArr,"Brad White")===true);
check("card User label reads a Users array", (woLookupName([{Name:"Brad White"}])||woLookupName("Dispatcher"))==="Brad White");
check("normalized contact is Who_Id",rec.contact==="Site Contact"&&rec.contactId==="c1");
check("normalized status is Meeting Status",rec.status==="Active");
check("deal link comes from What_Id",rec.dealId==="deal-2"&&rec.dealName==="Sanitary McDonalds");
check("account is filled from the cached deal",rec.accountName==="McDonalds"&&rec.accountId==="acct-2");
check("normalized meeting keeps the Zoho row",rec.raw&&rec.raw.Venue==="Drive-thru"&&rec.raw.Host&&rec.raw.Host.name==="Quintin");

var statuses=collectWorkOrderStatuses([completed,quintin],["Cancelled"]);
check("Active is always offered first",statuses[0]==="Active");
check("other statuses from the Meetings picklist stay available",statuses.indexOf("Completed")>=0&&statuses.indexOf("Cancelled")>=0);
check("default status filter is all statuses",woDefaultStatusFilter().length===0);

var emptyLoad=woFilterExplain([],"Quintin",["Active"]);
check("empty fetch mentions the Today button",/today/i.test(emptyLoad.detail));
var hostMiss=woFilterExplain([otherTech],"Quintin",["Active"]);
check("technician miss names User / Technician",/technician/i.test(hostMiss.title)&&hostMiss.detail.indexOf("Quintin")>=0);
var statusMiss=woFilterExplain([completed],"Quintin",["Active"]);
check("status miss says Active is not a date",statusMiss.detail.indexOf("not a date")>=0);
var dateMiss=woFilterExplain([nextMonth],"Quintin",["Active"],"2026-09-01","2026-09-01");
check("date miss names the range",dateMiss.title.indexOf("date")>=0&&dateMiss.detail.indexOf("Today")>=0);
check("Work this WO goes to Capture",woActionTab({goCapture:true})==="capture");
check("Open assets goes to Assets",woActionTab({goAssets:true})==="assets");
check("opening a WO stays on WO",woActionTab({})==="wo");

eval(sliceFn("woFallbackFields","woSkipFieldApi"));
eval(sliceFn("woSkipFieldApi","woSkipFieldType"));
eval(sliceFn("woSkipFieldType","woFieldIsLookup"));
eval(sliceFn("woFieldIsLookup","woFieldIsShown"));
eval(sliceFn("woFieldIsShown","woFieldForcedReadOnly"));
eval(sliceFn("woFieldForcedReadOnly","woFieldIsEditable"));
eval(sliceFn("woFieldIsEditable","woFieldOrderKey"));
eval(sliceFn("woFieldOrderKey","woFieldIsAllDay"));
eval(sliceFn("woFieldIsAllDay","woFieldSortRank"));
eval(sliceFn("woFieldSortRank","woDealDescriptionText"));
eval(sliceFn("woDealDescriptionText","woDealDescriptionField"));
eval(sliceFn("woDealDescriptionField","woSortMeetingFields"));
eval(sliceFn("woSortMeetingFields","woFieldInputId"));
eval(sliceFn("woFieldInputId","woMeetingFieldByApi"));
eval(sliceFn("woMeetingFieldByApi","woDisplayFieldValue"));
eval(sliceFn("woDisplayFieldValue","woIsoToLocalInput"));
eval(sliceFn("woIsoToLocalInput","woLocalInputToIso"));
eval(sliceFn("woLocalInputToIso","woDateOnly"));
eval(sliceFn("woDateOnly","woFieldValueAliases"));
eval(sliceFn("woFieldValueAliases","woRecordFieldRaw"));
eval(sliceFn("woRecordFieldRaw","woInputValueFromRecord"));
eval(sliceFn("woInputValueFromRecord","woZohoValueFromInput"));
eval(sliceFn("woZohoValueFromInput","woValuesEqual"));
eval(sliceFn("woValuesEqual","woApplyAiPicklistValue"));
eval(sliceFn("woApplyAiPicklistValue","woCopyRawMeetingKeys"));
eval(sliceFn("woCopyRawMeetingKeys","woMergeMeetingRow"));
eval(sliceFn("woMergeMeetingRow","woSeedPutIfEmpty"));
eval(sliceFn("woSeedPutIfEmpty","woSeedRecordFromList"));
eval(sliceFn("woSeedRecordFromList","woBuildMeetingUpdatePayload"));
eval(sliceFn("woBuildMeetingUpdatePayload","woPicklistOptions"));

var fields=woFallbackFields("Meetings","Meeting_Status",["Active","Completed"]);
check("fallback includes Title, Status, Description",fields.some(function(f){return f.api_name==="Meeting_Title";})&&fields.some(function(f){return f.api_name==="Meeting_Status";})&&fields.some(function(f){return f.api_name==="Description";}));
check("fallback title uses Zoho Meeting Title",fields.filter(function(f){return f.api_name==="Meeting_Title";})[0].label==="Meeting Title");
check("fallback From and To match Zoho",fields.filter(function(f){return f.api_name==="Start_DateTime";})[0].label==="From"&&fields.filter(function(f){return f.api_name==="End_DateTime";})[0].label==="To");
check("fallback Users keeps the Zoho name",fields.filter(function(f){return f.api_name==="Users";})[0].label==="Users");
check("fallback Who_Id is Contact Name",fields.filter(function(f){return f.api_name==="Who_Id";})[0].label==="Contact Name");
check("fallback Owner is Meeting Owner",fields.filter(function(f){return f.api_name==="Owner";})[0].label==="Meeting Owner");
check("system fields are skipped",woSkipFieldApi("id")&&woSkipFieldApi("Created_By")&&woSkipFieldApi("$se_module")&&!woSkipFieldApi("Venue"));
check("formula fields are not editable",woFieldIsEditable({api_name:"Age",data_type:"formula",read_only:false})===false);
check("lookups are not sent as free text",woFieldIsEditable({api_name:"Who_Id",data_type:"lookup",read_only:false})===false);
check("title is editable",woFieldIsEditable({api_name:"Meeting_Title",data_type:"text",read_only:false})===true);
check("webhook read_only text stays editable",woFieldIsEditable({api_name:"Title",data_type:"text",read_only:true})===true);
check("title sorts before description",woFieldSortRank("Meeting_Title")<woFieldSortRank("Description"));
check("sorted fields keep title first",woSortMeetingFields(fields)[0].api_name==="Meeting_Title");

var order=woSortMeetingFields(fields).map(function(f){return f.api_name;});
var wanted=["Meeting_Title","Venue","Location","Start_DateTime","End_DateTime","Who_Id","What_Id","Meeting_Status","Host","Participants","Description","Deal_Description"];
check("meeting form follows the asked-for field order",order.slice(0,wanted.length).join(",")===wanted.join(","),order.join(","));
check("All day is the last field on the form",order[order.length-1]==="All_day",order.join(","));
check("leftover fields sit under Deal Description and above All day",order.indexOf("Users")>order.indexOf("Deal_Description")&&order.indexOf("Users")<order.indexOf("All_day"),order.join(","));
check("Participants is shown on the meeting form",fields.some(function(f){return f.api_name==="Participants";})&&!woSkipFieldApi("Participants"));
check("Participants is never written back to Zoho",woFieldIsEditable({api_name:"Participants",data_type:"multiselectlookup",read_only:false})===false);
check("Participants survives a Zoho type CapStone otherwise skips",woFieldIsShown({api_name:"Participants",data_type:"subform"})===true);
check("Remind Participants stays off the form",woSkipFieldApi("Remind_Participants")===true);
check("Participants names read from the Zoho array",woDisplayFieldValue([{name:"Site Contact"},{name:"Quintin"}])==="Site Contact, Quintin");

var zohoLabeled=[
  {api_name:"Event_Title",label:"Title",data_type:"text"},
  {api_name:"CF_Deal_Notes",label:"Deal Description",data_type:"textarea"},
  {api_name:"Venue",label:"Meeting Venue",data_type:"text"},
  {api_name:"What_Id",label:"Deal",data_type:"lookup"},
  {api_name:"All_day",label:"All day",data_type:"boolean"}
];
var labeledOrder=woSortMeetingFields(zohoLabeled).map(function(f){return f.api_name;});
check("Zoho labels place a renamed field",labeledOrder.join(",")==="Event_Title,Venue,What_Id,CF_Deal_Notes,All_day",labeledOrder.join(","));
check("a real Deal Description field is not doubled",labeledOrder.filter(function(a){return a==="Deal_Description";}).length===0);
check("a real Deal Description field stays editable",woFieldIsEditable({api_name:"CF_Deal_Notes",label:"Deal Description",data_type:"textarea"})===true);

// The shop's own Zoho layout (Events module): the status field is Work_Status,
// Host is the Owner lookup, the venue field is labeled Location, and Deal
// Description is a real Zoho field. Only the labels put those where asked.
var shopLayout=[
  {api_name:"All_day",label:"All day",data_type:"boolean"},
  {api_name:"Asset_List_From_Deals",label:"Asset List From Deals",data_type:"textarea"},
  {api_name:"Deal_Description",label:"Deal Description",data_type:"textarea"},
  {api_name:"Description",label:"Description",data_type:"textarea"},
  {api_name:"End_DateTime",label:"To",data_type:"datetime"},
  {api_name:"Event_Title",label:"Title",data_type:"text"},
  {api_name:"Owner",label:"Host",data_type:"ownerlookup"},
  {api_name:"Participants",label:"Participants",data_type:"bigint"},
  {api_name:"Start_DateTime",label:"From",data_type:"datetime"},
  {api_name:"Venue",label:"Location",data_type:"text"},
  {api_name:"What_Id",label:"Related To",data_type:"lookup"},
  {api_name:"Who_Id",label:"Contact Name",data_type:"lookup"},
  {api_name:"Work_Status",label:"Meeting Status",data_type:"picklist"}
];
var shopOrder=woSortMeetingFields(shopLayout).map(function(f){return f.label;});
check("the shop's own Zoho layout reads in the asked-for order",shopOrder.join(",")==="Title,Location,From,To,Contact Name,Related To,Meeting Status,Host,Participants,Description,Deal Description,Asset List From Deals,All day",shopOrder.join(","));
check("Work_Status is the Meeting Status slot",woFieldSortRank("Work_Status","Meeting Status")===woFieldSortRank("Meeting_Status","Meeting Status"));
check("Owner labeled Host is the Host slot",woFieldSortRank("Owner","Host")===woFieldSortRank("Host","Host"));
check("Owner labeled Meeting Owner is a leftover field",woFieldSortRank("Owner","Meeting Owner")>woFieldSortRank("Deal_Description","Deal Description"));
check("Participants stays read-only when Zoho calls it a number",woFieldIsEditable({api_name:"Participants",data_type:"bigint"})===false);

var dealDescField=woSortMeetingFields(fields).filter(function(f){return f.api_name==="Deal_Description";})[0];
check("Deal Description is added when the layout has none",!!dealDescField&&dealDescField.fpVirtual==="deal_description");
check("Deal Description is read-only",woFieldIsEditable(dealDescField)===false);
check("Deal Description reads the linked deal",woDealDescriptionText({dealId:"deal-1"})==="Recorder due for annual calibration");
check("Deal Description is blank with no deal",woDealDescriptionText({dealId:"deal-none"})==="");
check("Deal Description is not sent to Zoho",Object.keys(woBuildMeetingUpdatePayload([dealDescField],{},{Deal_Description:"Recorder due for annual calibration"})).length===0);
check("input id is stable",woFieldInputId("Meeting_Status")==="wo-f-Meeting_Status");
check("lookup display uses the name",woDisplayFieldValue({id:"c1",name:"Site Contact"})==="Site Contact");
check("boolean display is true/false",woDisplayFieldValue(true)==="true"&&woDisplayFieldValue(false)==="false");
check("date-only strips time",woDateOnly("2026-09-02T08:00:00-05:00")==="2026-09-02");
var local=woIsoToLocalInput("2026-09-02T14:30:00-05:00");
check("iso to local input has T",local.indexOf("T")>0&&/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(local));
var back=woLocalInputToIso(local);
check("local input returns an offset ISO",/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:00[+-]\d{2}:\d{2}$/.test(back));
check("AI picklist matches case-insensitively",woApplyAiPicklistValue(["Active","Completed"],"completed")==="Completed");
check("AI picklist keeps an exact option",woApplyAiPicklistValue(["Active","Planned"],"Planned")==="Planned");
var payload=woBuildMeetingUpdatePayload(fields,{
  Meeting_Title:"Old title",
  Description:"",
  Meeting_Status:"Active"
},{
  Meeting_Title:"Sanitary McDonalds",
  Description:"Calibrated the recorder.",
  Meeting_Status:"Active"
});
check("payload includes changed title and description",payload.Meeting_Title==="Sanitary McDonalds"&&payload.Description==="Calibrated the recorder.");
check("payload omits unchanged status",payload.Meeting_Status==null);
check("unchanged meeting builds an empty payload",Object.keys(woBuildMeetingUpdatePayload(fields,{Venue:"Plant"},{Venue:"Plant"})).length===0);

var mergedKeep=woMergeMeetingRow({Meeting_Title:"A",Venue:"Plant",Custom_Note:"keep"},{Venue:"Shop",Missing:undefined});
check("merge keeps seed when overlay omits a key",mergedKeep.Meeting_Title==="A"&&mergedKeep.Custom_Note==="keep");
check("merge writes overlay values",mergedKeep.Venue==="Shop");
check("merge does not copy undefined",woMergeMeetingRow({Venue:"Plant"},{Venue:undefined}).Venue==="Plant");
check("merge allows Zoho null",woMergeMeetingRow({Venue:"Plant"},{Venue:null}).Venue===null);

var rawMeeting={
  id:"ev1",
  Meeting_Title:"Sanitary McDonalds",
  Start_DateTime:"2026-09-01T08:00:00-05:00",
  Host:{id:"u1",name:"Quintin"},
  Who_Id:{id:"c1",name:"Site Contact"},
  What_Id:{id:"deal-2",name:"Sanitary McDonalds"},
  Meeting_Status:{name:"Active"},
  Venue:"Drive-thru",
  Job_Notes:"Bleed the air",
  $se_module:"Deals"
};
var seeded=woSeedRecordFromList(normalizeZohoMeeting(rawMeeting,{deals:A.deals,eventModule:"Meetings"}));
check("seed copies custom Zoho fields from the list row",seeded.Job_Notes==="Bleed the air");
check("seed keeps the Host lookup object",seeded.Host&&seeded.Host.name==="Quintin");
check("seed does not copy $ keys",seeded.$se_module==null);
check("seed fills Meeting Title from the list",seeded.Meeting_Title==="Sanitary McDonalds");
check("title input comes from the Zoho record",woInputValueFromRecord({api_name:"Meeting_Title",data_type:"text"},seeded)==="Sanitary McDonalds");
check("Title field reads Meeting_Title",woInputValueFromRecord({api_name:"Title",data_type:"text"},seeded)==="Sanitary McDonalds");
check("Status field reads Meeting_Status",woInputValueFromRecord({api_name:"Status",data_type:"text"},seeded)==="Active");
check("lookup input shows the Zoho name",woInputValueFromRecord({api_name:"Who_Id",data_type:"lookup",lookup:true},seeded)==="Site Contact");
check("meeting field read_only ignores webhook",!/read_only: !!\(f\.read_only \|\| f\.webhook/.test(fs.readFileSync(path.join(__dirname,"../netlify/functions/zoho-proxy.js"),"utf8")));

check("re-render does not overlay empty DOM onto Zoho values",/if\(opts\.keepValues\)/.test(src)&&!/opts\.keepValues\|\|Object\.keys\(live\)/.test(src));
check("boolean checkbox uses the Zoho field label",!/All-day meeting/.test(src));
check("picklists are only picklist types",/dt==="picklist"\|\|dt==="multipicklist"/.test(src)&&!/dt==="picklist"\|\|opts\.length/.test(src));
check("get_meeting prefers layout GET then missing fields",/Layout GET \(no fields\)/.test(fs.readFileSync(path.join(__dirname,"../netlify/functions/zoho-proxy.js"),"utf8")));

if(failed){
  console.error(failed+" failed, "+passed+" passed");
  process.exit(1);
}
console.log("wo-tab: "+passed+" passed");
