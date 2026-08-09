# Level Briefs

# Level 1 — The Pipeline

## Introduction - 1 — Warm Up: Shape the Orders

**Description**
Introduce yourself to the pipeline. Take every order in the `orders` collection and reshape each document so it only exposes the four fields listed below.

**Scenario**
Your team wants a lightweight feed of recent orders for a dashboard. Nobody needs the nested items array, tax breakdown or shipping address — just the essentials.

**Requirements**
- Project each order to: orderNumber, userId, status, total
- Exclude _id and every other field
- Return ALL 520 orders (no filtering)

**Objectives**
- Project a document to a subset of fields
- Understand inclusion vs exclusion mode
- See the pipeline return 520 unchanged rows

**Restrictions**
- _id must not appear in the output.
- All 520 orders must be returned.

**Hints**
- **Which stage reshapes fields?** A stage that includes or excludes fields — it is the go-to tool for 'hide internal IDs'.
- **Inclusion vs exclusion** You can either list the four fields you want (inclusion) or explicitly zero out the ones you do not.
- **Keep it simple** One stage is enough. No grouping, no joining, no filtering.

**Common mistakes**
- Returning extra fields the expected output does not include.
- Forgetting to sort before applying $limit, so the 'top N' are wrong.
- Filtering too late, which makes the pipeline slow on real data.

---

## Introduction - 2 — Count It: How Many Products?

**Description**
Return a single document telling us how many products exist in the `products` collection. This is the simplest aggregation you will ever write.

**Scenario**
The inventory team wants a fast, database-side count instead of loading 140 product documents into Node just to call .length.

**Requirements**
- Return exactly one document
- The document must have a field named totalProducts
- Its value must equal the number of documents in products

**Objectives**
- Count documents with $count
- Return a scalar summary document

**Restrictions**
- No $group needed.

**Hints**
- **One stage does it** There is a dedicated stage that replaces the stream with a single count document.
- **Name the field** Pass the output field name as the stage argument, e.g. { $count: 'totalProducts' }.

**Common mistakes**
- Returning extra fields the expected output does not include.
- Forgetting to sort before applying $limit, so the 'top N' are wrong.
- Filtering too late, which makes the pipeline slow on real data.

---

## Stage Order - 1 — Filter First: Delivered Orders

**Description**
Return only orders that have been delivered. You must filter at the very start of the pipeline — before any other work.

**Scenario**
Support needs the list of delivered order numbers and their totals for a fulfillment report. Fetching cancelled and processing orders wastes bandwidth.

**Requirements**
- Only include orders where status equals 'delivered'
- Return exactly two fields per order: orderNumber and total
- _id must be hidden
- Do not sort — the natural order is fine

**Objectives**
- Use $match as the first stage
- Chain $match into $project
- Compare the input vs output counts in the visualizer

**Restrictions**
- $match must be stage #1.

**Hints**
- **Filter early** The very first stage should reduce the 520 orders down to the delivered subset.
- **Exact match** A simple equality on the status field is all the query needs.
- **Then shape** After filtering, reshape with $project to keep only orderNumber and total.

**Common mistakes**
- Returning extra fields the expected output does not include.
- Forgetting to sort before applying $limit, so the 'top N' are wrong.
- Filtering too late, which makes the pipeline slow on real data.

---

## Stage Order - 2 — Order Matters: Status Distribution

**Description**
Group orders by status and count how many orders are in each group. This mission is about the ORDER of stages — why $match before $group changes performance.

**Scenario**
The ops team wants a quick distribution of order statuses to spot fulfilment bottlenecks. Four buckets: delivered, shipped, processing, cancelled.

**Requirements**
- Group by the status field
- Count orders per group into a field named orders
- Sort the groups by count, descending

**Objectives**
- Group with $group + _id
- Use $sum: 1 as a counter
- Sort grouped output deterministically

**Restrictions**
- Do not filter by status — every status must appear.

