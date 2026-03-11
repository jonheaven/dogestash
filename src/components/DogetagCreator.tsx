// DogetagCreator.tsx
// Main UI component for creating Dogecoin on-chain text inscriptions

import React, { useState, useEffect } from 'react';
import {
  PencilSquareIcon,
  DocumentTextIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  EyeIcon,
  EyeSlashIcon,
  RadioIcon,
  CpuChipIcon,
  ExclamationCircleIcon,
  InformationCircleIcon,
  QuestionMarkCircleIcon
} from '@heroicons/react/24/outline';
import { useToast } from '../contexts/ToastContext';
import { createDogetagTx, DogetagTxOutput } from '../lib/dogetag/createDogetagTx';
import { createDogetagOpReturnTx } from '../lib/dogetag/createDogetagOpReturnTx';
import { finalizeDogetagTx } from '../lib/dogetag/finalizeDogetagTx';
import { validateDogetagMessage } from '../lib/dogetag/encodeDogetag';
import { getFeeEstimate, signWithDogeJS } from '../utils/txBroadcaster';

interface DogetagCreatorProps {
  wallet: any; // Compatible with both browser extension and local wallets
  onDogetagCreated?: (txid: string, message: string) => void;
}

type CreationStep = 'compose' | 'preview' | 'build' | 'sign' | 'broadcast' | 'success';

