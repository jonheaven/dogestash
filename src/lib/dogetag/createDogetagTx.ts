// createDogetagTx.ts
// Builds a transaction for a Dogetag inscription on Dogecoin using OP_RETURN

import { createP2PKHTransaction } from 'doge-sdk';
import { buildDogetagTapscript, estimateDogetagWitnessSize } from './buildDogetagTapscript';

export interface DogetagTxInput {
  message: string;
  fromAddress: string;
  utxos: Array<{
    txid: string;
    vout: number;
    value: number;
    scriptPubKey: string;
    address?: string;
    confirmations?: number;
  }>;
  feeRate: number; // satoshis per byte
}

export interface DogetagTxOutput {
  unsignedTx: any; // From doge-sdk createP2PKHTransaction
  estimatedFee: number;
  sizeBytes: number;
  changeAmount: number;
  inputAmount: number;
}

export async function createDogetagTx({
  message,
  fromAddress,
  utxos,
  feeRate
}: DogetagTxInput): Promise<DogetagTxOutput> {
  if (!utxos || utxos.length === 0) {
    throw new Error('No UTXOs available for Dogetag creation');
  }

  // Filter for confirmed UTXOs only
  const confirmedUtxos = utxos.filter(utxo => (utxo.confirmations || 0) >= 1);
  if (confirmedUtxos.length === 0) {
    throw new Error('No confirmed UTXOs available. Please wait for confirmations.');
  }

  // Select UTXOs (prefer smallest first to minimize change)
  const selectedUtxos = selectUtxosForAmount(confirmedUtxos, 10000); // Minimum 10k sats for safety
  if (selectedUtxos.length === 0) {
    throw new Error('No suitable UTXOs found with sufficient value');
  }

  const inputAmount = selectedUtxos.reduce((sum, utxo) => sum + utxo.value, 0);

  // Create OP_RETURN data for the Dogetag
  const { content } = buildDogetagTapscript(message);
  const opReturnData = Buffer.concat([
    Buffer.from('OP_RETURN ', 'utf8'),
    content
  ]);

  // Estimate transaction size and fee
  const estimatedSize = estimateDogetagWitnessSize(message) + (selectedUtxos.length * 150) + opReturnData.length + 100;
  const estimatedFee = Math.ceil(estimatedSize * feeRate / 1000); // Convert to satoshis per KB

  // Calculate change amount
  const changeAmount = inputAmount - estimatedFee;

  if (changeAmount <= 0) {
    throw new Error(`Insufficient funds. Need at least ${estimatedFee} satoshis for fees.`);
  }

  // Create transaction parameters
  const txParams = {
    inputs: selectedUtxos.map(utxo => ({
      txid: utxo.txid,
      vout: utxo.vout,
      value: utxo.value,
      scriptPubKey: utxo.scriptPubKey || '',
      address: utxo.address || fromAddress
    })),
    outputs: [
      {
        script: opReturnData.toString('hex'), // OP_RETURN output
        value: 0
      },
      {
        address: fromAddress, // Change output
        value: changeAmount
      }
    ],
    fee: estimatedFee
  };

  // Build the transaction using doge-sdk
  const unsignedTx = createP2PKHTransaction(txParams);

  return {
    unsignedTx,
    estimatedFee,
    sizeBytes: estimatedSize,
    changeAmount,
    inputAmount
  };
}

// Select minimal UTXOs to cover the transaction
function selectUtxosForAmount(utxos: DogetagTxInput['utxos'], minAmount: number): DogetagTxInput['utxos'] {
  // Sort by value ascending for better coin selection
  const sorted = [...utxos].sort((a, b) => a.value - b.value);
  const selected: DogetagTxInput['utxos'] = [];
  let total = 0;

  for (const utxo of sorted) {
    selected.push(utxo);
    total += utxo.value;
    if (total >= minAmount) break;
  }

  return total >= minAmount ? selected : [];
}

// Generate a deterministic taproot internal key based on message and address
// This ensures the same message+address always produces the same key for privacy
function generateTapInternalKey(message: string, address: string): Buffer {
  const combined = message + address;
  const hash = require('crypto').createHash('sha256').update(combined).digest();
  // Ensure it's a valid x-only pubkey (32 bytes)
  return Buffer.from(hash.slice(0, 32));
}
