const mongoose = require('mongoose');
const dns = require('dns');
require("dotenv").config();

// Fix Node.js c-ares DNS resolution issue on Windows for mongodb+srv URIs
try {
    dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);
} catch (e) {
    // Ignore if not supported
}

const connectDb = async () => {
    const mongoUri = process.env.MONGO_URI || 'mongodb+srv://eco-matchai:aajc@cluster0.ad4kkpr.mongodb.net/ecomatch';
    try {
        const conn = await mongoose.connect(mongoUri);
        console.log("Database connected - " + conn.connection.host);
        return conn;
    } catch (error) {
        console.error("Database connection error - " + error.message);
        throw error;
    }
}

module.exports = connectDb;

