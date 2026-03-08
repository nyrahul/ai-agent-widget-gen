from langchain_anthropic import ChatAnthropic
from langchain_openai import ChatOpenAI


def create_llm(provider: str, api_key: str, model: str | None = None):
    if provider == "anthropic":
        return ChatAnthropic(
            model=model or "claude-sonnet-4-5-20250929",
            api_key=api_key,
            max_tokens=4096,
        )
    elif provider == "openai":
        return ChatOpenAI(
            model=model or "gpt-4o",
            api_key=api_key,
            max_tokens=4096,
        )
    else:
        raise ValueError(f"Unsupported provider: {provider}")
