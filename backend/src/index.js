const express = require('express');
const connectDb = require('./config/db');

const app = express();
app.use(express.json());

connectDb();
const sellerRoutes = require('./routes/sellerRoutes')
app.use('/api/seller',sellerRoutes)
app.listen(5000,async ()=>{
    console.log("Backend started")
    await connectDb()
})



