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

    console.log("transcript-ready webhook", JSON.stringify({
      status: data.status || data.transcript_status,
      id: data.id || data.transcript_id,
      received: new Date().toISOString()
    }).slice(0, 500));

    return {
      statusCode: 200,
      headers: h,
      body: JSON.stringify({
        ok: true,
        message: "Webhook received — CapStone Inbox client will poll or push updates in a future release",
        status: data.status || "unknown"
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
