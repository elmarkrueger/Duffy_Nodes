import { app } from "../../../scripts/app.js";
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
        this.addWidget("toggle", "Exclusive Mode", this.properties.exclusive_mode, (v) => {
          this.properties.exclusive_mode = v;
        });
        this.addWidget("combo", "Sort By", this.properties.sort_by, (v) => {
          this.properties.sort_by = v;
          this._last_group_hash = "";
          this.pollGroups();
        }, { values: ["None", "Alphanumeric (A-Z)", "Alphanumeric (Z-A)"] });
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
        for (let i = this.widgets.length - 1; i >= 0; i--) {
          const w = this.widgets[i];
          if (w.name !== "Exclusive Mode" && w.name !== "Sort By") {
            this.removeWidget(w);
          }
        }
        let sortedGroups = [...validGroups];
        if (this.properties.sort_by === "Alphanumeric (A-Z)") {
          sortedGroups.sort((a, b) => a.title.localeCompare(b.title, void 0, { numeric: true, sensitivity: "base" }));
        } else if (this.properties.sort_by === "Alphanumeric (Z-A)") {
          sortedGroups.sort((a, b) => b.title.localeCompare(a.title, void 0, { numeric: true, sensitivity: "base" }));
        }
        sortedGroups.forEach((g) => {
          const state = this.properties.group_states[g.title] || false;
          this.addWidget("toggle", g.title, state, (isActive) => {
            this.properties.group_states[g.title] = isActive;
            if (this.properties.exclusive_mode && isActive) {
              this.widgets.forEach((w) => {
                if (w.name !== "Exclusive Mode" && w.name !== "Sort By" && w.name !== g.title && w.type === "toggle") {
                  w.value = false;
                  this.properties.group_states[w.name] = false;
                  this.mutateGroupState(w.name, false);
                }
              });
            }
            this.mutateGroupState(g.title, isActive);
          });
        });
        const toggleCount = sortedGroups.length + 2;
        this.size[0] = Math.max(this.size[0], MIN_WIDTH);
        this.size[1] = HEADER_HEIGHT + toggleCount * SLOT_HEIGHT + PADDING_BOTTOM;
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
          Object.keys(value).forEach((groupName) => {
            const widget = this.widgets.find((w) => w.name === groupName);
            if (widget) {
              widget.value = value[groupName];
              this.mutateGroupState(groupName, value[groupName]);
            }
          });
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
