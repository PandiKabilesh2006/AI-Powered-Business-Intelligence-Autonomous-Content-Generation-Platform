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

    const creatives = await sql`
      SELECT * FROM creatives
      WHERE business_id = ${businessId}
      ORDER BY created_at DESC
    `;

    return Response.json({ creatives });
  } catch (error) {
    console.error("Error listing creatives:", error);
    return Response.json(
      { error: "Failed to list creatives" },
      { status: 500 },
    );
  }
}
