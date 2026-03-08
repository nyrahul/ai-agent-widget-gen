// DOM elements
const providerSelect = document.getElementById('provider-select');
const apiKeyInput = document.getElementById('api-key-input');
const modelInput = document.getElementById('model-input');
const toggleKeyBtn = document.getElementById('toggle-key-visibility');
const settingsStatus = document.getElementById('settings-status');
const promptInput = document.getElementById('prompt-input');
const generateBtn = document.getElementById('generate-btn');
const progressArea = document.getElementById('progress-area');
const streamingOutput = document.getElementById('streaming-output');
const widgetPlaceholder = document.getElementById('widget-placeholder');
const widgetFrame = document.getElementById('widget-frame');
const codeDisplay = document.getElementById('code-display');
const planDisplay = document.getElementById('plan-display');
const copyCodeBtn = document.getElementById('copy-code-btn');
const themeToggle = document.getElementById('theme-toggle');
const historySelect = document.getElementById('history-select');
const accuknoxEnabled = document.getElementById('accuknox-enabled');
const accuknoxFields = document.getElementById('accuknox-fields');
const accuknoxKey = document.getElementById('accuknox-key');
const accuknoxUser = document.getElementById('accuknox-user');
const accuknoxBaseUrl = document.getElementById('accuknox-base-url');
const firewallLog = document.getElementById('firewall-log');
const stopBtn = document.getElementById('stop-btn');
const toggleSettingsBtn = document.getElementById('toggle-settings');
const toggleCodeBtn = document.getElementById('toggle-code');
const collapseSettingsBtn = document.getElementById('collapse-settings');
const collapseCodeBtn = document.getElementById('collapse-code');
const mainEl = document.querySelector('main');

// State
let generatedCode = '';
let abortController = null;

// --- Theme ---

function loadTheme() {
    const saved = localStorage.getItem('widget-gen-theme') || 'dark';
    applyTheme(saved);
}

function applyTheme(theme) {
    if (theme === 'light') {
        document.documentElement.setAttribute('data-theme', 'light');
        themeToggle.textContent = '☀️';
    } else {
        document.documentElement.removeAttribute('data-theme');
        themeToggle.textContent = '🌙';
    }
    localStorage.setItem('widget-gen-theme', theme);
}

themeToggle.addEventListener('click', () => {
    const current = localStorage.getItem('widget-gen-theme') || 'dark';
    applyTheme(current === 'dark' ? 'light' : 'dark');
});

loadTheme();

// --- Panel Toggles ---

function loadPanelState() {
    const saved = localStorage.getItem('widget-gen-panels');
    if (saved) {
        const s = JSON.parse(saved);
        if (s.settingsHidden) mainEl.classList.add('settings-hidden');
        if (s.codeHidden) mainEl.classList.add('code-hidden');
    }
    updateToggleButtons();
}

function savePanelState() {
    localStorage.setItem('widget-gen-panels', JSON.stringify({
        settingsHidden: mainEl.classList.contains('settings-hidden'),
        codeHidden: mainEl.classList.contains('code-hidden'),
    }));
}

function updateToggleButtons() {
    toggleSettingsBtn.classList.toggle('active', !mainEl.classList.contains('settings-hidden'));
    toggleCodeBtn.classList.toggle('active', !mainEl.classList.contains('code-hidden'));
}

toggleSettingsBtn.addEventListener('click', () => {
    mainEl.classList.toggle('settings-hidden');
    updateToggleButtons();
    savePanelState();
});

toggleCodeBtn.addEventListener('click', () => {
    mainEl.classList.toggle('code-hidden');
    updateToggleButtons();
    savePanelState();
});

collapseSettingsBtn.addEventListener('click', () => {
    mainEl.classList.add('settings-hidden');
    updateToggleButtons();
    savePanelState();
});

collapseCodeBtn.addEventListener('click', () => {
    mainEl.classList.add('code-hidden');
    updateToggleButtons();
    savePanelState();
});

loadPanelState();

// --- Prompt History ---

const MAX_HISTORY = 20;

function getHistory() {
    const saved = localStorage.getItem('widget-gen-history');
    return saved ? JSON.parse(saved) : [];
}

