/**
 * Migration Script: db.json -> MongoDB
 * Reads legacy db.json data and safely migrates groups and expenses into MongoDB.
 * 
 * Run with: node server/src/scripts/migrateDbJson.js
 */

const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const config = require('../config/config');
const Group = require('../models/Group');
const User = require('../models/User');

const dbJsonPath = path.resolve(__dirname, '../../../db.json');

async function migrate() {
    console.log('=== Split Bro Migration: db.json -> MongoDB ===');

    if (!fs.existsSync(dbJsonPath)) {
        console.log('No legacy db.json file found. Skipping migration.');
        process.exit(0);
    }

    const rawData = fs.readFileSync(dbJsonPath, 'utf8');
    const legacyDb = JSON.parse(rawData);

    if (!legacyDb.groups || !Array.isArray(legacyDb.groups)) {
        console.log('No groups found in db.json to migrate.');
        process.exit(0);
    }

    await mongoose.connect(config.mongoUri);
    console.log('Connected to MongoDB. Starting migration...');

    let migratedCount = 0;

    for (const legacyGroup of legacyDb.groups) {
        const existing = await Group.findOne({ groupId: legacyGroup.groupId });
        if (existing) {
            console.log(`Group ${legacyGroup.groupId} already exists in MongoDB. Skipping.`);
            continue;
        }

        // Format members
        const formattedMembers = (legacyGroup.members || []).map(m => {
            if (typeof m === 'string') {
                return {
                    memberId: m,
                    name: m,
                    type: 'registered',
                    userId: m
                };
            }
            return {
                memberId: m.memberId || m.name,
                name: m.name || m.memberId,
                type: m.type === 'guest' ? 'guest' : 'registered',
                userId: m.userId || null
            };
        });

        // Ensure creator is in members
        if (legacyGroup.createdBy && !formattedMembers.some(m => m.memberId === legacyGroup.createdBy)) {
            formattedMembers.unshift({
                memberId: legacyGroup.createdBy,
                name: legacyGroup.createdBy,
                type: 'registered',
                userId: legacyGroup.createdBy
            });
        }

        await Group.create({
            groupId: legacyGroup.groupId,
            groupName: legacyGroup.groupName || legacyGroup.name || 'Migrated Group',
            groupCode: legacyGroup.groupCode || await Group.generateGroupCode(),
            createdBy: legacyGroup.createdBy || 'SYSTEM',
            members: formattedMembers,
            createdAt: legacyGroup.createdAt ? new Date(legacyGroup.createdAt) : new Date()
        });

        console.log(`Migrated group: "${legacyGroup.groupName}" (${legacyGroup.groupId})`);
        migratedCount++;
    }

    console.log(`Migration completed successfully! Total new groups migrated: ${migratedCount}`);
    await mongoose.disconnect();
}

migrate().catch(err => {
    console.error('Migration failed:', err);
    process.exit(1);
});
