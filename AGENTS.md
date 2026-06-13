# Coefficient — VPS Migration Notice (2026-04-11)

## Shared Obsidian AgentMemory

Coefficient is ported to the shared vault at `/Users/hammer/Obsidian/AgentMemory/Projects/coefficient/coefficient.md`. After reading this file, read `/Users/hammer/Obsidian/AgentMemory/AGENTS.md` and the Coefficient project note before acting. Treat vault notes as durable cross-agent memory, not a replacement for repo docs or live runtime truth. At wrap-up, update the project note and append a dated session summary; never store secrets in the vault.

## VPS Migration Notice

The Hillsboro VPS (`5.78.186.27`) was decommissioned on 2026-04-11. The user consolidated everything onto **Helsinki**: `204.168.242.220`.

**This project is on Vercel and was NOT directly affected** — `coefficient.mythx.art` resolves to a Vercel CNAME (`cname.vercel-dns.com`) and is served from Vercel's CDN, not from any VPS. The user verified the Vercel deployment loads correctly after the migration.

That said, if any code, indexer, env var, or doc in this project still references:

- `5.78.186.27`
- `Hillsboro` / `hil-1` / `ubuntu-4gb-hil-1`
- The old Falkenstein box (`138.199.175.150`)

…treat them as stale. The current VPS for any backend dependency is `204.168.242.220` (Helsinki). The user has verified that nothing in this project depends on the old Hillsboro IP, but worth a check on first edit.

Canonical VPS state: `~/.claude/memory/user_vps_servers.md`
