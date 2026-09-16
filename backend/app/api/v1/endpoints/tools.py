from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from app.schemas.tools import (
    ParaphraseRequest, ParaphraseResponse,
    HumanizeRequest, HumanizeResponse,
    DetectRequest, DetectResponse, DetectionResult,
    GrammarRequest, GrammarResponse,
    SummarizeRequest, SummarizeResponse,
    TranslateRequest, TranslateResponse,
    SEORequest, SEOResponse,
)
from app.api.v1.endpoints.auth import get_current_user
from app.services.billing_service import BillingService
from app.services.health_score_service import HealthScoreService
from app.ai.engines.paraphrase_engine import ParaphraseEngine
from app.ai.engines.humanize_engine import HumanizeEngine
from app.ai.engines.detect_engine import DetectEngine
from app.ai.engines.grammar_engine import GrammarEngine
from app.ai.engines.summarize_engine import SummarizeEngine
from app.ai.engines.translate_engine import TranslateEngine
from app.ai.engines.seo_engine import SEOEngine
import uuid

router = APIRouter(prefix="/tools", tags=["tools"])
health_service = HealthScoreService()


class TransformRequest(BaseModel):
    text: str
    source_format: str
    target_format: str


class TransformResponse(BaseModel):
    job_id: str
    status: str
    transformed_text: str


async def _run_tool(
    *,
    tool_name: str,
    user_id: str,
    text: str,
    builder,
):
    """Common pipeline: validate, deduct, run, refund on failure."""
    import time as _time
    import structlog
    t_request_start = _time.monotonic()
    logger = structlog.get_logger()

    def _log(stage, **extra):
        elapsed = _time.monotonic() - t_request_start
        logger.info(
            "tool.timing",
            tool=tool_name,
            stage=stage,
            elapsed=round(elapsed, 3),
            **extra,
        )

    _log("start", text_len=len(text) if text else 0)

    if not text or not text.strip():
        raise HTTPException(status_code=422, detail="Text is required.")

    _log("validated")

    billing = BillingService()
    cost = billing.get_tool_cost(tool_name)

    # Validate balance WITHOUT deducting yet. Deducting-then-refunding-on-
    # failure (the previous pattern) meant every request touched the
    # credits row twice regardless of outcome, and briefly left a user's
    # balance debited for a call that hadn't actually succeeded. Checking
    # first means an insufficient balance is rejected before any Gemini
    # call is made (no wasted request), and a Gemini/engine failure never
    # touches credits at all.
    t_check_start = _time.monotonic()
    current_balance = await billing.get_balance(user_id)
    _log("credits_checked", cost=cost, balance=current_balance, seconds=round(_time.monotonic() - t_check_start, 3))

    if current_balance < cost:
        raise HTTPException(status_code=402, detail="Insufficient credits")

    try:
        t_engine_start = _time.monotonic()
        result = await builder()
        engine_seconds = _time.monotonic() - t_engine_start
        _log("engine_done", seconds=round(engine_seconds, 3), status=result.get("status"))

        if result.get("status") in ("success", "completed"):
            # Deduct only now, after genuine success -- never before.
            deducted = await billing.deduct_credits(user_id, cost, tool_name)
            if not deducted:
                # Balance most likely changed between the check above and
                # here (e.g. a concurrent request from the same user).
                # The Gemini call already succeeded and the user is about
                # to see a real result; don't discard it or make them
                # redo an expensive AI call over an internal credit-
                # ledger race. Log it so it's visible, not silent.
                logger.warning(
                    "tool.deduct_after_success_failed",
                    tool=tool_name,
                    user_id=user_id,
                    cost=cost,
                )
            # Reflect what was actually deducted, not the nominal cost --
            # in the rare race above, that's genuinely 0, not `cost`.
            result["credits_used"] = cost if deducted else 0
            _log("response_sent", engine_seconds=round(engine_seconds, 3),
                 total_seconds=round(_time.monotonic() - t_request_start, 3))
            return result

        _log("engine_failed_no_charge", error=result.get("error", "unknown"))
        raise HTTPException(
            status_code=500,
            detail=result.get("error", f"{tool_name} processing failed"),
        )
    except HTTPException:
        raise
    except Exception as e:
        _log("exception_no_charge", error=str(e)[:200])
        raise HTTPException(status_code=500, detail=f"{tool_name} failed: {str(e)[:200]}")


@router.post("/paraphrase", response_model=ParaphraseResponse)
async def paraphrase(
    request: ParaphraseRequest,
    current_user = Depends(get_current_user),
):
    async def _build():
        from app.services.writing_dna_service import WritingDNAService
        writing_dna = await WritingDNAService().get_style_context(current_user["id"])

        engine = ParaphraseEngine()
        result = await engine.process(request.text, {
            "mode": request.mode,
            "strength": request.strength,
            "writing_dna": writing_dna,
        })
        if result.get("status") == "success":
            health = health_service.calculate_score()
            return {
                "job_id": str(uuid.uuid4()),
                "status": "completed",
                "output": result["output"],
                "health_score": health["score"],
                "word_count_diff": result.get("word_count_diff", 0),
            }
        return result

    res = await _run_tool(
        tool_name="paraphraser",
        user_id=str(current_user["id"]),
        text=request.text,
        builder=_build,
    )
    return res


