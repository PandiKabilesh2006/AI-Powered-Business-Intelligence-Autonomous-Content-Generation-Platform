import os
import json
import httpx
import base64
import asyncio
import tempfile
import numpy as np
from PIL import Image, ImageDraw, ImageFont
from moviepy import ImageClip
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Optional
from apps.backend import config
from apps.backend.database import sql

router = APIRouter(prefix="/api/creatives", tags=["creatives"])

class CreativeGenerateRequest(BaseModel):
    businessId: int
    creativeType: str
    format: Optional[str] = "square"
    description: Optional[str] = None
    platform: Optional[str] = "General"
    audience: Optional[str] = None
    tone: Optional[str] = None
    customInstructions: Optional[str] = None
    creativeId: Optional[int] = None

def normalize_color(color_val) -> str:
    """Helper to extract a hex color string from different formats."""
    if not color_val:
        return ""
    if isinstance(color_val, str):
        return color_val
    if isinstance(color_val, dict):
        if "hex" in color_val:
            return str(color_val["hex"])
        if "r" in color_val and "g" in color_val and "b" in color_val:
            try:
                return f"#{int(color_val['r']):02x}{int(color_val['g']):02x}{int(color_val['b']):02x}"
            except:
                pass
    return ""

def get_brand_colors(color_palette):
    """Robust helper to extract primary and secondary hex colors."""
    primary = "#2563EB"
    secondary = "#10B981"
    
    if not color_palette:
        return primary, secondary

    if isinstance(color_palette, list):
        if len(color_palette) > 0:
            p = normalize_color(color_palette[0])
            if p: primary = p
        if len(color_palette) > 1:
            s = normalize_color(color_palette[1])
            if s: secondary = s
    elif isinstance(color_palette, dict):
        p_val = color_palette.get("primary")
        s_val = color_palette.get("secondary")
        
        p = normalize_color(p_val)
        if p:
            primary = p
        elif isinstance(p_val, str):
            primary = p_val
            
        s = normalize_color(s_val)
        if s:
            secondary = s
        elif isinstance(s_val, str):
            secondary = s_val
            
    return primary, secondary

def parse_prompt_context(prompt: str):
    business_name = "Brand Creative"
    colors = {"primary": "#2563EB", "secondary": "#10B981"}
    
    # Look for "Business: <Name>"
    for line in prompt.split("\n"):
        line = line.strip()
        if line.startswith("Business:"):
            business_name = line.replace("Business:", "").strip()
        elif line.startswith("Brand Colors:"):
            try:
                colors_str = line.replace("Brand Colors:", "").strip()
                parsed = json.loads(colors_str)
                if isinstance(parsed, dict):
                    colors = parsed
            except:
                pass
    return business_name, colors

def hex_to_rgb(hex_str, default=(37, 99, 235)):
    if not isinstance(hex_str, str):
        hex_str = normalize_color(hex_str)
    if not hex_str:
        return default
    hex_str = hex_str.lstrip('#')
    try:
        if len(hex_str) == 6:
            return tuple(int(hex_str[i:i+2], 16) for i in (0, 2, 4))
        elif len(hex_str) == 3:
            return tuple(int(hex_str[i]*2, 16) for i in (0, 1, 2))
    except:
        pass
    return default

