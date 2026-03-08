from typing import TypedDict


class AgentState(TypedDict):
    user_prompt: str
    plan: str
    generated_code: str
    validation_errors: list[str]
    retry_count: int
    status: str
