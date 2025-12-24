# WorkHub - Productivity Management Platform

## Features

- ✅ Multi-workspace management
- ✅ Project creation and tracking
- ✅ Task management with Kanban board
- ✅ Time tracking
- ✅ Team collaboration
- ✅ Reports and analytics

## Tech Stack

- **Framework**: Next.js 14.2.18 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS 3.4.19
- **Database**: Supabase (PostgreSQL)
- **State Management**: Zustand
- **UI Components**: Custom + Lucide Icons

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Variables

Create `.env.local` file:

```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 3. Database Setup

Run the SQL schema in your Supabase project:

```bash
# See database-schema.sql in root directory
```

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### 5. Build for Production

```bash
npm run build
npm start
```

## Project Structure

```
app/
├── src/
│   ├── app/              # Next.js App Router pages
│   │   ├── api/          # API routes
│   │   ├── auth/         # Authentication pages
│   │   ├── dashboard/    # Main app pages
│   │   └── layout.tsx    # Root layout
│   ├── components/       # React components
│   │   ├── auth/        # Auth components
│   │   ├── dashboard/   # Dashboard components
│   │   ├── layout/      # Layout components
│   │   └── ui/          # Reusable UI components
│   ├── lib/             # Utilities and configs
│   │   ├── supabase.ts  # Supabase client
│   │   └── constants.ts # Environment constants
│   └── stores/          # Zustand stores
├── public/              # Static assets
├── tailwind.config.js   # Tailwind configuration
├── tsconfig.json        # TypeScript configuration
└── package.json         # Dependencies
```

## Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Import project in Vercel
3. Add environment variables
4. Deploy

### Manual

```bash
npm run build
npm start
```

## API Routes

- `GET /api/dashboard` - Dashboard statistics
- `GET /api/projects` - List projects
- `POST /api/projects` - Create project
- `GET /api/tasks` - List tasks
- `POST /api/tasks` - Create task
- `GET /api/workspaces` - List workspaces

## Database Tables

- `profiles` - User profiles
- `workspaces` - Organizations/workspaces
- `workspace_members` - Workspace membership
- `projects` - Projects
- `tasks` - Tasks
- `time_entries` - Time tracking
- `notes` - Project notes

## Contributing

1. Create feature branch
2. Make changes
3. Test thoroughly
4. Submit pull request

## License

MIT
