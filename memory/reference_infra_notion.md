---
name: SRS Infrastructure Notion page
description: Notion page with full SRS infrastructure docs — servers, ports, Docker containers, security, backups, Tailscale VPN
type: reference
---

Full infrastructure documentation lives at:
https://www.notion.so/Infraestructura-DevOps-Estado-Actual-VPS-Mar-2026-2f57981f08ef815d9216c98dcc5ecfff

Catalogo de Infraestructura (detailed):
https://www.notion.so/3217981f08ef81828e31edfcc9b78414

Key facts (as of Mar 2026):
- PROD: 72.62.41.234 (srv1146496.hstgr.cloud), Ubuntu 24.04, KVM2 8GB/100GB, Frankfurt
- STAGING: 187.77.71.102 (srv1369522.hstgr.cloud), KVM1 4GB/50GB
- Tailscale IPs: prod 100.71.174.77, staging 100.110.52.22, mac 100.107.171.77
- Gateway: Nginx (not Traefik), SSL via certbot auto-renewal
- Port convention: 3xxx frontends, 4xxx APIs, 5xxx internal, 6xxx databases (offset per project)
- All Docker ports bound to 127.0.0.1
- Healthcheck every 5min (/opt/scripts/healthcheck.sh) + Telegram alerts (bot SA99)
- Backup: MongoDB daily 03:00 UTC + Hostinger auto-backup daily
- Deploy paths: /opt/apps/{project}/
- DNS: Hostinger (ns1.dns-parking.com) → A records → 72.62.41.234
- Cost: ~21 EUR/mo total (PROD ~10 + STAGING 5 + backups ~6)