**Hints**
- **The grouping stage** $group needs an _id to group by. Use the status field.
- **Counting** Inside $group, add orders: { $sum: 1 } to tally documents per group.
- **Order of output** Group output is unordered. A $sort after $group makes the result deterministic.

**Common mistakes**
- Returning extra fields the expected output does not include.
- Forgetting to sort before applying $limit, so the 'top N' are wrong.
- Filtering too late, which makes the pipeline slow on real data.

---

## Filtering - 1 — Big Spenders: Top 10 by Total

**Description**
Find the 10 most expensive orders in the system. Combine a value filter with a descending sort and a limit.

**Scenario**
The finance team wants the ten highest-ticket orders above $250 to review for fraud. They want orderNumber, the customer, and the total.

**Requirements**
- Only orders with total >= 250
- Sort by total descending
- Return the top 10
- Output fields: orderNumber, userId, total
- Hide _id

**Objectives**
- Combine $match, $sort, $limit
- Understand sort-then-limit ordering
- Project a tidy result

**Restrictions**
- Exactly 10 documents must come back.

**Hints**
- **Filter first** Use $match with { total: { $gte: 250 } } as the opening stage.
- **The top-N pattern** $sort then $limit is the classic way to get top N — the order of these two matters.
- **Clean output** Finish with a $project that drops _id and keeps only the three required fields.

**Common mistakes**
- Returning extra fields the expected output does not include.
- Forgetting to sort before applying $limit, so the 'top N' are wrong.
- Filtering too late, which makes the pipeline slow on real data.

---

## Filtering - 2 — Multi-Condition: Delivery Filter

**Description**
Filter orders using several conditions at once: delivered, at least 3 items, and paid by card or PayPal. Learn how conditions combine inside one $match.

**Scenario**
The logistics team wants to study multi-item orders paid electronically that were successfully delivered.

**Requirements**
- status equals 'delivered'
- itemsCount is >= 3
- paymentMethod is 'card' OR 'paypal'
- Sort by total descending, return top 10
- Output: orderNumber, itemsCount, total

**Objectives**
- Combine equality, range and $in operators
- Read implicit AND semantics

**Restrictions**
- Exactly 10 documents.

**Hints**
- **All in one $match** Separate conditions in a single $match document act as logical AND.
- **Arrays of options** Use { $in: ['card', 'paypal'] } for 'one of these values'.
- **Greater or equal** { $gte: 3 } keeps orders with 3 or more items.

**Common mistakes**
- Returning extra fields the expected output does not include.
- Forgetting to sort before applying $limit, so the 'top N' are wrong.
- Filtering too late, which makes the pipeline slow on real data.

---

## Grouping - 1 — Product Catalogue: Count by Category

**Description**
Count how many products live in each category and return the five biggest categories. You will group by a foreign key — a skill you will reuse constantly.

**Scenario**
The merchandising team wants to know which categories carry the most products so they can prioritise restocking.

**Requirements**
- Group products by their categoryId
- Count the products in each group into a field named count
- Sort by count descending
- Return only the top 5 categories

**Objectives**
- Group by a foreign key
- Rank groups with sort + limit

**Restrictions**
- The _id of each group must be the categoryId.

**Hints**
- **Group key** $group with _id set to the categoryId field groups products per category.
- **Count them** count: { $sum: 1 } inside the same $group.
- **Top five** A descending $sort followed by $limit 5.

**Common mistakes**
- Returning extra fields the expected output does not include.
- Forgetting to sort before applying $limit, so the 'top N' are wrong.
- Filtering too late, which makes the pipeline slow on real data.

---

## Grouping - 2 — Group Aggregates: Order Statistics

**Description**
For every order status, compute how many orders, plus the average, minimum and maximum order total. Your first multi-accumulator $group.

**Scenario**
A data analyst wants one row per status with the full distribution: volume, average ticket, cheapest and most expensive order.

**Requirements**
- Group by status
- Compute count (orders per status)
- Compute avgTotal with $avg
- Compute minTotal and maxTotal
- Sort alphabetically by status

