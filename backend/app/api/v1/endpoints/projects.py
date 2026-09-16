from fastapi import APIRouter, Depends, HTTPException

from app.schemas.projects import ProjectCreate, ProjectUpdate, ProjectResponse, ProjectListResponse
from app.api.v1.endpoints.auth import get_current_user
from app.services.projects_service import ProjectsService

router = APIRouter(prefix="/projects", tags=["projects"])


@router.post("", response_model=ProjectResponse, status_code=201)
async def create_project(request: ProjectCreate, current_user=Depends(get_current_user)):
    project = await ProjectsService().create_project(str(current_user["id"]), request.name)
    return project


@router.get("", response_model=ProjectListResponse)
async def list_projects(current_user=Depends(get_current_user)):
    items = await ProjectsService().list_projects(str(current_user["id"]))
    return {"items": items}


@router.patch("/{project_id}", response_model=ProjectResponse)
async def rename_project(project_id: str, request: ProjectUpdate, current_user=Depends(get_current_user)):
    project = await ProjectsService().rename_project(str(current_user["id"]), project_id, request.name)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


@router.delete("/{project_id}")
async def delete_project(project_id: str, current_user=Depends(get_current_user)):
    deleted = await ProjectsService().delete_project(str(current_user["id"]), project_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Project not found")
    return {"status": "deleted"}
