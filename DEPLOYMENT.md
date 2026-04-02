# Groovix – Deployment Guide

This guide covers how to upload Groovix to GitHub and publish it live using GitHub Pages so it can be accessed from any device, including your phone.

---

## Prerequisites

- A [GitHub account](https://github.com)
- Git installed on your computer
  - Check by running: `git --version`
  - If not installed, download from: https://git-scm.com/downloads

---

## Step 1 — Create a New GitHub Repository

1. Go to [github.com](https://github.com) and log in
2. Click the **+** icon in the top-right corner
3. Select **New repository**
4. Fill in the details:
   - **Repository name:** `groovix`
   - **Visibility:** Public
   - **Do NOT** check "Add a README file" — leave the repo empty
5. Click **Create repository**

GitHub will show you a page with setup instructions — keep it open, you'll need the repo URL.

---

## Step 2 — Initialise Git in Your Project

Open a terminal inside the `music-player-app` folder and run the following commands:

```bash
git init
git add .
git commit -m "Initial commit - Groovix music player"
```

**What each command does:**
- `git init` — initialises a new Git repository in the folder
- `git add .` — stages all project files for commit
- `git commit -m "..."` — saves a snapshot of the project with a message

---

## Step 3 — Connect to GitHub and Push

Replace `YOUR-USERNAME` with your actual GitHub username, then run:

```bash
git remote add origin https://github.com/YOUR-USERNAME/groovix.git
git branch -M main
git push -u origin main
```

**What each command does:**
- `git remote add origin ...` — links your local project to the GitHub repo
- `git branch -M main` — renames the default branch to `main`
- `git push -u origin main` — uploads your code to GitHub

> **Note on authentication:** If prompted for a password, GitHub no longer accepts account passwords for Git operations. You need a **Personal Access Token (PAT)** instead.
>
> To create one:
> 1. Go to GitHub → click your profile photo → **Settings**
> 2. Scroll to **Developer settings** → **Personal access tokens** → **Tokens (classic)**
> 3. Click **Generate new token**
> 4. Give it a name, set expiry, and check the **repo** scope
> 5. Click **Generate token** and copy it
> 6. Use this token as your password when Git prompts you

---

## Step 4 — Enable GitHub Pages

1. Go to your repository on GitHub: `https://github.com/YOUR-USERNAME/groovix`
2. Click the **Settings** tab
3. In the left sidebar, click **Pages**
4. Under **Source**, select **Deploy from a branch**
5. Set the branch to **main** and folder to **/ (root)**
6. Click **Save**

GitHub will take 1–2 minutes to build and deploy the site.

---

## Step 5 — Access Groovix on Your Phone

Once deployed, your app will be live at:

```
https://YOUR-USERNAME.github.io/groovix
```

Open this URL in **Chrome** or **Safari** on your phone.

### Add to Home Screen (feels like a real app)

**Android (Chrome):**
1. Open the URL in Chrome
2. Tap the three-dot menu (⋮) in the top right
3. Tap **Add to Home screen**
4. Tap **Add** — Groovix will appear on your home screen like an installed app

**iPhone (Safari):**
1. Open the URL in Safari
2. Tap the **Share** button (box with arrow at the bottom)
3. Scroll down and tap **Add to Home Screen**
4. Tap **Add** — Groovix will appear on your home screen

---

## Updating the App

Whenever you make changes to the project, push the updates to GitHub and the live site will update automatically:

```bash
git add .
git commit -m "Description of what you changed"
git push
```

---

## Local Testing (Same WiFi Network)

To test on your phone before pushing to GitHub:

1. Open a terminal in the `music-player-app` folder
2. Run: `python -m http.server 8080`
3. Find your PC's local IP: run `ipconfig` (Windows) and look for **IPv4 Address**
4. On your phone, open Chrome and go to: `http://YOUR-PC-IP:8080`

---

## File Structure Reference

```
music-player-app/
├── index.html        — App structure and layout
├── style.css         — All styles and responsive design
├── player.js         — Music playback, library, favorites, playlists
├── ai.js             — AI assistant logic and chat
├── app.js            — Navigation and UI interactions
├── REPORT.md         — Full project development report
└── DEPLOYMENT.md     — This file
```

---

*Groovix – Your Music, Your Mind*
