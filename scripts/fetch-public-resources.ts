/**
 * Shared Firestore fetch used by static generation and the style check.
 * Same public-read path as scripts/generate-static-pages.ts.
 */
import { initializeApp as webInitializeApp, getApps as webGetApps, deleteApp } from 'firebase/app';
import { getFirestore as webGetFirestore, collection, getDocs, query, orderBy, terminate } from 'firebase/firestore';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export interface ResourceItem {
  id: string;
  title: string;
  description?: string;
  fileUrl?: string;
  fileName?: string;
  fileType: string;
  createdAt?: any;
  content?: string;
  locked?: boolean;
  membersOnly?: boolean;
  category?: '대입' | '고입' | '학습자료';
}

function loadAppletConfig() {
  return JSON.parse(fs.readFileSync(path.join(__dirname, '../firebase-applet-config.json'), 'utf-8'));
}

export async function fetchResourcesPublic(timeoutMs = 30_000): Promise<ResourceItem[]> {
  const firebaseAppletConfig = loadAppletConfig();
  const firebaseConfig = {
    apiKey: process.env.VITE_FIREBASE_API_KEY || firebaseAppletConfig.apiKey,
    authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN || firebaseAppletConfig.authDomain,
    projectId: process.env.VITE_FIREBASE_PROJECT_ID || firebaseAppletConfig.projectId,
    storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET || firebaseAppletConfig.storageBucket,
    messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || firebaseAppletConfig.messagingSenderId,
    appId: process.env.VITE_FIREBASE_APP_ID || firebaseAppletConfig.appId,
  };

  const app = webGetApps().length === 0 ? webInitializeApp(firebaseConfig, 'ssg-app') : webGetApps()[0];
  const db = firebaseAppletConfig.firestoreDatabaseId
    ? webGetFirestore(app, firebaseAppletConfig.firestoreDatabaseId)
    : webGetFirestore(app);

  const resources: ResourceItem[] = [];

  const withTimeout = <T>(work: Promise<T>, label: string) =>
    Promise.race([
      work,
      new Promise<T>((_, reject) => setTimeout(() => reject(new Error(`${label} timeout`)), timeoutMs)),
    ]);

  try {
    await withTimeout((async () => {
      const q = query(collection(db, 'resources'), orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      querySnapshot.forEach((docSnap) => {
        resources.push({ id: docSnap.id, ...docSnap.data() } as ResourceItem);
      });
    })(), 'Firestore fetch');
  } catch (orderErr: any) {
    if (String(orderErr?.message || '').includes('timeout')) {
      console.warn('⚠️  Firestore fetch timed out');
    } else {
      console.warn('Ordered query failed, falling back to unordered:', orderErr.message);
      try {
        await withTimeout((async () => {
          const querySnapshot = await getDocs(collection(db, 'resources'));
          querySnapshot.forEach((docSnap) => {
            resources.push({ id: docSnap.id, ...docSnap.data() } as ResourceItem);
          });
          resources.sort((a, b) => {
            const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : (a.createdAt ? new Date(a.createdAt).getTime() : 0);
            const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : (b.createdAt ? new Date(b.createdAt).getTime() : 0);
            return timeB - timeA;
          });
        })(), 'Firestore unordered fetch');
      } catch (fallbackErr: any) {
        if (String(fallbackErr?.message || '').includes('timeout')) {
          console.warn('⚠️  Firestore unordered fetch also timed out');
        } else {
          console.warn('⚠️  Fallback fetch also failed:', fallbackErr.message);
        }
      }
    }
  } finally {
    try {
      await terminate(db);
      await deleteApp(app);
    } catch (cleanupErr) {
      console.warn('Warning: Could not clean up Firebase app:', cleanupErr);
    }
  }

  return resources;
}
