import {
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import {
  CONTRACT_ADDRESSES,
  IdentityRegistryABI,
  CreditTier,
  IncomeBand,
} from "../contracts";

export function useIdentityRegistry() {
  const queryClient = useQueryClient();
  const { writeContract, data: hash, isPending, error } = useWriteContract();

  const { isLoading: isConfirming, isSuccess: isConfirmed } =
    useWaitForTransactionReceipt({ hash });

  // Refetch identity data when registration is confirmed
  useEffect(() => {
    if (isConfirmed && hash) {
      // Invalidate and refetch identity queries
      queryClient.invalidateQueries({
        queryKey: [
          "readContract",
          {
            address: CONTRACT_ADDRESSES.IdentityRegistry,
            functionName: "identities",
          },
        ],
      });
    }
  }, [isConfirmed, hash, queryClient]);

  const register = () => {
    writeContract({
      address: CONTRACT_ADDRESSES.IdentityRegistry,
      abi: IdentityRegistryABI,
      functionName: "register",
    });
  };

  const useIdentity = (address: `0x${string}` | undefined) => {
    return useReadContract({
      address: CONTRACT_ADDRESSES.IdentityRegistry,
      abi: IdentityRegistryABI,
      functionName: "identities",
      args: address ? [address] : undefined,
      query: {
        enabled: !!address,
        // Refetch on window focus and reconnect
        refetchOnWindowFocus: true,
        refetchOnReconnect: true,
      },
    });
  };

  return {
    register,
    useIdentity,
    isPending,
    isConfirming,
    isConfirmed,
    hash,
    error,
  };
}

export function formatCreditTier(tier: number | undefined): string {
  if (tier === undefined) return "Unknown";
  return (
    Object.keys(CreditTier).find(
      (key) => CreditTier[key as keyof typeof CreditTier] === tier
    ) || "Unknown"
  );
}

export function formatIncomeBand(band: number | undefined): string {
  if (band === undefined) return "Unknown";
  return (
    Object.keys(IncomeBand).find(
      (key) => IncomeBand[key as keyof typeof IncomeBand] === band
    ) || "Unknown"
  );
}
