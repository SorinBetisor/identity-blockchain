import { useReadContract } from "wagmi";
import { formatUnits } from "viem";
import { CONTRACT_ADDRESSES, DataSharingTokenABI } from "../contracts";

export function useTokenBalance(address: `0x${string}` | undefined) {
  const query = useReadContract({
    address: CONTRACT_ADDRESSES.DataSharingToken,
    abi: DataSharingTokenABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
    },
  });

  const formatted =
    query.data !== undefined ? formatUnits(query.data as bigint, 18) : undefined;

  return { ...query, formatted };
}
