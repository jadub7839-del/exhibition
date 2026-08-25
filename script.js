// ============================================================
// ZAIQA MELA — Booking System Logic
// ============================================================

const CATEGORY_META = {
  street:   { label: "Street Food",         icon: "🌭", price: 45000, size: "6×6 ft" },
  bbq:      { label: "BBQ & Grill",         icon: "🍢", price: 65000, size: "8×8 ft" },
  sweets:   { label: "Desserts & Mithai",   icon: "🍮", price: 40000, size: "6×6 ft" },
  beverage: { label: "Beverages",           icon: "🥤", price: 30000, size: "4×6 ft" },
  heritage: { label: "Heritage Restaurant", icon: "🍛", price: 80000, size: "10×10 ft" },
  bakery:   { label: "Bakery & Confectionery", icon: "🥐", price: 35000, size: "6×6 ft" },
};

const AISLES = [
  { name: "Aisle A — Street Food Corner", cat: "street", count: 14 },
  { name: "Aisle B — BBQ & Grill Zone",   cat: "bbq", count: 11 },
  { name: "Aisle C — Desserts & Mithai",  cat: "sweets", count: 12 },
  { name: "Aisle D — Beverages Lane",     cat: "beverage", count: 10 },
  { name: "Aisle E — Heritage Restaurants", cat: "heritage", count: 8 },
  { name: "Aisle F — Bakery & Confectionery", cat: "bakery", count: 5 },
];

