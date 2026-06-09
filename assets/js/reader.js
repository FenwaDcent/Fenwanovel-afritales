import { callApi, ApiError } from "./api.js";
import { setStatus, setBusy } from "./ui.js";

const listElement = document.getElementById("chapter-list");
const contentElement = document.getElementById("chapter-content");
const titleElement = document.getElementById("reader-book-title");
const authorElement = document.getElementById("reader-author");
let book;
let currentIndex = 0;

function sanitiseChapterHtml(html) {
  const parsed = new DOMParser().parseFromString(html, "text/html");
  parsed.querySelectorAll("script, style, iframe, object, embed, form, link, meta").forEach((node) => node.remove());
  const allowed = new Set(["H2", "H3", "P", "BLOCKQUOTE", "EM", "STRONG", "B", "I", "UL", "OL", "LI", "BR", "HR"]);

  [...parsed.body.querySelectorAll("*")].forEach((element) => {
    if (!allowed.has(element.tagName)) {
      element.replaceWith(...element.childNodes);
      return;
    }
    [...element.attributes].forEach((attribute) => element.removeAttribute(attribute.name));
  });
  return parsed.body.innerHTML;
}

function chapterFromLocation() {
  const hash = window.location.hash.replace(/^#/, "");
  if (!hash) return 0;
  const index = book.chapters.findIndex((chapter) => chapter.id === hash);
  return index >= 0 ? index : 0;
}

function renderChapterList() {
  listElement.innerHTML = "";
  book.chapters.forEach((chapter, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "chapter-link";
    button.dataset.index = String(index);

    const number = document.createElement("span");
    number.textContent = String(chapter.number);
    const details = document.createElement("span");
    details.textContent = String(chapter.title || `Chapter ${chapter.number}`);
    const access = document.createElement("small");
    access.textContent = chapter.access === "free" ? "Free" : `${chapter.cost || 0} coins`;
    details.append(access);
    button.append(number, details);

    button.addEventListener("click", () => showChapter(index, true));
    listElement.append(button);
  });
}

function updateSelectedChapter() {
  listElement.querySelectorAll(".chapter-link").forEach((button, index) => {
    const selected = index === currentIndex;
    button.classList.toggle("is-active", selected);
    if (selected) button.setAttribute("aria-current", "page");
    else button.removeAttribute("aria-current");
  });
}

async function fetchFreeChapter(chapter) {
  const response = await fetch(chapter.source, { cache: "no-store" });
  if (!response.ok) throw new Error(`Chapter file returned HTTP ${response.status}.`);
  return response.text();
}

async function fetchProtectedChapter(chapter) {
  const result = await callApi("getChapter", {
    body: { bookSlug: book.slug, chapterId: chapter.id }
  });
  if (!result.html) throw new Error("The chapter response was empty.");
  return result.html;
}

function renderReaderControls(chapter) {
  const controls = document.createElement("nav");
  controls.className = "reader-controls";
  controls.setAttribute("aria-label", "Chapter navigation");

  const previous = document.createElement("button");
  previous.type = "button";
  previous.className = "button secondary";
  previous.textContent = "Previous chapter";
  previous.disabled = currentIndex === 0;
  previous.addEventListener("click", () => showChapter(currentIndex - 1, true));

  const next = document.createElement("button");
  next.type = "button";
  next.className = "button primary";
  next.textContent = "Next chapter";
  next.disabled = currentIndex === book.chapters.length - 1;
  next.addEventListener("click", () => showChapter(currentIndex + 1, true));

  controls.append(previous, next);
  contentElement.append(controls);
}

function renderLockedChapter(chapter, error) {
  contentElement.innerHTML = "";
  const panel = document.createElement("section");
  panel.className = "locked-panel";
  const heading = document.createElement("h2");
  heading.textContent = chapter.title;
  const message = document.createElement("p");
  message.textContent = error.status === 401
    ? "Log in to unlock this chapter."
    : `This chapter costs ${chapter.cost || 0} coins.`;
  const button = document.createElement("button");
  button.type = "button";
  button.className = "button primary";
  button.textContent = error.status === 401 ? "Log in" : "Unlock chapter";
  button.addEventListener("click", async () => {
    if (error.status === 401) {
      const login = new URL("../../login.html", document.baseURI);
      login.searchParams.set("next", window.location.href);
      window.location.assign(login.href);
      return;
    }
    setBusy(button, true, "Unlocking...");
    try {
      await callApi("unlockChapter", {
        body: { bookSlug: book.slug, chapterId: chapter.id }
      });
      await showChapter(currentIndex, false);
    } catch (unlockError) {
      message.textContent = unlockError.message;
      setBusy(button, false);
    }
  });
  panel.append(heading, message, button);
  contentElement.append(panel);
}

async function showChapter(index, updateHistory) {
  if (index < 0 || index >= book.chapters.length) return;
  currentIndex = index;
  const chapter = book.chapters[index];
  updateSelectedChapter();
  contentElement.innerHTML = '<div class="reader-loading" role="status">Loading chapter...</div>';

  if (updateHistory) {
    window.history.pushState({ chapter: chapter.id }, "", `#${chapter.id}`);
  }

  try {
    const html = chapter.access === "free"
      ? await fetchFreeChapter(chapter)
      : await fetchProtectedChapter(chapter);
    contentElement.innerHTML = sanitiseChapterHtml(html);
    renderReaderControls(chapter);
    contentElement.focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: "smooth" });
  } catch (error) {
    if (chapter.access !== "free" && error instanceof ApiError && [401, 402, 403].includes(error.status)) {
      renderLockedChapter(chapter, error);
      return;
    }
    contentElement.innerHTML = "";
    const status = document.createElement("p");
    status.className = "status";
    setStatus(status, `This chapter could not be loaded. ${error.message}`, "error");
    contentElement.append(status);
  }
}

async function initialiseReader() {
  try {
    const response = await fetch("book.json", { cache: "no-store" });
    if (!response.ok) throw new Error(`book.json returned HTTP ${response.status}.`);
    book = await response.json();
    if (!book || !Array.isArray(book.chapters) || book.chapters.length === 0) {
      throw new Error("The book metadata does not contain chapters.");
    }
    titleElement.textContent = book.title;
    authorElement.textContent = book.author;
    document.title = `${book.title} | Fenwanovels`;
    renderChapterList();
    await showChapter(chapterFromLocation(), false);
  } catch (error) {
    contentElement.innerHTML = "";
    const status = document.createElement("p");
    status.className = "status";
    setStatus(status, `The book could not be opened. ${error.message}`, "error");
    contentElement.append(status);
  }
}

window.addEventListener("popstate", () => {
  if (book) showChapter(chapterFromLocation(), false);
});

initialiseReader();