function addToHistory(prompt) {
    let history = getHistory();
    // Remove duplicate if exists
    history = history.filter(h => h !== prompt);
    // Add to front
    history.unshift(prompt);
    // Keep max 20
    if (history.length > MAX_HISTORY) history = history.slice(0, MAX_HISTORY);
    localStorage.setItem('widget-gen-history', JSON.stringify(history));
    renderHistory();
}

function renderHistory() {
    const history = getHistory();
    historySelect.innerHTML = '<option value="" disabled selected>Prompt history...</option>';
    history.forEach((prompt, i) => {
        const opt = document.createElement('option');
        opt.value = i;
        opt.textContent = prompt.length > 80 ? prompt.slice(0, 80) + '...' : prompt;
        historySelect.appendChild(opt);
    });
    historySelect.style.display = history.length ? '' : 'none';
}

historySelect.addEventListener('change', () => {
    const history = getHistory();
    const idx = parseInt(historySelect.value, 10);
    if (history[idx] != null) {
        promptInput.value = history[idx];
    }
    // Reset to placeholder so same item can be re-selected
    historySelect.selectedIndex = 0;
});

renderHistory();

// --- Settings ---

function loadSettings() {
    const saved = localStorage.getItem('widget-gen-settings');
    if (saved) {
        const s = JSON.parse(saved);
        providerSelect.value = s.provider || 'anthropic';
        apiKeyInput.value = s.apiKey || '';
        modelInput.value = s.model || '';
        accuknoxEnabled.checked = s.accuknoxEnabled || false;
        accuknoxKey.value = s.accuknoxKey || '';
        accuknoxUser.value = s.accuknoxUser || '';
        accuknoxBaseUrl.value = s.accuknoxBaseUrl || '';
        accuknoxFields.classList.toggle('hidden', !s.accuknoxEnabled);
    }
}

function saveSettings() {
    localStorage.setItem('widget-gen-settings', JSON.stringify({
        provider: providerSelect.value,
        apiKey: apiKeyInput.value,
        model: modelInput.value,
        accuknoxEnabled: accuknoxEnabled.checked,
        accuknoxKey: accuknoxKey.value,
        accuknoxUser: accuknoxUser.value,
        accuknoxBaseUrl: accuknoxBaseUrl.value,
    }));
}

providerSelect.addEventListener('change', saveSettings);
apiKeyInput.addEventListener('input', saveSettings);
modelInput.addEventListener('input', saveSettings);
accuknoxKey.addEventListener('input', saveSettings);
accuknoxUser.addEventListener('input', saveSettings);
accuknoxBaseUrl.addEventListener('input', saveSettings);

accuknoxEnabled.addEventListener('change', () => {
    accuknoxFields.classList.toggle('hidden', !accuknoxEnabled.checked);
    saveSettings();
});

toggleKeyBtn.addEventListener('click', () => {
    const isPassword = apiKeyInput.type === 'password';
    apiKeyInput.type = isPassword ? 'text' : 'password';
});

loadSettings();

// --- Tabs ---

document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        tab.classList.add('active');
        document.getElementById(tab.dataset.tab + '-content').classList.add('active');
    });
});

// --- Code Copy ---

copyCodeBtn.addEventListener('click', () => {
    navigator.clipboard.writeText(generatedCode).then(() => {
        copyCodeBtn.textContent = 'Copied!';
        setTimeout(() => { copyCodeBtn.textContent = 'Copy Code'; }, 2000);
    });
});

// --- Progress Steps ---

function resetProgress() {
    ['step-plan', 'step-generate', 'step-validate'].forEach(id => {
        const el = document.getElementById(id);
        el.classList.remove('active', 'done');
    });
    streamingOutput.textContent = '';
}

function setStepActive(step) {
    const mapping = {
        plan_widget: 'step-plan',
        generate_code: 'step-generate',
        validate_code: 'step-validate',
    };
    const id = mapping[step];
    if (id) {
        document.getElementById(id).classList.add('active');
    }
}

