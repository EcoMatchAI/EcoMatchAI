const express = require('express');
const connectDb = require('./src/config/db');

const app = express();
app.use(express.json());

connectDb();

app.listen(3000, () => {
    console.log("Server is running on port 3000");
});
