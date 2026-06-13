import sql from "@/app/api/utils/sql";

export async function POST(request) {
  try {
    const { businessId, creativeType, format, description, platform, audience, tone, customInstructions, creativeId } =
      await request.json();

    if (!businessId || !creativeType) {
      return Response.json(
        { error: "businessId and creativeType are required" },
        { status: 400 },
      );
    }

    // Enforce environment keys check
    if (!process.env.GEMINI_API_KEY) {
      return Response.json({
        error: "GEMINI_API_KEY is not defined in the environment. Please add it to your .env file."
      }, { status: 400 });
    }

    // Get business and brand context
    const businessResult = await sql`
      SELECT b.*, bk.*
      FROM businesses b
      LEFT JOIN brand_kits bk ON b.id = bk.business_id
      WHERE b.id = ${businessId}
    `;

    if (businessResult.length === 0) {
      return Response.json({ error: "Business not found" }, { status: 404 });
    }

    const data = businessResult[0];
    const colors = data.color_palette || {
      primary: "#2563EB",
      secondary: "#10B981",
    };

    // Build creative prompt
    const formatSpecs = {
      square: "1:1 aspect ratio, Instagram post format",
      portrait: "9:16 aspect ratio, Instagram story/mobile format",
      landscape: "16:9 aspect ratio, Facebook/LinkedIn banner format",
    };

    const prompt = `Create a professional ${creativeType} for ${data.name}. 
Business: ${data.name}
Industry: ${data.industry}
Brand Colors: ${JSON.stringify(colors)}
Format: ${formatSpecs[format] || "square format"}
${description ? `Description: ${description}` : ""}

Creative Guidelines:
- Platform: ${platform || "General"}
- Target Audience: ${audience || data.target_audience || "General Audience"}
- Voice & Tone: ${tone || data.brand_voice || "Professional"}
${customInstructions ? `- Custom Instructions & Styling: ${customInstructions}\n` : ""}

Style: Modern, clean, professional brand-aware design.
Include: Business name, visual elements that represent the brand identity.`;

    // Gemini Veo Video
    let imageUrl = null;
    let apiResponse = null;
    let providerUsed = "none";

    try {
      console.log("Generating creative video using Gemini Veo...");
      
      let aspectRatio = "1:1";
      if (format === "portrait") aspectRatio = "9:16";
      if (format === "landscape") aspectRatio = "16:9";

      // Veo video duration is set to 5 seconds for a standard creative
      const videoBuffer = await generateVeoVideo(prompt, aspectRatio, 5);
      imageUrl = `data:video/mp4;base64,${videoBuffer.toString("base64")}`;
      apiResponse = { provider: "gemini-veo" };
      providerUsed = "gemini-veo";
      console.log("Successfully generated creative video with Gemini Veo!");
    } catch (err) {
      console.error("Gemini Veo creative generation failed:", err.message);
      throw new Error(`Failed to generate creative video: ${err.message}`);
    }

    // Save creative (Update if creativeId is provided, otherwise insert new)
    let result;
    if (creativeId) {
      result = await sql`
        UPDATE creatives
        SET
          image_url = ${imageUrl},
          prompt = ${prompt},
          metadata = ${JSON.stringify({ colors, apiResponse, provider: providerUsed, platform, audience, tone, customInstructions })}::jsonb,
          updated_at = NOW()
        WHERE id = ${creativeId}
        RETURNING *
      `;
    } else {
      result = await sql`
        INSERT INTO creatives (
          business_id, creative_type, format, image_url, prompt, metadata
        )
        VALUES (
          ${businessId},
          ${creativeType},
          ${format || "square"},
          ${imageUrl},
          ${prompt},
          ${JSON.stringify({ colors, apiResponse, provider: providerUsed, platform, audience, tone, customInstructions })}::jsonb
        )
        RETURNING *
      `;
    }

    return Response.json({ creative: result[0] });
  } catch (error) {
    console.error("Error generating creative:", error);
    return Response.json(
      { error: "Failed to generate creative: " + error.message },
      { status: 500 },
    );
  }
}

async function generateVeoVideo(prompt, aspectRatio, durationSeconds) {
  const veoModel = "veo-3.0-fast-generate-001"; 
  console.log(`Initiating Veo video generation for model ${veoModel}...`);
  const veoUrl = `https://generativelanguage.googleapis.com/v1beta/models/${veoModel}:predictLongRunning?key=${process.env.GEMINI_API_KEY}`;
  
  const response = await fetch(veoUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      instances: [{ prompt }],
      parameters: {
        aspectRatio,
        durationSeconds
      }
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Veo API returned status ${response.status}: ${errorText}`);
  }

  const initData = await response.json();
  const operationName = initData.name;
  if (!operationName) {
    throw new Error("No operation name returned from Veo API.");
  }
  console.log(`Veo operation started: ${operationName}. Polling for completion...`);

  let done = false;
  let opData = null;
  let attempts = 0;
  const maxAttempts = 60; 
  
  while (!done && attempts < maxAttempts) {
    await new Promise(resolve => setTimeout(resolve, 5000));
    attempts++;
    
    const pollUrl = `https://generativelanguage.googleapis.com/v1beta/${operationName}?key=${process.env.GEMINI_API_KEY}`;
    const pollRes = await fetch(pollUrl);
    
    if (pollRes.ok) {
      opData = await pollRes.json();
      if (opData.done) {
        done = true;
      } else {
        console.log(`Veo operation ${operationName} in progress (attempt ${attempts}/${maxAttempts})...`);
      }
    } else {
      console.warn(`Veo polling failed on attempt ${attempts}: ${pollRes.statusText}`);
    }
  }

  if (!done) {
    throw new Error("Veo video generation timed out after 5 minutes.");
  }

  if (opData.error) {
    throw new Error(`Veo generation failed: ${opData.error.message || JSON.stringify(opData.error)}`);
  }

  const samples = opData.response?.generateVideoResponse?.generatedSamples;
  if (!samples || samples.length === 0 || !samples[0].video?.uri) {
    throw new Error(`Veo response is missing video uri: ${JSON.stringify(opData.response)}`);
  }

  const downloadUri = samples[0].video.uri;
  console.log(`Veo video generation complete! Downloading clip from: ${downloadUri}`);
  
  const downloadUrl = `${downloadUri}&key=${process.env.GEMINI_API_KEY}`;
  const downloadRes = await fetch(downloadUrl);
  if (!downloadRes.ok) {
    throw new Error(`Failed to download Veo video clip: status ${downloadRes.status}`);
  }

  const arrayBuffer = await downloadRes.arrayBuffer();
  return Buffer.from(arrayBuffer);
}
