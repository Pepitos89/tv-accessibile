document.addEventListener("DOMContentLoaded", () => {

  const contenuto = document.getElementById("contenuto");
  const playerArea = document.getElementById("playerArea");

  const tabHome = document.getElementById("tab-home");
  const tabLocali = document.getElementById("tab-locali");
  const tabPreferiti = document.getElementById("tab-preferiti");
  const tabInfo = document.getElementById("tab-info");

  /* ===================== UTIL ===================== */

  async function loadJSON(path) {
    const r = await fetch(path, { cache: "no-store" });
    if (!r.ok) throw new Error(path);
    return r.json();
  }

  function scrollTop() {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  /* ===================== PLAYER ===================== */

  function collectUrls(ch) {
    const urls = [];
    const add = (u) => {
      if (u && typeof u === "string" && !urls.includes(u)) urls.push(u);
    };

    const isRai = (ch.name || "").toLowerCase().includes("rai");

    if (isRai) {
      if (ch.fallback?.url) add(ch.fallback.url);
      if (Array.isArray(ch.hbbtv)) ch.hbbtv.forEach(h => add(h.url));
      add(ch.url);
      if (ch.geoblock?.url) add(ch.geoblock.url);
      return urls;
    }

    add(ch.url);
    if (ch.fallback?.url) add(ch.fallback.url);
    if (ch.geoblock?.url) add(ch.geoblock.url);
    if (Array.isArray(ch.hbbtv)) ch.hbbtv.forEach(h => add(h.url));

    return urls;
  }

  function playChannel(ch) {
    scrollTop();

    const urls = collectUrls(ch);
    let index = 0;

    playerArea.innerHTML = `
      <h2>Player: ${ch.name}</h2>
      <p>LCN ${ch.lcn || ""} • ${ch.type || "stream"}</p>
      <video id="videoPlayer" controls playsinline style="width:100%;max-width:640px;"></video>
      <p>
        <button id="openTab">Apri streaming in nuova scheda</button>
        <button id="favBtn">Aggiungi ai preferiti</button>
      </p>
      <p id="playerStatus">Avvio stream…</p>
    `;

    const video = document.getElementById("videoPlayer");
    const status = document.getElementById("playerStatus");

    document.getElementById("openTab").onclick = () => {
      window.open(urls[0], "_blank");
    };

    document.getElementById("favBtn").onclick = () => addPreferito(ch);

    function tryNext() {
      if (index >= urls.length) {
        status.textContent = "❌ Stream non disponibile in questo browser.";
        return;
      }
      const url = urls[index++];
      video.src = url;
      video.load();

      video.play().then(() => {
        status.textContent = "▶️ Riproduzione avviata";
      }).catch(() => {
        setTimeout(tryNext, 600);
      });
    }

    tryNext();
  }

  /* ===================== LISTE ===================== */

  function listaCanali(canali) {
    return `
      <ul>
        ${canali.map(ch => `
          <li>
            ${ch.lcn || ""} ${ch.name}
            <button onclick='window.__play(${JSON.stringify(ch)})'>Riproduci</button>
            <button onclick='window.__fav(${JSON.stringify(ch)})'>Preferito</button>
          </li>
        `).join("")}
      </ul>
    `;
  }

  /* ===================== HOME ===================== */

  function home() {
    contenuto.innerHTML = "<h2>Nazionali</h2><p>Caricamento…</p>";
    loadJSON("data/nazionali.json").then(d => {
      contenuto.innerHTML =
        "<h2>Nazionali</h2>" +
        listaCanali(d.channels);
    }).catch(() => {
      contenuto.innerHTML = "<p>Errore nel caricamento dei nazionali</p>";
    });
  }

  /* ===================== LOCALI ===================== */

  const regioni = [
    "abruzzo","basilicata","calabria","campania","emilia-romagna",
    "friuli-venezia-giulia","lazio","liguria","lombardia","marche",
    "molise","piemonte","puglia","sardegna","sicilia","toscana",
    "trentino-alto-adige","umbria","valle-daosta","veneto"
  ];

  async function caricaRegione(id) {
    try {
      return await loadJSON("locali/" + id + ".json");
    } catch {
      return await loadJSON("data/regioni/" + id + ".json");
    }
  }

  function locali() {
    contenuto.innerHTML = `
      <h2>Locali</h2>
      <p>Apri una regione per vedere i canali</p>
      <ul>
        ${regioni.map(r => `<li><button data-r="${r}">${r}</button></li>`).join("")}
      </ul>
      <div id="regioneCanali"></div>
    `;

    document.querySelectorAll("button[data-r]").forEach(b => {
      b.onclick = async () => {
        const box = document.getElementById("regioneCanali");
        box.innerHTML = "<p>Caricamento…</p>";
        try {
          const d = await caricaRegione(b.dataset.r);
          box.innerHTML =
            `<h3>${b.dataset.r}</h3>` +
            listaCanali(d.channels);
        } catch {
          box.innerHTML = "<p>Regione non trovata</p>";
        }
      };
    });
  }

  /* ===================== PREFERITI ===================== */

  function getPreferiti() {
    return JSON.parse(localStorage.getItem("preferiti") || "[]");
  }

  function addPreferito(ch) {
    const p = getPreferiti();
    if (!p.find(x => x.name === ch.name)) {
      p.push(ch);
      localStorage.setItem("preferiti", JSON.stringify(p));
      alert("Aggiunto ai preferiti");
    }
  }

  function preferiti() {
    const p = getPreferiti();
    contenuto.innerHTML =
      "<h2>Preferiti</h2>" +
      (p.length ? listaCanali(p) : "<p>Nessun preferito</p>");
  }

  /* ===================== INFO ===================== */

  function info() {
    contenuto.innerHTML = `
      <h2>Info</h2>
      <p><strong>TV Accessibile</strong></p>
      <p>Creata da Pepitos</p>
      <p>
        <a href="mailto:ottone_mamba4i@icloud.com?subject=Segnalazione%20errore%20TV%20Accessibile">
          Segnala un errore
        </a>
      </p>
    `;
  }

  /* ===================== GLOBALI ===================== */

  window.__play = playChannel;
  window.__fav = addPreferito;

  tabHome.onclick = home;
  tabLocali.onclick = locali;
  tabPreferiti.onclick = preferiti;
  tabInfo.onclick = info;

  home();
});
