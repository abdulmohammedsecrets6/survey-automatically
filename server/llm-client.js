// LLM providers configuration
// Each provider has: baseUrl, defaultModel, authHeader (how to set Authorization)
// All use OpenAI-compatible /v1/chat/completions endpoint

const PROVIDERS = {
  'openai': {
    name: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1',
    defaultModel: 'gpt-4o-mini',
    models: ['gpt-4o-mini', 'gpt-4o', 'gpt-4', 'gpt-3.5-turbo'],
  },
  'groq': {
    name: 'Groq Cloud',
    baseUrl: 'https://api.groq.com/openai/v1',
    defaultModel: 'llama-3.3-70b-versatile',
    models: ['llama-3.3-70b-versatile', 'llama3-70b-8192', 'mixtral-8x7b-32768', 'gemma2-9b-it'],
  },
  'google': {
    name: 'Google AI Studio (Gemini)',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
    defaultModel: 'gemini-2.0-flash',
    models: ['gemini-2.0-flash', 'gemini-1.5-pro', 'gemini-1.5-flash'],
  },
  'together': {
    name: 'Together AI',
    baseUrl: 'https://api.together.xyz/v1',
    defaultModel: 'meta-llama/Llama-3.3-70B-Instruct-Turbo',
    models: ['meta-llama/Llama-3.3-70B-Instruct-Turbo', 'mistralai/Mixtral-8x7B-Instruct-v0.1', 'Qwen/Qwen2.5-72B-Instruct-Turbo'],
  },
  'deepinfra': {
    name: 'DeepInfra',
    baseUrl: 'https://api.deepinfra.com/v1/openai',
    defaultModel: 'meta-llama/Meta-Llama-3.1-70B-Instruct',
    models: ['meta-llama/Meta-Llama-3.1-70B-Instruct', 'mistralai/Mixtral-8x22B-Instruct-v0.1', 'Qwen/Qwen2.5-72B-Instruct'],
  },
  'fireworks': {
    name: 'Fireworks AI',
    baseUrl: 'https://api.fireworks.ai/inference/v1',
    defaultModel: 'accounts/fireworks/models/llama-v3p3-70b-instruct',
    models: ['accounts/fireworks/models/llama-v3p3-70b-instruct', 'accounts/fireworks/models/mixtral-8x22b-instruct', 'accounts/fireworks/models/qwen2p5-72b-instruct'],
  },
  'sambanova': {
    name: 'SambaNova',
    baseUrl: 'https://api.sambanova.ai/v1',
    defaultModel: 'Meta-Llama-3.3-70B-Instruct',
    models: ['Meta-Llama-3.3-70B-Instruct', 'Meta-Llama-3.1-70B-Instruct', 'Mixtral-8x7B-Instruct-v0.1'],
  },
  'perplexity': {
    name: 'Perplexity API',
    baseUrl: 'https://api.perplexity.ai',
    defaultModel: 'sonar-pro',
    models: ['sonar-pro', 'sonar', 'sonar-reasoning-pro', 'sonar-reasoning'],
  },
  'mistral': {
    name: 'Mistral AI',
    baseUrl: 'https://api.mistral.ai/v1',
    defaultModel: 'mistral-large-latest',
    models: ['mistral-large-latest', 'open-mistral-nemo', 'mistral-small-latest', 'codestral-latest'],
  },
  'cerebras': {
    name: 'Cerebras',
    baseUrl: 'https://api.cerebras.ai/v1',
    defaultModel: 'llama3.1-70b',
    models: ['llama3.1-70b', 'llama-3.3-70b'],
  },
  'nvidia': {
    name: 'NVIDIA NIM',
    baseUrl: 'https://integrate.api.nvidia.com/v1',
    defaultModel: 'meta/llama-3.3-70b-instruct',
    models: ['meta/llama-3.3-70b-instruct', 'mistralai/mixtral-8x22b-instruct-v0.1'],
  },
  'custom': {
    name: 'Custom',
    baseUrl: '',
    defaultModel: '',
    models: [],
  },
};

export function getProviders() {
  return Object.entries(PROVIDERS).map(([key, p]) => ({
    id: key,
    name: p.name,
    defaultModel: p.defaultModel,
    models: p.models,
    hasBaseUrl: key === 'custom',
  }));
}

export function getProvider(providerId) {
  return PROVIDERS[providerId] || null;
}

/**
 * Call an LLM provider with the given parameters
 * @param {string} providerId - provider key
 * @param {string} apiKey - API key
 * @param {string} model - model name
 * @param {string} systemPrompt - system prompt (persona)
 * @param {string} userPrompt - the question/context
 * @param {string} customBaseUrl - for custom provider
 * @returns {Promise<{text: string, error: string|null}>}
 */
export async function callLLM(providerId, apiKey, model, systemPrompt, userPrompt, customBaseUrl = '') {
  const provider = PROVIDERS[providerId];
  if (!provider && providerId !== 'custom') {
    return { text: null, error: `Unknown provider: ${providerId}` };
  }

  const baseUrl = providerId === 'custom' ? customBaseUrl : provider.baseUrl;
  if (!baseUrl) {
    return { text: null, error: 'Base URL is required for custom provider' };
  }

  const url = `${baseUrl.replace(/\/+$/, '')}/chat/completions`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: model || provider?.defaultModel || '',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 1024,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => '');
      return {
        text: null,
        error: `HTTP ${response.status}: ${response.statusText}${errorBody ? ' - ' + errorBody.slice(0, 200) : ''}`,
      };
    }

    const data = await response.json();

    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      return { text: null, error: 'Unexpected API response format' };
    }

    return { text: data.choices[0].message.content.trim(), error: null };
  } catch (err) {
    return { text: null, error: err.message || 'Network error' };
  }
}

/**
 * Try multiple providers in order until one succeeds
 * @param {Array} providerConfigs - [{providerId, apiKey, model, customBaseUrl}]
 * @param {string} systemPrompt
 * @param {string} userPrompt
 * @param {function} onFailover - callback when a provider fails
 * @returns {Promise<{text: string, used: object, error: string|null}>}
 */
export async function callWithFailover(providerConfigs, systemPrompt, userPrompt, onFailover = null) {
  for (const config of providerConfigs) {
    const result = await callLLM(
      config.providerId,
      config.apiKey,
      config.model,
      systemPrompt,
      userPrompt,
      config.customBaseUrl,
    );

    if (result.text) {
      return {
        text: result.text,
        used: config,
        error: null,
      };
    }

    if (onFailover) {
      onFailover(config, result.error);
    }
  }

  return {
    text: null,
    used: providerConfigs[providerConfigs.length - 1],
    error: 'All providers failed',
  };
}