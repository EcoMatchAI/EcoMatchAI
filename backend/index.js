require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDb = require('./src/config/db');
const { verifyMailer } = require('./src/util/emailService');
const { initSocket } = require('./src/socket');

const app = express();
app.use(cors());
app.use(express.json());

const userRoutes = require('./src/routes/userRoutes');
const authRoutes = require('./src/routes/authRoutes');
const productRoutes = require('./src/routes/productRoutes');
const uploadRoutes = require('./src/routes/uploadRoutes');
const sourcingRoutes = require('./src/routes/sourcingRequestRoutes');
const logisticsRoutes = require('./src/routes/shipmentRoutes');

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/product', productRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/sourcing-requests', sourcingRoutes);
app.use('/api/logistics', logisticsRoutes);

// Unknown route -> JSON, not Express's HTML error page (the frontend parses JSON).
app.use((req, res) => {
    res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` });
});

// Last-resort handler, e.g. multer file-size / file-type errors.
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err.message);
    res.status(err.status || 500).json({ message: err.message || 'Internal server error' });
});

const PORT = process.env.PORT || 5000;
const server = http.createServer(app);
const io = initSocket(server);

// Connect to Mongo BEFORE accepting traffic. Previously connectDb() ran inside the
// listen callback, so a connection failure became an unhandled rejection that
// killed the process right after it printed "Backend started".
const start = async () => {
    try {
        await connectDb();
    } catch (error) {
        console.error('Could not start: database connection failed.');
        process.exit(1);
    }

    await verifyMailer(); // logs loudly at boot if OTP email will not work

    server.listen(PORT, async () => {
    console.log(`Server & WebSocket running on port ${PORT}`);
    await connectDb();
});
};

start();
