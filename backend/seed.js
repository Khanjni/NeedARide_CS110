require('dotenv').config();
const bcrypt = require('bcryptjs');
const { MongoClient } = require('mongodb');

const url = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || 'NeedARide';

const mockListings = [
  {
    seedKey: 'mock-listing-1',
    title: '2021 Honda Civic',
    type: 'sedan',
    location: 'Riverside, CA',
    pricePerDay: 42,
    mpg: 36,
    seats: 5,
    transmission: 'Automatic',
    rating: 4.8,
    reviewCount: 21,
    description: 'Reliable daily driver, great on gas, perfect for commuting or a weekend trip. Smoke-free, non-pet owner.',
    ownerName: 'Jordan M.',
    reviews: [
      { author: 'Casey R.', rating: 5, comment: 'Super clean car and Jordan was easy to coordinate with. Would rent again.' },
      { author: 'Priya S.', rating: 5, comment: 'Smooth pickup, exactly as described.' },
      { author: 'Alex T.', rating: 4, comment: 'Great car, just a bit of a wait on the response time for messages.' },
    ],
  },
  {
    seedKey: 'mock-listing-2',
    title: '2019 Toyota RAV4',
    type: 'suv',
    location: 'Riverside, CA',
    pricePerDay: 58,
    mpg: 30,
    seats: 5,
    transmission: 'Automatic',
    rating: 4.6,
    reviewCount: 14,
    description: 'Spacious SUV with plenty of trunk room — great for moving furniture, road trips, or group outings.',
    ownerName: 'Sam K.',
    reviews: [
      { author: 'Morgan L.', rating: 5, comment: 'Perfect for our camping trip, tons of space.' },
      { author: 'Dana W.', rating: 4, comment: 'Good ride, minor scratch not mentioned in listing.' },
    ],
  },
  {
    seedKey: 'mock-listing-3',
    title: '2020 Ford F-150',
    type: 'truck',
    location: 'Corona, CA',
    pricePerDay: 79,
    mpg: 22,
    seats: 5,
    transmission: 'Automatic',
    rating: 4.9,
    reviewCount: 9,
    description: 'Full-size truck, ideal for hauling or towing. Bed liner included.',
    ownerName: 'Chris B.',
    reviews: [
      { author: 'Taylor F.', rating: 5, comment: 'Hauled a full load no problem, owner was great to work with.' },
    ],
  },
  {
    seedKey: 'mock-listing-4',
    title: '2018 Volkswagen Golf',
    type: 'hatchback',
    location: 'Moreno Valley, CA',
    pricePerDay: 35,
    mpg: 34,
    seats: 5,
    transmission: 'Manual',
    rating: 4.4,
    reviewCount: 6,
    description: 'Fun to drive manual hatchback, great for city trips. Bluetooth audio included.',
    ownerName: 'Riley P.',
    reviews: [
      { author: 'Jamie C.', rating: 4, comment: 'Fun little car, just make sure you\'re comfortable with manual.' },
    ],
  },
  {
    seedKey: 'mock-listing-5',
    title: '2022 Honda Odyssey',
    type: 'van',
    location: 'Riverside, CA',
    pricePerDay: 68,
    mpg: 27,
    seats: 8,
    transmission: 'Automatic',
    rating: 4.7,
    reviewCount: 11,
    description: '8-seater minivan, great for big families or group trips. Rear entertainment screens included.',
    ownerName: 'Morgan D.',
    reviews: [
      { author: 'Lee H.', rating: 5, comment: 'Perfect for our family reunion road trip.' },
      { author: 'Kim J.', rating: 4, comment: 'Roomy and comfortable, would rent again.' },
    ],
  },
  {
    seedKey: 'mock-listing-6',
    title: '2020 Mazda 3',
    type: 'sedan',
    location: 'San Bernardino, CA',
    pricePerDay: 39,
    mpg: 33,
    seats: 5,
    transmission: 'Automatic',
    rating: 4.5,
    reviewCount: 17,
    description: 'Sporty and reliable sedan with a premium interior. Great for commuting or a night out.',
    ownerName: 'Avery N.',
    reviews: [
      { author: 'Drew S.', rating: 5, comment: 'Looked and drove exactly like the photos.' },
      { author: 'Jesse M.', rating: 4, comment: 'Great experience overall, minor delay at drop-off.' },
    ],
  },
];

