# Baithak

A collection of party games, picking tools and a little festival fireworks show for when your group can't decide (or just wants to play). Built with React, TypeScript, and Tailwind CSS.

## Games

**Pictionary** — Team drawing game. Set up teams and players, pick a difficulty, and each player takes a turn drawing a secret word while their team guesses before the timer runs out (2 minutes by default). Correct guesses score points, wrong guesses and skips cost a point, and scores are tracked per player and per team.

**Spin Wheel** — Add your own choices (truth-or-dare prompts, food options, movie picks, anything), spin the wheel, and let it land on one. Comes preloaded with a party-game deck. Tracks spin history and stats.

**Spin Bottle** — Add your players, flick the bottle, and see who it points to. Physics-based spin with drag-to-flick or a random-spin button.

**Combo** — Combines the two: spin the bottle to pick a person, then spin the wheel to pick their challenge. Good for a group that wants both "who" and "what" decided for them each round.

**Color Splash** — A fluid color-mixing playground, just for fun between rounds. Paint, splash, and blend colors on a WebGL canvas.

**Fireworks** — A Japanese summer-festival (hanabi) night scene with a river, Mt. Fuji, a torii gate, a pagoda and an arched lantern bridge, plus an interactive firework show:
- Tap or click the sky (or press any key) to launch a shell. Pick a style — **Kiku** (chrysanthemum, long comet tails), **Botan** (peony, round ball of bright stars), **Double** (a ring inside an outer burst), **Willow** (slow golden droop) or **Mix** — or switch on **Auto** for a hands-free show.
- Type a name or message (up to 30 characters) and it is spelled out in fireworks: a volley of colourful shells first, then the text appears inside a burst. Long messages wrap onto several lines and scale to fit any screen.
- Rendered sharply at the device's native pixel density (up to 3x), with real recorded burst sounds that follow the sound toggle.

The game switcher collapses into a dropdown on phones and tablets and shows as a full tab bar on larger screens.

## Running locally

```bash
npm install
npm run dev
```

Build for production with `npm run build`.
