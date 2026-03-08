# AI Widget Generator

Generate dynamic widgets (charts, tables, dashboards) from natural language prompts using AI. Powered by LangGraph with support for Anthropic and OpenAI models. Includes optional AccuKnox Prompt Firewall integration for prompt/response sanitization.

![UI Screenshot](https://img.shields.io/badge/UI-Dark%20%26%20Light%20Mode-blueviolet)

## Features

- **Natural language to widget** — describe what you want, get a working interactive widget
- **Multi-provider LLM** — choose between Anthropic (Claude) or OpenAI (GPT) models
- **Live streaming** — watch the AI plan, generate, and validate code in real time
- **Code viewer** — inspect and copy the auto-generated HTML/JS/CSS
- **AccuKnox Prompt Firewall** — optional prompt and response scanning for security
- **Dark/Light mode** — toggle UI theme
- **Prompt history** — last 20 prompts saved for quick reuse

## Quick Start

### Option 1: Docker

```bash
docker run -d -p 8000:8000 --name ai-widget-generator \
  docker.io/nyrahul/ai-widget-generator:latest
```

Open http://localhost:8000, configure your LLM API key in the sidebar, and start prompting.

### Option 2: Docker Build from Source

```bash
git clone <repo-url> && cd ai-agent-langgraph

# Build and run
make build
make run
```

### Option 3: Kubernetes

```bash
# Deploy
kubectl apply -k k8s/

# Check status
kubectl -n ai-widget-generator get pods,svc,ingress
```

Update `k8s/ingress.yaml` with your domain before deploying. To use a custom image:

```bash
make deploy IMAGE_NAME=youruser/ai-widget-generator IMAGE_TAG=v1.0.0
```

### Option 4: Run Locally (Development)

```bash
cd ai-agent-langgraph
python3 -m venv venv
source venv/bin/activate
pip install -r backend/requirements.txt
cd backend
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

## Configuration

All configuration is done in the browser UI — no server-side config files needed.

### LLM Provider (Required)

| Field | Description |
|-------|-------------|
| **Provider** | Anthropic or OpenAI |
| **API Key** | Your provider API key |
| **Model** | Optional model override (defaults: `claude-sonnet-4-5-20250929` / `gpt-4o`) |

### AccuKnox Prompt Firewall (Optional)

| Field | Description |
|-------|-------------|
| **Enable** | Toggle firewall on/off |
| **AccuKnox Token** | API token from AccuKnox dashboard |
| **User Info** | Your email or username |
| **Base URL** | Custom AccuKnox endpoint (leave empty for default) |

When enabled, prompts are scanned before sending to the LLM, and generated responses are scanned before rendering. Results are visible in the **Firewall** tab. Blocked prompts are rejected with a clear message.

## Usage

1. Open the app in your browser
2. Enter your LLM provider and API key in the left sidebar
3. Type a prompt, e.g.:
   - *"Create a pie chart of world population by continent"*
   - *"Build a sortable table of the top 10 programming languages"*
   - *"Make an interactive calculator"*
4. Click **Generate Widget** (or press `Ctrl+Enter`)
5. Watch the progress: **Planning → Generating → Validating**
6. The widget renders in the center panel; code is in the right panel

## Architecture

```
User Prompt → [AccuKnox Scan] → LangGraph Agent → [AccuKnox Scan] → Widget
                                     │
                          ┌──────────┼──────────┐
                          ▼          ▼          ▼
                      Plan Widget → Generate → Validate (retry up to 2x)
```

- **Backend**: FastAPI + LangGraph (Python)
- **Frontend**: Vanilla HTML/JS/CSS served by FastAPI
- **Security**: Generated widgets run in a sandboxed iframe (`allow-scripts` only, no `allow-same-origin`)

## Makefile Targets

| Target | Description |
|--------|-------------|
| `make build` | Build Docker image |
| `make push` | Build and push to registry |
| `make run` | Run container locally |
| `make stop` | Stop and remove container |
| `make deploy` | Deploy to Kubernetes |
| `make undeploy` | Remove from Kubernetes |
| `make k8s-status` | Check pod/service/ingress status |

### Makefile Variables

```bash
DOCKER_USERNAME=nyrahul    # Docker Hub username
IMAGE_TAG=v1.0.0           # Image tag (default: latest)
REGISTRY=docker.io         # Container registry
```

## License

MIT
