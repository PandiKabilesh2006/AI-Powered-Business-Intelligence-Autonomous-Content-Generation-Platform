import sql from "@/app/api/utils/sql";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return Response.json({ error: "userId is required" }, { status: 400 });
    }

    const businesses = await sql`
      SELECT 
        b.*,
        (SELECT COUNT(*) FROM content_pieces WHERE business_id = b.id) AS content_count,
        (SELECT COUNT(*) FROM creatives WHERE business_id = b.id) AS creatives_count,
        (SELECT COUNT(*) FROM campaigns WHERE business_id = b.id) AS campaigns_count,
        (SELECT COUNT(*) FROM competitors WHERE business_id = b.id) AS competitors_count,
        (SELECT COUNT(*) FROM videos WHERE business_id = b.id) AS videos_count,
        (SELECT COUNT(*) FROM brand_kits WHERE business_id = b.id) AS has_brand_kit
      FROM businesses b
      WHERE b.user_id = ${userId}
      ORDER BY b.created_at DESC
    `;

    return Response.json({ businesses });
  } catch (error) {
    console.error("Error listing businesses:", error);
    return Response.json(
      { error: "Failed to list businesses" },
      { status: 500 },
    );
  }
}
