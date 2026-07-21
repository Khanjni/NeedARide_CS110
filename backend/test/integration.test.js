const assert = require('node:assert/strict');
const { after, before, test } = require('node:test');
const { ObjectId } = require('mongodb');
const { createApp } = require('../index');

function sameValue(left, right) {
  return left instanceof ObjectId || right instanceof ObjectId
    ? left && right && left.toString() === right.toString()
    : left === right;
}

function matches(document, filter) {
  return Object.entries(filter).every(([key, value]) => {
    if (key === '$or') return value.some((item) => matches(document, item));
    return sameValue(document[key], value);
  });
}

class MemoryCollection {
  constructor() {
    this.documents = [];
  }

  find(filter) {
    return { toArray: async () => this.documents.filter((item) => matches(item, filter)) };
  }

  async findOne(filter) {
    return this.documents.find((item) => matches(item, filter)) || null;
  }

  async insertOne(document) {
    if (document.bookingId && this.documents.some((item) => item.bookingId === document.bookingId)) {
      const error = new Error('Duplicate booking review');
      error.code = 11000;
      throw error;
    }
    const insertedId = document._id || new ObjectId();
    document._id = insertedId;
    this.documents.push(document);
    return { insertedId };
  }

  async updateOne(filter, update) {
    const document = await this.findOne(filter);
    if (!document) return { matchedCount: 0 };
    if (update.$set) Object.assign(document, update.$set);
    if (update.$push) {
      for (const [key, value] of Object.entries(update.$push)) document[key].push(value);
    }
    if (update.$addToSet) {
      for (const [key, value] of Object.entries(update.$addToSet)) {
        if (!Array.isArray(document[key])) document[key] = [];
        if (!document[key].includes(value)) document[key].push(value);
      }
    }
    if (update.$pull) {
      for (const [key, value] of Object.entries(update.$pull)) {
        document[key] = (document[key] || []).filter((item) => !sameValue(item, value));
      }
    }
    return { matchedCount: 1 };
  }
}

class MemoryDb {
  constructor() {
    this.collections = new Map();
  }

  collection(name) {
    if (!this.collections.has(name)) this.collections.set(name, new MemoryCollection());
    return this.collections.get(name);
  }
}

const db = new MemoryDb();
let server;
let baseUrl;

async function request(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, options);
  return { response, body: await response.json() };
}

async function register(name, email) {
  const { response, body } = await request('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, password: 'Password123!' }),
  });
  assert.equal(response.status, 201);
  return { userId: body.userId, token: body.token };
}

