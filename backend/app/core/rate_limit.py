"""
InsiteIQ — Rate limiting (slowapi) · 2026-06-08.

Protege endpoints sensibles (hoy: /auth/login) de fuerza bruta.
slowapi estaba en requirements.txt desde Foundation pero nunca se cableó.

Detrás del nginx del compose, request.client.host es la IP interna del
contenedor · la IP real del cliente viene en X-Forwarded-For. key_func
defensivo: usa el primer hop de XFF si existe, fallback a client.host.
"""
from slowapi import Limiter
from starlette.requests import Request


def client_ip(request: Request) -> str:
    xff = request.headers.get("x-forwarded-for")
    if xff:
        return xff.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


limiter = Limiter(key_func=client_ip)
