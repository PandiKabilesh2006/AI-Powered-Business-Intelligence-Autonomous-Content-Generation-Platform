import os
import json
import httpx
import shutil
import asyncio
import traceback
from fastapi import APIRouter, HTTPException, Query, BackgroundTasks
from pydantic import BaseModel
from typing import Optional, Dict, Any
from apps.backend import config
from apps.backend.database import sql
from apps.backend.utils.assemble import assemble_video
from apps.backend.routers.creatives import generate_veo_video

router = APIRouter(prefix="/api/videos", tags=["videos"])

class VideoCreateRequest(BaseModel):
    businessId: int
    topic: str
    title: Optional[str] = None
    platform: Optional[str] = "General Video"
    audience: Optional[str] = None
    tone: Optional[str] = None
    customInstructions: Optional[str] = None

class VideoGenerateRequest(BaseModel):
    videoId: int

class VideoRegenerateRequest(BaseModel):
    videoId: int
    platform: Optional[str] = None
    audience: Optional[str] = None
    tone: Optional[str] = None
    customInstructions: Optional[str] = None

async def generate_elevenlabs_tts(text: str, output_path: str) -> bool:
    voice_id = "21m00Tcm4TlvDq8ikWAM" # Adam default voice
    tts_url = f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}"
    
    headers = {
        "Content-Type": "application/json",
        "xi-api-key": config.ELEVENLABS_API_KEY
    }
    body = {
        "text": text,
        "model_id": "eleven_multilingual_v2",
        "voice_settings": {
            "stability": 0.5,
            "similarity_boost": 0.75
        }
    }
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(tts_url, headers=headers, json=body)
        if response.is_success:
            with open(output_path, "wb") as f:
                f.write(response.content)
            return True
        else:
            raise Exception(f"ElevenLabs TTS failed: status {response.status_code}, {response.text}")

