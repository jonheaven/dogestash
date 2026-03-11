import React, { useEffect, useState } from 'react';
import { DoginalEvent } from '../../src/sentinel/doginals-event-mapper';

interface DoginalsLiveFeedProps {
  websocketUrl?: string;
  apiUrl?: string;
  maxEvents?: number;
}

export const DoginalsLiveFeed: React.FC<DoginalsLiveFeedProps> = ({
  websocketUrl = 'ws://localhost:7071',
  apiUrl = 'http://localhost:7070',
  maxEvents = 50
}) => {
  const [events, setEvents] = useState<DoginalEvent[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [buffer, setBuffer] = useState<DoginalEvent[]>([]);
  const [flushTimer, setFlushTimer] = useState<NodeJS.Timeout | null>(null);

  const MAX_EVENTS = 250;  // Increased limit with buffering
  const BUFFER_FLUSH_INTERVAL = 150; // ms buffer flush

  useEffect(() => {
    // Load initial events from API
    fetch(`${apiUrl}/api/doginals/recent?limit=${Math.min(maxEvents, MAX_EVENTS)}`)
      .then(res => res.json())
      .then(data => {
        if (data.events) {
          setEvents(data.events);
        }
      })
      .catch(err => console.error('Failed to load initial events:', err));

    // Load stats
    fetch(`${apiUrl}/api/doginals/stats`)
      .then(res => res.json())
      .then(setStats)
      .catch(err => console.error('Failed to load stats:', err));

    // Connect to WebSocket with buffering
    const ws = new WebSocket(websocketUrl);

    ws.onopen = () => {
      console.log('Connected to Doginals live feed');
      setIsConnected(true);
    };

    ws.onmessage = (msg) => {
      try {
        const data = JSON.parse(msg.data);

        if (data.type === "ping") {
          // Respond to ping
          ws.send(JSON.stringify({ type: "pong" }));
          return;
        }

        if (data.type === "doginal" && data.evt) {
          // Buffer the event
          setBuffer(prev => [...prev, data.evt]);

          // Set up flush timer if not already running
          if (!flushTimer) {
            const timer = setTimeout(() => {
              setEvents(prev => {
                const merged = [...buffer, ...prev];
                // Deduplicate by txid + type and limit size
                const deduped = merged.filter((evt, idx, arr) =>
                  arr.findIndex(e => e.txid === evt.txid && e.type === evt.type) === idx
                ).slice(0, MAX_EVENTS);

                setBuffer([]);
                return deduped;
              });
              setFlushTimer(null);
            }, BUFFER_FLUSH_INTERVAL);

            setFlushTimer(timer);
          }
        }
      } catch (err) {
        console.error('WebSocket message error:', err);
      }
    };

    ws.onclose = () => {
      console.log('Disconnected from Doginals live feed');
      setIsConnected(false);
    };

    ws.onerror = (err) => {
      console.error('WebSocket error:', err);
      setIsConnected(false);
    };

    return () => {
      ws.close();
      if (flushTimer) {
        clearTimeout(flushTimer);
      }
    };
  }, [websocketUrl, apiUrl, maxEvents]);

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'dogetag': return '🟡';
      case 'doge-domain': return '🏷️';
      case 'dogemap': return '🗺️';
      case 'inscription-mint': return '🪙';
      case 'inscription-transfer': return '📦';
      case 'doge-domain-transfer': return '🔄';
      case 'dogemap-transfer': return '🔄';
      case 'market-sale': return '🛒';
      case 'drc20-transfer': return '💰';
      case 'drc20': return '🟢';
      case 'doginal-json': return '📄';
      case 'doginal-text': return '💬';
      case 'doginal-binary': return '🧱';
      default: return '🐕';
    }
  };

  const formatEventContent = (event: any) => {
    // Handle inscription mints, transfers and marketplace sales
    if (event.type === "inscription-mint" || event.type === "inscription-transfer" || event.type === "market-sale") {
      if (event.contentKnown) {
        const parts = [];
        if (event.collection) parts.push(event.collection);
        if (event.doginalDogId) parts.push(`Dog #${event.doginalDogId}`);
        if (event.doginalDogTraits && Object.keys(event.doginalDogTraits).length > 0) {
          const traits = Object.entries(event.doginalDogTraits)
            .slice(0, 3)
            .map(([key, value]) => `${key}: ${value}`)
            .join(", ");
          parts.push(`Traits: ${traits}`);
        }
        if (event.doginalDogRank) parts.push(`Rank #${event.doginalDogRank}`);
        return parts.length > 0 ? parts.join(" • ") : "Inscription";
      } else {
        let content = "Unknown inscription (indexer offline)";
        if (event.satpoint) content += ` • ${event.satpoint}`;
        if (event.satpointSpent && event.satpointNew) {
          content += ` • ${event.satpointSpent} → ${event.satpointNew}`;
        }
        return content;
      }
    }

    // Handle transfer events
    if (event.type.includes("-transfer") && event.from && event.to) {
      return `${event.from} → ${event.to}`;
    }

    // Handle marketplace sales
    if (event.type === "market-sale" && event.price) {
      let content = `${event.price} DOGE`;
      if (event.buyer && event.seller) {
        content += ` • ${event.seller} → ${event.buyer}`;
      }
      return content;
    }

    // Default content rendering
    if (event.text) {
      return event.text.length > 100 ? event.text.substring(0, 100) + '...' : event.text;
    }
    if (event.json) {
      return JSON.stringify(event.json).substring(0, 100) + '...';
    }
    if (event.hex) {
      return event.hex.substring(0, 50) + '...';
    }
    return 'No content';
  };

  return (
    <div style={{ padding: 20, fontFamily: 'Satoshi, sans-serif' }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 20 }}>
        <h1 style={{ margin: 0 }}>🐕 Doginals Live Feed</h1>
        <div style={{
          marginLeft: 20,
          padding: '4px 12px',
          borderRadius: 12,
          backgroundColor: isConnected ? '#4CAF50' : '#f44336',
          color: 'white',
          fontSize: '14px'
        }}>
          {isConnected ? '🟢 LIVE' : '🔴 DISCONNECTED'}
        </div>
      </div>

      {stats && (
        <div style={{
          backgroundColor: '#f5f5f5',
          padding: 15,
          borderRadius: 8,
          marginBottom: 20
        }}>
          <h3 style={{ margin: '0 0 10px 0' }}>📊 Statistics</h3>
          <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
            <span><strong>Total:</strong> {stats.total}</span>
            <span><strong>Dogetags:</strong> {stats.dogetags}</span>
            <span><strong>DRC-20:</strong> {stats.drc20}</span>
            <span><strong>JSON:</strong> {stats.json}</span>
            <span><strong>Text:</strong> {stats.text}</span>
            <span><strong>Binary:</strong> {stats.binary}</span>
          </div>
        </div>
      )}

      <div style={{ border: '1px solid #ddd', borderRadius: 8, maxHeight: 600, overflowY: 'auto' }}>
        {events.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#666' }}>
            No Doginals detected yet. Waiting for new transactions...
          </div>
        ) : (
          events.map((event, idx) => (
            <div key={`${event.txid}-${idx}`} style={{
              padding: 15,
              borderBottom: idx < events.length - 1 ? '1px solid #eee' : 'none',
              backgroundColor: idx === 0 ? '#fff9c4' : 'white'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontSize: '18px', marginRight: 8 }}>
                  {getEventIcon(event.type)}
                </span>
                <span style={{ fontWeight: 'bold', textTransform: 'uppercase', fontSize: '12px' }}>
                  {event.type}
                </span>
                <span style={{ marginLeft: 'auto', fontSize: '12px', color: '#666' }}>
                  {event.source}
                  {event.vout !== undefined && ` #${event.vout}`}
                </span>
              </div>

              <div style={{ fontFamily: 'monospace', fontSize: '14px', marginBottom: 8 }}>
                {formatEventContent(event)}
              </div>

              <div style={{ fontSize: '12px', color: '#666' }}>
                <a
                  href={`https://dogechain.info/tx/${event.txid}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: '#2196F3', textDecoration: 'none' }}
                >
                  {event.txid.substring(0, 16)}...
                </a>
              </div>
            </div>
          ))
        )}
      </div>

      <div style={{ marginTop: 20, fontSize: '12px', color: '#666', textAlign: 'center' }}>
        Real-time Dogecoin inscriptions monitor • Updates automatically
      </div>
    </div>
  );
};

export default DoginalsLiveFeed;
