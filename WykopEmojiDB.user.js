// ==UserScript==
// @name         Wykop EmojiDB (iframe)
// @namespace    https://github.com/Black-Reven/Wykop-EmojiDB-iframe
// @version      1.2.0
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

    // Konfiguracja skryptu
    const CONFIG = {
        emojiDbUrl: "https://emojidb.org/",
        wykopDomain: "wykop.pl",
        storageKey: "wykopEmojiDbSize" // Klucz do zapisywania preferowanego rozmiaru panelu
    };

    /**
     * Główna funkcja inicjalizująca skrypt
     */
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
                        return; // Ochrona przed cofnięciem całej karty Wykopu
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
            .wykop-emoji-trigger:hover {
                background: #e9ecef;
            }
            .wykop-emoji-trigger:active {
                transform: scale(0.95);
            }

            .wykop-emoji-panel {
                position: absolute;
                z-index: 99999;
                background: #fff;
                border: 1px solid #ddd;
                border-radius: 10px;
                box-shadow: 0 8px 30px rgba(0,0,0,0.15);
                padding: 12px;

                /* Domyślne wymiary i limity */
                width: 820px;
                height: 560px;
                min-width: 320px;
                min-height: 250px;
                max-width: 95vw;
                max-height: 90vh;

                /* Ustawienia Flexbox dla responsywnego iframe i opcja zmiany rozmiaru */
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
                display: flex; /* Zmiana z block na flex dla poprawnego skalowania */
                opacity: 1;
                transform: translateY(0);
            }

            .wykop-emoji-nav {
                display: flex;
                gap: 10px;
                margin-bottom: 10px;
                flex-shrink: 0; /* Pasek nawigacji się nie kurczy */
            }
            .wykop-emoji-nav button {
                flex: 1;
                padding: 9px 12px;
                font-size: 14px;
                font-weight: 500;
                background: #f8f9fa;
                border: 1px solid #ddd;
                border-radius: 6px;
                cursor: pointer;
                transition: all 0.2s;
                user-select: none;
            }
            .wykop-emoji-nav button:hover {
                background: #e9ecef;
                border-color: #ccc;
            }

            .wykop-emoji-panel iframe {
                width: 100%;
                flex: 1; /* Zapełnia całą dostępną przestrzeń po odjęciu nawigacji */
                border: none;
                border-radius: 8px;
                background: #f8f9fa;
            }

            /* Wsparcie dla Dark Mode */
            @media (prefers-color-scheme: dark) {
                .wykop-emoji-trigger { background: #333; border-color: #555; color: #eee; }
                .wykop-emoji-trigger:hover { background: #444; }
                .wykop-emoji-panel { background: #2c2c2c; border-color: #444; }
                .wykop-emoji-nav button { background: #333; border-color: #555; color: #eee; }
                .wykop-emoji-nav button:hover { background: #444; }
                .wykop-emoji-panel iframe { background: #333; }
            }
            [data-theme="dark"] .wykop-emoji-trigger { background: #333; border-color: #555; color: #eee; }
            [data-theme="dark"] .wykop-emoji-trigger:hover { background: #444; }
            [data-theme="dark"] .wykop-emoji-panel { background: #2c2c2c; border-color: #444; }
            [data-theme="dark"] .wykop-emoji-nav button { background: #333; border-color: #555; color: #eee; }
            [data-theme="dark"] .wykop-emoji-nav button:hover { background: #444; }
        `;
        document.head.appendChild(style);
    }

    /**
     * Zamyka panele i jednocześnie zapisuje ich ostatni rozmiar
     */
    function closeAllPanels() {
        document.querySelectorAll(".wykop-emoji-panel.visible").forEach(panel => {
            // Zapisywanie rozmiaru zdefiniowanego przez użytkownika do localStorage
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
            const visiblePanels = document.querySelectorAll(".wykop-emoji-panel.visible");

            visiblePanels.forEach(panel => {
                const triggerId = panel.dataset.triggerId;
                const trigger = document.getElementById(triggerId);

                if (!panel.contains(e.target) && e.target !== trigger) {
                    closeAllPanels();
                }
            });
        });
    }

    /**
     * Tworzy panel i aplikuje ew. zapisane rozmiary
     */
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

        // Ładowanie zapisanego rozmiaru (jeśli istnieje)
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

        const nav = document.createElement("div");
        nav.className = "wykop-emoji-nav";

        const backBtn = document.createElement("button");
        backBtn.textContent = "← Wstecz";
        backBtn.title = "Cofnij do poprzedniej kategorii";

        const homeBtn = document.createElement("button");
        homeBtn.textContent = "🏠︎ Główna";
        homeBtn.title = "Powrót na stronę główną EmojiDB";

        nav.appendChild(backBtn);
        nav.appendChild(homeBtn);
        panel.appendChild(nav);

        const iframe = document.createElement("iframe");
        iframe.src = CONFIG.emojiDbUrl;
        iframe.setAttribute("allow", "clipboard-write");
        panel.appendChild(iframe);

        triggerBtn.addEventListener("click", (e) => {
            e.stopPropagation();

            const isVisible = panel.classList.contains("visible");
            closeAllPanels();

            if (!isVisible) {
                const rect = triggerBtn.getBoundingClientRect();
                // Pobieramy aktualną szerokość panelu (ważne, gdy użytkownik go zmniejszył/zwiększył)
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