@router.post("/humanize", response_model=HumanizeResponse)
async def humanize(
    request: HumanizeRequest,
    current_user = Depends(get_current_user),
):
    async def _build():
        from app.services.writing_dna_service import WritingDNAService
        writing_dna = await WritingDNAService().get_style_context(current_user["id"])

        engine = HumanizeEngine()
        result = await engine.process(request.text, {
            "target_pass_rate": request.target_pass_rate,
            "writing_dna": writing_dna,
        })
        if result.get("status") == "success":
            return {
                "job_id": str(uuid.uuid4()),
                "status": "completed",
                "output": result["output"],
                "detection_scores": result.get("detection_scores"),
            }
        return result

    res = await _run_tool(
        tool_name="humanizer",
        user_id=str(current_user["id"]),
        text=request.text,
        builder=_build,
    )
    return res


@router.post("/detect", response_model=DetectResponse)
async def detect(
    request: DetectRequest,
    current_user = Depends(get_current_user),
):
    async def _build():
        engine = DetectEngine()
        result = await engine.process(request.text)
        if result.get("status") == "success":
            detection_result = result["result"]
            return {
                "job_id": str(uuid.uuid4()),
                "status": "completed",
                "result": {
                    "score": detection_result["score"],
                    "verdict": detection_result["verdict"],
                    "confidence": detection_result["confidence"],
                    "highlighted_spans": detection_result["highlighted_spans"],
                },
            }
        return result

    res = await _run_tool(
        tool_name="detector",
        user_id=str(current_user["id"]),
        text=request.text,
        builder=_build,
    )
    return res


@router.post("/grammar", response_model=GrammarResponse)
async def grammar_check(
    request: GrammarRequest,
    current_user = Depends(get_current_user),
):
    async def _build():
        from app.services.writing_dna_service import WritingDNAService
        writing_dna = await WritingDNAService().get_style_context(current_user["id"])

        engine = GrammarEngine()
        result = await engine.process(request.text, {"language": request.language, "writing_dna": writing_dna})
        if result.get("status") == "success":
            return {
                "job_id": str(uuid.uuid4()),
                "status": "completed",
                "corrected_text": result["corrected_text"],
                "issues": result.get("issues", []),
            }
        return result

    res = await _run_tool(
        tool_name="grammar",
        user_id=str(current_user["id"]),
        text=request.text,
        builder=_build,
    )
    return res


@router.post("/summarize", response_model=SummarizeResponse)
async def summarize(
    request: SummarizeRequest,
    current_user = Depends(get_current_user),
):
    async def _build():
        from app.services.writing_dna_service import WritingDNAService
        writing_dna = await WritingDNAService().get_style_context(current_user["id"])

        engine = SummarizeEngine()
        result = await engine.process(request.text, {
            "style": request.style,
            "max_length": request.max_length,
            "writing_dna": writing_dna,
        })
        if result.get("status") == "success":
            return {
                "job_id": str(uuid.uuid4()),
                "status": "completed",
                "summary": result["summary"],
                "key_points": result.get("key_points", []),
            }
        return result

    res = await _run_tool(
        tool_name="summarizer",
        user_id=str(current_user["id"]),
        text=request.text,
        builder=_build,
    )
    return res


@router.post("/translate", response_model=TranslateResponse)
async def translate(
    request: TranslateRequest,
    current_user = Depends(get_current_user),
):
    async def _build():
        engine = TranslateEngine()
        result = await engine.process(request.text, {
            "source_lang": request.source_lang,
            "target_lang": request.target_lang,
            "preserve_tone": request.preserve_tone,
        })
        if result.get("status") == "success":
            return {
                "job_id": str(uuid.uuid4()),
                "status": "completed",
                "translated_text": result["translated_text"],
                "confidence": result.get("confidence"),
            }
        return result

    res = await _run_tool(
        tool_name="translator",
        user_id=str(current_user["id"]),
        text=request.text,
        builder=_build,
    )
    return res


@router.post("/seo", response_model=SEOResponse)
async def seo_optimize(
    request: SEORequest,
    current_user = Depends(get_current_user),
):
    async def _build():
        engine = SEOEngine()
        result = await engine.process(request.text, {
            "target_keywords": request.target_keywords,
            "content_type": request.content_type,
        })
        if result.get("status") == "success":
            return {
                "job_id": str(uuid.uuid4()),
                "status": "completed",
                "analysis": result["analysis"],
                "health_score": result.get("health_score"),
            }
        return result

    res = await _run_tool(
        tool_name="seo",
        user_id=str(current_user["id"]),
        text=request.text,
        builder=_build,
    )
    return res


@router.post("/transform", response_model=TransformResponse)
async def transform_content(
    request: TransformRequest,
    current_user = Depends(get_current_user),
):
    if not request.text or not request.text.strip():
        raise HTTPException(status_code=422, detail="Text is required.")

    billing = BillingService()
    cost = billing.get_tool_cost("transform")

    has_sufficient = await billing.deduct_credits(str(current_user["id"]), cost, "transform")
    if not has_sufficient:
        raise HTTPException(status_code=402, detail="Insufficient credits")

    try:
        engine = ParaphraseEngine()
        result = await engine.process(request.text, {
            "mode": "creative",
            "strength": 80,
        })
        if result.get("status") == "success":
            return TransformResponse(
                job_id=str(uuid.uuid4()),
                status="completed",
                transformed_text=result["output"],
            )
        await billing.refund_credits(str(current_user["id"]), cost, "transform")
        raise HTTPException(status_code=500, detail=result.get("error", "Processing failed"))
    except HTTPException:
        raise
    except Exception as e:
        await billing.refund_credits(str(current_user["id"]), cost, "transform")
        raise HTTPException(status_code=500, detail=str(e))
