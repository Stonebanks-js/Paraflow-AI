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

router = APIRouter(prefix="/tools", tags=["tools"])
health_service = HealthScoreService()


@router.post("/paraphrase", response_model=ParaphraseResponse)
async def paraphrase(
    request: ParaphraseRequest,
    current_user = Depends(get_current_user)
):
    billing = BillingService()
    cost = billing.get_tool_cost("paraphraser")

    has_sufficient = await billing.deduct_credits(str(current_user["id"]), cost, "paraphraser")
    if not has_sufficient:
        raise HTTPException(status_code=402, detail="Insufficient credits")

    try:
        engine = ParaphraseEngine()
        result = await engine.process(request.text, {
            "mode": request.mode,
            "strength": request.strength
        })

        if result.get("status") == "success":
            health = health_service.calculate_score()
            return ParaphraseResponse(
                job_id=str(uuid.uuid4()),
                status="completed",
                output=result["output"],
                health_score=health["score"],
                word_count_diff=result.get("word_count_diff", 0)
            )
        else:
            raise HTTPException(status_code=500, detail=result.get("error", "Processing failed"))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/humanize", response_model=HumanizeResponse)
async def humanize(
    request: HumanizeRequest,
    current_user = Depends(get_current_user)
):
    billing = BillingService()
    cost = billing.get_tool_cost("humanizer")

    has_sufficient = await billing.deduct_credits(str(current_user["id"]), cost, "humanizer")
    if not has_sufficient:
        raise HTTPException(status_code=402, detail="Insufficient credits")

    try:
        engine = HumanizeEngine()
        result = await engine.process(request.text, {
            "target_pass_rate": request.target_pass_rate
        })

        if result.get("status") == "success":
            return HumanizeResponse(
                job_id=str(uuid.uuid4()),
                status="completed",
                output=result["output"],
                detection_scores=result.get("detection_scores")
            )
        else:
            raise HTTPException(status_code=500, detail=result.get("error", "Processing failed"))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/detect", response_model=DetectResponse)
async def detect(
    request: DetectRequest,
    current_user = Depends(get_current_user)
):
    billing = BillingService()
    cost = billing.get_tool_cost("detector")

    has_sufficient = await billing.deduct_credits(str(current_user["id"]), cost, "detector")
    if not has_sufficient:
        raise HTTPException(status_code=402, detail="Insufficient credits")

    try:
        engine = DetectEngine()
        result = await engine.process(request.text)

        if result.get("status") == "success":
            detection_result = result["result"]
            return DetectResponse(
                job_id=str(uuid.uuid4()),
                status="completed",
                result=DetectionResult(
                    score=detection_result["score"],
                    verdict=detection_result["verdict"],
                    confidence=detection_result["confidence"],
                    highlighted_spans=detection_result["highlighted_spans"]
                )
            )
        else:
            raise HTTPException(status_code=500, detail=result.get("error", "Processing failed"))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/grammar", response_model=GrammarResponse)
async def grammar_check(
    request: GrammarRequest,
    current_user = Depends(get_current_user)
):
    billing = BillingService()
    cost = billing.get_tool_cost("grammar")

    has_sufficient = await billing.deduct_credits(str(current_user["id"]), cost, "grammar")
    if not has_sufficient:
        raise HTTPException(status_code=402, detail="Insufficient credits")

    try:
        engine = GrammarEngine()
        result = await engine.process(request.text, {"language": request.language})

        if result.get("status") == "success":
            return GrammarResponse(
                job_id=str(uuid.uuid4()),
                status="completed",
                corrected_text=result["corrected_text"],
                issues=result.get("issues", [])
            )
        else:
            raise HTTPException(status_code=500, detail=result.get("error", "Processing failed"))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/summarize", response_model=SummarizeResponse)
async def summarize(
    request: SummarizeRequest,
    current_user = Depends(get_current_user)
):
    billing = BillingService()
    cost = billing.get_tool_cost("summarizer")

    has_sufficient = await billing.deduct_credits(str(current_user["id"]), cost, "summarizer")
    if not has_sufficient:
        raise HTTPException(status_code=402, detail="Insufficient credits")

    try:
        engine = SummarizeEngine()
        result = await engine.process(request.text, {
            "style": request.style,
            "max_length": request.max_length
        })

        if result.get("status") == "success":
            return SummarizeResponse(
                job_id=str(uuid.uuid4()),
                status="completed",
                summary=result["summary"],
                key_points=result.get("key_points", [])
            )
        else:
            raise HTTPException(status_code=500, detail=result.get("error", "Processing failed"))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/translate", response_model=TranslateResponse)
async def translate(
    request: TranslateRequest,
    current_user = Depends(get_current_user)
):
    billing = BillingService()
    cost = billing.get_tool_cost("translator")

    has_sufficient = await billing.deduct_credits(str(current_user["id"]), cost, "translator")
    if not has_sufficient:
        raise HTTPException(status_code=402, detail="Insufficient credits")

    try:
        engine = TranslateEngine()
        result = await engine.process(request.text, {
            "source_lang": request.source_lang,
            "target_lang": request.target_lang,
            "preserve_tone": request.preserve_tone
        })

        if result.get("status") == "success":
            return TranslateResponse(
                job_id=str(uuid.uuid4()),
                status="completed",
                translated_text=result["translated_text"],
                confidence=result.get("confidence")
            )
        else:
            raise HTTPException(status_code=500, detail=result.get("error", "Processing failed"))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/seo", response_model=SEOResponse)
async def seo_optimize(
    request: SEORequest,
    current_user = Depends(get_current_user)
):
    billing = BillingService()
    cost = billing.get_tool_cost("seo")

    has_sufficient = await billing.deduct_credits(str(current_user["id"]), cost, "seo")
    if not has_sufficient:
        raise HTTPException(status_code=402, detail="Insufficient credits")

    try:
        engine = SEOEngine()
        result = await engine.process(request.text, {
            "target_keywords": request.target_keywords,
            "content_type": request.content_type
        })

        if result.get("status") == "success":
            return SEOResponse(
                job_id=str(uuid.uuid4()),
                status="completed",
                analysis=result["analysis"],
                health_score=result.get("health_score")
            )
        else:
            raise HTTPException(status_code=500, detail=result.get("error", "Processing failed"))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/transform", response_model=TransformResponse)
async def transform_content(
    request: TransformRequest,
    current_user = Depends(get_current_user)
):
    billing = BillingService()
    cost = billing.get_tool_cost("transform")

    has_sufficient = await billing.deduct_credits(str(current_user["id"]), cost, "transform")
    if not has_sufficient:
        raise HTTPException(status_code=402, detail="Insufficient credits")

    try:
        engine = ParaphraseEngine()
        result = await engine.process(request.text, {
            "mode": "creative",
            "strength": 80
        })

        if result.get("status") == "success":
            return TransformResponse(
                job_id=str(uuid.uuid4()),
                status="completed",
                transformed_text=result["output"]
            )
        else:
            raise HTTPException(status_code=500, detail=result.get("error", "Processing failed"))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))