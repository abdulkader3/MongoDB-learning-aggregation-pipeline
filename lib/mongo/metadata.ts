/**
 * Central MongoDB language metadata.
 *
 * This is the single source of truth for MongoDB operator knowledge used by
 * the pipeline editor's autocomplete. Names, kinds and descriptions follow
 * MongoDB's official documentation (aggregation pipeline stages, query
 * selectors and aggregation expressions).
 */

export type MongoOperatorKind = "stage" | "query-operator" | "expression";

export interface MongoOperator {
  name: string;
  kind: MongoOperatorKind;
  description: string;
}

function stage(name: string, description: string): MongoOperator {
  return { name, kind: "stage", description };
}

function query(name: string, description: string): MongoOperator {
  return { name, kind: "query-operator", description };
}

function expression(name: string, description: string): MongoOperator {
  return { name, kind: "expression", description };
}

/** Aggregation pipeline stages. */
export const MONGO_STAGES: MongoOperator[] = [
  stage("$addFields", "Adds new fields to each document without removing existing ones."),
  stage("$bucket", "Groups documents into a fixed set of buckets defined by boundaries."),
  stage("$bucketAuto", "Groups documents into a computed number of evenly sized buckets."),
  stage("$changeStream", "Returns change events for the collection instead of documents."),
  stage("$collStats", "Returns statistics about the collection."),
  stage("$count", "Counts the documents passing through the pipeline."),
  stage("$currentOp", "Returns a stream of active operations."),
  stage("$densify", "Creates missing documents between values of a field."),
  stage("$documents", "Returns literal documents passed into the pipeline."),
  stage("$facet", "Runs multiple sub-pipelines over the same input in a single stage."),
  stage("$fill", "Fills null and missing values in a field."),
  stage("$geoNear", "Returns documents ordered by proximity to a given point."),
  stage("$graphLookup", "Performs a recursive search through a collection."),
  stage("$group", "Groups documents and calculates aggregate values."),
  stage("$indexStats", "Returns statistics about index usage."),
  stage("$limit", "Limits the number of documents passed onward."),
  stage("$lookup", "Performs a join with another collection."),
  stage("$match", "Filters documents based on a query condition."),
  stage("$merge", "Writes the pipeline results into a collection."),
  stage("$out", "Writes the pipeline results to a collection."),
  stage("$planCacheStats", "Returns plan cache statistics for the collection."),
  stage("$project", "Selects, excludes, or reshapes document fields."),
  stage("$redact", "Restricts document content based on stored access permissions."),
  stage("$replaceRoot", "Replaces each document with a nested subdocument."),
  stage("$replaceWith", "Alias for $replaceRoot using an expression as the new root."),
  stage("$sample", "Returns a random sample of documents."),
  stage("$search", "Performs a full-text search (Atlas Search)."),
  stage("$searchMeta", "Returns metadata about an Atlas Search query."),
  stage("$set", "Adds or replaces fields; alias for $addFields."),
  stage("$setWindowFields", "Computes values across ordered partitions of the stream."),
  stage("$skip", "Skips a number of documents before passing the rest onward."),
  stage("$sort", "Sorts documents according to specified fields."),
  stage("$sortByCount", "Groups by a field, counts, and sorts descending in one stage."),
  stage("$unionWith", "Combines documents from another collection."),
  stage("$unset", "Removes the specified fields from each document."),
  stage("$unwind", "Deconstructs an array field into separate documents."),
  stage("$vectorSearch", "Performs a vector similarity search (Atlas)."),
];