function setStepDone(step) {
    const mapping = {
        plan_widget: 'step-plan',
        generate_code: 'step-generate',
        validate_code: 'step-validate',
    };
    const id = mapping[step];
    if (id) {
        const el = document.getElementById(id);
        el.classList.remove('active');
        el.classList.add('done');
    }
}

// --- Widget Rendering ---

function renderWidget(code) {
    widgetPlaceholder.classList.add('hidden');
    widgetFrame.classList.remove('hidden');
    widgetFrame.srcdoc = code;
}

function renderFirewallAlert(status, stage) {
    const isBlock = status === 'BLOCK';
    const color = isBlock ? '#e74c3c' : '#f39c12';
    const icon = isBlock ? '&#x1F6D1;' : '&#x26A0;&#xFE0F;';
    const title = isBlock
        ? `Prompt ${stage === 'prompt' ? 'Blocked' : 'Response Blocked'}`
        : `${stage === 'prompt' ? 'Prompt' : 'Response'} Flagged for Review`;
    const message = isBlock
        ? `AccuKnox Firewall has blocked this ${stage}. The content was deemed unsafe.`
        : `AccuKnox Firewall flagged this ${stage} with MONITOR status. Proceed with caution.`;

    const html = `<!DOCTYPE html>
<html><head><style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { display: flex; align-items: center; justify-content: center; min-height: 100vh;
         font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
         background: #1a1d27; color: #e1e4eb; }
  .alert { text-align: center; max-width: 460px; padding: 2.5rem; }
  .icon { font-size: 3.5rem; margin-bottom: 1rem; }
  .title { font-size: 1.4rem; font-weight: 600; color: ${color}; margin-bottom: 0.75rem; }
  .message { font-size: 0.95rem; color: #8b8fa3; line-height: 1.6; margin-bottom: 1.25rem; }
  .badge { display: inline-block; padding: 0.3rem 0.9rem; border-radius: 20px; font-size: 0.8rem;
           font-weight: 600; background: ${color}22; color: ${color}; border: 1px solid ${color}44; }
</style></head><body>
  <div class="alert">
    <div class="icon">${icon}</div>
    <div class="title">${title}</div>
    <div class="message">${message}</div>
    <span class="badge">AccuKnox Firewall: ${status}</span>
  </div>
</body></html>`;

    widgetPlaceholder.classList.add('hidden');
    widgetFrame.classList.remove('hidden');
    widgetFrame.srcdoc = html;
}

function displayCode(code) {
    generatedCode = code;
    codeDisplay.textContent = code;
    Prism.highlightElement(codeDisplay);
    copyCodeBtn.classList.remove('hidden');
}

function displayPlan(plan) {
    planDisplay.textContent = plan;
}

// --- Firewall Log ---

function resetFirewallLog() {
    firewallLog.innerHTML = 'Firewall results will appear here when AccuKnox is enabled';
}

function addFirewallEntry(data) {
    if (firewallLog.textContent.startsWith('Firewall results')) {
        firewallLog.innerHTML = '';
    }

    const statusClass = (data.query_status || 'unchecked').toLowerCase();
    const entry = document.createElement('div');
    entry.className = `fw-entry ${statusClass}`;

    const sanitizedChanged = data.original !== data.sanitized;
    let detailHtml = '';
    if (data.error) {
        detailHtml += `<div class="fw-detail"><strong>Error:</strong> ${escapeHtml(data.error)}</div>`;
    }
    if (sanitizedChanged) {
        detailHtml += `<div class="fw-detail"><strong>Modified:</strong> Content was sanitized by the firewall</div>`;
    }
    if (data.duration_ms != null) {
        detailHtml += `<div class="fw-detail"><strong>Response time:</strong> ${data.duration_ms} ms</div>`;
    }

    entry.innerHTML = `
        <div class="fw-entry-header">
            <span class="fw-stage">${escapeHtml(data.stage)} scan</span>
            <div class="fw-header-right">
                ${data.duration_ms != null ? `<span class="fw-duration">${data.duration_ms} ms</span>` : ''}
                <span class="fw-status ${statusClass}">${escapeHtml(data.query_status || 'UNCHECKED')}</span>
            </div>
        </div>
        ${detailHtml}
    `;
    firewallLog.appendChild(entry);
}

function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// --- Generate ---

