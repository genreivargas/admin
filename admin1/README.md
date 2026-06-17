# RentTara Admin Website

Admin control panel for **RentTara** — A Mobile Based Application for Transparent and Secure Vehicle Rentals in Batangas.

## Quick Start (Demo Mode — no Firebase needed)

1. Open `index.html` in a browser.
2. Login: **`admin@renttara.ph`** / **`admin123`**
3. Data saves to **localStorage** (persists on refresh).

Top bar shows **Demo Mode** until Firebase keys are added.

---

## Firebase Setup (Live sync with mobile app)

### 1. Create Firebase project

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Create project → enable **Google Analytics** (optional)
3. Add a **Web app** → copy the config object

### 2. Enable Authentication

1. **Build → Authentication → Sign-in method**
2. Enable **Email/Password**
3. **Users → Add user**
   - Email: `admin@renttara.ph`
   - Password: your admin password (e.g. `admin123`)

### 3. Enable Firestore

1. **Build → Firestore Database → Create database**
2. Start in **test mode** for quick testing, then deploy rules (step 5)

### 4. Add config keys

Edit `js/firebase-config.js`:

```javascript
const FIREBASE_CONFIG = {
  apiKey: "AIza...",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  // ...
};

const ADMIN_EMAILS = ["admin@renttara.ph"];
```

Reload the site — top bar should show **Firebase Live**.

On first admin login, demo data is **auto-seeded** to Firestore if the database is empty.

### 5. Deploy security rules

Install Firebase CLI, then from this folder:

```bash
npm install -g firebase-tools
firebase login
firebase init firestore   # select existing project, use firestore.rules
firebase deploy --only firestore:rules
```

Rules file: `firestore.rules` (admin + mobile app access patterns).

### 6. Optional — extra admin by UID

In Firestore, create document:

```
admins/{firebase-auth-uid}
  email: "admin@renttara.ph"
  role: "admin"
```

---

## Firestore Collections (shared with mobile app)

| Collection | Admin use |
|------------|-----------|
| `users` | User management, suspend/activate |
| `verifications` | ID verification queue |
| `vehicles` | Vehicle approval queue |
| `bookings` | Bookings & escrow monitor |
| `subscriptions` | Owner subscription plans |
| `notifications` | Push to mobile notifications |
| `admin_logs` | Audit trail |
| `activities` | Dashboard activity feed |
| `settings/platform` | Platform config |
| `settings/terms` | Terms & Conditions |
| `reports/analytics` | Chart data |

---

## Features

| Module | Description |
|--------|-------------|
| Dashboard | Stats, quick actions, activity feed |
| ID Verification | Approve/reject → syncs to mobile |
| Vehicle Approval | Approve/reject listings |
| Bookings & Escrow | Monitor rentals, overdue |
| Users | Manage, suspend, activate |
| Subscriptions | Owner plans |
| Reports | Chart.js + print export |
| Audit Log | All admin actions logged |
| Settings | Platform config, Terms, seed/reset |

**Real-time:** When Firebase is connected, Firestore listeners update the dashboard instantly when mobile app writes data.

---

## File Structure

```
admin1/
├── index.html
├── dashboard.html
├── firestore.rules
├── firebase.json
├── css/style.css
├── js/
│   ├── firebase-config.js      ← your keys (gitignored)
│   ├── firebase-config.example.js
│   ├── firebase.js             ← Auth + Firestore layer
│   ├── data.js                   ← Demo/seed data
│   ├── storage.js                ← localStorage fallback
│   ├── charts.js
│   └── app.js
└── images/favicon.svg
```

---

## Capstone Defense

- Admin website complements the **mobile app**
- Same Firestore schema — approve on web → status updates on app
- Demo mode works offline for UI presentation
- Firebase mode proves live admin ↔ mobile sync

**STI College Lipa — BS Information Technology Capstone 2026**