/** Query operators usable inside $match condition documents. */
export const MONGO_QUERY_OPERATORS: MongoOperator[] = [
  query("$eq", "Matches values equal to a specified value."),
  query("$ne", "Matches values not equal to a specified value."),
  query("$gt", "Matches values greater than a specified value."),
  query("$gte", "Matches values greater than or equal to a specified value."),
  query("$lt", "Matches values less than a specified value."),
  query("$lte", "Matches values less than or equal to a specified value."),
  query("$in", "Matches any of the values listed in an array."),
  query("$nin", "Matches none of the values listed in an array."),
  query("$and", "Joins query clauses with a logical AND."),
  query("$or", "Joins query clauses with a logical OR."),
  query("$nor", "Joins query clauses with a logical NOR."),
  query("$not", "Inverts the effect of a query expression."),
  query("$exists", "Matches documents that have the specified field."),
  query("$type", "Matches documents where a field is of the specified BSON type."),
  query("$regex", "Matches strings using a regular expression."),
  query("$options", "Options applied together with a $regex expression."),
  query("$text", "Performs a text search on indexed fields."),
  query("$where", "Matches documents that satisfy a JavaScript expression."),
  query("$expr", "Allows $match to use aggregation expressions."),
  query("$elemMatch", "Matches arrays that contain an element matching all conditions."),
  query("$all", "Matches arrays that contain all of the specified elements."),
  query("$size", "Matches arrays with exactly the specified number of elements."),
  query("$mod", "Matches values that return a given remainder after division."),
  query("$jsonSchema", "Validates documents against the specified JSON Schema."),
  query("$comment", "Attaches a comment to a query."),
  query("$bitsAllSet", "Matches where all specified bit positions are set."),
  query("$bitsAnySet", "Matches where any specified bit position is set."),
  query("$bitsAllClear", "Matches where all specified bit positions are clear."),
  query("$bitsAnyClear", "Matches where any specified bit position is clear."),
  query("$geoWithin", "Selects documents with geometries inside a bounding shape."),
  query("$geoIntersects", "Selects documents whose geometries intersect a shape."),
  query("$near", "Returns documents near a point, ordered by distance."),
  query("$nearSphere", "Returns documents near a point on a sphere."),
];

