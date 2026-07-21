const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const { randomBytes } = require('crypto');
const { MongoClient, ObjectId } = require('mongodb');

const port = Number(process.env.PORT) || 3000;
const dbName = process.env.MONGODB_DB || 'NeedARide';

function validId(id) {
  return ObjectId.isValid(id);
}

function requireSameUser(req, res, next) {
  if (req.userId !== req.params.userId) {
    return res.status(403).json({ error: 'You cannot access another user\'s account.' });
  }
  next();
}

function createApp(db) {
  const app = express();
  app.use(cors());
  app.use(express.json());
  app.use(express.static('../public'));

  async function createSession(userId) {
    const token = randomBytes(32).toString('hex');
    await db.collection('sessions').insertOne({ token, userId, createdAt: new Date() });
    return token;
  }

  async function sessionUserId(req) {
    const authorization = req.get('authorization') || '';
    const token = authorization.startsWith('Bearer ') ? authorization.slice(7) : '';
    const session = token ? await db.collection('sessions').findOne({ token }) : null;
    return session && validId(session.userId) ? session.userId : null;
  }

  async function requireUser(req, res, next) {
    const userId = await sessionUserId(req);
    if (!userId) {
      return res.status(401).json({ error: 'Sign in is required.' });
    }
    req.userId = userId;
    next();
  }

  app.get('/api/listings', async (req, res) => {
    const allListings = await db.collection('listings').find({}).toArray();
    res.json(allListings);
  });

  app.get('/api/listings/:id', async (req, res) => {
    if (!validId(req.params.id)) {
      return res.status(400).json({ error: 'Invalid vehicle ID.' });
    }
    const listing = await db.collection('listings').findOne({ _id: new ObjectId(req.params.id) });
    if (!listing) {
      return res.status(404).json({ error: 'Vehicle not found.' });
    }
    const currentUserId = await sessionUserId(req);
    const reviews = await db.collection('reviews').find({ listingId: req.params.id }).toArray();
    const displayedReviews = reviews.map(({ helpfulBy = [], notHelpfulBy = [], ...review }) => ({
      ...review,
      helpfulCount: helpfulBy.length,
      notHelpfulCount: notHelpfulBy.length,
      helpfulByCurrentUser: Boolean(currentUserId && helpfulBy.includes(currentUserId)),
      notHelpfulByCurrentUser: Boolean(currentUserId && notHelpfulBy.includes(currentUserId)),
      isOwnReview: Boolean(currentUserId && review.renterId === currentUserId),
    }));
    res.json({ ...listing, reviews: displayedReviews });
  });

  app.post('/api/listings', async (req, res) => {
    const { title, type, location, pricePerDay, mpg, seats, transmission, ownerName } = req.body;
    const newListing = {
      title,
      type,
      location,
      pricePerDay: Number(pricePerDay),
      mpg: Number(mpg),
      seats: Number(seats),
      transmission,
      ownerName,
      rating: 0,
      reviewCount: 0,
    };
    await db.collection('listings').insertOne(newListing);
    res.status(201).json({ message: 'Listing was added!' });
  });

  app.post('/api/auth/register', async (req, res) => {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'All fields are required to proceed.' });
    }
    const presentUser = await db.collection('users').findOne({ email });
    if (presentUser) {
      return res.status(400).json({ error: 'Account already exists with the email entered.' });
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const newUser = {
      name,
      email,
      password: passwordHash,
      bio: '',
      profilePhoto: '',
      reputationScore: 0,
      reviewCount: 0,
    };
    const result = await db.collection('users').insertOne(newUser);
    const token = await createSession(result.insertedId.toString());
    res.status(201).json({
      message: 'User was registered successfully!',
      userId: result.insertedId.toString(),
      token,
    });
  });

  app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    const user = await db.collection('users').findOne({ email });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: 'There is an invalid username or password that was entered.' });
    }
    const token = await createSession(user._id.toString());
    res.json({ message: 'Your login was successful!', userId: user._id.toString(), token });
  });

  app.get('/api/users/:userId', requireUser, requireSameUser, async (req, res) => {
    const user = await db.collection('users').findOne({ _id: new ObjectId(req.userId) });
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }
    const { password, ...profile } = user;
    res.json(profile);
  });

  app.patch('/api/users/:userId', requireUser, requireSameUser, async (req, res) => {
    const name = typeof req.body.name === 'string' ? req.body.name.trim() : '';
    const bio = typeof req.body.bio === 'string' ? req.body.bio.trim() : '';
    const profilePhoto = typeof req.body.profilePhoto === 'string' ? req.body.profilePhoto.trim() : '';
    if (!name) {
      return res.status(400).json({ error: 'Name is required.' });
    }
    await db.collection('users').updateOne(
      { _id: new ObjectId(req.userId) },
      { $set: { name, bio, profilePhoto } }
    );
    res.json({ message: 'Profile was updated.', name, bio, profilePhoto });
  });

  app.get('/api/users/:userId/listings', requireUser, requireSameUser, async (req, res) => {
    const listings = await db.collection('listings').find({ ownerID: req.userId }).toArray();
    res.json(listings);
  });

  app.get('/api/users/:userId/bookings', requireUser, requireSameUser, async (req, res) => {
    const bookings = await db.collection('bookings').find({ rentersID: req.userId }).toArray();
    res.json(bookings);
  });

  app.post('/api/bookings', requireUser, async (req, res) => {
    const { listingId, startDate, endDate } = req.body;
    if (!validId(listingId)) {
      return res.status(400).json({ error: 'A valid vehicle is required.' });
    }
    const listing = await db.collection('listings').findOne({ _id: new ObjectId(listingId) });
    if (!listing || !listing.ownerID || !validId(listing.ownerID)) {
      return res.status(400).json({ error: 'This vehicle cannot be booked yet.' });
    }
    if (listing.ownerID === req.userId) {
      return res.status(400).json({ error: 'You cannot book your own vehicle.' });
    }
    const booking = {
      listingId,
      ownersID: listing.ownerID,
      rentersID: req.userId,
      startDate: startDate || new Date().toISOString().slice(0, 10),
      endDate: endDate || startDate || new Date().toISOString().slice(0, 10),
      status: 'Requested',
      createdAt: new Date(),
    };
    const result = await db.collection('bookings').insertOne(booking);
    const bookingId = result.insertedId.toString();
    const thread = {
      bookingId,
      listingId,
      ownersID: listing.ownerID,
      rentersID: req.userId,
      messages: [],
      createdAt: new Date(),
    };
    const threadResult = await db.collection('threads').insertOne(thread);
    res.status(201).json({ bookingId, threadId: threadResult.insertedId.toString(), status: booking.status });
  });

  app.patch('/api/bookings/:id/status', requireUser, async (req, res) => {
    if (!validId(req.params.id)) {
      return res.status(400).json({ error: 'Invalid booking ID.' });
    }
    const booking = await db.collection('bookings').findOne({ _id: new ObjectId(req.params.id) });
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found.' });
    }
    if (booking.ownersID !== req.userId) {
      return res.status(403).json({ error: 'Only the vehicle owner can update this booking.' });
    }
    const allowedStatuses = ['Confirmed', 'Completed'];
    if (!allowedStatuses.includes(req.body.status)) {
      return res.status(400).json({ error: 'Invalid booking status.' });
    }
    await db.collection('bookings').updateOne(
      { _id: booking._id },
      { $set: { status: req.body.status } }
    );
    res.json({ message: 'Booking status was updated.', status: req.body.status });
  });

  app.get('/api/users/:userId/threads', requireUser, requireSameUser, async (req, res) => {
    const threads = await db.collection('threads').find({
      $or: [{ rentersID: req.userId }, { ownersID: req.userId }],
    }).toArray();
    const users = db.collection('users');
    const listings = db.collection('listings');
    const decoratedThreads = await Promise.all(threads.map(async (thread) => {
      const otherUserId = thread.ownersID === req.userId ? thread.rentersID : thread.ownersID;
      const [otherUser, listing] = await Promise.all([
        users.findOne({ _id: new ObjectId(otherUserId) }),
        listings.findOne({ _id: new ObjectId(thread.listingId) }),
      ]);
      return {
        ...thread,
        otherPerson: otherUser ? otherUser.name : 'NeedARide user',
        listingTitle: listing ? listing.title : 'Vehicle',
      };
    }));
    res.json(decoratedThreads);
  });

  app.post('/api/threads/:id/messages', requireUser, async (req, res) => {
    if (!validId(req.params.id)) {
      return res.status(400).json({ error: 'Invalid conversation ID.' });
    }
    const thread = await db.collection('threads').findOne({ _id: new ObjectId(req.params.id) });
    if (!thread) {
      return res.status(404).json({ error: 'Conversation not found.' });
    }
    if (thread.ownersID !== req.userId && thread.rentersID !== req.userId) {
      return res.status(403).json({ error: 'You cannot access this conversation.' });
    }
    const booking = await db.collection('bookings').findOne({ _id: new ObjectId(thread.bookingId) });
    if (!booking || booking.ownersID !== thread.ownersID || booking.rentersID !== thread.rentersID) {
      return res.status(409).json({ error: 'This conversation is not connected to a valid booking.' });
    }
    const text = typeof req.body.text === 'string' ? req.body.text.trim() : '';
    if (!text) {
      return res.status(400).json({ error: 'Message text is required.' });
    }
    const message = { senderId: req.userId, text, sentAt: new Date() };
    await db.collection('threads').updateOne(
      { _id: thread._id },
      { $push: { messages: message } }
    );
    res.status(201).json(message);
  });

  app.get('/api/listings/:id/review-eligibility', requireUser, async (req, res) => {
    if (!validId(req.params.id)) {
      return res.status(400).json({ error: 'Invalid vehicle ID.' });
    }
    const user = await db.collection('users').findOne({ _id: new ObjectId(req.userId) });
    const account = {
      userId: req.userId,
      accountEmail: user ? user.email : '',
      accountName: user ? user.name : '',
      listingId: req.params.id,
    };
    const bookings = await db.collection('bookings').find({
      listingId: req.params.id,
      rentersID: req.userId,
    }).toArray();
    const completed = bookings.filter((booking) => booking.status === 'Completed');
    for (const booking of completed) {
      const existingReview = await db.collection('reviews').findOne({ bookingId: booking._id.toString() });
      if (!existingReview) {
        return res.json({ eligible: true, bookingId: booking._id.toString(), ...account });
      }
    }
    if (completed.length > 0) {
      return res.json({ eligible: false, reason: 'You have already reviewed this completed booking.', ...account });
    }
    if (bookings.length > 0) {
      return res.json({ eligible: false, reason: 'You can review this vehicle after your booking is completed.', ...account });
    }
    res.json({ eligible: false, reason: 'Only a renter with a completed booking can review this vehicle.', ...account });
  });

  app.post('/api/bookings/:id/review', requireUser, async (req, res) => {
    if (!validId(req.params.id)) {
      return res.status(400).json({ error: 'Invalid booking ID.' });
    }
    const booking = await db.collection('bookings').findOne({ _id: new ObjectId(req.params.id) });
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found.' });
    }
    if (booking.rentersID !== req.userId) {
      return res.status(403).json({ error: 'Only this booking\'s renter may leave a review.' });
    }
    if (booking.status !== 'Completed') {
      return res.status(400).json({ error: 'Reviews are available after the booking is completed.' });
    }
    const rating = Number(req.body.rating);
    const comment = typeof req.body.comment === 'string' ? req.body.comment.trim() : '';
    if (!Number.isInteger(rating) || rating < 1 || rating > 5 || !comment) {
      return res.status(400).json({ error: 'A 1–5 star rating and written review are required.' });
    }
    const existingReview = await db.collection('reviews').findOne({ bookingId: req.params.id });
    if (existingReview) {
      return res.status(409).json({ error: 'This booking has already been reviewed.' });
    }
    const renter = await db.collection('users').findOne({ _id: new ObjectId(req.userId) });
    const review = {
      bookingId: req.params.id,
      listingId: booking.listingId,
      ownerId: booking.ownersID,
      renterId: req.userId,
      author: renter ? renter.name : 'NeedARide renter',
      rating,
      comment,
      createdAt: new Date(),
      helpfulBy: [],
      notHelpfulBy: [],
    };
    await db.collection('reviews').insertOne(review);
    const ownerReviews = await db.collection('reviews').find({ ownerId: booking.ownersID }).toArray();
    const reputationScore = ownerReviews.reduce((sum, item) => sum + item.rating, 0) / ownerReviews.length;
    await db.collection('users').updateOne(
      { _id: new ObjectId(booking.ownersID) },
      { $set: { reputationScore, reviewCount: ownerReviews.length } }
    );
    const listingReviews = await db.collection('reviews').find({ listingId: booking.listingId }).toArray();
    const listingRating = listingReviews.reduce((sum, item) => sum + item.rating, 0) / listingReviews.length;
    await db.collection('listings').updateOne(
      { _id: new ObjectId(booking.listingId) },
      { $set: { rating: listingRating, reviewCount: listingReviews.length } }
    );
    res.status(201).json(review);
  });

  async function toggleReviewVote(req, res, selectedField, otherField) {
    if (!validId(req.params.id)) {
      return res.status(400).json({ error: 'Invalid review ID.' });
    }
    const reviews = db.collection('reviews');
    const review = await reviews.findOne({ _id: new ObjectId(req.params.id) });
    if (!review) {
      return res.status(404).json({ error: 'Review not found.' });
    }
    if (review.renterId === req.userId) {
      return res.status(403).json({ error: 'You cannot vote on your own review.' });
    }
    const selectedBy = Array.isArray(review[selectedField]) ? review[selectedField] : [];
    const selected = !selectedBy.includes(req.userId);
    const update = selected
      ? { $addToSet: { [selectedField]: req.userId }, $pull: { [otherField]: req.userId } }
      : { $pull: { [selectedField]: req.userId } };
    await reviews.updateOne(
      { _id: review._id },
      update
    );
    const updatedReview = await reviews.findOne({ _id: review._id });
    const helpfulBy = Array.isArray(updatedReview.helpfulBy) ? updatedReview.helpfulBy : [];
    const notHelpfulBy = Array.isArray(updatedReview.notHelpfulBy) ? updatedReview.notHelpfulBy : [];
    res.json({
      helpful: helpfulBy.includes(req.userId),
      notHelpful: notHelpfulBy.includes(req.userId),
      helpfulCount: helpfulBy.length,
      notHelpfulCount: notHelpfulBy.length,
    });
  }

  app.post('/api/reviews/:id/helpful', requireUser, async (req, res) => {
    return toggleReviewVote(req, res, 'helpfulBy', 'notHelpfulBy');
  });

  app.post('/api/reviews/:id/not-helpful', requireUser, async (req, res) => {
    return toggleReviewVote(req, res, 'notHelpfulBy', 'helpfulBy');
  });

  app.use((err, req, res, next) => {
    if (err && err.code === 11000) {
      return res.status(409).json({ error: 'This booking has already been reviewed.' });
    }
    console.error(err);
    res.status(500).json({ error: 'The server could not complete this request.' });
  });

  return app;
}

async function connectToDb() {
  const url = process.env.MONGODB_URI;
  if (!url) {
    throw new Error('MONGODB_URI is required.');
  }
  const client = new MongoClient(url);
  await client.connect();
  const db = client.db(dbName);
  await db.collection('reviews').createIndex({ bookingId: 1 }, { unique: true });
  return { client, db };
}

async function startServer() {
  const { db } = await connectToDb();
  const app = createApp(db);
  app.listen(port, () => {
    console.log(`Backend server is running and listening on http://localhost:${port}`);
  });
}

if (require.main === module) {
  startServer().catch((err) => {
    console.error('Failed to connect to MongoDB', err.message);
    process.exit(1);
  });
}

module.exports = { createApp };
