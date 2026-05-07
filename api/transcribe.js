// ================================================================
//  api/transcribe.js — Groq Whisper Speech-to-Text
//  IlyassAgentAI — Groq Whisper Integration v1.0
// ================================================================

export const config = {
  api: { bodyParser: false },
};

function indexOf(buf, search, offset = 0) {
  for (let i = offset; i <= buf.length - search.length; i++) {
    let found = true;
    for (let j = 0; j < search.length; j++) {
      if (buf[i + j] !== search[j]) { found = false; break; }
    }
    if (found) return i;
  }
  return -1;
}

async function parseMultipart(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', () => {
      try {
        const body   = Buffer.concat(chunks);
        const ct     = req.headers['content-type'] || '';
        const bMatch = ct.match(/boundary=(.+)$/);
        if (!bMatch) return reject(new Error('No boundary in Content-Type'));

        const boundary = Buffer.from('--' + bMatch[1]);
        const parts    = [];
        let start      = 0;

        while (true) {
          const idx  = indexOf(body, boundary, start);
          if (idx === -1) break;
          const next = indexOf(body, boundary, idx + boundary.length);
          if (next === -1) break;

          const part   = body.slice(idx + boundary.length + 2, next - 2);
          const sepIdx = indexOf(part, Buffer.from('\r\n\r\n'), 0);
          if (sepIdx === -1) { start = next; continue; }

          const headerBuf = part.slice(0, sepIdx).toString();
          const dataBuf   = part.slice(sepIdx + 4);

          const nameMatch = headerBuf.match(/name="([^"]+)"/);
          const fileMatch = headerBuf.match(/filename="([^"]+)"/);
          const ctMatch   = headerBuf.match(/Content-Type:\s*([^\r\n]+)/i);

          parts.push({
            name:        nameMatch ? nameMatch[1]      : '',
            filename:    fileMatch ? fileMatch[1]      : null,
            contentType: ctMatch   ? ctMatch[1].trim() : 'application/octet-stream',
            data:        dataBuf,
          });
          start = next;
        }
        resolve(parts);
      } catch (e) { reject(e); }
    });
    req.on('error', reject);
  });
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin',  '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method === 'GET') {
    return res.status(200).json({ ok: true, message: 'Groq Whisper STT API ✅' });
  }
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const GROQ_API_KEY = process.env.GROQ_API_KEY;
  if (!GROQ_API_KEY) {
    console.error('[transcribe] GROQ_API_KEY not configured');
    return res.status(500).json({ error: 'Server configuration error: GROQ_API_KEY missing' });
  }

  try {
    const parts    = await parseMultipart(req);
    const filePart = parts.find(p => p.name === 'audio' || p.filename);
    if (!filePart) {
      return res.status(400).json({ error: 'No audio field found. Send multipart field named "audio".' });
    }

    const langPart = parts.find(p => p.name === 'language');
    const language = langPart ? langPart.data.toString().trim() : undefined;

    const ext      = (filePart.filename || 'audio.webm').split('.').pop() || 'webm';
    const mimeType = filePart.contentType || 'audio/webm';

    const formData = new FormData();
    const blob     = new Blob([filePart.data], { type: mimeType });
    formData.append('file',  blob, `audio.${ext}`);
    formData.append('model', 'whisper-large-v3-turbo');
    formData.append('response_format', 'json');
    if (language) formData.append('language', language);

    const groqRes = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
      method:  'POST',
      headers: { 'Authorization': `Bearer ${GROQ_API_KEY}` },
      body:    formData,
    });

    if (!groqRes.ok) {
      const errText = await groqRes.text();
      console.error('[transcribe] Groq API error:', groqRes.status, errText);
      return res.status(groqRes.status).json({
        error:   'Groq API error',
        status:  groqRes.status,
        details: errText,
      });
    }

    const result = await groqRes.json();
    return res.status(200).json({
      text:     result.text || '',
      model:    'whisper-large-v3-turbo',
      language: language || 'auto-detected',
      duration: result.duration || null,
    });

  } catch (err) {
    console.error('[transcribe] Error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
}
