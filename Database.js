import SQLiteDatabase from "better-sqlite3";
import { SQL } from "./SQL.js";

/**
 * Checks if a value is a Promise
 * @private
 * @param {*} promise - The value to check
 * @returns {boolean} True if the value is a Promise, false otherwise
 */
function isPromise(promise) {  
    return !!promise && typeof promise.then === 'function'
}

/**
 * Extended SQLite database class that provides additional functionality over better-sqlite3.
 * Includes statement caching, transaction helpers, and convenience methods for common operations.
 * 
 * @class Database
 * @extends SQLiteDatabase
 * @example
 * 
 * // Create a new database connection
 * const db = new Database('mydb.sqlite');
 * 
 * // Use the SQL builder with the database
 * db.run(SQL.insert('users').values({ name: 'John', age: 30 }));
 * 
 * // Query with caching
 * const user = db.get('SELECT * FROM users WHERE id = ?', 123);
 */
export class Database extends SQLiteDatabase
{
    /**
     * Creates a new Database instance
     * @param {string} filename - Path to the database file, or ':memory:' for in-memory database
     * @param {Object} [mode] - Options object passed to better-sqlite3 constructor
     */
    constructor(filename, mode)
    {
        super(filename, mode);
        /**
         * Error logging function. Defaults to console.error
         * @type {Function}
         */
        this.error = console.error;
    }

    /**
     * Prepares a SQL statement with caching support. Statements are cached for reuse,
     * improving performance when the same query is executed multiple times.
     * 
     * @param {string|SQL} sql - SQL statement string or SQL builder instance
     * @returns {Statement} A prepared statement object from better-sqlite3
     * @throws {Error} If SQL parameter object has parameters already assigned
     * @example
     * 
     * // Prepare and cache a statement
     * const stmt = db.prepareCached('SELECT * FROM users WHERE id = ?');
     * const user = stmt.get(123);
     */
    prepareCached(sql)
    {
        // SQL?
        if (sql instanceof SQL)
        {
            if (sql.params != 0 && sql.params.filter(x => x !== undefined).length)
            {
                throw new Error("Attempt to prepare SQL with parameter assigned");
            }
            sql = sql.sql;
        }
    
        // Optimization for tight single statment loops
        if (this.last_sql == sql)
            return this.last_stmt;
    
        // Get and cache statement
        if (!this.statement_cache)
            this.statement_cache = new Map();
        let stmt = this.statement_cache.get(sql);
        if (!stmt)
        {
            try
            {
                stmt = this.prepare(sql);
                this.statement_cache.set(sql, stmt);
            }
            catch (err)
            {
                this.error && !err.message.match(/no such table: tears/) && this.error(err.message);
                throw err;
            }
        }
    
        // Cache the most recent
        this.last_stmt = stmt;
        this.last_sql = sql;
    
        return stmt;
    }

    /**
     * Internal method to prepare SQL statement and parameters.
     * Handles both SQL builder objects and raw SQL strings with parameters.
     * 
     * @private
     * @param {...*} arguments - SQL statement and optional parameters
     * @returns {Object} Object containing prepared statement and parameters
     * @returns {Statement} return.stmt - The prepared statement
     * @returns {Array} return.params - Array of parameter values
     */
    _prep()
    {
        // Create params
        let sql;
        let params;
        if (arguments[0] instanceof SQL)
        {
            sql = arguments[0].sql;
            params = arguments[0].params;
            this._fndata = arguments[0]._fndata;
        }
        else
        {
            sql = arguments[0];
            params = Array.prototype.slice.call(arguments, 1);
            delete this._fndata;
        }
    
        // Get prepared statement
        let stmt;
        if (this.last_sql == sql)
            stmt = this.last_stmt;
        else
            stmt = this.prepareCached(sql);

        return { stmt, params };
    }

    /**
     * Executes a SQL statement that modifies the database (INSERT, UPDATE, DELETE).
     * 
     * @param {string|SQL} sql - SQL statement or SQL builder instance
     * @param {...*} params - Parameters to bind to the SQL statement
     * @returns {Object} Result object with info about the operation (lastInsertRowid, changes)
     * @example
     * 
     * // Insert a row
     * const result = db.run('INSERT INTO users (name, age) VALUES (?, ?)', 'John', 30);
     * console.log(result.lastInsertRowid);
     * 
     * // Using SQL builder
     * db.run(SQL.insert('users').values({ name: 'Jane', age: 25 }));
     */
    run()
    {
        let p = this._prep.apply(this, arguments);
        return p.stmt.run.apply(p.stmt, p.params);
    }
    
