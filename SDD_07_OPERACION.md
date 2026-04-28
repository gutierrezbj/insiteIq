# SDD-07 · InsiteIQ v2 — Operación y escalabilidad

**Fecha:** 2026-04-24 · **Owner:** JuanCho · **Depende de:** `SDD_03_ARQUITECTURA.md`

Cómo se despliega, se monitorea, se respalda y se escala InsiteIQ. Nivel suficiente para operar, no para certificar.

---

## 1. Entornos

| Entorno | Ubicación | Uso |
|---|---|---|
| **Local dev** | Mac Mini `bleu` (Juanguti) | Desarrollo día a día, branches locales. |
| **PROD** | VPS 1 (72.62.41.234 · Tailscale 100.71.174.77) · `/opt/apps/insiteiq-v2/` | Único entorno productivo. Herramienta interna SRS. |
| **~~Staging~~** | No existe (ADR-007). | — |

Dominios:
- `insiteiq.systemrapid.io` → frontend v2 (cuando F3 despliegue).
- `insiteiq-api.systemrapid.io` → opcional, o via `/api/` del mismo dominio con nginx reverse proxy.

---

## 2. Contenedores Docker

4 servicios compuestos en un `docker-compose.yml` único:

| Servicio | Imagen | Puertos (host:container) | Volumenes |
|---|---|---|---|
| `frontend` | build local (nginx + React estático) | `127.0.0.1:3110:80` | — |
| `api` | build local (FastAPI + uvicorn) | `127.0.0.1:4110:8000` | `./uploads:/app/uploads` (attachments) |
| `mongo` | `mongo:7` | `127.0.0.1:6110:27017` | `mongo-data:/data/db` |
| `redis` | `redis:7-alpine` | `127.0.0.1:6111:6379` | `redis-data:/data` |

Regla: siempre `127.0.0.1:PUERTO:INTERNO`. Exposición externa solo via nginx del host.

### Variables de entorno principales (`.env` en VPS 1)

```
MONGO_URI=mongodb://insiteiq:...@mongo:27017/insiteiq?authSource=admin
REDIS_URL=redis://redis:6379/0
JWT_SECRET=...
JWT_REFRESH_SECRET=...
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini
INTAKE_IMAP_HOST=imap.hostinger.com
INTAKE_IMAP_USER=wo@systemrapid.com
INTAKE_IMAP_PASSWORD=...
INTAKE_POLL_SECONDS=60
SMTP_HOST=smtp.hostinger.com
SMTP_USER=wo@systemrapid.com
SMTP_PASSWORD=...
UPLOADS_DIR=/app/uploads
PUBLIC_BASE_URL=https://insiteiq.systemrapid.io
LOG_LEVEL=INFO
FEATURE_FLAGS=recurring_reporting:on,compliance_gating:on
```

`.env` vive en VPS 1, nunca en git, permisos `600`.

---

## 3. Flujo de deploy

### Dev → PROD (flujo SRS estándar heredado de v1)

```bash
# en Mac Mini bleu
cd ~/dev/InsiteIQ
docker compose build frontend api
docker compose up -d --force-recreate frontend api   # smoke test local
git add . && git commit -m "feat(m3): thread shared messages"
git push origin main

# en VPS 1 (via SSH)
ssh root@72.62.41.234 'cd /opt/apps/insiteiq-v2 && \
  git pull && \
  docker compose build frontend api && \
  docker compose up -d --force-recreate frontend api && \
  docker compose ps && \
  git log --oneline -1'
```

Rollback: `git revert HEAD && push`, re-deploy igual.

### Primer deploy (cuando F3 arranque)

1. SSH a VPS 1.
2. `mkdir /opt/apps/insiteiq-v2 && cd /opt/apps/insiteiq-v2`.
3. `git clone git@github.com:gutierrezbj/insiteiq-v2.git .`
4. Copiar `.env` preparado.
5. `docker compose up -d --build`.
6. `docker compose exec api python -m scripts.seed_minimal` (seed §SDD-04 §20).
7. Configurar nginx del host: reverse proxy `insiteiq.systemrapid.io` → `127.0.0.1:3110`.
8. Certbot SSL: `certbot --nginx -d insiteiq.systemrapid.io`.
9. Registrar en `healthcheck.sh` SRS.
10. Registrar en SA99 InfraService.

---

## 4. Nginx (host VPS 1)

