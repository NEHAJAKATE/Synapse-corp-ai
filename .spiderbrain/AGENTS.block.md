<!-- spiderbrain:start v=1 fp=fefd723f148f2cc0 commit=9a94c8ac17c7 -->
## Repo understanding (SpiderBrain)

This repo carries a committed brain in `.spiderbrain/`: a deterministic, source-free map of its
structure, dependencies, and blast radius (42 files, 36 edges). Consult it before
reading files, to know what matters and what a change reaches.

Fastest use (an MCP server for this repo, no SpiderBrain install, no account):
    npx spiderbrain mcp
One-off:
    npx spiderbrain blast <path>     # what a change to <path> reaches
    npx spiderbrain keystones        # the load-bearing files

Keystones (top by reach, precomputed so you get value without installing anything):
- backend/services/llm_fallback.py  (reaches 13 files)
- backend/agents/ava_hr.py  (reaches 6 files)
- backend/agents/accountant_agent.py  (reaches 5 files)
- backend/agents/atlas_ceo.py  (reaches 5 files)
- backend/agents/developer_agent.py  (reaches 5 files)
- backend/agents/marketing_agent.py  (reaches 5 files)
- backend/agents/nova_cfo.py  (reaches 5 files)
- backend/agents/orion_cto.py  (reaches 5 files)

The why (decisions, reasoning, always-fresh scores) is the cloud layer. Set SPIDERBRAIN_API_KEY
(get one at https://spiderbrain.ai/dashboard?tab=keys) and any command above also returns fresh
scores, semantic search, and `why <path>` (the decision behind a file).

Deterministic: regenerates byte-identically from commit 9a94c8ac17c7 (fingerprint fefd723f148f2cc0). Do not hand-edit between the markers.
<!-- spiderbrain:end -->
