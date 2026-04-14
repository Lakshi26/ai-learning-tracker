# 🤖 AI Learning Tracker — Design Team

A clean, real-time internal web app for tracking weekly AI learning sessions.
Built with **Next.js**, **Firebase (Firestore)**, and **Tailwind CSS**.

---

## ✨ Features

- **Weekly Session Banner** — Week number, topic, and date at a glance
- **Mark Attendance** — One click to mark yourself present; name saved locally for convenience
- **Submit Homework** — Share a Figma / Notion / Google Drive link with a short description
- **Live Gallery** — All submissions for the current week, updating in real-time
- **Filter** — Toggle between "All submissions" and "Submissions from present attendees"
- **Like button** — React to teammates' work
- **Skeleton loading** + empty states for a polished feel

---

## 🛠 Tech Stack

| Layer     | Technology                          |
|-----------|-------------------------------------|
| Frontend  | Next.js 14 (Pages Router), React 18 |
| Styling   | Tailwind CSS v3                     |
| Database  | Firebase Firestore (real-time)      |
| Storage   | Firebase Storage (ready to extend)  |
| Hosting   | Vercel (recommended) / any Node host|

---

## 📁 Project Structure

```
ai-learning-tracker/
├── components/
│   ├── HomeworkCard.jsx       # Submission card with like button
│   ├── MarkPresentModal.jsx   # Attendance modal
│   └── SubmitModal.jsx        # Homework submission modal
├── lib/
│   └── firebase.js            # Firebase initialization
├── pages/
│   ├── _app.js                # Next.js app wrapper
│   └── index.js               # Main page (all logic lives here)
├── styles/
│   └── globals.css            # Tailwind + global styles
├── .env.local.example         # Environment variable template
├── next.config.js
├── tailwind.config.js
└── package.json
```

---

## 🚀 Setup Instructions

### 1. Prerequisites

- Node.js **18+** and npm
- A free [Firebase](https://firebase.google.com/) account

---

### 2. Clone / copy the project

```bash
cd ai-learning-tracker
npm install
```

---

### 3. Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/) → **Add project**
2. Give it a name (e.g. `design-ai-sessions`) and continue
3. Disable Google Analytics if not needed → **Create project**

---

### 4. Enable Firestore

1. In Firebase Console → **Build → Firestore Database**
2. Click **Create database**
3. Choose **Start in test mode** (you can tighten rules later)
4. Select a region close to your team → **Enable**

### 4b. Enable Google Authentication

1. In Firebase Console → **Build → Authentication**
2. Click **Get started** → **Sign-in method** tab
3. Click **Google** → toggle **Enable** → add your support email → **Save**
4. Under **Authorized domains**, ensure `localhost` is listed (it is by default)

---

### 5. Get your Firebase config

1. In Firebase Console → **Project Settings** (gear icon) → **General**
2. Scroll to **Your apps** → click `</>` (Web)
3. Register the app → copy the `firebaseConfig` object values

---

### 6. Set environment variables

```bash
cp .env.local.example .env.local
```

Open `.env.local` and fill in your values:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSy...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=1234567890
NEXT_PUBLIC_FIREBASE_APP_ID=1:1234567890:web:abc123
```

---

### 7. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — the app is live!

---

## 🗂 Firestore Data Structure

The app uses two top-level collections:

### `submissions`
Stores homework submissions.

| Field       | Type      | Description                          |
|-------------|-----------|--------------------------------------|
| name        | string    | Submitter's name                     |
| week        | number    | Week number (e.g. `7`)               |
| topic       | string    | Session topic                        |
| link        | string    | URL to Figma / Notion / Drive work   |
| description | string    | Short description of the work        |
| likes       | string[]  | Array of usernames who liked this    |
| timestamp   | timestamp | Server-generated creation time      |

### `attendance`
Stores attendance records.

| Field     | Type      | Description                    |
|-----------|-----------|--------------------------------|
| name      | string    | Attendee's name                |
| week      | number    | Week number                    |
| topic     | string    | Session topic                  |
| timestamp | timestamp | When they marked present       |

---

## 🔒 Firestore Security Rules (Recommended)

Once you've tested locally, replace the default test rules with:

```js
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Anyone can read; anyone can write (no auth — internal tool)
    match /submissions/{doc} {
      allow read: true;
      allow create: if request.resource.data.keys().hasAll(['name', 'week', 'link', 'timestamp']);
      allow update: if request.resource.data.diff(resource.data).affectedKeys().hasOnly(['likes']);
    }
    match /attendance/{doc} {
      allow read: true;
      allow create: if request.resource.data.keys().hasAll(['name', 'week', 'timestamp']);
    }
  }
}
```

---

## 📅 Updating the Weekly Session

Each week, open `pages/index.js` and update the config at the top of the file:

```js
const CURRENT_SESSION = {
  week:  8,                              // ← increment week number
  topic: 'Prompt Engineering Deep Dive', // ← new topic
  date:  'April 14, 2026',              // ← new date
};
```

Save → deploy. All previous weeks' data is preserved in Firestore.

---

## 🌐 Deploy to Vercel (Recommended)

```bash
npm install -g vercel
vercel
```

Add your environment variables in the Vercel dashboard under **Settings → Environment Variables**.

---

## 🔮 Potential Extensions

- **Firebase Auth** — Google sign-in to auto-populate names and prevent impersonation
- **File upload** — attach images directly via Firebase Storage
- **Week history** — dropdown to browse past weeks' galleries
- **Admin panel** — manage session topics from the UI
- **Notification** — send a Slack message when someone submits homework
