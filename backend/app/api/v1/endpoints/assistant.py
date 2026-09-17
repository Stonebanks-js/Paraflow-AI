from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from typing import Optional

from app.schemas.assistant import (
    AssistantSessionListResponse,
    AssistantSessionDetail,
    AssistantSessionCreate,
    AssistantSessionOut,
    AssistantSendMessageRequest,
    AssistantSendMessageResponse,
)
from app.api.v1.endpoints.auth import get_current_user
from app.services.assistant_service import AssistantService
from app.services.document_extraction_service import extract_text, UnsupportedFileError

router = APIRouter(prefix="/assistant", tags=["assistant"])

MAX_UPLOAD_BYTES = 10 * 1024 * 1024  # 10MB


@router.post("/extract-file")
async def extract_file(file: UploadFile = File(...), current_user=Depends(get_current_user)):
    """Server-side text extraction for attachment types a browser can't
    parse on its own (PDF, DOCX). Plain-text formats are still read
    client-side via FileReader -- this endpoint only exists for the
    binary formats, so no unnecessary round trip for a .txt file."""
    content = await file.read()
    if len(content) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="File too large (max 10MB).")
    try:
        text = extract_text(file.filename or "upload", content)
    except UnsupportedFileError as e:
        raise HTTPException(status_code=422, detail=str(e))
    return {"filename": file.filename, "text": text}


@router.get("/sessions", response_model=AssistantSessionListResponse)
async def list_sessions(project_id: Optional[str] = None, current_user=Depends(get_current_user)):
    items = await AssistantService().list_sessions(str(current_user["id"]), project_id=project_id)
    return {"items": items}


@router.post("/sessions", response_model=AssistantSessionOut, status_code=201)
async def create_session(request: AssistantSessionCreate, current_user=Depends(get_current_user)):
    session = await AssistantService().create_session(str(current_user["id"]), request.project_id)
    return session


@router.get("/sessions/{session_id}", response_model=AssistantSessionDetail)
async def get_session(session_id: str, current_user=Depends(get_current_user)):
    session = await AssistantService().get_session(str(current_user["id"]), session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return session


@router.delete("/sessions/{session_id}")
async def delete_session(session_id: str, current_user=Depends(get_current_user)):
    deleted = await AssistantService().delete_session(str(current_user["id"]), session_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Session not found")
    return {"status": "deleted"}


@router.post("/sessions/{session_id}/messages", response_model=AssistantSendMessageResponse)
async def send_message_to_session(
    session_id: str, request: AssistantSendMessageRequest, current_user=Depends(get_current_user)
):
    try:
        result = await AssistantService().send_message(
            user_id=str(current_user["id"]),
            session_id=session_id,
            content=request.content,
            attachment_text=request.attachment_text,
            attachment_name=request.attachment_name,
        )
    except ValueError:
        raise HTTPException(status_code=404, detail="Session not found")
    return result


@router.post("/messages", response_model=AssistantSendMessageResponse)
async def send_message_new_session(
    request: AssistantSendMessageRequest,
    project_id: Optional[str] = None,
    current_user=Depends(get_current_user),
):
    """Send the first message of a brand new session -- creates the
    session and returns it alongside the reply in one round trip, so the
    frontend doesn't need a separate create-then-send call for a fresh chat."""
    result = await AssistantService().send_message(
        user_id=str(current_user["id"]),
        session_id=None,
        content=request.content,
        attachment_text=request.attachment_text,
        attachment_name=request.attachment_name,
        project_id=project_id,
    )
    return result
