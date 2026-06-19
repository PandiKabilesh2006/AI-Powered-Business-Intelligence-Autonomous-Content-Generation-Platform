import json
import httpx
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import List, Optional
from apps.backend import config
from apps.backend.database import sql

router = APIRouter(prefix="/api/competitors", tags=["competitors"])

class CompetitorAnalyzeRequest(BaseModel):
    businessId: int
    competitorUrls: List[str]

@router.post("/analyze")
async def analyze_competitors(data: CompetitorAnalyzeRequest):
    if not data.businessId or not data.competitorUrls or not isinstance(data.competitorUrls, list):
        raise HTTPException(status_code=400, detail="businessId and competitorUrls array are required")
        
    # Get business context
    business_result = sql("SELECT * FROM businesses WHERE id = $1", [data.businessId])
    if not business_result:
        raise HTTPException(status_code=404, detail="Business not found")
        
    business = business_result[0]
    competitors = []
    
    # Scrape each competitor
    firecrawl_api_url = config.FIRECRAWL_API_URL or "https://api.firecrawl.dev"
    fc_headers = {
        "Content-Type": "application/json",
    }
    if config.FIRECRAWL_API_KEY:
        fc_headers["Authorization"] = f"Bearer {config.FIRECRAWL_API_KEY}"
        
    async with httpx.AsyncClient(timeout=45.0) as client:
        # Limit to first 5 competitors
        for url in data.competitorUrls[:5]:
            try:
                # 1. Scrape competitor site
                fc_response = await client.post(
                    f"{firecrawl_api_url}/v1/scrape",
                    headers=fc_headers,
                    json={
                        "url": url,
                        "formats": ["markdown"],
                        "onlyMainContent": True
                    }
                )
                
                if not fc_response.is_success:
                    print(f"Failed to scrape competitor {url}: status {fc_response.status_code}")
                    continue
                    
                scraped_data = fc_response.json()
                markdown_content = ""
                if "data" in scraped_data:
                    markdown_content = scraped_data["data"].get("markdown") or ""
                
                # 2. Analyze with OpenAI
                openai_headers = {
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {config.OPENAI_API_KEY}"
                }
                openai_body = {
                    "model": "gpt-4o",
                    "messages": [
                        {
                            "role": "system",
                            "content": "You are a competitive intelligence analyst."
                        },
                        {
                            "role": "user",
                            "content": f"""Analyze this competitor against our business:

Our Business:
- Name: {business.get('name')}
- Industry: {business.get('industry')}
- Value Prop: {business.get('value_proposition')}

Competitor Website Content:
{markdown_content}

Extract:
1. Competitor name
2. Their positioning
3. Key strengths (array)
4. Key weaknesses/gaps (array)

Respond in JSON format with keys: name, positioning, strengths, weaknesses"""
                        }
                    ],
                    "temperature": 0.3,
                    "response_format": {"type": "json_object"}
                }
                
                openai_response = await client.post(
                    "https://api.openai.com/v1/chat/completions",
                    headers=openai_headers,
                    json=openai_body
                )
                
                if not openai_response.is_success:
                    print(f"OpenAI analysis failed for {url}: {openai_response.text}")
                    continue
                    
                ai_data = openai_response.json()
                competitor_context = json.loads(ai_data["choices"][0]["message"]["content"])
                
                # 3. Save competitor to DB
                insert_query = """
                    INSERT INTO competitors (
                      business_id, name, website_url, scraped_data,
                      positioning, strengths, weaknesses
                    )
                    VALUES ($1, $2, $3, $4, $5, $6, $7)
                    RETURNING *
                """
                comp_result = sql(
                    insert_query,
                    [
                        data.businessId,
                        competitor_context.get("name", "Unknown Competitor"),
                        url,
                        scraped_data,
                        competitor_context.get("positioning"),
                        competitor_context.get("strengths", []),
                        competitor_context.get("weaknesses", [])
                    ]
                )
                if comp_result:
                    competitors.append(comp_result[0])
            except Exception as e:
                print(f"Error analyzing competitor {url}: {e}")
                
    if not competitors:
        raise HTTPException(status_code=500, detail="Failed to analyze any competitors.")

    # Generate competitive gap analysis across all competitors
    analysis = {}
    async with httpx.AsyncClient(timeout=45.0) as client:
        try:
            openai_headers = {
                "Content-Type": "application/json",
                "Authorization": f"Bearer {config.OPENAI_API_KEY}"
            }
            
            competitors_summary = [
                {
                    "name": c.get("name"),
                    "positioning": c.get("positioning"),
                    "strengths": c.get("strengths"),
                    "weaknesses": c.get("weaknesses")
                } for c in competitors
            ]
            
            prompt_text = f"""Create a competitive gap analysis and positioning recommendations:

Our Business: {business.get('name')}
Industry: {business.get('industry')}
Value Prop: {business.get('value_proposition')}

Competitors Analysis:
{json.dumps(competitors_summary, indent=2)}

Provide:
1. Market gaps we can exploit
2. Positioning recommendations
3. Differentiation opportunities

Respond in JSON format with keys: market_gaps (array), positioning_recommendations (array), differentiation_opportunities (array)"""

            openai_body = {
                "model": "gpt-4o",
                "messages": [
                    {
                        "role": "system",
                        "content": "You are a market positioning strategist."
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
                analysis = json.loads(raw_content)
            else:
                raise HTTPException(status_code=500, detail=f"OpenAI competitive summary error: {openai_response.text}")
        except Exception as e:
            print(f"Error generating overall gap analysis: {e}")
            raise HTTPException(status_code=500, detail=f"Gap analysis failed: {str(e)}")

    return {
        "competitors": competitors,
        "analysis": analysis
    }

@router.get("/list")
def list_competitors(businessId: int = Query(..., description="businessId is required")):
    if not businessId:
        raise HTTPException(status_code=400, detail="businessId is required")
        
    try:
        competitors = sql("SELECT * FROM competitors WHERE business_id = $1 ORDER BY created_at DESC", [businessId])
        return {"competitors": competitors}
    except Exception as e:
        print(f"Error listing competitors: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to list competitors: {str(e)}")

@router.delete("/delete")
def delete_competitor(id: int = Query(..., description="id is required")):
    if not id:
        raise HTTPException(status_code=400, detail="id is required")
        
    try:
        sql("DELETE FROM competitors WHERE id = $1", [id])
        return {"success": True}
    except Exception as e:
        print(f"Error deleting competitor: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to delete competitor: {str(e)}")
