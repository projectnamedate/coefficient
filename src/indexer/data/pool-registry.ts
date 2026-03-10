export interface PoolRegistryEntry {
  id: string;
  name: string;
  stakePoolAddress: string; // on-chain stake pool account (base58)
  program: "spl-stake-pool" | "marinade" | "sanctum-multi";
}

// On-chain stake pool addresses for the tracked multi-validator pools
// Sources: pool docs, solanacompass.com/stake-pools, solscan.io, github.com/SOFZP/Solana-Stake-Pools-Research
export const POOL_REGISTRY: PoolRegistryEntry[] = [
  {
    id: "jito",
    name: "Jito",
    stakePoolAddress: "Jito4APyf642JPZPx3hGc6WWJ8zPKtRbRs4P815Awbb",
    program: "spl-stake-pool",
  },
  {
    id: "doublezero",
    name: "DoubleZero",
    stakePoolAddress: "3fV1sdGeXaNEZj6EPDTpub82pYxcRXwt2oie6jkSzeWi",
    program: "spl-stake-pool",
  },
  {
    id: "blazestake",
    name: "BlazeStake",
    stakePoolAddress: "stk9ApL5HeVAwPLr3TLhDXdZS8ptVu7zp6ov8HFDuMi",
    program: "spl-stake-pool",
  },
  {
    id: "jpool",
    name: "JPool",
    stakePoolAddress: "CtMyWsrUtAwXWiGr9WjHT5fC3p3fgV8cyGpLTo2LJzG1",
    program: "spl-stake-pool",
  },
  {
    id: "phase",
    name: "Phase Delegation",
    stakePoolAddress: "aero2ePURjuEgLKTzcUmF6RypBncBGd7pMUYCoSsVJ6",
    program: "spl-stake-pool",
  },
  {
    id: "vault",
    name: "Vault",
    stakePoolAddress: "Fu9BYC6tWBo1KMKaP3CFoKfRhqv9akmy3DuYwnCyWiyC",
    program: "spl-stake-pool",
  },
  {
    id: "dynosol",
    name: "dynoSOL",
    stakePoolAddress: "DpooSqZRL3qCmiq82YyB4zWmLfH3iEqx2gy8f2B6zjru",
    program: "spl-stake-pool",
  },
  {
    id: "jagpool",
    name: "JagPool",
    stakePoolAddress: "jagEdDepWUgexiu4jxojcRWcVKKwFqgZBBuAoGu2BxM",
    program: "spl-stake-pool",
  },
  {
    id: "stke",
    name: "STKE",
    stakePoolAddress: "StKeDUdSu7jMSnPJ1MPqDnk3RdEwD2QbJaisHMebGhw",
    program: "spl-stake-pool",
  },
  {
    id: "marinade",
    name: "Marinade",
    stakePoolAddress: "8szGkuLTAux9XMgZ2vtY39jVSowEcpBfFfD8hXSEqdGC",
    program: "marinade",
  },
  {
    id: "shinobi",
    name: "Shinobi",
    stakePoolAddress: "spp1mo6shdcrRyqDK2zdurJ8H5uttZE6H6oVjHxN1QN",
    program: "spl-stake-pool",
  },
  {
    id: "edgevana",
    name: "Edgevana",
    stakePoolAddress: "edgejNWAqkePLpi5sHRxT9vHi7u3kSHP9cocABPKiWZ",
    program: "spl-stake-pool",
  },
  {
    id: "definity",
    name: "Definity",
    stakePoolAddress: "Bvbu55B991evqqhLtKcyTZjzQ4EQzRUwtf9T4CcpMmPL",
    program: "sanctum-multi",
  },
  {
    id: "indiesol",
    name: "IndieSOL",
    stakePoolAddress: "74dxJToX8wgJAueLQNVhSbbQkNd9qeVp6m9mts6M7cUb", // Layer33 collective, LST mint: L33mHftsNpaj39z1omnGbGbuA5eKqSsbmr91rjTod48
    program: "spl-stake-pool",
  },
  {
    id: "sharkpool",
    name: "SharkPool",
    stakePoolAddress: "HQLwnQJFH7t9nBTP4vbdW4eHy62aecfDnj8te8VzqkFL",
    program: "spl-stake-pool",
  },
];
