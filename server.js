import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import * as db from './server/database.js';
import { getProviders } from './server/llm-client.js';
import { startAutomation, stopAutomation, getRunning } from './server/survey-automator.js';
import * as browser from './server/browser.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 5173;

const app = express();
app.use(express.json());

// SSE clients
const sseClients = new Set();

function broadcastSSE(event, data) {
  const msg = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const client of sseClients) {
    client.write(msg);
  }
}

// Hook up the browser log callback
browser.setLogCallback((msg) => {
  const entry = { timestamp: new Date().toISOString(), event_type: 'browser', message: msg };
  broadcastSSE('log', entry);
  // Don't double-insert to DB since survey-automator already does it
});

// Serve static files from dist/
app.use(express.static(path.join(__dirname, 'dist')));

// SSE endpoint
app.get('/api/stream', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  });
  res.write('\n');

  sseClients.add(res);

  req.on('close', () => {
    sseClients.delete(res);
  });
});

// Get logs
app.get('/api/logs', (req, res) => {
  const limit = parseInt(req.query.limit) || 200;
  res.json(db.getLogs(limit));
});

// Get profiles
app.get('/api/profiles', (req, res) => {
  res.json(db.getProfiles());
});

// Save profile
app.post('/api/profiles', (req, res) => {
  const { name, content } = req.body;
  if (!name || !content) {
    return res.status(400).json({ error: 'Name and content required' });
  }
  const id = db.saveProfile(name, content);
  res.json({ id });
});

// Get providers
app.get('/api/providers', (req, res) => {
  res.json(getProviders());
});

// Start automation
app.post('/api/start', (req, res) => {
  const { command, persona, providers } = req.body;

  if (!command || !persona || !providers || providers.length === 0) {
    return res.status(400).json({ error: 'Command, persona, and at least one provider required' });
  }

  if (getRunning()) {
    return res.status(400).json({ error: 'Automation already running' });
  }

  // Save the profile
  db.saveProfile('current', persona);

  // Start in background
  startAutomation(command, providers, persona);

  res.json({ status: 'started' });
});

// Stop automation
app.post('/api/stop', (req, res) => {
  stopAutomation();
  res.json({ status: 'stopped' });
});

// Pause automation
app.post('/api/pause', (req, res) => {
  browser.setPaused(true);
  broadcastSSE('status', { running: getRunning(), paused: true });
  res.json({ status: 'paused' });
});

// Resume automation
app.post('/api/resume', (req, res) => {
  browser.setPaused(false);
  broadcastSSE('status', { running: getRunning(), paused: false });
  res.json({ status: 'resumed' });
});

// Status
app.get('/api/status', (req, res) => {
  res.json({
    running: getRunning(),
    paused: browser.getPaused(),
  });
});

// Serve index.html for all other routes (SPA)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
  db.addLog('system', 'Server started', { port: PORT });
});