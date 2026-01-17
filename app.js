document.addEventListener("DOMContentLoaded",()=>{
const c=document.getElementById("contenuto");
const p=document.getElementById("playerArea");
const homeBtn=document.getElementById("tab-home");
const locBtn=document.getElementById("tab-locali");
const prefBtn=document.getElementById("tab-preferiti");
const infoBtn=document.getElementById("tab-info");

async function loadJSON(path){
  const r=await fetch(path);
  if(!r.ok) throw new Error(path);
  return r.json();
}

function home(){
  c.innerHTML="<h2>Nazionali</h2><p>Caricamento...</p>";
  loadJSON("data/nazionali.json").then(d=>{
    c.innerHTML="<h2>Nazionali</h2><ul>"+
      d.channels.map(x=>`<li>${x.lcn||""} ${x.name}</li>`).join("")+
      "</ul>";
  }).catch(()=>c.innerHTML="<p>Errore nazionali</p>");
}

async function caricaRegione(id){
  try{
    return await loadJSON("locali/"+id+".json");
  }catch{
    return await loadJSON("data/regioni/"+id+".json");
  }
}

function locali(){
  const regioni=["abruzzo","basilicata","calabria","campania","emilia-romagna","friuli-venezia-giulia","lazio","liguria","lombardia","marche","molise","piemonte","puglia","sardegna","sicilia","toscana","trentino-alto-adige","umbria","valle-daosta","veneto"];
  c.innerHTML="<h2>Locali</h2><ul>"+regioni.map(r=>`<li><button data-r="${r}">${r}</button></li>`).join("")+"</ul><div id='loc'></div>";
  document.querySelectorAll("button[data-r]").forEach(b=>{
    b.onclick=()=>{
      caricaRegione(b.dataset.r).then(d=>{
        document.getElementById("loc").innerHTML="<h3>"+b.dataset.r+"</h3><ul>"+
          d.channels.map(x=>`<li>${x.lcn||""} ${x.name}</li>`).join("")+
          "</ul>";
      }).catch(()=>{
        document.getElementById("loc").innerHTML="<p>Regione non trovata</p>";
      });
    };
  });
}

homeBtn.onclick=home;
locBtn.onclick=locali;
prefBtn.onclick=()=>c.innerHTML="<h2>Preferiti</h2>";
infoBtn.onclick=()=>c.innerHTML=`<h2>Info</h2>
<p><strong>Versione:</strong> 1.0</p>
<p><strong>Creata da:</strong> Pepitos</p>
<p><a href="mailto:ottone_mamba4i@icloud.com?subject=Segnalazione%20errore%20TV%20Accessibile">Segnala un errore</a></p>`;

home();
});