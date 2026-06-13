export async function GET() {
  return Response.json({
    openai: !!process.env.OPENAI_API_KEY,
    firecrawl: !!process.env.FIRECRAWL_API_KEY,
    gemini: !!process.env.GEMINI_API_KEY,
    elevenlabs: !!process.env.ELEVENLABS_API_KEY,
  });
}
