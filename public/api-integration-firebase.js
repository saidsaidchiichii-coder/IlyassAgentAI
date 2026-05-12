import { auth, db, doc, setDoc, getDoc, onAuthStateChanged } from './firebase.js';

/**
 * API Integration Module (Firebase Version)
 * Handles API key generation and storage in Firebase
 */

const STORAGE_KEY_API_KEY = 'saas_api_key';

/**
 * Generate a secure random API key
 */
function generateKey() {
    const prefix = 'sk_live_';
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 32; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return prefix + result;
}

/**
 * Get or create API key for current user in Firebase
 */
export async function getOrCreateAPIKeyFirebase() {
    return new Promise((resolve, reject) => {
        onAuthStateChanged(auth, async (user) => {
            if (!user) {
                reject(new Error('User not logged in'));
                return;
            }

            try {
                const userDocRef = doc(db, "users", user.uid);
                const userDoc = await getDoc(userDocRef);

                if (userDoc.exists() && userDoc.data().apiKey) {
                    const apiKey = userDoc.data().apiKey;
                    localStorage.setItem(STORAGE_KEY_API_KEY, apiKey);
                    resolve(apiKey);
                } else {
                    // Create new API key
                    const newApiKey = generateKey();
                    await setDoc(userDocRef, {
                        apiKey: newApiKey,
                        email: user.email,
                        createdAt: new Date().toISOString(),
                        credits: 1000 // Default free credits
                    }, { merge: true });

                    localStorage.setItem(STORAGE_KEY_API_KEY, newApiKey);
                    resolve(newApiKey);
                }
            } catch (error) {
                console.error('Error in Firebase API key management:', error);
                reject(error);
            }
        });
    });
}

/**
 * Get user data from Firebase
 */
export async function getUserData() {
    return new Promise((resolve, reject) => {
        onAuthStateChanged(auth, async (user) => {
            if (!user) {
                resolve(null);
                return;
            }
            try {
                const userDoc = await getDoc(doc(db, "users", user.uid));
                resolve(userDoc.exists() ? userDoc.data() : null);
            } catch (e) {
                reject(e);
            }
        });
    });
}

window.getOrCreateAPIKeyFirebase = getOrCreateAPIKeyFirebase;
window.getUserData = getUserData;

/**
 * Get all connectors for current user
 */
export async function getConnectors() {
    return new Promise((resolve, reject) => {
        onAuthStateChanged(auth, async (user) => {
            if (!user) {
                resolve([]);
                return;
            }
            try {
                const userDoc = await getDoc(doc(db, "users", user.uid));
                const connectors = userDoc.exists() ? (userDoc.data().connectors || []) : [];
                resolve(connectors);
            } catch (e) {
                reject(e);
            }
        });
    });
}

/**
 * Get connector by platform
 */
export async function getConnectorByPlatform(platform) {
    return new Promise((resolve, reject) => {
        onAuthStateChanged(auth, async (user) => {
            if (!user) {
                resolve(null);
                return;
            }
            try {
                const userDoc = await getDoc(doc(db, "users", user.uid));
                const connectors = userDoc.exists() ? (userDoc.data().connectors || []) : [];
                const connector = connectors.find(c => c.platform === platform);
                resolve(connector || null);
            } catch (e) {
                reject(e);
            }
        });
    });
}

/**
 * Update connector website URL
 */
export async function updateConnectorWebsite(platform, websiteUrl) {
    return new Promise((resolve, reject) => {
        onAuthStateChanged(auth, async (user) => {
            if (!user) {
                reject(new Error('User not logged in'));
                return;
            }
            try {
                const userDocRef = doc(db, "users", user.uid);
                const userDoc = await getDoc(userDocRef);
                
                if (userDoc.exists()) {
                    const connectors = userDoc.data().connectors || [];
                    const updatedConnectors = connectors.map(c => 
                        c.platform === platform 
                            ? { ...c, websiteUrl, updatedAt: new Date().toISOString() }
                            : c
                    );
                    
                    await setDoc(userDocRef, { connectors: updatedConnectors }, { merge: true });
                    resolve(updatedConnectors.find(c => c.platform === platform));
                }
            } catch (e) {
                reject(e);
            }
        });
    });
}

window.getConnectors = getConnectors;
window.getConnectorByPlatform = getConnectorByPlatform;
window.updateConnectorWebsite = updateConnectorWebsite;
