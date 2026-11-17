# TYPE//RACE

**A local-first, offline typing competition kiosk.**

TYPE//RACE is a lightweight typing competition application designed for events where participants take turns on a shared computer. Each participant gets a 40-second typing round, and their results are automatically recorded and ranked on a live leaderboard.

Inspired by the minimal typing experience of Monkeytype.

## Requirements

- Node.js and npm
- A modern web browser
- Windows, macOS, or Linux

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/Shaquibbai/type_race.iutcs
cd TYPE-RACE
```

### 2. Install dependencies

```bash
npm install
```

### 3. Run in development mode

```bash
npm run dev
```

Open the local development URL shown in your terminal (usually `http://localhost:5173`).

### 4. Build for production

```bash
npm run build
```

### 5. Start the production application

```bash
npm start
```

Open:

```text
http://localhost:3001
```

## Running Tests

Run the automated test suite:

```bash
npm test
```

Additional verification commands:

```bash
npx tsx tests/wpm-and-timer.test.ts
npx tsx tests/api.test.ts
```

## How It Works

1. A participant enters their name and student ID.
2. The application generates a randomized sequence of English words.
3. The participant begins typing. The 40-second timer starts with their first valid keystroke.
4. Live WPM and accuracy are displayed during the round.
5. When time expires, the application calculates the final result.
6. The result is saved, and the leaderboard is updated.
7. The application returns to the leaderboard, ready for the next participant.

## Scoring

Final WPM is calculated using the full 40-second competition duration:

\[
WPM = \frac{Correct\ Characters / 5}{40 / 60}
\]

Accuracy is calculated as:

\[
Accuracy = \frac{Correct\ Characters}{Total\ Typed\ Characters} \times 100
\]

Participants are ranked by:

1. Highest WPM.
2. Highest accuracy when WPM is tied.
3. Earlier submission when both are tied.

## Data Storage

Competition results are stored locally in:

```text
data/competition.json
```
**Privacy note:** Competition records may contain participant names and student IDs. Do not commit real participant data to a public repository.
