/* =========================================================================
   Travel Buddy Finder  —  client
   -------------------------------------------------------------------------
   Talks to the backend API (served by the same Cloudflare Worker) under
   /api/*. There are NO API keys or secrets in this file — all data access
   and the matching logic live server-side in src/worker.js.

   The only thing kept in the browser is the logged-in user's id
   (localStorage "tbf_uid") so the page knows who you are between visits.
   ========================================================================= */

const SESSION_KEY = "tbf_uid";

/* ---------- tiny fetch wrapper -------------------------------------------- */
async function api(path, opts = {}) {
  const res = await fetch("/api" + path, {
    headers: { "Content-Type": "application/json" },
    ...opts,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || "Request failed");
  }
  return res.json();
}

function getUid() {
  return localStorage.getItem(SESSION_KEY);
}
function setUid(id) {
  localStorage.setItem(SESSION_KEY, id);
}
function logout() {
  localStorage.removeItem(SESSION_KEY);
  window.location.href = "index.html";
}
function continueAs(id) {
  setUid(id);
  window.location.href = "index.html";
}

/* ---------- avatar helper (display only) ---------------------------------- */
function initialsAvatar(name) {
  const initials = (name || "?")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
  const colors = ["#0d9488", "#f97316", "#6366f1", "#ec4899", "#0ea5e9", "#84cc16"];
  const color = colors[(name || "").length % colors.length];
  const svg =
    `<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120'>` +
    `<rect width='120' height='120' fill='${color}'/>` +
    `<text x='50%' y='50%' dy='.35em' text-anchor='middle' font-family='Arial' ` +
    `font-size='52' fill='white'>${initials}</text></svg>`;
  return "data:image/svg+xml;utf8," + encodeURIComponent(svg);
}

/* ======================================================================== */
/*  SIGNUP PAGE                                                              */
/* ======================================================================== */

function saveUserInfo() {
  const fileInput = document.getElementById("profilePicture");
  const name = (document.getElementById("name").value || "").trim();
  const phoneno = (document.getElementById("phone_number").value || "").trim();
  const age = (document.getElementById("age").value || "").trim();
  const food = (document.getElementById("vegnonveg").value || "").trim();

  if (!name || !phoneno || !age || !food) {
    alert("Please fill in your name, phone number, age and food preference 🙂");
    return;
  }

  const finish = (profilePic) => {
    api("/signup", {
      method: "POST",
      body: JSON.stringify({ name, phoneno, age, food, profilePic }),
    })
      .then((user) => {
        setUid(user.id);
        alert("Welcome aboard, " + name + "! Your profile is saved 🎒");
        window.location.href = "index.html";
      })
      .catch((e) => alert("Could not sign up: " + e.message));
  };

  const file = fileInput && fileInput.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = () => finish(reader.result);
    reader.readAsDataURL(file);
  } else {
    finish(null);
  }
}

function changetogreen() {
  const label = document.querySelector(".profilePicture");
  if (label) label.classList.add("chosen");
}

function renderExistingProfiles() {
  const box = document.getElementById("existing-profiles");
  if (!box) return;
  api("/users")
    .then((users) => {
      if (!users.length) { box.innerHTML = ""; return; }
      box.innerHTML =
        "<p class='switch-label'>Or continue as:</p>" +
        users
          .map(
            (u) =>
              `<button type="button" class="switch-user" onclick="continueAs('${u.id}')">` +
              `${u.name}</button>`
          )
          .join(" ");
    })
    .catch(() => { box.innerHTML = ""; });
}

/* ======================================================================== */
/*  PANEL / MODAL TOGGLES                                                    */
/* ======================================================================== */

function showaccountdetails() {
  document.getElementById("account-section").classList.add("open");
  document.getElementById("drawer-overlay").classList.add("open");
}
function hideaccountdetails() {
  document.getElementById("account-section").classList.remove("open");
  document.getElementById("drawer-overlay").classList.remove("open");
}
function showpersonalitytestdialogbox() {
  document.getElementById("personality-modal").classList.add("open");
}
function hidepersonalitytest() {
  document.getElementById("personality-modal").classList.remove("open");
}
function scrollToPlan() {
  const el = document.getElementById("plan");
  if (el) el.scrollIntoView({ behavior: "smooth" });
}

/* ======================================================================== */
/*  PERSONALITY TEST SAVE                                                    */
/* ======================================================================== */

function savepersonalitytest() {
  const uid = getUid();
  if (!uid) { alert("Please sign up first 🙂"); window.location.href = "signup.html"; return; }

  const value = (document.getElementById("personalitytestinputfield").value || "")
    .trim()
    .toUpperCase();
  if (!/^[EI][NS][TF][JP]$/.test(value)) {
    alert("Please enter a valid 16-personalities type, e.g. INFJ or ESTP.");
    return;
  }

  api("/users/" + uid, {
    method: "PATCH",
    body: JSON.stringify({ personality: value }),
  })
    .then(() => {
      alert("Personality saved as " + value + " 🧠");
      window.location.href = "index.html";
    })
    .catch((e) => alert("Could not save: " + e.message));
}

/* ======================================================================== */
/*  TRIP PLAN + FIND BUDDIES  (the core feature)                            */
/* ======================================================================== */

