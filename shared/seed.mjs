import { makeRng, personName, emailFromName, NAME_POOLS } from "./rng.mjs";

const PRODUCT_NAMES = [
  "Aurora Headphones", "Nimbus Keyboard", "Orbit Mouse", "Vertex Monitor", "Quartz Watch",
  "Solstice Lamp", "Drift Desk", "Atlas Chair", "Echo Speaker", "Zen Notebook",
  "Cobalt Backpack", "Iris Camera", "Pulse Tracker", "Halo Water Bottle", "Verve Sneakers",
  "Breeze Fan", "Flint Knife Set", "Maple Cutting Board", "Nova Charger", "Summit Tent",
  "Ember Mug", "Grove Planter", "Lumen Projector", "Cascade Filter", "Tundra Jacket",
  "Velvet Throw", "Pebble Socks", "Cinder Grill", "Slate Pen", "Bloom Vase",
  "Horizon Phone Case", "Mint Hand Soap", "Ridge Wallet", "Clover Pillow", "Fable Novel",
  "Dune Sandals", "Tide Bath Bomb", "Prism Sunglasses", "Harbor Duffel", "Comet Telescope",
  "Sage Organizer", "Frost Cooler", "Willow Hammock", "Copper Flask", "Apex Router",
  "Glow Night Light", "Mosaic Puzzle", "Ivory Mug Set", "Onyx Chess Set", "Radiant Diffuser",
];

const MOVIE_TITLES = [
  "Midnight Circuit", "The Glass Horizon", "Silent Protocol", "Neon Harvest", "The Last Cartographer",
  "Paper Skyline", "Crimson Tide Line", "Echoes of Tomorrow", "The Quiet Engine", "Feral Kingdom",
  "Luminous Depths", "The Iron Garden", "Starlight Runway", "Velocity", "The Amber Circuit",
  "Ghost Protocol Zero", "Chrome Sunrise", "The Wandering Archive", "Parallel Lives", "Nightshade",
  "The Obsidian Trial", "Winter Assembly", "Forgotten Frequencies", "The Copper Compass", "Second Orbit",
  "The Marmalade Affair", "Static Dreams", "Blue Meridian", "The Hourglass Heist", "Far Horizons",
];

const BOOK_TITLES = [
  "The Silent Algorithm", "Forests of Memory", "Beneath the Static", "The Cartographer's Daughter",
  "River of Names", "The Last Lighthouse", "Infinite Patience", "The Glass Orchard", "Night Arithmetic",
  "The Weight of Zero", "Paper Constellations", "A Season of Embers", "The Clockwork Coast", "Salt and Signal",
  "The Quiet Revolution", "Walls of the Mind", "The Atlas of Small Things", "Between Tides", "The Fractal Garden",
  "Letters from the Deep", "The Compass of Clouds", "Ordinary Light", "The Map of Hours", "Slow Fires",
];

const AIRLINES = [
  "AeroGlide", "SkyUnion", "Vector Air", "Nordstar", "PacificWings", "Meridian Air",
  "JetStream", "FalconAir", "BlueHorizon", "TransGlobe",
];

const AIRPORTS = [
  "JFK", "LAX", "LHR", "CDG", "HND", "SIN", "DXB", "GRU", "SYD", "NBO",
  "AMS", "FRA", "ICN", "MEX", "CAI", "BOM", "IST", "MAD", "YYZ", "SFO",
];

const RESTAURANT_NAMES = [
  "Ember & Oak", "Saltwater", "The Golden Fork", "Bamboo House", "Casa Verde", "Nimbus Kitchen",
  "The Rustic Table", "Palette Bistro", "Copper Spoon", "Lotus Garden", "Firelight Grill", "Harvest & Hearth",
];

const CUISINES = [
  "Italian", "Mexican", "Japanese", "Thai", "Indian", "French", "Greek", "Lebanese",
  "Vietnamese", "American", "Spanish", "Korean", "Moroccan", "Peruvian",
];

const MENU_CATEGORIES = ["Appetizer", "Main", "Dessert", "Drink", "Side", "Soup"];

const POST_TOPICS = ["tech", "design", "food", "travel", "fitness", "music", "art", "science", "gaming", "film"];

