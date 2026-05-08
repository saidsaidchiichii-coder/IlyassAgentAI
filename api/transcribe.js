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

  const groqKey   = process.env.GROQ_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;

  if (!groqKey && !openaiKey) {
    return res.status(503).json({
      error: 'Transcription requires GROQ_API_KEY or OPENAI_API_KEY in Vercel environment variables.'
    });
  }

  try {
    // ── Read raw body ──
    const chunks = [];
    await new Promise((resolve, reject) => {
      req.on('data', chunk => chunks.push(chunk));
      req.on('end', resolve);
      req.on('error', reject);
    });
    const audioBuffer = Buffer.concat(chunks);
    const contentType = req.headers['content-type'] || 'audio/webm';

    // ── Groq Whisper (primary — free & fast) ──
    // FIX: Groq Whisper API requires multipart/form-data with 'file' field + 'model' param
    if (groqKey) {
      try {
        // Detect file extension from content-type
        let ext = 'webm';
        if (contentType.includes('mp4')) ext = 'mp4';
        else if (contentType.includes('mp3') || contentType.includes('mpeg')) ext = 'mp3';
        else if (contentType.includes('wav')) ext = 'wav';
        else if (contentType.includes('ogg')) ext = 'ogg';
        else if (contentType.includes('flac')) ext = 'flac';
        else if (contentType.includes('m4a')) ext = 'm4a';

        // Build multipart/form-data manually
        const boundary = '----FormBoundary' + Math.random().toString(36).slice(2);
        const filename = `audio.${ext}`;

        const preamble = Buffer.from(
          `--${boundary}\r\n` +
          `Content-Disposition: form-data; name="file"; filename="${filename}"\r\n` +
          `Content-Type: ${contentType}\r\n\r\n`
        );
        const modelPart = Buffer.from(
          `\r\n--${boundary}\r\n` +
          `Content-Disposition: form-data; name="model"\r\n\r\n` +
          `whisper-large-v3\r\n` +
          `--${boundary}\r\n` +
          `Content-Disposition: form-data; name="response_format"\r\n\r\n` +
          `json\r\n` +
          `--${boundary}--\r\n`
        );
        const formBody = Buffer.concat([preamble, audioBuffer, modelPart]);

        const groqRes = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${groqKey}`,
            'Content-Type': `multipart/form-data; boundary=${boundary}`
          },
          body: formBody,
          signal: AbortSignal.timeout(25000)
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
    // FIX: OpenAI also needs multipart/form-data
    if (openaiKey) {
      try {
        let ext = 'webm';
        if (contentType.includes('mp4')) ext = 'mp4';
        else if (contentType.includes('mp3') || contentType.includes('mpeg')) ext = 'mp3';
        else if (contentType.includes('wav')) ext = 'wav';
        else if (contentType.includes('ogg')) ext = 'ogg';
        else if (contentType.includes('flac')) ext = 'flac';
        else if (contentType.includes('m4a')) ext = 'm4a';

        const boundary = '----FormBoundary' + Math.random().toString(36).slice(2);
        const filename = `audio.${ext}`;

        const preamble = Buffer.from(
          `--${boundary}\r\n` +
          `Content-Disposition: form-data; name="file"; filename="${filename}"\r\n` +
          `Content-Type: ${contentType}\r\n\r\n`
        );
        const modelPart = Buffer.from(
          `\r\n--${boundary}\r\n` +
          `Content-Disposition: form-data; name="model"\r\n\r\nwhisper-1\r\n` +
          `--${boundary}--\r\n`
        );
        const formBody = Buffer.concat([preamble, audioBuffer, modelPart]);

        const whisperRes = await fetch('https://api.openai.com/v1/audio/transcriptions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openaiKey}`,
            'Content-Type': `multipart/form-data; boundary=${boundary}`
          },
          body: formBody,
          signal: AbortSignal.timeout(25000)
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
      } catch (e) {
        console.error('OpenAI Whisper error:', e.message);
        return res.status(500).json({ error: e.message });
      }
    }

    return res.status(503).json({ error: 'All transcription providers failed.' });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
