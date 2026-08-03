import type { Achievement, Difficulty, Level, Mission, MissionType } from "@/lib/types";
import { REFERENCE_PIPELINES } from "@/shared/reference.mjs";

const XP: Record<Difficulty, number> = {
  easy: 100,
  medium: 300,
  hard: 600,
  expert: 1200,
  boss: 3000,
};

function mission(
  id: string,
  title: string,
  difficulty: Difficulty,
  estimatedMinutes: number,
  opts: Omit<
    Partial<Mission>,
    "id" | "title" | "difficulty" | "estimatedMinutes" | "collections" | "operators"
  > & {
    collections: string[];
    operators: string[];
    description: string;
    scenario: string;
    requirements: string[];
  }
): Mission {
  return {
    id,
    title,
    difficulty,
    xp: opts.xp ?? XP[difficulty],
    estimatedMinutes,
    referencePipeline: REFERENCE_PIPELINES[id],
    expectExactOrder: opts.expectExactOrder ?? true,
    ignoreInternalIds: opts.ignoreInternalIds ?? true,
    ...opts,
  } as Mission;
}

const DEFAULT_RULES = [
  "The pipeline must start from the collection named in the mission.",
  "Use only stages from your Allowed list; the forbidden stages are disqualified.",
  "Do not use write stages ($merge, $out) — this is a read-only practice.",
  "Hide internal identifiers where the expected output shows a clean result.",
  "Match the expected output: same document count, fields, values and order.",
];

const DEFAULT_MISTAKES = [
  "Returning extra fields the expected output does not include.",
  "Forgetting to sort before applying $limit, so the 'top N' are wrong.",
  "Filtering too late, which makes the pipeline slow on real data.",
];

function makeMission(
  id: string,
  title: string,
  difficulty: Difficulty,
  mins: number,
  tags: MissionType[],
  o: Parameters<typeof mission>[4]
): Mission {
  return mission(id, title, difficulty, mins, {
    tags,
    rules: DEFAULT_RULES,
    commonMistakes: DEFAULT_MISTAKES,
    ...o,
  });
}

// ---------------------------------------------------------------------------
// LEVEL 1 — The Pipeline
// ---------------------------------------------------------------------------

