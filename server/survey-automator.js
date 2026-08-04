import * as browser from './browser.js';
import { callWithFailover } from './llm-client.js';
import { addLog } from './database.js';

let isRunning = false;
let currentSessionId = null;
let providerConfigs = [];
let systemPrompt = '';

export function getRunning() {
  return isRunning;
}

export function setProviderConfigs(configs) {
  providerConfigs = configs;
}

export function setSystemPrompt(prompt) {
  systemPrompt = prompt;
}

/**
 * Build the prompt for the LLM given the current survey context
 */
function buildUserPrompt(questions, currentUrl) {
  let prompt = `I am taking an online survey. The current page URL is: ${currentUrl}\n\n`;

  if (questions.length === 0) {
    prompt += 'I cannot find any survey questions on this page. Please describe what you see and what I should do next.';
    return prompt;
  }

  prompt += `I found ${questions.length} question(s) on this page:\n\n`;

  questions.forEach((q, i) => {
    prompt += `Question ${i + 1}: ${q.title || '(untitled)'}\n`;
    prompt += `Type: ${q.type}\n`;

    if (q.options && q.options.length > 0) {
      prompt += 'Available options:\n';
      q.options.forEach((opt, j) => {
        prompt += `  ${j + 1}. ${opt.text || opt.value}\n`;
      });
    }

    if (q.placeholder) {
      prompt += `Placeholder: ${q.placeholder}\n`;
    }

    prompt += '\n';
  });

  prompt += '\n\nFor each question, choose the best answer that matches my persona. ';
  prompt += 'If the persona does not contain enough information, choose the first available option.';
  prompt += '\n\nRespond with a JSON object like this:\n';
  prompt += '{\n';
  prompt += '  "answers": [\n';
  prompt += '    { "questionIndex": 0, "answer": "option text or value" },\n';
  prompt += '    { "questionIndex": 1, "answer": "typed response" }\n';
  prompt += '  ],\n';
  prompt += '  "explanation": "Brief reasoning for the choices"\n';
  prompt += '}\n';

  return prompt;
}

/**
 * Try to parse the LLM response as JSON answers
 */
function parseAnswers(llmResponse) {
  try {
    // Try direct JSON parse
    const parsed = JSON.parse(llmResponse);
    if (parsed.answers && Array.isArray(parsed.answers)) {
      return parsed.answers;
    }
    return null;
  } catch (e) {
    // Try to extract JSON from the response
    const jsonMatch = llmResponse.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        if (parsed.answers && Array.isArray(parsed.answers)) {
          return parsed.answers;
        }
      } catch (e2) {
        return null;
      }
    }
    return null;
  }
}

/**
 * Run a single survey on the given URL
 */
async function runSurvey(url) {
  await browser.navigate(url);
  addLog('navigation', `Navigated to survey URL`, { url });

  let pageCount = 0;
  const maxPages = 100; // Safety limit

  while (pageCount < maxPages) {
    // Check if paused
    if (browser.getPaused()) {
      addLog('pause', 'Automation paused by user');
      // Wait while paused
      while (browser.getPaused()) {
        await new Promise(r => setTimeout(r, 500));
      }
      addLog('resume', 'Automation resumed');
    }

    // Check if survey is complete
    const isComplete = await browser.isSurveyComplete();
    if (isComplete) {
      addLog('complete', 'Survey appears to be complete');
      break;
    }

    // Wait for content to load
    await browser.waitForContent(1500);

    // Extract questions
    const questions = await browser.extractSurveyQuestions();
    addLog('extract', `Extracted ${questions.length} question(s) from page ${pageCount + 1}`, {
      url: await browser.getCurrentUrl(),
      count: questions.length,
      types: questions.map(q => q.type),
    });

    if (questions.length === 0) {
      // Try to click next anyway
      const clicked = await browser.clickNextButton();
      if (clicked) {
        addLog('navigate', 'Clicked next button (no questions found)');
        pageCount++;
        continue;
      } else {
        addLog('warning', 'No questions found and no next button. Survey may be complete.');
        break;
      }
    }

    // Ask LLM for answers
    const currentUrl = await browser.getCurrentUrl();
    const userPrompt = buildUserPrompt(questions, currentUrl);

    addLog('llm-request', 'Sending questions to LLM for answers', {
      providerCount: providerConfigs.length,
      firstProvider: providerConfigs[0]?.providerId,
    });

    const onFailover = (config, error) => {
      addLog('llm-failover', `Provider ${config.providerId} failed: ${error}`, { config });
    };

    const result = await callWithFailover(providerConfigs, systemPrompt, userPrompt, onFailover);

    if (!result.text) {
      addLog('error', 'All LLM providers failed', { error: result.error });
      break;
    }

    addLog('llm-response', `Got response from ${result.used.providerId}`, {
      provider: result.used.providerId,
      model: result.used.model,
    });

    // Parse answers
    const answers = parseAnswers(result.text);

    if (!answers) {
      addLog('warning', 'Could not parse LLM response as JSON, trying raw text', {
        response: result.text.slice(0, 200),
      });
      // Try to answer with the raw text for the first question
      if (questions.length > 0) {
        await browser.answerQuestion(questions[0], result.text.slice(0, 100));
        addLog('answer', `Answered question 0 with raw text`);
      }
    } else {
      // Apply answers
      for (const ans of answers) {
        const q = questions[ans.questionIndex];
        if (q) {
          await browser.answerQuestion(q, ans.answer);
          addLog('answer', `Answered question ${ans.questionIndex}: ${ans.answer}`, {
            question: q.title?.slice(0, 100),
          });
        }
      }

      // Wait a moment for any animations
      await new Promise(r => setTimeout(r, 500));
    }

    // Try to click next / submit
    const clicked = await browser.clickNextButton();
    if (clicked) {
      addLog('navigate', `Clicked next button, page ${pageCount + 1} complete`);
      pageCount++;
    } else {
      addLog('warning', 'Could not find next button. Survey may be complete or unexpected layout.');
      // Check one more time if survey is complete
      const complete = await browser.isSurveyComplete();
      if (complete) {
        break;
      }
      // If not complete and no next button, try to wait and check again
      await browser.waitForContent(3000);
      const retryClicked = await browser.clickNextButton();
      if (!retryClicked) {
        addLog('error', 'No next button found after retry');
        break;
      }
      pageCount++;
    }
  }

  addLog('complete', `Survey finished after ${pageCount} page(s)`);
}

