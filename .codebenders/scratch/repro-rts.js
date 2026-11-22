const fs = require('fs'); const path = require('path'); const vm = require('vm');
const html = fs.readFileSync(path.join(process.cwd(), 'rescue-the-surplus', 'index.html'), 'utf8');
const SRC = html.match(/<script>([\s\S]*?)<\/script>/)[1];
const MIN = 60000, HOUR = 60 * MIN, KEY = 'rescueSurplus.v1', ACC = 'rts.account';
const BIZ = { payingDonors: 20, monthlyFee: 1500, sponsorPerMeal: 4, sponsoredShare: 50, cityGrantMonthly: 0, platformCostMonthly: 8000, coordinatorSalaryMonthly: 15000, logisticsPerMeal: 2, listingsPerWeek: 3, mealsPerListing: 40 };
const IMPACT = { kgPerMeal: 0.42, co2PerKg: 4 };
const el = () => ({ hidden: false, value: '', style: {}, dataset: {}, innerHTML: '', textContent: '',
  classList: { toggle() {}, add() {}, remove() {} }, setAttribute() {}, removeAttribute() {}, addEventListener() {}, remove() {},
  querySelector() { return null; }, querySelectorAll() { return []; } });
function makeCtx({ storage = {}, form = null, log = [] }) {
  const els = {}; const getEl = (id) => (els[id] ??= el()); const view = getEl('view');
  const document = { getElementById: getEl, querySelector: () => getEl('roles'),
    querySelectorAll: (sel) => { log.push(sel); if (sel !== '[data-deadline]') return [];
      return [...view.innerHTML.matchAll(/<span class="countdown" data-deadline="(\d+)"/g)].map((m) => { const e = el(); e.dataset = { deadline: m[1] }; return e; }); } };
  class FormData { constructor(f) { this.f = f; } get(k) { return k in this.f ? this.f[k] : null; } getAll(k) { return this.f[k] ?? []; } }
  const sb = { document, FormData, form, console, setInterval, clearInterval, setTimeout, addEventListener() {}, confirm: () => true,
    localStorage: { getItem: (k) => (k in storage ? storage[k] : null), setItem: (k, v) => { storage[k] = String(v); }, removeItem: (k) => { delete storage[k]; } } };
  sb.window = sb;
  return { ctx: vm.createContext(sb), view };
}
function load(opts) {
  const h = makeCtx(opts); let error = null;
  try { vm.runInContext(SRC, h.ctx, { filename: 'index.html', lineOffset: 153 }); } catch (e) { error = e; }
  return { ...h, error };
}
const ev = (ctx, code) => vm.runInContext(code, ctx);
const saved = (listings) => JSON.stringify({ listings, nextId: 200, impact: IMPACT, business: BIZ, businessCity: 'Hyderabad' });
const base = (o) => ({ donorId: 1, foodType: 'Test food', quantity: 10, unit: 'meals', allergens: ['none'], storageNote: '', foodCategory: 'Cooked food', consumeWithinHours: 4, postedAt: Date.now() - 3 * HOUR, pickupBy: Date.now() - HOUR, status: 'posted', history: [], ...o });
const fmtLocal = (d) => { const p = (n) => String(n).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`; };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function R1() {
  console.log('== R1 reseed on load');
  const now = Date.now(); const hist = [{ step: 'claimed', by: 'Hope Foundation', at: now - 2 * HOUR }];
  const storage = { [KEY]: saved([
    base({ id: 100, status: 'claimed', history: hist }),
    base({ id: 101, status: 'posted', sample: true }),
    base({ id: 102, status: 'claimed', sample: true, history: hist }) ]) };
  const { ctx, error } = load({ storage });
  console.log('load error:', error && error.message);
  console.log('listings after load:', ev(ctx, "JSON.stringify(state.listings.map(l => ({id: l.id, status: l.status, sample: !!l.sample, hist: l.history.length})))"));
  console.log('saved listing ids:', JSON.parse(storage[KEY]).listings.map((l) => l.id).join(','));
}

function R2(label, pickupMs) {
  console.log(`== R2 donor submit, pickup ${label}`);
  const storage = { [ACC]: JSON.stringify({ role: 'donor', id: 1, name: 'Saffron Caterers' }) };
  const errs = ['foodType', 'quantity', 'consumeWithinHours', 'pickupBy'].map((k) => { const e = el(); e.dataset = { error: k }; return e; });
  const form = { foodType: 'R2 test', quantity: '5', unit: 'meals', foodCategory: 'Cooked food', consumeWithinHours: '4', pickupBy: fmtLocal(new Date(pickupMs)), storageNote: '', querySelectorAll: () => errs };
  const { ctx, error } = load({ storage, form });
  if (error) { console.log('load error:', error.message); return; }
  ev(ctx, 'handleDonorSubmit(form)');
  console.log('saved R2 listings:', ev(ctx, "JSON.stringify(state.listings.filter(l => l.foodType === 'R2 test').map(l => ({ minutesFromNow: Math.round((l.pickupBy - Date.now()) / MIN) })))"));
  console.log('field errors:', JSON.stringify(errs.map((e) => [e.dataset.error, e.textContent])));
  console.log('localStorage has R2 listing:', (storage[KEY] || '').includes('R2 test'));
}

async function R3() {
  console.log('== R3 posted listing passes pickupBy while page open');
  const now = Date.now();
  const storage = { [KEY]: saved([base({ id: 300, status: 'posted', pickupBy: now + 2500, postedAt: now - MIN, history: [] })]), [ACC]: JSON.stringify({ role: 'receiver', id: 1, name: 'Hope Foundation' }) };
  const log = []; const { ctx, view, error } = load({ storage, log });
  if (error) { console.log('load error:', error.message); return; }
  const snap = (t) => console.log(t, 'expired-now:', ev(ctx, 'displayStatus(state.listings[0]) === "expired"'),
    '| badge:', (view.innerHTML.match(/<span class="badge (\w+)">/) || [])[1],
    '| claim button:', view.innerHTML.includes('data-action="claim" data-id="300"'));
  snap('at load:       ');
  await sleep(3500);
  console.log('countdown ticks run:', log.filter((s) => s === '[data-deadline]').length);
  snap('after 3.5s:    ');
  ev(ctx, 'render()');
  snap('after render(): ');
}

function R4(label, account, listing) {
  console.log(`== R4 ${label}`);
  const storage = { [KEY]: saved([listing(Date.now())]), [ACC]: JSON.stringify(account) };
  const { error } = load({ storage });
  console.log('load error:', error ? `${error.name}: ${error.message}` : 'none');
  if (error && error.stack) console.log('  top frame:', error.stack.split('\n')[1].trim());
}

(async () => {
  R1();
  R2('in the past', Date.now() - 60 * MIN);
  R2('in 2h (control)', Date.now() + 2 * HOUR);
  R2('after eat-by (control)', Date.now() + 10 * HOUR);
  await R3();
  const rec = { role: 'receiver', id: 1, name: 'Hope Foundation' }, ov = { role: 'overview', id: 'judges', name: 'Overview (judges)' }, don = { role: 'donor', id: 1, name: 'Saffron Caterers' };
  R4('A donorId 99, receiver account', rec, (n) => base({ id: 400, donorId: 99, status: 'posted', pickupBy: n + 2 * HOUR, postedAt: n - MIN }));
  R4('B donorId 99, overview account', ov, (n) => base({ id: 400, donorId: 99, status: 'posted', pickupBy: n + 2 * HOUR, postedAt: n - MIN }));
  R4('C donorId 99, donor account (control)', don, (n) => base({ id: 400, donorId: 99, status: 'posted', pickupBy: n + 2 * HOUR, postedAt: n - MIN }));
  R4('D history step "teleported", donor account', don, (n) => base({ id: 401, status: 'posted', pickupBy: n + 2 * HOUR, postedAt: n, history: [{ step: 'teleported', by: 'x', at: n }] }));
  R4('E history entry null, donor account', don, (n) => base({ id: 402, status: 'claimed', pickupBy: n + 2 * HOUR, postedAt: n, history: [null] }));
  process.exit(0);
})();