**Objectives**
- Use $avg, $min, $max, $sum together
- Produce one row per category

**Restrictions**
- Four groups expected — one per status.

**Hints**
- **One $group, many accumulators** List count, avgTotal, minTotal, maxTotal as siblings inside the same $group.
- **Average** $avg: '$total' works directly on the numeric field.
- **Deterministic order** $sort on _id ascending gives A→Z status order.

**Common mistakes**
- Returning extra fields the expected output does not include.
- Forgetting to sort before applying $limit, so the 'top N' are wrong.
- Filtering too late, which makes the pipeline slow on real data.

---

## Grouping - 3 — Monthly Revenue: Time Buckets

**Description**
Summarise revenue month by month. You will convert the createdAt date into a 'YYYY-MM' string, group by it, and sum the order totals.

**Scenario**
The CFO wants a clean monthly revenue chart for the last two and a half years.

**Requirements**
- Group orders by the month of createdAt, formatted as YYYY-MM
- Sum the total of every order into a field named revenue
- Sort chronologically by month (ascending)

**Objectives**
- Bucketing dates with $dateToString
- Building time-series summaries

**Restrictions**
- 31 rows expected (Jan 2024 – Jul 2026).

**Hints**
- **Format the date** Inside the group _id, use { $dateToString: { format: '%Y-%m', date: '$createdAt' } }.
- **Sum per bucket** revenue: { $sum: '$total' } within the same $group.
- **Chronological** Sort ascending on the month string — YYYY-MM sorts correctly as text.

**Common mistakes**
- Returning extra fields the expected output does not include.
- Forgetting to sort before applying $limit, so the 'top N' are wrong.
- Filtering too late, which makes the pipeline slow on real data.

---

## Joining Collections - 1 — Customers & Orders: First Join

**Description**
Join the users collection with orders and compute, per user, how many orders they placed and how much they spent in total.

**Scenario**
Marketing wants a per-customer summary (name, email, order count, lifetime spend) for a loyalty campaign — without loading every order into Node.

**Requirements**
- Join each user with their orders (userId matches _id)
- Output name, email, orderCount, totalSpent
- Hide _id
- Return all 220 users

**Objectives**
- Perform a left outer join with $lookup
- Reduce a joined array with $size and $sum

**Restrictions**
- Users with zero orders must still appear.

**Hints**
- **The join stage** $lookup needs from, localField, foreignField and as. localField is the users._id, foreignField is orders.userId.
- **Size of the array** {$size: '$orders'} counts the joined documents.
- **Summing an array** {$sum: '$orders.total'} reduces the joined totals into one number.

**Common mistakes**
- Returning extra fields the expected output does not include.
- Forgetting to sort before applying $limit, so the 'top N' are wrong.
- Filtering too late, which makes the pipeline slow on real data.

---

## Joining Collections - 2 — Top Customers: The $lookup + $group Combo

**Description**
Find the top 5 customers by total purchase amount. This is the aggregation-pipeline classic: group, sort, limit, then join for names.

**Scenario**
The sales director wants a plaque for the five customers who have spent the most money in the store.

**Requirements**
- Group orders by customer (userId)
- Total spend per customer into totalSpend, plus an order count
- Sort by totalSpend descending
- Keep only the top 5
- Join users to bring back name and email
- Hide the userId and every internal id

**Objectives**
- Combine $group → $sort → $limit → $lookup
- Reshape joined output with $unwind + $project
- Hide internal identifiers

**Restrictions**
- Exactly 5 documents.
- No internal ids may leak into the output.

**Hints**
- **Aggregate first** Group by userId and sum the totals before touching the users collection — 5 rows beat 520 for a join.
- **Top five** Sort descending by totalSpend then $limit 5.
- **Now enrich** $lookup users on the group key _id, $unwind the one match, then $project the display fields.
- **Clean output** Map _id: 0, name: '$user.name', email: '$user.email', keep totalSpend and orders.

