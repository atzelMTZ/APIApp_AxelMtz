/* =========================================================
   Crypt Cinema - Horror movies and characters
   API used (free, no API key, CORS enabled):
   Wikipedia
     - Action API  -> movie search (poster + synopsis)
     - REST API    -> summary of each character
   ========================================================= */

const WIKI_API = "https://en.wikipedia.org/w/api.php";
const WIKI_SUMMARY = "https://en.wikipedia.org/api/rest_v1/page/summary/";

// Sidebar subgenres: [label, search term]
const MOVIE_TOPICS = [
  ["🔪 Slashers", "slasher"],
  ["👻 Ghosts", "ghost haunting"],
  ["🧟 Zombies", "zombie"],
  ["🧛 Vampires", "vampire"],
  ["😈 Possessions", "exorcism possession"],
  ["🐺 Werewolves", "werewolf"],
  ["🎞️ Classics", "classic"],
];

// Characters: [name, Wikipedia article, pose (CSS animation), emoji, scare word]
const CHARACTERS = [
  ["Freddy Krueger", "Freddy_Krueger", "slash", "🩸", "SLASH!"],
  ["Jason Voorhees", "Jason_Voorhees", "lunge", "🪓", "RAAAH!"],
  ["Michael Myers", "Michael_Myers_(Halloween)", "stalk", "🔪", "BEHIND YOU!"],
  ["Ghostface", "Ghostface_(Scream)", "scream", "😱", "AAAAH!"],
  ["Pennywise", "Pennywise_the_Dancing_Clown", "balloon", "🎈", "BOO!"],
  ["Chucky", "Chucky_(Child's_Play)", "stab", "🔪", "HA HA HA!"],
  ["Leatherface", "Leatherface", "chainsaw", "🪚", "BRRRM!"],
  ["Pinhead", "Pinhead_(Hellraiser)", "stare", "⛓️", "CHAINS!"],
  ["Dracula", "Count_Dracula", "bite", "🦇", "BITE!"],
  ["Frankenstein", "Frankenstein's_monster", "shock", "⚡", "BZZZT!"],
  ["Samara Morgan", "Samara_Morgan", "glitch", "📺", "ZZZZZ!"],
  ["Jigsaw", "Jigsaw_(Saw_character)", "stare", "🧩", "PLAY!"],
  ["Xenomorph", "Xenomorph", "lunge", "🧪", "SSSKRRR!"],
  ["Norman Bates", "Norman_Bates", "stab", "🚿", "ARGH!"],
  ["Hannibal Lecter", "Hannibal_Lecter", "stare", "🍷", "MMM...!"],
  ["Candyman", "Candyman_(character)", "chainsaw", "🐝", "BZZZZ!"],
];

let view = "movies";      // current view: movies | characters
let characterData = [];   // characters already downloaded (cache)

const $ = (id) => document.getElementById(id);

/* ---------- Utilities ---------- */
// Fallback image (pumpkin) when an image is missing or fails to load
const PLACEHOLDER = "data:image/svg+xml;utf8," + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="600"><rect width="100%" height="100%" fill="#241c22"/><text x="50%" y="50%" font-size="120" text-anchor="middle" dominant-baseline="middle">🎃</text></svg>'
);
const imgOnError = "this.onerror=null;this.src=PLACEHOLDER;";
function setStatus(text, isError = false) {
  $("status").textContent = text;
  $("status").classList.toggle("error", isError);
}

function markActive(btn) {
  document.querySelectorAll(".sidebar button").forEach((b) => b.classList.remove("active"));
  btn.classList.add("active");
}

/* ---------- Sidebar ---------- */
function buildSidebar() {
  const nav = $("topics");
  nav.innerHTML = "";

  if (view === "movies") {
    $("sidebarTitle").textContent = "Subgenres";
    MOVIE_TOPICS.forEach(([label, term]) => {
      const b = document.createElement("button");
      b.textContent = label;
      b.onclick = () => {
        $("searchInput").value = "";
        searchMovies(term, label.replace(/^\S+\s/, ""));
        markActive(b);
      };
      nav.appendChild(b);
    });
  } else {
    $("sidebarTitle").textContent = "Jump to character";
    CHARACTERS.forEach(([name]) => {
      const b = document.createElement("button");
      b.textContent = name;
      b.onclick = () => {
        $("searchInput").value = name;
        filterCharacters(name);
        markActive(b);
      };
      nav.appendChild(b);
    });
  }
}

