export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { type, body } = req.body;

  try {
    if (type === 'claude') {
      if (!process.env.ANTHROPIC_API_KEY) return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured' });

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify(body),
      });

      const text = await response.text();
      try {
        res.status(response.status).json(JSON.parse(text));
      } catch (e) {
        res.status(500).json({ error: 'Anthropic API error', raw: text.slice(0, 500) });
      }

    } else if (type === 'dalle') {
      if (!process.env.OPENAI_API_KEY) return res.status(500).json({ error: 'OPENAI_API_KEY not configured' });

      const dalleBody = {
        model: 'dall-e-3',
        prompt: body.prompt,
        n: 1,
        size: body.size || '1024x1024',
        quality: 'standard',
        response_format: 'url',
      };

      console.log('DALL-E request size:', body.size);
      console.log('DALL-E prompt length:', body.prompt?.length);

      const response = await fetch('https://api.openai.com/v1/images/generations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify(dalleBody),
      });

      const text = await response.text();
      console.log('DALL-E response status:', response.status);
      console.log('DALL-E response:', text.slice(0, 500));

      try {
        res.status(response.status).json(JSON.parse(text));
      } catch (e) {
        res.status(500).json({ error: 'OpenAI API error', raw: text.slice(0, 500) });
      }

    } else {
      res.status(400).json({ error: 'Unknown request type' });
    }
  } catch (err) {
    console.error('Handler error:', err.message);
    res.status(500).json({ error: err.message });
  }
}
