from langgraph.graph import END, START, StateGraph

from .nodes import generate_code, plan_widget, validate_code
from .state import AgentState


def should_retry(state: AgentState) -> str:
    if state.get("validation_errors") and state.get("retry_count", 0) <= 2:
        return "generate_code"
    return END


def build_graph():
    graph = StateGraph(AgentState)

    graph.add_node("plan_widget", plan_widget)
    graph.add_node("generate_code", generate_code)
    graph.add_node("validate_code", validate_code)

    graph.add_edge(START, "plan_widget")
    graph.add_edge("plan_widget", "generate_code")
    graph.add_edge("generate_code", "validate_code")
    graph.add_conditional_edges(
        "validate_code",
        should_retry,
        {"generate_code": "generate_code", END: END},
    )

    return graph.compile()
