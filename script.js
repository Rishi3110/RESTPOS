// ---------- Data ----------
const STORAGE_KEY = "simple-pos";

let data = load() || {
  categories: ["Starters", "Main Course", "Drinks"],
  items: [
    { id: 1, name: "Paneer Tikka", price: 220, category: "Starters" },
    { id: 2, name: "Veg Spring Roll", price: 160, category: "Starters" },
    { id: 3, name: "Dal Makhani", price: 200, category: "Main Course" },
    { id: 4, name: "Butter Naan", price: 50, category: "Main Course" },
    { id: 5, name: "Cold Coffee", price: 120, category: "Drinks" },
    { id: 6, name: "Lime Soda", price: 70, category: "Drinks" },
  ],
  orders: [],       // { id, no, lines: [{ itemId, name, price, qty }] }
  nextOrderNo: 1,
  nextId: 7,
};

// Billed orders are kept here (also saved in localStorage)
data.history = data.history || [];   // { no, lines, total, paidAt }

let activeOrderId = null;
let activeCategory = "All";

function load() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)); } catch { return null; }
}
function save() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch {}
}

const $ = (id) => document.getElementById(id);
const money = (n) => "₹" + n.toFixed(2);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const orderTotal = (o) => o.lines.reduce((sum, l) => sum + l.price * l.qty, 0);
const getOrder = () => data.orders.find((o) => o.id === activeOrderId);

// ---------- Tabs ----------
document.querySelectorAll(".tab").forEach((btn) => {
  btn.onclick = () => {
    document.querySelectorAll(".tab").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    document.querySelectorAll(".page").forEach((p) => p.classList.add("hidden"));
    $(btn.dataset.tab).classList.remove("hidden");
    render();
  };
});

// ---------- Orders ----------
$("newOrderBtn").onclick = () => {
  const order = { id: data.nextId++, no: data.nextOrderNo++, lines: [] };
  data.orders.push(order);
  activeOrderId = order.id;
  render();
};

function renderOrderList() {
  $("orderList").innerHTML = data.orders.length
    ? data.orders.map((o) => `
        <button class="order-card ${o.id === activeOrderId ? "active" : ""}" onclick="selectOrder(${o.id})">
          <b>Order #${o.no}</b>
          <span>${o.lines.length} items · ${money(orderTotal(o))}</span>
        </button>`).join("")
    : `<p class="muted">No open orders.</p>`;
}

function renderOrderDetail() {
  const order = getOrder();
  if (!order) {
    $("orderDetail").innerHTML = `<p class="muted">Create or select an order.</p>`;
    return;
  }

  const cats = ["All", ...data.categories];
  const items = data.items.filter((i) => activeCategory === "All" || i.category === activeCategory);

  $("orderDetail").innerHTML = `
    <div>
      <div class="chips">
        ${cats.map((c) => `<button class="${c === activeCategory ? "active" : ""}" onclick="setCategory('${esc(c)}')">${esc(c)}</button>`).join("")}
      </div>
      <div class="items">
        ${items.map((i) => `
          <button class="item-btn" onclick="addItem(${i.id})">
            ${esc(i.name)}<small>${money(i.price)}</small>
          </button>`).join("") || `<p class="muted">No items.</p>`}
      </div>
    </div>

    <div class="bill">
      <h2>Order #${order.no}</h2>
      ${order.lines.map((l, idx) => `
        <div class="bill-line">
          <span>${esc(l.name)}</span>
          <div class="qty">
            <button class="small" onclick="changeQty(${idx}, -1)">−</button>
            ${l.qty}
            <button class="small" onclick="changeQty(${idx}, 1)">+</button>
          </div>
          <span>${money(l.price * l.qty)}</span>
        </div>`).join("") || `<p class="muted">Tap an item to add it.</p>`}
      <div class="total"><span>Total</span><span>${money(orderTotal(order))}</span></div>
      <div class="bill-actions">
        <button class="danger" onclick="deleteOrder()">Delete</button>
        <button class="primary" onclick="completeOrder()" ${order.lines.length ? "" : "disabled"}>Complete</button>
      </div>
    </div>`;
}

function selectOrder(id) { activeOrderId = id; render(); }
function setCategory(c) { activeCategory = c; render(); }

function addItem(itemId) {
  const order = getOrder();
  const item = data.items.find((i) => i.id === itemId);
  const line = order.lines.find((l) => l.itemId === itemId);
  if (line) line.qty++;
  else order.lines.push({ itemId, name: item.name, price: item.price, qty: 1 });
  render();
}

function changeQty(idx, delta) {
  const order = getOrder();
  order.lines[idx].qty += delta;
  if (order.lines[idx].qty <= 0) order.lines.splice(idx, 1);
  render();
}

