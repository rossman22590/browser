import { Page } from "playwright-core";

/***************************************************
 * 1) Types
 ***************************************************/
export interface DOMBaseNode {
  type: "TEXT_NODE" | "ELEMENT_NODE";
  isVisible: boolean;
  parent?: DOMElementNode;
}

export interface DOMTextNode extends DOMBaseNode {
  type: "TEXT_NODE";
  text: string;
}

export interface DOMElementNode extends DOMBaseNode {
  type: "ELEMENT_NODE";
  tagName: string;
  xpath: string;
  attributes: Record<string, string>;
  children: DOMBaseNode[];
  isInteractive: boolean;
  isTopElement: boolean;
  shadowRoot: boolean;
  highlightIndex?: number;
}

export interface DOMState {
  elementTree: DOMElementNode;
  selectorMap: Record<number, DOMElementNode>;
}

/***************************************************
 * 2) The raw "gatherDomTree" logic as a string,
 *    injected into the browser via .evaluate(...)
 ***************************************************/
const GATHER_DOM_TREE_JS = String.raw`
(function gatherDomTree(highlightElements = true) {
  function isElementInteractive(el) {
    if (!el) return false;
    const tag = (el.tagName || "").toLowerCase();

    const interactiveTags = new Set([
      "a", "button", "details", "embed", "input", "label",
      "menu", "menuitem", "object", "select", "textarea", "summary"
    ]);
    if (interactiveTags.has(tag)) return true;

    const role = el.getAttribute && el.getAttribute("role");
    if (role && /^(button|menu|menuitem|link|checkbox|radio|tab|switch|treeitem)$/i.test(role)) {
      return true;
    }
    if (
      el.hasAttribute &&
      (el.hasAttribute("onclick") ||
       el.hasAttribute("ng-click") ||
       el.hasAttribute("@click"))
    ) {
      return true;
    }
    const tabIndex = el.getAttribute && el.getAttribute("tabindex");
    if (tabIndex && tabIndex !== "-1") return true;

    if (el.getAttribute && el.getAttribute("data-action")) {
      return true;
    }
    return false;
  }

  function isVisible(el) {
    if (!el || !el.getBoundingClientRect) return false;
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) return false;
    const style = window.getComputedStyle(el);
    if (
      style.display === "none" ||
      style.visibility === "hidden" ||
      parseFloat(style.opacity) < 0.1
    ) {
      return false;
    }
    return true;
  }

  let highlightCounter = 1;

  function computeXPath(el) {
    if (!el || el.nodeType !== Node.ELEMENT_NODE) return "";
    let pathSegments = [];
    let current = el;
    while (current && current.nodeType === Node.ELEMENT_NODE) {
      const tagName = current.nodeName.toLowerCase();
      let index = 1;
      let sibling = current.previousSibling;
      while (sibling) {
        if (
          sibling.nodeType === Node.ELEMENT_NODE &&
          sibling.nodeName.toLowerCase() === tagName
        ) {
          index++;
        }
        sibling = sibling.previousSibling;
      }
      const segment = index > 1 ? tagName + "[" + index + "]" : tagName;
      pathSegments.unshift(segment);
      current = current.parentNode;
      if (!current || !current.parentNode) break;
      if (current.nodeName.toLowerCase() === "html") {
        pathSegments.unshift("html");
        break;
      }
    }
    return "/" + pathSegments.join("/");
  }

  function processNode(node) {
    // TEXT_NODE
    if (node.nodeType === Node.TEXT_NODE) {
      const textContent = node.nodeValue.trim();
      if (
        !textContent ||
        textContent.length < 2 ||
        /^[\\d\\s./$@]+$/.test(textContent) ||
        textContent.startsWith("{")
      ) {
        return null;
      }
      return {
        type: "TEXT_NODE",
        text: textContent,
        isVisible: isVisible(node.parentElement),
      };
    }

    // ELEMENT_NODE
    if (node.nodeType !== Node.ELEMENT_NODE) {
      return null;
    }
    const el = node;
    const tagName = el.tagName.toLowerCase();

    // skip certain elements
    if (
      (tagName === "a" && !el.textContent.trim() && !el.querySelector("img")) ||
      tagName === "script" ||
      tagName === "style"
    ) {
      return null;
    }

    // gather attributes
    const attrs = {};
    for (let attr of el.attributes) {
      attrs[attr.name] = attr.value;
    }

    // process children
    const childNodes = [];
    for (let child of el.childNodes) {
      const processed = processNode(child);
      if (processed) {
        childNodes.push(processed);
      }
    }

    const elVisible = isVisible(el);
    const nodeData = {
      type: "ELEMENT_NODE",
      tagName,
      xpath: computeXPath(el),
      attributes: attrs,
      children: childNodes,
      isVisible: elVisible,
      isInteractive: false,
      isTopElement: false,
      shadowRoot: false,
    };

    if (highlightElements && isElementInteractive(el) && elVisible) {
      nodeData.isInteractive = true;
      nodeData.highlightIndex = highlightCounter++;
    }
    return nodeData;
  }

  const root = document.documentElement;
  const result = processNode(root);
  if (result) {
    result.isTopElement = true;
    result.xpath = "/html";
  }
  return result;
})
`;

/***************************************************
 * 3) Parse the raw JSON into typed DOM objects
 ***************************************************/
