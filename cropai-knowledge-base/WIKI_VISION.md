# CropAI Knowledge Base — design notes

Internal design notes for how compiled knowledge works inside the CropAI ecosystem. This describes the **pattern**, not a vendor product.

### The core idea

Many document + LLM setups work like retrieval: files are chunked, relevant fragments are pulled at question time, and the model answers from those fragments. That works, but the model is effectively **re-deriving** structure on every question, and little **persists** as a maintained artifact.

The approach here is different: the system **incrementally builds and maintains a wiki** — structured, interlinked markdown that sits between raw sources and the user. When a new source arrives, it is not only stored; it is **integrated** into entity pages, summaries, and cross-references, and contradictions can be surfaced. The knowledge is **compiled and kept current**, not re-derived from scratch on every query.

**The wiki is a persistent, compounding layer.** Cross-references and synthesis can accumulate. That is the intended difference from one-off chunk retrieval.

This applies to research, operations, agronomy notes, and any domain where knowledge should **stay organized** over time.

### Architecture

**Raw sources** — curated inputs (articles, notes, exports). Treated as immutable: the automation reads them but does not rewrite them as the authority copy.

**The wiki** — generated markdown (summaries, entities, index, log). This layer is what query and browse operate on.

**The schema** — `SCHEMA.md` plus conventions: how ingest, query, and lint behave. This keeps behavior consistent as the project evolves.

### Operations

**Ingest** — Add a source; produce or update wiki pages, refresh the index, link related pages, append the log.

**Query** — Ask a question; rank relevant pages (index + retrieval helpers), read those pages, synthesize an answer with citations. Good answers can be saved back as new wiki pages.

**Lint** — Health pass: orphans, staleness, missing links, contradictions where configured.

### Indexing and logging

**index.md** — Catalog of wiki pages (typically one line per page). Used to navigate before loading full articles.

**log.md** — Append-only timeline of ingests, queries, and lint runs.

### Optional tooling

At larger scale, local search over markdown (hybrid keyword + optional embeddings) can supplement the index. Browser clipper extensions can help feed `raw/` from web articles. These are optional; small wikis often need only the index file.

### Why maintenance matters

The costly part of a knowledge base is **bookkeeping**: cross-links, summaries, consistency. Automation can update many files in one pass. Humans stay in charge of **what** enters the system and **what** to trust.

---

*This document is descriptive. Directory layout and prompts may evolve with CropAI product needs.*
