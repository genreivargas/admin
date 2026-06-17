// Mock data — mirrors Firestore structure for future Firebase integration
const MOCK_DATA = {
  stats: {
    pendingVerifications: 5,
    pendingVehicles: 3,
    activeBookings: 12,
    overdueRentals: 2,
    totalUsers: 48,
    totalOwners: 18,
    totalRenters: 30,
    subscriptionRevenue: 4500
  },

  verifications: [
    {
      id: "VER-001",
      userId: "USR-101",
      name: "Maria Santos",
      email: "maria.santos@email.com",
      role: "renter",
      submittedAt: "2026-06-12",
      idType1: "PhilSys ID",
      idType2: "Driver's License",
      status: "pending"
    },
    {
      id: "VER-002",
      userId: "USR-102",
      name: "Juan Dela Cruz",
      email: "juan.delacruz@email.com",
      role: "owner",
      submittedAt: "2026-06-11",
      idType1: "Passport",
      idType2: "TIN ID",
      status: "pending"
    },
    {
      id: "VER-003",
      userId: "USR-103",
      name: "Ana Reyes",
      email: "ana.reyes@email.com",
      role: "renter",
      submittedAt: "2026-06-10",
      idType1: "UMID",
      idType2: "PhilSys ID",
      status: "pending"
    }
  ],

  vehicleSubmissions: [
    {
      id: "VEH-SUB-001",
      ownerId: "USR-102",
      ownerName: "Juan Dela Cruz",
      vehicleName: "Toyota Innova 2022",
      type: "Van",
      seats: 7,
      pricePerDay: 2500,
      transmission: "Automatic",
      fuel: "Diesel",
      hasDriver: true,
      orCrUploaded: true,
      submittedAt: "2026-06-11",
      status: "pending"
    },
    {
      id: "VEH-SUB-002",
      ownerId: "USR-105",
      ownerName: "Ralph Lina",
      vehicleName: "Mitsubishi Montero Sport",
      type: "SUV",
      seats: 5,
      pricePerDay: 3200,
      transmission: "Automatic",
      fuel: "Diesel",
      hasDriver: false,
      orCrUploaded: true,
      submittedAt: "2026-06-10",
      status: "pending"
    },
    {
      id: "VEH-SUB-003",
      ownerId: "USR-108",
      ownerName: "Rodrigo Semilla Jr.",
      vehicleName: "Toyota Vios 2020",
      type: "Sedan",
      seats: 5,
      pricePerDay: 1500,
      transmission: "Manual",
      fuel: "Gasoline",
      hasDriver: true,
      orCrUploaded: true,
      submittedAt: "2026-06-09",
      status: "approved"
    }
  ],

  bookings: [
    {
      id: "BK-001",
      renter: "Maria Santos",
      owner: "Rodrigo Semilla Jr.",
      vehicle: "Toyota Vios 2020",
      startDate: "2026-06-14",
      endDate: "2026-06-16",
      reservationFee: 500,
      paymentStatus: "held",
      bookingStatus: "active",
      driverRequested: true
    },
    {
      id: "BK-002",
      renter: "Carlos Mendoza",
      owner: "Ralph Lina",
      vehicle: "Mitsubishi Montero Sport",
      startDate: "2026-06-10",
      endDate: "2026-06-12",
      reservationFee: 640,
      paymentStatus: "held",
      bookingStatus: "overdue",
      driverRequested: false
    },
    {
      id: "BK-003",
      renter: "Elena Garcia",
      owner: "Juan Dela Cruz",
      vehicle: "Toyota Innova 2022",
      startDate: "2026-06-01",
      endDate: "2026-06-03",
      reservationFee: 500,
      paymentStatus: "released",
      bookingStatus: "completed",
      driverRequested: true
    }
  ],

  users: [
    { id: "USR-101", name: "Maria Santos", email: "maria.santos@email.com", role: "renter", status: "pending", verified: false, joined: "2026-06-12" },
    { id: "USR-102", name: "Juan Dela Cruz", email: "juan.delacruz@email.com", role: "owner", status: "pending", verified: false, joined: "2026-06-11", vehicles: 0 },
    { id: "USR-105", name: "Ralph Lina", email: "ralph.lina@email.com", role: "owner", status: "active", verified: true, joined: "2026-05-20", vehicles: 2 },
    { id: "USR-108", name: "Rodrigo Semilla Jr.", email: "rodrigo.semilla@email.com", role: "owner", status: "active", verified: true, joined: "2026-05-15", vehicles: 1 },
    { id: "USR-110", name: "Carlos Mendoza", email: "carlos.mendoza@email.com", role: "renter", status: "active", verified: true, joined: "2026-05-28" }
  ],

  subscriptions: [
    { id: "SUB-001", owner: "Ralph Lina", plan: "Pro (5 vehicles)", price: 499, startDate: "2026-05-01", endDate: "2026-06-01", status: "active" },
    { id: "SUB-002", owner: "Juan Dela Cruz", plan: "Basic (3 vehicles)", price: 299, startDate: "2026-06-01", endDate: "2026-07-01", status: "pending" }
  ],

  activities: [
    { text: "Maria Santos submitted ID verification", time: "2 hours ago", type: "verification" },
    { text: "Juan Dela Cruz submitted Toyota Innova for approval", time: "5 hours ago", type: "vehicle" },
    { text: "Booking BK-002 marked as OVERDUE", time: "1 day ago", type: "alert" },
    { text: "Elena Garcia completed rental BK-003", time: "2 days ago", type: "booking" },
    { text: "Ralph Lina subscribed to Pro plan", time: "3 days ago", type: "subscription" }
  ],

  reports: {
    monthlyBookings: { labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"], values: [8, 12, 10, 18, 15, 24] },
    vehicleTypes: { labels: ["SUV", "Van", "Sedan"], values: [9, 11, 4] },
    userGrowth: { labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"], renters: [12, 15, 18, 22, 26, 30], owners: [5, 7, 9, 12, 15, 18] },
    subscriptionRevenue: { labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"], values: [1200, 1800, 2100, 3200, 3800, 4500] },
    municipalities: { labels: ["Lipa", "Batangas City", "Nasugbu", "Lobo", "San Juan"], values: [7, 6, 4, 3, 4] }
  },

  notifications: [
    { id: "N-1", title: "New ID verification", message: "Maria Santos submitted documents for review.", time: "2 hours ago", read: false, type: "verification" },
    { id: "N-2", title: "Vehicle submission", message: "Juan Dela Cruz submitted Toyota Innova 2022.", time: "5 hours ago", read: false, type: "vehicle" },
    { id: "N-3", title: "Overdue rental alert", message: "Booking BK-002 is overdue — Carlos Mendoza.", time: "1 day ago", read: false, type: "alert" },
    { id: "N-4", title: "Booking completed", message: "Elena Garcia completed rental BK-003.", time: "2 days ago", read: true, type: "booking" },
    { id: "N-5", title: "New subscription", message: "Ralph Lina subscribed to Pro plan.", time: "3 days ago", read: true, type: "subscription" }
  ],

  auditLogs: [
    { id: "LOG-001", action: "System", target: "Platform", detail: "Admin dashboard initialized", admin: "Administrator", timestamp: "2026-06-14 08:00" }
  ]
};
