/**
 * POST /api/generate-feedback
 * Body: { description, link, week, topic }
 * Returns: { feedback: string }
 *
 * Uses Anthropic Messages API to generate structured feedback
 * for a homework submission.
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { description, link, week, topic } = req.body;

  if (!description && !link) {
    return res.status(400).json({ error: 'At least a description or link is required.' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY is not configured.' });
  }

  const prompt = `Analyze the following homework submission from a design team AI learning session.

Provide:
1. One positive observation
2. One area of improvement
3. 1–2 actionable suggestions

Keep the tone constructive, concise, and helpful. Use plain text without markdown symbols like ** or ##. Keep each point to 1–2 sentences.

Session Topic: ${topic || 'AI Learning'}
Week: ${week || 'N/A'}
Submission Description: ${description || 'No description provided'}
Submission Link: ${link || 'No link provided'}`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type':      'application/json',
        'x-api-key':         apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model:      'claude-haiku-4-5-20251001',
        max_tokens: 400,
        messages:   [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      console.error('Anthropic API error:', errData);
      return res.status(502).json({ error: errData?.error?.message || 'AI service error.' });
    }

    const data     = await response.json();
    const feedback = data?.content?.[0]?.text?.trim();

    if (!feedback) {
      return res.status(502).json({ error: 'Empty response from AI.' });
    }

    return res.status(200).json({ feedback });

  } catch (err) {
    console.error('generate-feedback error:', err);
    return res.status(500).json({ error: 'Failed to generate feedback. Please try again.' });
  }
}