    /**
     * Executes a SQL statement and returns the first row of results.
     * 
     * @param {string|SQL} sql - SQL statement or SQL builder instance
     * @param {...*} params - Parameters to bind to the SQL statement
     * @returns {Object|undefined} First row as an object, or undefined if no results
     * @example
     * 
     * // Get a single user
     * const user = db.get('SELECT * FROM users WHERE id = ?', 123);
     * 
     * // Using SQL builder
     * const user = db.get(SQL.select().from('users').where({ id: 123 }));
     */
    get()
    {
        let p = this._prep.apply(this, arguments);
        return p.stmt.get.apply(p.stmt, p.params);
    }

    /**
     * Executes a SQL statement and returns a single column value from the first row.
     * 
     * @param {string|SQL} sql - SQL statement or SQL builder instance
     * @param {...*} params - Parameters to bind to the SQL statement
     * @returns {*} The value of the first column in the first row, or undefined if no results
     * @example
     * 
     * // Get just the user's name
     * const name = db.pluck('SELECT name FROM users WHERE id = ?', 123);
     */
    pluck()
    {
        let p = this._prep.apply(this, arguments);
        p.stmt.pluck(true);
        return p.stmt.get.apply(p.stmt, p.params);
    }
    
    /**
     * Executes a SQL statement and returns all rows as an array of objects.
     * 
     * @param {string|SQL} sql - SQL statement or SQL builder instance
     * @param {...*} params - Parameters to bind to the SQL statement
     * @returns {Array<Object>} Array of row objects
     * @example
     * 
     * // Get all users over 18
     * const adults = db.all('SELECT * FROM users WHERE age > ?', 18);
     */
    all()
    {
        let p = this._prep.apply(this, arguments);
        p.stmt.pluck(false);
        return p.stmt.all.apply(p.stmt, p.params);
    }
    
    /**
     * Executes a SQL statement and returns all rows as an array of values from the first column.
     * 
     * @param {string|SQL} sql - SQL statement or SQL builder instance
     * @param {...*} params - Parameters to bind to the SQL statement
     * @returns {Array<*>} Array of values from the first column
     * @example
     * 
     * // Get all user IDs
     * const userIds = db.pluckAll('SELECT id FROM users');
     */
    pluckAll()
    {
        let p = this._prep.apply(this, arguments);
        p.stmt.pluck(true);
        return p.stmt.all.apply(p.stmt, p.params);
    }
    
    /**
     * Executes a SQL statement and returns an iterator over the result rows.
     * Useful for processing large result sets without loading all rows into memory.
     * 
     * @param {string|SQL} sql - SQL statement or SQL builder instance
     * @param {...*} params - Parameters to bind to the SQL statement
     * @returns {Iterator<Object>} Iterator over result rows
     * @example
     * 
     * // Iterate over large result set
     * for (const user of db.iterate('SELECT * FROM users')) {
     *   console.log(user.name);
     * }
     */
    iterate()
    {
        let p = this._prep.apply(this, arguments);
        return p.stmt.iterate.apply(p.stmt, p.params);
    }

    /**
     * Executes a SQL statement and calls a callback function for each result row.
     * 
     * @param {string|SQL} sql - SQL statement or SQL builder instance
     * @param {...*} params - Parameters to bind to the SQL statement
     * @param {Function} callback - Function called for each row with the row object as parameter
     * @example
     * 
     * // Process each user
     * db.each('SELECT * FROM users WHERE age > ?', 18, (user) => {
     *   console.log(user.name);
     * });
     */
    each()
    {
        let args = Array.prototype.slice.call(arguments, 0, arguments.length - 1);
        let callback = arguments[arguments.length - 1];
        let p = this._prep.apply(this, args);
        let iter =  p.stmt.iterate.apply(p.stmt, p.params);
        for (let r of iter)
        {
            callback(r);
        }
    }

    /**
     * Internal method for storing custom function data that bypasses SQL parameters.
     * Used by the fndata() method in SQL builder.
     * 
     * @param {*} data - Data to store
     * @returns {number} Index of the stored data
     * @private
     */
    data = function(data)
    {
        if (this._data == null)
        {
            this._data = [];
        }
        this._data.push(data);
        return this._data.length - 1;
    }   