**Common mistakes**
- Returning extra fields the expected output does not include.
- Forgetting to sort before applying $limit, so the 'top N' are wrong.
- Filtering too late, which makes the pipeline slow on real data.

---

## Array Operators - 1 — Unwind: Order Line Items

**Description**
Deconstruct the items array on delivered orders so each order line becomes its own document, then rank line items by their value.

**Scenario**
The analytics team needs a flat table of every sold line item to feed into a BI tool. Each row = one product line from one delivered order.

**Requirements**
- Only delivered orders
- Flatten the items array with $unwind
- Compute lineTotal = qty * price
- Sort by lineTotal descending
- Return top 10 line items
- Output: orderNumber, productId, name, qty, price, lineTotal

**Objectives**
- Use $unwind to flatten arrays
- Project nested fields after unwind
- Understand row explosion

**Restrictions**
- One row per line item, not per order.

**Hints**
- **One document per element** $unwind '$items' turns one order with N items into N documents.
- **Read nested fields** After unwinding, items.qty and items.price are accessible on the document directly.
- **Multiply** lineTotal: { $multiply: ['$items.qty', '$items.price'] }.

**Common mistakes**
- Returning extra fields the expected output does not include.
- Forgetting to sort before applying $limit, so the 'top N' are wrong.
- Filtering too late, which makes the pipeline slow on real data.

---

## Array Operators - 2 — Genre Popularity: Unwind + Group

**Description**
A movie can have several genres. Unwind the genres array, then count how many movies fall into each genre.

**Scenario**
The streaming team wants a genre bar chart computed from the raw movies collection.

**Requirements**
- Unwind the genres array
- Group by genre
- Count movies per genre
- Sort by count descending

**Objectives**
- Combine $unwind with $group
- Count categorical values

**Restrictions**
- No $limit — every genre must be counted.

**Hints**
- **Flatten first** $unwind '$genres' creates one document per movie/genre pair.
- **Then group** Group by the unwound genre value and $sum: 1.
- **Rank them** Descending $sort on the count.

**Common mistakes**
- Returning extra fields the expected output does not include.
- Forgetting to sort before applying $limit, so the 'top N' are wrong.
- Filtering too late, which makes the pipeline slow on real data.

---

## Nested Arrays - 1 — Actor Filmography: Join Through an Array

**Description**
Each movie references its cast via an actorIds array. Reverse the relationship: for every actor, count how many movies they starred in and their average rating.

**Scenario**
Casting directors want a ranking of the most prolific actors in the catalogue, with average film rating as a tiebreaker.

**Requirements**
- Join actors to movies where actorIds contains the actor's _id
- Drop actors with no movies BEFORE unwinding
- Unwind the joined movies
- Group by actor name: count movies, average their rating
- Sort by movie count descending
- Return the top 10 actors

**Objectives**
- Look up through an array field
- Filter before $unwind
- Group with $avg over joined docs

**Restrictions**
- Ten rows exactly.

**Hints**
- **Join into the array** $lookup with localField '_id', foreignField 'actorIds'. The engine matches membership automatically.
- **Trim before unwind** A $match { movies: { $ne: [] } } removes actors with no films so the unwind does not erase them.
- **Average across films** avgRating: { $avg: '$movies.rating' } inside the group.

**Common mistakes**
- Returning extra fields the expected output does not include.
- Forgetting to sort before applying $limit, so the 'top N' are wrong.
- Filtering too late, which makes the pipeline slow on real data.

---

## Nested Arrays - 2 — Nested Arrays: Student Enrolments

**Description**
Students reference the courses they take through an array of courseIds. Expand every enrolment into a row that also names the course and its teacher. Two chained lookups through arrays.

**Scenario**
The registrar wants a flat register of every enrolment: student name, course title, teacher name, major and GPA — 50 rows are enough.

**Requirements**
- Join courses where the course _id is inside student.courseIds
- Unwind the joined courses — one row per enrolment
- Second lookup: resolve courses.teacherId to a teacher
- Output: student (name), course (title), teacher (name), major, gpa
- Sort by student then course, both ascending
- Return only the first 50 rows