export const DogetagCreator: React.FC<DogetagCreatorProps> = ({
  wallet,
  onDogetagCreated
}) => {
  const [message, setMessage] = useState('');
  const [feeRate, setFeeRate] = useState(100000); // 0.001 DOGE per byte default
  const [currentStep, setCurrentStep] = useState<CreationStep>('compose');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inscriptionMode, setInscriptionMode] = useState<'op_return' | 'witness'>('op_return');
  const [showModeSuggestion, setShowModeSuggestion] = useState(false);
  const [showTooltip, setShowTooltip] = useState<'op_return' | 'witness' | null>(null);
  const [showTutorialModal, setShowTutorialModal] = useState(false);
  const [showPhilosophyPanel, setShowPhilosophyPanel] = useState(false);

  // Transaction data
  const [txData, setTxData] = useState<DogetagTxOutput | null>(null);
  const [signedTxHex, setSignedTxHex] = useState<string | null>(null);
  const [finalizedTx, setFinalizedTx] = useState<any>(null);

  const toast = useToast();

  // Auto-update fee rate on component mount and check for first-time tutorial
  useEffect(() => {
    const updateFeeRate = async () => {
      try {
        const estimatedFee = await getFeeEstimate();
        setFeeRate(estimatedFee);
      } catch (error) {
        console.warn('Could not fetch fee estimate, using default');
      }
    };
    updateFeeRate();

    // Check if user has seen the tutorial before
    const hasSeenTutorial = localStorage.getItem('borkstarter-dogetag-tutorial-seen');
    if (!hasSeenTutorial) {
      setShowTutorialModal(true);
    }
  }, []);

  // Close tooltips when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('[data-tooltip]')) {
        setShowTooltip(null);
      }
    };

    if (showTooltip) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showTooltip]);

  // Calculate UTF-8 byte length
  const getByteLength = (text: string): number => {
    // Use TextEncoder for browser compatibility instead of Node.js Buffer
    const encoder = new TextEncoder();
    return encoder.encode(text).length;
  };

  // Get limits based on mode
  const getLimits = () => {
    return inscriptionMode === 'op_return'
      ? { maxBytes: 80, label: 'OP_RETURN (80 bytes max)' }
      : { maxBytes: 200 * 1024, label: 'Witness Mode (200 KB max)' };
  };

  const handleMessageChange = (value: string) => {
    const byteLength = getByteLength(value);
    const limits = getLimits();

    // Auto-suggest switching to Witness mode if OP_RETURN limit is exceeded
    if (inscriptionMode === 'op_return' && byteLength > 80) {
      setShowModeSuggestion(true);
    } else {
      setShowModeSuggestion(false);
    }

    // Hard stop input for OP_RETURN mode at 80 bytes
    if (inscriptionMode === 'op_return' && byteLength > 80) {
      // Truncate to fit within limit
      let truncated = value;
      while (getByteLength(truncated) > 80) {
        truncated = truncated.slice(0, -1);
      }
      setMessage(truncated);
      setError('OP_RETURN byte limit reached (80 bytes)');
      return;
    }

    // Hard stop for Witness mode at 200KB
    if (inscriptionMode === 'witness' && byteLength > limits.maxBytes) {
      setError(`Witness mode limit reached (${(limits.maxBytes / 1024).toFixed(0)} KB)`);
      return;
    }

    setMessage(value);
    setError(null); // Clear any previous errors
  };

  const switchToWitnessMode = () => {
    setInscriptionMode('witness');
    setShowModeSuggestion(false);
    setError(null);
    toast.info('Switched to Witness Mode for larger Dogetags');
  };

  const toggleTooltip = (mode: 'op_return' | 'witness') => {
    setShowTooltip(showTooltip === mode ? null : mode);
  };

  const getPhilosophicalLabel = () => {
    return inscriptionMode === 'op_return'
      ? "Dogeprints — textual graffiti left on the chain, permanent but don't move."
      : "Dogetags — tags written into coins, travel when spent like NFTs.";
  };

  const getTooltipContent = (mode: 'op_return' | 'witness') => {
    if (mode === 'op_return') {
      return {
        title: "Dogeprints (Paw Prints on the Chain)",
        content: `Dogeprints are permanent textual graffiti left on the Dogecoin blockchain — they stay forever where they're made, but they don't travel with any coins.

Like a dog's paw prints in fresh concrete: permanent and visible, but stay exactly where they were made.

Dogeprints are perfect for: tiny poems, jokes, signatures, time-stamped declarations, public announcements, artistic statements, proof-of-presence.

Max size: 80 bytes. Cheap. Fast. Pure expression with no ownership — just immortal textual graffiti that marks your passage through the blockchain.`
      };
    } else {
      return {
        title: "Witness Dogetag (Text Doginal)",
        content: `This mode creates a full Doginal inscription using the Witness data structure — the same technique used for Doginal Dogs, images, and real NFTs.

Witness tags are "drawing on the coins themselves" — they attach to a specific satoshi (satpoint) and TRAVEL with that coin when it's spent later.

It's like engraving your message directly onto the digital money: when the coin moves, your message moves with it.

Your text becomes a digital object that: transfers like an NFT, can be collected, can be traded, has provenance, and can be tracked through ownership changes.

Witness Dogetags are perfect for: long-form writing, manifestos, art pieces, provenance notes, on-chain books, identity inscriptions.

Max size: ~200 KB (safe). Behave exactly like collectible Doginals.`
      };
    }
  };

  const validateAndPreview = () => {
    const validation = validateDogetagMessage(message, inscriptionMode);
    if (!validation.valid) {
      setError(validation.error || 'Invalid message');
      return false;
    }

    setCurrentStep('preview');
    return true;
  };

  const buildTransaction = async () => {
    if (!validateAndPreview()) return;

    setIsLoading(true);
    setError(null);

    try {
      // Get wallet data
      const address = await wallet.getAddress();
      const utxos = await wallet.getUtxos();

      if (!utxos || utxos.length === 0) {
        throw new Error('No UTXOs available. Please ensure your wallet has funds.');
      }

      let txOutput: DogetagTxOutput;

      if (inscriptionMode === 'op_return') {
        // Create OP_RETURN Dogetag transaction
        txOutput = await createDogetagOpReturnTx({
          message,
          fromAddress: address,
          utxos,
          feeRate
        });
      } else {
        // Create Witness/Doginal Dogetag transaction
        txOutput = await createDogetagTx({
          message,
          fromAddress: address,
          utxos,
          feeRate
        });
      }

      setTxData(txOutput);
      setCurrentStep('sign');

      toast.success('Dogetag transaction built successfully!');
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to build transaction';
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const signTransaction = async () => {
    if (!txData) return;

    setIsLoading(true);
    setError(null);

    try {
      // Convert unsigned transaction to hex for signing
      const unsignedHex = txData.unsignedTx.toString('hex');

      // Sign with dogecoin-js (development mode) or wallet
      // For now, using development signing - in production would integrate with wallet
      const signedHex = await signWithDogeJS(unsignedHex);

      setSignedTxHex(signedHex);
      setCurrentStep('broadcast');

      toast.success('Dogetag signed successfully!');
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to sign transaction';
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const broadcastTransaction = async () => {
    if (!signedTxHex) return;

    setIsLoading(true);
    setError(null);

    try {
      // Finalize the signed transaction
      const finalized = finalizeDogetagTx(signedTxHex);

      // Broadcast to Dogecoin network
      const broadcastResponse = await fetch('https://dogechain.info/api/v1/pushtx', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tx: finalized.rawTxHex
        })
      });

      if (!broadcastResponse.ok) {
        throw new Error(`Broadcast failed: ${broadcastResponse.statusText}`);
      }

      const broadcastData = await broadcastResponse.json();

      if (broadcastData.error) {
        throw new Error(`Broadcast error: ${broadcastData.error}`);
      }

      // Extract real txid from broadcast response
      const realTxid = broadcastData.txid || finalized.txid;

      setFinalizedTx({ ...finalized, txid: realTxid });
      setCurrentStep('success');

      // Notify parent component
      onDogetagCreated?.(realTxid, message);

      toast.success('Dogetag broadcast successfully!');
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to broadcast transaction';
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const resetCreator = () => {
    setMessage('');
    setCurrentStep('compose');
    setTxData(null);
    setSignedTxHex(null);
    setFinalizedTx(null);
    setError(null);
    setInscriptionMode('op_return');
    setShowModeSuggestion(false);
  };

  const getStepIndicator = (step: CreationStep) => {
    const steps = ['compose', 'preview', 'build', 'sign', 'broadcast', 'success'];
    const currentIndex = steps.indexOf(currentStep);
    const stepIndex = steps.indexOf(step);

    if (stepIndex < currentIndex) return '✅';
    if (stepIndex === currentIndex) return '🔄';
    return '⭕';
  };

  return (
    <>
      {/* First-Time Tutorial Modal */}
      {showTutorialModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-bg-primary rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="space-y-4">
                <div className="text-center">
                  <div className="text-6xl mb-4">🏷️</div>
                  <h2 className="text-2xl font-bold text-text-primary mb-2">What Are Dogetags?</h2>
                  <p className="text-text-secondary mb-6">
                    Dogetags are on-chain messages, but they work in fundamentally different ways:
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="bg-blue-900/20 rounded-lg p-4 border border-blue-600/30">
                    <h3 className="font-semibold text-blue-300 mb-2 flex items-center">
                      <span className="text-lg mr-2">🐾</span>
                      Dogeprints (Textual Graffiti)
                    </h3>
                    <p className="text-sm text-text-secondary mb-2">
                      Your message becomes permanent textual graffiti left on the blockchain. It stays forever where it's made, but it doesn't travel with any coins.
                    </p>
                    <p className="text-xs text-blue-200">
                      Like a dog's paw prints in fresh concrete: permanent and visible, but stay exactly where they were made.
                    </p>
                  </div>

                  <div className="bg-purple-900/20 rounded-lg p-4 border border-purple-600/30">
                    <h3 className="font-semibold text-purple-300 mb-2 flex items-center">
                      <span className="text-lg mr-2">🐕</span>
                      Witness Dogetags (Drawing on the Coins)
                    </h3>
                    <p className="text-sm text-text-secondary mb-2">
                      Your message attaches to a specific satoshi and travels with that coin whenever it's spent. It behaves exactly like an NFT.
                    </p>
                    <p className="text-xs text-purple-200">
                      Like engraving on money: when the coin moves, your message moves with it.
                    </p>
                  </div>
                </div>

                <div className="bg-emerald-900/20 rounded-lg p-3 border border-emerald-600/30">
                  <p className="text-sm text-emerald-200 text-center">
                    <strong>The key difference:</strong> OP_RETURN stays in one place on the blockchain.
                    Witness travels with the coins themselves.
                  </p>
                </div>
              </div>

              <div className="flex justify-center mt-6">
                <button
                  onClick={() => {
                    setShowTutorialModal(false);
                    localStorage.setItem('borkstarter-dogetag-tutorial-seen', 'true');
                  }}
                  className="px-6 py-2 bg-primary-500 hover:bg-primary-400 text-bg-primary rounded-md transition-colors"
                >
                  Got it — Start Tagging
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center">
          <div className="flex items-center justify-center mb-4">
            <PencilSquareIcon className="w-8 h-8 text-primary-500 mr-3" />
            <h1 className="text-3xl font-bold text-text-primary">Create Dogetag</h1>
          </div>
          <p className="text-text-secondary">
            Leave your mark on the Dogecoin blockchain with a permanent text inscription
          </p>
        </div>

      {/* Progress Indicator */}
      <div className="flex justify-center">
        <div className="flex items-center space-x-4 text-sm">
          <span className={`flex items-center ${currentStep === 'compose' ? 'text-primary-500' : 'text-text-secondary'}`}>
            {getStepIndicator('compose')} Compose
          </span>
          <span>→</span>
          <span className={`flex items-center ${currentStep === 'preview' ? 'text-primary-500' : 'text-text-secondary'}`}>
            {getStepIndicator('preview')} Preview
          </span>
          <span>→</span>
          <span className={`flex items-center ${currentStep === 'sign' ? 'text-primary-500' : 'text-text-secondary'}`}>
            {getStepIndicator('sign')} Sign TX
          </span>
          <span>→</span>
          <span className={`flex items-center ${currentStep === 'broadcast' ? 'text-primary-500' : 'text-text-secondary'}`}>
            {getStepIndicator('broadcast')} Broadcast
          </span>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <ExclamationTriangleIcon className="w-5 h-5 text-red-400" />
            <span className="text-red-400 font-medium">{error}</span>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="bg-bg-secondary rounded-lg p-6 border border-border-primary">
        {currentStep === 'compose' && (
          <div className="space-y-4">
            {/* Mode Toggle */}
            <div className="bg-bg-secondary rounded-lg p-4 border border-border-primary">
              <label className="block text-sm font-medium text-text-secondary mb-3">
                Inscription Mode
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="relative">
                <button
                  onClick={() => {
                    setInscriptionMode('op_return');
                    setShowModeSuggestion(false);
                    setError(null);
                  }}
                  className={`p-3 rounded-lg border-2 transition-all w-full ${
                    inscriptionMode === 'op_return'
                      ? 'border-primary-500 bg-primary-500/10 text-primary-400'
                      : 'border-border-primary hover:border-primary-400 text-text-secondary'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <RadioIcon className="w-5 h-5" />
                      <div className="text-left">
                        <div className="font-medium">Dogeprints</div>
                        <div className="text-xs opacity-75">80 bytes max • Paw prints • Simple</div>
                      </div>
                    </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleTooltip('op_return');
                        }}
                        className="p-1 rounded-full hover:bg-bg-secondary transition-colors"
                      >
                        <QuestionMarkCircleIcon className="w-4 h-4 opacity-60 hover:opacity-100" />
                      </button>
                    </div>
                  </button>

                  {/* OP_RETURN Tooltip */}
                  {showTooltip === 'op_return' && (
                    <div className="absolute top-full left-0 right-0 mt-2 z-10" data-tooltip>
                      <div className="bg-bg-secondary border border-border-primary rounded-lg p-4 shadow-lg">
                        <div className="flex items-start space-x-2">
                          <InformationCircleIcon className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
                          <div>
                            <div className="font-medium text-text-primary mb-2">
                              OP_RETURN Dogetag (Blockchain Graffiti)
                            </div>
                            <div className="text-sm text-text-secondary space-y-2">
                              <p>
                                This mode writes your message into an OP_RETURN output — a permanent public note recorded on the Dogecoin blockchain.
                              </p>
                              <p>
                                <strong>It's like tagging a wall in a city:</strong> your message lives forever, but it doesn't "belong" to anyone and it doesn't move around.
                              </p>
                              <p>
                                <strong>Perfect for:</strong> tiny poems, jokes, signatures, time-stamped declarations, inside jokes for the chain, artistic statements.
                              </p>
                              <p>
                                <em>Pure expression: no ownership, no transfer, just immortal graffiti.</em>
                              </p>
                              <div className="text-xs text-text-tertiary mt-2">
                                Max size: 80 bytes. Cheap. Fast. Ephemeral in spirit, eternal in storage.
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="relative">
                  <button
                    onClick={() => {
                      setInscriptionMode('witness');
                      setShowModeSuggestion(false);
                      setError(null);
                    }}
                    className={`p-3 rounded-lg border-2 transition-all w-full ${
                      inscriptionMode === 'witness'
                        ? 'border-primary-500 bg-primary-500/10 text-primary-400'
                        : 'border-border-primary hover:border-primary-400 text-text-secondary'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <CpuChipIcon className="w-5 h-5" />
                        <div className="text-left">
                          <div className="font-medium">Witness Mode</div>
                          <div className="text-xs opacity-75">200 KB max • Transferable • Doginal</div>
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleTooltip('witness');
                        }}
                        className="p-1 rounded-full hover:bg-bg-secondary transition-colors"
                      >
                        <QuestionMarkCircleIcon className="w-4 h-4 opacity-60 hover:opacity-100" />
                      </button>
                    </div>
                  </button>

                  {/* Witness Tooltip */}
                  {showTooltip === 'witness' && (
                    <div className="absolute top-full left-0 right-0 mt-2 z-10" data-tooltip>
                      <div className="bg-bg-secondary border border-border-primary rounded-lg p-4 shadow-lg">
                        <div className="flex items-start space-x-2">
                          <InformationCircleIcon className="w-5 h-5 text-purple-400 mt-0.5 flex-shrink-0" />
                          <div>
                            <div className="font-medium text-text-primary mb-2">
                              Witness Dogetag (Text Doginal)
                            </div>
                            <div className="text-sm text-text-secondary space-y-2">
                              <p>
                                This mode creates a full Doginal inscription using the Witness data structure — the same technique used for Doginal Dogs, images, and real NFTs.
                              </p>
                              <p>
                                <strong>Your text becomes attached to a specific sat, meaning:</strong> it can be transferred, it can be collected, it can be traded, it has provenance, it becomes a digital object, not just a message.
                              </p>
                              <p>
                                <strong>Perfect for:</strong> long-form writing (letters, essays, poems), manifestos, art pieces, provenance notes, on-chain books, identity inscriptions.
                              </p>
                              <p>
                                <em>It's the philosophical opposite of OP_RETURN: not graffiti on a wall — but a scroll carried from holder to holder across time.</em>
                              </p>
                              <div className="text-xs text-text-tertiary mt-2">
                                Max size: ~200 KB (safe). Transferable, trackable, meaningful.
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Philosophical Label */}
              <div className="mt-3 text-center">
                <div className="text-sm italic text-text-secondary border-t border-border-primary pt-3">
                  {getPhilosophicalLabel()}
                </div>
              </div>
            </div>

            {/* Auto-suggest switching */}
            {showModeSuggestion && (
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <ExclamationCircleIcon className="w-5 h-5 text-yellow-400 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                      <div className="text-sm text-yellow-200">
                      <div className="font-medium mb-1">This Dogetag is too large for OP_RETURN mode.</div>
                      <div className="text-xs opacity-90 mb-2">
                        <strong>Dogeprints:</strong> Paw prints on the chain (permanent, but don't travel with coins)<br/>
                        <strong>Dogetags:</strong> Tags in the coins (travel when spent, like NFTs)
                      </div>
                    </div>
                    <button
                      onClick={switchToWitnessMode}
                      className="px-3 py-1 bg-yellow-600 hover:bg-yellow-500 text-yellow-100 text-sm rounded transition-colors"
                    >
                      Switch to Witness Mode
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Message Input */}
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Your Dogetag Message
              </label>
              <textarea
                value={message}
                onChange={(e) => handleMessageChange(e.target.value)}
                placeholder={
                  inscriptionMode === 'op_return'
                    ? "Write your message here... (max 80 bytes)"
                    : "Write your message here... (max 200 KB)"
                }
                className="w-full h-32 px-3 py-2 bg-bg-primary border border-border-primary rounded-md text-text-primary placeholder-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                maxLength={inscriptionMode === 'op_return' ? 80 : 200000} // Character limits as fallback
              />
              <div className="flex justify-between items-center text-xs text-text-tertiary mt-1">
                <div>
                  {message.length} characters
                </div>
                <div className="flex items-center space-x-4">
                  <span className={`${getByteLength(message) > getLimits().maxBytes * 0.8 ? 'text-yellow-400' : ''}`}>
                    {getByteLength(message)} / {getLimits().maxBytes.toLocaleString()} bytes
                  </span>
                  {inscriptionMode === 'op_return' && getByteLength(message) > 60 && (
                    <ExclamationTriangleIcon className="w-4 h-4 text-yellow-400" />
                  )}
                  <button
                    onClick={() => toggleTooltip(showTooltip === 'bytes' ? null : 'bytes')}
                    className="p-0.5 rounded hover:bg-bg-secondary transition-colors opacity-60 hover:opacity-100"
                  >
                    <QuestionMarkCircleIcon className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {/* Bytes Tooltip */}
              {showTooltip === 'bytes' && (
                <div className="mt-2 p-3 bg-bg-secondary border border-border-primary rounded-lg text-xs text-text-secondary" data-tooltip>
                  <div className="font-medium text-text-primary mb-1">Why bytes matter</div>
                  <p>
                    Dogetag size is measured in UTF-8 bytes, not characters. Emojis and non-English characters take more space.
                  </p>
                  <p className="mt-1">
                    OP_RETURN = 80 bytes max. Witness = ~200 KB max.
                  </p>
                  <p className="mt-1">
                    The counter updates live so you can sculpt your message precisely.
                  </p>
                </div>
              )}
            </div>

            <div className="flex justify-end">
              <button
                onClick={validateAndPreview}
                disabled={!message.trim() || isLoading}
                className="px-4 py-2 bg-primary-500 hover:bg-primary-400 disabled:opacity-50 disabled:cursor-not-allowed text-bg-primary rounded-md transition-colors"
              >
                Preview Dogetag
              </button>
            </div>
          </div>
        )}

        {currentStep === 'preview' && (
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-medium text-text-primary mb-2">Preview Your Dogetag</h3>
              <div className="bg-bg-primary border border-border-primary rounded-md p-4">
                <div className="flex items-start space-x-3">
                  {inscriptionMode === 'witness' ? (
                    <DocumentTextIcon className="w-5 h-5 text-primary-500 mt-0.5" />
                  ) : (
                    <RadioIcon className="w-5 h-5 text-blue-500 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <div className="text-sm text-text-secondary mb-1">
                      {inscriptionMode === 'witness'
                        ? 'Content Type: text/plain;charset=utf-8 (Doginal)'
                        : 'Content Type: OP_RETURN data'}
                    </div>
                    <div className="text-text-primary whitespace-pre-wrap break-words">{message}</div>
                    <div className="text-xs text-text-tertiary mt-2">
                      {getByteLength(message)} bytes • {inscriptionMode === 'witness' ? 'Transferable Doginal' : 'OP_RETURN graffiti'}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-between">
              <button
                onClick={() => setCurrentStep('compose')}
                className="px-4 py-2 text-text-secondary hover:text-text-primary transition-colors"
              >
                ← Back to Edit
              </button>
              <button
                onClick={buildTransaction}
                disabled={isLoading}
                className="px-4 py-2 bg-primary-500 hover:bg-primary-400 disabled:opacity-50 disabled:cursor-not-allowed text-bg-primary rounded-md transition-colors"
              >
                {isLoading ? (
                  <div className="flex items-center space-x-2">
                    <ArrowPathIcon className="w-4 h-4 animate-spin" />
                    <span>Building...</span>
                  </div>
                ) : (
                  'Build Transaction'
                )}
              </button>
            </div>
          </div>
        )}

        {currentStep === 'sign' && txData && (
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-medium text-text-primary mb-2">Transaction Ready</h3>
              <div className="bg-bg-primary border border-border-primary rounded-md p-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-text-secondary">Estimated Fee:</span>
                  <span className="text-text-primary">{(txData.estimatedFee / 100000000).toFixed(8)} DOGE</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary">Transaction Size:</span>
                  <span className="text-text-primary">~{txData.sizeBytes} bytes</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary">Change Amount:</span>
                  <span className="text-text-primary">{(txData.changeAmount / 100000000).toFixed(8)} DOGE</span>
                </div>
              </div>
              <p className="text-sm text-text-secondary mt-2">
                Your Dogetag will be signed and ready for broadcast to the Dogecoin network.
              </p>
            </div>

            <div className="flex justify-between">
              <button
                onClick={() => setCurrentStep('preview')}
                className="px-4 py-2 text-text-secondary hover:text-text-primary transition-colors"
              >
                ← Back to Preview
              </button>
              <button
                onClick={signTransaction}
                disabled={isLoading}
                className="px-4 py-2 bg-primary-500 hover:bg-primary-400 disabled:opacity-50 disabled:cursor-not-allowed text-bg-primary rounded-md transition-colors"
              >
                {isLoading ? (
                  <div className="flex items-center space-x-2">
                    <ArrowPathIcon className="w-4 h-4 animate-spin" />
                    <span>Signing...</span>
                  </div>
                ) : (
                  'Sign with Wallet'
                )}
              </button>
            </div>
          </div>
        )}

        {currentStep === 'broadcast' && (
          <div className="space-y-4">
            <div className="text-center">
              <CheckCircleIcon className="w-12 h-12 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-text-primary mb-2">Transaction Signed!</h3>
              <p className="text-text-secondary">
                Your Dogetag is ready to be broadcast to the Dogecoin network.
              </p>
            </div>

            <div className="flex justify-between">
              <button
                onClick={() => setCurrentStep('sign')}
                className="px-4 py-2 text-text-secondary hover:text-text-primary transition-colors"
              >
                ← Back to Sign
              </button>
              <button
                onClick={broadcastTransaction}
                disabled={isLoading}
                className="px-4 py-2 bg-green-600 hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-md transition-colors"
              >
                {isLoading ? (
                  <div className="flex items-center space-x-2">
                    <ArrowPathIcon className="w-4 h-4 animate-spin" />
                    <span>Broadcasting...</span>
                  </div>
                ) : (
                  'Broadcast Dogetag'
                )}
              </button>
            </div>
          </div>
        )}

        {currentStep === 'success' && finalizedTx && (
          <div className="space-y-4">
            <div className="text-center">
              <CheckCircleIcon className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-text-primary mb-2">Dogetag Created! 🎉</h3>
              <p className="text-text-secondary mb-4">
                Your message is now permanently inscribed on the Dogecoin blockchain.
              </p>

              <div className="bg-bg-primary border border-border-primary rounded-md p-4 mb-4">
                <div className="text-sm text-text-secondary mb-2">Transaction ID:</div>
                <div className="font-mono text-sm text-text-primary break-all">
                  {finalizedTx.txid}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <a
                  href={`https://dogechain.info/tx/${finalizedTx.txid}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-primary-500 hover:bg-primary-400 text-bg-primary rounded-md transition-colors inline-flex items-center justify-center"
                >
                  View on Explorer
                </a>
                <a
                  href={`https://doginals.io/inscription/${finalizedTx.txid}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-bg-primary hover:bg-bg-secondary border border-border-primary text-text-primary rounded-md transition-colors inline-flex items-center justify-center"
                >
                  View as Doginal
                </a>
              </div>
            </div>

            <div className="flex justify-center">
              <button
                onClick={resetCreator}
                className="px-4 py-2 bg-primary-500 hover:bg-primary-400 text-bg-primary rounded-md transition-colors"
              >
                Create Another Dogetag
              </button>
            </div>
          </div>
        )}
        </div>

        {/* Philosophy Documentation Panel */}
        <div className="bg-gradient-to-r from-purple-900/20 to-blue-900/20 rounded-lg border border-purple-600/30 overflow-hidden">
          <button
            onClick={() => setShowPhilosophyPanel(!showPhilosophyPanel)}
            className="w-full flex items-center justify-between p-4 hover:bg-bg-secondary/50 transition-colors"
          >
            <div className="flex items-center space-x-3">
              <InformationCircleIcon className="w-5 h-5 text-purple-400" />
              <span className="font-medium text-text-primary">The Philosophy of Dogetags</span>
            </div>
            {showPhilosophyPanel ? (
              <ChevronUpIcon className="w-4 h-4 text-text-secondary" />
            ) : (
              <ChevronDownIcon className="w-4 h-4 text-text-secondary" />
            )}
          </button>

          {showPhilosophyPanel && (
            <div className="px-4 pb-4 border-t border-purple-600/30">
              <div className="text-sm text-text-secondary space-y-3 pt-3">
                <div>
                  <strong className="text-blue-300">Dogeprints are textual graffiti:</strong> permanent marks left on the blockchain,
                  unowned, like a dog's footprints in fresh snow. They exist purely as expression — no transfer, no ownership,
                  just immortal textual graffiti that mark your passage through the chain.
                </div>
                <div>
                  <strong className="text-blue-300">Witness Dogetags are artifacts:</strong> scrolls carried by holders through time,
                  with identity, provenance, and expressive weight. They become digital objects that can be collected,
                  traded, and passed down through generations.
                </div>
                <div className="text-center italic text-text-tertiary pt-2">
                  Both are valid forms of on-chain expression — one ephemeral in spirit, one immortal in ownership.
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Info Section */}
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <ExclamationTriangleIcon className="w-5 h-5 text-blue-400 mt-0.5" />
            <div className="text-sm text-blue-200">
              <div className="font-medium mb-1">About Dogetags</div>
              <div className="space-y-2">
                <div>
                  <strong>Dogeprints:</strong> Paw prints left on the blockchain. Limited to 80 bytes, cheaper,
                  but not transferable or indexable as Doginals.
                </div>
                <div>
                  <strong>Dogetags:</strong> Tags written into coins using witness data. Up to 200KB, transferable,
                  indexable, and behave exactly like Doginals/NFTs.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
