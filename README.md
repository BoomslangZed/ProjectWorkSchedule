# Cajun Projects

A personal project board for engineering jobs, built with React + Vite.

## Features
- Drag project cards to change priority order (desktop drag and drop)
- Automatic project-age colors (grey → red over 35 calendar days)
- Completed project archive (completed cards stop aging visually)
- Invoice amount and paid/unpaid state
- On-hold state, received date, custom required-item checklists
- Multiple dated markup entries and response status
- Optional Dropbox folder URL
- Search and filters
- Browser-local autosave (localStorage)

## Run locally

Install Node.js 20+ then run:

```bash
npm install
npm run dev
```

Open the local URL printed in the terminal.

## Put on GitHub

Create a new empty repository on GitHub, then in this folder:

```bash
git init
git add .
git commit -m "Initial Cajun Projects MVP"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/cajun-projects.git
git push -u origin main
```

## Deploy to Vercel

1. Sign in to Vercel using GitHub.
2. Choose **Add New → Project** and import your `cajun-projects` repository.
3. Framework preset: **Vite**. Build command: `npm run build`; output directory: `dist`.
4. Deploy. Every new push to `main` can trigger a new deployment.

## Important limitations

**This MVP saves projects only in the browser's localStorage.** Data is *not* synchronized between devices, is not backed up, and can be lost if site storage is cleared. Hosting it online does not change this. Do not treat this version as a durable record of business data. The project board has no login and is not ready to host other users or store confidential customer data.

**SaaS upgrade path:** Add Supabase Auth, Postgres and Row Level Security, and associate each project with an `organization_id`. Create membership and invitation tables, enforce authorization for every query, migrate browser data, then add Stripe subscriptions and operational safeguards (backups, auditing, privacy terms, rate limits). Do not add signup alone without tenant isolation.

**Dropbox:** Links are stored as strings. The app does not access Dropbox files.

**Markups:** The app tracks dates, response states, and a text file reference, not attachments.

**Mobile:** Cards are responsive, but native drag-and-drop is primarily for desktop. For mobile drag-and-drop, integrate `@dnd-kit`.
