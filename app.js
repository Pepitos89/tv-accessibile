document.addEventListener("DOMContentLoaded", () => {
  const contenuto = document.getElementById("contenuto");
  const playerArea = document.getElementById("playerArea");

  const tabHome = document.getElementById("tab-home");
  const tabPreferiti = document.getElementById("tab-preferiti");
  const tabLocali = document.getElementById("tab-locali");
  const tabInfo = document.getElementById("tab-info");

  const EMAIL = "ottone_mamba4i@icloud.com";
  const PREF_KEY = "tvAccessibile_preferiti_v1";

  let currentList = [];

  /* ---------- UTILS ---------- */
  function isIOS() {
    return /iPhone|iPad|iPod/i.test(navigator.userAgent);
  }

  function escapeHtml(s) {
    return String(s ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  }

  async function loadJSON(path) {
    const r = await fetch(path, { cache: "no-store" });
    if (!r.ok) throw new Error(path);
    return r.json();
  }

  function focusPlayer() {
    playerArea.setAttribute("tabindex", "-1");
    playerArea.focus();
    playerArea.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  /* ---------- PREFERITI ---------- */
  function getPreferiti() {
    try {
      return JSON.parse(localStorage.getItem(PREF_KEY) || "[]");
    } catch {
      return [];
    }
  }

  function savePreferiti(list) {
    localStorage.setItem(PREF_KEY, JSON.stringify(list));
  }

  function channelId(ch) {
    return (ch.type || "t") + "|" + (ch.url || ch.name || "");
  }

  function isPref(ch) {
    return getPreferiti().some(x => x.id === channelId(ch));
  }

  function togglePref(ch) {
    const id = channelId(ch);
    const list = getPreferiti();
    const i = list.findIndex(x => x.id === id);
    if (i >= 0) list.splice(i, 1);
    else list.push({ id, name: ch.name, lcn: ch.lcn ?? null });
    savePreferiti(list);
  }

  /* ---------- STREAM URLS ---------- */
  function collectUrls(ch) {
    const out = [];
    const push = (u) => { if (u && typeof u === "string" && !out.includes(u)) out.push(u); };

    push(ch.url);
    if (ch.fallback?.url) push(ch.fallback.url);
    if (ch.geoblock?.url) push(ch.geoblock.url);
    if (Array.isArray(ch.hbbtv)) {
      for (const h of ch.hbbtv) if (h?.url) push(h.url);
    }
    return out;
  }

  /* ---------- PLAYER ---------- */
  function setPlayer(ch, url, note = "") {
    const prefLabel = isPref(ch) ? "Rimuovi dai preferiti" : "Aggiungi ai preferiti";

    playerArea.innerHTML = `
      <h2>Player: ${escapeHtml(ch.name)}</h2>
      <p>${escapeHtml(ch.lcn ? "LCN " + ch.lcn : "")}</p>

      <video id="videoPlayer" controls playsinline style="width:100%;max-height:45vh;background:#000"></video>

      <div style="margin-top:8px">
        <button id="btn-open">Apri streaming</button>
        <button id="btn-pref">${prefLabel}</button>
      </div>

      <p id="note">${escapeHtml(note)}</p>
    `;

    const video = document.getElementById("videoPlayer");
    video.src = url;
    video.autoplay = true;
    video.play().catch(() => {});

    document.getElementById("btn-open").onclick = () => {
      // apertura MANUALE, decisa dall’utente
      window.location.href = url;
    };

    document.getElementById("btn-pref").onclick = () => {
      togglePref(ch);
      document.getElementById("btn-pref").textContent =
        isPref(ch) ? "Rimuovi dai preferiti" : "Aggiungi ai preferiti";
    };

    focusPlayer();
  }

  /* ---------- RENDER LISTE ---------- */
  function renderChannels(channels, titolo) {
    currentList = channels;

    contenuto.innerHTML = `
      <h2>${escapeHtml(titolo)}</h2>
      <ul>
        ${channels.map((ch, i) => `
          <li style="margin-bottom:10px">
            <strong>${escapeHtml((ch.lcn ? ch.lcn + " " : "") + ch.name)}</strong>
            <button data-play="${i}">Riproduci</button>
            <button data-pref="${i}">Preferito</button>
          </li>
        `).join("")}
      </ul>
    `;

    contenuto.querySelectorAll("button[data-play]").forEach(btn => {
      btn.onclick = () => {
        const ch = currentList[Number(btn.dataset.play)];
        const urls = collectUrls(ch);
        if (!urls.length) return;

        setPlayer(
          ch,
          urls[0],
          isIOS()
            ? "Su Safari alcuni canali potrebbero non partire: usa 'Apri streaming'."
            : ""
        );
      };
    });

    contenuto.querySelectorAll("button[data-pref]").forEach(btn => {
      btn.onclick = () => {
        const ch = currentList[Number(btn.dataset.pref)];
        togglePref(ch);
      };
    });
  }

  /* ---------- SEZIONI ---------- */
  async function mostraHome() {
    playerArea.innerHTML = `<h2>Player</h2><p>Nessun canale selezionato.</p>`;
    contenuto.innerHTML = `<p>Caricamento…</p>`;
    const d = await loadJSON("data/nazionali.json");
    renderChannels(d.channels, "Nazionali");
  }

  async function caricaRegione(id) {
    try {
      return await loadJSON("locali/" + id + ".json");
    } catch {
      return await loadJSON("data/regioni/" + id + ".json");
    }
  }

  function mostraLocali() {
    const regioni = [
      "abruzzo","basilicata","calabria","campania","emilia-romagna",
      "friuli-venezia-giulia","lazio","liguria","lombardia","marche",
      "molise","piemonte","puglia","sardegna","sicilia","toscana",
      "trentino-alto-adige","umbria","valle-daosta","veneto"
    ];

    contenuto.innerHTML = `
      <h2>Locali</h2>
      <ul>
        ${regioni.map(r => `<li><button data-r="${r}">${r}</button></li>`).join("")}
      </ul>
      <div id="loc"></div>
    `;

    document.querySelectorAll("button[data-r]").forEach(b => {
      b.onclick = async () => {
        const d = await caricaRegione(b.dataset.r);
        renderChannels(d.channels, b.dataset.r);
      };
    });
  }

  function mostraPreferiti() {
    const p = getPreferiti();
    contenuto.innerHTML =
      "<h2>Preferiti</h2>" +
      (p.length ? "<ul>" + p.map(x => `<li>${escapeHtml(x.name)}</li>`).join("") + "</ul>"
                : "<p>Nessun preferito</p>");
  }

  function mostraInfo() {
    contenuto.innerHTML = `
      <h2>Info</h2>
      <p><strong>Creata da:</strong> Pepitos</p>
      <p><a href="mailto:${EMAIL}?subject=Segnalazione%20TV%20Accessibile">Segnala un errore</a></p>
    `;
  }

  tabHome.onclick = mostraHome;
  tabLocali.onclick = mostraLocali;
  tabPreferiti.onclick = mostraPreferiti;
  tabInfo.onclick = mostraInfo;

  mostraHome();
});
