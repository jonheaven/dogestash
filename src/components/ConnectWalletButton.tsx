'use client';

import React, { useMemo, useState } from 'react';
import { useUnifiedWallet } from '../contexts/UnifiedWalletContext';
import WalletSelectionModal from './WalletSelectionModal';

interface ConnectWalletButtonProps {
  className?: string;
  connectLabel?: string;
  disconnectLabel?: string;
  showAddressWhenConnected?: boolean;
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
}: ConnectWalletButtonProps) {
  const { connected, address, disconnect, connecting } = useUnifiedWallet();
  const [open, setOpen] = useState(false);

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