def generate_premium_fallback_video(prompt: str, aspect_ratio: str, duration_seconds: int) -> bytes:
    # 1. Parse prompt
    business_name, colors = parse_prompt_context(prompt)
    primary_hex = colors.get("primary", "#2563EB")
    secondary_hex = colors.get("secondary", "#10B981")
    
    c1 = hex_to_rgb(primary_hex, (37, 99, 235))
    c2 = hex_to_rgb(secondary_hex, (16, 185, 129))
    
    # 2. Dimensions
    w, h = 800, 800
    if aspect_ratio == "16:9":
        w, h = 1280, 720
    elif aspect_ratio == "9:16":
        w, h = 720, 1280
        
    print(f"[Fallback] Creating fallback creative for '{business_name}' with size ({w}x{h})...")
    
    # 3. Base Image with diagonal gradient
    base = Image.new("RGBA", (w, h))
    draw = ImageDraw.Draw(base)
    
    for y in range(h):
        ratio = y / h
        r = int(c1[0] + (c2[0] - c1[0]) * ratio)
        g = int(c1[1] + (c2[1] - c1[1]) * ratio)
        b = int(c1[2] + (c2[2] - c1[2]) * ratio)
        draw.line([(0, y), (w, y)], fill=(r, g, b, 255))
        
    # 4. Overlapping abstract shapes
    overlay = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    ol_draw = ImageDraw.Draw(overlay)
    
    # Top-right light circle
    ol_draw.ellipse([(w - h//2, -h//4), (w + h//2, h//2)], fill=(255, 255, 255, 25))
    # Bottom-left dark circle
    ol_draw.ellipse([(-w//4, h - h//2), (w//2, h + h//4)], fill=(0, 0, 0, 20))
    
    base = Image.alpha_composite(base, overlay)
    
    # 5. Glassmorphic card
    card = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    card_draw = ImageDraw.Draw(card)
    
    cw, ch = int(w * 0.8), int(h * 0.45)
    cx1, cy1 = (w - cw) // 2, (h - ch) // 2
    cx2, cy2 = cx1 + cw, cy1 + ch
    
    card_draw.rounded_rectangle([cx1, cy1, cx2, cy2], radius=24, fill=(255, 255, 255, 40))
    card_draw.rounded_rectangle([cx1, cy1, cx2, cy2], radius=24, outline=(255, 255, 255, 80), width=2)
    
    # 6. Load premium fonts
    font_title = None
    font_desc = None
    for font_name in ["arial.ttf", "LiberationSans-Bold.ttf", "Helvetica-Bold.ttf", "msyh.ttc"]:
        try:
            font_title = ImageFont.truetype(font_name, int(ch * 0.18))
            font_desc = ImageFont.truetype(font_name, int(ch * 0.08))
            break
        except IOError:
            continue
            
    if not font_title:
        font_title = ImageFont.load_default()
        font_desc = ImageFont.load_default()
        
    # Draw Business Name
    title_y = cy1 + int(ch * 0.2)
    try:
        title_bbox = font_title.getbbox(business_name)
        title_w = title_bbox[2] - title_bbox[0]
    except AttributeError:
        title_w, _ = font_title.getsize(business_name)
    title_x = cx1 + (cw - title_w) // 2
    card_draw.text((title_x, title_y), business_name, fill=(255, 255, 255, 255), font=font_title)
    
    # Draw Description placeholder or prompt preview
    desc_text = "GENERATE CREATIVE"
    if "Create a professional" in prompt:
        parts = prompt.split("\n")
        if len(parts) > 0:
            desc_text = parts[0].strip()
    else:
        desc_text = prompt[:60] + "..." if len(prompt) > 60 else prompt
        
    desc_y = title_y + int(ch * 0.3)
    try:
        desc_bbox = font_desc.getbbox(desc_text)
        desc_w = desc_bbox[2] - desc_bbox[0]
    except AttributeError:
        desc_w, _ = font_desc.getsize(desc_text)
    desc_x = cx1 + (cw - desc_w) // 2
    card_draw.text((desc_x, desc_y), desc_text, fill=(255, 255, 255, 220), font=font_desc)
    
    # Draw brand watermark
    watermark = "ContentOS Studio"
    watermark_y = cy2 - int(ch * 0.15)
    try:
        wm_bbox = font_desc.getbbox(watermark)
        wm_w = wm_bbox[2] - wm_bbox[0]
    except AttributeError:
        wm_w, _ = font_desc.getsize(watermark)
    wm_x = cx1 + (cw - wm_w) // 2
    card_draw.text((wm_x, watermark_y), watermark, fill=(255, 255, 255, 150), font=font_desc)
    
    base = Image.alpha_composite(base, card)
    final_img = base.convert("RGB")
    
    # 7. Create MoviePy Video
    img_array = np.array(final_img)
    clip = ImageClip(img_array, duration=duration_seconds)
    
    with tempfile.NamedTemporaryFile(suffix=".mp4", delete=False) as f:
        temp_name = f.name
        
    try:
        clip.write_videofile(
            temp_name,
            fps=24,
            codec="libx264",
            audio=False,
            logger=None
        )
        with open(temp_name, "rb") as f:
            video_bytes = f.read()
    finally:
        try:
            os.remove(temp_name)
        except:
            pass
            
    return video_bytes

async def generate_veo_video(prompt: str, aspect_ratio: str, duration_seconds: int) -> bytes:
    try:
        if not config.GEMINI_API_KEY:
            raise ValueError("GEMINI_API_KEY is not defined in environment.")
            
        veo_model = "veo-3.0-fast-generate-001"
        print(f"Initiating Veo video generation for model {veo_model}...")
        veo_url = f"https://generativelanguage.googleapis.com/v1beta/models/{veo_model}:predictLongRunning?key={config.GEMINI_API_KEY}"
        
        async with httpx.AsyncClient(timeout=60.0) as client:
            # Start long running operation
            response = await client.post(
                veo_url,
                headers={"Content-Type": "application/json"},
                json={
                    "instances": [{"prompt": prompt}],
                    "parameters": {
                        "aspectRatio": aspect_ratio,
                        "durationSeconds": duration_seconds
                    }
                }
            )
            
            if not response.is_success:
                raise Exception(f"Veo API returned status {response.status_code}: {response.text}")
                
            init_data = response.json()
            operation_name = init_data.get("name")
            if not operation_name:
                raise Exception("No operation name returned from Veo API.")
                
            print(f"Veo operation started: {operation_name}. Polling for completion...")
            
            done = False
            op_data = None
            attempts = 0
            max_attempts = 60
            
            while not done and attempts < max_attempts:
                await asyncio.sleep(5.0)
                attempts += 1
                
                poll_url = f"https://generativelanguage.googleapis.com/v1beta/{operation_name}?key={config.GEMINI_API_KEY}"
                poll_res = await client.get(poll_url)
                
                if poll_res.is_success:
                    op_data = poll_res.json()
                    if op_data.get("done"):
                        done = True
                    else:
                        print(f"Veo operation {operation_name} in progress (attempt {attempts}/{max_attempts})...")
                else:
                    print(f"Veo polling failed on attempt {attempts}: {poll_res.text}")
                    
            if not done:
                raise Exception("Veo video generation timed out after 5 minutes.")
                
            if op_data.get("error"):
                error_details = op_data["error"]
                raise Exception(f"Veo generation failed: {error_details.get('message', json.dumps(error_details))}")
                
            samples = op_data.get("response", {}).get("generateVideoResponse", {}).get("generatedSamples", [])
            if not samples or not samples[0].get("video", {}).get("uri"):
                raise Exception(f"Veo response is missing video uri: {json.dumps(op_data.get('response'))}")
                
            download_uri = samples[0]["video"]["uri"]
            print(f"Veo video generation complete! Downloading clip from: {download_uri}")
            
            download_url = f"{download_uri}&key={config.GEMINI_API_KEY}"
            download_res = await client.get(download_url)
            if not download_res.is_success:
                raise Exception(f"Failed to download Veo video clip: status {download_res.status_code}")
                
            return download_res.content
    except Exception as e:
        print(f"Error in generate_veo_video: {e}. Generating premium fallback video visual asset instead...")
        return generate_premium_fallback_video(prompt, aspect_ratio, duration_seconds)

@router.post("/generate")
async def generate_creative(data: CreativeGenerateRequest):
    if not data.businessId or not data.creativeType:
        raise HTTPException(status_code=400, detail="businessId and creativeType are required")
        
    if not config.GEMINI_API_KEY:
        raise HTTPException(
            status_code=400, 
            detail="GEMINI_API_KEY is not defined in the environment. Please add it to your .env file."
        )
        
    business_result = sql("""
        SELECT b.*, bk.color_palette, bk.brand_voice
        FROM businesses b
        LEFT JOIN brand_kits bk ON b.id = bk.business_id
        WHERE b.id = $1
    """, [data.businessId])
    
    if not business_result:
        raise HTTPException(status_code=404, detail="Business not found")
        
    business = business_result[0]
    primary_hex, secondary_hex = get_brand_colors(business.get("color_palette"))
    colors = {
        "primary": primary_hex,
        "secondary": secondary_hex
    }
    
    format_specs = {
        "square": "1:1 aspect ratio, Instagram post format",
        "portrait": "9:16 aspect ratio, Instagram story/mobile format",
        "landscape": "16:9 aspect ratio, Facebook/LinkedIn banner format",
    }
    
    prompt = f"""Create a professional {data.creativeType} for {business.get('name')}. 
Business: {business.get('name')}
Industry: {business.get('industry')}
Brand Colors: {json.dumps(colors)}
Format: {format_specs.get(data.format, "square format")}
{f"Description: {data.description}" if data.description else ""}

Creative Guidelines:
- Platform: {data.platform or "General"}
- Target Audience: {data.audience or business.get('target_audience') or "General Audience"}
- Voice & Tone: {data.tone or business.get('brand_voice') or "Professional"}
{f"- Custom Instructions & Styling: {data.customInstructions}" if data.customInstructions else ""}

Style: Modern, clean, professional brand-aware design.
Include: Business name, visual elements that represent the brand identity."""

    try:
        aspect_ratio = "1:1"
        if data.format == "portrait":
            aspect_ratio = "9:16"
        elif data.format == "landscape":
            aspect_ratio = "16:9"
            
        # Call Veo Video generation (5 seconds clip)
        video_bytes = await generate_veo_video(prompt, aspect_ratio, 5)
        
        # Base64 encode the video
        base64_video = base64.b64encode(video_bytes).decode("utf-8")
        image_url = f"data:video/mp4;base64,{base64_video}"
        
        metadata = {
            "colors": colors,
            "apiResponse": {"provider": "gemini-veo"},
            "provider": "gemini-veo",
            "platform": data.platform,
            "audience": data.audience,
            "tone": data.tone,
            "customInstructions": data.customInstructions
        }
        
        # Save to database
        if data.creativeId:
            update_query = """
                UPDATE creatives
                SET
                  image_url = $1,
                  prompt = $2,
                  metadata = $3::jsonb,
                  updated_at = NOW()
                WHERE id = $4
                RETURNING *
            """
            result = sql(update_query, [image_url, prompt, metadata, data.creativeId])
        else:
            insert_query = """
                INSERT INTO creatives (
                  business_id, creative_type, format, image_url, prompt, metadata
                )
                VALUES ($1, $2, $3, $4, $5, $6::jsonb)
                RETURNING *
            """
            result = sql(
                insert_query, 
                [data.businessId, data.creativeType, data.format or "square", image_url, prompt, metadata]
            )
            
        if not result:
            raise HTTPException(status_code=500, detail="Failed to save creative to DB")
            
        return {"creative": result[0]}
    except Exception as e:
        print(f"Error generating creative: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to generate creative: {str(e)}")

@router.get("/list")
def list_creatives(businessId: int = Query(..., description="businessId is required")):
    if not businessId:
        raise HTTPException(status_code=400, detail="businessId is required")
        
    try:
        creatives = sql("SELECT * FROM creatives WHERE business_id = $1 ORDER BY created_at DESC", [businessId])
        return {"creatives": creatives}
    except Exception as e:
        print(f"Error listing creatives: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to list creatives: {str(e)}")

@router.delete("/delete")
def delete_creative(id: int = Query(..., description="id is required")):
    if not id:
        raise HTTPException(status_code=400, detail="id is required")
        
    try:
        sql("DELETE FROM creatives WHERE id = $1", [id])
        return {"success": True}
    except Exception as e:
        print(f"Error deleting creative: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to delete creative: {str(e)}")
