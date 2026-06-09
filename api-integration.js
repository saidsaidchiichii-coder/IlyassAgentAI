/**
 * API Integration Module
 * Connects IlyassAI with the SaaS API Gateway
 * Handles API key generation, credit management, and usage tracking
 */

// Configuration
const SAAS_API_BASE = 'https://3000-iwlcjfsm020c2zwbja7rn-53569f2c.us2.manus.computer'; // Replace with your SaaS API URL
const STORAGE_KEY_API_KEY = 'saas_api_key';
const STORAGE_KEY_USER_ID = 'saas_user_id';
const STORAGE_KEY_CREDITS = 'saas_credits';

/**
 * Initialize API integration
 */
export async function initializeAPIIntegration() {
  console.log('[API Integration] Initializing...');
  
  // Check if user has existing API key
  const existingKey = localStorage.getItem(STORAGE_KEY_API_KEY);
  if (existingKey) {
    console.log('[API Integration] Found existing API key');
    await refreshUserCredits();
  }
}

/**
 * Get or create API key for current user
 */
export async function getOrCreateAPIKey() {
  try {
    // Check if user already has a key
    const existingKey = localStorage.getItem(STORAGE_KEY_API_KEY);
    if (existingKey) {
      console.log('[API Integration] Using existing API key');
      return existingKey;
    }

    // Create new API key
    const response = await fetch(`${SAAS_API_BASE}/api/trpc/apiKeys.create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error(`Failed to create API key: ${response.statusText}`);
    }

    const data = await response.json();
    const apiKey = data.result?.data?.key;

    if (!apiKey) {
      throw new Error('No API key returned from server');
    }

    // Store API key locally
    localStorage.setItem(STORAGE_KEY_API_KEY, apiKey);
    console.log('[API Integration] API key created and stored');

    return apiKey;
  } catch (error) {
    console.error('[API Integration] Error getting/creating API key:', error);
    throw error;
  }
}

/**
 * Get user's current credit balance
 */
export async function getUserCredits() {
  try {
    const response = await fetch(`${SAAS_API_BASE}/api/trpc/credits.getBalance`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error(`Failed to get credits: ${response.statusText}`);
    }

    const data = await response.json();
    const credits = data.result?.data?.balance || 0;

    // Cache credits
    localStorage.setItem(STORAGE_KEY_CREDITS, credits.toString());
    return credits;
  } catch (error) {
    console.error('[API Integration] Error getting credits:', error);
    // Return cached value if available
    const cached = localStorage.getItem(STORAGE_KEY_CREDITS);
    return cached ? parseInt(cached) : 0;
  }
}

/**
 * Refresh user credits from server
 */
export async function refreshUserCredits() {
  return await getUserCredits();
}

/**
 * Get user's API keys list
 */
export async function getUserAPIKeys() {
  try {
    const response = await fetch(`${SAAS_API_BASE}/api/trpc/apiKeys.list`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error(`Failed to get API keys: ${response.statusText}`);
    }

    const data = await response.json();
    return data.result?.data || [];
  } catch (error) {
    console.error('[API Integration] Error getting API keys:', error);
    return [];
  }
}

/**
 * Revoke an API key
 */
export async function revokeAPIKey(keyId) {
  try {
    const response = await fetch(`${SAAS_API_BASE}/api/trpc/apiKeys.revoke`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ keyId }),
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error(`Failed to revoke API key: ${response.statusText}`);
    }

    return true;
  } catch (error) {
    console.error('[API Integration] Error revoking API key:', error);
    throw error;
  }
}

/**
 * Get user's usage logs
 */
export async function getUserUsageLogs(limit = 50) {
  try {
    const response = await fetch(`${SAAS_API_BASE}/api/trpc/usage.getLogs?limit=${limit}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error(`Failed to get usage logs: ${response.statusText}`);
    }

    const data = await response.json();
    return data.result?.data || [];
  } catch (error) {
    console.error('[API Integration] Error getting usage logs:', error);
    return [];
  }
}

/**
 * Get credit transaction history
 */
export async function getCreditTransactions(limit = 50) {
  try {
    const response = await fetch(`${SAAS_API_BASE}/api/trpc/credits.getTransactions?limit=${limit}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error(`Failed to get transactions: ${response.statusText}`);
    }

    const data = await response.json();
    return data.result?.data || [];
  } catch (error) {
    console.error('[API Integration] Error getting transactions:', error);
    return [];
  }
}

/**
 * Create Stripe checkout session for credit purchase
 */
export async function createCheckoutSession(packageType, returnUrl) {
  try {
    const response = await fetch(`${SAAS_API_BASE}/api/trpc/payment.createCheckout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        packageType,
        returnUrl,
      }),
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error(`Failed to create checkout: ${response.statusText}`);
    }

    const data = await response.json();
    return data.result?.data?.url;
  } catch (error) {
    console.error('[API Integration] Error creating checkout:', error);
    throw error;
  }
}

/**
 * Call the API Gateway to use credits
 */
export async function callAPIGateway(endpoint, payload) {
  try {
    const apiKey = localStorage.getItem(STORAGE_KEY_API_KEY);
    if (!apiKey) {
      throw new Error('No API key found. Please get an API key first.');
    }

    const response = await fetch(`${SAAS_API_BASE}/api/v1/gateway`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        endpoint,
        ...payload,
      }),
    });

    if (response.status === 402) {
      throw new Error('Insufficient credits. Please purchase more credits.');
    }

    if (response.status === 401) {
      throw new Error('Invalid API key. Please get a new one.');
    }

    if (!response.ok) {
      throw new Error(`API call failed: ${response.statusText}`);
    }

    const data = await response.json();
    
    // Refresh credits after successful call
    await refreshUserCredits();
    
    return data;
  } catch (error) {
    console.error('[API Integration] Error calling API Gateway:', error);
    throw error;
  }
}

/**
 * Display API key in UI
 */
export function displayAPIKey(apiKey) {
  // Mask the key for security (show only last 8 characters)
  const masked = 'sk_live_' + '*'.repeat(Math.max(0, apiKey.length - 16)) + apiKey.slice(-8);
  return masked;
}

/**
 * Copy API key to clipboard
 */
export function copyAPIKeyToClipboard(apiKey) {
  try {
    navigator.clipboard.writeText(apiKey);
    console.log('[API Integration] API key copied to clipboard');
    return true;
  } catch (error) {
    console.error('[API Integration] Error copying to clipboard:', error);
    return false;
  }
}

export default {
  initializeAPIIntegration,
  getOrCreateAPIKey,
  getUserCredits,
  refreshUserCredits,
  getUserAPIKeys,
  revokeAPIKey,
  getUserUsageLogs,
  getCreditTransactions,
  createCheckoutSession,
  callAPIGateway,
  displayAPIKey,
  copyAPIKeyToClipboard,
};