    /**
     * Deprecated transaction method. Throws an error directing users to use newer methods.
     * 
     * @deprecated Use transactionSync, transactionAsyncUnsafe, or makeTransaction instead
     * @throws {Error} Always throws error with deprecation message
     */
    transaction = function()
    {
        throw new Error("transaction() has been deprecated, use transactionSync, transactionAsyncUnsafe or makeTransaction");
    }

    /**
     * Executes a synchronous callback function within a database transaction.
     * If the callback throws an error, the transaction is rolled back.
     * 
     * @param {Function} callback - Synchronous callback function to execute within transaction
     * @returns {*} The return value of the callback function
     * @throws {Error} If callback returns a Promise or if an error occurs during execution
     * @example
     * 
     * // Perform multiple operations atomically
     * db.transactionSync(() => {
     *   db.run('INSERT INTO users (name) VALUES (?)', 'John');
     *   db.run('UPDATE accounts SET balance = balance - 100 WHERE userId = ?', 1);
     * });
     */
    transactionSync(callback)
    {
        let wasInTransaction = this._inTransaction;
        this._inTransaction = true;
        this.run("SAVEPOINT tearstx");
        try
        {
            let retv = callback();

            if (isPromise(retv))
                throw new Error("The callback to transactionSync returned a promise.  Use transactionAsyncUnsafe insteaed")

            this.run("RELEASE SAVEPOINT tearstx");
            return retv;
        }
        catch (err)
        {
            this.run("ROLLBACK TO SAVEPOINT tearstx");
            this.error && this.error(err.message);
            throw err;
        }
        finally
        {
            this._inTransaction = wasInTransaction;
        }
    }

    _inTransaction = false;

    /**
     * Rollback the current transaction
     */
    rollback()
    {
        if (!this._inTransaction)
            throw new Error("Not currently in a transaction, can't rollback");
        
        this.run("ROLLBACK TO SAVEPOINT tearstx");
        this.run("SAVEPOINT tearstx");
    }

    /**
     * Wraps an async callback function in a transaction. This method is unsafe
     * in that it's the client's responsibility to ensure all operations executed
     * against the db instance belong to the transaction and not other requests.
     * 
     * @param {Function} callback - Async callback to perform transaction operations
     * @returns {Promise<*>} A promise that resolves with the callback's return value
     * @example
     * 
     * // Perform async operations in a transaction (use with caution)
     * await db.transactionAsyncUnsafe(async () => {
     *   db.run('INSERT INTO users (name) VALUES (?)', 'John');
     *   await someAsyncOperation();
     *   db.run('UPDATE accounts SET balance = balance - 100 WHERE userId = ?', 1);
     * });
     */
    async transactionAsyncUnsafe(callback)
    {
        this.run("SAVEPOINT tearstx");
        try
        {
            let retv = callback();

            if (isPromise(retv))
                retv = await retv;

            this.run("RELEASE SAVEPOINT tearstx");
            return retv;
        }
        catch (err)
        {
            this.run("ROLLBACK TO SAVEPOINT tearstx");
            this.error && this.error(err.message);
            throw err;
        }
    }

    /**
     * Convenience method to insert a row into a table.
     * 
     * @param {string} table - Name of the table to insert into
     * @param {Object} values - Object mapping column names to values
     * @returns {Object} Result object with info about the operation
     * @example
     * 
     * // Insert a new user
     * const result = db.insert('users', { name: 'John', age: 30 });
     * console.log(result.lastInsertRowid);
     */
	insert(table, values)
	{
		return this.run(SQL
            .insert(table)
            .values(values)
            );
	}

    /**
     * Convenience method to delete rows from a table.
     * 
     * @param {string} table - Name of the table to delete from
     * @param {Object|string|SQL} condition - WHERE condition (object map, SQL string, or SQL builder)
     * @returns {Object} Result object with info about the operation
     * @example
     * 
     * // Delete a specific user
     * db.delete('users', { id: 123 });
     * 
     * // Delete users over 65
     * db.delete('users', { age: { $gt: 65 } });
     */
	delete(table, condition)
	{
		return this.run(SQL
            .delete(table)
            .where(condition)
            );
	}

