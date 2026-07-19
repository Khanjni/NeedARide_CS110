// mock-data.js
// Stand-in for the real backend response until the /api/listings
// endpoint exists. Shape matches what we expect MongoDB to return,
// so swapping this out later should be close to a drop-in replacement.

const MOCK_LISTINGS = [
  {
    id: "1",
    title: "2021 Honda Civic",
    type: "sedan",
    location: "Riverside, CA",
    pricePerDay: 42,
    mpg: 36,
    seats: 5,
    transmission: "Automatic",
    rating: 4.8,
    reviewCount: 21,
    description: "Reliable daily driver, great on gas, perfect for commuting or a weekend trip. Smoke-free, non-pet owner.",
    ownerName: "Jordan M.",
    reviews: [
      { author: "Casey R.", rating: 5, comment: "Super clean car and Jordan was easy to coordinate with. Would rent again." },
      { author: "Priya S.", rating: 5, comment: "Smooth pickup, exactly as described." },
      { author: "Alex T.", rating: 4, comment: "Great car, just a bit of a wait on the response time for messages." },
    ],
  },
  {
    id: "2",
    title: "2019 Toyota RAV4",
    type: "suv",
    location: "Riverside, CA",
    pricePerDay: 58,
    mpg: 30,
    seats: 5,
    transmission: "Automatic",
    rating: 4.6,
    reviewCount: 14,
    description: "Spacious SUV with plenty of trunk room — great for moving furniture, road trips, or group outings.",
    ownerName: "Sam K.",
    reviews: [
      { author: "Morgan L.", rating: 5, comment: "Perfect for our camping trip, tons of space." },
      { author: "Dana W.", rating: 4, comment: "Good ride, minor scratch not mentioned in listing." },
    ],
  },
  {
    id: "3",
    title: "2020 Ford F-150",
    type: "truck",
    location: "Corona, CA",
    pricePerDay: 79,
    mpg: 22,
    seats: 5,
    transmission: "Automatic",
    rating: 4.9,
    reviewCount: 9,
    description: "Full-size truck, ideal for hauling or towing. Bed liner included.",
    ownerName: "Chris B.",
    reviews: [
      { author: "Taylor F.", rating: 5, comment: "Hauled a full load no problem, owner was great to work with." },
    ],
  },
  {
    id: "4",
    title: "2018 Volkswagen Golf",
    type: "hatchback",
    location: "Moreno Valley, CA",
    pricePerDay: 35,
    mpg: 34,
    seats: 5,
    transmission: "Manual",
    rating: 4.4,
    reviewCount: 6,
    description: "Fun to drive manual hatchback, great for city trips. Bluetooth audio included.",
    ownerName: "Riley P.",
    reviews: [
      { author: "Jamie C.", rating: 4, comment: "Fun little car, just make sure you're comfortable with manual." },
    ],
  },
  {
    id: "5",
    title: "2022 Honda Odyssey",
    type: "van",
    location: "Riverside, CA",
    pricePerDay: 68,
    mpg: 27,
    seats: 8,
    transmission: "Automatic",
    rating: 4.7,
    reviewCount: 11,
    description: "8-seater minivan, great for big families or group trips. Rear entertainment screens included.",
    ownerName: "Morgan D.",
    reviews: [
      { author: "Lee H.", rating: 5, comment: "Perfect for our family reunion road trip." },
      { author: "Kim J.", rating: 4, comment: "Roomy and comfortable, would rent again." },
    ],
  },
  {
    id: "6",
    title: "2020 Mazda 3",
    type: "sedan",
    location: "San Bernardino, CA",
    pricePerDay: 39,
    mpg: 33,
    seats: 5,
    transmission: "Automatic",
    rating: 4.5,
    reviewCount: 17,
    description: "Sporty and reliable sedan with a premium interior. Great for commuting or a night out.",
    ownerName: "Avery N.",
    reviews: [
      { author: "Drew S.", rating: 5, comment: "Looked and drove exactly like the photos." },
      { author: "Jesse M.", rating: 4, comment: "Great experience overall, minor delay at drop-off." },
    ],
  },
];

// Mock bookings for the "My Bookings" tab on the profile page.
// listingId refers back to MOCK_LISTINGS above.
const MOCK_BOOKINGS = [
  {
    id: "b1",
    listingId: "2",
    status: "Confirmed",
    startDate: "2026-08-02",
    endDate: "2026-08-05",
  },
  {
    id: "b2",
    listingId: "5",
    status: "Requested",
    startDate: "2026-08-14",
    endDate: "2026-08-15",
  },
  {
    id: "b3",
    listingId: "4",
    status: "Completed",
    startDate: "2026-06-10",
    endDate: "2026-06-12",
  },
];

// Mock message threads for the Messaging page.
// Each thread is tied to a booking + the other person in the conversation.
const MOCK_THREADS = [
  {
    id: "t1",
    listingId: "2",
    otherPerson: "Sam K. (Owner)",
    messages: [
      { from: "them", text: "Hey! Just confirming pickup is at 9am on the 2nd, that still work?", time: "Yesterday, 4:12 PM" },
      { from: "me", text: "Yep, 9am works great. Where should I meet you?", time: "Yesterday, 4:20 PM" },
      { from: "them", text: "I'll send the address the morning of, just to keep it easy. See you then!", time: "Yesterday, 4:22 PM" },
    ],
  },
  {
    id: "t2",
    listingId: "5",
    otherPerson: "Morgan D. (Owner)",
    messages: [
      { from: "me", text: "Hi! Does the Odyssey have a car seat hook in the back row?", time: "Mon, 1:03 PM" },
      { from: "them", text: "Yep, both back rows have LATCH anchors.", time: "Mon, 1:40 PM" },
    ],
  },
  {
    id: "t3",
    listingId: "4",
    otherPerson: "Riley P. (Owner)",
    messages: [
      { from: "them", text: "Thanks for returning it in great shape! Left you a review.", time: "Jun 12" },
      { from: "me", text: "Thank you, had a great time with it!", time: "Jun 12" },
    ],
  },
];
