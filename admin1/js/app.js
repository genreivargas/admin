// RentTara Admin — UI logic with localStorage + Firebase sync

let APP_STATE = JSON.parse(JSON.stringify(MOCK_DATA));

function ensureStateShape() {
  ["notifications", "auditLogs", "activities"].forEach((key) => {
    if (!APP_STATE[key]) APP_STATE[key] = JSON.parse(JSON.stringify(MOCK_DATA[key] || []));
  });
  if (!APP_STATE.stats) APP_STATE.stats = { ...MOCK_DATA.stats };
  if (!APP_STATE.reports) APP_STATE.reports = { ...MOCK_DATA.reports };
}
ensureStateShape();
let currentPage = "dashboard";
let chartsInitialized = false;

const ICONS = {
  id: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>',
  vehicle: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/></svg>',
  booking: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/></svg>',
  overdue: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
  users: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
  revenue: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>',
  alert: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/></svg>',
  check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
  card: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>'
};

const PAGE_RENDERERS = {
  verifications: renderVerifications,
  vehicles: renderVehicles,
  bookings: renderBookings,
  users: renderUsers,
  subscriptions: renderSubscriptions
};

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function debounce(fn, wait) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), wait);
  };
}

function initials(name) {
  return name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
}

function getStatusBadge(status) {
  const map = {
    pending: "badge-pending",
    approved: "badge-approved",
    rejected: "badge-rejected",
    held: "badge-held",
    released: "badge-released",
    completed: "badge-completed",
    active: "badge-active",
    overdue: "badge-overdue",
    suspended: "badge-suspended"
  };
  const cls = map[status] || "badge-pending";
  return `<span class="badge-status ${cls}">${status}</span>`;
}

function getPageFilters(pageId) {
  const container = document.getElementById(`filters-${pageId}`);
  if (!container) return {};
  const filters = {};
  container.querySelectorAll("[data-filter]").forEach((el) => {
    filters[el.dataset.filter] = el.value.trim().toLowerCase();
  });
  return filters;
}

function matchesSearch(query, ...fields) {
  if (!query) return true;
  return fields.some((f) => String(f).toLowerCase().includes(query));
}

function updateCount(pageId, shown, total) {
  const el = document.getElementById(`count-${pageId}`);
  if (el) el.textContent = shown === total ? `${total} records` : `${shown} of ${total}`;
}

function skeletonTableRows(cols = 5, rows = 5) {
  return Array.from({ length: rows }, () => `
    <tr class="skeleton-row">
      ${Array.from({ length: cols }, (_, i) => `
        <td><div class="skeleton skeleton-cell ${i === 0 ? "short" : i === cols - 1 ? "med" : "wide"}"></div></td>
      `).join("")}
    </tr>`).join("");
}

function showSkeletonStats() {
  const grid = document.getElementById("stats-grid");
  if (!grid) return;
  grid.innerHTML = Array.from({ length: 6 }, () => `<div class="skeleton skeleton-stat"></div>`).join("");
  grid.className = "skeleton-stat-grid";
}

function showSkeletonActivity() {
  const feed = document.getElementById("activity-feed");
  if (!feed) return;
  feed.innerHTML = Array.from({ length: 5 }, () => `<div class="skeleton skeleton-activity"></div>`).join("");
}

function showTableSkeleton(tableId, cols = 6) {
  const tbody = document.getElementById(tableId);
  if (!tbody) return;
  tbody.innerHTML = skeletonTableRows(cols);
  tbody.closest(".table-wrap")?.classList.add("table-loading");
}

async function withTableLoading(tableId, renderFn, ms = 280) {
  const cols = { verifications: 7, vehicles: 8, bookings: 8, users: 8, subscriptions: 6 };
  const page = tableId.replace("-table", "");
  showTableSkeleton(tableId, cols[page] || 6);
  await delay(ms);
  renderFn();
  document.getElementById(tableId)?.closest(".table-wrap")?.classList.remove("table-loading");
}

function openModal(title, bodyHtml, footerHtml) {
  document.getElementById("modal-title").textContent = title;
  document.getElementById("modal-body").innerHTML = bodyHtml;
  document.getElementById("modal-footer").innerHTML = footerHtml || "";
  document.getElementById("modal-overlay").classList.add("open");
  document.body.style.overflow = "hidden";
}

function closeModal() {
  document.getElementById("modal-overlay").classList.remove("open");
  document.body.style.overflow = "";
}

function showToast(message) {
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateY(16px)";
    toast.style.transition = "0.3s ease";
    setTimeout(() => toast.remove(), 300);
  }, 2800);
}

function persistState() {
  if (!isFirebaseEnabled()) saveAppState(APP_STATE);
  recalculateStats();
  updateDynamicUI();
}

function handleFirebaseUpdate(key) {
  recalculateStats();
  const renderers = {
    verifications: renderVerifications,
    vehicleSubmissions: renderVehicles,
    bookings: renderBookings,
    users: renderUsers,
    subscriptions: renderSubscriptions,
    auditLogs: renderAuditLogs,
    notifications: renderNotifications
  };
  if (renderers[key]) renderers[key]();
  if (key === "activities" || key === "all") {
    if (currentPage === "dashboard") renderDashboard();
  }
  if ((key === "settings" || key === "terms") && currentPage === "settings") loadSettingsUI();
  if (key === "reports" && chartsInitialized) initReportsCharts();
  updateDynamicUI();
}