function parseNode(nodeData: any, parent?: DOMElementNode): DOMBaseNode | null {
  if (!nodeData) return null;

  if (nodeData.type === "TEXT_NODE") {
    const textNode: DOMTextNode = {
      type: "TEXT_NODE",
      text: nodeData.text,
      isVisible: !!nodeData.isVisible,
      parent: parent,
    };
    return textNode;
  }

  if (nodeData.type === "ELEMENT_NODE") {
    const elementNode: DOMElementNode = {
      type: "ELEMENT_NODE",
      tagName: nodeData.tagName || "",
      xpath: nodeData.xpath || "",
      attributes: nodeData.attributes || {},
      children: [],
      isVisible: !!nodeData.isVisible,
      isInteractive: !!nodeData.isInteractive,
      isTopElement: !!nodeData.isTopElement,
      shadowRoot: !!nodeData.shadowRoot,
      highlightIndex: nodeData.highlightIndex,
      parent: parent,
    };

    if (Array.isArray(nodeData.children)) {
      const childNodes: DOMBaseNode[] = [];
      for (const child of nodeData.children) {
        const childNode = parseNode(child, elementNode);
        if (childNode) childNodes.push(childNode);
      }
      elementNode.children = childNodes;
    }
    return elementNode;
  }

  return null;
}

function createSelectorMap(
  elementTree: DOMElementNode
): Record<number, DOMElementNode> {
  const selectorMap: Record<number, DOMElementNode> = {};

  function traverse(node: DOMBaseNode) {
    if (node.type === "ELEMENT_NODE") {
      const elem = node as DOMElementNode;
      if (typeof elem.highlightIndex === "number") {
        selectorMap[elem.highlightIndex] = elem;
      }
      for (const child of elem.children) {
        traverse(child);
      }
    }
  }

  traverse(elementTree);
  return selectorMap;
}

/***************************************************
 * 4) The highlight logic as a string so we can
 *    inject it in the browser context.
 ***************************************************/
const HIGHLIGHT_JS = String.raw`
(function highlightClickableElementsInBrowser(rawDom) {
  if (!rawDom) return;

  // 1) We'll gather all element nodes with highlightIndex
  //    by doing a DFS in rawDom:
  const nodesWithIndex = [];
  function dfs(node) {
    if (!node) return;
    if (node.type === "ELEMENT_NODE" && typeof node.highlightIndex === "number") {
      nodesWithIndex.push(node);
    }
    if (Array.isArray(node.children)) {
      for (const c of node.children) {
        dfs(c);
      }
    }
  }
  dfs(rawDom);

  // 2) Insert a style for overlays if not present
  const styleId = "dom-highlighter-style";
  if (!document.getElementById(styleId)) {
    const styleEl = document.createElement("style");
    styleEl.id = styleId;
    styleEl.textContent = \`
      .dom-highlighter-overlay {
        position: absolute;
        color: #fff;
        font-size: 12px;
        font-weight: bold;
        z-index: 999999;
        pointer-events: none;
        padding: 2px;
      }
    \`;
    document.head.appendChild(styleEl);
  }

  // 3) Clear old overlays
  document.querySelectorAll(".dom-highlighter-overlay").forEach(el => el.remove());

  // 4) We'll define some color rotation
  const highlightColors = [
    { border: "2px solid #FF5D5D", background: "rgba(255,93,93,0.2)" },
    { border: "2px solid #5DFF5D", background: "rgba(93,255,93,0.2)" },
    { border: "2px solid #5D5DFF", background: "rgba(93,93,255,0.2)" },
    { border: "2px solid #FFB85D", background: "rgba(255,184,93,0.2)" },
    { border: "2px solid #FF5DCB", background: "rgba(255,93,203,0.2)" },
  ];

  // 5) For each clickable node, find the real DOM element by xpath, measure & overlay
  nodesWithIndex.forEach((nodeObj, idx) => {
    const highlightIndex = nodeObj.highlightIndex;
    const xpath = nodeObj.xpath;
    if (!xpath) return;

    const result = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
    const el = result.singleNodeValue;
    if (!el || el.nodeType !== Node.ELEMENT_NODE) return;

    const rect = el.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) return;

    const colorStyle = highlightColors[highlightIndex % highlightColors.length];
    const overlay = document.createElement("div");
    overlay.className = "dom-highlighter-overlay";
    overlay.textContent = String(highlightIndex);
    overlay.style.top = window.scrollY + rect.top + "px";
    overlay.style.left = window.scrollX + rect.left + "px";
    overlay.style.width = rect.width + "px";
    overlay.style.height = rect.height + "px";
    overlay.style.border = colorStyle.border;
    overlay.style.backgroundColor = colorStyle.background;

    document.body.appendChild(overlay);
  });
})
`;

export async function getDomStateAndHighlight(page: Page): Promise<DOMState> {
  // 1) Gather raw JSON from the page's DOM
  const rawTree = await page.evaluate((script) => {
    const fn = eval(script);
    return fn(true); // highlightElements = true
  }, GATHER_DOM_TREE_JS);

  if (!rawTree) {
    throw new Error("No DOM returned from browser!");
  }

  // 2) Parse it into typed objects in Node
  const elementTree = parseNode(rawTree) as DOMElementNode;
  if (!elementTree) {
    throw new Error("Failed to parse root element node!");
  }
  const selectorMap = createSelectorMap(elementTree);
  const domState: DOMState = { elementTree, selectorMap };

  // 3) Highlight in the browser using the *raw* tree
  //    (We pass the raw JSON structure so the browser
  //     code can reference the same .xpath and highlightIndex fields.)
  try {
    await page.evaluate(`(${HIGHLIGHT_JS})(${JSON.stringify(rawTree)})`);
  } catch (error) {
    console.error("Error highlighting elements:", error);
  }

  return domState;
}
