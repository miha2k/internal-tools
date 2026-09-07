import { db } from './client';
import { users, transactions } from './schema';
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

// Seed transactions for demo data
const seedTransactions = async () => {
  const statuses = ['pending', 'completed', 'failed', 'refunded'];
  
  const transactionData = Array.from({ length: 50 }, () => ({
    id: faker.string.uuid(),
    customerId: faker.string.uuid(),
    amount: faker.number.int({ min: 100, max: 100000 }), // in cents
    currency: 'USD',
    status: statuses[Math.floor(Math.random() * statuses.length)],
    description: faker.finance.transactionDescription(),
    createdAt: faker.date.past().getTime(),
    updatedAt: faker.date.recent().getTime(),
  }));

  await db.insert(transactions).values(transactionData).onConflictDoNothing();
  console.log('Transactions seeded successfully');
};

// Main seed function
const seed = async () => {
  try {
    await seedUsers();
    await seedTransactions();
    console.log('Database seeded successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
};

seed();