export const MISSIONS: Mission[] = [
  makeMission(
    "m01",
    "Warm Up: Shape the Orders",
    "easy",
    5,
    ["reshaping"],
    {
      description:
        "Introduce yourself to the pipeline. Take every order in the `orders` collection and reshape each document so it only exposes the four fields listed below.",
      scenario:
        "Your team wants a lightweight feed of recent orders for a dashboard. Nobody needs the nested items array, tax breakdown or shipping address — just the essentials.",
      collections: ["orders"],
      operators: ["$project"],
      allowedStages: ["$project", "$limit", "$sort"],
      forbiddenStages: ["$match", "$group", "$lookup", "$unwind"],
      requirements: [
        "Project each order to: orderNumber, userId, status, total",
        "Exclude _id and every other field",
        "Return ALL 520 orders (no filtering)",
      ],
      hints: [
        { title: "Which stage reshapes fields?", body: "A stage that includes or excludes fields — it is the go-to tool for 'hide internal IDs'." },
        { title: "Inclusion vs exclusion", body: "You can either list the four fields you want (inclusion) or explicitly zero out the ones you do not." },
        { title: "Keep it simple", body: "One stage is enough. No grouping, no joining, no filtering." },
      ],
      objectives: [
        "Project a document to a subset of fields",
        "Understand inclusion vs exclusion mode",
        "See the pipeline return 520 unchanged rows",
      ],
      realWorldUses: ["API response shaping", "Hiding internal fields before sending data to clients"],
      restrictions: ["_id must not appear in the output.", "All 520 orders must be returned."],
      expectExactOrder: false,
    }
  ),
  makeMission(
    "m02",
    "Count It: How Many Products?",
    "easy",
    5,
    ["analytics"],
    {
      description:
        "Return a single document telling us how many products exist in the `products` collection. This is the simplest aggregation you will ever write.",
      scenario:
        "The inventory team wants a fast, database-side count instead of loading 140 product documents into Node just to call .length.",
      collections: ["products"],
      operators: ["$count"],
      allowedStages: ["$count", "$match", "$project"],
      requirements: [
        "Return exactly one document",
        "The document must have a field named totalProducts",
        "Its value must equal the number of documents in products",
      ],
      hints: [
        { title: "One stage does it", body: "There is a dedicated stage that replaces the stream with a single count document." },
        { title: "Name the field", body: "Pass the output field name as the stage argument, e.g. { $count: 'totalProducts' }." },
      ],
      objectives: ["Count documents with $count", "Return a scalar summary document"],
      realWorldUses: ["Pagination total counts", "Batch job summaries"],
      restrictions: ["No $group needed."],
    }
  ),
  makeMission(
    "m03",
    "Filter First: Delivered Orders",
    "easy",
    5,
    ["filtering"],
    {
      description:
        "Return only orders that have been delivered. You must filter at the very start of the pipeline — before any other work.",
      scenario:
        "Support needs the list of delivered order numbers and their totals for a fulfillment report. Fetching cancelled and processing orders wastes bandwidth.",
      collections: ["orders"],
      operators: ["$match", "$project"],
      allowedStages: ["$match", "$project"],
      forbiddenStages: ["$group", "$lookup", "$unwind"],
      requirements: [
        "Only include orders where status equals 'delivered'",
        "Return exactly two fields per order: orderNumber and total",
        "_id must be hidden",
        "Do not sort — the natural order is fine",
      ],
      hints: [
        { title: "Filter early", body: "The very first stage should reduce the 520 orders down to the delivered subset." },
        { title: "Exact match", body: "A simple equality on the status field is all the query needs." },
        { title: "Then shape", body: "After filtering, reshape with $project to keep only orderNumber and total." },
      ],
      objectives: ["Use $match as the first stage", "Chain $match into $project", "Compare the input vs output counts in the visualizer"],
      realWorldUses: ["Status-driven reports", "Event streams filtered by state"],
      restrictions: ["$match must be stage #1."],
      expectExactOrder: false,
    }
  ),
  makeMission(
    "m04",
    "Order Matters: Status Distribution",
    "easy",
    8,
    ["grouping"],
    {
      description:
        "Group orders by status and count how many orders are in each group. This mission is about the ORDER of stages — why $match before $group changes performance.",
      scenario:
        "The ops team wants a quick distribution of order statuses to spot fulfilment bottlenecks. Four buckets: delivered, shipped, processing, cancelled.",
      collections: ["orders"],
      operators: ["$group", "$sort"],
      allowedStages: ["$group", "$sort", "$project"],
      requirements: [
        "Group by the status field",
        "Count orders per group into a field named orders",
        "Sort the groups by count, descending",
      ],
      hints: [
        { title: "The grouping stage", body: "$group needs an _id to group by. Use the status field." },
        { title: "Counting", body: "Inside $group, add orders: { $sum: 1 } to tally documents per group." },
        { title: "Order of output", body: "Group output is unordered. A $sort after $group makes the result deterministic." },
      ],
      objectives: ["Group with $group + _id", "Use $sum: 1 as a counter", "Sort grouped output deterministically"],
      realWorldUses: ["Funnel analysis", "State distribution dashboards"],
      restrictions: ["Do not filter by status — every status must appear."],
    }
  ),
  makeMission(
    "m05",
    "Big Spenders: Top 10 by Total",
    "easy",
    8,
    ["filtering", "analytics"],
    {
      description:
        "Find the 10 most expensive orders in the system. Combine a value filter with a descending sort and a limit.",
      scenario:
        "The finance team wants the ten highest-ticket orders above $250 to review for fraud. They want orderNumber, the customer, and the total.",
      collections: ["orders"],
      operators: ["$match", "$sort", "$limit", "$project"],
      allowedStages: ["$match", "$sort", "$limit", "$project"],
      requirements: [
        "Only orders with total >= 250",
        "Sort by total descending",
        "Return the top 10",
        "Output fields: orderNumber, userId, total",
        "Hide _id",
      ],
      hints: [
        { title: "Filter first", body: "Use $match with { total: { $gte: 250 } } as the opening stage." },
        { title: "The top-N pattern", body: "$sort then $limit is the classic way to get top N — the order of these two matters." },
        { title: "Clean output", body: "Finish with a $project that drops _id and keeps only the three required fields." },
      ],
      objectives: ["Combine $match, $sort, $limit", "Understand sort-then-limit ordering", "Project a tidy result"],
      realWorldUses: ["Fraud flags on high-value orders", "'Best sellers' widgets"],
      restrictions: ["Exactly 10 documents must come back."],
    }
  ),
  makeMission(
    "m06",
    "Multi-Condition: Delivery Filter",
    "medium",
    10,
    ["filtering"],
    {
      description:
        "Filter orders using several conditions at once: delivered, at least 3 items, and paid by card or PayPal. Learn how conditions combine inside one $match.",
      scenario:
        "The logistics team wants to study multi-item orders paid electronically that were successfully delivered.",
      collections: ["orders"],
      operators: ["$match", "$sort", "$limit", "$project"],
      allowedStages: ["$match", "$sort", "$limit", "$project"],
      requirements: [
        "status equals 'delivered'",
        "itemsCount is >= 3",
        "paymentMethod is 'card' OR 'paypal'",
        "Sort by total descending, return top 10",
        "Output: orderNumber, itemsCount, total",
      ],
      hints: [
        { title: "All in one $match", body: "Separate conditions in a single $match document act as logical AND." },
        { title: "Arrays of options", body: "Use { $in: ['card', 'paypal'] } for 'one of these values'." },
        { title: "Greater or equal", body: "{ $gte: 3 } keeps orders with 3 or more items." },
      ],
      objectives: ["Combine equality, range and $in operators", "Read implicit AND semantics"],
      realWorldUses: ["Promotional campaign targeting", "Fraud scoring rule engines"],
      restrictions: ["Exactly 10 documents."],
    }
  ),
  makeMission(
    "m07",
    "Product Catalogue: Count by Category",
    "medium",
    10,
    ["grouping"],
    {
      description:
        "Count how many products live in each category and return the five biggest categories. You will group by a foreign key — a skill you will reuse constantly.",
      scenario:
        "The merchandising team wants to know which categories carry the most products so they can prioritise restocking.",
      collections: ["products"],
      operators: ["$group", "$sort", "$limit"],
      allowedStages: ["$group", "$sort", "$limit"],
      requirements: [
        "Group products by their categoryId",
        "Count the products in each group into a field named count",
        "Sort by count descending",
        "Return only the top 5 categories",
      ],
      hints: [
        { title: "Group key", body: "$group with _id set to the categoryId field groups products per category." },
        { title: "Count them", body: "count: { $sum: 1 } inside the same $group." },
        { title: "Top five", body: "A descending $sort followed by $limit 5." },
      ],
      objectives: ["Group by a foreign key", "Rank groups with sort + limit"],
      realWorldUses: ["Catalogue analytics", "Inventory planning"],
      restrictions: ["The _id of each group must be the categoryId."],
    }
  ),
  makeMission(
    "m08",
    "Group Aggregates: Order Statistics",
    "medium",
    12,
    ["grouping", "statistics"],
    {
      description:
        "For every order status, compute how many orders, plus the average, minimum and maximum order total. Your first multi-accumulator $group.",
      scenario:
        "A data analyst wants one row per status with the full distribution: volume, average ticket, cheapest and most expensive order.",
      collections: ["orders"],
      operators: ["$group", "$sort"],
      allowedStages: ["$group", "$sort", "$project"],
      requirements: [
        "Group by status",
        "Compute count (orders per status)",
        "Compute avgTotal with $avg",
        "Compute minTotal and maxTotal",
        "Sort alphabetically by status",
      ],
      hints: [
        { title: "One $group, many accumulators", body: "List count, avgTotal, minTotal, maxTotal as siblings inside the same $group." },
        { title: "Average", body: "$avg: '$total' works directly on the numeric field." },
        { title: "Deterministic order", body: "$sort on _id ascending gives A→Z status order." },
      ],
      objectives: ["Use $avg, $min, $max, $sum together", "Produce one row per category"],
      realWorldUses: ["Tickets by priority", "Sales statistics by region"],
      restrictions: ["Four groups expected — one per status."],
    }
  ),
  makeMission(
    "m09",
    "Monthly Revenue: Time Buckets",
    "medium",
    12,
    ["time-series", "financial"],
    {
      description:
        "Summarise revenue month by month. You will convert the createdAt date into a 'YYYY-MM' string, group by it, and sum the order totals.",
      scenario:
        "The CFO wants a clean monthly revenue chart for the last two and a half years.",
      collections: ["orders"],
      operators: ["$group", "$sort", "$dateToString"],
      allowedStages: ["$group", "$sort", "$project"],
      requirements: [
        "Group orders by the month of createdAt, formatted as YYYY-MM",
        "Sum the total of every order into a field named revenue",
        "Sort chronologically by month (ascending)",
      ],
      hints: [
        { title: "Format the date", body: "Inside the group _id, use { $dateToString: { format: '%Y-%m', date: '$createdAt' } }." },
        { title: "Sum per bucket", body: "revenue: { $sum: '$total' } within the same $group." },
        { title: "Chronological", body: "Sort ascending on the month string — YYYY-MM sorts correctly as text." },
      ],
      objectives: ["Bucketing dates with $dateToString", "Building time-series summaries"],
      realWorldUses: ["Monthly finance reports", "Revenue dashboards", "Subscription MRR"],
      restrictions: ["31 rows expected (Jan 2024 – Jul 2026)."],
    }
  ),
  makeMission(
    "m10",
    "Customers & Orders: First Join",
    "medium",
    12,
    ["joining"],
    {
      description:
        "Join the users collection with orders and compute, per user, how many orders they placed and how much they spent in total.",
      scenario:
        "Marketing wants a per-customer summary (name, email, order count, lifetime spend) for a loyalty campaign — without loading every order into Node.",
      collections: ["users", "orders"],
      operators: ["$lookup", "$project"],
      allowedStages: ["$lookup", "$project", "$sort", "$limit", "$match"],
      requirements: [
        "Join each user with their orders (userId matches _id)",
        "Output name, email, orderCount, totalSpent",
        "Hide _id",
        "Return all 220 users",
      ],
      hints: [
        { title: "The join stage", body: "$lookup needs from, localField, foreignField and as. localField is the users._id, foreignField is orders.userId." },
        { title: "Size of the array", body: "{$size: '$orders'} counts the joined documents." },
        { title: "Summing an array", body: "{$sum: '$orders.total'} reduces the joined totals into one number." },
      ],
      objectives: ["Perform a left outer join with $lookup", "Reduce a joined array with $size and $sum"],
      realWorldUses: ["Customer 360 views", "Denormalising for dashboards"],
      restrictions: ["Users with zero orders must still appear."],
      expectExactOrder: false,
    }
  ),
  makeMission(
    "m11",
    "Top Customers: The $lookup + $group Combo",
    "medium",
    15,
    ["joining", "sales"],
    {
      description:
        "Find the top 5 customers by total purchase amount. This is the aggregation-pipeline classic: group, sort, limit, then join for names.",
      scenario:
        "The sales director wants a plaque for the five customers who have spent the most money in the store.",
      collections: ["orders", "users"],
      operators: ["$group", "$sort", "$limit", "$lookup", "$unwind", "$project"],
      allowedStages: ["$group", "$sort", "$limit", "$lookup", "$unwind", "$project"],
      requirements: [
        "Group orders by customer (userId)",
        "Total spend per customer into totalSpend, plus an order count",
        "Sort by totalSpend descending",
        "Keep only the top 5",
        "Join users to bring back name and email",
        "Hide the userId and every internal id",
      ],
      hints: [
        { title: "Aggregate first", body: "Group by userId and sum the totals before touching the users collection — 5 rows beat 520 for a join." },
        { title: "Top five", body: "Sort descending by totalSpend then $limit 5." },
        { title: "Now enrich", body: "$lookup users on the group key _id, $unwind the one match, then $project the display fields." },
        { title: "Clean output", body: "Map _id: 0, name: '$user.name', email: '$user.email', keep totalSpend and orders." },
      ],
      objectives: ["Combine $group → $sort → $limit → $lookup", "Reshape joined output with $unwind + $project", "Hide internal identifiers"],
      realWorldUses: ["Leaderboards", "Top-5 accounts by revenue", "Best-customer lists"],
      restrictions: ["Exactly 5 documents.", "No internal ids may leak into the output."],
    }
  ),
  makeMission(
    "m12",
    "Unwind: Order Line Items",
    "medium",
    12,
    ["arrays", "ecommerce"],
    {
      description:
        "Deconstruct the items array on delivered orders so each order line becomes its own document, then rank line items by their value.",
      scenario:
        "The analytics team needs a flat table of every sold line item to feed into a BI tool. Each row = one product line from one delivered order.",
      collections: ["orders"],
      operators: ["$match", "$unwind", "$project", "$sort", "$limit"],
      allowedStages: ["$match", "$unwind", "$project", "$sort", "$limit"],
      requirements: [
        "Only delivered orders",
        "Flatten the items array with $unwind",
        "Compute lineTotal = qty * price",
        "Sort by lineTotal descending",
        "Return top 10 line items",
        "Output: orderNumber, productId, name, qty, price, lineTotal",
      ],
      hints: [
        { title: "One document per element", body: "$unwind '$items' turns one order with N items into N documents." },
        { title: "Read nested fields", body: "After unwinding, items.qty and items.price are accessible on the document directly." },
        { title: "Multiply", body: "lineTotal: { $multiply: ['$items.qty', '$items.price'] }." },
      ],
      objectives: ["Use $unwind to flatten arrays", "Project nested fields after unwind", "Understand row explosion"],
      realWorldUses: ["Line-item analytics", "Log event flattening", "Feeding star schemas"],
      restrictions: ["One row per line item, not per order."],
    }
  ),
  makeMission(
    "m13",
    "Genre Popularity: Unwind + Group",
    "easy",
    10,
    ["arrays", "streaming"],
    {
      description:
        "A movie can have several genres. Unwind the genres array, then count how many movies fall into each genre.",
      scenario:
        "The streaming team wants a genre bar chart computed from the raw movies collection.",
      collections: ["movies"],
      operators: ["$unwind", "$group", "$sort"],
      allowedStages: ["$unwind", "$group", "$sort"],
      requirements: [
        "Unwind the genres array",
        "Group by genre",
        "Count movies per genre",
        "Sort by count descending",
      ],
      hints: [
        { title: "Flatten first", body: "$unwind '$genres' creates one document per movie/genre pair." },
        { title: "Then group", body: "Group by the unwound genre value and $sum: 1." },
        { title: "Rank them", body: "Descending $sort on the count." },
      ],
      objectives: ["Combine $unwind with $group", "Count categorical values"],
      realWorldUses: ["Content categorisation", "Tag frequency analysis"],
      restrictions: ["No $limit — every genre must be counted."],
    }
  ),
  makeMission(
    "m14",
    "Actor Filmography: Join Through an Array",
    "hard",
    20,
    ["arrays", "joining", "streaming"],
    {
      description:
        "Each movie references its cast via an actorIds array. Reverse the relationship: for every actor, count how many movies they starred in and their average rating.",
      scenario:
        "Casting directors want a ranking of the most prolific actors in the catalogue, with average film rating as a tiebreaker.",
      collections: ["actors", "movies"],
      operators: ["$lookup", "$match", "$unwind", "$group", "$sort", "$limit"],
      allowedStages: ["$lookup", "$match", "$unwind", "$group", "$sort", "$limit", "$project"],
      requirements: [
        "Join actors to movies where actorIds contains the actor's _id",
        "Drop actors with no movies BEFORE unwinding",
        "Unwind the joined movies",
        "Group by actor name: count movies, average their rating",
        "Sort by movie count descending",
        "Return the top 10 actors",
      ],
      hints: [
        { title: "Join into the array", body: "$lookup with localField '_id', foreignField 'actorIds'. The engine matches membership automatically." },
        { title: "Trim before unwind", body: "A $match { movies: { $ne: [] } } removes actors with no films so the unwind does not erase them." },
        { title: "Average across films", body: "avgRating: { $avg: '$movies.rating' } inside the group." },
      ],
      objectives: ["Look up through an array field", "Filter before $unwind", "Group with $avg over joined docs"],
      realWorldUses: ["Content graph queries", "Cast analytics", "Recommendation signals"],
      restrictions: ["Ten rows exactly."],
    }
  ),
  makeMission(
    "m15",
    "Nested Arrays: Student Enrolments",
    "hard",
    25,
    ["nested-arrays", "joining", "education"],
    {
      description:
        "Students reference the courses they take through an array of courseIds. Expand every enrolment into a row that also names the course and its teacher. Two chained lookups through arrays.",
      scenario:
        "The registrar wants a flat register of every enrolment: student name, course title, teacher name, major and GPA — 50 rows are enough.",
      collections: ["students", "courses", "teachers"],
      operators: ["$lookup", "$unwind", "$project", "$sort", "$limit"],
      allowedStages: ["$lookup", "$unwind", "$project", "$sort", "$limit"],
      requirements: [
        "Join courses where the course _id is inside student.courseIds",
        "Unwind the joined courses — one row per enrolment",
        "Second lookup: resolve courses.teacherId to a teacher",
        "Output: student (name), course (title), teacher (name), major, gpa",
        "Sort by student then course, both ascending",
        "Return only the first 50 rows",
      ],
      hints: [
        { title: "Array join first", body: "$lookup from courses, localField 'courseIds', foreignField '_id'. Membership in an array is matched automatically." },
        { title: "Then flatten", body: "$unwind '$courses' turns each enrolment into its own document." },
        { title: "Resolve the teacher", body: "Second $lookup on courses.teacherId — the field lives one level deep now." },
        { title: "Two-key sort", body: "$sort { student: 1, course: 1 } orders by the first key, then the second." },
      ],
      objectives: ["Chain lookups through nested arrays", "Sort on multiple keys", "Project aliased nested fields"],
      realWorldUses: ["Enrolment registers", "Order-item-warehouse joins", "Multi-level denormalisation"],
      restrictions: ["Exactly 50 rows (use $limit 50)."],
    }
  ),

  // -------------------------------------------------------------------------
  // LEVEL 2 — Analytics
  // -------------------------------------------------------------------------

  makeMission(
    "m16",
    "Amazon-Style: Revenue by Category",
    "hard",
    20,
    ["sales", "ecommerce", "joining", "analytics"],
    {
      description:
        "Compute total revenue per product category. You must join orders → products → categories through the nested items array.",
      scenario:
        "The e-commerce company wants a category revenue ranking for their quarterly board review.",
      collections: ["orders", "products", "categories"],
      operators: ["$match", "$unwind", "$lookup", "$group", "$sort"],
      allowedStages: ["$match", "$unwind", "$lookup", "$group", "$sort", "$project"],
      requirements: [
        "Only delivered orders",
        "Unwind items",
        "Resolve each item to its product, then to its category",
        "Group by category name and sum revenue (qty * price)",
        "Sort by revenue descending",
      ],
      hints: [
        { title: "Chain the joins", body: "items.productId → products._id, then products.categoryId → categories._id. Each join needs its own $unwind." },
        { title: "Revenue per line", body: "Inside $group: revenue: { $sum: { $multiply: ['$items.qty', '$items.price'] } }." },
        { title: "Group by the name", body: "Group on '$category.name', not the internal id, so the output is human-readable." },
      ],
      objectives: ["Multi-hop joins through arrays", "Sum nested computed expressions", "Produce a business-ready ranking"],
      realWorldUses: ["Category P&L reports", "Channel revenue analysis"],
      restrictions: ["12 rows — one per category."],
    }
  ),
  makeMission(
    "m17",
    "HR Analytics: Average Salary by Department",
    "hard",
    20,
    ["joining", "statistics", "analytics"],
    {
      description:
        "For every department, compute the headcount and the average salary of active employees.",
      scenario:
        "HR wants to spot salary discrepancies across departments in the companies dataset.",
      collections: ["employees", "departments"],
      operators: ["$match", "$lookup", "$unwind", "$group", "$sort"],
      allowedStages: ["$match", "$lookup", "$unwind", "$group", "$sort", "$project"],
      requirements: [
        "Only active employees",
        "Join departments by departmentId",
        "Group by department name",
        "Count employees and average their salary",
        "Sort by average salary descending",
      ],
      hints: [
        { title: "Filter before join", body: "$match { status: 'active' } first — cheaper than joining 460 rows." },
        { title: "Join and flatten", body: "$lookup then $unwind '$department'." },
        { title: "Averages", body: "avgSalary: { $avg: '$salary' } and employees: { $sum: 1 }." },
      ],
      objectives: ["Filter → join → group ordering", "Compute per-group averages"],
      realWorldUses: ["Compensation benchmarking", "Cost-centre reporting"],
      restrictions: ["One row per department."],
    }
  ),
  makeMission(
    "m18",
    "Banking: Biggest Withdrawal Merchants",
    "medium",
    12,
    ["banking", "financial", "analytics"],
    {
      description:
        "Find the ten merchants where customers have withdrawn the most money.",
      scenario:
        "A bank wants to understand where cash is leaving accounts so it can propose rewards or limits.",
      collections: ["transactions"],
      operators: ["$match", "$group", "$sort", "$limit", "$project"],
      allowedStages: ["$match", "$group", "$sort", "$limit", "$project"],
      requirements: [
        "Only settled withdrawals",
        "Group by merchant",
        "Sum the withdrawn amounts into totalWithdrawn",
        "Also count withdrawals per merchant",
        "Sort descending and keep the top 10",
      ],
      hints: [
        { title: "Tight filter", body: "$match { type: 'withdraw', status: 'settled' }." },
        { title: "Sum and count", body: "totalWithdrawn: { $sum: '$amount' }, count: { $sum: 1 }." },
        { title: "Rank", body: "Sort by totalWithdrawn descending, $limit 10." },
      ],
      objectives: ["Financial filtering", "Aggregate with two accumulators and rank"],
      realWorldUses: ["Cash-flow monitoring", "Merchant risk scoring"],
      restrictions: ["Exactly 10 merchants."],
    }
  ),
  makeMission(
    "m19",
    "Book Bestsellers: Authors Join",
    "medium",
    12,
    ["joining", "analytics"],
    {
      description:
        "Rank the ten best-selling books and enrich each with its author's name.",
      scenario:
        "A publisher wants a bestseller poster: title, author, sales, rating and price for the top ten books.",
      collections: ["books", "authors"],
      operators: ["$sort", "$limit", "$lookup", "$unwind", "$project"],
      allowedStages: ["$sort", "$limit", "$lookup", "$unwind", "$project"],
      requirements: [
        "Sort books by sales descending",
        "Take the top 10",
        "Join the author for each book",
        "Output: title, author, sales, rating, price",
        "Hide all ids",
      ],
      hints: [
        { title: "Sort then limit", body: "Top-N must always sort before limiting, or you keep the wrong ten." },
        { title: "Join after shrinking", body: "Only 10 lookups run — far cheaper than joining 320 books." },
        { title: "Alias the field", body: "author: '$author.name' in $project." },
      ],
      objectives: ["Optimise joins by shrinking first", "Alias joined fields in $project"],
      realWorldUses: ["Bestseller lists", "Enriching ranked rows"],
      restrictions: ["Ten rows."],
    }
  ),
  makeMission(
    "m20",
    "Social Engagement: Counts via Sub-Pipelines",
    "hard",
    20,
    ["social", "joining", "analytics"],
    {
      description:
        "Rank posts by engagement where engagement = likes + 2 × comments. Counts come from $lookup sub-pipelines using let and $expr.",
      scenario:
        "The social platform's growth team wants the top posts by weighted engagement to feature in a newsletter.",
      collections: ["posts", "likes", "comments"],
      operators: ["$lookup", "$expr", "$addFields", "$sort", "$limit", "$project"],
      allowedStages: ["$lookup", "$addFields", "$sort", "$limit", "$project"],
      requirements: [
        "For each post, count its likes and comments",
        "Use $lookup with let + pipeline + $expr (no field-equality shortcut)",
        "Compute engagement = likes + (2 * comments)",
        "Sort by engagement descending",
        "Return top 10 with content, likes, comments, engagement",
      ],
      hints: [
        { title: "Sub-pipeline lookup", body: "Inside $lookup: let: { postId: '$postId' }, pipeline: [{ $match: { $expr: { $eq: ['$postId', '$$postId'] } } }, { $count: 'likes' }]." },
        { title: "Defensive default", body: "Posts with zero likes produce an empty array — wrap with { $ifNull: [{ $first: '$likes.likes' }, 0] }." },
        { title: "Weighted score", body: "engagement: { $add: ['$likes', { $multiply: ['$comments', 2] }] }." },
      ],
      objectives: ["Write $lookup sub-pipelines with $expr", "Handle empty lookups with $ifNull", "Compute weighted scores"],
      realWorldUses: ["Engagement ranking", "Anti-spam scoring", "Trend detection"],
      restrictions: ["Exactly 10 posts.", "$lookup must use the let/pipeline form."],
    }
  ),
  makeMission(
    "m21",
    "Hospital Analytics: Cost by Facility",
    "medium",
    12,
    ["healthcare", "joining", "analytics"],
    {
      description:
        "Rank hospitals by the average cost of their completed appointments.",
      scenario:
        "A health authority wants to compare facility costs and appointment volumes for budgeting.",
      collections: ["appointments", "hospitals"],
      operators: ["$match", "$lookup", "$unwind", "$group", "$sort"],
      allowedStages: ["$match", "$lookup", "$unwind", "$group", "$sort", "$project"],
      requirements: [
        "Only completed appointments",
        "Join hospitals by hospitalId",
        "Group by hospital name",
        "Count appointments and average their cost",
        "Sort by average cost descending",
      ],
      hints: [
        { title: "Status gate", body: "$match { status: 'completed' } narrows 520 appointments." },
        { title: "Enrich", body: "$lookup then $unwind '$hospital'." },
        { title: "Group", body: "appointments: { $sum: 1 }, avgCost: { $avg: '$cost' }." },
      ],
      objectives: ["Healthcare data modelling", "Per-entity cost aggregation"],
      realWorldUses: ["Facility cost benchmarking", "Regional health analytics"],
      restrictions: ["One row per hospital."],
    }
  ),
  makeMission(
    "m22",
    "Customer 360: Multi-Source Profile",
    "hard",
    25,
    ["joining", "analytics", "dashboard"],
    {
      description:
        "Build a 360° customer profile: order count, lifetime spend, average order value and review count — from three collections in one pipeline.",
      scenario:
        "The CRM team wants the ten most valuable customers enriched with their behaviour across orders and reviews.",
      collections: ["users", "orders", "reviews"],
      operators: ["$lookup", "$expr", "$addFields", "$sort", "$limit", "$project"],
      allowedStages: ["$lookup", "$addFields", "$sort", "$limit", "$project"],
      requirements: [
        "Join each user's order totals (sub-pipeline $lookup)",
        "Join each user's review count (sub-pipeline $lookup)",
        "Compute orders, totalSpent, avgOrder, reviews",
        "Sort by totalSpent descending",
        "Top 10 users, all ids hidden",
      ],
      hints: [
        { title: "Reuse the pattern", body: "Two sub-pipeline lookups keyed on the user _id, one returning totals, the other a count." },
        { title: "Average order value", body: "avgOrder: { $cond: [{ $gt: ['$orders', 0] }, { $divide: ['$totalSpent', '$orders'] }, 0] } guards against divide-by-zero." },
        { title: "Flatten counts", body: "reviews: { $ifNull: [{ $first: '$reviews.reviews' }, 0] }." },
      ],
      objectives: ["Compose multi-source profiles", "Guard division by zero", "Merge computed metrics"],
      realWorldUses: ["CRM scoring", "Customer lifetime value", "Segment building"],
      restrictions: ["Exactly 10 rows."],
    }
  ),
  makeMission(
    "m23",
    "Review Profiles: Products People Rate",
    "medium",
    15,
    ["joining", "analytics", "search"],
    {
      description:
        "Find the products with the most verified social proof: at least 5 reviews, ranked by review count, with the average rating from those reviews.",
      scenario:
        "The commerce team wants to highlight 'community-approved' products with a solid review count.",
      collections: ["products", "reviews"],
      operators: ["$lookup", "$expr", "$addFields", "$sort", "$limit", "$project"],
      allowedStages: ["$lookup", "$addFields", "$sort", "$limit", "$project", "$match"],
      requirements: [
        "Join reviews by productId",
        "Keep only products with 5 or more reviews (use $expr + $size)",
        "Compute avgRating from the joined reviews",
        "Sort by reviewCount descending",
        "Top 10: name, avgRating, reviewCount",
      ],
      hints: [
        { title: "Match on the join result", body: "A $match cannot see the lookup array unless you use $expr: { $gte: [{ $size: '$reviews' }, 5] }." },
        { title: "Average the array", body: "avgRating: { $avg: '$reviews.rating' } averages the flattened values." },
      ],
      objectives: ["$expr with $size after a lookup", "Averaging array elements"],
      realWorldUses: ["Review aggregation", "Quality-gated rankings"],
      restrictions: ["Ten rows."],
    }
  ),

  // -------------------------------------------------------------------------
  // LEVEL 3 — Expert
  // -------------------------------------------------------------------------

  makeMission(
    "m24",
    "Running Revenue: $setWindowFields",
    "expert",
    25,
    ["window", "financial", "time-series"],
    {
      description:
        "Build the monthly revenue curve AND the cumulative running total in a single pipeline using a window function.",
      scenario:
        "The CFO wants to see not just each month's revenue, but the cumulative curve across 2024→2026 for investor slides.",
      collections: ["orders"],
      operators: ["$group", "$sort", "$setWindowFields", "$project"],
      allowedStages: ["$group", "$sort", "$setWindowFields", "$project"],
      requirements: [
        "Group by month (YYYY-MM) and sum revenue",
        "Sort months ascending",
        "Use $setWindowFields to add cumulativeRevenue (sum over unbounded→current)",
        "Output: month, revenue, cumulativeRevenue",
      ],
      hints: [
        { title: "Prepare the frame", body: "Group to one row per month and sort ascending — window functions follow sort order." },
        { title: "The window stage", body: "$setWindowFields with sortBy { _id: 1 } and output cumulativeRevenue: { $sum: '$revenue' } — the default frame is unbounded → current." },
        { title: "Final shape", body: "Project month from the _id, keep revenue and cumulativeRevenue." },
      ],
      objectives: ["Understand window frames", "Compute running totals", "Distinguish window functions from $group"],
      realWorldUses: ["Cumulative sales curves", "Cohort retention", "Moving averages"],
      restrictions: ["31 rows. The last cumulativeRevenue must equal total company revenue."],
    }
  ),
  makeMission(
    "m25",
    "Top 3 Per Year: Window Ranks",
    "expert",
    25,
    ["window", "streaming", "analytics"],
    {
      description:
        "Rank movies within each year by rating using $setWindowFields, then keep only the top 3 of every year. This is the 'rank within group' superpower.",
      scenario:
        "A film site wants the top-3 rated movies for every year, so users can browse 'best of' lists.",
      collections: ["movies"],
      operators: ["$match", "$setWindowFields", "$sort", "$project"],
      allowedStages: ["$match", "$setWindowFields", "$sort", "$project"],
      requirements: [
        "Only movies with votes >= 5000",
        "Rank by rating descending, partitioned by year",
        "Keep only rank <= 3",
        "Sort by year then rank",
        "Output: title, year, rating, votes, rank",
      ],
      hints: [
        { title: "Partition", body: "$setWindowFields partitionBy '$year' splits the data into one window per year." },
        { title: "Rank, not count", body: "output rank: { $rank: {} } assigns 1 to the best-rated movie in each partition." },
        { title: "Filter ranks", body: "A $match { rank: { $lte: 3 } } after the window stage trims to the podium." },
      ],
      objectives: ["Partition with partitionBy", "Use $rank within groups", "Filter on computed window fields"],
      realWorldUses: ["'Top N per group' dashboards", "Ranked leaderboards", "Podium charts"],
      restrictions: ["~100 rows expected (top 3 of most years)."],
    }
  ),
  makeMission(
    "m26",
    "One Pass, Many Answers: $facet",
    "expert",
    25,
    ["facet", "dashboard", "analytics"],
    {
      description:
        "Run three independent aggregations over the orders collection in a single $facet stage: total revenue, per-status counts and per-payment counts.",
      scenario:
        "The ops dashboard needs three widgets, and running three separate queries would triple the load. $facet answers them all in one scan.",
      collections: ["orders"],
      operators: ["$facet"],
      allowedStages: ["$facet"],
      requirements: [
        "Facet A: totalRevenue — one doc with the sum of all totals",
        "Facet B: ordersByStatus — count per status, sorted by count descending",
        "Facet C: ordersByPayment — count per payment method, sorted descending",
      ],
      hints: [
        { title: "Shape", body: "$facet takes an object: each key is an output field, each value is a sub-pipeline." },
        { title: "Sub-pipelines", body: "Each sub-pipeline receives the full 520 orders and runs independently." },
        { title: "Inside the facets", body: "Use $group + $project / $group + $sort exactly as you would at the top level." },
      ],
      objectives: ["Compose $facet with independent sub-pipelines", "Produce a single multi-section document"],
      realWorldUses: ["Dashboard widgets", "Parallelised analytics", "Multi-metric snapshots"],
      restrictions: ["Exactly ONE output document with three fields."],
    }
  ),
  makeMission(
    "m27",
    "Follower Reach: $graphLookup",
    "expert",
    30,
    ["graph", "social", "analytics"],
    {
      description:
        "Compute how many users each user can reach within two hops in the follower graph, then rank the five most influential users.",
      scenario:
        "The platform wants to find natural influencers: users whose network (followers, and followers of followers) is largest.",
      collections: ["users", "followers"],
      operators: ["$graphLookup", "$addFields", "$sort", "$limit", "$project"],
      allowedStages: ["$graphLookup", "$addFields", "$sort", "$limit", "$project"],
      requirements: [
        "Graph-walk the followers collection starting from each user's _id",
        "Traverse followsId → userId up to a depth of 2",
        "Count the reachable users per user",
        "Sort by reach descending (ties by name ascending)",
        "Top 5 users with name and reach",
      ],
      hints: [
        { title: "The recursion", body: "$graphLookup needs from, startWith, connectFromField ('followsId'), connectToField ('userId') and as." },
        { title: "Cap the depth", body: "maxDepth: 2 stops the walk at friends-of-friends." },
        { title: "Measure it", body: "reach: { $size: '$reach' } counts distinct reachable users." },
      ],
      objectives: ["Model a graph traversal", "Rank nodes by reach", "Understand BFS semantics"],
      realWorldUses: ["Influencer detection", "Fraud rings", "Org charts", "Social reach"],
      restrictions: ["Five rows. Sort ties by name so the result is deterministic."],
    }
  ),

  // -------------------------------------------------------------------------
  // LEVEL 4 — Mastery
  // -------------------------------------------------------------------------

  makeMission(
    "m28",
    "BOSS: Top 3 Products Per Category",
    "boss",
    45,
    ["analytics", "sales", "joining", "arrays", "window", "dashboard"],
    {
      description:
        "The final boss. For every product category, find the three highest-revenue products. Everything you have learned is required: match, unwind, double lookup, group, window ranking, filter and sort.",
      scenario:
        "The chief data officer wants a 'category champions' report — the podium of products within each category — to drive merchandising decisions.",
      collections: ["orders", "products", "categories"],
      operators: ["$match", "$unwind", "$lookup", "$group", "$setWindowFields", "$sort", "$limit", "$project"],
      allowedStages: ["$match", "$unwind", "$lookup", "$group", "$setWindowFields", "$sort", "$limit", "$project"],
      requirements: [
        "Only delivered orders",
        "Unwind items and resolve product + category via lookups",
        "Group by category + product and sum revenue",
        "Rank products within each category by revenue (window)",
        "Keep only rank <= 3",
        "Sort by category then rank",
        "Output: category, product, revenue, rank",
      ],
      hints: [
        { title: "Compose the foundation", body: "match → unwind → lookup product → unwind → lookup category → unwind." },
        { title: "Group smart", body: "Group _id = { categoryId, productId }; carry category and product names with $first." },
        { title: "Podium ranks", body: "$setWindowFields partitionBy '_id.categoryId', sortBy revenue desc, rank. Then $match rank <= 3." },
        { title: "Deterministic order", body: "Final $sort on category id then rank — clean and reproducible." },
      ],
      objectives: [
        "Chain every major pipeline concept end-to-end",
        "Design a performant multi-join aggregation",
        "Produce a production-grade 'top N per group' report",
      ],
      realWorldUses: ["Merchandising podiums", "SKU-level performance", "Executive dashboards"],
      restrictions: ["~36 rows (3 per category).", "No write stages, no $group skipping the window."],
    }
  ),
];

