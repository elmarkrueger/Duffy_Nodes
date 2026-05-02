import { app } from "../../../scripts/app.js";
import { d as defineComponent, b as openBlock, c as createElementBlock, e as createBaseVNode, k as normalizeClass, F as Fragment, r as renderList, t as toDisplayString, h as ref, j as computed, _ as _export_sfc, i as createApp } from "./_plugin-vue_export-helper-CRnbZd-0.js";
const _hoisted_1 = { class: "native-group-controller-root" };
const _hoisted_2 = { class: "actions-bar" };
const _hoisted_3 = { class: "sort-buttons" };
const _hoisted_4 = { class: "exclusive-toggle glass-panel" };
const _hoisted_5 = ["checked"];
const _hoisted_6 = { class: "group-list" };
const _hoisted_7 = { class: "group-row" };
const _hoisted_8 = ["checked", "onChange"];
const _hoisted_9 = { class: "group-name" };
const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "NativeGroupController",
  props: {
    onToggleGroup: { type: Function },
    onSetSort: { type: Function },
    onToggleExclusive: { type: Function }
  },
  setup(__props, { expose: __expose }) {
    const props = __props;
    const groups = ref([]);
    const groupStates = ref({});
    const exclusiveMode = ref(false);
    const sortBy = ref("None");
    const sortedGroups = computed(() => {
      let sorted = [...groups.value];
      if (sortBy.value === "Alphanumeric (A-Z)") {
        sorted.sort((a, b) => a.localeCompare(b, void 0, { numeric: true, sensitivity: "base" }));
      } else if (sortBy.value === "Alphanumeric (Z-A)") {
        sorted.sort((a, b) => b.localeCompare(a, void 0, { numeric: true, sensitivity: "base" }));
      }
      return sorted;
    });
    function setGroups(newGroups) {
      groups.value = newGroups;
    }
    function setGroupStates(newStates) {
      groupStates.value = { ...newStates };
    }
    function setExclusiveMode(val) {
      exclusiveMode.value = val;
    }
    function setSortBy(val) {
      sortBy.value = val;
    }
    function toggleGroup(group) {
      var _a;
      const newVal = !groupStates.value[group];
      if (exclusiveMode.value && newVal) {
        Object.keys(groupStates.value).forEach((k) => {
          if (k !== group) groupStates.value[k] = false;
        });
      }
      groupStates.value[group] = newVal;
      (_a = props.onToggleGroup) == null ? void 0 : _a.call(props, group, newVal);
    }
    function toggleExclusive() {
      var _a;
      exclusiveMode.value = !exclusiveMode.value;
      (_a = props.onToggleExclusive) == null ? void 0 : _a.call(props, exclusiveMode.value);
    }
    function setSort(mode) {
      var _a;
      sortBy.value = mode;
      (_a = props.onSetSort) == null ? void 0 : _a.call(props, mode);
    }
    __expose({ setGroups, setGroupStates, setExclusiveMode, setSortBy });
    return (_ctx, _cache) => {
      return openBlock(), createElementBlock("div", _hoisted_1, [
        _cache[4] || (_cache[4] = createBaseVNode("div", { class: "header" }, [
          createBaseVNode("h4", null, "Native Group Controller")
        ], -1)),
        createBaseVNode("div", _hoisted_2, [
          createBaseVNode("div", _hoisted_3, [
            createBaseVNode("button", {
              class: normalizeClass(["glass-btn", { active: sortBy.value === "None" }]),
              onClick: _cache[0] || (_cache[0] = ($event) => setSort("None"))
            }, "None", 2),
            createBaseVNode("button", {
              class: normalizeClass(["glass-btn", { active: sortBy.value === "Alphanumeric (A-Z)" }]),
              onClick: _cache[1] || (_cache[1] = ($event) => setSort("Alphanumeric (A-Z)"))
            }, "A-Z", 2),
            createBaseVNode("button", {
              class: normalizeClass(["glass-btn", { active: sortBy.value === "Alphanumeric (Z-A)" }]),
              onClick: _cache[2] || (_cache[2] = ($event) => setSort("Alphanumeric (Z-A)"))
            }, "Z-A", 2)
          ]),
          createBaseVNode("div", _hoisted_4, [
            _cache[3] || (_cache[3] = createBaseVNode("label", null, "Exclusive Mode", -1)),
            createBaseVNode("input", {
              type: "checkbox",
              class: "switch-toggle",
              checked: exclusiveMode.value,
              onChange: toggleExclusive
            }, null, 40, _hoisted_5)
          ])
        ]),
        createBaseVNode("div", _hoisted_6, [
          (openBlock(true), createElementBlock(Fragment, null, renderList(sortedGroups.value, (group) => {
            return openBlock(), createElementBlock("div", {
              key: group,
              class: normalizeClass(["group-item glass-panel", { "inactive": !groupStates.value[group] }])
            }, [
              createBaseVNode("div", _hoisted_7, [
                createBaseVNode("input", {
                  type: "checkbox",
                  class: "switch-toggle",
                  checked: groupStates.value[group] || false,
                  onChange: ($event) => toggleGroup(group)
                }, null, 40, _hoisted_8),
                createBaseVNode("span", _hoisted_9, toDisplayString(group), 1)
              ])
            ], 2);
          }), 128))
        ])
      ]);
    };
  }
});
const NativeGroupControllerVue = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-42a2e17a"]]);
const MIN_WIDTH = 250;
const HEADER_HEIGHT = 40;
const SLOT_HEIGHT = 26;
const PADDING_BOTTOM = 20;
app.registerExtension({
  name: "Duffy.NativeGroupController",
  async beforeRegisterNodeDef(nodeType, nodeData) {
    if (nodeData.name === "Duffy_NativeGroupBypasser" || nodeData.name === "Duffy_NativeGroupMuter") {
      const isMuter = nodeData.name === "Duffy_NativeGroupMuter";
      const origOnNodeCreated = nodeType.prototype.onNodeCreated;
      nodeType.prototype.onNodeCreated = function() {
        if (origOnNodeCreated) {
          origOnNodeCreated.apply(this, arguments);
        }
        this.properties = this.properties || {};
        this.properties.group_states = this.properties.group_states || {};
        this.properties.exclusive_mode = this.properties.exclusive_mode || false;
        this.properties.sort_by = this.properties.sort_by || "None";
        const container = document.createElement("div");
        container.style.cssText = "width:100%; box-sizing:border-box; overflow:hidden;";
        container.addEventListener("pointerdown", (e) => e.stopPropagation());
        container.addEventListener("wheel", (e) => e.stopPropagation());
        this.vueApp = createApp(NativeGroupControllerVue, {
          onToggleGroup: (group, isActive) => {
            this.properties.group_states[group] = isActive;
            if (this.properties.exclusive_mode && isActive) {
              Object.keys(this.properties.group_states).forEach((k) => {
                if (k !== group) {
                  this.properties.group_states[k] = false;
                  this.mutateGroupState(k, false);
                }
              });
            }
            this.mutateGroupState(group, isActive);
            this.setDirtyCanvas(true, true);
          },
          onSetSort: (mode) => {
            this.properties.sort_by = mode;
            this.setDirtyCanvas(true, true);
          },
          onToggleExclusive: (isActive) => {
            this.properties.exclusive_mode = isActive;
            this.setDirtyCanvas(true, true);
          }
        });
        this.vueInstance = this.vueApp.mount(container);
        this.vueInstance.setSortBy(this.properties.sort_by);
        this.vueInstance.setExclusiveMode(this.properties.exclusive_mode);
        this.vueInstance.setGroupStates(this.properties.group_states);
        const domWidget = this.addDOMWidget("vue_ui", "custom", container, { serialize: false });
        domWidget.computeSize = () => [MIN_WIDTH, Math.max(300, HEADER_HEIGHT + Object.keys(this.properties.group_states).length * SLOT_HEIGHT + 120)];
        this._last_group_hash = "";
        this._pollInterval = setInterval(() => {
          this.pollGroups();
        }, 500);
      };
      const origOnRemoved = nodeType.prototype.onRemoved;
      nodeType.prototype.onRemoved = function() {
        if (this._pollInterval) {
          clearInterval(this._pollInterval);
        }
        if (this.vueApp) {
          this.vueApp.unmount();
        }
        if (origOnRemoved) {
          origOnRemoved.apply(this, arguments);
        }
      };
      nodeType.prototype.pollGroups = function() {
        const canvas = app.canvas;
        if (!canvas || !canvas.graph) return;
        const groups = canvas.graph._groups || [];
        const validGroups = groups.filter((g) => {
          return g.title && !isNaN(g.size[0]) && !isNaN(g.size[1]) && g.size[0] >= 10 && g.size[1] >= 10;
        });
        const currentHash = validGroups.map((g) => g.title).join("||");
        if (this._last_group_hash !== currentHash) {
          this._last_group_hash = currentHash;
          this.refreshWidgets(validGroups);
        }
      };
      nodeType.prototype.refreshWidgets = function(validGroups) {
        if (!this.vueInstance) return;
        const groupNames = validGroups.map((g) => g.title);
        groupNames.forEach((g) => {
          if (this.properties.group_states[g] === void 0) {
            this.properties.group_states[g] = false;
          }
        });
        this.vueInstance.setGroups(groupNames);
        this.vueInstance.setGroupStates(this.properties.group_states);
        const toggleCount = groupNames.length;
        this.size[0] = Math.max(this.size[0] || MIN_WIDTH, MIN_WIDTH);
        this.size[1] = Math.max(300, HEADER_HEIGHT + toggleCount * 40 + 120);
        if (app.graph) {
          app.graph.setDirtyCanvas(true, true);
        }
      };
      nodeType.prototype.mutateGroupState = function(groupName, isActive) {
        const canvas = app.canvas;
        if (!canvas || !canvas.graph) return;
        const target_mode = isActive ? isMuter ? 2 : 4 : 0;
        const groups = canvas.graph._groups || [];
        const group = groups.find((g) => g.title === groupName);
        if (!group) return;
        const gx = group.pos[0];
        const gy = group.pos[1];
        const gw = group.size[0];
        const gh = group.size[1];
        const nodes = canvas.graph._nodes || [];
        let changed = false;
        const updateNodeMode = (n) => {
          if (n.id === this.id) return;
          const nx = n.pos[0];
          const ny = n.pos[1];
          const nw = n.size[0];
          const nh = n.size[1];
          if (!(nx > gx + gw || nx + nw < gx || ny > gy + gh || ny + nh < gy)) {
            if (target_mode === 2) {
              n.mode = 2;
              changed = true;
            } else if (target_mode === 4 && n.mode !== 2) {
              n.mode = 4;
              changed = true;
            } else if (target_mode === 0 && n.mode !== 2 && n.mode !== 4) {
              n.mode = 0;
              changed = true;
            }
            n.mode = target_mode;
            changed = true;
            if (n.getInnerNodes) {
              const inners = n.getInnerNodes();
              inners.forEach((inner) => {
                inner.mode = target_mode;
              });
            }
          }
        };
        nodes.forEach(updateNodeMode);
        if (changed) {
          app.graph.setDirtyCanvas(true, true);
        }
      };
      const origOnPropertyChanged = nodeType.prototype.onPropertyChanged;
      nodeType.prototype.onPropertyChanged = function(prop, value) {
        if (origOnPropertyChanged) origOnPropertyChanged.apply(this, arguments);
        if (prop === "group_states") {
          if (this.vueInstance) {
            this.vueInstance.setGroupStates(value);
          }
          Object.keys(value).forEach((groupName) => {
            this.mutateGroupState(groupName, value[groupName]);
          });
        } else if (prop === "sort_by") {
          if (this.vueInstance) this.vueInstance.setSortBy(value);
        } else if (prop === "exclusive_mode") {
          if (this.vueInstance) this.vueInstance.setExclusiveMode(value);
        }
      };
    } else if (nodeData.name === "Duffy_NativeSingleGroupBypasser" || nodeData.name === "Duffy_NativeSingleGroupMuter") {
      const isMuter = nodeData.name === "Duffy_NativeSingleGroupMuter";
      const origOnNodeCreated = nodeType.prototype.onNodeCreated;
      nodeType.prototype.onNodeCreated = function() {
        if (origOnNodeCreated) {
          origOnNodeCreated.apply(this, arguments);
        }
        this.properties = this.properties || {};
        this.properties.selected_group = this.properties.selected_group || "None";
        this.properties.is_active = this.properties.is_active || false;
        this._last_group_hash = "";
        this._pollInterval = setInterval(() => {
          this.pollGroups();
        }, 500);
      };
      const origOnRemoved = nodeType.prototype.onRemoved;
      nodeType.prototype.onRemoved = function() {
        if (this._pollInterval) {
          clearInterval(this._pollInterval);
        }
        if (origOnRemoved) {
          origOnRemoved.apply(this, arguments);
        }
      };
      nodeType.prototype.pollGroups = function() {
        var _a;
        const canvas = app.canvas;
        if (!canvas || !canvas.graph) return;
        const groups = canvas.graph._groups || [];
        const validGroups = groups.filter((g) => {
          return g.title && !isNaN(g.size[0]) && !isNaN(g.size[1]) && g.size[0] >= 10 && g.size[1] >= 10;
        });
        let sortedGroups = [...validGroups];
        sortedGroups.sort((a, b) => a.title.localeCompare(b.title, void 0, { numeric: true, sensitivity: "base" }));
        const currentHash = sortedGroups.map((g) => g.title).join("||");
        if (this._last_group_hash !== currentHash) {
          this._last_group_hash = currentHash;
          const groupNames = ["None", ...sortedGroups.map((g) => g.title)];
          if (this.properties.selected_group !== "None" && !groupNames.includes(this.properties.selected_group)) {
            this.properties.selected_group = "None";
            if (this.properties.is_active) this.mutateGroupState(this.properties.selected_group, false);
          }
          for (let i = ((_a = this.widgets) == null ? void 0 : _a.length) - 1; i >= 0; i--) {
            const w = this.widgets[i];
            if (w.name === "Group" || w.name === "Active") {
              this.removeWidget(w);
            }
          }
          this.addWidget("combo", "Group", this.properties.selected_group, (v) => {
            const oldGroup = this.properties.selected_group;
            this.properties.selected_group = v;
            if (this.properties.is_active) {
              if (oldGroup && oldGroup !== "None") this.mutateGroupState(oldGroup, false);
              if (v && v !== "None") this.mutateGroupState(v, true);
            }
          }, { values: groupNames });
          this.addWidget("toggle", "Active", this.properties.is_active, (v) => {
            this.properties.is_active = v;
            if (this.properties.selected_group && this.properties.selected_group !== "None") {
              this.mutateGroupState(this.properties.selected_group, v);
            }
          });
          this.size[0] = Math.max(this.size[0], MIN_WIDTH);
          this.size[1] = HEADER_HEIGHT + 2 * SLOT_HEIGHT + PADDING_BOTTOM;
        }
      };
      nodeType.prototype.mutateGroupState = function(groupName, isActive) {
        const canvas = app.canvas;
        if (!canvas || !canvas.graph) return;
        const target_mode = isActive ? isMuter ? 2 : 4 : 0;
        const groups = canvas.graph._groups || [];
        const group = groups.find((g) => g.title === groupName);
        if (!group) return;
        const gx = group.pos[0];
        const gy = group.pos[1];
        const gw = group.size[0];
        const gh = group.size[1];
        const nodes = canvas.graph._nodes || [];
        let changed = false;
        const updateNodeMode = (n) => {
          if (n.id === this.id) return;
          const nx = n.pos[0];
          const ny = n.pos[1];
          const nw = n.size[0];
          const nh = n.size[1];
          if (!(nx > gx + gw || nx + nw < gx || ny > gy + gh || ny + nh < gy)) {
            if (target_mode === 2) {
              n.mode = 2;
              changed = true;
            } else if (target_mode === 4 && n.mode !== 2) {
              n.mode = 4;
              changed = true;
            } else if (target_mode === 0 && n.mode !== 2 && n.mode !== 4) {
              n.mode = 0;
              changed = true;
            }
            n.mode = target_mode;
            changed = true;
            if (n.getInnerNodes) {
              const inners = n.getInnerNodes();
              inners.forEach((inner) => {
                inner.mode = target_mode;
              });
            }
          }
        };
        nodes.forEach(updateNodeMode);
        if (changed) {
          app.graph.setDirtyCanvas(true, true);
        }
      };
      const origOnPropertyChanged = nodeType.prototype.onPropertyChanged;
      nodeType.prototype.onPropertyChanged = function(prop, value) {
        if (origOnPropertyChanged) origOnPropertyChanged.apply(this, arguments);
        if (prop === "selected_group" || prop === "is_active") {
          const widgetName = prop === "selected_group" ? "Group" : "Active";
          const widget = this.widgets.find((w) => w.name === widgetName);
          if (widget) {
            widget.value = value;
          }
          if (this.properties.is_active && this.properties.selected_group !== "None") {
            this.mutateGroupState(this.properties.selected_group, this.properties.is_active);
          }
        }
      };
    }
  }
});
