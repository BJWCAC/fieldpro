const https = require('https');

function zohoRequest(options, payload) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body }));
    });
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

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
    const action = data.action;

    if (action === 'get_deals') {
      const page = data.page || 1;
      const result = await zohoRequest({
        hostname: 'www.zohoapis.com',
        path: `/crm/v3/Deals?per_page=200&page=${page}&fields=Deal_Name,Account_Name,Stage,Amount,Description,Owner,Closing_Date`,
        method: 'GET',
        headers: { 'Authorization': `Zoho-oauthtoken ${token}` }
      });
      return { statusCode: result.status, headers, body: result.body };
    }

    if (action === 'save_note') {
      const payload = JSON.stringify({
        data: [{
          Note_Title: data.note_title,
          Note_Content: data.note_content,
          Parent_Id: data.deal_id,
          $se_module: 'Deals'
        }]
      });
      const result = await zohoRequest({
        hostname: 'www.zohoapis.com',
       path: `/crm/v3/Notes`,
        method: 'POST',
        headers: {
          'Authorization': `Zoho-oauthtoken ${token}`,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload)
        }
      }, payload);
      return { statusCode: result.status, headers, body: result.body };
    }

    if (action === 'refresh_token') {
      const result = await zohoRequest({
        hostname: 'accounts.zoho.com',
        path: `/oauth/v2/token?refresh_token=${data.refresh_token}&client_id=${data.client_id}&client_secret=${data.client_secret}&grant_type=refresh_token`,
        method: 'POST',
        headers: { 'Content-Length': '0' }
      });
      return { statusCode: result.status, headers, body: result.body };
    }

    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Unknown action' }) };

  } catch (err) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
