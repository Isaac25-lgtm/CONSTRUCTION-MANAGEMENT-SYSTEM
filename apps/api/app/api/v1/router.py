from fastapi import APIRouter
from app.api.v1.routes import auth, users, projects

api_router = APIRouter()

# Include route modules
api_router.include_router(auth.router, prefix="/v1/auth", tags=["Authentication"])
api_router.include_router(users.router, prefix="/v1/users", tags=["Users"])
api_router.include_router(projects.router, prefix="/v1/projects", tags=["Projects"])
