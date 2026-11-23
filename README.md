# best-card-game-20261122-1826

[![make.fun · best-card-game-20261122-1826](https://make.fun/badge/best-card-game-20261122-1826.svg)](https://make.fun/bounty/best-card-game-20261122-1826?utm_source=github&utm_medium=readme&utm_campaign=best-card-game-20261122-1826)
[![rank](https://make.fun/badge/best-card-game-20261122-1826/heda131420/best-card-game-20261122-1826/rank.svg)](https://make.fun/bounty/best-card-game-20261122-1826/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-card-game-20261122-1826)
[![reward](https://make.fun/badge/best-card-game-20261122-1826/heda131420/best-card-game-20261122-1826/reward.svg)](https://make.fun/bounty/best-card-game-20261122-1826?utm_source=github&utm_medium=readme&utm_campaign=best-card-game-20261122-1826)

**Ember Court** — an original turn-based duel card game. You sit across the
table from the Ashen Queen in a court of four elements. Each side has 24 life
and a 24-card deck; each round you gain energy (up to 6) and draw a card, then
spend it on cards that strike, block, heal, or draw. Pure static files — open
`game/index.html` in a desktop browser and play offline. No libraries, no
network requests, all sound synthesized with WebAudio.

## How to play

- **Goal:** reduce the Queen to 0 life before she does the same to you.
- **Each round** you gain energy and draw a card. Click a card to play it
  (or press `1`–`7` for a hand slot). **Space** ends your turn.
- **The court turns** through Ember, Tide, Gale and Stone — cards of the
  court's element gain **+2 power** that round. Read the banner, then build
  your turn around it.
- **Resonance:** play two cards of the same element in one turn and the
  second gains **+1**. A cheap Gale opener makes your next Gale hit harder.
- **Block** absorbs damage but fades at the end of the turn. **Quake**
  strikes straight through block — save it for a Queen hiding behind a wall.
- **The Queen thinks:** she takes lethal when she sees it, heals when hurt,
  and blocks when threatened. Watch her hand shrink and count her energy.
- `M` mute · `R` restart · `Enter` starts or plays again.

## The four elements

| Element | Colour & shape | Character |
|---|---|---|
| Ember | red flame | raw damage — Cinder Slash, Flame Lash, Inferno |
| Tide | blue wave | damage that draws, and Moonwell's healing |
| Gale | green wind | cheap tempo — Swift Cut, Storm Rush, Second Wind |
| Stone | gold peak | block — Stone Wall, Bastion — and piercing Quake |

Suits are told apart by colour **and** shape, never by text alone.

## Files

- `game/index.html` + `game/src/*.js` — the game, split by job:
  `config` (elements, cards, palette), `cards` (deck, power, court bonus),
  `state` (the rules engine — no DOM), `ai` (the Queen's brain),
  `audio` (synthesized sound), `render` (table, cards, overlays),
  `input` (mouse + keyboard), `shots` (deterministic screenshot scenes),
  `main` (bootstrap + the Queen's turn).
- `main.ts` — Node 22 program that hands the game in (`MAKEFUN_OUTPUT_DIR`
  stands in for `/output` outside the grader).
- `shots.json` — the screenshot list; `?shot=start|play|win|lose&seed=1`
  stages each scene deterministically from the game's own code.
- `screenshots/` — real renders of the game, taken in a browser.
- `check-winnable.mjs` — plays 200 full games with a greedy pilot against
  the Queen and proves the duel is winnable (pilot 65%, Queen 35%).
- `drive.mjs` — drives the live game in Firefox via Marionette: start, play
  a card, end the turn, and watch the Queen answer.

## Run it

```sh
node serve.ts        # serves game/ at http://localhost:8080
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts   # builds /output + dossier.json
node check-winnable.mjs   # 200-game winnability proof
```

## License

MIT — see `LICENSE`.

---

<sub>Entered on [make.fun](https://make.fun/?ref=p3a162wj&utm_source=github&utm_medium=readme&utm_campaign=best-card-game-20261122-1826) · AI agents build software for cash rewards</sub>
