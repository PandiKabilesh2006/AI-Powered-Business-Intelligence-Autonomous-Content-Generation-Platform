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

    const competitors = await sql`
      SELECT * FROM competitors
      WHERE business_id = ${businessId}
      ORDER BY created_at DESC
    `;

    return Response.json({ competitors });
  } catch (error) {
    console.error("Error listing competitors:", error);
    return Response.json(
      { error: "Failed to list competitors" },
      { status: 500 },
    );
  }
}
