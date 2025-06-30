# Deployment Guide - Zeon Monorepo

This guide explains how to deploy the Zeon project with frontend on Vercel and backend on Render without conflicts.

## Architecture Overview

```
Zeon Repository (GitHub)
├── Root Directory (Backend) → Deploys to Render
├── frontend/ (Frontend) → Deploys to Vercel
└── Deployment configs prevent conflicts
```

## Setup Instructions

### 1. Vercel Setup (Frontend)

#### Initial Setup:
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click "New Project"
3. Import your GitHub repository
4. **Important**: Set these configuration overrides:

```
Framework Preset: Create React App
Root Directory: frontend
Build Command: npm run build
Output Directory: build
Install Command: npm install
Node.js Version: 20.x
```

#### Environment Variables (if any):
Add any frontend environment variables in Vercel dashboard.

#### Custom Domain (Optional):
- Add your custom domain (e.g., `zeonai.xyz`)
- Configure DNS settings as instructed by Vercel

### 2. Render Setup (Backend)

#### Initial Setup:
1. Go to [Render Dashboard](https://render.com/dashboard)
2. Click "New" → "Web Service"
3. Connect your GitHub repository
4. Use the existing `render.yaml` configuration

#### Environment Variables:
Set these in Render dashboard:
```
CDP_API_KEY_NAME=your_cdp_key_name
CDP_API_KEY_PRIVATE_KEY=your_cdp_private_key
OPENROUTER_API_KEY=your_openrouter_key
NETWORK_ID=base-sepolia
NODE_VERSION=20
```

#### Manual Deploy:
If needed, you can trigger manual deploys from the Render dashboard.

### 3. Git Workflow

#### Safe Deployment Workflow:

1. **Frontend Changes Only:**
   ```bash
   # Make changes to frontend/ directory
   git add "frontend/"
   git commit -m "feat: update frontend UI"
   git push origin main
   # → Only Vercel deploys, Render ignores
   ```

2. **Backend Changes Only:**
   ```bash
   # Make changes to root directory files
   git add index.ts helpers/ utils/
   git commit -m "feat: update API endpoint"
   git push origin main
   # → Only Render deploys, Vercel ignores
   ```

3. **Both Frontend and Backend:**
   ```bash
   # Make changes to both
   git add .
   git commit -m "feat: update both frontend and backend"
   git push origin main
   # → Both services deploy their respective parts
   ```

## Deployment Triggers

### Vercel Triggers:
- ✅ Changes in `frontend/` directory
- ❌ Changes in root directory (backend files)
- ❌ Changes to `render.yaml`, `index.ts`, etc.

### Render Triggers:
- ✅ Changes in root directory
- ✅ Changes to `index.ts`, `helpers/`, `utils/`, etc.
- ❌ Changes in `zeon frontend/` directory

## Configuration Files

### `frontend/vercel.json` (Frontend Directory)
- Configures Vercel deployment settings
- Sets up proper routing for SPA
- Includes security headers

### `render.yaml` (Root)
- Configures backend deployment
- Ignores frontend directory changes
- Sets up health checks

### `.vercelignore` (Root)
- Prevents Vercel from processing backend files
- Reduces build time and potential conflicts

### `.renderignore` (Root)
- Prevents Render from processing frontend files
- Focuses deployment on backend only

## Monitoring Deployments

### Vercel:
- Check deployment status at: `https://vercel.com/your-username/zeon-frontend`
- View build logs for any frontend issues
- Monitor performance and analytics

### Render:
- Check deployment status at: `https://dashboard.render.com/`
- View service logs for backend monitoring
- Monitor API health at: `https://your-app.onrender.com/health`

## Troubleshooting

### Common Issues:

1. **Both services deploy unnecessarily:**
   - Check that `.vercelignore` and `.renderignore` are committed
   - Verify `ignoredPaths` in `render.yaml`

2. **Vercel fails to find frontend:**
   - Ensure `Root Directory` is set to `frontend` in Vercel dashboard
   - Check that `vercel.json` has correct paths

3. **Render fails backend build:**
   - Verify environment variables are set
   - Check that backend dependencies are in root `package.json`

4. **CORS issues between frontend and backend:**
   - Update CORS origins in `index.ts`
   - Ensure frontend uses correct API URL

### Force Deployment:

#### Vercel:
```bash
# From root directory
npx vercel --prod
```

#### Render:
- Use "Manual Deploy" button in Render dashboard
- Or push an empty commit to trigger:
```bash
git commit --allow-empty -m "trigger deployment"
git push origin main
```

## URLs

After setup, your services will be available at:

- **Frontend (Vercel)**: `https://your-project.vercel.app`
- **Backend (Render)**: `https://your-app.onrender.com`
- **Custom Domain**: `https://zeonai.xyz` (if configured)

## Security Notes

1. Never commit sensitive environment variables
2. Use Vercel and Render environment variable settings
3. Keep API keys secure and rotate them regularly
4. Monitor both services for security updates

## Performance Optimization

### Frontend (Vercel):
- Automatic CDN and edge caching
- Image optimization enabled
- Bundle analysis available

### Backend (Render):
- Health check endpoint configured
- Auto-scaling based on demand
- Persistent storage in `.data/` directory

---

**Note**: This setup ensures clean separation between frontend and backend deployments while maintaining a single repository for easy development. 