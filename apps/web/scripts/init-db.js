import { neon } from '@neondatabase/serverless';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL is not defined in process.env");
  process.exit(1);
}

const sql = neon(databaseUrl);

async function initDb() {
  try {
    console.log("Initializing database tables on Neon...");

    // Create businesses table
    await sql`
      CREATE TABLE IF NOT EXISTS businesses (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        website_url TEXT NOT NULL,
        industry VARCHAR(255),
        target_audience TEXT,
        value_proposition TEXT,
        scraped_data JSONB,
        business_context JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;
    console.log("- Created table 'businesses'");

    // Create brand_kits table
    await sql`
      CREATE TABLE IF NOT EXISTS brand_kits (
        id SERIAL PRIMARY KEY,
        business_id INTEGER NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
        brand_voice TEXT,
        brand_story TEXT,
        messaging_pillars JSONB,
        color_palette JSONB,
        typography JSONB,
        elevator_pitch TEXT,
        taglines JSONB,
        tone_guidelines TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;
    console.log("- Created table 'brand_kits'");

    // Create campaigns table
    await sql`
      CREATE TABLE IF NOT EXISTS campaigns (
        id SERIAL PRIMARY KEY,
        business_id INTEGER NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
        campaign_type VARCHAR(100) NOT NULL,
        name VARCHAR(255) NOT NULL,
        objective TEXT,
        strategy TEXT,
        channels JSONB,
        timeline JSONB,
        budget_recommendation TEXT,
        content_ideas JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;
    console.log("- Created table 'campaigns'");

    // Create competitors table
    await sql`
      CREATE TABLE IF NOT EXISTS competitors (
        id SERIAL PRIMARY KEY,
        business_id INTEGER NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        website_url TEXT NOT NULL,
        scraped_data JSONB,
        positioning TEXT,
        strengths JSONB,
        weaknesses JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;
    console.log("- Created table 'competitors'");

    // Create content_pieces table
    await sql`
      CREATE TABLE IF NOT EXISTS content_pieces (
        id SERIAL PRIMARY KEY,
        business_id INTEGER NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
        content_type VARCHAR(100) NOT NULL,
        title VARCHAR(255),
        content TEXT NOT NULL,
        metadata JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;
    console.log("- Created table 'content_pieces'");

    // Create creatives table
    await sql`
      CREATE TABLE IF NOT EXISTS creatives (
        id SERIAL PRIMARY KEY,
        business_id INTEGER NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
        creative_type VARCHAR(100) NOT NULL,
        format VARCHAR(100) NOT NULL,
        image_url TEXT NOT NULL,
        prompt TEXT,
        metadata JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;
    console.log("- Created table 'creatives'");

    // Create videos table
    await sql`
      CREATE TABLE IF NOT EXISTS videos (
        id SERIAL PRIMARY KEY,
        business_id INTEGER NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        topic TEXT NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'pending',
        script JSONB,
        video_url TEXT,
        metadata JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;
    console.log("- Created table 'videos'");


    console.log("Database tables successfully initialized!");
  } catch (error) {
    console.error("Failed to initialize database tables:", error);
    process.exit(1);
  }
}

initDb();
