# WorkHub - Productivity Management Platform

## Deployment

### Vercel Setup

1. Import this repository to Vercel
2. **Important**: Set **Root Directory** to `app`
3. Add environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Deploy

### Local Development

```bash
cd app
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Tech Stack

- Next.js 14.2.18
- React 18.3.1
- TypeScript 5
- Tailwind CSS 3.4.19
- Supabase
- Zustand

## Features

- Multi-workspace management
- Project tracking
- Task management with Kanban boards
- Time tracking
- Team collaboration

See `app/README.md` for detailed documentation.
