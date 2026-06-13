const https = require("https");

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

async function assemblyUpload(apiKey, audioBuffer) {
  var result = await httpsReq({
    hostname: "api.assemblyai.com",
    path: "/v2/upload",
    method: "POST",
    headers: {
      "Authorization": apiKey,
      "Content-Type": "application/octet-stream",
      "Content-Length": audioBuffer.length
    }
  }, audioBuffer);
  if (result.status < 200 || result.status >= 300) {
    throw new Error("AssemblyAI upload " + result.status + ": " + result.body.slice(0, 200));
  }
  return JSON.parse(result.body).upload_url;
}

async function assemblySubmit(apiKey, uploadUrl, webhookUrl) {
  var payload = JSON.stringify({
    audio_url: uploadUrl,
    speaker_labels: true,
    webhook_url: webhookUrl
  });
  var result = await httpsReq({
    hostname: "api.assemblyai.com",
    path: "/v2/transcript",
    method: "POST",
    headers: {
      "Authorization": apiKey,
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(payload)
    }
  }, payload);
  if (result.status < 200 || result.status >= 300) {
    throw new Error("AssemblyAI transcript " + result.status + ": " + result.body.slice(0, 200));
  }
  return JSON.parse(result.body);
}

exports.handler = async function (event) {
  var h = corsHeaders();
  if (event.httpMethod === "OPTIONS") return { statusCode: 200, headers: h, body: "" };

  try {
    var data = JSON.parse(event.body || "{}");
    var id = data.inbox_id || ("rec" + Date.now() + Math.random().toString(36).slice(2, 8));
    var filename = String(data.filename || "recording.webm").slice(0, 200);
    var source = String(data.source || "upload");
    var hasAudio = !!(data.audio_b64 && String(data.audio_b64).length > 100);
    var audioUrl = String(data.audio_url || "").trim();
    var hasAudioUrl = audioUrl.indexOf("http") === 0;
    var assemblyKey = process.env.ASSEMBLYAI_API_KEY || "";

    if (!hasAudio && !hasAudioUrl && !data.transcript) {
      return {
        statusCode: 400,
        headers: h,
        body: JSON.stringify({ ok: false, error: "audio_b64, audio_url, or transcript required" })
      };
    }

    if (assemblyKey && hasAudioUrl) {
      var siteUrl = process.env.URL || process.env.DEPLOY_URL || "https://dulcet-sherbet-40f8f6.netlify.app";
      var webhookUrl2 = siteUrl.replace(/\/$/, "") + "/.netlify/functions/transcript-ready";
      var jobUrl = await assemblySubmit(assemblyKey, audioUrl, webhookUrl2);
      return {
        statusCode: 200,
        headers: h,
        body: JSON.stringify({
          ok: true,
          id: id,
          assemblyTranscriptId: jobUrl.id,
          status: "transcribing",
          filename: filename,
          source: source,
          message: "Transcribing Plaud audio with AssemblyAI — transcript will appear when ready"
        })
      };
    }

    if (assemblyKey && hasAudio) {
      var audioBuffer = Buffer.from(String(data.audio_b64), "base64");
      if (audioBuffer.length > 5 * 1024 * 1024) {
        return {
          statusCode: 400,
          headers: h,
          body: JSON.stringify({
            ok: false,
            error: "Audio too large for server upload (max 5 MB). Use a shorter clip or paste the Plaud transcript manually."
          })
        };
      }
      var uploadUrl = await assemblyUpload(assemblyKey, audioBuffer);
      var siteUrl = process.env.URL || process.env.DEPLOY_URL || "https://dulcet-sherbet-40f8f6.netlify.app";
      var webhookUrl = siteUrl.replace(/\/$/, "") + "/.netlify/functions/transcript-ready";
      var job = await assemblySubmit(assemblyKey, uploadUrl, webhookUrl);
      return {
        statusCode: 200,
        headers: h,
        body: JSON.stringify({
          ok: true,
          id: id,
          assemblyTranscriptId: job.id,
          status: "transcribing",
          filename: filename,
          source: source,
          message: "Transcribing with AssemblyAI — transcript will appear when ready"
        })
      };
    }

    return {
      statusCode: 200,
      headers: h,
      body: JSON.stringify({
        ok: true,
        id: id,
        status: "received",
        filename: filename,
        source: source,
        transcript: data.transcript || "",
        message: hasAudio
          ? "Recording saved locally — set ASSEMBLYAI_API_KEY on Netlify to enable server transcription"
          : "Manual transcript accepted"
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
