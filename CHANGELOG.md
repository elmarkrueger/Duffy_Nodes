# Changelog

All notable changes to **Duffy Nodes** are documented here.
This project follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) conventions
and [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [0.1.0] — 2026-02-24

### Added

- **Signal Selector** node (`Duffy_SignalSelector`, category `Duffy/Routing`).
  - Three-channel signal router accepting any data type on each input port via a wildcard `io.Custom("*")` type.
  - `active_input` integer slider (range 1 – 3) selects which channel is routed to the single `Selected Signal` output.
  - Per-channel customizable text labels (`Input 1`, `Input 2`, `Input 3`) displayed directly on the node.
  - V3 lazy evaluation via `check_lazy_status` — only the active upstream branch is computed; idle branches are pruned from the execution graph.
  - Full V3 Schema implementation (`comfy_api.latest.io`): stateless `@classmethod` design, declarative `define_schema`, and typed `io.NodeOutput` return.
- Project scaffolding following the ComfyUI Nodes 2.0 package layout:
  - `__init__.py` with async `comfy_entrypoint` and `ComfyExtension` registration.
  - `nodes/__init__.py` exposing `NODE_LIST` for clean extension loading.
  - `pyproject.toml` with Comfy Registry metadata (`PublisherId`, `DisplayName`).
  - `requirements.txt` declaring `torch>=2.1.0` and `numpy>=1.26.0`.
