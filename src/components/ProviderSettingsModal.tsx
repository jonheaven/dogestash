import React, { useState, useEffect } from 'react';
import { Dialog } from '@headlessui/react';
import { XMarkIcon, EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import { useConfig, ProviderType } from '../utils/providers/ConfigProvider';
import { useToast } from '../contexts/ToastContext';

interface ProviderSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ProviderSettingsModal: React.FC<ProviderSettingsModalProps> = ({
  isOpen,
  onClose
}) => {
  const { config, setConfig, testConnection } = useConfig();
  const toast = useToast();

  const [selectedType, setSelectedType] = useState<ProviderType>(config.type);
  const [customUrl, setCustomUrl] = useState(config.url || '');
  const [customUsername, setCustomUsername] = useState(config.username || '');
  const [customPassword, setCustomPassword] = useState(config.password || '');
  const [showPassword, setShowPassword] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedType(config.type);
      setCustomUrl(config.url || '');
      setCustomUsername(config.username || '');
      setCustomPassword(config.password || '');
      setShowPassword(false);
    }
  }, [isOpen, config]);

  const handleTest = async () => {
    setIsTesting(true);
    try {
      const result = await testConnection(selectedType);
      toast[result.status === 'green' ? 'success' : 'error'](result.message);
    } catch (error) {
      toast.error('Connection test failed');
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const newConfig = {
        type: selectedType,
        ...(selectedType === 'custom' && {
          url: customUrl,
          username: customUsername,
          password: customPassword
        })
      };

      await setConfig(newConfig);
      toast.success('Provider configuration saved successfully');
      onClose();
    } catch (error) {
      toast.error('Failed to save provider configuration');
    } finally {
      setIsSaving(false);
    }
  };

  const isValidCustomConfig = selectedType !== 'custom' ||
    (customUrl.trim() && customUsername.trim() && customPassword.trim());

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/30" />

      {/* Modal */}
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="w-full max-w-md bg-bg-primary rounded-lg shadow-xl border border-border-primary">
          <div className="flex items-center justify-between p-6 border-b border-border-primary">
            <Dialog.Title className="text-lg font-semibold text-text-primary">
              Provider Configuration
            </Dialog.Title>
            <button
              onClick={onClose}
              className="p-1 hover:bg-bg-secondary rounded transition-colors"
            >
              <XMarkIcon className="w-5 h-5 text-text-secondary" />
            </button>
          </div>

          <div className="p-6 space-y-4">
            {/* Provider Type Selection */}
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Provider Type
              </label>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value as ProviderType)}
                className="w-full px-3 py-2 bg-bg-secondary border border-border-primary rounded-md text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="local">Local RPC (Dogecoin Core)</option>
                <option value="mydoge">Public Indexer API</option>
                <option value="custom">Custom RPC</option>
              </select>
            </div>

            {/* Custom RPC Configuration */}
            {selectedType === 'custom' && (
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">
                    RPC URL
                  </label>
                  <input
                    type="url"
                    value={customUrl}
                    onChange={(e) => setCustomUrl(e.target.value)}
                    placeholder="http://localhost:22555"
                    className="w-full px-3 py-2 bg-bg-secondary border border-border-primary rounded-md text-text-primary placeholder-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                  <p className="text-xs text-text-tertiary mt-1">
                    Include protocol and port (e.g., http://localhost:22555)
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">
                    Username
                  </label>
                  <input
                    type="text"
                    value={customUsername}
                    onChange={(e) => setCustomUsername(e.target.value)}
                    placeholder="rpcuser"
                    className="w-full px-3 py-2 bg-bg-secondary border border-border-primary rounded-md text-text-primary placeholder-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={customPassword}
                      onChange={(e) => setCustomPassword(e.target.value)}
                      placeholder="rpcpassword"
                      className="w-full px-3 py-2 pr-10 bg-bg-secondary border border-border-primary rounded-md text-text-primary placeholder-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-bg-primary rounded transition-colors"
                    >
                      {showPassword ? (
                        <EyeSlashIcon className="w-4 h-4 text-text-tertiary" />
                      ) : (
                        <EyeIcon className="w-4 h-4 text-text-tertiary" />
                      )}
                    </button>
                  </div>
                  <p className="text-xs text-text-tertiary mt-1">
                    Credentials are encrypted and stored locally
                  </p>
                </div>
              </div>
            )}

            {/* Provider Info */}
            <div className="p-3 bg-bg-secondary rounded-md">
              <h4 className="text-sm font-medium text-text-primary mb-1">Provider Information</h4>
              {selectedType === 'local' && (
                <p className="text-xs text-text-secondary">
                  Connects to your local Dogecoin Core node. Requires dogecoin.conf with rpcuser/rpcpassword.
                </p>
              )}
              {selectedType === 'mydoge' && (
                <p className="text-xs text-text-secondary">
                  Uses MyDoge's public API for wallet data. No configuration needed.
                </p>
              )}
              {selectedType === 'custom' && (
                <p className="text-xs text-text-secondary">
                  Connect to any Dogecoin RPC-compatible node. Credentials are encrypted locally.
                </p>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 p-6 border-t border-border-primary">
            <button
              onClick={handleTest}
              disabled={isTesting || !isValidCustomConfig}
              className="px-4 py-2 text-sm font-medium text-primary-500 hover:text-primary-400 hover:bg-primary-900/20 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isTesting ? 'Testing...' : 'Test Connection'}
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving || !isValidCustomConfig}
              className="px-4 py-2 text-sm font-medium text-white bg-primary-500 hover:bg-primary-400 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? 'Saving...' : 'Save Configuration'}
            </button>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
};

