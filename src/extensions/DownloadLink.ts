import { Node, mergeAttributes } from "@tiptap/core";

export interface DownloadLinkOptions {
  HTMLAttributes: Record<string, any>;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    downloadLink: {
      setDownloadLink: (attrs: {
        url: string;
        label: string;
        quote: string;
      }) => ReturnType;
    };
  }
}

export const DownloadLink = Node.create<DownloadLinkOptions>({
  name: "downloadLink",

  group: "block",

  atom: true,

  draggable: true,

  addAttributes() {
    return {
      url: {
        default: null,
        parseHTML: (el) => (el as HTMLElement).getAttribute("data-url"),
        renderHTML: (attrs) => ({ "data-url": attrs.url }),
      },
      label: {
        default: "Download",
        parseHTML: (el) => (el as HTMLElement).getAttribute("data-label"),
        renderHTML: (attrs) => ({ "data-label": attrs.label }),
      },
      quote: {
        default: "",
        parseHTML: (el) => (el as HTMLElement).getAttribute("data-quote"),
        renderHTML: (attrs) => ({ "data-quote": attrs.quote }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="download-link"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes({ "data-type": "download-link" }, HTMLAttributes),
    ];
  },

  addCommands() {
    return {
      setDownloadLink:
        (attrs) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs,
          });
        },
    };
  },

  addNodeView() {
    return ({ node }) => {
      const dom = document.createElement("div");
      dom.setAttribute("data-type", "download-link");
      dom.setAttribute("data-url", node.attrs.url as string);
      dom.setAttribute("data-label", node.attrs.label as string);
      dom.setAttribute("data-quote", node.attrs.quote as string);
      dom.classList.add("rtn-dl-nodeview");

      const btn = document.createElement("button");
      btn.className = "rtn-dl-nodeview-button";
      btn.textContent = node.attrs.label as string;
      btn.disabled = true;
      dom.appendChild(btn);

      if (node.attrs.quote) {
        const quoteEl = document.createElement("div");
        quoteEl.className = "rtn-dl-nodeview-quote";
        quoteEl.textContent = node.attrs.quote as string;
        dom.appendChild(quoteEl);
      }

      return { dom };
    };
  },
});
