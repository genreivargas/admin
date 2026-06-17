// Chart.js initialization for Reports page
let chartInstances = {};

const CHART_COLORS = {
  primary: "#2563eb",
  primaryLight: "rgba(37, 99, 235, 0.15)",
  sky: "#38bdf8",
  skyLight: "rgba(56, 189, 248, 0.15)",
  success: "#059669",
  grid: "rgba(37, 99, 235, 0.08)"
};

function destroyCharts() {
  Object.values(chartInstances).forEach((c) => c?.destroy());
  chartInstances = {};
}

function baseOptions() {
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: { font: { family: "'Plus Jakarta Sans', sans-serif", size: 11 }, color: "#475569" }
      }
    },
    scales: {
      x: {
        grid: { color: CHART_COLORS.grid },
        ticks: { font: { family: "'Plus Jakarta Sans', sans-serif", size: 11 }, color: "#94a3b8" }
      },
      y: {
        grid: { color: CHART_COLORS.grid },
        ticks: { font: { family: "'Plus Jakarta Sans', sans-serif", size: 11 }, color: "#94a3b8" },
        beginAtZero: true
      }
    }
  };
}

function initReportsCharts() {
  if (typeof Chart === "undefined") return;
  destroyCharts();

  const r = (typeof APP_STATE !== "undefined" && APP_STATE.reports) ? APP_STATE.reports : MOCK_DATA.reports;
  if (!r) return;

  const bookingsCtx = document.getElementById("chart-bookings");
  if (bookingsCtx) {
    chartInstances.bookings = new Chart(bookingsCtx, {
      type: "bar",
      data: {
        labels: r.monthlyBookings.labels,
        datasets: [{
          label: "Bookings",
          data: r.monthlyBookings.values,
          backgroundColor: CHART_COLORS.primaryLight,
          borderColor: CHART_COLORS.primary,
          borderWidth: 2,
          borderRadius: 8
        }]
      },
      options: { ...baseOptions(), plugins: { legend: { display: false } } }
    });
  }

  const vehicleCtx = document.getElementById("chart-vehicles");
  if (vehicleCtx) {
    chartInstances.vehicles = new Chart(vehicleCtx, {
      type: "doughnut",
      data: {
        labels: r.vehicleTypes.labels,
        datasets: [{
          data: r.vehicleTypes.values,
          backgroundColor: ["#2563eb", "#38bdf8", "#60a5fa"],
          borderWidth: 0,
          hoverOffset: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: "65%",
        plugins: {
          legend: {
            position: "bottom",
            labels: { font: { family: "'Plus Jakarta Sans', sans-serif", size: 11 }, color: "#475569", padding: 16 }
          }
        }
      }
    });
  }

  const usersCtx = document.getElementById("chart-users");
  if (usersCtx) {
    chartInstances.users = new Chart(usersCtx, {
      type: "line",
      data: {
        labels: r.userGrowth.labels,
        datasets: [
          {
            label: "Renters",
            data: r.userGrowth.renters,
            borderColor: CHART_COLORS.primary,
            backgroundColor: CHART_COLORS.primaryLight,
            fill: true,
            tension: 0.4,
            pointRadius: 4
          },
          {
            label: "Owners",
            data: r.userGrowth.owners,
            borderColor: CHART_COLORS.sky,
            backgroundColor: CHART_COLORS.skyLight,
            fill: true,
            tension: 0.4,
            pointRadius: 4
          }
        ]
      },
      options: baseOptions()
    });
  }

  const revenueCtx = document.getElementById("chart-revenue");
  if (revenueCtx) {
    chartInstances.revenue = new Chart(revenueCtx, {
      type: "line",
      data: {
        labels: r.subscriptionRevenue.labels,
        datasets: [{
          label: "Revenue (₱)",
          data: r.subscriptionRevenue.values,
          borderColor: CHART_COLORS.success,
          backgroundColor: "rgba(5, 150, 105, 0.1)",
          fill: true,
          tension: 0.4,
          pointRadius: 4
        }]
      },
      options: {
        ...baseOptions(),
        plugins: { legend: { display: false } }
      }
    });
  }

  const muniCtx = document.getElementById("chart-municipalities");
  if (muniCtx) {
    chartInstances.municipalities = new Chart(muniCtx, {
      type: "bar",
      data: {
        labels: r.municipalities.labels,
        datasets: [{
          label: "Bookings",
          data: r.municipalities.values,
          backgroundColor: ["#2563eb", "#3b82f6", "#60a5fa", "#93c5fd", "#38bdf8"],
          borderRadius: 8,
          borderSkipped: false
        }]
      },
      options: {
        ...baseOptions(),
        indexAxis: "y",
        plugins: { legend: { display: false } }
      }
    });
  }
}
