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
  pinHash: string | null;
  children: React.ReactNode;
}

export default function PinGate({ batchId, batchName, pinHash, children }: PinGateProps) {
  const [verified, setVerified] = useState(false);
  const [checking, setChecking] = useState(true);
  const router = useRouter();

  useEffect(() => {
    if (!pinHash || isBatchVerified(batchId) || isMasterVerified()) {
      setVerified(true);
    }
    setChecking(false);
  }, [batchId, pinHash]);

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
