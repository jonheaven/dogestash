import React, { useState, useEffect } from 'react';
import { XMarkIcon, ArrowTopRightOnSquareIcon, CubeIcon } from '@heroicons/react/24/outline';

interface InscriptionData {
  address: string;
  content: string;
  contentBody: string;
  contentLength: number;
  contentType: string;
  genesisTransaction: string;
  inscriptionId: string;
  inscriptionNumber: number;
  output: string;
  outputValue: string;
  preview: string;
  timestamp: number;
  height: number;
  location: string;
}

interface InscriptionModalProps {
  inscriptionId: string;
  isOpen: boolean;
  onClose: () => void;
}

export const InscriptionModal: React.FC<InscriptionModalProps> = ({
  inscriptionId,
  isOpen,
  onClose
}) => {
  const [inscription, setInscription] = useState<InscriptionData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && inscriptionId) {
      fetchInscriptionDetails();
    }
  }, [isOpen, inscriptionId]);

  const fetchInscriptionDetails = async () => {
    setIsLoading(true);
    setError(null);

    try {
      console.log(`🔍 Fetching inscription details for: ${inscriptionId}`);

      // Try local API proxy first (for development)
      let response;
      try {
        response = await fetch(`http://localhost:7070/api/inscriptions/${inscriptionId}`);
      } catch (proxyError) {
        console.log('📡 Local proxy not available, trying direct API...');
        // Fallback to direct API call (may fail due to CORS in development)
        response = await fetch(`https://api.doggy.market/inscriptions/${inscriptionId}`);
      }

      if (!response.ok) {
        throw new Error(`Failed to fetch inscription: ${response.status}`);
      }

      const data = await response.json();
      console.log('📊 Inscription details:', data);

      setInscription(data);
    } catch (error: any) {
      console.error('❌ Failed to fetch inscription details:', error);

      // Provide helpful error message for CORS issues
      if (error.message?.includes('CORS') || error.message?.includes('Failed to fetch')) {
        setError(
          'Unable to load inscription details due to CORS restrictions. ' +
          'Please view this inscription directly on Doggy Market.'
        );
      } else {
        setError(error.message || 'Failed to load inscription details');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleString();
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-bg-secondary rounded-lg border border-border-primary shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border-primary">
          <div>
            <h2 className="text-xl font-bold text-text-primary">
              Inscription Details
            </h2>
            <p className="text-sm text-text-secondary mt-1">
              #{inscription?.inscriptionNumber || 'Loading...'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-bg-primary rounded-lg transition-colors"
          >
            <XMarkIcon className="w-5 h-5 text-text-secondary" />
          </button>
        </div>

        {/* Content */}
        <div className="flex max-h-[calc(90vh-80px)]">
          {/* Left side - Image */}
          <div className="w-1/2 p-6 border-r border-border-primary">
            {isLoading ? (
              <div className="w-full h-96 bg-bg-primary rounded-lg flex items-center justify-center">
                <div className="text-center">
                  <CubeIcon className="w-12 h-12 text-text-secondary mx-auto mb-4" />
                  <p className="text-text-secondary">Loading inscription...</p>
                </div>
              </div>
            ) : error ? (
              <div className="w-full h-96 bg-red-900/20 border border-red-700/50 rounded-lg flex items-center justify-center">
                <div className="text-center">
                  <p className="text-red-400 font-medium mb-2">Failed to load inscription</p>
                  <p className="text-red-300 text-sm mb-4">{error}</p>
                  {error.includes('CORS') && (
                    <a
                      href={`https://doggy.market/inscription/${inscriptionId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center space-x-2 px-4 py-2 bg-primary-500 hover:bg-primary-400 text-bg-primary rounded-lg transition-colors text-sm"
                    >
                      <span>View on Doggy Market</span>
                      <ArrowTopRightOnSquareIcon className="w-4 h-4" />
                    </a>
                  )}
                </div>
              </div>
            ) : inscription ? (
              <div className="space-y-4">
                <div className="relative group">
                  {inscription.contentType?.startsWith('image/') ? (
                    <img
                      src={inscription.content}
                      alt={`Inscription ${inscription.inscriptionId}`}
                      className="w-full max-h-96 object-contain rounded-lg bg-bg-primary"
                      onError={(e) => {
                        e.currentTarget.src = inscription.preview || '';
                      }}
                    />
                  ) : (
                    <div className="w-full h-96 bg-bg-primary rounded-lg flex items-center justify-center">
                      <div className="text-center">
                        <CubeIcon className="w-16 h-16 text-text-secondary mx-auto mb-4" />
                        <p className="text-text-secondary">Non-image content</p>
                        <p className="text-xs text-text-tertiary mt-1">
                          {inscription.contentType}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Action buttons */}
                <div className="flex space-x-2">
                  <a
                    href={`https://doggy.market/inscription/${inscription.inscriptionId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 bg-primary-500 hover:bg-primary-400 text-bg-primary rounded-lg transition-colors text-sm"
                  >
                    <span>View on Doggy Market</span>
                    <ArrowTopRightOnSquareIcon className="w-4 h-4" />
                  </a>
                </div>
              </div>
            ) : null}
          </div>

          {/* Right side - Data table */}
          <div className="w-1/2 p-6 overflow-y-auto">
            {inscription && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-text-primary mb-4">
                  Inscription Data
                </h3>

                <div className="space-y-4">
                  {/* Basic Info */}
                  <div>
                    <h4 className="text-sm font-medium text-text-primary mb-3 uppercase tracking-wide">
                      Basic Information
                    </h4>
                    <div className="space-y-2">
                      <DataRow label="Inscription ID" value={inscription.inscriptionId} copyable />
                      <DataRow label="Inscription Number" value={`#${inscription.inscriptionNumber}`} />
                      <DataRow label="Address" value={inscription.address} copyable />
                      <DataRow label="Content Type" value={inscription.contentType} />
                      <DataRow label="Content Length" value={formatFileSize(inscription.contentLength)} />
                      <DataRow label="Output Value" value={`${parseInt(inscription.outputValue) / 100000000} DOGE`} />
                    </div>
                  </div>

                  {/* Blockchain Info */}
                  <div>
                    <h4 className="text-sm font-medium text-text-primary mb-3 uppercase tracking-wide">
                      Blockchain Information
                    </h4>
                    <div className="space-y-2">
                      <DataRow label="Genesis Transaction" value={inscription.genesisTransaction} copyable />
                      <DataRow label="Output" value={inscription.output} copyable />
                      <DataRow label="Location" value={inscription.location} copyable />
                      <DataRow label="Block Height" value={inscription.height.toLocaleString()} />
                      <DataRow label="Timestamp" value={formatTimestamp(inscription.timestamp)} />
                    </div>
                  </div>

                  {/* Content Links */}
                  <div>
                    <h4 className="text-sm font-medium text-text-primary mb-3 uppercase tracking-wide">
                      Content Links
                    </h4>
                    <div className="space-y-2">
                      <DataRow label="Content URL" value={inscription.content} copyable link />
                      <DataRow label="Preview URL" value={inscription.preview} copyable link />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Helper component for data rows
const DataRow: React.FC<{
  label: string;
  value: string;
  copyable?: boolean;
  link?: boolean;
}> = ({ label, value, copyable, link }) => {
  const handleCopy = () => {
    navigator.clipboard.writeText(value);
  };

  return (
    <div className="flex items-start justify-between py-2 border-b border-border-primary/50 last:border-b-0">
      <span className="text-sm text-text-secondary font-medium min-w-0 flex-1 mr-4">
        {label}:
      </span>
      <div className="flex items-center space-x-2 min-w-0 flex-1">
        {link ? (
          <a
            href={value}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-primary-400 hover:text-primary-300 truncate underline"
          >
            {value.length > 20 ? `${value.slice(0, 20)}...` : value}
          </a>
        ) : (
          <span className="text-sm text-text-primary font-mono break-all">
            {value}
          </span>
        )}
        {copyable && (
          <button
            onClick={handleCopy}
            className="text-text-tertiary hover:text-text-secondary transition-colors ml-2 flex-shrink-0"
            title="Copy to clipboard"
          >
            📋
          </button>
        )}
      </div>
    </div>
  );
};
