import React, { useState, useEffect } from 'react';
import {
  XMarkIcon,
  PuzzlePieceIcon,
  CpuChipIcon,
  ChatBubbleLeftRightIcon,
  CheckCircleIcon,
  ClockIcon,
  TrophyIcon
} from '@heroicons/react/24/outline';
import { useToast } from '../contexts/ToastContext';
import { claimsApi } from '../utils/api';

interface ClaimModalProps {
  isOpen: boolean;
  onClose: () => void;
  launchId: string;
  launchName: string;
  walletAddress: string;
  onClaimSuccess: (reward: number) => void;
}

type GateType = 'riddle' | 'pow' | 'share';

interface Gate {
  type: GateType;
  title: string;
  description: string;
  icon: React.ElementType;
  difficulty: 'easy' | 'medium' | 'hard';
}

const gates: Gate[] = [
  {
    type: 'riddle',
    title: 'Mini-Game Challenge',
    description: 'Solve a quick Doge-themed riddle',
    icon: PuzzlePieceIcon,
    difficulty: 'easy'
  },
  {
    type: 'pow',
    title: 'Proof of Work',
    description: 'Find a special hash (takes ~10-30 seconds)',
    icon: CpuChipIcon,
    difficulty: 'medium'
  },
  {
    type: 'share',
    title: 'Share & Support',
    description: 'Spread the Bork love on X',
    icon: ChatBubbleLeftRightIcon,
    difficulty: 'easy'
  }
];

