document.addEventListener("DOMContentLoaded", () => {
  const contenuto = document.getElementById("contenuto");
  const player = document.getElementById("playerArea");

  const homeBtn = document.getElementById("tab-home");
  const localiBtn = document.getElementById("tab-locali");
  const prefBtn = document.getElementById("tab-preferiti");
  const infoBtn = document.getElementById("tab-info");

  const EMAIL = "ottone_mamba4i@icloud.com";

  async function loadJSON(path) {
    const r = await fetch(path, { cache: "no-store" });
    if (!r.ok) throw new Error(path);
    return r.json();
  }

  // Preferiti (salvati sul dispositivo: tu hai i tuoi, tuo padre i suoi)
  function getPreferiti() {
    try {
      return JSON.parse(localStorage.getItem("preferiti") || "[]");
    } catch {
      return [];
    }
  }

  function savePreferiti(list) {
    localStorage.setItem("preferiti", JSON.stringify(list));
  }

  function isPreferito(name) {
    return getPreferiti().includes(name);
  }

  function togglePreferito(name) {
    const list = getPreferiti();
    const i = list.indexOf(name);
    if (i >= 0) list.splice(i, 1);
    else list.push(name);
    savePreferiti(list);
  }

  function scrollPlayerTop() {
    player.scrollIntoView({ behavior: "smooth", block: "start" });
    player.focus?.();
  }

  // Prova a creare una lista di URL alternativi se presenti nel JSON
  function getCandidateUrls(channel) {
    const urls = [];
    if (channel.url) urls.push(channel.url);
    if (channel.fallback && channel.fallback.url) urls.push(channel.fallback.url);
    if (channel.geoblock && channel.geoblock.url) urls.push(channel.geoblock.url);
    if (Array.isArray(channel.hbbtv)) {
      for (const h of channel.hbbtv) {
        if (h && h.url) urls.push(h.url);
      }
    }
    // rimuovi duplicati
    return [...new Set(urls)];
  }

  // Player interno (non sempre funziona su iPhone, ma lo lasciamo)
  function playInPage(url, channel) {
    player.innerHTML = `
      <h2>Player: ${channel.name}</h2>
      <p>LCN ${channel.lcn || "-"} • ${channel.type || ""}</p>
      <video controls autoplay playsinline style="width:100%;max-height:45vh;background:#000">
        <source src="${url}">
      </video>
      <p>
        <button id="btn-open">Apri streaming in nuova scheda</button>
        <button id="btn-pref">${isPreferito(channel.name) ? "Rimuovi dai preferiti" : "Aggiungi ai preferiti"}</button>
      </p>
      <p id="note"></p>
    `;

    document.getElementById("btn-open")?.addEventListener("click", () => {
      window.open(url, "_blank", "noopener");
    });

    document.getElementById("btn-pref")?.addEventListener("click", () => {
      togglePreferito(channel.name);
      document.getElementById("btn-pref").textContent =
        isPreferito(channel.name) ? "Rimuovi dai preferiti" : "Aggiungi ai preferiti";
    });

    scrollPlayerTop();
  }

  // ✅ Riproduzione “robusta” per iPhone:
  // - appena premi Riproduci: apre subito una nuova scheda con lo stream (così parte)
  // - e prova anche nel player della pagina
  window.playAndOpen = function (encoded) {
    const channel = JSON.parse(decodeURIComponent(encoded));
    const urls = getCandidateUrls(channel);

    if (!urls.length) return;

    // 1) Apri SUBITO in nuova scheda (massima compatibilità iPhone)
    window.open(urls[0], "_blank", "noopener");

    // 2) Prova anche in pagina (se funziona, bene; se no, hai già la scheda)
    playInPage(urls[0], channel);

    // Se non parte, tenta gli altri URL nel player interno (non apre altre schede)
    let idx = 1;
    const video = player.querySelector("video");
    const note = document.getElementById("note");

    if (video) {
      const tryNext = () => {
        if (idx >= urls.length) return;
        const nextUrl = urls[idx++];
        if (note) note.textContent = "Provo un link alternativo…";
        video.src = nextUrl;
        video.load();
        video.play().catch(() => {});
      };

      // se errore, prova il prossimo
      video.addEventListener("error", () => tryNext());

      // se dopo 3 secondi non è partito, prova il prossimo
      setTimeout(() => {
        // se è ancora a 0 e non sta suonando
        if (video.currentTime === 0 && video.paused) {
          tryNext();
        }
      }, 3000);
    }
  };

  function renderChannels(channels) {
    contenuto.innerHTML =
      "<ul>" +
      channels
        .map((c) => {
          const safe = encodeURIComponent(JSON.stringify(c));
          return `<li style="margin-bottom:10px">
            <strong>${c.lcn || ""}</strong> ${c.name}
            <button onclick='playAndOpen("${safe}")'>Riproduci</button>
            <button onclick='(function(){ 
              const n=${JSON.stringify(c.name)};
              const p=JSON.parse(localStorage.getItem("preferiti")||"[]");
              const i=p.indexOf(n);
              if(i>=0){p.splice(i,1)} else {p.push(n)}
              localStorage.setItem("preferiti", JSON.stringify(p));
              alert((i>=0) ? "Rimosso dai preferiti" : "Aggiunto ai preferiti");
            })()'>Preferito</button>
          </li>`;
        })
        .join("") +
      "</ul>";
  }

  function home() {
    contenuto.innerHTML = "<h2>Nazionali</h2><p>Caricamento…</p>";
    loadJSON("data/nazionali.json")
      .then((d) => {
        contenuto.innerHTML = "<h2>Nazionali</h2>";
        renderChannels(d.channels);
      })
      .catch(() => {
        contenuto.innerHTML = "<p>Errore nel caricamento dei nazionali</p>";
      });
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

    contenuto.innerHTML =
      "<h2>Locali</h2>" +
      "<p>Apri una regione per vedere i canali.</p>" +
      "<ul>" +
      regioni.map((r) => `<li><button data-r="${r}">${r}</button></li>`).join("") +
      "</ul>" +
      "<div id='loc'></div>";

    document.querySelectorAll("button[data-r]").forEach((b) => {
      b.onclick = async () => {
        const box = document.getElementById("loc");
        if (box) box.innerHTML = "<p>Caricamento…</p>";
        try {
          const d = await caricaRegione(b.dataset.r);
          if (box) box.innerHTML = `<h3>${b.dataset.r}</h3>`;
          renderChannels(d.channels);
        } catch {
          if (box) box.innerHTML = "<p>Regione non trovata</p>";
        }
      };
    });
  }

  function preferiti() {
    const p = getPreferiti();
    contenuto.innerHTML =
      "<h2>Preferiti</h2>" +
      (p.length
        ? "<ul>" + p.map((x) => `<li>${x}</li>`).join("") + "</ul>"
        : "<p>Nessun preferito</p>");
  }

  function info() {
    contenuto.innerHTML = `
      <h2>Info</h2>
      <p><strong>Creata da:</strong> Pepitos</p>
      <p><a href="mailto:${EMAIL}?subject=Segnalazione%20TV%20Accessibile">Segnala un errore</a></p>
    `;
  }

  homeBtn.onclick = home;
  localiBtn.onclick = locali;
  prefBtn.onclick = preferiti;
  infoBtn.onclick = info;

  // avvio
  home();
});
