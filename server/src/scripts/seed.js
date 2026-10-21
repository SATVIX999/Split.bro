/**
 * Database Seed Script for Split Bro
 * Populates MongoDB with demo users, groups, expenses, and settlements.
 * 
 * Run with: npm run seed or node server/src/scripts/seed.js
 */

const mongoose = require('mongoose');
const config = require('../config/config');
const User = require('../models/User');
const Group = require('../models/Group');
const Expense = require('../models/Expense');
const Settlement = require('../models/Settlement');
const { calculateShares } = require('../services/expenseService');

const demoUsers = [
    {
        name: 'Mayur Mittal',
        email: 'mayur@example.com',
        userId: 'MAYUR01',
        password: 'Password@123',
        bio: 'Trip planner & avid traveler',
        upiId: 'mayur@upi'
    },
    {
        name: 'Satvik Sharma',
        email: 'satvik@example.com',
        userId: 'SATVIK01',
        password: 'Password@123',
        bio: 'Foodie and photographer',
        upiId: 'satvik@okhdfcbank'
    },
    {
        name: 'Shriya Kathuria',
        email: 'shriya@example.com',
        userId: 'SHRIYA01',
        password: 'Password@123',
        bio: 'Budget tracker & accountant',
        upiId: 'shriya@oksbi'
    },
    {
        name: 'Aman Kumar',
        email: 'aman@example.com',
        userId: 'AMAN01',
        password: 'Password@123',
        bio: 'Always down for weekend road trips',
        upiId: 'aman@paytm'
    }
];

async function seed() {
    console.log('=== Seeding Split Bro Demo Data ===');
    await mongoose.connect(config.mongoUri);
    console.log('Connected to MongoDB. Clearing previous demo data...');

    // Clear collections
    await User.deleteMany({});
    await Group.deleteMany({});
    await Expense.deleteMany({});
    await Settlement.deleteMany({});

    // 1. Create Users
    console.log('Creating demo users...');
    const createdUsers = [];
    for (const u of demoUsers) {
        const user = await User.create(u);
        createdUsers.push(user);
        console.log(`- Created user: ${user.name} (${user.userId})`);
    }

    // 2. Create Group: Goa Trip
    console.log('Creating demo group: Goa Trip...');
    const goaMembers = [
        { memberId: 'MAYUR01', name: 'Mayur Mittal', type: 'registered', userId: 'MAYUR01' },
        { memberId: 'SATVIK01', name: 'Satvik Sharma', type: 'registered', userId: 'SATVIK01' },
        { memberId: 'SHRIYA01', name: 'Shriya Kathuria', type: 'registered', userId: 'SHRIYA01' }
    ];

    const goaGroup = await Group.create({
        groupId: 'GRP_GOA_2026',
        groupName: 'Goa Trip 🏖️',
        groupCode: 'GOA123',
        category: 'Trip',
        description: 'Baga beach vacation and seafood dining',
        createdBy: 'MAYUR01',
        members: goaMembers
    });

    // 3. Create Group: Apartment Expenses
    console.log('Creating demo group: Flat 402 Apartment...');
    const flatMembers = [
        { memberId: 'MAYUR01', name: 'Mayur Mittal', type: 'registered', userId: 'MAYUR01' },
        { memberId: 'AMAN01', name: 'Aman Kumar', type: 'registered', userId: 'AMAN01' },
        { memberId: 'GUEST_CHEF', name: 'Cook Uncle', type: 'guest', userId: null }
    ];

    const flatGroup = await Group.create({
        groupId: 'GRP_FLAT_402',
        groupName: 'Flat 402 Expenses 🏠',
        groupCode: 'FLAT40',
        category: 'Home',
        description: 'Monthly groceries, WiFi, maid and maintenance',
        createdBy: 'MAYUR01',
        members: flatMembers
    });

    // 4. Create Expenses for Goa Trip
    console.log('Adding expenses for Goa Trip...');

    // Expense 1: Beach Resort Villa (Mayur paid 15,000, split equally 3 ways)
    const exp1Participants = ['MAYUR01', 'SATVIK01', 'SHRIYA01'];
    const exp1Shares = calculateShares(15000, 'equal', exp1Participants);
    await Expense.create({
        expenseId: 'EXP_GOA_001',
        groupId: goaGroup.groupId,
        title: 'Beach Resort Villa Booking',
        amount: 15000,
        category: 'Hotel',
        payerId: 'MAYUR01',
        payerName: 'Mayur Mittal',
        payerType: 'registered',
        splitType: 'equal',
        participants: exp1Participants,
        shares: exp1Shares,
        notes: '3 nights stay near Candolim'
    });

    // Expense 2: Seafood Dinner (Satvik paid 3,600, split equally 3 ways)
    const exp2Participants = ['MAYUR01', 'SATVIK01', 'SHRIYA01'];
    const exp2Shares = calculateShares(3600, 'equal', exp2Participants);
    await Expense.create({
        expenseId: 'EXP_GOA_002',
        groupId: goaGroup.groupId,
        title: 'Fisherman\'s Wharf Dinner',
        amount: 3600,
        category: 'Food',
        payerId: 'SATVIK01',
        payerName: 'Satvik Sharma',
        payerType: 'registered',
        splitType: 'equal',
        participants: exp2Participants,
        shares: exp2Shares,
        notes: 'Crab masala and mocktails'
    });

    // Expense 3: Scuba Diving & Watersports (Shriya paid 9,000, percentage split: 40% Mayur, 30% Satvik, 30% Shriya)
    const exp3Shares = calculateShares(9000, 'percentage', exp1Participants, {
        'MAYUR01': 40,
        'SATVIK01': 30,
        'SHRIYA01': 30
    });
    await Expense.create({
        expenseId: 'EXP_GOA_003',
        groupId: goaGroup.groupId,
        title: 'Grand Island Scuba Diving',
        amount: 9000,
        category: 'Activities',
        payerId: 'SHRIYA01',
        payerName: 'Shriya Kathuria',
        payerType: 'registered',
        splitType: 'percentage',
        participants: exp1Participants,
        shares: exp3Shares,
        notes: 'Includes underwater video footage'
    });

    // 5. Create a settlement payment: Satvik paid 2,000 to Mayur
    console.log('Recording sample settlement payment...');
    await Settlement.create({
        settlementId: 'SET_GOA_001',
        groupId: goaGroup.groupId,
        from: 'SATVIK01',
        fromName: 'Satvik Sharma',
        to: 'MAYUR01',
        toName: 'Mayur Mittal',
        amount: 2000,
        paymentMethod: 'UPI',
        notes: 'Initial settlement via Google Pay',
        settledBy: 'SATVIK01'
    });

    console.log('\n=== Database Seeding Complete! ===');
    console.log('Demo Credentials for Login:');
    console.log('  1. Email: mayur@example.com   | User ID: MAYUR01   | Password: Password@123');
    console.log('  2. Email: satvik@example.com  | User ID: SATVIK01  | Password: Password@123');
    console.log('  3. Email: shriya@example.com  | User ID: SHRIYA01  | Password: Password@123');
    console.log('  4. Email: aman@example.com    | User ID: AMAN01    | Password: Password@123');

    await mongoose.disconnect();
}

seed().catch(err => {
    console.error('Seeding failed:', err);
    process.exit(1);
});

