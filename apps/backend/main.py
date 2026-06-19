from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from apps.backend.routers import (
    utils,
    businesses,
    scrape,
    brand,
    content,
    campaigns,
    competitors,
    creatives,
    videos,
    auth
)

app = FastAPI(title="ContentOS Backend API", version="1.0.0")

# Enable CORS for frontend requests in dev and production
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(utils.router)
app.include_router(businesses.router)
app.include_router(scrape.router)
app.include_router(brand.router)
app.include_router(content.router)
app.include_router(campaigns.router)
app.include_router(competitors.router)
app.include_router(creatives.router)
app.include_router(videos.router)
app.include_router(auth.router)
import os
from pathlib import Path
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from apps.backend import config

CLIENT_BUILD_DIR = config.WEB_DIR / "build" / "client"

# Serve static files from the build directory
if os.path.exists(CLIENT_BUILD_DIR / "assets"):
    app.mount("/assets", StaticFiles(directory=str(CLIENT_BUILD_DIR / "assets")), name="assets")

@app.get("/{catchall:path}")
def serve_spa(catchall: str):
    # Try serving static file if it exists in client build directory
    file_path = CLIENT_BUILD_DIR / catchall
    if file_path.is_file():
        return FileResponse(str(file_path))
        
    # Serve generated videos from web/public/videos (for runtime-generated clips)
    if catchall.startswith("videos/"):
        videos_file_path = (config.WEB_DIR / "public") / catchall
        if videos_file_path.is_file():
            return FileResponse(str(videos_file_path))
            
    # Serve other files from web/public/ directly (e.g. if they exist in frontend development public directory)
    public_file_path = (config.WEB_DIR / "public") / catchall
    if public_file_path.is_file():
        return FileResponse(str(public_file_path))

    # Fallback to SPA index.html
    index_path = CLIENT_BUILD_DIR / "index.html"
    if index_path.is_file():
        return FileResponse(str(index_path))
        
    return {"message": "ContentOS Backend API is running successfully! (Frontend build not found)"}
