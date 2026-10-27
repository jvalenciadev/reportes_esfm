const http = require('http');
const path = require('path');
const { Client } = require('pg');

const regions = [
  'sa-east-1',
  'us-east-1',
  'us-east-2',
  'us-west-1',
  'us-west-2',
  'eu-central-1',
  'eu-west-1'
];

async function tryRegion(region) {
  const host = `aws-0-${region}.pooler.supabase.com`;
  return new Promise((resolve) => {
    const req = http.request({
      host: '10.20.30.2',
      port: 3128,
      method: 'CONNECT',
      path: `${host}:443`
    });

    req.on('connect', async (res, socket) => {
      if (res.statusCode !== 200) {
        resolve({ region, success: false, error: `Proxy status ${res.statusCode}` });
        return;
      }

      const client = new Client({
        user: 'postgres.dwretdtwyqsltylvnvld',
        password: 'VGOcuUWdlEDAxBgI',
        database: 'postgres',
        stream: socket,
        ssl: { rejectUnauthorized: false }
      });

      try {
        await client.connect();
        const testRes = await client.query('SELECT current_database(), current_user;');
        await client.end();
        resolve({ region, success: true, data: testRes.rows });
      } catch (err) {
        resolve({ region, success: false, error: err.message });
      }
    });

    req.on('error', (err) => {
      resolve({ region, success: false, error: err.message });
    });

    req.setTimeout(5000, () => {
      req.destroy();
      resolve({ region, success: false, error: 'Timeout' });
    });

    req.end();
  });
}

async function main() {
  console.log('Testing regions on port 443...');
  for (const r of regions) {
    const res = await tryRegion(r);
    console.log(`Region ${r}:`, res.success ? 'SUCCESS! ' + JSON.stringify(res.data) : res.error);
    if (res.success) {
      console.log('MATCH FOUND:', r);
      process.exit(0);
    }
  }
}

main();
