import sql from "@/app/api/utils/sql";

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const businessId = searchParams.get("businessId");

    if (!businessId) {
      return Response.json(
        { error: "businessId is required" },
        { status: 400 },
      );
    }

    await sql`
      DELETE FROM brand_kits
      WHERE business_id = ${businessId}
    `;

    return Response.json({ success: true });
  } catch (error) {
    console.error("Error deleting brand kit:", error);
    return Response.json(
      { error: "Failed to delete brand kit" },
      { status: 500 },
    );
  }
}