/** Aggregation expression operators (usable in $project, $group, $addFields, etc.). */
export const MONGO_EXPRESSION_OPERATORS: MongoOperator[] = [
  // Arithmetic
  expression("$abs", "Returns the absolute value of a number."),
  expression("$add", "Adds numbers or adds a duration to a date."),
  expression("$ceil", "Rounds a number up to the nearest integer."),
  expression("$divide", "Divides one number by another."),
  expression("$exp", "Raises e to a specified exponent."),
  expression("$floor", "Rounds a number down to the nearest integer."),
  expression("$ln", "Returns the natural logarithm of a number."),
  expression("$log", "Returns the logarithm of a number in a specified base."),
  expression("$log10", "Returns the base-10 logarithm of a number."),
  expression("$mod", "Returns the remainder of a division."),
  expression("$multiply", "Multiplies two or more numbers."),
  expression("$pow", "Raises a number to a specified exponent."),
  expression("$round", "Rounds a number to a specified precision."),
  expression("$sqrt", "Returns the square root of a number."),
  expression("$subtract", "Subtracts two numbers or dates."),
  expression("$trunc", "Truncates a number to a specified precision."),
  // Array
  expression("$arrayElemAt", "Returns the element at a given array index."),
  expression("$arrayToObject", "Converts an array of key-value pairs into an object."),
  expression("$concatArrays", "Concatenates two or more arrays."),
  expression("$filter", "Selects array elements that match a condition."),
  expression("$indexOfArray", "Returns the index of an element in an array."),
  expression("$isArray", "Returns true if the value is an array."),
  expression("$map", "Applies an expression to every element of an array."),
  expression("$objectToArray", "Converts an object into an array of key-value pairs."),
  expression("$range", "Generates an array of numbers over a range."),
  expression("$reduce", "Reduces an array to a single accumulated value."),
  expression("$reverseArray", "Reverses the order of the elements of an array."),
  expression("$size", "Returns the number of elements in an array."),
  expression("$slice", "Returns a subset of an array."),
  expression("$sortArray", "Sorts the elements of an array."),
  expression("$zip", "Merges arrays into an array of tuples."),
  // Boolean / logical
  expression("$and", "Returns true only when every expression is true."),
  expression("$or", "Returns true when any expression is true."),
  expression("$not", "Returns the logical inverse of an expression."),
  // Comparison
  expression("$cmp", "Compares two values and returns -1, 0 or 1."),
  expression("$eq", "Returns true when two values are equal."),
  expression("$gt", "Returns true when the first value is greater."),
  expression("$gte", "Returns true when the first value is greater than or equal."),
  expression("$lt", "Returns true when the first value is less."),
  expression("$lte", "Returns true when the first value is less than or equal."),
  expression("$ne", "Returns true when two values are not equal."),
  // Conditional
  expression("$cond", "A ternary conditional expression (if-then-else)."),
  expression("$ifNull", "Returns a fallback value when the expression is null or missing."),
  expression("$switch", "Evaluates a series of cases and returns the first match."),
  // Date
  expression("$dateAdd", "Adds a duration to a date."),
  expression("$dateDiff", "Returns the difference between two dates in a unit."),
  expression("$dateFromParts", "Builds a date from its component parts."),
  expression("$dateFromString", "Parses a date string into a date."),
  expression("$dateSubtract", "Subtracts a duration from a date."),
  expression("$dateToString", "Formats a date as a string."),
  expression("$dateTrunc", "Truncates a date to a specified unit."),
  expression("$dayOfMonth", "Returns the day of the month (1-31) of a date."),
  expression("$dayOfWeek", "Returns the day of the week (1-7) of a date."),
  expression("$dayOfYear", "Returns the day of the year (1-366) of a date."),
  expression("$hour", "Returns the hour (0-23) of a date."),
  expression("$isoWeek", "Returns the ISO week number of a date."),
  expression("$isoWeekYear", "Returns the ISO week-year of a date."),
  expression("$millisecond", "Returns the milliseconds (0-999) of a date."),
  expression("$minute", "Returns the minute (0-59) of a date."),
  expression("$month", "Returns the month (1-12) of a date."),
  expression("$second", "Returns the second (0-60) of a date."),
  expression("$toDate", "Converts a value to a date."),
  expression("$week", "Returns the week number (0-53) of a date."),
  expression("$year", "Returns the year of a date."),
  // String
  expression("$concat", "Concatenates two or more strings."),
  expression("$indexOfBytes", "Returns the byte index of a substring."),
  expression("$indexOfCP", "Returns the code point index of a substring."),
  expression("$ltrim", "Removes leading whitespace from a string."),
  expression("$regexFind", "Returns the first regex match in a string."),
  expression("$regexFindAll", "Returns all regex matches in a string."),
  expression("$regexMatch", "Returns true if a string matches a regex."),
  expression("$replaceAll", "Replaces all occurrences of a substring."),
  expression("$replaceOne", "Replaces the first occurrence of a substring."),
  expression("$rtrim", "Removes trailing whitespace from a string."),
  expression("$split", "Splits a string into an array of substrings."),
  expression("$strLenBytes", "Returns the byte length of a string."),
  expression("$strLenCP", "Returns the code point length of a string."),
  expression("$substr", "Returns a substring of a string."),
  expression("$substrBytes", "Returns a substring of a string by byte index."),
  expression("$substrCP", "Returns a substring of a string by code point."),
  expression("$toLower", "Converts a string to lowercase."),
  expression("$toUpper", "Converts a string to uppercase."),
  expression("$trim", "Removes whitespace from both ends of a string."),
  // Conversion
  expression("$convert", "Converts a value to a specified type."),
  expression("$toBool", "Converts a value to a boolean."),
  expression("$toDecimal", "Converts a value to a decimal."),
  expression("$toDouble", "Converts a value to a double."),
  expression("$toInt", "Converts a value to an integer."),
  expression("$toLong", "Converts a value to a long."),
  expression("$toObjectId", "Converts a value to an ObjectId."),
  expression("$toString", "Converts a value to a string."),
  expression("$type", "Returns the BSON type of a value."),
  // Object
  expression("$getField", "Returns a field from an object by name."),
  expression("$literal", "Returns a value without any expression parsing."),
  expression("$mergeObjects", "Combines multiple documents into a single object."),
  expression("$setField", "Adds or replaces a field in an object by name."),
  expression("$unsetField", "Removes a field from an object by name."),
  // Set
  expression("$allElementsTrue", "Returns true when all set elements are true."),
  expression("$anyElementTrue", "Returns true when any set element is true."),
  expression("$setDifference", "Returns elements in the first set but not the second."),
  expression("$setEquals", "Returns true when two sets have the same elements."),
  expression("$setIntersection", "Returns the elements common to all sets."),
  expression("$setIsSubset", "Returns true when the first set is a subset of the second."),
  expression("$setUnion", "Returns the union of all sets."),
  // Variables / misc
  expression("$let", "Defines variables for a sub-expression."),
  expression("$meta", "Returns metadata such as the text search score."),
  expression("$rand", "Returns a random value between 0 and 1."),
  expression("$function", "Runs a custom JavaScript function."),
  // Accumulators
  expression("$sum", "Sums numeric values, or counts documents as $sum: 1."),
  expression("$avg", "Returns the average of numeric values."),
  expression("$min", "Returns the minimum value."),
  expression("$max", "Returns the maximum value."),
  expression("$first", "Returns the first value in a group."),
  expression("$last", "Returns the last value in a group."),
  expression("$push", "Collects all values into an array."),
  expression("$addToSet", "Collects unique values into an array."),
  expression("$stdDevPop", "Returns the population standard deviation."),
  expression("$stdDevSamp", "Returns the sample standard deviation."),
  expression("$accumulator", "Builds a custom accumulator with JavaScript."),
  expression("$top", "Returns the top value within a group."),
  expression("$bottom", "Returns the bottom value within a group."),
  expression("$topN", "Returns the top n values within a group."),
  expression("$bottomN", "Returns the bottom n values within a group."),
  expression("$minN", "Returns the smallest n values within a group."),
  expression("$maxN", "Returns the largest n values within a group."),
  expression("$firstN", "Returns the first n values within a group."),
  expression("$lastN", "Returns the last n values within a group."),
  // Window-only
  expression("$rank", "Assigns ranks within a window partition, leaving gaps for ties."),
  expression("$denseRank", "Assigns ranks within a window partition without gaps."),
  expression("$documentNumber", "Increments a counter for each document in a partition."),
  expression("$shift", "Returns a value from a document at a given offset."),
  expression("$expMovingAvg", "Returns the exponential moving average over a window."),
  expression("$derivative", "Returns the rate of change over a window."),
  expression("$integral", "Returns the approximate integral over a window."),
  expression("$locf", "Fills null values with the last observed value."),
  expression("$linearFill", "Fills null values with linearly interpolated values."),
  expression("$covariancePop", "Returns the population covariance over a window."),
  expression("$covarianceSamp", "Returns the sample covariance over a window."),
];