function closeOrder() {
  data.orders = data.orders.filter((o) => o.id !== activeOrderId);
  activeOrderId = data.orders[0]?.id ?? null;
  render();
}
function completeOrder() {
  const order = getOrder();
  data.history.push({
    no: order.no,
    lines: order.lines.map((l) => ({ ...l })),
    total: orderTotal(order),
    paidAt: new Date().toISOString(),
  });
  closeOrder();
}
function deleteOrder() { closeOrder(); }

// ---------- Menu ----------
$("catForm").onsubmit = (e) => {
  e.preventDefault();
  const name = $("catName").value.trim();
  if (name && !data.categories.includes(name)) data.categories.push(name);
  $("catName").value = "";
  render();
};

$("itemForm").onsubmit = (e) => {
  e.preventDefault();
  data.items.push({
    id: data.nextId++,
    name: $("itemName").value.trim(),
    price: parseFloat($("itemPrice").value),
    category: $("itemCat").value,
  });
  $("itemName").value = "";
  $("itemPrice").value = "";
  render();
};

function deleteCategory(name) {
  data.categories = data.categories.filter((c) => c !== name);
  data.items = data.items.filter((i) => i.category !== name);
  if (activeCategory === name) activeCategory = "All";
  render();
}

function deleteItem(id) {
  data.items = data.items.filter((i) => i.id !== id);
  render();
}

function renderMenu() {
  $("itemCat").innerHTML = data.categories.map((c) => `<option>${esc(c)}</option>`).join("");

  $("menuList").innerHTML = data.categories.map((c) => `
    <div class="card">
      <div class="cat-head">
        <h2>${esc(c)}</h2>
        <button class="small danger" onclick="deleteCategory('${esc(c)}')">Delete category</button>
      </div>
      ${data.items.filter((i) => i.category === c).map((i) => `
        <div class="menu-item">
          <span>${esc(i.name)} — ${money(i.price)}</span>
          <button class="small danger" onclick="deleteItem(${i.id})">Delete</button>
        </div>`).join("") || `<p class="muted">No items yet.</p>`}
    </div>`).join("");
}

// ---------- Reports ----------
$("clearHistoryBtn").onclick = () => {
  if (confirm("Delete all billed order history?")) {
    data.history = [];
    render();
  }
};

function renderReports() {
  const h = data.history;
  const totalSales = h.reduce((sum, o) => sum + o.total, 0);
  const totalItems = h.reduce((sum, o) => sum + o.lines.reduce((s, l) => s + l.qty, 0), 0);
  const avg = h.length ? totalSales / h.length : 0;

  // Today's sales
  const today = new Date().toDateString();
  const todaySales = h
    .filter((o) => new Date(o.paidAt).toDateString() === today)
    .reduce((sum, o) => sum + o.total, 0);

  $("stats").innerHTML = [
    ["Total Sales", money(totalSales)],
    ["Today's Sales", money(todaySales)],
    ["Orders Billed", h.length],
    ["Avg Order Value", money(avg)],
    ["Items Sold", totalItems],
  ].map(([label, value]) => `<div class="stat"><span>${label}</span><b>${value}</b></div>`).join("");

  // Items sold: group by item name
  const sold = {};
  h.forEach((o) => o.lines.forEach((l) => {
    sold[l.name] = sold[l.name] || { qty: 0, amount: 0 };
    sold[l.name].qty += l.qty;
    sold[l.name].amount += l.qty * l.price;
  }));
  const rows = Object.entries(sold).sort((a, b) => b[1].qty - a[1].qty);

  $("itemsSold").innerHTML = rows.length
    ? `<table>
        <tr><th>Item</th><th class="right">Qty</th><th class="right">Amount</th></tr>
        ${rows.map(([name, s]) => `
          <tr><td>${esc(name)}</td><td class="right">${s.qty}</td><td class="right">${money(s.amount)}</td></tr>`).join("")}
      </table>`
    : `<p class="muted">Nothing sold yet.</p>`;

  // Order log, newest first; click to see items
  $("orderLog").innerHTML = h.length
    ? h.slice().reverse().map((o) => `
        <details class="log-entry">
          <summary>
            <span>Order #${o.no} · ${new Date(o.paidAt).toLocaleString()}</span>
            <b>${money(o.total)}</b>
          </summary>
          <ul>
            ${o.lines.map((l) => `<li>${esc(l.name)} × ${l.qty} — ${money(l.price * l.qty)}</li>`).join("")}
          </ul>
        </details>`).join("")
    : `<p class="muted">No billed orders yet.</p>`;
}

// ---------- Render ----------
function render() {
  renderOrderList();
  renderOrderDetail();
  renderMenu();
  renderReports();
  save();
}

render();
