---
name: Pain Evidence Log — Casos reales que InsiteIQ resuelve
description: Serie acumulativa inmutable de capturas / emails / situaciones reales que InsiteIQ mata. Cada entry mapea el dolor concreto a la feature de InsiteIQ que lo resuelve, con gaps documentados para iters futuras. Source canónico para showcase comercial al cliente y priorización del roadmap.
type: project
---

# Pain Evidence Log

> Serie acumulativa inmutable.
> Cada entry: contexto + dolor inventariado + cómo InsiteIQ lo cuenta + gaps detectados.
> Sin emoji ni dramatismo: hechos operativos verificables.

## Index

| # | Caso | Fecha | Cuenta cliente | Dolores | Estado |
|---|---|---|---|---|---|
| 001 | HQ Computación · WhatsApp cobranza Palacio de Hierro MX | pre-2026-04 | HQ / Palacio MX | 10 (AR/AP) | Resumen en `MEMORY.md` |
| 002 | ZARA Chile Talcahuano · 29 días por $100 + epílogo Tenancingo paralelo | pre-2026-04 | ZARA Chile + MX | 18 | Resumen en `MEMORY.md` |
| 003 | Miramar Claro US · Arturo Pellerano scope rewrite ex-post | pre-2026-04 | Claro US | 10 | Resumen en `MEMORY.md` |
| 004 | Bepensa Carolina · 44 días deliverable rechazado + WhatsApp Sajid-Arlindo nocturno | pre-2026-04 | Bepensa via Fervi JV → Claro US | 26 | Resumen en `MEMORY.md` |
| **005** | **TOUS USA · Tier-2 Fervimax-SRS-sub local · primera intervención Pembroke Pines FL** | **2026-04-30** | **TOUS via Fervimax → SRS → sub Carlos Marin** | **4** | **Este doc** |
| **006** | **Panamá Rollout · Reporte status conciliación Adrian Claro CES** | **2026-05-01** | **Arcos Dorados via Claro CES → SRS** | **6** | **Este doc** |

> Entries #001–#004 viven al momento solo como resumen en `MEMORY.md` desde
> sesión Cowork pre-2026-04-29. Si owner quiere rescatar con detalle completo
> y formato uniforme, pivot in-place esos resúmenes a este doc.

---

## #005 — TOUS USA · Tier-2 Fervimax → SRS → sub local · live 2026-04-30

### Contexto operativo

