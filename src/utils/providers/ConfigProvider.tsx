import React, { createContext, useState, useEffect, useCallback, useContext } from 'react';
import { useToast } from '../../contexts/ToastContext';

export type ProviderType = 'local' | 'mydoge' | 'custom';

export interface ProviderConfig {
  type: ProviderType;
  url?: string; // For custom
  username?: string;
  password?: string; // Will be encrypted
  encryptedCreds?: string; // Base64 encrypted credentials
  iv?: string; // Initialization vector for decryption
}

interface ConfigContextType {
  config: ProviderConfig;
  setConfig: (newConfig: ProviderConfig) => Promise<void>;
  testConnection: (type?: ProviderType) => Promise<{ status: 'green' | 'red'; message: string }>;
  status: { [key in ProviderType]: 'green' | 'red' | 'unknown' };
  isLoading: boolean;
}

const ConfigContext = createContext<ConfigContextType | null>(null);

export const useConfig = () => {
  const context = useContext(ConfigContext);
  if (!context) {
    throw new Error('useConfig must be used within a ConfigProvider');
  }
  return context;
};

// Encryption helpers using Web Crypto API
const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)));
};

const base64ToArrayBuffer = (base64: string): ArrayBuffer => {
  return Uint8Array.from(atob(base64), c => c.charCodeAt(0)).buffer;
};

const generateEncryptionKey = async (): Promise<CryptoKey> => {
  // Generate a key from a stable source (could be improved with user passphrase)
  const keyMaterial = await window.crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode('borkstarter-provider-key-v1'), // Fixed key for simplicity
    'PBKDF2',
    false,
    ['deriveKey']
  );

  return window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: new TextEncoder().encode('borkstarter-salt'),
      iterations: 100000,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
};

