import puppeteer from 'puppeteer';

let browser = null;
let page = null;
let isPaused = false;
let logCallback = null;

const CHROMIUM_PATH = process.env.CHROMIUM_PATH || null;

export function setLogCallback(cb) {
  logCallback = cb;
}

function log(msg) {
  if (logCallback) logCallback(msg);
}

export function setPaused(val) {
  isPaused = val;
}

export function getPaused() {
  return isPaused;
}

export async function launchBrowser() {
  if (browser) return browser;

  const launchArgs = [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-gpu',
    '--single-process',
    '--no-zygote',
    '--disable-extensions',
    '--disable-background-networking',
    '--disable-sync',
    '--disable-translate',
    '--hide-scrollbars',
    '--mute-audio',
    '--no-first-run',
  ];

  try {
    browser = await puppeteer.launch({
      executablePath: CHROMIUM_PATH,
      args: launchArgs,
      headless: true,
      dumpio: true,
    });

    log('Browser launched successfully');
    return browser;
  } catch (err) {
    log(`Failed to launch browser: ${err.message}`);
    throw err;
  }
}

export async function getPage() {
  if (!browser) await launchBrowser();
  if (!page || page.isClosed()) {
    page = await browser.newPage();
    // Set a reasonable viewport
    await page.setViewport({ width: 1280, height: 800 });
    // Set user agent to avoid detection
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );
  }
  return page;
}

export async function navigate(url) {
  const p = await getPage();
  log(`Navigating to: ${url}`);
  await p.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
  log(`Page loaded: ${p.url()}`);
  return p.url();
}

export async function getPageContent() {
  const p = await getPage();
  const content = await p.content();
  return content;
}

/**
 * Extract survey questions and answers from the page
 * Returns an array of question objects with title, type, and options
 */
export async function extractSurveyQuestions() {
  const p = await getPage();

  const questions = await p.evaluate(() => {
    const results = [];

    // Find all form elements that look like survey questions
    // Common patterns: labels, fieldsets, divs with question text
    const questionElements = document.querySelectorAll(
      '[role="group"], fieldset, .question, .survey-question, [class*="question"], [class*="Question"], ' +
      '.choice, .field, .form-group, .mc-question, li.question'
    );

    if (questionElements.length === 0) {
      // Fallback: find any radio/checkbox groups
      const radioGroups = new Set();
      document.querySelectorAll('input[type="radio"][name]').forEach(el => {
        radioGroups.add(el.getAttribute('name'));
      });
      const checkboxGroups = new Set();
      document.querySelectorAll('input[type="checkbox"][name]').forEach(el => {
        checkboxGroups.add(el.getAttribute('name'));
      });

      // For each radio group, find the question text
      radioGroups.forEach(name => {
        const radios = document.querySelectorAll(`input[type="radio"][name="${name}"]`);
        const labels = [];
        radios.forEach(radio => {
          const label = document.querySelector(`label[for="${radio.id}"]`);
          const parent = radio.closest('label');
          const text = label ? label.textContent.trim() :
                       parent ? parent.textContent.trim() :
                       radio.parentElement ? radio.parentElement.textContent.trim() : '';
          if (text) labels.push({ value: radio.value, text });
        });

        // Find question text (look above the radio group)
        const container = radios[0]?.closest('fieldset, div, li');
        const title = container
          ? (container.querySelector('legend, .question-text, label, span')?.textContent?.trim() || '')
          : '';

        results.push({
          type: 'radio',
          title: title || 'Select one',
          options: labels,
          name: name,
        });
      });

      checkboxGroups.forEach(name => {
        const checkboxes = document.querySelectorAll(`input[type="checkbox"][name="${name}"]`);
        const labels = [];
        checkboxes.forEach(cb => {
          const label = document.querySelector(`label[for="${cb.id}"]`);
          const parent = cb.closest('label');
          const text = label ? label.textContent.trim() :
                       parent ? parent.textContent.trim() :
                       cb.parentElement ? cb.parentElement.textContent.trim() : '';
          if (text) labels.push({ value: cb.value, text });
        });

        const container = checkboxes[0]?.closest('fieldset, div, li');
        const title = container
          ? (container.querySelector('legend, .question-text, label, span')?.textContent?.trim() || '')
          : '';

        results.push({
          type: 'checkbox',
          title: title || 'Select all that apply',
          options: labels,
          name: name,
        });
      });
    }

    // Process found question elements
    questionElements.forEach((el) => {
      const title = el.querySelector('legend, .question-text, .label, label, span')?.textContent?.trim() ||
                    el.getAttribute('aria-label') || '';

      // Check for radio buttons
      const radios = el.querySelectorAll('input[type="radio"]');
      if (radios.length > 0) {
        const options = [];
        radios.forEach(radio => {
          const label = el.querySelector(`label[for="${radio.id}"]`);
          const parent = radio.closest('label');
          const text = label?.textContent?.trim() ||
                       parent?.textContent?.trim() ||
                       radio.parentElement?.textContent?.trim() ||
                       '';
          options.push({ value: radio.value, text });
        });
        results.push({ type: 'radio', title, options, name: radios[0]?.name });
        return;
      }

      // Check for checkboxes
      const checkboxes = el.querySelectorAll('input[type="checkbox"]');
      if (checkboxes.length > 0) {
        const options = [];
        checkboxes.forEach(cb => {
          const label = el.querySelector(`label[for="${cb.id}"]`);
          const parent = cb.closest('label');
          const text = label?.textContent?.trim() ||
                       parent?.textContent?.trim() ||
                       cb.parentElement?.textContent?.trim() ||
                       '';
          options.push({ value: cb.value, text });
        });
        results.push({ type: 'checkbox', title, options, name: checkboxes[0]?.name });
        return;
      }

      // Check for select dropdowns
      const selects = el.querySelectorAll('select');
      selects.forEach(select => {
        const options = [];
        select.querySelectorAll('option').forEach(opt => {
          if (opt.value) options.push({ value: opt.value, text: opt.textContent.trim() });
        });
        results.push({
          type: 'select',
          title: title || select.getAttribute('aria-label') || '',
          options,
          name: select.name,
          id: select.id,
        });
      });

      // Check for text inputs
      const textInputs = el.querySelectorAll('input[type="text"], input:not([type]), textarea');
      textInputs.forEach(input => {
        results.push({
          type: 'text',
          title: title || input.getAttribute('aria-label') || input.placeholder || '',
          name: input.name,
          id: input.id,
          placeholder: input.placeholder || '',
        });
      });

      // Check for buttons that look like answer choices
      const buttons = el.querySelectorAll('button, [role="button"]');
      if (buttons.length > 0 && radios.length === 0 && checkboxes.length === 0) {
        const options = [];
        buttons.forEach(btn => {
          const text = btn.textContent?.trim() || '';
          if (text) options.push({ value: text, text });
        });
        if (options.length > 0) {
          results.push({ type: 'button', title, options });
        }
      }
    });

    return results;
  });

  return questions;
}