function recalculateStats() {
  const s = APP_STATE.stats;
  s.pendingVerifications = APP_STATE.verifications.filter((v) => v.status === "pending").length;
  s.pendingVehicles = APP_STATE.vehicleSubmissions.filter((v) => v.status === "pending").length;
  s.activeBookings = APP_STATE.bookings.filter((b) => b.bookingStatus === "active").length;
  s.overdueRentals = APP_STATE.bookings.filter((b) => b.bookingStatus === "overdue").length;
  s.totalUsers = APP_STATE.users.length;
  s.totalRenters = APP_STATE.users.filter((u) => u.role === "renter").length;
  s.totalOwners = APP_STATE.users.filter((u) => u.role === "owner").length;
  s.subscriptionRevenue = APP_STATE.subscriptions
    .filter((sub) => sub.status === "active")
    .reduce((sum, sub) => sum + (Number(sub.price) || 0), 0);
}

async function addAuditLog(action, target, detail) {
  const admin = sessionStorage.getItem("renttara_admin_email") || "Administrator";
  const entry = {
    id: `LOG-${Date.now()}`,
    action,
    target,
    detail,
    admin,
    timestamp: new Date().toLocaleString("en-PH", { hour12: false })
  };
  if (isFirebaseEnabled()) {
    await firebasePushAuditLog(entry);
    return;
  }
  if (!APP_STATE.auditLogs) APP_STATE.auditLogs = [];
  APP_STATE.auditLogs.unshift(entry);
  if (APP_STATE.auditLogs.length > 50) APP_STATE.auditLogs.pop();
}

async function addNotification(title, message, type = "alert") {
  const entry = {
    id: `N-${Date.now()}`,
    title,
    message,
    time: "Just now",
    read: false,
    type
  };
  if (isFirebaseEnabled()) {
    await firebasePushNotification(entry);
    return;
  }
  if (!APP_STATE.notifications) APP_STATE.notifications = [];
  APP_STATE.notifications.unshift(entry);
}

function updateDynamicUI() {
  const pv = APP_STATE.stats.pendingVerifications;
  const pveh = APP_STATE.stats.pendingVehicles;
  const od = APP_STATE.stats.overdueRentals;
  const unread = (APP_STATE.notifications || []).filter((n) => !n.read).length;

  ["badge-verifications", "bottom-badge-verifications", "qa-verifications"].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.textContent = pv;
  });
  ["badge-vehicles", "bottom-badge-vehicles", "qa-vehicles"].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.textContent = pveh;
  });
  const odEl = document.getElementById("qa-overdue");
  if (odEl) odEl.textContent = od;
  const nc = document.getElementById("notif-count");
  if (nc) {
    nc.textContent = unread;
    nc.style.display = unread ? "grid" : "none";
  }
  if (currentPage === "dashboard") renderDashboard();
  renderNotifications();
}

function renderNotifications() {
  const list = document.getElementById("notif-list");
  if (!list) return;
  const items = APP_STATE.notifications || [];
  list.innerHTML = items.length
    ? items.map((n) => `
      <div class="notif-item ${n.read ? "read" : ""}" onclick="markNotificationRead('${n.id}')">
        <strong>${n.title}</strong>
        <p>${n.message}</p>
        <time>${n.time}</time>
      </div>`).join("")
    : `<div class="notif-empty">No notifications</div>`;
}

function toggleNotifications(e) {
  e.stopPropagation();
  document.getElementById("notif-panel")?.classList.toggle("open");
}

function markNotificationRead(id) {
  if (isFirebaseEnabled()) {
    firebaseMarkNotificationRead(id).catch((err) => showToast(err.message));
    return;
  }
  const n = APP_STATE.notifications?.find((x) => x.id === id);
  if (n) n.read = true;
  persistState();
}

function markAllNotificationsRead() {
  if (isFirebaseEnabled()) {
    firebaseMarkAllNotificationsRead()
      .then(() => showToast("All notifications marked as read"))
      .catch((err) => showToast(err.message));
    return;
  }
  (APP_STATE.notifications || []).forEach((n) => { n.read = true; });
  persistState();
  showToast("All notifications marked as read");
}

async function handleAction(action, id) {
  if (id.startsWith("VER-")) {
    const item = APP_STATE.verifications.find((v) => v.id === id);
    if (item) {
      const status = action.includes("Approved") ? "approved" : "rejected";
      item.status = status;
      const user = APP_STATE.users.find((u) => u.id === item.userId);
      if (user) {
        user.status = status === "approved" ? "active" : "pending";
        user.verified = status === "approved";
      }
      if (isFirebaseEnabled()) {
        await firebaseUpdateDoc("verifications", id, { status });
        if (user) await firebaseUpdateDoc("users", user.id, { status: user.status, verified: user.verified });
      }
      await addAuditLog(action.includes("Approved") ? "Approved ID" : "Rejected ID", item.name, `${item.id} — ${item.email}`);
      await addNotification(`${action} ID`, `${item.name} verification ${status}.`, "verification");
    }
    renderVerifications();
  } else if (id.startsWith("VEH-SUB")) {
    const item = APP_STATE.vehicleSubmissions.find((v) => v.id === id);
    if (item) {
      const status = action.includes("Approved") ? "approved" : "rejected";
      item.status = status;
      if (isFirebaseEnabled()) {
        await firebaseUpdateDoc("vehicleSubmissions", id, { status });
      }
      await addAuditLog(action.includes("Approved") ? "Approved Vehicle" : "Rejected Vehicle", item.vehicleName, `Owner: ${item.ownerName}`);
      await addNotification(`${action.includes("Approved") ? "Vehicle approved" : "Vehicle rejected"}`, item.vehicleName, "vehicle");
    }
    renderVehicles();
  }
  if (!isFirebaseEnabled()) persistState();
  else {
    recalculateStats();
    updateDynamicUI();
  }
  showToast(`${action} — synced to mobile app`);
  closeModal();
}

