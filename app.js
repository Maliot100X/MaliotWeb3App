// Simple MaliotWeb3 virtual state using localStorage
const STORAGE_KEY = "maliotweb3_state_v1";

const defaultState = {
  balance: 100000,
  tokens: [], // { id, name, symbol, supply, degen, desc, price, mc, liq, change }
  holdings: {}, // symbol -> { amount, avgPrice }
  trades: 0,
  dailyClaimed: false,
  airdropClaimed: false,
};

let state = loadState();
renderAll();
startBotMarketLoop();

// ---- State helpers ----

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...defaultState };
    const parsed = JSON.parse(raw);
    return { ...defaultState, ...parsed };
  } catch (e) {
    console.error("Failed to load state", e);
    return { ...defaultState };
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

// ---- UI binding ----

const balanceDisplay = document.getElementById("balanceDisplay");
const statTokens = document.getElementById("statTokens");
const statTrades = document.getElementById("statTrades");
const statPortfolio = document.getElementById("statPortfolio");

const marketList = document.getElementById("marketList");
const myTokensList = document.getElementById("myTokensList");
const portfolioList = document.getElementById("portfolioList");

const createForm = document.getElementById("createForm");
const createHint = document.getElementById("createHint");

const dailyLoginBtn = document.getElementById("dailyLoginBtn");
const visitMarketBtn = document.getElementById("visitMarketBtn");
const gotoCreateBtn = document.getElementById("gotoCreateBtn");
const claimAirdropBtn = document.getElementById("claimAirdropBtn");

function formatMC(v) {
  return v.toLocaleString("en-US") + " MC";
}

function renderHeader() {
  balanceDisplay.textContent = formatMC(state.balance);
}

function computePortfolioValue() {
  let total = 0;
  for (const symbol in state.holdings) {
    const h = state.holdings[symbol];
    const token = state.tokens.find((t) => t.symbol === symbol);
    if (!token) continue;
    total += h.amount * token.price;
  }
  return total;
}

function renderStats() {
  statTokens.textContent = state.tokens.length;
  statTrades.textContent = state.trades;
  statPortfolio.textContent = formatMC(Math.round(computePortfolioValue()));
}

function renderMarket() {
  if (!state.tokens.length) {
    marketList.classList.add("empty");
    marketList.innerHTML = '<p class="muted">No tokens yet. Launch one from the Create tab.</p>';
    return;
  }
  marketList.classList.remove("empty");
  marketList.innerHTML = "";
  state.tokens.forEach((t) => {
    const card = document.createElement("div");
    card.className = "token-card";

    const header = document.createElement("div");
    header.className = "token-header";

    const left = document.createElement("div");
    const name = document.createElement("div");
    name.className = "token-name";
    name.textContent = t.name;
    const symbol = document.createElement("div");
    symbol.className = "token-symbol";
    symbol.textContent = "$" + t.symbol;
    left.appendChild(name);
    left.appendChild(symbol);

    const price = document.createElement("div");
    price.className = "token-name";
    price.textContent = t.price.toFixed(4) + " MC";

    header.appendChild(left);
    header.appendChild(price);
    card.appendChild(header);

    const metrics = document.createElement("div");
    metrics.className = "token-metrics";

    const mc = document.createElement("span");
    mc.textContent = "MC: " + t.mc.toLocaleString("en-US");

    const liq = document.createElement("span");
    liq.textContent = "Liq: " + t.liq.toLocaleString("en-US");

    const change = document.createElement("span");
    change.className = "token-change " + (t.change >= 0 ? "pos" : "neg");
    change.textContent = (t.change >= 0 ? "+" : "") + t.change.toFixed(2) + "%";

    metrics.appendChild(mc);
    metrics.appendChild(liq);
    metrics.appendChild(change);
    card.appendChild(metrics);

    const actions = document.createElement("div");
    actions.className = "token-actions";

    const buyBtn = document.createElement("button");
    buyBtn.className = "btn primary";
    buyBtn.textContent = "Buy";
    buyBtn.onclick = () => buyToken(t.symbol);

    const sellBtn = document.createElement("button");
    sellBtn.className = "btn ghost";
    sellBtn.textContent = "Sell";
    sellBtn.onclick = () => sellToken(t.symbol);

    actions.appendChild(buyBtn);
    actions.appendChild(sellBtn);
    card.appendChild(actions);

    marketList.appendChild(card);
  });
}

function renderMyTokens() {
  if (!state.tokens.length) {
    myTokensList.classList.add("empty");
    myTokensList.innerHTML = '<p class="muted">You haven\'t launched any tokens yet.</p>';
    return;
  }
  myTokensList.classList.remove("empty");
  myTokensList.innerHTML = "";
  state.tokens.forEach((t) => {
    const card = document.createElement("div");
    card.className = "token-card";

    const header = document.createElement("div");
    header.className = "token-header";
    header.innerHTML = `
      <div>
        <div class="token-name">${t.name}</div>
        <div class="token-symbol">${t.symbol} · Degen: ${t.degen}</div>
      </div>
      <div class="token-name">${t.price.toFixed(4)} MC</div>
    `;
    card.appendChild(header);

    const metrics = document.createElement("div");
    metrics.className = "token-metrics";
    metrics.innerHTML = `
      <span>MC: ${t.mc.toLocaleString("en-US")}</span>
      <span>Liq: ${t.liq.toLocaleString("en-US")}</span>
      <span class="token-change ${t.change >= 0 ? "pos" : "neg"}">${t.change >= 0 ? "+" : ""}${t.change.toFixed(2)}%</span>
    `;
    card.appendChild(metrics);

    const desc = document.createElement("div");
    desc.className = "hint small";
    desc.textContent = t.desc || "No description.";
    card.appendChild(desc);

    myTokensList.appendChild(card);
  });
}

function renderPortfolio() {
  const holdingsSymbols = Object.keys(state.holdings);
  if (!holdingsSymbols.length) {
    portfolioList.classList.add("empty");
    portfolioList.innerHTML = '<p class="muted">No holdings yet. Buy from the market to build your bag.</p>';
    return;
  }
  portfolioList.classList.remove("empty");
  portfolioList.innerHTML = "";

  holdingsSymbols.forEach((symbol) => {
    const h = state.holdings[symbol];
    const token = state.tokens.find((t) => t.symbol === symbol);
    if (!token) return;

    const card = document.createElement("div");
    card.className = "token-card";

    const header = document.createElement("div");
    header.className = "token-header";
    header.innerHTML = `
      <div>
        <div class="token-name">${token.name}</div>
        <div class="token-symbol">$ ${token.symbol}</div>
      </div>
      <div class="token-name">${token.price.toFixed(4)} MC</div>
    `;
    card.appendChild(header);

    const metrics = document.createElement("div");
    metrics.className = "token-metrics";

    const positionValue = h.amount * token.price;
    const avgPrice = h.avgPrice;
    const pnlPct = ((token.price - avgPrice) / avgPrice) * 100;

    metrics.innerHTML = `
      <span>Qty: ${h.amount.toFixed(2)}</span>
      <span>Value: ${positionValue.toFixed(2)} MC</span>
      <span class="token-change ${pnlPct >= 0 ? "pos" : "neg"}">${pnlPct >= 0 ? "+" : ""}${pnlPct.toFixed(2)}%</span>
    `;

    card.appendChild(metrics);
    portfolioList.appendChild(card);
  });
}

function renderAll() {
  renderHeader();
  renderStats();
  renderMarket();
  renderMyTokens();
  renderPortfolio();
}

// ---- Tabs ----

document.querySelectorAll(".tab").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach((b) => b.classList.remove("active"));
    document.querySelectorAll(".tab-content").forEach((c) => c.classList.remove("active"));
    btn.classList.add("active");
    const tabId = btn.getAttribute("data-tab");
    document.getElementById(tabId).classList.add("active");
  });
});

