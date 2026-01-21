import { Router, Response } from 'express';
import OpenAI from 'openai';
import { authenticate, AuthRequest } from '../middleware/auth.js';

const router = Router();

// Initialize OpenAI client (compatible with other providers)
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || process.env.LLM_API_KEY,
  baseURL: process.env.LLM_BASE_URL, // Optional: for using other providers like Anthropic, local models, etc.
});

// Generate content using LLM
router.post('/generate', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { prompt, context, maxTokens = 1000, temperature = 0.7 } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    const systemMessage = context
      ? `You are a helpful assistant for a fundraising CRM system. ${context}`
      : 'You are a helpful assistant for a fundraising CRM system. Help with creating professional emails, follow-up messages, and fundraising content.';

    const completion = await openai.chat.completions.create({
      model: process.env.LLM_MODEL || 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemMessage },
        { role: 'user', content: prompt }
      ],
      max_tokens: maxTokens,
      temperature,
    });

    const content = completion.choices[0]?.message?.content || '';

    res.json({
      content,
      usage: completion.usage
    });
  } catch (error: any) {
    console.error('LLM generate error:', error);
    res.status(500).json({ error: 'Failed to generate content' });
  }
});

// Generate email content for sequences
router.post('/generate-email', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const {
      sequenceName,
      stepNumber,
      memberName,
      memberOrganization,
      context,
      previousSteps = []
    } = req.body;

    const prompt = `Generate a professional fundraising email for the following context:

Sequence: ${sequenceName}
Step: ${stepNumber}
Recipient: ${memberName}${memberOrganization ? ` from ${memberOrganization}` : ''}

${context ? `Additional context: ${context}` : ''}

${previousSteps.length > 0 ? `Previous steps in this sequence:\n${previousSteps.map((s: any, i: number) => `${i + 1}. ${s.subject}: ${s.summary}`).join('\n')}` : ''}

Please generate:
1. A compelling subject line
2. The email body (use {{first_name}} for personalization)

Format your response as JSON with "subject" and "body" fields.`;

    const completion = await openai.chat.completions.create({
      model: process.env.LLM_MODEL || 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are an expert fundraising copywriter. Generate professional, warm, and engaging emails that build relationships with donors and potential supporters. Always return valid JSON.'
        },
        { role: 'user', content: prompt }
      ],
      max_tokens: 1000,
      temperature: 0.8,
    });

    const responseText = completion.choices[0]?.message?.content || '';

    // Try to parse as JSON
    try {
      // Extract JSON from the response (in case it's wrapped in markdown)
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        res.json(parsed);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      // Fallback: return raw content
      res.json({
        subject: 'Follow-up from our foundation',
        body: responseText
      });
    }
  } catch (error: any) {
    console.error('Generate email error:', error);
    res.status(500).json({ error: 'Failed to generate email content' });
  }
});

// Generate follow-up suggestions for a lead
router.post('/suggest-followup', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { leadName, leadStage, lastActivity, notes, pledgeAmount } = req.body;

    const prompt = `Based on the following lead information, suggest the best follow-up approach:

Lead: ${leadName}
Current Stage: ${leadStage}
Last Activity: ${lastActivity || 'No recent activity'}
Notes: ${notes || 'None'}
Pledge Amount: ${pledgeAmount ? `£${pledgeAmount}` : 'Not specified'}

Provide:
1. Recommended next action
2. Best communication channel (email, phone, meeting)
3. Key talking points
4. Suggested timing

Format as JSON with fields: action, channel, talkingPoints (array), timing`;

    const completion = await openai.chat.completions.create({
      model: process.env.LLM_MODEL || 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a fundraising strategy expert. Provide actionable, specific follow-up recommendations. Always return valid JSON.'
        },
        { role: 'user', content: prompt }
      ],
      max_tokens: 500,
      temperature: 0.7,
    });

    const responseText = completion.choices[0]?.message?.content || '';

    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        res.json(parsed);
      } else {
        throw new Error('No JSON found');
      }
    } catch (parseError) {
      res.json({
        action: 'Schedule a follow-up call',
        channel: 'phone',
        talkingPoints: ['Review their interests', 'Discuss giving opportunities', 'Address any questions'],
        timing: 'Within the next 3-5 business days'
      });
    }
  } catch (error: any) {
    console.error('Suggest followup error:', error);
    res.status(500).json({ error: 'Failed to generate suggestions' });
  }
});

// Generate personalized message
router.post('/personalize', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { template, recipientData } = req.body;

    if (!template) {
      return res.status(400).json({ error: 'Template is required' });
    }

    // Simple variable replacement
    let personalized = template;
    if (recipientData) {
      for (const [key, value] of Object.entries(recipientData)) {
        const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
        personalized = personalized.replace(regex, String(value || ''));
      }
    }

    // Clean up any remaining placeholders
    personalized = personalized.replace(/\{\{[^}]+\}\}/g, '');

    res.json({ content: personalized });
  } catch (error: any) {
    console.error('Personalize error:', error);
    res.status(500).json({ error: 'Failed to personalize content' });
  }
});

// Health check for AI service
router.get('/health', async (req, res) => {
  try {
    const hasApiKey = !!(process.env.OPENAI_API_KEY || process.env.LLM_API_KEY);
    res.json({
      status: hasApiKey ? 'ok' : 'no_api_key',
      model: process.env.LLM_MODEL || 'gpt-4o-mini',
      provider: process.env.LLM_BASE_URL ? 'custom' : 'openai'
    });
  } catch (error: any) {
    res.status(500).json({ status: 'error', error: error.message });
  }
});

export default router;
