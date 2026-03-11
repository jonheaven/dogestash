'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useUnifiedWallet } from '../contexts/UnifiedWalletContext';
import type { DmpIntentSigner } from '../types/wallet';
import WalletSelectionModal from './WalletSelectionModal';

export interface ConnectWalletButtonProps {
  className?: string;
  connectLabel?: string;
  disconnectLabel?: string;
  showAddressWhenConnected?: boolean;
  onWalletReady?: (wallet: { address: string; signDMPIntent: DmpIntentSigner }) => void;
}

function shortAddress(address: string): string {
  if (address.length <= 12) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function ConnectWalletButton({
  className,
  connectLabel = 'Connect Wallet',
  disconnectLabel = 'Disconnect',
  showAddressWhenConnected = true,
  onWalletReady,
}: ConnectWalletButtonProps) {
  const { connected, address, disconnect, connecting, signDMPIntent } = useUnifiedWallet();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (connected && address && onWalletReady) {
      onWalletReady({ address, signDMPIntent });
    }
  }, [connected, address, onWalletReady, signDMPIntent]);

  const label = useMemo(() => {
    if (!connected) return connectLabel;
    if (showAddressWhenConnected && address) return shortAddress(address);
    return 'Connected';
  }, [connected, address, connectLabel, showAddressWhenConnected]);

  return (
    <div style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}>
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={connecting}
        className={className}
        style={{
          borderRadius: 10,
          padding: '10px 14px',
          border: '1px solid #2f2f2f',
          background: '#111',
          color: '#fff',
          cursor: connecting ? 'not-allowed' : 'pointer',
          opacity: connecting ? 0.7 : 1,
        }}
      >
        {connecting ? 'Connecting...' : label}
      </button>

      {connected && (
        <button
          type="button"
          onClick={() => disconnect()}
          style={{
            borderRadius: 10,
            padding: '10px 12px',
            border: '1px solid #383838',
            background: '#1a1a1a',
            color: '#ddd',
            cursor: 'pointer',
          }}
        >
          {disconnectLabel}
        </button>
      )}

      <WalletSelectionModal isOpen={open} onClose={() => setOpen(false)} />
    </div>
  );
}
