(function () {
  "use strict";

  var KEY = "ck_choice_v1";
  var REDIRECT_MS = 900;

  function qs(sel) { return document.querySelector(sel); }
  function bannerEl() { return qs("#ck-banner"); }
  function showBanner() { var b = bannerEl(); if (b) b.hidden = false; }
  function hideBanner() { var b = bannerEl(); if (b) b.hidden = true; }

  function isEnglishPage() {
    // 1) Por lang en <html lang="en">
    var lang = (document.documentElement && document.documentElement.lang) ? document.documentElement.lang : "";
    if (lang && lang.toLowerCase().indexOf("en") === 0) return true;

    // 2) Fallback por convención de URLs *_en.html
    var path = (window.location && window.location.pathname) ? window.location.pathname : "";
    return /_en\.html$/i.test(path);
  }

  function homeHref() {
    return isEnglishPage() ? "./index_en.html" : "./index.html";
  }

  function getChoice() {
    try { return localStorage.getItem(KEY); } catch (e) { return null; }
  }

  function setChoice(v) {
    try { localStorage.setItem(KEY, v); } catch (e) {}

    // Feedback + vuelta a inicio (si existe el mensaje en cookies.html)
    var note = document.getElementById("ck-note");
    if (note) {
      note.hidden = false;
      window.setTimeout(function () {
        window.location.href = homeHref();
      }, REDIRECT_MS);
    } else {
      // Si no hay nota (p.ej. desde banner en index), cerramos banner.
      hideBanner();
    }

    // Hook futuro (GA/GTM) SOLO si aceptan
    if (v === "accept" && typeof window.__ck_onAccept === "function") {
      window.__ck_onAccept();
    }
  }

  function clearChoice() {
    try { localStorage.removeItem(KEY); } catch (e) {}
  }

  // Click robusto: funciona aunque pulses en texto dentro del botón/enlace
  document.addEventListener("click", function (e) {
    var el = e.target && e.target.closest ? e.target.closest("[data-ck]") : null;
    if (!el) return;

    var v = el.getAttribute("data-ck");
    if (!v) return;

    e.preventDefault();

    if (v === "accept") setChoice("accept");
    if (v === "reject") setChoice("reject");
  });

  document.addEventListener("DOMContentLoaded", function () {
    // Reabrir banner desde cualquier sitio: index.html?cookies=1
    try {
      var params = new URLSearchParams(window.location.search);
      if (params.get("cookies") === "1") {
        clearChoice();
        showBanner();
        return;
      }
    } catch (e) {}

    // Init normal
    var choice = getChoice();
    if (!choice) {
      showBanner();
    } else {
      hideBanner();
      if (choice === "accept" && typeof window.__ck_onAccept === "function") {
        window.__ck_onAccept();
      }
    }
  });
})();