/* =========================================================================
   Travel Buddy Finder — Cloudflare Worker (backend)
   -------------------------------------------------------------------------
   - Serves the static frontend from /public via the ASSETS binding.
   - Exposes a small JSON API under /api/* backed by a D1 database.
   - The matching algorithm runs HERE (server-side), so the browser never
     downloads every traveller's contact details — only the buddies it
     actually matched with. No API keys live in the client.
   ========================================================================= */

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname.startsWith("/api/")) {
      try {
        return await handleApi(request, env, url);
      } catch (err) {
        return json({ error: err.message || "Server error" }, 500);
      }
    }

    // Everything else is a static asset (index.html, signup.html, css, images…)
    return env.ASSETS.fetch(request);
  },
};

/* ---------- helpers -------------------------------------------------------- */

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function newId() {
  return "u_" + crypto.randomUUID().replace(/-/g, "").slice(0, 16);
}

// Turn a DB row into a client-facing user object (trip parsed from JSON).
function rowToUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    phoneno: row.phoneno,
    age: row.age,
    food: row.food,
    personality: row.personality || "",
    profilePic: row.profilePic || null,
    trip: row.trip ? JSON.parse(row.trip) : null,
  };
}

/* ---------- API router ----------------------------------------------------- */

async function handleApi(request, env, url) {
  const parts = url.pathname.split("/").filter(Boolean); // ["api", ...]
  const method = request.method;

  // POST /api/signup
  if (method === "POST" && parts[1] === "signup") {
    const body = await request.json();
    const name = (body.name || "").trim();
    const phoneno = (body.phoneno || "").trim();
    const age = (body.age || "").trim();
    const food = (body.food || "").trim();
    if (!name || !phoneno || !age || !food) {
      return json({ error: "Missing required fields" }, 400);
    }
    const id = newId();
    await env.DB.prepare(
      "INSERT INTO users (id, name, phoneno, age, food, personality, profilePic, trip) " +
        "VALUES (?, ?, ?, ?, ?, '', ?, NULL)"
    )
      .bind(id, name, phoneno, age, food, body.profilePic || null)
      .run();
    return json({ id, name, phoneno, age, food, personality: "", trip: null });
  }

  // GET /api/users  -> minimal list (id + name only) for the "continue as" switcher
  if (method === "GET" && parts[1] === "users" && parts.length === 2) {
    const { results } = await env.DB.prepare(
      "SELECT id, name FROM users ORDER BY name"
    ).all();
    return json(results || []);
  }

  // GET /api/users/:id  -> full profile (the logged-in user's own data)
  if (method === "GET" && parts[1] === "users" && parts[2]) {
    const row = await env.DB.prepare("SELECT * FROM users WHERE id = ?")
      .bind(parts[2])
      .first();
    if (!row) return json({ error: "User not found" }, 404);
    return json(rowToUser(row));
  }

  // PATCH /api/users/:id  -> update personality and/or trip; returns updated user (+ matches if a trip is set)
  if (method === "PATCH" && parts[1] === "users" && parts[2]) {
    const id = parts[2];
    const body = await request.json();

    const existing = await env.DB.prepare("SELECT * FROM users WHERE id = ?")
      .bind(id)
      .first();
    if (!existing) return json({ error: "User not found" }, 404);

    if (typeof body.personality === "string") {
      const p = body.personality.trim().toUpperCase();
      if (!/^[EI][NS][TF][JP]$/.test(p)) {
        return json({ error: "Invalid personality type" }, 400);
      }
      await env.DB.prepare("UPDATE users SET personality = ? WHERE id = ?")
        .bind(p, id)
        .run();
    }

    if (body.trip) {
      const t = body.trip;
      if (!t.startDate || !t.endDate || !t.source || !t.destination || !t.budget) {
        return json({ error: "Incomplete trip" }, 400);
      }
      await env.DB.prepare("UPDATE users SET trip = ? WHERE id = ?")
        .bind(JSON.stringify(t), id)
        .run();
    }

    const updatedRow = await env.DB.prepare("SELECT * FROM users WHERE id = ?")
      .bind(id)
      .first();
    const me = rowToUser(updatedRow);
    const matches = me.trip ? await computeMatches(env, me) : [];
    return json({ user: me, matches });
  }

  // GET /api/matches/:id  -> matches for a user who already planned a trip
  if (method === "GET" && parts[1] === "matches" && parts[2]) {
    const row = await env.DB.prepare("SELECT * FROM users WHERE id = ?")
      .bind(parts[2])
      .first();
    const me = rowToUser(row);
    if (!me || !me.trip) return json([]);
    return json(await computeMatches(env, me));
  }

  return json({ error: "Not found" }, 404);
}

/* ======================================================================== */
/*  MATCHING ALGORITHM (server-side)                                        */
/* ======================================================================== */

function datesOverlap(a1, a2, b1, b2) {
  if (!a1 || !a2 || !b1 || !b2) return false;
  return new Date(a1) <= new Date(b2) && new Date(b1) <= new Date(a2);
}

function personalityScore(p1, p2) {
  if (!p1 || !p2 || p1.length !== 4 || p2.length !== 4) return 0;
  let shared = 0;
  for (let i = 0; i < 4; i++) {
    if (p1[i].toUpperCase() === p2[i].toUpperCase()) shared++;
  }
  return shared * 2.5; // 0..10
}

function scoreMatch(me, other) {
  const a = me.trip, b = other.trip;
  let score = 0;
  const reasons = [];

  if (a.destination && b.destination &&
      a.destination.trim().toLowerCase() === b.destination.trim().toLowerCase()) {
    score += 40;
    reasons.push("Same destination (" + b.destination + ")");
  } else if (a.source && b.source &&
             a.source.trim().toLowerCase() === b.source.trim().toLowerCase()) {
    score += 10;
    reasons.push("Same starting city");
  }

  if (datesOverlap(a.startDate, a.endDate, b.startDate, b.endDate)) {
    score += 25;
    reasons.push("Trip dates overlap");
  }

  const ba = Number(a.budget), bb = Number(b.budget);
  if (ba > 0 && bb > 0) {
    const diff = Math.abs(ba - bb) / Math.max(ba, bb);
    if (diff <= 0.25) { score += 15; reasons.push("Similar budget"); }
    else if (diff <= 0.5) { score += 8; reasons.push("Comparable budget"); }
  }

  if (a.food && b.food && a.food.trim().toLowerCase() === b.food.trim().toLowerCase()) {
    score += 10;
    reasons.push("Same food preference (" + b.food + ")");
  }

  const ps = personalityScore(me.personality, other.personality);
  if (ps > 0) {
    score += ps;
    reasons.push("Personality match " + me.personality + " ↔ " + other.personality);
  }

  return { score: Math.round(score), reasons };
}

async function computeMatches(env, me) {
  const { results } = await env.DB.prepare(
    "SELECT id, name, phoneno, age, personality, profilePic, trip FROM users " +
      "WHERE id != ? AND trip IS NOT NULL"
  )
    .bind(me.id)
    .all();

  return (results || [])
    .map((r) => rowToUser(r))
    .filter((u) => u.trip && u.trip.destination)
    .map((u) => {
      const { score, reasons } = scoreMatch(me, u);
      return {
        score,
        reasons,
        user: {
          name: u.name,
          age: u.age,
          personality: u.personality,
          phoneno: u.phoneno,
          profilePic: u.profilePic,
          trip: u.trip,
        },
      };
    })
    .filter((m) => m.score > 0)
    .sort((x, y) => y.score - x.score);
}
