import { doc, setDoc, getDoc, deleteDoc } from 'firebase/firestore';
import { db } from './firebase';

/**
 * Admin-only password storage for resources.
 * Stores plaintext passwords that only the admin can read.
 */

interface StoredPassword {
  password: string;
  updatedAt: Date;
}

/**
 * Save a resource password to the admin-only collection.
 * @param resourceId - The resource document ID
 * @param password - The plaintext password
 */
export async function saveResourcePassword(
  resourceId: string,
  password: string
): Promise<void> {
  const passwordDoc = doc(db, 'resourcePasswords', resourceId);
  await setDoc(passwordDoc, {
    password,
    updatedAt: new Date()
  });
}

/**
 * Retrieve a resource password from the admin-only collection.
 * Returns null if no password is stored.
 * @param resourceId - The resource document ID
 */
export async function getResourcePassword(
  resourceId: string
): Promise<string | null> {
  try {
    const passwordDoc = doc(db, 'resourcePasswords', resourceId);
    const snapshot = await getDoc(passwordDoc);
    
    if (!snapshot.exists()) {
      return null;
    }
    
    const data = snapshot.data() as StoredPassword;
    return data.password || null;
  } catch (err) {
    console.error('Error fetching resource password:', err);
    return null;
  }
}

/**
 * Delete a resource password from the admin-only collection.
 * @param resourceId - The resource document ID
 */
export async function deleteResourcePassword(
  resourceId: string
): Promise<void> {
  try {
    const passwordDoc = doc(db, 'resourcePasswords', resourceId);
    await deleteDoc(passwordDoc);
  } catch (err) {
    console.error('Error deleting resource password:', err);
  }
}
