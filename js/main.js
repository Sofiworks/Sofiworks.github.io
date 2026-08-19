/* Pawlock site behavior: i18n, nav, reveal animations. No dependencies. */
(function () {
  "use strict";

  /* App Store URL: set this once the app is live, every download button updates.
     Until then the buttons scroll to the pricing section. */
  var APP_STORE_URL = "";
  if (APP_STORE_URL) {
    document.querySelectorAll(".store-link").forEach(function (a) {
      a.href = APP_STORE_URL;
      a.target = "_blank";
      a.rel = "noopener";
    });
  }

  /* ---------- Language ---------- */
  function detectLang() {
    var saved = null;
    try { saved = localStorage.getItem("pawlock-lang"); } catch (e) {}
    if (saved && LANGS.indexOf(saved) !== -1) return saved;
    var nav = (navigator.language || "en").slice(0, 2).toLowerCase();
    return LANGS.indexOf(nav) !== -1 ? nav : "en";
  }

  function applyLang(lang) {
    var dict = I18N[lang] || I18N.en;
    document.documentElement.lang = lang;
    document.querySelectorAll("[data-i18n]").forEach(function (el) {
      var key = el.getAttribute("data-i18n");
      if (dict[key] != null) el.textContent = dict[key];
    });
    document.querySelectorAll("[data-i18n-alt]").forEach(function (el) {
      var key = el.getAttribute("data-i18n-alt");
      if (dict[key] != null) el.alt = dict[key];
    });
    var meta = document.querySelector('meta[name="description"]');
    if (meta && dict["meta.description"]) meta.setAttribute("content", dict["meta.description"]);
    document.querySelectorAll(".lang-btn").forEach(function (b) {
      b.classList.toggle("active", b.getAttribute("data-lang") === lang);
      b.setAttribute("aria-pressed", b.getAttribute("data-lang") === lang ? "true" : "false");
    });
    /* Pages with full-block translations (privacy/terms). Blocks exist only
       for en/tr; every other language falls back to English. */
    var blocks = document.querySelectorAll("[data-lang-block]");
    if (blocks.length) {
      var available = Array.prototype.map.call(blocks, function (b) { return b.getAttribute("data-lang-block"); });
      var target = available.indexOf(lang) !== -1 ? lang : "en";
      blocks.forEach(function (block) {
        block.hidden = block.getAttribute("data-lang-block") !== target;
      });
    }
    try { localStorage.setItem("pawlock-lang", lang); } catch (e) {}
  }

  document.addEventListener("click", function (e) {
    var btn = e.target.closest(".lang-btn[data-lang]");
    if (btn) applyLang(btn.getAttribute("data-lang"));
  });

  /* Baked pages (/ and /tr/) ship their language in static HTML for SEO; the
     lang switch there is real links. Only JS-translate the shared pages
     (privacy/terms), and remember the baked page's language for them. */
  if (document.documentElement.hasAttribute("data-baked")) {
    try { localStorage.setItem("pawlock-lang", document.documentElement.lang); } catch (e) {}
  } else {
    applyLang(detectLang());
  }

  /* ---------- Missing image placeholders ---------- */
  window.imgFail = function (img) {
    var slot = img.closest(".slot");
    if (slot) slot.classList.add("missing");
    img.remove();
  };

  /* ---------- Mobile nav ---------- */
  var burger = document.querySelector(".nav-burger");
  var menu = document.querySelector(".nav-links");
  if (burger && menu) {
    burger.addEventListener("click", function () {
      var open = menu.classList.toggle("open");
      burger.setAttribute("aria-expanded", open ? "true" : "false");
      burger.classList.toggle("open", open);
    });
    menu.addEventListener("click", function (e) {
      if (e.target.closest("a")) {
        menu.classList.remove("open");
        burger.classList.remove("open");
        burger.setAttribute("aria-expanded", "false");
      }
    });
  }

  /* ---------- Sticky nav shadow ---------- */
  var nav = document.querySelector(".nav");
  if (nav) {
    var onScroll = function () { nav.classList.toggle("scrolled", window.scrollY > 8); };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  /* ---------- Reveal on scroll ---------- */
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var targets = document.querySelectorAll(".reveal");
  if (!reduced && "IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("in");
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });
    targets.forEach(function (t) { io.observe(t); });
  } else {
    targets.forEach(function (t) { t.classList.add("in"); });
  }

  /* ---------- Footer year ---------- */
  var year = document.getElementById("year");
  if (year) year.textContent = String(new Date().getFullYear());
})();
