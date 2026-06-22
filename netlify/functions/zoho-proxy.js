const https = require("https");
var PROXY_BUILD = "278";

exports.handler = async function(event) {
  const h = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS"
  };
  if (event.httpMethod === "OPTIONS") return { statusCode: 200, headers: h, body: "" };

  function req(opts, body) {
    return new Promise(function(res, rej) {
      var r = https.request(opts, function(response) {
        var d = "";
        response.on("data", function(c) { d += c; });
        response.on("end", function() { res({ status: response.statusCode, body: d }); });
      });
      r.on("error", rej);
      if (body) r.write(body);
      r.end();
    });
  }

  try {
    var data = JSON.parse(event.body);
    var token = data.token;

    if (data.action === "ping_proxy") {
      return {
        statusCode: 200,
        headers: h,
        body: JSON.stringify({
          ok: true,
          proxy_build: PROXY_BUILD,
          layout_activation: true,
          reopen_confirm: true,
          picklist_resolve: true,
          asset_category_picklist: true
        })
      };
    }

    if (data.action === "get_asset_category_picklist") {
      var categoryPicklistValues = await loadAssetCategoryPicklistValues(token);
      return {
        statusCode: 200,
        headers: h,
        body: JSON.stringify({ ok: true, data: categoryPicklistValues, proxy_build: PROXY_BUILD })
      };
    }

    function isDeprecatedFlowCategory(cat) {
      return /^flow$/i.test(String(cat || "").trim());
    }

    function pickCanonicalFlowMeterCategory(categoryValues) {
      var list = Array.isArray(categoryValues) ? categoryValues : [];
      for (var i = 0; i < list.length; i++) {
        var v = String(list[i] || "").trim();
        if (isFlowMeterCategory(v)) return v;
      }
      return "Flow Meter";
    }

    function assetCategoryPicklistOptions(fieldsBody) {
      var options = [];
      try {
        var fields = (fieldsBody && fieldsBody.fields) || fieldsBody || [];
        for (var fi = 0; fi < fields.length; fi++) {
          var f = fields[fi];
          if (f.api_name !== "Asset_Category") continue;
          (f.pick_list_values || []).forEach(function(opt) {
            if (!opt || opt.type === "unused") return;
            var actual = String(opt.actual_value || "").trim();
            var display = String(opt.display_value || "").trim();
            if (!actual && !display) return;
            options.push({ actual: actual || display, display: display || actual });
          });
        }
      } catch (e) {}
      return options;
    }

    function resolveAssetCategoryFromOptions(want, options) {
      want = String(want || "").trim();
      if (!want || !options.length) return want;

      function actualExact(match) {
        for (var i = 0; i < options.length; i++) {
          if (options[i].actual === match) return options[i].actual;
        }
        return null;
      }
      function actualCaseInsensitive(match) {
        var low = match.toLowerCase();
        for (var j = 0; j < options.length; j++) {
          if (options[j].actual.toLowerCase() === low) return options[j].actual;
        }
        return null;
      }

      var hit = actualExact(want) || actualCaseInsensitive(want);
      if (hit) return hit;

      if (isFlowMeterCategory(want)) {
        for (var fm = 0; fm < options.length; fm++) {
          if (isFlowMeterCategory(options[fm].actual)) return options[fm].actual;
        }
        for (var fd = 0; fd < options.length; fd++) {
          if (isFlowMeterCategory(options[fd].display) && !isDeprecatedFlowCategory(options[fd].actual)) return options[fd].actual;
        }
        return want;
      }

      if (isOpenChannelFlowCategory(want)) {
        for (var oi = 0; oi < options.length; oi++) {
          if (isOpenChannelFlowCategory(options[oi].actual)) return options[oi].actual;
        }
        for (var od = 0; od < options.length; od++) {
          if (isOpenChannelFlowCategory(options[od].display)) return options[od].actual;
        }
      }

      var wantLow = want.toLowerCase();
      for (var di = 0; di < options.length; di++) {
        var opt = options[di];
        if (opt.display !== want && opt.display.toLowerCase() !== wantLow) continue;
        if (isFlowMeterCategory(want) && isDeprecatedFlowCategory(opt.actual)) continue;
        return opt.actual || want;
      }

      return want;
    }

    async function resolveAssetCategoryValue(token, inputValue) {
      var want = String(inputValue || "").trim();
      if (!want) return want;
      var fieldsResult = await req({
        hostname: "www.zohoapis.com",
        path: "/crm/v3/settings/fields?module=Equipments",
        method: "GET",
        headers: { "Authorization": "Zoho-oauthtoken " + token }
      });
      if (fieldsResult.status < 200 || fieldsResult.status >= 300) return want;
      try {
        var options = assetCategoryPicklistOptions(JSON.parse(fieldsResult.body));
        return resolveAssetCategoryFromOptions(want, options);
      } catch (re) {
        return want;
      }
    }

    async function loadAssetCategoryPicklistValues(token) {
      var vals = [];
      var fieldsResult = await req({
        hostname: "www.zohoapis.com",
        path: "/crm/v3/settings/fields?module=Equipments",
        method: "GET",
        headers: { "Authorization": "Zoho-oauthtoken " + token }
      });
      if (fieldsResult.status >= 200 && fieldsResult.status < 300) {
        try {
          var options = assetCategoryPicklistOptions(JSON.parse(fieldsResult.body));
          options.forEach(function(opt) {
            var v = String(opt.actual || "").trim();
            if (!v || vals.indexOf(v) >= 0) return;
            if (isDeprecatedFlowCategory(v) && options.some(function(o) { return isFlowMeterCategory(o.actual) || isFlowMeterCategory(o.display); })) return;
            vals.push(v);
          });
        } catch (le) {}
      }
      return vals;
    }

    function isOpenChannelFlowCategory(cat) {
      var s = String(cat || "").trim();
      if (!s) return false;
      if (/^flow\s*meter$/i.test(s)) return false;
      return /flow\s*open\s*channel|open\s*channel\s*flow/i.test(s);
    }

    function pickCanonicalOcfCategory(categoryValues) {
      var list = Array.isArray(categoryValues) ? categoryValues : [];
      for (var i = 0; i < list.length; i++) {
        var v = String(list[i] || "").trim();
        if (/^flow\s*open\s*channel$/i.test(v)) return v;
      }
      for (var j = 0; j < list.length; j++) {
        var v2 = String(list[j] || "").trim();
        if (isOpenChannelFlowCategory(v2)) return v2;
      }
      return "Flow Open Channel";
    }

    function isFlowMeterCategory(cat) {
      return /^flow\s*meter$/i.test(String(cat || "").trim());
    }

    function categoriesEquivalent(a, b) {
      a = String(a || "").trim();
      b = String(b || "").trim();
      if (!a || !b) return false;
      if (a === b) return true;
      if (isFlowMeterCategory(a) && isFlowMeterCategory(b)) return true;
      if (isOpenChannelFlowCategory(a) && isOpenChannelFlowCategory(b)) return true;
      return false;
    }

    if (data.action === "get_technicians") {
      var fieldsResult = await req({
        hostname: "www.zohoapis.com",
        path: "/crm/v3/settings/fields?module=Internal_Assets",
        method: "GET",
        headers: { "Authorization": "Zoho-oauthtoken " + token }
      });
      if (fieldsResult.status < 200 || fieldsResult.status >= 300) {
        return { statusCode: fieldsResult.status, headers: h, body: fieldsResult.body };
      }
      var technicians = [];
      var fieldApi = String(data.field_api_name || "Users");
      try {
        var fieldRows = (JSON.parse(fieldsResult.body).fields || []);
        var usersField = null;
        for (var fi = 0; fi < fieldRows.length; fi++) {
          if (fieldRows[fi].api_name === fieldApi) { usersField = fieldRows[fi]; break; }
        }
        if (usersField && Array.isArray(usersField.pick_list_values)) {
          usersField.pick_list_values.forEach(function (opt) {
            if (!opt) return;
            if (opt.type === "unused") return;
            var name = String(opt.display_value || opt.actual_value || "").trim();
            if (!name || name === "-None-") return;
            if (technicians.indexOf(name) < 0) technicians.push(name);
          });
        }
      } catch (fe) {}
      technicians.sort(function (a, b) { return a.localeCompare(b); });
      return {
        statusCode: 200,
        headers: h,
        body: JSON.stringify({
          ok: true,
          source: "zoho",
          module: "Internal_Assets",
          field_api_name: fieldApi,
          technicians: technicians
        })
      };
    }

    if (data.action === "get_deals") {
      var result = await req({
        hostname: "www.zohoapis.com",
        path: "/crm/v3/Deals?per_page=200&page=" + (data.page || 1) + "&fields=Deal_Name,Account_Name,Stage,Amount,Description,Owner,Closing_Date",
        method: "GET",
        headers: { "Authorization": "Zoho-oauthtoken " + token }
      });
      return { statusCode: result.status, headers: h, body: result.body };
    }

    if (data.action === "get_accounts") {
      var acctFields = "Account_Name,Account_Status,Phone,Latitude_Longitude,googlemapreports__Latitude,googlemapreports__Longitude,Shipping_Street,Shipping_Street_2,Shipping_City,Shipping_State,Shipping_Code,Billing_Street,Billing_City,Billing_State,Billing_Code";
      var acctResult = await req({
        hostname: "www.zohoapis.com",
        path: "/crm/v3/Accounts?per_page=200&page=" + (data.page || 1) + "&fields=" + acctFields,
        method: "GET",
        headers: { "Authorization": "Zoho-oauthtoken " + token }
      });
      return { statusCode: acctResult.status, headers: h, body: acctResult.body };
    }

    if (data.action === "get_map_deals") {
      var mapDealResult = await req({
        hostname: "www.zohoapis.com",
        path: "/crm/v3/Deals?per_page=200&page=" + (data.page || 1) + "&fields=Deal_Name,Stage,Account_Name,Pipeline",
        method: "GET",
        headers: { "Authorization": "Zoho-oauthtoken " + token }
      });
      return { statusCode: mapDealResult.status, headers: h, body: mapDealResult.body };
    }

    if (data.action === "get_map_events") {
      var eventPage = data.page || 1;
      var moduleName = data.crm_module || "Events";
      var titleField = moduleName === "Meetings" ? "Meeting_Title" : "Event_Title";
      var eventFields = titleField + ",Start_DateTime,End_DateTime,What_Id,Venue,Location,$se_module,$event_cancelled";

      function fetchCrmEvents(mod) {
        var tf = mod === "Meetings" ? "Meeting_Title" : "Event_Title";
        var fields = tf + ",Start_DateTime,End_DateTime,What_Id,Venue,Location,$se_module,$event_cancelled";
        return req({
          hostname: "www.zohoapis.com",
          path: "/crm/v3/" + mod + "?per_page=200&page=" + eventPage + "&fields=" + encodeURIComponent(fields),
          method: "GET",
          headers: { "Authorization": "Zoho-oauthtoken " + token }
        });
      }

      var eventResult = await fetchCrmEvents(moduleName);
      if (!data.crm_module && eventPage === 1 && eventResult.status >= 400) {
        var meetingTry = await fetchCrmEvents("Meetings");
        if (meetingTry.status >= 200 && meetingTry.status < 300) {
          eventResult = meetingTry;
          moduleName = "Meetings";
        }
      }
      if (eventResult.status < 200 || eventResult.status >= 300) {
        return { statusCode: eventResult.status, headers: h, body: eventResult.body };
      }
      try {
        var eventJson = JSON.parse(eventResult.body);
        eventJson.data = (eventJson.data || []).map(function (row) {
          if (!row.Event_Title && row.Meeting_Title) row.Event_Title = row.Meeting_Title;
          return row;
        });
        eventJson.__fp_module = moduleName;
        return { statusCode: 200, headers: h, body: JSON.stringify(eventJson) };
      } catch (ee) {
        return { statusCode: eventResult.status, headers: h, body: eventResult.body };
      }
    }

    if (data.action === "geocode") {
      var geoKey = process.env.GOOGLE_GEOCODE_API_KEY || "";
      var address = String(data.address || "").trim();
      if (!address) {
        return { statusCode: 400, headers: h, body: JSON.stringify({ ok: false, error: "Missing address" }) };
      }
      if (!geoKey) {
        return { statusCode: 503, headers: h, body: JSON.stringify({ ok: false, error: "Geocoding not configured (GOOGLE_GEOCODE_API_KEY)" }) };
      }
      var geoPath = "/maps/api/geocode/json?address=" + encodeURIComponent(address) + "&key=" + encodeURIComponent(geoKey);
      var geoResult = await req({
        hostname: "maps.googleapis.com",
        path: geoPath,
        method: "GET",
        headers: {}
      });
      if (geoResult.status < 200 || geoResult.status >= 300) {
        return { statusCode: geoResult.status, headers: h, body: geoResult.body };
      }
      var lat = null, lng = null;
      try {
        var geoJson = JSON.parse(geoResult.body);
        if (geoJson.status === "OK" && geoJson.results && geoJson.results[0] && geoJson.results[0].geometry && geoJson.results[0].geometry.location) {
          lat = geoJson.results[0].geometry.location.lat;
          lng = geoJson.results[0].geometry.location.lng;
        }
      } catch (ge) {}
      return {
        statusCode: 200,
        headers: h,
        body: JSON.stringify({ ok: lat != null && lng != null, lat: lat, lng: lng })
      };
    }

    if (data.action === "save_note") {
      var note = data.note_content;
      if (note.indexOf("Generated by CapStone") < 0) {
        note += "\n\n--------------------\nGenerated by CapStone - Calibrations & Controls";
      }
      var payload = JSON.stringify({ data: [{ Note_Title: data.note_title, Note_Content: note, Parent_Id: data.deal_id, se_module: "Deals" }] });
      var result2 = await req({
        hostname: "www.zohoapis.com",
        path: "/crm/v3/Deals/" + data.deal_id + "/Notes",
        method: "POST",
        headers: { "Authorization": "Zoho-oauthtoken " + token, "Content-Type": "application/json", "Content-Length": Buffer.byteLength(payload) }
      }, payload);
      return { statusCode: result2.status, headers: h, body: result2.body };
    }

    if (data.action === "find_note") {
      var findResult = await req({
        hostname: "www.zohoapis.com",
        path: "/crm/v3/Deals/" + data.deal_id + "/Notes?per_page=200&fields=Note_Title,Note_Content,Created_Time",
        method: "GET",
        headers: { "Authorization": "Zoho-oauthtoken " + token }
      });
      if (findResult.status < 200 || findResult.status >= 300) {
        return { statusCode: findResult.status, headers: h, body: findResult.body };
      }
      var found = null;
      try {
        var notes = (JSON.parse(findResult.body).data || []);
        for (var ni = 0; ni < notes.length; ni++) {
          var note = notes[ni];
          var content = String(note.Note_Content || "");
          if (data.marker && content.indexOf(data.marker) >= 0) { found = note; break; }
          if (!data.marker && !found && data.note_title && note.Note_Title === data.note_title) found = note;
        }
      } catch (ne) {}
      return { statusCode: 200, headers: h, body: JSON.stringify({ ok: true, note_id: found && found.id || null }) };
    }

    if (data.action === "update_note") {
      var updatedNote = data.note_content;
      if (updatedNote.indexOf("Generated by CapStone") < 0) {
        updatedNote += "\n\n--------------------\nGenerated by CapStone - Calibrations & Controls";
      }
      var updatePayload = JSON.stringify({ data: [{ Note_Title: data.note_title, Note_Content: updatedNote }] });
      var updateResult = await req({
        hostname: "www.zohoapis.com",
        path: "/crm/v3/Notes/" + data.note_id,
        method: "PUT",
        headers: { "Authorization": "Zoho-oauthtoken " + token, "Content-Type": "application/json", "Content-Length": Buffer.byteLength(updatePayload) }
      }, updatePayload);
      return { statusCode: updateResult.status, headers: h, body: updateResult.body };
    }

    if (data.action === "save_equipment_note") {
      var equipmentNote = data.note_content || "";
      if (equipmentNote.indexOf("Generated by CapStone") < 0) {
        equipmentNote += "\n\n--------------------\nGenerated by CapStone - Calibrations & Controls";
      }
      var equipmentNotePayload = JSON.stringify({ data: [{ Note_Title: data.note_title, Note_Content: equipmentNote, Parent_Id: data.equipment_id, se_module: "Equipments" }] });
      var equipmentNoteResult = await req({
        hostname: "www.zohoapis.com",
        path: "/crm/v3/Equipments/" + data.equipment_id + "/Notes",
        method: "POST",
        headers: { "Authorization": "Zoho-oauthtoken " + token, "Content-Type": "application/json", "Content-Length": Buffer.byteLength(equipmentNotePayload) }
      }, equipmentNotePayload);
      return { statusCode: equipmentNoteResult.status, headers: h, body: equipmentNoteResult.body };
    }

    if (data.action === "refresh_token") {
      var tokenBody = "refresh_token=" + encodeURIComponent(String(data.refresh_token || "")) +
        "&client_id=" + encodeURIComponent(String(data.client_id || "")) +
        "&client_secret=" + encodeURIComponent(String(data.client_secret || "")) +
        "&grant_type=refresh_token";
      var result3 = await req({
        hostname: "accounts.zoho.com",
        path: "/oauth/v2/token",
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "Content-Length": Buffer.byteLength(tokenBody)
        }
      }, tokenBody);
      return { statusCode: result3.status, headers: h, body: result3.body };
    }

    if (data.action === "upload_photo") {
      var imgBuf = Buffer.from(data.image_b64, "base64");
      var boundary = "CapStoneBound" + Date.now();
      var hdr = Buffer.from("--" + boundary + "\r\nContent-Disposition: form-data; name=\"file\"; filename=\"" + data.filename + "\"\r\nContent-Type: image/jpeg\r\n\r\n");
      var ftr = Buffer.from("\r\n--" + boundary + "--\r\n");
      var uploadBody = Buffer.concat([hdr, imgBuf, ftr]);
      var result4 = await req({
        hostname: "www.zohoapis.com",
        path: "/crm/v3/Deals/" + data.deal_id + "/Attachments",
        method: "POST",
        headers: {
          "Authorization": "Zoho-oauthtoken " + token,
          "Content-Type": "multipart/form-data; boundary=" + boundary,
          "Content-Length": uploadBody.length
        }
      }, uploadBody);
      return { statusCode: result4.status, headers: h, body: result4.body };
    }

    if (data.action === "upload_deal_attachment") {
      var attachBuf = Buffer.from(data.file_b64, "base64");
      var attachBoundary = "CapStoneBound" + Date.now();
      var attachFilename = String(data.filename || "capstone-report.pdf").replace(/"/g, "");
      var attachMime = data.mime_type || "application/pdf";
      var attachHdr = Buffer.from("--" + attachBoundary + "\r\nContent-Disposition: form-data; name=\"file\"; filename=\"" + attachFilename + "\"\r\nContent-Type: " + attachMime + "\r\n\r\n");
      var attachFtr = Buffer.from("\r\n--" + attachBoundary + "--\r\n");
      var attachBody = Buffer.concat([attachHdr, attachBuf, attachFtr]);
      var attachResult = await req({
        hostname: "www.zohoapis.com",
        path: "/crm/v3/Deals/" + data.deal_id + "/Attachments",
        method: "POST",
        headers: {
          "Authorization": "Zoho-oauthtoken " + token,
          "Content-Type": "multipart/form-data; boundary=" + attachBoundary,
          "Content-Length": attachBody.length
        }
      }, attachBody);
      return { statusCode: attachResult.status, headers: h, body: attachResult.body };
    }
    function equipmentAccountId(rec) {
      var a = rec && rec.Account;
      if (!a) return "";
      if (typeof a === "string") return a;
      return a.id || "";
    }

    function equipmentBypassAccountFilter(rec, q) {
      var qLower = String(q || "").trim().toLowerCase();
      if (!qLower) return false;
      var cac = String(rec.CAC_Asset_ID || "").trim().toLowerCase();
      if (cac && (cac === qLower || cac.indexOf(qLower) >= 0)) return true;
      var cust = String(rec.Customer_Asset_Number || "").trim().toLowerCase();
      if (cust && (cust === qLower || cust.indexOf(qLower) >= 0)) return true;
      var name = String(rec.Name || "").trim().toLowerCase();
      if (name && name.indexOf(qLower) >= 0) return true;
      return false;
    }

    function equipmentMatchesAccountScope(rec, accountId, q) {
      if (!accountId) return true;
      if (equipmentAccountId(rec) === accountId) return true;
      return equipmentBypassAccountFilter(rec, q);
    }

    function subformAssetId(row) {
      var a = row && row.Assets;
      if (!a) return "";
      if (typeof a === "string") return a;
      return a.id || "";
    }

    if (data.action === "link_equipment_to_deal") {
      var dealResult = await req({
        hostname: "www.zohoapis.com",
        path: "/crm/v3/Deals/" + data.deal_id + "?fields=Assets_and_Checklist",
        method: "GET",
        headers: { "Authorization": "Zoho-oauthtoken " + token }
      });
      if (dealResult.status < 200 || dealResult.status >= 300) return { statusCode: dealResult.status, headers: h, body: dealResult.body };
      var rows = [];
      try {
        var dealRec = (JSON.parse(dealResult.body).data || [])[0] || {};
        rows = Array.isArray(dealRec.Assets_and_Checklist) ? dealRec.Assets_and_Checklist : [];
      } catch (de) {}
      var exists = false;
      for (var ri = 0; ri < rows.length; ri++) {
        if (subformAssetId(rows[ri]) === data.equipment_id) {
          exists = true;
          if (data.description) rows[ri].Instrument_Description = data.description;
          if (data.notes) rows[ri].If_not_completed_why = data.notes;
          break;
        }
      }
      if (!exists) {
        rows.push({
          Assets: { id: data.equipment_id },
          Instrument_Description: data.description || "",
          If_not_completed_why: data.notes || ""
        });
      }
      var dealPayload = JSON.stringify({ data: [{ Assets_and_Checklist: rows }] });
      var dealUpdateResult = await req({
        hostname: "www.zohoapis.com",
        path: "/crm/v3/Deals/" + data.deal_id,
        method: "PUT",
        headers: { "Authorization": "Zoho-oauthtoken " + token, "Content-Type": "application/json", "Content-Length": Buffer.byteLength(dealPayload) }
      }, dealPayload);
      return { statusCode: dealUpdateResult.status, headers: h, body: JSON.stringify({ ok: dealUpdateResult.status >= 200 && dealUpdateResult.status < 300, already_linked: exists, response: dealUpdateResult.body }) };
    }

    if (data.action === "list_engineering_units") {
      var euModule = String(data.module_api_name || "CustomModule8");
      var euNameField = String(data.name_field || "Name");
      var euFields = encodeURIComponent(euNameField);
      var euPage = 1;
      var euRows = [];
      while (euPage <= 20) {
        var euResult = await req({
          hostname: "www.zohoapis.com",
          path: "/crm/v3/" + encodeURIComponent(euModule) + "?fields=" + euFields + "&per_page=200&page=" + euPage,
          method: "GET",
          headers: { "Authorization": "Zoho-oauthtoken " + token }
        });
        if (euResult.status === 204) break;
        if (euResult.status < 200 || euResult.status >= 300) {
          return { statusCode: euResult.status, headers: h, body: euResult.body };
        }
        var euParsed = {};
        try { euParsed = JSON.parse(euResult.body); } catch (euErr) { break; }
        var euBatch = euParsed.data || [];
        if (!euBatch.length) break;
        for (var eui = 0; eui < euBatch.length; eui++) {
          var euRec = euBatch[eui];
          if (!euRec || !euRec.id) continue;
          euRows.push({ id: euRec.id, name: euRec[euNameField] || euRec.Name || "" });
        }
        if (!euParsed.info || !euParsed.info.more_records) break;
        euPage++;
      }
      euRows.sort(function(a, b) { return String(a.name || "").localeCompare(String(b.name || "")); });
      return { statusCode: 200, headers: h, body: JSON.stringify({ ok: true, data: euRows }) };
    }

    if (data.action === "get_equipment") {
      var equipmentGetResult = await req({
        hostname: "www.zohoapis.com",
        path: "/crm/v3/Equipments/" + data.equipment_id + "?fields=CAC_Asset_ID,Name,Asset_Model_Number,Serial_Number,Cal_Factor_K_factor_Etc,Model_Number,Serial_Number1,Pipe_Size",
        method: "GET",
        headers: { "Authorization": "Zoho-oauthtoken " + token }
      });
      return { statusCode: equipmentGetResult.status, headers: h, body: equipmentGetResult.body };
    }

    if (data.action === "search_equipment_assets") {
      var qRaw = String(data.query || "").replace(/"/g, "").trim();
      if (!qRaw) return { statusCode: 200, headers: h, body: JSON.stringify({ ok: true, data: [] }) };
      var amdMatch = qRaw.match(/AMD\d+/i);
      var q = amdMatch ? amdMatch[0] : qRaw;
      var isAmdQuery = /^AMD\d+/i.test(q);
      // Zoho search API allows at most 50 fields — a longer list returns LIMIT_EXCEEDED and zero results.
      var equipmentSearchFields = "Name,Account,CAC_Asset_ID,Customer_Asset_Number,Asset_Category,Asset_Function,Building,Additional_Designator,Asset_Brand,If_Asset_Brand_Other_explain,Asset_Type,If_Asset_Type_other_explain,Asset_Model_Number,Serial_Number,Asset_Environment,Confined_Space,Asset_Series,If_Asset_Series_is_Other_Function_explain,Nameplate_Additional_Info,Location_Coordinates,Frequency,Date,Room,Model_Number,Serial_Number1,Sensor_Additional_information,Engineering_Units,Instrument_Resolution_Increment_Amount,Measurement_Type_Input,Empty_Parameter_1,Empty_Distance,Span_Parameter_1,Span_Distance,Measurement_Units_Type_Output,Output_PV_Zero_Parameter_1,PV_Zero,Output_PV_Span_Parameter_1,PV_Span,Cal_Factor_K_factor_Etc,Pipe_Size,Duration,Damping_Seconds,Flume_Weir_Type,Flume_Weir_Size_Length,Distance_Measurement_Units,Exponent,Da1_and_DA2,Display,Subform_1";
      var searchTerms = [q];
      if (isAmdQuery) {
        searchTerms.push(q.toUpperCase());
        var amdNum = q.replace(/^AMD/i, "");
        if (amdNum && searchTerms.indexOf(amdNum) < 0) searchTerms.push(amdNum);
      }
      var seen = {};
      var hits = [];
      function shouldIncludeRecord(rec) {
        if (!rec || !rec.id) return false;
        if (isAmdQuery || !data.account_id) return true;
        if (equipmentAccountId(rec) === data.account_id) return true;
        return equipmentBypassAccountFilter(rec, q);
      }
      function addHits(rows) {
        for (var hi = 0; hi < rows.length; hi++) {
          var rec = rows[hi];
          if (!shouldIncludeRecord(rec)) continue;
          if (!seen[rec.id]) { seen[rec.id] = true; hits.push(rec); }
        }
      }
      async function collectWordSearch(term) {
        var wordResult = await req({
          hostname: "www.zohoapis.com",
          path: "/crm/v3/Equipments/search?word=" + encodeURIComponent(term) + "&fields=" + equipmentSearchFields,
          method: "GET",
          headers: { "Authorization": "Zoho-oauthtoken " + token }
        });
        if (wordResult.status === 204) return;
        if (wordResult.status < 200 || wordResult.status >= 300) return;
        try { addHits(JSON.parse(wordResult.body).data || []); } catch (we) {}
      }
      async function collectCriteriaSearch(field, operator, term) {
        var crit = encodeURIComponent("(" + field + ":" + operator + ":" + term + ")");
        var searchResult = await req({
          hostname: "www.zohoapis.com",
          path: "/crm/v3/Equipments/search?criteria=" + crit + "&fields=" + equipmentSearchFields,
          method: "GET",
          headers: { "Authorization": "Zoho-oauthtoken " + token }
        });
        if (searchResult.status === 204) return;
        if (searchResult.status < 200 || searchResult.status >= 300) return;
        try { addHits(JSON.parse(searchResult.body).data || []); } catch (se) {}
      }
      var idFields = ["CAC_Asset_ID", "Name", "Customer_Asset_Number"];
      var textFields = ["Name", "Serial_Number", "Asset_Model_Number", "CAC_Asset_ID", "Building", "Additional_Designator", "Customer_Asset_Number", "Asset_Brand", "Asset_Type", "Asset_Series"];
      var exactFields = ["CAC_Asset_ID", "Serial_Number", "Asset_Model_Number", "Name", "Building", "Additional_Designator", "Customer_Asset_Number", "Asset_Brand", "Asset_Type", "Asset_Series"];
      for (var ti = 0; ti < searchTerms.length; ti++) {
        var term = searchTerms[ti];
        await collectWordSearch(term);
        for (var idi = 0; idi < idFields.length; idi++) {
          await collectCriteriaSearch(idFields[idi], "equals", term);
          await collectCriteriaSearch(idFields[idi], "starts_with", term);
        }
        for (var efi = 0; efi < exactFields.length; efi++) {
          if (idFields.indexOf(exactFields[efi]) >= 0) continue;
          await collectCriteriaSearch(exactFields[efi], "equals", term);
        }
        if (!isAmdQuery) {
          for (var tfi = 0; tfi < textFields.length; tfi++) {
            await collectCriteriaSearch(textFields[tfi], "starts_with", term);
          }
        }
      }
      return { statusCode: 200, headers: h, body: JSON.stringify({ ok: true, data: hits.slice(0, 20) }) };
    }

    if (data.action === "find_equipment") {
      var serial = String(data.serial_number || "").replace(/"/g, "").trim();
      if (!serial) return { statusCode: 200, headers: h, body: JSON.stringify({ ok: true, equipment_id: null }) };
      var criteria = encodeURIComponent("(Serial_Number:equals:" + serial + ")");
      var findEquipmentResult = await req({
        hostname: "www.zohoapis.com",
        path: "/crm/v3/Equipments/search?criteria=" + criteria + "&fields=Name,Account,Serial_Number,Asset_Model_Number",
        method: "GET",
        headers: { "Authorization": "Zoho-oauthtoken " + token }
      });
      if (findEquipmentResult.status === 204) return { statusCode: 200, headers: h, body: JSON.stringify({ ok: true, equipment_id: null }) };
      if (findEquipmentResult.status < 200 || findEquipmentResult.status >= 300) return { statusCode: findEquipmentResult.status, headers: h, body: findEquipmentResult.body };
      var equipmentFound = null;
      try {
        var records = (JSON.parse(findEquipmentResult.body).data || []);
        for (var ei = 0; ei < records.length; ei++) {
          if (!data.account_id || equipmentAccountId(records[ei]) === data.account_id) { equipmentFound = records[ei]; break; }
        }
      } catch (ee) {}
      return { statusCode: 200, headers: h, body: JSON.stringify({ ok: true, equipment_id: equipmentFound && equipmentFound.id || null, equipment: equipmentFound || null }) };
    }

    function equipmentWriteBody(equipment, applyLayoutRules) {
      var body = { data: [equipment || {}] };
      if (applyLayoutRules) body.apply_feature_execution = [{ name: "layout_rules" }];
      return JSON.stringify(body);
    }

    function sleepMs(ms) {
      return new Promise(function(resolve) { setTimeout(resolve, ms); });
    }

    async function zohoEquipmentPut(token, equipmentId, equipment, applyLayoutRules) {
      var payload = equipmentWriteBody(equipment || {}, applyLayoutRules);
      var path = applyLayoutRules
        ? "/crm/v8/Equipments/" + equipmentId
        : "/crm/v3/Equipments/" + equipmentId;
      return req({
        hostname: "www.zohoapis.com",
        path: path,
        method: "PUT",
        headers: { "Authorization": "Zoho-oauthtoken " + token, "Content-Type": "application/json", "Content-Length": Buffer.byteLength(payload) }
      }, payload);
    }

    function pickTempCategoryForLayout(currentCategory, targetCategory, categoryValues) {
      var current = String(currentCategory || "").trim();
      var target = String(targetCategory || "").trim();
      if (isOpenChannelFlowCategory(target)) {
        for (var oi = 0; oi < categoryValues.length; oi++) {
          var fm = categoryValues[oi];
          if (fm && isFlowMeterCategory(fm) && !categoriesEquivalent(fm, current)) return fm;
        }
        if (!isFlowMeterCategory(current) && categoryValues.some(isFlowMeterCategory)) return pickCanonicalFlowMeterCategory(categoryValues);
      }
      if (isFlowMeterCategory(target)) {
        for (var oj = 0; oj < categoryValues.length; oj++) {
          var ocf = categoryValues[oj];
          if (ocf && isOpenChannelFlowCategory(ocf) && !categoriesEquivalent(ocf, current)) return ocf;
        }
      }
      var preferred = { "Flow Open Channel": "Flow Meter", "Flow Meter": "Flow Open Channel", "Open Channel Flow": "Flow Meter", "Flow Meter": "Open Channel Flow" };
      var pref = preferred[target] || (isOpenChannelFlowCategory(target) ? "Flow Meter" : null);
      if (pref && pref !== target && categoryValues.indexOf(pref) >= 0 && pref !== current) return pref;
      if (isOpenChannelFlowCategory(target)) {
        var canon = pickCanonicalOcfCategory(categoryValues);
        if (canon && canon !== target && canon !== current && categoryValues.indexOf(canon) >= 0) return canon;
      }
      for (var i = 0; i < categoryValues.length; i++) {
        var v = categoryValues[i];
        if (v && v !== target && v !== current && !categoriesEquivalent(v, target)) return v;
      }
      for (var j = 0; j < categoryValues.length; j++) {
        if (categoryValues[j] && categoryValues[j] !== target && !categoriesEquivalent(categoryValues[j], target)) return categoryValues[j];
      }
      return null;
    }

    function zohoWriteFailed(result) {
      if (result.status < 200 || result.status >= 300) return true;
      try {
        var row = (JSON.parse(result.body).data || [])[0];
        return row && row.status === "error";
      } catch (e) {}
      return false;
    }

    function zohoWriteErrorMessage(result) {
      try {
        var parsed = JSON.parse(result.body);
        var row = (parsed.data || [])[0];
        if (row && row.details && row.details.api_name) {
          return (row.message || "invalid data") + " (" + row.details.api_name + ")";
        }
        if (row && row.message) return row.message;
        return result.body;
      } catch (e) {
        return result.body;
      }
    }

    var EQUIPMENT_LOOKUP_FIELDS = {
      Measurement_Type_Input: true,
      Measurement_Units_Type_Output: true
    };

    function isZohoLookupId(val) {
      return /^\d{10,}$/.test(String(val || "").trim());
    }

    function normalizeEquipmentLookupField(val) {
      if (val == null || val === "") return null;
      if (typeof val === "object") {
        var id = val.id != null ? String(val.id).trim() : "";
        return isZohoLookupId(id) ? { id: id } : null;
      }
      var s = String(val).trim();
      if (!s) return null;
      return isZohoLookupId(s) ? { id: s } : null;
    }

    function sanitizeEquipmentExtensionPayload(extension, category) {
      var out = Object.assign({}, extension || {});
      Object.keys(out).forEach(function(api) {
        if (!EQUIPMENT_LOOKUP_FIELDS[api]) return;
        var normalized = normalizeEquipmentLookupField(out[api]);
        if (normalized) out[api] = normalized;
        else delete out[api];
      });
      if (category) out.Asset_Category = category;
      return out;
    }

    async function saveEquipmentExtensionFields(token, equipmentId, category, extension, steps, stepLabel) {
      var sanitized = sanitizeEquipmentExtensionPayload(extension, category);
      delete sanitized.Subform_1;
      if (!sanitized || !Object.keys(sanitized).length) return { ok: true, skipped: true };
      var extMid = await zohoEquipmentPut(token, equipmentId, sanitized, true);
      steps.push({ step: stepLabel || "save_extension_fields", status: extMid.status, fields: Object.keys(sanitized) });
      if (zohoWriteFailed(extMid)) {
        return { ok: false, error: "Extension field save failed: " + zohoWriteErrorMessage(extMid) };
      }
      await sleepMs(450);
      return { ok: true };
    }

    if (data.action === "activate_equipment_category_layout") {
      var layoutEquipmentId = data.equipment_id;
      var layoutCategory = String(data.category || "").trim();
      var layoutExtension = data.extension || {};
      var layoutCategoryValues = Array.isArray(data.category_values) ? data.category_values : [];
      var reopenConfirm = !!data.reopen_confirm;
      if (!layoutEquipmentId || !layoutCategory) {
        return { statusCode: 400, headers: h, body: JSON.stringify({ ok: false, error: "equipment_id and category are required" }) };
      }
      layoutCategory = await resolveAssetCategoryValue(token, layoutCategory);
      var zohoCategoryValues = await loadAssetCategoryPicklistValues(token);
      var mergedCategoryValues = layoutCategoryValues.slice();
      zohoCategoryValues.forEach(function(v) { if (v && mergedCategoryValues.indexOf(v) < 0) mergedCategoryValues.push(v); });
      layoutCategoryValues = mergedCategoryValues;
      if (isFlowMeterCategory(layoutCategory)) layoutCategory = pickCanonicalFlowMeterCategory(layoutCategoryValues);
      else if (isOpenChannelFlowCategory(layoutCategory)) layoutCategory = pickCanonicalOcfCategory(layoutCategoryValues);

      async function readCurrentCategory() {
        var getCategoryResult = await req({
          hostname: "www.zohoapis.com",
          path: "/crm/v3/Equipments/" + layoutEquipmentId + "?fields=Asset_Category",
          method: "GET",
          headers: { "Authorization": "Zoho-oauthtoken " + token }
        });
        if (getCategoryResult.status < 200 || getCategoryResult.status >= 300) return "";
        try { return String((JSON.parse(getCategoryResult.body).data || [])[0].Asset_Category || "").trim(); } catch (ge) { return ""; }
      }

      async function runCategoryReselectCycle(cycleName, currentCategory) {
        var cycleSteps = [];
        var sameCategory = categoriesEquivalent(currentCategory, layoutCategory);
        var pauseBefore = reopenConfirm ? 2800 : (sameCategory ? 1600 : 900);
        await sleepMs(pauseBefore);
        cycleSteps.push({ cycle: cycleName, step: "pause_before_reselect", ms: pauseBefore, same_category: sameCategory });

        var tempCategory = pickTempCategoryForLayout(currentCategory, layoutCategory, layoutCategoryValues);
        if (tempCategory) {
          var tempResult = await zohoEquipmentPut(token, layoutEquipmentId, { Asset_Category: tempCategory }, true);
          cycleSteps.push({ cycle: cycleName, step: "temp_category", category: tempCategory, status: tempResult.status });
          if (zohoWriteFailed(tempResult)) {
            return { ok: false, error: "Temporary category swap failed: " + zohoWriteErrorMessage(tempResult), steps: cycleSteps };
          }
          await sleepMs(reopenConfirm ? 2000 : 1400);
          currentCategory = tempCategory;
        }

        var catOnly = { Asset_Category: layoutCategory };
        var selectPasses = reopenConfirm ? 2 : (sameCategory ? 2 : 1);
        for (var pi = 0; pi < selectPasses; pi++) {
          var selectResult = await zohoEquipmentPut(token, layoutEquipmentId, catOnly, true);
          cycleSteps.push({ cycle: cycleName, step: "select_target_category_" + (pi + 1), category: layoutCategory, status: selectResult.status });
          if (zohoWriteFailed(selectResult)) {
            return { ok: false, error: "Target category select failed: " + zohoWriteErrorMessage(selectResult), steps: cycleSteps };
          }
          await sleepMs(pi < selectPasses - 1 ? (reopenConfirm ? 2000 : 1400) : (reopenConfirm ? 1500 : 1000));
        }
        return { ok: true, steps: cycleSteps, currentCategory: layoutCategory };
      }

      var steps = [];
      var currentCategory = await readCurrentCategory();
      steps.push({ step: "read_category", category: currentCategory });

      if (reopenConfirm) {
        await sleepMs(2800);
        currentCategory = await readCurrentCategory();
        steps.push({ step: "reopen_read_category", category: currentCategory });
      } else {
        var cycle1 = await runCategoryReselectCycle("initial", currentCategory);
        steps = steps.concat(cycle1.steps || []);
        if (!cycle1.ok) {
          return { statusCode: 400, headers: h, body: JSON.stringify({ ok: false, error: cycle1.error, steps: steps }) };
        }
        if (layoutExtension && Object.keys(layoutExtension).length) {
          var extResult = await saveEquipmentExtensionFields(token, layoutEquipmentId, layoutCategory, layoutExtension, steps, "save_extension_fields");
          if (!extResult.ok) {
            return { statusCode: 400, headers: h, body: JSON.stringify({ ok: false, error: extResult.error, steps: steps }) };
          }
        }
        return { statusCode: 200, headers: h, body: JSON.stringify({ ok: true, pass: "initial", proxy_build: PROXY_BUILD, resolved_category: layoutCategory, current_category: currentCategory, target_category: layoutCategory, steps: steps }) };
      }

      var cycle2 = await runCategoryReselectCycle("reopen_confirm", currentCategory);
      steps = steps.concat(cycle2.steps || []);
      if (!cycle2.ok) {
        return { statusCode: 400, headers: h, body: JSON.stringify({ ok: false, error: cycle2.error, steps: steps }) };
      }

      var targetPayload = sanitizeEquipmentExtensionPayload(layoutExtension, layoutCategory);
      delete targetPayload.Subform_1;
      var resaveV8 = await zohoEquipmentPut(token, layoutEquipmentId, targetPayload, true);
      steps.push({ step: "resave_category_and_fields_v8", category: layoutCategory, status: resaveV8.status });
      if (zohoWriteFailed(resaveV8)) {
        return { statusCode: resaveV8.status >= 400 ? resaveV8.status : 400, headers: h, body: JSON.stringify({ ok: false, error: "Category resave (v8) failed: " + zohoWriteErrorMessage(resaveV8), steps: steps }) };
      }
      await sleepMs(1500);

      var resaveV3 = await zohoEquipmentPut(token, layoutEquipmentId, targetPayload, false);
      steps.push({ step: "resave_category_and_fields_v3", category: layoutCategory, status: resaveV3.status });
      if (zohoWriteFailed(resaveV3)) {
        return { statusCode: resaveV3.status >= 400 ? resaveV3.status : 400, headers: h, body: JSON.stringify({ ok: false, error: "Category resave (v3) failed: " + zohoWriteErrorMessage(resaveV3), steps: steps }) };
      }

      return { statusCode: 200, headers: h, body: JSON.stringify({ ok: true, pass: "reopen_confirm", proxy_build: PROXY_BUILD, resolved_category: layoutCategory, current_category: currentCategory, target_category: layoutCategory, steps: steps }) };
    }

    if (data.action === "update_equipment") {
      var applyLayoutRules = !!data.apply_layout_rules;
      var updateEquipmentPayload = equipmentWriteBody(data.equipment || {}, applyLayoutRules);
      var updateEquipmentPath = applyLayoutRules
        ? "/crm/v8/Equipments/" + data.equipment_id
        : "/crm/v3/Equipments/" + data.equipment_id;
      var updateEquipmentResult = await req({
        hostname: "www.zohoapis.com",
        path: updateEquipmentPath,
        method: "PUT",
        headers: { "Authorization": "Zoho-oauthtoken " + token, "Content-Type": "application/json", "Content-Length": Buffer.byteLength(updateEquipmentPayload) }
      }, updateEquipmentPayload);
      return { statusCode: updateEquipmentResult.status, headers: h, body: updateEquipmentResult.body };
    }

    if (data.action === "create_equipment") {
      var createApplyLayoutRules = !!data.apply_layout_rules;
      var equipmentPayload = equipmentWriteBody(data.equipment || {}, createApplyLayoutRules);
      var equipmentPath = createApplyLayoutRules ? "/crm/v8/Equipments" : "/crm/v3/Equipments";
      var equipmentResult = await req({
        hostname: "www.zohoapis.com",
        path: equipmentPath,
        method: "POST",
        headers: { "Authorization": "Zoho-oauthtoken " + token, "Content-Type": "application/json", "Content-Length": Buffer.byteLength(equipmentPayload) }
      }, equipmentPayload);
      return { statusCode: equipmentResult.status, headers: h, body: equipmentResult.body };
    }

    if (data.action === "upload_equipment_photo") {
      var assetImgBuf = Buffer.from(data.image_b64, "base64");
      var assetBoundary = "CapStoneBound" + Date.now();
      var assetHdr = Buffer.from("--" + assetBoundary + "\r\nContent-Disposition: form-data; name=\"file\"; filename=\"" + data.filename + "\"\r\nContent-Type: image/jpeg\r\n\r\n");
      var assetFtr = Buffer.from("\r\n--" + assetBoundary + "--\r\n");
      var assetUploadBody = Buffer.concat([assetHdr, assetImgBuf, assetFtr]);
      var assetUploadResult = await req({
        hostname: "www.zohoapis.com",
        path: "/crm/v3/Equipments/" + data.equipment_id + "/Attachments",
        method: "POST",
        headers: {
          "Authorization": "Zoho-oauthtoken " + token,
          "Content-Type": "multipart/form-data; boundary=" + assetBoundary,
          "Content-Length": assetUploadBody.length
        }
      }, assetUploadBody);
      return { statusCode: assetUploadResult.status, headers: h, body: assetUploadResult.body };
    }

    if (data.action === "workdrive_get_or_create_folder") {
      var parentId = data.parent_id || "";
      var folderName = String(data.folder_name || "Deal").substring(0, 120);
      var wantName = folderName.trim();
      var wdHeaders = {
        "Authorization": "Zoho-oauthtoken " + token,
        "Accept": "application/vnd.api+json"
      };
      var apiBases = [
        { host: "workdrive.zoho.com", prefix: "/api/v1" },
        { host: "www.zohoapis.com", prefix: "/workdrive/api/v1" }
      ];
      var debug = { list: [], create: [] };

      function folderUrl(id, attrs) {
        attrs = attrs || {};
        return attrs.permalink || attrs.web_url || ("https://workdrive.zoho.com/folder/" + id);
      }

      function parseFolderId(obj) {
        if (!obj) return null;
        if (obj.id && obj.id !== parentId) return obj.id;
        var d = obj.data;
        if (!d) return null;
        if (Array.isArray(d)) {
          var rec = d[0] || {};
          var rid = rec.id || (rec.attributes && (rec.attributes.resource_id || rec.attributes.id)) || null;
          return rid && rid !== parentId ? rid : null;
        }
        var rid2 = d.id || (d.attributes && (d.attributes.resource_id || d.attributes.id)) || null;
        return rid2 && rid2 !== parentId ? rid2 : null;
      }

      function isFolderItem(item) {
        var attrs = item.attributes || {};
        return attrs.is_folder === true || attrs.type === "folder" || attrs.resource_type === 1001;
      }

      function findInList(body) {
        try {
          var listed = JSON.parse(body);
          var items = listed.data || [];
          for (var li = 0; li < items.length; li++) {
            if (!isFolderItem(items[li])) continue;
            var attrs = items[li].attributes || {};
            var n = (attrs.name || attrs.display_html_name || "").trim();
            if (n === wantName) {
              var existingId = items[li].id || attrs.resource_id || attrs.id || null;
              if (existingId && existingId !== parentId) {
                return { id: existingId, url: folderUrl(existingId, attrs) };
              }
            }
          }
        } catch (e) {}
        return null;
      }

      function fallbackBody(reason) {
        return JSON.stringify({
          ok: false,
          folder_id: parentId,
          folder_url: "https://workdrive.zoho.com/folder/" + parentId,
          fallback: true,
          reason: reason || "unknown",
          debug: debug
        });
      }

      function successBody(hit, created) {
        return JSON.stringify({
          ok: true,
          folder_id: hit.id,
          folder_url: hit.url,
          created: !!created
        });
      }

      try {
        if (!parentId || !folderName) {
          return { statusCode: 200, headers: h, body: fallbackBody("missing parent or name") };
        }

        for (var bi = 0; bi < apiBases.length; bi++) {
          var base = apiBases[bi];
          var listPaths = [
            base.prefix + "/files/" + encodeURIComponent(parentId) + "/files?page[limit]=200",
            base.prefix + "/files/" + encodeURIComponent(parentId) + "/folders?page[limit]=200",
            base.prefix + "/teamfolders/" + encodeURIComponent(parentId) + "/folders?page[limit]=200"
          ];
          for (var pi = 0; pi < listPaths.length; pi++) {
            var listResult = await req({
              hostname: base.host,
              path: listPaths[pi],
              method: "GET",
              headers: wdHeaders
            });
            debug.list.push({ host: base.host, path: listPaths[pi], status: listResult.status });
            if (listResult.status >= 200 && listResult.status < 300) {
              var hit = findInList(listResult.body);
              if (hit) {
                return { statusCode: 200, headers: h, body: successBody(hit, false) };
              }
            }
          }
        }

        var createBodies = [
          JSON.stringify({ data: { attributes: { name: folderName, parent_id: parentId }, type: "files" } }),
          JSON.stringify({ data: { attributes: { name: folderName, parent_id: parentId, type: "folder" }, type: "files" } })
        ];
        for (var cbi = 0; cbi < apiBases.length; cbi++) {
          var cbase = apiBases[cbi];
          for (var cpi = 0; cpi < createBodies.length; cpi++) {
            var createPayload = createBodies[cpi];
            var createResult = await req({
              hostname: cbase.host,
              path: cbase.prefix + "/files",
              method: "POST",
              headers: Object.assign({}, wdHeaders, {
                "Content-Type": "application/json",
                "Content-Length": Buffer.byteLength(createPayload)
              })
            }, createPayload);
            debug.create.push({
              host: cbase.host,
              variant: cpi,
              status: createResult.status,
              body: String(createResult.body || "").substring(0, 160)
            });
            if (createResult.status >= 200 && createResult.status < 300) {
              try {
                var created = JSON.parse(createResult.body);
                var newId = parseFolderId(created);
                var cattrs = (created.data && !Array.isArray(created.data) && created.data.attributes) ||
                  (created.data && created.data[0] && created.data[0].attributes) || {};
                if (newId) {
                  return {
                    statusCode: 200,
                    headers: h,
                    body: successBody({ id: newId, url: folderUrl(newId, cattrs) }, true)
                  };
                }
              } catch (ce) {}
            }
          }
        }
      } catch (fe) {
        debug.error = fe.message;
      }
      return { statusCode: 200, headers: h, body: fallbackBody("list and create failed") };
    }

    if (data.action === "workdrive_upload") {
      var fileBuffer = Buffer.from(data.file_b64, "base64");
      var boundary = "CapStoneBound" + Date.now();
      var parentPart = Buffer.from("--" + boundary + "\r\nContent-Disposition: form-data; name=\"parent_id\"\r\n\r\n" + data.folder_id + "\r\n");
      var namePart = Buffer.from("--" + boundary + "\r\nContent-Disposition: form-data; name=\"filename\"\r\n\r\n" + data.filename + "\r\n");
      var overridePart = Buffer.from("--" + boundary + "\r\nContent-Disposition: form-data; name=\"override-name-exist\"\r\n\r\ntrue\r\n");
      var filePart = Buffer.from("--" + boundary + "\r\nContent-Disposition: form-data; name=\"content\"; filename=\"" + data.filename + "\"\r\nContent-Type: " + data.mime_type + "\r\n\r\n");
      var endPart = Buffer.from("\r\n--" + boundary + "--\r\n");
      var uploadBody = Buffer.concat([parentPart, namePart, overridePart, filePart, fileBuffer, endPart]);
      var result5 = await req({
        hostname: "www.zohoapis.com",
        path: "/workdrive/api/v1/upload",
        method: "POST",
        headers: {
          "Authorization": "Zoho-oauthtoken " + token,
          "Content-Type": "multipart/form-data; boundary=" + boundary,
          "Content-Length": uploadBody.length
        }
      }, uploadBody);
      if (result5.status >= 200 && result5.status < 300) {
        try {
          var parsed = JSON.parse(result5.body);
          var rec = (parsed.data && parsed.data[0]) || {};
          var attrs = rec.attributes || {};
          var rid = attrs.resource_id || rec.id || null;
          if (!rid && attrs["File INFO"]) {
            try { var fi = JSON.parse(attrs["File INFO"]); rid = fi.RESOURCE_ID || rid; } catch (e2) {}
          }
          var link = attrs.permalink || attrs.download_url || attrs.web_url || attrs.url ||
            (rid ? "https://workdrive.zoho.com/file/" + rid : null);
          return { statusCode: 200, headers: h, body: JSON.stringify({ ok: true, resource_id: rid, link: link }) };
        } catch (e3) {}
      }
      return { statusCode: result5.status, headers: h, body: result5.body };
    }

    return { statusCode: 400, headers: h, body: JSON.stringify({ error: "Unknown action" }) };

  } catch (err) {
    return { statusCode: 500, headers: h, body: JSON.stringify({ error: err.message }) };
  }
};
