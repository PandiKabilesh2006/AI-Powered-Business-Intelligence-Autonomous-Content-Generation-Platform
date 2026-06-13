import sql from "@/app/api/utils/sql";

export async function GET(request, { params }) {
  try {
    const { id } = params;

    const result = await sql`
      SELECT 
        b.*,
        (SELECT COUNT(*) FROM content_pieces WHERE business_id = b.id) AS content_count,
        (SELECT COUNT(*) FROM creatives WHERE business_id = b.id) AS creatives_count,
        (SELECT COUNT(*) FROM campaigns WHERE business_id = b.id) AS campaigns_count,
        (SELECT COUNT(*) FROM competitors WHERE business_id = b.id) AS competitors_count,
        (SELECT COUNT(*) FROM videos WHERE business_id = b.id) AS videos_count,
        (SELECT COUNT(*) FROM brand_kits WHERE business_id = b.id) AS has_brand_kit
      FROM businesses b
      WHERE b.id = ${id}
    `;

    if (result.length === 0) {
      return Response.json({ error: "Business not found" }, { status: 404 });
    }

    return Response.json({ business: result[0] });
  } catch (error) {
    console.error("Error fetching business:", error);
    return Response.json(
      { error: "Failed to fetch business" },
      { status: 500 },
    );
  }
}

export async function PUT(request, { params }) {
  try {
    const { id } = params;
    const updates = await request.json();

    const setClauses = [];
    const values = [];
    let paramIndex = 1;

    const allowedFields = [
      "name",
      "industry",
      "target_audience",
      "value_proposition",
      "scraped_data",
      "business_context",
    ];

    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        setClauses.push(`${field} = $${paramIndex}`);
        values.push(updates[field]);
        paramIndex++;
      }
    }

    if (setClauses.length === 0) {
      return Response.json(
        { error: "No valid fields to update" },
        { status: 400 },
      );
    }

    // Add updated_at
    setClauses.push(`updated_at = NOW()`);
    values.push(id);

    const query = `
      UPDATE businesses
      SET ${setClauses.join(", ")}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await sql(query, values);

    if (result.length === 0) {
      return Response.json({ error: "Business not found" }, { status: 404 });
    }

    return Response.json({ business: result[0] });
  } catch (error) {
    console.error("Error updating business:", error);
    return Response.json(
      { error: "Failed to update business" },
      { status: 500 },
    );
  }
}
