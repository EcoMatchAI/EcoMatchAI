const express = require('express');
const connectDb = require('./src/config/db');

const app = express();
app.use(express.json());

const userRoutes = require('./src/routes/userRoutes')
app.use('/api/user',userRoutes)

app.listen(5000, async () => {
    console.log("Backend started on port 5000");
    await connectDb();
});
