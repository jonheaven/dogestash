import React, { useState } from 'react';
import { XMarkIcon, ArrowTopRightOnSquareIcon, ChevronDownIcon, ChevronUpIcon, EyeIcon, InformationCircleIcon, ClockIcon, MapPinIcon, CubeIcon } from '@heroicons/react/24/outline';
import { useDoginalDrawer } from '../contexts/DoginalDrawerContext';
import { useConnectedWalletAddress } from '../wallet/getConnectedWalletAddress';
import { OwnershipFlow } from './OwnershipFlow';

const DoginalDrawer: React.FC = () => {
  const { isOpen, drawerData, closeDrawer } = useDoginalDrawer();
  const [activePanel, setActivePanel] = useState<'preview' | 'metadata' | 'activity'>('preview');
  const [isPinned, setIsPinned] = useState(false);
  const connectedAddress = useConnectedWalletAddress();

  if (!drawerData) return null;

  const isPersonal = connectedAddress && (
    drawerData.buyer?.toLowerCase() === connectedAddress.toLowerCase() ||
    drawerData.seller?.toLowerCase() === connectedAddress.toLowerCase() ||
    drawerData.to?.toLowerCase() === connectedAddress.toLowerCase() ||
    drawerData.from?.toLowerCase() === connectedAddress.toLowerCase()
  );

  const getTitle = () => {
    switch (drawerData.type) {
      case 'doge-domain':
        return `🏷️ ${drawerData.domain}`;
      case 'dogemap':
        return `🗺️ Block ${drawerData.dogemapBlock}`;
      case 'market-sale':
        return '🛒 Marketplace Sale';
      case 'inscription-transfer':
        return '📦 Transfer';
      case 'inscription-mint':
        return '🪙 Mint';
      case 'drc20-transfer':
        return `💰 ${drawerData.ticker?.toUpperCase()}`;
      case 'dogetag':
        return '🐾 Dogeprint';
      case 'dogetag-witness':
        return '🏷️ Dogetag';
      case 'dogetag-witness-transfer':
        return '📦 Dogetag Transfer';
      default:
        return '🐕 Inscription';
    }
  };

  const CollapsiblePanel: React.FC<{
    id: 'preview' | 'metadata' | 'activity';
    title: string;
    icon: React.ReactNode;
    children: React.ReactNode;
  }> = ({ id, title, icon, children }) => {
    const isActive = activePanel === id;

    return (
      <div className="border border-border-primary rounded-lg overflow-hidden">
        <button
          onClick={() => setActivePanel(isActive ? 'preview' : id)}
          className="w-full flex items-center justify-between p-3 bg-bg-secondary hover:bg-bg-secondary/80 transition-colors duration-200"
        >
          <div className="flex items-center space-x-2">
            {icon}
            <span className="font-medium text-text-primary">{title}</span>
          </div>
          {isActive ? (
            <ChevronUpIcon className="w-4 h-4 text-text-secondary" />
          ) : (
            <ChevronDownIcon className="w-4 h-4 text-text-secondary" />
          )}
        </button>
        {isActive && (
          <div className="p-4 bg-bg-primary border-t border-border-primary">
            {children}
          </div>
        )}
      </div>
    );
  };

  const renderPreviewPanel = () => {
    if (drawerData.type === 'doge-domain') {
      return (
        <div className="text-center space-y-4">
          <div className="text-6xl">🏷️</div>
          <div className="text-3xl font-bold text-purple-400 mb-2">
            {drawerData.domain}
          </div>
          <div className="text-text-secondary mb-4">
            Doge Name System Domain
          </div>

          {isPersonal && (
            <div className="inline-flex items-center px-3 py-1 rounded-full bg-emerald-900/50 border border-emerald-600/50 text-emerald-300 text-sm font-medium">
              <div className="w-2 h-2 bg-emerald-400 rounded-full mr-2 animate-pulse"></div>
              You Own This Domain
            </div>
          )}

          {/* DogeDNS Resolver */}
          <div className="space-y-3 text-left">
            <div className="text-sm font-medium text-text-primary">Domain Resolution</div>

            <div className="space-y-2">
              <div className="flex justify-between p-2 bg-bg-secondary rounded">
                <span className="text-text-secondary">Owner:</span>
                <span className="font-mono text-sm text-text-primary">
                  {drawerData.from?.slice(0, 8)}...{drawerData.from?.slice(-4) || 'unknown'}
                </span>
              </div>

              <div className="flex justify-between p-2 bg-bg-secondary rounded">
                <span className="text-text-secondary">Registration:</span>
                <span className="text-sm text-text-primary">First-inscribed</span>
              </div>

              {/* Mock linked records - would come from indexer */}
              <div className="p-3 bg-bg-secondary rounded">
                <div className="text-sm font-medium text-text-primary mb-2">Linked Records</div>
                <div className="space-y-1 text-xs text-text-secondary">
                  <div>• Avatar inscription: #12345</div>
                  <div>• Website: https://example.doge</div>
                  <div>• Social: @user</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (drawerData.type === 'dogemap') {
      return (
        <div className="text-center space-y-4">
          <div className="text-6xl">🗺️</div>
          <div className="text-3xl font-bold text-blue-400 mb-2">
            Block {drawerData.dogemapBlock}
          </div>
          <div className="text-text-secondary mb-4">
            Dogemap Block Registration
          </div>

          {/* Dogemap Visualizer */}
          <div className="space-y-3">
            <div className="text-sm font-medium text-text-primary">Block Visualization</div>
            <div className="relative">
              <div className="w-full bg-bg-secondary rounded-lg h-4 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-lg transition-all duration-1000"
                  style={{ width: '75%' }} // Mock progress - would come from indexer
                ></div>
              </div>
              <div className="flex justify-between text-xs text-text-secondary mt-1">
                <span>0%</span>
                <span>75% mapped</span>
                <span>100%</span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-2 bg-bg-secondary rounded">
                <div className="text-lg font-bold text-green-400">1,234</div>
                <div className="text-xs text-text-secondary">Pixels Set</div>
              </div>
              <div className="p-2 bg-bg-secondary rounded">
                <div className="text-lg font-bold text-blue-400">89</div>
                <div className="text-xs text-text-secondary">Contributors</div>
              </div>
              <div className="p-2 bg-bg-secondary rounded">
                <div className="text-lg font-bold text-purple-400">Block {drawerData.dogemapBlock}</div>
                <div className="text-xs text-text-secondary">Height</div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (drawerData.type === 'market-sale') {
      return (
        <div className="text-center space-y-6">
          <div className="text-6xl">🛒</div>
          <div>
            <div className="text-5xl font-bold text-green-400 mb-2">
              {drawerData.price}
            </div>
            <div className="text-xl text-green-300">DOGE</div>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-bg-secondary rounded-lg">
              <span className="text-text-secondary">Buyer</span>
              <span className="font-mono text-sm text-text-primary">
                {drawerData.buyer?.slice(0, 8)}...{drawerData.buyer?.slice(-4)}
              </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-bg-secondary rounded-lg">
              <span className="text-text-secondary">Seller</span>
              <span className="font-mono text-sm text-text-primary">
                {drawerData.seller?.slice(0, 8)}...{drawerData.seller?.slice(-4)}
              </span>
            </div>
          </div>
        </div>
      );
    }

    if (drawerData.type === 'drc20-transfer') {
      return (
        <div className="text-center space-y-6">
          <div className="text-6xl">💰</div>
          <div>
            <div className="text-3xl font-bold text-orange-400 mb-2">
              {drawerData.ticker?.toUpperCase()}
            </div>
            <div className="text-text-secondary">DRC-20 Token Transfer</div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-bg-secondary rounded-lg">
              <span className="text-text-secondary">From</span>
              <span className="font-mono text-sm text-text-primary">
                {drawerData.from?.slice(0, 8)}...{drawerData.from?.slice(-4) || 'unknown'}
              </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-bg-secondary rounded-lg">
              <span className="text-text-secondary">To</span>
              <span className="font-mono text-sm text-text-primary">
                {drawerData.to?.slice(0, 8)}...{drawerData.to?.slice(-4) || 'unknown'}
              </span>
            </div>
          </div>
        </div>
      );
    }

    if (drawerData.type === 'dogetag') {
      return (
        <div className="text-center space-y-4">
          <div className="text-6xl">🐾</div>
          <div className="text-3xl font-bold text-blue-400 mb-2">
            Dogeprint
          </div>
          <div className="text-text-secondary mb-4">
            Textual graffiti left on the blockchain — permanent but don't move
          </div>

          {drawerData.text && (
            <div className="bg-bg-secondary rounded-lg p-4 max-w-md mx-auto">
              <div className="text-sm text-text-secondary mb-2">Dogeprint</div>
              <div className="font-mono text-sm text-text-primary break-words">
                {drawerData.text}
              </div>
            </div>
          )}

          <div className="inline-flex items-center px-3 py-1 rounded-full bg-blue-900/50 border border-blue-600/50 text-blue-300 text-sm font-medium">
            🐾 Dogeprint ({drawerData.text?.length || 0} bytes)
          </div>
        </div>
      );
    }

    if (drawerData.type === 'dogetag-witness' || drawerData.type === 'dogetag-witness-transfer') {
      return (
        <div className="text-center space-y-4">
          <div className="text-6xl">🏷️</div>
          <div className="text-3xl font-bold text-purple-400 mb-2">
            Dogetag
          </div>
          <div className="text-text-secondary mb-4">
            Tag written into the coins — travels when spent like an NFT
          </div>

          {drawerData.text && (
            <div className="bg-bg-secondary rounded-lg p-4 max-w-md mx-auto">
              <div className="text-sm text-text-secondary mb-2">Tag Content</div>
              <div className="font-mono text-sm text-text-primary break-words whitespace-pre-wrap">
                {drawerData.text}
              </div>
            </div>
          )}

          {drawerData.isTransferable && (
            <div className="inline-flex items-center px-3 py-1 rounded-full bg-emerald-900/50 border border-emerald-600/50 text-emerald-300 text-sm font-medium">
              🔄 Transferable Doginal
            </div>
          )}

          {drawerData.satpoint && (
            <div className="text-xs text-text-tertiary mt-2">
              Satpoint: {drawerData.satpoint}
            </div>
          )}
        </div>
      );
    }

    // Generic inscription preview
    return (
      <div className="text-center space-y-4">
        <div className="text-6xl">
          {drawerData.contentKnown ? '🖼️' : '❓'}
        </div>
        {drawerData.contentKnown ? (
          <div>
            <div className="text-lg font-semibold text-text-primary mb-2">
              {drawerData.collection || 'Inscription'}
            </div>
            {drawerData.doginalDogId && (
              <div className="text-text-secondary">Dog #{drawerData.doginalDogId}</div>
            )}
            {drawerData.doginalDogTraits && Object.keys(drawerData.doginalDogTraits).length > 0 && (
              <div className="flex flex-wrap justify-center gap-1 mt-2">
                {Object.entries(drawerData.doginalDogTraits).slice(0, 3).map(([key, value]) => (
                  <span
                    key={key}
                    className="px-2 py-1 bg-primary-900/50 text-primary-300 rounded text-xs"
                  >
                    {key}: {value as string}
                  </span>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="text-text-secondary italic">
            Content preview unavailable (indexer offline)
          </div>
        )}
      </div>
    );
  };

  const renderMetadataPanel = () => {
    const metadata = [];

    if (drawerData.inscriptionId) {
      metadata.push(
        <div key="id" className="flex justify-between py-2">
          <span className="text-text-secondary">Inscription ID</span>
          <span className="font-mono text-sm text-text-primary">
            {drawerData.inscriptionId.slice(0, 12)}...
          </span>
        </div>
      );
    }

    if (drawerData.txid) {
      metadata.push(
        <div key="txid" className="flex justify-between py-2">
          <span className="text-text-secondary">Transaction</span>
          <span className="font-mono text-sm text-text-primary">
            {drawerData.txid.slice(0, 12)}...
          </span>
        </div>
      );
    }

    if (drawerData.contentType) {
      metadata.push(
        <div key="type" className="flex justify-between py-2">
          <span className="text-text-secondary">Content Type</span>
          <span className="text-sm text-text-primary">{drawerData.contentType}</span>
        </div>
      );
    }

    if (drawerData.satpoint) {
      metadata.push(
        <div key="satpoint" className="flex justify-between py-2">
          <span className="text-text-secondary">Satpoint</span>
          <span className="font-mono text-sm text-text-primary">{drawerData.satpoint}</span>
        </div>
      );
    }

    return (
      <div className="space-y-1">
        {metadata.length > 0 ? (
          metadata
        ) : (
          <div className="text-text-secondary italic text-center py-4">
            Metadata loading...
          </div>
        )}
      </div>
    );
  };

  const renderActivityPanel = () => {
    return (
      <div className="space-y-6">
        {/* Ownership Flow */}
        <OwnershipFlow drawerData={drawerData} />

        {/* Activity Timeline */}
        <div className="space-y-3">
          <div className="text-sm font-medium text-text-primary">Recent Activity</div>

          {/* Mock activity timeline - in real implementation this would come from indexer */}
          {(() => {
            const activities = [
              {
                type: 'mint',
                timestamp: '2024-01-24 11:41',
                description: 'Inscription minted',
                txid: drawerData.txid
              }
            ];

            if (drawerData.type === 'market-sale') {
              activities.push({
                type: 'sale',
                timestamp: '2024-01-24 11:41',
                description: `Sold for ${drawerData.price} DOGE`,
                txid: drawerData.txid
              });
            }

            if (drawerData.type === 'inscription-transfer') {
              activities.push({
                type: 'transfer',
                timestamp: '2024-01-24 11:41',
                description: 'Ownership transferred',
                txid: drawerData.txid
              });
            }

            return activities.map((activity, index) => (
              <div key={index} className="flex items-start space-x-3 p-3 bg-bg-secondary rounded-lg">
                <div className="w-2 h-2 bg-primary-400 rounded-full mt-2 flex-shrink-0"></div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-text-primary">{activity.description}</div>
                  <div className="text-xs text-text-secondary mt-1">{activity.timestamp}</div>
                </div>
              </div>
            ));
          })()}
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[998]"
          onClick={isPinned ? undefined : closeDrawer}
        />
      )}

      {/* Drawer */}
      <div
        className={`fixed top-0 right-0 h-full w-[420px] max-w-[90vw] bg-bg-primary border-l border-border-primary shadow-2xl z-[999] transform transition-transform duration-300 ease-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border-primary">
          <div className="flex items-center space-x-3">
            <h2 className="text-lg font-bold text-text-primary truncate">
              {getTitle()}
            </h2>
            {isPersonal && (
              <div className="flex items-center px-2 py-1 rounded-full bg-emerald-900/50 border border-emerald-600/50">
                <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full mr-1"></div>
                <span className="text-xs font-medium text-emerald-300">YOURS</span>
              </div>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setIsPinned(!isPinned)}
              className={`p-2 rounded-lg transition-colors duration-200 ${
                isPinned ? 'bg-yellow-900/50 text-yellow-400' : 'hover:bg-bg-secondary text-text-secondary'
              }`}
              title={isPinned ? 'Unpin drawer' : 'Pin drawer (stays open)'}
            >
              📌
            </button>
            <button
              onClick={closeDrawer}
              className="p-2 rounded-lg hover:bg-bg-secondary transition-colors duration-200"
            >
              <XMarkIcon className="w-5 h-5 text-text-secondary" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-4 space-y-4">
            {/* Collapsible Panels */}
            <CollapsiblePanel
              id="preview"
              title="Preview"
              icon={<EyeIcon className="w-4 h-4" />}
            >
              {renderPreviewPanel()}
            </CollapsiblePanel>

            <CollapsiblePanel
              id="metadata"
              title="Metadata"
              icon={<InformationCircleIcon className="w-4 h-4" />}
            >
              {renderMetadataPanel()}
            </CollapsiblePanel>

            <CollapsiblePanel
              id="activity"
              title="Activity"
              icon={<ClockIcon className="w-4 h-4" />}
            >
              {renderActivityPanel()}
            </CollapsiblePanel>
          </div>

          {/* Footer Actions */}
          <div className="p-4 border-t border-border-primary space-y-3">
            {drawerData.txid && (
              <a
                href={`https://dogechain.info/tx/${drawerData.txid}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center space-x-2 w-full px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors duration-200"
              >
                <ArrowTopRightOnSquareIcon className="w-4 h-4" />
                <span>View on DogeChain</span>
              </a>
            )}

            {drawerData.inscriptionId && (
              <a
                href={`https://dogechain.info/inscription/${drawerData.inscriptionId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center space-x-2 w-full px-4 py-2 bg-bg-secondary hover:bg-bg-secondary/80 text-text-primary rounded-lg transition-colors duration-200"
              >
                <CubeIcon className="w-4 h-4" />
                <span>View Inscription</span>
              </a>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default DoginalDrawer;