**Objectives**
- Chain lookups through nested arrays
- Sort on multiple keys
- Project aliased nested fields

**Restrictions**
- Exactly 50 rows (use $limit 50).

**Hints**
- **Array join first** $lookup from courses, localField 'courseIds', foreignField '_id'. Membership in an array is matched automatically.
- **Then flatten** $unwind '$courses' turns each enrolment into its own document.
- **Resolve the teacher** Second $lookup on courses.teacherId — the field lives one level deep now.
- **Two-key sort** $sort { student: 1, course: 1 } orders by the first key, then the second.

**Common mistakes**
- Returning extra fields the expected output does not include.
- Forgetting to sort before applying $limit, so the 'top N' are wrong.
- Filtering too late, which makes the pipeline slow on real data.

---

# Level 2 — Analytics

## Real Projects - 1 — Amazon-Style: Revenue by Category

**Description**
Compute total revenue per product category. You must join orders → products → categories through the nested items array.

**Scenario**
The e-commerce company wants a category revenue ranking for their quarterly board review.

**Requirements**
- Only delivered orders
- Unwind items
- Resolve each item to its product, then to its category
- Group by category name and sum revenue (qty * price)
- Sort by revenue descending

**Objectives**
- Multi-hop joins through arrays
- Sum nested computed expressions
- Produce a business-ready ranking

**Restrictions**
- 12 rows — one per category.

**Hints**
- **Chain the joins** items.productId → products._id, then products.categoryId → categories._id. Each join needs its own $unwind.
- **Revenue per line** Inside $group: revenue: { $sum: { $multiply: ['$items.qty', '$items.price'] } }.
- **Group by the name** Group on '$category.name', not the internal id, so the output is human-readable.

**Common mistakes**
- Returning extra fields the expected output does not include.
- Forgetting to sort before applying $limit, so the 'top N' are wrong.
- Filtering too late, which makes the pipeline slow on real data.

---

## Real Projects - 2 — HR Analytics: Average Salary by Department

**Description**
For every department, compute the headcount and the average salary of active employees.

**Scenario**
HR wants to spot salary discrepancies across departments in the companies dataset.

**Requirements**
- Only active employees
- Join departments by departmentId
- Group by department name
- Count employees and average their salary
- Sort by average salary descending

**Objectives**
- Filter → join → group ordering
- Compute per-group averages

**Restrictions**
- One row per department.

**Hints**
- **Filter before join** $match { status: 'active' } first — cheaper than joining 460 rows.
- **Join and flatten** $lookup then $unwind '$department'.
- **Averages** avgSalary: { $avg: '$salary' } and employees: { $sum: 1 }.

**Common mistakes**
- Returning extra fields the expected output does not include.
- Forgetting to sort before applying $limit, so the 'top N' are wrong.
- Filtering too late, which makes the pipeline slow on real data.

---

## Real Projects - 3 — Banking: Biggest Withdrawal Merchants

**Description**
Find the ten merchants where customers have withdrawn the most money.

**Scenario**
A bank wants to understand where cash is leaving accounts so it can propose rewards or limits.

**Requirements**
- Only settled withdrawals
- Group by merchant
- Sum the withdrawn amounts into totalWithdrawn
- Also count withdrawals per merchant
- Sort descending and keep the top 10

**Objectives**
- Financial filtering
- Aggregate with two accumulators and rank

**Restrictions**
- Exactly 10 merchants.

**Hints**
- **Tight filter** $match { type: 'withdraw', status: 'settled' }.
- **Sum and count** totalWithdrawn: { $sum: '$amount' }, count: { $sum: 1 }.
- **Rank** Sort by totalWithdrawn descending, $limit 10.

**Common mistakes**
- Returning extra fields the expected output does not include.
- Forgetting to sort before applying $limit, so the 'top N' are wrong.
- Filtering too late, which makes the pipeline slow on real data.

---

