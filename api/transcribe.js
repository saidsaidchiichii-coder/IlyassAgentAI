// IlyassAI — /api/transcribe
// Speech-to-text using OpenAI Whisper API

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  res.setHeader('Access-Control-Allow-Origin', '*');

  const openaiKey = process.env.OPENAI_API_KEY;
  if (!openaiKey) {
    return res.status(503).json({ 
      error: 'Transcription requires OPENAI_API_KEY environment variable. Please configure it in Vercel dashboard.' 
    });
  }

  try {
    // Forward multipart form data to Whisper
    const formData = new FormData();
    
    // Get the raw body
    const chunks = [];
    for await (const chunk of req) { chunks.push(chunk); }
    const body = Buffer.concat(chunks);

    // Forward to OpenAI Whisper
    const whisperRes = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
        'Content-Type': req.headers['content-type']
      },
      body
    });

    if (!whisperRes.ok) {
      const err = await whisperRes.text();
      throw new Error(`Whisper API error: ${whisperRes.status} - ${err}`);
    }

    const data = await whisperRes.json();
    return res.status(200).json({ 
      success: true, 
      text: data.text, 
      language: data.language,
      duration: data.duration
    });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

export const config = { api: { bodyParser: false } };
