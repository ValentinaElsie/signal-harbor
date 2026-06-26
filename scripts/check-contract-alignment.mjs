import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = dirname(dirname(fileURLToPath(import.meta.url)));

const contractSource = readFileSync(
  join(root, "contracts", "SignalHarbor.sol"),
  "utf8",
);
const abiSource = readFileSync(join(root, "src", "lib", "abi.ts"), "utf8");
const pageSource = readFileSync(join(root, "src", "app", "page.tsx"), "utf8");

const expectedContractName = "SignalHarbor";
const expectedReads = [
  "userPulses",
  "userSwitches",
  "userStamps",
  "totalPulses",
  "totalSwitches",
  "totalStamps",
];
const expectedWrites = ["pulseSignal", "flipSwitch", "stampPass"];
const expectedEvents = ["SignalPulsed", "SwitchFlipped", "PassStamped"];

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function hasContractFunction(name) {
  return new RegExp(`function\\s+${name}\\s*\\(`).test(contractSource);
}

function hasContractPublicGetter(name) {
  return new RegExp(`public\\s+${name}\\s*;`).test(contractSource);
}

function hasAbiEntry(name, type) {
  const escapedName = `name: "${name}"`;
  const escapedType = `type: "${type}"`;
  return abiSource.includes(escapedName) && abiSource.includes(escapedType);
}

assert(
  new RegExp(`contract\\s+${expectedContractName}\\s*\\{`).test(contractSource),
  `Contract name must be ${expectedContractName}.`,
);

for (const name of expectedReads) {
  assert(
    hasContractPublicGetter(name) || hasContractFunction(name),
    `Contract is missing read entry ${name}.`,
  );
  assert(hasAbiEntry(name, "function"), `ABI is missing function ${name}.`);
  assert(pageSource.includes(`functionName: "${name}"`), `Page is missing read call ${name}.`);
}

for (const name of expectedWrites) {
  assert(hasContractFunction(name), `Contract is missing write function ${name}.`);
  assert(hasAbiEntry(name, "function"), `ABI is missing function ${name}.`);
  assert(pageSource.includes(`functionName: "${name}"`), `Page action is missing ${name}.`);
}

for (const name of expectedEvents) {
  assert(
    new RegExp(`event\\s+${name}\\s*\\(`).test(contractSource),
    `Contract is missing event ${name}.`,
  );
  assert(hasAbiEntry(name, "event"), `ABI is missing event ${name}.`);
}

const writeContractMatches = [...pageSource.matchAll(/writeContractAsync\(/g)];
assert(
  writeContractMatches.length === 1,
  "Page should use one shared writeContractAsync path for the three allowed actions.",
);
assert(
  pageSource.includes("dataSuffix: BUILDER_DATA_SUFFIX"),
  "writeContractAsync must explicitly include BUILDER_DATA_SUFFIX.",
);

console.log("Contract source, ABI, and frontend calls are aligned.");