const HOSPITAL_DEPARTMENTS = ["Cardiology", "Neurology", "Oncology", "Pediatrics", "Emergency", "Orthopedics", "Radiology", "Dermatology"];

const DOCTORS = [
  "Dr. Elena Voss", "Dr. Marcus Chen", "Dr. Priya Nair", "Dr. Omar Haddad", "Dr. Lena Fischer",
  "Dr. Daniel Reyes", "Dr. Sofia Marino", "Dr. Kenji Sato", "Dr. Amara Diallo", "Dr. Hugo Lindqvist",
];

const MERCHANTS = [
  "WholeFoods", "Amazon", "Target", "Walmart", "Starbucks", "Shell Gas", "Uber", "Netflix",
  "Spotify", "Apple Store", "BestBuy", "Costco", "IKEA", "Local Cafe", "Gym One", "Pharma Plus",
  "BookNook", "Pet Pantry", "Tech Hub", "Green Grocer",
];

const TRANSACTION_CATEGORIES = [
  "groceries", "transport", "entertainment", "utilities", "shopping", "dining", "health",
  "travel", "education", "subscriptions",
];

const STATUS_POOL = {
  delivered: 0.46,
  shipped: 0.16,
  processing: 0.18,
  cancelled: 0.2,
};

const PAYMENT_METHODS = ["card", "card", "card", "paypal", "paypal", "bank_transfer", "wallet"];

/**
 * Generate the full Mongo Quest dataset deterministically.
 * @param {number} seed
 */
