// RentTara Admin — Firebase Auth + Firestore sync (matches mobile app collections)

const FIRESTORE_COLLECTIONS = {
  verifications: "verifications",
  vehicleSubmissions: "vehicles",
  users: "users",
  bookings: "bookings",
  subscriptions: "subscriptions",
  notifications: "notifications",
  auditLogs: "admin_logs",
  activities: "activities"
};

let firebaseApp = null;
let firebaseAuth = null;
let firebaseDb = null;
let firebaseEnabled = false;
let firebaseUnsubscribers = [];

function isFirebaseConfigured() {
  return typeof FIREBASE_CONFIG !== "undefined"
    && FIREBASE_CONFIG.apiKey
    && FIREBASE_CONFIG.apiKey !== "YOUR_API_KEY"
    && FIREBASE_CONFIG.projectId
    && FIREBASE_CONFIG.projectId !== "YOUR_PROJECT_ID";
}

function isFirebaseEnabled() {
  return firebaseEnabled;
}

function getAdminEmails() {
  return (typeof ADMIN_EMAILS !== "undefined" && ADMIN_EMAILS.length)
    ? ADMIN_EMAILS
    : ["admin@renttara.ph"];
}

function initFirebaseApp() {
  if (firebaseEnabled) return true;
  if (typeof firebase === "undefined") {
    console.warn("Firebase SDK not loaded");
    return false;
  }
  if (!isFirebaseConfigured()) {
    console.info("RentTara: Firebase not configured — using demo mode (localStorage)");
    return false;
  }

  try {
    if (!firebase.apps.length) {
      firebaseApp = firebase.initializeApp(FIREBASE_CONFIG);
    } else {
      firebaseApp = firebase.app();
    }
    firebaseAuth = firebase.auth();
    firebaseDb = firebase.firestore();
    firebaseEnabled = true;
    return true;
  } catch (err) {
    console.error("Firebase init failed", err);
    return false;
  }
}

function mapAuthError(err) {
  const code = err?.code || "";
  const map = {
    "auth/invalid-email": "Invalid email address.",
    "auth/user-disabled": "This account has been disabled.",
    "auth/user-not-found": "No account found with this email.",
    "auth/wrong-password": "Incorrect password.",
    "auth/invalid-credential": "Invalid email or password.",
    "auth/too-many-requests": "Too many attempts. Try again later.",
    "auth/network-request-failed": "Network error. Check your connection."
  };
  return map[code] || err.message || "Login failed.";
}

async function verifyAdminUser(user) {
  if (!user?.email) return false;
  const allowed = getAdminEmails().map((e) => e.toLowerCase());
  if (allowed.includes(user.email.toLowerCase())) return true;
  try {
    const doc = await firebaseDb.collection("admins").doc(user.uid).get();
    return doc.exists;
  } catch {
    return false;
  }
}

function firebaseSignIn(email, password) {
  return firebaseAuth.signInWithEmailAndPassword(email, password);
}

function firebaseSignOut() {
  return firebaseAuth.signOut();
}

function waitForAuthState() {
  return new Promise((resolve) => {
    const unsub = firebaseAuth.onAuthStateChanged((user) => {
      unsub();
      resolve(user);
    });
  });
}

async function ensureFirebaseAuth() {
  const user = await waitForAuthState();
  if (!user) {
    window.location.href = "index.html";
    throw new Error("Not authenticated");
  }
  const ok = await verifyAdminUser(user);
  if (!ok) {
    await firebaseSignOut();
    window.location.href = "index.html";
    throw new Error("Not authorized as admin");
  }
  sessionStorage.setItem("renttara_admin", "true");
  sessionStorage.setItem("renttara_admin_email", user.email);
  return user;
}

function collectionRef(key) {
  return firebaseDb.collection(FIRESTORE_COLLECTIONS[key]);
}

