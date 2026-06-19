import json
import httpx
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Optional
from apps.backend import config
from apps.backend.database import sql

router = APIRouter(prefix="/api/brand", tags=["brand"])

class BrandGenerateRequest(BaseModel):
    businessId: int

class LogoUploadRequest(BaseModel):
    businessId: int
    logoUrl: str

@router.post("/generate")
async def generate_brand_kit(data: BrandGenerateRequest):
    if not data.businessId:
        raise HTTPException(status_code=400, detail="businessId is required")
        
    # Get business context
    business_result = sql("SELECT * FROM businesses WHERE id = $1", [data.businessId])
    if not business_result:
        raise HTTPException(status_code=404, detail="Business not found")
        
    business = business_result[0]
    context = business.get("business_context") or {}
    
    # Get existing brand kit colors and typography if they exist
    existing_kit_result = sql("SELECT color_palette, typography FROM brand_kits WHERE business_id = $1", [data.businessId])
    existing_kit = existing_kit_result[0] if existing_kit_result else None
    
    # Format prompts
    prompt_text = f"""Create a complete brand kit for this business:

Business: {business.get('name')}
Industry: {business.get('industry')}
Target Audience: {business.get('target_audience')}
Value Proposition: {business.get('value_proposition')}
Website-Extracted Brand Colors: {json.dumps(context.get('brand_colors')) if context.get('brand_colors') else "None"}
Website-Extracted Typography: {json.dumps(context.get('typography')) if context.get('typography') else "None"}
Existing Brand Kit Colors: {json.dumps(existing_kit.get('color_palette')) if existing_kit and existing_kit.get('color_palette') else "None"}
Existing Typography: {json.dumps(existing_kit.get('typography')) if existing_kit and existing_kit.get('typography') else "None"}

Generate:
1. Brand Voice (personality, tone descriptors)
2. Brand Story (compelling narrative)
3. Messaging Pillars (3-5 core themes, array)
4. Color Palette (primary, secondary, and accent colors. If 'Website-Extracted Brand Colors' is not 'None', you MUST use those exact hex codes as the colors. If 'Website-Extracted Brand Colors' is 'None' but 'Existing Brand Kit Colors' is not 'None', reuse those exact colors. Otherwise, generate appropriate colors. For each color, provide an object with 'hex' and 'name' keys.)
5. Typography (font recommendations for headings and body. If 'Website-Extracted Typography' is not 'None', you MUST use those exact fonts. If 'Website-Extracted Typography' is 'None' but 'Existing Typography' is not 'None', you MUST reuse those exact fonts. Otherwise, generate appropriate modern fonts. Provide an object with 'heading' and 'body' keys.)
6. Elevator Pitch (30-second pitch)
7. Taglines (3-5 options, array)
8. Tone Guidelines (do's and don'ts)

Respond in JSON with keys: brand_voice, brand_story, messaging_pillars, color_palette, typography, elevator_pitch, taglines, tone_guidelines"""

    brand_kit = {}
    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            openai_headers = {
                "Content-Type": "application/json",
                "Authorization": f"Bearer {config.OPENAI_API_KEY}"
            }
            openai_body = {
                "model": "gpt-4o",
                "messages": [
                    {
                        "role": "system",
                        "content": "You are a brand strategist and creative director. Create comprehensive brand guidelines. You MUST output valid JSON only."
                    },
                    {
                        "role": "user",
                        "content": prompt_text
                    }
                ],
                "temperature": 0.4,
                "response_format": {"type": "json_object"}
            }
            openai_response = await client.post(
                "https://api.openai.com/v1/chat/completions",
                headers=openai_headers,
                json=openai_body
            )
            
            if openai_response.is_success:
                openai_data = openai_response.json()
                raw_content = openai_data["choices"][0]["message"]["content"]
                brand_kit = json.loads(raw_content)
            else:
                raise HTTPException(status_code=500, detail=f"OpenAI API returned error: {openai_response.text}")
        except Exception as e:
            print(f"Error calling OpenAI API: {e}")
            raise HTTPException(status_code=500, detail=f"Brand kit generation failed: {str(e)}")

    # Check if brand kit exists to decide between INSERT and UPDATE
    existing_kit_check = sql("SELECT id FROM brand_kits WHERE business_id = $1", [data.businessId])
    
    try:
        if existing_kit_check:
            # Update existing brand kit
            update_query = """
                UPDATE brand_kits
                SET
                  brand_voice = $1,
                  brand_story = $2,
                  messaging_pillars = $3,
                  color_palette = $4,
                  typography = $5,
                  elevator_pitch = $6,
                  taglines = $7,
                  tone_guidelines = $8,
                  updated_at = NOW()
                WHERE business_id = $9
                RETURNING *
            """
            result = sql(
                update_query,
                [
                    brand_kit.get("brand_voice"),
                    brand_kit.get("brand_story"),
                    brand_kit.get("messaging_pillars", []),
                    brand_kit.get("color_palette"),
                    brand_kit.get("typography"),
                    brand_kit.get("elevator_pitch"),
                    brand_kit.get("taglines", []),
                    brand_kit.get("tone_guidelines"),
                    data.businessId
                ]
            )
        else:
            # Insert new brand kit
            insert_query = """
                INSERT INTO brand_kits (
                  business_id, brand_voice, brand_story, messaging_pillars,
                  color_palette, typography, elevator_pitch, taglines, tone_guidelines
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                RETURNING *
            """
            result = sql(
                insert_query,
                [
                    data.businessId,
                    brand_kit.get("brand_voice"),
                    brand_kit.get("brand_story"),
                    brand_kit.get("messaging_pillars", []),
                    brand_kit.get("color_palette"),
                    brand_kit.get("typography"),
                    brand_kit.get("elevator_pitch"),
                    brand_kit.get("taglines", []),
                    brand_kit.get("tone_guidelines")
                ]
            )
            
        if not result:
            raise HTTPException(status_code=500, detail="Database write failed")
        return {"brandKit": result[0]}
    except Exception as e:
        print(f"Error saving brand kit: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to save brand kit: {str(e)}")

