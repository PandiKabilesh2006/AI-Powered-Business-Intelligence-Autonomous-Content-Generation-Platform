from fastapi import APIRouter
from apps.backend import config

router = APIRouter(prefix="/api/utils", tags=["utils"])

@router.get("/keys-status")
def get_keys_status():
    return {
        "openai": bool(config.OPENAI_API_KEY),
        "firecrawl": bool(config.FIRECRAWL_API_KEY),
        "gemini": bool(config.GEMINI_API_KEY),
        "elevenlabs": bool(config.ELEVENLABS_API_KEY),
    }