function viewUser(user) {
  openModal(
    "Manage User",
    `
    <div class="detail-row"><span class="label">Name</span><span>${user.name}</span></div>
    <div class="detail-row"><span class="label">Email</span><span>${user.email}</span></div>
    <div class="detail-row"><span class="label">Role</span><span class="role-pill ${user.role}">${user.role}</span></div>
    <div class="detail-row"><span class="label">Verified</span><span>${user.verified ? "Yes" : "No"}</span></div>
    <div class="detail-row"><span class="label">Status</span><span>${getStatusBadge(user.status)}</span></div>
    <div class="detail-row"><span class="label">Joined</span><span>${user.joined}</span></div>
    ${user.vehicles !== undefined ? `<div class="detail-row"><span class="label">Vehicles Listed</span><span>${user.vehicles}</span></div>` : ""}
    `,
    `
    <button class="btn btn-ghost btn-sm" onclick="closeModal()">Close</button>
    ${user.status !== "suspended" ? `<button class="btn btn-danger btn-sm" onclick="suspendUser('${user.id}')">Suspend User</button>` : `<button class="btn btn-success btn-sm" onclick="activateUser('${user.id}')">Activate User</button>`}
    `
  );
}

async function suspendUser(userId) {
  const user = APP_STATE.users.find((u) => u.id === userId);
  if (!user) return;
  user.status = "suspended";
  if (isFirebaseEnabled()) await firebaseUpdateDoc("users", userId, { status: "suspended" });
  await addAuditLog("Suspended User", user.name, user.email);
  await addNotification("User suspended", `${user.name} has been suspended.`, "alert");
  if (!isFirebaseEnabled()) persistState();
  renderUsers();
  closeModal();
  showToast(`${user.name} suspended`);
}

async function activateUser(userId) {
  const user = APP_STATE.users.find((u) => u.id === userId);
  if (!user) return;
  user.status = "active";
  if (isFirebaseEnabled()) await firebaseUpdateDoc("users", userId, { status: "active" });
  await addAuditLog("Activated User", user.name, user.email);
  if (!isFirebaseEnabled()) persistState();
  renderUsers();
  closeModal();
  showToast(`${user.name} activated`);
}

function renderAuditLogs() {
  const rows = APP_STATE.auditLogs || [];
  updateCount("audit", rows.length, rows.length);
  document.getElementById("audit-table").innerHTML = rows.length
    ? rows.map((l) => `
      <tr>
        <td data-label="Log ID" style="font-weight:700;color:var(--text-tertiary);font-size:0.8rem;">${l.id}</td>
        <td data-label="Action"><span class="role-pill ${l.action.includes("Reject") || l.action.includes("Suspend") ? "owner" : "renter"}">${l.action}</span></td>
        <td data-label="Target" style="font-weight:600;">${l.target}</td>
        <td data-label="Details" style="font-size:0.82rem;color:var(--text-secondary);">${l.detail}</td>
        <td data-label="Admin">${l.admin}</td>
        <td data-label="Time" style="font-size:0.82rem;">${l.timestamp}</td>
      </tr>`).join("")
    : renderEmptyState("No admin activity logged yet.");
}

async function clearAuditLog() {
  if (!confirm("Clear all audit logs?")) return;
  if (isFirebaseEnabled()) {
    await firebaseClearAuditLogs();
  } else {
    APP_STATE.auditLogs = [];
    persistState();
  }
  renderAuditLogs();
  showToast("Audit log cleared");
}

function loadSettingsUI() {
  const s = isFirebaseEnabled() && APP_STATE.platformSettings
    ? APP_STATE.platformSettings
    : loadSettings();
  document.getElementById("setting-vehicle-limit").value = s.freeVehicleLimit;
  document.getElementById("setting-reservation-fee").value = s.reservationFeePercent;
  document.getElementById("setting-penalty").value = s.overduePenalty;
  document.getElementById("setting-terms").value = isFirebaseEnabled() && APP_STATE.termsContent != null
    ? APP_STATE.termsContent
    : loadTerms();
}

async function savePlatformSettings() {
  const settings = {
    freeVehicleLimit: Number(document.getElementById("setting-vehicle-limit").value),
    reservationFeePercent: Number(document.getElementById("setting-reservation-fee").value),
    overduePenalty: Number(document.getElementById("setting-penalty").value)
  };
  if (isFirebaseEnabled()) {
    await firebaseSaveSettings(settings);
    APP_STATE.platformSettings = settings;
  } else {
    saveSettings(settings);
  }
  await addAuditLog("Updated Settings", "Platform", `Limit: ${settings.freeVehicleLimit}, Fee: ${settings.reservationFeePercent}%`);
  if (!isFirebaseEnabled()) persistState();
  renderAuditLogs();
  showToast("Platform settings saved");
}

