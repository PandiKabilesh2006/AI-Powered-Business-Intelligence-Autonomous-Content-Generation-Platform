# ContentOS MVP

ContentOS is a state-of-the-art AI-powered marketing and branding platform. It automates business intelligence gathering, brand identity creation, multi-format content generation, ad creatives, campaign strategies, and competitor tracking.

**Live Deployment**: [https://ai-powered-business-intelligence-autonomous-cont-production.up.railway.app](https://ai-powered-business-intelligence-autonomous-cont-production.up.railway.app)

---

## Tech Stack & Architecture

- **Frontend & Routing**: React Router v7 & React with Vanilla styling & Tailwind CSS integration.
- **Backend API Server**: Hono framework with automatic file-system dynamic API routing mapping.
- **Database**: Neon Serverless Postgres (managed serverless PostgreSQL database).
- **AI Integration**:
  - **OpenAI GPT-4o**: Drives Brand Kit parameters and Content/Campaign generation.
  - **Google Gemini (Imagen & Nano models)**: Drives visual asset generation (Creatives).
  - **Firecrawl**: Drives website scraping for target businesses and competitors.

---

## Key Features

1. **Brand Identity Generation**: Input a website URL to automatically scrape context, USPs, target audience, and color palettes to build a custom brand memory (Brand Kit).
2. **Content Generation**: Generate brand-voiced LinkedIn posts, marketing emails, blog posts, tweets, and captions.
3. **Visual Creatives**: Generate size-aware visuals (Square, Portrait, Landscape) matching the business's brand colors.
4. **Campaign Strategic Briefs**: Formulate full product launches, lead-generation campaigns, and seasonal timeline outlines.
5. **Competitor Intelligence**: Scrape competitor websites to analyze positioning, strengths, weaknesses, and marketplace whitespace.

---

## Features Added Recently

### Content Custom Instructions
Users can now input Custom Instructions during content generation. This is fed directly to the OpenAI GPT completion prompt. You can guide the LLM to write in a specific tone, target a particular topic, style, or structure, or add restrictions (e.g. "Write in a witty tone, explain it like I'm 5, and include a call to action").

### Workspace-wide Deletions
Added full lifecycle support by allowing deletion of generated elements anywhere in the workspace:
- **Brand Kits**: Instantly reset a business's brand kit, reverting the UI back to the setup wizard.
- **Content Pieces**: Delete individual posts or copy drafts from your timeline.
- **Creatives**: Delete generated poster, banner, and social media images.
- **Campaign Briefs**: Remove outdated strategy outlines.
- **Competitor Tracking**: Remove competitor tracks to clean up the workspace dashboard.

---

## Getting Started

### 1. Prerequisites
Ensure you have Node.js (v18+) or Bun installed.

### 2. Configuration Setup
Create a `.env` file under `apps/web/` containing:
```env
DATABASE_URL=your-neon-postgres-connection-string
OPENAI_API_KEY=your-openai-api-key
GEMINI_API_KEY=your-gemini-api-key
FIRECRAWL_API_KEY=your-firecrawl-api-key
```

### 3. Initialize the Database
Run the database initialization script to create Neon tables and schema:
```bash
# Using npm/node
cd apps/web
node scripts/init-db.js

# Using bun
cd apps/web
bun run scripts/init-db.js
```

### 4. Running the Development Server
Start the client & API servers (default runs on http://localhost:4000/):
```bash
# Install dependencies
npm install

# Run the dev app
npm run dev
```
