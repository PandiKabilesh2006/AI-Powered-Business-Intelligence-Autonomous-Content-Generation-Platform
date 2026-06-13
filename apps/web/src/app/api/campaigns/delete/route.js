import sql from "@/app/api/utils/sql";

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return Response.json(
        { error: "id is required" },
        { status: 400 },
      );
    }

    await sql`
      DELETE FROM campaigns
      WHERE id = ${id}
    `;

    return Response.json({ success: true });
  } catch (error) {
    console.error("Error deleting campaign:", error);
    return Response.json(
      { error: "Failed to delete campaign" },
      { status: 500 },
    );
  }
}
