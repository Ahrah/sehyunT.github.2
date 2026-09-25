/**
 * Client-side AES-GCM encryption/decryption with PBKDF2 key derivation.
 * OPTION A: No server-side validation, ciphertext stored in Firestore doc.
 */

const PBKDF2_ITERATIONS = 310000;
const SALT_LENGTH = 16;
const IV_LENGTH = 12;

/**
 * Derives an AES-GCM-256 key from a password using PBKDF2-SHA256.
 */
async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const passwordKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256'
    },
    passwordKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypts a payload object with a password.
 * Returns { lockSalt, lockIv, lockIter, lockCipher } in base64.
 */
export async function encryptPayload(
  payload: { content: string | null; fileUrl: string; fileName: string },
  password: string
): Promise<{ lockSalt: string; lockIv: string; lockIter: number; lockCipher: string }> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const key = await deriveKey(password, salt);

  const encoder = new TextEncoder();
  const plaintext = encoder.encode(JSON.stringify(payload));

  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    plaintext
  );

  return {
    lockSalt: arrayBufferToBase64(salt),
    lockIv: arrayBufferToBase64(iv),
    lockIter: PBKDF2_ITERATIONS,
    lockCipher: arrayBufferToBase64(ciphertext)
  };
}

/**
 * Decrypts a locked resource with a password.
 * Throws an error if the password is incorrect or decryption fails.
 */
export async function decryptPayload(
  lockSalt: string,
  lockIv: string,
  lockCipher: string,
  password: string
): Promise<{ content: string | null; fileUrl: string; fileName: string }> {
  const salt = base64ToArrayBuffer(lockSalt);
  const iv = base64ToArrayBuffer(lockIv);
  const ciphertext = base64ToArrayBuffer(lockCipher);

  const key = await deriveKey(password, salt);

  try {
    const plaintext = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      ciphertext
    );

    const decoder = new TextDecoder();
    const json = decoder.decode(plaintext);
    return JSON.parse(json);
  } catch (err) {
    throw new Error('DECRYPT_FAILED');
  }
}

function arrayBufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToArrayBuffer(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}
