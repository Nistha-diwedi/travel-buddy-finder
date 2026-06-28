# Travel Buddy Finder 🧳✈️

> 🌍 **Live demo:** https://travel-buddy-finder.nistha-tales.workers.dev

Find people to travel with! Travel Buddy Finder matches solo travellers who are
heading to the **same destination**, around the **same dates**, with a
**similar budget**, **food preference** and **personality** — so you can turn a
solo trip into a shared adventure.

It's a full-stack app on **Cloudflare Workers**: one Worker serves the static
frontend *and* a small JSON API backed by a **D1 (SQLite) database**.

**Tech stack:** vanilla HTML/CSS/JS frontend · Cloudflare Workers · Cloudflare D1.

> 🔐 **No secrets in the browser.** All data access and the matching logic run
> server-side in the Worker. The frontend only calls `/api/*` — there are no
> API keys in the client. The matcher only returns the buddies you actually
> matched with, so other travellers' phone numbers are never bulk-exposed.

---

## ✨ Features

- **Sign up** with name, photo, phone, age and food preference.
- **Add your personality type** from the free [16Personalities test](https://www.16personalities.com/free-personality-test).
- **Plan a trip** (dates, source, destination, budget, group size).
- **Server-side matching algorithm** that scores every other traveller and returns the best buddies with a **match %**, the reasons they matched, and a **Connect** button.
- Profiles and trips persist in the cloud (D1), so matches survive refreshes and work across devices.

---

## 🧠 How the matching works

`src/worker.js` scores every other traveller out of ~100:

| Factor                    | Points |
|---------------------------|--------|
| Same destination          | 40     |
| Same starting city        | 10     |
| Travel dates overlap      | 25     |
| Similar budget (±25%)     | 15 (or 8 for ±50%) |
| Same food preference      | 10     |
| Personality compatibility | up to 10 (2.5 per shared letter) |

Only travellers scoring above 0 are returned, best-first.

---

## 🗂️ Project structure

```
public/            Static frontend (served by the Worker)
  index.html       Dashboard: profile, personality, trip planner, matches
  signup.html      Create / switch traveller profile
  script.js        Client — calls /api/*, renders the UI (no secrets)
  style.css        Styling
  images/          Logo + backgrounds
src/
  worker.js        The Worker: /api/* routes + matching + serves assets
migrations/
  0001_init.sql    D1 schema + sample travellers
wrangler.jsonc     Worker + assets + D1 config
package.json       Scripts
```

### API endpoints

| Method | Path                | Purpose |
|--------|---------------------|---------|
| POST   | `/api/signup`       | Create a profile |
| GET    | `/api/users`        | Minimal list (id + name) for the profile switcher |
| GET    | `/api/users/:id`    | A user's own full profile |
| PATCH  | `/api/users/:id`    | Update personality and/or trip (returns matches) |
| GET    | `/api/matches/:id`  | Matches for a user who already planned a trip |

---

## ▶️ Run it locally

You'll need [Node.js](https://nodejs.org) and a (free) Cloudflare account.

```bash
npm install                 # installs wrangler
npm run db:migrate:local    # create local DB schema + sample travellers
npm run dev                 # start http://localhost:8787
```

Open <http://localhost:8787>, click the user icon → **Sign up**, set a
personality (e.g. `INFJ`), plan a trip to **Manali** or **Goa**, and hit
**Find My Buddies**. The seeded sample travellers make matches show instantly.

---

## 🚀 Deploy to the web

This app is already deployed (see the live demo link above). To push updates,
just run:

```bash
npm run deploy            # redeploy after any frontend/Worker change
npm run db:migrate        # only when you add a new file in migrations/
```

### First-time deploy (fresh Cloudflare account)

If you're setting this up from scratch on a new account:

```bash
npx wrangler login                       # one-time, opens browser
npm run db:create                        # creates the D1 database
# → copy the printed "database_id" into wrangler.jsonc (d1_databases[0].database_id)
npm run db:migrate                        # apply schema + seed to the REMOTE db
npm run deploy                            # deploys; prints your *.workers.dev URL
```

That's it — your app is live, frontend + API + database, with no keys exposed.

### Managing the sample travellers

The 6 demo travellers (ids `seed_*`) are real DB rows. Remove them anytime:

```bash
npx wrangler d1 execute travel-buddy-db --remote --command "DELETE FROM users WHERE id LIKE 'seed_%'"
```

### Adding a real secret later

If you add a third-party API (maps, email, etc.), keep its key server-side:

```bash
npx wrangler secret put MY_API_KEY       # stored encrypted, read via env.MY_API_KEY
```

Never put such keys in `public/` — only use them inside `src/worker.js`.

---

## 🔭 Ideas for next steps

- Real authentication (email/password or Google sign-in) instead of an id in localStorage.
- In-app chat between matched buddies.
- A map view of destinations and filters (age range, gender preference).
- Rate limiting / Turnstile on signup to prevent spam.
