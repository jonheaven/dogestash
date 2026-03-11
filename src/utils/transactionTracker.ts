import { DogeLinkRPC } from 'doge-sdk';

// Transaction types
export type TransactionType = 'utxo_merge' | 'utxo_split' | 'drc20_deploy' | 'drc20_mint' | 'drc20_transfer' | 'dogedrop_airdrop';

export interface PendingTransaction {
  id: string;
  txid: string;
  type: TransactionType;
  timestamp: number;
  confirmations: number;
  requiredConfirmations: number;
  metadata: Record<string, any>;
  status: 'pending' | 'confirmed' | 'failed';
  retryCount: number;
  lastChecked: number;
}

export interface TransactionAnalytics {
  totalTransactions: number;
  successfulTransactions: number;
  failedTransactions: number;
  averageConfirmationTime: number;
  successRate: number;
  transactionsByType: Record<TransactionType, number>;
}

class TransactionTracker {
  private pendingTransactions: Map<string, PendingTransaction> = new Map();
  private rpcProvider: DogeLinkRPC;
  private checkInterval: NodeJS.Timeout | null = null;
  private readonly CHECK_INTERVAL = 10000; // 10 seconds
  private readonly MAX_RETRIES = 3;
  private readonly REQUIRED_CONFIRMATIONS = 1;

  constructor(rpcUrl: string) {
    this.rpcProvider = new DogeLinkRPC(rpcUrl);
    this.startMonitoring();
  }

