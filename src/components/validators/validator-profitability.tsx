"use client";

import { useState } from "react";
import type { TrilliumEpochData } from "@/lib/trillium";
import { formatSolPrecise as formatSol } from "@/lib/format";

function Row({ label, value, color = "text-beige/60", sub }: {
  label: string;
  value: string;
  color?: string;
  sub?: string;
}) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <div>
        <span className="text-xs text-beige/50">{label}</span>
        {sub && <span className="text-[10px] text-beige/25 ml-1.5">{sub}</span>}
      </div>
      <span className={`text-sm font-mono tabular-nums ${color}`}>{value}</span>
    </div>
  );
}

export function ValidatorProfitability({ epochs }: { epochs: TrilliumEpochData[] }) {
  const sorted = [...epochs].sort((a, b) => b.epoch - a.epoch);
  const [selected, setSelected] = useState(0);

  if (sorted.length === 0) return null;

  const e = sorted[selected];

  const netIncome =
    e.validator_inflation_reward +
    e.validator_priority_fees +
    e.total_block_rewards_after_burn +
    e.mev_to_validator -
    e.vote_cost;

  return (
    <div>
      <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
        <h2 className="text-sm font-medium text-beige/50 uppercase tracking-wider">
          Epoch Profitability
        </h2>
        <a
          href="https://trillium.so"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[10px] text-beige/25 hover:text-lavender/60 transition-colors font-mono"
        >
          via Trillium API
        </a>
      </div>

      {/* Epoch selector */}
      <div className="px-6 pt-4 pb-2">
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {sorted.map((ep, i) => (
            <button
              key={ep.epoch}
              onClick={() => setSelected(i)}
              className={`shrink-0 px-2.5 py-1 rounded text-xs font-mono transition-all ${
                i === selected
                  ? "bg-lavender/15 text-lavender border border-lavender/20"
                  : "bg-white/[0.03] text-beige/40 border border-white/[0.06] hover:text-beige/60"
              }`}
            >
              {ep.epoch}
            </button>
          ))}
        </div>
      </div>

      {/* Summary */}
      <div className="px-6 pb-3">
        <div className="grid grid-cols-3 gap-3 py-3">
          <div className="text-center">
            <p className="text-[10px] text-beige/30 uppercase tracking-wider">Revenue</p>
            <p className="text-lg font-bold text-white font-mono mt-0.5">
              {formatSol(
                e.validator_inflation_reward +
                e.validator_priority_fees +
                e.total_block_rewards_after_burn +
                e.mev_to_validator
              )}
            </p>
            <p className="text-[10px] text-beige/25">SOL</p>
          </div>
          <div className="text-center">
            <p className="text-[10px] text-beige/30 uppercase tracking-wider">Costs</p>
            <p className="text-lg font-bold text-score-bad font-mono mt-0.5">
              {formatSol(e.vote_cost)}
            </p>
            <p className="text-[10px] text-beige/25">SOL</p>
          </div>
          <div className="text-center">
            <p className="text-[10px] text-beige/30 uppercase tracking-wider">Net Income</p>
            <p className={`text-lg font-bold font-mono mt-0.5 ${netIncome >= 0 ? "text-score-good" : "text-score-bad"}`}>
              {formatSol(netIncome)}
            </p>
            <p className="text-[10px] text-beige/25">SOL</p>
          </div>
        </div>
      </div>

      {/* Breakdown */}
      <div className="px-6 pb-5">
        <div className="border-t border-white/5 pt-3">
          <p className="text-[10px] text-beige/30 uppercase tracking-wider mb-2">Revenue Breakdown</p>
          <Row
            label="Inflation Commission"
            value={`${formatSol(e.validator_inflation_reward)} SOL`}
            color="text-score-good"
            sub={`${e.commission}% of staker rewards`}
          />
          <Row
            label="Block Rewards"
            value={`${formatSol(e.total_block_rewards_after_burn)} SOL`}
            color="text-score-good"
            sub={`${e.blocks_produced} blocks`}
          />
          <Row
            label="Priority Fees"
            value={`${formatSol(e.validator_priority_fees)} SOL`}
            color="text-score-good"
          />
          <Row
            label="MEV Commission"
            value={`${formatSol(e.mev_to_validator)} SOL`}
            color="text-score-good"
            sub={e.mev_commission > 0 ? `${e.mev_commission}% MEV commission` : "0% MEV comm."}
          />
          <Row
            label="Jito Tips"
            value={`${formatSol(e.total_jito_tips)} SOL`}
            color="text-beige/40"
            sub="included in block rewards"
          />
        </div>

        <div className="border-t border-white/5 pt-3 mt-2">
          <p className="text-[10px] text-beige/30 uppercase tracking-wider mb-2">Costs</p>
          <Row
            label="Vote Transaction Costs"
            value={`-${formatSol(e.vote_cost)} SOL`}
            color="text-score-bad"
            sub="per epoch"
          />
        </div>

        <div className="border-t border-white/5 pt-3 mt-2">
          <p className="text-[10px] text-beige/30 uppercase tracking-wider mb-2">Performance</p>
          <Row label="Leader Slots" value={e.leader_slots.toString()} />
          <Row label="Blocks Produced" value={e.blocks_produced.toString()} />
          <Row label="Skip Rate" value={`${(parseFloat(e.skip_rate) * 100).toFixed(1)}%`} />
          <Row label="Stake" value={`${formatSol(e.activated_stake)} SOL`} />
        </div>

        <div className="border-t border-white/5 pt-3 mt-2">
          <p className="text-[10px] text-beige/30 uppercase tracking-wider mb-2">APY</p>
          <Row label="Validator APY" value={`${e.validator_total_apy.toFixed(2)}%`} color="text-lavender" />
          <Row label="Delegator APY" value={`${e.delegator_total_apy.toFixed(2)}%`} color="text-lavender" />
          <Row label="Total APY" value={`${e.total_overall_apy.toFixed(2)}%`} color="text-white" />
        </div>
      </div>
    </div>
  );
}
