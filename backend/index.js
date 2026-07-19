const express = require('express');
const cors = require('cors');
const { MongoClient } = require('mongodb');

const app = express();
const port = 3001;

app.use(cors());
const cookieParser = require('cookie-parser');

app.listen(port, () => {
  console.log(`Server is running and listening on http://localhost:${port}`);
});

