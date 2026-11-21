// Headless harness for rescue-the-surplus/index.html inline script.
// Usage (from repo root): node .codebenders/scratch/verify-harness.js [path/to/index.html]
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const file = path.resolve(process.argv[2] || 'rescue-the-surplus/index.html');
const html = fs.readFileSync(file, 'utf8');
const m = html.match(/<script>([\s\S]*?)<\/script>/); // inline only: no attributes, so no src scripts
if (!m) { console.log('FAIL: no inline <script> found'); process.exit(2); }
const src = m[1] + ';\nglobalThis.__t={safetyHtml,displayStatus,sampleListings,sampleDeliveredListings,handleDonorSubmit,state};';

function makeEl(id) {
  return {
    id, innerHTML: '', textContent: '', value: '', dataset: {}, style: {},
    classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
    addEventListener() {}, removeEventListener() {}, setAttribute() {}, getAttribute() { return null; },
    querySelector() { return makeEl('child'); }, querySelectorAll() { return []; },
    closest() { return null; }, focus() {},
  };
}
const elements = {};
const document = {
  getElementById(id) { return elements[id] || (elements[id] = makeEl(id)); },
  querySelector(s) { return elements[s] || (elements[s] = makeEl(s)); },
  querySelectorAll() { return []; },
  addEventListener() {},
  createElement() { return makeEl('created'); },
};
const store = {};
const localStorage = {
  getItem(k) { return Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null; },
  setItem(k, v) { store[k] = String(v); }, removeItem(k) { delete store[k]; },
};
// Minimal FormData: reads fields from a fake form object.
class FormData {
  constructor(form) { this.f = form.fields; }
  get(k) { return Object.prototype.hasOwnProperty.call(this.f, k) ? this.f[k] : null; }
  getAll(k) { const v = this.f[k]; return v === undefined ? [] : (Array.isArray(v) ? v : [v]); }
}
const sandbox = {
  console, document, localStorage, FormData,
  window: { localStorage, addEventListener() {} },
  setInterval: () => 0, clearInterval() {}, setTimeout: () => 0, clearTimeout() {},
  alert() {}, confirm: () => true,
};
vm.createContext(sandbox);
try {
  vm.runInContext(src, sandbox, { filename: 'index.html<inline>' });
} catch (e) {
  console.log('LOAD ERROR: ' + (e && e.stack || e));
  process.exit(3);
}
const T = sandbox.__t;
const HOUR = 3600000;
const WARN = 'Eat-by time is earlier than the pickup deadline';

console.log('== 1. sampleListings: warning check ==');
let bad1 = 0;
for (const l of T.sampleListings()) {
  const ds = T.displayStatus(l);
  const remaining = (l.postedAt + l.consumeWithinHours * HOUR - l.pickupBy) / HOUR;
  const hasWarn = T.safetyHtml(l).includes(WARN);
  const open = ['posted', 'claimed', 'collected'].includes(ds);
  const expected = open && remaining < 1;
  if (hasWarn !== expected) bad1++;
  console.log(`id=${l.id} status=${l.status} displayStatus=${ds} remainingHours=${remaining.toFixed(3)} warning=${hasWarn} expectedWarning=${expected} ${hasWarn === expected ? 'OK' : 'MISMATCH'}`);
}
console.log('section1 mismatches: ' + bad1);

console.log('== 2. sampleDeliveredListings: history offsets ==');
let bad2 = 0;
for (const l of T.sampleDeliveredListings()) {
  const off = (step) => {
    const h = l.history.find((x) => x.step === step);
    return h ? ((h.at - l.postedAt) / 60000).toFixed(2) : 'missing';
  };
  const c = off('claimed'), col = off('collected'), d = off('delivered');
  const ok = Number(d) <= l.consumeWithinHours * 60;
  if (!ok) bad2++;
  console.log(`id=${l.id} status=${l.status} claimedMin=${c} collectedMin=${col} deliveredMin=${d} consumeWithinMin=${l.consumeWithinHours * 60} deliveredWithinWindow=${ok}`);
}
console.log('section2 violations: ' + bad2);

console.log('== 3. donor form: handleDonorSubmit (real function) ==');
function fmtLocal(ms) {
  const d = new Date(ms); const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}
function runCase(label, aheadHours) {
  const errEls = ['foodType', 'quantity', 'consumeWithinHours', 'pickupBy'].map((k) => ({ dataset: { error: k }, textContent: '' }));
  const form = {
    fields: {
      donorId: '1', foodType: 'Test dish', quantity: '10', unit: 'meals',
      pickupBy: fmtLocal(Date.now() + aheadHours * HOUR), consumeWithinHours: '4',
      foodCategory: 'Cooked food', storageNote: '', allergens: ['none'],
    },
    querySelectorAll() { return errEls; },
  };
  const before = T.state.listings.length;
  let thrown = null;
  try { T.handleDonorSubmit(form); } catch (e) { thrown = String(e && e.message || e); }
  const pushed = T.state.listings.length - before;
  const pickupErr = errEls.find((e) => e.dataset.error === 'pickupBy').textContent;
  console.log(`${label}: pickupBy=${form.fields.pickupBy} aheadHours=${aheadHours} listingsAdded=${pushed} ` +
    `result=${pushed === 0 ? 'BLOCKED' : 'POSTED'} pickupError="${pickupErr}"` + (thrown ? ` threw=${thrown}` : ''));
  return { pushed, pickupErr };
}
const r5 = runCase('case A (5h ahead, must block)', 5);
const r2 = runCase('case B (2h ahead, must pass)', 2);
const okA = r5.pushed === 0 && r5.pickupErr.length > 0;
const okB = r2.pushed === 1;
console.log(`caseA ${okA ? 'OK' : 'FAIL'}; caseB ${okB ? 'OK' : 'FAIL'}`);
process.exit(bad1 || bad2 || !okA || !okB ? 1 : 0);