async function savePlatformTerms() {
  const terms = document.getElementById("setting-terms").value;
  if (isFirebaseEnabled()) {
    await firebaseSaveTerms(terms);
    APP_STATE.termsContent = terms;
  } else {
    saveTerms(terms);
  }
  await addAuditLog("Updated Terms", "Platform", "Terms & Conditions updated");
  if (!isFirebaseEnabled()) persistState();
  renderAuditLogs();
  showToast("Terms & Conditions updated");
}

async function resetDemoData() {
  if (!confirm("Reset all data to default demo? This cannot be undone.")) return;
  if (isFirebaseEnabled()) {
    try {
      await firebaseResetDemoData();
      showToast("Firestore reset to demo data");
    } catch (err) {
      showToast("Reset failed: " + err.message);
    }
    return;
  }
  resetAppData();
  APP_STATE = loadAppState(MOCK_DATA);
  ensureStateShape();
  persistState();
  location.reload();
}

async function seedFirebaseData() {
  if (!isFirebaseEnabled()) {
    showToast("Add Firebase keys in js/firebase-config.js first");
    return;
  }
  if (!confirm("Seed Firestore with demo data? Existing records will be merged/overwritten.")) return;
  try {
    await firebaseSeedDemoData();
    showToast("Demo data seeded to Firestore");
  } catch (err) {
    showToast("Seed failed: " + err.message);
  }
}

function setBookingFilter(status) {
  setTimeout(() => {
    const sel = document.querySelector('#filters-bookings [data-filter="bookingStatus"]');
    if (sel) { sel.value = status; triggerPageFilter("bookings"); }
  }, 300);
}

function exportReports() {
  window.print();
}

function setupAdminProfile() {
  const email = sessionStorage.getItem("renttara_admin_email") || "admin@renttara.ph";
  const nameEl = document.getElementById("admin-name");
  const emailEl = document.getElementById("admin-email");
  const avatar = document.getElementById("admin-avatar");
  if (nameEl) nameEl.textContent = "Administrator";
  if (emailEl) emailEl.textContent = email;
  if (avatar) avatar.textContent = initials(email.split("@")[0].replace(".", " "));
}

function confirmReject(action, id, itemName) {
  openModal(
    "Confirm Rejection",
    `
    <div class="confirm-box">
      <div class="confirm-icon">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/></svg>
      </div>
      <p>Are you sure you want to reject <strong>${itemName}</strong>? The user will be notified on the mobile app.</p>
    </div>
    `,
    `
    <button class="btn btn-ghost btn-sm" onclick="closeModal()">Cancel</button>
    <button class="btn btn-danger btn-sm" onclick="handleAction('${action}', '${id}')">Yes, Reject</button>
    `
  );
}

function viewVerification(item) {
  openModal(
    "Review ID Verification",
    `
    <div class="detail-row"><span class="label">User</span><span>${item.name}</span></div>
    <div class="detail-row"><span class="label">Email</span><span>${item.email}</span></div>
    <div class="detail-row"><span class="label">Role</span><span class="role-pill ${item.role}">${item.role}</span></div>
    <div class="detail-row"><span class="label">ID 1</span><span>${item.idType1}</span></div>
    <div class="detail-row"><span class="label">ID 2</span><span>${item.idType2}</span></div>
    <div class="detail-row"><span class="label">Submitted</span><span>${item.submittedAt}</span></div>
    <p style="margin:18px 0 10px;font-weight:700;font-size:0.82rem;color:var(--text-secondary);">UPLOADED DOCUMENTS</p>
    <div class="id-preview">
      <div class="id-placeholder">${item.idType1}</div>
      <div class="id-placeholder">${item.idType2}</div>
    </div>
    <div class="form-group" style="margin-top:16px;">
      <label>Rejection reason (if rejecting)</label>
      <textarea rows="2" placeholder="e.g. Blurry image, ID expired..."></textarea>
    </div>
    `,
    `
    <button class="btn btn-ghost btn-sm" onclick="closeModal()">Cancel</button>
    <button class="btn btn-danger btn-sm" onclick="confirmReject('Rejected', '${item.id}', '${item.name.replace(/'/g, "\\'")}')">Reject</button>
    <button class="btn btn-success btn-sm" onclick="handleAction('Approved', '${item.id}')">Approve Account</button>
    `
  );
}