function findpeoplesandsavetrip() {
  const uid = getUid();
  if (!uid) {
    alert("Please sign up first so we can save your trip and find buddies 🙂");
    window.location.href = "signup.html";
    return;
  }

  const trip = {
    startDate: document.getElementById("startdateoftrip").value,
    endDate: document.getElementById("enddateoftrip").value,
    source: (document.getElementById("sourcestartpoint").value || "").trim(),
    destination: (document.getElementById("sourceendpoint").value || "").trim(),
    budget: document.getElementById("budgetoftrip").value,
    food: document.getElementById("foodintripshouldbe").value || "Vegetarian",
    people: document.getElementById("noofpeoplesintrip").value,
  };

  if (!trip.startDate || !trip.endDate || !trip.source || !trip.destination || !trip.budget) {
    alert("Please fill the dates, source, destination and budget so we can find buddies ✈️");
    return;
  }
  if (new Date(trip.startDate) > new Date(trip.endDate)) {
    alert("Trip end date can't be before the start date 🙂");
    return;
  }

  const section = document.getElementById("matches-section");
  const heading = document.getElementById("matches-heading");
  if (section) section.style.display = "block";
  if (heading) heading.innerText = "Finding your travel buddies… ⏳";

  api("/users/" + uid, { method: "PATCH", body: JSON.stringify({ trip }) })
    .then((data) => {
      renderMatches(trip.destination, data.matches || []);
      if (section) section.scrollIntoView({ behavior: "smooth" });
    })
    .catch((e) => alert("Could not find buddies: " + e.message));
}

function renderMatches(destination, matches) {
  const section = document.getElementById("matches-section");
  const list = document.getElementById("matches-list");
  const heading = document.getElementById("matches-heading");
  if (!section || !list) return;

  section.style.display = "block";

  if (!matches.length) {
    heading.innerText = "No buddies found yet for " + destination;
    list.innerHTML =
      "<p class='empty'>Nobody matches your trip right now. Try a popular destination like " +
      "<b>Manali</b> or <b>Goa</b>, or invite friends to sign up! 🙂</p>";
    return;
  }

  heading.innerText =
    "Found " + matches.length + " travel " + (matches.length > 1 ? "buddies" : "buddy") +
    " for " + destination + " 🎉";

  list.innerHTML = matches
    .map((m) => {
      const u = m.user;
      return (
        `<div class="match-card">` +
        `<div class="match-top">` +
        `<img src="${u.profilePic || initialsAvatar(u.name)}" alt="${u.name}">` +
        `<div><h3>${u.name}</h3><span class="match-meta">Age ${u.age} · ${u.personality || "—"}</span></div>` +
        `<span class="match-score">${m.score}%</span>` +
        `</div>` +
        `<p class="route">${u.trip.source} <span>→</span> ${u.trip.destination}</p>` +
        `<p class="dates">📅 ${u.trip.startDate} to ${u.trip.endDate} · 💰 ₹${u.trip.budget} · 🍽️ ${u.trip.food}</p>` +
        `<div class="reasons">${m.reasons.map((r) => `<span class="chip">✔ ${r}</span>`).join("")}</div>` +
        `<a href="tel:${u.phoneno}"><button class="connect-btn">Connect 📞 ${u.phoneno}</button></a>` +
        `</div>`
      );
    })
    .join("");
}

/* ======================================================================== */
/*  HOMEPAGE BOOTSTRAP                                                       */
/* ======================================================================== */

function renderAccountPanel(me) {
  const set = (id, text) => {
    const el = document.getElementById(id);
    if (el) el.innerText = text;
  };
  const pic = document.getElementById("profilepicture");

  if (!me) {
    set("nameshowing", "Guest");
    set("phonenoshowing", "Sign up to create your profile");
    set("personalityshowing", "");
    set("ageshowing", "");
    set("vegnonvegshowing", "");
    if (pic) pic.src = initialsAvatar("Guest");
    return;
  }

  if (pic) pic.src = me.profilePic || initialsAvatar(me.name);
  set("nameshowing", me.name);
  set("phonenoshowing", "📞 " + me.phoneno);
  set("personalityshowing", "🧠 " + (me.personality || "Personality not set"));
  set("ageshowing", "🎂 " + me.age + " years");
  set("vegnonvegshowing", "🍽️ " + me.food);
}

function startbasicfunctions() {
  const greet = document.getElementById("greetuser");
  const uid = getUid();

  if (!uid) {
    if (greet) greet.innerText = "Find your perfect travel buddy 🌍";
    renderAccountPanel(null);
    return;
  }

  api("/users/" + uid)
    .then((me) => {
      if (!me || me.error) { logout(); return; }

      if (greet) greet.innerText = "Hey " + me.name.split(" ")[0] + ", where to next? ✈️";
      renderAccountPanel(me);

      const food = document.getElementById("foodintripshouldbe");
      if (food) food.value = me.food || "Vegetarian";

      if (me.trip && me.trip.destination) {
        const f = (id, v) => { const el = document.getElementById(id); if (el && v != null) el.value = v; };
        f("startdateoftrip", me.trip.startDate);
        f("enddateoftrip", me.trip.endDate);
        f("sourcestartpoint", me.trip.source);
        f("sourceendpoint", me.trip.destination);
        f("budgetoftrip", me.trip.budget);
        f("noofpeoplesintrip", me.trip.people);

        api("/matches/" + uid)
          .then((matches) => renderMatches(me.trip.destination, matches || []))
          .catch(() => {});
      }
    })
    .catch(() => {
      if (greet) greet.innerText = "Find your perfect travel buddy 🌍";
      renderAccountPanel(null);
    });
}

/* Signup-page auto-setup. */
if (typeof document !== "undefined") {
  document.addEventListener("DOMContentLoaded", function () {
    if (document.getElementById("existing-profiles")) {
      renderExistingProfiles();
    }
  });
}
