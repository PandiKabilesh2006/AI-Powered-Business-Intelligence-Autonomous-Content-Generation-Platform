import sql from "@/app/api/utils/sql";

export async function POST(request) {
  try {
    const { businessId } = await request.json();

    if (!businessId) {
      return Response.json(
        { error: "businessId is required" },
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
    const context = business.business_context || {};

    // Get existing brand kit colors and typography if they exist to prevent shifting on regeneration
    const existingKitResult = await sql`
      SELECT color_palette, typography FROM brand_kits WHERE business_id = ${businessId}
    `;
    const existingKit = existingKitResult[0] || null;

    // Generate brand kit using OpenAI API
    const promptText = `Create a complete brand kit for this business:

Business: ${business.name}
Industry: ${business.industry}
Target Audience: ${business.target_audience}
Value Proposition: ${business.value_proposition}
Website-Extracted Brand Colors: ${context.brand_colors ? JSON.stringify(context.brand_colors) : "None"}
Website-Extracted Typography: ${context.typography ? JSON.stringify(context.typography) : "None"}
Existing Brand Kit Colors: ${existingKit?.color_palette ? JSON.stringify(existingKit.color_palette) : "None"}
Existing Typography: ${existingKit?.typography ? JSON.stringify(existingKit.typography) : "None"}

Generate:
1. Brand Voice (personality, tone descriptors)
2. Brand Story (compelling narrative)
3. Messaging Pillars (3-5 core themes, array)
4. Color Palette (primary, secondary, and accent colors. If 'Website-Extracted Brand Colors' is not 'None', you MUST use those exact hex codes as the colors. If 'Website-Extracted Brand Colors' is 'None' but 'Existing Brand Kit Colors' is not 'None', reuse those exact colors. Otherwise, generate appropriate colors. For each color, provide an object with 'hex' and 'name' keys.)
5. Typography (font recommendations for headings and body. If 'Website-Extracted Typography' is not 'None', you MUST use those exact fonts. If 'Website-Extracted Typography' is 'None' but 'Existing Typography' is not 'None', you MUST reuse those exact fonts. Otherwise, generate appropriate modern fonts. Provide an object with 'heading' and 'body' keys.)
6. Elevator Pitch (30-second pitch)
7. Taglines (3-5 options, array)
8. Tone Guidelines (do's and don'ts)

Respond in JSON with keys: brand_voice, brand_story, messaging_pillars, color_palette, typography, elevator_pitch, taglines, tone_guidelines`;

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
            content: "You are a brand strategist and creative director. Create comprehensive brand guidelines. You MUST output valid JSON only.",
          },
          {
            role: "user",
            content: promptText,
          },
        ],
        temperature: 0.4,
        response_format: { type: "json_object" },
      }),
    });

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text();
      throw new Error(`OpenAI API error ${openaiResponse.status}: ${errorText}`);
    }

    const openaiData = await openaiResponse.json();
    const rawContent = openaiData.choices[0].message.content;
    const brandKit = JSON.parse(rawContent);

    // Check if brand kit exists for insert/update routing
    const existingKitCheck = await sql`
      SELECT id FROM brand_kits WHERE business_id = ${businessId}
    `;

    let result;
    if (existingKitCheck.length > 0) {
      // Update existing
      result = await sql`
        UPDATE brand_kits
        SET
          brand_voice = ${brandKit.brand_voice},
          brand_story = ${brandKit.brand_story},
          messaging_pillars = ${JSON.stringify(brandKit.messaging_pillars || [])},
          color_palette = ${JSON.stringify(brandKit.color_palette)},
          typography = ${JSON.stringify(brandKit.typography)},
          elevator_pitch = ${brandKit.elevator_pitch},
          taglines = ${JSON.stringify(brandKit.taglines || [])},
          tone_guidelines = ${brandKit.tone_guidelines},
          updated_at = NOW()
        WHERE business_id = ${businessId}
        RETURNING *
      `;
    } else {
      // Insert new
      result = await sql`
        INSERT INTO brand_kits (
          business_id, brand_voice, brand_story, messaging_pillars,
          color_palette, typography, elevator_pitch, taglines, tone_guidelines
        )
        VALUES (
          ${businessId},
          ${brandKit.brand_voice},
          ${brandKit.brand_story},
          ${JSON.stringify(brandKit.messaging_pillars || [])},
          ${JSON.stringify(brandKit.color_palette)},
          ${JSON.stringify(brandKit.typography)},
          ${brandKit.elevator_pitch},
          ${JSON.stringify(brandKit.taglines || [])},
          ${brandKit.tone_guidelines}
        )
        RETURNING *
      `;
    }

    return Response.json({ brandKit: result[0] });
  } catch (error) {
    console.error("Error generating brand kit:", error);
    return Response.json(
      { error: "Failed to generate brand kit: " + error.message },
      { status: 500 },
    );
  }
}
