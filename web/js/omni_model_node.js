/**
 * Omni Model Node (Qwen2.5-Omni GGUF) — Dynamic Multimodal Input Slot Manager
 *
 * Automatically manages the optional media input slots on `Duffy_OmniModelNode`:
 *   - image_1 .. image_10 (IMAGE, max 10)
 *   - audio_1 .. audio_2  (AUDIO, max 2)
 *   - video_1 .. video_2  (VIDEO, max 2)
 *
 * Keeps the node compact with only 1 unconnected slot per modality visible
 * initially (`image_1`, `audio_1`, `video_1`), expanding up to the modality cap
 * as connections are made and pruning excess trailing unconnected slots when
 * wires are disconnected.
 */

import { app } from "../../../scripts/app.js";

const NODE_CLASS = "Duffy_OmniModelNode";

const DYNAMIC_CONFIG = [
    { prefix: "image", labelPrefix: "Image", type: "IMAGE", max: 10 },
    { prefix: "audio", labelPrefix: "Audio", type: "AUDIO", max: 2 },
    { prefix: "video", labelPrefix: "Video", type: "VIDEO", max: 2 },
];

/**
 * Parse a slot name like "image_3" for prefix "image" into its 1-based index (3),
 * or return null if it does not match.
 */
function parseSlotIndex(slotName, prefix) {
    if (typeof slotName !== "string") return null;
    const expectedPrefix = `${prefix}_`;
    if (!slotName.startsWith(expectedPrefix)) return null;
    const num = parseInt(slotName.slice(expectedPrefix.length), 10);
    return Number.isNaN(num) ? null : num;
}

/**
 * Stabilize dynamic multimodal input slots on a `Duffy_OmniModelNode` instance.
 * Ensures all connected slots remain intact and at most one trailing unconnected
 * slot exists per modality family (up to `cfg.max`).
 */
function stabilizeDynamicPorts(node) {
    if (!node || node.__omniStabilizing) return;
    node.__omniStabilizing = true;

    try {
        for (const cfg of DYNAMIC_CONFIG) {
            const getMatchingInputs = () => {
                const list = [];
                if (!node.inputs) return list;
                for (let idx = 0; idx < node.inputs.length; idx++) {
                    const inp = node.inputs[idx];
                    const num = parseSlotIndex(inp?.name, cfg.prefix);
                    if (num !== null) {
                        list.push({ idx, num, input: inp });
                    }
                }
                list.sort((a, b) => a.num - b.num);
                return list;
            };

            let matching = getMatchingInputs();

            // 1. Remove excess unconnected slots from highest index downward,
            //    keeping all connected slots and at most 1 trailing unconnected slot.
            let unconnected = matching.filter(m => m.input.link == null);
            while (unconnected.length > 1) {
                const toRemove = unconnected.pop();
                const realIdx = node.inputs.indexOf(toRemove.input);
                if (realIdx !== -1) {
                    node.removeInput(realIdx);
                }
                matching = getMatchingInputs();
                unconnected = matching.filter(m => m.input.link == null);
            }

            // 2. If zero unconnected slots remain and total count < cfg.max,
            //    spawn the next sequential slot index.
            matching = getMatchingInputs();
            unconnected = matching.filter(m => m.input.link == null);
            if (unconnected.length === 0 && matching.length < cfg.max) {
                const existingNums = new Set(matching.map(m => m.num));
                let nextNum = 1;
                while (existingNums.has(nextNum) && nextNum <= cfg.max) {
                    nextNum++;
                }
                if (nextNum <= cfg.max) {
                    const nextName = `${cfg.prefix}_${nextNum}`;
                    const nextLabel = `${cfg.labelPrefix} ${nextNum}`;
                    node.addInput(nextName, cfg.type, { label: nextLabel });
                }
            }
        }

        // 3. Deterministically sort dynamic inputs in modality & index order:
        //    [non-dynamic inputs..., image_1..N, audio_1..N, video_1..N]
        if (Array.isArray(node.inputs) && node.inputs.length > 1) {
            const prefixOrder = { image: 1, audio: 2, video: 3 };
            const classifyInput = (inp) => {
                if (!inp || typeof inp.name !== "string") return { group: 0, num: 0 };
                for (const cfg of DYNAMIC_CONFIG) {
                    const num = parseSlotIndex(inp.name, cfg.prefix);
                    if (num !== null) {
                        return { group: prefixOrder[cfg.prefix], num };
                    }
                }
                return { group: 0, num: 0 };
            };

            node.inputs.sort((a, b) => {
                const ca = classifyInput(a);
                const cb = classifyInput(b);
                if (ca.group !== cb.group) return ca.group - cb.group;
                return ca.num - cb.num;
            });
        }

        if (typeof node.computeSize === "function" && typeof node.setSize === "function") {
            const targetSize = node.computeSize();
            node.setSize([
                Math.max(node.size?.[0] || 320, targetSize[0]),
                targetSize[1],
            ]);
        }
        app.graph?.setDirtyCanvas(true, true);
    } finally {
        node.__omniStabilizing = false;
    }
}

app.registerExtension({
    name: "Duffy.OmniModelNode.DynamicSlots",

    async beforeRegisterNodeDef(nodeType, nodeData) {
        if (nodeData.name !== NODE_CLASS) return;

        const origOnNodeCreated = nodeType.prototype.onNodeCreated;
        nodeType.prototype.onNodeCreated = function () {
            const res = origOnNodeCreated
                ? origOnNodeCreated.apply(this, arguments)
                : undefined;
            stabilizeDynamicPorts(this);
            return res;
        };

        const origOnConfigure = nodeType.prototype.onConfigure;
        nodeType.prototype.onConfigure = function () {
            const res = origOnConfigure
                ? origOnConfigure.apply(this, arguments)
                : undefined;
            stabilizeDynamicPorts(this);
            return res;
        };

        const origOnConnectionsChange = nodeType.prototype.onConnectionsChange;
        nodeType.prototype.onConnectionsChange = function (
            type,
            index,
            connected,
            link_info
        ) {
            const res = origOnConnectionsChange
                ? origOnConnectionsChange.apply(this, arguments)
                : undefined;
            // LiteGraph.INPUT === 1
            if (type === 1) {
                stabilizeDynamicPorts(this);
            }
            return res;
        };
    },
});
