---
name: Claro CES — Arcos Dorados SOW V1.1 (canon)
description: Análisis canónico del SOW V1.1 firmado 30-Ene-2025 + PA-1000055 Change Order (15-Oct-2025) entre SystemRapid + Fervimax JV con CES (Claro Enterprise Solutions LLC) para SDWAN Off-Net LATAM, end-client Arcos Dorados. Fuente operativa para carga InsiteIQ + cotización Phase II Venezuela.
type: project
---

# Claro CES — Arcos Dorados SDWAN Off-Net LATAM

## Identificación contractual

- **Project:** SD WAN Project Implementation - Off Net Locations LATAM
- **Client (facturador SRS):** CLARO ENTERPRISE SOLUTIONS, LLC ("CES")
  - 3350 SW 148th Avenue Suite 400, Miramar FL 33027
  - Federal Tax ID: 76-0532710
  - Email AP: `accounts.payable@usclaro.com`
  - Purchaser: Cely Castellanos
  - Approver: Andres Mosquera
- **End-Client:** Arcos Dorados (operador McDonald's LATAM)
- **Vendor:** SystemRapid LLC + Fervimax JV
  - **Registered address (legal):** 260 Madison Avenue, 8th Floor, New York NY 10016 (entidad **SR-US**, usada en SOW + PA)
  - **Billing/operational address:** 3508 NW 114th Ave, Miami FL 33178 (usada en facturas que vendors mandan a SR-US)
- **MSA:** vigente desde July 31, 2023
- **SOW V1.1:** firmado 30-Enero-2025 por Sajid Hafesjee (RTD SystemRapid) + Cori Reitman (CFO/General Counsel CES). Ref **04MSP**.
- **Blanket PO actual:** PA-1000055 (Change Order 15-Oct-2025) supersede PO-1002862. Period 2025-05-01 → 2030-04-30 (60 meses). Subtotal $28,797.60 USD.

## Pricing canónico

### CPE Maintenance MRC

| Concepto | Valor |
|---|---|
| TCV per Site (60m) | **$2,200 USD** |
| Installation OTC | **$500 USD** per site |
| Field Support MRC | **$28.33 USD/mes** ($1,700 / 60m) |

### Hourly Field Support por país

| País | Hourly Rate | Status Phase I |
|---|---|---|
| Curaçao | $70 | Activo (5 sites) |
| Trinidad & Tobago | $70 | Activo (4 sites) |
| Aruba | $70 | Activo (3 sites) |
| Panamá | $70 | Autorizado, sin sites |
| **Venezuela** | **$65** | **Autorizado, sin sites — target Phase II Jose Garcia** |
| French Guyana | $50 | Autorizado |
| Guadalupe | $50 | Autorizado |
| Martinique | $50 | Autorizado |
| USVI | $70 | Autorizado |
| New Off-Net | $70 default | Por activación |

### Multipliers off-hours

| Banda | Multiplier |
|---|---|
| After Hours (19:00-07:00) | +30% |
| Weekends (Sat 00:00 - Mon 08:00) | +50% |
| Holidays | +75% |

Billing en increments de 30 minutos, redondeo al alta media hora más cercana.

## Sites Phase I (12 sites activos al 2026-04-29)

### Aruba (3)
1. ARUBA HIGH RISE
2. ARUBA STA.CRUZ
3. SEROE BLANCO

### Curaçao (5)
4. PUNDA
5. SALINJA II
6. SALINJA
7. SANTA ROSAWEG
8. SANTA MARIA

### Trinidad & Tobago (4)
9. CIPRIANI
10. DUMFRIES ROAD
11. GRAND BAZAAR
12. GULF CITY MALL

NSR codes formato: `K34-GO00001AW-AW1463F-NP` (visto en FM 19566). Lat/lng + NSR exactos pendientes de ordenar por SRS Ops.

### Panamá (Phase Add-On, activo 2026)

Visto en facturas vendor Agustin (Alarmas Solutions) feb-2026:

- **PAM-P28** — Plaza Comercial Villa Lobos (instalado 19-feb-2026, $300 vendor cost)
- **PAM-P08** — Vía España, Hospital San Fernando (instalado 20-feb-2026, $300 vendor cost)

Format código sites Panamá: `PAM-P##` (Arcos Dorados Panamá restaurant numbered). Probable que existan al menos 28 sites Phase Panamá del SOW autorizado. Lista completa pendiente de Adriana/Agustin.

## Equipment master catalog (Cisco Meraki)

### Restaurants Arcos
- 1× Cisco Meraki **MX67** (firewall/router)
- 1× Cisco Meraki **MS120** (switch)
- 1× Cisco Meraki **MS125** (switch)
- 2× Cisco Meraki **MR44** (Wireless AP)
- Cabling: 2× UTP MX67↔ISP modem · 1× UTP MX67↔MS120 · hasta 30m UTP por AP MR44

### Dessert Centers
- 1× Cisco Meraki **MX68**
- 1× Cisco Meraki **MR36H**
- Cabling: 2× UTP MX68↔ISP modem · 1× UTP MX67↔MR36H

Lifecycle: customer puede instalar otros Cisco Meraki MX/MS/MR products durante el contrato.

## Workflow operativo (Annex A — Service Request Form)

### Installation request flow
1. CES envía Service Request Form via email **72hr advance**
2. SRS responde asignando FE (Field Engineer) en fecha/hora especificada
3. Tras implementación, SRS envía **closing email** misma thread con: Start Time, End Time, costos extra, descripción actividades
4. CES confirma → habilita billing del sitio activado

### Maintenance request flow
1. **CES GNOC (Global NOC)** request via engagement processes establecidos
2. SRS dispatches FE para Emergency o scheduled task
3. SRS envía **monthly report** dentro de los primeros 5 días del mes con tasks ejecutadas
4. Cada task order incluye: Start/End Time, costos extra, descripción
5. CES confirma → bills

### Cancellation fees (cliente cancela)

| Time window | Fee |
|---|---|
| 1 business day antes | 100% |
| 2 business days antes | 50% |
| 3 business days antes | 25% |

### Reschedule fees

| Time window | Fee |
|---|---|
| 1 business day antes | 50% (additional) |
| 2 business days antes | 25% (additional) |

## Stakeholders Claro CES

| Nombre | Rol | Email |
|---|---|---|
| **Cori Reitman** | CFO / General Counsel (sign authority) | — |
| **Cely Castellanos** | Purchaser PA-1000055 | Cely.Castellanos@usclaro.com |
| **Andres Mosquera** | Approver PA-1000055 | — |
| **Adrian Alvarado** (EXT-US) | Service Delivery Project Manager | Adrian.Alvarado@usclaro.com (+52 5620813701) |
| **Wilmer Colmenares** | Senior Claro (LCON Modo 5 Bepensa, recurrente) | Wilmer.Colmenares@usclaro.com |
| **Laly Castro** | AP / billing reviewer | Laly.Castro@usclaro.com |
| **Susana Gonzalez** | AP enforcement | Susana.Gonzalez@usclaro.com |
| **Alba Prieto** | Delivery USA team | Alba.Prieto@usclaro.com |
| **David Alcantara** | Delivery USA team | David.Alcantara@usclaro.com |
| **DL deliveryUSA** | Distribution list | deliveryUSA@usclaro.com |

## Stakeholders SystemRapid

| Nombre | Rol |
|---|---|
| Sajid Hafesjee | Regional Technical Director (firmante SOW) |
| Juan Gutierrez | Lead, owner (cuenta CES) |
| Andros Briceño | PM & Process Control (despacha FMs) |
| Adriana Bracho | Finance (factura CES via accounts.payable@) |
| Agustin Rivera | Tech plantilla |
| Arlindo Ochoa | Tech external (Claro requiere email @systemrapid.com) |
| Endson Juneword | Tech (passport NW7h2HBL6) — visto en FM 19566 Aruba |

## Customer contacts Arcos (end-client)

- **Juan Sebastian Montoya Acevedo** (+57 3137419206) — colombiano, customer contact en Aruba (visto FM 19566)

## Caso operativo de referencia: FM 19566 (Aruba dec 2025)

Cadena de email Andros↔Adrian que muestra los 3 dolores que InsiteIQ debe matar:

1. **Andros propone €800** instalación equipment installation no-Claro
2. **Adrian rechaza:** "We can't accept this cost, don't dispatch" — currency mismatch (SOW exige USD, no EUR) + scope ambiguity
3. **Adrian luego corrige:** "After internal review, this site IS in current SoW per Section A page 2 (FE dispatch in CES Off-Net countries LATAM for Cisco Meraki) y Section F page 5 (LATAM Off-Net countries incluye Aruba)"

### Datos del FM (shape exacto del Service Request Form)

- **FM #:** 19566
- **NSR:** K34-GO00001AW-AW1463F-NP
- **Provider PO/BPA:** PA-1000055
- **Service Date:** Monday December 15, 2025 — 03:00 PM local
- **Customer:** Arcos Dorados
- **Site:** ARU-IRAUSQUIN Blvd-CDP (J. E. IRAUSQUIN Blvd, Noord, Aruba)
- **Lat/Lng:** 12.5743099, -70.0442607
- **Service Type:** Remote Hands, Installation, Troubleshooting
- **Office Type:** CDP
- **Scope:**
  - Physical Installation of Equipment (Customer provides Rack + Power)
  - Connection to ISP demarcation devices
  - Labeling cables
  - Speed test
- **Required Tools:** Laptop w/ internet + adapter, Cisco console cable + adapters + software, AnyDesk
- **Conference channel:** WhatsApp group SystemRapid-CES (← matar con thread shared en InsiteIQ)
- **Tech inicialmente asignado:** Endson Juneword (Passport NW7h2HBL6)

### Aprendizajes para InsiteIQ

1. **Currency validation against service_agreement.currency** antes de cotizar trabajos extras
2. **Out-of-scope auto-flag** validando contra SOW absorbido (referencia páginas)
3. **Thread shared mata WhatsApp** — toda la cadena de coordinación CES↔SRS debe vivir en InsiteIQ con timestamp + actor + delivery proof
4. **defensive_email auto-generated** cuando el cliente reescribe scope ex-post (Modo 4 Pellerano playbook)
5. **NSR como external_reference** del site model

## RMA Flow (warehouse Claro Miami)

Section C del SOW dice "Onsite assistance for **RMA processing, equipment replacement, and return to manufacturer**".

Mapeo a Asset + AssetEvent + UI nueva:

1. Equipment falla en site → tech crea AssetEvent `failed`
2. SRS solicita RMA a CES → AssetEvent nuevo `parts_ordered_miami` (extender enum)
3. CES Miami warehouse (Miramar FL) despacha → `parts_dispatched_miami`
4. Tránsito Miami → site (Aruba/Curaçao/T&T/Panamá/Venezuela)
5. Tech recibe en site → `parts_received_site`
6. Tech instala → AssetEvent `replaced` (existente)
7. Tech retorna unidad falla a manufacturer → AssetEvent `decommissioned` con notes

UI nueva en SideDetailPanel: sección "Partes Claro Miami → Site" con timeline de Assets en flujo, ETAs, tracking.

## Cotización Phase II Venezuela (target Jose Garcia)

Pricing del SOW V1.1 ya autoriza:

- TCV $2,200/site × N sites × 60m = X
- Installation $500/site OTC = Y
- MRC $28.33/site/mes = Z/mes
- Field Support hourly: **$65/hr** (Venezuela rate del SOW)
- Multipliers: +30% after hours / +50% weekends / +75% holidays

**Ejemplo 20 sites Phase II Venezuela:**
- TCV: 20 × $2,200 = **$44,000**
- Installation: 20 × $500 = **$10,000 OTC**
- MRC: 20 × $28.33 × 12 = **$6,799.20/año**
- Estimación field support: 50hr/mes × 12 × $65 = **$39,000/año**
- **Año 1 total estimado: ~$100K** (sin scope creep)
- **TCV 60m total: $279K** (sin field support)
- **+ Field support 60m estimado: ~$195K**
- **TCV 60m completo: ~$474K**

Escalado a 50 sites: ~**$1.2M TCV 60m** + $400K field support estimate.

## Riesgos documentados (cross-ref [Modo 4](project_modo4_audit_decisions.md))

1. **Scope rewrite ex-post Pellerano-style** — visto en FM 19566 Aruba. Mitigación: SOW absorbed con paginas referenciables + `ambiguity_flag` automático
2. **Currency lock USD** — CES no acepta EUR. Mitigación: validation contra `service_agreement.currency`
3. **5 business days amended PO requirement** — si Change Order no llega en 5 días, work suspended
4. **Vaccination requirements** — CES informa cuando aplica, schedule slip risk
5. **Channel partner Fervimax JV** — revenue share aplica per [Modo 3](project_modo3_gruma_decisions.md). Confirmar % vigente con Adriana

## Vendor Workflow — Agustin double-hat (Alarmas Solutions Panamá)

**Caso "rro de cojones" del owner:** Agustin es simultáneamente:

1. **Empleado SystemRapid** con email `agustinc@systemrapid.com` (LATAM service leader)
2. **Vendor independiente** con su entidad propia **Alarmas Solutions** (Panamá, RUC `E-8-118050 DV83`)

Cuando ejecuta WOs Arcos Dorados Panamá bajo el SOW, factura semanalmente a SR-US como contractor externo.

### Vendor entity en sistema

- **Org name:** Alarmas Solutions
- **Type:** `vendor` (partner_relationships)
- **Country:** Panamá
- **Tax ID:** RUC E-8-118050 DV83
- **Owner contact:** Agustin Rivera (cross-link a user `agustinc@systemrapid.com`)
- **Bank USD:** Community Federal Savings Bank · Acct 8311953616 · Routing 026073150 · Swift CMFGUS33 · NY USA
- **Bank EUR (Wise):** IBAN BE18 9671 7902 3465 · Swift TRWIBEB1XXX · Brussels BE

### Vendor invoice workflow (semanal)

1. Agustin ejecuta WOs durante la semana en sites Arcos Panamá
2. Viernes EOD genera factura Alarmas Solutions → SR-US (Miami billing address)
3. Email a `Adrianab@systemrapid.com` con CC Sajid + Juan
4. Subject pattern: `Arcos Dorados - Panama - Invoice 00### - Invoice 00###`
5. PDF con tabla: fecha + site + amount (típico **$300/intervención**)
6. Adriana procesa AP via three-way match → paga a USD account o EUR Wise

### Three-way match (cross-ref [Sprint X-d Vendor Invoice AP](MEMORY.md))

Para cada vendor invoice de Agustin, InsiteIQ debe matchear:

- **Vendor invoice line** → site_code (PAM-P28) + date (19-feb-2026) + amount ($300)
- **WorkOrder ejecutada** con `assigned_tech_user_id = agustin.user_id` + `site_id = site_PAM-P28._id` + `closed_at` ≈ 19-feb-2026
- **CES revenue line** del SOW → field support hours billed a CES via PA-1000055 a $70/hr Panamá

### Margin per WO (cost_snapshot del [WO model X-g](MEMORY.md))

Una WO Panamá ejecutada por Agustin típica:
- Vendor cost (Alarmas → SR-US): ~$300
- CES revenue (SR-US → CES): depende horas billables a $70/hr · típico WO 4-6h = $280-420 + Installation OTC $500
- Si es Installation OTC: $500 - $300 = **$200 margen** = ~40% margin
- Si es Maintenance hours: variable según horas reales

Sistema debe exponer este margen en `WorkOrder.cost_snapshot` (ya en backend X-g pasito) + Project P&L 3 márgenes (X-f).

### Demo killer para Jose Garcia / Claro VE

Cuando Jose vea InsiteIQ con data REAL Arcos Panamá + invoice flow Agustin + margin transparency, no solo ve "tool de coordinación" — ve **el sistema financiero completo end-to-end** que SRS opera. Eso es el [Domain 12.7 Offer Profitability Engine](project_gtm_consulting_led.md) en demo.

Mensaje implícito a Jose: "esto que ves operando con Arcos Panamá es lo que vamos a operar para vosotros en Venezuela — con la misma transparencia financiera, mismo workflow, mismo control de scope vs SOW".

## Operación factura mensual

Workflow validado en email chain Adriana↔Adrian↔Laly (ago 2025):

1. SRS envía factura mensual a `accounts.payable@usclaro.com` con CC stakeholders
2. Carátula incluye **PA-1000055** (sin esto, payment se pierde)
3. Cuerpo: País, Concepto, Cantidad sitios/país, MRC
4. Anexo Excel + PDF con: país, nombre del sitio, NSR, número de mes
5. Prorrateo según activation_date de cada site
6. Net 30 desde recibo

## Próximos pasos pendientes

- [ ] Cargar 12 sites Phase I Caribbean (Aruba/Curaçao/T&T) con lat/lng + NSR exactos
- [ ] Cargar sites Phase Panamá (mínimo PAM-P28 + PAM-P08, lista completa por confirmar)
- [ ] Cargar Fervimax org como JV partner con % revenue share
- [ ] Cargar Alarmas Solutions org como vendor de Agustin
- [ ] Cargar FMs ejecutados (incluyendo FM 19566 Aruba como caso demo)
- [ ] Cargar vendor invoices Agustin (00756 + 00757) como ejemplos para three-way match
- [ ] Implementar UI Warehouse Miami flow + extensión enum AssetEvent (firma owner pendiente)
- [ ] Cotizar Phase II Venezuela formal con números reales del cliente Jose Garcia
- [ ] Sync con Adriana sobre channel partner % Fervimax vigente