/**
 * Answer a survey question by interacting with the page
 */
export async function answerQuestion(question, answer) {
  const p = await getPage();

  switch (question.type) {
    case 'radio': {
      // Find and click the radio with matching text
      const clicked = await p.evaluate(({ name, answer }) => {
        const radios = document.querySelectorAll(`input[type="radio"][name="${name}"]`);
        for (const radio of radios) {
          const label = document.querySelector(`label[for="${radio.id}"]`);
          const parent = radio.closest('label');
          const text = label?.textContent?.trim() ||
                       parent?.textContent?.trim() ||
                       radio.parentElement?.textContent?.trim() || '';
          if (text.includes(answer) || answer.includes(text)) {
            radio.click();
            radio.dispatchEvent(new Event('change', { bubbles: true }));
            radio.dispatchEvent(new Event('input', { bubbles: true }));
            return true;
          }
        }
        // Click first option as fallback
        if (radios.length > 0) {
          radios[0].click();
          return true;
        }
        return false;
      }, { name: question.name, answer });
      return clicked;
    }

    case 'checkbox': {
      const answers = Array.isArray(answer) ? answer : [answer];
      const clicked = await p.evaluate(({ name, answers }) => {
        const checkboxes = document.querySelectorAll(`input[type="checkbox"][name="${name}"]`);
        let anyClicked = false;
        for (const cb of checkboxes) {
          const label = document.querySelector(`label[for="${cb.id}"]`);
          const parent = cb.closest('label');
          const text = label?.textContent?.trim() ||
                       parent?.textContent?.trim() ||
                       cb.parentElement?.textContent?.trim() || '';
          if (answers.some(a => text.includes(a) || a.includes(text))) {
            cb.click();
            cb.dispatchEvent(new Event('change', { bubbles: true }));
            anyClicked = true;
          }
        }
        return anyClicked;
      }, { name: question.name, answers });
      return clicked;
    }

    case 'select': {
      await p.select(question.name || question.id, answer);
      return true;
    }

    case 'text': {
      const input = question.id
        ? `#${CSS.escape(question.id)}`
        : question.name
          ? `textarea[name="${question.name}"], input[name="${question.name}"]`
          : 'textarea, input[type="text"], input:not([type])';
      await p.type(input, answer, { delay: 30 + Math.random() * 50 });
      return true;
    }

    case 'button': {
      const clicked = await p.evaluate((answer) => {
        const buttons = document.querySelectorAll('button, [role="button"]');
        for (const btn of buttons) {
          const text = btn.textContent?.trim() || '';
          if (text.includes(answer) || answer.includes(text)) {
            btn.click();
            return true;
          }
        }
        return false;
      }, answer);
      return clicked;
    }

    default:
      return false;
  }
}

