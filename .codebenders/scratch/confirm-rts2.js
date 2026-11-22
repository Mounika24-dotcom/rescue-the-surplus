const fs = require("fs"); const path = require("path"); const vm = require("vm"); const util = require("util");
const OUT = []; const calls = [];
const log = (...a) => { const s = util.format(...a); OUT.push(s); process.stdout.write(s + "\n"); };
const CONSOLE = { log: log, warn: (...a) => log("[app warn]", ...a), error: (...a) => log("[app error]", ...a) };
const html = fs.readFileSync(path.join(process.cwd(), "rescue-the-surplus", "index.html"), "utf8");
const SRC = html.match(/<script>([\s\S]*?)<\/script>/)[1];
const MIN = 60000, HOUR = 60 * MIN, KEY = "rescueSurplus.v1", ACC = "rts.account";
const BIZ = { payingDonors: 20, monthlyFee: 1500, sponsorPerMeal: 4, sponsoredShare: 50, cityGrantMonthly: 0, platformCostMonthly: 8000, coordinatorSalaryMonthly: 15000, logisticsPerMeal: 2, listingsPerWeek: 3, mealsPerListing: 40 };
const IMPACT = { kgPerMeal: 0.42, co2PerKg: 4 };
const el = () => ({ hidden: false, value: "", style: {}, dataset: {}, innerHTML: "", textContent: "",
  classList: { toggle() {}, add() {}, remove() {} }, setAttribute() {}, removeAttribute() {}, addEventListener() {}, remove() {},
  querySelector() { return null; }, querySelectorAll() { return []; } });
function makeCtx(storage, form) {
  const els = {}; const getEl = (id) => (els[id] ??= el()); const view = getEl("view");
  const document = { getElementById: getEl, querySelector: () => getEl("roles"),
    querySelectorAll: (sel) => { calls.push(sel); if (sel !== "[data-deadline]") return [];
      return [...view.innerHTML.matchAll(/<span class="countdown" data-deadline="(\d+)"/g)].map((m) => { const e = el(); e.dataset = { deadline: m[1] }; return e; }); } };
  class FormData { constructor(f) { this.f = f; } get(k) { return k in this.f ? this.f[k] : null; } getAll(k) { return this.f[k] ?? []; } }
  const sb = { document, FormData, form, console: CONSOLE, setInterval, clearInterval, setTimeout, addEventListener() {}, confirm: () => true,
    localStorage: { getItem: (k) => (k in storage ? storage[k] : null), setItem: (k, v) => { storage[k] = String(v); }, removeItem: (k) => { delete storage[k]; } } };
  sb.window = sb;
  return { ctx: vm.createContext(sb), view };
}
function load(storage) {
  const h = makeCtx(storage, null); let error = null;
  try { vm.runInContext(SRC, h.ctx, { filename: "index.html", lineOffset: 153 }); } catch (e) { error = e; }
  return { ...h, error };
}
const ev = (ctx, code) => vm.runInContext(code, ctx);
const saved = (listings) => JSON.stringify({ listings, nextId: 200, impact: IMPACT, business: BIZ, businessCity: "Hyderabad" });
const base = (o) => ({ donorId: 1, foodType: "Test food", quantity: 10, unit: "meals", allergens: ["none"], storageNote: "", foodCategory: "Cooked food", consumeWithinHours: 4, postedAt: Date.now() - 3 * HOUR, pickupBy: Date.now() - HOUR, status: "posted", history: [], ...o });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const DONOR_ACCOUNT = JSON.stringify({ role: "donor", id: 1, name: "Saffron Caterers" });

async function partA() {
  log("== (a) R3 badge on the DONOR account: listing passes pickupBy while the page is open");
  const now = Date.now();
  const storage = {};
  storage[KEY] = saved([base({ id: 310, donorId: 1, foodType: "R3 donor test", status: "posted", pickupBy: now + 2500, postedAt: now - MIN, history: [] })]);
  storage[ACC] = DONOR_ACCOUNT;
  const { ctx, view, error } = load(storage);
  if (error) { log("load error:", error.message); return; }
  const read = (t) => {
    const card = view.innerHTML.split("<article").find((c) => c.includes("R3 donor test"));
    const m = card ? card.match(/<span class="badge ([\w-]+)">([^<]*)<\/span>/) : null;
    log(t, "| donor form shown:", view.innerHTML.includes("Post surplus food"),
      "| card found:", !!card,
      "| badge:", m ? "class=" + m[1] + " text=" + m[2] : "none",
      "| displayStatus:", ev(ctx, "displayStatus(state.listings.find(l => l.id === 310))"),
      "| claim button for 310:", view.innerHTML.includes("data-action=\"claim\" data-id=\"310\""),
      "| any claim button in view:", view.innerHTML.includes("data-action=\"claim\""));
  };
  read("at load:        ");
  await sleep(3500);
  log("countdown ticks seen so far (data-deadline queries):", calls.filter((s) => s === "[data-deadline]").length);
  read("after 3.5s:     ");
  ev(ctx, "render()");
  read("after render(): ");
}

function partB(label, make, lid) {
  log("== (b) " + label);
  const n = Date.now();
  const storage = {};
  storage[KEY] = saved([make(n)]);
  storage[ACC] = DONOR_ACCOUNT;
  const { ctx, error } = load(storage);
  log("load error:", error ? error.name + ": " + error.message : "none");
  log("saved key still present after load:", KEY in storage);
  log("saved key removed (discardSaved ran):", !(KEY in storage));
  log("listing ids in memory after load:", ev(ctx, "JSON.stringify(state.listings.map(l => l.id))"));
  log("listing " + lid + " present in memory:", ev(ctx, "state.listings.some(l => l.id === " + lid + ")"));
  log("sample-flagged ids in memory:", ev(ctx, "JSON.stringify(state.listings.filter(l => l.sample).map(l => l.id))"));
}

(async () => {
  await partA();
  partB("(b-D) saved history step teleported", (n) => base({ id: 401, status: "posted", pickupBy: n + 2 * HOUR, postedAt: n, history: [{ step: "teleported", by: "x", at: n }] }), 401);
  partB("(b-E) saved history [null]", (n) => base({ id: 402, status: "claimed", pickupBy: n + 2 * HOUR, postedAt: n, history: [null] }), 402);
  partB("(b-control) saved valid claimed history", (n) => base({ id: 403, status: "claimed", pickupBy: n + 2 * HOUR, postedAt: n, history: [{ step: "claimed", by: "Hope Foundation", at: n }] }), 403);
  fs.writeFileSync(path.join(process.cwd(), ".codebenders", "scratch", "confirm-rts2.out.txt"), OUT.join("\n") + "\n");
  process.exit(0);
})();