```nginx
server {
    listen 443 ssl http2;
    server_name insiteiq.systemrapid.io;

    ssl_certificate /etc/letsencrypt/live/insiteiq.systemrapid.io/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/insiteiq.systemrapid.io/privkey.pem;

    client_max_body_size 50M;   # para subida de fotos + plantillas

    location /api/ {
        proxy_pass http://127.0.0.1:4110/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 60s;
    }

    location / {
        proxy_pass http://127.0.0.1:3110/;
        proxy_set_header Host $host;
    }
}

server {
    listen 80;
    server_name insiteiq.systemrapid.io;
    return 301 https://$host$request_uri;
}
```

---

## 5. Backup y recuperación

### Mongo

- **Daily dump.** Cron en VPS 1 a las 03:30 UTC:
  ```
  30 3 * * * /usr/local/bin/backup-mongo.sh insiteiq-v2 >> /var/log/backup-mongo.log 2>&1
  ```
- Script SRS estándar `backup-mongo.sh` — añadir `insiteiq-v2` a la lista de DBs.
- Retención: 30 días locales en VPS 1 + sync semanal a almacenamiento remoto (Hostinger backup / B2 / Drive SRS — elegir en ejecución).
- Dump format: `mongodump --gzip --archive=insiteiq-v2-YYYY-MM-DD.gz`.

### Attachments (filesystem)

- Volumen `./uploads` montado en API container.
- Rsync diario del host VPS 1 → backup remoto junto con dumps Mongo.
- Si crece > 100 GB, se migra a S3-compatible (MinIO / Backblaze B2) — ver §11.

### Restore drill

- Cada trimestre: restore de dump en entorno aislado (Mac Mini `bleu`) para verificar integridad. Log en `memory/infra_restore_drills.md`.

---

## 6. Monitoring

### Healthcheck endpoints

- `GET /api/health` — responde 200 si API + Mongo + Redis están OK. Check interno.
- `GET /` en frontend — responde 200 si nginx interno sirve estático.

### Healthcheck SRS centralizado

- `healthcheck.sh` SRS corre cada 5 min en nodo central (SA99 / otro).
- Si InsiteIQ v2 cae: alerta a `juang@systemrapid.com` + Slack SRS ops.
- Si InsiteIQ v2 sube > 500ms consistentemente: warning.

### Logs

- `docker compose logs -f api` y `docker compose logs -f frontend` para debug puntual.
- Retención: última 7 días en disco (Docker default con rotación). Sin Loki/Grafana en v1.
- Si aparece patrón de bug recurrente, se añade Loki + Grafana (ver §11).

### Métricas de salud mínimas (manual en v1)

- Uso disco VPS 1 (`df -h`) — alert si > 85%.
- Uso memoria (`free -m`) — alert si < 500MB libres.
- Tamaño colecciones Mongo (`mongosh` con `db.stats()`) — monitoreo semanal.
- Count de `audit_log` — crece pero no preocupa hasta > 10M entries.

---

## 7. Seguridad operativa

### Acceso al VPS

- SSH key-based únicamente. Password login deshabilitado.
- Fail2ban activo.
- Firewall UFW: solo 22, 80, 443 abiertos al mundo. Todo lo demás bind a 127.0.0.1.
- Tailscale VPN para acceso admin directo a Mongo / Redis sin exponerlos.

### Secretos

- `.env` en `/opt/apps/insiteiq-v2/` con permisos `600` owner root.
- Nunca en git.
- Rotación de JWT secrets: cada 6 meses o tras evento sospechoso.
- API keys OpenAI rotables en cualquier momento sin downtime (restart API container con nueva key).

### Datos de cliente

- LLM parser M1 envía cuerpo de email a OpenAI. Esto es **dato del cliente**.
- Política: los emails que llegan a `wo@systemrapid.com` son datos operativos, no personales sensibles en sentido GDPR estricto (no hay PII regulada). Aún así, se documenta en aviso legal cliente cuando aplique.
- No se envía nunca a LLM: contraseñas, datos bancarios, fotos con datos personales identificables.
- Audit log nunca expone contenido de body de mensajes — solo metadata de quién/cuándo/qué entidad.

### Backups y compliance

- Backups cifrados en tránsito (rsync/SFTP) y en reposo si el proveedor remoto lo garantiza.
- Retención 1 año en remoto.
- Protocolo de borrado de datos a petición cliente: revisable en v2+ si algún cliente lo exige contractualmente.