async function generateWidget() {
    const apiKey = apiKeyInput.value.trim();
    if (!apiKey) {
        settingsStatus.textContent = 'Please enter an API key';
        settingsStatus.className = 'status-indicator error';
        return;
    }
    settingsStatus.textContent = '';
    settingsStatus.className = 'status-indicator';

    const prompt = promptInput.value.trim();
    if (!prompt) return;

    addToHistory(prompt);

    // Reset UI
    abortController = new AbortController();
    generateBtn.disabled = true;
    generateBtn.textContent = 'Generating...';
    stopBtn.classList.remove('hidden');
    progressArea.classList.remove('hidden');
    resetProgress();
    setStepActive('plan_widget');
    copyCodeBtn.classList.add('hidden');
    codeDisplay.textContent = '';
    planDisplay.textContent = '';
    resetFirewallLog();
    widgetFrame.removeAttribute('srcdoc');
    widgetFrame.classList.add('hidden');
    widgetPlaceholder.classList.remove('hidden');

    const body = {
        prompt,
        provider: providerSelect.value,
        api_key: apiKey,
        model: modelInput.value || null,
    };

    // Include AccuKnox config if enabled
    if (accuknoxEnabled.checked && accuknoxKey.value.trim() && accuknoxUser.value.trim()) {
        body.accuknox = {
            api_key: accuknoxKey.value.trim(),
            user_info: accuknoxUser.value.trim(),
            base_url: accuknoxBaseUrl.value.trim() || null,
        };
    }

    try {
        const response = await fetch('/api/generate/stream', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
            signal: abortController.signal,
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.detail || 'Request failed');
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let currentNode = 'plan_widget';
        let streamText = '';
        let finalCode = '';
        let finalPlan = '';
        let firewallBlocked = false;

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop(); // keep incomplete line

            for (const line of lines) {
                if (!line.startsWith('data: ')) continue;
                const data = line.slice(6).trim();
                if (data === '[DONE]') {
                    if (finalCode && !firewallBlocked) {
                        renderWidget(finalCode);
                        displayCode(finalCode);
                    }
                    continue;
                }

                let event;
                try { event = JSON.parse(data); } catch { continue; }

                if (event.type === 'firewall') {
                    addFirewallEntry(event);
                    if (event.query_status === 'BLOCK') {
                        firewallBlocked = true;
                        renderFirewallAlert(event.query_status, event.stage);
                    } else if (event.query_status === 'MONITOR') {
                        renderFirewallAlert(event.query_status, event.stage);
                    }
                } else if (event.type === 'token') {
                    streamText += event.content;
                    streamingOutput.textContent = streamText.slice(-500);
                    streamingOutput.scrollTop = streamingOutput.scrollHeight;
                } else if (event.type === 'node_complete') {
                    setStepDone(event.node);

                    if (event.node === 'plan_widget') {
                        finalPlan = event.data?.plan || '';
                        displayPlan(finalPlan);
                        setStepActive('generate_code');
                        streamText = '';
                    } else if (event.node === 'generate_code') {
                        finalCode = event.data?.generated_code || '';
                        setStepActive('validate_code');
                        streamText = '';
                    } else if (event.node === 'validate_code') {
                        // Check for retries
                        if (event.data?.validation_errors?.length > 0) {
                            setStepActive('generate_code');
                            streamText = '';
                        }
                    }
                } else if (event.type === 'error') {
                    throw new Error(event.content);
                }
            }
        }
    } catch (err) {
        if (err.name === 'AbortError') {
            settingsStatus.textContent = 'Generation stopped';
            settingsStatus.className = 'status-indicator';
        } else {
            settingsStatus.textContent = `Error: ${err.message}`;
            settingsStatus.className = 'status-indicator error';
        }
    } finally {
        abortController = null;
        generateBtn.disabled = false;
        generateBtn.textContent = 'Generate Widget';
        stopBtn.classList.add('hidden');
    }
}

generateBtn.addEventListener('click', generateWidget);

stopBtn.addEventListener('click', () => {
    if (abortController) {
        abortController.abort();
    }
});

// Allow Ctrl+Enter to generate
promptInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        generateWidget();
    }
});
