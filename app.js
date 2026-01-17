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

  /* ---------- UTILS ---------- */
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

  function collectUrls(ch) {
    const out = [];
    const add = u => { if (u && !out.includes(u)) out.push(u); };

    add(ch.url);
    if (ch.fallback?.url) add(ch.fallback.url);
    if (ch.geoblock?.url) add(ch.geoblock.url);
    if (Array.isArray(ch.hbbtv)) {
      ch.hbbtv.forEach(h => add(h.url));
    }
    return out;
  }

  /* ---------- PREFERITI ---------- */
  function getPrefs() {
    try { return JSON.parse(localStorage.getItem(PREF_KEY) || "[]"); }
    catch { return []; }
  }

  function savePrefs(p) {
    localStorage.setItem(PREF_KEY, JSON.stringify(p));
  }

  function isPref(ch) {
    return getPrefs().includes(ch.name);
  }

  function togglePref(ch) {
    const p = getPrefs();
    const i = p.indexOf(ch.name);
    if (i >= 0) p.splice(i, 1);
    else p.push(ch.name);
    savePrefs(p);
  }

  /* ---------- PLAYER ---------- */
  function setPlayer(ch, url) {
    playerArea.innerHTML = `
      <h2>Player: ${escapeHtml(ch.name)}</h2>
      <p>${ch.lcn ? "LCN " + ch.lcn : ""}</p>

      <video controls autoplay playsinline style="width:100%;max-height:45vh;background:#000">
        <source src="${url}">
      </video>

      <p>
        <button id="btn-open">Apri streaming</button>
        <button id="btn-pref">${isPref(ch) ? "Rimuovi dai preferiti" : "Aggiungi ai preferiti"}</button>
      </p>
    `;

    document.getElementById("btn-open").onclick = () => {
      const u = encodeURIComponent(url);
      const n = encodeURIComponent(ch.name);
      window.location.href = `play.html?u=${u}&name=${n}`;
    };

    document.getElementById("btn-pref").onclick = () => {
      togglePref(ch);
      setPlayer(ch, url);
    };

    playerArea.scrollIntoView({ behavior: "smooth" });
  }

  /* ---------- RENDER ---------- */
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
      b.onclick = () => {
        const ch = currentChannels[b.dataset.play];
        const urls = collectUrls(ch);
        if (urls.length) setPlayer(ch, urls[0]);
      };
    });

    contenuto.querySelectorAll("button[data-pref]").forEach(b => {
      b.onclick = () => {
        togglePref(currentChannels[b.dataset.pref]);
      };
    });
  }

  /* ---------- SEZIONI ---------- */
  async function home() {
    const d = await loadJSON("data/nazionali.json");
    renderChannels(d.channels, "Nazionali");
  }

  async function locali() {
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
    `;

    contenuto.querySelectorAll("button[data-r]").forEach(b => {
      b.onclick = async () => {
        const d = await loadJSON("data/regioni/" + b.dataset.r + ".json");
        renderChannels(d.channels, b.dataset.r);
      };
    });
  }

  function preferiti() {
    const p = getPrefs();
    contenuto.innerHTML =
      "<h2>Preferiti</h2>" +
      (p.length ? "<ul>" + p.map(x => `<li>${escapeHtml(x)}</li>`).join("") + "</ul>"
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
