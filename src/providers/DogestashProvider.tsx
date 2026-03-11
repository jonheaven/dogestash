'use client';

import React from 'react';
import { BrowserWalletProvider } from '../contexts/BrowserWalletContext';
import { MyDogeWalletProvider } from '../contexts/MyDogeWalletContext';
import { NintondoWalletProvider } from '../contexts/NintondoWalletContext';
import { UnifiedWalletProvider } from '../contexts/UnifiedWalletContext';

interface DogestashProviderProps {
  children: React.ReactNode;
}

export function DogestashProvider({ children }: DogestashProviderProps) {
  return (
    <MyDogeWalletProvider>
      <NintondoWalletProvider>
        <BrowserWalletProvider>
          <UnifiedWalletProvider>{children}</UnifiedWalletProvider>
        </BrowserWalletProvider>
      </NintondoWalletProvider>
    </MyDogeWalletProvider>
  );
}
