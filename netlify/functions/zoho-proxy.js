const https = require('https');
const { Buffer } = require('buffer');

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

function zohoUpload(token, dealId, filename, imageBuffer) {
  return new Promise((resolve, reject) => {
    const boundary = '----CapStoneBoundary' + Date.now();
    const header = Buffer.from(
      '--' + boundary + '\r\n' +
      'Content-Disposition: form-data; name="file"; filename="' + filename + '"\r\n' +
      'Content-Type: image/jpeg\r\n\r\n'
    );
    const footer = Buffer.from('\r\n--' + boundary + '--\r\n');
    const body = Buffer.concat([header, imageBuffer, footer]);

    const req = https.request({
      hostname: 'www.zohoapis.com',
      path: `/crm/v3/Deals/${dealId}/Attachments`,
      method: 'POST',
      headers: {
        'Authorization': `Zoho-oauthtoken ${token}`,
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': body.length
      }
    }, (res) => {
      let rb = '';
      res.on('data', c => rb += c);
      res.on('end', () => resolve({ status: res.statusCode, body: rb }));
    });
    req.on('error', reject);
    req.write(body);
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

    if (action === 'save_note
