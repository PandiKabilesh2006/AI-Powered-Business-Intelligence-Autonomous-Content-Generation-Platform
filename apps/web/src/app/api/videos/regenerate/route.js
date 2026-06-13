import sql from "@/app/api/utils/sql";

export async function POST(request) {
  try {
    const { videoId, platform, audience, tone, customInstructions } = await request.json();

    if (!videoId) {
      return Response.json(
        { error: "videoId is required" },
        { status: 400 },
      );
    }

    // Verify it exists
    const videoResult = await sql`SELECT * FROM videos WHERE id = ${videoId}`;
    if (videoResult.length === 0) {
      return Response.json({ error: "Video not found" }, { status: 404 });
    }

    // Reset database record
    await sql`
      UPDATE videos
      SET
        status = 'pending',
        script = '{}'::jsonb,
        video_url = NULL,
        metadata = ${JSON.stringify({ platform, audience, tone, customInstructions })}::jsonb,
        updated_at = NOW()
      WHERE id = ${videoId}
    `;

    // Trigger the background agent generation process
    const origin = new URL(request.url).origin;
    fetch(`${origin}/api/videos/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ videoId }),
    }).catch((err) => {
      console.error("Failed to trigger background generation:", err);
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error("Error regenerating video:", error);
    return Response.json(
      { error: "Failed to regenerate video: " + error.message },
      { status: 500 },
    );
  }
}
