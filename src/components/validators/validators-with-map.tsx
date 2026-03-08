"use client";

import { useState } from "react";
import { GeoHeatmap, type CountryData } from "@/components/validators/geo-heatmap";
import { ValidatorTable } from "@/components/validators/validator-table";

interface ValidatorRow {
  pubkey: string;
  name: string | null;
  country: string | null;
  city: string | null;
  datacenter: string | null;
  client: string | null;
  sfdpStatus: string | null;
  activeStake: number;
  commission: number;
  skipRate: number | null;
  apy: number | null;
  wizScore: number | null;
  stakeTier: string | null;
  isSuperminority: boolean | null;
  isSandwich: boolean;
  sandwichPercent: number | null;
  pools: { poolId: string; poolName: string; delegatedSol: number }[];
}

interface Props {
  validators: ValidatorRow[];
  countryData: CountryData[];
}

export function ValidatorsWithMap({ validators, countryData }: Props) {
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);

  return (
    <>
      <div className="gradient-border bg-white/[0.03] rounded-xl overflow-hidden backdrop-blur-sm p-4 sm:p-6 border border-white/[0.06]">
        <h2 className="text-sm font-medium text-beige/50 uppercase tracking-wider mb-4">
          Validator Geography
          <span className="text-[10px] text-beige/25 ml-2 normal-case tracking-normal">Click a country to filter</span>
        </h2>
        <GeoHeatmap
          data={countryData}
          selectedCountry={selectedCountry}
          onCountryClick={setSelectedCountry}
        />
      </div>

      <div className="gradient-border bg-white/[0.02] rounded-xl overflow-hidden backdrop-blur-sm mt-6">
        <ValidatorTable validators={validators} countryFilter={selectedCountry} />
      </div>
    </>
  );
}
