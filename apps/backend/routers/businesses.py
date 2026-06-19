from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Optional, Any, Dict
from apps.backend.database import sql

router = APIRouter(prefix="/api/businesses", tags=["businesses"])

class BusinessCreate(BaseModel):
    userId: str
    websiteUrl: str
    name: Optional[str] = None
    industry: Optional[str] = None
    target_audience: Optional[str] = None
    value_proposition: Optional[str] = None

@router.post("/create")
def create_business(data: BusinessCreate):
    if not data.userId or not data.websiteUrl:
        raise HTTPException(status_code=400, detail="userId and websiteUrl are required")
        
    business_name = data.name or "New Business"
    
    query = """
        INSERT INTO businesses (user_id, name, website_url, industry, target_audience, value_proposition)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
    """
    params = [
        data.userId,
        business_name,
        data.websiteUrl,
        data.industry,
        data.target_audience,
        data.value_proposition
    ]
    
    try:
        result = sql(query, params)
        if not result:
            raise HTTPException(status_code=500, detail="Failed to create business")
        return {"business": result[0]}
    except Exception as e:
        print(f"Error creating business: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to create business: {str(e)}")

@router.get("/list")
def list_businesses(userId: str = Query(..., description="userId is required")):
    if not userId:
        raise HTTPException(status_code=400, detail="userId is required")
        
    query = """
        SELECT 
            b.*,
            (SELECT COUNT(*) FROM content_pieces WHERE business_id = b.id) AS content_count,
            (SELECT COUNT(*) FROM creatives WHERE business_id = b.id) AS creatives_count,
            (SELECT COUNT(*) FROM campaigns WHERE business_id = b.id) AS campaigns_count,
            (SELECT COUNT(*) FROM competitors WHERE business_id = b.id) AS competitors_count,
            (SELECT COUNT(*) FROM videos WHERE business_id = b.id) AS videos_count,
            (SELECT COUNT(*) FROM brand_kits WHERE business_id = b.id) AS has_brand_kit
        FROM businesses b
        WHERE b.user_id = $1
        ORDER BY b.created_at DESC
    """
    
    try:
        businesses = sql(query, [userId])
        return {"businesses": businesses}
    except Exception as e:
        print(f"Error listing businesses: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to list businesses: {str(e)}")

@router.get("/{id}")
def get_business(id: int):
    query = """
        SELECT 
            b.*,
            (SELECT COUNT(*) FROM content_pieces WHERE business_id = b.id) AS content_count,
            (SELECT COUNT(*) FROM creatives WHERE business_id = b.id) AS creatives_count,
            (SELECT COUNT(*) FROM campaigns WHERE business_id = b.id) AS campaigns_count,
            (SELECT COUNT(*) FROM competitors WHERE business_id = b.id) AS competitors_count,
            (SELECT COUNT(*) FROM videos WHERE business_id = b.id) AS videos_count,
            (SELECT COUNT(*) FROM brand_kits WHERE business_id = b.id) AS has_brand_kit
        FROM businesses b
        WHERE b.id = $1
    """
    try:
        result = sql(query, [id])
        if not result:
            raise HTTPException(status_code=404, detail="Business not found")
        return {"business": result[0]}
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error fetching business: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch business: {str(e)}")

@router.put("/{id}")
def update_business(id: int, updates: Dict[str, Any]):
    allowed_fields = [
        "name",
        "industry",
        "target_audience",
        "value_proposition",
        "scraped_data",
        "business_context",
    ]
    
    set_clauses = []
    values = []
    param_index = 1
    
    for field in allowed_fields:
        if field in updates and updates[field] is not None:
            set_clauses.append(f"{field} = ${param_index}")
            values.append(updates[field])
            param_index += 1
            
    if not set_clauses:
        raise HTTPException(status_code=400, detail="No valid fields to update")
        
    set_clauses.append("updated_at = NOW()")
    values.append(id) # id is the final parameter
    
    query = f"""
        UPDATE businesses
        SET {", ".join(set_clauses)}
        WHERE id = ${param_index}
        RETURNING *
    """
    
    try:
        result = sql(query, values)
        if not result:
            raise HTTPException(status_code=404, detail="Business not found")
        return {"business": result[0]}
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error updating business: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to update business: {str(e)}")
