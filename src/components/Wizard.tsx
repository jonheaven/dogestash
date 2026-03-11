import React, { useState } from "react";
import QRCode from "qrcode.react";
import {
  AirdropConfig,
  AirdropCostEstimate,
  DRC20Operation,
  DogeDrops,
  borkstarterClient,
  InscriptionManager,
  AirdropStatus,
  SimpleWallet,
} from "borkstarter";

interface WizardProps {
  wallet: SimpleWallet;
  externalSigner?: (psbtBase64: string) => Promise<string>;
}

export const Wizard: React.FC<WizardProps> = ({ wallet, externalSigner }) => {
  const [step, setStep] = useState(1);
  const [file, setFile] = useState<File | null>(null);
  const [isInscription, setIsInscription] = useState(true);
  const [drc20Data, setDrc20Data] = useState<DRC20Operation>({ op: "mint", tick: "JAWN", amt: 1000 });
  const [recipients, setRecipients] = useState<{ address: string; amount?: number }[]>([]);
  const [fee, setFee] = useState(100000000); // 1 DOGE
  const [dogeDropsFee, setDogeDropsFee] = useState(10000000); // 0.1 DOGE
  const [estimate, setEstimate] = useState<AirdropCostEstimate | null>(null);
  const [statuses, setStatuses] = useState<AirdropStatus[]>([]);
  const [error, setError] = useState("");

  const client = new borkstarterClient({ maxRetries: 3 });
  const inscriptionManager = new InscriptionManager(client);
  const drops = new DogeDrops(client, wallet, inscriptionManager);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) setFile(e.target.files[0]);
  };

  const loadRecipients = async () => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (e) => {
      const content = e.target?.result as string;
      try {
        const parsed = file.name.endsWith(".csv") ? drops.parseCsvAirdrop(content) : drops.parseJsonAirdrop(content);
        setRecipients(parsed.map((p) => ({ address: p.address, amount: p.amount })));
        setStep(2);
      } catch (err: any) {
        setError(err?.message || "Failed to parse file");
      }
    };
    reader.readAsText(file);
  };

  const estimateCost = async () => {
    const config: AirdropConfig = {
      recipients: recipients.map((r) => ({
        address: r.address,
        amount: r.amount,
        drc20Data: isInscription ? drc20Data : undefined,
      })),
      fee,
      dogeDropsFee,
      isInscriptionAirdrop: isInscription,
      isDrc20Airdrop: isInscription,
      drc20Tick: drc20Data.tick,
      drc20Op: drc20Data.op,
    };
    try {
      const est = await drops.estimateAirdropCost(config);
      setEstimate(est);
      setStep(3);
    } catch (err: any) {
      setError(err?.message || "Failed to estimate cost");
    }
  };

  const execute = async () => {
    const config: AirdropConfig = {
      recipients: recipients.map((r) => ({
        address: r.address,
        amount: r.amount,
        drc20Data: isInscription ? drc20Data : undefined,
      })),
      fee,
      dogeDropsFee,
      isInscriptionAirdrop: isInscription,
      isDrc20Airdrop: isInscription,
      drc20Tick: drc20Data.tick,
      drc20Op: drc20Data.op,
    };
    const confirm = async () => {
      if (!window.confirm(`Confirm airdrop? Total cost: ${estimate?.totalCost.toFixed(4) || "?"} DOGE`)) throw new Error("User cancelled");
    };
    try {
      const ids = await drops.executeAirdrop(config, confirm, externalSigner);
      setStatuses(ids.map((id) => ({ txId: id, status: "pending", confirmations: 0 })));
      setStep(4);
    } catch (err: any) {
      setError(err?.message || "Execution failed");
    }
  };

  return (
    <div>
      {error && <p style={{ color: "red" }}>{error}</p>}
      {step === 1 && (
        <div>
          <h2>Step 1: Design Tokenomics</h2>
          <label>
            <input type="checkbox" checked={isInscription} onChange={(e) => setIsInscription(e.target.checked)} /> DRC-20 Token Airdrop
          </label>
          {isInscription && (
            <div style={{ display: "flex", gap: 8 }}>
              <input value={drc20Data.tick} onChange={(e) => setDrc20Data({ ...drc20Data, tick: e.target.value })} placeholder="Ticker" />
              <input
                type="number"
                value={drc20Data.amt}
                onChange={(e) => setDrc20Data({ ...drc20Data, amt: parseInt(e.target.value || "0", 10) })}
                placeholder="Amount per recipient"
              />
              <select value={drc20Data.op} onChange={(e) => setDrc20Data({ ...drc20Data, op: e.target.value as "mint" | "transfer" })}>
                <option value="mint">mint</option>
                <option value="transfer">transfer</option>
              </select>
            </div>
          )}
          <div style={{ marginTop: 8 }}>
            <input type="file" accept=".json,.csv" onChange={handleFileUpload} />
          </div>
          <button onClick={loadRecipients} style={{ marginTop: 8 }}>
            Next
          </button>
        </div>
      )}
      {step === 2 && (
        <div>
          <h2>Step 2: Review Recipients</h2>
          <ul>
            {recipients.map((r, i) => (
              <li key={i}>
                {r.address} {r.amount ? `- ${r.amount / 1e8} DOGE` : ""}
              </li>
            ))}
          </ul>
          <button onClick={() => setStep(1)}>Back</button>
          <button onClick={estimateCost}>Next</button>
        </div>
      )}
      {step === 3 && estimate && (
        <div>
          <h2>Step 3: Cost Estimate</h2>
          <p>Transaction Fees: {estimate.transactionFees.toFixed(4)} DOGE</p>
          <p>DogeDrops Fees: {estimate.dogeDropsFees.toFixed(4)} DOGE</p>
          <p>Total Cost: {estimate.totalCost.toFixed(4)} DOGE</p>
          <p>Transactions Required: {estimate.transactionsRequired}</p>
          <p>{estimate.isFeasible ? "Airdrop is feasible!" : estimate.message}</p>
          <div style={{ marginTop: 8 }}>
            <QRCode value={wallet.getAddress()} />
          </div>
          <button onClick={() => setStep(2)}>Back</button>
          {estimate.isFeasible && <button onClick={execute}>Execute</button>}
        </div>
      )}
      {step === 4 && (
        <div>
          <h2>Step 4: Airdrop Complete</h2>
          <ul>
            {statuses.map((s, i) => (
              <li key={i}>
                {s.txId} - {s.status} ({s.confirmations} confs)
              </li>
            ))}
          </ul>
          <button onClick={() => setStep(1)}>Start New Airdrop</button>
        </div>
      )}
    </div>
  );
};
