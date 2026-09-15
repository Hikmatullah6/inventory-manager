'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import PinModal from '@/components/PinModal';
import {
  isBatchVerified, isMasterVerified,
  setBatchVerified, storeVerifiedPin, setMasterVerified,
} from '@/lib/session';

interface PinGateProps {
  batchId: string;
  batchName: string;
  /** Whether this batch is PIN-protected. The hash stays on the server. */
  hasPin: boolean;
  children: React.ReactNode;
}

export default function PinGate({ batchId, batchName, hasPin, children }: PinGateProps) {
  const [verified, setVerified] = useState(false);
  const [checking, setChecking] = useState(true);
  const router = useRouter();

  useEffect(() => {
    if (!hasPin || isBatchVerified(batchId) || isMasterVerified()) {
      setVerified(true);
    }
    setChecking(false);
  }, [batchId, hasPin]);

  if (checking) return null;

  if (!verified) {
    return (
      <PinModal
        batchId={batchId}
        batchName={batchName}
        mode="access"
        onSuccess={(pin, isMaster) => {
          setBatchVerified(batchId);
          storeVerifiedPin(batchId, pin);
          if (isMaster) setMasterVerified();
          setVerified(true);
        }}
        onCancel={() => router.push('/')}
      />
    );
  }

  return <>{children}</>;
}
