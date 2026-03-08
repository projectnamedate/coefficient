const BASE = "https://api.trillium.so";

export interface TrilliumEpochData {
  epoch: number;
  activated_stake: number;
  commission: number;
  mev_commission: number;
  leader_slots: number;
  blocks_produced: number;
  skip_rate: string;
  // Revenue
  validator_inflation_reward: number;
  mev_to_validator: number;
  mev_to_stakers: number;
  mev_earned: number;
  total_block_rewards_after_burn: number;
  total_jito_tips: number;
  validator_priority_fees: number;
  delegator_priority_fees: number;
  rewards: number;
  // Costs
  vote_cost: number;
  // APY
  validator_total_apy: number;
  delegator_total_apy: number;
  total_overall_apy: number;
  delegator_inflation_apy: number;
  delegator_mev_apy: number;
  delegator_compound_total_apy: number;
  // Context
  name: string;
  identity_pubkey: string;
  vote_account_pubkey: string;
}

export async function getValidatorProfitability(
  pubkey: string
): Promise<TrilliumEpochData[]> {
  try {
    const res = await fetch(`${BASE}/validator_rewards/${pubkey}`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return [];
    const data = await res.json();
    if (!Array.isArray(data)) return [];
    return data.map((d: any) => ({
      epoch: d.epoch,
      activated_stake: d.activated_stake ?? 0,
      commission: d.commission ?? 0,
      mev_commission: d.mev_commission ?? 0,
      leader_slots: d.leader_slots ?? 0,
      blocks_produced: d.blocks_produced ?? 0,
      skip_rate: d.skip_rate ?? "0",
      validator_inflation_reward: d.validator_inflation_reward ?? 0,
      mev_to_validator: d.mev_to_validator ?? 0,
      mev_to_stakers: d.mev_to_stakers ?? 0,
      mev_earned: d.mev_earned ?? 0,
      total_block_rewards_after_burn: d.total_block_rewards_after_burn ?? 0,
      total_jito_tips: d.total_jito_tips ?? 0,
      validator_priority_fees: d.validator_priority_fees ?? 0,
      delegator_priority_fees: d.delegator_priority_fees ?? 0,
      rewards: d.rewards ?? 0,
      vote_cost: d.vote_cost ?? 0,
      validator_total_apy: d.validator_total_apy ?? 0,
      delegator_total_apy: d.delegator_total_apy ?? 0,
      total_overall_apy: d.total_overall_apy ?? 0,
      delegator_inflation_apy: d.delegator_inflation_apy ?? 0,
      delegator_mev_apy: d.delegator_mev_apy ?? 0,
      delegator_compound_total_apy: d.delegator_compound_total_apy ?? 0,
      name: d.name ?? "",
      identity_pubkey: d.identity_pubkey ?? pubkey,
      vote_account_pubkey: d.vote_account_pubkey ?? "",
    }));
  } catch {
    return [];
  }
}
