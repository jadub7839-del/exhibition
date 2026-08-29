 /* ============================================================
   ZAIQA MELA — Booking logic
   Single source of truth: CATEGORIES + AISLES drive the stall map,
   the category cards and the hero counters, so nothing can drift.
   ============================================================ */
(function () {
  "use strict";

  /* ---------------- Config ---------------- */

  // Set to 0 to remove the charge entirely — the fee row then hides itself
  // and the total equals the stall price.
  const SERVICE_FEE_RATE = 0.05;
  const EXPECTED_VISITORS = 15000;

  const CATEGORIES = {
    street:   { name: "Street food",           price: 45000, size: "6 × 6 ft",   colour: "#D9663A", desc: "Golgappay, chaat, rolls and fries. Compact high-turnover counters placed nearest the main entrance." },
    bbq:      { name: "BBQ & grill",           price: 65000, size: "8 × 8 ft",   colour: "#C1440E", desc: "Seekh kebab, tikka and malai boti counters with dedicated ventilation and a gas cylinder point." },
    sweets:   { name: "Desserts & mithai",     price: 40000, size: "6 × 6 ft",   colour: "#E9A13B", desc: "Kheer, halwa, jalebi and kulfi, with chilled storage access for anything perishable." },
    beverage: { name: "Beverages",             price: 30000, size: "4 × 6 ft",   colour: "#69AC7B", desc: "Lassi, doodh soda, kashmiri chai and fresh juice. Compact counters spread across every aisle." },
    heritage: { name: "Heritage restaurants",  price: 80000, size: "10 × 10 ft", colour: "#4A8F5C", desc: "Extended sit-down stalls for established kitchens: biryani, karahi and nihari specialists." },
    bakery:   { name: "Bakery & confectionery",price: 35000, size: "6 × 6 ft",   colour: "#C77E1E", desc: "Naan-khatai, rusk, cakes and artisan breads, with display-led stall frontage." }
  };

  const AISLES = [
    { letter: "A", label: "Aisle A — Street food corner",        cat: "street",   count: 28 },
    { letter: "B", label: "Aisle B — BBQ & grill zone",          cat: "bbq",      count: 22 },
    { letter: "C", label: "Aisle C — Desserts & mithai",         cat: "sweets",   count: 24 },
    { letter: "D", label: "Aisle D — Beverages lane",            cat: "beverage", count: 20 },
    { letter: "E", label: "Aisle E — Heritage restaurants",      cat: "heritage", count: 16 },
    { letter: "F", label: "Aisle F — Bakery & confectionery",    cat: "bakery",   count: 10 }
  ];

  const PAYMENT_METHODS = {
    bank: {
      label: "Bank transfer",
      needsRef: true,
      title: "Bank transfer details",
      rows: [["Account title", "Zaiqa Mela Exhibitions"], ["Bank", "Meezan Bank, Gulberg"], ["Account no.", "0102-0110-1234-56"], ["IBAN", "PK36MEZN0001021234567"]],
      note: "Your stall is reserved once the transfer is verified, usually within one working day."
    },
    jazzcash: {
      label: "JazzCash",
      needsRef: true,
      title: "JazzCash details",
      rows: [["Account title", "Zaiqa Mela Exhibitions"], ["Mobile account", "0300-1234567"]],
      note: "Your stall is reserved once the transfer is verified, usually within one working day."
    },
    easypaisa: {
      label: "EasyPaisa",
      needsRef: true,
      title: "EasyPaisa details",
      rows: [["Account title", "Zaiqa Mela Exhibitions"], ["Mobile account", "0345-1234567"]],
      note: "Your stall is reserved once the transfer is verified, usually within one working day."
    },
    card: {
      label: "Credit / debit card",
      needsRef: false,
      title: "Card payment",
      rows: [["Gateway", "1LINK secure checkout"], ["Accepted", "Visa, Mastercard, PayPak"]],
      note: "You'll be taken to the secure payment gateway to complete the transaction."
    },
    cash: {
      label: "Cash at exhibition office",
      needsRef: false,
      title: "Pay in person",
      rows: [["Office", "Al-Hamra Grounds, Gate 2"], ["Open", "Mon–Sat, 10 AM – 6 PM"]],
      note: "Bring your booking reference. Unpaid bookings are released after 48 hours."
    }
  };

  const SCHEDULE = {
    1: [
      { time: "2:00 PM",  title: "Exhibitor setup opens",   desc: "Stall setup, decor and equipment installation." },
      { time: "4:00 PM",  title: "Gates open to public",    desc: "Visitors welcomed with a live dhol performance." },
      { time: "5:30 PM",  title: "Opening ceremony",        desc: "Ribbon cutting by the guest of honour at the main stage." },
      { time: "7:00 PM",  title: "Qawwali night",           desc: "Live performance beside the central food court." },
      { time: "11:00 PM", title: "Day 1 closes",            desc: "Stalls wind down and security takes handover." }
    ],
    2: [
      { time: "2:00 PM",  title: "Exhibitor entry",         desc: "Restocking and stall refresh window." },
      { time: "4:00 PM",  title: "Gates open",              desc: "Family hour with a kids' activity corner." },
      { time: "6:00 PM",  title: "Best stall judging",      desc: "The panel tours all six aisles." },
      { time: "8:30 PM",  title: "Folk music set",          desc: "Traditional performances on the main stage." },
      { time: "11:00 PM", title: "Day 2 closes",            desc: "Nightly cleanup and inventory check." }
    ],
    3: [
      { time: "2:00 PM",  title: "Final day setup",         desc: "Last restock before the closing weekend rush." },
      { time: "4:00 PM",  title: "Gates open",              desc: "Extended family and food-media hour." },
      { time: "7:00 PM",  title: "Award ceremony",          desc: "Best stall, people's choice and most innovative." },
      { time: "9:00 PM",  title: "Closing performance",     desc: "Grand finale live act on the main stage." },
      { time: "11:00 PM", title: "Exhibition ends",         desc: "Teardown begins after the closing announcement." }
    ]
  };

  /* ---------------- Helpers ---------------- */

  const $  = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

  const money = n => "PKR " + Math.round(n).toLocaleString("en-PK");

  // deterministic booked/available so the map is stable across reloads
  function seeded(n) {
    const x = Math.sin(n * 12.9898) * 43758.5453;
    return x - Math.floor(x);
  }

  /* ---------------- Stall data ----------------
     Every stall carries exactly one status. This array is the single
     source of truth for availability — nothing else may decide it, and
     the CSS only ever mirrors what this says.                          */

  const STATUS = {
    AVAILABLE: "available",   // green  — free to book
    BOOKED:    "booked"       // red    — taken, by anyone
  };

  const stalls = [];
  let seed = 0;
  AISLES.forEach(aisle => {
    for (let i = 1; i <= aisle.count; i++) {
      seed++;
      stalls.push({
        id: aisle.letter + "-" + String(i).padStart(2, "0"),
        cat: aisle.cat,
        aisleLabel: aisle.label,
        aisleShort: "Aisle " + aisle.letter,
        status: seeded(seed) < 0.56 ? STATUS.BOOKED : STATUS.AVAILABLE
      });
    }
  });

  /* ---------------- State ----------------
     selectedId is an id, not an object reference — one stall can be
     selected at a time, so replacing the id is all it takes to release
     the previous one. myBookings records what THIS user booked; those
     stalls are BOOKED like any other, we just remember they're theirs. */

  const state = {
    selectedId: null,
    myBookings: [],
    step: 1,
    method: null,
    details: {}
  };

  const getStall   = id => stalls.find(s => s.id === id) || null;
  const getSelected = () => (state.selectedId ? getStall(state.selectedId) : null);
  const isMine     = id => state.myBookings.indexOf(id) !== -1;

  /* The ONE place that turns state into a colour.
     Order matters: booked always wins, so a stall the user just
     confirmed goes red on the map instead of staying yellow.           */
  function visualState(stall) {
    if (stall.status === STATUS.BOOKED) return "booked";              // red
    if (stall.id === state.selectedId)  return "selected";            // yellow
    return "available";                                               // green
  }

  /* ---------------- Render: categories ---------------- */

  function renderCategories() {
    const grid = $("#categoryGrid");
    if (!grid) return;
    grid.innerHTML = AISLES.map(aisle => {
      const c = CATEGORIES[aisle.cat];
      return `
        <article class="cat">
          <div class="cat__bar" style="background:${c.colour}"></div>
          <h3 class="cat__name">${c.name}</h3>
          <p class="cat__desc">${c.desc}</p>
          <div class="cat__foot">
            <span class="cat__price">${money(c.price)}</span>
            <span class="cat__spec">${c.size}<br>${aisle.count} stalls</span>
          </div>
        </article>`;
    }).join("");
  }

  /* ---------------- Render: floor plan ---------------- */

  let filter = "all";

  function renderFloor() {
    const grid = $("#floorGrid");
    if (!grid) return;

    const visibleAisles = AISLES.filter(a => filter === "all" || a.cat === filter);

    grid.innerHTML = visibleAisles.map(aisle => {
      const rows = stalls.filter(s => s.cat === aisle.cat);
      const free = rows.filter(s => s.status === STATUS.AVAILABLE).length;

      const tiles = rows.map(s => {
        const view = visualState(s);                 // available | booked | selected
        const mine = isMine(s.id);
        const spoken = view === "selected" ? "selected by you"
                     : mine               ? "booked by you"
                     : view === "booked"  ? "already booked"
                     : "available";
        return `<button type="button"
                  class="stall stall--${view}${mine ? " stall--mine" : ""}"
                  data-stall="${s.id}"
                  data-state="${view}"
                  data-mine="${mine}"
                  ${view === "booked" ? 'aria-disabled="true"' : ""}
                  aria-label="Stall ${s.id}, ${CATEGORIES[s.cat].name}, ${spoken}">${s.id}</button>`;
      }).join("");

      return `
        <section class="aisle">
          <div class="aisle__head">
            <h3 class="aisle__name">${aisle.label}</h3>
            <span class="aisle__count">${free} of ${rows.length} free</span>
          </div>
          <div class="aisle__stalls">${tiles}</div>
        </section>`;
    }).join("");
  }

  /* ---------------- Render: stats ---------------- */

  let statsPainted = false;

  function renderStats() {
    const total = stalls.length;
    const booked = stalls.filter(s => s.status === STATUS.BOOKED).length;

    // Count up on first paint only. Later updates (a stall just got booked)
    // must land instantly — re-animating from zero reads as a glitch.
    const animate = !statsPainted;
    setCount($("#statTotal"), total, animate);
    setCount($("#statBooked"), booked, animate);
    setCount($("#statAvailable"), total - booked, animate);
    setCount($("#statVisitors"), EXPECTED_VISITORS, animate);
    statsPainted = true;

    const about = $("#aboutStallCount");
    if (about) about.textContent = total + " stalls";
  }

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function setCount(el, target, animate) {
    if (!el) return;
    if (!animate || reduceMotion) { el.textContent = target.toLocaleString("en-PK"); return; }
    const dur = 1100, t0 = performance.now();
    (function tick(now) {
      const p = Math.min((now - t0) / dur, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(eased * target).toLocaleString("en-PK");
      if (p < 1) requestAnimationFrame(tick);
    })(t0);
  }

  /* ---------------- Modal ---------------- */

  const modal = $("#stallModal");
  let pending = null;
  let lastFocused = null;

  function openModal(stall) {
    pending = stall;
    const c = CATEGORIES[stall.cat];
    $("#mCategory").textContent = c.name;
    $("#mStallNo").textContent = "Stall " + stall.id;
    $("#mSize").textContent = c.size;
    $("#mAisle").textContent = stall.aisleShort;
    $("#mPrice").textContent = money(c.price);
    $("#mStatus").textContent = "Available";
    lastFocused = document.activeElement;
    modal.hidden = false;
    $("#mSelect").focus();
  }

  function closeModal() {
    modal.hidden = true;
    pending = null;
    if (lastFocused && lastFocused.isConnected) lastFocused.focus();
  }

  /* ---------------- Selection ---------------- */

  function selectStall(stall) {
    if (!stall || stall.status === STATUS.BOOKED) return;   // guard: never select a booked stall
    // Assigning the id replaces any previous selection, so the stall the
    // user was on drops straight back to its own status (green).
    state.selectedId = stall.id;
    renderFloor();
    renderSelection();
    updateStickyBar();
    toast("Stall " + stall.id + " selected", "success");
  }

  function renderSelection() {
    const empty = $("#panelEmpty");
    const picked = $("#panelPicked");
    const go2 = $("#go2");
    const locked = $("#stallLocked");

    const sel = getSelected();
    if (!sel) {
      empty.hidden = false;
      picked.hidden = true;
      go2.disabled = true;
      locked.value = "—";
      return;
    }

    const c = CATEGORIES[sel.cat];
    empty.hidden = true;
    picked.hidden = false;
    go2.disabled = false;

    $("#pCategory").textContent = c.name;
    $("#pStallNo").textContent = "Stall " + sel.id;
    $("#pSize").textContent = c.size;
    $("#pAisle").textContent = sel.aisleShort;
    $("#pPrice").textContent = money(c.price);

    locked.value = "Stall " + sel.id + " — " + c.name;
  }

  function updateStickyBar() {
    const bar = $("#stickyBar");
    // Only while they're still on the map step — once they're inside the
    // form it stops being a prompt and starts being an obstruction.
    const sel = getSelected();
    const show = !!sel && state.step === 1;
    bar.hidden = !show;
    document.body.classList.toggle("has-sticky", !!show);
    if (show) {
      $("#sbStall").textContent = "Stall " + sel.id;
      $("#sbPrice").textContent = money(CATEGORIES[sel.cat].price);
    }
  }

  /* ---------------- Totals ---------------- */

  function totals() {
    const sel = getSelected();
    if (!sel) return { base: 0, fee: 0, total: 0 };
    const base = CATEGORIES[sel.cat].price;
    const fee = Math.round(base * SERVICE_FEE_RATE);
    return { base, fee, total: base + fee };
  }

  function renderPaymentSummary() {
    const t = totals();
    const sel = getSelected();
    const c = sel ? CATEGORIES[sel.cat] : null;
    $("#payStallLabel").textContent = sel
      ? `Stall ${sel.id} · ${c.name} — three-day slot`
      : "Stall — three-day slot";
    $("#payBase").textContent = money(t.base);
    $("#payFee").textContent = money(t.fee);
    $("#payTotal").textContent = money(t.total);
    $$(".summary__row").forEach(row => {
      if (row.querySelector("#payFee") || row.querySelector("#rFee")) {
        row.hidden = SERVICE_FEE_RATE === 0;
      }
    });
  }

  /* ---------------- Steps ---------------- */

  function goStep(n, scroll) {
    state.step = n;
    $$(".panel").forEach(p => { p.hidden = Number(p.dataset.panel) !== n; });
    $$(".step").forEach(s => {
      const i = Number(s.dataset.step);
      s.classList.toggle("is-active", i === n);
      s.classList.toggle("is-done", i < n);
    });
    updateStickyBar();
    if (scroll !== false) {
      const top = $("#booking").getBoundingClientRect().top + window.scrollY - 90;
      window.scrollTo({ top, behavior: reduceMotion ? "auto" : "smooth" });
    }
  }

  /* ---------------- Validation ---------------- */

  function showError(name, message) {
    const err = $(`.err[data-err="${name}"]`);
    if (err) {
      err.textContent = message || "";
      err.classList.toggle("is-shown", !!message);
    }
    const input = $("#" + name);
    if (input && input.closest(".field")) {
      input.closest(".field").classList.toggle("has-error", !!message);
    }
  }

  function clearErrors(names) {
    names.forEach(n => showError(n, ""));
  }

  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;

  function validateDetails() {
    const f = {
      fullName: $("#fullName").value.trim(),
      cnic:     $("#cnic").value.trim(),
      mobile:   $("#mobile").value.trim(),
      email:    $("#email").value.trim(),
      address:  $("#address").value.trim(),
      city:     $("#city").value.trim()
    };
    let firstBad = null;
    const fail = (name, msg) => { showError(name, msg); if (!firstBad) firstBad = name; };

    if (!f.fullName) fail("fullName", "Enter your full name.");
    else if (f.fullName.length < 3) fail("fullName", "Full name must be at least 3 characters.");
    else if (!/^[A-Za-z\u0600-\u06FF\s.'-]+$/.test(f.fullName)) fail("fullName", "Use letters only — no digits or symbols.");
    else showError("fullName", "");

    if (!f.cnic) fail("cnic", "Enter your CNIC number.");
    else if (!/^\d{5}-\d{7}-\d$/.test(f.cnic)) fail("cnic", "CNIC must be 13 digits, like 35202-1234567-1.");
    else showError("cnic", "");

    if (!f.mobile) fail("mobile", "Enter your mobile number.");
    else if (!/^03\d{2}-\d{7}$/.test(f.mobile)) fail("mobile", "Use a Pakistani mobile number, like 0300-1234567.");
    else showError("mobile", "");

    if (!f.email) fail("email", "Enter your email address.");
    else if (!EMAIL_RE.test(f.email)) fail("email", "That email address doesn't look right.");
    else showError("email", "");

    if (!f.address) fail("address", "Enter your complete address.");
    else if (f.address.length < 10) fail("address", "Add a bit more detail — street and area help us reach you.");
    else showError("address", "");

    if (!f.city) fail("city", "Enter your city.");
    else if (!/^[A-Za-z\u0600-\u06FF\s.'-]{2,}$/.test(f.city)) fail("city", "Enter a valid city name.");
    else showError("city", "");

    if (firstBad) {
      const el = $("#" + firstBad);
      if (el) { el.focus({ preventScroll: true }); el.scrollIntoView({ block: "center", behavior: reduceMotion ? "auto" : "smooth" }); }
      toast("Please correct the highlighted fields", "error");
      return false;
    }

    f.notes = $("#notes").value.trim();
    state.details = f;
    return true;
  }

  function validatePayment() {
    if (!state.method) {
      showError("method", "Choose how you'd like to pay.");
      toast("Choose a payment method", "error");
      $("#methods").scrollIntoView({ block: "center", behavior: reduceMotion ? "auto" : "smooth" });
      return false;
    }
    showError("method", "");

    if (PAYMENT_METHODS[state.method].needsRef) {
      const ref = $("#txnRef").value.trim();
      if (!ref) {
        showError("txnRef", "Enter the reference from your transfer receipt.");
        $("#txnRef").focus({ preventScroll: true });
        toast("Payment reference is required", "error");
        return false;
      }
      if (ref.length < 5) {
        showError("txnRef", "Reference looks too short — check your receipt.");
        $("#txnRef").focus({ preventScroll: true });
        return false;
      }
      showError("txnRef", "");
      state.details.txnRef = ref;
    } else {
      delete state.details.txnRef;
    }
    return true;
  }

  /* ---------------- Review ---------------- */

  function renderReview() {
    const sel = getSelected();
    const c = CATEGORIES[sel.cat];
    const t = totals();
    const d = state.details;

    $("#rStall").textContent = "Stall " + sel.id;
    $("#rCategory").textContent = c.name;
    $("#rSize").textContent = c.size;
    $("#rAisle").textContent = sel.aisleShort;

    $("#rName").textContent = d.fullName;
    $("#rCnic").textContent = d.cnic;
    $("#rMobile").textContent = d.mobile;
    $("#rEmail").textContent = d.email;
    $("#rAddress").textContent = d.address;
    $("#rCity").textContent = d.city;

    const notesRow = $("#rNotesRow");
    notesRow.hidden = !d.notes;
    if (d.notes) $("#rNotes").textContent = d.notes;

    $("#rMethod").textContent = PAYMENT_METHODS[state.method].label;
    const refRow = $("#rRefRow");
    refRow.hidden = !d.txnRef;
    if (d.txnRef) $("#rRef").textContent = d.txnRef;

    $("#rBase").textContent = money(t.base);
    $("#rFee").textContent = money(t.fee);
    $("#rTotal").textContent = money(t.total);
  }

  /* ---------------- Confirmation ---------------- */

  function confirmBooking() {
    const agree = $("#agree");
    if (!agree.checked) {
      showError("agree", "Please confirm your details and accept the guidelines.");
      agree.closest(".agree").classList.add("has-error");
      agree.focus({ preventScroll: true });
      return;
    }
    showError("agree", "");
    agree.closest(".agree").classList.remove("has-error");

    const sel = getSelected();
    if (!sel) return;

    const t = totals();
    const c = CATEGORIES[sel.cat];
    const d = state.details;
    const m = PAYMENT_METHODS[state.method];
    const ref = "ZM26-" + sel.id.replace("-", "") + "-" +
                Math.random().toString(36).slice(2, 6).toUpperCase();

    $("#cEmail").textContent = d.email;
    $("#cRef").textContent = ref;
    $("#cStall").textContent = "Stall " + sel.id + " · " + c.name;
    $("#cName").textContent = d.fullName;
    $("#cMethod").textContent = m.label;
    $("#cTotal").textContent = money(t.total);
    $("#cStatus").textContent = m.needsRef ? "Reserved — awaiting payment verification" : "Reserved — awaiting payment";
    $("#cNote").textContent = m.note;

    // The stall is now taken: it joins every other booked stall (red on the
    // map, unselectable). We remember it was this user's, so it can still be
    // identified as theirs without changing what the legend promises.
    sel.status = STATUS.BOOKED;
    if (!isMine(sel.id)) state.myBookings.push(sel.id);
    state.selectedId = null;          // released — nothing is "selected" now

    renderFloor();
    renderStats();

    goStep(5);
    toast("Stall reserved — save your reference", "success");
  }

  function resetBooking() {
    state.selectedId = null;          // myBookings is kept: those stalls stay booked
    state.method = null;
    state.details = {};

    $("#detailsForm").reset();
    $("#txnRef").value = "";
    $("#agree").checked = false;
    $("#agree").closest(".agree").classList.remove("has-error");
    $("#notesCount").textContent = "0";
    $$(".err").forEach(e => { e.textContent = ""; e.classList.remove("is-shown"); });
    $$(".field").forEach(f => f.classList.remove("has-error"));
    $$('input[name="method"]').forEach(r => { r.checked = false; });
    $("#payInfo").hidden = true;
    $("#refField").hidden = true;

    renderSelection();
    renderFloor();
    goStep(1, false);

    const top = $("#floorplan").getBoundingClientRect().top + window.scrollY - 90;
    window.scrollTo({ top, behavior: reduceMotion ? "auto" : "smooth" });
  }

  /* ---------------- Schedule ---------------- */

  function renderSchedule(day) {
    const list = $("#scheduleList");
    if (!list) return;
    list.innerHTML = SCHEDULE[day].map(i => `
      <article class="sched">
        <span class="sched__time">${i.time}</span>
        <div>
          <p class="sched__title">${i.title}</p>
          <p class="sched__desc">${i.desc}</p>
        </div>
      </article>`).join("");
  }

  /* ---------------- Toast ---------------- */

  let toastTimer;
  function toast(msg, kind) {
    const el = $("#toast");
    el.textContent = msg;
    el.className = "toast is-shown" + (kind ? " is-" + kind : "");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove("is-shown"), 3000);
  }

  /* ---------------- Input masks ---------------- */

  function maskCnic(e) {
    const digits = e.target.value.replace(/\D/g, "").slice(0, 13);
    let out = digits;
    if (digits.length > 5)  out = digits.slice(0, 5) + "-" + digits.slice(5);
    if (digits.length > 12) out = digits.slice(0, 5) + "-" + digits.slice(5, 12) + "-" + digits.slice(12);
    e.target.value = out;
  }

  function maskMobile(e) {
    const digits = e.target.value.replace(/\D/g, "").slice(0, 11);
    e.target.value = digits.length > 4 ? digits.slice(0, 4) + "-" + digits.slice(4) : digits;
  }

  /* ---------------- Wiring ---------------- */

  function init() {
    renderCategories();
    renderFloor();
    renderStats();
    renderSchedule(1);
    renderSelection();

    // stall clicks (delegated — survives re-render)
    $("#floorGrid").addEventListener("click", e => {
      const btn = e.target.closest(".stall");
      if (!btn) return;
      const stall = stalls.find(s => s.id === btn.dataset.stall);
      if (!stall) return;
      // Booked stalls stay focusable so keyboard users can read them, but
      // say why nothing happened rather than swallowing the click.
      if (stall.status === STATUS.BOOKED) {
        toast(isMine(stall.id)
          ? "Stall " + stall.id + " is already booked by you"
          : "Stall " + stall.id + " is already booked", "error");
        return;
      }
      openModal(stall);
    });

    // filters
    $$(".filter").forEach(btn => {
      btn.addEventListener("click", () => {
        $$(".filter").forEach(b => { b.classList.remove("is-active"); b.setAttribute("aria-pressed", "false"); });
        btn.classList.add("is-active");
        btn.setAttribute("aria-pressed", "true");
        filter = btn.dataset.filter;
        renderFloor();
      });
    });

    // modal
    $("#modalClose").addEventListener("click", closeModal);
    modal.addEventListener("click", e => { if (e.target === modal) closeModal(); });
    document.addEventListener("keydown", e => {
      if (e.key === "Escape" && !modal.hidden) closeModal();
    });
    $("#mSelect").addEventListener("click", () => {
      if (!pending) return;
      const stall = pending;
      closeModal();
      selectStall(stall);   // selectStall re-checks status before committing
    });

    $("#changeStall").addEventListener("click", () => {
      const top = $("#floorplan").getBoundingClientRect().top + window.scrollY - 90;
      window.scrollTo({ top, behavior: reduceMotion ? "auto" : "smooth" });
    });

    // step navigation
    $("#go2").addEventListener("click", () => { if (getSelected()) goStep(2); });

    $("#go3").addEventListener("click", () => {
      if (!validateDetails()) return;
      renderPaymentSummary();
      goStep(3);
    });

    $("#go4").addEventListener("click", () => {
      if (!validatePayment()) return;
      renderReview();
      goStep(4);
    });

    $$("[data-back]").forEach(btn => {
      btn.addEventListener("click", () => goStep(Number(btn.dataset.back)));
    });

    $("#confirmBtn").addEventListener("click", confirmBooking);
    $("#againBtn").addEventListener("click", resetBooking);
    $("#printBtn").addEventListener("click", () => window.print());

    // payment method
    $$('input[name="method"]').forEach(radio => {
      radio.addEventListener("change", () => {
        state.method = radio.value;
        showError("method", "");
        const m = PAYMENT_METHODS[state.method];

        $("#payInfoTitle").textContent = m.title;
        $("#payInfoList").innerHTML = m.rows
          .map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join("");
        $("#payInfo").hidden = false;

        $("#refField").hidden = !m.needsRef;
        if (!m.needsRef) { $("#txnRef").value = ""; showError("txnRef", ""); }
      });
    });

    // live error clearing
    ["fullName", "cnic", "mobile", "email", "address", "city", "txnRef"].forEach(id => {
      const el = $("#" + id);
      if (el) el.addEventListener("input", () => showError(id, ""));
    });

    $("#agree").addEventListener("change", e => {
      if (e.target.checked) {
        showError("agree", "");
        e.target.closest(".agree").classList.remove("has-error");
      }
    });

    // masks + counter
    $("#cnic").addEventListener("input", maskCnic);
    $("#mobile").addEventListener("input", maskMobile);
    $("#notes").addEventListener("input", e => {
      $("#notesCount").textContent = e.target.value.length;
    });

    // schedule tabs
    $$(".tab").forEach(tab => {
      tab.addEventListener("click", () => {
        $$(".tab").forEach(t => { t.classList.remove("is-active"); t.setAttribute("aria-selected", "false"); });
        tab.classList.add("is-active");
        tab.setAttribute("aria-selected", "true");
        renderSchedule(tab.dataset.day);
      });
    });

    // mobile nav
    const toggle = $("#navToggle");
    const links = $("#navLinks");
    toggle.addEventListener("click", () => {
      const open = links.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", String(open));
      toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    });
    $$("#navLinks a").forEach(a => a.addEventListener("click", () => {
      links.classList.remove("is-open");
      toggle.setAttribute("aria-expanded", "false");
      toggle.setAttribute("aria-label", "Open menu");
    }));

    // reveal on scroll
    if (!reduceMotion && "IntersectionObserver" in window) {
      const io = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.style.opacity = "1";
            entry.target.style.transform = "none";
            io.unobserve(entry.target);
          }
        });
      }, { threshold: 0.12, rootMargin: "0px 0px -40px" });

      $$(".card--info, .cat, .rule, .sched, .timeline li").forEach(el => {
        el.style.opacity = "0";
        el.style.transform = "translateY(16px)";
        el.style.transition = "opacity .6s cubic-bezier(.2,.7,.3,1), transform .6s cubic-bezier(.2,.7,.3,1)";
        io.observe(el);
      });
    }
  }

  function boot() {
    init();
    window.__zaiqaReady = true;   // head guard checks this
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