before(async () => {
  server = createApp(db).listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(() => server.close());

test('profile, booking messaging, review, and reputation flow', async () => {
  const owner = await register('Owner One', 'owner@example.com');
  const renter = await register('Renter One', 'renter@example.com');
  const stranger = await register('Stranger One', 'stranger@example.com');
  const ownerId = owner.userId;
  const renterId = renter.userId;
  const login = await request('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'renter@example.com', password: 'Password123!' }),
  });
  assert.equal(login.response.status, 200);
  assert.equal(login.body.userId, renterId);
  const renterAuth = { Authorization: `Bearer ${login.body.token}` };

  const profileUpdate = await request(`/api/users/${renterId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...renterAuth },
    body: JSON.stringify({ name: 'Renter Updated', bio: 'Ready to ride', profilePhoto: 'https://example.com/renter.jpg' }),
  });
  assert.equal(profileUpdate.response.status, 200);
  const profile = await request(`/api/users/${renterId}`, { headers: renterAuth });
  assert.equal(profile.body.bio, 'Ready to ride');
  assert.equal(profile.body.password, undefined);

  const listing = {
    title: 'Test Car', type: 'sedan', location: 'Riverside, CA', pricePerDay: 40,
    mpg: 30, seats: 5, transmission: 'Automatic', ownerName: 'Owner One',
    ownerID: ownerId, description: 'Integration test car', rating: 0, reviewCount: 0,
  };
  const listingResult = await db.collection('listings').insertOne(listing);
  const listingId = listingResult.insertedId.toString();
  const booking = await request('/api/bookings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...renterAuth },
    body: JSON.stringify({ listingId, startDate: '2026-07-20', endDate: '2026-07-21' }),
  });
  assert.equal(booking.response.status, 201);

  const forbiddenMessage = await request(`/api/threads/${booking.body.threadId}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${stranger.token}` },
    body: JSON.stringify({ text: 'Not allowed' }),
  });
  assert.equal(forbiddenMessage.response.status, 403);
  const message = await request(`/api/threads/${booking.body.threadId}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...renterAuth },
    body: JSON.stringify({ text: 'Is pickup at nine?' }),
  });
  assert.equal(message.response.status, 201);
  const ownerMessage = await request(`/api/threads/${booking.body.threadId}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${owner.token}` },
    body: JSON.stringify({ text: 'Yes, pickup is at nine.' }),
  });
  assert.equal(ownerMessage.response.status, 201);
  const threads = await request(`/api/users/${renterId}/threads`, { headers: renterAuth });
  assert.equal(threads.body[0].bookingId, booking.body.bookingId);
  assert.equal(threads.body[0].messages[0].text, 'Is pickup at nine?');
  assert.equal(threads.body[0].messages[1].text, 'Yes, pickup is at nine.');

  const earlyReview = await request(`/api/bookings/${booking.body.bookingId}/review`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...renterAuth },
    body: JSON.stringify({ rating: 5, comment: 'Great car' }),
  });
  assert.equal(earlyReview.response.status, 400);
  const completion = await request(`/api/bookings/${booking.body.bookingId}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${owner.token}` },
    body: JSON.stringify({ status: 'Completed' }),
  });
  assert.equal(completion.response.status, 200);
  const eligibility = await request(`/api/listings/${listingId}/review-eligibility`, { headers: renterAuth });
  assert.equal(eligibility.body.eligible, true);
  assert.equal(eligibility.body.bookingId, booking.body.bookingId);
  const review = await request(`/api/bookings/${booking.body.bookingId}/review`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...renterAuth },
    body: JSON.stringify({ rating: 5, comment: 'Great car' }),
  });
  assert.equal(review.response.status, 201);
  const ownHelpful = await request(`/api/reviews/${review.body._id}/helpful`, {
    method: 'POST',
    headers: renterAuth,
  });
  assert.equal(ownHelpful.response.status, 403);
  const helpful = await request(`/api/reviews/${review.body._id}/helpful`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${stranger.token}` },
  });
  assert.equal(helpful.response.status, 200);
  assert.equal(helpful.body.helpful, true);
  assert.equal(helpful.body.helpfulCount, 1);
  const listingWithHelpful = await request(`/api/listings/${listingId}`, {
    headers: { Authorization: `Bearer ${stranger.token}` },
  });
  assert.equal(listingWithHelpful.body.reviews[0].helpfulCount, 1);
  assert.equal(listingWithHelpful.body.reviews[0].helpfulByCurrentUser, true);
  assert.equal(listingWithHelpful.body.reviews[0].helpfulBy, undefined);
  const switchedVote = await request(`/api/reviews/${review.body._id}/not-helpful`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${stranger.token}` },
  });
  assert.equal(switchedVote.response.status, 200);
  assert.equal(switchedVote.body.helpful, false);
  assert.equal(switchedVote.body.notHelpful, true);
  assert.equal(switchedVote.body.helpfulCount, 0);
  assert.equal(switchedVote.body.notHelpfulCount, 1);
  const removedVote = await request(`/api/reviews/${review.body._id}/not-helpful`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${stranger.token}` },
  });
  assert.equal(removedVote.response.status, 200);
  assert.equal(removedVote.body.helpful, false);
  assert.equal(removedVote.body.notHelpful, false);
  assert.equal(removedVote.body.helpfulCount, 0);
  assert.equal(removedVote.body.notHelpfulCount, 0);
  const duplicate = await request(`/api/bookings/${booking.body.bookingId}/review`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...renterAuth },
    body: JSON.stringify({ rating: 4, comment: 'Duplicate' }),
  });
  assert.equal(duplicate.response.status, 409);
  const reviewedEligibility = await request(`/api/listings/${listingId}/review-eligibility`, { headers: renterAuth });
  assert.equal(reviewedEligibility.body.eligible, false);
  assert.match(reviewedEligibility.body.reason, /already reviewed/i);
  const secondBooking = await request('/api/bookings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...renterAuth },
    body: JSON.stringify({ listingId, startDate: '2026-08-01', endDate: '2026-08-02' }),
  });
  await request(`/api/bookings/${secondBooking.body.bookingId}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${owner.token}` },
    body: JSON.stringify({ status: 'Completed' }),
  });
  const secondEligibility = await request(`/api/listings/${listingId}/review-eligibility`, { headers: renterAuth });
  assert.equal(secondEligibility.body.eligible, true);
  assert.equal(secondEligibility.body.bookingId, secondBooking.body.bookingId);

  const listingAfterReview = await request(`/api/listings/${listingId}`);
  assert.equal(listingAfterReview.body.reviews.length, 1);
  assert.equal(listingAfterReview.body.rating, 5);
  const ownerProfile = await request(`/api/users/${ownerId}`, { headers: { Authorization: `Bearer ${owner.token}` } });
  assert.equal(ownerProfile.body.reputationScore, 5);
  assert.equal(ownerProfile.body.reviewCount, 1);
});
