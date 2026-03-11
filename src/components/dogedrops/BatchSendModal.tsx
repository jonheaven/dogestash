import React, { useState, useRef } from 'react';
import { XMarkIcon, DocumentTextIcon, UserPlusIcon, TrashIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { Coins } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';

interface Recipient {
  address: string;
  amount: number; // in DOGE
  amountSat: number; // in satoshis
}

interface BatchSendModalProps {
  isOpen: boolean;
  onClose: () => void;
  availableUtxos: any[];
  onExecuteBatch: (recipients: Recipient[], totalAmount: number, fee: number) => Promise<void>;
}

export const BatchSendModal: React.FC<BatchSendModalProps> = ({
  isOpen,
  onClose,
  availableUtxos,
  onExecuteBatch
}) => {
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [newAddress, setNewAddress] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [isProcessingCsv, setIsProcessingCsv] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [batchEstimate, setBatchEstimate] = useState<{
    totalAmount: number;
    fee: number;
    utxoCount: number;
    outputCount: number;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const toast = useToast();

  const resetModal = () => {
    setRecipients([]);
    setNewAddress('');
    setNewAmount('');
    setBatchEstimate(null);
    setIsProcessingCsv(false);
  };

  const handleClose = () => {
    resetModal();
    onClose();
  };

  const validateAddress = (address: string): boolean => {
    // Basic Dogecoin address validation (starts with D, correct length)
    return /^D[A-Za-z0-9]{25,34}$/.test(address);
  };

  const addRecipient = () => {
    const amount = parseFloat(newAmount);
    if (!newAddress || !amount || amount <= 0) {
      toast.error('Please enter a valid address and amount');
      return;
    }

    if (!validateAddress(newAddress)) {
      toast.error('Invalid Dogecoin address format');
      return;
    }

    // Check for duplicate addresses
    if (recipients.some(r => r.address === newAddress)) {
      toast.error('Address already added to recipients');
      return;
    }

    const recipient: Recipient = {
      address: newAddress,
      amount,
      amountSat: Math.floor(amount * 100000000)
    };

    setRecipients(prev => [...prev, recipient]);
    setNewAddress('');
    setNewAmount('');
    setBatchEstimate(null); // Reset estimate when recipients change
  };

  const removeRecipient = (index: number) => {
    setRecipients(prev => prev.filter((_, i) => i !== index));
    setBatchEstimate(null);
  };

  const processCsvFile = async (file: File) => {
    setIsProcessingCsv(true);
    try {
      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim());

      const newRecipients: Recipient[] = [];
      let errors: string[] = [];

      // Skip header row if it exists
      const startIndex = lines[0].toLowerCase().includes('address') ? 1 : 0;

      for (let i = startIndex; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const parts = line.split(',');
        if (parts.length < 2) {
          errors.push(`Line ${i + 1}: Invalid format (expected: address,amount)`);
          continue;
        }

        const address = parts[0].trim();
        const amount = parseFloat(parts[1].trim());

        if (!validateAddress(address)) {
          errors.push(`Line ${i + 1}: Invalid address ${address}`);
          continue;
        }

        if (isNaN(amount) || amount <= 0) {
          errors.push(`Line ${i + 1}: Invalid amount ${parts[1]}`);
          continue;
        }

        // Check for duplicates
        if (newRecipients.some(r => r.address === address) || recipients.some(r => r.address === address)) {
          errors.push(`Line ${i + 1}: Duplicate address ${address}`);
          continue;
        }

        newRecipients.push({
          address,
          amount,
          amountSat: Math.floor(amount * 100000000)
        });
      }

      if (errors.length > 0) {
        toast.error(`CSV processing errors:\n${errors.slice(0, 3).join('\n')}${errors.length > 3 ? '\n...' : ''}`);
      }

      if (newRecipients.length > 0) {
        setRecipients(prev => [...prev, ...newRecipients]);
        setBatchEstimate(null);
        toast.success(`Added ${newRecipients.length} recipients from CSV`);
      }

    } catch (error) {
      toast.error('Failed to process CSV file');
    } finally {
      setIsProcessingCsv(false);
    }
  };

  const estimateBatch = async () => {
    if (recipients.length === 0) {
      toast.error('Add at least one recipient');
      return;
    }

    try {
      const totalAmount = recipients.reduce((sum, r) => sum + r.amountSat, 0);

      // Find UTXOs that can cover this amount
      const sortedUtxos = [...availableUtxos].sort((a, b) => b.value - a.value);
      let selectedUtxos = [];
      let accumulated = 0;

      for (const utxo of sortedUtxos) {
        if (accumulated >= totalAmount) break;
        selectedUtxos.push(utxo);
        accumulated += utxo.value;
      }

      if (accumulated < totalAmount) {
        toast.error('Insufficient UTXO balance for this batch send');
        return;
      }

      // Estimate fee (rough calculation: 148 bytes per input + 34 bytes per output + 10 bytes overhead)
      const inputCount = selectedUtxos.length;
      const outputCount = recipients.length;
      const estimatedTxSize = inputCount * 148 + outputCount * 34 + 10;
      const feeRate = 0.01; // 0.01 DOGE per KB
      const estimatedFee = Math.ceil((estimatedTxSize / 1024) * feeRate * 100000000);

      // Check if we have enough for fee
      if (accumulated < totalAmount + estimatedFee) {
        toast.error('Insufficient funds including transaction fee');
        return;
      }

      setBatchEstimate({
        totalAmount: totalAmount / 100000000,
        fee: estimatedFee / 100000000,
        utxoCount: inputCount,
        outputCount
      });

    } catch (error) {
      console.error('Failed to estimate batch:', error);
      toast.error('Failed to estimate batch transaction');
    }
  };

  const executeBatch = async () => {
    if (!batchEstimate || recipients.length === 0) return;

    setIsExecuting(true);
    try {
      // Use real blockchain broadcasting
      const { broadcastBatchSend } = await import('../../utils/txBroadcaster');

      // For now, we'll use placeholder UTXOs - in production this would come from selected UTXOs
      const placeholderUtxos = availableUtxos.slice(0, Math.min(availableUtxos.length, 5)); // Use up to 5 UTXOs

      const txid = await broadcastBatchSend(placeholderUtxos, recipients, batchEstimate.fee);

      toast.success(`Batch sent successfully! Transaction: ${txid.slice(0, 16)}...`);
      handleClose();
    } catch (error) {
      toast.error(`Batch send failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsExecuting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="bg-bg-primary border border-border-primary rounded-xl p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center space-x-3">
            <UserPlusIcon className="w-6 h-6 text-green-400" />
            <div>
              <h3 className="text-lg font-semibold text-text-primary">Batch Send</h3>
              <p className="text-sm text-text-secondary">Send to multiple recipients at once</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1 hover:bg-bg-secondary rounded-lg transition-colors"
          >
            <XMarkIcon className="w-5 h-5 text-text-secondary" />
          </button>
        </div>

        <div className="space-y-6">
          {/* CSV Upload */}
          <div className="bg-bg-secondary rounded-lg p-4">
            <h4 className="font-medium text-text-primary mb-3">Import Recipients</h4>
            <div className="flex gap-3">
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) processCsvFile(file);
                }}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isProcessingCsv}
                className="flex items-center space-x-2 px-4 py-2 bg-primary-500 hover:bg-primary-400 text-bg-primary rounded-lg transition-colors disabled:opacity-50"
              >
                <DocumentTextIcon className="w-4 h-4" />
                <span>{isProcessingCsv ? 'Processing...' : 'Upload CSV'}</span>
              </button>
              <div className="text-sm text-text-secondary flex-1">
                CSV format: address,amount (one per line)
              </div>
            </div>
          </div>

          {/* Manual Add */}
          <div className="bg-bg-secondary rounded-lg p-4">
            <h4 className="font-medium text-text-primary mb-3">Add Recipients Manually</h4>
            <div className="flex gap-3">
              <input
                type="text"
                placeholder="Dogecoin address (D...)"
                value={newAddress}
                onChange={(e) => setNewAddress(e.target.value)}
                className="flex-1 px-3 py-2 bg-bg-primary border border-border-primary rounded-lg text-text-primary focus:ring-2 focus:ring-primary-500"
              />
              <input
                type="number"
                step="0.00000001"
                placeholder="Amount (DOGE)"
                value={newAmount}
                onChange={(e) => setNewAmount(e.target.value)}
                className="w-32 px-3 py-2 bg-bg-primary border border-border-primary rounded-lg text-text-primary focus:ring-2 focus:ring-primary-500"
              />
              <button
                onClick={addRecipient}
                className="flex items-center space-x-2 px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg transition-colors"
              >
                <UserPlusIcon className="w-4 h-4" />
                <span>Add</span>
              </button>
            </div>
          </div>

          {/* Recipients List */}
          {recipients.length > 0 && (
            <div className="bg-bg-secondary rounded-lg p-4">
              <h4 className="font-medium text-text-primary mb-3">
                Recipients ({recipients.length})
              </h4>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {recipients.map((recipient, index) => (
                  <div key={index} className="flex items-center justify-between bg-bg-primary p-3 rounded border">
                    <div className="flex-1 min-w-0">
                      <div className="font-mono text-sm text-text-primary truncate">
                        {recipient.address}
                      </div>
                      <div className="text-sm text-text-secondary">
                        {recipient.amount} DOGE
                      </div>
                    </div>
                    <button
                      onClick={() => removeRecipient(index)}
                      className="p-1 hover:bg-red-500/10 rounded transition-colors ml-2"
                    >
                      <TrashIcon className="w-4 h-4 text-red-400" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Batch Estimate */}
          {recipients.length > 0 && !batchEstimate && (
            <button
              onClick={estimateBatch}
              className="w-full px-4 py-2 bg-primary-500 hover:bg-primary-400 text-bg-primary rounded-lg transition-colors"
            >
              Estimate Batch Transaction
            </button>
          )}

          {batchEstimate && (
            <div className="space-y-4">
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                <h4 className="font-medium text-blue-400 mb-3">Transaction Estimate</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-text-secondary">Total to Send:</span>
                    <div className="font-medium text-text-primary">{batchEstimate.totalAmount} DOGE</div>
                  </div>
                  <div>
                    <span className="text-text-secondary">Estimated Fee:</span>
                    <div className="font-medium text-yellow-400">{batchEstimate.fee.toFixed(6)} DOGE</div>
                  </div>
                  <div>
                    <span className="text-text-secondary">UTXOs Used:</span>
                    <div className="font-medium text-text-primary">{batchEstimate.utxoCount}</div>
                  </div>
                  <div>
                    <span className="text-text-secondary">Recipients:</span>
                    <div className="font-medium text-text-primary">{batchEstimate.outputCount}</div>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setBatchEstimate(null)}
                  className="flex-1 px-4 py-2 bg-bg-secondary hover:bg-bg-primary border border-border-primary rounded-lg transition-colors"
                  disabled={isExecuting}
                >
                  Adjust Recipients
                </button>
                <button
                  onClick={executeBatch}
                  disabled={isExecuting}
                  className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg transition-colors disabled:opacity-50"
                >
                  {isExecuting ? 'Sending Batch...' : 'Send Batch'}
                </button>
              </div>
            </div>
          )}

          {/* Warnings */}
          {recipients.length > 50 && (
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
              <div className="flex items-start space-x-2">
                <ExclamationTriangleIcon className="w-4 h-4 text-yellow-400 mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                  <p className="text-yellow-400 font-medium">Large Batch Warning</p>
                  <p className="text-text-secondary mt-1">
                    Sending to {recipients.length} recipients may incur high fees. Consider splitting into smaller batches.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