// ---------------------------------------------------------------------------
// Levels & Chapters
// ---------------------------------------------------------------------------

const byId = (ids: string[]) => MISSIONS.filter((m) => ids.includes(m.id));

export const LEVELS: Level[] = [
  {
    id: "l1",
    title: "The Pipeline",
    subtitle: "Foundations of aggregation",
    icon: "database",
    color: "#7d8cf5",
    description:
      "Learn every foundational stage — $project, $match, $group, $sort, $limit, $lookup and $unwind — by solving problems on a realistic e-commerce dataset.",
    chapters: [
      { id: "l1c1", title: "Introduction", description: "Your first two pipelines: shaping and counting.", missionIds: ["m01", "m02"] },
      { id: "l1c2", title: "Stage Order", description: "Why the sequence of stages changes results and speed.", missionIds: ["m03", "m04"] },
      { id: "l1c3", title: "Filtering", description: "Reduce the working set with $match and condition operators.", missionIds: ["m05", "m06"] },
      { id: "l1c4", title: "Grouping", description: "Summarise rows with $group accumulators.", missionIds: ["m07", "m08", "m09"] },
      { id: "l1c5", title: "Joining Collections", description: "Bring collections together with $lookup.", missionIds: ["m10", "m11"] },
      { id: "l1c6", title: "Array Operators", description: "Flatten and reshape arrays with $unwind.", missionIds: ["m12", "m13"] },
      { id: "l1c7", title: "Nested Arrays", description: "Lookups through array fields and multi-level joins.", missionIds: ["m14", "m15"] },
    ],
  },
  {
    id: "l2",
    title: "Analytics",
    subtitle: "Real-world pipelines",
    icon: "trending-up",
    color: "#5ec99a",
    description:
      "Build the pipelines real products ship: revenue by category, HR statistics, banking reports and engagement scores across interconnected collections.",
    chapters: [
      { id: "l2c1", title: "Real Projects", description: "Authentic analytics tasks on sales, HR, finance, books and social data.", missionIds: ["m16", "m17", "m18", "m19", "m20", "m21"] },
      { id: "l2c2", title: "Advanced Pipelines", description: "Multi-source profiles and review intelligence.", missionIds: ["m22", "m23"] },
    ],
  },
  {
    id: "l3",
    title: "Expert",
    subtitle: "Window, facet & graph",
    icon: "sparkles",
    color: "#a78bfa",
    description:
      "Unlock the advanced stages: rolling windows with $setWindowFields, parallel sub-pipelines with $facet, and recursive traversal with $graphLookup.",
    chapters: [
      { id: "l3c1", title: "Window Functions", description: "Running totals, ranks and partitions.", missionIds: ["m24", "m25"] },
      { id: "l3c2", title: "Facets", description: "Many dashboards from one scan.", missionIds: ["m26"] },
      { id: "l3c3", title: "Graph Lookup", description: "Traverse relationships recursively.", missionIds: ["m27"] },
    ],
  },
  {
    id: "l4",
    title: "Mastery",
    subtitle: "The boss fight",
    icon: "trophy",
    color: "#e3b35c",
    description:
      "One enormous pipeline that combines every technique. If you can build this, you can build production aggregations.",
    chapters: [
      { id: "l4c1", title: "Capstone", description: "The top-3-per-category end boss.", missionIds: ["m28"] },
    ],
  },
];

