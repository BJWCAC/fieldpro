const https = require('https');

exports.handler = async function(event) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const data = JSON.parse(event.body);
    const token = data.token;
    const dealId = data.deal_id;
    const noteTitle = data.note_title;
    const noteContent = data.note_content;

    const payload = JSON.stringify({
      data: [{
        Note_Title: noteTitle,
        Note_Content: noteContent,
        Parent_Id: dealId,
        se_module: 'Deals'
      }]
    });

    const result = await new Promise((resolve, reject) => {
      const req = https.request({
        hostname: 'www.zohoapis.com',
        path: `/crm/v3/${dealId}/Notes`,
        method: 'POST',
        headers: {
          'Authorization': `Zoho-oauthtoken ${token}`,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload)
        }
      }, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => resolve({ status: res.statusCode, body }));
      });
      req.on('error', reject);
      req.write(payload);
      req.end();
    });

    return {
      statusCode: result.status,
      headers,
      body: result.body
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: err.message })
    };
  }
};
