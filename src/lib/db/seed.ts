import { db } from './client';
import { users, kycReviews, refunds, featureFlags } from './schema';
import { faker } from '@faker-js/faker';

// Seed users with different roles
const seedUsers = async () => {
  const roles: Array<'viewer' | 'operator' | 'approver' | 'admin'> = [
    'viewer',
    'operator',
    'approver',
    'admin',
  ];

  const userData = Array.from({ length: 8 }, (_, i) => ({
    id: String(i + 1),
    name: faker.person.fullName(),
    email: faker.internet.email(),
    role: roles[i % roles.length],
  }));

  await db.insert(users).values(userData).onConflictDoNothing();
  console.log('Users seeded successfully');
};

// Seed KYC reviews for demo data
const seedKycReviews = async () => {
  const statuses = ['pending', 'approved', 'rejected', 'escalated'];
  const countries = ['US', 'UK', 'DE', 'FR', 'JP', 'SG', 'AU'];
  
  const kycData = Array.from({ length: 30 }, () => ({
    id: faker.string.uuid(),
    caseId: `KYC-${faker.string.alphanumeric({ length: 8 }).toUpperCase()}`,
    customerName: faker.person.fullName(),
    country: countries[Math.floor(Math.random() * countries.length)],
    riskScore: faker.number.int({ min: 0, max: 100 }),
    documentsSubmitted: faker.number.int({ min: 1, max: 10 }),
    status: statuses[Math.floor(Math.random() * statuses.length)],
    submittedAt: faker.date.past().getTime(),
    assignedTo: faker.person.fullName(),
  }));

  await db.insert(kycReviews).values(kycData).onConflictDoNothing();
  console.log('KYC reviews seeded successfully');
};

// Seed refunds for demo data
const seedRefunds = async () => {
  const statuses = ['pending', 'approved', 'denied', 'partial'];
  
  const refundData = Array.from({ length: 25 }, () => ({
    id: faker.string.uuid(),
    orderId: `ORD-${faker.string.numeric({ length: 8 })}`,
    customerEmail: faker.internet.email(),
    amount: faker.number.int({ min: 100, max: 100000 }), // in cents
    currency: 'USD',
    reason: faker.lorem.sentence(),
    status: statuses[Math.floor(Math.random() * statuses.length)],
    requestedAt: faker.date.past().getTime(),
    requestedBy: faker.person.fullName(),
  }));

  await db.insert(refunds).values(refundData).onConflictDoNothing();
  console.log('Refunds seeded successfully');
};

// Seed feature flags for demo data
const seedFeatureFlags = async () => {
  const environments = ['development', 'staging', 'production'];
  const flagKeys = ['new_ui', 'beta_features', 'api_v2', 'dark_mode', 'advanced_search'];
  
  const flagData = Array.from({ length: 15 }, () => ({
    id: faker.string.uuid(),
    key: flagKeys[Math.floor(Math.random() * flagKeys.length)] + '_' + faker.string.alphanumeric({ length: 4 }).toLowerCase(),
    description: faker.lorem.sentence(),
    environment: environments[Math.floor(Math.random() * environments.length)],
    enabled: faker.datatype.boolean() ? 1 : 0, // Store as 0 or 1
    rolloutPct: faker.number.int({ min: 0, max: 100 }),
    owner: faker.person.fullName(),
    updatedAt: faker.date.recent().getTime(),
  }));

  await db.insert(featureFlags).values(flagData).onConflictDoNothing();
  console.log('Feature flags seeded successfully');
};

// Main seed function
const seed = async () => {
  try {
    await seedUsers();
    await seedKycReviews();
    await seedRefunds();
    await seedFeatureFlags();
    console.log('Database seeded successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
};

seed();