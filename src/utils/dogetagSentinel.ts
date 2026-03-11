// Dogetag Sentinel - Monitors blockchain for Dogetag transactions
// Extends our existing transaction monitoring infrastructure

import { DogeLinkRPC } from 'doge-sdk';
import { transactionTracker, TransactionType } from './transactionTracker';

export interface DiscoveredDogetag {
  id: string;
  txid: string;
  blockHeight: number;
  blockHash: string;
  timestamp: number;
  address: string; // Address that created the tag
  message: string;
  size: number; // Message size in bytes
  explorerUrl: string;
  rawOpReturn: string;
}

export interface SentinelStats {
  blocksScanned: number;
  tagsDiscovered: number;
  lastScannedBlock: number;
  scanStartTime: number;
  averageTagsPerBlock: number;
}

class DogetagSentinel {
  private rpcProvider: DogeLinkRPC;
  private discoveredTags: Map<string, DiscoveredDogetag> = new Map();
  private scanInterval: NodeJS.Timeout | null = null;
  private isScanning = false;
  private lastScannedBlock = 0;
  private scanStartTime = Date.now();
  private blocksScanned = 0;

  // Configuration
  private readonly SCAN_INTERVAL = 30000; // 30 seconds
  private readonly MAX_TAGS_TO_KEEP = 1000; // Keep last 1000 tags
  private readonly DOGETAG_PREFIX = 'OP_RETURN '; // Our OP_RETURN format

  constructor(rpcUrl: string) {
    this.rpcProvider = new DogeLinkRPC({
      url: rpcUrl,
      username: 'user',
      password: 'pass'
    });
  }

  // Start monitoring for new Dogetag transactions
  async startScanning(): Promise<void> {
    if (this.isScanning) return;

    console.log('🔍 Starting Dogetag Sentinel scan...');

    try {
      // Get current block height to start scanning from
      const currentBlockHeight = await this.getCurrentBlockHeight();
      this.lastScannedBlock = currentBlockHeight - 1; // Start from previous block
      this.scanStartTime = Date.now();

      this.isScanning = true;

      // Load previously discovered tags
      this.loadDiscoveredTags();

      // Start periodic scanning
      this.scanInterval = setInterval(() => {
        this.scanNewBlocks();
      }, this.SCAN_INTERVAL);

      // Initial scan
      await this.scanNewBlocks();

      console.log('✅ Dogetag Sentinel active - monitoring for new tags');
    } catch (error) {
      console.error('❌ Failed to start Dogetag Sentinel:', error);
      this.isScanning = false;
    }
  }

  // Stop scanning
  stopScanning(): void {
    if (this.scanInterval) {
      clearInterval(this.scanInterval);
      this.scanInterval = null;
    }
    this.isScanning = false;
    console.log('🛑 Dogetag Sentinel stopped');
  }

  // Get current blockchain height
  private async getCurrentBlockHeight(): Promise<number> {
    try {
      // Try to get block count via RPC
      const blockCount = await this.rpcProvider.getBlockCount();
      return blockCount;
    } catch (error) {
      console.warn('Failed to get block count from RPC, using fallback');
      // Fallback: try DogeChain API
      try {
        const response = await fetch('https://dogechain.info/api/v1/blocks?limit=1');
        const data = await response.json();
        return data.blocks[0]?.height || 0;
      } catch (fallbackError) {
        console.error('Failed to get block height from fallback API');
        return 0;
      }
    }
  }

  // Scan new blocks for Dogetag transactions
  private async scanNewBlocks(): Promise<void> {
    if (!this.isScanning) return;

    try {
      const currentHeight = await this.getCurrentBlockHeight();

      if (currentHeight <= this.lastScannedBlock) {
        return; // No new blocks
      }

      // Scan blocks from lastScannedBlock + 1 to currentHeight
      for (let height = this.lastScannedBlock + 1; height <= currentHeight; height++) {
        await this.scanBlock(height);
        this.blocksScanned++;
      }

      this.lastScannedBlock = currentHeight;
      this.saveDiscoveredTags();

    } catch (error) {
      console.error('Error scanning new blocks:', error);
    }
  }

  // Scan a specific block for Dogetag transactions
  private async scanBlock(blockHeight: number): Promise<void> {
    try {
      // Get block hash
      const blockHash = await this.rpcProvider.getBlockHash(blockHeight);

      // Get block data
      const block = await this.rpcProvider.getBlock(blockHash);

      if (!block || !block.tx) {
        return;
      }

      // Scan each transaction in the block
      for (const txid of block.tx) {
        await this.scanTransaction(txid, blockHeight, blockHash);
      }

    } catch (error) {
      console.warn(`Failed to scan block ${blockHeight}:`, error);
    }
  }

  // Scan a transaction for Dogetag OP_RETURN data
  private async scanTransaction(txid: string, blockHeight: number, blockHash: string): Promise<void> {
    try {
      const tx = await this.rpcProvider.getTransaction(txid);

      if (!tx || !tx.vout) {
        return;
      }

      // Look for OP_RETURN outputs
      for (const output of tx.vout) {
        const dogetag = this.extractDogetagFromOutput(output, tx, blockHeight, blockHash);
        if (dogetag) {
          this.addDiscoveredTag(dogetag);
          break; // Only one tag per transaction
        }
      }

    } catch (error) {
      // Silently ignore transaction fetch errors
    }
  }