export const ClaimModal: React.FC<ClaimModalProps> = ({
  isOpen,
  onClose,
  launchId,
  launchName,
  walletAddress,
  onClaimSuccess
}) => {
  const [selectedGate, setSelectedGate] = useState<GateType | null>(null);
  const [isSolving, setIsSolving] = useState(false);
  const [progress, setProgress] = useState(0);
  const [riddleAnswer, setRiddleAnswer] = useState('');
  const [powHash, setPowHash] = useState('');
  const [powAttempts, setPowAttempts] = useState(0);
  const [timeLeft, setTimeLeft] = useState(30);
  const toast = useToast();

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setSelectedGate(null);
      setIsSolving(false);
      setProgress(0);
      setRiddleAnswer('');
      setPowHash('');
      setPowAttempts(0);
      setTimeLeft(30);
    }
  }, [isOpen]);

  // Timer for gates
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (selectedGate && isSolving && timeLeft > 0) {
      timer = setTimeout(() => setTimeLeft(prev => prev - 1), 1000);
    } else if (timeLeft === 0 && isSolving) {
      toast.error('Time\'s up! Try again.');
      setIsSolving(false);
      setTimeLeft(30);
    }
    return () => clearTimeout(timer);
  }, [selectedGate, isSolving, timeLeft, toast]);

  const solveRiddle = async () => {
    setIsSolving(true);
    setProgress(20);

    // Mock riddle: "What has a head and tail but no body? A Dogecoin tx!"
    const correctAnswer = 'dogecoin transaction';
    const normalizedAnswer = riddleAnswer.toLowerCase().trim();

    await new Promise(resolve => setTimeout(resolve, 1000));
    setProgress(80);

    if (normalizedAnswer.includes('doge') && (normalizedAnswer.includes('transaction') || normalizedAnswer.includes('tx'))) {
      setProgress(100);
      await submitClaim({ type: 'riddle', proof: riddleAnswer });
    } else {
      setProgress(0);
      setIsSolving(false);
      toast.error('Not quite! Hint: It\'s something crypto-related with a head and tail.');
    }
  };

  const solvePow = async () => {
    setIsSolving(true);
    setProgress(10);

    const targetPrefix = 'doge';
    let nonce = 0;
    let found = false;

    while (!found && nonce < 1000000 && isSolving) {
      const hashInput = `${launchId}-${walletAddress}-${nonce}`;
      const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(hashInput));
      const hashHex = Array.from(new Uint8Array(hash))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');

      setPowAttempts(nonce + 1);
      setProgress(Math.min(10 + (nonce / 1000), 90));

      if (hashHex.startsWith(targetPrefix)) {
        found = true;
        setPowHash(hashHex);
        setProgress(100);
        await submitClaim({ type: 'pow', proof: hashHex, nonce });
        break;
      }
      nonce++;
    }

    if (!found) {
      toast.error('Proof of work failed. Please try again.');
      setIsSolving(false);
      setProgress(0);
    }
  };

  const shareOnX = async () => {
    setIsSolving(true);
    setProgress(50);

    // Mock X share - copy text to clipboard
    const shareText = `Just discovered ${launchName} on borkstarter! Check it out and claim your free drops! #borkstarter #Doginals 🚀🐕`;
    await navigator.clipboard.writeText(shareText);

    await new Promise(resolve => setTimeout(resolve, 1000));
    setProgress(100);

    toast.success('Share text copied! Post it on X to complete the challenge.');
    await submitClaim({ type: 'share', proof: 'shared_on_x' });
  };

  const submitClaim = async (gateProof: any) => {
    try {
      const response = await claimsApi.claim(launchId, {
        address: walletAddress,
        gateProof
      });

      toast.success(`🎉 Claim successful! You received ${response.data.reward} tokens!`, 6000);
      onClaimSuccess(response.data.reward);
      onClose();
    } catch (error: any) {
      console.error('Claim failed:', error);
      toast.error('Claim failed. Please try again.');
      setIsSolving(false);
      setProgress(0);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4">
      <div className="bg-bg-primary rounded-lg max-w-md w-full border border-border-primary shadow-xl">
        <div className="flex items-center justify-between p-6 border-b border-border-primary">
          <div>
            <h2 className="text-xl font-bold text-text-primary">Claim Free Drop</h2>
            <p className="text-text-secondary text-sm mt-1">{launchName}</p>
          </div>
          <button
            onClick={onClose}
            className="text-text-secondary hover:text-text-primary transition-colors"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6">
          {!selectedGate ? (
            // Gate Selection
            <>
              <p className="text-text-secondary mb-4">
                Choose your challenge to unlock free tokens from this launch:
              </p>
              <div className="space-y-3">
                {gates.map((gate) => (
                  <button
                    key={gate.type}
                    onClick={() => setSelectedGate(gate.type)}
                    className="w-full p-4 bg-bg-secondary rounded-lg border border-border-primary hover:border-primary-500 transition-all duration-200 text-left"
                  >
                    <div className="flex items-center space-x-3">
                      <gate.icon className="w-6 h-6 text-primary-500" />
                      <div className="flex-1">
                        <h3 className="font-medium text-text-primary">{gate.title}</h3>
                        <p className="text-sm text-text-secondary">{gate.description}</p>
                      </div>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        gate.difficulty === 'easy' ? 'bg-green-900/50 text-green-400' :
                        gate.difficulty === 'medium' ? 'bg-yellow-900/50 text-yellow-400' :
                        'bg-red-900/50 text-red-400'
                      }`}>
                        {gate.difficulty}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </>
          ) : (
            // Gate Challenge
            <>
              <div className="flex items-center justify-between mb-4">
                <button
                  onClick={() => setSelectedGate(null)}
                  className="text-primary-500 hover:text-primary-400 text-sm"
                >
                  ← Back to challenges
                </button>
                <div className="flex items-center space-x-2">
                  <ClockIcon className="w-4 h-4 text-text-secondary" />
                  <span className="text-sm text-text-secondary">{timeLeft}s</span>
                </div>
              </div>

              {selectedGate === 'riddle' && (
                <div className="space-y-4">
                  <div className="bg-bg-secondary p-4 rounded-lg">
                    <h3 className="font-medium text-text-primary mb-2">🐕 Doge Riddle</h3>
                    <p className="text-text-secondary text-sm mb-3">
                      What has a head and tail but no body?
                    </p>
                    <input
                      type="text"
                      value={riddleAnswer}
                      onChange={(e) => setRiddleAnswer(e.target.value)}
                      placeholder="Your answer..."
                      className="w-full p-2 bg-bg-primary border border-border-primary rounded-md text-text-primary focus:outline-none focus:border-primary-500"
                      disabled={isSolving}
                    />
                  </div>
                  <button
                    onClick={solveRiddle}
                    disabled={isSolving || !riddleAnswer.trim()}
                    className="w-full bg-primary-500 text-bg-primary font-bold py-3 px-4 rounded-md hover:bg-primary-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {isSolving ? 'Checking...' : 'Submit Answer'}
                  </button>
                </div>
              )}

              {selectedGate === 'pow' && (
                <div className="space-y-4">
                  <div className="bg-bg-secondary p-4 rounded-lg">
                    <h3 className="font-medium text-text-primary mb-2">⚡ Proof of Work</h3>
                    <p className="text-text-secondary text-sm mb-3">
                      Finding a hash that starts with "doge"...
                    </p>
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs text-text-secondary">
                        <span>Attempts: {powAttempts.toLocaleString()}</span>
                        <span>Target: doge*</span>
                      </div>
                      {powHash && (
                        <div className="font-mono text-xs bg-bg-primary p-2 rounded text-primary-500">
                          {powHash}
                        </div>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={solvePow}
                    disabled={isSolving}
                    className="w-full bg-primary-500 text-bg-primary font-bold py-3 px-4 rounded-md hover:bg-primary-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {isSolving ? 'Mining...' : 'Start Mining'}
                  </button>
                </div>
              )}

              {selectedGate === 'share' && (
                <div className="space-y-4">
                  <div className="bg-bg-secondary p-4 rounded-lg">
                    <h3 className="font-medium text-text-primary mb-2">📢 Share & Support</h3>
                    <p className="text-text-secondary text-sm">
                      Help spread the word about {launchName} by sharing on X (Twitter)!
                    </p>
                  </div>
                  <button
                    onClick={shareOnX}
                    disabled={isSolving}
                    className="w-full bg-primary-500 text-bg-primary font-bold py-3 px-4 rounded-md hover:bg-primary-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {isSolving ? 'Copying...' : 'Copy Share Text'}
                  </button>
                </div>
              )}

              {/* Progress Bar */}
              {isSolving && (
                <div className="mt-4">
                  <div className="w-full bg-bg-secondary rounded-full h-2">
                    <div
                      className="bg-primary-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <p className="text-xs text-text-secondary mt-1 text-center">
                    {progress < 100 ? 'Working...' : 'Complete!'}
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