function mapCollectionDocs(snapshot) {
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

async function fetchCollection(key) {
  const snapshot = await collectionRef(key).get();
  return mapCollectionDocs(snapshot);
}

async function fetchSettingsDocs() {
  const platformSnap = await firebaseDb.collection("settings").doc("platform").get();
  const termsSnap = await firebaseDb.collection("settings").doc("terms").get();
  const reportsSnap = await firebaseDb.collection("reports").doc("analytics").get();

  return {
    platformSettings: platformSnap.exists ? platformSnap.data() : null,
    termsContent: termsSnap.exists ? (termsSnap.data().content || "") : null,
    reports: reportsSnap.exists ? reportsSnap.data() : null
  };
}

async function loadFirebaseState() {
  const [
    verifications,
    vehicleSubmissions,
    users,
    bookings,
    subscriptions,
    notifications,
    auditLogs,
    activities,
    settingsDocs
  ] = await Promise.all([
    fetchCollection("verifications"),
    fetchCollection("vehicleSubmissions"),
    fetchCollection("users"),
    fetchCollection("bookings"),
    fetchCollection("subscriptions"),
    fetchCollection("notifications"),
    fetchCollection("auditLogs"),
    fetchCollection("activities"),
    fetchSettingsDocs()
  ]);

  return {
    verifications,
    vehicleSubmissions,
    users,
    bookings,
    subscriptions,
    notifications,
    auditLogs,
    activities,
    stats: { ...MOCK_DATA.stats },
    reports: settingsDocs.reports || MOCK_DATA.reports,
    platformSettings: settingsDocs.platformSettings,
    termsContent: settingsDocs.termsContent
  };
}

function stopFirebaseListeners() {
  firebaseUnsubscribers.forEach((unsub) => {
    try { unsub(); } catch { /* ignore */ }
  });
  firebaseUnsubscribers = [];
}

function startFirebaseListeners(onUpdate) {
  stopFirebaseListeners();

  Object.entries(FIRESTORE_COLLECTIONS).forEach(([stateKey, collectionName]) => {
    const unsub = firebaseDb.collection(collectionName).onSnapshot(
      (snapshot) => {
        APP_STATE[stateKey] = mapCollectionDocs(snapshot);
        if (typeof onUpdate === "function") onUpdate(stateKey);
      },
      (err) => console.error(`Listener error (${collectionName}):`, err)
    );
    firebaseUnsubscribers.push(unsub);
  });

  const settingsUnsub = firebaseDb.collection("settings").doc("platform").onSnapshot((doc) => {
    if (doc.exists) APP_STATE.platformSettings = doc.data();
    if (typeof onUpdate === "function") onUpdate("settings");
  });
  firebaseUnsubscribers.push(settingsUnsub);

  const termsUnsub = firebaseDb.collection("settings").doc("terms").onSnapshot((doc) => {
    if (doc.exists) APP_STATE.termsContent = doc.data().content || "";
    if (typeof onUpdate === "function") onUpdate("terms");
  });
  firebaseUnsubscribers.push(termsUnsub);

  const reportsUnsub = firebaseDb.collection("reports").doc("analytics").onSnapshot((doc) => {
    if (doc.exists) {
      APP_STATE.reports = doc.data();
      if (chartsInitialized && typeof initReportsCharts === "function") {
        initReportsCharts();
      }
    }
    if (typeof onUpdate === "function") onUpdate("reports");
  });
  firebaseUnsubscribers.push(reportsUnsub);
}

async function firebaseIsSeeded() {
  const meta = await firebaseDb.collection("settings").doc("meta").get();
  return meta.exists && meta.data()?.seeded === true;
}

async function firebaseEnsureSeeded() {
  if (await firebaseIsSeeded()) return false;
  await firebaseSeedDemoData();
  return true;
}

async function firebaseSeedDemoData() {
  let batch = firebaseDb.batch();
  let ops = 0;

  const flush = async () => {
    if (ops === 0) return;
    await batch.commit();
    batch = firebaseDb.batch();
    ops = 0;
  };

  const queueSet = async (ref, data) => {
    batch.set(ref, data);
    ops += 1;
    if (ops >= 450) await flush();
  };

  for (const item of MOCK_DATA.verifications) {
    await queueSet(collectionRef("verifications").doc(item.id), item);
  }
  for (const item of MOCK_DATA.vehicleSubmissions) {
    await queueSet(collectionRef("vehicleSubmissions").doc(item.id), item);
  }
  for (const item of MOCK_DATA.users) {
    await queueSet(collectionRef("users").doc(item.id), item);
  }
  for (const item of MOCK_DATA.bookings) {
    await queueSet(collectionRef("bookings").doc(item.id), item);
  }
  for (const item of MOCK_DATA.subscriptions) {
    await queueSet(collectionRef("subscriptions").doc(item.id), item);
  }
  for (const item of MOCK_DATA.notifications) {
    await queueSet(collectionRef("notifications").doc(item.id), item);
  }
  for (const item of MOCK_DATA.auditLogs) {
    await queueSet(collectionRef("auditLogs").doc(item.id), item);
  }
  for (let index = 0; index < MOCK_DATA.activities.length; index++) {
    await queueSet(
      collectionRef("activities").doc(`ACT-${String(index + 1).padStart(3, "0")}`),
      MOCK_DATA.activities[index]
    );
  }

  await queueSet(firebaseDb.collection("settings").doc("platform"), {
    freeVehicleLimit: DEFAULT_SETTINGS.freeVehicleLimit,
    reservationFeePercent: DEFAULT_SETTINGS.reservationFeePercent,
    overduePenalty: DEFAULT_SETTINGS.overduePenalty
  });
  await queueSet(firebaseDb.collection("settings").doc("terms"), { content: DEFAULT_TERMS });
  await queueSet(firebaseDb.collection("reports").doc("analytics"), MOCK_DATA.reports);
  await queueSet(firebaseDb.collection("settings").doc("meta"), {
    seeded: true,
    seededAt: firebase.firestore.FieldValue.serverTimestamp()
  });

  await flush();
}

async function firebaseResetDemoData() {
  const collections = [...Object.values(FIRESTORE_COLLECTIONS), "settings", "reports"];
  for (const name of collections) {
    const snapshot = await firebaseDb.collection(name).get();
    if (snapshot.empty) continue;
    const batch = firebaseDb.batch();
    snapshot.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
  }
  await firebaseSeedDemoData();
}

async function firebaseUpdateDoc(collectionKey, id, data) {
  await collectionRef(collectionKey).doc(id).set(data, { merge: true });
}

async function firebaseDeleteCollectionDocs(collectionName) {
  const snapshot = await firebaseDb.collection(collectionName).get();
  if (snapshot.empty) return;
  const batch = firebaseDb.batch();
  snapshot.docs.forEach((doc) => batch.delete(doc.ref));
  await batch.commit();
}

async function firebasePushAuditLog(entry) {
  const id = entry.id || `LOG-${Date.now()}`;
  await collectionRef("auditLogs").doc(id).set(entry);
}

async function firebasePushNotification(entry) {
  const id = entry.id || `N-${Date.now()}`;
  await collectionRef("notifications").doc(id).set(entry);
}

async function firebaseSaveSettings(settings) {
  await firebaseDb.collection("settings").doc("platform").set(settings, { merge: true });
}

async function firebaseSaveTerms(content) {
  await firebaseDb.collection("settings").doc("terms").set({ content }, { merge: true });
}

async function firebaseMarkNotificationRead(id) {
  await collectionRef("notifications").doc(id).set({ read: true }, { merge: true });
}

async function firebaseMarkAllNotificationsRead() {
  const snapshot = await collectionRef("notifications").where("read", "==", false).get();
  if (snapshot.empty) return;
  const batch = firebaseDb.batch();
  snapshot.docs.forEach((doc) => batch.update(doc.ref, { read: true }));
  await batch.commit();
}

async function firebaseClearAuditLogs() {
  await firebaseDeleteCollectionDocs(FIRESTORE_COLLECTIONS.auditLogs);
}

function updateFirebaseStatusUI() {
  const el = document.getElementById("firebase-status");
  if (!el) return;
  if (firebaseEnabled) {
    el.textContent = "Firebase Live";
    el.className = "firebase-status live";
    el.title = `Connected to ${FIREBASE_CONFIG.projectId}`;
  } else {
    el.textContent = "Demo Mode";
    el.className = "firebase-status demo";
    el.title = "Using localStorage — add Firebase keys in js/firebase-config.js";
  }
}

function updateConnectionBanners() {
  const mode = firebaseEnabled ? "live" : "demo";
  document.querySelectorAll(".connection-banner[data-sync]").forEach((banner) => {
    const liveText = banner.dataset.live || banner.innerHTML;
    const demoText = banner.dataset.demo || banner.innerHTML;
    banner.innerHTML = mode === "live" ? liveText : demoText;
  });
}
