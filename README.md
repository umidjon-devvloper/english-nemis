# LinguaCoach AI

Bilingual language-learning platform for Uzbek speakers studying English and German.
AI-generated daily exercises, 100-word daily vocabulary packs with a language gate,
AI chat/writing/listening/speaking practice, and a Telegram companion bot.

## Stack

- **Frontend** — Next.js 16 (App Router, Turbopack), React 19, Tailwind v4
- **Backend** — Fastify 5, MongoDB (Mongoose), node-cron
- **AI** — Anthropic / OpenAI / Gemini with fallback chain
- **Bot** — Telegraf (Telegram)

## Layout

```
english-nemis-backend/     Fastify API + jobs + seed scripts
english-nemis-frontend/    Next.js dashboard
```

## Getting started

### Backend

```bash
cd english-nemis-backend
cp .env.example .env         # fill in MongoDB URI, JWT secret, AI keys
pnpm install
pnpm seed:admin              # create first admin user
pnpm seed:vocabulary:english
pnpm seed:vocabulary:german
pnpm dev                     # starts on PORT (default 4000)
```

### Frontend

```bash
cd english-nemis-frontend
cp .env.example .env         # set API_INTERNAL_URL
pnpm install
pnpm dev                     # starts on PORT 3000, change with -p
```

Visit `http://localhost:3003` and sign in with the admin seed credentials.

## Features

- **Daily 100-word vocabulary pack** per user, per language — English first,
  German unlocks only after a perfect English pack.
- **Smart word picker** — wrong-answered words first, then unseen, then random.
- **Easy mode** — multiple choice option; keyboard shortcuts (1–4, Enter).
- **Drill wrong answers** after each pack.
- **7-day score history chart** per language.
- **AI chat partner** (streaming) in EN/DE with Uzbek grammar tips.
- **Guided writing, listening lab, speaking drill** with AI feedback.
- **Vocabulary units** with word quizzes + reading comprehension scoring.
- **Analytics** — streak, weekly minutes, activity breakdown, accuracy.
- **Admin AI config UI** — provider priority, timeouts, scheduler.
- **Telegram daily nudge** at 09:00 Tashkent for users who haven't finished today.

## License

Private — all rights reserved.
