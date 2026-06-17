// Local persistence — mirrors Firestore until Firebase keys are added
const STORAGE_KEY = "renttara_admin_state";
const SETTINGS_KEY = "renttara_settings";
const TERMS_KEY = "renttara_terms";

const DEFAULT_SETTINGS = {
  freeVehicleLimit: 2,
  reservationFeePercent: 20,
  overduePenalty: 100
};

const DEFAULT_TERMS = `RentTara Platform Terms & Conditions

1. All users must complete identity verification with two valid government-issued IDs.
2. Vehicle owners must provide accurate OR/CR documents for listed vehicles.
3. Reservation fees are held via escrow simulation until rental completion is confirmed.
4. Overdue returns may incur penalties as configured by the platform administrator.
5. Users agree to in-app communication and digital rental agreements.
6. RentTara admin reserves the right to suspend accounts involved in fraudulent activity.
7. Personal data is stored securely and accessed only by authorized administrators.`;

function loadAppState(fallback) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn("Could not load saved state", e);
  }
  return JSON.parse(JSON.stringify(fallback));
}

function saveAppState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.warn("Could not save state", e);
  }
}

function loadSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch (e) { /* ignore */ }
  return { ...DEFAULT_SETTINGS };
}

function saveSettings(settings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

function loadTerms() {
  return localStorage.getItem(TERMS_KEY) || DEFAULT_TERMS;
}

function saveTerms(text) {
  localStorage.setItem(TERMS_KEY, text);
}

function resetAppData() {
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(SETTINGS_KEY);
  localStorage.removeItem(TERMS_KEY);
}
