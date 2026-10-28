"use strict";

const $ = (selector, scope = document) => scope.querySelector(selector);
const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];
const money = new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 });

const navToggle = $(".nav-toggle");
const navigation = $(".site-nav");
function closeNavigation() {
  navToggle.setAttribute("aria-expanded", "false");
  navToggle.setAttribute("aria-label", "Открыть меню");
  navigation.classList.remove("is-open");
}
navToggle.addEventListener("click", () => {
  const open = navToggle.getAttribute("aria-expanded") !== "true";
  navToggle.setAttribute("aria-expanded", String(open));
  navToggle.setAttribute("aria-label", open ? "Закрыть меню" : "Открыть меню");
  navigation.classList.toggle("is-open", open);
});
navigation.addEventListener("click", (event) => { if (event.target.closest("a")) closeNavigation(); });
document.addEventListener("click", (event) => { if (!event.target.closest(".site-header")) closeNavigation(); });
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && navToggle.getAttribute("aria-expanded") === "true") { closeNavigation(); navToggle.focus(); }
});

const gallery = $$("[data-gallery-index]").map(button => ({ src: $("img", button).getAttribute("src"), alt: $("img", button).alt }));
const originalMenus = [
  { src: "assets/menu-original-01.jpg", alt: "Оригинал основного меню Madame Zhu" },
  { src: "assets/menu-original-02.jpg", alt: "Оригинал меню завтраков и напитков Madame Zhu" },
];
const imageDialog = $("#image-dialog");
let viewerItems = gallery;
let viewerIndex = 0;
let viewerOpener = null;
let viewerTitle = "Атмосфера Madame Zhu";
function renderViewer() {
  const item = viewerItems[viewerIndex];
  imageDialog.classList.remove("is-zoomed");
  $("#dialog-zoom").setAttribute("aria-pressed", "false");
  $("#dialog-zoom").textContent = "Увеличить";
  $(".dialog-image-scroll").scrollTop = 0;
  $(".dialog-image-scroll").scrollLeft = 0;
  $("#dialog-image").src = item.src;
  $("#dialog-image").alt = item.alt;
  $("#dialog-original").href = item.src;
  $("#dialog-title").textContent = viewerTitle;
  $("#dialog-caption").textContent = `${item.alt} · ${viewerIndex + 1} / ${viewerItems.length}`;
}
function openViewer(items, index, opener, title) {
  viewerItems = items; viewerIndex = index; viewerOpener = opener; viewerTitle = title;
  imageDialog.classList.toggle("is-menu-viewer", items === originalMenus);
  renderViewer(); imageDialog.showModal(); document.body.classList.add("dialog-open");
  $(".dialog-close").focus();
}
function moveViewer(offset) { viewerIndex = (viewerIndex + offset + viewerItems.length) % viewerItems.length; renderViewer(); }
$$("[data-gallery-index]").forEach(button => button.addEventListener("click", () => openViewer(gallery, Number(button.dataset.galleryIndex), button, "Атмосфера Madame Zhu")));
["#view-original-menu", "#fallback-original-menu"].forEach(selector => $(selector).addEventListener("click", (event) => openViewer(originalMenus, 0, event.currentTarget, "Оригинал меню Madame Zhu")));
$(".dialog-close").addEventListener("click", () => imageDialog.close());
$(".gallery-prev").addEventListener("click", () => moveViewer(-1));
$(".gallery-next").addEventListener("click", () => moveViewer(1));
$("#dialog-zoom").addEventListener("click", () => {
  const zoomed = imageDialog.classList.toggle("is-zoomed");
  $("#dialog-zoom").setAttribute("aria-pressed", String(zoomed));
  $("#dialog-zoom").textContent = zoomed ? "Уменьшить" : "Увеличить";
});
imageDialog.addEventListener("click", (event) => {
  if (event.target !== imageDialog) return;
  const rect = imageDialog.getBoundingClientRect();
  if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) imageDialog.close();
});
imageDialog.addEventListener("keydown", (event) => {
  if (imageDialog.classList.contains("is-zoomed")) return;
  if (event.key === "ArrowLeft") { event.preventDefault(); moveViewer(-1); }
  if (event.key === "ArrowRight") { event.preventDefault(); moveViewer(1); }
});
imageDialog.addEventListener("close", () => { document.body.classList.remove("dialog-open"); viewerOpener?.focus({ preventScroll: true }); });

