const https = require("https");

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
        path: "/crm/v3/Deals?per_page=200&page=" + (data.page || 1) + "&fields=Deal_Name,Account_Name,Stage,Pipeline,Amount,Description,Owner,Closing_Date",
        method: "GET",
        headers: { "Authorization": "Zoho-oauthtoken " + token }
      });
      return { statusCode: result.status, headers: h, body: result.body };
    }

    if (data.action === "get_accounts_map") {
      var accountFields = [
        "Account_Name",
        "Account_Status",
        "Phone",
        "Latitude_Longitude",
        "googlemapreports__Latitude",
        "googlemapreports__Longitude",
        "Shipping_Street",
        "Shipping_Street_2",
        "Shipping_City",
        "Shipping_State",
        "Shipping_Code",
        "Billing_Street",
        "Billing_City",
        "Billing_State",
        "Billing_Code"
      ].join(",");
      var accountsResult = await req({
        hostname: "www.zohoapis.com",
        path: "/crm/v3/Accounts?per_page=200&page=" + (data.page || 1) + "&fields=" + encodeURIComponent(accountFields),
        method: "GET",
        headers: { "Authorization": "Zoho-oauthtoken " + token }
      });
      return { statusCode: accountsResult.status, headers: h, body: accountsResult.body };
    }

    if (data.action === "get_meetings_map") {
      var meetingFields = [
        "Event_Title",
        "Start_DateTime",
        "End_DateTime",
        "What_Id",
        "Who_Id",
        "Owner",
        "Description",
        "Meeting_Status",
        "Event_Status",
        "Status"
      ];
      try {
        var meetingFieldsResult = await req({
          hostname: "www.zohoapis.com",
          path: "/crm/v3/settings/fields?module=Events",
          method: "GET",
          headers: { "Authorization": "Zoho-oauthtoken " + token }
        });
        if (meetingFieldsResult.status >= 200 && meetingFieldsResult.status < 300) {
          var available = {};
          (JSON.parse(meetingFieldsResult.body).fields || []).forEach(function(field) {
            if (field && field.api_name) available[field.api_name] = true;
          });
          meetingFields = meetingFields.filter(function(field) { return available[field]; });
        }
      } catch (meetingFieldError) {}
      if (!meetingFields.length) meetingFields = ["Event_Title", "Start_DateTime", "End_DateTime", "What_Id"];
      var meetingsResult = await req({
        hostname: "www.zohoapis.com",
        path: "/crm/v3/Events?per_page=200&page=" + (data.page || 1) + "&fields=" + encodeURIComponent(meetingFields.join(",")),
        method: "GET",
        headers: { "Authorization": "Zoho-oauthtoken " + token }
      });
      return { statusCode: meetingsResult.status, headers: h, body: meetingsResult.body };
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
      var result3 = await req({
        hostname: "accounts.zoho.com",
        path: "/oauth/v2/token?refresh_token=" + data.refresh_token + "&client_id=" + data.client_id + "&client_secret=" + data.client_secret + "&grant_type=refresh_token",
        method: "POST",
        headers: { "Content-Length": "0" }
      });
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

    if (data.action === "get_equipment") {
      var equipmentGetResult = await req({
        hostname: "www.zohoapis.com",
        path: "/crm/v3/Equipments/" + data.equipment_id + "?fields=CAC_Asset_ID,Name,Asset_Model_Number,Serial_Number",
        method: "GET",
        headers: { "Authorization": "Zoho-oauthtoken " + token }
      });
      return { statusCode: equipmentGetResult.status, headers: h, body: equipmentGetResult.body };
    }

    if (data.action === "search_equipment_assets") {
      var q = String(data.query || "").replace(/"/g, "").trim();
      if (!q) return { statusCode: 200, headers: h, body: JSON.stringify({ ok: true, data: [] }) };
      var searchFields = ["CAC_Asset_ID", "Serial_Number", "Asset_Model_Number", "Name", "Building", "Additional_Designator", "Customer_Asset_Number", "Asset_Brand", "Asset_Type", "Asset_Series"];
      var searchFieldList = "Name,Account,CAC_Asset_ID,Customer_Asset_Number,Asset_Category,Asset_Function,Building,Additional_Designator,Asset_Brand,If_Asset_Brand_Other_explain,Asset_Type,If_Asset_Type_other_explain,Asset_Model_Number,Serial_Number,Asset_Environment,Confined_Space,Asset_Series,If_Asset_Series_is_Other_Function_explain,Description_Instructions,Location_Coordinates,Date";
      var seen = {};
      var hits = [];
      async function collectEquipmentSearch(field, operator) {
        var crit = encodeURIComponent("(" + field + ":" + operator + ":" + q + ")");
        var searchResult = await req({
          hostname: "www.zohoapis.com",
          path: "/crm/v3/Equipments/search?criteria=" + crit + "&fields=" + searchFieldList,
          method: "GET",
          headers: { "Authorization": "Zoho-oauthtoken " + token }
        });
        if (searchResult.status === 204) return;
        if (searchResult.status < 200 || searchResult.status >= 300) return;
        try {
          var foundRows = (JSON.parse(searchResult.body).data || []);
          for (var sri = 0; sri < foundRows.length; sri++) {
            var rec = foundRows[sri];
            if (data.account_id && equipmentAccountId(rec) !== data.account_id) continue;
            if (!seen[rec.id]) { seen[rec.id] = true; hits.push(rec); }
          }
        } catch (se) {}
      }
      for (var sfi = 0; sfi < searchFields.length; sfi++) await collectEquipmentSearch(searchFields[sfi], "equals");
      if (!hits.length) {
        var containsFields = ["Name", "Serial_Number", "Asset_Model_Number", "CAC_Asset_ID", "Building", "Additional_Designator", "Customer_Asset_Number", "Asset_Brand", "Asset_Type", "Asset_Series"];
        for (var cfi = 0; cfi < containsFields.length; cfi++) await collectEquipmentSearch(containsFields[cfi], "contains");
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

    if (data.action === "update_equipment") {
      var updateEquipmentPayload = JSON.stringify({ data: [data.equipment || {}] });
      var updateEquipmentResult = await req({
        hostname: "www.zohoapis.com",
        path: "/crm/v3/Equipments/" + data.equipment_id,
        method: "PUT",
        headers: { "Authorization": "Zoho-oauthtoken " + token, "Content-Type": "application/json", "Content-Length": Buffer.byteLength(updateEquipmentPayload) }
      }, updateEquipmentPayload);
      return { statusCode: updateEquipmentResult.status, headers: h, body: updateEquipmentResult.body };
    }

    if (data.action === "create_equipment") {
      var equipmentPayload = JSON.stringify({ data: [data.equipment || {}] });
      var equipmentResult = await req({
        hostname: "www.zohoapis.com",
        path: "/crm/v3/Equipments",
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