/** Every operator the editor knows about, grouped by kind. */
export const MONGO_OPERATOR_BY_KIND: Record<MongoOperatorKind, MongoOperator[]> = {
  stage: MONGO_STAGES,
  "query-operator": MONGO_QUERY_OPERATORS,
  expression: MONGO_EXPRESSION_OPERATORS,
};

export const MONGO_OPERATORS: MongoOperator[] = [
  ...MONGO_STAGES,
  ...MONGO_QUERY_OPERATORS,
  ...MONGO_EXPRESSION_OPERATORS,
];

export const MONGO_OPERATOR_MAP: Map<string, MongoOperator> = new Map(
  MONGO_OPERATORS.map((op) => [op.name, op])
);

/** Splits an operator name (without `$`) into its camelCase words. */
function operatorWords(name: string): string[] {
  const s = name.replace(/^\$/, "");
  const words: string[] = [];
  let current = "";
  for (const ch of s) {
    if (ch >= "A" && ch <= "Z" && current) {
      words.push(current.toLowerCase());
      current = ch;
    } else {
      current += ch;
    }
  }
  if (current) words.push(current.toLowerCase());
  return words;
}

/**
 * Filters operators by the typed prefix. Matching is based on the actual
 * MongoDB operator names: the prefix must match the start of the operator
 * name or the start of one of its words. So `$loo` matches both `$lookup`
 * and `$graphLookup`, while `$un` only matches `$unwind`, `$unset` and
 * `$unionWith`.
 */
export function filterOperators(ops: MongoOperator[], prefix: string): MongoOperator[] {
  const p = prefix.replace(/^\$/, "").trim().toLowerCase();
  if (!p) return ops;
  return ops.filter((op) => operatorWords(op.name).some((w) => w.startsWith(p)));
}
