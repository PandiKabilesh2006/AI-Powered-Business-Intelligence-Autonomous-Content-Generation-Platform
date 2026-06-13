import { join } from "path";
import { promises as fs } from "fs";
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

    // Delete database record
    await sql`
      DELETE FROM videos
      WHERE id = ${id}
    `;

    // Clean up physical directory in public assets
    try {
      const publicDir = join(process.cwd(), "public", "videos", String(id));
      await fs.rm(publicDir, { recursive: true, force: true });
      console.log(`Successfully deleted public folder for videoId ${id}`);
    } catch (fsErr) {
      console.warn(`Failed to clean up files for videoId ${id}:`, fsErr.message);
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error("Error deleting video:", error);
    return Response.json(
      { error: "Failed to delete video" },
      { status: 500 },
    );
  }
}
