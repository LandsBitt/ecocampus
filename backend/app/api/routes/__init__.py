from fastapi import APIRouter

from app.api.routes import campus, fatores, grafico, health, importar, indicadores, lancamentos, me, public, resumo, usuarios

api_router = APIRouter()

api_router.include_router(public.router)
api_router.include_router(me.router)
api_router.include_router(campus.router)
api_router.include_router(lancamentos.router)
api_router.include_router(resumo.router)
api_router.include_router(indicadores.router)
api_router.include_router(grafico.router)
api_router.include_router(importar.router)
api_router.include_router(usuarios.router)
api_router.include_router(fatores.router)

__all__ = ["api_router", "health"]