@router.get("/get")
def get_brand_kit(businessId: int = Query(..., description="businessId is required")):
    if not businessId:
        raise HTTPException(status_code=400, detail="businessId is required")
        
    result = sql("SELECT * FROM brand_kits WHERE business_id = $1", [businessId])
    if not result:
        raise HTTPException(status_code=404, detail="Brand kit not found")
        
    return {"brandKit": result[0]}

@router.delete("/delete")
def delete_brand_kit(businessId: int = Query(..., description="businessId is required")):
    if not businessId:
        raise HTTPException(status_code=400, detail="businessId is required")
        
    try:
        sql("DELETE FROM brand_kits WHERE business_id = $1", [businessId])
        return {"success": True}
    except Exception as e:
        print(f"Error deleting brand kit: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to delete brand kit: {str(e)}")

@router.post("/upload-logo")
def upload_logo(data: LogoUploadRequest):
    if not data.businessId or not data.logoUrl:
        raise HTTPException(status_code=400, detail="businessId and logoUrl are required")
        
    # Verify business exists
    business_check = sql("SELECT id FROM businesses WHERE id = $1", [data.businessId])
    if not business_check:
        raise HTTPException(status_code=404, detail="Business workspace not found")
        
    # Check if brand kit exists
    existing_kit = sql("SELECT id FROM brand_kits WHERE business_id = $1", [data.businessId])
    
    try:
        if existing_kit:
            update_query = """
                UPDATE brand_kits
                SET logo_url = $1, updated_at = NOW()
                WHERE business_id = $2
                RETURNING *
            """
            result = sql(update_query, [data.logoUrl, data.businessId])
        else:
            insert_query = """
                INSERT INTO brand_kits (business_id, logo_url)
                VALUES ($1, $2)
                RETURNING *
            """
            result = sql(insert_query, [data.businessId, data.logoUrl])
            
        if not result:
            raise HTTPException(status_code=500, detail="Failed to save logo")
        return {"success": True, "brandKit": result[0]}
    except Exception as e:
        print(f"Error saving logo: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to save logo: {str(e)}")
