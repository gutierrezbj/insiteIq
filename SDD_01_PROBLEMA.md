# SDD-01 · InsiteIQ v2 — Problema

**Fecha:** 2026-04-24 · **Owner:** JuanCho · **Base:** `BLUEPRINT_V2.md`

---

## 1. Enunciado del problema (una frase)

Los servicios de campo de SRS (25 años de operación, red internacional) se gestionan hoy en **Outlook + WhatsApp + Excel + SharePoint del cliente**, sin un sistema operativo propio que tenga memoria, trazabilidad ni cockpit. El resultado es tiempo perdido, facturas que tardan años en cobrarse, proyectos que se escapan y dependencia de la cabeza de 3 personas.

---

## 2. Evidencia dura (3 casos documentados)

| Caso | Dolor | Quién sufre | Coste visible |
|------|-------|-------------|---------------|
| **Warehouse Miramar — cobro** | 2 años para cobrar una factura (mar-2024 → abr-2026). Thread multi-stakeholder (Claro + Hitss), cambios de contacto y formato, silencios de meses. | Adriana | Cash flow bloqueado, trabajo duplicado, relación comercial deteriorada. |
| **Miramar Warehouse Audit — operación** | 10 semanas fieldwork + 3 meses reconciliación. 21,263 records vs 9,000 SOW. Reporting estricto en plantilla del cliente (nomenclatura, headers, fecha mm-dd-yyyy). 4 follow-ups del cliente persiguiendo fecha de visita de validación porque SRS no respondía. | Juan, Andros, Carlos Marin, Jose Marin | Pelea comercial sobre scope, visita de validación peleada (courtesy vs QA), proyecto vive en Excel + SharePoint cliente. |
| **Gruma Foods Cisco Meraki** | 5 meses y 40+ emails, aún sin cerrar. 11 sitios en 8 países. Hardware del cliente / su broker (no SRS). Docs regulatorios por país (DUVRI Italia, Visura Camerale, certificados). Reschedulings constantes por bloqueadores externos. | Yunus, Andros, Juan | Proyecto vive en la cabeza de Yunus. Sin cockpit único. Cada cambio obliga a re-coordinar con 10+ stakeholders. |

Estos 3 casos son la evidence base. Cualquier feature del v2 se justifica contra uno de los 3 o no entra.

---

## 3. Stakeholders afectados y dolor específico

| Usuario (blueprint) | Dolor específico hoy |
|---|---|
| **Andros / Luis / Yunus / JuanCho** (coordinador SRS) | Outlook + WhatsApp simultáneo. Cada WO requiere copiar/pegar entre email del cliente, mensaje al tech, Excel de seguimiento. Se pierden WOs. Threads con 10+ stakeholders se dispersan. Ball-in-court invisible. |
| **Agustín** (rollout) | 90+ sitios McDonald's Panamá en WhatsApp infinito. Sin estado por sitio. Sin % avance real. |
| **Adriana** (finance) | Dos Excels + Outlook. Facturación disparada a mano por ella tras ver el WO cerrado. AP triangulado (cliente ordena ≠ cliente paga) sin modelo. Cobros envejecen sin alarma. |
| **Rackel y equivalentes** (supervisor cliente) | Pide estado por email porque no tiene visibilidad. Costo de coordinación proxy no monetizado. |
| **NOC / soporte cliente** | Coordinación 1:1 por WhatsApp con el tech de SRS en sitio. Sin trazabilidad. Si el tech se lesiona o cambia, la memoria del caso se pierde. |
| **Técnico de calle** | WhatsApp como único canal. Reporta con fotos sueltas. Informe se compila a mano por el coordinador desde los mensajes de WhatsApp. |

---

## 4. Modos de operación afectados (los 3)

1. **Reactivo** — WO única entrante por email. Ejemplo Fractalia (Pantallas POJ Ecuador). El 80% del volumen.
2. **Rollout** — proyecto multi-sitio. Ejemplo McDonald's Panamá 90+ sitios, Gruma 11 sitios 8 países, Assessment Claro Miami.
3. **Servicio recurrente con reporting a plantilla del cliente** — engagement continuo con entregables periódicos. Ejemplo Miramar Warehouse Audit (daily + weekly report a SharePoint del cliente).

El v1 asumió modos 1 y 2. El modo 3 no estaba contemplado y es el que trajo el dolor más agudo.

---

## 5. Lo que NO es el problema (scope negativo)

Para evitar que el SDD se expanda como el Blueprint v1.1:

- **No es que falte automatizar la compra de hardware.** SRS no compra hardware. Cuando el hardware afecta fecha, entra como bloqueador externo en el WO, no como módulo de supply chain.
- **No es que falte integrar con el ticketing del cliente (ServiceNow).** SRS es el último mono. La integración es email in + output devuelto. No API bi-direccional.
- **No es que falte un producto comercial.** InsiteIQ es interno SRS. Comercializarlo a Fractalia/Telefónica es v2+ de negocio, no de producto.
- **No es que falte AI/ML sofisticado.** El único uso de LLM justificado en v1 es parser de emails entrantes (< 60s intake). El resto es datos + audit log + plantillas.
- **No es que falte un cockpit bonito.** Es que no hay cockpit. El diseño visual se aborda en Identity Sprint con mock pixel-perfect, no en este SDD.
- **No es un problema técnico.** El v1 tiene 22+ pasitos deployed en PROD con SSL. El problema es que nadie los usa. Es un problema de producto, no de ingeniería.

---

## 6. Coste del status quo (estimación, no métrica dura)

| Dimensión | Impacto |
|---|---|
| Tiempo coordinador SRS | ~40% del día gestionando comunicación redundante entre Outlook, WhatsApp, Excel, SharePoint. |
| Tiempo Adriana | Reconciliación manual mensual. Cobros perseguidos a mano. Facturación disparada tarde por falta de trigger automático. |
| Cash flow | Casos como Miramar = 2 años para cobrar. Probablemente hay 5-10 casos similares en distinto estado de envejecimiento. |
| Dependencia personal | Yunus en Londres es el único que tiene contexto Gruma. Si se baja 1 semana, el proyecto se cae. Riesgo de bus factor 1. |
| Crecimiento bloqueado | No se pueden añadir 3 clientes nuevos al mismo tiempo porque el coordinador ya está saturado. Capacity ceiling impuesto por las herramientas. |
| Calidad percibida por cliente | Laly Castro tuvo que hacer 4 follow-ups. Esto erosiona reputación. Cliente dice "SRS es bueno pero hay que perseguirlos". |

---

## 7. Hipótesis de solución (marco, no diseño)

**Un sistema operativo interno con 4 propiedades:**

1. **Memoria única.** Cada WO, thread, entregable y actor queda en una sola base. Nada en la cabeza de nadie.
2. **Ball-in-court con timer.** Cada WO tiene responsable actual y contador. Rojo cuando envejece.
3. **Cockpit por rol.** Coordinador SRS, Supervisor cliente, NOC cliente, Tech de calle — cada uno abre su vista y ve lo que le toca hoy.
4. **Emisión adaptada al cliente.** El cliente recibe entregables en SU formato (plantilla del cliente siempre gana). InsiteIQ motor genérico por dentro, plantilla del cliente por fuera.

Detalle de módulos y alcance: SDD-02.
