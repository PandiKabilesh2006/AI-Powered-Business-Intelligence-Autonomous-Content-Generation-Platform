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

    const videos = await sql`
      SELECT * FROM videos
      WHERE business_id = ${businessId}
      ORDER BY created_at DESC
    `;

    return Response.json({ videos });
  } catch (error) {
    console.error("Error listing videos:", error);
    return Response.json(
      { error: "Failed to list videos" },
      { status: 500 },
    );
  }
}