async function seed() {
  if (!url) {
    throw new Error('MONGODB_URI is required.');
  }
  const client = new MongoClient(url);
  await client.connect();
  const db = client.db(dbName);
  const password = await bcrypt.hash('NeedARide123!', 10);

  const ownerResult = await db.collection('users').findOneAndUpdate(
    { email: 'owner@needaride.test' },
    {
      $set: { name: 'Test Owner', bio: 'NeedARide test owner', profilePhoto: '', password },
      $setOnInsert: { reputationScore: 0, reviewCount: 0 },
    },
    { upsert: true, returnDocument: 'after' }
  );
  const renterResult = await db.collection('users').findOneAndUpdate(
    { email: 'renter@needaride.test' },
    {
      $set: { name: 'Test Renter', bio: 'NeedARide test renter', profilePhoto: '', password },
      $setOnInsert: { reputationScore: 0, reviewCount: 0 },
    },
    { upsert: true, returnDocument: 'after' }
  );
  const ownerId = ownerResult._id.toString();
  const renterId = renterResult._id.toString();
  const listingResult = await db.collection('listings').findOneAndUpdate(
    { seedKey: 'diego-integration-listing' },
    {
      $set: { seedKey: 'diego-integration-listing', title: 'NeedARide Test Vehicle', type: 'sedan', location: 'Riverside, CA', pricePerDay: 40, mpg: 30, seats: 5, transmission: 'Automatic', ownerName: 'Test Owner', ownerID: ownerId, description: 'Vehicle used for integration testing.' },
      $setOnInsert: { rating: 0, reviewCount: 0 },
    },
    { upsert: true, returnDocument: 'after' }
  );
  const listingId = listingResult._id.toString();
  const bookingResult = await db.collection('bookings').findOneAndUpdate(
    { seedKey: 'diego-integration-booking' },
    { $set: { seedKey: 'diego-integration-booking', listingId, ownersID: ownerId, rentersID: renterId, startDate: '2026-07-20', endDate: '2026-07-21', status: 'Completed' } },
    { upsert: true, returnDocument: 'after' }
  );
  const bookingId = bookingResult._id.toString();
  const seededMessages = [
    { senderId: renterId, text: 'Hi! Is the test vehicle still available?', sentAt: new Date('2026-07-20T16:00:00Z') },
    { senderId: ownerId, text: 'Yes, it is available for your completed booking.', sentAt: new Date('2026-07-20T16:05:00Z') },
  ];
  await db.collection('threads').findOneAndUpdate(
    { bookingId },
    {
      $set: { listingId, ownersID: ownerId, rentersID: renterId },
      $setOnInsert: { bookingId, messages: seededMessages, createdAt: new Date() },
    },
    { upsert: true }
  );
  await db.collection('threads').updateOne(
    { bookingId, messages: { $size: 0 } },
    { $set: { messages: seededMessages } }
  );
  const primaryReview = await db.collection('reviews').findOne({ bookingId });
  if (primaryReview) {
    const secondBooking = await db.collection('bookings').findOneAndUpdate(
      { seedKey: 'diego-integration-booking-2' },
      {
        $set: {
          seedKey: 'diego-integration-booking-2',
          listingId,
          ownersID: ownerId,
          rentersID: renterId,
          startDate: '2026-08-01',
          endDate: '2026-08-02',
          status: 'Completed',
        },
      },
      { upsert: true, returnDocument: 'after' }
    );
    await db.collection('threads').findOneAndUpdate(
      { bookingId: secondBooking._id.toString() },
      {
        $set: { listingId, ownersID: ownerId, rentersID: renterId },
        $setOnInsert: { bookingId: secondBooking._id.toString(), messages: [], createdAt: new Date() },
      },
      { upsert: true }
    );
  }
  await db.collection('reviews').createIndex({ bookingId: 1 }, { unique: true });

  for (const [listingIndex, listing] of mockListings.entries()) {
    const mockOwner = await db.collection('users').findOneAndUpdate(
      { seedKey: `mock-owner-${listingIndex + 1}` },
      {
        $set: {
          seedKey: `mock-owner-${listingIndex + 1}`,
          name: listing.ownerName,
          email: `mock-owner-${listingIndex + 1}@needaride.test`,
          password,
          bio: '',
          profilePhoto: '',
          reputationScore: listing.rating,
          reviewCount: listing.reviewCount,
        },
      },
      { upsert: true, returnDocument: 'after' }
    );
    const { reviews, ...listingFields } = listing;
    const mockListing = await db.collection('listings').findOneAndUpdate(
      { seedKey: listing.seedKey },
      { $set: { ...listingFields, ownerID: mockOwner._id.toString() } },
      { upsert: true, returnDocument: 'after' }
    );
    for (const [reviewIndex, review] of reviews.entries()) {
      await db.collection('reviews').findOneAndUpdate(
        { seedKey: `${listing.seedKey}-review-${reviewIndex + 1}` },
        {
          $set: {
            seedKey: `${listing.seedKey}-review-${reviewIndex + 1}`,
            bookingId: `${listing.seedKey}-review-${reviewIndex + 1}`,
            listingId: mockListing._id.toString(),
            ownerId: mockOwner._id.toString(),
            renterId: '',
            ...review,
          },
        },
        { upsert: true }
      );
    }
  }

  console.log('Integration data is ready.');
  console.log('Original mock vehicle data is ready.');
  console.log('Owner: owner@needaride.test / NeedARide123!');
  console.log('Renter: renter@needaride.test / NeedARide123!');
  await client.close();
}

seed().catch((err) => {
  console.error('Failed to seed MongoDB', err.message);
  process.exit(1);
});
