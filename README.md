# Dad Trivia Night 🎉

Two browser-based party games for game night. One person **hosts** on a big
screen; everyone else **joins from their phones**. The games sync live across
devices through a free Firebase Realtime Database.

| File | Game | How it works |
|------|------|--------------|
| `index.html` | Launcher | Pick a game and save your Firebase URL once |
| `dad-facts-quiz.html` | **Dad Facts Quiz** | Multiple choice; answer fast for a speed bonus |
| `dad-trivia-game.html` | **Guess the Dad** | Read the joke, type which dad told it |

Each game file is fully self-contained (HTML + CSS + JS, no build step).

## Running it

These are static files. The easiest options:

**Locally with a quick server** (recommended — clipboard + join links work best over `http`):

```bash
cd dadtrivia
python3 -m http.server 8000
# then open http://localhost:8000/ in your browser
```

(Any static server works — e.g. `npx serve` if you prefer Node.)

**Or just open the file**: double-click `index.html`. This works for a single
machine, but to actually play across phones you need the files hosted somewhere
every device can reach — see below.

## Playing across devices (the real party setup)

Phones can't open another machine's `file://` or `localhost`, so to play
together, host the files somewhere public. **GitHub Pages** is free and easy:

1. Push this repo to GitHub.
2. Repo **Settings → Pages → Build from branch**, pick the branch and `/root`.
3. Open the published URL (e.g. `https://<you>.github.io/dadtrivia/`).

Then:

1. **Set up Firebase once** on the launcher page (`index.html`) — paste your
   Realtime Database URL. It's saved in the browser and shared by both games.
   - Create a project at <https://console.firebase.google.com> (skip Analytics).
   - Add a **Realtime Database** and start it in **test mode**.
   - Copy the database URL (`https://your-project-default-rtdb.firebaseio.com`).
2. Open a game and click **Host a game**. The URL is pre-filled; launch the lobby.
3. Hit **Copy join link** and send it to your players. The link drops them
   straight into the game — no PIN typing, no URL pasting. (They can still join
   manually with the 6-character PIN if they prefer.)
4. Start the game and play.

## Notes

- **Test mode** Firebase rules are open to anyone with the URL, which is fine
  for a casual game night. For anything longer-lived, lock down the rules.
- Games auto-delete from the database 4 hours after launch.
- The Firebase URL is stored only in your browser's `localStorage`, never
  committed to the repo.
