const { Client } = require('pg');
const fs = require('fs');

const client = new Client({
  host: 'aws-0-us-west-1.pooler.supabase.com',
  port: 5432,
  database: 'postgres',
  user: 'postgres.etfnfdyoyyavrcloutte',
  password: process.env.DB_PASS,
  ssl: { rejectUnauthorized: false }
});

async function main() {
  await client.connect();
  
  // Get current function body
  const res = await client.query("SELECT prosrc FROM pg_proc WHERE proname = 'push_changes'");
  let body = res.rows[0].prosrc;
  console.log('Got body length:', body.length);
  console.log('Last 200 chars:', body.slice(-200));
}

main().catch(console.error).finally(() => client.end());
