import json
import logging

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse

from agent.graph import build_graph
from firewall.accuknox import scan_prompt, scan_response
from llm.provider import create_llm

from .schemas import FirewallResult, GenerateRequest, GenerateResponse

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api")


def _run_prompt_firewall(req):
    """Scan prompt through AccuKnox. Returns (sanitized_prompt, session_id, FirewallResult)."""
    if not req.accuknox:
        return req.prompt, None, None

    try:
        result = scan_prompt(
            api_key=req.accuknox.api_key,
            user_info=req.accuknox.user_info,
            content=req.prompt,
            base_url=req.accuknox.base_url,
        )
        fw = FirewallResult(
            stage="prompt",
            query_status=result.query_status,
            original=req.prompt,
            sanitized=result.sanitized_content,
            error=result.error,
        )
        if result.query_status == "BLOCK":
            return None, None, fw
        return result.sanitized_content, result.session_id, fw
    except Exception as e:
        logger.warning("AccuKnox prompt scan failed: %s", e)
        fw = FirewallResult(
            stage="prompt",
            query_status="UNCHECKED",
            original=req.prompt,
            sanitized=req.prompt,
            error=str(e),
        )
        return req.prompt, None, fw


def _run_response_firewall(req, content, sanitized_prompt, session_id):
    """Scan LLM response through AccuKnox. Returns (sanitized_content, FirewallResult)."""
    if not req.accuknox:
        return content, None

    try:
        result = scan_response(
            api_key=req.accuknox.api_key,
            user_info=req.accuknox.user_info,
            content=content,
            prompt=sanitized_prompt,
            session_id=session_id or "",
            base_url=req.accuknox.base_url,
        )
        fw = FirewallResult(
            stage="response",
            query_status=result.query_status,
            original=content,
            sanitized=result.sanitized_content,
            error=result.error,
        )
        return result.sanitized_content, fw
    except Exception as e:
        logger.warning("AccuKnox response scan failed: %s", e)
        fw = FirewallResult(
            stage="response",
            query_status="UNCHECKED",
            original=content,
            sanitized=content,
            error=str(e),
        )
        return content, fw


@router.post("/generate", response_model=GenerateResponse)
async def generate_widget(req: GenerateRequest):
    firewall_results = []

    # --- Prompt Firewall ---
    sanitized_prompt, session_id, fw_prompt = _run_prompt_firewall(req)
    if fw_prompt:
        firewall_results.append(fw_prompt)
    if sanitized_prompt is None:
        return GenerateResponse(
            code="",
            plan="",
            status="blocked",
            firewall=firewall_results,
        )

    try:
        llm = create_llm(req.provider, req.api_key, req.model)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    graph = build_graph()
    initial_state = {
        "user_prompt": sanitized_prompt,
        "plan": "",
        "generated_code": "",
        "validation_errors": [],
        "retry_count": 0,
        "status": "planning",
    }

    try:
        result = await graph.ainvoke(
            initial_state, config={"configurable": {"llm": llm}}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Agent error: {e}")

    # --- Response Firewall ---
    generated_code = result.get("generated_code", "")
    if req.accuknox and generated_code:
        generated_code, fw_resp = _run_response_firewall(
            req, generated_code, sanitized_prompt, session_id
        )
        if fw_resp:
            firewall_results.append(fw_resp)

    return GenerateResponse(
        code=generated_code,
        plan=result.get("plan", ""),
        status=result.get("status", "error"),
        firewall=firewall_results if firewall_results else None,
    )


@router.post("/generate/stream")
async def generate_widget_stream(req: GenerateRequest):
    # --- Prompt Firewall ---
    sanitized_prompt, session_id, fw_prompt = _run_prompt_firewall(req)

    if fw_prompt:
        # Send firewall result as first event
        fw_event = json.dumps({
            "type": "firewall",
            "stage": "prompt",
            "query_status": fw_prompt.query_status,
            "original": fw_prompt.original,
            "sanitized": fw_prompt.sanitized,
            "error": fw_prompt.error,
        })

    if sanitized_prompt is None:
        # Prompt was blocked
        async def blocked_stream():
            yield f"data: {fw_event}\n\n"
            payload = json.dumps({
                "type": "error",
                "content": f"Prompt blocked by AccuKnox Firewall (status: {fw_prompt.query_status})",
            })
            yield f"data: {payload}\n\n"
            yield "data: [DONE]\n\n"

        return StreamingResponse(blocked_stream(), media_type="text/event-stream")

    try:
        llm = create_llm(req.provider, req.api_key, req.model)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    graph = build_graph()
    initial_state = {
        "user_prompt": sanitized_prompt,
        "plan": "",
        "generated_code": "",
        "validation_errors": [],
        "retry_count": 0,
        "status": "planning",
    }

    async def event_stream():
        # Send prompt firewall result if available
        if fw_prompt:
            yield f"data: {fw_event}\n\n"

        generated_code = ""
        try:
            async for event in graph.astream_events(
                initial_state,
                config={"configurable": {"llm": llm}},
                version="v2",
            ):
                kind = event["event"]
                if kind == "on_chat_model_stream":
                    chunk = event["data"]["chunk"]
                    if hasattr(chunk, "content") and chunk.content:
                        payload = json.dumps(
                            {"type": "token", "content": chunk.content}
                        )
                        yield f"data: {payload}\n\n"
                elif kind == "on_chain_end":
                    name = event.get("name", "")
                    if name in ("plan_widget", "generate_code", "validate_code"):
                        output = event["data"].get("output", {})
                        if name == "generate_code":
                            generated_code = output.get("generated_code", "")
                        payload = json.dumps(
                            {"type": "node_complete", "node": name, "data": output}
                        )
                        yield f"data: {payload}\n\n"
        except Exception as e:
            payload = json.dumps({"type": "error", "content": str(e)})
            yield f"data: {payload}\n\n"

        # --- Response Firewall ---
        if req.accuknox and generated_code:
            _, fw_resp = _run_response_firewall(
                req, generated_code, sanitized_prompt, session_id
            )
            if fw_resp:
                resp_event = json.dumps({
                    "type": "firewall",
                    "stage": "response",
                    "query_status": fw_resp.query_status,
                    "original": fw_resp.original,
                    "sanitized": fw_resp.sanitized,
                    "error": fw_resp.error,
                })
                yield f"data: {resp_event}\n\n"

        yield "data: [DONE]\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")
