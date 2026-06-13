import sql from "@/app/api/utils/sql";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const businessId = searchParams.get("businessId");
    const contentType = searchParams.get("contentType");

    if (!businessId) {
      return Response.json(
        { error: "businessId is required" },
        { status: 400 },
      );
    }

    let content;
    if (contentType) {
      content = await sql`
        SELECT * FROM content_pieces
        WHERE business_id = ${businessId} AND content_type = ${contentType}
        ORDER BY created_at DESC
      `;
    } else {
      content = await sql`
        SELECT * FROM content_pieces
        WHERE business_id = ${businessId}
        ORDER BY created_at DESC
      `;
    }

    return Response.json({ content });
  } catch (error) {
    console.error("Error listing content:", error);
    return Response.json({ error: "Failed to list content" }, { status: 500 });
  }
}
