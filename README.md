# ⌨️ Typing Master

A lightweight, dependency-free **typing speed tester** built with plain HTML, CSS, and JavaScript. Type a passage against the clock and get live feedback on **WPM (Words Per Minute)**, **CPM (Characters Per Minute)**, **accuracy**, and **errors** — with your personal best saved locally.

**Live files:** `Index.html` · `style.css` · `script.js`
No build step, no frameworks, no dependencies. Open `Index.html` in a browser and go.

---

## Table of Contents

1. [Features](#features)
2. [Tech Stack](#tech-stack)
3. [Project Structure](#project-structure)
4. [How It Works (Architecture)](#how-it-works-architecture)
5. [Core Algorithms Explained](#core-algorithms-explained)
6. [Deep-Dive Q&A (the tough questions)](#deep-dive-qa-the-tough-questions)
7. [Known Bugs & Edge Cases](#known-bugs--edge-cases)
8. [Running Locally](#running-locally)
9. [Suggested Improvements](#suggested-improvements)

---

## Features

- Three built-in sample texts (**Easy / Medium / Hard**) plus a **Custom text** mode
- Selectable test duration: **15s / 30s / 60s / 120s**
- Live per-character feedback (correct / incorrect / current cursor position)
- Real-time **WPM**, **CPM**, **accuracy**, and **error count** while typing
- Final results computed when the timer ends
- **Best WPM** persisted across sessions via `localStorage`
- Keyboard-first UX — typing anywhere on the page (without clicking the textarea) auto-focuses and starts the test
- `Esc` key instantly resets the test
- Responsive layout (single column below 900px)

## Tech Stack

| Layer | Technology |
|---|---|
| Markup | HTML5 |
| Styling | Vanilla CSS3 (CSS custom properties / `:root` variables, CSS Grid, Flexbox) |
| Logic | Vanilla JavaScript (ES6, no libraries/frameworks) |
| Persistence | Browser `localStorage` |

There is no backend, no package.json, and no build tooling — this is a pure static site.

## Project Structure

```
Typing-Master/
├── Index.html      # Markup + element IDs the script hooks into
├── style.css       # All visual styling (dark theme, cards, grid layout)
├── script.js       # All application logic (state, timer, scoring, DOM updates)
└── README.md
```

Note the entry file is capitalized `Index.html` (not `index.html`), which matters on case-sensitive file systems / static hosts (see [Known Bugs](#known-bugs--edge-cases)).

## How It Works (Architecture)

The app is a single-page, single-state-machine widget with no routing and no components — everything lives in module-level variables inside `script.js`.

**State variables:**
```js
sampleText     // the paragraph currently being typed
timer          // setInterval handle for the countdown
timeLeft       // seconds remaining
started        // boolean: is a test in progress
totalTyped     // input.value.length snapshot
correctChars   // count of correctly typed characters
errors         // count of incorrectly typed characters
startTime      // Date.now() captured at test start
```

**Lifecycle:**

1. **Init** (`IIFE` at bottom of file) → `renderText()` builds one `<span>` per character of `sampleText` inside `#textDisplay`, then `resetStats()` zeroes all counters and disables the `<textarea>`.
2. **Trigger start** → either clicking **Start**, typing into the (enabled) textarea, or pressing any printable key anywhere on the page while the test is idle. All three paths converge on `startTest()`.
3. **`startTest()`** enables the textarea, focuses it, stamps `startTime`, and kicks off a `setInterval` ticking once per second, updating the countdown display and a CSS-width progress bar.
4. **Every keystroke** fires the textarea's `input` event → `updateSpans(cursor)`, which:
   - Re-classifies every character span as `.correct` / `.incorrect` based on comparison with `input.value`
   - Tags the span at the current cursor index with `.current` (for the caret highlight)
   - Recomputes `correctChars`, `errors`, `accuracy`, and a **live/estimated WPM & CPM** using elapsed real time (`Date.now() - startTime`)
5. **Timer hits 0** → `finishTest()` stops the interval, disables the textarea, and computes the **final** WPM/CPM using the *test duration actually elapsed* (not wall-clock `Date.now()`), then compares against `localStorage` to possibly update the best score.
6. **Reset paths** — the **Reset** button, the `Esc` key, or changing the duration/sample dropdown all call `renderText()` + `resetStats()` to return to the idle state.

There is no virtual DOM or diffing: `updateSpans` walks the live `<span>` NodeList directly on every keystroke, which is fine for the short passages used here (tens to a couple hundred characters).

## Core Algorithms Explained

### WPM (Words Per Minute)
```js
const words = correctChars / 5;
const wpm = Math.round(words / minutes);
```
The industry-standard convention (used by typing tests generally) treats **5 characters as one "word"**, regardless of actual word boundaries — this normalizes scoring across short and long words. Only `correctChars` count toward WPM, so mistakes actively lower your speed score, not just your accuracy.

### CPM (Characters Per Minute)
```js
const cpm = Math.round(correctChars / minutes);
```
Same numerator as WPM, just not divided by 5 — a straightforward characters-per-minute rate based only on correct characters.

### Accuracy
```js
const acc = totalTyped ? Math.round((correctChars / totalTyped) * 100) : 100;
```
`totalTyped` is the raw length of whatever is in the textarea right now (correct + incorrect keystrokes), so this is a **live, cumulative** accuracy — it does not account for characters you typed, then deleted and fixed (backspacing simply shortens `input.value`, and everything is recomputed from scratch on the next `input` event).

### Two different "minutes" denominators
- **Live view** (`updateSpans`, while `started === true`): `minutes = (Date.now() - startTime) / 1000 / 60` — true wall-clock elapsed time.
- **Final view** (`finishTest`): `minutes = (selectedDuration - timeLeft) / 60`, i.e. the countdown-based elapsed time, falling back to the full selected duration if that value is falsy.

These two clocks normally agree, but see the [drift caveat](#4-does-the-countdown-timer-drift) below for why they can diverge slightly.

## Deep-Dive Q&A (the tough questions)

#### 1. Why is WPM based on `correctChars / 5` instead of splitting on spaces?
Splitting on literal spaces would make WPM depend heavily on the specific sample text's word lengths and punctuation, and would break entirely for a custom text with unusual spacing. The 5-characters-per-word convention is a fixed, text-independent normalization standard, and using only *correct* characters means a fast-but-sloppy typist doesn't get rewarded for characters that don't count.

#### 2. Can accuracy go above 100% or below 0%?
No — mathematically `correctChars` can never exceed `totalTyped` (every typed character is classified as either correct or incorrect, and nothing else increments `correctChars`), so the ratio is bounded to `[0, 100]`. The only special case is `totalTyped === 0`, which is hardcoded to display `100%` rather than `0/0`.

#### 3. What happens if you type past the end of the sample text?
`updateSpans` loops `for (let i=0; i<typed.length; i++)` and does `if (!span) break;` once the index exceeds the number of rendered `<span>` characters. This means:
- Extra keystrokes beyond the sample length are **silently ignored** for correctness/error classification.
- `charsEl` (the "Characters" stat) is still set to the full `input.value.length`, **including the overtyped characters**, so `Characters` can temporarily be *higher* than what's visually marked correct/incorrect — accuracy is still computed against this inflated `totalTyped`, so overtyping past the end of the text will silently drag your live accuracy down.
- There's no built-in "test complete when text is finished" condition — the test only ends when the countdown timer hits zero, even if you finish the passage early. Finishing early just leaves you typing into empty space with no further feedback until time runs out.

#### 4. Does the countdown timer drift?
Slightly, yes — this is a classic `setInterval` caveat. `setInterval(fn, 1000)` schedules callbacks roughly every 1000ms, but JavaScript's event loop can delay execution (tab throttling in background tabs, main-thread congestion, GC pauses), so the *actual* elapsed wall-clock time can end up a bit longer than `1000ms × ticks`. Because `finishTest()`'s WPM calculation uses `(selectedDuration - timeLeft)` — i.e., trusts the tick count, not `Date.now()` — a drifted timer means the final WPM is computed against a "minutes" value that's slightly shorter than what actually elapsed, which can slightly **inflate** the reported final WPM/CPM versus the live estimate shown a moment before. A `Date.now()`-based elapsed-time calculation (like the live view already uses) would be drift-proof; the final calculation is not.

#### 5. What's the actual bug in the "Custom" sample text branch?
In `script.js`, the `sampleSelect` change handler contains:
```js
customWrap.style.display = 'block';n
```
That trailing `n` after the semicolon is a stray, unintended token — it's parsed as a bare identifier expression statement. Since `n` is never declared anywhere, **selecting "Custom" from the sample dropdown throws `Uncaught ReferenceError: n is not defined`**, which halts that event handler mid-execution. In practice this means the line `sampleText = customText.value || '';` right after it **never runs** when you first switch to Custom, and the custom textarea's own `input` listener is what actually ends up driving `sampleText` afterward. This is a straightforward typo bug (likely a stray keystroke) rather than intentional logic — removing the `n` fixes it cleanly.

#### 6. How does "type anywhere to start" avoid conflicting with normal typing in the textarea?
The global `keydown` listener guards with `if (!started && e.key.length === 1)` **and** `if (document.activeElement !== input)`. So:
- It only fires when the test hasn't started yet (avoids hijacking keystrokes mid-test).
- It only fires when the textarea *isn't* already focused (avoids double-inserting characters, since if the textarea were focused, its own `input` event handler would already fire naturally and call `startTest()` itself).
- `e.key.length === 1` filters out non-printable keys (`Shift`, `Enter`, `ArrowLeft`, etc.), so only actual character keys trigger the auto-focus-and-type behavior.
- It manually appends the pressed key to `input.value`, calls `updateSpans`, then `startTest()`, and calls `e.preventDefault()` to stop the browser's default handling of that keypress (which matters since focus is being programmatically moved mid-event).

#### 7. Why is `Escape` special-cased separately from the Reset button, given they call the same functions?
Functionally they're identical (`renderText(); resetStats();`), but `Esc` is bound at the `document` level so it works **regardless of what currently has focus** — including while actively typing inside the disabled-vs-enabled textarea — giving a quick "abort and restart" shortcut without needing to reach for the mouse. It's a UX convenience wired directly into the same global `keydown` listener used for the auto-start behavior, and it returns early (before the auto-start logic below it) so `Escape` never accidentally gets treated as a length-1 printable key.

#### 8. How is the "Best WPM" persisted, and is it per-duration or global?
It's stored under a single fixed key, `typing_best_wpm_v1`, in `localStorage`, as a plain integer string. It is **not** scoped by test duration or sample difficulty — a 15-second "Easy" run and a 120-second "Hard" run share the same best-score slot. So switching duration/sample settings and beating your best under *easier* conditions will silently overwrite a best that was earned under *harder* conditions. This also means the score persists across browser sessions and page reloads (it's `localStorage`, not `sessionStorage`), but is scoped to that specific browser/profile/origin — it won't sync across devices or browsers, and opening the page via `file://` versus a local server can even produce separate storage origins.

#### 9. What happens across multiple browser tabs open at once?
Each tab keeps its own independent in-memory state (`started`, `timeLeft`, `correctChars`, etc.) — there's no `BroadcastChannel` or `storage` event listener syncing tabs. The only shared state is the `localStorage` best-score key, which is read once on page load (`loadBest()`) and written once per finished test. So if Tab A sets a new best while Tab B is already open, Tab B's `#best` display won't update until it re-reads storage (e.g., on its own next `finishTest()` or a manual reload).

#### 10. Is the app accessible?
Partially. `#textDisplay` has `aria-live="polite"`, so screen readers will announce content changes as you type — though because it re-renders per-character spans on every keystroke rather than announcing a summary, this could be quite noisy for a screen reader user in practice. The textarea uses a native `disabled` attribute (properly excluded from the tab order / non-interactive when idle) with a `placeholder` documenting how to begin. There are no `aria-label`s on the stat blocks (`WPM`, `Accuracy`, etc.) beyond their visible text labels, and color is used as the sole differentiator for correct (`--good`, green) vs incorrect (`--bad`, red) characters — the incorrect state does add a `text-decoration: underline wavy` as a non-color-dependent cue, but the correct state has no equivalent, so colorblind users may have difficulty distinguishing "correct" from untouched text at a glance.

#### 11. Why does changing the duration or sample text reset the whole test, even mid-run?
`timeSelect` and `sampleSelect` both call `resetStats()` (and `renderText()` for sample changes) unconditionally in their `change` handlers, with no check for `started`. This is a deliberate simplicity trade-off: there's no "are you sure, you'll lose your progress" guard, and no support for changing settings without interrupting an active run. Given the app's small scope, this favors predictability (settings changes always yield a clean slate) over mid-test flexibility.

#### 12. How would you add a new language or a much longer sample text?
Add a new key to the `SAMPLES` object at the top of `script.js` and a corresponding `<option>` in `#sampleSelect` in `Index.html` with a matching `value`. No other code changes are needed — `renderText()` and `updateSpans()` are entirely text-agnostic (they operate on `sampleText.length` and character-by-character comparison), so they scale to any string, including non-Latin scripts, as long as the characters can be typed via a standard keyboard/IME and rendered as individual `<span>`s.

## Known Bugs & Edge Cases

| # | Issue | Location | Effect |
|---|---|---|---|
| 1 | Stray `n` token | `script.js`, `sampleSelect` change handler | Throws `ReferenceError` when switching to "Custom", silently breaking that line of the handler |
| 2 | No "finished early" detection | `script.js`, `updateSpans` | Finishing the passage before time is up leaves you typing into the void with no end-of-text feedback |
| 3 | Overtyping inflates character count | `script.js`, `updateSpans` | `charsEl`/accuracy include keystrokes typed past the end of the sample, even though they're not visually scored |
| 4 | Timer drift in final score | `script.js`, `finishTest` | Uses tick-count elapsed time rather than `Date.now()`, so background-tab throttling can skew the final WPM slightly high |
| 5 | Single global best score | `script.js`, `BEST_KEY` | Best WPM isn't scoped per duration/difficulty, so easier settings can overwrite a harder-earned record |
| 6 | Entry file capitalization | `Index.html` | Capital `I` can cause case-sensitivity issues on Linux-based static hosts expecting `index.html` |

## Running Locally

No build step required.

```bash
git clone https://github.com/Soubhagya-Nayak/Typing-Master.git
cd Typing-Master
# then simply open Index.html in your browser, e.g.:
open Index.html        # macOS
start Index.html        # Windows
xdg-open Index.html     # Linux
```

Or serve it with any static server (recommended, so `localStorage` behaves consistently and avoids `file://` quirks):

```bash
npx serve .
# or
python3 -m http.server 8000
```

## Suggested Improvements

- Fix the `n` typo in the custom-text branch
- Track best score per (duration × sample) combination, or at least label which combination the saved best belongs to
- Use `Date.now()`-based elapsed time in `finishTest()` for drift-proof final scoring
- Stop the test automatically once the full sample text has been typed correctly (a "finished early" state)
- Add a non-color visual cue for correct characters (not just red/underline for incorrect) to aid colorblind users
- Rename `Index.html` → `index.html` for portability across case-sensitive hosts
- Add a results history (not just a single best score) via `localStorage` or `IndexedDB`
