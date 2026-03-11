import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { DocumentTextIcon, TableCellsIcon, CheckCircleIcon, XCircleIcon, ExclamationTriangleIcon, CloudArrowDownIcon } from '@heroicons/react/24/outline';
import { useToast } from '../../contexts/ToastContext';
import { downloadCSVTemplate, getTemplateStats, templatePresets } from '../../utils/csvTemplateGenerator';

interface Recipient {
  address: string;
  amount?: string;
  inscription_id?: string;
  status: 'valid' | 'invalid';
  error?: string;
}

interface RecipientImporterProps {
  assetType: 'tokens' | 'collectibles';
  selectedAsset: any;
  recipients: Recipient[];
  onRecipientsChange: (recipients: Recipient[]) => void;
  onNext: () => void;
  onBack: () => void;
  canProceed: boolean;
}

export const RecipientImporter: React.FC<RecipientImporterProps> = ({
  assetType,
  selectedAsset,
  recipients,
  onRecipientsChange,
  onNext,
  onBack,
  canProceed
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const toast = useToast();

  // Validate Dogecoin address
  const isValidDogecoinAddress = (address: string): boolean => {
    // Basic validation: starts with 'D', 34 characters, valid base58
    return /^D[a-km-zA-HJ-NP-Z0-9]{33}$/.test(address);
  };

  // Handle template download
  const handleTemplateDownload = (presetKey: keyof typeof templatePresets) => {
    const preset = templatePresets[presetKey];
    downloadCSVTemplate({
      size: preset.size,
      tokenAmount: preset.tokenAmount,
      filename: `doge-drop-${presetKey}-${preset.size}wallets.csv`
    });

    const stats = getTemplateStats(preset);
    toast.success(`🐕 Template downloaded! ${stats.walletCount} wallets, ${stats.totalTokens} total tokens`);
  };

  // Parse CSV content
  const parseCSV = (content: string): Recipient[] => {
    const lines = content.trim().split('\n');
    const headers = lines[0].toLowerCase().split(',').map(h => h.trim());

    if (assetType === 'tokens') {
      if (!headers.includes('address') || !headers.includes('amount')) {
        throw new Error('CSV must contain "address" and "amount" columns');
      }
    } else {
      if (!headers.includes('address') || !headers.includes('inscription_id')) {
        throw new Error('CSV must contain "address" and "inscription_id" columns');
      }
    }

    return lines.slice(1).map((line, index) => {
      const values = line.split(',').map(v => v.trim().replace(/"/g, ''));

      if (assetType === 'tokens') {
        const address = values[headers.indexOf('address')];
        const amount = values[headers.indexOf('amount')];

        return {
          address,
          amount,
          status: isValidDogecoinAddress(address) && !isNaN(parseFloat(amount)) ? 'valid' : 'invalid',
          error: !isValidDogecoinAddress(address) ? 'Invalid Dogecoin address' :
                 isNaN(parseFloat(amount)) ? 'Invalid amount' : undefined
        };
      } else {
        const address = values[headers.indexOf('address')];
        const inscription_id = values[headers.indexOf('inscription_id')];

        return {
          address,
          inscription_id,
          status: isValidDogecoinAddress(address) && inscription_id ? 'valid' : 'invalid',
          error: !isValidDogecoinAddress(address) ? 'Invalid Dogecoin address' :
                 !inscription_id ? 'Missing inscription ID' : undefined
        };
      }
    });
  };

  // Parse JSON content
  const parseJSON = (content: string): Recipient[] => {
    try {
      const data = JSON.parse(content);

      // Handle different JSON formats
      let recipientData = data;
      if (data.recipients) recipientData = data.recipients;
      if (!Array.isArray(recipientData)) recipientData = [recipientData];

      return recipientData.map((item: any) => {
        if (assetType === 'tokens') {
          const address = item.address || item.Address;
          const amount = item.amount || item.Amount;

          return {
            address,
            amount: amount?.toString(),
            status: isValidDogecoinAddress(address) && !isNaN(parseFloat(amount)) ? 'valid' : 'invalid',
            error: !isValidDogecoinAddress(address) ? 'Invalid Dogecoin address' :
                   isNaN(parseFloat(amount)) ? 'Invalid amount' : undefined
          };
        } else {
          const address = item.address || item.Address;
          const inscription_id = item.inscription_id || item.inscriptionId;

          return {
            address,
            inscription_id,
            status: isValidDogecoinAddress(address) && inscription_id ? 'valid' : 'invalid',
            error: !isValidDogecoinAddress(address) ? 'Invalid Dogecoin address' :
                   !inscription_id ? 'Missing inscription ID' : undefined
          };
        }
      });
    } catch (error) {
      throw new Error('Invalid JSON format');
    }
  };

  // Handle file drop
  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setIsProcessing(true);
    toast.info(`Processing ${file.name}...`, 2000);

    try {
      const content = await file.text();
      let parsedRecipients: Recipient[];

      if (file.name.endsWith('.csv')) {
        parsedRecipients = parseCSV(content);
      } else if (file.name.endsWith('.json')) {
        parsedRecipients = parseJSON(content);
      } else {
        throw new Error('Unsupported file format. Please use CSV or JSON.');
      }

      onRecipientsChange(parsedRecipients);

      const validCount = parsedRecipients.filter(r => r.status === 'valid').length;
      const invalidCount = parsedRecipients.filter(r => r.status === 'invalid').length;

      if (validCount > 0) {
        toast.success(`File processed! ${validCount} valid recipients found.`);
      }
      if (invalidCount > 0) {
        toast.warning(`${invalidCount} recipients have validation errors. Please check the table below.`);
      }
    } catch (error: any) {
      console.error('File parsing error:', error);
      toast.error(error.message || 'Failed to process file. Please check the format.');
    } finally {
      setIsProcessing(false);
    }
  }, [assetType, onRecipientsChange, toast]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/json': ['.json']
    },
    maxFiles: 1,
    maxSize: 1024 * 1024 // 1MB
  });

  // Download sample files

  const validRecipients = recipients.filter(r => r.status === 'valid');
  const invalidRecipients = recipients.filter(r => r.status === 'invalid');

  return (
    <div className="space-y-6">
      <div className="bg-bg-secondary rounded-lg p-6 border border-border-primary">
        <h2 className="text-2xl font-bold text-text-primary mb-6">Import Recipients</h2>

        {/* CSV Template Downloads */}
        <div data-tour="csv-templates" className="mb-6">
          <h3 className="text-lg font-semibold text-text-primary mb-4">📄 Quick Start Templates</h3>
          <p className="text-sm text-text-secondary mb-4">
            Download pre-formatted CSV templates to get started quickly. Edit the addresses and amounts, then upload your file.
          </p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {Object.entries(templatePresets).map(([key, preset]) => {
              const stats = getTemplateStats(preset);
              return (
                <button
                  key={key}
                  onClick={() => handleTemplateDownload(key as keyof typeof templatePresets)}
                  className="p-4 bg-bg-primary border border-border-primary rounded-lg hover:border-primary-500 hover:bg-primary-900/10 transition-all duration-200 text-left group"
                >
                  <div className="flex items-center space-x-2 mb-2">
                    <CloudArrowDownIcon className="w-5 h-5 text-primary-500 group-hover:animate-bounce" />
                    <span className="font-medium text-text-primary">{preset.label}</span>
                  </div>
                  <div className="text-xs text-text-secondary space-y-1">
                    <div>{stats.walletCount} wallets</div>
                    <div>{stats.tokenAmount} tokens each</div>
                    <div className="font-medium text-primary-400">{stats.totalTokens} total</div>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="mt-4 p-3 bg-yellow-900/20 border border-yellow-700/50 rounded-lg">
            <p className="text-xs text-yellow-400">
              💡 <strong>Pro tip:</strong> Templates include valid Dogecoin address formats. Replace sample addresses with your recipient wallets before uploading.
            </p>
          </div>
        </div>

        {/* File Upload Zone */}
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors duration-200 ${
            isDragActive || dragActive
              ? 'border-primary-500 bg-primary-900/20'
              : 'border-border-primary hover:border-gray-600 hover:bg-bg-primary'
          }`}
          onDragEnter={() => setDragActive(true)}
          onDragLeave={() => setDragActive(false)}
        >
          <input {...getInputProps()} />
          <div className="space-y-4">
            <div className="flex justify-center space-x-4">
              <DocumentTextIcon className="w-12 h-12 text-text-tertiary" />
              <TableCellsIcon className="w-12 h-12 text-text-tertiary" />
            </div>
            <div>
              <p className="text-lg font-medium text-text-primary">
                {isProcessing ? 'Processing file...' : 'Drop your file here or click to browse'}
              </p>
              <p className="text-sm text-text-secondary mt-2">
                Supports CSV and JSON formats (max 1MB)
              </p>
            </div>
          </div>
        </div>

        {/* Expected Formats */}
        <div className="mt-6 p-4 bg-bg-primary rounded-lg">
          <h4 className="font-medium text-text-primary mb-3">Expected Formats:</h4>

          {assetType === 'tokens' ? (
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-text-secondary mb-2">CSV Format:</p>
                <code className="block p-2 bg-gray-900 rounded text-xs text-green-400 font-mono">
                  address,amount<br />
                  D7xK4j2p5mN8vQ3rT6uY1oA9bC2dE4fG6hI8jK0lM3nP5qR7sT9uV1wX3yZ5,100<br />
                  D2aB5cD8eF1gH4iJ7kL0mN3oP6qR9sT2uV5wX8yZ1aB4cD7eF0gH3iJ6kL9m,50
                </code>
              </div>
              <div>
                <p className="text-sm font-medium text-text-secondary mb-2">JSON Format:</p>
                <code className="block p-2 bg-gray-900 rounded text-xs text-blue-400 font-mono whitespace-pre">
{`[{
  "address": "D7xK4j2p5mN8vQ3rT6uY1oA9bC2dE4fG6hI8jK0lM3nP5qR7sT9uV1wX3yZ5",
  "amount": "100"
}]`}
                </code>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-text-secondary mb-2">CSV Format:</p>
                <code className="block p-2 bg-gray-900 rounded text-xs text-green-400 font-mono">
                  address,inscription_id<br />
                  D7xK4j2p5mN8vQ3rT6uY1oA9bC2dE4fG6hI8jK0lM3nP5qR7sT9uV1wX3yZ5,insc_doge_001<br />
                  D2aB5cD8eF1gH4iJ7kL0mN3oP6qR9sT2uV5wX8yZ1aB4cD7eF0gH3iJ6kL9m,insc_doge_002
                </code>
              </div>
              <div>
                <p className="text-sm font-medium text-text-secondary mb-2">JSON Format:</p>
                <code className="block p-2 bg-gray-900 rounded text-xs text-blue-400 font-mono whitespace-pre">
{`[{
  "address": "D7xK4j2p5mN8vQ3rT6uY1oA9bC2dE4fG6hI8jK0lM3nP5qR7sT9uV1wX3yZ5",
  "inscription_id": "insc_doge_001"
}]`}
                </code>
              </div>
            </div>
          )}

          {/* Alternative Formats */}
          <div className="mt-4 p-3 bg-bg-primary rounded-lg border border-border-primary">
            <p className="text-sm text-text-secondary">
              💡 <strong>Alternative formats:</strong> You can also upload JSON files with the same data structure, or use our CSV templates above for the best experience.
            </p>
          </div>
        </div>

        {/* Recipients Preview */}
        {recipients.length > 0 && (
          <div className="mt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-text-primary">Recipients Preview</h3>
              <div className="flex items-center space-x-4 text-sm">
                <span className="flex items-center space-x-1 text-green-400">
                  <CheckCircleIcon className="w-4 h-4" />
                  <span>{validRecipients.length} Valid</span>
                </span>
                {invalidRecipients.length > 0 && (
                  <span className="flex items-center space-x-1 text-red-400">
                    <XCircleIcon className="w-4 h-4" />
                    <span>{invalidRecipients.length} Invalid</span>
                  </span>
                )}
              </div>
            </div>

            <div className="max-h-64 overflow-y-auto border border-border-primary rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-bg-primary">
                  <tr>
                    <th className="px-4 py-2 text-left text-text-secondary">#</th>
                    <th className="px-4 py-2 text-left text-text-secondary">Address</th>
                    {assetType === 'tokens' ? (
                      <th className="px-4 py-2 text-left text-text-secondary">Amount</th>
                    ) : (
                      <th className="px-4 py-2 text-left text-text-secondary">Inscription ID</th>
                    )}
                    <th className="px-4 py-2 text-left text-text-secondary">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recipients.map((recipient, index) => (
                    <tr key={index} className="border-t border-border-primary">
                      <td className="px-4 py-2 text-text-secondary">{index + 1}</td>
                      <td className="px-4 py-2 font-mono text-xs text-text-primary">
                        {recipient.address.slice(0, 12)}...{recipient.address.slice(-8)}
                      </td>
                      <td className="px-4 py-2 text-text-primary">
                        {assetType === 'tokens' ? recipient.amount : recipient.inscription_id}
                      </td>
                      <td className="px-4 py-2">
                        {recipient.status === 'valid' ? (
                          <span className="flex items-center space-x-1 text-green-400">
                            <CheckCircleIcon className="w-4 h-4" />
                            <span>Valid</span>
                          </span>
                        ) : (
                          <span className="flex items-center space-x-1 text-red-400" title={recipient.error}>
                            <ExclamationTriangleIcon className="w-4 h-4" />
                            <span>Invalid</span>
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="mt-8 flex justify-between">
          <button onClick={onBack} className="btn-secondary">
            Back to Assets
          </button>
          <button
            onClick={onNext}
            disabled={!canProceed}
            className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Review & Execute
          </button>
        </div>
      </div>
    </div>
  );
};
