import json
import httpx
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Optional
from apps.backend import config
from apps.backend.database import sql

router = APIRouter(prefix="/api/campaigns", tags=["campaigns"])

class CampaignGenerateRequest(BaseModel):
    businessId: int
    campaignType: str
    objective: Optional[str] = None

@router.post("/generate")
async def generate_campaign(data: CampaignGenerateRequest):
    if not data.businessId or not data.campaignType:
        raise HTTPException(status_code=400, detail="businessId and campaignType are required")
        
    business_result = sql("""
        SELECT b.*, bk.brand_voice, bk.messaging_pillars
        FROM businesses b
        LEFT JOIN brand_kits bk ON b.id = bk.business_id
        WHERE b.id = $1
    """, [data.businessId])
    
    if not business_result:
        raise HTTPException(status_code=404, detail="Business not found")
        
    business = business_result[0]
    
    # Format messaging pillars
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
            
    campaign_descriptions = {
        "launch": "Product/service launch campaign with pre-launch, launch day, and post-launch phases",
        "lead_gen": "Lead generation campaign focused on capturing qualified prospects",
        "awareness": "Brand awareness campaign to increase visibility and recognition",
        "seasonal": "Seasonal campaign tied to holidays, events, or seasonal trends",
        "competitor": "Competitive takeaway campaign highlighting advantages over competitors",
    }
    
    desc = campaign_descriptions.get(data.campaignType, "A strategic marketing campaign")
    
    prompt_text = f"""Create a comprehensive {data.campaignType} campaign for this business:

Business: {business.get('name')}
Industry: {business.get('industry')}
Target Audience: {business.get('target_audience')}
Value Proposition: {business.get('value_proposition')}
Brand Voice: {business.get('brand_voice')}
Messaging Pillars: {pillars_str}
{f"Objective: {data.objective}" if data.objective else ""}

Campaign Type: {desc}

Generate:
1. Campaign name
2. Campaign objective (clear, measurable goal)
3. Strategy (overall approach and key tactics)
4. Channels (array of recommended channels: email, social, ads, content, etc.)
5. Timeline (object with phases and durations)
6. Budget recommendation (estimated allocation across channels)
7. Content ideas (array of 5-7 specific content pieces needed)

Respond in JSON with keys: name, objective, strategy, channels, timeline, budget_recommendation, content_ideas"""

    campaign = {}
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
                        "content": "You are a campaign strategist. Create detailed, actionable marketing campaign briefs. You MUST output valid JSON only."
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
                campaign = json.loads(raw_content)
            else:
                raise HTTPException(status_code=500, detail=f"OpenAI API returned error: {openai_response.text}")
        except Exception as e:
            print(f"Error calling OpenAI API: {e}")
            raise HTTPException(status_code=500, detail=f"Campaign generation failed: {str(e)}")

    # Save campaign to database
    insert_query = """
        INSERT INTO campaigns (
            business_id, campaign_type, name, objective, strategy,
            channels, timeline, budget_recommendation, content_ideas
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *
    """
    
    try:
        result = sql(
            insert_query,
            [
                data.businessId,
                data.campaignType,
                campaign.get("name"),
                campaign.get("objective"),
                campaign.get("strategy"),
                campaign.get("channels", []),
                campaign.get("timeline", {}),
                campaign.get("budget_recommendation"),
                campaign.get("content_ideas", [])
            ]
        )
        if not result:
            raise HTTPException(status_code=500, detail="Database insert failed")
        return {"campaign": result[0]}
    except Exception as e:
        print(f"Error saving campaign: {e}")
        raise HTTPException(status_code=500, detail=f"Database write failed: {str(e)}")

@router.get("/list")
def list_campaigns(businessId: int = Query(..., description="businessId is required")):
    if not businessId:
        raise HTTPException(status_code=400, detail="businessId is required")
        
    try:
        campaigns = sql("SELECT * FROM campaigns WHERE business_id = $1 ORDER BY created_at DESC", [businessId])
        return {"campaigns": campaigns}
    except Exception as e:
        print(f"Error listing campaigns: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to list campaigns: {str(e)}")

@router.delete("/delete")
def delete_campaign(id: int = Query(..., description="id is required")):
    if not id:
        raise HTTPException(status_code=400, detail="id is required")
        
    try:
        sql("DELETE FROM campaigns WHERE id = $1", [id])
        return {"success": True}
    except Exception as e:
        print(f"Error deleting campaign: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to delete campaign: {str(e)}")
