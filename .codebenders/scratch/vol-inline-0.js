
  // ---- Smart matching settings: edit these to tune the scoring ----
  // Weight of each score component (0..1). The four weights must sum to 1.
  const WEIGHTS = { distance: 0.35, fit: 0.25, time: 0.20, need: 0.20 };
  // Distance at or beyond this many km scores 0 on distance.
  const MAX_DISTANCE_KM = 10;
  // Converts one grid unit (the x/y coordinates in DONORS and RECEIVERS) to km.
  // The grid is about 8 x 7 units, so 1.2 km per unit makes the city roughly 10 km across.
  const KM_PER_GRID_UNIT = 1.2;
  // Travel speed used to estimate travel minutes from distance.
  const SPEED_KMH = 20;

  // Hours left at or above this value earn full time points.
  const TIME_FULL_SCORE_HOURS = 6;
  // Number of top-scoring receivers shown on each open listing.
  const TOP_MATCH_COUNT = 3;
  // Impact tab conversion factors. Placeholders: replace with sourced figures.
  const IMPACT_ASSUMPTIONS = { kgPerMeal: 0.42, co2PerKg: 4.0 };
  // Business Case tab: illustrative unit-economics defaults. All are assumptions.
  // Platform cost and coordinator salary are placeholders, not sourced figures.
  const BUSINESS_INPUTS = {
    payingDonors: 20,
    monthlyFee: 1500,
    sponsorPerMeal: 4,
    sponsoredShare: 50,
    cityGrantMonthly: 0,
    platformCostMonthly: 8000,
    coordinatorSalaryMonthly: 15000,
    logisticsPerMeal: 2,
    listingsPerWeek: 3,
    mealsPerListing: 40,
  };
  const WEEKS_PER_MONTH = 4.33;

  const HOUR = 60 * 60 * 1000;
  const MIN = 60 * 1000;
  const ALLERGENS = ['nuts', 'dairy', 'gluten', 'eggs', 'soy', 'none'];
  // Food categories and their default consume-within hours. The donor can edit the hours after a category is chosen.
  const FOOD_CATEGORIES = { 'Cooked food': 4, 'Dry or packaged': 24 };
  // Listing status flow: posted -> claimed -> collected -> delivered ('expired' is derived, never stored).
  const STEPS = ['posted', 'claimed', 'collected', 'delivered'];
  const STATUS_LABELS = { posted: 'Posted', claimed: 'Claimed', collected: 'Collected', delivered: 'Delivered', expired: 'Expired' };
  // Volunteer actions: the listing status each one requires and sets.
  const VOLUNTEER_ACTIONS = {
    collect: { from: 'claimed', to: 'collected', label: 'Mark collected' },
    deliver: { from: 'collected', to: 'delivered', label: 'Mark delivered' },
  };

  // Scores one receiver for one listing. Each component is 0..1; points are rounded per component
  // and the total is the sum of those rounded points, so the displayed parts add up to the score.
  function scoreMatch(listing, receiver) {
    const donor = DONORS.find((d) => d.id === listing.donorId);
    const dx = donor.location.x - receiver.location.x;
    const dy = donor.location.y - receiver.location.y;
    const dKm = Math.sqrt(dx * dx + dy * dy) * KM_PER_GRID_UNIT;
    const travelMinutes = (dKm / SPEED_KMH) * 60;
    const distanceScore = Math.max(0, 1 - dKm / MAX_DISTANCE_KM);

    // kg listings convert to meals using the Impact assumption (single source of truth).
    const listingMeals = listing.unit === 'kg' ? listing.quantity / IMPACT_ASSUMPTIONS.kgPerMeal : listing.quantity;
    const fitScore = Math.min(listingMeals, receiver.capacity) / Math.max(listingMeals, receiver.capacity);

    const msLeft = listing.pickupBy - Date.now();
    const minutesLeft = msLeft / MIN;
    const hoursLeft = msLeft / HOUR;
    const timeScore = Math.min(1, Math.max(0, hoursLeft / TIME_FULL_SCORE_HOURS));

    const needScore = (receiver.need - 1) / 4;

    const parts = [
      { label: 'Distance', weight: WEIGHTS.distance, score: distanceScore },
      { label: 'Quantity fit', weight: WEIGHTS.fit, score: fitScore },
      { label: 'Time', weight: WEIGHTS.time, score: timeScore },
      { label: 'Need', weight: WEIGHTS.need, score: needScore },
    ].map((c) => ({
      label: c.label,
      points: Math.round(100 * c.weight * c.score),
      max: Math.round(100 * c.weight),
    }));
    const score = Math.min(100, Math.max(0, parts.reduce((sum, p) => sum + p.points, 0)));
    return { receiver, score, dKm, listingMeals, hoursLeft, minutesLeft, travelMinutes, parts };
  }


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
    { id: 1, name: 'Hope Foundation', kind: 'NGO', location: { grid: 'A1', x: 1, y: 1 }, capacity: 60, need: 5 },
    { id: 2, name: 'Annadaan Community Kitchen', kind: 'Community kitchen', location: { grid: 'B3', x: 2, y: 3 }, capacity: 120, need: 4 },
    { id: 3, name: 'Sahyog Trust', kind: 'NGO', location: { grid: 'E7', x: 5, y: 7 }, capacity: 25, need: 3 },
    { id: 4, name: 'Nanhe Kadam Kitchen', kind: 'Community kitchen', location: { grid: 'G2', x: 7, y: 2 }, capacity: 90, need: 2 },
    { id: 5, name: 'Asha Seva Samiti', kind: 'NGO', location: { grid: 'H5', x: 8, y: 5 }, capacity: 40, need: 1 },
  ];

  // Sample volunteers for the "Volunteering as" selector.
  const VOLUNTEERS = [
    { id: 1, name: 'Asha Menon' },
    { id: 2, name: 'Rohan Iyer' },
    { id: 3, name: 'Meera Kapoor' },
    { id: 4, name: 'Vikram Shah' },
  ];

  // Pickup times are offsets from Date.now() at load; negative = already past.
  function sampleListings() {
    const now = Date.now();
    const spec = [
      { donorId: 1, foodType: 'Paneer tikka & naan', quantity: 40, unit: 'meals', offset: 150 * MIN, allergens: ['dairy', 'gluten'], storageNote: 'Hot-held in chafing dishes', category: 'Cooked food' },
      { donorId: 2, foodType: 'Dal, rice & salad', quantity: 25, unit: 'kg', offset: 165 * MIN, allergens: ['none'], storageNote: 'Sealed steel containers, keep covered', category: 'Cooked food' },
      { donorId: 3, foodType: 'Vegetable biryani', quantity: 60, unit: 'meals', offset: 75 * MIN, allergens: ['dairy'], storageNote: 'Foil trays, refrigerate on arrival', category: 'Cooked food' },
      { donorId: 4, foodType: 'Mithai sweets box', quantity: 10, unit: 'kg', offset: 3 * HOUR, allergens: ['dairy', 'nuts'], storageNote: 'Boxed, room temperature is fine', category: 'Dry or packaged' },
      { donorId: 5, foodType: 'Bread rolls & butter', quantity: 30, unit: 'meals', offset: 23 * HOUR, allergens: ['gluten', 'dairy'], storageNote: 'Wrapped, no refrigeration needed', category: 'Dry or packaged' },
      { donorId: 6, foodType: 'Samosas & chutney', quantity: 50, unit: 'meals', offset: -15 * MIN, allergens: ['gluten'], storageNote: 'Fried snacks, best eaten same day', category: 'Cooked food' },
      { donorId: 1, foodType: 'Fresh fruit platter', quantity: 8, unit: 'kg', offset: 140 * MIN, allergens: ['none'], storageNote: 'Keep chilled', category: 'Cooked food' },
      { donorId: 5, foodType: 'Egg fried rice & soup', quantity: 35, unit: 'meals', offset: 135 * MIN, allergens: ['eggs', 'soy'], storageNote: 'Hot packs in bag', category: 'Cooked food' },
    ];
    const claimedPostedAt = now - 40 * MIN;
    const claimedReceiverName = RECEIVERS.find((r) => r.id === 1).name;
    return spec.map((s, i) => ({
      id: i + 1,
      donorId: s.donorId,
      foodType: s.foodType,
      quantity: s.quantity,
      unit: s.unit,
      pickupBy: now + s.offset,
      allergens: s.allergens,
      storageNote: s.storageNote,
      foodCategory: s.category,
      consumeWithinHours: FOOD_CATEGORIES[s.category],
      status: 'posted',
      sample: true,
      history: [],
      postedAt: now - (10 + i * 5) * MIN,
    })).concat([{
      id: 19,
      donorId: 1,
      foodType: 'Veg biryani',
      quantity: 30,
      unit: 'meals',
      pickupBy: claimedPostedAt + 150 * MIN,
      allergens: ['none'],
      storageNote: 'Hot-held in chafing dishes; refrigerate on receipt',
      foodCategory: 'Cooked food',
      consumeWithinHours: 4,
      status: 'claimed',
      sample: true,
      postedAt: claimedPostedAt,
      history: [
        { step: 'claimed', by: claimedReceiverName, at: claimedPostedAt + 20 * MIN },
      ],
    }]);
  }

  // Ten delivered sample listings from the last 30 days, with history. Ids 9-18.
  function sampleDeliveredListings() {
    const now = Date.now();
    const DAY = 24 * HOUR;
    // [donorId, foodType, quantity, unit, daysAgo, receiverId, volunteerId, allergens, storageNote, foodCategory]
    const spec = [
      [1, 'Paneer tikka & naan', 20, 'meals', 26, 2, 1, ['dairy', 'gluten'], 'Hot-held in chafing dishes', 'Cooked food'],
      [2, 'Dal, rice & salad', 20, 'kg', 23, 1, 2, ['none'], 'Sealed steel containers, keep covered', 'Cooked food'],
      [3, 'Vegetable biryani', 25, 'meals', 19, 3, 3, ['dairy'], 'Foil trays, refrigerated', 'Cooked food'],
      [4, 'Mithai sweets box', 15, 'kg', 16, 4, 4, ['dairy', 'nuts'], 'Boxed, room temperature', 'Dry or packaged'],
      [5, 'Bread rolls & butter', 30, 'meals', 12, 5, 1, ['gluten', 'dairy'], 'Wrapped, no refrigeration needed', 'Dry or packaged'],
      [6, 'Samosas & chutney', 12, 'kg', 9, 2, 2, ['gluten'], 'Fried snacks, eaten same day', 'Cooked food'],
      [1, 'Fresh fruit platter', 25, 'meals', 6, 1, 3, ['none'], 'Keep chilled', 'Cooked food'],
      [3, 'Mixed veg curry', 13, 'kg', 4, 3, 4, ['none'], 'Keep covered', 'Cooked food'],
      [5, 'Egg fried rice & soup', 35, 'meals', 3, 4, 1, ['eggs', 'soy'], 'Hot packs in bag', 'Cooked food'],
      [6, 'Chole bhature', 20, 'meals', 1, 5, 2, ['gluten', 'dairy'], 'Foil trays, refrigerate on arrival', 'Cooked food'],
    ];
    return spec.map((s, i) => {
      const [donorId, foodType, quantity, unit, daysAgo, receiverId, volunteerId, allergens, storageNote, category] = s;
      const deliveredAt = now - daysAgo * DAY;
      // Timeline offsets from posting: claimed +20 min, collected +45 min, delivered +80 min.
      const postedAt = deliveredAt - 80 * MIN;
      const receiverName = RECEIVERS.find((r) => r.id === receiverId).name;
      const volunteerName = VOLUNTEERS.find((v) => v.id === volunteerId).name;
      return {
        id: 9 + i,
        donorId,
        foodType,
        quantity,
        unit,
        pickupBy: deliveredAt - HOUR,
        allergens,
        storageNote,
        foodCategory: category,
        consumeWithinHours: FOOD_CATEGORIES[category],
        status: 'delivered',
        sample: true,
        postedAt,
        history: [
          { step: 'claimed', by: receiverName, at: postedAt + 20 * MIN },
          { step: 'collected', by: volunteerName, at: postedAt + 45 * MIN },
          { step: 'delivered', by: volunteerName, at: deliveredAt },
        ],
      };
    });
  }

  const state = {
    role: 'donor',
    listings: sampleListings().concat(sampleDeliveredListings()),
    nextId: 20,
    receiverId: null,
    volunteerId: null,
  };

  const view = document.getElementById('view');
  let timer = null;

  const esc = (value) => String(value)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  const pad = (n) => String(n).padStart(2, '0');
  const findById = (list, id) => list.find((item) => item.id === id);
  const fmtLoc = (loc) => `Grid ${loc.grid} (x ${loc.x}, y ${loc.y})`;
  const isOpen = (l) => l.status === 'posted' && l.pickupBy > Date.now();
  // Derived display state: a posted listing past pickup time shows as expired (status is not changed).
  const displayStatus = (l) => (l.status === 'posted' && l.pickupBy <= Date.now() ? 'expired' : l.status);

  function formatLeft(ms) {
    const totalSec = Math.floor(ms / 1000);
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    return `${h}h ${pad(m)}m ${pad(s)}s left`;
  }

  function badgeHtml(l) {
    const s = displayStatus(l);
    return `<span class="badge ${s}">${STATUS_LABELS[s]}</span>`;
  }

  // Ordered steps with time and name; steps not yet reached show as pending.
  function timelineHtml(l) {
    const donor = findById(DONORS, l.donorId);
    const reached = { posted: { at: l.postedAt, by: donor.name } };
    l.history.forEach((h) => { reached[h.step] = h; });
    const items = STEPS.map((step) => {
      const r = reached[step];
      if (!r) return `<li class="pending">${STATUS_LABELS[step]}</li>`;
      const time = new Date(r.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      return `<li>${STATUS_LABELS[step]} &middot; ${esc(time)} &middot; ${esc(r.by)}</li>`;
    }).join('');
    return `<ol class="timeline">${items}</ol>`;
  }

  function formatHoursLeft(hours) {
    return hours < 1 ? `${Math.floor(hours * 60)}m left` : `${Math.floor(hours)}h left`;
  }

  // Top-scoring receivers for an open listing, rendered as a small block.
  // Receivers who cannot arrive before pickup-by (travel time > time left) are excluded before taking the top matches.
  function matchesHtml(l) {
    const ranked = RECEIVERS.map((r) => scoreMatch(l, r))
      .filter((m) => m.travelMinutes <= m.minutesLeft)
      .sort((a, b) => b.score - a.score)
      .slice(0, TOP_MATCH_COUNT);
    const items = ranked.map((m) => {
      const total = Math.round(m.listingMeals);
      const canTake = Math.floor(Math.min(m.receiver.capacity, m.listingMeals));
      const reason = `${m.dKm.toFixed(1)} km (${Math.round(m.travelMinutes)} min travel), can take ${canTake} of ${total} meals, ${formatHoursLeft(m.hoursLeft)}`;
      const why = m.parts.map((p) => `<li>${p.label} ${p.points}/${p.max}</li>`).join('');
      return `<li><strong>${esc(m.receiver.name)}</strong> &middot; ${m.score}/100<br><small>${esc(reason)}</small>
          <details><summary>Why this score</summary><ul>${why}</ul></details></li>`;
    }).join('');
    const body = items
      ? `<ol>${items}</ol>`
      : '<p>No receiver can arrive before pickup-by</p>';
    return `
      <div class="matches" data-match-until="${l.pickupBy}">
        <p><strong>Top matches</strong></p>
        ${body}
      </div>`;
  }


  // Safety box for every listing card: consume-within window, storage, allergens, and an amber warning
  // when less than 1 hour of the window remains at pickup-by.
  function safetyHtml(l) {
    const eatBy = (l.postedAt ?? l.pickupBy) + l.consumeWithinHours * HOUR;
    const remainingHours = (eatBy - l.pickupBy) / HOUR;
    const eatByText = new Date(eatBy).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const named = l.allergens.filter((a) => a !== 'none');
    const allergenLine = named.length
      ? `Allergen warning: contains ${named.map(esc).join(', ')}. Check with the donor.`
      : 'Allergen warning: none declared by donor. Check with the donor.';
    // Amber warning only while the listing is still open (posted, claimed or collected), never on delivered or expired ones.
    const isOpenStatus = ['posted', 'claimed', 'collected'].includes(displayStatus(l));
    const warning = isOpenStatus && remainingHours < 1
      ? '<p class="safety-warning">Eat-by time is earlier than the pickup deadline. Collect sooner.</p>'
      : '';
    return `
        <div class="safety-box">
          <p><strong>Consume within: ${esc(l.consumeWithinHours)} hours</strong> (eat by ${esc(eatByText)})</p>
          <p>Storage: ${esc(l.storageNote || 'not stated by donor')}</p>
          <p>${allergenLine}</p>
          ${warning}
        </div>`;
  }

  function listingCard(l, actionHtml) {
    const donor = findById(DONORS, l.donorId);
    // Matches only for open listings; closed or claimed ones show none.
    const matches = isOpen(l) ? matchesHtml(l) : '';
    return `
      <article class="card">
        ${badgeHtml(l)}${l.sample ? '<span class="sample-tag">sample</span>' : ''}
        <h3>${esc(l.foodType)} &mdash; ${esc(l.quantity)} ${esc(l.unit)}</h3>
        <p>From ${esc(donor.name)} (${esc(donor.kind)})</p>
        <p>${esc(fmtLoc(donor.location))}</p>
        ${safetyHtml(l)}
        <p>Pickup by ${esc(new Date(l.pickupBy).toLocaleString())}</p>
        <p><span class="countdown" data-deadline="${l.pickupBy}"></span></p>
        ${timelineHtml(l)}
        ${matches}
        ${actionHtml}
      </article>`;
  }

  function renderDonor() {
    const donorOptions = DONORS.map((d) => `<option value="${d.id}">${esc(d.name)}</option>`).join('');
    const allergenBoxes = ALLERGENS.map((a) => `<label><input type="checkbox" name="allergens" value="${a}"> ${a}</label>`).join('');
    const categoryOptions = Object.keys(FOOD_CATEGORIES).map((c) => `<option value="${esc(c)}">${esc(c)}</option>`).join('');
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
          <div class="row">
            <label>Food category
              <select name="foodCategory">${categoryOptions}</select>
            </label>
            <label>Consume within (hours)
              <input type="number" name="consumeWithinHours" min="1" step="any" value="${FOOD_CATEGORIES['Cooked food']}">
              <span class="error" data-error="consumeWithinHours"></span>
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
    const cards = state.listings.filter((l) => l.status !== 'delivered').map((l) => {
      const action = isOpen(l)
        ? `<button class="primary" data-action="claim" data-id="${l.id}">Claim</button><span class="error" data-msg-for="${l.id}"></span>`
        : '';
      return listingCard(l, action);
    }).join('');
    const doneCards = state.listings.filter((l) => l.status === 'delivered').map((l) => listingCard(l, '')).join('');
    return `
      <section class="card">
        <label>Claiming as
          <select id="receiver-select"><option value="">Choose a receiver&hellip;</option>${options}</select>
        </label>
      </section>
      <div class="grid">${cards}</div>
      <details class="completed"><summary>Completed (sample data)</summary><div class="grid">${doneCards || '<p>No completed listings yet.</p>'}</div></details>`;
  }

  function renderVolunteer() {
    const volOptions = VOLUNTEERS.map((v) => `<option value="${v.id}"${v.id === state.volunteerId ? ' selected' : ''}>${esc(v.name)}</option>`).join('');
    const cards = state.listings
      .filter((l) => l.status === 'claimed' || l.status === 'collected')
      .map((l) => {
        const action = Object.keys(VOLUNTEER_ACTIONS).find((k) => VOLUNTEER_ACTIONS[k].from === l.status);
        const button = action
          ? `<button class="primary" data-action="${action}" data-id="${l.id}">${VOLUNTEER_ACTIONS[action].label}</button><span class="error" data-msg-for="${l.id}"></span>`
          : '';
        return listingCard(l, button);
      })
      .join('');
    const doneCards = state.listings.filter((l) => l.status === 'delivered').map((l) => listingCard(l, '')).join('');
    return `
      <section class="card">
        <label>Volunteering as
          <select id="volunteer-select"><option value="">Choose a volunteer&hellip;</option>${volOptions}</select>
        </label>
      </section>
      <div class="grid">${cards || '<p>No listings ready. Claim one in the Receiver view.</p>'}</div>
      <details class="completed"><summary>Completed (sample data)</summary><div class="grid">${doneCards || '<p>No completed listings yet.</p>'}</div></details>`;
  }

  // ---- Impact tab: only status 'delivered' counts. kg listings convert to meals; meal listings convert to kg. ----
  const deliveredMeals = (l) => (l.unit === 'kg' ? l.quantity / IMPACT_ASSUMPTIONS.kgPerMeal : l.quantity);
  const fmt1 = (n) => n.toFixed(1);

  function impactTotals() {
    const { kgPerMeal, co2PerKg } = IMPACT_ASSUMPTIONS;
    const delivered = state.listings.filter((l) => l.status === 'delivered');
    const mealListed = delivered.filter((l) => l.unit !== 'kg').reduce((sum, l) => sum + l.quantity, 0);
    const kgListed = delivered.filter((l) => l.unit === 'kg').reduce((sum, l) => sum + l.quantity, 0);
    const meals = mealListed + kgListed / kgPerMeal;
    const foodKg = mealListed * kgPerMeal + kgListed;
    const co2 = foodKg * co2PerKg;
    return { mealListed, kgListed, meals, foodKg, co2 };
  }

  // Big numbers with plain-words formulas. Rendered into #impact-results so input changes can refresh only this part.
  function impactResultsHtml() {
    const t = impactTotals();
    const { kgPerMeal, co2PerKg } = IMPACT_ASSUMPTIONS;
    const mealsRounded = Math.round(t.meals);
    return `
      <div class="impact-numbers">
        <div class="card">
          <p class="big">${mealsRounded}</p>
          <p><strong>Meals saved</strong></p>
          <p class="formula">${Math.round(t.mealListed)} meals + ${fmt1(t.kgListed)} kg / ${kgPerMeal} kg per meal = ${mealsRounded} meals</p>
        </div>
        <div class="card">
          <p class="big">${fmt1(t.foodKg)}</p>
          <p><strong>Food rescued (kg)</strong></p>
          <p class="formula">${Math.round(t.mealListed)} meals x ${kgPerMeal} kg + ${fmt1(t.kgListed)} kg = ${fmt1(t.foodKg)} kg</p>
        </div>
        <div class="card">
          <p class="big">${fmt1(t.co2)}</p>
          <p><strong>CO2e avoided (kg)</strong></p>
          <p class="formula">${fmt1(t.foodKg)} kg x ${co2PerKg} = ${fmt1(t.co2)} kg CO2e</p>
        </div>
      </div>
      ${weeklyBarsHtml(t.meals)}`;
  }

  // Largest-remainder rounding: integers that sum exactly to the rounded total.
  function roundToTotal(values, total) {
    const floors = values.map((v) => Math.floor(v));
    let remaining = Math.round(total) - floors.reduce((a, b) => a + b, 0);
    const order = values
      .map((v, i) => ({ i, rem: v - floors[i] }))
      .sort((a, b) => b.rem - a.rem || a.i - b.i);
    for (let k = 0; k < order.length && k < remaining; k++) {
      floors[order[k].i] += 1;
    }
    return floors;
  }

  // Meals saved per week, covering every delivered listing (weeks run back from now to the oldest delivery).
  // Bar labels are rounded with roundToTotal so they sum to the Meals saved summary.
  function weeklyBarsHtml(totalMeals) {
    const now = Date.now();
    const WEEK = 7 * 24 * HOUR;
    const deliveries = state.listings
      .filter((l) => l.status === 'delivered')
      .map((l) => ({ l, entry: l.history.find((h) => h.step === 'delivered') }))
      .filter((d) => d.entry);
    const weeks = deliveries.length
      ? Math.floor((now - Math.min(...deliveries.map((d) => d.entry.at))) / WEEK) + 1
      : 1;
    const buckets = new Array(weeks).fill(0);
    deliveries.forEach(({ l, entry }) => {
      const weeksAgo = Math.floor((now - entry.at) / WEEK);
      buckets[weeks - 1 - weeksAgo] += deliveredMeals(l);
    });
    const shown = roundToTotal(buckets, totalMeals);
    const max = Math.max(...buckets);
    const bars = buckets.map((v, i) => {
      const pct = max > 0 ? (v / max) * 100 : 0;
      const weeksAgo = weeks - 1 - i;
      const label = weeksAgo === 0 ? 'This week' : weeksAgo === 1 ? '1 wk ago' : `${weeksAgo} wks ago`;
      return `<div class="bar-col"><span>${shown[i]}</span><div class="bar-track"><div class="bar" style="height:${pct}%"></div></div><span>${label}</span></div>`;
    }).join('');
    return `
      <section class="card">
        <h3>Meals saved per week (all delivered listings)</h3>
        <div class="bars">${bars}</div>
      </section>`;
  }


  function renderImpact() {
    const { kgPerMeal, co2PerKg } = IMPACT_ASSUMPTIONS;
    return `
      <section class="card">
        <h2>Assumptions</h2>
        <div class="assumption">
          <label>Kg of food per meal
            <input type="number" step="any" min="0" value="${kgPerMeal}" data-assumption="kgPerMeal">
          </label>
          <p class="note">Source: WRAP meal conversion, 420 g per meal. Indicative; actual meal weights vary.</p>
        </div>
        <div class="assumption">
          <label>Kg CO2e avoided per kg of food rescued
            <input type="number" step="any" min="0" value="${co2PerKg}" data-assumption="co2PerKg">
          </label>
          <p class="note">Source: WRAP via UK Government Office for Science: about 4 kg CO2e avoided per kg of food waste prevented. UK average, indicative for India; varies by food type.</p>
        </div>
      </section>
      <div id="impact-results">${impactResultsHtml()}</div>
      <p class="note">Includes 10 sample past deliveries for illustration</p>
      <p class="note">Estimates based on the assumptions above; not verified measurements.</p>
      <section class="card">
        <h2>Sources</h2>
        <ul>
          <li>Source: WRAP meal conversion, 420 g per meal. Indicative; actual meal weights vary.</li>
          <li>Source: WRAP via UK Government Office for Science: about 4 kg CO2e avoided per kg of food waste prevented. UK average, indicative for India; varies by food type.</li>
        </ul>
      </section>`;
  }

  // ---- Business Case tab: every figure is an assumption. Results re-render only into #business-results. ----
  // City name shown in section 1. Set by the city input; kept when switching tabs.
  let businessCity = 'Hyderabad';
  const bizValue = (key) => Math.max(0, Number(BUSINESS_INPUTS[key]) || 0);
  const rupees = (n) => `${n < 0 ? '-' : ''}₹${Math.abs(Math.round(n)).toLocaleString('en-IN')}`;
  const count = (n) => Math.round(n).toLocaleString('en-IN');

  // All monthly figures in one place, so every card uses the same numbers.
  function businessModel() {
    const donors = bizValue('payingDonors');
    const fee = bizValue('monthlyFee');
    const perWeek = bizValue('listingsPerWeek');
    const perListing = bizValue('mealsPerListing');
    const sponsorPer = bizValue('sponsorPerMeal');
    const sharePct = Math.min(100, bizValue('sponsoredShare'));
    const grant = bizValue('cityGrantMonthly');
    const platform = bizValue('platformCostMonthly');
    const coordinator = bizValue('coordinatorSalaryMonthly');
    const logisticsPer = bizValue('logisticsPerMeal');

    // Meals rescued per month. All rescued meals are assumed delivered, so delivered meals = meals.
    const meals = Math.round(donors * perWeek * WEEKS_PER_MONTH * perListing);
    const subs = donors * fee;
    const sponsored = Math.round(meals * (sharePct / 100) * sponsorPer);
    const revenue = subs + sponsored + grant;
    const logistics = Math.round(meals * logisticsPer);
    const costs = platform + coordinator + logistics;
    const profit = revenue - costs;

    // Break-even: contribution per paying donor per month, and the fixed monthly amount left after the city grant.
    const contribution = fee + perWeek * WEEKS_PER_MONTH * perListing * ((sharePct / 100) * sponsorPer - logisticsPer);
    const fixed = platform + coordinator - grant;
    let breakEven = null; // null = not reachable at these inputs
    if (fixed <= 0) breakEven = 0;
    else if (contribution > 0) breakEven = Math.ceil(fixed / contribution);

    return {
      donors, fee, perWeek, perListing, sponsorPer, sharePct, grant, platform, coordinator, logisticsPer,
      meals, subs, sponsored, revenue, logistics, costs, profit, contribution, fixed, breakEven,
    };
  }

  function businessResultsHtml() {
    const b = businessModel();
    // Exactly zero counts as profit (green); only a value below zero is amber.
    const profitClass = b.profit >= 0 ? 'profit-positive' : 'profit-negative';
    let breakEvenText;
    let breakEvenFormula;
    if (b.breakEven === null) {
      breakEvenText = 'Break-even not reachable at these inputs (each donor adds no positive contribution)';
      breakEvenFormula = 'contribution per donor is zero or negative, so fixed costs are never covered';
    } else {
      breakEvenText = `Break-even needs ${b.breakEven} paying ${b.breakEven === 1 ? 'donor' : 'donors'}`;
      breakEvenFormula = b.breakEven === 0
        ? 'platform and coordinator costs are covered by the city grant'
        : `fixed monthly amount ${rupees(b.fixed)} / contribution per donor ${rupees(b.contribution)}, rounded up`;
    }
    return `
      <div class="impact-numbers">
        <div class="card">
          <p class="big">${count(b.meals)}</p>
          <p><strong>Meals rescued per month (assumption)</strong></p>
          <p class="formula">${count(b.donors)} donors x ${esc(b.perWeek)} listings x ${WEEKS_PER_MONTH} weeks x ${esc(b.perListing)} meals = ${count(b.meals)} meals per month</p>
          <p class="note">All rescued meals are assumed delivered, so delivered meals = ${count(b.meals)}.</p>
        </div>
        <div class="card">
          <p class="big">${rupees(b.subs)}</p>
          <p><strong>Donor subscriptions per month (assumption)</strong></p>
          <p class="formula">${count(b.donors)} donors x ${rupees(b.fee)} = ${rupees(b.subs)}</p>
        </div>
        <div class="card">
          <p class="big">${rupees(b.sponsored)}</p>
          <p><strong>CSR sponsorship per month (assumption)</strong></p>
          <p class="formula">${count(b.meals)} meals x ${esc(b.sharePct)}% sponsored x ${rupees(b.sponsorPer)} = ${rupees(b.sponsored)}</p>
        </div>
        <div class="card">
          <p class="big">${rupees(b.grant)}</p>
          <p><strong>City grant per month (assumption)</strong></p>
          <p class="formula">city grant input = ${rupees(b.grant)}</p>
        </div>
        <div class="card">
          <p class="big">${rupees(b.revenue)}</p>
          <p><strong>Total revenue per month (assumption)</strong></p>
          <p class="formula">${rupees(b.subs)} + ${rupees(b.sponsored)} + ${rupees(b.grant)} = ${rupees(b.revenue)}</p>
        </div>
        <div class="card">
          <p class="big">${rupees(b.platform)}</p>
          <p><strong>Platform and hosting per month (assumption)</strong></p>
          <p class="formula">platform and hosting input = ${rupees(b.platform)}</p>
        </div>
        <div class="card">
          <p class="big">${rupees(b.coordinator)}</p>
          <p><strong>Coordinator salary per month (assumption)</strong></p>
          <p class="formula">coordinator salary input = ${rupees(b.coordinator)}</p>
        </div>
        <div class="card">
          <p class="big">${rupees(b.logistics)}</p>
          <p><strong>Volunteer logistics per month (assumption)</strong></p>
          <p class="formula">${count(b.meals)} meals x ${rupees(b.logisticsPer)} = ${rupees(b.logistics)}</p>
        </div>
        <div class="card">
          <p class="big">${rupees(b.costs)}</p>
          <p><strong>Total costs per month (assumption)</strong></p>
          <p class="formula">${rupees(b.platform)} + ${rupees(b.coordinator)} + ${rupees(b.logistics)} = ${rupees(b.costs)}</p>
        </div>
        <div class="card">
          <p class="big ${profitClass}">${rupees(b.profit)}</p>
          <p><strong>Monthly profit or loss (assumption)</strong></p>
          <p class="formula">total revenue ${rupees(b.revenue)} minus total costs ${rupees(b.costs)} = ${rupees(b.profit)}</p>
        </div>
        <div class="card">
          <p><strong>${esc(breakEvenText)}</strong></p>
          <p class="formula">${esc(breakEvenFormula)}</p>
          <p class="note">Break-even (assumption)</p>
        </div>
      </div>`;
  }


  function renderBusiness() {
    const fields = [
      { key: 'payingDonors', label: 'Number of paying donors' },
      { key: 'monthlyFee', label: 'Monthly fee per donor (₹)' },
      { key: 'sponsorPerMeal', label: 'CSR sponsor payment per rescued meal (₹)' },
      { key: 'sponsoredShare', label: 'Share of rescued meals that are sponsored (%, 0 to 100)' },
      { key: 'cityGrantMonthly', label: 'City grant per month (₹, optional)' },
      { key: 'platformCostMonthly', label: 'Platform and hosting cost per month (₹, assumption)' },
      { key: 'coordinatorSalaryMonthly', label: 'Part-time coordinator salary per month (₹, assumption)' },
      { key: 'logisticsPerMeal', label: 'Volunteer logistics cost per delivered meal (₹)' },
      { key: 'listingsPerWeek', label: 'Listings per donor per week' },
      { key: 'mealsPerListing', label: 'Meals per listing (average)' },
    ];
    const inputs = fields.map((f) => `
          <div class="assumption">
            <label>${esc(f.label)}
              <input type="number" step="any" min="0"${f.key === 'sponsoredShare' ? ' max="100"' : ''} value="${esc(BUSINESS_INPUTS[f.key])}" data-business="${f.key}">
            </label>
            <p class="note">assumption</p>
          </div>`).join('');
    return `
      <p><strong>All figures on this tab are assumptions.</strong></p>

      <section class="card">
        <h2>1. Problem and starting point</h2>
        <p>Edible surplus from functions and events is thrown away while nearby NGOs and community kitchens go short of food.</p>
        <div class="assumption">
          <label>Starting city name
            <input type="text" value="${esc(businessCity)}" data-city>
          </label>
          <p class="note">assumption: enter your launch city name</p>
        </div>
        <p>Starting city: <span id="business-city">${esc(businessCity)}</span></p>
        <p>Starting donor type: wedding caterers and function halls only.</p>
        <p>Receivers: NGOs and community kitchens.</p>
      </section>

      <section class="card">
        <h2>2. Who pays and why</h2>
        <ul>
          <li>Donors (caterers, function halls) pay a monthly subscription for impact reports and listing tools.</li>
          <li>CSR sponsors fund meals rescued.</li>
          <li>City authorities fund city-wide coverage.</li>
        </ul>
      </section>

      <section class="card">
        <h2>3. Pricing (Illustrative)</h2>
        <table class="pricing">
          <caption>Illustrative</caption>
          <thead>
            <tr><th>Tier</th><th>Listings</th><th>Includes</th><th>Price</th></tr>
          </thead>
          <tbody>
            <tr><td>Free</td><td>4 listings per month</td><td>Impact summary, no sponsor reports</td><td>₹0 <span class="note">illustrative, assumption</span></td></tr>
            <tr><td>Standard</td><td>20 listings per month</td><td>Full impact reports, matching</td><td>₹1,500 per month <span class="note">illustrative, assumption</span></td></tr>
            <tr><td>Premium</td><td>Unlimited listings</td><td>Sponsor-ready impact reports, priority matching</td><td>₹4,000 per month <span class="note">illustrative, assumption</span></td></tr>
          </tbody>
        </table>
      </section>

      <section class="card">
        <h2>4. Unit economics</h2>
        <p class="note">Edit the inputs below. Each one is an assumption.</p>
        ${inputs}
        <p class="note">Weeks per month (constant): ${WEEKS_PER_MONTH}, assumption</p>
        <p class="note">Monthly profit or loss is green when zero or above, amber when below zero.</p>
      </section>
      <div id="business-results">${businessResultsHtml()}</div>

      <section class="card">
        <h2>5. Why a busy caterer uses it every week</h2>
        <ul>
          <li>Each leftover-food listing takes under a minute on the donor form.</li>
          <li>The countdown shows the pickup window.</li>
          <li>No phone calls needed.</li>
          <li>An impact summary for their CSR or client reports.</li>
          <li>Saves effort on disposal and gives clients a free impact report.</li>
        </ul>
      </section>

      <section class="card">
        <h2>6. Go-to-market plan</h2>
        <ul>
          <li><strong>First 10 donors:</strong> sign up 10 wedding caterers and function halls in the starting city, starting with those who already have a CSR or client reporting need.</li>
          <li><strong>How we reach them:</strong> visit or call, a 2-minute demo of the donor form, a free Free-tier trial for the first month, referrals from the first 3 donors.</li>
          <li><strong>What we measure (all targets are assumptions):</strong> listings posted per donor per week; percentage of listings claimed; median time from posting to claim; meals delivered per month; donor retention after 30 days.</li>
          <li>Months 1-3: grow from 10 to 16-20 paying donors through referrals and a second neighbourhood.</li>
        </ul>
      </section>

      <section class="card">
        <h2>7. Risks and limits</h2>
        <ul>
          <li>Food safety is the donor's and receiver's responsibility; the platform connects people and does not certify food safety.</li>
          <li>No tax or legal benefits are promised to any party.</li>
          <li>Sample data is fictional; figures are assumptions, not verified measurements.</li>
          <li>Coverage is limited to one city at the start.</li>
          <li>Depends on donor behaviour and volunteer availability.</li>
          <li>Profit depends on donor subscriptions; CSR funding covers delivery costs but adds no margin. A pilot will test whether donors will pay the monthly fee.</li>
        </ul>
      </section>`;
  }

  const VIEWS = { donor: renderDonor, receiver: renderReceiver, volunteer: renderVolunteer, impact: renderImpact, business: renderBusiness };

  function tickCountdowns() {
    const now = Date.now();
    // Drop match blocks once their pickup window has passed, without a full re-render.
    document.querySelectorAll('[data-match-until]').forEach((el) => {
      if (Number(el.dataset.matchUntil) <= now) el.remove();
    });
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
    const consumeWithin = Number(data.get('consumeWithinHours'));
    // Posting time is now, so the eat-by time is now plus the consume-within hours.
    const eatBy = Date.now() + consumeWithin * HOUR;

    const errors = {
      foodType: foodType ? '' : 'Food type is required.',
      quantity: quantity > 0 ? '' : 'Quantity must be greater than 0.',
      consumeWithinHours: consumeWithin > 0 ? '' : 'Consume-within hours must be greater than 0.',
      pickupBy: !pickupValue || Number.isNaN(pickupBy) ? 'Pickup-by time is required.'
        : consumeWithin > 0 && pickupBy > eatBy
          ? 'Pickup-by time must be no later than the eat-by time (posted time plus consume-within hours). Choose an earlier pickup-by time, or a food category with a longer window.'
          : '',
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
      foodCategory: data.get('foodCategory'),
      consumeWithinHours: consumeWithin,
      status: 'posted',
      history: [],
      postedAt: Date.now(),
    });
    saveState();
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
    // Choosing a food category sets the consume-within hours to that category's default; the donor may edit them.
    if (e.target.name === 'foodCategory') {
      e.target.form.elements.consumeWithinHours.value = FOOD_CATEGORIES[e.target.value];
    }
    if (e.target.id === 'receiver-select') {
      state.receiverId = Number(e.target.value) || null;
    }
    if (e.target.id === 'volunteer-select') {
      state.volunteerId = Number(e.target.value) || null;
    }
  });

  // Assumption inputs: update only the results block so the input keeps focus.
  view.addEventListener('input', (e) => {
    // City name: updates only the city text in section 1; the input keeps focus.
    if (e.target.dataset.city !== undefined) {
      const cityChanged = businessCity !== e.target.value;
      businessCity = e.target.value;
      if (cityChanged) saveState();
      document.getElementById('business-city').textContent = businessCity || 'no city name';
      return;
    }
    const bizKey = e.target.dataset.business;
    if (bizKey) {
      // Blank or negative inputs count as 0 in the calculations; the typed value stays in the box.
      // sponsoredShare is clamped to 0-100 inside businessModel().
      const v = Number(e.target.value);
      const next = v > 0 ? v : 0;
      const changed = BUSINESS_INPUTS[bizKey] !== next;
      BUSINESS_INPUTS[bizKey] = next;
      if (changed) saveState();
      document.getElementById('business-results').innerHTML = businessResultsHtml();
      return;
    }
    const key = e.target.dataset.assumption;
    if (!key) return;
    const value = Number(e.target.value);
    if (!(value > 0)) return;
    const changed = IMPACT_ASSUMPTIONS[key] !== value;
    IMPACT_ASSUMPTIONS[key] = value;
    if (changed) saveState();
    document.getElementById('impact-results').innerHTML = impactResultsHtml();
  });

  view.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;
    const listing = findById(state.listings, Number(btn.dataset.id));
    if (!listing) return;
    const msg = view.querySelector(`[data-msg-for="${listing.id}"]`);

    if (btn.dataset.action === 'claim') {
      if (listing.status !== 'posted') {
        msg.textContent = 'This listing has already been claimed.';
        return;
      }
      if (!state.receiverId) {
        msg.textContent = "Choose a receiver in 'Claiming as' first.";
        return;
      }
      if (!isOpen(listing)) {
        msg.textContent = 'The pickup window has closed.';
        return;
      }
      listing.status = 'claimed';
      listing.history.push({ step: 'claimed', by: findById(RECEIVERS, state.receiverId).name, at: Date.now() });
    } else if (VOLUNTEER_ACTIONS[btn.dataset.action]) {
      const { from, to } = VOLUNTEER_ACTIONS[btn.dataset.action];
      if (!state.volunteerId) {
        msg.textContent = "Choose a volunteer in 'Volunteering as' first.";
        return;
      }
      if (listing.status !== from) {
        msg.textContent = 'This listing is not at the right step for that action.';
        return;
      }
      listing.status = to;
      listing.history.push({ step: to, by: findById(VOLUNTEERS, state.volunteerId).name, at: Date.now() });
    }
    saveState();
    render();
  });

  // ---- Persistence: listings, statuses, timelines, claims, volunteer actions, Impact assumptions, Business Case inputs and city. ----
  const STORAGE_KEY = 'rescueSurplus.v1';
  // Defaults copied before any saved state is loaded, so "Reset demo data" can restore them.
  const DEFAULT_IMPACT = { ...IMPACT_ASSUMPTIONS };
  const DEFAULT_BUSINESS = { ...BUSINESS_INPUTS };
  const DEFAULT_CITY = 'Hyderabad';

  const isNonNegNumber = (v) => typeof v === 'number' && Number.isFinite(v) && v >= 0;
  const isPositiveNumber = (v) => typeof v === 'number' && Number.isFinite(v) && v > 0;
  const isListingShape = (l) => !!l && typeof l === 'object'
    && Number.isFinite(l.id) && Number.isFinite(l.donorId) && typeof l.foodType === 'string'
    && Number.isFinite(l.quantity) && typeof l.unit === 'string' && Number.isFinite(l.pickupBy)
    && Number.isFinite(l.postedAt) && STEPS.includes(l.status)
    && Array.isArray(l.history) && Array.isArray(l.allergens);

  // Writes the persisted state. A failed write is logged and the app keeps working.
  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        listings: state.listings,
        nextId: state.nextId,
        impact: { kgPerMeal: IMPACT_ASSUMPTIONS.kgPerMeal, co2PerKg: IMPACT_ASSUMPTIONS.co2PerKg },
        business: { ...BUSINESS_INPUTS },
        businessCity,
      }));
    } catch (err) {
      console.warn('Rescue the Surplus: could not save state.', err);
    }
  }

  // Returns valid saved state, or null when nothing is saved, the data is malformed, or storage fails.
  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw === null) return null;
      const data = JSON.parse(raw);
      if (!data || typeof data !== 'object' || !Array.isArray(data.listings)) return null;
      if (!data.listings.every(isListingShape)) return null;
      if (!Number.isInteger(data.nextId) || data.nextId < 1) return null;
      const impact = data.impact;
      if (!impact || !isPositiveNumber(impact.kgPerMeal) || !isPositiveNumber(impact.co2PerKg)) return null;
      const business = data.business;
      if (!business || typeof business !== 'object') return null;
      const businessValues = {};
      for (const key of Object.keys(DEFAULT_BUSINESS)) {
        if (!isNonNegNumber(business[key])) return null;
        businessValues[key] = business[key];
      }
      if (typeof data.businessCity !== 'string') return null;
      const maxId = data.listings.reduce((m, l) => Math.max(m, l.id), 0);
      return {
        listings: data.listings,
        nextId: Math.max(data.nextId, maxId + 1),
        impact: { kgPerMeal: impact.kgPerMeal, co2PerKg: impact.co2PerKg },
        business: businessValues,
        businessCity: data.businessCity,
      };
    } catch (err) {
      console.warn('Rescue the Surplus: saved data could not be loaded; using sample data.', err);
      return null;
    }
  }

  // Objects are updated in place so existing references keep working.
  function applyState(saved) {
    state.listings = saved.listings;
    state.nextId = saved.nextId;
    Object.assign(IMPACT_ASSUMPTIONS, saved.impact);
    Object.assign(BUSINESS_INPUTS, saved.business);
    businessCity = saved.businessCity;
  }

  function resetDemoData() {
    if (!window.confirm('Clear all saved data and reload the sample data?')) return;
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (err) {
      console.warn('Rescue the Surplus: could not clear saved data.', err);
    }
    state.listings = sampleListings().concat(sampleDeliveredListings());
    state.nextId = 20;
    state.receiverId = null;
    state.volunteerId = null;
    Object.assign(IMPACT_ASSUMPTIONS, DEFAULT_IMPACT);
    Object.assign(BUSINESS_INPUTS, DEFAULT_BUSINESS);
    businessCity = DEFAULT_CITY;
    render();
  }

  document.getElementById('reset-demo').addEventListener('click', () => {
    resetDemoData();
  });

  // Replaces only the sample listings with fresh ones once every open sample has expired.
  function reseedSamplesIfExpired() {
    try {
      const samples = state.listings.filter((l) => l.sample === true && l.status === 'posted');
      if (samples.length === 0) return;
      if (samples.some((l) => l.pickupBy > Date.now())) return;
      const userListings = state.listings.filter((l) => l.sample !== true);
      const fresh = sampleListings().concat(sampleDeliveredListings());
      let nextId = state.nextId;
      for (const l of fresh) l.id = nextId++;
      state.listings = [...userListings, ...fresh];
      state.nextId = nextId;
      saveState();
    } catch (err) {
      console.warn('Rescue the Surplus: could not reseed expired sample listings.', err);
    }
  }

  const saved = loadState();
  if (saved) applyState(saved);
  reseedSamplesIfExpired();
  render();
