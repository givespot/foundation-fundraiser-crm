"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_js_1 = require("../middleware/auth.js");
const router = (0, express_1.Router)();

// Initialize OpenAI client only if API key is available
let openai = null;
const apiKey = process.env.OPENAI_API_KEY || process.env.LLM_API_KEY;

if (apiKey && apiKey.length > 0) {
    try {
        const openai_1 = __importDefault(require("openai"));
        openai = new openai_1.default({
            apiKey: apiKey,
            baseURL: process.env.LLM_BASE_URL,
        });
        console.log('✅ AI client initialized');
    } catch (e) {
        console.log('⚠️ Could not initialize AI client:', e.message);
    }
} else {
    console.log('⚠️ AI API key not configured - AI features disabled');
}

// Generate content using LLM
router.post('/generate', auth_js_1.authenticate, async (req, res) => {
    try {
        if (!openai) {
            return res.status(503).json({ error: 'AI service not configured' });
        }
        const { prompt, context, maxTokens = 1000, temperature = 0.7 } = req.body;
        if (!prompt) {
            return res.status(400).json({ error: 'Prompt is required' });
        }
        const systemMessage = context
            ? `You are a helpful assistant for a fundraising CRM system. ${context}`
            : 'You are a helpful assistant for a fundraising CRM system.';
        const completion = await openai.chat.completions.create({
            model: process.env.LLM_MODEL || 'gpt-4o-mini',
            messages: [
                { role: 'system', content: systemMessage },
                { role: 'user', content: prompt }
            ],
            max_tokens: maxTokens,
            temperature: temperature,
        });
        res.json({
            content: completion.choices[0]?.message?.content || '',
            usage: completion.usage
        });
    } catch (error) {
        console.error('AI generation error:', error);
        res.status(500).json({ error: 'Failed to generate content' });
    }
});

// Suggest follow-up message
router.post('/suggest-followup', auth_js_1.authenticate, async (req, res) => {
    try {
        if (!openai) {
            return res.status(503).json({ error: 'AI service not configured' });
        }
        const { leadName, lastInteraction, context } = req.body;
        const prompt = `Generate a professional follow-up message for ${leadName}.`;
        const completion = await openai.chat.completions.create({
            model: process.env.LLM_MODEL || 'gpt-4o-mini',
            messages: [
                { role: 'system', content: 'You are a helpful assistant for a fundraising CRM.' },
                { role: 'user', content: prompt }
            ],
            max_tokens: 500,
            temperature: 0.7,
        });
        res.json({
            suggestion: completion.choices[0]?.message?.content || ''
        });
    } catch (error) {
        console.error('AI suggestion error:', error);
        res.status(500).json({ error: 'Failed to generate suggestion' });
    }
});

exports.default = router;
