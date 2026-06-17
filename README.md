# Dad Trivia Night 🎉

Two browser-based party games for game night. One person **hosts** on a big
screen; everyone else **joins from their phones**. State syncs across devices
through a small Vercel serverless API backed by **Vercel KV (Upstash Redis)**.

| File | Game | How it works |
|------|------|--------------|
| `index.html` | Launcher | Pick a game |
| `dad-facts-quiz.html` | **Dad Facts Quiz** | Multiple choice; answer fast for a speed bonus |
| `dad-trivia-game.html` | **Guess the Dad** | Read the joke, type which dad told it |
| `api/game.js` | Backend | One serverless function: create / join / answer / update / score / snapshot |

There's no Firebase and nothing to paste — players just need the PIN or join link.

## Architecture

- **Frontend:** static HTML/CSS/JS (no build step).
- **Backend:** a single Vercel serverless function at `/api/game` storing each
  game under keys `game:<PIN>:*` in Redis, with a 4-hour TTL.
- **Realtime:** clients poll `GET /api/game?pin=…` every ~2 seconds. Simple and
  robust for a trivia game; no WebSockets needed.

## Deploy on Vercel

1. **Import the repo** into Vercel (no framework preset — it deploys as static
   files plus the `/api` function automatically).
2. **Add a database:** in the project, go to **Storage → Create Database →
   KV (Upstash Redis)** and connect it to the project. This injects the
   credentials the API needs (`KV_REST_API_URL` / `KV_REST_API_TOKEN`, or the
   Upstash equivalents — the function accepts either).
3. **Redeploy** so the function picks up the new env vars.
4. Open your Vercel URL → **Host a game** → share the PIN or **Copy join link**.

> If the API returns *"Database not configured"*, the KV store isn't connected
> yet — finish step 2 and redeploy.

## Run locally

Use the Vercel CLI so the `/api` function runs too:

```bash
npm install
npm i -g vercel
vercel dev      # then open http://localhost:3000
```

Set `KV_REST_API_URL` and `KV_REST_API_TOKEN` (e.g. in `.env.local`, or pull
them with `vercel env pull`) so the function can reach your store.

Opening the HTML files directly (`file://`) or via a plain static server will
show the UI, but hosting/joining won't work without the `/api` function.

## Notes

- Games auto-expire from the database 4 hours after they're created.
- Point scoring (speed bonus for the quiz, exact-match award for Guess the Dad)
  is computed by the host's browser, which then tells the API how many points to
  add — so correct answers aren't sent to players' devices ahead of the reveal.