## Real Projects - 4 — Book Bestsellers: Authors Join

**Description**
Rank the ten best-selling books and enrich each with its author's name.

**Scenario**
A publisher wants a bestseller poster: title, author, sales, rating and price for the top ten books.

**Requirements**
- Sort books by sales descending
- Take the top 10
- Join the author for each book
- Output: title, author, sales, rating, price
- Hide all ids

**Objectives**
- Optimise joins by shrinking first
- Alias joined fields in $project

**Restrictions**
- Ten rows.

**Hints**
- **Sort then limit** Top-N must always sort before limiting, or you keep the wrong ten.
- **Join after shrinking** Only 10 lookups run — far cheaper than joining 320 books.
- **Alias the field** author: '$author.name' in $project.

**Common mistakes**
- Returning extra fields the expected output does not include.
- Forgetting to sort before applying $limit, so the 'top N' are wrong.
- Filtering too late, which makes the pipeline slow on real data.

---

## Real Projects - 5 — Social Engagement: Counts via Sub-Pipelines

**Description**
Rank posts by engagement where engagement = likes + 2 × comments. Counts come from $lookup sub-pipelines using let and $expr.

**Scenario**
The social platform's growth team wants the top posts by weighted engagement to feature in a newsletter.

**Requirements**
- For each post, count its likes and comments
- Use $lookup with let + pipeline + $expr (no field-equality shortcut)
- Compute engagement = likes + (2 * comments)
- Sort by engagement descending
- Return top 10 with content, likes, comments, engagement

**Objectives**
- Write $lookup sub-pipelines with $expr
- Handle empty lookups with $ifNull
- Compute weighted scores

**Restrictions**
- Exactly 10 posts.
- $lookup must use the let/pipeline form.

**Hints**
- **Sub-pipeline lookup** Inside $lookup: let: { postId: '$postId' }, pipeline: [{ $match: { $expr: { $eq: ['$postId', '$$postId'] } } }, { $count: 'likes' }].
- **Defensive default** Posts with zero likes produce an empty array — wrap with { $ifNull: [{ $first: '$likes.likes' }, 0] }.
- **Weighted score** engagement: { $add: ['$likes', { $multiply: ['$comments', 2] }] }.

**Common mistakes**
- Returning extra fields the expected output does not include.
- Forgetting to sort before applying $limit, so the 'top N' are wrong.
- Filtering too late, which makes the pipeline slow on real data.

---

## Real Projects - 6 — Hospital Analytics: Cost by Facility

**Description**
Rank hospitals by the average cost of their completed appointments.

**Scenario**
A health authority wants to compare facility costs and appointment volumes for budgeting.

**Requirements**
- Only completed appointments
- Join hospitals by hospitalId
- Group by hospital name
- Count appointments and average their cost
- Sort by average cost descending

**Objectives**
- Healthcare data modelling
- Per-entity cost aggregation

**Restrictions**
- One row per hospital.

**Hints**
- **Status gate** $match { status: 'completed' } narrows 520 appointments.
- **Enrich** $lookup then $unwind '$hospital'.
- **Group** appointments: { $sum: 1 }, avgCost: { $avg: '$cost' }.

**Common mistakes**
- Returning extra fields the expected output does not include.
- Forgetting to sort before applying $limit, so the 'top N' are wrong.
- Filtering too late, which makes the pipeline slow on real data.

---

## Advanced Pipelines - 1 — Customer 360: Multi-Source Profile

**Description**
Build a 360° customer profile: order count, lifetime spend, average order value and review count — from three collections in one pipeline.

**Scenario**
The CRM team wants the ten most valuable customers enriched with their behaviour across orders and reviews.

**Requirements**
- Join each user's order totals (sub-pipeline $lookup)
- Join each user's review count (sub-pipeline $lookup)
- Compute orders, totalSpent, avgOrder, reviews
- Sort by totalSpent descending
- Top 10 users, all ids hidden

**Objectives**
- Compose multi-source profiles
- Guard division by zero
- Merge computed metrics

