import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MyDogeAdapter } from '../wallets/MyDogeAdapter';

describe('MyDogeAdapter alias compatibility', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
    const win = window as any;
    delete win.doge;
    delete win.mydoge;
  });

  it('connects when only window.mydoge is injected', async () => {
    const provider = {
      isMyDoge: true,
      connect: vi.fn(async () => ({ approved: true })),
      getConnectionStatus: vi.fn(async () => ({ connected: true })),
      requestSignedMessage: vi.fn(async () => ({ signature: 'sig-1' })),
      signPsbt: vi.fn(async () => ({ signedPsbt: 'signed-psbt' })),
      getAddress: vi.fn(async () => 'DMyDogeAliasAddr111111111111111111111'),
    };

    (window as any).mydoge = provider;

    const adapter = new MyDogeAdapter();
    const result = await adapter.connect();

    expect(result.connected).toBe(true);
    expect(result.address).toBe('DMyDogeAliasAddr111111111111111111111');
    expect(provider.connect).toHaveBeenCalledTimes(1);
  });
});
