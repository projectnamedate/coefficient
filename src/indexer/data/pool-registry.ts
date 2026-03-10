export interface PoolRegistryEntry {
  id: string;
  name: string;
  lstTicker: string; // e.g. "JitoSOL", "mSOL"
  stakePoolAddress: string; // on-chain stake pool account (base58)
  program: "spl-stake-pool" | "marinade" | "sanctum-multi";
}

// On-chain stake pool addresses for the tracked multi-validator pools
// Sources: pool docs, solanacompass.com/stake-pools, solscan.io, github.com/SOFZP/Solana-Stake-Pools-Research
export const POOL_REGISTRY: PoolRegistryEntry[] = [
  {
    id: "jito",
    name: "Jito",
    lstTicker: "JitoSOL",
    stakePoolAddress: "Jito4APyf642JPZPx3hGc6WWJ8zPKtRbRs4P815Awbb",
    program: "spl-stake-pool",
  },
  {
    id: "doublezero",
    name: "DoubleZero",
    lstTicker: "dSOL",
    stakePoolAddress: "3fV1sdGeXaNEZj6EPDTpub82pYxcRXwt2oie6jkSzeWi",
    program: "spl-stake-pool",
  },
  {
    id: "blazestake",
    name: "BlazeStake",
    lstTicker: "bSOL",
    stakePoolAddress: "stk9ApL5HeVAwPLr3TLhDXdZS8ptVu7zp6ov8HFDuMi",
    program: "spl-stake-pool",
  },
  {
    id: "jpool",
    name: "JPool",
    lstTicker: "JSOL",
    stakePoolAddress: "CtMyWsrUtAwXWiGr9WjHT5fC3p3fgV8cyGpLTo2LJzG1",
    program: "spl-stake-pool",
  },
  {
    id: "phase",
    name: "Phase Delegation",
    lstTicker: "phaseSOL",
    stakePoolAddress: "aero2ePURjuEgLKTzcUmF6RypBncBGd7pMUYCoSsVJ6",
    program: "spl-stake-pool",
  },
  {
    id: "vault",
    name: "Vault",
    lstTicker: "vSOL",
    stakePoolAddress: "Fu9BYC6tWBo1KMKaP3CFoKfRhqv9akmy3DuYwnCyWiyC",
    program: "spl-stake-pool",
  },
  {
    id: "dynosol",
    name: "dynoSOL",
    lstTicker: "dynoSOL",
    stakePoolAddress: "DpooSqZRL3qCmiq82YyB4zWmLfH3iEqx2gy8f2B6zjru",
    program: "spl-stake-pool",
  },
  {
    id: "jagpool",
    name: "JagPool",
    lstTicker: "jagSOL",
    stakePoolAddress: "jagEdDepWUgexiu4jxojcRWcVKKwFqgZBBuAoGu2BxM",
    program: "spl-stake-pool",
  },
  {
    id: "stke",
    name: "STKE",
    lstTicker: "stkeSOL",
    stakePoolAddress: "StKeDUdSu7jMSnPJ1MPqDnk3RdEwD2QbJaisHMebGhw",
    program: "spl-stake-pool",
  },
  {
    id: "marinade",
    name: "Marinade",
    lstTicker: "mSOL",
    stakePoolAddress: "8szGkuLTAux9XMgZ2vtY39jVSowEcpBfFfD8hXSEqdGC",
    program: "marinade",
  },
  {
    id: "shinobi",
    name: "Shinobi",
    lstTicker: "shinSOL",
    stakePoolAddress: "spp1mo6shdcrRyqDK2zdurJ8H5uttZE6H6oVjHxN1QN",
    program: "spl-stake-pool",
  },
  {
    id: "edgevana",
    name: "Edgevana",
    lstTicker: "edgeSOL",
    stakePoolAddress: "edgejNWAqkePLpi5sHRxT9vHi7u3kSHP9cocABPKiWZ",
    program: "spl-stake-pool",
  },
  {
    id: "definity",
    name: "Definity",
    lstTicker: "dfSOL",
    stakePoolAddress: "Bvbu55B991evqqhLtKcyTZjzQ4EQzRUwtf9T4CcpMmPL",
    program: "sanctum-multi",
  },
  {
    id: "indiesol",
    name: "IndieSOL",
    lstTicker: "indSOL",
    stakePoolAddress: "74dxJToX8wgJAueLQNVhSbbQkNd9qeVp6m9mts6M7cUb", // Layer33 collective, LST mint: L33mHftsNpaj39z1omnGbGbuA5eKqSsbmr91rjTod48
    program: "spl-stake-pool",
  },
  {
    id: "sharkpool",
    name: "SharkPool",
    lstTicker: "sharkSOL",
    stakePoolAddress: "HQLwnQJFH7t9nBTP4vbdW4eHy62aecfDnj8te8VzqkFL",
    program: "spl-stake-pool",
  },
];
