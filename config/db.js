// const mysql = require('mysql2');

// //Database connection 
// const pool = mysql.createPool({
//     host: 'localhost',
//     user: 'root',
//     password: '',
//     database: 'bhatti_petrolium',
//     waitForConnections: true,
//     connectionLimit: 10,
//     queueLimit: 0

// });

// //to make pool sync/await
// const db = pool.promise();

// console.log("MySQL Database pool created successfully");

// module.exports = db;


const mysql = require('mysql2');

// Dynamic Database connection (Cloud & Local Support)
const pool = mysql.createPool({
    host: process.env.MYSQLHOST || process.env.DB_HOST || 'localhost',
    user: process.env.MYSQLUSER || process.env.DB_USER || 'root',
    password: process.env.MYSQLPASSWORD || process.env.DB_PASSWORD || '',
    database: process.env.MYSQLDATABASE || process.env.DB_NAME || 'bhatti_petrolium',
    port: process.env.MYSQLPORT || process.env.DB_PORT || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Make pool async/await (promise-based)
const db = pool.promise();

console.log("MySQL Database pool created successfully");

module.exports = db;