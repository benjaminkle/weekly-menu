const API_URL =
  "https://script.google.com/macros/s/AKfycbwCshz8fdeA5lzHfHn2DoAnkZtsTHXA3tccTOjYzLizWcZsfruLK2vMC97UWGlxL5ar/exec";

let dishesCache = [];
let menu = [];

// === Fetch dishes from Google Sheets (optimized) ===
async function fetchDishes() {
  try {
    const res = await fetch(API_URL, { method: "GET" });
    const data = await res.json();

    // Assign stable IDs and sort once here
    dishesCache = data
      .map((d, i) => ({
        _id: i, // unique id for drag/drop
        title: d.title,
        ingredients: Array.isArray(d.ingredients) ? d.ingredients : [],
        category: d.category || "main",
      }))
      .sort((a, b) => a.title.localeCompare(b.title)); // pre-sort once

    renderDishBank();
  } catch (err) {
    console.error("❌ Error fetching dishes:", err);
  }
}

// === Add new dish (POST to Google Sheets) ===
async function addDish() {
  let title = document.getElementById("title").value.trim();
  let ingredients = document
    .getElementById("ingredients")
    .value.split(",")
    .map((i) => i.trim())
    .filter(Boolean);
  let category = document.getElementById("category").value;

  if (!title || ingredients.length === 0) {
    alert("Please enter a dish title and at least one ingredient.");
    return;
  }

  let newDish = { title, ingredients, category };
  dishesCache.push(newDish);
  renderDishBank();

  try {
    await fetch(API_URL, {
      method: "POST",
      mode: "no-cors",
      body: JSON.stringify(newDish),
      headers: { "Content-Type": "application/json" },
    });
    setTimeout(fetchDishes, 2000);
  } catch (err) {
    console.error("Error saving dish:", err);
  }

  document.getElementById("title").value = "";
  document.getElementById("ingredients").value = "";
}

// === Render Dish Bank (optimized) ===
function renderDishBank() {
  try {
    const query = (
      document.getElementById("searchBox")?.value || ""
    ).toLowerCase();

    ["main", "side", "snacks"].forEach((cat) => {
      const listDiv = document.getElementById(`${cat}-list`);
      if (!listDiv) return;

      // Clear only once
      listDiv.innerHTML = "";

      // Use DocumentFragment for performance
      const fragment = document.createDocumentFragment();

      dishesCache
        .filter(
          (d) => d.category === cat && d.title.toLowerCase().includes(query)
        )
        .forEach((d) => {
          const div = document.createElement("div");
          div.className = "card";
          div.draggable = true;
          div.dataset.idx = d._id; // use stable id

          div.innerHTML = `<b>${d.title}</b><br><small>${d.ingredients.join(
            ", "
          )}</small>`;

          // Click → add to menu
          div.addEventListener("click", () => addToMenu(d));
          // Drag support
          div.addEventListener("dragstart", (e) => {
            e.dataTransfer.setData("idx", String(d._id));
          });

          fragment.appendChild(div);
        });

      listDiv.appendChild(fragment);
    });
  } catch (err) {
    console.error("❌ Error rendering Dish Bank:", err, dishesCache);
  }
}

// === Drop zone setup ===
const menuZone = document.getElementById("weeklyMenu");
menuZone.addEventListener("dragover", (e) => e.preventDefault());
menuZone.addEventListener("drop", (e) => {
  e.preventDefault();
  const idx = parseInt(e.dataTransfer.getData("idx"), 10);
  const dish = dishesCache[idx];
  if (dish) addToMenu(dish);
});

// === Add dish to Weekly Menu ===
function addToMenu(dish) {
  const existing = menu.find((m) => m.title === dish.title);
  if (existing) {
    existing.quantity += 1;
  } else {
    menu.push({ ...dish, quantity: 1 });
  }
  renderWeeklyMenu();
}

// === Render Weekly Menu with quantity controls ===
function renderWeeklyMenu() {
  const menuDiv = document.getElementById("weeklyMenu");
  menuDiv.innerHTML = "";
  menu.forEach((d, idx) => {
    const div = document.createElement("div");
    div.className = "card weekly-card";

    div.innerHTML = `
      <b>${d.title}</b>
      <div class="quantity-controls">
        <button class="btn-qty" data-idx="${idx}" data-action="dec">-</button>
        <span>${d.quantity}</span>
        <button class="btn-qty" data-idx="${idx}" data-action="inc">+</button>
        <button class="btn-red removeBtn" data-idx="${idx}">Remove</button>
      </div>
    `;

    menuDiv.appendChild(div);
  });

  // Quantity buttons
  document.querySelectorAll(".btn-qty").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const idx = parseInt(e.target.dataset.idx, 10);
      const action = e.target.dataset.action;
      if (action === "inc") menu[idx].quantity += 1;
      if (action === "dec" && menu[idx].quantity > 1) menu[idx].quantity -= 1;
      renderWeeklyMenu();
    });
  });

  // Remove buttons
  document.querySelectorAll(".removeBtn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const i = parseInt(e.target.dataset.idx, 10);
      menu.splice(i, 1);
      renderWeeklyMenu();
    });
  });
}

// === Extract grocery list (dedupe + counts with quantities) ===
function extractList() {
  const items = menu.flatMap((d) =>
    Array(d.quantity)
      .fill(null)
      .flatMap(() => d.ingredients.map((i) => i.trim()))
  );

  const counts = {};
  items.forEach((i) => {
    const key = i.toLowerCase();
    counts[key] = (counts[key] || 0) + 1;
  });

  const unique = Object.keys(counts)
    .map((k) => {
      const formatted = k.charAt(0).toUpperCase() + k.slice(1);
      return counts[k] > 1 ? `${formatted} (${counts[k]})` : formatted;
    })
    .sort((a, b) => a.localeCompare(b));

  const list = unique.join("\n");
  navigator.clipboard.writeText(list);
  alert("Grocery list copied:\n\n" + list);
}

// === Collapsible headers ===
document.querySelectorAll(".section-header").forEach((header) => {
  header.addEventListener("click", () => {
    const targetId = header.dataset.target;
    const list = document.getElementById(targetId);
    if (!list) return;
    list.style.display = list.style.display === "none" ? "block" : "none";
    header.textContent = header.textContent.includes("⯆")
      ? header.textContent.replace("⯆", "⯈")
      : header.textContent.replace("⯈", "⯆");
  });
});

// === Event listeners ===
document.getElementById("saveBtn").addEventListener("click", addDish);
document.getElementById("extractBtn").addEventListener("click", extractList);

const searchBox = document.getElementById("searchBox");
if (searchBox) searchBox.addEventListener("input", renderDishBank);

// === Initial load ===
fetchDishes();