    /**
     * Convenience method to update rows in a table.
     * 
     * @param {string} table - Name of the table to update
     * @param {Object} values - Object mapping column names to new values
     * @param {Object|string|SQL} condition - WHERE condition (object map, SQL string, or SQL builder)
     * @returns {Object} Result object with info about the operation
     * @example
     * 
     * // Update a user's age
     * db.update('users', { age: 31 }, { id: 123 });
     */
	update(table, values, condition)
	{
		return this.run(SQL
            .update(table)
            .set(values)
            .where(condition)
        );
	}

    /**
     * Convenience method to insert a row, or replace it if it already exists.
     * 
     * @param {string} table - Name of the table to insert or replace into
     * @param {Object} values - Object mapping column names to values
     * @returns {Object} Result object with info about the operation
     * @example
     * 
     * // Insert or replace a user
     * db.insertOrReplace('users', { id: 123, name: 'John', age: 30 });
     */
	insertOrReplace(table, values)
	{
		return this.run(SQL
            .insertOrReplace(table)
            .values(values)
        );
	}

    /**
     * Convenience method to insert a row, or ignore if it already exists.
     * 
     * @param {string} table - Name of the table to insert or ignore into
     * @param {Object} values - Object mapping column names to values
     * @returns {Object} Result object with info about the operation
     * @example
     * 
     * // Insert only if user doesn't exist
     * db.insertOrIgnore('users', { id: 123, name: 'John', age: 30 });
     */
	insertOrIgnore(table, values)
	{
		return this.run(SQL
            .insertOrIgnore(table)
            .values(values)
        );
	}

    /**
     * Convenience method to find a single row matching a condition.
     * 
     * @param {string} table - Name of the table to query
     * @param {Object|string|SQL} condition - WHERE condition (object map, SQL string, or SQL builder)
     * @returns {Object|undefined} The first matching row, or undefined if not found
     * @example
     * 
     * // Find user by ID
     * const user = db.findOne('users', { id: 123 });
     * 
     * // Find user by multiple conditions
     * const user = db.findOne('users', { name: 'John', age: 30 });
     */
    findOne(table, condition)
    {
        return this.get(SQL.select().from(table).where(condition));
    }

    /**
     * Convenience method to find all rows matching a condition.
     * 
     * @param {string} table - Name of the table to query
     * @param {Object|string|SQL} condition - WHERE condition (object map, SQL string, or SQL builder)
     * @returns {Array<Object>} Array of matching rows
     * @example
     * 
     * // Find all adult users
     * const adults = db.findMany('users', { age: { $gte: 18 } });
     */
    findMany(table, condition)
    {
        return this.all(SQL.select().from(table).where(condition));
    }

    /**
     * Creates a new table with optional indexes.
     * 
     * @param {Object} options - Table creation options
     * @param {string} options.tableName - Name of the table to create
     * @param {Array<Object>} options.columns - Array of column definitions (each with single key-value pair)
     * @param {boolean} [options.temp] - Whether to create a temporary table
     * @param {Array<Object>} [options.indicies] - Array of index definitions
     * @example
     * 
     * // Create a users table with indexes
     * db.createTable({
     *   tableName: 'users',
     *   columns: [
     *     { id: 'INTEGER PRIMARY KEY AUTOINCREMENT' },
     *     { name: 'TEXT NOT NULL' },
     *     { email: 'TEXT UNIQUE' }
     *   ],
     *   indicies: [
     *     { columns: [{ name: 'ASC' }] },
     *     { columns: [{ email: 'ASC' }], unique: true }
     *   ]
     * });
     */
    createTable(options)
	{
		this.transactionSync(() => {

			// Create the table
			this.run(SQL.createTable(options));

			// Create the indicies
			if (options.indicies)
			{
                for (let indexDef of options.indicies)
                {
					// Use table name if not explicitly set on index definition
					if (!indexDef.tableName)
						indexDef.tableName = options.tableName;
	
					// Run it
					this.run(SQL.createIndex(indexDef));
                }
			}
		});
	}

    /**
     * Creates a new index on a table.
     * 
     * @param {Object} options - Index creation options
     * @param {string} options.tableName - Name of the table to create index on
     * @param {Array<Object|string>} options.columns - Array of column definitions
     * @param {boolean} [options.unique] - Whether the index should enforce uniqueness
     * @param {string} [options.indexName] - Name of the index (auto-generated if not provided)
     * @returns {Object} Result object with info about the operation
     * @example
     * 
     * // Create a unique index on email
     * db.createIndex({
     *   tableName: 'users',
     *   unique: true,
     *   columns: [{ email: 'ASC' }]
     * });
     */
	createIndex(options)
	{
		return this.run(SQL.createIndex(options));
	}

