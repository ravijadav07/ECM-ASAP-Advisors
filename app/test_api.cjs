const https = require('https');

const data = JSON.stringify({ test: true });

const options = {
  hostname: 'core-api.pucho.ai',
  port: 443,
  path: '/fapi/v1/pucho_piece/execute_tally_template_v3',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = https.request(options, res => {
  console.log(`STATUS: ${res.statusCode}`);
  console.log(`HEADERS: ${JSON.stringify(res.headers)}`);
  res.on('data', d => process.stdout.write(d));
});

req.on('error', error => {
  console.error(error);
});

req.write(data);
req.end();
