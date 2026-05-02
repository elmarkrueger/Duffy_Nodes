import { app } from "../../../scripts/app.js";
import { H as reactive, d as defineComponent, o as onMounted, b as openBlock, c as createElementBlock, e as createBaseVNode, F as Fragment, r as renderList, k as normalizeClass, w as withDirectives, I as vModelCheckbox, t as toDisplayString, v as vModelText, h as ref, _ as _export_sfc, i as createApp } from "./_plugin-vue_export-helper-Db8uvN6Q.js";
import { api } from "../../../scripts/api.js";
var FilterMatchMode = {
  STARTS_WITH: "startsWith",
  CONTAINS: "contains",
  NOT_CONTAINS: "notContains",
  ENDS_WITH: "endsWith",
  EQUALS: "equals",
  NOT_EQUALS: "notEquals",
  LESS_THAN: "lt",
  LESS_THAN_OR_EQUAL_TO: "lte",
  GREATER_THAN: "gt",
  GREATER_THAN_OR_EQUAL_TO: "gte",
  DATE_IS: "dateIs",
  DATE_IS_NOT: "dateIsNot",
  DATE_BEFORE: "dateBefore",
  DATE_AFTER: "dateAfter"
};
function _typeof(o) {
  "@babel/helpers - typeof";
  return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function(o2) {
    return typeof o2;
  } : function(o2) {
    return o2 && "function" == typeof Symbol && o2.constructor === Symbol && o2 !== Symbol.prototype ? "symbol" : typeof o2;
  }, _typeof(o);
}
function ownKeys(e, r) {
  var t = Object.keys(e);
  if (Object.getOwnPropertySymbols) {
    var o = Object.getOwnPropertySymbols(e);
    r && (o = o.filter(function(r2) {
      return Object.getOwnPropertyDescriptor(e, r2).enumerable;
    })), t.push.apply(t, o);
  }
  return t;
}
function _objectSpread(e) {
  for (var r = 1; r < arguments.length; r++) {
    var t = null != arguments[r] ? arguments[r] : {};
    r % 2 ? ownKeys(Object(t), true).forEach(function(r2) {
      _defineProperty(e, r2, t[r2]);
    }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(t)) : ownKeys(Object(t)).forEach(function(r2) {
      Object.defineProperty(e, r2, Object.getOwnPropertyDescriptor(t, r2));
    });
  }
  return e;
}
function _defineProperty(obj, key, value) {
  key = _toPropertyKey(key);
  if (key in obj) {
    Object.defineProperty(obj, key, { value, enumerable: true, configurable: true, writable: true });
  } else {
    obj[key] = value;
  }
  return obj;
}
function _toPropertyKey(t) {
  var i = _toPrimitive(t, "string");
  return "symbol" == _typeof(i) ? i : String(i);
}
function _toPrimitive(t, r) {
  if ("object" != _typeof(t) || !t) return t;
  var e = t[Symbol.toPrimitive];
  if (void 0 !== e) {
    var i = e.call(t, r);
    if ("object" != _typeof(i)) return i;
    throw new TypeError("@@toPrimitive must return a primitive value.");
  }
  return ("string" === r ? String : Number)(t);
}
var defaultOptions = {
  ripple: false,
  inputStyle: null,
  locale: {
    startsWith: "Starts with",
    contains: "Contains",
    notContains: "Not contains",
    endsWith: "Ends with",
    equals: "Equals",
    notEquals: "Not equals",
    noFilter: "No Filter",
    lt: "Less than",
    lte: "Less than or equal to",
    gt: "Greater than",
    gte: "Greater than or equal to",
    dateIs: "Date is",
    dateIsNot: "Date is not",
    dateBefore: "Date is before",
    dateAfter: "Date is after",
    clear: "Clear",
    apply: "Apply",
    matchAll: "Match All",
    matchAny: "Match Any",
    addRule: "Add Rule",
    removeRule: "Remove Rule",
    accept: "Yes",
    reject: "No",
    choose: "Choose",
    upload: "Upload",
    cancel: "Cancel",
    completed: "Completed",
    pending: "Pending",
    fileSizeTypes: ["B", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"],
    dayNames: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
    dayNamesShort: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
    dayNamesMin: ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"],
    monthNames: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
    monthNamesShort: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
    chooseYear: "Choose Year",
    chooseMonth: "Choose Month",
    chooseDate: "Choose Date",
    prevDecade: "Previous Decade",
    nextDecade: "Next Decade",
    prevYear: "Previous Year",
    nextYear: "Next Year",
    prevMonth: "Previous Month",
    nextMonth: "Next Month",
    prevHour: "Previous Hour",
    nextHour: "Next Hour",
    prevMinute: "Previous Minute",
    nextMinute: "Next Minute",
    prevSecond: "Previous Second",
    nextSecond: "Next Second",
    am: "am",
    pm: "pm",
    today: "Today",
    weekHeader: "Wk",
    firstDayOfWeek: 0,
    showMonthAfterYear: false,
    dateFormat: "mm/dd/yy",
    weak: "Weak",
    medium: "Medium",
    strong: "Strong",
    passwordPrompt: "Enter a password",
    emptyFilterMessage: "No results found",
    // @deprecated Use 'emptySearchMessage' option instead.
    searchMessage: "{0} results are available",
    selectionMessage: "{0} items selected",
    emptySelectionMessage: "No selected item",
    emptySearchMessage: "No results found",
    emptyMessage: "No available options",
    aria: {
      trueLabel: "True",
      falseLabel: "False",
      nullLabel: "Not Selected",
      star: "1 star",
      stars: "{star} stars",
      selectAll: "All items selected",
      unselectAll: "All items unselected",
      close: "Close",
      previous: "Previous",
      next: "Next",
      navigation: "Navigation",
      scrollTop: "Scroll Top",
      moveTop: "Move Top",
      moveUp: "Move Up",
      moveDown: "Move Down",
      moveBottom: "Move Bottom",
      moveToTarget: "Move to Target",
      moveToSource: "Move to Source",
      moveAllToTarget: "Move All to Target",
      moveAllToSource: "Move All to Source",
      pageLabel: "Page {page}",
      firstPageLabel: "First Page",
      lastPageLabel: "Last Page",
      nextPageLabel: "Next Page",
      prevPageLabel: "Previous Page",
      rowsPerPageLabel: "Rows per page",
      jumpToPageDropdownLabel: "Jump to Page Dropdown",
      jumpToPageInputLabel: "Jump to Page Input",
      selectRow: "Row Selected",
      unselectRow: "Row Unselected",
      expandRow: "Row Expanded",
      collapseRow: "Row Collapsed",
      showFilterMenu: "Show Filter Menu",
      hideFilterMenu: "Hide Filter Menu",
      filterOperator: "Filter Operator",
      filterConstraint: "Filter Constraint",
      editRow: "Row Edit",
      saveEdit: "Save Edit",
      cancelEdit: "Cancel Edit",
      listView: "List View",
      gridView: "Grid View",
      slide: "Slide",
      slideNumber: "{slideNumber}",
      zoomImage: "Zoom Image",
      zoomIn: "Zoom In",
      zoomOut: "Zoom Out",
      rotateRight: "Rotate Right",
      rotateLeft: "Rotate Left",
      listLabel: "Option List"
    }
  },
  filterMatchModeOptions: {
    text: [FilterMatchMode.STARTS_WITH, FilterMatchMode.CONTAINS, FilterMatchMode.NOT_CONTAINS, FilterMatchMode.ENDS_WITH, FilterMatchMode.EQUALS, FilterMatchMode.NOT_EQUALS],
    numeric: [FilterMatchMode.EQUALS, FilterMatchMode.NOT_EQUALS, FilterMatchMode.LESS_THAN, FilterMatchMode.LESS_THAN_OR_EQUAL_TO, FilterMatchMode.GREATER_THAN, FilterMatchMode.GREATER_THAN_OR_EQUAL_TO],
    date: [FilterMatchMode.DATE_IS, FilterMatchMode.DATE_IS_NOT, FilterMatchMode.DATE_BEFORE, FilterMatchMode.DATE_AFTER]
  },
  zIndex: {
    modal: 1100,
    overlay: 1e3,
    menu: 1e3,
    tooltip: 1100
  },
  pt: void 0,
  ptOptions: {
    mergeSections: true,
    mergeProps: false
  },
  unstyled: false,
  csp: {
    nonce: void 0
  }
};
var PrimeVueSymbol = Symbol();
function switchTheme(currentTheme, newTheme, linkElementId, callback) {
  if (currentTheme !== newTheme) {
    var linkElement = document.getElementById(linkElementId);
    var cloneLinkElement = linkElement.cloneNode(true);
    var newThemeUrl = linkElement.getAttribute("href").replace(currentTheme, newTheme);
    cloneLinkElement.setAttribute("id", linkElementId + "-clone");
    cloneLinkElement.setAttribute("href", newThemeUrl);
    cloneLinkElement.addEventListener("load", function() {
      linkElement.remove();
      cloneLinkElement.setAttribute("id", linkElementId);
      if (callback) {
        callback();
      }
    });
    linkElement.parentNode && linkElement.parentNode.insertBefore(cloneLinkElement, linkElement.nextSibling);
  }
}
var PrimeVue = {
  install: function install(app2, options) {
    var configOptions = options ? _objectSpread(_objectSpread({}, defaultOptions), options) : _objectSpread({}, defaultOptions);
    var PrimeVue2 = {
      config: reactive(configOptions),
      changeTheme: switchTheme
    };
    app2.config.globalProperties.$primevue = PrimeVue2;
    app2.provide(PrimeVueSymbol, PrimeVue2);
  }
};
const _hoisted_1 = { class: "power-lora-loader-root" };
const _hoisted_2 = { class: "lora-list" };
const _hoisted_3 = { class: "lora-controls" };
const _hoisted_4 = { class: "lora-input-row" };
const _hoisted_5 = ["onUpdate:modelValue"];
const _hoisted_6 = ["onClick"];
const _hoisted_7 = { class: "lora-name-text" };
const _hoisted_8 = { class: "lora-weights" };
const _hoisted_9 = { class: "weight-control" };
const _hoisted_10 = ["onUpdate:modelValue"];
const _hoisted_11 = { class: "weight-control" };
const _hoisted_12 = ["onUpdate:modelValue"];
const _hoisted_13 = { class: "lora-actions" };
const _hoisted_14 = ["onClick"];
const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "PowerLoraLoader",
  props: {
    onChange: { type: Function }
  },
  setup(__props, { expose: __expose }) {
    const props = __props;
    const loras = ref([]);
    const availableLoras = ref([]);
    onMounted(async () => {
      try {
        const response = await api.fetchApi("/duffynodes/api/v1/lora-list");
        if (response.ok) {
          const data = await response.json();
          availableLoras.value = data.loras || [];
        }
      } catch (e) {
        console.error("Failed to fetch LoRA list:", e);
      }
    });
    function serialise() {
      return JSON.stringify(loras.value);
    }
    function deserialise(json) {
      try {
        const data = JSON.parse(json);
        if (Array.isArray(data)) {
          loras.value = data.map((l) => ({
            ...l,
            is_active: l.is_active !== false
          }));
        }
      } catch (e) {
      }
    }
    function openLoraMenu(event, lora) {
      if (typeof LiteGraph !== "undefined" && LiteGraph.ContextMenu) {
        new LiteGraph.ContextMenu(availableLoras.value, {
          event,
          title: "Select LoRA",
          className: "dark",
          callback: (value) => {
            if (typeof value === "string") {
              lora.name = value;
              emitChange();
            }
          }
        });
      }
    }
    function emitChange() {
      var _a;
      (_a = props.onChange) == null ? void 0 : _a.call(props, serialise());
    }
    function addLora() {
      loras.value.push({ name: "", strength_model: 1, strength_clip: 1, is_active: true });
      emitChange();
    }
    function removeLora(index) {
      loras.value.splice(index, 1);
      emitChange();
    }
    function enableAll() {
      loras.value.forEach((l) => l.is_active = true);
      emitChange();
    }
    function bypassAll() {
      loras.value.forEach((l) => l.is_active = false);
      emitChange();
    }
    function cleanup() {
    }
    __expose({ serialise, deserialise, cleanup });
    return (_ctx, _cache) => {
      return openBlock(), createElementBlock("div", _hoisted_1, [
        _cache[4] || (_cache[4] = createBaseVNode("div", { class: "header" }, [
          createBaseVNode("h4", null, "Power LoRA Loader")
        ], -1)),
        createBaseVNode("div", _hoisted_2, [
          (openBlock(true), createElementBlock(Fragment, null, renderList(loras.value, (lora, index) => {
            return openBlock(), createElementBlock("div", {
              key: index,
              class: normalizeClass(["lora-item glass-panel", { "bypassed": lora.is_active === false }])
            }, [
              createBaseVNode("div", _hoisted_3, [
                _cache[1] || (_cache[1] = createBaseVNode("label", null, "LoRA File", -1)),
                createBaseVNode("div", _hoisted_4, [
                  withDirectives(createBaseVNode("input", {
                    type: "checkbox",
                    "onUpdate:modelValue": ($event) => lora.is_active = $event,
                    onChange: emitChange,
                    class: "bypass-toggle",
                    title: "Toggle Bypass"
                  }, null, 40, _hoisted_5), [
                    [vModelCheckbox, lora.is_active]
                  ]),
                  createBaseVNode("button", {
                    class: "lora-file-btn",
                    onClick: ($event) => openLoraMenu($event, lora)
                  }, [
                    _cache[0] || (_cache[0] = createBaseVNode("span", null, "📂 ", -1)),
                    createBaseVNode("span", _hoisted_7, toDisplayString(lora.name || "Select LoRA..."), 1)
                  ], 8, _hoisted_6)
                ])
              ]),
              createBaseVNode("div", _hoisted_8, [
                createBaseVNode("div", _hoisted_9, [
                  _cache[2] || (_cache[2] = createBaseVNode("label", null, "Strength Model", -1)),
                  withDirectives(createBaseVNode("input", {
                    type: "number",
                    "onUpdate:modelValue": ($event) => lora.strength_model = $event,
                    step: "0.05",
                    min: "-10.0",
                    max: "10.0",
                    onChange: emitChange,
                    class: "native-num-input"
                  }, null, 40, _hoisted_10), [
                    [
                      vModelText,
                      lora.strength_model,
                      void 0,
                      { number: true }
                    ]
                  ])
                ]),
                createBaseVNode("div", _hoisted_11, [
                  _cache[3] || (_cache[3] = createBaseVNode("label", null, "Strength Clip", -1)),
                  withDirectives(createBaseVNode("input", {
                    type: "number",
                    "onUpdate:modelValue": ($event) => lora.strength_clip = $event,
                    step: "0.05",
                    min: "-10.0",
                    max: "10.0",
                    onChange: emitChange,
                    class: "native-num-input"
                  }, null, 40, _hoisted_12), [
                    [
                      vModelText,
                      lora.strength_clip,
                      void 0,
                      { number: true }
                    ]
                  ])
                ])
              ]),
              createBaseVNode("div", _hoisted_13, [
                createBaseVNode("button", {
                  class: "remove-btn",
                  onClick: ($event) => removeLora(index)
                }, "✕", 8, _hoisted_14)
              ])
            ], 2);
          }), 128))
        ]),
        createBaseVNode("div", { class: "actions" }, [
          createBaseVNode("button", {
            class: "add-btn glass-btn",
            onClick: addLora
          }, "+ Add LoRA"),
          createBaseVNode("div", { class: "global-toggles" }, [
            createBaseVNode("button", {
              class: "global-btn glass-btn",
              onClick: enableAll,
              title: "Enable All"
            }, "🟢"),
            createBaseVNode("button", {
              class: "global-btn glass-btn",
              onClick: bypassAll,
              title: "Bypass All"
            }, "🔴")
          ])
        ])
      ]);
    };
  }
});
const PowerLoraLoader = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-e231ad42"]]);
const MIN_W = 400, MIN_H = 300;
app.registerExtension({
  name: "Duffy.PowerLoraLoader.Vue",
  async nodeCreated(node) {
    var _a;
    if (node.comfyClass !== "Duffy_PowerLoraLoader") return;
    const dataWidget = (_a = node.widgets) == null ? void 0 : _a.find((w) => w.name === "lora_payload");
    if (dataWidget) {
      dataWidget.type = "hidden";
      dataWidget.computeSize = () => [0, -4];
    }
    const container = document.createElement("div");
    container.style.cssText = "width:100%; height:100%; box-sizing:border-box; overflow:hidden;";
    container.addEventListener("pointerdown", (e) => e.stopPropagation());
    container.addEventListener("wheel", (e) => e.stopPropagation());
    container.addEventListener("dblclick", (e) => e.stopPropagation());
    const vueApp = createApp(PowerLoraLoader, {
      onChange: (json) => {
        if (dataWidget) dataWidget.value = json;
        node.setDirtyCanvas(true, true);
      }
    });
    vueApp.use(PrimeVue);
    const instance = vueApp.mount(container);
    const domWidget = node.addDOMWidget("vue_ui", "custom", container, { serialize: false });
    domWidget.computeSize = () => [MIN_W, MIN_H];
    const origOnResize = node.onResize;
    node.onResize = function(size) {
      size[0] = Math.max(MIN_W, size[0]);
      size[1] = Math.max(MIN_H, size[1]);
      origOnResize == null ? void 0 : origOnResize.call(this, size);
    };
    node.setSize([MIN_W, MIN_H]);
    if (dataWidget == null ? void 0 : dataWidget.value) {
      instance.deserialise(dataWidget.value);
    }
    const origConfigure = node.configure;
    node.configure = function() {
      const r = origConfigure ? origConfigure.apply(this, arguments) : void 0;
      if (dataWidget == null ? void 0 : dataWidget.value) {
        instance.deserialise(dataWidget.value);
      }
      return r;
    };
    const origRemoved = node.onRemoved;
    node.onRemoved = function() {
      var _a2;
      (_a2 = instance.cleanup) == null ? void 0 : _a2.call(instance);
      vueApp.unmount();
      origRemoved == null ? void 0 : origRemoved.apply(this, arguments);
    };
  }
});
