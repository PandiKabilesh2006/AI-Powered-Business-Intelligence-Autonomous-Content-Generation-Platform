import sql from "@/app/api/utils/sql";

export async function POST(request) {
  try {
    const { businessId, topic, title, platform, audience, tone, customInstructions } = await request.json();

    if (!businessId || !topic) {
      return Response.json(
        { error: "businessId and topic are required" },
        { status: 400 },
      );
    }

    const videoTitle = title || `Video on ${topic.slice(0, 40)}${topic.length > 40 ? '...' : ''}`;

    // Insert new video task
    const result = await sql`
      INSERT INTO videos (
        business_id, title, topic, status, script, metadata
      )
      VALUES (
        ${businessId},
        ${videoTitle},
        ${topic},
        'pending',
        '{}'::jsonb,
        ${JSON.stringify({ platform, audience, tone, customInstructions })}::jsonb
      )
      RETURNING *
    `;

    const video = result[0];

    // Trigger the background agent generation process
    const origin = new URL(request.url).origin;
    fetch(`${origin}/api/videos/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ videoId: video.id }),
    }).catch((err) => {
      console.error("Failed to trigger background generation:", err);
    });

    return Response.json({ video });
  } catch (error) {
    console.error("Error creating video:", error);
    return Response.json(
      { error: "Failed to create video: " + error.message },
      { status: 500 },
    );
  }
}
