import re

from langchain_core.messages import HumanMessage, SystemMessage
from langchain_core.runnables import RunnableConfig

from .prompts import GENERATE_RETRY_PROMPT, GENERATE_SYSTEM_PROMPT, PLAN_SYSTEM_PROMPT
from .state import AgentState


async def plan_widget(state: AgentState, config: RunnableConfig) -> dict:
    llm = config["configurable"]["llm"]
    messages = [
        SystemMessage(content=PLAN_SYSTEM_PROMPT),
        HumanMessage(content=state["user_prompt"]),
    ]
    response = await llm.ainvoke(messages)
    return {"plan": response.content, "status": "planning"}


async def generate_code(state: AgentState, config: RunnableConfig) -> dict:
    llm = config["configurable"]["llm"]

    system_prompt = GENERATE_SYSTEM_PROMPT.format(plan=state["plan"])
    user_content = state["user_prompt"]

    if state.get("validation_errors"):
        errors = "\n".join(f"- {e}" for e in state["validation_errors"])
        user_content += "\n\n" + GENERATE_RETRY_PROMPT.format(errors=errors)

    messages = [
        SystemMessage(content=system_prompt),
        HumanMessage(content=user_content),
    ]
    response = await llm.ainvoke(messages)

    code = response.content.strip()
    # Strip markdown fences if the LLM wraps them anyway
    code = re.sub(r"^```html?\s*\n?", "", code)
    code = re.sub(r"\n?```\s*$", "", code)

    return {"generated_code": code, "status": "generating", "validation_errors": []}


async def validate_code(state: AgentState, config: RunnableConfig) -> dict:
    code = state.get("generated_code", "")
    errors: list[str] = []

    if not code or len(code) < 50:
        errors.append("Generated code is empty or too short")

    if "<html" not in code.lower() and "<!doctype" not in code.lower():
        errors.append("Missing <html> or <!DOCTYPE html> tag")

    if "<body" not in code.lower():
        errors.append("Missing <body> tag")

    if 'src="file://' in code or "src='file://" in code:
        errors.append("Contains local file:// references")

    if "localhost" in code or "127.0.0.1" in code:
        errors.append("Contains localhost/127.0.0.1 references")

    if errors and state.get("retry_count", 0) < 2:
        return {
            "validation_errors": errors,
            "retry_count": state.get("retry_count", 0) + 1,
            "status": "validating",
        }

    return {"validation_errors": [], "status": "done"}
