# @toptensoftware/sqlite

A powerful SQLite wrapper for Node.js built on top of [better-sqlite3](https://github.com/WiseLibs/better-sqlite3), featuring a fluent SQL query builder, statement caching, and convenient database operations.

## Table of Contents

- [Installation](#installation)
- [Quick Start](#quick-start)
- [Core Concepts](#core-concepts)
- [Database Class API](#database-class-api)
- [SQL Builder API](#sql-builder-api)
- [Condition Operators](#condition-operators)
- [Advanced Features](#advanced-features)
- [Examples](#examples)

## Installation

```bash
npm install --save toptensoftware/sqlite
```

## Quick Start

```javascript
import { Database, SQL } from '@toptensoftware/sqlite';

// Create or open a database
const db = new Database('myapp.db');

// Create a table
db.createTable({
  tableName: 'users',
  columns: [
    { id: 'INTEGER PRIMARY KEY AUTOINCREMENT' },
    { name: 'TEXT NOT NULL' },
    { email: 'TEXT UNIQUE' },
    { age: 'INTEGER' }
  ]
});

// Insert data
db.insert('users', { name: 'John Doe', email: 'john@example.com', age: 30 });

// Query with SQL builder
const adults = db.all(
  SQL.select().from('users').where({ age: { $gte: 18 } })
);

// Find a specific user
const user = db.findOne('users', { email: 'john@example.com' });

console.log(user);
```

## Core Concepts

### Database Connection

The `Database` class extends better-sqlite3's Database class, adding convenience methods and features:

```javascript
// In-memory database
const db = new Database(':memory:');

// File-based database
const db = new Database('myapp.db');

// With options
const db = new Database('myapp.db', { 
  readonly: false,
  fileMustExist: false 
});
```

### SQL Builder

The `SQL` class provides a fluent interface for building SQL queries:

```javascript
// Using the SQL builder
const query = SQL
  .select('name', 'email')
  .from('users')
  .where({ age: { $gte: 18 } })
  .orderBy('name ASC')
  .limit(10);

const results = db.all(query);
```

### Statement Caching

Prepared statements are automatically cached for better performance:

```javascript
// First call prepares and caches the statement
db.get('SELECT * FROM users WHERE id = ?', 123);

// Subsequent calls reuse the cached statement
db.get('SELECT * FROM users WHERE id = ?', 456);
```

---

## Database Class API

### Constructor

#### `new Database(filename, options)`

Creates a new database connection.

**Parameters:**
- `filename` (string) - Path to database file or `:memory:` for in-memory database
- `options` (Object, optional) - Options passed to better-sqlite3

**Example:**
```javascript
const db = new Database('myapp.db');
```

---

### Query Execution Methods

#### `run(sql, ...params)`

Executes a SQL statement that modifies the database (INSERT, UPDATE, DELETE).

**Parameters:**
- `sql` (string|SQL) - SQL statement or SQL builder instance
- `...params` - Parameters to bind to the SQL statement

**Returns:** Object with `lastInsertRowid` and `changes` properties

**Examples:**
```javascript
// With parameters
const result = db.run('INSERT INTO users (name, age) VALUES (?, ?)', 'John', 30);
console.log(result.lastInsertRowid);

// With SQL builder
db.run(SQL.insert('users').values({ name: 'Jane', age: 25 }));
```

#### `get(sql, ...params)`

Executes a SQL statement and returns the first row.

**Parameters:**
- `sql` (string|SQL) - SQL statement or SQL builder instance
- `...params` - Parameters to bind

**Returns:** Object representing the first row, or undefined if no results

**Examples:**
```javascript
const user = db.get('SELECT * FROM users WHERE id = ?', 123);

// With SQL builder
const user = db.get(SQL.select().from('users').where({ id: 123 }));
```

#### `all(sql, ...params)`

Executes a SQL statement and returns all rows as an array.

**Parameters:**
- `sql` (string|SQL) - SQL statement or SQL builder instance
- `...params` - Parameters to bind

**Returns:** Array of row objects

**Examples:**
```javascript
const adults = db.all('SELECT * FROM users WHERE age > ?', 18);

// With SQL builder
const adults = db.all(SQL.select().from('users').where({ age: { $gt: 18 } }));
```

#### `pluck(sql, ...params)`

Executes a SQL statement and returns a single column value from the first row.

**Parameters:**
- `sql` (string|SQL) - SQL statement or SQL builder instance
- `...params` - Parameters to bind

**Returns:** The value of the first column in the first row, or undefined

**Examples:**
```javascript
const name = db.pluck('SELECT name FROM users WHERE id = ?', 123);
const count = db.pluck('SELECT COUNT(*) FROM users');
```

#### `pluckAll(sql, ...params)`

Executes a SQL statement and returns all rows as an array of values from the first column.

**Parameters:**
- `sql` (string|SQL) - SQL statement or SQL builder instance
- `...params` - Parameters to bind

**Returns:** Array of values from the first column

**Examples:**
```javascript
// Get all user IDs
const userIds = db.pluckAll('SELECT id FROM users');
// Returns: [1, 2, 3, 4, 5]

// Get all email addresses
const emails = db.pluckAll('SELECT email FROM users WHERE active = ?', true);
```

#### `iterate(sql, ...params)`

Executes a SQL statement and returns an iterator over result rows. Useful for processing large result sets without loading all rows into memory.

**Parameters:**
- `sql` (string|SQL) - SQL statement or SQL builder instance
- `...params` - Parameters to bind

**Returns:** Iterator over result rows

**Examples:**
```javascript
// Iterate over large result set
for (const user of db.iterate('SELECT * FROM users')) {
  console.log(user.name);
}
```

#### `each(sql, ...params, callback)`

Executes a SQL statement and calls a callback function for each result row.

**Parameters:**
- `sql` (string|SQL) - SQL statement or SQL builder instance
- `...params` - Parameters to bind
- `callback` (Function) - Function called for each row

**Examples:**
```javascript
db.each('SELECT * FROM users WHERE age > ?', 18, (user) => {
  console.log(user.name);
});
```

---

### Transaction Methods

#### `transactionSync(callback)`

Executes a synchronous callback within a database transaction. If the callback throws an error, the transaction is rolled back.

**Parameters:**
- `callback` (Function) - Synchronous function to execute

**Returns:** The return value of the callback

**Throws:** Error if callback returns a Promise

**Examples:**
```javascript
// Perform multiple operations atomically
db.transactionSync(() => {
  db.run('INSERT INTO users (name) VALUES (?)', 'John');
  db.run('UPDATE accounts SET balance = balance - 100 WHERE userId = ?', 1);
});

// With return value
const userId = db.transactionSync(() => {
  const result = db.run('INSERT INTO users (name) VALUES (?)', 'Jane');
  return result.lastInsertRowid;
});
```

#### `transactionAsyncUnsafe(callback)`

⚠️ **Use with caution!** Wraps an async callback in a transaction. It's the client's responsibility to ensure all operations belong to this transaction and not other concurrent requests.

**Parameters:**
- `callback` (Function) - Async function to execute

**Returns:** Promise that resolves with the callback's return value

**Examples:**
```javascript
// Only safe if you control all database access
await db.transactionAsyncUnsafe(async () => {
  db.run('INSERT INTO users (name) VALUES (?)', 'John');
  await someAsyncOperation(); // Dangerous if other code accesses db
  db.run('UPDATE accounts SET balance = balance - 100 WHERE userId = ?', 1);
});
```

#### `makeTransaction`

Reference to better-sqlite3's original transaction method. Use this to create reusable transaction functions.

**Examples:**
```javascript
// Create a reusable transaction function
const transferMoney = db.makeTransaction((fromId, toId, amount) => {
  db.run('UPDATE accounts SET balance = balance - ? WHERE id = ?', amount, fromId);
  db.run('UPDATE accounts SET balance = balance + ? WHERE id = ?', amount, toId);
});

// Use it multiple times
transferMoney(1, 2, 100);
transferMoney(3, 4, 50);
```

---

### Convenience CRUD Methods

#### `insert(table, values)`

Inserts a row into a table.

**Parameters:**
- `table` (string) - Table name
- `values` (Object) - Column name to value mapping

**Returns:** Result object with `lastInsertRowid` and `changes`

**Examples:**
```javascript
const result = db.insert('users', { 
  name: 'John', 
  email: 'john@example.com',
  age: 30 
});
console.log('New user ID:', result.lastInsertRowid);
```

#### `update(table, values, condition)`

Updates rows in a table.

**Parameters:**
- `table` (string) - Table name
- `values` (Object) - Column name to new value mapping
- `condition` (Object|string|SQL) - WHERE condition

**Returns:** Result object with `changes` property

**Examples:**
```javascript
// Update by ID
db.update('users', { age: 31 }, { id: 123 });

// Update with complex condition
db.update('users', 
  { status: 'inactive' }, 
  { lastLogin: { $lt: '2023-01-01' } }
);
```

#### `delete(table, condition)`

Deletes rows from a table.

**Parameters:**
- `table` (string) - Table name
- `condition` (Object|string|SQL) - WHERE condition

**Returns:** Result object with `changes` property

**Examples:**
```javascript
// Delete by ID
db.delete('users', { id: 123 });

// Delete with complex condition
db.delete('users', { age: { $gt: 65 }, active: false });
```

#### `insertOrReplace(table, values)`

Inserts a row or replaces it if it already exists (based on primary key or unique constraint).

**Parameters:**
- `table` (string) - Table name
- `values` (Object) - Column name to value mapping

**Returns:** Result object

**Examples:**
```javascript
// Insert or update user
db.insertOrReplace('users', { 
  id: 123, 
  name: 'John', 
  age: 30 
});
```

#### `insertOrIgnore(table, values)`

Inserts a row or ignores if it already exists (based on primary key or unique constraint).

**Parameters:**
- `table` (string) - Table name
- `values` (Object) - Column name to value mapping

**Returns:** Result object

**Examples:**
```javascript
// Insert only if doesn't exist
db.insertOrIgnore('users', { 
  email: 'john@example.com',
  name: 'John' 
});
```

#### `findOne(table, condition)`

Finds a single row matching a condition.

**Parameters:**
- `table` (string) - Table name
- `condition` (Object|string|SQL) - WHERE condition

**Returns:** Row object or undefined

**Examples:**
```javascript
// Find by ID
const user = db.findOne('users', { id: 123 });

// Find with complex condition
const user = db.findOne('users', { 
  email: 'john@example.com',
  active: true 
});
```

#### `findMany(table, condition)`

Finds all rows matching a condition.

**Parameters:**
- `table` (string) - Table name
- `condition` (Object|string|SQL) - WHERE condition

**Returns:** Array of row objects

**Examples:**
```javascript
// Find all active users
const activeUsers = db.findMany('users', { active: true });

// Find with complex condition
const adults = db.findMany('users', { age: { $gte: 18 } });
```

---

### Schema Management Methods

#### `createTable(options)`

Creates a new table with optional indexes.

**Parameters:**
- `options` (Object)
  - `tableName` (string) - Name of the table
  - `columns` (Array) - Array of column definitions
  - `temp` (boolean, optional) - Create temporary table
  - `indicies` (Array, optional) - Array of index definitions

**Examples:**
```javascript
db.createTable({
  tableName: 'users',
  columns: [
    { id: 'INTEGER PRIMARY KEY AUTOINCREMENT' },
    { name: 'TEXT NOT NULL' },
    { email: 'TEXT UNIQUE' },
    { age: 'INTEGER' },
    { createdAt: 'DATETIME DEFAULT CURRENT_TIMESTAMP' }
  ],
  indicies: [
    { columns: [{ name: 'ASC' }] },
    { columns: [{ email: 'ASC' }], unique: true }
  ]
});
```

#### `createIndex(options)`

Creates an index on a table.

**Parameters:**
- `options` (Object)
  - `tableName` (string) - Table name
  - `columns` (Array) - Array of column definitions
  - `unique` (boolean, optional) - Create unique index
  - `indexName` (string, optional) - Index name (auto-generated if omitted)

**Examples:**
```javascript
// Simple index
db.createIndex({
  tableName: 'users',
  columns: ['email']
});

// Unique composite index
db.createIndex({
  tableName: 'users',
  unique: true,
  columns: [
    { lastName: 'ASC' },
    { firstName: 'ASC' }
  ]
});
```

---

### Metadata & Migration Methods

#### `getMetaValue(key, defaultValue)`

Gets a metadata value from the internal metadata table.

**Parameters:**
- `key` (string) - Metadata key
- `defaultValue` (any, optional) - Default value if key doesn't exist

**Returns:** Stored value or defaultValue

**Examples:**
```javascript
const version = db.getMetaValue('schemaVersion', 0);
const appConfig = db.getMetaValue('config', '{}');
```

#### `setMetaValue(key, value)`

Sets a metadata value in the internal metadata table. Creates the table if it doesn't exist.

**Parameters:**
- `key` (string) - Metadata key
- `value` (any) - Value to store

**Returns:** Result object

**Examples:**
```javascript
db.setMetaValue('schemaVersion', 5);
db.setMetaValue('lastBackup', new Date().toISOString());
```

#### `migrate(steps)`

Executes database migration steps. Each step is executed once and tracked in metadata.

**Parameters:**
- `steps` (Array<Function>) - Array of migration functions

**Examples:**
```javascript
db.migrate([
  // Step 0: Create initial schema
  () => {
    db.createTable({
      tableName: 'users',
      columns: [
        { id: 'INTEGER PRIMARY KEY' },
        { name: 'TEXT' }
      ]
    });
  },
  // Step 1: Add email column
  () => {
    db.run('ALTER TABLE users ADD COLUMN email TEXT');
  },
  // Step 2: Create indexes
  () => {
    db.createIndex({
      tableName: 'users',
      columns: ['email'],
      unique: true
    });
  }
]);
```

---

## SQL Builder API

### Constructor

#### `new SQL(sql, ...params)`

Creates a new SQL builder instance.

**Parameters:**
- `sql` (string|SQL, optional) - Initial SQL text or another SQL instance
- `...params` - Parameters for the SQL statement

**Examples:**
```javascript
// Empty builder
const query = new SQL();

// With initial SQL
const query = new SQL('SELECT * FROM users WHERE id = ?', 123);

// Chaining another SQL instance
const base = new SQL('SELECT * FROM users');
const condition = new SQL('WHERE age > ?', 18);
base.append(condition);
```

---

### Core Methods

#### `append(sql, ...params)`

Appends SQL text or another SQL instance.

**Parameters:**
- `sql` (string|SQL) - Text or SQL instance to append
- `...params` - Parameters (can be individual values or an array)

**Returns:** SQL instance (for chaining)

**Examples:**
```javascript
const sql = new SQL('SELECT * FROM users');
sql.append('WHERE age > ?', 18);
sql.append('AND status = ?', 'active');

// With array of parameters
sql.append('WHERE id IN (?, ?, ?)', [1, 2, 3]);

// Append another SQL instance
const condition = new SQL('age > ?', 18);
sql.append('WHERE').append(condition);
```

#### `toString()`

Converts the SQL builder to a plain SQL string with parameters substituted. Useful for debugging.

**Returns:** String with parameters substituted

**Examples:**
```javascript
const sql = SQL.select().from('users').where({ age: { $gt: 18 } });
console.log(sql.toString());
// Output: SELECT * FROM users WHERE age > 18
```

#### `log(loggingFunction)`

Logs the SQL statement with parameters substituted.

**Parameters:**
- `loggingFunction` (Function, optional) - Defaults to console.log

**Returns:** SQL instance (for chaining)

**Examples:**
```javascript
SQL.select().from('users').where({ age: 30 }).log();

// With custom logger
sql.log(myCustomLogger);
```

---

### SQL Statement Builders

#### `select(...columns)`

Appends a SELECT statement.

**Parameters:**
- `...columns` - Column names, array of columns, or object mapping

**Returns:** SQL instance (for chaining)

**Examples:**
```javascript
// SELECT *
SQL.select();

// SELECT specific columns
SQL.select('name', 'email');

// SELECT with array
SQL.select(['name', 'email', 'age']);

// SELECT with aliases (using object)
SQL.select({ 
  userName: 'name',
  userEmail: 'email'
});
```

#### `insert(table)`

Appends an INSERT INTO statement.

**Parameters:**
- `table` (string, optional) - Table name

**Returns:** SQL instance (for chaining)

**Examples:**
```javascript
SQL.insert('users').values({ name: 'John', age: 30 });

// Or step by step
const sql = new SQL();
sql.insert('users').values({ name: 'John' });
```

#### `update(table)`

Appends an UPDATE statement.

**Parameters:**
- `table` (string, optional) - Table name

**Returns:** SQL instance (for chaining)

**Examples:**
```javascript
SQL.update('users').set({ age: 31 }).where({ id: 123 });
```

#### `delete(table)`

Appends a DELETE FROM statement.

**Parameters:**
- `table` (string, optional) - Table name

**Returns:** SQL instance (for chaining)

**Examples:**
```javascript
SQL.delete('users').where({ id: 123 });
```

#### `insertOrReplace(table)`

Appends an INSERT OR REPLACE INTO statement.

**Parameters:**
- `table` (string, optional) - Table name

**Returns:** SQL instance (for chaining)

**Examples:**
```javascript
SQL.insertOrReplace('users').values({ id: 123, name: 'John', age: 30 });
```

#### `insertOrIgnore(table)`

Appends an INSERT OR IGNORE INTO statement.

**Parameters:**
- `table` (string, optional) - Table name

**Returns:** SQL instance (for chaining)

**Examples:**
```javascript
SQL.insertOrIgnore('users').values({ email: 'john@example.com', name: 'John' });
```

---

### SQL Clauses

#### `from(table)`

Appends a FROM clause.

**Parameters:**
- `table` (string) - Table name

**Returns:** SQL instance (for chaining)

**Examples:**
```javascript
SQL.select().from('users');
SQL.select('COUNT(*)').from('orders');
```

#### `values(values)`

Appends a VALUES clause for INSERT statements.

**Parameters:**
- `values` (Object|Array) - Column values

**Returns:** SQL instance (for chaining)

**Examples:**
```javascript
// With object
SQL.insert('users').values({ 
  name: 'John',
  email: 'john@example.com',
  age: 30
});

// With array (must match column order)
SQL.insert('users').values(['name', 'email', 'age']);
```

#### `set(values, originalValues)`

Appends a SET clause for UPDATE statements.

**Parameters:**
- `values` (Object|string) - New column values
- `originalValues` (Object, optional) - Original values (only changed fields will be included)

**Returns:** SQL instance (for chaining)

**Examples:**
```javascript
// Update all fields
SQL.update('users').set({ name: 'John', age: 31 }).where({ id: 123 });

// Only update changed fields
const original = { name: 'John', age: 30 };
const updated = { name: 'John', age: 31 };
SQL.update('users').set(updated, original).where({ id: 123 });
// Only age will be updated since name didn't change

// Direct SQL
SQL.update('users').set('age = age + 1').where({ id: 123 });
```

#### `where(condition, ...params)`

Appends a WHERE clause. Supports multiple condition formats and operators.

**Parameters:**
- `condition` (Object|string|SQL) - The WHERE condition
- `...params` - Parameters if condition is a string

**Returns:** SQL instance (for chaining)

**Examples:**
```javascript
// Simple equality
SQL.select().from('users').where({ name: 'John', age: 30 });

// Comparison operators
SQL.select().from('users').where({ age: { $gt: 18, $lt: 65 } });

// LIKE operator
SQL.select().from('users').where({ name: { $like: 'John%' } });

// IN operator with array
SQL.select().from('users').where({ id: { $in: [1, 2, 3] } });

// IN operator with subquery
SQL.select().from('orders').where({
  userId: { $in: SQL.select('id').from('activeUsers') }
});

// NULL checks
SQL.select().from('users').where({ deletedAt: { $is: null } });
SQL.select().from('users').where({ deletedAt: { $isnot: null } });

// OR conditions
SQL.select().from('users').where({
  age: { $or: [{ $lt: 18 }, { $gt: 65 }] }
});

// Plain SQL with parameters
SQL.select().from('users').where('age > ? AND status = ?', 18, 'active');
```

#### `andWhere(condition, ...params)`

Appends a WHERE or AND clause. If a WHERE already exists, appends AND; otherwise appends WHERE.

**Parameters:**
- `condition` (Object|string|SQL) - The condition
- `...params` - Parameters if condition is a string

**Returns:** SQL instance (for chaining)

**Examples:**
```javascript
// Build query conditionally
const query = SQL.select().from('users');

if (minAge) {
  query.andWhere({ age: { $gte: minAge } });
}

if (status) {
  query.andWhere({ status: status });
}

// Works even if no WHERE exists yet
const query2 = SQL.select().from('users')
  .andWhere({ age: { $gte: 18 } })
  .andWhere({ status: 'active' });
```

#### `orWhere(condition, ...params)`

Appends a WHERE or OR clause. If a WHERE already exists, appends OR; otherwise appends WHERE.

**Parameters:**
- `condition` (Object|string|SQL) - The condition
- `...params` - Parameters if condition is a string

**Returns:** SQL instance (for chaining)

**Examples:**
```javascript
SQL.select().from('users')
  .where({ status: 'active' })
  .orWhere({ role: 'admin' });

// Conditional OR logic
const query = SQL.select().from('users');
query.orWhere({ age: { $lt: 18 } });
query.orWhere({ age: { $gt: 65 } });
```

#### `and(condition, ...params)`

Appends an AND clause.

**Parameters:**
- `condition` (Object|string|SQL) - The condition
- `...params` - Parameters if condition is a string

**Returns:** SQL instance (for chaining)

**Examples:**
```javascript
// Plain SQL
SQL.select().from('users')
  .where('age > ?', 18)
  .and('status = ?', 'active');

// Using object map
SQL.select().from('users')
  .where({ age: { $gt: 18 } })
  .and({ status: 'active' })
  .and({ balance: { $gt: 1000 } });

// Complex conditions
SQL.select().from('users')
  .where({ role: 'user' })
  .and({ email: { $like: '%@company.com' } });
```

#### `or(condition, ...params)`

Appends an OR clause.

**Parameters:**
- `condition` (Object|string|SQL) - The condition
- `...params` - Parameters if condition is a string

**Returns:** SQL instance (for chaining)

**Examples:**
```javascript
// Plain SQL
SQL.select().from('users')
  .where('age < ?', 18)
  .or('age > ?', 65);

// Using object map
SQL.select().from('users')
  .where({ age: { $lt: 18 } })
  .or({ age: { $gt: 65 } });

// Complex conditions
SQL.select().from('users')
  .where({ role: 'admin' })
  .or({ permissions: { $like: '%superuser%' } });
```

#### `on(condition, ...params)`

Appends an ON clause for JOIN conditions.

**Parameters:**
- `condition` (Object|string|SQL) - The join condition
- `...params` - Parameters if condition is a string

**Returns:** SQL instance (for chaining)

**Examples:**
```javascript
// Plain SQL
SQL.select().from('users')
  .leftJoin('orders')
  .on('users.id = orders.userId');

// With additional conditions
SQL.select().from('users')
  .leftJoin('orders')
  .on('users.id = orders.userId AND orders.status = ?', 'active');
```

#### `leftJoin(table)`

Appends a LEFT JOIN clause.

**Parameters:**
- `table` (string) - Table to join

**Returns:** SQL instance (for chaining)

**Examples:**
```javascript
SQL.select('users.name', 'orders.total')
  .from('users')
  .leftJoin('orders')
  .on('users.id = orders.userId');
```

#### `orderBy(expression)`

Appends an ORDER BY clause.

**Parameters:**
- `expression` (string) - Order by expression

**Returns:** SQL instance (for chaining)

**Examples:**
```javascript
SQL.select().from('users').orderBy('name ASC');
SQL.select().from('users').orderBy('age DESC, name ASC');
```

#### `groupBy(expression)`

Appends a GROUP BY clause.

**Parameters:**
- `expression` (string) - Group by expression

**Returns:** SQL instance (for chaining)

**Examples:**
```javascript
SQL.select('category', 'COUNT(*) as count')
  .from('products')
  .groupBy('category');
```

#### `limit(rows)`

Appends a LIMIT clause.

**Parameters:**
- `rows` (number) - Maximum number of rows

**Returns:** SQL instance (for chaining)

**Examples:**
```javascript
SQL.select().from('users').limit(10);
SQL.select().from('users').orderBy('createdAt DESC').limit(5);
```

#### `skipTake(skip, take)`

Appends a LIMIT clause with skip and take values.

**Parameters:**
- `skip` (number) - Number of rows to skip
- `take` (number) - Number of rows to take

**Returns:** SQL instance (for chaining)

**Examples:**
```javascript
// Skip first 20, take next 10
SQL.select().from('users').skipTake(20, 10);
```

#### `takePage(page, rowsPerPage)`

Appends a LIMIT clause for pagination.

**Parameters:**
- `page` (number) - Page number (1-based)
- `rowsPerPage` (number) - Rows per page

**Returns:** SQL instance (for chaining)

**Examples:**
```javascript
// Get page 5, 20 rows per page
SQL.select().from('users').takePage(5, 20);

// Get second page
SQL.select().from('products').orderBy('name').takePage(2, 50);
```

#### `in(values)`

Appends an IN clause.

**Parameters:**
- `values` (Array|SQL) - Array of values or subquery

**Returns:** SQL instance (for chaining)

**Examples:**
```javascript
SQL.select().from('users').where('id').in([1, 2, 3]);

// With subquery
SQL.select().from('orders')
  .where('userId').in(SQL.select('id').from('activeUsers'));
```

#### `parens(sql, ...params)`

Wraps SQL in parentheses.

**Parameters:**
- `sql` (string|SQL) - SQL to wrap
- `...params` - Parameters

**Returns:** SQL instance (for chaining)

**Examples:**
```javascript
SQL.select().from('users')
  .where('status = ?', 'active')
  .and().parens(
    SQL.append('age < ?', 18).or('age > ?', 65)
  );
```

---

### Advanced Methods

#### `param(value)`

Manually adds a parameter value. Useful with custom functions.

**Parameters:**
- `value` (any) - Parameter value

**Returns:** SQL instance (for chaining)

**Examples:**
```javascript
SQL.append('WHERE id = ?').param(123);
```

#### `fndata(data)`

Stores data for custom functions without passing through SQL engine.

**Parameters:**
- `data` (any) - Data to store

**Returns:** SQL instance (for chaining)

**Examples:**
```javascript
SQL.append('SELECT customFunc(?)').fndata({ complex: 'object' });
```

---

### Static Factory Methods

These methods create a new SQL instance with the specified statement.

#### `SQL.select(...columns)`

Creates a new SQL instance with SELECT.

**Examples:**
```javascript
const query = SQL.select('name', 'email').from('users');
```

#### `SQL.insert(table)`

Creates a new SQL instance with INSERT INTO.

**Examples:**
```javascript
const query = SQL.insert('users').values({ name: 'John' });
```

#### `SQL.update(table)`

Creates a new SQL instance with UPDATE.

**Examples:**
```javascript
const query = SQL.update('users').set({ age: 31 }).where({ id: 123 });
```

#### `SQL.delete(table)`

Creates a new SQL instance with DELETE FROM.

**Examples:**
```javascript
const query = SQL.delete('users').where({ id: 123 });
```

#### `SQL.insertOrReplace(table)`

Creates a new SQL instance with INSERT OR REPLACE INTO.

**Examples:**
```javascript
const query = SQL.insertOrReplace('users').values({ id: 123, name: 'John' });
```

#### `SQL.insertOrIgnore(table)`

Creates a new SQL instance with INSERT OR IGNORE INTO.

**Examples:**
```javascript
const query = SQL.insertOrIgnore('users').values({ email: 'john@example.com' });
```

---

### Static Schema Methods

#### `SQL.createTable(options)`

Generates a CREATE TABLE statement.

**Parameters:**
- `options` (Object) - Same as Database.createTable()

**Returns:** SQL instance

**Examples:**
```javascript
const sql = SQL.createTable({
  tableName: 'users',
  columns: [
    { id: 'INTEGER PRIMARY KEY' },
    { name: 'TEXT' }
  ]
});
```

#### `SQL.dropTable(name)`

Generates a DROP TABLE statement.

**Parameters:**
- `name` (string) - Table name

**Returns:** SQL instance

**Examples:**
```javascript
const sql = SQL.dropTable('users');
db.run(sql);
```

#### `SQL.createIndex(options)`

Generates a CREATE INDEX statement.

**Parameters:**
- `options` (Object) - Same as Database.createIndex()

**Returns:** SQL instance

**Examples:**
```javascript
const sql = SQL.createIndex({
  tableName: 'users',
  columns: ['email'],
  unique: true
});
```

---

## Condition Operators

When using object-based conditions in `where()`, `and()`, `or()`, `on()`, etc., the following operators are supported:

| Operator | Description | Example |
|----------|-------------|---------|
| Simple value | Equality | `{ age: 30 }` → `age = 30` |
| `$eq` | Equal | `{ age: { $eq: 30 } }` |
| `$ne` | Not equal | `{ age: { $ne: 30 } }` |
| `$gt` | Greater than | `{ age: { $gt: 18 } }` |
| `$gte` / `$ge` | Greater than or equal | `{ age: { $gte: 18 } }` |
| `$lt` | Less than | `{ age: { $lt: 65 } }` |
| `$lte` / `$le` | Less than or equal | `{ age: { $lte: 65 } }` |
| `$like` | SQL LIKE | `{ name: { $like: 'John%' } }` |
| `$glob` | SQL GLOB | `{ name: { $glob: 'J*n' } }` |
| `$in` | IN (array) | `{ id: { $in: [1, 2, 3] } }` |
| `$in` | IN (subquery) | `{ userId: { $in: SQL.select('id').from('active') } }` |
| `$nin` | NOT IN | `{ id: { $nin: [1, 2, 3] } }` |
| `$is` | IS NULL | `{ deletedAt: { $is: null } }` |
| `$isnot` | IS NOT NULL | `{ deletedAt: { $isnot: null } }` |
| `$or` | OR conditions | `{ age: { $or: [{ $lt: 18 }, { $gt: 65 }] } }` |
| `$and` | AND conditions | `{ age: { $and: [{ $gte: 18 }, { $lt: 65 }] } }` |
| `$not` | NOT | `{ age: { $not: { $lt: 18 } } }` |

### Operator Examples

```javascript
// Multiple operators on same field
db.all(SQL.select().from('users').where({
  age: { $gte: 18, $lt: 65 }
}));

// Combining different operators
db.all(SQL.select().from('users').where({
  age: { $gte: 18 },
  status: 'active',
  email: { $like: '%@company.com' }
}));

// OR within a field
db.all(SQL.select().from('users').where({
  age: { $or: [{ $lt: 18 }, { $gt: 65 }] }
}));

// Complex nested conditions
db.all(SQL.select().from('users').where({
  status: 'active',
  age: { 
    $and: [
      { $gte: 21 },
      { $not: { $gt: 65 } }
    ]
  }
}));
```

---

## Advanced Features

### Statement Caching

Prepared statements are automatically cached for better performance:

```javascript
// First execution prepares and caches
db.get('SELECT * FROM users WHERE id = ?', 123);

// Subsequent executions reuse cached statement
db.get('SELECT * FROM users WHERE id = ?', 456);

// Access cached statement directly
const stmt = db.prepareCached('SELECT * FROM users WHERE id = ?');
const user = stmt.get(123);
```

### Custom Error Handler

Override the error handler to customize error logging:

```javascript
db.error = (message) => {
  console.error('Database error:', message);
  // Send to error tracking service
  errorTracker.capture(message);
};
```

### Working with better-sqlite3 Features

Since Database extends better-sqlite3, all native features are available:

```javascript
// Register custom functions
db.function('customFunc', (x) => x * 2);

// Use custom aggregates
db.aggregate('sum', {
  start: 0,
  step: (total, value) => total + value,
  result: total => total
});

// Backup database
db.backup('backup.db');
```

---

## Examples

### Complete CRUD Application

```javascript
import { Database, SQL } from '@toptensoftware/sqlite';

const db = new Database('app.db');

// Setup
db.createTable({
  tableName: 'users',
  columns: [
    { id: 'INTEGER PRIMARY KEY AUTOINCREMENT' },
    { name: 'TEXT NOT NULL' },
    { email: 'TEXT UNIQUE NOT NULL' },
    { age: 'INTEGER' },
    { createdAt: 'DATETIME DEFAULT CURRENT_TIMESTAMP' }
  ],
  indicies: [
    { columns: ['email'], unique: true }
  ]
});

// Create
const result = db.insert('users', {
  name: 'John Doe',
  email: 'john@example.com',
  age: 30
});
console.log('Created user with ID:', result.lastInsertRowid);

// Read
const user = db.findOne('users', { email: 'john@example.com' });
console.log('Found user:', user);

// Read with complex query
const adults = db.all(
  SQL.select().from('users')
    .where({ age: { $gte: 18 } })
    .orderBy('name ASC')
    .limit(10)
);

// Update
db.update('users', { age: 31 }, { id: user.id });

// Delete
db.delete('users', { id: user.id });
```

### Transactions

```javascript
// Transfer money between accounts
db.transactionSync(() => {
  const fromAccount = db.findOne('accounts', { id: 1 });
  const toAccount = db.findOne('accounts', { id: 2 });
  
  if (fromAccount.balance < 100) {
    throw new Error('Insufficient funds');
  }
  
  db.update('accounts', 
    { balance: fromAccount.balance - 100 }, 
    { id: 1 }
  );
  
  db.update('accounts', 
    { balance: toAccount.balance + 100 }, 
    { id: 2 }
  );
});
```

### Complex Queries

```javascript
// Find users with orders
const usersWithOrders = db.all(
  SQL.select('users.name', 'COUNT(orders.id) as orderCount')
    .from('users')
    .leftJoin('orders')
    .on('users.id = orders.userId')
    .groupBy('users.id')
    .orderBy('orderCount DESC')
    .limit(10)
);

// Subquery example
const recentOrderUsers = db.all(
  SQL.select('name', 'email')
    .from('users')
    .where({
      id: {
        $in: SQL.select('userId')
          .from('orders')
          .where('createdAt > ?', '2024-01-01')
      }
    })
);

// Complex conditions
const filteredUsers = db.all(
  SQL.select().from('users')
    .where({
      status: 'active',
      age: { $gte: 18, $lte: 65 },
      email: { $like: '%@company.com' }
    })
    .or({ role: 'admin' })
    .orderBy('createdAt DESC')
);
```

### Pagination

```javascript
function getUsers(page = 1, pageSize = 20) {
  const users = db.all(
    SQL.select().from('users')
      .orderBy('name ASC')
      .takePage(page, pageSize)
  );
  
  const total = db.pluck('SELECT COUNT(*) FROM users');
  
  return {
    users,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize)
  };
}

// Get page 1
const result = getUsers(1, 20);
```

### Database Migrations

```javascript
db.migrate([
  // Migration 0: Initial schema
  () => {
    db.createTable({
      tableName: 'users',
      columns: [
        { id: 'INTEGER PRIMARY KEY AUTOINCREMENT' },
        { name: 'TEXT NOT NULL' }
      ]
    });
  },
  
  // Migration 1: Add email column
  () => {
    db.run('ALTER TABLE users ADD COLUMN email TEXT');
  },
  
  // Migration 2: Make email unique
  () => {
    db.createIndex({
      tableName: 'users',
      columns: ['email'],
      unique: true
    });
  },
  
  // Migration 3: Add timestamps
  () => {
    db.run('ALTER TABLE users ADD COLUMN createdAt DATETIME DEFAULT CURRENT_TIMESTAMP');
    db.run('ALTER TABLE users ADD COLUMN updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP');
  }
]);
```

### Batch Operations

```javascript
// Insert multiple rows efficiently
const users = [
  { name: 'John', email: 'john@example.com' },
  { name: 'Jane', email: 'jane@example.com' },
  { name: 'Bob', email: 'bob@example.com' }
];

db.transactionSync(() => {
  for (const user of users) {
    db.insert('users', user);
  }
});

// Or with prepared statement for maximum performance
const stmt = db.prepare('INSERT INTO users (name, email) VALUES (?, ?)');
db.transactionSync(() => {
  for (const user of users) {
    stmt.run(user.name, user.email);
  }
});
```

### Working with Large Result Sets

```javascript
// Use iterate() for memory efficiency
let count = 0;
for (const user of db.iterate('SELECT * FROM users')) {
  // Process one user at a time
  processUser(user);
  count++;
  
  if (count % 1000 === 0) {
    console.log(`Processed ${count} users...`);
  }
}

// Or use each() with callback
db.each(
  'SELECT * FROM users WHERE active = ?', 
  true,
  (user) => {
    processUser(user);
  }
);
```

---

## Tips & Best Practices

1. **Use transactions for multiple related operations** - They ensure data consistency and improve performance.

2. **Leverage statement caching** - The same query string will reuse the prepared statement automatically.

3. **Use the SQL builder for dynamic queries** - It's safer than string concatenation and handles parameters correctly.

4. **Prefer object-based conditions** - They're more readable and less error-prone than raw SQL strings.

5. **Use appropriate query methods**:
   - `get()` for single row
   - `all()` for small result sets
   - `iterate()` for large result sets
   - `pluck()` / `pluckAll()` for single column values

6. **Add indexes for frequently queried columns** - Especially for WHERE, ORDER BY, and JOIN conditions.

7. **Use migrations for schema changes** - They provide a clear history and ensure consistency across environments.

8. **Be careful with async transactions** - `transactionAsyncUnsafe()` requires careful synchronization.

9. **Monitor statement cache growth** - If creating many dynamic queries, consider cache management strategies.

10. **Use metadata storage** - Store application configuration and version information with `setMetaValue()` / `getMetaValue()`.

---

## License

See package license for details.