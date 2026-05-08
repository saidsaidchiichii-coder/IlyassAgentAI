// IlyassAI — /api/transcribe
// Speech-to-text using Groq Whisper (primary) and OpenAI Whisper (fallback)

export const config = { api: { bodyParser: false } };

export default async function handler(req, res) {
  // ── CORS preflight ──
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const groqKey = process.env.GROQ_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;

  if (!groqKey && !openaiKey) {
    return res.status(503).json({ 
      error: 'Transcription requires GROQ_API_KEY or OPENAI_API_KEY in Vercel environment variables.' 
    });
  }

  try {
    // ── Read raw body safely ──
    const chunks = [];
    await new Promise((resolve, reject) => {
      req.on('data', chunk => chunks.push(chunk));
      req.on('end', resolve);
      req.on('error', reject);
    });
    const body = Buffer.concat(chunks);
    const contentType = req.headers['content-type'] || 'audio/webm';

    // ── Groq Whisper (primary — free & fast) ──
    if (groqKey) {
      try {
        const groqRes = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${groqKey}`,
            'Content-Type': contentType
          },
          body
        });

        if (groqRes.ok) {
          const data = await groqRes.json();
          return res.status(200).json({ 
            success: true, 
            text: data.text, 
            language: data.language,
            duration: data.duration,
            provider: 'Groq Whisper'
          });
        } else {
          const errText = await groqRes.text();
          console.error('Groq Whisper error:', groqRes.status, errText);
        }
      } catch (e) {
        console.error('Groq Whisper exception:', e.message);
      }
    }

    // ── OpenAI Whisper fallback ──
    if (openaiKey) {
      const whisperRes = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiKey}`,
          'Content-Type': contentType
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
        duration: data.duration,
        provider: 'OpenAI Whisper'
      });
    }

    return res.status(503).json({ error: 'All transcription providers failed.' });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
