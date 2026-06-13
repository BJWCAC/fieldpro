const https = require("https");

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS"
  };
}

function httpsReq(opts) {
  return new Promise(function (resolve, reject) {
    var req = https.request(opts, function (res) {
      var d = "";
      res.on("data", function (c) { d += c; });
      res.on("end", function () { resolve({ status: res.statusCode, body: d }); });
    });
    req.on("error", reject);
    req.end();
  });
}

function formatTranscript(data) {
  if (data.utterances && data.utterances.length) {
    return data.utterances.map(function (u) {
      return "Speaker " + u.speaker + ": " + u.text;
    }).join("\n\n");
  }
  return data.text || "";
}

exports.handler = async function (event) {
  var h = corsHeaders();
  if (event.httpMethod === "OPTIONS") return { statusCode: 200, headers: h, body: "" };

  try {
    var data = JSON.parse(event.body || "{}");
    var transcriptId = String(data.transcript_id || "").trim();
    if (!transcriptId) {
      return {
        statusCode: 400,
        headers: h,
        body: JSON.stringify({ ok: false, error: "transcript_id required" })
      };
    }

    var assemblyKey = process.env.ASSEMBLYAI_API_KEY || "";
    if (!assemblyKey) {
      return {
        statusCode: 503,
        headers: h,
        body: JSON.stringify({ ok: false, error: "ASSEMBLYAI_API_KEY not configured on Netlify" })
      };
    }

    var result = await httpsReq({
      hostname: "api.assemblyai.com",
      path: "/v2/transcript/" + encodeURIComponent(transcriptId),
      method: "GET",
      headers: { "Authorization": assemblyKey }
    });

    if (result.status < 200 || result.status >= 300) {
      return {
        statusCode: result.status,
        headers: h,
        body: JSON.stringify({ ok: false, error: "AssemblyAI " + result.status + ": " + result.body.slice(0, 200) })
      };
    }

    var job = JSON.parse(result.body);
    var status = job.status || "unknown";
    if (status === "completed") {
      return {
        statusCode: 200,
        headers: h,
        body: JSON.stringify({
          ok: true,
          status: "completed",
          transcript: formatTranscript(job),
          transcript_id: transcriptId
        })
      };
    }
    if (status === "error") {
      return {
        statusCode: 200,
        headers: h,
        body: JSON.stringify({
          ok: false,
          status: "error",
          error: job.error || "Transcription failed"
        })
      };
    }

    return {
      statusCode: 200,
      headers: h,
      body: JSON.stringify({
        ok: true,
        status: status,
        transcript_id: transcriptId
      })
    };
  } catch (e) {
    return {
      statusCode: 500,
      headers: h,
      body: JSON.stringify({ ok: false, error: e.message || String(e) })
    };
  }
};
