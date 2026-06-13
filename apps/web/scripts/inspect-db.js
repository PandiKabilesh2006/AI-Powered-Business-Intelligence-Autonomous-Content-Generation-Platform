import { neon } from '@neondatabase/serverless';
import fs from 'node:fs';
import path from 'node:path';

// Load .env manually
const envPath = path.resolve(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8');
  content.split('\n').forEach(line => {
    if (line.trim().startsWith('#') || !line.includes('=')) return;
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      const key = match[1];
      let val = match[2] || '';
      val = val.trim();
      if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
      if (val.startsWith("'") && val.endsWith("'")) val = val.slice(1, -1);
      process.env[key] = val;
    }
  });
}

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set in env");
  process.exit(1);
}

const sql = neon(url);

async function main() {
  try {
    const businesses = await sql`
      SELECT id, name, website_url, business_context 
      FROM businesses 
      ORDER BY id DESC 
      LIMIT 5
    `;
    console.log("=== LATEST BUSINESSES ===");
    for (const b of businesses) {
      console.log(`ID: ${b.id} | Name: ${b.name} | URL: ${b.website_url}`);
      console.log(`Context:`, JSON.stringify(b.business_context, null, 2));
      
      const brandKit = await sql`
        SELECT * FROM brand_kits WHERE business_id = ${b.id}
      `;
      if (brandKit.length > 0) {
        console.log(`- Brand Kit for ${b.name}:`);
        console.log(JSON.stringify(brandKit[0], null, 2));
      } else {
        console.log(`- No Brand Kit found.`);
      }
      console.log("-----------------------------------------");
    }
  } catch (err) {
    console.error("Error:", err);
  }
}

main();
