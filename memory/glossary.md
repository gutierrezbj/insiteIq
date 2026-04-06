# Glossary — InsiteIQ / SRS

Shorthand, acronimos y lenguaje interno de SRS y del proyecto InsiteIQ.

## Acronimos SRS

| Term | Meaning | Context |
|------|---------|---------|
| SDD | System Design Document | 8 secciones obligatorias pre-codigo |
| ADR | Architecture Decision Record | SDD-04, cada decision con contexto y alternativas |
| SRS | System Rapid Solutions | La empresa, Madrid |
| MVP | Minimum Viable Product | Fase 1 del Manifiesto |
| SLA | Service Level Agreement | Compromisos de tiempo/calidad |
| ITIL | IT Infrastructure Library | Framework de gestion IT |

## Secciones SDD

| Seccion | Contenido |
|---------|-----------|
| SDD-01 | Definicion del Problema |
| SDD-02 | Alcance y Limites |
| SDD-03 | Arquitectura Tecnica |
| SDD-04 | Decisiones Tecnicas / ADRs |
| SDD-05 | Backlog Inicial |
| SDD-06 | Reglas de Desarrollo |
| SDD-07 | Plan de Testing |
| SDD-08 | Plan de Despliegue |

## Modulos InsiteIQ

| Term | Meaning |
|------|---------|
| Site Bible | Base de conocimiento por sitio fisico (historial, quirks, acceso, rack layout) |
| Copilot | IA de asistencia en tiempo real durante intervencion |
| TechMatch AI | Motor de seleccion inteligente de tecnicos (no solo cercania, adecuacion) |
| Shield | Sistema de garantia/cobertura segun nivel del tecnico |
| Ghost Tech | White-label — cliente usa la plataforma con su marca |
| Control Tower | Dashboard coordinador — vision de aguila de operaciones |
| Playbook | Guia paso a paso para intervenciones especificas |
| Skill Passport | Perfil profesional verificado del tecnico |
| Proof of Work | Documentacion: fotos geolocalizadas + firma digital |
| Panic Button | Boton de emergencia para clientes |
| Shadow Mode | Onboarding automatizado de tecnicos nuevos |
| Pre-Flight Check | Verificacion pre-intervencion (herramientas, repuestos, Site Bible leida) |
| Client Handshake | Confirmacion automatica con contacto del site 24h antes |
| Parts & Tools Intel | Generacion automatica de lista de materiales |
| Live Escalation Path | Videollamada a tecnico senior si se atasca |
| Post-Mortem Automatico | Resumen post-intervencion + mejoras identificadas |
| Coverage Map | Mapa de tecnicos disponibles por zona |
| Seasonal Forecast | Planificacion de demanda estacional |

## Capas de Plataforma

| Capa | Contenido |
|------|-----------|
| A | Inteligencia y Datos |
| B | Operaciones y Dispatch |
| C | Calidad y Garantia |
| D | Tecnicos y Talento |
| E | Clientes y Visibilidad |

## Espacios de Usuario

| Espacio | Tipo | Para quien |
|---------|------|------------|
| Tecnico | App movil | Tecnicos de campo |
| Coordinador | Dashboard web | Operaciones SRS |
| Cliente | Portal web | Clientes finales |

## Design System — SRS Nucleus v2.0

| Term | Meaning |
|------|---------|
| Nucleus v2.0 | Metodologia SRS de identidad visual por producto |
| Identity Sprint | Proceso de 6 pasos para definir la identidad de un producto |
| SRS Foundation | Tokens estructurales compartidos: spacing (4px base), border-radius, z-index, durations, easing |
| Vertical Theme | Skin de producto aplicado sobre Foundation (colores, tipografia, motion) |
| Distinctiveness Audit | Checklist pre-launch para verificar que el producto no parece generico |
| Accent Bar | Firma visual: borde izquierdo de 3px color primary (amber en InsiteIQ) |
| Label-Caps | Estilo de etiqueta: uppercase, mono (JetBrains), tracking-wide, color terciario |
| Stagger Wave | Patron de animacion: items aparecen secuencialmente con 60ms delay |
| Character Phrase | Frase que define la personalidad visual ("War room meets luxury ops center") |
| Blacklist | Lista de elementos prohibidos: fuentes (Inter, Poppins), colores (Tailwind defaults), layouts genericos |
| Glow Shadow | Shadow sutil con color primary para hover states (shadow-glow-primary) |

## Infraestructura SRS

| Term | Meaning |
|------|---------|
| SA99 | InfraService — dashboard de red de servidores SRS |
| healthcheck.sh | Monitoring obligatorio de containers |
| bleu | Mac Mini — entorno de desarrollo local |
| vps-staging | Servidor staging (100.110.52.22 / 187.77.71.102) |
| vps-prod | Servidor produccion (72.62.41.234) |
| Hostinger | DNS provider |
| Certbot | SSL automatico via Let's Encrypt |

## Competencia

| Competidor | Contexto |
|------------|----------|
| Field Nation | USA/Canada, 1M+ work orders/ano, cobra 10%. No cubre LATAM/EU |
| FieldEngineer | Superficial fuera USA/UK |
| Kinettix | Broker opaco, anade coste sin transparencia |
| Fiverr | En crisis (caida revenue 2026), IA destruye sus categorias. No cubre onsite |
| Upwork | Cobra 10% variable, no disenado para onsite |

## Fases del Protocolo de Kickoff

| Fase | Nombre |
|------|--------|
| 0 | Ideacion y Brainstorming |
| 1 | Setup del Proyecto en Notion |
| 2 | Documentacion SDD (8 secciones) |
| 3 | Reserva de Infraestructura |
| 4 | Desarrollo Local (MVP) |
| 5 | Deploy en Staging |
| 6 | Deploy en Produccion |
| 7 | Documentar y Cerrar Kickoff |

## Nicknames

| Nickname | Person |
|----------|--------|
| JuanCho | Juan Gutierrez, lead del proyecto |
| Andros | Operaciones SRS |
| Adriana | Operaciones SRS |
