import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { readContract } from "@wagmi/core";
import {
  CONTRACT_ADDRESSES,
  ConsentManagerABI,
  ConsentStatus,
} from "../contracts";
import { keccak256, encodePacked, getAddress } from "viem";
import { config } from "../wagmi";

function computeConsentId(requester: `0x${string}`, user: `0x${string}`) {
  return keccak256(
    encodePacked(["address", "address"], [getAddress(requester), getAddress(user)])
  );
}

export function useConsentManager() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();

  const { isLoading: isConfirming, isSuccess: isConfirmed } =
    useWaitForTransactionReceipt({ hash });

  const createConsentWithAddress = async (
    requesterDID: `0x${string}`,
    userDID: `0x${string}`,
    daysValid: number
  ) => {
    const consentID = computeConsentId(requesterDID, userDID) as `0x${string}`;
    const alreadyGranted = await readContract(config, {
      address: CONTRACT_ADDRESSES.ConsentManager,
      abi: ConsentManagerABI,
      functionName: "isConsentGranted",
      args: [userDID, requesterDID],
    });
    if (alreadyGranted) {
      throw new Error("Consent already granted for this requester");
    }

    const startDate = Math.floor(Date.now() / 1000);
    const endDate = startDate + daysValid * 24 * 60 * 60;

    await writeContract({
      address: CONTRACT_ADDRESSES.ConsentManager,
      abi: ConsentManagerABI,
      functionName: "createConsent",
      args: [requesterDID, userDID, BigInt(startDate), BigInt(endDate)],
    });

    await writeContract({
      address: CONTRACT_ADDRESSES.ConsentManager,
      abi: ConsentManagerABI,
      functionName: "changeStatus",
      args: [userDID, consentID, ConsentStatus.Granted],
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
