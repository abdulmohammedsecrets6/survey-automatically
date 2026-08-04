import React, { useState, useEffect, useRef, useCallback } from 'react';

// Provider definitions pre-configured
const PROVIDER_PRESETS: Record<string, { name: string; baseUrl: string; defaultModel: string; models: string[] }> = {
  openai: { name: 'OpenAI', baseUrl: 'https://api.openai.com/v1', defaultModel: 'gpt-4o-mini', models: ['gpt-4o-mini', 'gpt-4o', 'gpt-4', 'gpt-3.5-turbo'] },
  groq: { name: 'Groq Cloud', baseUrl: 'https://api.groq.com/openai/v1', defaultModel: 'llama-3.3-70b-versatile', models: ['llama-3.3-70b-versatile', 'llama3-70b-8192', 'mixtral-8x7b-32768', 'gemma2-9b-it'] },
  google: { name: 'Google AI Studio (Gemini)', baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai', defaultModel: 'gemini-2.0-flash', models: ['gemini-2.0-flash', 'gemini-1.5-pro', 'gemini-1.5-flash'] },
  together: { name: 'Together AI', baseUrl: 'https://api.together.xyz/v1', defaultModel: 'meta-llama/Llama-3.3-70B-Instruct-Turbo', models: ['meta-llama/Llama-3.3-70B-Instruct-Turbo', 'mistralai/Mixtral-8x7B-Instruct-v0.1', 'Qwen/Qwen2.5-72B-Instruct-Turbo'] },
  deepinfra: { name: 'DeepInfra', baseUrl: 'https://api.deepinfra.com/v1/openai', defaultModel: 'meta-llama/Meta-Llama-3.1-70B-Instruct', models: ['meta-llama/Meta-Llama-3.1-70B-Instruct', 'mistralai/Mixtral-8x22B-Instruct-v0.1', 'Qwen/Qwen2.5-72B-Instruct'] },
  fireworks: { name: 'Fireworks AI', baseUrl: 'https://api.fireworks.ai/inference/v1', defaultModel: 'accounts/fireworks/models/llama-v3p3-70b-instruct', models: ['accounts/fireworks/models/llama-v3p3-70b-instruct', 'accounts/fireworks/models/mixtral-8x22b-instruct', 'accounts/fireworks/models/qwen2p5-72b-instruct'] },
  sambanova: { name: 'SambaNova', baseUrl: 'https://api.sambanova.ai/v1', defaultModel: 'Meta-Llama-3.3-70B-Instruct', models: ['Meta-Llama-3.3-70B-Instruct', 'Meta-Llama-3.1-70B-Instruct', 'Mixtral-8x7B-Instruct-v0.1'] },
  perplexity: { name: 'Perplexity API', baseUrl: 'https://api.perplexity.ai', defaultModel: 'sonar-pro', models: ['sonar-pro', 'sonar', 'sonar-reasoning-pro', 'sonar-reasoning'] },
  mistral: { name: 'Mistral AI', baseUrl: 'https://api.mistral.ai/v1', defaultModel: 'mistral-large-latest', models: ['mistral-large-latest', 'open-mistral-nemo', 'mistral-small-latest'] },
  cerebras: { name: 'Cerebras', baseUrl: 'https://api.cerebras.ai/v1', defaultModel: 'llama3.1-70b', models: ['llama3.1-70b', 'llama-3.3-70b'] },
  nvidia: { name: 'NVIDIA NIM', baseUrl: 'https://integrate.api.nvidia.com/v1', defaultModel: 'meta/llama-3.3-70b-instruct', models: ['meta/llama-3.3-70b-instruct', 'mistralai/mixtral-8x22b-instruct-v0.1'] },
};

interface ProviderConfig {
  id: string;
  providerId: string;
  apiKey: string;
  model: string;
  customBaseUrl: string;
  enabled: boolean;
}

interface LogEntry {
  id: number;
  timestamp: string;
  event_type: string;
  message: string;
  details: string | null;
}

export default function App() {
  const [command, setCommand] = useState(() => localStorage.getItem('command') || 'Search paid surveys, sign up, then do as many as possible');
  const [persona, setPersona] = useState(() => localStorage.getItem('persona') || `Name: Ken Davidson
Age: 37
Occupation: Bioengineer
Annual income: $50,000+
Company size: 2,000 employees
Education: PhD in Bioengineering
Hobbies: Hiking, reading sci-fi, cooking
Family: Married, 2 kids (ages 5 and 8)
Shopping: Online mostly, Amazon Prime member
Technology: iPhone user, Windows laptop, owns a tablet`);
  const [providerConfigs, setProviderConfigs] = useState<ProviderConfig[]>(() => {
    try {
      const saved = localStorage.getItem('providers');
      if (saved) return JSON.parse(saved);
    } catch {}
    return Object.entries(PROVIDER_PRESETS).map(([id, p]) => ({
      id: `${id}-0`,
      providerId: id,
      apiKey: '',
      model: p.defaultModel,
      customBaseUrl: '',
      enabled: false,
    }));
  });

  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [status, setStatus] = useState({ running: false, paused: false });
  const logRef = useRef<HTMLDivElement>(null);

  // Persist to localStorage
  useEffect(() => { localStorage.setItem('command', command); }, [command]);
  useEffect(() => { localStorage.setItem('persona', persona); }, [persona]);
  useEffect(() => { localStorage.setItem('providers', JSON.stringify(providerConfigs)); }, [providerConfigs]);

  // SSE log stream
  useEffect(() => {
    const es = new EventSource('/api/stream');
    es.addEventListener('log', (e) => {
      const entry = JSON.parse(e.data);
      setLogs(prev => {
        const next = [...prev, entry];
        if (next.length > 500) return next.slice(-300);
        return next;
      });
    });
    es.addEventListener('status', (e) => {
      setStatus(JSON.parse(e.data));
    });
    es.onerror = () => {
      // Reconnect automatically
    };
    return () => es.close();
  }, []);

  // Load initial logs and status
  useEffect(() => {
    fetch('/api/logs').then(r => r.json()).then(setLogs).catch(() => {});
    fetch('/api/status').then(r => r.json()).then(setStatus).catch(() => {});
  }, []);

  // Auto-scroll log
  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [logs]);

  const addProvider = useCallback(() => {
    const newId = `custom-${Date.now()}`;
    setProviderConfigs(prev => [...prev, {
      id: newId,
      providerId: 'custom',
      apiKey: '',
      model: '',
      customBaseUrl: '',
      enabled: false,
    }]);
  }, []);

  const updateProvider = useCallback((id: string, updates: Partial<ProviderConfig>) => {
    setProviderConfigs(prev => prev.map(p => {
      if (p.id !== id) return p;
      const updated = { ...p, ...updates };
      // Auto-set model and base URL when switching provider type
      if (updates.providerId && updates.providerId !== 'custom') {
        const preset = PROVIDER_PRESETS[updates.providerId];
        if (preset) {
          updated.model = preset.defaultModel;
          updated.customBaseUrl = '';
        }
      }
      return updated;
    }));
  }, []);

  const removeProvider = useCallback((id: string) => {
    setProviderConfigs(prev => prev.filter(p => p.id !== id));
  }, []);

  const startSurvey = useCallback(async () => {
    const enabledProviders = providerConfigs.filter(p => p.enabled && p.apiKey);
    if (enabledProviders.length === 0) {
      alert('Enable at least one provider and enter its API key');
      return;
    }
    if (!command.trim()) {
      alert('Enter a command');
      return;
    }
    if (!persona.trim()) {
      alert('Enter a persona profile');
      return;
    }

    const configs = enabledProviders.map(p => ({
      providerId: p.providerId,
      apiKey: p.apiKey,
      model: p.model,
      customBaseUrl: p.customBaseUrl,
    }));

    const res = await fetch('/api/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ command: command.trim(), persona: persona.trim(), providers: configs }),
    });
    const data = await res.json();
    if (data.error) alert(data.error);
  }, [command, persona, providerConfigs]);

  const stopSurvey = useCallback(async () => {
    await fetch('/api/stop', { method: 'POST' });
  }, []);

  const pauseSurvey = useCallback(async () => {
    await fetch('/api/pause', { method: 'POST' });
  }, []);

  const resumeSurvey = useCallback(async () => {
    await fetch('/api/resume', { method: 'POST' });
  }, []);

  const eventColor = (type: string) => {
    switch (type) {
      case 'error': return '#ff6b6b';
      case 'warning': return '#ffd93d';
      case 'complete': return '#6bcb77';
      case 'answer': return '#4d96ff';
      case 'navigate': return '#c084fc';
      case 'llm-request':
      case 'llm-response': return '#67e8f9';
      case 'llm-failover': return '#f97316';
      default: return '#94a3b8';
    }
  };

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      {/* Left Panel - Controls */}
      <div style={{
        width: '420px', minWidth: '420px', display: 'flex', flexDirection: 'column',
        borderRight: '1px solid #2d2d4a', background: '#16162a', overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          padding: '16px 20px', borderBottom: '1px solid #2d2d4a',
          background: 'linear-gradient(135deg, #1e1e3a, #16162a)',
        }}>
          <h1 style={{ fontSize: '18px', fontWeight: 700, color: '#e0e0ff', marginBottom: '2px' }}>
            Survey Automator
          </h1>
          <div style={{ fontSize: '12px', color: '#8888aa' }}>
            {status.running
              ? (status.paused ? '⏸ Paused' : '▶ Running')
              : '⬤ Idle'}
          </div>
        </div>

        {/* Command */}
        <div style={{ padding: '12px 16px', borderBottom: '1px solid #2d2d4a' }}>
          <label style={{ fontSize: '12px', fontWeight: 600, color: '#aaaacc', marginBottom: '6px', display: 'block' }}>
            Command
          </label>
          <input
            value={command}
            onChange={e => setCommand(e.target.value)}
            placeholder="e.g., Search paid surveys, sign up, then do as many as possible"
            style={{
              width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #3d3d5c',
              background: '#1a1a30', color: '#e0e0e0', fontSize: '13px',
              outline: 'none',
            }}
          />
        </div>

        {/* Persona */}
        <div style={{ padding: '12px 16px', borderBottom: '1px solid #2d2d4a', flex: '0 0 auto' }}>
          <label style={{ fontSize: '12px', fontWeight: 600, color: '#aaaacc', marginBottom: '6px', display: 'block' }}>
            Fictional Persona Profile
          </label>
          <textarea
            value={persona}
            onChange={e => setPersona(e.target.value)}
            placeholder="Describe the fictional person..."
            rows={6}
            style={{
              width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #3d3d5c',
              background: '#1a1a30', color: '#e0e0e0', fontSize: '12px', resize: 'vertical',
              outline: 'none', fontFamily: 'monospace', lineHeight: '1.5',
            }}
          />
        </div>

        {/* API Keys */}
        <div style={{ flex: 1, overflow: 'auto', padding: '12px 16px', borderBottom: '1px solid #2d2d4a' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <label style={{ fontSize: '12px', fontWeight: 600, color: '#aaaacc' }}>API Keys</label>
            <button onClick={addProvider} style={{
              padding: '3px 10px', borderRadius: '4px', border: '1px solid #3d3d5c',
              background: '#1a1a30', color: '#aaaacc', cursor: 'pointer', fontSize: '11px',
            }}>+ Add</button>
          </div>
          {providerConfigs.map((cfg, idx) => (
            <div key={cfg.id} style={{
              padding: '10px', marginBottom: '8px', borderRadius: '8px',
              border: '1px solid #2d2d4a', background: '#1e1e36',
            }}>
              <div style={{ display: 'flex', gap: '6px', marginBottom: '6px', alignItems: 'center' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', fontSize: '11px' }}>
                  <input type="checkbox" checked={cfg.enabled}
                    onChange={e => updateProvider(cfg.id, { enabled: e.target.checked })}
                    style={{ accentColor: '#4d96ff' }} />
                  On
                </label>
                <select
                  value={cfg.providerId}
                  onChange={e => updateProvider(cfg.id, { providerId: e.target.value })}
                  style={{
                    flex: 1, padding: '4px 6px', borderRadius: '4px', border: '1px solid #3d3d5c',
                    background: '#16162a', color: '#e0e0e0', fontSize: '11px', outline: 'none',
                  }}>
                  <option value="">-- Select Provider --</option>
                  {Object.entries(PROVIDER_PRESETS).map(([k, v]) => (
                    <option key={k} value={k}>{v.name}</option>
                  ))}
                  <option value="custom">Custom</option>
                </select>
                <button onClick={() => removeProvider(cfg.id)} title="Remove"
                  style={{
                    padding: '2px 6px', borderRadius: '4px', border: 'none',
                    background: 'transparent', color: '#ff6b6b', cursor: 'pointer', fontSize: '14px',
                  }}>×</button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <input
                  type="password"
                  value={cfg.apiKey}
                  onChange={e => updateProvider(cfg.id, { apiKey: e.target.value })}
                  placeholder="API Key"
                  style={{
                    width: '100%', padding: '5px 8px', borderRadius: '4px', border: '1px solid #3d3d5c',
                    background: '#16162a', color: '#e0e0e0', fontSize: '11px', outline: 'none',
                  }} />
                <div style={{ display: 'flex', gap: '4px' }}>
                  {cfg.providerId === 'custom' ? (
                    <input
                      value={cfg.customBaseUrl}
                      onChange={e => updateProvider(cfg.id, { customBaseUrl: e.target.value })}
                      placeholder="Base URL"
                      style={{
                        flex: 1, padding: '5px 8px', borderRadius: '4px', border: '1px solid #3d3d5c',
                        background: '#16162a', color: '#e0e0e0', fontSize: '11px', outline: 'none',
                      }} />
                  ) : null}
                  <input
                    value={cfg.model}
                    onChange={e => updateProvider(cfg.id, { model: e.target.value })}
                    placeholder="Model"
                    list={cfg.providerId !== 'custom' ? `models-${cfg.id}` : undefined}
                    style={{
                      flex: 1, padding: '5px 8px', borderRadius: '4px', border: '1px solid #3d3d5c',
                      background: '#16162a', color: '#e0e0e0', fontSize: '11px', outline: 'none',
                    }} />
                  {cfg.providerId !== 'custom' && PROVIDER_PRESETS[cfg.providerId] && (
                    <datalist id={`models-${cfg.id}`}>
                      {PROVIDER_PRESETS[cfg.providerId].models.map(m => (
                        <option key={m} value={m} />
                      ))}
                    </datalist>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Action Buttons */}
        <div style={{ padding: '12px 16px', display: 'flex', gap: '8px' }}>
          {!status.running ? (
            <button onClick={startSurvey} style={{
              flex: 1, padding: '10px', borderRadius: '8px', border: 'none',
              background: 'linear-gradient(135deg, #4d96ff, #6c5ce7)', color: '#fff',
              fontSize: '14px', fontWeight: 600, cursor: 'pointer',
            }}>
              ▶ Start
            </button>
          ) : (
            <>
              {status.paused ? (
                <button onClick={resumeSurvey} style={{
                  flex: 1, padding: '10px', borderRadius: '8px', border: 'none',
                  background: 'linear-gradient(135deg, #6bcb77, #4d96ff)', color: '#fff',
                  fontSize: '14px', fontWeight: 600, cursor: 'pointer',
                }}>▶ Resume</button>
              ) : (
                <button onClick={pauseSurvey} style={{
                  flex: 1, padding: '10px', borderRadius: '8px', border: 'none',
                  background: 'linear-gradient(135deg, #ffd93d, #f97316)', color: '#1a1a2e',
                  fontSize: '14px', fontWeight: 600, cursor: 'pointer',
                }}>⏸ Pause</button>
              )}
              <button onClick={stopSurvey} style={{
                flex: 1, padding: '10px', borderRadius: '8px', border: 'none',
                background: 'linear-gradient(135deg, #ff6b6b, #f97316)', color: '#fff',
                fontSize: '14px', fontWeight: 600, cursor: 'pointer',
              }}>⬛ Stop</button>
            </>
          )}
        </div>
      </div>

      {/* Right Panel - Live Log */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#1a1a2e' }}>
        <div style={{
          padding: '12px 20px', borderBottom: '1px solid #2d2d4a',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <h2 style={{ fontSize: '14px', fontWeight: 600, color: '#aaaacc' }}>Live Change Log</h2>
          <span style={{ fontSize: '11px', color: '#666688' }}>{logs.length} entries</span>
        </div>
        <div ref={logRef} style={{
          flex: 1, overflow: 'auto', padding: '12px 20px',
          fontFamily: 'monospace', fontSize: '12px', lineHeight: '1.6',
        }}>
          {logs.length === 0 && (
            <div style={{ color: '#555577', textAlign: 'center', paddingTop: '40px' }}>
              Waiting for automation to start...
            </div>
          )}
          {logs.map((entry, i) => (
            <div key={entry.id || i} style={{ marginBottom: '2px' }}>
              <span style={{ color: '#555577' }}>
                {new Date(entry.timestamp).toLocaleTimeString()}
              </span>{' '}
              <span style={{
                color: eventColor(entry.event_type),
                fontWeight: entry.event_type === 'error' ? 700 : 400,
              }}>
                [{entry.event_type}]
              </span>{' '}
              <span style={{ color: '#ccccdd' }}>{entry.message}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}