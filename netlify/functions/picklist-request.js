const https = require("https");

var DEFAULT_TO = "bradwhite@calibrationsandcontrols.com";

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS"
  };
}

function httpsReq(opts, body) {
  return new Promise(function (resolve, reject) {
    var req = https.request(opts, function (res) {
      var chunks = [];
      res.on("data", function (c) { chunks.push(c); });
      res.on("end", function () {
        resolve({ status: res.statusCode, body: Buffer.concat(chunks).toString("utf8") });
      });
    });
    req.on("error", reject);
    if (body) req.write(body);
    req.end();
  });
}

function pickText(data, key) {
  var v = data && data[key];
  return v == null ? "" : String(v).trim();
}

function buildEmailBody(data) {
  var lines = [
    "CapStone picklist addition request",
    "",
    "Field: " + pickText(data, "fieldLabel") + " (" + pickText(data, "fieldApi") + ")",
    "Proposed value: " + pickText(data, "proposedValue"),
    "",
    "Technician: " + (pickText(data, "technician") || "Not set"),
    "Account: " + (pickText(data, "accountName") || "—"),
    "Deal: " + (pickText(data, "dealName") || "—"),
    "Asset name: " + (pickText(data, "assetName") || "—"),
    "Model: " + (pickText(data, "model") || "—"),
    "Serial: " + (pickText(data, "serial") || "—"),
    "Equipment ID: " + (pickText(data, "equipmentId") || "—"),
    "Requested: " + (pickText(data, "requestedAt") || new Date().toISOString()),
    "",
    "Add this value to the Zoho Equipments picklist if approved.",
    "The asset was saved (or will save) with 1 Other + explain text until the picklist is updated."
  ];
  if (pickText(data, "nearMatch")) {
    lines.splice(4, 0, "Near match in CRM: " + pickText(data, "nearMatch"));
  }
  return lines.join("\n");
}

async function sendViaResend(apiKey, from, to, subject, text) {
  var payload = JSON.stringify({
    from: from,
    to: [to],
    subject: subject,
    text: text
  });
  var result = await httpsReq({
    hostname: "api.resend.com",
    path: "/emails",
    method: "POST",
    headers: {
      "Authorization": "Bearer " + apiKey,
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(payload)
    }
  }, payload);
  if (result.status < 200 || result.status >= 300) {
    throw new Error("Resend " + result.status + ": " + result.body.slice(0, 200));
  }
  try {
    return JSON.parse(result.body);
  } catch (e) {
    return { ok: true };
  }
}

exports.handler = async function (event) {
  var h = corsHeaders();
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers: h, body: "" };
  }
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers: h, body: JSON.stringify({ ok: false, error: "POST only" }) };
  }

  try {
    var data = JSON.parse(event.body || "{}");
    var fieldApi = pickText(data, "fieldApi");
    var proposedValue = pickText(data, "proposedValue");
    if (!fieldApi || !proposedValue) {
      return {
        statusCode: 400,
        headers: h,
        body: JSON.stringify({ ok: false, error: "fieldApi and proposedValue are required" })
      };
    }

    var apiKey = process.env.RESEND_API_KEY || "";
    if (!apiKey) {
      return {
        statusCode: 503,
        headers: h,
        body: JSON.stringify({
          ok: false,
          error: "RESEND_API_KEY is not configured on Netlify. Add it under Site settings → Environment variables."
        })
      };
    }

    var to = process.env.PICKLIST_REQUEST_EMAIL_TO || DEFAULT_TO;
    var from = process.env.PICKLIST_REQUEST_FROM || "CapStone <onboarding@resend.dev>";
    var subject = "CapStone picklist request: " + pickText(data, "fieldLabel") + " — " + proposedValue;
    var text = buildEmailBody(data);
    var sent = await sendViaResend(apiKey, from, to, subject, text);

    return {
      statusCode: 200,
      headers: h,
      body: JSON.stringify({ ok: true, to: to, id: sent && sent.id ? sent.id : null })
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: h,
      body: JSON.stringify({ ok: false, error: err.message || String(err) })
    };
  }
};
