# Setup & Deployment Guide

Follow these steps to connect your private Firebase backend and deploy PrintTracker to GitHub Pages.

---

## 1. Firebase Console Setup

### A. Create the Project & Web App
1. Go to the [Firebase Console](https://console.firebase.google.com/) and click **Add project**.
2. Name your project (e.g., `print-tracker`) and finish creation (Google Analytics is optional).
3. On the Project Overview page, click the **Web (`</>`)** icon to register a web app.
4. Copy the `firebaseConfig` values (`apiKey`, `authDomain`, `projectId`, `storageBucket`, `messagingSenderId`, `appId`) — you will need them for local development and GitHub Secrets.

### B. Enable Email/Password Authentication & Create Your Account
1. In the left sidebar, go to **Build → Authentication → Get started**.
2. Open the **Sign-in method** tab, select **Email/Password**, enable the first toggle (**Email/Password**), and click **Save**.
3. Open the **Users** tab and click **Add user**.
4. Enter the email and password you will use to log in, then click **Add user**.
5. Copy your new user's **User UID** from the Users table.

### C. Authorize Your GitHub Pages Domain
1. Still in **Authentication**, open the **Settings** tab → **Authorized domains**.
2. Click **Add domain** and enter `<your-github-username>.github.io` (replace `<your-github-username>` with your actual GitHub username).
   - `localhost` is already authorized by default for local testing.

### D. Create Firestore Database & Apply Security Rules
1. In the left sidebar, go to **Build → Firestore Database → Create database**.
2. Choose a region near you and start in **Production mode**.
3. Open the **Rules** tab in Firestore.
4. Copy the contents of [`firestore.rules`](./firestore.rules), replace `REPLACE_WITH_YOUR_UID` with the **User UID** you copied in Step 1B, and click **Publish**:

```firestore
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == "PASTE_YOUR_UID_HERE";
    }
  }
}
```

---

## 2. Local Development

1. Copy `.env.example` to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```
2. Fill in your 6 `VITE_FIREBASE_*` values from Step 1A.
3. Install dependencies and start the dev server:
   ```bash
   npm install
   npm run dev
   ```

---

## 3. GitHub Pages Deployment

### A. Match the Repository Base Path
1. Open `vite.config.ts` and confirm `base: '/print-tracker/'` matches your GitHub repository name (e.g., if your repo is `my-3d-prints`, change it to `base: '/my-3d-prints/'`).

### B. Add GitHub Actions Secrets
1. Push this repository to GitHub (default branch: `main`).
2. In your GitHub repo, go to **Settings → Secrets and variables → Actions**.
3. Click **New repository secret** and add each of these 6 secrets using your values from Step 1A:
   - `VITE_FIREBASE_API_KEY`
   - `VITE_FIREBASE_AUTH_DOMAIN`
   - `VITE_FIREBASE_PROJECT_ID`
   - `VITE_FIREBASE_STORAGE_BUCKET`
   - `VITE_FIREBASE_MESSAGING_SENDER_ID`
   - `VITE_FIREBASE_APP_ID`

### C. Enable GitHub Pages
1. In your GitHub repo, go to **Settings → Pages**.
2. Under **Build and deployment → Source**, select **GitHub Actions**.
3. Push to `main` (or go to the **Actions** tab → **Build and Deploy to GitHub Pages** → **Run workflow**).
4. Once the workflow finishes, your private app will be live at:
   `https://<your-github-username>.github.io/<repo-name>/`