/**
 * Click the "Next" or "Submit" button on the survey page
 */
export async function clickNextButton() {
  const p = await getPage();
  const clicked = await p.evaluate(() => {
    // Try common patterns for next/submit buttons
    const selectors = [
      'button[type="submit"]',
      'input[type="submit"]',
      'button:contains("Next")',
      'button:contains("Continue")',
      'button:contains("Submit")',
      'button:contains("Done")',
      'a:contains("Next")',
      '[role="button"]:contains("Next")',
      '.next-button',
      '.btn-next',
      '[class*="next"]',
      '[class*="continue"]',
    ];

    for (const selector of selectors) {
      const btn = document.querySelector(selector);
      if (btn) {
        btn.click();
        return true;
      }
    }

    // Try finding buttons by text content
    const allButtons = document.querySelectorAll('button, a, [role="button"], input[type="submit"]');
    for (const btn of allButtons) {
      const text = btn.textContent?.trim().toLowerCase() || btn.value?.toLowerCase() || '';
      if (['next', 'continue', 'submit', 'done', 'ok', 'send', 'finish', 'proceed', '→', '›'].some(
        t => text.includes(t)
      )) {
        btn.click();
        return true;
      }
    }

    return false;
  });

  // Wait for navigation / dynamic content
  if (clicked) {
    await new Promise(resolve => setTimeout(resolve, 1500));
    try {
      await p.waitForNetworkIdle({ timeout: 5000 });
    } catch (e) {
      // Network idle timeout is fine
    }
  }

  return clicked;
}

/**
 * Wait for a while to let dynamic content load
 */
export async function waitForContent(delay = 2000) {
  await new Promise(resolve => setTimeout(resolve, delay));
  const p = await getPage();
  try {
    await p.waitForNetworkIdle({ timeout: 5000 });
  } catch (e) {
    // ignore
  }
}

/**
 * Check if we're on a survey completion page
 */
export async function isSurveyComplete() {
  const p = await getPage();
  const text = await p.evaluate(() => document.body?.textContent?.toLowerCase() || '');

  const completionPhrases = [
    'thank you', 'survey complete', 'you have completed', 'your responses have been recorded',
    'thank you for completing', 'congratulations', 'you have finished', 'survey closed',
    'your answers have been submitted', 'submission received',
  ];

  // Check for completion indicators
  const hasCompletionText = completionPhrases.some(phrase => text.includes(phrase));

  // Check for "no more questions" indicators
  const hasNoMoreContent = text.includes('no more questions') ||
    text.includes('there are no more') ||
    text.includes('you have answered all');

  return hasCompletionText || hasNoMoreContent;
}

/**
 * Get the current page URL
 */
export async function getCurrentUrl() {
  if (!page || page.isClosed()) return null;
  try {
    return page.url();
  } catch {
    return null;
  }
}

/**
 * Close the browser
 */
export async function closeBrowser() {
  if (browser) {
    try {
      await browser.close();
    } catch (e) {
      // ignore
    }
    browser = null;
    page = null;
  }
}

/**
 * Check if a page has a login form visible
 */
export async function hasLoginForm() {
  const p = await getPage();
  const hasForm = await p.evaluate(() => {
    const body = document.body?.textContent?.toLowerCase() || '';
    const loginWords = ['sign in', 'log in', 'login', 'sign in with', 'email address', 'password', 'username'];
    const hasLoginText = loginWords.some(w => body.includes(w));
    const hasInputs = document.querySelectorAll('input[type="password"], input[name*="password"], input[name*="login"]').length > 0;
    return hasLoginText && hasInputs;
  });
  return hasForm;
}