const searchInput = $("#menu-search");
const clearSearch = $("#clear-search");
const categoryList = $("#category-list");
const menuContent = $("#menu-content");
const menuStatus = $("#menu-status");
const menuState = { group: "main", category: "all", query: "", data: null };
const normalise = text => text.toLocaleLowerCase("ru-RU").replaceAll("ё", "е").replaceAll(/\s+/g, " ").trim();

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}
function renderCategories() {
  categoryList.replaceChildren();
  const choices = [{ id: "all", label: "Все разделы" }, ...menuState.data.categories.filter(category => category.group === menuState.group)];
  choices.forEach(category => {
    const button = element("button", "category-chip", category.label);
    button.type = "button"; button.dataset.category = category.id;
    button.setAttribute("aria-pressed", String(menuState.category === category.id));
    button.addEventListener("click", () => {
      menuState.category = category.id;
      $$(".category-chip").forEach(chip => chip.setAttribute("aria-pressed", String(chip.dataset.category === category.id)));
      renderMenu();
    });
    categoryList.append(button);
  });
}
function dishNode(item) {
  const dish = element("article", "dish");
  dish.dataset.dishId = item.id;
  const media = element("div", "dish-media");
  if (item.image) {
    const image = element("img", "dish-image");
    image.src = item.image;
    image.alt = item.name;
    image.loading = "lazy";
    image.decoding = "async";
    image.width = 600;
    image.height = 450;
    image.addEventListener("error", () => image.remove(), { once: true });
    media.append(image);
  } else {
    media.setAttribute("aria-hidden", "true");
  }
  dish.append(media);
  if (item.imageIsExample) {
    const caption = element("p", "dish-example-note", "изображение является примером взятого из интернета");
    dish.append(caption);
  }
  const body = element("div", "dish-body");
  const heading = element("div", "dish-heading");
  const longPriceNote = item.priceNote && item.priceNote.length > 18;
  heading.append(element("h4", "", item.name));
  body.append(heading);
  if (item.description) body.append(element("p", "dish-description", item.description));
  if (item.portion) body.append(element("span", "dish-portion", item.portion));
  const footer = element("div", "dish-footer");
  footer.append(element("span", longPriceNote ? "dish-price dish-price-note" : "dish-price", item.priceNote || `${money.format(item.price)} ₽`));
  body.append(footer);
  dish.append(body);
  return dish;
}
function renderMenu() {
  if (!menuState.data) return;
  const scheduleNote = $("#menu-schedule-note");
  scheduleNote.hidden = menuState.group !== "breakfast";
  scheduleNote.textContent = menuState.data.schedules?.filterCoffee || "";
  const terms = normalise(menuState.query).split(" ").filter(Boolean);
  const selected = menuState.data.categories.filter(category => category.group === menuState.group && (menuState.category === "all" || category.id === menuState.category));
  const fragment = document.createDocumentFragment();
  let count = 0;
  selected.forEach(category => {
    const items = category.items.filter(item => {
      const haystack = normalise(`${item.name} ${item.description || ""}`);
      return terms.every(term => haystack.includes(term));
    });
    if (!items.length) return;
    count += items.length;
    const section = element("section", "menu-category");
    const title = element("h3", "", category.label);
    title.id = `category-${category.id}`; section.setAttribute("aria-labelledby", title.id);
    section.append(title);
    if (category.note) section.append(element("p", "category-note", category.note));
    const grid = element("div", "dish-grid");
    items.forEach(item => grid.append(dishNode(item)));
    section.append(grid); fragment.append(section);
  });
  menuContent.replaceChildren(fragment);
  $("#empty-state").hidden = count !== 0;
  clearSearch.hidden = !menuState.query;
  menuStatus.textContent = terms.length ? `Найдено позиций: ${count}. Поиск в выбранном виде меню.` : `Позиций в выбранном меню: ${count}`;
}
function selectGroup(group) {
  menuState.group = group; menuState.category = "all";
  $$(".group-tab").forEach(button => {
    const selected = button.dataset.group === group;
    button.setAttribute("aria-selected", String(selected)); button.tabIndex = selected ? 0 : -1;
    if (selected) menuContent.setAttribute("aria-labelledby", button.id);
  });
  if (menuState.data) { renderCategories(); renderMenu(); }
}
$$(".group-tab").forEach(button => {
  button.addEventListener("click", () => selectGroup(button.dataset.group));
  button.addEventListener("keydown", (event) => {
    const tabs = $$(".group-tab"); let index = tabs.indexOf(button);
    if (event.key === "ArrowRight") index = (index + 1) % tabs.length;
    else if (event.key === "ArrowLeft") index = (index - 1 + tabs.length) % tabs.length;
    else if (event.key === "Home") index = 0;
    else if (event.key === "End") index = tabs.length - 1;
    else return;
    event.preventDefault(); tabs[index].focus(); selectGroup(tabs[index].dataset.group);
  });
});
searchInput.addEventListener("input", () => { menuState.query = searchInput.value; renderMenu(); });
clearSearch.addEventListener("click", () => { searchInput.value = ""; menuState.query = ""; renderMenu(); searchInput.focus(); });
$("#reset-menu").addEventListener("click", () => { searchInput.value = ""; menuState.query = ""; menuState.category = "all"; renderCategories(); renderMenu(); searchInput.focus(); });

async function loadMenu() {
  try {
    const response = await fetch("data/menu.json");
    if (!response.ok) throw new Error("Menu unavailable");
    const data = await response.json();
    if (!Array.isArray(data.categories) || !data.categories.length || data.categories.some(category => !Array.isArray(category.items))) throw new Error("Invalid menu data");
    menuState.data = data; renderCategories(); renderMenu();
  } catch {
    menuStatus.textContent = "";
    $("#menu-unavailable").hidden = false;
    $(".menu-group-tabs").hidden = true;
    searchInput.disabled = true;
  }
}
loadMenu();
