import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import {
  CONTRACT_ADDRESSES,
  ConsentManagerABI,
  ConsentStatus,
} from "../contracts";

export function useConsentManager() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();

  const { isLoading: isConfirming, isSuccess: isConfirmed } =
    useWaitForTransactionReceipt({ hash });

  // We need to pass the user's address to createConsent correctly.
  // I'll update the function signature to take userDID.

  const createConsentWithAddress = (
    requesterDID: `0x${string}`,
    userDID: `0x${string}`,
    daysValid: number
  ) => {
    const startDate = Math.floor(Date.now() / 1000);
    const endDate = startDate + daysValid * 24 * 60 * 60;

    writeContract({
      address: CONTRACT_ADDRESSES.ConsentManager,
      abi: ConsentManagerABI,
      functionName: "createConsent",
      args: [requesterDID, userDID, BigInt(startDate), BigInt(endDate)],
    });
  };

  const revokeConsent = (userDID: `0x${string}`, consentID: `0x${string}`) => {
    writeContract({
      address: CONTRACT_ADDRESSES.ConsentManager,
      abi: ConsentManagerABI,
      functionName: "changeStatus",
      args: [userDID, consentID, ConsentStatus.Revoked],
    });
  };

  // Helper to get consent ID
  // In a real app we might query events or a subgraph.
  // For now, we might just need to rely on the user knowing the requester or checking logs.
  // The contract has `consents[userDID][consentID]`.
  // We can't easily list *all* consents without events.
  // I'll add a hook to check a specific consent if needed, but listing is hard without indexing.
  // For this demo, maybe we just show a "Grant Consent" form and assume success?
  // Or better, we can listen to `ConsentCreated` events?
  // Wagmi has `useWatchContractEvent`.

  return {
    createConsent: createConsentWithAddress,
    revokeConsent,
    isPending,
    isConfirming,
    isConfirmed,
    hash,
    error,
  };
}

export function formatConsentStatus(status: number | undefined): string {
  if (status === undefined) return "Unknown";
  return (
    Object.keys(ConsentStatus).find(
      (key) => ConsentStatus[key as keyof typeof ConsentStatus] === status
    ) || "Unknown"
  );
}