    /**
     * Gets a metadata value from the internal 'tears' metadata table.
     * 
     * @param {string} key - The metadata key to retrieve
     * @param {*} [defaultValue] - Default value to return if key doesn't exist
     * @returns {*} The stored value, or defaultValue if not found
     * @example
     * 
     * // Get schema version
     * const version = db.getMetaValue('schemaVersion', 0);
     */
	getMetaValue(key, defaultValue)
	{
		try
		{
			let value = this.pluck(SQL.select("value")
				.from("tears")
				.where({
					key: key
				}));

			if (value === undefined)
				return defaultValue;

			return value;
		}
		catch (e)
		{
			if (e.message.indexOf("no such table")<0)
				throw e;
			return defaultValue;
		}
	}

    /**
     * Sets a metadata value in the internal 'tears' metadata table.
     * Creates the table if it doesn't exist.
     * 
     * @param {string} key - The metadata key to set
     * @param {*} value - The value to store
     * @returns {Object} Result object with info about the operation
     * @example
     * 
     * // Store schema version
     * db.setMetaValue('schemaVersion', 5);
     */
	setMetaValue(key, value)
	{
        // better-sqlite doesn't support booleans
        if (typeof(value) === 'boolean')
            value = value ? 1 : 0;

        let self = this;
		this.transactionSync(() => {
			try
			{
				saveValue();
			}
			catch (err)
			{
				if (err.message.indexOf("no such table") < 0)
					throw err;

				this.run(SQL.createTable({
					tableName: "tears",
                    standardColumns: false,
					columns:
					[
						{ key: "STRING" },
						{ value: "STRING" },
					],
				}));

				this.run(SQL.createIndex({
					tableName: "tears",
					unique: true,
					columns: [ { key: "ASC" } ]
				}));

				saveValue();
			}

			function saveValue()
			{
				return self.run(SQL
                    .insertOrReplace("tears")
                    .values({ key, value })
				);
			}
		})
	}

    getMetaValues()
    {
        let rows = this.all("SELECT * FROM tears");
        let result = {};
        for (let r of rows)
        {
            result[r.key] = r.value;
        }
        return result;
    }

    setMetaValues(values)
    {
        this.transactionSync(() => {
            for (let k of Object.keys(values))
            {
                this.setMetaValue(k, values[k]);
            }
        });
    }

    /**
     * Executes database migration steps. Each step is a function that performs schema changes.
     * Migration steps are tracked in metadata and only executed once.
     * 
     * @param {Array<Function>} steps - Array of migration functions
     * @example
     * 
     * // Define and run migrations
     * db.migrate([
     *   // Step 0: Create initial schema
     *   () => {
     *     db.createTable({
     *       tableName: 'users',
     *       columns: [{ id: 'INTEGER PRIMARY KEY' }, { name: 'TEXT' }]
     *     });
     *   },
     *   // Step 1: Add email column
     *   () => {
     *     db.run('ALTER TABLE users ADD COLUMN email TEXT');
     *   }
     * ]);
     */
    migrate(steps)
	{
		this.transactionSync(() => {

			// Find current step
			let currentStep = parseInt(this.getMetaValue("migrationStep", 0));

			if (currentStep < steps.length)
			{
				// Process steps
				for (let i=currentStep; i < steps.length; i++)
				{
					steps[i]();
				}

				// Stop current step
				this.setMetaValue("migrationStep", steps.length);
			}
		});
	}
}

/**
 * Reference to the original better-sqlite3 transaction method.
 * Use this for creating reusable transaction functions.
 * 
 * @type {Function}
 * @example
 * 
 * // Create a reusable transaction function
 * const transferMoney = db.makeTransaction((fromId, toId, amount) => {
 *   db.run('UPDATE accounts SET balance = balance - ? WHERE id = ?', amount, fromId);
 *   db.run('UPDATE accounts SET balance = balance + ? WHERE id = ?', amount, toId);
 * });
 * 
 * // Use it
 * transferMoney(1, 2, 100);
 */
Database.prototype.makeTransaction = SQLiteDatabase.prototype.transaction;