/* ---------- MOVIES (Wikipedia Action API) ---------- */
async function searchMovies(term, title) {
  $("title").textContent = title ? `Horror: ${title}` : `Results for "${term}"`;
  $("grid").innerHTML = "";
  setStatus("Summoning movies...");

  try {
    // Search horror film articles that match the term
    const query = /horror/i.test(term) ? `${term} film` : `${term} horror film`;
    const params = new URLSearchParams({
      action: "query",
      generator: "search",
      gsrsearch: query,
      gsrnamespace: "0",
      gsrlimit: "20",
      prop: "pageimages|extracts|info|description",
      piprop: "thumbnail",
      pilicense: "any", // includes posters (fair-use images)
      pithumbsize: "400",
      exintro: "1",
      explaintext: "1",
      exlimit: "max",
      inprop: "url",
      format: "json",
      origin: "*", // enables CORS
    });

    const res = await fetch(`${WIKI_API}?${params}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();

    const pages = json.query ? Object.values(json.query.pages) : [];
    pages.sort((a, b) => a.index - b.index); // keep relevance order

    // Only articles about a film; prefer the ones with a poster
    const films = pages.filter((p) => /\b(film|movie)\b/i.test((p.description || "") + " " + (p.extract || "")));
    const withPoster = films.filter((p) => p.thumbnail);
    const movies = withPoster.length ? withPoster : films;

    if (movies.length === 0) {
      setStatus("No movies found. Try another search.");
      return;
    }

    setStatus(`${movies.length} movies found`);
    movies.forEach(renderMovieCard);
  } catch (err) {
    console.error(err);
    setStatus(`Error connecting to the API: ${err.message}`, true);
  }
}

function renderMovieCard(m) {
  const poster = m.thumbnail ? m.thumbnail.source : PLACEHOLDER;
  const card = document.createElement("article");
  card.className = "card";
  card.innerHTML = `
    <img loading="lazy" src="${poster}" alt="Poster of ${m.title}" onerror="${imgOnError}">
    <div class="info">
      <h4>${m.title}</h4>
      <p>${m.description || "Horror movie"}</p>
    </div>`;
  card.onclick = () => openMovieModal(m);
  $("grid").appendChild(card);
}

function openMovieModal(m) {
  const poster = m.thumbnail ? m.thumbnail.source : PLACEHOLDER;
  $("modalBox").innerHTML = `
    <img src="${poster}" alt="Poster of ${m.title}" onerror="${imgOnError}">
    <div class="modal-info">
      <h2>${m.title}</h2>
      <p><span class="badge">${m.description || "Horror movie"}</span></p>
      <p>${m.extract || "No synopsis available."}</p>
      <p><a href="${m.fullurl}" target="_blank" rel="noopener">Read more on Wikipedia</a></p>
      <button class="btn" onclick="closeModal()">Close</button>
    </div>`;
  $("modal").classList.add("open");
}

/* ---------- CHARACTERS (Wikipedia REST API) ---------- */
// Gets a page summary. Throws if the page is missing or is a disambiguation page.
async function fetchSummary(page) {
  const res = await fetch(WIKI_SUMMARY + encodeURIComponent(page));
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  if (data.type === "disambiguation") throw new Error("Disambiguation page");
  return data;
}

// Plan B: search Wikipedia for the character and use the best match
async function fetchCharacter(name, page) {
  try {
    return await fetchSummary(page);
  } catch (firstError) {
    console.warn(`"${name}" failed with "${page}" (${firstError.message}). Trying search...`);
    const params = new URLSearchParams({
      action: "query", list: "search", srsearch: `${name} horror film character`,
      srlimit: "1", format: "json", origin: "*",
    });
    const res = await fetch(`${WIKI_API}?${params}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    const best = json.query && json.query.search[0];
    if (!best) throw new Error("No search results");
    return await fetchSummary(best.title.replace(/ /g, "_"));
  }
}
// If the summary has no image, try (1) the article's main image including
// fair-use images, then (2) a free photo from Wikimedia Commons.
async function ensureImage(data, name) {
  if (data.thumbnail) return data;

  try {
    // Fallback 1: main image of the article (includes non-free images)
    const p1 = new URLSearchParams({
      action: "query", titles: data.title, prop: "pageimages", piprop: "thumbnail",
      pithumbsize: "500", pilicense: "any", format: "json", origin: "*",
    });
    const r1 = await (await fetch(`${WIKI_API}?${p1}`)).json();
    const page1 = r1.query && Object.values(r1.query.pages)[0];
    if (page1 && page1.thumbnail) {
      data.thumbnail = { source: page1.thumbnail.source };
      return data;
    }

    // Fallback 2: free image from Wikimedia Commons
    const p2 = new URLSearchParams({
      action: "query", generator: "search", gsrsearch: `${name} costume`,
      gsrnamespace: "6", gsrlimit: "1", prop: "imageinfo", iiprop: "url",
      iiurlwidth: "500", format: "json", origin: "*",
    });
    const r2 = await (await fetch(`https://commons.wikimedia.org/w/api.php?${p2}`)).json();
    const page2 = r2.query && Object.values(r2.query.pages)[0];
    const info = page2 && page2.imageinfo && page2.imageinfo[0];
    if (info && info.thumburl) data.thumbnail = { source: info.thumburl };
  } catch (err) {
    console.warn(`No fallback image for ${name}:`, err.message);
  }
  return data;
}

async function loadCharacters() {
  $("title").textContent = "Horror characters";
  $("grid").innerHTML = "";

  if (characterData.length) {
    renderCharacters(characterData);
    return;
  }

  setStatus("Waking up the monsters...");
  try {
    // Request all characters in parallel
    const results = await Promise.allSettled(
      CHARACTERS.map(async ([name, page, pose, fx, word]) => {
        const data = await ensureImage(await fetchCharacter(name, page), name);
        return { name, pose, fx, word, ...data };
      })
    );

    results.forEach((r, i) => {
      if (r.status === "rejected") console.error(`Could not load ${CHARACTERS[i][0]}:`, r.reason);
    });
    characterData = results.filter((r) => r.status === "fulfilled").map((r) => r.value);

    if (characterData.length === 0) throw new Error("Could not load any character");
    renderCharacters(characterData);
  } catch (err) {
    console.error(err);
    setStatus(`Error connecting to the Wikipedia API: ${err.message}`, true);
  }
}

function renderCharacters(list) {
  $("grid").innerHTML = "";
  if (list.length === 0) {
    setStatus("No character matches your search.");
    return;
  }
  setStatus(`${list.length} characters`);
  list.forEach((c) => {
    const card = document.createElement("article");
    card.className = "card";
    const photo = c.thumbnail ? c.thumbnail.source : PLACEHOLDER;
    card.className = `card pose-${c.pose}`;
    card.innerHTML = `
      <div class="pic">
        <img loading="lazy" src="${photo}" alt="${c.name}" onerror="${imgOnError}">
        <span class="fx">${c.fx}</span>
        <span class="word">${c.word}</span>
      </div>
      <div class="info"><h4>${c.name}</h4><p>${c.description || "Horror character"}</p></div>`;
    card.onclick = () => openCharacterModal(c);
    $("grid").appendChild(card);
  });
}

function filterCharacters(text) {
  const q = text.trim().toLowerCase();
  const filtered = characterData.filter(
    (c) => c.name.toLowerCase().includes(q) || (c.extract || "").toLowerCase().includes(q)
  );
  renderCharacters(filtered);
}

function openCharacterModal(c) {
  const photo = c.originalimage ? c.originalimage.source : (c.thumbnail ? c.thumbnail.source : PLACEHOLDER);
  const link = c.content_urls ? c.content_urls.desktop.page : "#";
  $("modalBox").innerHTML = `
    <img src="${photo}" alt="${c.name}" onerror="${imgOnError}">
    <div class="modal-info">
      <h2>${c.name}</h2>
      <p><span class="badge">${c.description || "Horror character"}</span></p>
      <p>${c.extract || "No description available."}</p>
      <p><a href="${link}" target="_blank" rel="noopener">Read more on Wikipedia</a></p>
      <button class="btn" onclick="closeModal()">Close</button>
    </div>`;
  $("modal").classList.add("open");
}

/* ---------- Tab switching ---------- */
document.querySelectorAll(".tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach((t) => t.classList.remove("active"));
    tab.classList.add("active");
    view = tab.dataset.view;
    $("searchInput").value = "";
    $("searchInput").placeholder = view === "movies" ? "Search movie..." : "Filter character...";
    buildSidebar();
    if (view === "movies") searchMovies("horror", "Horror movies");
    else loadCharacters();
  });
});

/* ---------- Search from the navbar ---------- */
$("searchForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const q = $("searchInput").value.trim();
  if (!q) return;
  if (view === "movies") searchMovies(q);
  else filterCharacters(q);
});

/* ---------- Modal ---------- */
function closeModal() {
  $("modal").classList.remove("open");
}
$("modal").addEventListener("click", (e) => { if (e.target.id === "modal") closeModal(); });
document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeModal(); });

/* ---------- Start ---------- */
buildSidebar();
searchMovies("horror", "Horror movies");
