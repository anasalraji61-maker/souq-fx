import express from 'express';
import cors from 'cors';
import { GoogleGenAI } from '@google/genai';
import path from 'path';
import { fileURLToPath } from 'url';
import { globalAgentEngine, LiveTradingForbiddenError } from './src/server/agentEngine.js';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = parseInt(process.env.PORT || '3000', 10);

app.use(cors());
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ limit: '25mb', extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Direct VPS Setup Script Endpoint
app.get('/setup-vps.sh', (_req, res) => {
  const scriptPath = path.join(__dirname, 'public', 'setup-vps.sh');
  if (fs.existsSync(scriptPath)) {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    return res.sendFile(scriptPath);
  }
  return res.status(404).send('#!/bin/bash\necho "Script not found"\n');
});

// Upload screenshot endpoint (Direct in-app fallback)
app.post('/api/upload-screenshot', (req, res) => {
  try {
    const { imageBase64, note } = req.body || {};
    if (!imageBase64) {
      return res.status(400).json({ error: 'No image data provided' });
    }

    const uploadDir = path.join(__dirname, 'public', 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');
    const filePath = path.join(uploadDir, 'user_screenshot.png');
    fs.writeFileSync(filePath, buffer);

    // Also record note if provided
    if (note) {
      fs.writeFileSync(path.join(uploadDir, 'note.txt'), note);
    }

    return res.json({
      success: true,
      message: 'Screenshot uploaded and saved successfully',
      path: '/uploads/user_screenshot.png',
      timestamp: Date.now(),
    });
  } catch (err: any) {
    console.error('Error uploading screenshot:', err);
    return res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 10-AGENT AUTONOMOUS ROBOT API ENDPOINTS
// ==========================================

// Get full live state of the 10 Cloud Agents
app.get('/api/bot/state', (_req, res) => {
  return res.json(globalAgentEngine.getState());
});

// Update robot configuration (Auto-Trading ON/OFF, Risk%, etc.)
app.post('/api/bot/config', (req, res) => {
  try {
    const updated = globalAgentEngine.updateConfig(req.body);
    return res.json({ success: true, config: updated });
  } catch (err: any) {
    if (err instanceof LiveTradingForbiddenError) {
      return res.status(403).json({
        success: false,
        error: 'التداول الحقيقي معطّل. النظام يعمل في وضع التداول التجريبي فقط.',
      });
    }
    throw err;
  }
});

// Close a single position
app.post('/api/bot/close-position', (req, res) => {
  const { id } = req.body;
  const closed = globalAgentEngine.closePosition(id);
  return res.json({ success: !!closed, position: closed });
});

// Emergency Panic: Close all positions
app.post('/api/bot/close-all', (_req, res) => {
  const count = globalAgentEngine.closeAllPositions();
  return res.json({ success: true, countClosed: count });
});

// Clear trade history logs
app.post('/api/bot/clear-history', (_req, res) => {
  globalAgentEngine.clearTradeHistory();
  return res.json({ success: true });
});

// Trigger a trade from the dashboard
app.post('/api/bot/trigger-trade', (req, res) => {
  const { symbol, type } = req.body || {};
  const trade = globalAgentEngine.triggerManualTrade(symbol, type);
  return res.json({ success: true, trade });
});

// Reset account balance
app.post('/api/bot/reset-account', (req, res) => {
  const { balance } = req.body || {};
  globalAgentEngine.resetAccount(Number(balance) || 10000);
  return res.json({ success: true });
});

// MT5 Expert Advisor Signal Polling endpoint (24/7)
app.get('/api/bot/signals', (req, res) => {
  const { account, balance, equity, broker } = req.query;
  if (account) {
    globalAgentEngine.recordMt5Heartbeat(
      String(account),
      balance ? Number(balance) : undefined,
      equity ? Number(equity) : undefined,
      broker ? String(broker) : undefined
    );
  }

  globalAgentEngine.popPendingSignals(); // Always returns [] (MT5 bridge disabled)
  return res.json({
    status: 'idle',
    count: 0,
    targetAccount: '5056692955',
    activeSwarm: 10,
    message: 'Swarm active and scanning 24/7 - standby',
  });
});

// Simulate MT5 ping for demo account 5056692955
app.post('/api/bot/simulate-mt5-ping', (_req, res) => {
  const info = globalAgentEngine.simulateMt5Ping();
  return res.json({ success: true, mt5Bridge: info });
});

// Download ready-to-run MetaTrader 5 Expert Advisor with dynamically injected Host & Account
app.get('/api/bot/mql5-ea', (req, res) => {
  const eaPath = path.join(__dirname, 'public', 'MatrixAgentBridge.mq5');
  if (fs.existsSync(eaPath)) {
    let content = fs.readFileSync(eaPath, 'utf8');

    // Detect host protocol and domain dynamically
    const forwardedProto = req.headers['x-forwarded-proto'] as string;
    const proto = (forwardedProto && forwardedProto.split(',')[0].trim()) || (req.get('host')?.includes('run.app') ? 'https' : req.protocol) || 'https';
    const host = (req.headers['x-forwarded-host'] as string) || req.get('host') || 'localhost:3000';
    const serverUrl = `${proto}://${host}`;

    // Replace Server URL dynamically in the EA code
    content = content.replace(
      /input\s+string\s+InpServerUrl\s*=\s*"[^"]*";[^\r\n]*/,
      `input string   InpServerUrl     = "${serverUrl}"; // Auto-configured Cloud URL`
    );

    // Replace or ensure account 5056692955 is configured
    content = content.replace(
      /input\s+ulong\s+InpTargetAccount\s*=\s*\d+;[^\r\n]*/,
      `input ulong    InpTargetAccount = 5056692955;                      // Demo Account Number`
    );

    res.setHeader('Content-Disposition', 'attachment; filename=MatrixAgentBridge_5056692955.mq5');
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    return res.send(content);
  }
  return res.status(404).send('MQL5 file not found');
});

// Gemini Multi-turn Chat Endpoint
app.post('/api/chat', async (req, res) => {
  try {
    const { messages, systemInstruction, role } = req.body;

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({
        error: 'لم يتم العثور على مفتاح GEMINI_API_KEY في بيئة الخادم.',
      });
    }

    const ai = new GoogleGenAI({ apiKey });

    // Select model based on task requirement:
    // gemini-3.1-flash-lite for fast tasks, gemini-3.5-flash for general tasks
    const model = role === 'fast' ? 'gemini-3.1-flash-lite' : 'gemini-3.5-flash';

    // Format conversation history
    const contents = (messages || []).map((m: any) => ({
      role: m.role === 'assistant' || m.role === 'model' ? 'model' : 'user',
      parts: [{ text: m.text }],
    }));

    const response = await ai.models.generateContent({
      model,
      contents,
      config: {
        systemInstruction:
          systemInstruction ||
          'You are MATRIX AI, an expert Senior Forex & Commodities Technical Analyst. Explain trading concepts and technical analysis accurately and concisely.',
      },
    });

    const reply = response.text || '';
    return res.json({ reply });
  } catch (error: any) {
    console.error('Gemini API Error:', error);
    return res.status(500).json({
      error: error.message || 'حدث خطأ أثناء معالجة الطلب عبر Gemini API',
    });
  }
});

// Start Express server with Vite middleware in dev or static files in production
async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`Server running at http://0.0.0.0:${port}`);
  });
}

startServer();
