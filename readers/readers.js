const $ = sel => document.querySelector(sel);
const params = new URLSearchParams(location.search);
const bookId = (params.get("book") || "").trim();

// toggle theme using app.js
$("#toggle")?.addEventListener("click", () => {
  if (typeof toggleTheme === "function") toggleTheme();
});

const state = { meta: null, index: 0 };

async function loadBook(id) {
  if (!id) throw new Error("No book id provided. Example: reader.html?book=echoes-of-broken-vows");
  const url = `books/${id}/book.json`;
  const resp = await fetch(url, { cache: "no-store" });
  if (resp.ok) return await resp.json();
  // fallback: open static page
  location.href = `books/${id}/index.html`;
  throw new Error("Redirecting...");
}

function renderHeader(meta) {
  $("#book-title").innerHTML = `<strong>${meta.title}</strong> <small>by ${meta.author || "Unknown"}</small>`;
  $("#book-cover").src = meta.cover || "assets/covers/placeholder.jpg";
  $("#book-cover").alt = meta.title + " cover";
  $("#book-blurb").textContent = meta.blurb || "";
}

function renderTOC(meta) {
  const toc = $("#toc");
  toc.innerHTML = "";
  meta.chapters.forEach((ch, i) => {
    const a = document.createElement("a");
    a.href = `#c=${i+1}`;
    const free = i < (meta.freeUntil ?? 0);
    const unlocked = isUnlocked(meta.id, ch.id);
    a.textContent = `${ch.id}. ${ch.title}${free || unlocked ? "" : " 🔒"}`;
    a.addEventListener("click", (ev) => {
      ev.preventDefault();
      goTo(i);
    });
    toc.appendChild(a);
  });
}

function renderChapter(meta, idx) {
  const wrap = $("#content");
  const ch = meta.chapters[idx];
  wrap.innerHTML = "";
  const free = idx < (meta.freeUntil ?? 0);
  const unlocked = isUnlocked(meta.id, ch.id);

  const sec = document.createElement("section");
  sec.className = "chapter";
  sec.innerHTML = `
    <h2>${ch.id}. ${ch.title}</h2>
    ${free || unlocked
      ? `<div class="text">${paragraphize(ch.text)}</div>`
      : `
        <p class="meta"><em>This chapter is locked. Unlock with coins.</em></p>
        <button type="button" id="unlock-btn">Unlock (30 coins)</button>
      `
    }
  `;
  wrap.appendChild(sec);

  if (!free && !unlocked) {
    $("#unlock-btn")?.addEventListener("click", () => {
      const ok = unlockChapter(meta.id, ch.id, 30);
      if (ok) renderChapter(meta, idx);
    });
  }

  $("#prev").disabled = idx === 0;
  $("#next").disabled = idx === meta.chapters.length - 1;
}

function paragraphize(text) {
  return (text || "").trim().split(/\n{2,}/).map(p =>
    `<p>${p.replace(/\n/g, "<br>")}</p>`).join("\n");
}

function goTo(idx) {
  state.index = Math.max(0, Math.min(idx, state.meta.chapters.length - 1));
  renderChapter(state.meta, state.index);
  history.replaceState(null, "", `?book=${bookId}#c=${state.index+1}`);
}

function readHashIndex() {
  const m = (location.hash || "").match(/#c=(\d+)/);
  return m ? Math.max(1, parseInt(m[1], 10)) - 1 : 0;
}

async function main() {
  try {
    const meta = await loadBook(bookId);
    state.meta = meta;
    renderHeader(meta);
    renderTOC(meta);
    state.index = readHashIndex();
    goTo(state.index);
    $("#prev").addEventListener("click", () => goTo(state.index - 1));
    $("#next").addEventListener("click", () => goTo(state.index + 1));
  } catch (e) {
    console.error(e);
  }
}

document.addEventListener("DOMContentLoaded", main);    console.error(e);
  }
}

document.addEventListener("DOMContentLoaded", main);
