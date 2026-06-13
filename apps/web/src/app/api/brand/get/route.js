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

    const result = await sql`
      SELECT * FROM brand_kits
      WHERE business_id = ${businessId}
    `;

    if (result.length === 0) {
      return Response.json({ error: "Brand kit not found" }, { status: 404 });
    }

    return Response.json({ brandKit: result[0] });
  } catch (error) {
    console.error("Error fetching brand kit:", error);
    return Response.json(
      { error: "Failed to fetch brand kit" },
      { status: 500 },
    );
  }
}
