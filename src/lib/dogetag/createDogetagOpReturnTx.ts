// createDogetagOpReturnTx.ts
// Builds a transaction for an OP_RETURN Dogetag on Dogecoin

import { createP2PKHTransaction } from 'doge-sdk';

export interface DogetagOpReturnTxInput {
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

export async function createDogetagOpReturnTx({
  message,
  fromAddress,
  utxos,
  feeRate
}: DogetagOpReturnTxInput): Promise<DogetagTxOutput> {
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
  const messageBytes = Buffer.from(message, 'utf8');
  const opReturnData = Buffer.concat([
    Buffer.from('6a', 'hex'), // OP_RETURN opcode
    Buffer.from([messageBytes.length]), // Push data length
    messageBytes // The actual message
  ]);

  // Estimate transaction size and fee
  const estimatedSize = (selectedUtxos.length * 150) + opReturnData.length + 100;
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
function selectUtxosForAmount(utxos: DogetagOpReturnTxInput['utxos'], minAmount: number): DogetagOpReturnTxInput['utxos'] {
  // Sort by value ascending for better coin selection
  const sorted = [...utxos].sort((a, b) => a.value - b.value);
  const selected: DogetagOpReturnTxInput['utxos'] = [];
  let total = 0;

  for (const utxo of sorted) {
    selected.push(utxo);
    total += utxo.value;
    if (total >= minAmount) break;
  }

  return total >= minAmount ? selected : [];
}
