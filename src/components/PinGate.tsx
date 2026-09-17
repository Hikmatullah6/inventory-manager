'use client';
import { useEffect, useState, useSyncExternalStore } from 'react';
import { useRouter } from 'next/navigation';
import PinModal from '@/components/PinModal';
import {
  isBatchVerified, isMasterVerified,
  setBatchVerified, storeVerifiedPin, setMasterVerified,
  getVerifiedPin, getMasterPin,
} from '@/lib/session';

interface PinGateProps {
  batchId: string;
  batchName: string;
  /** Whether this batch is PIN-protected. The hash stays on the server. */
  hasPin: boolean;
  /** True when the server rendered this page without the batch's data because
   *  it saw no PIN cookie. Unlocking then has to re-render it. */
  serverLocked?: boolean;
  children: React.ReactNode;
}

const subscribeNever = () => () => {};

export default function PinGate({ batchId, batchName, hasPin, serverLocked, children }: PinGateProps) {
  const [unlocked, setUnlocked] = useState(false);
  const router = useRouter();

  // sessionStorage does not exist on the server, so the gate can only be read
  // once hydrated. Same trick as ReviewClient: no extra render pass, and no
  // flash of the PIN prompt at someone who already unlocked this batch.
  const hydrated = useSyncExternalStore(subscribeNever, () => true, () => false);
  const verified = hydrated && (unlocked || !hasPin || isBatchVerified(batchId) || isMasterVerified());

  // The server withheld this page's data, yet this tab remembers unlocking the
  // batch — it unlocked it before the cookie existed. Mint one from the PIN it
  // still holds, then re-render the page with the data in place.
  useEffect(() => {
    if (!verified || !hasPin || !serverLocked) return;
    const pin = getVerifiedPin(batchId) ?? getMasterPin();
    if (!pin) return;
    let cancelled = false;
    fetch(`/api/batches/${batchId}/verify-pin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin }),
    })
      .then(res => { if (res.ok && !cancelled) router.refresh(); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [batchId, hasPin, serverLocked, verified, router]);

  if (!hydrated) return null;

  if (!verified) {
    return (
      <PinModal
        batchId={batchId}
        batchName={batchName}
        mode="access"
        onSuccess={(pin, isMaster) => {
          setBatchVerified(batchId);
          storeVerifiedPin(batchId, pin);
          if (isMaster) setMasterVerified(pin);
          setUnlocked(true);
          // PinModal just minted the cookie; re-render so the server fills in
          // what it withheld.
          router.refresh();
        }}
        onCancel={() => router.push('/')}
      />
    );
  }

  return <>{children}</>;
}
