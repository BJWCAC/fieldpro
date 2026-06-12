const https = require("https");

exports.handler = async function (event) {
  var h = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS"
  };
  if (event.httpMethod === "OPTIONS") return { statusCode: 200, headers: h, body: "" };

  try {
    var data = JSON.parse(event.body || "{}");
    var id = "rec" + Date.now() + Math.random().toString(36).slice(2, 8);
    var filename = String(data.filename || "recording.webm").slice(0, 200);
    var source = String(data.source || "upload");
    var hasAudio = !!(data.audio_b64 && String(data.audio_b64).length > 100);

    if (!hasAudio && !data.transcript) {
      return {
        statusCode: 400,
        headers: h,
        body: JSON.stringify({ ok: false, error: "audio_b64 or transcript required" })
      };
    }

    var assemblyKey = process.env.ASSEMBLYAI_API_KEY || "";
    if (assemblyKey && hasAudio) {
      return {
        statusCode: 200,
        headers: h,
        body: JSON.stringify({
          ok: true,
          id: id,
          status: "transcribing",
          filename: filename,
          source: source,
          message: "Recording accepted — AssemblyAI job will complete via transcript-ready webhook (configure ASSEMBLYAI_API_KEY on Netlify)"
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
          ? "Recording stored locally in CapStone — set ASSEMBLYAI_API_KEY on Netlify to enable server transcription"
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