export function generateSeed(seed = 20260803) {
  const rng = makeRng(seed);
  const db = {};

  // ---------- Categories ----------
  const catNames = [
    "Electronics", "Home & Kitchen", "Sports", "Books", "Beauty", "Toys & Games",
    "Fashion", "Outdoors", "Office", "Groceries", "Health", "Accessories",
  ];
  db.categories = catNames.map((name, i) => ({
    _id: rng.oid(),
    name,
    slug: name.toLowerCase().replace(/[^a-z]+/g, "-"),
    description: `Everything for ${name.toLowerCase()}.`,
    createdAt: rng.date("2020-01-01", "2022-01-01"),
  }));

  // ---------- Products ----------
  const products = [];
  for (let i = 0; i < 140; i++) {
    const cat = rng.pick(db.categories);
    const price = rng.dec(5, 500, 2);
    products.push({
      _id: rng.oid(),
      name: rng.pick(PRODUCT_NAMES) + (rng.bool(0.4) ? " Pro" : rng.bool(0.3) ? " Mini" : ""),
      categoryId: cat._id,
      sku: `SKU-${rng.int(100000, 999999)}`,
      price,
      cost: rng.dec(price * 0.3, price * 0.75, 2),
      stock: rng.int(0, 800),
      tags: rng.pickN(["bestseller", "new", "eco", "premium", "sale", "limited"], rng.int(0, 3)),
      rating: rng.dec(3, 5, 1),
      numReviews: rng.int(0, 400),
      active: rng.bool(0.85),
      createdAt: rng.date("2022-01-01", "2026-01-01"),
    });
  }
  db.products = products;

  // ---------- Users ----------
  const users = [];
  for (let i = 0; i < 220; i++) {
    const name = personName(rng);
    users.push({
      _id: rng.oid(),
      name,
      email: emailFromName(rng, name),
      age: rng.int(18, 72),
      city: rng.pick(NAME_POOLS.CITIES),
      country: rng.pick(NAME_POOLS.COUNTRIES),
      isActive: rng.bool(0.78),
      plan: rng.weighted({ free: 0.4, basic: 0.3, pro: 0.2, enterprise: 0.1 }),
      joinedAt: rng.date("2019-01-01", "2026-06-01"),
      lastLogin: rng.date("2026-05-01", "2026-08-02"),
      followers: rng.int(0, 5000),
    });
  }
  db.users = users;

  // ---------- Orders ----------
  const orders = [];
  for (let i = 0; i < 520; i++) {
    const user = rng.pick(users);
    const itemCount = rng.int(1, 6);
    const items = [];
    let subtotal = 0;
    for (let j = 0; j < itemCount; j++) {
      const product = rng.pick(products);
      const qty = rng.int(1, 4);
      items.push({
        productId: product._id,
        name: product.name,
        qty,
        price: product.price,
      });
      subtotal += qty * product.price;
    }
    subtotal = Math.round(subtotal * 100) / 100;
    const shippingFee = rng.dec(0, 20, 2);
    const tax = Math.round(subtotal * 0.08 * 100) / 100;
    const total = Math.round((subtotal + shippingFee + tax) * 100) / 100;
    const status = rng.weighted(STATUS_POOL);
    const createdAt = rng.date("2024-01-01", "2026-07-15");
    const order = {
      _id: rng.oid(),
      orderNumber: `ORD-${String(100000 + i)}`,
      userId: user._id,
      status,
      createdAt,
      items,
      itemsCount: itemCount,
      subtotal,
      shippingFee,
      tax,
      total,
      paymentMethod: rng.pick(PAYMENT_METHODS),
      shippingAddress: {
        city: rng.pick(NAME_POOLS.CITIES),
        country: rng.pick(NAME_POOLS.COUNTRIES),
      },
    };
    if (status === "delivered") {
      order.shippedAt = new Date(Date.parse(createdAt) + 86400000).toISOString();
      order.deliveredAt = new Date(Date.parse(order.shippedAt) + 86400000 * rng.int(1, 4)).toISOString();
    } else if (status === "shipped") {
      order.shippedAt = new Date(Date.parse(createdAt) + 86400000).toISOString();
    }
    orders.push(order);
  }
  db.orders = orders;

  // ---------- Reviews ----------
  const reviews = [];
  for (let i = 0; i < 420; i++) {
    const product = rng.pick(products);
    const user = rng.pick(users);
    const rating = Number(rng.weighted({ 5: 0.4, 4: 0.3, 3: 0.15, 2: 0.1, 1: 0.05 }));
    reviews.push({
      _id: rng.oid(),
      productId: product._id,
      userId: user._id,
      rating,
      title: rating >= 4 ? "Loved it" : rating === 3 ? "It's okay" : "Disappointed",
      body: "A very honest customer review written for the Mongo Quest dataset.",
      verified: rng.bool(0.6),
      helpfulVotes: rng.int(0, 120),
      createdAt: rng.date("2024-01-01", "2026-07-15"),
    });
  }
  db.reviews = reviews;

  // ---------- Actors ----------
  const actors = [];
  for (let i = 0; i < 130; i++) {
    actors.push({
      _id: rng.oid(),
      name: personName(rng),
      age: rng.int(22, 78),
      country: rng.pick(NAME_POOLS.COUNTRIES),
      awards: rng.int(0, 12),
      debutYear: rng.int(1985, 2020),
    });
  }
  db.actors = actors;

  // ---------- Movies ----------
  const movies = [];
  for (let i = 0; i < 160; i++) {
    const year = rng.int(1990, 2025);
    const actorCount = rng.int(1, 5);
    movies.push({
      _id: rng.oid(),
      title: rng.pick(MOVIE_TITLES) + (rng.bool(0.5) ? ` ${rng.int(2, 9)}` : ""),
      year,
      genres: rng.pickN(["Drama", "Action", "Comedy", "Sci-Fi", "Thriller", "Romance", "Horror", "Documentary", "Animation", "Adventure"], rng.int(1, 3)),
      rating: rng.dec(4.5, 9.5, 1),
      votes: rng.int(50, 250000),
      durationMinutes: rng.int(85, 190),
      director: personName(rng),
      actorIds: rng.pickN(actors.map((a) => a._id), actorCount),
      budget: rng.int(5, 250) * 1000000,
      revenue: rng.int(1, 900) * 1000000,
      awards: rng.int(0, 6),
      language: rng.weighted({ English: 0.7, Spanish: 0.1, French: 0.08, Japanese: 0.06, German: 0.06 }),
    });
  }
  db.movies = movies;

  // ---------- Teachers ----------
  const teacherDepts = ["Computer Science", "Mathematics", "Physics", "Economics", "Biology", "History", "Engineering", "Design"];
  const teachers = [];
  for (let i = 0; i < 26; i++) {
    const name = personName(rng);
    teachers.push({
      _id: rng.oid(),
      name,
      department: rng.pick(teacherDepts),
      email: emailFromName(rng, name),
      hiredAt: rng.date("2010-01-01", "2024-01-01"),
    });
  }
  db.teachers = teachers;

  // ---------- Courses ----------
  const courses = [];
  for (let i = 0; i < 40; i++) {
    courses.push({
      _id: rng.oid(),
      title: rng.pick(["Intro to", "Advanced", "Applied", "Foundations of", "Special Topics in"]) + " " + rng.pick(teacherDepts),
      teacherId: rng.pick(teachers)._id,
      category: rng.pick(teacherDepts),
      level: rng.pick(["beginner", "intermediate", "advanced"]),
      price: rng.dec(49, 499, 2),
      studentsEnrolled: rng.int(20, 2000),
      durationHours: rng.dec(6, 60, 1),
      rating: rng.dec(3, 5, 1),
      publishedAt: rng.date("2022-01-01", "2026-01-01"),
    });
  }
  db.courses = courses;

  // ---------- Students ----------
  const students = [];
  for (let i = 0; i < 260; i++) {
    const name = personName(rng);
    const courseIds = rng.pickN(courses.map((c) => c._id), rng.int(1, 6));
    students.push({
      _id: rng.oid(),
      name,
      email: emailFromName(rng, name),
      age: rng.int(18, 38),
      major: rng.pick(teacherDepts),
      gpa: rng.dec(2.0, 4.0, 2),
      enrolledAt: rng.date("2020-01-01", "2025-09-01"),
      courseIds,
    });
  }
  db.students = students;

  // ---------- Companies ----------
  const industries = ["Technology", "Finance", "Healthcare", "Retail", "Energy", "Manufacturing", "Media", "Education"];
  const companies = [];
  for (let i = 0; i < 48; i++) {
    companies.push({
      _id: rng.oid(),
      name: rng.pick(["Nova", "Vertex", "Cobalt", "Drift", "Atlas", "Lumen", "Echo", "Flux", "Orbit", "Pulse", "Halo", "Zenith"]) + rng.pick(["Labs", "Systems", "Group", "Works", "Core", "Dynamics", "Partners", "Industries"]),
      industry: rng.pick(industries),
      country: rng.pick(NAME_POOLS.COUNTRIES),
      founded: rng.int(1985, 2022),
      employees: rng.int(100, 20000),
      revenue: rng.int(10, 5000) * 1000000,
    });
  }
  db.companies = companies;

  // ---------- Departments ----------
  const departments = [];
  for (const company of companies) {
    const deptCount = rng.int(1, 3);
    for (let j = 0; j < deptCount; j++) {
      departments.push({
        _id: rng.oid(),
        companyId: company._id,
        name: rng.pick(["Engineering", "Sales", "Marketing", "HR", "Finance", "Operations", "Support", "Product"]),
        budget: rng.int(200, 5000) * 1000,
        headCount: rng.int(5, 300),
        location: rng.pick(NAME_POOLS.CITIES),
      });
    }
  }
  db.departments = departments;

  // ---------- Employees ----------
  const employees = [];
  for (let i = 0; i < 460; i++) {
    const company = rng.pick(companies);
    const dept = rng.pick(departments.filter((d) => d.companyId === company._id));
    employees.push({
      _id: rng.oid(),
      name: personName(rng),
      companyId: company._id,
      departmentId: dept._id,
      role: rng.pick(["Engineer", "Manager", "Analyst", "Designer", "Coordinator", "Specialist", "Director", "Associate"]),
      salary: rng.int(35, 220) * 1000,
      hiredAt: rng.date("2010-01-01", "2025-12-01"),
      age: rng.int(22, 65),
      performance: rng.dec(1, 5, 1),
      status: rng.weighted({ active: 0.85, on_leave: 0.1, terminated: 0.05 }),
    });
  }
  db.employees = employees;

  // ---------- Accounts ----------
  const accounts = [];
  for (let i = 0; i < 240; i++) {
    const owner = rng.pick(users);
    accounts.push({
      _id: rng.oid(),
      owner: owner._id,
      type: rng.weighted({ checking: 0.4, savings: 0.35, credit: 0.15, investment: 0.1 }),
      balance: rng.int(-500, 50000),
      currency: rng.weighted({ USD: 0.7, EUR: 0.12, GBP: 0.08, JPY: 0.05, CAD: 0.05 }),
      openedAt: rng.date("2018-01-01", "2025-06-01"),
      branch: rng.pick(NAME_POOLS.CITIES),
    });
  }
  db.accounts = accounts;

  // ---------- Transactions ----------
  const transactions = [];
  for (let i = 0; i < 800; i++) {
    const account = rng.pick(accounts);
    const type = rng.weighted({ deposit: 0.25, withdraw: 0.35, payment: 0.3, transfer: 0.1 });
    const amount = rng.dec(5, 1500, 2);
    transactions.push({
      _id: rng.oid(),
      accountId: account._id,
      type,
      amount,
      category: rng.pick(TRANSACTION_CATEGORIES),
      merchant: rng.pick(MERCHANTS),
      description: `${type} for ${rng.pick(TRANSACTION_CATEGORIES)}`,
      date: rng.date("2025-01-01", "2026-07-15"),
      status: rng.weighted({ settled: 0.7, pending: 0.2, failed: 0.1 }),
    });
  }
  db.transactions = transactions;

  // ---------- Hospitals ----------
  const hospitals = [];
  for (let i = 0; i < 32; i++) {
    hospitals.push({
      _id: rng.oid(),
      name: rng.pick(["St. Mary's", "Central", "Riverside", "Mercy", "Sunrise", "Harbor", "Lakeside", "Summit"]) + " Hospital",
      city: rng.pick(NAME_POOLS.CITIES),
      beds: rng.int(50, 1200),
      rating: rng.dec(3, 5, 1),
      departments: rng.pickN(HOSPITAL_DEPARTMENTS, rng.int(3, 8)),
    });
  }
  db.hospitals = hospitals;

  // ---------- Patients ----------
  const patients = [];
  for (let i = 0; i < 300; i++) {
    patients.push({
      _id: rng.oid(),
      name: personName(rng),
      age: rng.int(1, 95),
      gender: rng.weighted({ female: 0.5, male: 0.49, other: 0.01 }),
      bloodType: rng.pick(["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]),
      city: rng.pick(NAME_POOLS.CITIES),
      insurance: rng.pick(["Medicare", "BlueCross", "Aetna", "UnitedHealth", "None", "Kaiser", "Humana"]),
      registeredAt: rng.date("2019-01-01", "2025-12-01"),
    });
  }
  db.patients = patients;

  // ---------- Appointments ----------
  const appointments = [];
  for (let i = 0; i < 520; i++) {
    const patient = rng.pick(patients);
    const hospital = rng.pick(hospitals);
    appointments.push({
      _id: rng.oid(),
      patientId: patient._id,
      hospitalId: hospital._id,
      doctor: rng.pick(DOCTORS),
      specialty: rng.pick(hospital.departments),
      date: rng.date("2025-01-01", "2026-08-01"),
      status: rng.weighted({ completed: 0.55, scheduled: 0.25, cancelled: 0.12, no_show: 0.08 }),
      cost: rng.dec(100, 5000, 2),
      durationMin: rng.int(15, 120),
    });
  }
  db.appointments = appointments;

  // ---------- Flights ----------
  const flights = [];
  for (let i = 0; i < 180; i++) {
    const airline = rng.pick(AIRLINES);
    const from = rng.pick(AIRPORTS);
    let to = rng.pick(AIRPORTS);
    while (to === from) to = rng.pick(AIRPORTS);
    const seats = rng.int(60, 400);
    const departure = rng.date("2026-08-01", "2026-08-31");
    const duration = rng.int(60, 720);
    flights.push({
      _id: rng.oid(),
      airline,
      flightNumber: `${airline.slice(0, 3).toUpperCase()}${rng.int(100, 999)}`,
      from,
      to,
      departureTime: departure,
      arrivalTime: new Date(Date.parse(departure) + duration * 60000).toISOString(),
      durationMinutes: duration,
      price: rng.dec(80, 1200, 2),
      seats,
      booked: rng.int(0, seats),
      status: rng.weighted({ scheduled: 0.7, boarding: 0.15, delayed: 0.1, cancelled: 0.05 }),
    });
  }
  db.flights = flights;

  // ---------- Passengers ----------
  const passengers = [];
  for (let i = 0; i < 700; i++) {
    passengers.push({
      _id: rng.oid(),
      name: personName(rng),
      age: rng.int(2, 90),
      seatClass: rng.weighted({ economy: 0.7, business: 0.2, first: 0.1 }),
      milesFlown: rng.int(0, 2000000),
      nationality: rng.pick(NAME_POOLS.COUNTRIES),
    });
  }
  db.passengers = passengers;

  // ---------- Restaurants ----------
  const restaurants = [];
  for (let i = 0; i < 48; i++) {
    restaurants.push({
      _id: rng.oid(),
      name: rng.pick(RESTAURANT_NAMES) + (rng.bool(0.6) ? ` ${rng.int(1, 9)}` : ""),
      cuisine: rng.pick(CUISINES),
      city: rng.pick(NAME_POOLS.CITIES),
      rating: rng.dec(3, 5, 1),
      priceLevel: rng.int(1, 4),
      deliveryFee: rng.dec(0, 8, 2),
      reviewsCount: rng.int(20, 2000),
      openHour: rng.int(6, 11),
      closeHour: rng.int(20, 24),
    });
  }
  db.restaurants = restaurants;

  // ---------- Menu ----------
  const menu = [];
  for (let i = 0; i < 240; i++) {
    menu.push({
      _id: rng.oid(),
      restaurantId: rng.pick(restaurants)._id,
      name: rng.pick(["Truffle Pasta", "Spicy Ramen", "BBQ Ribs", "Caesar Salad", "Margherita Pizza", "Pad Thai", "Fish Tacos", "Lamb Shawarma", "Chicken Curry", "Greek Salad", "Burger Deluxe", "Miso Soup"]),
      category: rng.pick(MENU_CATEGORIES),
      price: rng.dec(4, 40, 2),
      calories: rng.int(200, 1400),
      prepTimeMin: rng.int(5, 40),
      spicy: rng.bool(0.3),
      vegan: rng.bool(0.25),
      inStock: rng.bool(0.8),
    });
  }
  db.menu = menu;

  // ---------- Inventory ----------
  const inventory = [];
  const INV_ITEMS = ["Tomatoes", "Flour", "Chicken Breast", "Rice", "Olive Oil", "Cheese", "Onions", "Beef", "Bread", "Butter", "Potatoes", "Milk"];
  for (let i = 0; i < 240; i++) {
    inventory.push({
      _id: rng.oid(),
      restaurantId: rng.pick(restaurants)._id,
      itemName: rng.pick(INV_ITEMS),
      category: rng.pick(["produce", "dairy", "meat", "pantry", "beverages"]),
      quantity: rng.int(0, 200),
      reorderLevel: rng.int(5, 40),
      unitCost: rng.dec(1, 15, 2),
      lastRestocked: rng.date("2026-05-01", "2026-08-02"),
    });
  }
  db.inventory = inventory;

  // ---------- Authors ----------
  const authors = [];
  for (let i = 0; i < 42; i++) {
    authors.push({
      _id: rng.oid(),
      name: personName(rng),
      nationality: rng.pick(NAME_POOLS.COUNTRIES),
      bornYear: rng.int(1945, 1995),
      genres: rng.pickN(["Fiction", "Mystery", "Sci-Fi", "Fantasy", "History", "Biography", "Self-Help", "Romance"], rng.int(1, 3)),
    });
  }
  db.authors = authors;

  // ---------- Publishers ----------
  const publishers = [];
  for (let i = 0; i < 20; i++) {
    publishers.push({
      _id: rng.oid(),
      name: rng.pick(["Bluebird Press", "Ironworks Books", "Harbor & Sons", "Atlas Editions", "Stonehill", "Meridian Press", "Foxglove", "Northgate"]),
      country: rng.pick(NAME_POOLS.COUNTRIES),
      founded: rng.int(1900, 2010),
      revenue: rng.int(5, 800) * 1000000,
    });
  }
  db.publishers = publishers;

  // ---------- Books ----------
  const books = [];
  for (let i = 0; i < 320; i++) {
    const author = rng.pick(authors);
    const publisher = rng.pick(publishers);
    books.push({
      _id: rng.oid(),
      title: rng.pick(BOOK_TITLES) + (rng.bool(0.6) ? `: The ${rng.pick(["Awakening", "Return", "Reckoning", "Beginning", "Legacy", "Promise"])}` : ""),
      authorId: author._id,
      publisherId: publisher._id,
      category: rng.pick(author.genres),
      price: rng.dec(8, 45, 2),
      pages: rng.int(120, 900),
      publishedYear: rng.int(2000, 2025),
      rating: rng.dec(3, 5, 1),
      sales: rng.int(1000, 2000000),
      copiesSold: rng.int(500, 900000),
    });
  }
  db.books = books;

  // ---------- Social: Posts ----------
  const posts = [];
  for (let i = 0; i < 340; i++) {
    const author = rng.pick(users);
    posts.push({
      _id: rng.oid(),
      authorId: author._id,
      content: `Post about ${rng.pick(POST_TOPICS)} from ${author.name}.`,
      tags: rng.pickN(POST_TOPICS, rng.int(0, 4)),
      category: rng.pick(POST_TOPICS),
      createdAt: rng.date("2026-01-01", "2026-08-02"),
    });
  }
  db.posts = posts;

  // ---------- Social: Comments ----------
  const comments = [];
  for (let i = 0; i < 700; i++) {
    comments.push({
      _id: rng.oid(),
      postId: rng.pick(posts)._id,
      authorId: rng.pick(users)._id,
      content: "Interesting point! Thanks for sharing this.",
      createdAt: rng.date("2026-01-01", "2026-08-02"),
      likes: rng.int(0, 400),
    });
  }
  db.comments = comments;

  // ---------- Social: Likes ----------
  const likes = [];
  for (let i = 0; i < 1100; i++) {
    likes.push({
      _id: rng.oid(),
      postId: rng.pick(posts)._id,
      userId: rng.pick(users)._id,
      createdAt: rng.date("2026-01-01", "2026-08-02"),
    });
  }
  db.likes = likes;

  // ---------- Social: Followers (graph) ----------
  const followers = [];
  for (const user of users) {
    const follows = rng.pickN(users.map((u) => u._id), rng.int(3, 9));
    for (const followsId of follows) {
      if (followsId !== user._id) {
        followers.push({
          _id: rng.oid(),
          userId: user._id,
          followsId,
          createdAt: rng.date("2025-01-01", "2026-08-02"),
        });
      }
    }
  }
  db.followers = followers;

  // ---------- Social: Messages ----------
  const messages = [];
  for (let i = 0; i < 600; i++) {
    const from = rng.pick(users);
    const to = rng.pick(users);
    messages.push({
      _id: rng.oid(),
      fromId: from._id,
      toId: to._id,
      content: "Hey, how's it going?",
      sentAt: rng.date("2026-01-01", "2026-08-02"),
      read: rng.bool(0.6),
    });
  }
  db.messages = messages;

  // ---------- Social: Notifications ----------
  const notifications = [];
  for (let i = 0; i < 700; i++) {
    notifications.push({
      _id: rng.oid(),
      userId: rng.pick(users)._id,
      type: rng.pick(["like", "comment", "follow", "message", "mention"]),
      text: `New ${rng.pick(["like", "comment", "follower", "message"])} notification`,
      read: rng.bool(0.45),
      createdAt: rng.date("2026-01-01", "2026-08-02"),
    });
  }
  db.notifications = notifications;

  const counts = {};
  for (const [name, docs] of Object.entries(db)) {
    counts[name] = docs.length;
  }

  return {
    collections: db,
    counts,
    meta: {
      seed,
      generatedAt: "2026-08-03T00:00:00.000Z",
      collectionCount: Object.keys(db).length,
      totalDocuments: Object.values(db).reduce((s, d) => s + d.length, 0),
    },
  };
}

export const COLLECTION_ORDER = Object.freeze([
  "categories", "products", "users", "orders", "reviews",
  "actors", "movies", "teachers", "courses", "students",
  "companies", "departments", "employees", "accounts", "transactions",
  "hospitals", "patients", "appointments", "flights", "passengers",
  "restaurants", "menu", "inventory", "authors", "publishers", "books",
  "posts", "comments", "likes", "followers", "messages", "notifications",
]);