// ---------------------------------------------------------------------------
// Achievements
// ---------------------------------------------------------------------------

export const ACHIEVEMENTS: Achievement[] = [
  { id: "first-step", title: "First Step", description: "Complete your first mission.", icon: "footprints", checkId: "completed-ge-1" },
  { id: "matcher", title: "First Match", description: "Complete a mission that uses $match.", icon: "filter", checkId: "used-match" },
  { id: "projection-ninja", title: "Projection Ninja", description: "Complete 5 missions using $project.", icon: "scissors", checkId: "used-project-ge-5" },
  { id: "group-master", title: "Group Master", description: "Complete 5 missions using $group.", icon: "layers", checkId: "used-group-ge-5" },
  { id: "lookup-wizard", title: "Lookup Wizard", description: "Complete 3 missions using $lookup.", icon: "git-merge", checkId: "used-lookup-ge-3" },
  { id: "unwind-expert", title: "Unwind Expert", description: "Complete 2 missions using $unwind.", icon: "unfold-vertical", checkId: "used-unwind-ge-2" },
  { id: "window-wizard", title: "Window Wizard", description: "Complete both window-function missions.", icon: "line-chart", checkId: "window-done" },
  { id: "facet-hero", title: "Facet Hero", description: "Solve the $facet mission.", icon: "layout-grid", checkId: "facet-done" },
  { id: "graph-explorer", title: "Graph Explorer", description: "Solve the $graphLookup mission.", icon: "share-2", checkId: "graph-done" },
  { id: "pipeline-architect", title: "Pipeline Architect", description: "Complete every non-boss mission.", icon: "git-branch", checkId: "non-boss-done" },
  { id: "aggregation-god", title: "Aggregation God", description: "Complete ALL missions, including the boss.", icon: "crown", checkId: "all-done" },
  { id: "centurion", title: "Centurion", description: "Earn 1,000 total XP.", icon: "zap", checkId: "xp-1000" },
  { id: "streak-3", title: "On Fire", description: "Keep a 3-day daily-challenge streak.", icon: "flame", checkId: "streak-3" },
];

// ---------------------------------------------------------------------------
// Daily challenge pool
// ---------------------------------------------------------------------------

export const DAILY_POOL: string[] = ["m01", "m02", "m03", "m05", "m06", "m07", "m09", "m10", "m13", "m18", "m19"];

export const ALL_MISSIONS = MISSIONS;
export const MISSION_MAP: Record<string, Mission> = Object.fromEntries(MISSIONS.map((m) => [m.id, m]));
export const LEVEL_MISSION_IDS = byId(LEVELS.flatMap((l) => l.chapters.flatMap((c) => c.missionIds))).map((m) => m.id);
