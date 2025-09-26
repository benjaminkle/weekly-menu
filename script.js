// ✅ Use your new Google Apps Script API URL
const API_URL =
  "https://script.google.com/macros/s/AKfycbzWpctMluC3K1Xv4LhUYD-8nit4D5Ch7NInDZ7lLNeU5U9bH_bEHRcIxgWuDBkBTzUa/exec";

let menu = [];

// === Fetch dishes from Google Sheets ===
async function fetchDishes() {
  try {
    let res = await fetch(API_URL);
    let data = await res.json();
    render(data);
  } catch (err) {
    console.error("Error fetching dishes:", err);
    alert("Could not load dishes. Check API_URL.");
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

  if (!title || ingredients.length === 0) {
    alert("Please enter a dish title and at least one ingredient.");
    return;
  }

  try {
    let res = await fetch(API_URL, {
      method: "POST",
      body: JSON.stringify({ title, ingredients }),
      headers: { "Content-Type": "application/json" },
    });

    let text = await res.text();
    console.log("API response:", text);

    document.getElementById("title").value = "";
    document.getElementById("ingredients").value = "";

    fetchDishes(); // reload from sheet
  } catch (err) {
    console.error("Error saving dish:", err);
    alert("Could not save dish. Check API_URL.");
  }
}

// === Render dishes and weekly menu ===
function render(dishes) {
  // Dish bank
  let bankDiv = document.getElementById("dishBank");
  bankDiv.innerHTML = "";
  dishes.forEach((d) => {
    let div = document.createElement("div");
    div.className = "card";
    div.innerHTML = `<b>${d.title}</b><br><small>${d.ingredients.join(
      ", "
    )}</small>`;
    div.onclick = () => addToMenu(d);
    bankDiv.appendChild(div);
  });

  // Weekly menu
  let menuDiv = document.getElementById("weeklyMenu");
  menuDiv.innerHTML = "";
  menu.forEach((d) => {
    let div = document.createElement("div");
    div.className = "card weekly-card";
    div.innerHTML = `<b>${d.title}</b>`;
    menuDiv.appendChild(div);
  });
}

// === Add dish to weekly menu (local only) ===
function addToMenu(dish) {
  if (!menu.find((m) => m.title === dish.title)) {
    menu.push(dish);
    render([]); // refresh menu
    fetchDishes(); // refresh bank
  }
}

// === Extract grocery list ===
function extractList() {
  let items = menu.flatMap((d) => d.ingredients);
  let unique = [...new Set(items)];
  let list = unique.join("\n");

  // Copy to clipboard
  navigator.clipboard.writeText(list);
  alert("Grocery list copied:\n\n" + list);
}

// === Attach event listeners ===
document.getElementById("saveBtn").addEventListener("click", addDish);
document.getElementById("extractBtn").addEventListener("click", extractList);

// === Initial load ===
fetchDishes();