export const ConfigProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [config, setConfigState] = useState<ProviderConfig>({ type: 'local' });
  const [status, setStatus] = useState<{ [key in ProviderType]: 'green' | 'red' | 'unknown' }>({
    local: 'unknown',
    mydoge: 'unknown',
    custom: 'unknown'
  });
  const [isLoading, setIsLoading] = useState(false);
  const toast = useToast();

  // Encrypt credentials
  const encryptCredentials = async (creds: { username: string; password: string }): Promise<{ encryptedCreds: string; iv: string }> => {
    const key = await generateEncryptionKey();
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const data = new TextEncoder().encode(JSON.stringify(creds));

    const encrypted = await window.crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      data
    );

    return {
      encryptedCreds: arrayBufferToBase64(encrypted),
      iv: arrayBufferToBase64(iv)
    };
  };

  // Decrypt credentials
  const decryptCredentials = async (encryptedCreds: string, iv: string): Promise<{ username: string; password: string }> => {
    const key = await generateEncryptionKey();
    const encryptedData = base64ToArrayBuffer(encryptedCreds);
    const ivData = base64ToArrayBuffer(iv);

    const decrypted = await window.crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: ivData },
      key,
      encryptedData
    );

    return JSON.parse(new TextDecoder().decode(decrypted));
  };

  // Load configuration from localStorage
  useEffect(() => {
    const loadConfig = async () => {
      setIsLoading(true);
      try {
        const stored = localStorage.getItem('bork-provider-config');
        if (stored) {
          const parsed = JSON.parse(stored) as ProviderConfig;

          // Decrypt credentials if they exist
          if (parsed.type === 'custom' && parsed.encryptedCreds && parsed.iv) {
            try {
              const decrypted = await decryptCredentials(parsed.encryptedCreds, parsed.iv);
              parsed.username = decrypted.username;
              parsed.password = decrypted.password;
            } catch (error) {
              console.error('Failed to decrypt credentials:', error);
              toast.error('Failed to load saved credentials. Please reconfigure.');
              localStorage.removeItem('bork-provider-config');
              return;
            }
          }

          setConfigState(parsed);
          // Test connection after loading
          await testConnection(parsed.type);
        } else {
          // Default to local but don't test connection (service may not be running)
          setConfigState({ type: 'local' });
        }
      } catch (error) {
        console.error('Failed to load config:', error);
        toast.error('Failed to load provider configuration');
      } finally {
        setIsLoading(false);
      }
    };

    loadConfig();
  }, []);

  // Save configuration to localStorage
  const setConfig = async (newConfig: ProviderConfig) => {
    setIsLoading(true);
    try {
      let toSave = { ...newConfig };

      // Encrypt credentials for custom provider
      if (newConfig.type === 'custom' && newConfig.username && newConfig.password) {
        const encrypted = await encryptCredentials({
          username: newConfig.username,
          password: newConfig.password
        });
        toSave = {
          ...toSave,
          encryptedCreds: encrypted.encryptedCreds,
          iv: encrypted.iv,
          username: undefined, // Remove plain text
          password: undefined
        };
      }

      localStorage.setItem('bork-provider-config', JSON.stringify(toSave));
      setConfigState(newConfig);

      // Test the new configuration
      await testConnection(newConfig.type);
      toast.success('Provider configuration saved and tested');
    } catch (error) {
      console.error('Failed to save config:', error);
      toast.error('Failed to save provider configuration');
    } finally {
      setIsLoading(false);
    }
  };

  // Test connection for a specific provider
  const testConnection = useCallback(async (type?: ProviderType): Promise<{ status: 'green' | 'red'; message: string }> => {
    const providerToTest = type || config.type;

    try {
      setStatus(prev => ({ ...prev, [providerToTest]: 'unknown' }));

      let testUrl = '';
      let testMethod = 'GET';
      let testBody: any = undefined;
      let headers: Record<string, string> = {};

      switch (providerToTest) {
        case 'local':
          testUrl = 'http://localhost:22555';
          testMethod = 'POST';
          testBody = JSON.stringify({
            jsonrpc: '1.0',
            id: 'connection_test',
            method: 'getblockcount',
            params: []
          });
          headers = { 'Content-Type': 'application/json' };
          break;

        case 'mydoge':
          testUrl = 'http://localhost:3001/api/indexer/health';
          break;

        case 'custom':
          if (!config.url) {
            throw new Error('Custom RPC URL not configured');
          }
          testUrl = config.url.replace(/\/$/, ''); // Remove trailing slash
          testMethod = 'POST';
          testBody = JSON.stringify({
            jsonrpc: '1.0',
            id: 'connection_test',
            method: 'getblockcount',
            params: []
          });
          headers = { 'Content-Type': 'application/json' };

          // Add basic auth if credentials exist
          if (config.username && config.password) {
            const auth = btoa(`${config.username}:${config.password}`);
            headers.Authorization = `Basic ${auth}`;
          }
          break;

        default:
          throw new Error('Unknown provider type');
      }

      const response = await fetch(testUrl, {
        method: testMethod,
        headers,
        body: testBody,
        signal: AbortSignal.timeout(5000) // 5 second timeout
      });

      if (response.ok) {
        // For JSON-RPC, check if we got a valid response
        if (testMethod === 'POST') {
          const jsonResponse = await response.json();
          if (jsonResponse.result !== undefined) {
            setStatus(prev => ({ ...prev, [providerToTest]: 'green' }));
            return { status: 'green', message: 'Connection successful' };
          }
        } else {
          // For REST APIs, just check status
          setStatus(prev => ({ ...prev, [providerToTest]: 'green' }));
          return { status: 'green', message: 'Connection successful' };
        }
      }

      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      // For local connections, provide helpful message about service not running
      if (providerToTest === 'local' && errorMessage.includes('Failed to fetch')) {
        setStatus(prev => ({ ...prev, [providerToTest]: 'red' }));
        return {
          status: 'red',
          message: 'Local Dogecoin node not running. Start your local node or switch to a remote provider.'
        };
      }

      setStatus(prev => ({ ...prev, [providerToTest]: 'red' }));
      return { status: 'red', message: `Connection failed: ${errorMessage}` };
    }
  }, [config]);

  // Periodic status checking (disabled in development by default)
  useEffect(() => {
    // Only enable periodic checking if explicitly requested
    if (getEnv('VITE_ENABLE_CONNECTION_MONITORING', 'false') !== 'true') {
      return;
    }

    const interval = setInterval(() => {
      // Test current active provider
      testConnection(config.type);
    }, 30000); // Every 30 seconds

    return () => clearInterval(interval);
  }, [config.type, testConnection]);

  const value: ConfigContextType = {
    config,
    setConfig,
    testConnection,
    status,
    isLoading
  };

  return (
    <ConfigContext.Provider value={value}>
      {children}
    </ConfigContext.Provider>
  );
};

