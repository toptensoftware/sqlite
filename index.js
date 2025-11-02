/**
 * @module @toptensoftware/sqlite
 * @description Enhanced SQLite database wrapper built on better-sqlite3 with fluent SQL query builder
 * 
 * This module provides:
 * - Extended Database class with statement caching, transactions, and convenience methods
 * - Fluent SQL query builder with support for complex conditions
 * - Easy-to-use API for common database operations
 * 
 * @example
 * 
 * // Import the module
 * import { Database, SQL } from '@toptensoftware/sqlite';
 * 
 * // Create a database connection
 * const db = new Database('myapp.db');
 * 
 * // Use the SQL builder
 * const users = db.all(
 *   SQL.select().from('users').where({ age: { $gte: 18 } })
 * );
 * 
 * // Use convenience methods
 * db.insert('users', { name: 'John', age: 30 });
 * const user = db.findOne('users', { name: 'John' });
 */

export * from "./SQL.js";
export * from "./Database.js";