document.addEventListener("DOMContentLoaded", () => {
  const contenuto = document.getElementById("contenuto");
  const playerArea = document.getElementById("playerArea");

  const tabHome = document.getElementById("tab-home");
  const tabLocali = document.getElementById("tab-locali");
  const tabPreferiti = document.getElementById("tab-preferiti");
  const tabInfo = document.getElementById("tab-info");

  const EMAIL = "ottone_mamba4i@icloud.com";
  const PREF_KEY = "tvAccessibile_preferiti_v1";

  let currentChannels = [];

  async function loadJSON(path) {
    const r = await fetch(path, { cache: "no-store" });
    if (!r.ok) throw new Error(path);
    return r.json();
  }

  function escapeHtml(s) {
    return String(s ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  }

  /* ===================== Preferiti ===================== */
  function getPrefs() {
    try { return JSON.parse(localStorage.getItem(PREF_KEY) || "[]"); }
    catch { return []; }
  }
  function savePrefs(p) {
    localStorage.setItem(PREF_KEY, JSON.stringify(p));
  }
  function togglePref(ch) {
    const p = getPrefs();
    const i = p.findIndex(x => x.name === ch.name);
    if (i >= 0) p.splice(i, 1);
    else p.push({ name: ch.name, lcn: ch.lcn ?? null });
    savePrefs(p);
  }
  function isPref(ch) {
    return getPrefs().some(x => x.name === ch.name);
  }

  /* ===================== URL candidates ===================== */
  function collectUrls(ch) {
    const urls = [];
    const add = (u) => {
      if (u && typeof u === "string" && !urls.includes(u)) urls.push(u);
    };

    const name = (ch.name || "").toLowerCase();
    const isRai = name.startsWith("rai ") || name.includes("rai 1") || name.includes("rai 2") || name.includes("rai 3") || name.includes("rai");

    // Rai: prima alternative, poi principale
    if (isRai) {
      if (ch.fallback?.url) add(ch.fallback.url);
      if (Array.isArray(ch.hbbtv)) ch.hbbtv.forEach(h => add(h.url));
      add(ch.url);
      if (ch.geoblock?.url) add(ch.geoblock.url);
      return urls;
    }

    // Altri: principale -> fallback -> geoblock -> hbbtv
    add(ch.url);
    if (ch.fallback?.url) add(ch.fallback.url);
    if (ch.geoblock?.url) add(ch.geoblock.url);
    if (Array.isArray(ch.hbbtv)) ch.hbbtv.forEach(h => add(h.url));
    return urls;
  }

  /* ===================== Player: tentativi automatici ===================== */
  async function tryPlayUrls(video, urls, onStatus) {
    // Safari iOS è “capriccioso”: serve timeout + eventi
    for (let i = 0; i < urls.length; i++) {
      const url = urls[i];
      onStatus(`Tentativo ${i + 1} di ${urls.length}…`);

      const ok = await playOnce(video, url);
      if (ok) {
        onStatus("▶️ Riproduzione avviata");
        return url;
      }
    }
    onStatus("❌ Non riesco a far partire questo canale nel player. Usa 'Apri streaming'.");
    return null;
  }

  function playOnce(video, url) {
    return new Promise((resolve) => {
      let done = false;

      const finish = (ok) => {
        if (done) return;
        done = true;
        cleanup();
        resolve(ok);
      };

      const onPlaying = () => finish(true);
      const onError = () => finish(false);
      const onStalled = () => finish(false);
      const onAbort = () => finish(false);

      const cleanup = () => {
        video.removeEventListener("playing", onPlaying);
        video.removeEventListener("error", onError);
        video.removeEventListener("stalled", onStalled);
        video.removeEventListener("abort", onAbort);
      };

      video.addEventListener("playing", onPlaying, { once: true });
      video.addEventListener("error", onError, { once: true });
      video.addEventListener("stalled", onStalled, { once: true });
      video.addEventListener("abort", onAbort, { once: true });

      // timeout: se non parte entro 4s, consideriamo fallito
      const t = setTimeout(() => finish(false), 4000);

      // se finisce prima, annulla timeout
      const oldFinish = finish;
      finish = (ok) => {
        clearTimeout(t);
        oldFinish(ok);
      };

      // forza reset prima di cambiare source
      try {
        video.pause();
      } catch {}
      video.removeAttribute("src");
      video.load();

      // set nuovo url
      video.src = url;
      video.load();
      video.play().catch(() => {
        // se play() viene bloccato, aspettiamo comunque timeout/eventi
      });
    });
  }

  async function playChannel(ch) {
    window.scrollTo({ top: 0, behavior: "smooth" });

    const urls = collectUrls(ch);

    playerArea.innerHTML = `
      <h2>Player: ${escapeHtml(ch.name)}</h2>
      <p>${escapeHtml((ch.lcn ? "LCN " + ch.lcn : "") + (ch.type ? " • " + ch.type : ""))}</p>

      <video id="v" controls autoplay playsinline style="width:100%;max-height:45vh;background:#000"></video>

      <p style="margin-top:8px">
        <button id="btn-open">Apri streaming</button>
        <button id="btn-pref">${isPref(ch) ? "Rimuovi dai preferiti" : "Aggiungi ai preferiti"}</button>
      </p>

      <p id="status">Avvio…</p>
    `;

    const video = document.getElementById("v");
    const status = document.getElementById("status");
    const btnOpen = document.getElementById("btn-open");
    const btnPref = document.getElementById("btn-pref");

    const setStatus = (t) => { status.textContent = t; };

    // Apri streaming: NON apriamo l’m3u8 diretto (download). Apriamo play.html
    btnOpen.onclick = () => {
      const u = encodeURIComponent(urls[0] || "");
      const n = encodeURIComponent(ch.name || "");
      window.location.href = `play.html?u=${u}&name=${n}`;
    };

    btnPref.onclick = () => {
      togglePref(ch);
      btnPref.textContent = isPref(ch) ? "Rimuovi dai preferiti" : "Aggiungi ai preferiti";
    };

    // tentativi automatici nel player interno
    await tryPlayUrls(video, urls, setStatus);
  }

  /* ===================== Render liste ===================== */
  function renderChannels(list, title) {
    currentChannels = list;

    contenuto.innerHTML = `
      <h2>${escapeHtml(title)}</h2>
      <ul>
        ${list.map((ch, i) => `
          <li style="margin-bottom:10px">
            <strong>${escapeHtml((ch.lcn ? ch.lcn + " " : "") + ch.name)}</strong>
            <button data-play="${i}">Riproduci</button>
            <button data-pref="${i}">Preferito</button>
          </li>
        `).join("")}
      </ul>
    `;

    contenuto.querySelectorAll("button[data-play]").forEach(b => {
      b.onclick = () => playChannel(currentChannels[Number(b.dataset.play)]);
    });

    contenuto.querySelectorAll("button[data-pref]").forEach(b => {
      b.onclick = () => togglePref(currentChannels[Number(b.dataset.pref)]);
    });
  }

  /* ===================== Sezioni ===================== */
  async function home() {
    playerArea.innerHTML = `<h2>Player</h2><p>Nessun canale selezionato.</p>`;
    contenuto.innerHTML = `<h2>Nazionali</h2><p>Caricamento…</p>`;
    try {
      const d = await loadJSON("data/nazionali.json");
      renderChannels(d.channels, "Nazionali");
    } catch {
      contenuto.innerHTML = `<p>Errore nel caricamento di data/nazionali.json</p>`;
    }
  }

  async function caricaRegione(id) {
    try {
      return await loadJSON("locali/" + id + ".json");
    } catch {
      return await loadJSON("data/regioni/" + id + ".json");
    }
  }

  function locali() {
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
        const box = document.getElementById("loc");
        box.innerHTML = "<p>Caricamento…</p>";
        try {
          const d = await caricaRegione(b.dataset.r);
          box.innerHTML = `<h3>${escapeHtml(b.dataset.r)}</h3>`;
          renderChannels(d.channels, b.dataset.r);
        } catch {
          box.innerHTML = "<p>Regione non trovata</p>";
        }
      };
    });
  }

  function preferiti() {
    const p = getPrefs();
    contenuto.innerHTML =
      "<h2>Preferiti</h2>" +
      (p.length
        ? "<ul>" + p.map(x => `<li>${escapeHtml(x.lcn ? x.lcn + " " : "")}${escapeHtml(x.name)}</li>`).join("") + "</ul>"
        : "<p>Nessun preferito</p>");
  }

  function info() {
    contenuto.innerHTML = `
      <h2>Info</h2>
      <p><strong>Creata da:</strong> Pepitos</p>
      <p><a href="mailto:${EMAIL}?subject=Segnalazione%20TV%20Accessibile">Segnala un errore</a></p>
    `;
  }

  tabHome.onclick = home;
  tabLocali.onclick = locali;
  tabPreferiti.onclick = preferiti;
  tabInfo.onclick = info;

  home();
});
