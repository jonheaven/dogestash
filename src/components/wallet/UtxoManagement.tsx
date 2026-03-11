import React, { useState, useEffect } from 'react';
import {
  CubeIcon,
  BanknotesIcon,
  LockClosedIcon,
  LockOpenIcon,
  ArrowDownIcon,
  ScissorsIcon,
  CheckIcon,
  XMarkIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  MagnifyingGlassIcon,
  BarsArrowDownIcon,
  BarsArrowUpIcon,
  CurrencyDollarIcon
} from '@heroicons/react/24/outline';
import { Coins, CheckCircle, Zap, Flame } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';
import { useUnifiedWallet } from '../../contexts/UnifiedWalletContext';
import { walletDataApi } from '../../utils/api';

interface Utxo {
  txid: string;
  vout: number;
  value: number; // in satoshis
  confirmations: number;
  scriptPubKey: string;
  address?: string; // Add address field from API
  inscriptions?: Array<{
    inscription_id: string;
    content_type?: string;
  }>;
  locked?: boolean; // Local state for locking
}

interface UtxoManagementProps {
  walletAddress: string;
  onSendToDogedrops?: (utxos: Utxo[]) => void;
}

export const UtxoManagement: React.FC<UtxoManagementProps> = ({ walletAddress, onSendToDogedrops }) => {
  const { signPSBT } = useUnifiedWallet();
  const [utxos, setUtxos] = useState<Utxo[]>([]);
  const [filteredUtxos, setFilteredUtxos] = useState<Utxo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [lastFetch, setLastFetch] = useState<number | null>(null);
  const [hasShownInitialLoadToast, setHasShownInitialLoadToast] = useState(false);
  const [selectedUtxos, setSelectedUtxos] = useState<Set<string>>(new Set());
  const [activeFilter, setActiveFilter] = useState<'all' | 'inscribed' | 'plain' | 'locked'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'amount' | 'confirmations' | 'txid'>('amount');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [showMergeModal, setShowMergeModal] = useState(false);
  const [mergeEstimate, setMergeEstimate] = useState<{
    fee: number;
    inputCount: number;
    outputCount: number;
    totalInput: number;
    totalOutput: number;
  } | null>(null);
  const [isMerging, setIsMerging] = useState(false);
  const [showSplitModal, setShowSplitModal] = useState(false);
  const [selectedSplitUtxo, setSelectedSplitUtxo] = useState<Utxo | null>(null);
  const [splitMode, setSplitMode] = useState<'count' | 'custom'>('count');
  const [splitCount, setSplitCount] = useState(2);
  const [customAmounts, setCustomAmounts] = useState<string[]>([]);
  const [splitEstimate, setSplitEstimate] = useState<{
    fee: number;
    outputs: number[];
    totalInput: number;
  } | null>(null);
  const [isSplitting, setIsSplitting] = useState(false);

  const toast = useToast();

  // Load locked UTXOs from localStorage
  const loadLockedUtxos = (): Set<string> => {
    const locked = localStorage.getItem(`locked-utxos-${walletAddress}`);
    return locked ? new Set(JSON.parse(locked)) : new Set();
  };

  // Save locked UTXOs to localStorage
  const saveLockedUtxos = (locked: Set<string>) => {
    localStorage.setItem(`locked-utxos-${walletAddress}`, JSON.stringify([...locked]));
  };

  // Fetch UTXOs from configured data provider API
  const fetchUtxos = async (showSuccessToast = true) => {
    setIsLoading(true);
    try {
      const data = await walletDataApi.fetchUtxos(walletAddress);

      // API returns UTXOs in data.utxos with satoshis as string field

      // Transform API data to our Utxo interface
      // Try different possible field names for the UTXOs array
      const utxosArray = data.utxos || data.data || data.result || data.list || [];
      console.log('🧪 Using UTXOs array from field:', data.utxos ? 'utxos' : data.data ? 'data' : data.result ? 'result' : data.list ? 'list' : 'none');

      const transformedUtxos: Utxo[] = (utxosArray).map((utxo: any) => {
        // Parse satoshis value (API returns as string, we need number)
        let value = 0;
        if (typeof utxo.satoshis === 'string') {
          // API returns satoshis as a string, convert to number
          value = parseInt(utxo.satoshis, 10) || 0;
        } else if (typeof utxo.satoshis === 'number' && !isNaN(utxo.satoshis)) {
          value = utxo.satoshis;
        } else if (typeof utxo.value === 'number' && !isNaN(utxo.value)) {
          value = utxo.value; // fallback
        }

        return {
          txid: utxo.txid || '',
          vout: utxo.vout || 0,
          value: value,
          confirmations: typeof utxo.confirmations === 'number' && !isNaN(utxo.confirmations) ? utxo.confirmations : 0,
          scriptPubKey: utxo.script_pubkey || utxo.scriptPubKey || '', // API uses script_pubkey
          address: utxo.address || '', // Extract address from API response
          inscriptions: Array.isArray(utxo.inscriptions) ? utxo.inscriptions : []
        };
      });

      // Load locked status
      const lockedUtxos = loadLockedUtxos();
      transformedUtxos.forEach(utxo => {
        utxo.locked = lockedUtxos.has(`${utxo.txid}:${utxo.vout}`);
      });

      setUtxos(transformedUtxos);
      setLastFetch(Date.now());
      if (showSuccessToast) {
        toast.success('UTXOs loaded successfully');
      }
    } catch (error) {
      console.error('Failed to fetch UTXOs:', error);
      toast.error('Failed to load UTXOs. Please try again.');

      // Fallback to doge-sdk RPC (simplified - would need actual RPC setup)
      // For now, just show empty state
    } finally {
      setIsLoading(false);
    }
  };

  // Filter and sort UTXOs
  useEffect(() => {
    let filtered = [...utxos];

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(utxo =>
        utxo.txid.toLowerCase().includes(searchTerm.toLowerCase()) ||
        walletAddress.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply category filter
    switch (activeFilter) {
      case 'inscribed':
        filtered = filtered.filter(utxo => utxo.inscriptions && utxo.inscriptions.length > 0);
        break;
      case 'plain':
        filtered = filtered.filter(utxo => !utxo.inscriptions || utxo.inscriptions.length === 0);
        break;
      case 'locked':
        filtered = filtered.filter(utxo => utxo.locked);
        break;
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue, bValue;
      switch (sortBy) {
        case 'amount':
          aValue = a.value;
          bValue = b.value;
          break;
        case 'confirmations':
          aValue = a.confirmations;
          bValue = b.confirmations;
          break;
        case 'txid':
          aValue = a.txid;
          bValue = b.txid;
          break;
        default:
          return 0;
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    setFilteredUtxos(filtered);
  }, [utxos, activeFilter, searchTerm, sortBy, sortOrder]);

  // Initial load - force refresh to ensure we have address fields
  useEffect(() => {
    if (walletAddress) {
      console.log('🧪 [INIT] Initial UTXO load for address:', walletAddress);
      fetchUtxos(false); // Don't show toast for initial load
      setHasShownInitialLoadToast(true);
    }
  }, [walletAddress]); // Removed hasShownInitialLoadToast from deps to force refresh

  // Toggle UTXO lock
  const toggleUtxoLock = (utxo: Utxo) => {
    const utxoId = `${utxo.txid}:${utxo.vout}`;
    const newLocked = !utxo.locked;

    // Update local state
    setUtxos(prev => prev.map(u =>
      u.txid === utxo.txid && u.vout === utxo.vout
        ? { ...u, locked: newLocked }
        : u
    ));

    // Update localStorage
    const lockedUtxos = loadLockedUtxos();
    if (newLocked) {
      lockedUtxos.add(utxoId);
    } else {
      lockedUtxos.delete(utxoId);
    }
    saveLockedUtxos(lockedUtxos);

    toast.success(newLocked ? 'UTXO locked successfully' : 'UTXO unlocked successfully');
  };

  // Batch operations
  const toggleBatchLock = (lock: boolean) => {
    const lockedUtxos = loadLockedUtxos();

    filteredUtxos.forEach(utxo => {
      if (selectedUtxos.has(`${utxo.txid}:${utxo.vout}`)) {
        const utxoId = `${utxo.txid}:${utxo.vout}`;
        if (lock) {
          lockedUtxos.add(utxoId);
        } else {
          lockedUtxos.delete(utxoId);
        }
      }
    });

    saveLockedUtxos(lockedUtxos);

    // Update local state
    setUtxos(prev => prev.map(utxo => {
      const utxoId = `${utxo.txid}:${utxo.vout}`;
      if (selectedUtxos.has(utxoId)) {
        return { ...utxo, locked: lock };
      }
      return utxo;
    }));

    setSelectedUtxos(new Set());
    toast.success(`${lock ? 'Locked' : 'Unlocked'} ${selectedUtxos.size} UTXOs`);
  };

  // Calculate summary stats
  const summary = React.useMemo(() => {
    const totalDoge = utxos.reduce((sum, utxo) => sum + (utxo.value / 100000000), 0);
    const totalUtxos = utxos.length;
    const inscribedCount = utxos.filter(utxo => utxo.inscriptions && utxo.inscriptions.length > 0).length;
    const avgSize = totalUtxos > 0 ? totalDoge / totalUtxos : 0;

    return { totalDoge, totalUtxos, inscribedCount, avgSize };
  }, [utxos]);

  const formatDoge = (satoshis: number) => {
    return (satoshis / 100000000).toFixed(8);
  };

  const formatKoinu = (koinu: number) => {
    if (koinu == null || isNaN(koinu)) return '0';
    return koinu.toLocaleString();
  };

  const getStatusColor = (confirmations: number) => {
    if (confirmations >= 6) return 'text-green-400';
    if (confirmations >= 1) return 'text-yellow-400';
    return 'text-red-400';
  };

  // Get plain (non-inscribed) UTXOs from selected
  const getPlainSelectedUtxos = () => {
    console.log('🧪 [GET PLAIN UTXOS] Selected IDs:', Array.from(selectedUtxos));
    console.log('🧪 [GET PLAIN UTXOS] Available UTXOs:', utxos.length);

    const result = Array.from(selectedUtxos)
      .map(utxoId => {
        const found = utxos.find(u => `${u.txid}:${u.vout}` === utxoId);
        if (!found) {
          console.warn(`🧪 [GET PLAIN UTXOS] UTXO ${utxoId} not found in available UTXOs`);
        }
        return found;
      })
      .filter((utxo): utxo is Utxo => {
        if (utxo === undefined) {
          console.warn('🧪 [GET PLAIN UTXOS] Filtering out undefined UTXO');
          return false;
        }
        const isPlain = !utxo.inscriptions || utxo.inscriptions.length === 0;
        const isUnlocked = !utxo.locked;
        const passesFilter = isPlain && isUnlocked;

        console.log(`🧪 [GET PLAIN UTXOS] UTXO ${utxo.txid}:${utxo.vout} - Plain: ${isPlain}, Unlocked: ${isUnlocked}, Passes: ${passesFilter}`);
        return passesFilter;
      });

    console.log('🧪 [GET PLAIN UTXOS] Final result:', result.length, 'UTXOs');
    return result;
  };

  // Send eligible UTXOs to DogeDrops
  const sendToDogedrops = () => {
    const eligibleUtxos = getPlainSelectedUtxos();

    if (eligibleUtxos.length === 0) {
      toast.error('No eligible UTXOs selected. Only unlocked, plain (non-inscribed) UTXOs can be used for airdrops.');
      return;
    }

    // Store selected UTXOs in localStorage for DogeDrops to pick up
    localStorage.setItem('dogedrops-selected-utxos', JSON.stringify(eligibleUtxos));

    // Navigate to DogeDrops (this would need to be handled by parent component)
    if (onSendToDogedrops) {
      onSendToDogedrops(eligibleUtxos);
    }

    toast.success(`Selected ${eligibleUtxos.length} UTXOs for DogeDrops! Navigate to DogeDrops to use them.`);
    setSelectedUtxos(new Set()); // Clear selection
  };

  // Estimate merge transaction
  const estimateMerge = async () => {
    const plainUtxos = getPlainSelectedUtxos();
    if (plainUtxos.length < 2) {
      toast.error('Select at least 2 plain (non-inscribed) UTXOs to merge');
      return;
    }

    try {
      // Import doge-sdk dynamically
      const { estimateTxFee } = await import('borkstarter');

      const totalInput = plainUtxos.reduce((sum, utxo) => sum + utxo.value, 0);
      const inputCount = plainUtxos.length;
      const outputCount = 1; // Single merged output

      // Estimate fee (rough calculation: 148 bytes per input + 34 bytes per output + 10 bytes overhead)
      const estimatedTxSize = inputCount * 148 + outputCount * 34 + 10;
      const feeRate = 0.01; // 0.01 DOGE per KB (adjustable)
      const estimatedFee = Math.ceil((estimatedTxSize / 1024) * feeRate * 100000000); // in satoshis

      const totalOutput = totalInput - estimatedFee;

      if (totalOutput <= 0) {
        toast.error('Transaction would result in negative output. Try with more UTXOs or higher amounts.');
        return;
      }

      setMergeEstimate({
        fee: estimatedFee,
        inputCount,
        outputCount,
        totalInput,
        totalOutput
      });
      setShowMergeModal(true);
    } catch (error) {
      console.error('Failed to estimate merge:', error);
      toast.error('Failed to estimate merge transaction');
    }
  };

  // Execute merge transaction
  const executeMerge = async () => {
    if (!mergeEstimate) return;

    setIsMerging(true);
    try {
      let plainUtxos = getPlainSelectedUtxos();

      // Debug: Log selected UTXOs before filtering
      console.log('🧪 [MERGE] Selected UTXO IDs:', Array.from(selectedUtxos));
      console.log('🧪 [MERGE] Available UTXOs in state:', utxos.length);

      // Debug: Log what getPlainSelectedUtxos returns
      const mappedUtxos = Array.from(selectedUtxos)
        .map(utxoId => {
          const found = utxos.find(u => `${u.txid}:${u.vout}` === utxoId);
          console.log(`🧪 [MERGE] Mapping ${utxoId} ->`, found ? {
            txid: found.txid,
            vout: found.vout,
            address: found.address,
            scriptPubKey: !!found.scriptPubKey
          } : 'NOT FOUND');
          return found;
        });

      console.log('🧪 [MERGE] Plain UTXOs to merge:', plainUtxos.length);
      plainUtxos.forEach((utxo, i) => {
        console.log(`🧪 [MERGE] UTXO ${i}:`, {
          txid: utxo.txid,
          vout: utxo.vout,
          value: utxo.value,
          address: utxo.address,
          hasAddress: !!utxo.address,
          scriptPubKey: utxo.scriptPubKey?.substring(0, 20) + '...',
          isUndefined: utxo === undefined
        });
      });

      // Check if any UTXOs are missing required fields
      const missingAddress = plainUtxos.some(utxo => !utxo.address);
      const missingScriptPubKey = plainUtxos.some(utxo => !utxo.scriptPubKey);

      if (missingAddress || missingScriptPubKey) {
        console.log('🧪 [MERGE] Some UTXOs missing required fields:', {
          missingAddress,
          missingScriptPubKey
        });
        console.log('🧪 [MERGE] Refreshing UTXO data...');
        await fetchUtxos(false); // Refresh without toast
        // Re-get the updated UTXOs
        plainUtxos = getPlainSelectedUtxos();
        console.log('🧪 [MERGE] After refresh, checking UTXOs...');
        plainUtxos.forEach((utxo, i) => {
          console.log(`🧪 [MERGE] Refreshed UTXO ${i}:`, {
            address: utxo.address,
            hasAddress: !!utxo.address,
            scriptPubKey: !!utxo.scriptPubKey
          });
        });
      }

      // Final validation
      const invalidUtxos = plainUtxos.filter(utxo => !utxo.address || !utxo.scriptPubKey);
      if (invalidUtxos.length > 0) {
        throw new Error(`Some UTXOs are missing required data (address/scriptPubKey). Please refresh the page and try again.`);
      }

      // Use real blockchain broadcasting
      console.log('📤 [MERGE EXECUTE] About to call broadcastMerge with:', {
        plainUtxosCount: plainUtxos.length,
        walletAddress,
        fee: mergeEstimate.fee,
        hasWalletSigner: !!signPSBT,
        plainUtxosSample: plainUtxos.slice(0, 2).map(u => ({
          txid: u.txid.substring(0, 8) + '...',
          address: u.address,
          value: u.value
        }))
      });

      const { broadcastMerge } = await import('../../utils/txBroadcaster');

      const txid = await broadcastMerge(plainUtxos, walletAddress, mergeEstimate.fee, signPSBT);

      toast.success(`Merge successful! Transaction: ${txid.slice(0, 16)}...`);

      // Reset state
      setSelectedUtxos(new Set());
      setShowMergeModal(false);
      setMergeEstimate(null);

      // Refresh UTXOs after a delay (simulating confirmation time)
      setTimeout(() => {
        fetchUtxos(false); // Don't show toast for automatic refresh after transaction
      }, 5000);

    } catch (error) {
      console.error('Failed to execute merge:', error);
      toast.error('Failed to execute merge transaction');
    } finally {
      setIsMerging(false);
    }
  };

  // Start split process for a UTXO
  const startSplit = (utxo: Utxo) => {
    if (utxo.inscriptions && utxo.inscriptions.length > 0) {
      toast.error('Cannot split inscribed UTXOs to prevent asset burns');
      return;
    }
    if (utxo.locked) {
      toast.error('Cannot split locked UTXOs');
      return;
    }

    setSelectedSplitUtxo(utxo);
    setSplitMode('count');
    setSplitCount(2);
    setCustomAmounts([]);
    setShowSplitModal(true);
  };

  // Calculate split outputs
  const calculateSplitOutputs = (utxo: Utxo): number[] => {
    if (splitMode === 'count') {
      const baseAmount = Math.floor(utxo.value / splitCount);
      const outputs = Array(splitCount).fill(baseAmount);

      // Distribute remainder to first output
      const remainder = utxo.value % splitCount;
      outputs[0] += remainder;

      return outputs;
    } else {
      // Custom amounts - parse and validate
      const amounts = customAmounts.map(amount => {
        const parsed = parseInt(amount) || 0;
        return parsed * 100000000; // Convert DOGE to satoshis
      }).filter(amount => amount > 0);

      // Ensure total doesn't exceed input
      const total = amounts.reduce((sum, amount) => sum + amount, 0);
      if (total > utxo.value) {
        throw new Error('Custom amounts exceed input UTXO value');
      }

      return amounts;
    }
  };

  // Estimate split transaction
  const estimateSplit = async () => {
    if (!selectedSplitUtxo) return;

    try {
      const outputs = calculateSplitOutputs(selectedSplitUtxo);

      if (outputs.length < 2) {
        toast.error('Must create at least 2 outputs');
        return;
      }

      // Check for dust outputs
      const dustLimit = 546; // satoshis
      const dustOutputs = outputs.filter(amount => amount < dustLimit);
      if (dustOutputs.length > 0) {
        toast.error(`Cannot create dust outputs (< ${dustLimit} satoshis). Adjust split amounts.`);
        return;
      }

      // Estimate fee (rough calculation)
      const inputCount = 1;
      const outputCount = outputs.length;
      const estimatedTxSize = inputCount * 148 + outputCount * 34 + 10;
      const feeRate = 0.01; // 0.01 DOGE per KB
      const estimatedFee = Math.ceil((estimatedTxSize / 1024) * feeRate * 100000000);

      // Check if transaction is possible
      const totalOutput = outputs.reduce((sum, amount) => sum + amount, 0);
      if (totalOutput + estimatedFee > selectedSplitUtxo.value) {
        toast.error('Transaction would exceed input value. Reduce output amounts or fee rate.');
        return;
      }

      setSplitEstimate({
        fee: estimatedFee,
        outputs,
        totalInput: selectedSplitUtxo.value
      });
    } catch (error) {
      console.error('Failed to estimate split:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to estimate split transaction');
    }
  };

  // Execute split transaction
  const executeSplit = async () => {
    if (!selectedSplitUtxo || !splitEstimate) return;

    setIsSplitting(true);
    try {
      // Use real blockchain broadcasting
      const { broadcastSplit } = await import('../../utils/txBroadcaster');

      const outputs = splitEstimate.outputs.map(amount => ({
        address: walletAddress,
        value: amount
      }));

      const txid = await broadcastSplit(selectedSplitUtxo, outputs, splitEstimate.fee);

      toast.success(`Split successful! Transaction: ${txid.slice(0, 16)}...`);

      // Reset state
      setShowSplitModal(false);
      setSelectedSplitUtxo(null);
      setSplitEstimate(null);

      // Refresh UTXOs after delay
      setTimeout(() => {
        fetchUtxos(false); // Don't show toast for automatic refresh after transaction
      }, 5000);

    } catch (error) {
      console.error('Failed to execute split:', error);
      toast.error('Failed to execute split transaction');
    } finally {
      setIsSplitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <div className="bg-bg-secondary rounded-lg p-3 md:p-4 border border-border-primary">
          <div className="flex items-center space-x-2">
            <Coins className="w-4 h-4 md:w-5 md:h-5 text-primary-400 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-xs md:text-sm text-text-secondary truncate">Total DOGE</p>
              <p className="text-base md:text-lg font-semibold text-text-primary">{summary.totalDoge.toFixed(4)}</p>
            </div>
          </div>
        </div>

        <div className="bg-bg-secondary rounded-lg p-3 md:p-4 border border-border-primary">
          <div className="flex items-center space-x-2">
            <CubeIcon className="w-4 h-4 md:w-5 md:h-5 text-primary-400 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-xs md:text-sm text-text-secondary truncate">Total UTXOs</p>
              <p className="text-base md:text-lg font-semibold text-text-primary">{summary.totalUtxos}</p>
            </div>
          </div>
        </div>

        <div className="bg-bg-secondary rounded-lg p-3 md:p-4 border border-border-primary">
          <div className="flex items-center space-x-2">
            <BanknotesIcon className="w-4 h-4 md:w-5 md:h-5 text-orange-400 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-xs md:text-sm text-text-secondary truncate">Inscriptions</p>
              <p className="text-base md:text-lg font-semibold text-text-primary">{summary.inscribedCount}</p>
            </div>
          </div>
        </div>

        <div className="bg-bg-secondary rounded-lg p-3 md:p-4 border border-border-primary">
          <div className="flex items-center space-x-2">
            <BarsArrowDownIcon className="w-4 h-4 md:w-5 md:h-5 text-blue-400 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-xs md:text-sm text-text-secondary truncate">Avg Size</p>
              <p className="text-base md:text-lg font-semibold text-text-primary">{summary.avgSize.toFixed(4)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Warnings */}
      {summary.totalUtxos > 10 && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <ExclamationTriangleIcon className="w-5 h-5 text-yellow-400 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="font-medium text-yellow-400">High fragmentation detected</h4>
              <p className="text-sm text-text-secondary mt-1">
                You have {summary.totalUtxos} UTXOs. Consider merging small ones to save on fees.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="space-y-3 md:space-y-0 md:flex md:gap-4">
        <div className="flex-1">
          <div className="relative">
            <MagnifyingGlassIcon className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-text-secondary" />
            <input
              type="text"
              placeholder="Search txid or address..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 md:py-2 bg-bg-secondary border border-border-primary rounded-lg text-text-primary placeholder-text-secondary focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm md:text-base"
            />
          </div>
        </div>

        <div className="flex gap-2">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-3 py-3 md:py-2 bg-bg-secondary border border-border-primary rounded-lg text-text-primary focus:ring-2 focus:ring-primary-500 text-sm md:text-base flex-1 md:flex-none"
          >
            <option value="amount">Amount</option>
            <option value="confirmations">Confirmations</option>
            <option value="txid">TxID</option>
          </select>

          <button
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            className="p-3 md:p-2 bg-bg-secondary border border-border-primary rounded-lg hover:bg-bg-primary transition-colors"
            title={`Sort ${sortOrder === 'asc' ? 'descending' : 'ascending'}`}
          >
            {sortOrder === 'asc' ? <BarsArrowUpIcon className="w-4 h-4" /> : <BarsArrowDownIcon className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-1">
        {[
          { key: 'all', label: 'All UTXOs', count: utxos.length },
          { key: 'inscribed', label: 'Inscriptions', count: utxos.filter(u => u.inscriptions?.length).length },
          { key: 'plain', label: 'Plain DOGE', count: utxos.filter(u => !u.inscriptions?.length).length },
          { key: 'locked', label: 'Locked', count: utxos.filter(u => u.locked).length }
        ].map(({ key, label, count }) => (
          <button
            key={key}
            onClick={() => setActiveFilter(key as any)}
            className={`flex-1 min-w-[80px] rounded-lg py-2 px-3 text-xs md:text-sm font-medium transition-colors duration-200 flex items-center justify-center space-x-1 ${
              activeFilter === key
                ? 'bg-primary-500 text-bg-primary'
                : 'bg-bg-secondary text-text-secondary hover:text-text-primary hover:bg-bg-primary border border-border-primary'
            }`}
          >
            <span>{label}</span>
            <span className={`text-xs px-1.5 py-0.5 rounded font-semibold ${
              activeFilter === key
                ? 'bg-bg-primary bg-opacity-20 text-bg-primary'
                : 'bg-primary-500 bg-opacity-20 text-primary-500'
            }`}>
              {count}
            </span>
          </button>
        ))}
      </div>

      {/* Batch Actions */}
      {selectedUtxos.size > 0 && (
        <div className="bg-primary-500/10 border border-primary-500/30 rounded-lg p-3 md:p-4">
          <div className="flex flex-col md:flex-row gap-3 items-start md:items-center">
            <span className="text-sm text-text-primary font-medium">
              {selectedUtxos.size} UTXO{selectedUtxos.size > 1 ? 's' : ''} selected
            </span>
            <div className="flex flex-wrap gap-2 w-full md:w-auto md:ml-auto">
              <button
                onClick={() => toggleBatchLock(true)}
                className="flex items-center justify-center space-x-1 px-3 py-2 bg-primary-500 text-bg-primary rounded-lg text-sm hover:bg-primary-400 transition-colors flex-1 md:flex-none"
              >
                <LockClosedIcon className="w-4 h-4" />
                <span>Lock</span>
              </button>
              <button
                onClick={() => toggleBatchLock(false)}
                className="flex items-center justify-center space-x-1 px-3 py-2 bg-bg-secondary text-text-primary rounded-lg text-sm hover:bg-bg-primary transition-colors flex-1 md:flex-none"
              >
                <LockOpenIcon className="w-4 h-4" />
                <span>Unlock</span>
              </button>
              <button
                onClick={estimateMerge}
                className="flex items-center justify-center space-x-1 px-3 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-500 transition-colors flex-1 md:flex-none"
                title="Merge selected plain UTXOs to save fees (limited to 2 inputs for testing)"
              >
                <ArrowDownIcon className="w-4 h-4" />
                <span>Merge (Test)</span>
              </button>
              <button
                onClick={sendToDogedrops}
                className="flex items-center justify-center space-x-1 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-500 transition-colors flex-1 md:flex-none"
                title="Send eligible UTXOs to DogeDrops for airdrop"
              >
                <ArrowDownIcon className="w-4 h-4" />
                <span className="hidden sm:inline">Send to </span>DogeDrops
              </button>
              <button
                onClick={() => setSelectedUtxos(new Set())}
                className="flex items-center justify-center space-x-1 px-3 py-2 bg-gray-500 text-white rounded-lg text-sm hover:bg-gray-400 transition-colors flex-1 md:flex-none"
              >
                <XMarkIcon className="w-4 h-4" />
                <span>Clear</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* UTXO Table/List */}
      <div className="bg-bg-secondary rounded-lg border border-border-primary overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <ArrowPathIcon className="w-6 h-6 animate-spin text-primary-500 mr-2" />
            <span className="text-text-secondary">Loading UTXOs...</span>
          </div>
        ) : filteredUtxos.length === 0 ? (
          <div className="text-center py-8 text-text-secondary">
            <CubeIcon className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <p>No UTXOs found</p>
            <p className="text-sm mt-1">Try adjusting your filters or refresh the data</p>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-bg-primary border-b border-border-primary">
                  <tr>
                    <th className="px-4 py-3 text-left">
                      <input
                        type="checkbox"
                        checked={selectedUtxos.size === filteredUtxos.length && filteredUtxos.length > 0}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedUtxos(new Set(filteredUtxos.map(u => `${u.txid}:${u.vout}`)));
                          } else {
                            setSelectedUtxos(new Set());
                          }
                        }}
                        className="rounded border-border-primary bg-bg-secondary text-primary-500"
                      />
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-text-primary">UTXO ID</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-text-primary">Amount</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-text-primary">Confirmations</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-text-primary">Inscriptions</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-text-primary">Status</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-text-primary">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUtxos.map((utxo) => {
                    const utxoId = `${utxo.txid}:${utxo.vout}`;
                    const isSelected = selectedUtxos.has(utxoId);

                    return (
                      <tr key={utxoId} className={`border-b border-border-primary hover:bg-bg-primary/50 ${isSelected ? 'bg-primary-500/10' : ''}`}>
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => {
                              const newSelected = new Set(selectedUtxos);
                              if (e.target.checked) {
                                newSelected.add(utxoId);
                              } else {
                                newSelected.delete(utxoId);
                              }
                              setSelectedUtxos(newSelected);
                            }}
                            className="rounded border-border-primary bg-bg-secondary text-primary-500"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-mono text-sm text-text-primary">
                            <div className="truncate max-w-xs" title={`${utxo.txid}:${utxo.vout}`}>
                              {utxo.txid.slice(0, 8)}...:{utxo.vout}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="text-sm text-text-primary">
                            <div>{formatDoge(utxo.value)} DOGE</div>
                            <div className="text-xs text-text-secondary">{formatKoinu(utxo.value)} koinu</div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`text-sm font-medium ${getStatusColor(utxo.confirmations)}`}>
                            {utxo.confirmations}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {utxo.inscriptions && utxo.inscriptions.length > 0 ? (
                            <div className="flex items-center justify-center space-x-1">
                              <BanknotesIcon className="w-4 h-4 text-orange-400" />
                              <span className="text-sm text-text-primary">{utxo.inscriptions.length}</span>
                            </div>
                          ) : (
                            <span className="text-sm text-text-secondary">None</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {utxo.locked ? (
                            <div className="flex items-center justify-center space-x-1 text-yellow-400">
                              <LockClosedIcon className="w-4 h-4" />
                              <span className="text-xs">Locked</span>
                            </div>
                          ) : (
                            <span className="text-sm text-green-400">Spendable</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center space-x-1">
                            <button
                              onClick={() => toggleUtxoLock(utxo)}
                              className={`p-2 rounded transition-colors ${
                                utxo.locked
                                  ? 'text-yellow-400 hover:bg-yellow-500/10'
                                  : 'text-text-secondary hover:bg-bg-primary'
                              }`}
                              title={utxo.locked ? 'Unlock UTXO' : 'Lock UTXO'}
                            >
                              {utxo.locked ? <LockClosedIcon className="w-4 h-4" /> : <LockOpenIcon className="w-4 h-4" />}
                            </button>
                            <button
                              onClick={() => startSplit(utxo)}
                              className="p-2 rounded text-text-secondary hover:bg-bg-primary transition-colors"
                              title="Split UTXO"
                            >
                              <ScissorsIcon className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden">
              <div className="divide-y divide-border-primary">
                {filteredUtxos.map((utxo) => {
                  const utxoId = `${utxo.txid}:${utxo.vout}`;
                  const isSelected = selectedUtxos.has(utxoId);

                  return (
                    <div key={utxoId} className={`p-4 ${isSelected ? 'bg-primary-500/10' : ''}`}>
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => {
                              const newSelected = new Set(selectedUtxos);
                              if (e.target.checked) {
                                newSelected.add(utxoId);
                              } else {
                                newSelected.delete(utxoId);
                              }
                              setSelectedUtxos(newSelected);
                            }}
                            className="rounded border-border-primary bg-bg-secondary text-primary-500"
                          />
                          <div>
                            <div className="font-mono text-sm text-text-primary">
                              {utxo.txid.slice(0, 12)}...:{utxo.vout}
                            </div>
                            <div className="text-xs text-text-secondary">
                              {formatDoge(utxo.value)} DOGE
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className={`text-xs px-2 py-1 rounded ${getStatusColor(utxo.confirmations)} bg-current bg-opacity-10`}>
                            {utxo.confirmations} confs
                          </span>
                          {utxo.locked && (
                            <LockClosedIcon className="w-4 h-4 text-yellow-400" />
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          {utxo.inscriptions && utxo.inscriptions.length > 0 ? (
                            <div className="flex items-center space-x-1">
                              <BanknotesIcon className="w-4 h-4 text-orange-400" />
                              <span className="text-sm text-text-primary">{utxo.inscriptions.length} Inscription{utxo.inscriptions.length > 1 ? 's' : ''}</span>
                            </div>
                          ) : (
                            <span className="text-sm text-green-400">Plain DOGE</span>
                          )}
                        </div>

                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => toggleUtxoLock(utxo)}
                            className={`p-2 rounded transition-colors ${
                              utxo.locked
                                ? 'text-yellow-400 hover:bg-yellow-500/10'
                                : 'text-text-secondary hover:bg-bg-primary'
                            }`}
                            title={utxo.locked ? 'Unlock UTXO' : 'Lock UTXO'}
                          >
                            {utxo.locked ? <LockClosedIcon className="w-5 h-5" /> : <LockOpenIcon className="w-5 h-5" />}
                          </button>
                          <button
                            onClick={() => startSplit(utxo)}
                            className="p-2 rounded text-text-secondary hover:bg-bg-primary transition-colors"
                            title="Split UTXO"
                          >
                            <ScissorsIcon className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Refresh Button */}
      <div className="flex justify-center">
        <button
          onClick={fetchUtxos}
          disabled={isLoading}
          className="flex items-center space-x-2 px-4 py-2 bg-primary-500 hover:bg-primary-400 text-bg-primary rounded-lg transition-colors disabled:opacity-50"
        >
          <ArrowPathIcon className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Refresh UTXOs</span>
        </button>
      </div>

      {lastFetch && (
        <p className="text-center text-xs text-text-secondary">
          Last updated: {new Date(lastFetch).toLocaleString()}
        </p>
      )}

      {/* Merge Confirmation Modal */}
      {showMergeModal && mergeEstimate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-bg-primary border border-border-primary rounded-xl p-4 md:p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-3">
                <ArrowDownIcon className="w-5 h-5 md:w-6 md:h-6 text-green-400 flex-shrink-0" />
                <div className="min-w-0">
                  <h3 className="text-base md:text-lg font-semibold text-text-primary">Merge UTXOs</h3>
                  <p className="text-xs md:text-sm text-text-secondary">Consolidate plain UTXOs to save fees</p>
                </div>
              </div>
              <button
                onClick={() => setShowMergeModal(false)}
                className="p-1 hover:bg-bg-secondary rounded-lg transition-colors flex-shrink-0"
              >
                <XMarkIcon className="w-4 h-4 md:w-5 md:h-5 text-text-secondary" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-bg-secondary rounded-lg p-3 md:p-4">
                <h4 className="font-medium text-text-primary mb-3 text-sm md:text-base">Transaction Details</h4>
                <div className="space-y-2 text-xs md:text-sm">
                  <div className="flex justify-between">
                    <span className="text-text-secondary">Inputs:</span>
                    <span className="text-text-primary">{mergeEstimate.inputCount} UTXOs</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-secondary">Total Input:</span>
                    <span className="text-text-primary">{formatDoge(mergeEstimate.totalInput)} DOGE</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-secondary">Estimated Fee:</span>
                    <span className="text-yellow-400">{formatDoge(mergeEstimate.fee)} DOGE</span>
                  </div>
                  <div className="flex justify-between font-medium">
                    <span className="text-text-secondary">Output:</span>
                    <span className="text-green-400">{formatDoge(mergeEstimate.totalOutput)} DOGE</span>
                  </div>
                </div>
              </div>

              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
                <div className="flex items-start space-x-2">
                  <ExclamationTriangleIcon className="w-4 h-4 text-yellow-400 mt-0.5 flex-shrink-0" />
                  <div className="text-xs md:text-sm">
                    <p className="text-yellow-400 font-medium">Safety Check</p>
                    <p className="text-text-secondary mt-1">
                      Only plain (non-inscribed) UTXOs will be merged. Inscribed UTXOs are automatically excluded to prevent accidental burns.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => setShowMergeModal(false)}
                  className="flex-1 px-4 py-3 md:py-2 bg-bg-secondary hover:bg-bg-primary border border-border-primary rounded-lg transition-colors text-sm md:text-base"
                  disabled={isMerging}
                >
                  Cancel
                </button>
                <button
                  onClick={executeMerge}
                  disabled={isMerging}
                  className="flex-1 px-4 py-3 md:py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg transition-colors disabled:opacity-50 text-sm md:text-base"
                >
                  {isMerging ? 'Merging...' : 'Confirm Merge'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Split Modal */}
      {showSplitModal && selectedSplitUtxo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="bg-bg-primary border border-border-primary rounded-xl p-6 max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-3">
                <ScissorsIcon className="w-6 h-6 text-blue-400" />
                <div>
                  <h3 className="text-lg font-semibold text-text-primary">Split UTXO</h3>
                  <p className="text-sm text-text-secondary">Divide for precise airdrop control</p>
                </div>
              </div>
              <button
                onClick={() => setShowSplitModal(false)}
                className="p-1 hover:bg-bg-secondary rounded-lg transition-colors"
              >
                <XMarkIcon className="w-5 h-5 text-text-secondary" />
              </button>
            </div>

            <div className="space-y-4">
              {/* UTXO Info */}
              <div className="bg-bg-secondary rounded-lg p-4">
                <h4 className="font-medium text-text-primary mb-2">Source UTXO</h4>
                <div className="text-sm space-y-1">
                  <div className="font-mono">{selectedSplitUtxo.txid.slice(0, 16)}...:{selectedSplitUtxo.vout}</div>
                  <div className="text-text-secondary">
                    {formatDoge(selectedSplitUtxo.value)} DOGE ({formatSatoshis(selectedSplitUtxo.value)} satdoges)
                  </div>
                </div>
              </div>

              {/* Split Mode */}
              <div className="space-y-3">
                <div className="flex space-x-2">
                  <button
                    onClick={() => setSplitMode('count')}
                    className={`flex-1 px-3 py-2 text-sm rounded-lg transition-colors ${
                      splitMode === 'count'
                        ? 'bg-primary-500 text-bg-primary'
                        : 'bg-bg-secondary text-text-secondary hover:bg-bg-primary'
                    }`}
                  >
                    Equal Split
                  </button>
                  <button
                    onClick={() => setSplitMode('custom')}
                    className={`flex-1 px-3 py-2 text-sm rounded-lg transition-colors ${
                      splitMode === 'custom'
                        ? 'bg-primary-500 text-bg-primary'
                        : 'bg-bg-secondary text-text-secondary hover:bg-bg-primary'
                    }`}
                  >
                    Custom Amounts
                  </button>
                </div>

                {splitMode === 'count' ? (
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-2">
                      Number of outputs (2-10)
                    </label>
                    <select
                      value={splitCount}
                      onChange={(e) => setSplitCount(parseInt(e.target.value))}
                      className="w-full px-3 py-2 bg-bg-secondary border border-border-primary rounded-lg text-text-primary focus:ring-2 focus:ring-primary-500"
                    >
                      {Array.from({ length: 9 }, (_, i) => i + 2).map(num => (
                        <option key={num} value={num}>{num} outputs</option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-2">
                      Custom amounts (in DOGE)
                    </label>
                    <div className="space-y-2 max-h-32 overflow-y-auto">
                      {Array.from({ length: Math.max(customAmounts.length + 1, 2) }, (_, i) => (
                        <input
                          key={i}
                          type="number"
                          step="0.00000001"
                          placeholder={`Output ${i + 1} (DOGE)`}
                          value={customAmounts[i] || ''}
                          onChange={(e) => {
                            const newAmounts = [...customAmounts];
                            newAmounts[i] = e.target.value;
                            setCustomAmounts(newAmounts.filter(amount => amount !== ''));
                          }}
                          className="w-full px-3 py-2 bg-bg-secondary border border-border-primary rounded-lg text-text-primary focus:ring-2 focus:ring-primary-500"
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Estimate Button */}
              {!splitEstimate && (
                <button
                  onClick={estimateSplit}
                  className="w-full px-4 py-2 bg-primary-500 hover:bg-primary-400 text-bg-primary rounded-lg transition-colors"
                >
                  Estimate Split
                </button>
              )}

              {/* Split Estimate */}
              {splitEstimate && (
                <div className="space-y-4">
                  <div className="bg-bg-secondary rounded-lg p-4">
                    <h4 className="font-medium text-text-primary mb-3">Split Preview</h4>
                    <div className="space-y-2">
                      {splitEstimate.outputs.map((amount, index) => (
                        <div key={index} className="flex justify-between text-sm">
                          <span className="text-text-secondary">Output {index + 1}:</span>
                          <span className="text-text-primary">{formatDoge(amount)} DOGE</span>
                        </div>
                      ))}
                      <div className="border-t border-border-primary pt-2 mt-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-text-secondary">Estimated Fee:</span>
                          <span className="text-yellow-400">{formatDoge(splitEstimate.fee)} DOGE</span>
                        </div>
                        <div className="flex justify-between text-sm font-medium">
                          <span className="text-text-secondary">Total Output:</span>
                          <span className="text-green-400">
                            {formatDoge(splitEstimate.outputs.reduce((sum, amount) => sum + amount, 0))} DOGE
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex space-x-3">
                    <button
                      onClick={() => {
                        setSplitEstimate(null);
                        setCustomAmounts([]);
                      }}
                      className="flex-1 px-4 py-2 bg-bg-secondary hover:bg-bg-primary border border-border-primary rounded-lg transition-colors"
                      disabled={isSplitting}
                    >
                      Adjust
                    </button>
                    <button
                      onClick={executeSplit}
                      disabled={isSplitting}
                      className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors disabled:opacity-50"
                    >
                      {isSplitting ? 'Splitting...' : 'Confirm Split'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
