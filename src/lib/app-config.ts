import type { Address, Hex } from "viem";

export const SIGNAL_HARBOR_ADDRESS =
  "0x91dc9e89fc1a971fc684a125e435d922b8da8b7f" as Address;

export const BUILDER_DATA_SUFFIX =
  "0x62635f62757879627731740b0080218021802180218021802180218021" as Hex;

export const hasContractAddress =
  SIGNAL_HARBOR_ADDRESS !== "0x0000000000000000000000000000000000000000";

export const hasBuilderDataSuffix = BUILDER_DATA_SUFFIX !== "0x";
