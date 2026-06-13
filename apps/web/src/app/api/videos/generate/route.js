import { join } from "path";
import { promises as fs } from "fs";
import { exec } from "child_process";
import { promisify } from "util";
import sql from "@/app/api/utils/sql";

const execPromise = promisify(exec);

export async function POST(request) {
  let videoId = null;
  try {
    const body = await request.json();
    videoId = body.videoId;
    if (!videoId) {
      return Response.json({ error: "videoId is required" }, { status: 400 });
    }

    // Load video record from DB
    const videoResult = await sql`SELECT * FROM videos WHERE id = ${videoId}`;
    if (videoResult.length === 0) {
      return Response.json({ error: "Video task not found" }, { status: 404 });
    }
    const video = videoResult[0];

    // Enforce environment keys check
    if (!process.env.OPENAI_API_KEY) {
      const errMsg = "OPENAI_API_KEY is not defined in the environment. Please add it to your .env file.";
      await sql`
        UPDATE videos 
        SET 
          status = 'failed', 
          metadata = ${JSON.stringify({ error: errMsg })}, 
          updated_at = NOW() 
        WHERE id = ${videoId}
      `;
      return Response.json({ error: errMsg }, { status: 400 });
    }
    if (!process.env.GEMINI_API_KEY) {
      const errMsg = "GEMINI_API_KEY is not defined in the environment. Please add it to your .env file.";
      await sql`
        UPDATE videos 
        SET 
          status = 'failed', 
          metadata = ${JSON.stringify({ error: errMsg })}, 
          updated_at = NOW() 
        WHERE id = ${videoId}
      `;
      return Response.json({ error: errMsg }, { status: 400 });
    }
    if (!process.env.ELEVENLABS_API_KEY) {
      const errMsg = "ELEVENLABS_API_KEY is not defined in the environment. Please add it to your .env file.";
      await sql`
        UPDATE videos 
        SET 
          status = 'failed', 
          metadata = ${JSON.stringify({ error: errMsg })}, 
          updated_at = NOW() 
        WHERE id = ${videoId}
      `;
      return Response.json({ error: errMsg }, { status: 400 });
    }

    // Load business context
    const businessResult = await sql`
      SELECT b.*, bk.brand_voice, bk.brand_story, bk.color_palette
      FROM businesses b
      LEFT JOIN brand_kits bk ON b.id = bk.business_id
      WHERE b.id = ${video.business_id}
    `;
    const business = businessResult[0] || {};

    // 1. Prepare Directory (Clean up any old assets for regeneration)
    const publicDir = join(process.cwd(), "public", "videos", String(videoId));
    await fs.rm(publicDir, { recursive: true, force: true });
    await fs.mkdir(publicDir, { recursive: true });

    // Initialize state
    console.log(`Starting video generation agent workflow for videoId ${videoId}...`);
    await sql`UPDATE videos SET status = 'generating_script', updated_at = NOW() WHERE id = ${videoId}`;

    let scriptData = null;

    // ─── AGENT 1 & 2: SCRIPT GENERATION & CRITICAL REVIEW (OPENAI) ───────────
    try {
      const metadata = video.metadata || {};
      const platform = metadata.platform || "General Video";
      const audience = metadata.audience || business.target_audience || "General Audience";
      const tone = metadata.tone || business.brand_voice || "Professional";
      const customInstructions = metadata.customInstructions || "";

      const prompt = `Write a short, engaging 3-5 scene script for a faceless video on the topic: "${video.topic}".
Business Details:
Name: ${business.name}
Industry: ${business.industry || "General"}
Brand Story: ${business.brand_story || ""}

Video Target Guidelines:
- Platform: ${platform}
- Target Audience: ${audience}
- Voice & Tone: ${tone}
${customInstructions ? `- Custom Styling & Content Instructions: ${customInstructions}\n` : ""}

Your output MUST be a JSON object with a single root key "scenes", containing an array of scene objects. Each scene object MUST have exactly these keys:
- scene_number (integer, starting at 1)
- voiceover_text (string, what will be spoken. Length should be 10-25 words. Keep it highly punchy and direct.)
- image_prompt (string, descriptive prompt for video generator. Must specify clear visual details, objects, colors, photographic style, no text, and widescreen style.)
- text_overlay (string, 3-6 words of bold subtitle/caption to overlay on screen.)
- duration (float, estimated duration in seconds. Calculate as: word count / 2.5, minimum 3.5 seconds.)

Produce the raw JSON output matching this schema.`;

      console.log("Agent 1: Generating script draft using OpenAI...");
      const draftResponse = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: "gpt-4o",
          messages: [
            {
              role: "system",
              content: "You are an expert short-form video copywriter and storyboard artist. You MUST output valid JSON only.",
            },
            {
              role: "user",
              content: prompt,
            },
          ],
          temperature: 0.7,
          response_format: { type: "json_object" },
        }),
      });

      if (!draftResponse.ok) {
        const errorText = await draftResponse.text();
        throw new Error(`OpenAI Draft Generation failed with status ${draftResponse.status}: ${errorText}`);
      }

      const draftResult = await draftResponse.json();
      const draftText = draftResult.choices[0].message.content;
      const draftScript = JSON.parse(draftText);

      // Run the Reviewer Agent to verify pacing, structure, and quality
      console.log("Agent 2: Reviewing and refining script using OpenAI...");
      const reviewPrompt = `You are a Senior Creative Director. Review the draft storyboard JSON and refine it for final production.
Draft Storyboard:
${JSON.stringify(draftScript, null, 2)}

Original Guidelines:
- Platform: ${platform}
- Target Audience: ${audience}
- Voice & Tone: ${tone}
${customInstructions ? `- Custom Styling & Content Instructions: ${customInstructions}\n` : ""}

Requirements for refinement:
1. Verify scene durations. If a scene has too many words for its duration (pacing should be ~2.5 words per second), increase the duration to ensure comfortable voiceover pacing.
2. Polish the text overlays. Make sure they are high-impact, punchy callouts.
3. Enhance image prompts to make them highly descriptive, photorealistic, visually cohesive, and set in a 16:9 widescreen format suitable for a video clip generation model.
4. Output the final refined storyboard in the identical JSON schema with the root key "scenes".`;

      const finalResponse = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: "gpt-4o",
          messages: [
            {
              role: "system",
              content: "You are a perfectionist video director. Review storyboard scripts and enforce strict timing, visual quality, and cohesive branding. You MUST output valid JSON only.",
            },
            {
              role: "user",
              content: reviewPrompt,
            },
          ],
          temperature: 0.4,
          response_format: { type: "json_object" },
        }),
      });

      if (!finalResponse.ok) {
        const errorText = await finalResponse.text();
        throw new Error(`OpenAI Script Refinement failed with status ${finalResponse.status}: ${errorText}`);
      }

      const finalResult = await finalResponse.json();
      const finalRawText = finalResult.choices[0].message.content;
      scriptData = JSON.parse(finalRawText);
      console.log("Agentic script generation & review completed successfully.");

    } catch (err) {
      console.error("Critical error in script generation:", err);
      throw new Error(`Failed to generate script: ${err.message}`);
    }

    // Save script storyboard in database
    await sql`
      UPDATE videos 
      SET 
        script = ${JSON.stringify(scriptData)}, 
        status = 'generating_assets', 
        updated_at = NOW() 
      WHERE id = ${videoId}
    `;

    // ─── ASSET CAPTURE STAGE (VOICE & IMAGES) ────────────────────────────────
    console.log(`Starting asset generation for ${scriptData.scenes.length} scenes...`);
    const finalScenes = [];

    for (let idx = 0; idx < scriptData.scenes.length; idx++) {
      const scene = scriptData.scenes[idx];
      const audioFileName = `scene_${idx + 1}.mp3`;
      const audioPath = join(publicDir, audioFileName);

      let audioUrl = null;

      // A. Text-to-Speech (TTS) Voiceover Generation using ElevenLabs
      try {
        console.log(`Generating TTS audio for Scene ${idx + 1} with ElevenLabs...`);
        const voiceId = "21m00Tcm4TlvDq8ikWAM"; // Adam default voice
        const ttsRes = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "xi-api-key": process.env.ELEVENLABS_API_KEY,
          },
          body: JSON.stringify({
            text: scene.voiceover_text,
            model_id: "eleven_monolingual_v1",
            voice_settings: {
              stability: 0.5,
              similarity_boost: 0.75,
            },
          }),
        });

        if (ttsRes.ok) {
          const buffer = Buffer.from(await ttsRes.arrayBuffer());
          await fs.writeFile(audioPath, buffer);
          audioUrl = `/videos/${videoId}/${audioFileName}`;
          console.log(`Successfully generated TTS audio for Scene ${idx + 1} with ElevenLabs.`);
        } else {
          const errorText = await ttsRes.text();
          throw new Error(`ElevenLabs TTS returned status ${ttsRes.status}: ${errorText}`);
        }
      } catch (e) {
        console.error(`ElevenLabs TTS generation failed: ${e.message}`);
        throw new Error(`TTS generation failed for Scene ${idx + 1}: ${e.message}`);
      }

      // B. Visual Generation (Video clip via Gemini Veo)
      let visualUrl = null;
      let visualFileName = `scene_${idx + 1}.mp4`;
      let visualPath = join(publicDir, visualFileName);

      try {
        console.log(`Generating video clip for Scene ${idx + 1} with Gemini Veo...`);
        const videoDuration = Math.max(3, Math.min(8, Math.round(scene.duration || 5)));
        const videoBuffer = await generateVeoVideo(scene.image_prompt, "16:9", videoDuration);
        await fs.writeFile(visualPath, videoBuffer);
        visualUrl = `/videos/${videoId}/${visualFileName}`;
        console.log(`Successfully generated video clip for Scene ${idx + 1} with Gemini Veo!`);
      } catch (e) {
        console.error(`Visual asset generation failed for Scene ${idx + 1}:`, e);
        throw new Error(`Visual generation failed for Scene ${idx + 1}: ${e.message}`);
      }

      // Compile final scene metadata
      finalScenes.push({
        ...scene,
        text: scene.text_overlay, // Make sure Python assembler gets the text overlay for subtitles
        image_path: visualPath, // absolute path for python assembler
        audio_path: audioPath, // absolute path for python assembler
        image_url: visualUrl, // relative path for frontend client
        audio_url: audioUrl, // relative path for frontend client
      });
    }

    // Save final storyboard paths
    const finalStoryboard = { scenes: finalScenes };
    const storyboardJsonPath = join(publicDir, "storyboard.json");
    await fs.writeFile(storyboardJsonPath, JSON.stringify(finalStoryboard, null, 2));

    await sql`
      UPDATE videos 
      SET 
        script = ${JSON.stringify(finalStoryboard)}, 
        status = 'assembling', 
        updated_at = NOW() 
      WHERE id = ${videoId}
    `;

    // ─── ASSEMBLY STAGE ──────────────────────────────────────────────────────
    console.log("Starting video assembly process...");
    const videoOutPath = join(publicDir, "output.mp4");
    const pyScriptPath = join(process.cwd(), "scripts", "assemble_video.py");

    let assemblySuccessful = false;
    let isMock = false;
    let errorMsg = null;

    try {
      const compileCmd = `python "${pyScriptPath}" "${storyboardJsonPath.replace(/\\/g, "/")}" "${videoOutPath.replace(/\\/g, "/")}"`;
      console.log(`Running video compile command: ${compileCmd}`);
      const { stdout, stderr } = await execPromise(compileCmd);
      console.log("Python stdout:", stdout);
      if (stderr) console.warn("Python stderr:", stderr);

      if (stdout.includes("SUCCESS:")) {
        assemblySuccessful = true;
      } else {
        errorMsg = "Compilation script succeeded but did not return success status.";
      }
    } catch (e) {
      console.warn("Python MoviePy assembly failed. Falling back to frontend interactive player:", e.message);
      errorMsg = e.message;
      isMock = true;
    }

    // ─── TASK WRAP UP & STATUS UPDATE ──────────────────────────────────────
    let finalVideoUrl = null;
    let finalStatus = "failed";

    if (assemblySuccessful) {
      finalVideoUrl = `/videos/${videoId}/output.mp4`;
      finalStatus = "completed";
      console.log(`Video task ${videoId} completed successfully! URL: ${finalVideoUrl}`);
    } else {
      // If assembly fails, we mark it as 'completed' in preview mode so the client can play the interactive slideshow
      finalStatus = "completed";
      isMock = true;
      console.log(`Video task ${videoId} compiled in Interactive Preview mode.`);
    }

    await sql`
      UPDATE videos 
      SET 
        status = ${finalStatus}, 
        video_url = ${finalVideoUrl}, 
        metadata = ${JSON.stringify({
      is_mock: isMock,
      error: errorMsg,
      assembly_tried: true
    })},
        updated_at = NOW() 
      WHERE id = ${videoId}
    `;

    return Response.json({
      success: true,
      status: finalStatus,
      video_url: finalVideoUrl,
      is_mock: isMock
    });

  } catch (error) {
    console.error("Critical error in video generation background task:", error);
    try {
      await sql`
        UPDATE videos 
        SET 
          status = 'failed', 
          metadata = ${JSON.stringify({ error: error.message })}, 
          updated_at = NOW() 
        WHERE id = ${videoId}
      `;
    } catch (dbErr) {
      console.error("Failed to set video task error status in DB:", dbErr);
    }
    return Response.json(
      { error: "Video generation failed: " + error.message },
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
