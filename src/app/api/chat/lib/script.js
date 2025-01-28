// Self-executing function to avoid polluting global scope
(function () {
  // Store references we'll need later
  let currentDomState = null;

  function isElementInteractive(el) {
    if (!el) return false;
    const tag = (el.tagName || "").toLowerCase();
    const interactiveTags = new Set([
      "a",
      "button",
      "details",
      "embed",
      "input",
      "label",
      "menu",
      "menuitem",
      "object",
      "select",
      "textarea",
      "summary",
    ]);
    if (interactiveTags.has(tag)) return true;

    const role = el.getAttribute && el.getAttribute("role");
    if (
      role &&
      /^(button|menu|menuitem|link|checkbox|radio|tab|switch|treeitem)$/i.test(
        role
      )
    ) {
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

  function gatherDomTree() {
    let highlightCounter = 1;
    const selectorMap = {};

    function processNode(node) {
      if (node.nodeType === Node.TEXT_NODE) {
        const textContent = node.nodeValue.trim();
        if (
          !textContent ||
          textContent.length < 2 ||
          /^[\d\s./$@]+$/.test(textContent)
        ) {
          return null;
        }
        return {
          type: "TEXT_NODE",
          text: textContent,
          isVisible: isVisible(node.parentElement),
        };
      }

      if (node.nodeType !== Node.ELEMENT_NODE) return null;

      const el = node;
      const tagName = el.tagName.toLowerCase();

      if (
        (tagName === "a" &&
          !el.textContent.trim() &&
          !el.querySelector("img")) ||
        tagName === "script" ||
        tagName === "style"
      ) {
        return null;
      }

      const attrs = {};
      for (let attr of el.attributes) {
        attrs[attr.name] = attr.value;
      }

      const childNodes = [];
      for (let child of el.childNodes) {
        const processed = processNode(child);
        if (processed) childNodes.push(processed);
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
        element: el, // Store reference to actual DOM element
      };

      if (isElementInteractive(el) && elVisible) {
        nodeData.isInteractive = true;
        nodeData.highlightIndex = highlightCounter++;
        selectorMap[nodeData.highlightIndex] = nodeData;
      }

      return nodeData;
    }

    const root = document.documentElement;
    const elementTree = processNode(root);
    if (elementTree) {
      elementTree.isTopElement = true;
      elementTree.xpath = "/html";
    }

    return { elementTree, selectorMap };
  }

  function addHighlightStyles() {
    const styleId = "dom-highlighter-style";
    if (!document.getElementById(styleId)) {
      const styleEl = document.createElement("style");
      styleEl.id = styleId;
      styleEl.textContent = `
        .dom-highlighter-overlay {
          position: fixed;
          font-size: 14px;
          font-weight: bold;
          z-index: 999999;
          pointer-events: none;
          box-sizing: border-box;
          border: 2px solid transparent;
        }
        .dom-highlighter-number {
          position: absolute;
          top: -20px;
          left: 50%;
          transform: translateX(-50%);
          padding: 2px 6px;
          border-radius: 10px;
          font-size: 11px;
          font-weight: bold;
          white-space: nowrap;
          opacity: 0.9;
          border: 1px solid rgba(0,0,0,0.2);
        }
      `;
      document.head.appendChild(styleEl);
    }
  }

  function clearHighlights() {
    document
      .querySelectorAll(".dom-highlighter-overlay")
      .forEach((el) => el.remove());
  }

  // Update the highlighting code to use matching colors
  function highlightElement(el, index, rect) {
    const colors = [
      { border: "#FF5D5D", bg: "#FF5D5D", highlight: "rgba(255,93,93,0.08)" },
      { border: "#4CAF50", bg: "#4CAF50", highlight: "rgba(76,175,80,0.08)" },
      { border: "#2196F3", bg: "#2196F3", highlight: "rgba(33,150,243,0.08)" },
      { border: "#FFC107", bg: "#FFC107", highlight: "rgba(255,193,7,0.08)" },
      { border: "#9C27B0", bg: "#9C27B0", highlight: "rgba(156,39,176,0.08)" },
    ];

    const colorStyle = colors[index % colors.length];
    const overlay = document.createElement("div");
    overlay.className = "dom-highlighter-overlay";

    const numberSpan = document.createElement("span");
    numberSpan.className = "dom-highlighter-number";
    numberSpan.textContent = String(index);
    numberSpan.style.backgroundColor = colorStyle.bg;
    numberSpan.style.color = "white";
    overlay.appendChild(numberSpan);

    overlay.style.top = rect.top + "px";
    overlay.style.left = rect.left + "px";
    overlay.style.width = rect.width + "px";
    overlay.style.height = rect.height + "px";
    overlay.style.borderColor = colorStyle.border;
    overlay.style.backgroundColor = colorStyle.highlight;

    document.body.appendChild(overlay);
  }

  // Exposed global functions
  window.highlightInteractiveElements = function () {
    clearHighlights();
    currentDomState = gatherDomTree();
    addHighlightStyles();

    const highlightColors = [
      { border: "#FF5D5D", background: "rgba(255,93,93,0.2)" },
      { border: "#5DFF5D", background: "rgba(93,255,93,0.2)" },
      { border: "#5D5DFF", background: "rgba(93,93,255,0.2)" },
      { border: "#FFB85D", background: "rgba(255,184,93,0.2)" },
      { border: "#FF5DCB", background: "rgba(255,93,203,0.2)" },
    ];

    Object.values(currentDomState.selectorMap).forEach((nodeObj) => {
      const el = nodeObj.element;
      const highlightIndex = nodeObj.highlightIndex;

      const rect = el.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) return;

      highlightElement(el, highlightIndex, rect);
    });

    console.log(
      "Interactive elements highlighted! Use clickHighlightedElement(index) to click an element."
    );
  };

  window.clickHighlightedElement = function (index) {
    if (!currentDomState) {
      console.error("Please run highlightInteractiveElements() first!");
      return;
    }

    const nodeData = currentDomState.selectorMap[index];
    if (!nodeData) {
      console.error(`No element found with index ${index}`);
      return;
    }

    nodeData.element.click();
    console.log(`Clicked element with index ${index}`);
  };

  console.log(
    "DOM highlighter loaded! Call highlightInteractiveElements() to begin."
  );
})();