// ---- Actions ----

if (dailyLoginBtn) {
  dailyLoginBtn.addEventListener("click", () => {
    if (state.dailyClaimed) {
      alert("You already claimed today.");
      return;
    }
    state.balance += 1000;
    state.dailyClaimed = true;
    saveState();
    renderAll();
    alert("+1,000 MC added!");
  });
}

if (visitMarketBtn) {
  visitMarketBtn.addEventListener("click", () => {
    document.querySelector('[data-tab="market"]').click();
  });
}

if (gotoCreateBtn) {
  gotoCreateBtn.addEventListener("click", () => {
    document.querySelector('[data-tab="create"]').click();
  });
}

if (claimAirdropBtn) {
  claimAirdropBtn.addEventListener("click", () => {
    if (state.airdropClaimed) {
      alert("You already claimed this airdrop.");
      return;
    }
    state.balance += 5000;
    state.airdropClaimed = true;
    saveState();
    renderAll();
    alert("+5,000 MC claimed for checking the real TGE!");
  });
}

// ---- Create token ----

if (createForm) {
  createForm.addEventListener("submit", (e) => {
    e.preventDefault();
    createHint.textContent = "";
    createHint.className = "hint";

    const name = document.getElementById("tokenName").value.trim();
    const symbol = document.getElementById("tokenSymbol").value.trim().toUpperCase();
    const supply = parseInt(document.getElementById("tokenSupply").value, 10);
    const degen = document.getElementById("tokenDegen").value;
    const desc = document.getElementById("tokenDesc").value.trim();

    if (!name || !symbol || !supply || supply <= 0) {
      createHint.textContent = "Fill name, ticker and a valid supply.";
      createHint.classList.add("error");
      return;
    }

    if (state.balance < 10000) {
      createHint.textContent = "Not enough MC. You need 10,000 MC to launch.";
      createHint.classList.add("error");
      return;
    }

    if (state.tokens.some((t) => t.symbol === symbol)) {
      createHint.textContent = "Symbol already exists. Pick another.";
      createHint.classList.add("error");
      return;
    }

    state.balance -= 10000;

    const basePrice = 0.0001 + Math.random() * 0.0005;
    const mc = Math.round(supply * basePrice);
    const liq = Math.round(mc * 0.1);

    const token = {
      id: Date.now(),
      name,
      symbol,
      supply,
      degen,
      desc,
      price: basePrice,
      mc,
      liq,
      change: 0,
    };

    state.tokens.push(token);
    saveState();
    renderAll();

    createHint.textContent = `Launched ${name} ($${symbol}) successfully!`;
    createHint.classList.add("success");

    createForm.reset();
  });
}