function viewVehicle(item) {
  openModal(
    "Review Vehicle Submission",
    `
    <div class="detail-row"><span class="label">Owner</span><span>${item.ownerName}</span></div>
    <div class="detail-row"><span class="label">Vehicle</span><span>${item.vehicleName}</span></div>
    <div class="detail-row"><span class="label">Type</span><span>${item.type} · ${item.seats} seats</span></div>
    <div class="detail-row"><span class="label">Price / Day</span><span>₱${item.pricePerDay.toLocaleString()}</span></div>
    <div class="detail-row"><span class="label">Transmission</span><span>${item.transmission}</span></div>
    <div class="detail-row"><span class="label">Driver Available</span><span>${item.hasDriver ? "Yes" : "No"}</span></div>
    <div class="detail-row"><span class="label">OR/CR Uploaded</span><span>${item.orCrUploaded ? "Yes" : "No"}</span></div>
    <div class="id-preview" style="margin-top:16px;">
      <div class="id-placeholder">Vehicle Photo</div>
      <div class="id-placeholder">OR / CR Document</div>
    </div>
    <div class="form-group" style="margin-top:16px;">
      <label>Remarks for owner</label>
      <textarea rows="2" placeholder="Shown in Submission Status screen..."></textarea>
    </div>
    `,
    `
    <button class="btn btn-ghost btn-sm" onclick="closeModal()">Cancel</button>
    <button class="btn btn-danger btn-sm" onclick="confirmReject('Vehicle Rejected', '${item.id}', '${item.vehicleName.replace(/'/g, "\\'")}')">Reject</button>
    <button class="btn btn-success btn-sm" onclick="handleAction('Vehicle Approved', '${item.id}')">Approve Listing</button>
    `
  );
}

function viewBooking(item) {
  openModal(
    "Booking Details",
    `
    <div class="detail-row"><span class="label">Booking ID</span><span style="font-weight:700;">${item.id}</span></div>
    <div class="detail-row"><span class="label">Renter</span><span>${item.renter}</span></div>
    <div class="detail-row"><span class="label">Owner</span><span>${item.owner}</span></div>
    <div class="detail-row"><span class="label">Vehicle</span><span>${item.vehicle}</span></div>
    <div class="detail-row"><span class="label">Dates</span><span>${item.startDate} → ${item.endDate}</span></div>
    <div class="detail-row"><span class="label">Reservation Fee</span><span>₱${item.reservationFee.toLocaleString()}</span></div>
    <div class="detail-row"><span class="label">Escrow Status</span><span>${getStatusBadge(item.paymentStatus)}</span></div>
    <div class="detail-row"><span class="label">Booking Status</span><span>${getStatusBadge(item.bookingStatus)}</span></div>
    <div class="detail-row"><span class="label">Driver Requested</span><span>${item.driverRequested ? "Yes" : "No"}</span></div>
    `,
    `<button class="btn btn-ghost btn-sm" onclick="closeModal()">Close</button>`
  );
}

function statCard(type, iconKey, label, value, sub, trend, page) {
  const trendHtml = trend ? `<span class="stat-trend ${trend.cls}">${trend.text}</span>` : "";
  const clickAttr = page
    ? `class="stat-card ${type} clickable" onclick="navigateTo('${page}')" role="button" tabindex="0"`
    : `class="stat-card ${type}"`;
  return `
    <div ${clickAttr}>
      <div class="stat-top">
        <div class="stat-icon ${type}">${ICONS[iconKey]}</div>
        ${trendHtml}
      </div>
      <div class="label">${label}</div>
      <div class="value">${value}</div>
      <div class="sub">${sub}</div>
    </div>`;
}

function renderEmptyState(message) {
  return `
    <tr><td colspan="20">
      <div class="empty-state">
        <div class="empty-state-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        </div>
        <h4>No records found</h4>
        <p>${message}</p>
      </div>
    </td></tr>`;
}

function getFilteredVerifications() {
  const f = getPageFilters("verifications");
  return APP_STATE.verifications.filter((v) => {
    if (f.role && v.role !== f.role) return false;
    if (f.status && v.status !== f.status) return false;
    return matchesSearch(f.search, v.name, v.email, v.id, v.idType1, v.idType2);
  });
}

function getFilteredVehicles() {
  const f = getPageFilters("vehicles");
  return APP_STATE.vehicleSubmissions.filter((v) => {
    if (f.status && v.status !== f.status) return false;
    return matchesSearch(f.search, v.ownerName, v.vehicleName, v.type, v.id);
  });
}

function getFilteredBookings() {
  const f = getPageFilters("bookings");
  return APP_STATE.bookings.filter((b) => {
    if (f.bookingStatus && b.bookingStatus !== f.bookingStatus) return false;
    if (f.paymentStatus && b.paymentStatus !== f.paymentStatus) return false;
    return matchesSearch(f.search, b.id, b.renter, b.owner, b.vehicle);
  });
}

function getFilteredUsers() {
  const f = getPageFilters("users");
  return APP_STATE.users.filter((u) => {
    if (f.role && u.role !== f.role) return false;
    if (f.status && u.status !== f.status) return false;
    return matchesSearch(f.search, u.name, u.email, u.id);
  });
}

function getFilteredSubscriptions() {
  const f = getPageFilters("subscriptions");
  return APP_STATE.subscriptions.filter((s) => {
    if (f.status && s.status !== f.status) return false;
    return matchesSearch(f.search, s.owner, s.plan, s.id);
  });
}

