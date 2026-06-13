import sql from "@/app/api/utils/sql";

export async function POST(request) {
  try {
    const { businessId, campaignType, objective } = await request.json();

    if (!businessId || !campaignType) {
      return Response.json(
        { error: "businessId and campaignType are required" },
        { status: 400 },
      );
    }

    // Get business and brand context
    const businessResult = await sql`
      SELECT b.*, bk.*
      FROM businesses b
      LEFT JOIN brand_kits bk ON b.id = bk.business_id
      WHERE b.id = ${businessId}
    `;

    if (businessResult.length === 0) {
      return Response.json({ error: "Business not found" }, { status: 404 });
    }

    const data = businessResult[0];

    // Campaign type descriptions
    const campaignDescriptions = {
      launch:
        "Product/service launch campaign with pre-launch, launch day, and post-launch phases",
      lead_gen:
        "Lead generation campaign focused on capturing qualified prospects",
      awareness:
        "Brand awareness campaign to increase visibility and recognition",
      seasonal:
        "Seasonal campaign tied to holidays, events, or seasonal trends",
      competitor:
        "Competitive takeaway campaign highlighting advantages over competitors",
    };

    // Generate campaign using OpenAI API
    const promptText = `Create a comprehensive ${campaignType} campaign for this business:

Business: ${data.name}
Industry: ${data.industry}
Target Audience: ${data.target_audience}
Value Proposition: ${data.value_proposition}
Brand Voice: ${data.brand_voice}
Messaging Pillars: ${data.messaging_pillars?.join(", ")}
${objective ? `Objective: ${objective}` : ""}

Campaign Type: ${campaignDescriptions[campaignType]}

Generate:
1. Campaign name
2. Campaign objective (clear, measurable goal)
3. Strategy (overall approach and key tactics)
4. Channels (array of recommended channels: email, social, ads, content, etc.)
5. Timeline (object with phases and durations)
6. Budget recommendation (estimated allocation across channels)
7. Content ideas (array of 5-7 specific content pieces needed)

Respond in JSON with keys: name, objective, strategy, channels, timeline, budget_recommendation, content_ideas`;

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
            content: "You are a campaign strategist. Create detailed, actionable marketing campaign briefs. You MUST output valid JSON only.",
          },
          {
            role: "user",
            content: promptText,
          },
        ],
        temperature: 0.5,
        response_format: { type: "json_object" },
      }),
    });

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text();
      throw new Error(`OpenAI API error ${openaiResponse.status}: ${errorText}`);
    }

    const openaiData = await openaiResponse.json();
    const rawContent = openaiData.choices[0].message.content;
    const campaign = JSON.parse(rawContent);

    // Save campaign
    const result = await sql`
      INSERT INTO campaigns (
        business_id, campaign_type, name, objective, strategy,
        channels, timeline, budget_recommendation, content_ideas
      )
      VALUES (
        ${businessId},
        ${campaignType},
        ${campaign.name},
        ${campaign.objective},
        ${campaign.strategy},
        ${JSON.stringify(campaign.channels || [])},
        ${JSON.stringify(campaign.timeline || {})},
        ${campaign.budget_recommendation},
        ${JSON.stringify(campaign.content_ideas || [])}
      )
      RETURNING *
    `;

    return Response.json({ campaign: result[0] });
  } catch (error) {
    console.error("Error generating campaign:", error);
    return Response.json(
      { error: "Failed to generate campaign: " + error.message },
      { status: 500 },
    );
  }
}
