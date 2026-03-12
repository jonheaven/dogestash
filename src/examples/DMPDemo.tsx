'use client';

import React, { useState } from 'react';
import { ConnectWalletButton } from '../components/ConnectWalletButton';
import { useUnifiedWallet } from '../contexts/UnifiedWalletContext';
import { DogestashProvider } from '../providers/DogestashProvider';

const SAMPLE_LISTING_ID = `${'a'.repeat(64)}i0`;
const SAMPLE_LISTING_PSBT_CID = 'ipfs://QmMarketplaceDemoListingPsbt';
const SAMPLE_BID_PSBT_CID = 'ipfs://QmMarketplaceDemoBidPsbt';

function parsePositiveInteger(rawValue: string, field: string): number {
  const parsed = Number.parseInt(rawValue, 10);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    throw new Error(`${field} must be a positive integer`);
  }
  return parsed;
}

function DMPDemoInner() {
  const { connected, address, signDMPIntent } = useUnifiedWallet();
  const [priceKoinu, setPriceKoinu] = useState('4206900000');
  const [expiryHeight, setExpiryHeight] = useState('5000000');
  const [activeAction, setActiveAction] = useState<'listing' | 'bid' | null>(null);
  const [result, setResult] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleCreateListing = async () => {
    setActiveAction('listing');
    setError(null);

    try {
      const signed = await signDMPIntent('listing', {
        price_koinu: parsePositiveInteger(priceKoinu, 'price_koinu'),
        psbt_cid: SAMPLE_LISTING_PSBT_CID,
        expiry_height: parsePositiveInteger(expiryHeight, 'expiry_height'),
      });
      setResult(JSON.stringify(signed, null, 2));
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Unknown signing error');
    } finally {
      setActiveAction(null);
    }
  };

  const handlePlaceBid = async () => {
    setActiveAction('bid');
    setError(null);

    try {
      const signed = await signDMPIntent('bid', {
        listing_id: SAMPLE_LISTING_ID,
        price_koinu: parsePositiveInteger(priceKoinu, 'price_koinu'),
        psbt_cid: SAMPLE_BID_PSBT_CID,
        expiry_height: parsePositiveInteger(expiryHeight, 'expiry_height'),
      });
      setResult(JSON.stringify(signed, null, 2));
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Unknown signing error');
    } finally {
      setActiveAction(null);
    }
  };

  return (
    <div
      style={{
        maxWidth: 720,
        margin: '0 auto',
        padding: 24,
        fontFamily: 'system-ui, sans-serif',
        color: '#f5f5f5',
      }}
    >
      <div
        style={{
          background: '#111827',
          border: '1px solid #2d3748',
          borderRadius: 16,
          padding: 24,
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.25)',
        }}
      >
        <p style={{ margin: '0 0 8px', fontSize: 12, letterSpacing: '0.18em', color: '#93c5fd' }}>
          DMP Marketplace Demo
        </p>
        <h1 style={{ margin: '0 0 12px', fontSize: 32 }}>Hello World Marketplace</h1>
        <p style={{ margin: '0 0 20px', color: '#cbd5e1', lineHeight: 1.6 }}>
          Connect any supported Dogecoin wallet, set a sample price and expiry height, then sign
          kabosu-compatible DMP listing or bid payloads with one click.
        </p>

        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <ConnectWalletButton />
          <span style={{ color: '#cbd5e1', fontSize: 14 }}>
            {connected && address ? `Connected: ${address}` : 'No wallet connected yet'}
          </span>
        </div>

        <div
          style={{
            display: 'grid',
            gap: 16,
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            marginTop: 24,
          }}
        >
          <label style={{ display: 'grid', gap: 8 }}>
            <span style={{ fontSize: 14, color: '#e2e8f0' }}>price_koinu</span>
            <input
              type="number"
              min="1"
              step="1"
              value={priceKoinu}
              onChange={(event) => setPriceKoinu(event.target.value)}
              style={{
                borderRadius: 10,
                border: '1px solid #334155',
                background: '#020617',
                color: '#f8fafc',
                padding: '12px 14px',
              }}
            />
          </label>

          <label style={{ display: 'grid', gap: 8 }}>
            <span style={{ fontSize: 14, color: '#e2e8f0' }}>expiry_height</span>
            <input
              type="number"
              min="1"
              step="1"
              value={expiryHeight}
              onChange={(event) => setExpiryHeight(event.target.value)}
              style={{
                borderRadius: 10,
                border: '1px solid #334155',
                background: '#020617',
                color: '#f8fafc',
                padding: '12px 14px',
              }}
            />
          </label>
        </div>

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 20 }}>
          <button
            type="button"
            onClick={handleCreateListing}
            disabled={!connected || activeAction !== null}
            style={{
              borderRadius: 10,
              border: '1px solid #0f766e',
              background: '#0f766e',
              color: '#f8fafc',
              padding: '12px 16px',
              cursor: !connected || activeAction !== null ? 'not-allowed' : 'pointer',
              opacity: !connected || activeAction !== null ? 0.65 : 1,
            }}
          >
            {activeAction === 'listing' ? 'Signing Listing...' : 'Create Sample Listing'}
          </button>

          <button
            type="button"
            onClick={handlePlaceBid}
            disabled={!connected || activeAction !== null}
            style={{
              borderRadius: 10,
              border: '1px solid #2563eb',
              background: '#2563eb',
              color: '#f8fafc',
              padding: '12px 16px',
              cursor: !connected || activeAction !== null ? 'not-allowed' : 'pointer',
              opacity: !connected || activeAction !== null ? 0.65 : 1,
            }}
          >
            {activeAction === 'bid' ? 'Signing Bid...' : 'Place Sample Bid'}
          </button>
        </div>

        <div
          style={{
            marginTop: 20,
            padding: 16,
            borderRadius: 12,
            background: '#0f172a',
            border: '1px solid #1e293b',
            color: '#cbd5e1',
            fontSize: 14,
            lineHeight: 1.6,
          }}
        >
          Demo values:
          <br />
          Listing `psbt_cid`: {SAMPLE_LISTING_PSBT_CID}
          <br />
          Bid `listing_id`: {SAMPLE_LISTING_ID}
          <br />
          Bid `psbt_cid`: {SAMPLE_BID_PSBT_CID}
        </div>

        {error ? (
          <div
            style={{
              marginTop: 20,
              padding: 14,
              borderRadius: 12,
              background: '#450a0a',
              border: '1px solid #7f1d1d',
              color: '#fecaca',
            }}
          >
            {error}
          </div>
        ) : null}

        <div style={{ marginTop: 20 }}>
          <h2 style={{ margin: '0 0 12px', fontSize: 18 }}>Signed intent result</h2>
          <pre
            style={{
              margin: 0,
              padding: 16,
              borderRadius: 12,
              background: '#020617',
              border: '1px solid #1e293b',
              color: '#bfdbfe',
              overflowX: 'auto',
              minHeight: 180,
            }}
          >
            {result || 'Connect a wallet and sign a sample listing or bid to inspect the payload.'}
          </pre>
        </div>
      </div>
    </div>
  );
}

export default function DMPDemo() {
  return (
    <DogestashProvider>
      <DMPDemoInner />
    </DogestashProvider>
  );
}