function renderDashboard() {
  const s = APP_STATE.stats;
  const grid = document.getElementById("stats-grid");
  grid.className = "stats-grid";
  grid.innerHTML = [
    statCard("warning", "id", "Pending Verifications", s.pendingVerifications, "Tap to review queue", { cls: "alert", text: "Action needed" }, "verifications"),
    statCard("warning", "vehicle", "Vehicle Approvals", s.pendingVehicles, "Tap to approve listings", { cls: "alert", text: "Review queue" }, "vehicles"),
    statCard("info", "booking", "Active Bookings", s.activeBookings, "Ongoing rentals", { cls: "up", text: "+3 this week" }, "bookings"),
    statCard("danger", "overdue", "Overdue Rentals", s.overdueRentals, "Needs monitoring", { cls: "alert", text: "Urgent" }, "bookings"),
    statCard("default", "users", "Total Users", s.totalUsers, `${s.totalRenters} renters · ${s.totalOwners} owners`, { cls: "up", text: "+6 new" }, "users"),
    statCard("success", "revenue", "Subscription Revenue", `₱${s.subscriptionRevenue.toLocaleString()}`, "This month", { cls: "up", text: "+12%" }, "subscriptions")
  ].join("");

  const activityIcons = { verification: "id", vehicle: "vehicle", alert: "alert", booking: "check", subscription: "card" };
  document.getElementById("activity-feed").innerHTML = APP_STATE.activities
    .map((a) => {
      const iconKey = activityIcons[a.type] || "booking";
      return `
        <div class="activity-item">
          <div class="activity-icon ${a.type}">${ICONS[iconKey]}</div>
          <div><p>${a.text}</p><time>${a.time}</time></div>
        </div>`;
    }).join("");

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const welcomeH2 = document.querySelector("#page-dashboard .welcome-strip h2");
  if (welcomeH2) welcomeH2.textContent = `${greeting}, Admin`;

  const dateEl = document.getElementById("current-date");
  if (dateEl) {
    dateEl.textContent = new Date().toLocaleDateString("en-PH", {
      weekday: "long", year: "numeric", month: "long", day: "numeric"
    });
  }
}

function renderVerifications() {
  const all = APP_STATE.verifications;
  const rows = getFilteredVerifications();
  updateCount("verifications", rows.length, all.length);
  document.getElementById("verifications-table").innerHTML = rows.length
    ? rows.map((v) => `
      <tr>
        <td data-label="ID" style="font-weight:700;color:var(--text-tertiary);font-size:0.8rem;">${v.id}</td>
        <td data-label="User"><div class="user-cell"><div class="user-avatar ${v.role}">${initials(v.name)}</div><div>${v.name}<small>${v.email}</small></div></div></td>
        <td data-label="Role"><span class="role-pill ${v.role}">${v.role}</span></td>
        <td data-label="IDs" style="font-size:0.82rem;">${v.idType1}<br><small style="color:var(--text-tertiary)">${v.idType2}</small></td>
        <td data-label="Date">${v.submittedAt}</td>
        <td data-label="Status">${getStatusBadge(v.status)}</td>
        <td data-label="Action"><button class="btn btn-coral btn-sm" onclick='viewVerification(${JSON.stringify(v).replace(/'/g, "&#39;")})'>Review</button></td>
      </tr>`).join("")
    : renderEmptyState("No verifications match your filters.");
}

function renderVehicles() {
  const all = APP_STATE.vehicleSubmissions;
  const rows = getFilteredVehicles();
  updateCount("vehicles", rows.length, all.length);
  document.getElementById("vehicles-table").innerHTML = rows.length
    ? rows.map((v) => `
      <tr>
        <td data-label="ID" style="font-weight:700;color:var(--text-tertiary);font-size:0.8rem;">${v.id}</td>
        <td data-label="Owner"><div class="user-cell"><div class="user-avatar owner">${initials(v.ownerName)}</div><div>${v.ownerName}</div></div></td>
        <td data-label="Vehicle" style="font-weight:600;">${v.vehicleName}</td>
        <td data-label="Type">${v.type}</td>
        <td data-label="Price" style="font-weight:700;">₱${v.pricePerDay.toLocaleString()}<small style="font-weight:400;color:var(--text-tertiary)">/day</small></td>
        <td data-label="Submitted">${v.submittedAt}</td>
        <td data-label="Status">${getStatusBadge(v.status)}</td>
        <td data-label="Action"><button class="btn btn-coral btn-sm" onclick='viewVehicle(${JSON.stringify(v).replace(/'/g, "&#39;")})'>Review</button></td>
      </tr>`).join("")
    : renderEmptyState("No vehicles match your filters.");
}

function renderBookings() {
  const all = APP_STATE.bookings;
  const rows = getFilteredBookings();
  updateCount("bookings", rows.length, all.length);
  document.getElementById("bookings-table").innerHTML = rows.length
    ? rows.map((b) => `
      <tr>
        <td data-label="Booking" style="font-weight:700;">${b.id}</td>
        <td data-label="Renter">${b.renter}</td>
        <td data-label="Owner">${b.owner}</td>
        <td data-label="Vehicle">${b.vehicle}</td>
        <td data-label="Dates" style="font-size:0.82rem;">${b.startDate}<br><small style="color:var(--text-tertiary)">→ ${b.endDate}</small></td>
        <td data-label="Escrow">${getStatusBadge(b.paymentStatus)}</td>
        <td data-label="Status">${getStatusBadge(b.bookingStatus)}</td>
        <td data-label="Action"><button class="btn btn-ghost btn-sm" onclick='viewBooking(${JSON.stringify(b).replace(/'/g, "&#39;")})'>View</button></td>
      </tr>`).join("")
    : renderEmptyState("No bookings match your filters.");
}