**Restrictions**
- Exactly 10 rows.

**Hints**
- **Reuse the pattern** Two sub-pipeline lookups keyed on the user _id, one returning totals, the other a count.
- **Average order value** avgOrder: { $cond: [{ $gt: ['$orders', 0] }, { $divide: ['$totalSpent', '$orders'] }, 0] } guards against divide-by-zero.
- **Flatten counts** reviews: { $ifNull: [{ $first: '$reviews.reviews' }, 0] }.

**Common mistakes**
- Returning extra fields the expected output does not include.
- Forgetting to sort before applying $limit, so the 'top N' are wrong.
- Filtering too late, which makes the pipeline slow on real data.

---

## Advanced Pipelines - 2 — Review Profiles: Products People Rate

**Description**
Find the products with the most verified social proof: at least 5 reviews, ranked by review count, with the average rating from those reviews.

**Scenario**
The commerce team wants to highlight 'community-approved' products with a solid review count.

**Requirements**
- Join reviews by productId
- Keep only products with 5 or more reviews (use $expr + $size)
- Compute avgRating from the joined reviews
- Sort by reviewCount descending
- Top 10: name, avgRating, reviewCount

**Objectives**
- $expr with $size after a lookup
- Averaging array elements

**Restrictions**
- Ten rows.

**Hints**
- **Match on the join result** A $match cannot see the lookup array unless you use $expr: { $gte: [{ $size: '$reviews' }, 5] }.
- **Average the array** avgRating: { $avg: '$reviews.rating' } averages the flattened values.

**Common mistakes**
- Returning extra fields the expected output does not include.
- Forgetting to sort before applying $limit, so the 'top N' are wrong.
- Filtering too late, which makes the pipeline slow on real data.

---

# Level 3 — Expert

## Window Functions - 1 — Running Revenue: $setWindowFields

**Description**
Build the monthly revenue curve AND the cumulative running total in a single pipeline using a window function.

**Scenario**
The CFO wants to see not just each month's revenue, but the cumulative curve across 2024→2026 for investor slides.

**Requirements**
- Group by month (YYYY-MM) and sum revenue
- Sort months ascending
- Use $setWindowFields to add cumulativeRevenue (sum over unbounded→current)
- Output: month, revenue, cumulativeRevenue

**Objectives**
- Understand window frames
- Compute running totals
- Distinguish window functions from $group

**Restrictions**
- 31 rows. The last cumulativeRevenue must equal total company revenue.

**Hints**
- **Prepare the frame** Group to one row per month and sort ascending — window functions follow sort order.
- **The window stage** $setWindowFields with sortBy { _id: 1 } and output cumulativeRevenue: { $sum: '$revenue' } — the default frame is unbounded → current.
- **Final shape** Project month from the _id, keep revenue and cumulativeRevenue.

**Common mistakes**
- Returning extra fields the expected output does not include.
- Forgetting to sort before applying $limit, so the 'top N' are wrong.
- Filtering too late, which makes the pipeline slow on real data.

---

## Window Functions - 2 — Top 3 Per Year: Window Ranks

**Description**
Rank movies within each year by rating using $setWindowFields, then keep only the top 3 of every year. This is the 'rank within group' superpower.

**Scenario**
A film site wants the top-3 rated movies for every year, so users can browse 'best of' lists.

**Requirements**
- Only movies with votes >= 5000
- Rank by rating descending, partitioned by year
- Keep only rank <= 3
- Sort by year then rank
- Output: title, year, rating, votes, rank

**Objectives**
- Partition with partitionBy
- Use $rank within groups
- Filter on computed window fields

**Restrictions**
- ~100 rows expected (top 3 of most years).

**Hints**
- **Partition** $setWindowFields partitionBy '$year' splits the data into one window per year.
- **Rank, not count** output rank: { $rank: {} } assigns 1 to the best-rated movie in each partition.
- **Filter ranks** A $match { rank: { $lte: 3 } } after the window stage trims to the podium.

