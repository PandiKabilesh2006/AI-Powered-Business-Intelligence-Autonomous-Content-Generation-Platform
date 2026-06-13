import sql from "@/app/api/utils/sql";

export async function POST(request) {
  try {
    const { businessId, logoUrl } = await request.json();

    if (!businessId) {
      return Response.json(
        { error: "businessId is required" },
        { status: 400 },
      );
    }

    if (!logoUrl) {
      return Response.json(
        { error: "logoUrl is required" },
        { status: 400 },
      );
    }

    // Verify business exists
    const businessCheck = await sql`
      SELECT id FROM businesses WHERE id = ${businessId}
    `;
    if (businessCheck.length === 0) {
      return Response.json({ error: "Business workspace not found" }, { status: 404 });
    }

    // Check if brand kit exists
    const existingKit = await sql`
      SELECT id FROM brand_kits WHERE business_id = ${businessId}
    `;

    let result;
    if (existingKit.length > 0) {
      result = await sql`
        UPDATE brand_kits
        SET logo_url = ${logoUrl}, updated_at = NOW()
        WHERE business_id = ${businessId}
        RETURNING *
      `;
    } else {
      result = await sql`
        INSERT INTO brand_kits (business_id, logo_url)
        VALUES (${businessId}, ${logoUrl})
        RETURNING *
      `;
    }

    return Response.json({ success: true, brandKit: result[0] });
  } catch (error) {
    console.error("Error uploading logo:", error);
    return Response.json(
      { error: "Failed to save logo: " + error.message },
      { status: 500 },
    );
  }
}