function renderUsers() {
  const all = APP_STATE.users;
  const rows = getFilteredUsers();
  updateCount("users", rows.length, all.length);
  document.getElementById("users-table").innerHTML = rows.length
    ? rows.map((u) => `
      <tr>
        <td data-label="ID" style="font-weight:700;color:var(--text-tertiary);font-size:0.8rem;">${u.id}</td>
        <td data-label="Name"><div class="user-cell"><div class="user-avatar ${u.role}">${initials(u.name)}</div><div>${u.name}</div></div></td>
        <td data-label="Email" style="font-size:0.82rem;color:var(--text-secondary);">${u.email}</td>
        <td data-label="Role"><span class="role-pill ${u.role}">${u.role}</span></td>
        <td data-label="Verified">${u.verified ? '<span style="color:var(--success);font-weight:700;">✓ Yes</span>' : '<span style="color:var(--text-tertiary);">No</span>'}</td>
        <td data-label="Status">${getStatusBadge(u.status)}</td>
        <td data-label="Joined">${u.joined}</td>
        <td data-label="Action"><button class="btn btn-ghost btn-sm" onclick='viewUser(${JSON.stringify(u).replace(/'/g, "&#39;")})'>Manage</button></td>
      </tr>`).join("")
    : renderEmptyState("No users match your filters.");
}

function renderSubscriptions() {
  const all = APP_STATE.subscriptions;
  const rows = getFilteredSubscriptions();
  updateCount("subscriptions", rows.length, all.length);
  document.getElementById("subscriptions-table").innerHTML = rows.length
    ? rows.map((s) => `
      <tr>
        <td data-label="ID" style="font-weight:700;color:var(--text-tertiary);font-size:0.8rem;">${s.id}</td>
        <td data-label="Owner"><div class="user-cell"><div class="user-avatar owner">${initials(s.owner)}</div><div style="font-weight:600;">${s.owner}</div></div></td>
        <td data-label="Plan" style="font-weight:600;">${s.plan}</td>
        <td data-label="Price" style="font-weight:700;">₱${s.price}<small style="font-weight:400;color:var(--text-tertiary)">/mo</small></td>
        <td data-label="Period" style="font-size:0.82rem;">${s.startDate}<br><small style="color:var(--text-tertiary)">→ ${s.endDate}</small></td>
        <td data-label="Status">${getStatusBadge(s.status)}</td>
      </tr>`).join("")
    : renderEmptyState("No subscriptions match your filters.");
}

function triggerPageFilter(pageId) {
  const renderer = PAGE_RENDERERS[pageId];
  if (!renderer) return;
  withTableLoading(`${pageId}-table`, renderer);
}

function bindFilters() {
  Object.keys(PAGE_RENDERERS).forEach((pageId) => {
    const container = document.getElementById(`filters-${pageId}`);
    if (!container) return;
    const handler = debounce(() => triggerPageFilter(pageId), 250);
    container.querySelectorAll("[data-filter]").forEach((el) => {
      el.addEventListener("input", handler);
      el.addEventListener("change", handler);
    });
  });
}

function syncGlobalSearch() {
  const global = document.getElementById("global-search");
  if (!global) return;
  global.addEventListener("input", debounce((e) => {
    const container = document.getElementById(`filters-${currentPage}`);
    const searchInput = container?.querySelector('[data-filter="search"]');
    if (searchInput) {
      searchInput.value = e.target.value;
      triggerPageFilter(currentPage);
    } else {
      showToast(`Search not available on ${currentPage} page`);
    }
  }, 200));
}

function openSidebar() {
  document.getElementById("sidebar")?.classList.add("open");
  document.getElementById("sidebar-backdrop")?.classList.add("open");
  document.body.style.overflow = "hidden";
}

function closeSidebar() {
  document.getElementById("sidebar")?.classList.remove("open");
  document.getElementById("sidebar-backdrop")?.classList.remove("open");
  document.body.style.overflow = "";
}

