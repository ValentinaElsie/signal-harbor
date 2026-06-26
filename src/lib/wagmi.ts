import { http, createConfig } from "wagmi";
import { base } from "wagmi/chains";
import { coinbaseWallet, injected } from "wagmi/connectors";
import { BUILDER_DATA_SUFFIX } from "@/lib/app-config";

export const wagmiConfig = createConfig({
  chains: [base],
  connectors: [
    injected({
      shimDisconnect: true,
      target() {
        return {
          id: "injected",
          name: "Browser Wallet",
          provider:
            typeof window !== "undefined" ? window.ethereum : undefined,
        };
      },
    }),
    coinbaseWallet({
      appName: "Signal Harbor",
      preference: "all",
    }),
  ],
  transports: {
    [base.id]: http(),
  },
  ssr: true,
  // Viem appends this ERC-8021 attribution suffix to wallet calldata.
  dataSuffix: BUILDER_DATA_SUFFIX,
});
