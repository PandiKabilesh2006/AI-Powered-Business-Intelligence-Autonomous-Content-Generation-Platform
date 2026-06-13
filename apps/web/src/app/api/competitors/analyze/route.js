import sql from "@/app/api/utils/sql";

export async function POST(request) {
  try {
    const { businessId, competitorUrls } = await request.json();

    if (!businessId || !competitorUrls || !Array.isArray(competitorUrls)) {
      return Response.json(
        { error: "businessId and competitorUrls array are required" },
        { status: 400 },
      );
    }

    // Get business context
    const businessResult = await sql`
      SELECT * FROM businesses WHERE id = ${businessId}
    `;

    if (businessResult.length === 0) {
      return Response.json({ error: "Business not found" }, { status: 404 });
    }

    const business = businessResult[0];
    const competitors = [];

    // Scrape each competitor
    for (const url of competitorUrls.slice(0, 5)) {
      try {
        const firecrawlResponse = await fetch(
          "https://api.firecrawl.dev/v1/scrape",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${process.env.FIRECRAWL_API_KEY}`,
            },
            body: JSON.stringify({
              url: url,
              formats: ["markdown"],
              onlyMainContent: true,
            }),
          },
        );

        if (!firecrawlResponse.ok) continue;

        const scrapedData = await firecrawlResponse.json();

        // Analyze competitor with OpenAI gpt-4o
        const analysisResponse = await fetch(
          "https://api.openai.com/v1/chat/completions",
          {
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
                  content: "You are a competitive intelligence analyst.",
                },
                {
                  role: "user",
                  content: `Analyze this competitor against our business:

Our Business:
- Name: ${business.name}
- Industry: ${business.industry}
- Value Prop: ${business.value_proposition}

Competitor Website Content:
${scrapedData.data?.markdown || ""}

Extract:
1. Competitor name
2. Their positioning
3. Key strengths (array)
4. Key weaknesses/gaps (array)

Respond in JSON format with keys: name, positioning, strengths, weaknesses`,
                },
              ],
              temperature: 0.3,
              response_format: { type: "json_object" },
            }),
          },
        );

        const aiAnalysis = await analysisResponse.json();
        if (!analysisResponse.ok) {
          throw new Error(`OpenAI API error: ${JSON.stringify(aiAnalysis)}`);
        }
        const competitorContext = JSON.parse(
          aiAnalysis.choices[0].message.content,
        );

        // Save competitor
        const result = await sql`
          INSERT INTO competitors (
            business_id, name, website_url, scraped_data,
            positioning, strengths, weaknesses
          )
          VALUES (
            ${businessId},
            ${competitorContext.name || "Unknown Competitor"},
            ${url},
            ${JSON.stringify(scrapedData)},
            ${competitorContext.positioning || null},
            ${JSON.stringify(competitorContext.strengths || [])},
            ${JSON.stringify(competitorContext.weaknesses || [])}
          )
          RETURNING *
        `;

        competitors.push(result[0]);
      } catch (error) {
        console.error(`Error analyzing competitor ${url}:`, error);
      }
    }

    // Generate competitive gap analysis with OpenAI gpt-4o
    const gapAnalysisResponse = await fetch(
      "https://api.openai.com/v1/chat/completions",
      {
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
              content: "You are a market positioning strategist.",
            },
            {
              role: "user",
              content: `Create a competitive gap analysis and positioning recommendations:

Our Business: ${business.name}
Industry: ${business.industry}
Value Prop: ${business.value_proposition}

Competitors Analysis:
${JSON.stringify(
  competitors.map((c) => ({
    name: c.name,
    positioning: c.positioning,
    strengths: c.strengths,
    weaknesses: c.weaknesses,
  })),
  null,
  2,
)}

Provide:
1. Market gaps we can exploit
2. Positioning recommendations
3. Differentiation opportunities

Respond in JSON format with keys: market_gaps (array), positioning_recommendations (array), differentiation_opportunities (array)`,
            },
          ],
          temperature: 0.4,
          response_format: { type: "json_object" },
        }),
      },
    );

    const gapAnalysis = await gapAnalysisResponse.json();
    if (!gapAnalysisResponse.ok) {
      throw new Error(`OpenAI API error: ${JSON.stringify(gapAnalysis)}`);
    }
    const analysis = JSON.parse(gapAnalysis.choices[0].message.content);

    return Response.json({
      competitors,
      analysis,
    });
  } catch (error) {
    console.error("Error analyzing competitors:", error);
    return Response.json(
      { error: "Failed to analyze competitors: " + error.message },
      { status: 500 },
    );
  }
}
