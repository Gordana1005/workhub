# Vercel Setup Instructions

## Environment Variables

Add these environment variables in your Vercel project settings:

### Required
```
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

### Build Configuration (Automatic)
```
NEXT_PRIVATE_DISABLE_TURBOPACK=1
TURBOPACK=0
```

## Build Settings

- **Framework Preset**: Next.js
- **Root Directory**: `app`
- **Build Command**: (leave default)
- **Install Command**: (leave default)
- **Output Directory**: (leave default)

## Node Version

Vercel will automatically use Node.js 20.x which is correct.

## Troubleshooting

If build still fails:

1. Go to Project Settings → General
2. Scroll to "Node.js Version"
3. Select "20.x" (recommended)
4. Redeploy

## First Deployment

1. Push all changes to GitHub
2. Connect repository to Vercel
3. Select `app` as root directory
4. Add environment variables
5. Deploy

Build should complete in ~2 minutes.
