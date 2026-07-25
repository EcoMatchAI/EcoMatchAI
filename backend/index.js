const express = require('express');
const connectDb = require('./src/config/db');

const app = express();
app.use(express.json());

const sellerRoutes = require('./src/routes/sellerRoutes')
app.use('/api/seller',sellerRoutes)

app.listen(5000, async () => {
    console.log("Backend started on port 5000");
    await connectDb();
});