  // Extract Dogetag from transaction output
  private extractDogetagFromOutput(
    output: any,
    tx: any,
    blockHeight: number,
    blockHash: string
  ): DiscoveredDogetag | null {
    try {
      // Check if output has scriptPubKey with OP_RETURN
      if (!output.scriptPubKey || !output.scriptPubKey.hex) {
        return null;
      }

      const scriptHex = output.scriptPubKey.hex;

      // Check for OP_RETURN (0x6a)
      if (!scriptHex.startsWith('6a')) {
        return null;
      }

      // Extract OP_RETURN data (skip the 6a + push opcode)
      const opReturnData = scriptHex.slice(4); // Skip 6a + push byte

      if (!opReturnData) {
        return null;
      }

      // Convert hex to UTF-8
      const message = Buffer.from(opReturnData, 'hex').toString('utf8');

      // Validate it's a reasonable text message
      if (message.length === 0 || message.length > 10240) { // Max 10KB
        return null;
      }

      // Check for null bytes or other binary data
      if (message.includes('\u0000')) {
        return null;
      }

      // Extract sender address from vin[0]
      const senderAddress = tx.vin?.[0]?.address || 'unknown';

      const tagId = `${tx.txid}_tag`;
      const explorerUrl = `https://dogechain.info/tx/${tx.txid}`;

      return {
        id: tagId,
        txid: tx.txid,
        blockHeight,
        blockHash,
        timestamp: Date.now(), // Approximate - could get from block time
        address: senderAddress,
        message,
        size: message.length,
        explorerUrl,
        rawOpReturn: scriptHex
      };

    } catch (error) {
      return null;
    }
  }

  // Add a discovered tag to our collection
  private addDiscoveredTag(tag: DiscoveredDogetag): void {
    if (this.discoveredTags.has(tag.id)) {
      return; // Already discovered
    }

    this.discoveredTags.set(tag.id, tag);

    // Keep only recent tags
    if (this.discoveredTags.size > this.MAX_TAGS_TO_KEEP) {
      const entries = Array.from(this.discoveredTags.entries());
      entries.sort((a, b) => b[1].timestamp - a[1].timestamp);
      this.discoveredTags = new Map(entries.slice(0, this.MAX_TAGS_TO_KEEP));
    }

    console.log(`🏷️ Discovered Dogetag: "${tag.message.slice(0, 50)}${tag.message.length > 50 ? '...' : ''}"`);

    // Emit event for UI updates
    const event = new CustomEvent('dogetagDiscovered', { detail: tag });
    window.dispatchEvent(event);
  }

  // Get all discovered tags
  getDiscoveredTags(): DiscoveredDogetag[] {
    return Array.from(this.discoveredTags.values())
      .sort((a, b) => b.timestamp - a.timestamp); // Newest first
  }

  // Search tags by query
  searchTags(query: string, limit = 50): DiscoveredDogetag[] {
    const tags = this.getDiscoveredTags();
    const lowercaseQuery = query.toLowerCase();

    return tags
      .filter(tag =>
        tag.message.toLowerCase().includes(lowercaseQuery) ||
        tag.address.toLowerCase().includes(lowercaseQuery) ||
        tag.txid.toLowerCase().includes(lowercaseQuery)
      )
      .slice(0, limit);
  }

  // Get tags by address
  getTagsByAddress(address: string): DiscoveredDogetag[] {
    return this.getDiscoveredTags()
      .filter(tag => tag.address.toLowerCase() === address.toLowerCase());
  }

  // Get recent tags
  getRecentTags(limit = 20): DiscoveredDogetag[] {
    return this.getDiscoveredTags().slice(0, limit);
  }

  // Get sentinel statistics
  getStats(): SentinelStats {
    const tagsDiscovered = this.discoveredTags.size;
    const averageTagsPerBlock = this.blocksScanned > 0 ? tagsDiscovered / this.blocksScanned : 0;

    return {
      blocksScanned: this.blocksScanned,
      tagsDiscovered,
      lastScannedBlock: this.lastScannedBlock,
      scanStartTime: this.scanStartTime,
      averageTagsPerBlock
    };
  }

  // Persistence
  private saveDiscoveredTags(): void {
    try {
      const tags = Array.from(this.discoveredTags.entries());
      const data = {
        tags,
        stats: {
          blocksScanned: this.blocksScanned,
          lastScannedBlock: this.lastScannedBlock,
          scanStartTime: this.scanStartTime
        }
      };
      localStorage.setItem('borkstarter_discovered_dogetags', JSON.stringify(data));
    } catch (error) {
      console.warn('Failed to save discovered tags:', error);
    }
  }

  private loadDiscoveredTags(): void {
    try {
      const data = localStorage.getItem('borkstarter_discovered_dogetags');
      if (data) {
        const parsed = JSON.parse(data);
        this.discoveredTags = new Map(parsed.tags || []);
        this.blocksScanned = parsed.stats?.blocksScanned || 0;
        this.lastScannedBlock = parsed.stats?.lastScannedBlock || 0;
        this.scanStartTime = parsed.stats?.scanStartTime || Date.now();
      }
    } catch (error) {
      console.warn('Failed to load discovered tags:', error);
    }
  }

  // Check if scanning is active
  isActive(): boolean {
    return this.isScanning;
  }
}

// Create singleton instance using the same RPC config as transactionTracker
const RPC_URL = `http://dogecoin:${process.env.VITE_DOGECOIN_RPC_PASSWORD || 'password'}@${process.env.VITE_DOGECOIN_RPC_HOST || 'localhost'}:${process.env.VITE_DOGECOIN_RPC_PORT || '22555'}`;

export const dogetagSentinel = new DogetagSentinel(RPC_URL);

