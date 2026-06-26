"use client";

import {
  Activity,
  Anchor,
  Cable,
  CheckCircle2,
  Gauge,
  Power,
  Radar,
  RadioTower,
  ShipWheel,
  Stamp,
  ToggleLeft,
  Waves,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { Hex } from "viem";
import {
  useAccount,
  useConnect,
  useDisconnect,
  useReadContracts,
  useSwitchChain,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";
import { base } from "wagmi/chains";
import { signalHarborAbi } from "@/lib/abi";
import {
  BUILDER_DATA_SUFFIX,
  SIGNAL_HARBOR_ADDRESS,
  hasBuilderDataSuffix,
  hasContractAddress,
} from "@/lib/app-config";

type HarborAction = {
  label: string;
  functionName: "pulseSignal" | "flipSwitch" | "stampPass";
  icon: typeof RadioTower;
  tone: string;
};

type TxState = "Idle" | "Pending" | "Confirmed" | "Failed" | "Request rejected";

const actions: HarborAction[] = [
  {
    label: "Pulse Signal",
    functionName: "pulseSignal",
    icon: RadioTower,
    tone: "from-[#3b82f6] to-[#5eead4]",
  },
  {
    label: "Flip Switch",
    functionName: "flipSwitch",
    icon: ToggleLeft,
    tone: "from-[#f59e0b] to-[#ef4444]",
  },
  {
    label: "Stamp Pass",
    functionName: "stampPass",
    icon: Stamp,
    tone: "from-[#e5e7eb] to-[#60a5fa]",
  },
];

function formatAddress(address?: string) {
  if (!address) return "Not connected";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function formatCount(value: unknown) {
  return typeof value === "bigint" ? value.toString() : "0";
}

function friendlyError(error: unknown): TxState {
  const message = error instanceof Error ? error.message.toLowerCase() : "";
  if (message.includes("reject") || message.includes("denied")) {
    return "Request rejected";
  }
  return "Failed";
}

export default function Home() {
  const { address, chainId, isConnected } = useAccount();
  const { connectors, connectAsync, isPending: isConnectPending } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChainAsync } = useSwitchChain();
  const { writeContractAsync } = useWriteContract();
  const [walletMenuOpen, setWalletMenuOpen] = useState(false);
  const [txHash, setTxHash] = useState<Hex>();
  const [txState, setTxState] = useState<TxState>("Idle");
  const [activeAction, setActiveAction] = useState("Harbor watch is standing by.");

  const contractCalls = useMemo(
    () =>
      [
        {
          address: SIGNAL_HARBOR_ADDRESS,
          abi: signalHarborAbi,
          functionName: "userPulses",
          args: [address ?? "0x0000000000000000000000000000000000000000"],
        },
        {
          address: SIGNAL_HARBOR_ADDRESS,
          abi: signalHarborAbi,
          functionName: "userSwitches",
          args: [address ?? "0x0000000000000000000000000000000000000000"],
        },
        {
          address: SIGNAL_HARBOR_ADDRESS,
          abi: signalHarborAbi,
          functionName: "userStamps",
          args: [address ?? "0x0000000000000000000000000000000000000000"],
        },
        {
          address: SIGNAL_HARBOR_ADDRESS,
          abi: signalHarborAbi,
          functionName: "totalPulses",
        },
        {
          address: SIGNAL_HARBOR_ADDRESS,
          abi: signalHarborAbi,
          functionName: "totalSwitches",
        },
        {
          address: SIGNAL_HARBOR_ADDRESS,
          abi: signalHarborAbi,
          functionName: "totalStamps",
        },
      ] as const,
    [address],
  );

  const reads = useReadContracts({
    contracts: contractCalls,
    query: {
      enabled: hasContractAddress,
      refetchInterval: 10_000,
    },
  });

  const receipt = useWaitForTransactionReceipt({
    hash: txHash,
    query: {
      enabled: Boolean(txHash),
    },
  });

  useEffect(() => {
    if (receipt.isSuccess) {
      void reads.refetch();
    }
  }, [reads, receipt.isSuccess]);

  useEffect(() => {
    if (receipt.isError) {
      console.error(receipt.error);
    }
  }, [receipt.error, receipt.isError]);

  const values = reads.data?.map((entry) => entry.result) ?? [];
  const visibleTxState: TxState = receipt.isSuccess
    ? "Confirmed"
    : receipt.isError
      ? "Failed"
      : txState;
  const visibleActivity = receipt.isSuccess
    ? "Confirmed on Base. Harbor counts are refreshing."
    : receipt.isError
      ? "Transaction failed. Please try again."
      : activeAction;
  const walletStatus = isConnected
    ? chainId === base.id
      ? "Connected on Base"
      : "Wrong network"
    : "Ready to connect";

  async function connectWallet(connectorId: string) {
    try {
      const connector = connectors.find((item) => item.id === connectorId);
      if (!connector) return;
      await connectAsync({ connector, chainId: base.id });
      setWalletMenuOpen(false);
      setActiveAction("Wallet linked. Dispatch console is online.");
    } catch (error) {
      console.error(error);
      setTxState(friendlyError(error));
      setActiveAction("Wallet connection did not complete.");
    }
  }

  async function runAction(action: HarborAction) {
    if (!isConnected) {
      setWalletMenuOpen(true);
      setActiveAction("Connect a wallet before sending a harbor action.");
      return;
    }

    if (!hasContractAddress) {
      setTxState("Failed");
      setActiveAction("Contract is not configured yet.");
      return;
    }

    if (chainId !== base.id) {
      try {
        await switchChainAsync({ chainId: base.id });
      } catch (error) {
        console.error(error);
        setTxState(friendlyError(error));
        setActiveAction("Switch to Base and try again.");
        return;
      }
    }

    try {
      setTxState("Pending");
      setActiveAction(`${action.label} is waiting for wallet confirmation.`);
      const hash = await writeContractAsync({
        address: SIGNAL_HARBOR_ADDRESS,
        abi: signalHarborAbi,
        functionName: action.functionName,
        dataSuffix: BUILDER_DATA_SUFFIX,
      });
      setTxHash(hash);
      setActiveAction(`${action.label} was sent to Base.`);
    } catch (error) {
      console.error(error);
      setTxState(friendlyError(error));
      setActiveAction("Transaction failed. Please try again.");
    }
  }

  return (
    <main className="min-h-screen overflow-hidden bg-[#06111f] text-[#f8fafc]">
      <section className="relative mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 py-5 sm:px-6 lg:px-8">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,rgba(0,82,255,0.20),transparent_32%),radial-gradient(circle_at_75%_10%,rgba(94,234,212,0.18),transparent_28%),linear-gradient(180deg,rgba(6,17,31,0)_0%,#06111f_70%)]" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-48 bg-[repeating-linear-gradient(90deg,rgba(148,163,184,0.12)_0_1px,transparent_1px_34px)] opacity-50" />

        <header className="relative z-50 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded border border-[#5eead4]/40 bg-[#0b2236] shadow-[0_0_24px_rgba(94,234,212,0.28)]">
              <Anchor className="h-5 w-5 text-[#5eead4]" />
            </div>
            <div>
              <h1 className="text-xl font-semibold tracking-normal sm:text-2xl">
                Signal Harbor
              </h1>
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-[#a7f3d0]">
                Base Dispatch Console
              </p>
            </div>
          </div>

          <div className="relative">
            <button
              type="button"
              onClick={() => setWalletMenuOpen((open) => !open)}
              className="flex min-h-11 items-center gap-2 rounded border border-[#93c5fd]/35 bg-[#0a1a2b]/90 px-3 text-sm font-semibold text-white shadow-[0_0_22px_rgba(59,130,246,0.20)] transition hover:border-[#60a5fa]"
            >
              <span
                className={`h-2.5 w-2.5 rounded-full ${
                  isConnected ? "bg-[#34d399]" : "bg-[#f59e0b]"
                }`}
              />
              {isConnected ? formatAddress(address) : "Connect Wallet"}
            </button>

            {walletMenuOpen ? (
              <div className="fixed right-4 top-20 z-[100] w-[min(18rem,calc(100vw-2rem))] rounded border border-[#93c5fd]/25 bg-[#081827] p-2 shadow-2xl shadow-black/50">
                <div className="mb-2 flex items-center justify-between px-2 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-[#bfdbfe]">
                  Wallet Options
                  <button
                    type="button"
                    aria-label="Close wallet options"
                    onClick={() => setWalletMenuOpen(false)}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                {isConnected ? (
                  <button
                    type="button"
                    onClick={() => {
                      disconnect();
                      setWalletMenuOpen(false);
                      setActiveAction("Wallet disconnected.");
                    }}
                    className="mb-1 flex w-full items-center justify-between rounded border border-transparent px-3 py-2 text-left text-sm text-[#e0f2fe] transition hover:border-[#38bdf8]/40 hover:bg-[#0f2c45]"
                  >
                    <span>Disconnect {formatAddress(address)}</span>
                    <Power className="h-4 w-4 text-[#f87171]" />
                  </button>
                ) : (
                  <>
                    {connectors.map((connector) => (
                      <button
                        type="button"
                        key={connector.uid}
                        disabled={isConnectPending}
                        onClick={() => void connectWallet(connector.id)}
                        className="mb-1 flex w-full items-center justify-between rounded border border-transparent px-3 py-2 text-left text-sm text-[#e0f2fe] transition hover:border-[#38bdf8]/40 hover:bg-[#0f2c45]"
                      >
                        <span>
                          {connector.id === "injected"
                            ? "Browser Wallet"
                            : connector.name}
                        </span>
                        <Power className="h-4 w-4 text-[#5eead4]" />
                      </button>
                    ))}
                    <p className="px-3 py-2 text-xs leading-5 text-[#94a3b8]">
                      MetaMask, OKX, and Base App wallets use Browser Wallet.
                    </p>
                  </>
                )}
              </div>
            ) : null}
          </div>
        </header>

        <div className="relative z-10 mt-5 grid flex-1 gap-4 lg:grid-cols-[1.15fr_0.85fr]">
          <section className="min-h-[520px] border border-[#1d4ed8]/35 bg-[#071827]/80 p-4 shadow-[inset_0_0_80px_rgba(15,23,42,0.55)] sm:p-5">
            <div className="flex items-center justify-between border-b border-[#1e3a8a]/50 pb-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#93c5fd]">
                  Harbor Control
                </p>
                <h2 className="mt-1 text-2xl font-semibold sm:text-4xl">
                  Beacon Line Active
                </h2>
              </div>
              <div className="flex items-center gap-2 rounded border border-[#34d399]/35 bg-[#052e2b] px-3 py-2 text-xs font-semibold text-[#bbf7d0]">
                <CheckCircle2 className="h-4 w-4" />
                {walletStatus}
              </div>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-[1fr_180px]">
              <div className="relative min-h-72 overflow-hidden border border-[#475569]/35 bg-[#0a1f33] p-4">
                <div className="absolute inset-x-0 top-14 h-px bg-[#38bdf8]/30" />
                <div className="absolute bottom-10 left-0 right-0 h-20 bg-[repeating-linear-gradient(135deg,rgba(45,212,191,0.20)_0_2px,transparent_2px_18px)]" />
                <div className="relative flex h-full flex-col justify-between">
                  <div className="grid grid-cols-4 gap-2">
                    {["Pier 01", "Pier 04", "Crane B", "Tide"].map((label, index) => (
                      <div
                        key={label}
                        className="border border-[#334155] bg-[#06111f]/70 p-2"
                      >
                        <div
                          className={`mb-2 h-2 w-2 rounded-full ${
                            index === 1 ? "bg-[#f87171]" : "bg-[#5eead4]"
                          } shadow-[0_0_14px_currentColor]`}
                        />
                        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#cbd5e1]">
                          {label}
                        </p>
                      </div>
                    ))}
                  </div>

                  <div className="mx-auto flex h-32 w-32 items-center justify-center rounded-full border border-[#60a5fa]/50 bg-[#082f49] shadow-[0_0_44px_rgba(59,130,246,0.35)]">
                    <div className="flex h-20 w-20 items-center justify-center rounded-full border border-[#5eead4]/60 bg-[#03121f] shadow-[0_0_38px_rgba(94,234,212,0.45)]">
                      <Radar className="h-9 w-9 text-[#fbbf24]" />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div className="border border-[#1e40af]/45 bg-[#071827] p-3">
                      <Waves className="mb-2 h-4 w-4 text-[#5eead4]" />
                      Tide rail calibrated
                    </div>
                    <div className="border border-[#7f1d1d]/45 bg-[#1f1012] p-3">
                      <Cable className="mb-2 h-4 w-4 text-[#f87171]" />
                      Cargo tag locked
                    </div>
                    <div className="border border-[#92400e]/45 bg-[#201709] p-3">
                      <Gauge className="mb-2 h-4 w-4 text-[#fbbf24]" />
                      Signal amber clear
                    </div>
                  </div>
                </div>
              </div>

              <aside className="grid gap-3">
                {actions.map((action) => {
                  const Icon = action.icon;
                  return (
                    <button
                      type="button"
                      key={action.functionName}
                      onClick={() => void runAction(action)}
                      className={`group flex min-h-24 flex-col justify-between border border-white/15 bg-gradient-to-br ${action.tone} p-4 text-left text-[#06111f] shadow-lg transition hover:-translate-y-0.5 hover:shadow-[0_0_30px_rgba(96,165,250,0.24)] disabled:opacity-60`}
                    >
                      <Icon className="h-6 w-6" />
                      <span className="text-lg font-black">{action.label}</span>
                    </button>
                  );
                })}
              </aside>
            </div>
          </section>

          <section className="grid gap-4">
            <div className="border border-[#38bdf8]/25 bg-[#071827]/85 p-4">
              <div className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.16em] text-[#bae6fd]">
                <Activity className="h-4 w-4" />
                Signal Counts
              </div>
              <div className="grid gap-3">
                {[
                  ["My Pulses", "Total Pulses", values[0], values[3]],
                  ["My Switches", "Total Switches", values[1], values[4]],
                  ["My Stamps", "Total Stamps", values[2], values[5]],
                ].map(([mine, total, myValue, totalValue]) => (
                  <div
                    key={String(mine)}
                    className="grid grid-cols-2 gap-3 border border-[#334155] bg-[#06111f]/70 p-3"
                  >
                    <div>
                      <p className="text-xs text-[#94a3b8]">{mine}</p>
                      <p className="mt-1 text-2xl font-semibold">
                        {formatCount(myValue)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-[#94a3b8]">{total}</p>
                      <p className="mt-1 text-2xl font-semibold text-[#5eead4]">
                        {formatCount(totalValue)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="border border-[#f59e0b]/25 bg-[#111827]/90 p-4">
              <div className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.16em] text-[#fde68a]">
                <ShipWheel className="h-4 w-4" />
                Recent Activity
              </div>
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <span className="text-[#cbd5e1]">Wallet Status</span>
                  <span className="font-semibold">{walletStatus}</span>
                </div>
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <span className="text-[#cbd5e1]">Last Transaction</span>
                  <span className="font-semibold">{visibleTxState}</span>
                </div>
                <p className="rounded border border-[#334155] bg-[#06111f] p-3 text-[#dbeafe]">
                  {visibleActivity}
                </p>
              </div>
            </div>

            <div className="border border-[#334155] bg-[#071827]/75 p-4 text-xs leading-6 text-[#cbd5e1]">
              <p>Network: Base Mainnet</p>
              <p>Wallet: {formatAddress(address)}</p>
              <p>
                Attribution:{" "}
                {hasBuilderDataSuffix ? "Ready" : "Configuration pending"}
              </p>
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}