// Deterministic pseudo-random booked status so layout is stable across renders
function seededRandom(seed) {
  let x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

let stalls = [];
let stallCounter = 0;
AISLES.forEach((aisle, aisleIdx) => {
  for (let i = 1; i <= aisle.count; i++) {
    stallCounter++;
    const letter = String.fromCharCode(65 + aisleIdx);
    const id = `${letter}-${String(i).padStart(2, "0")}`;
    const isBooked = seededRandom(stallCounter * 7.13) < 0.55;
    stalls.push({
      id,
      aisle: aisle.name,
      aisleIdx,
      cat: aisle.cat,
      booked: isBooked,
    });
  }
});

let selectedStall = null;
let activeFilter = "all";

// ---------- Render Floor Grid ----------
const floorGrid = document.getElementById("floorGrid");

function renderFloorGrid() {
  floorGrid.innerHTML = "";
  let currentAisleIdx = -1;

  stalls.forEach(stall => {
    if (stall.aisleIdx !== currentAisleIdx) {
      currentAisleIdx = stall.aisleIdx;
      const label = document.createElement("div");
      label.className = "aisle-label";
      label.textContent = stall.aisle;
      floorGrid.appendChild(label);
    }

    const el = document.createElement("div");
    const meta = CATEGORY_META[stall.cat];
    let statusClass = stall.booked ? "booked" : "available";
    if (selectedStall && selectedStall.id === stall.id) statusClass = "selected";

    el.className = `stall ${statusClass}`;
    if (activeFilter !== "all" && stall.cat !== activeFilter) el.classList.add("hidden-cat");
    el.textContent = stall.id;
    el.setAttribute("aria-label", `Stall ${stall.id}, ${meta.label}, ${stall.booked ? "booked" : "available"}`);

    if (!stall.booked) {
      el.addEventListener("click", () => openStallDetail(stall));
    }
    floorGrid.appendChild(el);
  });
}
renderFloorGrid();

// ---------- Filters ----------
document.querySelectorAll(".filter-chip").forEach(chip => {
  chip.addEventListener("click", () => {
    document.querySelectorAll(".filter-chip").forEach(c => c.classList.remove("active"));
    chip.classList.add("active");
    activeFilter = chip.dataset.filter;
    renderFloorGrid();
  });
});

// ---------- Stall Detail Popover ----------
const stallDetail = document.getElementById("stallDetail");
let pendingStall = null;

function openStallDetail(stall) {
  pendingStall = stall;
  const meta = CATEGORY_META[stall.cat];
  document.getElementById("detailIcon").textContent = meta.icon;
  document.getElementById("detailCat").textContent = meta.label;
  document.getElementById("detailNumber").textContent = `Stall ${stall.id}`;
  document.getElementById("detailSize").textContent = meta.size;
  document.getElementById("detailAisle").textContent = stall.aisle.split("—")[0].trim();
  document.getElementById("detailPrice").textContent = `PKR ${meta.price.toLocaleString()}`;
  stallDetail.classList.add("open");
}

document.getElementById("detailClose").addEventListener("click", () => stallDetail.classList.remove("open"));
stallDetail.addEventListener("click", e => { if (e.target === stallDetail) stallDetail.classList.remove("open"); });

document.getElementById("selectStallBtn").addEventListener("click", () => {
  if (!pendingStall) return;
  selectedStall = pendingStall;
  stallDetail.classList.remove("open");
  renderFloorGrid();
  updateSelectedStallCard();
  showToast(`Stall ${selectedStall.id} selected`, "success");
  document.getElementById("booking").scrollIntoView({ behavior: "smooth", block: "start" });
});

// ---------- Selected Stall Card (Step 1) ----------
function updateSelectedStallCard() {
  const emptyEl = document.getElementById("emptySelection");
  const filledEl = document.getElementById("filledSelection");
  const toStep2Btn = document.getElementById("toStep2");

  if (!selectedStall) {
    emptyEl.style.display = "block";
    filledEl.style.display = "none";
    toStep2Btn.disabled = true;
    return;
  }
  const meta = CATEGORY_META[selectedStall.cat];
  emptyEl.style.display = "none";
  filledEl.style.display = "flex";
  toStep2Btn.disabled = false;

  document.getElementById("filledIcon").textContent = meta.icon;
  document.getElementById("filledCat").textContent = meta.label;
  document.getElementById("filledNumber").textContent = `Stall ${selectedStall.id}`;
  document.getElementById("filledSize").textContent = meta.size;
  document.getElementById("filledAisle").textContent = selectedStall.aisle.split("—")[0].trim();
  document.getElementById("filledPrice").textContent = `PKR ${meta.price.toLocaleString()}`;
}

document.getElementById("changeStallBtn").addEventListener("click", () => {
  document.getElementById("floorplan").scrollIntoView({ behavior: "smooth", block: "start" });
});

// ---------- Stepper Navigation ----------
const panels = document.querySelectorAll(".booking-panel");
const steps = document.querySelectorAll(".step");

function goToStep(n) {
  panels.forEach(p => p.style.display = (Number(p.dataset.panel) === n) ? "block" : "none");
  steps.forEach(s => {
    const sn = Number(s.dataset.step);
    s.classList.toggle("active", sn === n);
    s.classList.toggle("done", sn < n);
  });
}

document.getElementById("toStep2").addEventListener("click", () => {
  if (!selectedStall) return;
  goToStep(2);
});
document.getElementById("backTo1").addEventListener("click", () => goToStep(1));
document.getElementById("backTo2").addEventListener("click", () => goToStep(2));

// ---------- Form Validation ----------
const form = document.getElementById("bookingForm");

function setFieldError(field, message) {
  const errEl = field.parentElement.querySelector(".error-msg");
  if (message) {
    field.classList.add("invalid");
    if (errEl) errEl.textContent = message;
  } else {
    field.classList.remove("invalid");
    if (errEl) errEl.textContent = "";
  }
}

function validateForm() {
  let valid = true;

  const companyName = document.getElementById("companyName");
  if (!companyName.value.trim()) { setFieldError(companyName, "Company name is required."); valid = false; }
  else setFieldError(companyName, "");

  const contactPerson = document.getElementById("contactPerson");
  if (!contactPerson.value.trim()) { setFieldError(contactPerson, "Contact person is required."); valid = false; }
  else setFieldError(contactPerson, "");

  const email = document.getElementById("email");
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email.value.trim()) { setFieldError(email, "Email address is required."); valid = false; }
  else if (!emailPattern.test(email.value.trim())) { setFieldError(email, "Enter a valid email address."); valid = false; }
  else setFieldError(email, "");

  const phone = document.getElementById("phone");
  const phonePattern = /^[0-9+\-\s]{10,15}$/;
  if (!phone.value.trim()) { setFieldError(phone, "Phone number is required."); valid = false; }
  else if (!phonePattern.test(phone.value.trim())) { setFieldError(phone, "Enter a valid phone number."); valid = false; }
  else setFieldError(phone, "");

  const businessCategory = document.getElementById("businessCategory");
  if (!businessCategory.value) { setFieldError(businessCategory, "Please select a category."); valid = false; }
  else setFieldError(businessCategory, "");

  const repCount = document.getElementById("repCount");
  const repVal = Number(repCount.value);
  if (!repCount.value || repVal < 1 || repVal > 10) { setFieldError(repCount, "Enter a number between 1 and 10."); valid = false; }
  else setFieldError(repCount, "");

  const stallType = document.getElementById("stallType");
  if (!stallType.value) { setFieldError(stallType, "Please select a stall type."); valid = false; }
  else setFieldError(stallType, "");

  return valid;
}

