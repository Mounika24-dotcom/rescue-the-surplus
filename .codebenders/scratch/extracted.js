
  const HOUR = 60 * 60 * 1000;
  const MIN = 60 * 1000;
  const ALLERGENS = ['nuts', 'dairy', 'gluten', 'eggs', 'soy', 'none'];

  // Fictional city grid: each location is a grid label plus x/y coordinates.
  const DONORS = [
    { id: 1, name: 'Saffron Caterers', kind: 'Caterer', location: { grid: 'C3', x: 3, y: 4 } },
    { id: 2, name: 'Lotus Function Hall', kind: 'Function hall', location: { grid: 'F1', x: 6, y: 1 } },
    { id: 3, name: 'Maple Banquet Hall', kind: 'Function hall', location: { grid: 'B5', x: 2, y: 5 } },
    { id: 4, name: 'Annapurna Catering Co.', kind: 'Caterer', location: { grid: 'D2', x: 4, y: 2 } },
    { id: 5, name: 'Silver Oak Events', kind: 'Caterer', location: { grid: 'G6', x: 7, y: 6 } },
    { id: 6, name: 'Jasmine Garden Hall', kind: 'Function hall', location: { grid: 'E4', x: 5, y: 4 } },
  ];

  const RECEIVERS = [
    { id: 1, name: 'Hope Foundation', kind: 'NGO', location: { grid: 'A1', x: 1, y: 1 } },
    { id: 2, name: 'Annadaan Community Kitchen', kind: 'Community kitchen', location: { grid: 'B3', x: 2, y: 3 } },
    { id: 3, name: 'Sahyog Trust', kind: 'NGO', location: { grid: 'E7', x: 5, y: 7 } },
    { id: 4, name: 'Nanhe Kadam Kitchen', kind: 'Community kitchen', location: { grid: 'G2', x: 7, y: 2 } },
    { id: 5, name: 'Asha Seva Samiti', kind: 'NGO', location: { grid: 'H5', x: 8, y: 5 } },
  ];

  // Pickup times are offsets from Date.now() at load; negative = already past.
  function sampleListings() {
    const now = Date.now();
    const spec = [
      { donorId: 1, foodType: 'Paneer tikka & naan', quantity: 40, unit: 'meals', offset: 150 * MIN, allergens: ['dairy', 'gluten'], storageNote: 'Hot-held in chafing dishes' },
      { donorId: 2, foodType: 'Dal, rice & salad', quantity: 25, unit: 'kg', offset: 4 * HOUR, allergens: ['none'], storageNote: 'Sealed steel containers, keep covered' },
      { donorId: 3, foodType: 'Vegetable biryani', quantity: 60, unit: 'meals', offset: 75 * MIN, allergens: ['dairy'], storageNote: 'Foil trays, refrigerate on arrival' },
      { donorId: 4, foodType: 'Mithai sweets box', quantity: 10, unit: 'kg', offset: 3 * HOUR, allergens: ['dairy', 'nuts'], storageNote: 'Boxed, room temperature is fine' },
      { donorId: 5, foodType: 'Bread rolls & butter', quantity: 30, unit: 'meals', offset: 20 * MIN, allergens: ['gluten', 'dairy'], storageNote: 'Wrapped, no refrigeration needed' },
      { donorId: 6, foodType: 'Samosas & chutney', quantity: 50, unit: 'meals', offset: -15 * MIN, allergens: ['gluten'], storageNote: 'Fried snacks, best eaten same day' },
      { donorId: 1, foodType: 'Fresh fruit platter', quantity: 8, unit: 'kg', offset: 5 * HOUR, allergens: ['none'], storageNote: 'Keep chilled' },
      { donorId: 5, foodType: 'Egg fried rice & soup', quantity: 35, unit: 'meals', offset: 5.75 * HOUR, allergens: ['eggs', 'soy'], storageNote: 'Hot packs in bag' },
    ];
    return spec.map((s, i) => ({
      id: i + 1,
      donorId: s.donorId,
      foodType: s.foodType,
      quantity: s.quantity,
      unit: s.unit,
      pickupBy: now + s.offset,
      allergens: s.allergens,
      storageNote: s.storageNote,
      claimedBy: null,
      volunteered: false,
    }));
  }

  const state = {
    role: 'donor',
    listings: sampleListings(),
    nextId: 9,
    receiverId: null,
  };

  const view = document.getElementById('view');
  let timer = null;

  const esc = (value) => String(value)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  const pad = (n) => String(n).padStart(2, '0');
  const findById = (list, id) => list.find((item) => item.id === id);
  const fmtLoc = (loc) => `Grid ${loc.grid} (x ${loc.x}, y ${loc.y})`;
  const isOpen = (l) => !l.claimedBy && l.pickupBy > Date.now();

  function formatLeft(ms) {
    const totalSec = Math.floor(ms / 1000);
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    return `${h}h ${pad(m)}m ${pad(s)}s left`;
  }

  function statusText(l) {
    if (l.claimedBy) return `Claimed by ${esc(findById(RECEIVERS, l.claimedBy).name)}`;
    if (l.volunteered) return 'Volunteer picking up';
    return 'Unclaimed';
  }

  function listingCard(l, actionHtml) {
    const donor = findById(DONORS, l.donorId);
    return `
      <article class="card">
        <h3>${esc(l.foodType)} &mdash; ${esc(l.quantity)} ${esc(l.unit)}</h3>
        <p>From ${esc(donor.name)} (${esc(donor.kind)})</p>
        <p>${esc(fmtLoc(donor.location))}</p>
        <p>Allergens: ${l.allergens.map(esc).join(', ')}</p>
        ${l.storageNote ? `<p>Storage: ${esc(l.storageNote)}</p>` : ''}
        <p>Pickup by ${esc(new Date(l.pickupBy).toLocaleString())}</p>
        <p><span class="countdown" data-deadline="${l.pickupBy}"></span></p>
        <p class="status">${statusText(l)}</p>
        ${actionHtml}
      </article>`;
  }

  function renderDonor() {
    const donorOptions = DONORS.map((d) => `<option value="${d.id}">${esc(d.name)}</option>`).join('');
    const allergenBoxes = ALLERGENS.map((a) => `<label><input type="checkbox" name="allergens" value="${a}"> ${a}</label>`).join('');
    const cards = state.listings.map((l) => listingCard(l, '')).join('');
    return `
      <section class="card">
        <h2>Post surplus food</h2>
        <form id="donor-form" novalidate>
          <div class="row">
            <label>Food type
              <input type="text" name="foodType" placeholder="e.g. Paneer curry">
              <span class="error" data-error="foodType"></span>
            </label>
            <label>Donor
              <select name="donorId">${donorOptions}</select>
            </label>
          </div>
          <div class="row">
            <label>Quantity
              <input type="number" name="quantity" min="0" step="any">
              <span class="error" data-error="quantity"></span>
            </label>
            <label>Unit
              <select name="unit"><option value="meals">meals</option><option value="kg">kg</option></select>
            </label>
          </div>
          <label>Pickup-by time
            <input type="datetime-local" name="pickupBy">
            <span class="error" data-error="pickupBy"></span>
          </label>
          <fieldset>
            <legend>Allergens</legend>
            ${allergenBoxes}
          </fieldset>
          <label>Storage note
            <input type="text" name="storageNote" placeholder="e.g. Keep covered, refrigerate">
          </label>
          <button type="submit" class="primary">Post listing</button>
        </form>
      </section>
      <h2>All listings</h2>
      <div class="grid">${cards}</div>`;
  }

  function renderReceiver() {
    const options = RECEIVERS.map((r) => `<option value="${r.id}"${r.id === state.receiverId ? ' selected' : ''}>${esc(r.name)}</option>`).join('');
    const cards = state.listings.map((l) => {
      const action = isOpen(l)
        ? `<button class="primary" data-action="claim" data-id="${l.id}">Claim</button>`
        : '';
      return listingCard(l, action);
    }).join('');
    return `
      <section class="card">
        <label>Claiming as
          <select id="receiver-select"><option value="">Choose a receiver&hellip;</option>${options}</select>
        </label>
        <span class="error" id="claim-msg"></span>
      </section>
      <div class="grid">${cards}</div>`;
  }

  function renderVolunteer() {
    const cards = state.listings
      .filter((l) => isOpen(l))
      .map((l) => {
        const action = l.volunteered
          ? ''
          : `<button class="primary" data-action="volunteer" data-id="${l.id}">Volunteer picking up</button>`;
        return listingCard(l, action);
      })
      .join('');
    return `<div class="grid">${cards || '<p>No open listings right now.</p>'}</div>`;
  }

  const VIEWS = { donor: renderDonor, receiver: renderReceiver, volunteer: renderVolunteer };

  function tickCountdowns() {
    const now = Date.now();
    document.querySelectorAll('[data-deadline]').forEach((el) => {
      const left = Number(el.dataset.deadline) - now;
      el.textContent = left <= 0 ? 'Pickup window closed' : formatLeft(left);
      el.classList.toggle('closed', left <= 0);
    });
  }

  function render() {
    document.querySelectorAll('.role-btn').forEach((b) => {
      const active = b.dataset.role === state.role;
      b.classList.toggle('active', active);
      b.setAttribute('aria-pressed', String(active));
    });
    view.innerHTML = VIEWS[state.role]();
    // One interval at a time: rebuild on every render so none leak.
    clearInterval(timer);
    tickCountdowns();
    timer = setInterval(tickCountdowns, 1000);
  }

  function handleDonorSubmit(form) {
    const data = new FormData(form);
    const foodType = data.get('foodType').trim();
    const quantity = Number(data.get('quantity'));
    const pickupValue = data.get('pickupBy');
    const pickupBy = new Date(pickupValue).getTime();

    const errors = {
      foodType: foodType ? '' : 'Food type is required.',
      quantity: quantity > 0 ? '' : 'Quantity must be greater than 0.',
      pickupBy: pickupValue && !Number.isNaN(pickupBy) ? '' : 'Pickup-by time is required.',
    };
    let valid = true;
    form.querySelectorAll('[data-error]').forEach((el) => {
      const message = errors[el.dataset.error];
      el.textContent = message;
      if (message) valid = false;
    });
    if (!valid) return;

    const allergens = data.getAll('allergens');
    state.listings.push({
      id: state.nextId++,
      donorId: Number(data.get('donorId')),
      foodType,
      quantity,
      unit: data.get('unit'),
      pickupBy,
      allergens: allergens.length ? allergens : ['none'],
      storageNote: data.get('storageNote').trim(),
      claimedBy: null,
      volunteered: false,
    });
    render();
  }

  document.querySelector('.roles').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-role]');
    if (!btn) return;
    state.role = btn.dataset.role;
    render();
  });

  view.addEventListener('submit', (e) => {
    if (e.target.id !== 'donor-form') return;
    e.preventDefault();
    handleDonorSubmit(e.target);
  });

  view.addEventListener('change', (e) => {
    if (e.target.id === 'receiver-select') {
      state.receiverId = Number(e.target.value) || null;
    }
  });

  view.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;
    const listing = findById(state.listings, Number(btn.dataset.id));
    if (!listing) return;

    if (btn.dataset.action === 'claim') {
      const msg = document.getElementById('claim-msg');
      if (!state.receiverId) {
        msg.textContent = 'Choose a receiver first.';
        return;
      }
      listing.claimedBy = state.receiverId;
    } else if (btn.dataset.action === 'volunteer') {
      listing.volunteered = true;
    }
    render();
  });

  render();
