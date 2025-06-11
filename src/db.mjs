import 'dotenv/config';
import log from './log.mjs';
import mysql from 'mysql2/promise';

let db;

// Allow injection of a mock pool for testability
export function _setDbPoolForTest(pool) {
    db = pool;
}

if (!db && process.env.DB_HOST && process.env.DB_USER && process.env.DB_PASS && process.env.DB_NAME) {
    try {
        db = mysql.createPool({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASS,
            database: process.env.DB_NAME,
            waitForConnections: true,
            connectionLimit: 10,
            queueLimit: 0
        });
    } catch (err) {
        log.error('Failed to create MySQL connection pool', err);
        throw err;
    }
}

export default db;

export async function getAppToken(appId) {
    const [rows] = await db.query('SELECT token FROM apps WHERE id = ?', [appId]);
    return rows.length ? rows[0].token : null;
}

export async function getAppTitle(appId) {
    const [rows] = await db.query('SELECT title FROM apps WHERE id = ?', [appId]);
    return rows.length ? rows[0].title : null;
}