async def background_generate_video(video_id: int):
    try:
        # Load video record from DB
        video_result = sql("SELECT * FROM videos WHERE id = $1", [video_id])
        if not video_result:
            print(f"Background Task Error: Video {video_id} not found.")
            return
        video = video_result[0]
        
        # Enforce key validations
        if not config.OPENAI_API_KEY or not config.GEMINI_API_KEY or not config.ELEVENLABS_API_KEY:
            err_msg = "Missing API keys (OpenAI, Gemini, or ElevenLabs) in environment configuration."
            sql("UPDATE videos SET status = 'failed', metadata = $1::jsonb, updated_at = NOW() WHERE id = $2", [dict(error=err_msg), video_id])
            return
            
        # Get business context
        business_result = sql("""
            SELECT b.*, bk.brand_voice, bk.brand_story, bk.color_palette
            FROM businesses b
            LEFT JOIN brand_kits bk ON b.id = bk.business_id
            WHERE b.id = $1
        """, [video.get("business_id")])
        business = business_result[0] if business_result else {}
        
        # 1. Prepare Directory
        public_dir = config.WEB_DIR / "public" / "videos" / str(video_id)
        if os.path.exists(public_dir):
            shutil.rmtree(public_dir)
        os.makedirs(public_dir, exist_ok=True)
        
        print(f"Starting video generation background task for videoId {video_id}...")
        sql("UPDATE videos SET status = 'generating_script', updated_at = NOW() WHERE id = $1", [video_id])
        
        # ─── AGENT 1 & 2: SCRIPT GENERATION & CRITICAL REVIEW (OPENAI) ───────────
        metadata = video.get("metadata") or {}
        platform = metadata.get("platform") or "General Video"
        audience = metadata.get("audience") or business.get("target_audience") or "General Audience"
        tone = metadata.get("tone") or business.get("brand_voice") or "Professional"
        custom_instructions = metadata.get("customInstructions") or ""
        
        prompt = f"""Write a short, engaging 3-5 scene script for a faceless video on the topic: "{video.get('topic')}".
Business Details:
Name: {business.get('name')}
Industry: {business.get('industry', 'General')}
Brand Story: {business.get('brand_story', '')}

Video Target Guidelines:
- Platform: {platform}
- Target Audience: {audience}
- Voice & Tone: {tone}
{f"- Custom Styling & Content Instructions: {custom_instructions}" if custom_instructions else ""}

Your output MUST be a JSON object with a single root key "scenes", containing an array of scene objects. Each scene object MUST have exactly these keys:
- scene_number (integer, starting at 1)
- voiceover_text (string, what will be spoken. Length should be 10-25 words. Keep it highly punchy and direct.)
- image_prompt (string, descriptive prompt for video generator. Must specify clear visual details, objects, colors, photographic style, no text, and widescreen style.)
- text_overlay (string, 3-6 words of bold subtitle/caption to overlay on screen.)
- duration (float, estimated duration in seconds. Calculate as: word count / 2.5, minimum 3.5 seconds.)

Produce the raw JSON output matching this schema."""

        script_data = None
        async with httpx.AsyncClient(timeout=45.0) as client:
            # Agent 1 Draft
            openai_headers = {
                "Content-Type": "application/json",
                "Authorization": f"Bearer {config.OPENAI_API_KEY}"
            }
            draft_res = await client.post(
                "https://api.openai.com/v1/chat/completions",
                headers=openai_headers,
                json={
                    "model": "gpt-4o",
                    "messages": [
                        {"role": "system", "content": "You are an expert short-form video copywriter and storyboard artist. You MUST output valid JSON only."},
                        {"role": "user", "content": prompt}
                    ],
                    "temperature": 0.7,
                    "response_format": {"type": "json_object"}
                }
            )
            
            if not draft_res.is_success:
                raise Exception(f"OpenAI Draft Generation failed: {draft_res.text}")
                
            draft_script = json.loads(draft_res.json()["choices"][0]["message"]["content"])
            
            # Agent 2 Reviewer Refinement
            review_prompt = f"""You are a Senior Creative Director. Review the draft storyboard JSON and refine it for final production.
Draft Storyboard:
{json.dumps(draft_script, indent=2)}

Original Guidelines:
- Platform: {platform}
- Target Audience: {audience}
- Voice & Tone: {tone}
{f"- Custom Styling & Content Instructions: {custom_instructions}" if custom_instructions else ""}

Requirements for refinement:
1. Verify scene durations. If a scene has too many words for its duration (pacing should be ~2.5 words per second), increase the duration to ensure comfortable voiceover pacing.
2. Polish the text overlays. Make sure they are high-impact, punchy callouts.
3. Enhance image prompts to make them highly descriptive, photorealistic, visually cohesive, and set in a 16:9 widescreen format suitable for a video clip generation model.
4. Output the final refined storyboard in the identical JSON schema with the root key "scenes"."""

            final_res = await client.post(
                "https://api.openai.com/v1/chat/completions",
                headers=openai_headers,
                json={
                    "model": "gpt-4o",
                    "messages": [
                        {"role": "system", "content": "You are a perfectionist video director. Review storyboard scripts and enforce strict timing, visual quality, and cohesive branding. You MUST output valid JSON only."},
                        {"role": "user", "content": review_prompt}
                    ],
                    "temperature": 0.4,
                    "response_format": {"type": "json_object"}
                }
            )
            
            if not final_res.is_success:
                raise Exception(f"OpenAI Script Refinement failed: {final_res.text}")
                
            script_data = json.loads(final_res.json()["choices"][0]["message"]["content"])
            
        # Update db state to generating_assets
        sql("UPDATE videos SET script = $1, status = 'generating_assets', updated_at = NOW() WHERE id = $2", [script_data, video_id])
        
        # ─── ASSET CAPTURE STAGE (VOICE & IMAGES) ────────────────────────────────
        final_scenes = []
        for idx, scene in enumerate(script_data.get("scenes", [])):
            audio_file_name = f"scene_{idx + 1}.mp3"
            audio_path = public_dir / audio_file_name
            
            # A. TTS Voiceover Generation
            await generate_elevenlabs_tts(scene["voiceover_text"], str(audio_path))
            audio_url = f"/videos/{video_id}/{audio_file_name}"
            
            # B. Visual clip via Gemini Veo
            visual_file_name = f"scene_{idx + 1}.mp4"
            visual_path = public_dir / visual_file_name
            
            video_duration = max(3, min(8, round(scene.get("duration", 5))))
            video_bytes = await generate_veo_video(scene["image_prompt"], "16:9", video_duration)
            with open(visual_path, "wb") as f:
                f.write(video_bytes)
            visual_url = f"/videos/{video_id}/{visual_file_name}"
            
            final_scenes.append({
                **scene,
                "text": scene["text_overlay"],
                "image_path": str(visual_path),
                "audio_path": str(audio_path),
                "image_url": visual_url,
                "audio_url": audio_url
            })
            
        final_storyboard = {"scenes": final_scenes}
        storyboard_json_path = public_dir / "storyboard.json"
        with open(storyboard_json_path, "w", encoding="utf-8") as f:
            json.dump(final_storyboard, f, indent=2)
            
        sql("UPDATE videos SET script = $1, status = 'assembling', updated_at = NOW() WHERE id = $2", [final_storyboard, video_id])
        
        # ─── ASSEMBLY STAGE ──────────────────────────────────────────────────────
        print("Starting native video assembly compilation...")
        video_out_path = public_dir / "output.mp4"
        
        assembly_success = False
        error_msg = None
        is_mock = False
        
        try:
            # Call assemble_video directly!
            # Since psycopg will run in the main application, running moviepy directly runs in python.
            # Running this inside a subprocess or thread works perfectly. We call the imported function directly.
            loop = asyncio.get_running_loop()
            assembly_success = await loop.run_in_executor(
                None, 
                assemble_video, 
                str(storyboard_json_path), 
                str(video_out_path)
            )
            if not assembly_success:
                error_msg = "Video compile script failed to complete successfully."
        except Exception as e:
            print(f"Assembly compilation failed: {e}")
            error_msg = str(e)
            is_mock = True
            
        # ─── WRAP UP ─────────────────────────────────────────────────────────────
        final_video_url = None
        final_status = "failed"
        
        if assembly_success:
            final_video_url = f"/videos/{video_id}/output.mp4"
            final_status = "completed"
            is_mock = False
            print(f"Video task {video_id} completed successfully!")
        else:
            final_status = "completed"
            is_mock = True
            print(f"Video task {video_id} completed with interactive slideshow preview fallback.")
            
        sql("""
            UPDATE videos 
            SET 
              status = $1,
              video_url = $2,
              metadata = $3::jsonb,
              updated_at = NOW()
            WHERE id = $4
        """, [final_status, final_video_url, {"is_mock": is_mock, "error": error_msg, "assembly_tried": True}, video_id])
        
    except Exception as e:
        print(f"Critical error in video generation background task: {e}")
        traceback_details = traceback.format_exc()
        print(traceback_details)
        try:
            sql("UPDATE videos SET status = 'failed', metadata = $1::jsonb, updated_at = NOW() WHERE id = $2", [dict(error=str(e)), video_id])
        except Exception as db_err:
            print(f"Failed to save failed status to DB: {db_err}")

