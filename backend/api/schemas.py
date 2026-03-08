from pydantic import BaseModel


class AccuKnoxConfig(BaseModel):
    api_key: str
    user_info: str
    base_url: str | None = None


class GenerateRequest(BaseModel):
    prompt: str
    provider: str  # "anthropic" or "openai"
    api_key: str
    model: str | None = None
    accuknox: AccuKnoxConfig | None = None


class FirewallResult(BaseModel):
    stage: str  # "prompt" or "response"
    query_status: str  # UNCHECKED, PASS, MONITOR, BLOCK
    original: str
    sanitized: str
    error: str | None = None


class GenerateResponse(BaseModel):
    code: str
    plan: str
    status: str
    firewall: list[FirewallResult] | None = None
