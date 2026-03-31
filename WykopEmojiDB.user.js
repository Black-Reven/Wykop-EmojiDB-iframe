// ==UserScript==
// @name         Wykop EmojiDB (iframe)
// @namespace    https://github.com/Black-Reven/Wykop-EmojiDB-iframe
// @version      1.3
// @description  Dodaje podręczny panel z emojidb.org do każdego pola tekstowego na Wykop.pl
// @author       BlackReven & AI
// @license      MIT
// @match        *://wykop.pl/*
// @match        *://www.wykop.pl/*
// @match        *://emojidb.org/*
// @match        *://www.emojidb.org/*
// @run-at       document-idle
// @grant        none
// ==/UserScript==

(function () {
    "use strict";

    const CONFIG = {
        emojiDbUrl: "https://emojidb.org/",
        wykopDomain: "wykop.pl",
        storageKey: "wykopEmojiDbSize",
        zoomKey: "wykopEmojiDbZoom",
        defaultZoom: 80,
        minZoom: 50,
        maxZoom: 150,
        zoomStep: 5
    };

    function init() {
        if (location.hostname.includes("emojidb.org")) {
            if (window.self !== window.top) {
                initIframeFixes();
            }
            return;
        }

        injectStyles();
        setupGlobalCloseListener();
        setupTextareaObserver();
    }

    // ==========================================
    // SEKCJA 1: POPRAWKI DLA EMOJIDB (IFRAME)
    // ==========================================

    function initIframeFixes() {
        const fixNavigation = () => {
            document.querySelectorAll('a[target="_blank"]').forEach(link => {
                link.removeAttribute("target");
            });
        };

        const originalOpen = window.open;
        window.open = function (url, target = "") {
            if (target === "_blank" && url) {
                window.location.href = url;
                return null;
            }
            return originalOpen.apply(this, arguments);
        };

        window.addEventListener("message", (event) => {
            if (event.origin && event.origin.includes(CONFIG.wykopDomain)) {
                if (event.data && event.data.action === "back") {
                    const isHomePage = window.location.pathname === "/" && window.location.search === "";
                    const isInternalReferrer = document.referrer.includes("emojidb.org");

                    if (isHomePage && !isInternalReferrer) {
                        return;
                    }

                    window.history.back();
                }
            }
        });

        fixNavigation();
        window.addEventListener("load", fixNavigation);

        const observer = new MutationObserver(fixNavigation);
        observer.observe(document.body, { childList: true, subtree: true });
    }

    // ==========================================
    // SEKCJA 2: INTERFEJS UŻYTKOWNIKA (WYKOP)
    // ==========================================

    function getSavedZoom() {
        try {
            const saved = localStorage.getItem(CONFIG.zoomKey);
            if (saved) {
                const val = parseInt(saved, 10);
                if (val >= CONFIG.minZoom && val <= CONFIG.maxZoom) return val;
            }
        } catch (e) {
            console.error("[EmojiDB] Błąd odczytu zoom:", e);
        }
        return CONFIG.defaultZoom;
    }

    function saveZoom(val) {
        try {
            localStorage.setItem(CONFIG.zoomKey, String(val));
        } catch (e) {
            console.error("[EmojiDB] Błąd zapisu zoom:", e);
        }
    }

    function applyZoomToIframe(iframeWrapper, iframe, zoomPercent) {
        const scale = zoomPercent / 100;
        iframe.style.transform = `scale(${scale})`;
        iframe.style.transformOrigin = "top left";
        iframe.style.width = `${100 / scale}%`;
        iframe.style.height = `${100 / scale}%`;
    }

    function injectStyles() {
        const style = document.createElement("style");
        style.textContent = `
            .wykop-emoji-trigger {
                cursor: pointer;
                font-size: 18px;
                padding: 4px 8px;
                border: 1px solid #ccc;
                border-radius: 6px;
                background: #f8f9fa;
                margin-left: 6px;
                user-select: none;
                line-height: 1;
                display: inline-flex;
                align-items: center;
                transition: background 0.15s, transform 0.1s;
            }
            .wykop-emoji-trigger:hover { background: #e9ecef; }
            .wykop-emoji-trigger:active { transform: scale(0.95); }

            .wykop-emoji-panel {
                position: absolute;
                z-index: 99999;
                background: #fff;
                border: 1px solid #ddd;
                border-radius: 10px;
                box-shadow: 0 8px 30px rgba(0,0,0,0.15);
                padding: 12px;
                width: 820px;
                height: 560px;
                min-width: 320px;
                min-height: 250px;
                max-width: 95vw;
                max-height: 90vh;
                display: none;
                flex-direction: column;
                resize: both;
                overflow: hidden;
                font-family: sans-serif;
                opacity: 0;
                transform: translateY(-10px);
                transition: opacity 0.2s, transform 0.2s;
            }
            .wykop-emoji-panel.visible {
                display: flex;
                opacity: 1;
                transform: translateY(0);
            }

            .wykop-emoji-nav {
                display: flex;
                gap: 8px;
                margin-bottom: 10px;
                flex-shrink: 0;
                align-items: center;
                flex-wrap: wrap;
            }
            .wykop-emoji-nav button {
                padding: 7px 12px;
                font-size: 13px;
                font-weight: 500;
                background: #f8f9fa;
                border: 1px solid #ddd;
                border-radius: 6px;
                cursor: pointer;
                transition: all 0.2s;
                user-select: none;
                white-space: nowrap;
            }
            .wykop-emoji-nav button:hover {
                background: #e9ecef;
                border-color: #ccc;
            }

            .wykop-emoji-zoom-controls {
                display: flex;
                align-items: center;
                gap: 4px;
                margin-left: auto;
                flex-shrink: 0;
            }
            .wykop-emoji-zoom-controls button {
                width: 28px;
                height: 28px;
                padding: 0;
                font-size: 16px;
                font-weight: bold;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                background: #f8f9fa;
                border: 1px solid #ddd;
                border-radius: 6px;
                cursor: pointer;
                transition: all 0.2s;
                user-select: none;
            }
            .wykop-emoji-zoom-controls button:hover {
                background: #e9ecef;
                border-color: #ccc;
            }
            .wykop-emoji-zoom-controls input[type="range"] {
                width: 80px;
                height: 6px;
                cursor: pointer;
                accent-color: #4a90d9;
            }
            .wykop-emoji-zoom-label {
                font-size: 11px;
                color: #888;
                min-width: 32px;
                text-align: center;
                user-select: none;
                font-variant-numeric: tabular-nums;
            }

            .wykop-emoji-iframe-wrapper {
                flex: 1;
                overflow: hidden;
                border-radius: 8px;
                position: relative;
                min-height: 0;
            }

            .wykop-emoji-panel iframe {
                border: none;
                background: #f8f9fa;
                display: block;
            }

            @media (prefers-color-scheme: dark) {
                .wykop-emoji-trigger { background: #333; border-color: #555; color: #eee; }
                .wykop-emoji-trigger:hover { background: #444; }
                .wykop-emoji-panel { background: #2c2c2c; border-color: #444; }
                .wykop-emoji-nav button { background: #333; border-color: #555; color: #eee; }
                .wykop-emoji-nav button:hover { background: #444; }
                .wykop-emoji-zoom-controls button { background: #333; border-color: #555; color: #eee; }
                .wykop-emoji-zoom-controls button:hover { background: #444; }
                .wykop-emoji-zoom-label { color: #aaa; }
                .wykop-emoji-panel iframe { background: #333; }
            }
            [data-theme="dark"] .wykop-emoji-trigger { background: #333; border-color: #555; color: #eee; }
            [data-theme="dark"] .wykop-emoji-trigger:hover { background: #444; }
            [data-theme="dark"] .wykop-emoji-panel { background: #2c2c2c; border-color: #444; }
            [data-theme="dark"] .wykop-emoji-nav button { background: #333; border-color: #555; color: #eee; }
            [data-theme="dark"] .wykop-emoji-nav button:hover { background: #444; }
            [data-theme="dark"] .wykop-emoji-zoom-controls button { background: #333; border-color: #555; color: #eee; }
            [data-theme="dark"] .wykop-emoji-zoom-controls button:hover { background: #444; }
            [data-theme="dark"] .wykop-emoji-zoom-label { color: #aaa; }
        `;
        document.head.appendChild(style);
    }

    function closeAllPanels() {
        document.querySelectorAll(".wykop-emoji-panel.visible").forEach(panel => {
            if (panel.style.width && panel.style.height) {
                localStorage.setItem(CONFIG.storageKey, JSON.stringify({
                    width: panel.style.width,
                    height: panel.style.height
                }));
            }
            panel.classList.remove("visible");
        });
    }

    function setupGlobalCloseListener() {
        document.addEventListener("click", (e) => {
            document.querySelectorAll(".wykop-emoji-panel.visible").forEach(panel => {
                const triggerId = panel.dataset.triggerId;
                const trigger = document.getElementById(triggerId);

                if (!panel.contains(e.target) && e.target !== trigger) {
                    closeAllPanels();
                }
            });
        });
    }

    function createEmojiPanel(textarea) {
        const uniqueId = "emoji-trigger-" + Math.random().toString(36).slice(2);

        const triggerBtn = document.createElement("span");
        triggerBtn.id = uniqueId;
        triggerBtn.className = "wykop-emoji-trigger";
        triggerBtn.textContent = "✌︎㋡";
        triggerBtn.title = "Otwórz EmojiDB";

        const panel = document.createElement("div");
        panel.className = "wykop-emoji-panel";
        panel.dataset.triggerId = uniqueId;

        const savedSize = localStorage.getItem(CONFIG.storageKey);
        if (savedSize) {
            try {
                const { width, height } = JSON.parse(savedSize);
                panel.style.width = width;
                panel.style.height = height;
            } catch (e) {
                console.error("[EmojiDB] Błąd odczytu rozmiaru panelu:", e);
            }
        }

        // --- Nawigacja ---
        const nav = document.createElement("div");
        nav.className = "wykop-emoji-nav";

        const backBtn = document.createElement("button");
        backBtn.textContent = "← Wstecz";
        backBtn.title = "Cofnij do poprzedniej kategorii";

        const homeBtn = document.createElement("button");
        homeBtn.textContent = "🏠︎ Główna";
        homeBtn.title = "Powrót na stronę główną EmojiDB";

        // --- Zoom ---
        const zoomControls = document.createElement("div");
        zoomControls.className = "wykop-emoji-zoom-controls";

        const zoomOutBtn = document.createElement("button");
        zoomOutBtn.textContent = "−";
        zoomOutBtn.title = "Zmniejsz widok";

        const zoomSlider = document.createElement("input");
        zoomSlider.type = "range";
        zoomSlider.min = String(CONFIG.minZoom);
        zoomSlider.max = String(CONFIG.maxZoom);
        zoomSlider.step = String(CONFIG.zoomStep);
        zoomSlider.value = String(getSavedZoom());
        zoomSlider.title = `Skalowanie widoku: ${zoomSlider.value}%`;

        const zoomLabel = document.createElement("span");
        zoomLabel.className = "wykop-emoji-zoom-label";
        zoomLabel.textContent = `${zoomSlider.value}%`;

        const zoomInBtn = document.createElement("button");
        zoomInBtn.textContent = "+";
        zoomInBtn.title = "Powiększ widok";

        const zoomResetBtn = document.createElement("button");
        zoomResetBtn.textContent = "⟲";
        zoomResetBtn.title = `Resetuj do domyślnego (${CONFIG.defaultZoom}%)`;
        zoomResetBtn.style.fontSize = "14px";

        zoomControls.appendChild(zoomOutBtn);
        zoomControls.appendChild(zoomSlider);
        zoomControls.appendChild(zoomLabel);
        zoomControls.appendChild(zoomInBtn);
        zoomControls.appendChild(zoomResetBtn);

        nav.appendChild(backBtn);
        nav.appendChild(homeBtn);
        nav.appendChild(zoomControls);
        panel.appendChild(nav);

        // --- Iframe ---
        const iframeWrapper = document.createElement("div");
        iframeWrapper.className = "wykop-emoji-iframe-wrapper";

        const iframe = document.createElement("iframe");
        iframe.src = CONFIG.emojiDbUrl;
        iframe.setAttribute("allow", "clipboard-write");

        iframeWrapper.appendChild(iframe);
        panel.appendChild(iframeWrapper);

        // Początkowy zoom
        applyZoomToIframe(iframeWrapper, iframe, getSavedZoom());

        const updateZoom = (newVal) => {
            newVal = Math.max(CONFIG.minZoom, Math.min(CONFIG.maxZoom, newVal));
            zoomSlider.value = String(newVal);
            zoomLabel.textContent = `${newVal}%`;
            zoomSlider.title = `Skalowanie widoku: ${newVal}%`;
            applyZoomToIframe(iframeWrapper, iframe, newVal);
            saveZoom(newVal);
        };

        zoomSlider.addEventListener("input", () => {
            updateZoom(parseInt(zoomSlider.value, 10));
        });

        zoomOutBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            updateZoom(parseInt(zoomSlider.value, 10) - CONFIG.zoomStep);
        });

        zoomInBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            updateZoom(parseInt(zoomSlider.value, 10) + CONFIG.zoomStep);
        });

        zoomResetBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            updateZoom(CONFIG.defaultZoom);
        });

        // --- Otwieranie panelu ---
        triggerBtn.addEventListener("click", (e) => {
            e.stopPropagation();

            const isVisible = panel.classList.contains("visible");
            closeAllPanels();

            if (!isVisible) {
                const rect = triggerBtn.getBoundingClientRect();
                const panelWidth = panel.offsetWidth || 820;

                let leftPos = rect.left + window.scrollX - (panelWidth / 2) + 20;
                leftPos = Math.max(10, leftPos);
                if (leftPos + panelWidth > window.innerWidth) {
                    leftPos = window.innerWidth - panelWidth - 20;
                }

                panel.style.top = (rect.bottom + window.scrollY + 8) + "px";
                panel.style.left = leftPos + "px";
                panel.classList.add("visible");
            }
        });

        backBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            if (iframe.contentWindow) {
                iframe.contentWindow.postMessage({ action: "back" }, CONFIG.emojiDbUrl);
            }
        });

        homeBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            iframe.src = CONFIG.emojiDbUrl;
        });

        const parent = textarea.parentElement;
        if (parent) {
            parent.style.position = "relative";
            if (textarea.nextSibling) {
                parent.insertBefore(triggerBtn, textarea.nextSibling);
            } else {
                parent.appendChild(triggerBtn);
            }
        }
        document.body.appendChild(panel);

        textarea.dataset.wykopEmoji = "true";
    }

    function setupTextareaObserver() {
        const processTextareas = () => {
            const textareas = document.querySelectorAll('textarea:not([data-wykop-emoji="true"])');
            textareas.forEach(createEmojiPanel);
        };

        processTextareas();
        const observer = new MutationObserver(processTextareas);
        observer.observe(document.body, { childList: true, subtree: true });
    }

    init();

})();
