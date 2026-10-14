/**
 * Migration Script: Set pinned notices to members-only
 * 
 * This script:
 * 1. Finds all resources with pinned=true
 * 2. Sets membersOnly=true for each
 * 3. Moves their body content to resourceBodies collection
 */

import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, updateDoc, setDoc, query, where } from 'firebase/firestore';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// ESM __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Firebase config
const firebaseAppletConfig = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../firebase-applet-config.json'), 'utf-8')
);

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY || firebaseAppletConfig.apiKey,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN || firebaseAppletConfig.authDomain,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID || firebaseAppletConfig.projectId,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET || firebaseAppletConfig.storageBucket,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || firebaseAppletConfig.messagingSenderId,
  appId: process.env.VITE_FIREBASE_APP_ID || firebaseAppletConfig.appId
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig, 'migration-app') : getApps()[0];
const db = firebaseAppletConfig.firestoreDatabaseId
  ? getFirestore(app, firebaseAppletConfig.firestoreDatabaseId)
  : getFirestore(app);

interface ResourceItem {
  id: string;
  title: string;
  description?: string;
  fileUrl: string;
  fileName: string;
  fileType: string;
  content?: string;
  images?: string[];
  pinned?: boolean;
  membersOnly?: boolean;
  locked?: boolean;
  category?: string;
}

async function migrateNoticesToMembersOnly() {
  console.log('🔍 Finding pinned notice items...');

  try {
    // Fetch all resources
    const resourcesSnapshot = await getDocs(collection(db, 'resources'));
    const pinnedNotices: ResourceItem[] = [];

    resourcesSnapshot.forEach((docSnap) => {
      const data = docSnap.data() as ResourceItem;
      if (data.pinned) {
        pinnedNotices.push({ id: docSnap.id, ...data });
      }
    });

    console.log(`✅ Found ${pinnedNotices.length} pinned notice(s):`);
    pinnedNotices.forEach((notice, idx) => {
      console.log(`   ${idx + 1}. "${notice.title}" (ID: ${notice.id})`);
    });

    if (pinnedNotices.length === 0) {
      console.log('⚠️  No pinned notices found. Nothing to migrate.');
      return;
    }

    console.log('\n🔄 Starting migration...');

    for (const notice of pinnedNotices) {
      console.log(`\n📝 Processing: "${notice.title}"`);

      // Check if already members-only
      if (notice.membersOnly) {
        console.log(`   ⏭️  Already members-only, skipping`);
        continue;
      }

      // Skip if locked (encrypted content)
      if (notice.locked) {
        console.log(`   🔒 Item is password-locked. Setting membersOnly but keeping encrypted body.`);
        await updateDoc(doc(db, 'resources', notice.id), {
          membersOnly: true
        });
        console.log(`   ✅ Updated to members-only`);
        continue;
      }

      // Prepare body data
      const bodyData: any = {
        content: notice.content || null,
        fileUrl: notice.fileUrl || '',
        fileName: notice.fileName || '',
        images: notice.images || null
      };

      // Move body to resourceBodies collection
      console.log(`   📦 Moving body to resourceBodies collection...`);
      await setDoc(doc(db, 'resourceBodies', notice.id), bodyData);

      // Update resource metadata
      console.log(`   📝 Updating resource metadata...`);
      await updateDoc(doc(db, 'resources', notice.id), {
        membersOnly: true,
        content: null,
        fileUrl: '',
        fileName: '',
        images: null
      });

      console.log(`   ✅ Successfully migrated "${notice.title}"`);
    }

    console.log('\n\n✨ Migration complete!');
    console.log(`📊 Summary: ${pinnedNotices.length} notice(s) processed`);

    // List the migrated notices
    console.log('\n📋 Migrated notices:');
    pinnedNotices.forEach((notice, idx) => {
      console.log(`   ${idx + 1}. "${notice.title}"`);
      console.log(`      - Category: ${notice.category || 'N/A'}`);
      console.log(`      - Type: ${notice.fileType}`);
      console.log(`      - ID: ${notice.id}`);
    });

  } catch (err) {
    console.error('❌ Migration failed:', err);
    throw err;
  }
}

// Run migration
console.log('🚀 Starting migration: Pinned notices → Members-only');
console.log('==========================================\n');

migrateNoticesToMembersOnly()
  .then(() => {
    console.log('\n✅ All done!');
    process.exit(0);
  })
  .catch((err) => {
    console.error('\n❌ Error:', err);
    process.exit(1);
  });
