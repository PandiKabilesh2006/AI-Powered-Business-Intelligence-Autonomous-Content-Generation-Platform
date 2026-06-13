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

const dbUrl = process.env.DATABASE_URL;
const openaiKey = process.env.OPENAI_API_KEY;

if (!dbUrl || !openaiKey) {
  console.error("Missing DATABASE_URL or OPENAI_API_KEY");
  process.exit(1);
}

const sql = neon(dbUrl);
const businessId = 2;

async function regenerateBrand() {
  try {
    console.log(`1. Fetching business context for ID ${businessId}...`);
    const businessResult = await sql`
      SELECT * FROM businesses WHERE id = ${businessId}
    `;
    if (businessResult.length === 0) {
      console.error("Business not found");
      return;
    }
    const business = businessResult[0];
    const context = business.business_context || {};

    console.log("Website-Extracted Colors in Context:", JSON.stringify(context.brand_colors));
    console.log("Website-Extracted Typography in Context:", JSON.stringify(context.typography));

    console.log("2. Generating Brand Kit via OpenAI...");
    const brandResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openaiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are a brand strategist and creative director. Create comprehensive brand guidelines.",
          },
          {
            role: "user",
            content: `Create a complete brand kit for this business:

Business: ${business.name}
Industry: ${business.industry}
Target Audience: ${business.target_audience}
Value Proposition: ${business.value_proposition}
Website-Extracted Brand Colors: ${context.brand_colors ? JSON.stringify(context.brand_colors) : "None"}
Website-Extracted Typography: ${context.typography ? JSON.stringify(context.typography) : "None"}

Generate:
1. Brand Voice (personality, tone descriptors)
2. Brand Story (compelling narrative)
3. Messaging Pillars (3-5 core themes, array)
4. Color Palette (primary, secondary, and accent colors. If 'Website-Extracted Brand Colors' is not 'None', you MUST use those exact hex codes as the colors. For each color, provide an object with 'hex' and 'name' keys.)
5. Typography (font recommendations for headings and body. If 'Website-Extracted Typography' is not 'None', you MUST use those exact fonts. Otherwise, generate appropriate modern fonts. Provide an object with 'heading' and 'body' keys.)
6. Elevator Pitch (30-second pitch)
7. Taglines (3-5 options, array)
8. Tone Guidelines (do's and don'ts)

Respond in JSON with keys: brand_voice, brand_story, messaging_pillars, color_palette, typography, elevator_pitch, taglines, tone_guidelines`,
          },
        ],
        temperature: 0.6,
        response_format: { type: "json_object" },
      }),
    });

    if (!brandResponse.ok) {
      throw new Error(`OpenAI API error: ${brandResponse.statusText}`);
    }

    const brandData = await brandResponse.json();
    const brandKit = JSON.parse(brandData.choices[0].message.content);

    console.log("3. Saving Brand Kit to Database...");
    const updatedKit = await sql`
      UPDATE brand_kits
      SET
        brand_voice = ${JSON.stringify(brandKit.brand_voice)},
        brand_story = ${brandKit.brand_story},
        messaging_pillars = ${JSON.stringify(brandKit.messaging_pillars || [])},
        color_palette = ${JSON.stringify(brandKit.color_palette)},
        typography = ${JSON.stringify(brandKit.typography)},
        elevator_pitch = ${brandKit.elevator_pitch},
        taglines = ${JSON.stringify(brandKit.taglines || [])},
        tone_guidelines = ${JSON.stringify(brandKit.tone_guidelines)},
        updated_at = NOW()
      WHERE business_id = ${businessId}
      RETURNING *
    `;

    console.log("- Brand Kit regenerated successfully!");
    console.log("Updated Brand Kit Record:", JSON.stringify(updatedKit[0], null, 2));

  } catch (err) {
    console.error("Failed to regenerate brand:", err);
  }
}

regenerateBrand();
