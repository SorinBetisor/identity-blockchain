import {
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import {
  CONTRACT_ADDRESSES,
  IdentityRegistryABI,
  CreditTier,
  IncomeBand,
} from "../contracts";

export function useIdentityRegistry() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();

  const { isLoading: isConfirming, isSuccess: isConfirmed } =
    useWaitForTransactionReceipt({ hash });

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