**Common mistakes**
- Returning extra fields the expected output does not include.
- Forgetting to sort before applying $limit, so the 'top N' are wrong.
- Filtering too late, which makes the pipeline slow on real data.

---

## Facets — One Pass, Many Answers: $facet

**Description**
Run three independent aggregations over the orders collection in a single $facet stage: total revenue, per-status counts and per-payment counts.

**Scenario**
The ops dashboard needs three widgets, and running three separate queries would triple the load. $facet answers them all in one scan.

**Requirements**
- Facet A: totalRevenue — one doc with the sum of all totals
- Facet B: ordersByStatus — count per status, sorted by count descending
- Facet C: ordersByPayment — count per payment method, sorted descending

**Objectives**
- Compose $facet with independent sub-pipelines
- Produce a single multi-section document

**Restrictions**
- Exactly ONE output document with three fields.

**Hints**
- **Shape** $facet takes an object: each key is an output field, each value is a sub-pipeline.
- **Sub-pipelines** Each sub-pipeline receives the full 520 orders and runs independently.
- **Inside the facets** Use $group + $project / $group + $sort exactly as you would at the top level.

**Common mistakes**
- Returning extra fields the expected output does not include.
- Forgetting to sort before applying $limit, so the 'top N' are wrong.
- Filtering too late, which makes the pipeline slow on real data.

---

## Graph Lookup — Follower Reach: $graphLookup

**Description**
Compute how many users each user can reach within two hops in the follower graph, then rank the five most influential users.

**Scenario**
The platform wants to find natural influencers: users whose network (followers, and followers of followers) is largest.

**Requirements**
- Graph-walk the followers collection starting from each user's _id
- Traverse followsId → userId up to a depth of 2
- Count the reachable users per user
- Sort by reach descending (ties by name ascending)
- Top 5 users with name and reach

**Objectives**
- Model a graph traversal
- Rank nodes by reach
- Understand BFS semantics

**Restrictions**
- Five rows. Sort ties by name so the result is deterministic.

**Hints**
- **The recursion** $graphLookup needs from, startWith, connectFromField ('followsId'), connectToField ('userId') and as.
- **Cap the depth** maxDepth: 2 stops the walk at friends-of-friends.
- **Measure it** reach: { $size: '$reach' } counts distinct reachable users.

**Common mistakes**
- Returning extra fields the expected output does not include.
- Forgetting to sort before applying $limit, so the 'top N' are wrong.
- Filtering too late, which makes the pipeline slow on real data.

---

# Level 4 — Mastery

## Capstone — BOSS: Top 3 Products Per Category

**Description**
The final boss. For every product category, find the three highest-revenue products. Everything you have learned is required: match, unwind, double lookup, group, window ranking, filter and sort.

**Scenario**
The chief data officer wants a 'category champions' report — the podium of products within each category — to drive merchandising decisions.

**Requirements**
- Only delivered orders
- Unwind items and resolve product + category via lookups
- Group by category + product and sum revenue
- Rank products within each category by revenue (window)
- Keep only rank <= 3
- Sort by category then rank
- Output: category, product, revenue, rank

**Objectives**
- Chain every major pipeline concept end-to-end
- Design a performant multi-join aggregation
- Produce a production-grade 'top N per group' report

**Restrictions**
- ~36 rows (3 per category).
- No write stages, no $group skipping the window.

**Hints**
- **Compose the foundation** match → unwind → lookup product → unwind → lookup category → unwind.
- **Group smart** Group _id = { categoryId, productId }; carry category and product names with $first.
- **Podium ranks** $setWindowFields partitionBy '_id.categoryId', sortBy revenue desc, rank. Then $match rank <= 3.
- **Deterministic order** Final $sort on category id then rank — clean and reproducible.

**Common mistakes**
- Returning extra fields the expected output does not include.
- Forgetting to sort before applying $limit, so the 'top N' are wrong.
- Filtering too late, which makes the pipeline slow on real data.
