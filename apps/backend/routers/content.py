import json
import httpx
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Optional
from apps.backend import config
from apps.backend.database import sql

router = APIRouter(prefix="/api/content", tags=["content"])

class ContentGenerateRequest(BaseModel):
    businessId: int
    contentType: str
    topic: Optional[str] = None
    additionalContext: Optional[str] = None
    customInstructions: Optional[str] = None

@router.post("/generate")
async def generate_content(data: ContentGenerateRequest):
    if not data.businessId or not data.contentType:
        raise HTTPException(status_code=400, detail="businessId and contentType are required")
        
    instructions = data.customInstructions or data.additionalContext
    
    business_result = sql("""
        SELECT b.*, bk.brand_voice, bk.tone_guidelines, bk.messaging_pillars
        FROM businesses b
        LEFT JOIN brand_kits bk ON b.id = bk.business_id
        WHERE b.id = $1
    """, [data.businessId])
    
    if not business_result:
        raise HTTPException(status_code=404, detail="Business not found")
        
    business = business_result[0]
    
    # Extract messaging pillars (handle cases where it is a JSON string or raw python collection)
    raw_pillars = business.get("messaging_pillars")
    pillars_str = "Innovation, Quality, Trust"
    if raw_pillars:
        try:
            if isinstance(raw_pillars, str):
                pillars_list = json.loads(raw_pillars)
            else:
                pillars_list = raw_pillars
            if isinstance(pillars_list, list):
                pillars_str = ", ".join(pillars_list)
        except Exception:
            pass
            
    # Content type templates
    content_prompts = {
        "linkedin": "Create an engaging LinkedIn post (max 1300 chars) with professional insights and a clear call-to-action.",
        "blog": "Write a comprehensive blog article (800-1200 words) with SEO-optimized headings, introduction, body sections, and conclusion.",
        "email": "Compose a marketing email with subject line, preview text, engaging body, and clear CTA.",
        "twitter": "Create 3 engaging tweet variations (max 280 chars each) with hashtags.",
        "instagram": "Write an Instagram caption with emojis, storytelling, and relevant hashtags.",
        "facebook": "Create a Facebook post optimized for engagement with conversational tone.",
        "seo_article": "Write an SEO-optimized article (1500-2000 words) with H2/H3 headings, keyword integration, and meta description."
    }
    
    prompt = content_prompts.get(data.contentType, "Create engaging content for this business.")
    
    system_instruction = f"""You are a content creator writing for {business.get('name')}. 
Brand Voice: {business.get('brand_voice') or "Professional and engaging"}
Tone: {business.get('tone_guidelines') or "Clear, authentic, and value-driven"}
Target Audience: {business.get('target_audience') or "General Audience"}
Messaging Pillars: {pillars_str}
You MUST output valid JSON only."""

    prompt_text = f"""{prompt}

Business: {business.get('name')}
Industry: {business.get('industry')}
Value Proposition: {business.get('value_proposition')}
{f"Topic: {data.topic}" if data.topic else ""}
{f"Custom Instructions / Additional Context: {instructions}" if instructions else ""}

Respond in JSON format with keys: title (if applicable), content, metadata (any additional info like hashtags, subject line, etc.)"""

    generated_content = {}
    async with httpx.AsyncClient(timeout=45.0) as client:
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
                        "content": system_instruction
                    },
                    {
                        "role": "user",
                        "content": prompt_text
                    }
                ],
                "temperature": 0.5,
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
                generated_content = json.loads(raw_content)
            else:
                raise HTTPException(status_code=500, detail=f"OpenAI API returned error: {openai_response.text}")
        except Exception as e:
            print(f"Error calling OpenAI API: {e}")
            raise HTTPException(status_code=500, detail=f"Content generation failed: {str(e)}")

    # Save generated content to database
    insert_query = """
        INSERT INTO content_pieces (business_id, content_type, title, content, metadata)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
    """
    
    try:
        result = sql(
            insert_query,
            [
                data.businessId,
                data.contentType,
                generated_content.get("title"),
                generated_content.get("content"),
                generated_content.get("metadata", {})
            ]
        )
        if not result:
            raise HTTPException(status_code=500, detail="Database insert failed")
        return {"content": result[0]}
    except Exception as e:
        print(f"Error saving content: {e}")
        raise HTTPException(status_code=500, detail=f"Database write failed: {str(e)}")

@router.get("/list")
def list_content(businessId: int = Query(..., description="businessId is required"), contentType: Optional[str] = None):
    if not businessId:
        raise HTTPException(status_code=400, detail="businessId is required")
        
    try:
        if contentType:
            query = """
                SELECT * FROM content_pieces
                WHERE business_id = $1 AND content_type = $2
                ORDER BY created_at DESC
            """
            content = sql(query, [businessId, contentType])
        else:
            query = """
                SELECT * FROM content_pieces
                WHERE business_id = $1
                ORDER BY created_at DESC
            """
            content = sql(query, [businessId])
        return {"content": content}
    except Exception as e:
        print(f"Error listing content: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to list content: {str(e)}")

@router.delete("/delete")
def delete_content(id: int = Query(..., description="id is required")):
    if not id:
        raise HTTPException(status_code=400, detail="id is required")
        
    try:
        sql("DELETE FROM content_pieces WHERE id = $1", [id])
        return {"success": True}
    except Exception as e:
        print(f"Error deleting content piece: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to delete content: {str(e)}")