// live-clear errors as user types
["companyName","contactPerson","email","phone","businessCategory","repCount","stallType"].forEach(id => {
  const el = document.getElementById(id);
  el.addEventListener("input", () => setFieldError(el, ""));
  el.addEventListener("change", () => setFieldError(el, ""));
});

document.getElementById("toStep3").addEventListener("click", () => {
  if (!validateForm()) {
    showToast("Please fix the highlighted fields.", "error");
    const firstInvalid = form.querySelector(".invalid");
    if (firstInvalid) firstInvalid.scrollIntoView({ behavior: "smooth", block: "center" });
    return;
  }
  populateReview();
  goToStep(3);
});

// ---------- Review / Summary ----------
function getFacilitiesSelected() {
  return Array.from(document.querySelectorAll('input[name="facility"]:checked')).map(cb => ({
    label: cb.parentElement.querySelector(".cb-text strong").textContent,
    price: Number(cb.dataset.price),
  }));
}

function populateReview() {
  const meta = CATEGORY_META[selectedStall.cat];
  document.getElementById("rvStall").textContent = `Stall ${selectedStall.id}`;
  document.getElementById("rvCat").textContent = meta.label;
  document.getElementById("rvSize").textContent = meta.size;
  document.getElementById("rvBasePrice").textContent = `PKR ${meta.price.toLocaleString()}`;

  document.getElementById("rvCompany").textContent = document.getElementById("companyName").value.trim();
  document.getElementById("rvContact").textContent = document.getElementById("contactPerson").value.trim();
  document.getElementById("rvEmail").textContent = document.getElementById("email").value.trim();
  document.getElementById("rvPhone").textContent = document.getElementById("phone").value.trim();
  document.getElementById("rvReps").textContent = document.getElementById("repCount").value.trim();
  const stallTypeSelect = document.getElementById("stallType");
  document.getElementById("rvStallType").textContent = stallTypeSelect.options[stallTypeSelect.selectedIndex].text;

  const facilities = getFacilitiesSelected();
  const rvFacilities = document.getElementById("rvFacilities");
  if (facilities.length === 0) {
    rvFacilities.innerHTML = '<span class="muted">None selected</span>';
  } else {
    rvFacilities.innerHTML = facilities.map(f => `<span>${f.label}</span>`).join("");
  }

  const facilitiesTotal = facilities.reduce((sum, f) => sum + f.price, 0);
  const total = meta.price + facilitiesTotal;
  document.getElementById("rvTotal").textContent = `PKR ${total.toLocaleString()}`;
}

// ---------- Confirm Booking ----------
document.getElementById("confirmBooking").addEventListener("click", () => {
  const agree = document.getElementById("agreeTerms");
  const agreeError = document.getElementById("agreeError");
  if (!agree.checked) {
    agreeError.textContent = "You must agree to the Exhibition Rules & Guidelines to proceed.";
    agree.closest(".agree-card").style.borderColor = "var(--chili-light)";
    return;
  }
  agreeError.textContent = "";

  const meta = CATEGORY_META[selectedStall.cat];
  const facilities = getFacilitiesSelected();
  const facilitiesTotal = facilities.reduce((sum, f) => sum + f.price, 0);
  const total = meta.price + facilitiesTotal;
  const ref = "ZM-" + Math.random().toString(36).slice(2, 8).toUpperCase();

  document.getElementById("confEmail").textContent = document.getElementById("email").value.trim();
  document.getElementById("confRef").textContent = ref;
  document.getElementById("confStall").textContent = `${selectedStall.id} — ${meta.label}`;
  document.getElementById("confCompany").textContent = document.getElementById("companyName").value.trim();
  document.getElementById("confTotal").textContent = `PKR ${total.toLocaleString()}`;

  // Mark stall as booked in the model
  selectedStall.booked = true;

  goToStep(4);
  showToast("Booking confirmed! 🎉", "success");
});

