# 🚀 Vercel Deployment Guide for WorkHub

## ⚠️ CRITICAL: Root Directory Setting

**The #1 reason for deployment failures is incorrect root directory!**

Your Next.js app is in the `app/` folder, NOT the repository root.

## 📋 Step-by-Step Deployment

### Step 1: Import to Vercel

1. Go to [vercel.com/new](https://vercel.com/new)
2. Click **"Import Git Repository"**
3. Select `Gordana1005/workhub`
4. Click **"Import"**

### Step 2: Configure Build Settings ⚠️ IMPORTANT!

Before clicking "Deploy", you MUST configure these settings:

#### Root Directory
```
Root Directory: app
```

**This is CRITICAL!** Click "Edit" next to "Root Directory" and type `app`.

#### Framework Preset
```
Framework Preset: Next.js
```

Vercel should auto-detect this, but verify it says "Next.js".

#### Build Command (Optional)
```
Build Command: npm run build
```

Leave as default unless you need custom flags.

#### Install Command (Recommended)
```
Install Command: npm install --legacy-peer-deps
```

This ensures clean dependency installation.

### Step 3: Environment Variables

Click **"Environment Variables"** and add:

| Variable Name | Value | Where to Get It |
|--------------|--------|----------------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://xxxxx.supabase.co` | Supabase Dashboard → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJhbGc...` | Supabase Dashboard → Settings → API → anon/public key |

**Important Notes:**
- Add these to **all environments** (Production, Preview, Development)
- Copy the FULL key including `eyJ...` for the anon key
- URL should start with `https://` and end with `.supabase.co`

### Step 4: Deploy

Click **"Deploy"** button.

## ✅ Expected Build Output

Successful build should show:

```
✓ Creating optimized production build
✓ Compiled successfully
✓ Linting and checking validity of types
✓ Collecting page data
✓ Generating static pages (8/8)
✓ Finalizing page optimization

Build completed in ~2-3 minutes
```

## ❌ Common Errors & Solutions

### Error: "No Next.js version detected"

**Cause:** Root directory is NOT set to `app`

**Solution:**
1. Go to Project Settings → General
2. Find "Root Directory"
3. Click Edit
4. Type `app`
5. Save
6. Redeploy

### Error: "Turbopack build failed"

**Cause:** Vercel trying to use experimental Turbopack

**Solution:**
Add environment variable:
```
NEXT_PRIVATE_DISABLE_TURBOPACK=1
```

Then redeploy.

### Error: "tailwindcss directly as a PostCSS plugin"

**Cause:** Turbopack is still enabled

**Solution:**
1. Check `app/next.config.js` has `turbo: undefined`
2. Check `app/.npmrc` exists
3. Add `NEXT_PRIVATE_DISABLE_TURBOPACK=1` to environment variables
4. Redeploy with "Clear Build Cache" option

### Error: "Module not found: @supabase/..."

**Cause:** Dependencies not installed properly

**Solution:**
1. Check Install Command is: `npm install --legacy-peer-deps`
2. Redeploy with "Clear Build Cache"

### Error: "Cannot find module '@/...'" 

**Cause:** TypeScript path aliases not resolving

**Solution:**
This is fixed in `tsconfig.json` - if error persists:
1. Clear build cache
2. Redeploy

## 🔍 Verifying Your Deployment

### Check Root Directory
1. Go to **Project Settings** → **General**
2. Scroll to "Root Directory"
3. Should show: `app`
4. If empty or different, EDIT IT!

### Check Environment Variables
1. Go to **Project Settings** → **Environment Variables**
2. Should see both:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. Both should be available in "Production", "Preview", "Development"

### Check Build Logs
1. Go to **Deployments**
2. Click latest deployment
3. Click **"Building"** or **"View Build Logs"**
4. Look for:
   - ✅ "Detected Next.js"
   - ✅ "Build Command: npm run build"
   - ✅ "Install Command: npm install --legacy-peer-deps"

## 🎯 Post-Deployment Checklist

After successful deployment:

- [ ] Visit your Vercel URL
- [ ] Login page loads
- [ ] Can create account
- [ ] Dashboard loads after login
- [ ] Can create workspace
- [ ] Can create project
- [ ] Can create tasks
- [ ] No console errors

If any step fails, check:
1. Environment variables are correct
2. Supabase database has correct schema
3. RLS policies are configured

## 📞 Still Having Issues?

### Debug Checklist:

1. **Root Directory**
   ```
   ✓ Is it set to "app"?
   ✓ Not empty?
   ✓ Not set to "." or "/"?
   ```

2. **Environment Variables**
   ```
   ✓ Both variables added?
   ✓ No typos in variable names?
   ✓ Full key copied (not truncated)?
   ✓ Applied to all environments?
   ```

3. **Build Settings**
   ```
   ✓ Framework: Next.js?
   ✓ Node Version: 20.x?
   ✓ Install command includes --legacy-peer-deps?
   ```

4. **Clear Cache and Redeploy**
   - Go to Deployments
   - Click "..." menu on latest
   - Select "Redeploy"
   - Check "Clear Build Cache"
   - Click "Redeploy"

## 🎊 Success!

If build succeeds, you'll get:
- Production URL: `https://workhub-xxx.vercel.app`
- Automatic deployments on every push to `main`
- Preview deployments for pull requests
- Built-in SSL certificate
- Global CDN distribution

---

**Need help?** Check the Vercel docs: https://vercel.com/docs/projects/overview