function navigateTo(pageId) {
  currentPage = pageId;
  document.querySelectorAll(".page-section").forEach((el) => el.classList.remove("active"));
  document.querySelectorAll(".nav-link").forEach((el) => el.classList.remove("active"));
  document.querySelectorAll(".bottom-nav-item[data-page]").forEach((el) => el.classList.remove("active"));

  const section = document.getElementById(`page-${pageId}`);
  const link = document.querySelector(`.nav-link[data-page="${pageId}"]`);
  const bottomLink = document.querySelector(`.bottom-nav-item[data-page="${pageId}"]`);

  if (section) section.classList.add("active");
  if (link) link.classList.add("active");
  if (bottomLink) bottomLink.classList.add("active");

  const titles = {
    dashboard: "Dashboard",
    verifications: "ID Verification",
    vehicles: "Vehicle Approval",
    bookings: "Bookings & Escrow",
    users: "User Management",
    subscriptions: "Subscriptions",
    reports: "Reports & Analytics",
    audit: "Audit Log",
    settings: "Platform Settings"
  };
  document.getElementById("page-title").textContent = titles[pageId] || "Admin";

  if (pageId === "settings") loadSettingsUI();
  if (pageId === "audit") renderAuditLogs();

  const globalSearch = document.getElementById("global-search");
  const pageSearch = document.getElementById(`filters-${pageId}`)?.querySelector('[data-filter="search"]');
  if (globalSearch && pageSearch) globalSearch.value = pageSearch.value;

  if (pageId === "reports" && !chartsInitialized) {
    setTimeout(() => { initReportsCharts(); chartsInitialized = true; }, 100);
  }

  closeSidebar();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

async function initDashboard() {
  showSkeletonStats();
  showSkeletonActivity();
  ["verifications", "vehicles", "bookings", "users", "subscriptions"].forEach((p) => showTableSkeleton(`${p}-table`));

  await delay(isFirebaseEnabled() ? 400 : 750);

  recalculateStats();
  renderDashboard();
  renderVerifications();
  renderVehicles();
  renderBookings();
  renderUsers();
  renderSubscriptions();
  renderAuditLogs();
  renderNotifications();
  updateDynamicUI();
  setupAdminProfile();
  updateFirebaseStatusUI();

  bindFilters();
  syncGlobalSearch();

  document.addEventListener("click", (e) => {
    if (!e.target.closest(".notif-wrap")) document.getElementById("notif-panel")?.classList.remove("open");
  });

  document.querySelectorAll(".nav-link").forEach((link) => {
    link.addEventListener("click", (e) => { e.preventDefault(); navigateTo(link.dataset.page); });
  });

  document.querySelectorAll(".bottom-nav-item[data-page]").forEach((link) => {
    link.addEventListener("click", (e) => { e.preventDefault(); navigateTo(link.dataset.page); });
  });

  document.getElementById("bottom-nav-menu")?.addEventListener("click", openSidebar);
  document.getElementById("sidebar-backdrop")?.addEventListener("click", closeSidebar);
  document.getElementById("modal-overlay").addEventListener("click", (e) => {
    if (e.target.id === "modal-overlay") closeModal();
  });
  document.getElementById("menu-toggle")?.addEventListener("click", () => {
    document.getElementById("sidebar")?.classList.contains("open") ? closeSidebar() : openSidebar();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") { closeModal(); closeSidebar(); }
  });
}

async function handleLogin(e) {
  e.preventDefault();
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;
  const btn = e.target.querySelector('button[type="submit"]');

  if (isFirebaseEnabled()) {
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<span class="skeleton" style="display:inline-block;width:120px;height:14px;border-radius:6px;"></span>';
    }
    try {
      const cred = await firebaseSignIn(email, password);
      const ok = await verifyAdminUser(cred.user);
      if (!ok) {
        await firebaseSignOut();
        showToast("This account is not authorized as admin.");
        return;
      }
      sessionStorage.setItem("renttara_admin", "true");
      sessionStorage.setItem("renttara_admin_email", cred.user.email);
      window.location.href = "dashboard.html";
    } catch (err) {
      showToast(mapAuthError(err));
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = 'Sign in to dashboard <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>';
      }
    }
    return;
  }

  if (email !== "admin@renttara.ph" || password !== "admin123") {
    showToast("Invalid credentials. Use admin@renttara.ph / admin123");
    return;
  }

  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<span class="skeleton" style="display:inline-block;width:120px;height:14px;border-radius:6px;"></span>';
  }
  sessionStorage.setItem("renttara_admin", "true");
  sessionStorage.setItem("renttara_admin_email", email);
  setTimeout(() => { window.location.href = "dashboard.html"; }, 600);
}

async function checkAuth() {
  if (isFirebaseEnabled()) {
    await ensureFirebaseAuth();
    return;
  }
  if (!sessionStorage.getItem("renttara_admin")) window.location.href = "index.html";
}

async function logout() {
  if (isFirebaseEnabled()) {
    try { await firebaseSignOut(); } catch { /* ignore */ }
  }
  sessionStorage.removeItem("renttara_admin");
  sessionStorage.removeItem("renttara_admin_email");
  window.location.href = "index.html";
}

async function bootstrapDashboard() {
  initFirebaseApp();
  updateFirebaseStatusUI();

  if (isFirebaseEnabled()) {
    try {
      await checkAuth();
      const seeded = await firebaseEnsureSeeded();
      if (seeded) showToast("Firestore seeded with demo data");
      const remote = await loadFirebaseState();
      APP_STATE = { ...APP_STATE, ...remote };
      ensureStateShape();
      startFirebaseListeners(handleFirebaseUpdate);
    } catch (err) {
      console.error(err);
      showToast("Firebase error — falling back to local demo data");
      APP_STATE = loadAppState(MOCK_DATA);
      ensureStateShape();
    }
  } else {
    APP_STATE = loadAppState(MOCK_DATA);
    ensureStateShape();
    if (!sessionStorage.getItem("renttara_admin")) {
      window.location.href = "index.html";
      return;
    }
  }

  await initDashboard();
}

async function bootstrapLogin() {
  initFirebaseApp();
  updateFirebaseStatusUI();
  if (!isFirebaseEnabled()) return;
  try {
    const user = await waitForAuthState();
    if (user && await verifyAdminUser(user)) {
      sessionStorage.setItem("renttara_admin", "true");
      sessionStorage.setItem("renttara_admin_email", user.email);
      window.location.href = "dashboard.html";
    }
  } catch {
    /* stay on login page */
  }
}
