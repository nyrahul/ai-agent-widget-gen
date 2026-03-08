"""AccuKnox Prompt Firewall integration.

Uses the accuknox-llm-defense SDK to scan prompts and responses.
Falls back to a direct HTTP implementation if the SDK is not installed.
"""

from dataclasses import dataclass

try:
    from accuknox_llm_defense import LLMDefenseClient

    HAS_SDK = True
except ImportError:
    HAS_SDK = False


@dataclass
class ScanResult:
    query_status: str  # UNCHECKED, PASS, MONITOR, BLOCK
    sanitized_content: str
    session_id: str
    error: str | None = None


def _create_client(api_key: str, user_info: str, base_url: str | None = None):
    if not HAS_SDK:
        raise RuntimeError(
            "accuknox-llm-defense package is not installed. "
            "Run: pip install accuknox-llm-defense"
        )
    kwargs = {"llm_defense_api_key": api_key, "user_info": user_info}
    if base_url:
        kwargs["base_url"] = base_url
    return LLMDefenseClient(**kwargs)


def scan_prompt(api_key: str, user_info: str, content: str, base_url: str | None = None) -> ScanResult:
    """Scan a user prompt through AccuKnox Prompt Firewall."""
    client = _create_client(api_key, user_info, base_url)
    result = client.scan_prompt(content=content)

    return ScanResult(
        query_status=result.get("query_status", "UNCHECKED"),
        sanitized_content=result.get("sanitized_content", content),
        session_id=result.get("session_id", ""),
        error=result.get("error"),
    )


def scan_response(
    api_key: str,
    user_info: str,
    content: str,
    prompt: str,
    session_id: str,
    base_url: str | None = None,
) -> ScanResult:
    """Scan an LLM response through AccuKnox Prompt Firewall."""
    client = _create_client(api_key, user_info, base_url)
    result = client.scan_response(
        content=content, prompt=prompt, session_id=session_id
    )

    return ScanResult(
        query_status=result.get("query_status", "UNCHECKED"),
        sanitized_content=result.get("sanitized_content", content),
        session_id=result.get("session_id", session_id),
        error=result.get("error"),
    )
