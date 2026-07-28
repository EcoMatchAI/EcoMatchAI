const express = require('express');
const connectDb = require('./src/config/db');

const app = express();
app.use(express.json());
const userRoutes = require('./src/routes/userRoutes')
const authRoutes = require('./src/routes/authRoutes');
const productRoutes = require('./src/routes/productRoutes');
const uploadRoutes = require('./src/routes/uploadRoutes');
const sourcingRoutes = require('./src/routes/sourcingRoutes');

app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes)
app.use('/api/product', productRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/sourcing-requests', sourcingRoutes);

app.listen(5000, async () => {
    console.log("Backend started on port 5000");
    await connectDb();
});