/**
 * Main automation loop - runs the command and processes surveys
 * @param {string} command - the user's natural language command
 * @param {Array} providers - array of provider configs
 * @param {string} persona - the persona profile text
 */
export async function startAutomation(command, providers, persona) {
  if (isRunning) {
    addLog('error', 'Automation is already running');
    return;
  }

  isRunning = true;
  providerConfigs = providers;
  systemPrompt = persona;

  addLog('start', 'Automation started', { command, providers: providers.map(p => p.providerId) });

  try {
    // Launch the browser
    await browser.launchBrowser();

    // Try to figure out the first action from the command
    // For now, parse the command for URLs and actions
    const urlMatch = command.match(/https?:\/\/[^\s]+/);
    const searchMatch = command.match(/search\s+(\S+(?:\s+\S+)*)/i);
    const googleMatch = command.match(/google\s+(\S+(?:\s+\S+)*)/i);

    if (urlMatch) {
      // Direct URL provided
      await runSurvey(urlMatch[0]);
    } else if (searchMatch || googleMatch) {
      const query = (searchMatch || googleMatch)[1];
      addLog('search', `Searching Google for: ${query}`);
      await browser.navigate(`https://www.google.com/search?q=${encodeURIComponent(query)}`);
      await browser.waitForContent(2000);

      // Check if we need to pause for login
      if (await browser.hasLoginForm()) {
        addLog('pause', 'Login form detected - pausing for manual login');
        browser.setPaused(true);
        // Wait for user to resume
        while (browser.getPaused()) {
          await new Promise(r => setTimeout(r, 500));
        }
      }

      // Look for survey links in the results
      const p = await browser.getPage();
      const surveyLinks = await p.evaluate(() => {
        const links = Array.from(document.querySelectorAll('a[href*="survey"], a[href*="opinion"], a[href*="poll"], a[href*="research"]'));
        return links.slice(0, 3).map(a => ({
          text: a.textContent?.trim(),
          href: a.href,
        }));
      });

      if (surveyLinks.length > 0) {
        for (const link of surveyLinks) {
          if (!isRunning) break;
          addLog('survey', `Found survey link: ${link.text}`, { url: link.href });
          await runSurvey(link.href);
        }
      } else {
        addLog('warning', 'No survey links found in search results');
      }
    } else {
      // Generic command - try to interpret as a search
      addLog('search', `Interpreting command as search: ${command}`);
      await browser.navigate(`https://www.google.com/search?q=${encodeURIComponent(command + ' survey')}`);
      await browser.waitForContent(2000);
      const p = await browser.getPage();
      const links = await p.evaluate(() => {
        return Array.from(document.querySelectorAll('a[href*="survey"], a[href*="opinion"], a[href*="poll"]'))
          .slice(0, 3)
          .map(a => ({ text: a.textContent?.trim(), href: a.href }));
      });
      if (links.length > 0) {
        for (const link of links) {
          if (!isRunning) break;
          addLog('survey', `Found survey link: ${link.text}`, { url: link.href });
          await runSurvey(link.href);
        }
      }
    }
  } catch (err) {
    addLog('error', `Automation error: ${err.message}`, { stack: err.stack?.slice(0, 500) });
  } finally {
    isRunning = false;
    addLog('stop', 'Automation stopped');
  }
}

export function stopAutomation() {
  isRunning = false;
  addLog('stop', 'Automation stopped by user');
}