// ---- Trading logic (virtual) ----

function buyToken(symbol) {
  const token = state.tokens.find((t) => t.symbol === symbol);
  if (!token) return;

  const spend = Math.min(5000, state.balance);
  if (spend <= 0) {
    alert("Not enough MC to buy. Farm or claim tasks.");
    return;
  }

  const qty = spend / token.price;
  state.balance -= spend;

  if (!state.holdings[symbol]) {
    state.holdings[symbol] = { amount: 0, avgPrice: token.price };
  }
  const h = state.holdings[symbol];

  const totalCost = h.amount * h.avgPrice + spend;
  const totalQty = h.amount + qty;
  h.amount = totalQty;
  h.avgPrice = totalCost / totalQty;

  token.price *= 1 + (0.02 + Math.random() * 0.03); // +2–5%
  token.change = Math.random() * 8 + 2; // 2–10% up
  token.mc = Math.round(token.supply * token.price);
  token.liq = Math.round(token.mc * 0.1);

  state.trades += 1;
  saveState();
  renderAll();
}

function sellToken(symbol) {
  const token = state.tokens.find((t) => t.symbol === symbol);
  if (!token) return;

  const h = state.holdings[symbol];
  if (!h || h.amount <= 0) {
    alert("You don't hold this token.");
    return;
  }

  const sellQty = h.amount * 0.25; // sell 25%
  const income = sellQty * token.price;
  h.amount -= sellQty;
  state.balance += income;

  token.price *= 1 - (0.02 + Math.random() * 0.03); // -2–5%
  token.change = -(Math.random() * 8 + 2);
  token.mc = Math.round(token.supply * token.price);
  token.liq = Math.round(token.mc * 0.1);

  if (h.amount <= 0.0001) {
    delete state.holdings[symbol];
  }

  state.trades += 1;
  saveState();
  renderAll();
}

// ---- Bot market loop (fake volume/bots) ----

function startBotMarketLoop() {
  setInterval(() => {
    if (!state.tokens.length) return;

    // pick random token
    const idx = Math.floor(Math.random() * state.tokens.length);
    const t = state.tokens[idx];

    // random up or down move
    const direction = Math.random() < 0.5 ? -1 : 1;
    const magnitude = 0.005 + Math.random() * 0.025; // 0.5%–3% move
    t.price *= 1 + direction * magnitude;
    t.mc = Math.round(t.supply * t.price);
    t.liq = Math.round(t.mc * 0.1);
    t.change = direction * (Math.random() * 5 + 1); // 1–6% print

    // count this as a "fake" trade
    state.trades += 1;

    saveState();
    renderAll();
  }, 8000); // every 8 seconds
}