  // Add a new transaction to track
  addTransaction(
    txid: string,
    type: TransactionType,
    metadata: Record<string, any> = {},
    requiredConfirmations: number = this.REQUIRED_CONFIRMATIONS
  ): string {
    const id = `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const transaction: PendingTransaction = {
      id,
      txid,
      type,
      timestamp: Date.now(),
      confirmations: 0,
      requiredConfirmations,
      metadata,
      status: 'pending',
      retryCount: 0,
      lastChecked: Date.now()
    };

    this.pendingTransactions.set(id, transaction);

    // Persist to localStorage
    this.saveToStorage();

    console.log(`🔍 Tracking transaction: ${txid} (${type})`);
    return id;
  }

  // Check transaction status
  private async checkTransaction(tx: PendingTransaction): Promise<void> {
    try {
      const txInfo = await this.rpcProvider.getTransactionWithStatus(tx.txid);
      tx.lastChecked = Date.now();

      if (txInfo) {
        const confirmations = txInfo.status.confirmations ?? (txInfo.status.confirmed ? 1 : 0);
        tx.confirmations = confirmations;

        if (tx.confirmations >= tx.requiredConfirmations) {
          tx.status = 'confirmed';
          console.log(`✅ Transaction confirmed: ${tx.txid} (${tx.confirmations} confirmations)`);
          this.onTransactionConfirmed(tx);
        }
      }
    } catch (error) {
      console.warn(`Failed to check transaction ${tx.txid}:`, error);
      tx.retryCount++;

      if (tx.retryCount >= this.MAX_RETRIES) {
        tx.status = 'failed';
        console.error(`❌ Transaction failed after ${this.MAX_RETRIES} retries: ${tx.txid}`);
        this.onTransactionFailed(tx);
      }
    }
  }

  // Start monitoring loop
  private startMonitoring(): void {
    this.checkInterval = setInterval(async () => {
      const pendingTxs = Array.from(this.pendingTransactions.values())
        .filter(tx => tx.status === 'pending');

      for (const tx of pendingTxs) {
        await this.checkTransaction(tx);
      }

      // Clean up old transactions
      this.cleanupOldTransactions();

      // Save state
      this.saveToStorage();
    }, this.CHECK_INTERVAL);
  }

  // Stop monitoring
  stopMonitoring(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  // Get transaction by ID
  getTransaction(id: string): PendingTransaction | undefined {
    return this.pendingTransactions.get(id);
  }

  // Get all transactions
  getAllTransactions(): PendingTransaction[] {
    return Array.from(this.pendingTransactions.values());
  }

  // Get pending transactions
  getPendingTransactions(): PendingTransaction[] {
    return Array.from(this.pendingTransactions.values())
      .filter(tx => tx.status === 'pending');
  }

  // Get confirmed transactions
  getConfirmedTransactions(): PendingTransaction[] {
    return Array.from(this.pendingTransactions.values())
      .filter(tx => tx.status === 'confirmed');
  }

  // Get failed transactions
  getFailedTransactions(): PendingTransaction[] {
    return Array.from(this.pendingTransactions.values())
      .filter(tx => tx.status === 'failed');
  }

  // Get transaction analytics
  getAnalytics(): TransactionAnalytics {
    const allTxs = Array.from(this.pendingTransactions.values());
    const successful = allTxs.filter(tx => tx.status === 'confirmed');
    const failed = allTxs.filter(tx => tx.status === 'failed');

    const totalTransactions = allTxs.length;
    const successfulTransactions = successful.length;
    const failedTransactions = failed.length;

    // Calculate average confirmation time for successful transactions
    const confirmationTimes = successful
      .filter(tx => tx.confirmations > 0)
      .map(tx => (tx.lastChecked - tx.timestamp) / 1000); // in seconds

    const averageConfirmationTime = confirmationTimes.length > 0
      ? confirmationTimes.reduce((sum, time) => sum + time, 0) / confirmationTimes.length
      : 0;

    const successRate = totalTransactions > 0 ? (successfulTransactions / totalTransactions) * 100 : 0;

    // Count by type
    const transactionsByType = allTxs.reduce((acc, tx) => {
      acc[tx.type] = (acc[tx.type] || 0) + 1;
      return acc;
    }, {} as Record<TransactionType, number>);

    return {
      totalTransactions,
      successfulTransactions,
      failedTransactions,
      averageConfirmationTime,
      successRate,
      transactionsByType
    };
  }

  // Retry a failed transaction
  async retryTransaction(id: string): Promise<boolean> {
    const tx = this.pendingTransactions.get(id);
    if (!tx || tx.status !== 'failed') {
      return false;
    }

    tx.status = 'pending';
    tx.retryCount = 0;
    tx.lastChecked = Date.now();

    console.log(`🔄 Retrying transaction: ${tx.txid}`);
    return true;
  }

  // Event handlers
  private onTransactionConfirmed(tx: PendingTransaction): void {
    // Emit event or call callback
    const event = new CustomEvent('transactionConfirmed', { detail: tx });
    window.dispatchEvent(event);
  }

  private onTransactionFailed(tx: PendingTransaction): void {
    // Emit event or call callback
    const event = new CustomEvent('transactionFailed', { detail: tx });
    window.dispatchEvent(event);
  }

  // Clean up old confirmed transactions (keep last 24 hours)
  private cleanupOldTransactions(): void {
    const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
    const toRemove: string[] = [];

    for (const [id, tx] of this.pendingTransactions) {
      if (tx.status === 'confirmed' && tx.timestamp < oneDayAgo) {
        toRemove.push(id);
      }
    }

    toRemove.forEach(id => this.pendingTransactions.delete(id));
  }

  // Persistence
  private saveToStorage(): void {
    try {
      const data = Array.from(this.pendingTransactions.entries());
      localStorage.setItem('borkstarter_pending_transactions', JSON.stringify(data));
    } catch (error) {
      console.warn('Failed to save transaction data to localStorage:', error);
    }
  }

  private loadFromStorage(): void {
    try {
      const data = localStorage.getItem('borkstarter_pending_transactions');
      if (data) {
        const parsed = JSON.parse(data);
        this.pendingTransactions = new Map(parsed);
      }
    } catch (error) {
      console.warn('Failed to load transaction data from localStorage:', error);
    }
  }

  // Initialize from storage
  initialize(): void {
    this.loadFromStorage();
  }
}

// Export singleton instance
const RPC_URL = `http://dogecoin:${process.env.VITE_DOGECOIN_RPC_PASSWORD || 'password'}@${process.env.VITE_DOGECOIN_RPC_HOST || 'localhost'}:${process.env.VITE_DOGECOIN_RPC_PORT || '22555'}`;

export const transactionTracker = new TransactionTracker(RPC_URL);
transactionTracker.initialize();

