import sql from "@/app/api/utils/sql";

export async function POST(request) {
  try {
    const { businessId, contentType, topic, additionalContext, customInstructions } =
      await request.json();

    const instructions = customInstructions || additionalContext;


    if (!businessId || !contentType) {
      return Response.json(
        { error: "businessId and contentType are required" },
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

    // Content type templates
    const contentPrompts = {
      linkedin:
        "Create an engaging LinkedIn post (max 1300 chars) with professional insights and a clear call-to-action.",
      blog: "Write a comprehensive blog article (800-1200 words) with SEO-optimized headings, introduction, body sections, and conclusion.",
      email:
        "Compose a marketing email with subject line, preview text, engaging body, and clear CTA.",
      twitter:
        "Create 3 engaging tweet variations (max 280 chars each) with hashtags.",
      instagram:
        "Write an Instagram caption with emojis, storytelling, and relevant hashtags.",
      facebook:
        "Create a Facebook post optimized for engagement with conversational tone.",
      seo_article:
        "Write an SEO-optimized article (1500-2000 words) with H2/H3 headings, keyword integration, and meta description.",
    };

    const prompt =
      contentPrompts[contentType] ||
      "Create engaging content for this business.";

    // Generate content using OpenAI API
    const systemInstruction = `You are a content creator writing for ${data.name}. 
Brand Voice: ${data.brand_voice || "Professional and engaging"}
Tone: ${data.tone_guidelines || "Clear, authentic, and value-driven"}
Target Audience: ${data.target_audience}
Messaging Pillars: ${data.messaging_pillars?.join(", ") || "Innovation, Quality, Trust"}
You MUST output valid JSON only.`;

    const promptText = `${prompt}

Business: ${data.name}
Industry: ${data.industry}
Value Proposition: ${data.value_proposition}
${topic ? `Topic: ${topic}` : ""}
${instructions ? `Custom Instructions / Additional Context: ${instructions}` : ""}

Respond in JSON format with keys: title (if applicable), content, metadata (any additional info like hashtags, subject line, etc.)`;

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
            content: systemInstruction,
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
    const generatedContent = JSON.parse(rawContent);

    // Save content
    const result = await sql`
      INSERT INTO content_pieces (
        business_id, content_type, title, content, metadata
      )
      VALUES (
        ${businessId},
        ${contentType},
        ${generatedContent.title || null},
        ${generatedContent.content},
        ${JSON.stringify(generatedContent.metadata || {})}
      )
      RETURNING *
    `;

    return Response.json({ content: result[0] });
  } catch (error) {
    console.error("Error generating content:", error);
    return Response.json(
      { error: "Failed to generate content: " + error.message },
      { status: 500 },
    );
  }
}
