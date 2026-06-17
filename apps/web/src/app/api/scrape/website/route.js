import sql from "@/app/api/utils/sql";

export async function POST(request) {
  try {
    const { businessId, websiteUrl } = await request.json();

    if (!businessId || !websiteUrl) {
      return Response.json(
        { error: "businessId and websiteUrl are required" },
        { status: 400 },
      );
    }

    // Use Firecrawl to scrape the website
    const firecrawlApiUrl = process.env.FIRECRAWL_API_URL || "https://api.firecrawl.dev";
    const firecrawlResponse = await fetch(
      `${firecrawlApiUrl}/v1/scrape`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.FIRECRAWL_API_KEY}`,
        },
        body: JSON.stringify({
          url: websiteUrl,
          formats: ["markdown", "html"],
          onlyMainContent: false,
        }),
      },
    );

    if (!firecrawlResponse.ok) {
      throw new Error(`Firecrawl API error: ${firecrawlResponse.statusText}`);
    }

    const scrapedData = await firecrawlResponse.json();

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

    // Extract business context using OpenAI API
    const promptText = `Analyze this website content and style information to extract business context.

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

Respond in JSON format with keys: name, industry, target_audience, value_proposition, products, unique_selling_points, brand_colors, typography`;

    const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are a business analyst. Extract structured business information from website content and styles. You MUST output valid JSON only.",
          },
          {
            role: "user",
            content: promptText,
          },
        ],
        temperature: 0.3,
        response_format: { type: "json_object" },
      }),
    });

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text();
      throw new Error(`OpenAI API error ${openaiResponse.status}: ${errorText}`);
    }

    const openaiData = await openaiResponse.json();
    const rawContent = openaiData.choices[0].message.content;
    const businessContext = JSON.parse(rawContent);

    // Update business record
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

    return Response.json({
      success: true,
      businessContext,
      scrapedData,
    });
  } catch (error) {
    console.error("Error scraping website:", error);
    return Response.json(
      { error: "Failed to scrape website: " + error.message },
      { status: 500 },
    );
  }
}
