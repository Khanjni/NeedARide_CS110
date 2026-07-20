const express = require('express');
const cors = require('cors');
const { MongoClient, ObjectId } = require('mongodb');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('../public'));

const port = 3000;

const url = 'mongodb+srv://mmora272:goat123@cs110.0wvkedh.mongodb.net/?appName=cs110';
const client = new MongoClient(url);
const dbName = 'NeedARide';
let db;

async function connectToDb() {
  try {
    await client.connect();
    console.log('Successfully connected to MongoDB');
    db = client.db(dbName);
  } catch (err) {
    console.error('Failed to connect to MongoDB', err);
    process.exit(1);
  }
}
connectToDb();

// GET endpoint for all listings
app.get('/api/listings', async (req, res) => {
  console.log ('Request received for /api/listings');
  const allListings = await db.collection('listings').find({}).toArray();
  res.json(allListings);
});

// GET endpoint for a listing via ID
app.get('/api/listings/:id', async (req, res) => {
  const carId = req.params.id;
  const currListing = await db.collection('listings').findOne({ _id: new ObjectId(carId)});
  if (!currListing) {
    return res.status(404).json ({error: 'Vehicle not found :(' });
  } else {
    currListing._id = currListing._id.toString();
    res.json(currListing);
  }
});

// POST for adding a listing
app.post('/api/listings', async (req, res) => {
  const { title, type, location, pricePerDay, mpg, seats, transmission, ownerName } = req.body;
  const newListing = { title, type, location, pricePerDay: Number(pricePerDay), mpg: Number(mpg), seats: Number(seats), transmission, ownerName, rating: 0.0, reviewCount: 0};
  const result = await db.collection('listings').insertOne(newListing);
  res.status(201).json({ message: 'Listing was added!'});
});


// POST endpoint for registering a user
app.post('/api/auth/register', async (req, res) => { 
  const { name, email, password } = req.body;
  if ( name == '' || email == '' || password == '') {
    return res.status(400).json({error: 'All fields are required to proceed.'});
  }
  const newUser = { name, email, password };
  const userResult = await db.collection('users').insertOne(newUser);
  res.status(201).json({ message: 'User was registered successfully!', userId: userResult.insertedId.toString()});
});

// POST endpoint for logging in
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  const user = await db.collection('users').findOne({ email, password });
  if (!user) {
    return res.status(401).json({ error: 'There is an invalid username or password that was entered.'});
  }
  res.json({ message: "Your login was successful!", userId: user._id.toString()});
});

// GET endpoint for profile listings
app.get('/api/users/:userId/listings', async (req, res) => {
  const userId = req.params.userId;
  const myListings = await db.collection('listings').find({ ownerID: userId}).toArray();
  res.json(myListings);
});

// GET endpoint for profile bookings
app.get('/api/users/:userId/bookings', async (req, res) => {
  const userId = req.params.userId;
  const myBookings = await db.collection('bookings').find({ rentersID: userId}).toArray();
  res.json(myBookings);
});

// POST endpoint for updating profile data
app.post('/api/users/:userId', async (req, res) => {
  const userId = req.params.userId;
  const { name, bio } = req.body;
  await db.collection('users').updateOne( { _id: new ObjectId(userId) }, { $set: { name , bio }});
  res.json({ message: 'Profile was updated'});
});

// GET endpoint for user messages
app.get('/api/users/:userId/threads', async (req, res) => {
  const userId = req.params.userId;
  const msgThreads = await db.collection('threads').find({ $or: [{ rentersID: userId } , { ownersID: userId }]}).toArray();
  res.json(msgThreads);
});

// POST endpoint for updating user messages
app.post('/api/threads/:id/messages', async (req, res) => {
  const threadID  = req.params.id;
  const { from, text, time } = req.body;
  await db.collection('threads').updateOne( { _id: new ObjectId(threadID) }, { $push: { messages: { from, text, time }}});
  res.json( { message: 'A message was sent.' });
});

app.listen(port, () => {
  console.log(`Backend server is running and listening on http://localhost:${port}`);
});