---

## 8. RBAC y aislamiento

- Cada request al API pasa por dependency `get_current_user()` → obtiene `user + tenant_id + space + role` del JWT.
- Cada query a Mongo va a través de capa `repo/` que **siempre** inyecta `{tenant_id: current_tenant}` en el filtro.
- Tests de regresión: fixture crea 2 tenants, inserta datos en cada uno, valida que user de tenant A no ve datos de tenant B para ninguna colección. Test bloqueante de CI.
- Cross-space: un user con múltiples memberships elige espacio al login y JWT se emite para ese espacio. Para cambiar, logout + login.

---

## 9. Rate limiting

- Redis como backend de rate limit (lib `slowapi` o equivalente).
- Login: max 10 intentos / 5 min / IP.
- API general: max 600 req / min / user.
- Intake email: sin rate limit (flujo interno).
- LLM calls: wrapper interno con backoff exponencial si OpenAI responde 429.

---

## 10. Consideraciones de escalabilidad (cuándo empezar a preocuparse)

V1 vive cómodo en un VPS con recursos moderados. Señales para pasar al siguiente escalón:

| Señal | Umbral | Acción |
|---|---|---|
| CPU API > 80% sostenido | Durante 30+ min | Upgrade VPS, o separar `api` a su propio host. |
| Mongo query p95 > 500ms | Durante 1 día | Revisar índices. Después, upgrade instance o pasar a Mongo replica set. |
| Audit log > 10M entries | — | Migrar `audit_log` a Mongo timeseries collection. |
| Attachments > 100 GB en disco | — | Migrar a S3-compatible (MinIO self-hosted en VPS 2 o Backblaze B2). |
| > 50 WOs creadas por minuto | — | Workers async para intake e informes, cola Redis/RQ. |
| Usuarios concurrentes > 100 | — | Revisar sesiones y caché. Escalar horizontal api con nginx LB. |

Nada de esto se prepara en v1. Se actúa cuando aparezca.

---

## 11. Lo que no se hace hoy (pero se contempla)

Todos fuera de v1. Entran si se justifican por evidencia operativa.

- **Observabilidad completa** (Prometheus + Grafana + Loki + Tempo): si operación pide más visibilidad recurrente, se añade.
- **Tracing distribuido** (OpenTelemetry): monolito actual no lo necesita.
- **CI/CD formal** (GitHub Actions con build + test + deploy): hoy flujo manual bleu → SSH → pull. Si el equipo crece, se formaliza.
- **Blue/green deploy**: no hace falta en v1.
- **Feature flags dinámicos** (LaunchDarkly / Unleash): hoy por env var. Si se necesita toggle en caliente por usuario, se añade.
- **Multi-región**: todo en VPS 1 en un datacenter. Si la red SRS crece global-crítica, se replica.
- **Disaster recovery plan formal** (RTO/RPO documentados): hoy RPO ~24h (backup diario), RTO ~2h (restore manual). Si un cliente lo exige contractualmente, se formaliza.

---

## 12. Checklist operativo pre-producción (F7 gate)

Antes de declarar el criterio de producción cumplido:

- [ ] `docker compose ps` todos healthy durante 7 días seguidos.
- [ ] Healthcheck SRS registrado y alertas funcionando (probado con simulacro de caída).
- [ ] Backup Mongo diario ejecutándose, último dump verificado restaurable.
- [ ] Backup attachments diario ejecutándose.
- [ ] SSL válido, auto-renewal Certbot configurado.
- [ ] Nginx client_max_body_size suficiente para fotos PWA.
- [ ] Rate limiting activo y probado.
- [ ] Tests de aislamiento multi-tenant en CI verde.
- [ ] `.env` en VPS 1 con permisos `600` y sin leak en git.
- [ ] Audit log validado: 100% de mutaciones generan entry, 0 endpoints permiten delete/update sobre audit_log.
- [ ] Logs accesibles via `docker compose logs` sin errores críticos durante 7 días.
- [ ] Documentación de onboarding por rol escrita y revisada con al menos 1 usuario de cada tipo.
- [ ] Runbook de incidentes (qué hacer si API cae, si Mongo no arranca, si un backup falla) escrito y probado.

---

**Siguiente SDD:** SDD-08 · Riesgos y plan de mitigación.
