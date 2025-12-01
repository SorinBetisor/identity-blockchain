import { http, createConfig, createStorage } from "wagmi";
import { hardhat } from "wagmi/chains";
import { mock } from "wagmi/connectors";
import { privateKeyToAccount } from "viem/accounts";

const HARDHAT_ACCOUNT_0 =
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
const account = privateKeyToAccount(HARDHAT_ACCOUNT_0);

export const config = createConfig({
  chains: [hardhat],
  connectors: [
    mock({
      accounts: [account.address],
      features: {
        reconnect: true,
      },
    }),
  ],
  transports: {
    [hardhat.id]: http(),
  },
  storage: createStorage({
    storage: window.localStorage,
  }),
});