Andrés Tyminskiy (Fervimax Project Manager, Madrid) recibe pedido de TOUS
para visita técnica en tienda Pembroke Pines FL (11401 Pines Blvd #442).
Issue: connectivity. Acción: desconectar todos los devices y reconectar
uno por uno (diagnóstico shotgun sin root cause). Fecha pedida: lunes
4-may-2026, horario flexible pero preferentemente mañana.

Cadena: end-client TOUS → cliente intermedio Fervimax → channel partner
SRS → sub externo Carlos Alberto Marin Acosta (Florida, gmail directo,
sin email @systemrapid.com porque TOUS/Fervimax no lo exigen).

### Thread real (5 hops en ~6 horas)

1. **08:18 BST** — Andrés (Fervi) → Juan + Andros + Yunus (SRS) + Álvaro (Fervi).
   "Necesitamos tech para TOUS Pembroke Pines, lunes idealmente. Mandar
   nombre/teléfono/ID antes de ir para procesar permisos."
2. **13:01 CET** — Juan responde acuse + pregunta horario y si site fue informado.
3. **15:43 CET** — Andros responde con datos del tech: Carlos Marin, DNI
   Driver License M352101771880, gmail, +1 786 915 1158, disponible lunes 4.
4. **17:01 CET** — Andrés acuse y pregunta "when will he be able to attend
   the site?" (ETA específico al store).
5. **Pendiente** — SRS debe coordinar con Carlos hora exacta y responder a
   Andrés. Andrés a su vez tiene que pasar la info a TOUS para procesar
   permisos de acceso del tech a la tienda.

### Dolores inventariados

| # | Dolor | Cómo InsiteIQ lo cuenta hoy | Gap |
|---|---|---|---|
| 1 | **Thread de 5 hops sin estado central.** Solo el que estuvo en el thread sabe leer. Si Yunus se va de vacaciones, Andros tiene que reconstruir. | WO + threads compartidos + `ball_in_court` con timestamp por cada hand-off. Audit log preserva el orden completo. | — |
| 2 | **Tech sub gmail vs email @systemrapid.com.** Cada cliente exige cosa distinta (Claro US sí, TOUS no). Provisioning ad-hoc por proyecto, sin policy clara. | Skill Passport por tech + flag `email_alias_required` por contrato. | Falta UI explícita de policy de email per-cliente en Service Agreement. |
| 3 | **Permisos del site exigen pre-envío de datos del tech.** Andrés necesita nombre/DNI/teléfono para mandar a TOUS. SRS reescribe esa info por email cada vez. | Briefing + pre-flight check tienen los datos del tech. | Falta **"tech credentials dispatch packet"** auto-generable como artifact (PDF compacto con foto/nombre/ID/teléfono firmado por SRS) que el coord cliente pueda mandar al site sin reescribir. |
| 4 | **ETA del tech al site es info que el cliente espera proactivamente.** SRS pregunta a Carlos → Carlos responde → SRS pasa a Andrés → Andrés pasa a TOUS. 3 hops de email para una hora. | `scheduled_at` en WO captura la fecha. | Falta **handshake formal del tech**: "Carlos confirma 9:30am EST" como evento ack-ed visible al cliente sin email-tennis. |

### Por qué este caso vale para el showcase comercial

Es el patrón Modo 3 Tier-2 puro pero acotado (sin tier 4, sin compliance
overlay). Demuestra que InsiteIQ funciona desde el primer hop sin
requerir migración masiva del cliente. Bonus: caso vivo en el momento
del demo, no histórico — el coord puede ver el WO evolucionar en
tiempo real durante la presentación.

### Notas internas (omitir en showcase al cliente)

- El precio del proyecto Fervi-USA quedó como tema político caliente con
  Fervimax. NO entrar al tema "fixed price + visibilidad de preciario"
  en presentación al cliente. Owner decisión 2026-05-02.

---

## #006 — Panamá Rollout · Conciliación reporte status Adrian Alvarado · 2026-05-01

### Contexto operativo

Adrian Alvarado (Claro CES, Service Delivery PM) manda update periódico
del rollout SDWAN Off-Net LATAM Phase II Panamá (PA-1000066 · cliente
end-client Arcos Dorados Multilatinas ROW). El reporte llega como
spreadsheet pegado en email con dos tablas: activated sites y pending
sites. Andros pregunta a Adrian sobre 4 sites cancelled mencionados en
chat paralelo (no listados en el cuerpo del email).

### Datos numéricos del último reporte

- **Activated:** 70 sites (20 CDP + 49 Restaurantes + 1 Centro de Datos)
- **Pending:** 17 sites
- **Total listado:** 87 sites
- **SOW Wave 2 declara:** 89 sites
- **InsiteIQ tiene cargados:** 90 WOs (verificado en CSV de Iter 2.3)
- **Andros menciona:** 4 cancelled (info paralela, no en el cuerpo)

87 + 4 cancelled = 91, supera el SOW de 89. Discrepancia de ±3 sites
sin clarificar.

### Outliers detectados a mano (no automáticos)

- **PAN-P10K1 = 7h52min** vs promedio ~1h45min. ¿Falla de hardware?
  ¿Re-trabajo? ¿Tech nuevo entrenándose? Sin tooling no se sabe.
- Días pico de equipo Agustín: 4/10/26 (3 CDP P83) y 4/13/26 (3 sites
  P22 + restaurante).

### Velocidad y forecast

70 activated entre oct/25 y abr/26 = ~7 meses → ~10 sites/mes promedio.
A ese ritmo los 17 pending tardan ~7 semanas más → ETA fin junio 2026.

### Dolores inventariados

| # | Dolor | Cómo InsiteIQ lo cuenta hoy | Gap |
|---|---|---|---|
| 1 | **Status report del cliente = spreadsheet pegado en email.** SRS lo parsea a mano para conciliar contra su tracking interno. | Cuadro de Mando del rollout + Export PDF/XLSX (Iter 2.3). Lo que Adrian manda InsiteIQ lo genera en 3 clicks sin pegar imagen. | — |
| 2 | **Discrepancia silenciosa entre cuentas (cliente 87 vs SOW 89 vs sistema 90).** Sin tooling esto se descubre en reuniones de conciliación tardías. | `total_sites_target` en project + auto-conteo de WOs por status. La discrepancia salta sola en el cuadro de mando. | — |
| 3 | **Outlier de duración escondido.** Nadie nota PAN-P10K1 (7h52min) salvo lectura fila por fila. Patrón se repite en cada reporte. | Insights Dashboard tiene KPIs de duración. | Falta **detección automática de outliers** (1.5σ sobre el promedio del project) + alerta operativa al SRS coord. |
| 4 | **Cancelled sites mencionados en chat paralelo.** Andros pregunta a Adrian porque tiene info de WhatsApp/llamada que el email oficial no tiene. | `status="cancelled"` como state machine + audit log. Si se cancela en sistema, queda documentado, nadie pregunta. | — |
| 5 | **Velocidad y ETA del rollout solo calculable a mano.** Adrian no incluye eso en el reporte. SRS lo deriva manual por cada update. | `throughput_week` + `eta_to_100pct_weeks` calculados auto en backend (verificado vivo en Iter 2.4 tab Cuadro de Mando). | — |
| 6 | **Re-scheduling de pending = email-tennis.** Cuando el cliente cambia prioridad, hay que re-coordinar caso por caso. | Modal "Programar desde Mapa" (Iter 2.1) cubre WO individual. | Falta **bulk re-schedule** de múltiples pending en un solo flow (pick N WOs + asignar tech + ventana de fechas). |

### Por qué este caso vale para el showcase comercial

Demuestra el cierre del loop de info externa (cliente envía spreadsheet)
contra fuente de verdad interna (InsiteIQ). El reporte que hoy Adrian
arma a mano para mandar a SRS es **exactamente** el output que InsiteIQ
genera al revés (3 clicks en el botón Exportar) — invertir el flujo
muestra el valor sin requerir cambios del lado del cliente.

---

## Patrón cross-casos (para discurso al cliente)

> *El email es la cárcel actual de la información operativa. Estados,
> conteos, fechas, decisiones — todo vive en threads que solo el que
> estuvo en el thread sabe leer. InsiteIQ saca esa información del
> email y la pone en un sitio compartido auditable. El email se vuelve
> solo el canal de input/output con stakeholders externos; no el sistema
> de registro.*

Aplica al menos a:
- TOUS (caso #005): thread Fervi-SRS-sub
- Panamá (caso #006): reporte Claro
- Y por extensión a HQ Computación / ZARA Chile / Miramar / Bepensa
  (entries #001–#004 según resumen MEMORY.md).

---

## Gaps acumulados desde este log (candidatos roadmap)

| Origen | Gap | Prioridad sugerida |
|---|---|---|
| #005 dolor 3 | Tech credentials dispatch packet auto-PDF | Media · alto valor demo |
| #005 dolor 4 | Tech ETA acknowledgment como handshake formal | Media · cierra loop común |
| #006 dolor 3 | Detección automática outliers de duración | Baja · feature insights avanzado |
| #006 dolor 6 | Bulk re-schedule de N pending en un flow | Alta · valor inmediato Arcos Wave 2 |

Owner decide cuándo y cuáles entran al sprint roadmap.
