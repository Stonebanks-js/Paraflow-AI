from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional

from app.schemas.history import HistoryListResponse, HistoryDetail
from app.api.v1.endpoints.auth import get_current_user
from app.services.history_service import HistoryService

router = APIRouter(prefix="/history", tags=["history"])


@router.get("", response_model=HistoryListResponse)
async def list_history(
    project_id: Optional[str] = Query(default=None),
    limit: int = Query(default=50, ge=1, le=200),
    current_user=Depends(get_current_user),
):
    items = await HistoryService().list_history(
        user_id=str(current_user["id"]), limit=limit, project_id=project_id
    )
    return {"items": items}


@router.get("/{job_id}", response_model=HistoryDetail)
async def get_history_item(job_id: str, current_user=Depends(get_current_user)):
    item = await HistoryService().get_job(user_id=str(current_user["id"]), job_id=job_id)
    if not item:
        raise HTTPException(status_code=404, detail="History item not found")
    return item


@router.delete("/{job_id}")
async def delete_history_item(job_id: str, current_user=Depends(get_current_user)):
    deleted = await HistoryService().delete_job(user_id=str(current_user["id"]), job_id=job_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="History item not found")
    return {"status": "deleted"}
