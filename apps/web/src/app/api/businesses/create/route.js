import sql from "@/app/api/utils/sql";

export async function POST(request) {
  try {
    const {
      userId,
      websiteUrl,
      name,
      industry,
      target_audience,
      value_proposition,
    } = await request.json();

    if (!userId || !websiteUrl) {
      return Response.json(
        { error: "userId and websiteUrl are required" },
        { status: 400 },
      );
    }

    const businessName = name || "New Business";

    const result = await sql`
      INSERT INTO businesses (user_id, name, website_url, industry, target_audience, value_proposition)
      VALUES (${userId}, ${businessName}, ${websiteUrl}, ${industry || null}, ${target_audience || null}, ${value_proposition || null})
      RETURNING *
    `;

    return Response.json({ business: result[0] });
  } catch (error) {
    console.error("Error creating business:", error);
    return Response.json(
      { error: "Failed to create business" },
      { status: 500 },
    );
  }
}