document.getElementById("newBookingBtn").addEventListener("click", () => {
  form.reset();
  document.querySelectorAll(".invalid").forEach(el => el.classList.remove("invalid"));
  document.querySelectorAll(".error-msg").forEach(el => el.textContent = "");
  document.getElementById("agreeTerms").closest(".agree-card").style.borderColor = "";
  selectedStall = null;
  renderFloorGrid();
  updateSelectedStallCard();
  goToStep(1);
  document.getElementById("floorplan").scrollIntoView({ behavior: "smooth", block: "start" });
});

// ---------- Toast ----------
let toastTimer = null;
function showToast(message, type = "") {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.className = "toast show" + (type ? " " + type : "");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 3200);
}

// ---------- Schedule Tabs ----------
const SCHEDULE = {
  1: [
    { time: "2:00 PM", title: "Exhibitor Setup Opens", desc: "Stall setup, decor, and equipment installation." },
    { time: "4:00 PM", title: "Gates Open to Public", desc: "Visitors welcomed with live dhol performance." },
    { time: "5:30 PM", title: "Opening Ceremony", desc: "Ribbon cutting by guest of honour." },
    { time: "7:00 PM", title: "Live Qawwali Night", desc: "Main stage performance near the food court." },
    { time: "11:00 PM", title: "Day 1 Closes", desc: "Stalls wind down, security handover." },
  ],
  2: [
    { time: "2:00 PM", title: "Exhibitor Entry", desc: "Restocking and stall refresh window." },
    { time: "4:00 PM", title: "Gates Open", desc: "Family hour with kids' activity corner." },
    { time: "6:00 PM", title: "Best Stall Judging", desc: "Panel tours all 6 aisles for awards." },
    { time: "8:30 PM", title: "Folk Music Set", desc: "Live traditional performances on main stage." },
    { time: "11:00 PM", title: "Day 2 Closes", desc: "Nightly cleanup and inventory check." },
  ],
  3: [
    { time: "2:00 PM", title: "Final Day Setup", desc: "Last restock before closing weekend rush." },
    { time: "4:00 PM", title: "Gates Open", desc: "Extended family & food-blogger hour." },
    { time: "7:00 PM", title: "Award Ceremony", desc: "Best Stall, People's Choice & Most Innovative awards." },
    { time: "9:00 PM", title: "Closing Performance", desc: "Grand finale live act on main stage." },
    { time: "11:00 PM", title: "Exhibition Ends", desc: "Teardown begins; thank-you announcement." },
  ],
};

function renderSchedule(day) {
  const list = document.getElementById("scheduleList");
  list.innerHTML = SCHEDULE[day].map(item => `
    <div class="sched-item">
      <span class="sched-time">${item.time}</span>
      <div>
        <div class="sched-title">${item.title}</div>
        <div class="sched-desc">${item.desc}</div>
      </div>
    </div>
  `).join("");
}
renderSchedule(1);

document.querySelectorAll(".day-tab").forEach(tab => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".day-tab").forEach(t => t.classList.remove("active"));
    tab.classList.add("active");
    renderSchedule(tab.dataset.day);
  });
});

// ---------- Nav toggle (mobile) ----------
const navToggle = document.getElementById("navToggle");
const navLinks = document.querySelector(".nav-links");
navToggle.addEventListener("click", () => navLinks.classList.toggle("open"));
document.querySelectorAll(".nav-links a").forEach(a => a.addEventListener("click", () => navLinks.classList.remove("open")));

// ---------- Navbar scroll shadow ----------
const navbar = document.getElementById("navbar");
window.addEventListener("scroll", () => {
  navbar.style.boxShadow = window.scrollY > 20 ? "0 4px 20px rgba(0,0,0,0.3)" : "none";
});

// ---------- Hero stat count-up ----------
function animateCount(el, target) {
  const duration = 1400;
  const start = performance.now();
  function tick(now) {
    const progress = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    el.textContent = Math.floor(eased * target).toLocaleString();
    if (progress < 1) requestAnimationFrame(tick);
    else el.textContent = target.toLocaleString();
  }
  requestAnimationFrame(tick);
}
document.querySelectorAll(".stat-num").forEach(el => {
  animateCount(el, Number(el.dataset.count));
});

// ---------- Scroll reveal ----------
const revealTargets = document.querySelectorAll(".info-card, .cat-card, .fac-item, .rule-card, .contact-card, .timeline-item");
revealTargets.forEach(el => el.classList.add("reveal"));

const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add("in-view");
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.15 });

revealTargets.forEach(el => observer.observe(el));

// Initial render
updateSelectedStallCard();
