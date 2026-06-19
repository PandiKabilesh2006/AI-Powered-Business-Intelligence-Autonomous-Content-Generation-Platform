import re
import json
import httpx
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from apps.backend import config
from apps.backend.database import sql

router = APIRouter(prefix="/api/scrape", tags=["scrape"])

class ScrapeRequest(BaseModel):
    businessId: int
    websiteUrl: str

def rgb_to_hex(r, g, b):
    return f"#{r:02x}{g:02x}{b:02x}"

@router.post("/website")
async def scrape_website(data: ScrapeRequest):
    if not data.businessId or not data.websiteUrl:
        raise HTTPException(status_code=400, detail="businessId and websiteUrl are required")
        
    # Scrape website using Firecrawl
    firecrawl_api_url = config.FIRECRAWL_API_URL or "https://api.firecrawl.dev"
    headers = {
        "Content-Type": "application/json",
    }
    if config.FIRECRAWL_API_KEY:
        headers["Authorization"] = f"Bearer {config.FIRECRAWL_API_KEY}"
        
    scraped_data = {}
    async with httpx.AsyncClient(timeout=60.0) as client:
        try:
            fc_response = await client.post(
                f"{firecrawl_api_url}/v1/scrape",
                headers=headers,
                json={
                    "url": data.websiteUrl,
                    "formats": ["markdown", "html"],
                    "onlyMainContent": False
                }
            )
            if fc_response.is_success:
                scraped_data = fc_response.json()
            else:
                print(f"Firecrawl API returned error status: {fc_response.status_code}")
                # We can fallback to empty content or throw an error
                raise HTTPException(status_code=500, detail=f"Firecrawl API error: {fc_response.text}")
        except Exception as e:
            print(f"Error calling Firecrawl: {e}")
            raise HTTPException(status_code=500, detail=f"Failed to scrape website via Firecrawl: {str(e)}")

    html_content = ""
    if "data" in scraped_data:
        html_content = scraped_data["data"].get("html") or scraped_data["data"].get("content") or ""
        
    # Extract potential hex color codes from the scraped html
    hex_colors = re.findall(r'#([a-fA-F0-9]{6}|[a-fA-F0-9]{3})\b', html_content)
    found_hex = [f"#{c.lower()}" for c in hex_colors]
    
    # Extract potential RGB/RGBA colors and convert to Hex
    rgb_matches = re.findall(r'rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*[\d.]+)?\)', html_content)
    found_rgb = []
    for match in rgb_matches:
        try:
            r, g, b = int(match[0]), int(match[1]), int(match[2])
            if r <= 255 and g <= 255 and b <= 255:
                found_rgb.append(rgb_to_hex(r, g, b))
        except ValueError:
            continue
            
    all_colors = found_hex + found_rgb
    unique_colors = []
    excluded_colors = {"#fff", "#ffffff", "#000", "#000000", "#eee", "#ddd", "#ccc"}
    for c in all_colors:
        c_lower = c.lower()
        if c_lower not in unique_colors and c_lower not in excluded_colors:
            unique_colors.append(c_lower)
            
    # Extract potential font families
    font_matches = re.findall(r'(?:font-family|--font-[a-zA-Z0-9-]+)\s*:\s*([^;\'}"]+)', html_content, re.IGNORECASE)
    found_fonts = []
    excluded_fonts = {
        'inherit', 'sans-serif', 'serif', 'monospace', 'initial', 'unset', 
        'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 
        'Roboto', 'Helvetica Neue', 'Arial', 'system'
    }
    for match in font_matches:
        fonts = [f.strip().replace("'", "").replace('"', "") for f in match.split(',')]
        for f in fonts:
            if f and f not in found_fonts and f not in excluded_fonts:
                found_fonts.append(f)
    unique_fonts = found_fonts[:10]
    
    # Extract business context using OpenAI API
    markdown_content = ""
    if "data" in scraped_data:
        markdown_content = scraped_data["data"].get("markdown") or scraped_data["data"].get("content") or ""
        
    prompt_text = f"""Analyze this website content and style information to extract business context.

Website content:
{markdown_content}

Extracted CSS style hex color codes:
{", ".join(unique_colors) if unique_colors else "None found"}

Extracted CSS style font families:
{", ".join(unique_fonts) if unique_fonts else "None found"}

Extract:
1. Business name
2. Industry/sector
3. Target audience (ICP)
4. Value proposition
5. Key products/services
6. Unique selling points
7. Brand colors (classify the hex colors found above into primary, secondary, and accent colors for the business. Respond as an object with keys: primary, secondary, accent. If no colors were found, generate appropriate ones.)
8. Typography (identify the primary heading and body fonts used on the website. Recommend specific fonts from the extracted list if available. Respond as an object with keys: heading, body. E.g. {{"heading": "Plus Jakarta Sans", "body": "Inter"}})

Respond in JSON format with keys: name, industry, target_audience, value_proposition, products, unique_selling_points, brand_colors, typography"""

    business_context = {}
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
                        "content": "You are a business analyst. Extract structured business information from website content and styles. You MUST output valid JSON only."
                    },
                    {
                        "role": "user",
                        "content": prompt_text
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
            
            if openai_response.is_success:
                openai_data = openai_response.json()
                raw_content = openai_data["choices"][0]["message"]["content"]
                business_context = json.loads(raw_content)
            else:
                raise HTTPException(status_code=500, detail=f"OpenAI API returned error: {openai_response.text}")
        except Exception as e:
            print(f"Error calling OpenAI API: {e}")
            raise HTTPException(status_code=500, detail=f"OpenAI processing failed: {str(e)}")

    # Update business record in database
    update_query = """
        UPDATE businesses
        SET 
            name = $1,
            industry = $2,
            target_audience = $3,
            value_proposition = $4,
            scraped_data = $5,
            business_context = $6,
            updated_at = NOW()
        WHERE id = $7
    """
    
    try:
        sql(
            update_query, 
            [
                business_context.get("name", "Unknown Business"),
                business_context.get("industry"),
                business_context.get("target_audience"),
                business_context.get("value_proposition"),
                scraped_data,
                business_context,
                data.businessId
            ]
        )
        return {
            "success": True,
            "businessContext": business_context,
            "scrapedData": scraped_data
        }
    except Exception as e:
        print(f"Error updating business context: {e}")
        raise HTTPException(status_code=500, detail=f"Database update failed: {str(e)}")
