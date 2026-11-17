# TYPE//RACE — Offline Typing Competition Kiosk

A dedicated, local-first typing competition kiosk built for in-person physical events.

---

## ⚡ Overview

**TYPE//RACE** is designed for a single computer at an event:
1. Competitor walks up to the kiosk.
2. Enters their **Name** and **Participant ID**.
3. Takes an exact **40-second typing test** with Monkeytype-style aesthetics and mechanics.
4. Sees their final **WPM**, **Accuracy**, and **Rank**, with an instant celebration if they make the **TOP FIVE**.
5. Automatically returns to the **Leaderboard** after 5 seconds for the next competitor.

---

## 🛠️ Technology Stack

- **Frontend**: React 18, TypeScript, Vite, Custom CSS (Monkeytype-inspired dark charcoal `#323437`, muted `#646669`, main `#d1d0c5`, warm yellow accent `#e2b714`).
- **Backend**: Node.js, Express, TypeScript (strictly bound to `127.0.0.1` / localhost).
- **Data Storage**: Local JSON file (`data/competition.json`) with atomic write safety and concurrent write queueing.
- **Offline**: Zero cloud databases, zero external services, zero internet requirement after package installation.

---

## 📁 Project Architecture

```
TYPE-RACE/
├── data/
│   └── competition.json         # Permanent source of truth for all competition records
├── server/
│   ├── src/
│   │   ├── index.ts             # Express server entry point & static file hosting
│   │   ├── database.ts          # Atomic JSON file data access layer & tiebreak sorting
│   │   └── routes/
│   │       └── competition.ts   # REST API endpoints (start, finish, export, clear)
│   └── tsconfig.json
├── src/
│   ├── components/
│   │   ├── Leaderboard.tsx      # Full leaderboard with top 5 visual distinctions
│   │   ├── ParticipantForm.tsx  # Name & unique ID registration with validation
│   │   ├── TypingTest.tsx       # 40-second test with live WPM, accuracy & caret
│   │   ├── ResultScreen.tsx     # Top 5 celebration & 5s automatic return
│   │   └── AdminControls.tsx    # Unobtrusive admin modal (CSV export, data reset)
│   ├── hooks/
│   │   ├── useCompetition.ts    # Server sync, recovery detection, active attempt state
│   │   └── useTypingTest.ts     # Precise timestamp-based countdown & keystroke engine
│   ├── services/
│   │   ├── api.ts               # Local HTTP API client
│   │   ├── scoring.ts           # Standard WPM & Accuracy formulas
│   │   └── wordGenerator.ts     # Consistent English word pool generator
│   ├── types/
│   │   └── index.ts             # TypeScript interfaces
│   ├── styles/
│   │   └── global.css           # Minimalist Monkeytype-inspired theme
│   ├── App.tsx                  # Root state orchestration & recovery banner
│   └── main.tsx                 # React DOM mount
├── tests/
│   ├── competition.test.ts      # Automated unit test suite (8 test suites)
│   └── api.test.ts              # Express API integration test suite
├── package.json
└── README.md
```

---

## 🚀 Getting Started

### 1. Install Dependencies

```bash
npm install
```

### 2. Run in Development Mode

Starts both the local Express backend and the Vite client concurrently:

```bash
npm run dev
```

- **Frontend**: http://localhost:5173
- **Backend API**: http://127.0.0.1:3001/api/health

### 3. Run in Production Standalone Mode (Recommended for the Event)

Build both the client and server, then launch the standalone kiosk server:

```bash
npm run build
npm start
```

Open your browser to:
**http://localhost:3001**

In production mode, the Express server serves both the competition API and the optimized static client on a single port (`3001`) with **zero** external network dependencies.

---

## 🏆 Competition Rules & Scoring

### Words Per Minute (WPM)
Calculated using the standard five-character word convention:
$$\text{WPM} = \frac{\text{Correct Characters} / 5}{\text{Elapsed Time in Minutes}}$$
- Duration is capped at 40 seconds ($40 / 60 = 2/3\text{ minute}$).
- Displayed as an integer.

### Accuracy Percentage
$$\text{Accuracy} = \left(\frac{\text{Correct Characters}}{\text{Total Typed Characters}}\right) \times 100$$
- Displayed with two decimal places (e.g. `98.50%`).

### Leaderboard Sorting Rules
1. **Highest WPM** ranks first.
2. If WPM is equal, **higher accuracy** ranks first.
3. If both are equal, the **earlier submission timestamp** ranks first.

### Top 5 Visual Distinctions
- **1st Place**: Gold badge, gold glow, and trophy icon.
- **2nd Place**: Silver badge and medal icon.
- **3rd Place**: Bronze badge and award icon.
- **4th & 5th Place**: Warm yellow accent badge.
- **6th and beyond**: Subdued appearance in the scrollable leaderboard.

---

## 🛡️ Anti-Cheating & Fairness Guarantees

- **Unique Participant IDs**: IDs are compared case-insensitively and trimmed of whitespace. A participant cannot enter a second attempt with the same ID, even after refreshing or restarting the browser.
- **Interrupted Attempt Recovery**: When an attempt starts, an active attempt record is written to `data/competition.json`. If the page reloads or crashes:
  - The kiosk detects the unfinished attempt.
  - Recovers the remaining time from the original start timestamp (e.g., if 15 seconds elapsed, 25 seconds remain).
  - The participant is **never** granted a fresh 40 seconds.
  - If the 40-second window expired while away, the attempt is marked abandoned and the ID remains reserved.

---

## ⚙️ Administration & Data Operations

### Location of `competition.json`
The permanent competition record is located directly on disk at:
```
data/competition.json
```
You can inspect or copy this file at any time.

### Exporting to CSV
1. Click the unobtrusive **Admin** button in the bottom right footer.
2. Click **Export Leaderboard to CSV**.
3. A `.csv` file will download with the full sorted leaderboard:
   - Rank
   - Participant Name
   - Participant ID
   - WPM
   - Accuracy (%)
   - Submission Timestamp

### Resetting Competition Data
To wipe competition records for a new session or test run:
1. Click the **Admin** button in the footer.
2. Click **Reset Competition Data**.
3. Enter `RESET` into the confirmation field and click **Confirm Reset**.

---

## 🧪 Running Automated Tests

Run the test suite verifying scoring, word generation, duplicate rejection, leaderboard sorting, tiebreaking, top-five thresholds, and data persistence:

```bash
npm test
```
