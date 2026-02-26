# Changelog

All notable changes to **Duffy Nodes** are documented here.
This project follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) conventions
and [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [0.4.0] — 2026-02-26

### Added

- **Multi-Pass Sampling** node (`Duffy_MultiPassSampling`, category `Duffy/Sampling`).
  - Configures filename, filepath, three denoise values (0.0 – 1.0), and three step counts (1 – 100) for multi-pass sampling workflows.
  - All eight parameters exposed as individual typed outputs (`String`, `Float`, `Int`).
  - Vue-compatible JavaScript extension (`multi_pass_ui.js`) for custom node theming and automatic size calculation.
  - Full V3 Schema implementation: stateless `@classmethod` design, declarative `define_schema`, typed `io.NodeOutput` return.
  - Converted from legacy V1 class (INPUT_TYPES / RETURN_TYPES / FUNCTION) to Nodes 2.0 architecture.

## [0.3.0] — 2026-02-25

### Added

- **Five Float Sliders** node (`Duffy_FiveFloatSliders`, category `Duffy/Math`).
  - Provides five float sliders with a range of 0.0 to 1.0.
  - Includes five string inputs for custom labels.
  - Dynamically updates slider labels, output labels, and tooltips to match the custom labels via a Vue-compatible JavaScript extension.
- **Five Int Sliders** node (`Duffy_FiveIntSliders`, category `Duffy/Math`).
  - Provides five integer sliders with a range of 1 to 100.
  - Includes five string inputs for custom labels.
  - Dynamically updates slider labels, output labels, and tooltips to match the custom labels via a Vue-compatible JavaScript extension.

## [0.2.0] — 2026-02-25

### Added

- **LoRa Prompt Combiner** node (`Duffy_LoRaPromptCombiner`, category `Duffy/Text`).
  - Combines a LoRa trigger and a main prompt using a customizable separator.
  - Two multiline string inputs for `LoRa Trigger` and `Prompt`.
  - Customizable `Separator` string input with a comma `,` as the default.
  - Outputs the combined prompt string.

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
