exports.handler = async function (event) {
  var h = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS"
  };
  if (event.httpMethod === "OPTIONS") return { statusCode: 200, headers: h, body: "" };

  try {
    var body = event.body || "{}";
    var data = {};
    try {
      data = JSON.parse(body);
    } catch (e) {
      data = { raw: body };
    }

    var status = data.status || data.transcript_status || "unknown";
    var id = data.transcript_id || data.id || "";
    console.log("transcript-ready webhook", JSON.stringify({
      status: status,
      id: id,
      received: new Date().toISOString()
    }));

    return {
      statusCode: 200,
      headers: h,
      body: JSON.stringify({
        ok: true,
        message: "Webhook received — CapStone polls get-transcript for completed jobs",
        status: status,
        transcript_id: id
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
