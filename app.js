document.addEventListener("DOMContentLoaded", () => {
  const contenuto = document.getElementById("contenuto");
  const player = document.getElementById("playerArea");

  const homeBtn = document.getElementById("tab-home");
  const localiBtn = document.getElementById("tab-locali");
  const prefBtn = document.getElementById("tab-preferiti");
  const infoBtn = document.getElementById("tab-info");

  async function loadJSON(path) {
    const r = await fetch(path);
    if (!r.ok) throw new Error(path);
    return r.json();
  }

  function playChannel(channel) {
    player.innerHTML = `
      <h2>Player: ${channel.name}</h2>
      <video controls autoplay playsinline style="width:100%">
        <source src="${channel.url}">
      </video>
      <p>
        <button onclick="window.open('${channel.url}', '_blank')">
          Apri streaming in nuova scheda
        </button>
        <button onclick="addPref('${channel.name}')">
          Aggiungi ai preferiti
        </button>
      </p>
    `;
    player.scrollIntoView();
  }

  window.addPref = function (name) {
    const p = JSON.parse(localStorage.getItem("preferiti") || "[]");
    if (!p.includes(name)) {
      p.push(name);
      localStorage.setItem("preferiti", JSON.stringify(p));
      alert("Aggiunto ai preferiti");
    }
  };

  function renderChannels(channels) {
    contenuto.innerHTML =
      "<ul>" +
      channels
        .map(
          (c) =>
            `<li>
              ${c.lcn || ""} ${c.name}
              <button onclick='playChannel(${JSON.stringify(c)})'>Riproduci</button>
            </li>`
        )
        .join("") +
      "</ul>";
  }

  function home() {
    loadJSON("data/nazionali.json")
      .then((d) => {
        contenuto.innerHTML = "<h2>Nazionali</h2>";
        renderChannels(d.channels);
      })
      .catch(() => {
        contenuto.innerHTML = "<p>Errore nel caricamento dei nazionali</p>";
      });
  }

  function locali() {
    const regioni = [
      "abruzzo","basilicata","calabria","campania","emilia-romagna",
      "friuli-venezia-giulia","lazio","liguria","lombardia","marche",
      "molise","piemonte","puglia","sardegna","sicilia","toscana",
      "trentino-alto-adige","umbria","valle-daosta","veneto"
    ];

    contenuto.innerHTML =
      "<h2>Locali</h2><ul>" +
      regioni
        .map((r) => `<li><button data-r="${r}">${r}</button></li>`)
        .join("") +
      "</ul>";

    document.querySelectorAll("button[data-r]").forEach((b) => {
      b.onclick = async () => {
        try {
          const d = await loadJSON("locali/" + b.dataset.r + ".json");
          renderChannels(d.channels);
        } catch {
          const d = await loadJSON("data/regioni/" + b.dataset.r + ".json");
          renderChannels(d.channels);
        }
      };
    });
  }

  function preferiti() {
    const p = JSON.parse(localStorage.getItem("preferiti") || "[]");
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
      <p>
        <a href="mailto:ottone_mamba4i@icloud.com?subject=Segnalazione%20TV%20Accessibile">
          Segnala un errore
        </a>
      </p>
    `;
  }

  homeBtn.onclick = home;
  localiBtn.onclick = locali;
  prefBtn.onclick = preferiti;
  infoBtn.onclick = info;

  home();
});
