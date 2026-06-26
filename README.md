# Signal Harbor

Signal Harbor is a Base Mini App with exactly three onchain write actions:

- `pulseSignal()`
- `flipSwitch()`
- `stampPass()`

The frontend is aligned with `contracts/SignalHarbor.sol` through:

- `src/lib/abi.ts`
- `src/lib/app-config.ts`
- `src/app/page.tsx`

## Contract

Deploy `contracts/SignalHarbor.sol` to Base mainnet. After deployment, set the deployed address in `src/lib/app-config.ts`:

```ts
export const SIGNAL_HARBOR_ADDRESS = "0x..." as Address;
```

The app reads:

- `userPulses(address)`
- `userSwitches(address)`
- `userStamps(address)`
- `totalPulses()`
- `totalSwitches()`
- `totalStamps()`

The app writes only:

- `pulseSignal()`
- `flipSwitch()`
- `stampPass()`

## Attribution

Set these values in `src/lib/app-config.ts` before production deployment:

```ts
export const BASE_APP_ID = "...";
export const BUILDER_DATA_SUFFIX = "0x...";
```

## Checks

```bash
npm run check:contract
npm run lint
npm run build
```
