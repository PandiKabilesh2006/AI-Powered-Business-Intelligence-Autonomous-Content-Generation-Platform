import sql from "@/app/api/utils/sql";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const businessId = searchParams.get("businessId");

    if (!businessId) {
      return Response.json(
        { error: "businessId is required" },
        { status: 400 },
      );
    }

    const campaigns = await sql`
      SELECT * FROM campaigns
      WHERE business_id = ${businessId}
      ORDER BY created_at DESC
    `;

    return Response.json({ campaigns });
  } catch (error) {
    console.error("Error listing campaigns:", error);
    return Response.json(
      { error: "Failed to list campaigns" },
      { status: 500 },
    );
  }
}
