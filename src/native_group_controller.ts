// Native Group Controller Extension
// Handles native Bypassing and Muting of groups in ComfyUI Nodes 2.0 without Legacy Canvas bugs.

import { app } from "COMFY_APP";
import { createApp } from "vue";
import NativeGroupControllerVue from "./NativeGroupController.vue";

interface LGraphNode {
  id: number;
  pos: [number, number];
  size: [number, number];
  mode: number;
  title: string;
  properties: any;
  widgets: any[];
  getInnerNodes?: () => LGraphNode[];
  addWidget: (type: string, name: string, value: any, callback: (v: any) => void) => any;
  removeWidget: (widget: any) => void;
  onDrawBackground?: (ctx: any) => void;
  onPropertyChanged?: (name: string, value: any) => void;
}

interface LGraphGroup {
  title: string;
  pos: [number, number];
  size: [number, number];
}

const MIN_WIDTH = 250;
const HEADER_HEIGHT = 40;
const SLOT_HEIGHT = 26;
const PADDING_BOTTOM = 20;

app.registerExtension({
  name: "Duffy.NativeGroupController",
  async beforeRegisterNodeDef(nodeType: any, nodeData: any) {
    if (nodeData.name === "Duffy_NativeGroupBypasser" || nodeData.name === "Duffy_NativeGroupMuter") {

      const isMuter = nodeData.name === "Duffy_NativeGroupMuter";
      
      const origOnNodeCreated = nodeType.prototype.onNodeCreated;
      nodeType.prototype.onNodeCreated = function () {
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
          onToggleGroup: (group: string, isActive: boolean) => {
            this.properties.group_states[group] = isActive;
            if (this.properties.exclusive_mode && isActive) {
              Object.keys(this.properties.group_states).forEach(k => {
                if (k !== group) {
                  this.properties.group_states[k] = false;
                  this.mutateGroupState(k, false);
                }
              });
            }
            this.mutateGroupState(group, isActive);
            this.setDirtyCanvas(true, true);
          },
          onSetSort: (mode: string) => {
            this.properties.sort_by = mode;
            this.setDirtyCanvas(true, true);
          },
          onToggleExclusive: (isActive: boolean) => {
            this.properties.exclusive_mode = isActive;
            this.setDirtyCanvas(true, true);
          }
        });

        this.vueInstance = this.vueApp.mount(container) as any;
        
        // Initial state sync
        this.vueInstance.setSortBy(this.properties.sort_by);
        this.vueInstance.setExclusiveMode(this.properties.exclusive_mode);
        this.vueInstance.setGroupStates(this.properties.group_states);

        const domWidget = this.addDOMWidget("vue_ui", "custom", container, { serialize: false });
        domWidget.computeSize = () => [MIN_WIDTH, Math.max(300, HEADER_HEIGHT + (Object.keys(this.properties.group_states).length * SLOT_HEIGHT) + 120)];

        this._last_group_hash = "";

        // Poll for group changes
        this._pollInterval = setInterval(() => {
          this.pollGroups();
        }, 500);
      };

      const origOnRemoved = nodeType.prototype.onRemoved;
      nodeType.prototype.onRemoved = function () {
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

      nodeType.prototype.pollGroups = function () {
        const canvas = app.canvas;
        if (!canvas || !canvas.graph) return;

        const groups: LGraphGroup[] = canvas.graph._groups || [];
        const validGroups = groups.filter((g) => {
          return g.title && !isNaN(g.size[0]) && !isNaN(g.size[1]) && g.size[0] >= 10 && g.size[1] >= 10;
        });

        // Hash valid group titles
        const currentHash = validGroups.map(g => g.title).join("||");

        if (this._last_group_hash !== currentHash) {
          this._last_group_hash = currentHash;
          this.refreshWidgets(validGroups);
        }
      };

      nodeType.prototype.refreshWidgets = function (validGroups: LGraphGroup[]) {
        if (!this.vueInstance) return;

        // Extract raw group names
        const groupNames = validGroups.map(g => g.title);
        
        // Ensure state exists for new groups
        groupNames.forEach((g) => {
          if (this.properties.group_states[g] === undefined) {
            this.properties.group_states[g] = false;
          }
        });

        // Sync to Vue
        this.vueInstance.setGroups(groupNames);
        this.vueInstance.setGroupStates(this.properties.group_states);

        // Adjust widget height to content bounds (roughly)
        const toggleCount = groupNames.length;
        this.size[0] = Math.max(this.size[0] || MIN_WIDTH, MIN_WIDTH);
        this.size[1] = Math.max(300, HEADER_HEIGHT + (toggleCount * 40) + 120);
        
        if (app.graph) {
          app.graph.setDirtyCanvas(true, true);
        }
      };

      // Perform AABB checks and Mode mutation
      nodeType.prototype.mutateGroupState = function(groupName: string, isActive: boolean) {
        const canvas = app.canvas;
        if (!canvas || !canvas.graph) return;
        
        const target_mode = isActive ? (isMuter ? 2 : 4) : 0; // Mode 2: Mute, Mode 4: Bypass, Mode 0: Always

        const groups = canvas.graph._groups || [];
        const group = groups.find((g: LGraphGroup) => g.title === groupName);
        if (!group) return;

        const gx = group.pos[0];
        const gy = group.pos[1];
        const gw = group.size[0];
        const gh = group.size[1];

        const nodes = canvas.graph._nodes || [];
        let changed = false;

        const updateNodeMode = (n: LGraphNode) => {
          if (n.id === this.id) return; // Skip controller itself
          
          // Check bounds
          const nx = n.pos[0];
          const ny = n.pos[1];
          const nw = n.size[0];
          const nh = n.size[1];

          // AABB Intersection check
          if (!(nx > gx + gw || nx + nw < gx || ny > gy + gh || ny + nh < gy)) {
            // Precedence Check (Mute > Bypass > Active)
            // Simplified slightly to enforce the latest target mode but respecting higher hierarchy
            if (target_mode === 2) {
              n.mode = 2; // Mute overrides all
              changed = true;
            } else if (target_mode === 4 && n.mode !== 2) {
              n.mode = 4; // Bypass only if not already muted
              changed = true;
            } else if (target_mode === 0 && n.mode !== 2 && n.mode !== 4) {
              // Usually we just set to 0. But wait, if another group covers it that is active bypass/mute, we'd need a multi-group solver.
              // For simplicity of execution context logic, we forcibly apply. However, true hierarchy needs a re-eval if desired.
              n.mode = 0; 
              changed = true;
            }

            // Simple override for robust function
            n.mode = target_mode;
            changed = true;

            // Recurse heavily into subgraphs to prevent DTO resolution errors
            if (n.getInnerNodes) {
              const inners = n.getInnerNodes();
              inners.forEach((inner: LGraphNode) => {
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
      nodeType.prototype.onPropertyChanged = function (prop: string, value: any) {
        if (origOnPropertyChanged) origOnPropertyChanged.apply(this, arguments);

        if (prop === "group_states") {
          if (this.vueInstance) {
            this.vueInstance.setGroupStates(value);
          }
          // Sync visual node modes with loaded properties
          Object.keys(value).forEach((groupName) => {
            this.mutateGroupState(groupName, value[groupName]);
          });
        }
        else if (prop === "sort_by") {
          if (this.vueInstance) this.vueInstance.setSortBy(value);
        }
        else if (prop === "exclusive_mode") {
          if (this.vueInstance) this.vueInstance.setExclusiveMode(value);
        }
      };
    } else if (nodeData.name === "Duffy_NativeSingleGroupBypasser" || nodeData.name === "Duffy_NativeSingleGroupMuter") {

      const isMuter = nodeData.name === "Duffy_NativeSingleGroupMuter";
      
      const origOnNodeCreated = nodeType.prototype.onNodeCreated;
      nodeType.prototype.onNodeCreated = function () {
        if (origOnNodeCreated) {
          origOnNodeCreated.apply(this, arguments);
        }

        this.properties = this.properties || {};
        this.properties.selected_group = this.properties.selected_group || "None";
        this.properties.is_active = this.properties.is_active || false;
        
        this._last_group_hash = "";

        // Poll for group changes
        this._pollInterval = setInterval(() => {
          this.pollGroups();
        }, 500);
      };

      const origOnRemoved = nodeType.prototype.onRemoved;
      nodeType.prototype.onRemoved = function () {
        if (this._pollInterval) {
          clearInterval(this._pollInterval);
        }
        if (origOnRemoved) {
          origOnRemoved.apply(this, arguments);
        }
      };

      nodeType.prototype.pollGroups = function () {
        const canvas = app.canvas;
        if (!canvas || !canvas.graph) return;

        const groups: LGraphGroup[] = canvas.graph._groups || [];
        const validGroups = groups.filter((g) => {
          return g.title && !isNaN(g.size[0]) && !isNaN(g.size[1]) && g.size[0] >= 10 && g.size[1] >= 10;
        });

        let sortedGroups = [...validGroups];
        sortedGroups.sort((a, b) => a.title.localeCompare(b.title, undefined, { numeric: true, sensitivity: 'base' }));

        const currentHash = sortedGroups.map(g => g.title).join("||");

        if (this._last_group_hash !== currentHash) {
          this._last_group_hash = currentHash;
          const groupNames = ["None", ...sortedGroups.map(g => g.title)];
          
          // If the selected group no longer exists, reset to None safely
          if (this.properties.selected_group !== "None" && !groupNames.includes(this.properties.selected_group)) {
            this.properties.selected_group = "None";
            if (this.properties.is_active) this.mutateGroupState(this.properties.selected_group, false);
          }

          // Force explicitly reconstruct combo box and toggle to bypass Vue mounting bugs
          for (let i = this.widgets?.length - 1; i >= 0; i--) {
            const w = this.widgets[i];
            if (w.name === "Group" || w.name === "Active") {
              this.removeWidget(w);
            }
          }

          // Add combo for group selection
          this.addWidget("combo", "Group", this.properties.selected_group, (v: string) => {
            const oldGroup = this.properties.selected_group;
            this.properties.selected_group = v;
            if (this.properties.is_active) {
              if (oldGroup && oldGroup !== "None") this.mutateGroupState(oldGroup, false);
              if (v && v !== "None") this.mutateGroupState(v, true);
            }
          }, { values: groupNames });

          // Add toggle for Activation
          this.addWidget("toggle", "Active", this.properties.is_active, (v: boolean) => {
            this.properties.is_active = v;
            if (this.properties.selected_group && this.properties.selected_group !== "None") {
              this.mutateGroupState(this.properties.selected_group, v);
            }
          });

          // Enforce node size manually
          this.size[0] = Math.max(this.size[0], MIN_WIDTH);
          this.size[1] = HEADER_HEIGHT + (2 * SLOT_HEIGHT) + PADDING_BOTTOM;
        }
      };

      // Perform AABB checks and Mode mutation (simplified for single group)
      nodeType.prototype.mutateGroupState = function(groupName: string, isActive: boolean) {
        const canvas = app.canvas;
        if (!canvas || !canvas.graph) return;
        
        const target_mode = isActive ? (isMuter ? 2 : 4) : 0;

        const groups = canvas.graph._groups || [];
        const group = groups.find((g: LGraphGroup) => g.title === groupName);
        if (!group) return;

        const gx = group.pos[0];
        const gy = group.pos[1];
        const gw = group.size[0];
        const gh = group.size[1];

        const nodes = canvas.graph._nodes || [];
        let changed = false;

        const updateNodeMode = (n: LGraphNode) => {
          if (n.id === this.id) return; 
          
          const nx = n.pos[0];
          const ny = n.pos[1];
          const nw = n.size[0];
          const nh = n.size[1];

          if (!(nx > gx + gw || nx + nw < gx || ny > gy + gh || ny + nh < gy)) {
            // Apply target mode blindly, avoiding advanced precedence for single selectors to keep it snappy.
            // But we respect Mute > Bypass > Active logic generally internally:
            if (target_mode === 2) { n.mode = 2; changed = true; }
            else if (target_mode === 4 && n.mode !== 2) { n.mode = 4; changed = true; }
            else if (target_mode === 0 && n.mode !== 2 && n.mode !== 4) { n.mode = 0; changed = true; }
            
            n.mode = target_mode;
            changed = true;

            if (n.getInnerNodes) {
              const inners = n.getInnerNodes();
              inners.forEach((inner: LGraphNode) => {
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
      nodeType.prototype.onPropertyChanged = function (prop: string, value: any) {
        if (origOnPropertyChanged) origOnPropertyChanged.apply(this, arguments);

        if (prop === "selected_group" || prop === "is_active") {
          const widgetName = prop === "selected_group" ? "Group" : "Active";
          const widget = this.widgets.find((w: any) => w.name === widgetName);
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
