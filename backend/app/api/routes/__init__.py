from fastapi import APIRouter

from app.api.routes import campus, grafico, health, indicadores, lancamentos, me, resumo

api_router = APIRouter()

api_router.include_router(me.router)
api_router.include_router(campus.router)
api_router.include_router(lancamentos.router)
api_router.include_router(resumo.router)
api_router.include_router(indicadores.router)
api_router.include_router(grafico.router)

__all__ = ["api_router", "health"]