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
const firecrawlKey = process.env.FIRECRAWL_API_KEY;
const openaiKey = process.env.OPENAI_API_KEY;

if (!dbUrl || !firecrawlKey || !openaiKey) {
  console.error("Missing credentials in env");
  process.exit(1);
}

const sql = neon(dbUrl);
const businessId = 2;
const websiteUrl = "https://thevertical.ai/";

async function runScrape() {
  try {
    console.log("1. Fetching from Firecrawl...");
    const firecrawlApiUrl = process.env.FIRECRAWL_API_URL || "https://api.firecrawl.dev";
    const firecrawlResponse = await fetch(`${firecrawlApiUrl}/v1/scrape`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${firecrawlKey}`,
      },
      body: JSON.stringify({
        url: websiteUrl,
        formats: ["markdown", "html"],
        onlyMainContent: false,
      }),
    });

    if (!firecrawlResponse.ok) {
      throw new Error(`Firecrawl API error: ${firecrawlResponse.statusText}`);
    }

    const scrapedData = await firecrawlResponse.json();
    console.log("- Firecrawl scrape completed successfully.");

    // Helper to convert RGB/RGBA to Hex
    function rgbToHex(r, g, b) {
      const toHex = (c) => {
        const hex = c.toString(16);
        return hex.length === 1 ? "0" + hex : hex;
      };
      return "#" + toHex(r) + toHex(g) + toHex(b);
    }

    // Extract potential hex color codes from the scraped HTML / content
    const htmlContent = scrapedData.data?.html || scrapedData.data?.content || "";
    const hexRegex = /#([a-fA-F0-9]{6}|[a-fA-F0-9]{3})\b/g;
    const foundHexColors = htmlContent.match(hexRegex) || [];

    // Extract potential RGB/RGBA colors and convert to Hex
    const rgbRegex = /rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*[\d.]+)?\)/g;
    const foundRgbColors = [];
    let rgbMatch;
    while ((rgbMatch = rgbRegex.exec(htmlContent)) !== null) {
      const r = parseInt(rgbMatch[1], 10);
      const g = parseInt(rgbMatch[2], 10);
      const b = parseInt(rgbMatch[3], 10);
      if (r <= 255 && g <= 255 && b <= 255) {
        foundRgbColors.push(rgbToHex(r, g, b));
      }
    }

    const allColors = [...foundHexColors, ...foundRgbColors];
    const uniqueColors = [...new Set(allColors.map(c => c.toLowerCase()))]
      .filter(c => c !== "#fff" && c !== "#ffffff" && c !== "#000" && c !== "#000000" && c !== "#eee" && c !== "#ddd" && c !== "#ccc");

    // Extract potential font families from CSS font-family and variable declarations in scraped HTML
    const fontRegex = /(?:font-family|--font-[a-zA-Z0-9-]+)\s*:\s*([^;'}"]+)/gi;
    const foundFonts = [];
    let match;
    while ((match = fontRegex.exec(htmlContent)) !== null) {
      const fonts = match[1].split(',').map(f => f.trim().replace(/['"]/g, ''));
      foundFonts.push(...fonts);
    }
    const uniqueFonts = [...new Set(foundFonts)]
      .filter(f => f && !['inherit', 'sans-serif', 'serif', 'monospace', 'initial', 'unset', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'system'].includes(f))
      .slice(0, 10);

    console.log(`- Extracted HEX Colors: ${foundHexColors.slice(0, 10).join(', ')}...`);
    console.log(`- Extracted RGB Colors converted: ${foundRgbColors.slice(0, 10).join(', ')}...`);
    console.log(`- Unique Stylesheet Colors: ${uniqueColors.join(', ')}`);
    console.log(`- Extracted Stylesheet Fonts: ${uniqueFonts.join(', ')}`);

    console.log("2. Analyzing with OpenAI GPT-4o...");
    const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
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
            content: "You are a business analyst. Extract structured business information from website content and styles.",
          },
          {
            role: "user",
            content: `Analyze this website content and style information to extract business context.

Website content:
${scrapedData.data?.markdown || scrapedData.data?.content || ""}

Extracted CSS style hex color codes:
${uniqueColors.join(", ") || "None found"}

Extracted CSS style font families:
${uniqueFonts.join(", ") || "None found"}

Extract:
1. Business name
2. Industry/sector
3. Target audience (ICP)
4. Value proposition
5. Key products/services
6. Unique selling points
7. Brand colors (classify the hex colors found above into primary, secondary, and accent colors for the business. Respond as an object with keys: primary, secondary, accent. If no colors were found, generate appropriate ones.)
8. Typography (identify the primary heading and body fonts used on the website. Recommend specific fonts from the extracted list if available. Respond as an object with keys: heading, body. E.g. {"heading": "Plus Jakarta Sans", "body": "Inter"})

Respond in JSON format with keys: name, industry, target_audience, value_proposition, products, unique_selling_points, brand_colors, typography`,
          },
        ],
        temperature: 0.3,
        response_format: { type: "json_object" },
      }),
    });

    if (!openaiResponse.ok) {
      throw new Error(`OpenAI API error: ${openaiResponse.statusText}`);
    }

    const aiAnalysis = await openaiResponse.json();
    const businessContext = JSON.parse(aiAnalysis.choices[0].message.content);
    console.log("- AI Analysis complete:", JSON.stringify(businessContext, null, 2));

    console.log("3. Updating Database business ID 2...");
    await sql`
      UPDATE businesses
      SET 
        name = ${businessContext.name || "Unknown Business"},
        industry = ${businessContext.industry || null},
        target_audience = ${businessContext.target_audience || null},
        value_proposition = ${businessContext.value_proposition || null},
        scraped_data = ${JSON.stringify(scrapedData)},
        business_context = ${JSON.stringify(businessContext)},
        updated_at = NOW()
      WHERE id = ${businessId}
    `;
    console.log("- Database updated successfully!");

  } catch (err) {
    console.error("Scrape script failed:", err);
  }
}

runScrape();