@router.post("/create")
def create_video(data: VideoCreateRequest, background_tasks: BackgroundTasks):
    if not data.businessId or not data.topic:
        raise HTTPException(status_code=400, detail="businessId and topic are required")
        
    video_title = data.title or f"Video on {data.topic[:40]}..."
    
    # Insert new video task
    insert_query = """
        INSERT INTO videos (business_id, title, topic, status, script, metadata)
        VALUES ($1, $2, $3, 'pending', '{}'::jsonb, $4::jsonb)
        RETURNING *
    """
    metadata = {
        "platform": data.platform,
        "audience": data.audience,
        "tone": data.tone,
        "customInstructions": data.customInstructions
    }
    
    try:
        result = sql(insert_query, [data.businessId, video_title, data.topic, metadata])
        if not result:
            raise HTTPException(status_code=500, detail="Database write failed")
            
        video = result[0]
        
        # Trigger background task
        background_tasks.add_task(background_generate_video, video["id"])
        
        return {"video": video}
    except Exception as e:
        print(f"Error creating video: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to create video task: {str(e)}")

@router.post("/generate")
def generate_video(data: VideoGenerateRequest, background_tasks: BackgroundTasks):
    if not data.videoId:
        raise HTTPException(status_code=400, detail="videoId is required")
        
    # Trigger background task
    background_tasks.add_task(background_generate_video, data.videoId)
    return {"success": True}

@router.post("/regenerate")
def regenerate_video(data: VideoRegenerateRequest, background_tasks: BackgroundTasks):
    if not data.videoId:
        raise HTTPException(status_code=400, detail="videoId is required")
        
    # Verify it exists
    video_check = sql("SELECT * FROM videos WHERE id = $1", [data.videoId])
    if not video_check:
        raise HTTPException(status_code=404, detail="Video not found")
        
    # Reset DB record
    reset_query = """
        UPDATE videos
        SET
          status = 'pending',
          script = '{}'::jsonb,
          video_url = NULL,
          metadata = $1::jsonb,
          updated_at = NOW()
        WHERE id = $2
    """
    metadata = {
        "platform": data.platform,
        "audience": data.audience,
        "tone": data.tone,
        "customInstructions": data.customInstructions
    }
    
    try:
        sql(reset_query, [metadata, data.videoId])
        
        # Trigger background task
        background_tasks.add_task(background_generate_video, data.videoId)
        return {"success": True}
    except Exception as e:
        print(f"Error regenerating video: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to regenerate video: {str(e)}")

@router.get("/list")
def list_videos(businessId: int = Query(..., description="businessId is required")):
    if not businessId:
        raise HTTPException(status_code=400, detail="businessId is required")
        
    try:
        videos = sql("SELECT * FROM videos WHERE business_id = $1 ORDER BY created_at DESC", [businessId])
        return {"videos": videos}
    except Exception as e:
        print(f"Error listing videos: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to list videos: {str(e)}")

@router.delete("/delete")
def delete_video(id: int = Query(..., description="id is required")):
    if not id:
        raise HTTPException(status_code=400, detail="id is required")
        
    try:
        sql("DELETE FROM videos WHERE id = $1", [id])
        return {"success": True}
    except Exception as e:
        print(f"Error deleting video: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to delete video: {str(e)}")
