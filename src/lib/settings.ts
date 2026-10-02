import "server-only";
import { totalumSdk } from "@/lib/totalum";
import { DEFAULT_RANKING_WEIGHTS, type RankingWeights } from "@/lib/types";

export async function readSetting(key: string): Promise<string | null> {
  const result = await totalumSdk.crud.query("admin_settings", { _filter: { setting_key: key }, _limit: 1 });
  if (result.errors) {
    console.error("[settings] read failed for", key, result.errors);
    throw new Error(JSON.stringify(result.errors));
  }
  const row = (result.data || [])[0] as any;
  return row ? String(row.setting_value ?? "") : null;
}

export async function upsertSetting(key: string, value: string, description?: string): Promise<void> {
  const result = await totalumSdk.crud.query("admin_settings", { _filter: { setting_key: key }, _limit: 1 });
  const row = (result.data || [])[0] as any;
  const write = row
    ? await totalumSdk.crud.editRecordById("admin_settings", row._id, { setting_value: value })
    : await totalumSdk.crud.createRecord("admin_settings", { setting_key: key, setting_value: value, description: description || "" });
  if (write.errors) {
    console.error("[settings] write failed for", key, write.errors);
    throw new Error(JSON.stringify(write.errors));
  }
}

export const RANKING_WEIGHTS_KEY = "affiliate_ranking_weights";

/** Validated weights; anything malformed falls back to the documented defaults. */
export function normalizeWeights(input: any): RankingWeights {
  const out = { ...DEFAULT_RANKING_WEIGHTS };
  for (const key of Object.keys(out) as (keyof RankingWeights)[]) {
    const value = Number(input?.[key]);
    if (Number.isFinite(value) && value >= 0 && value <= 100) out[key] = Math.round(value);
  }
  return out;
}

export async function getRankingWeights(): Promise<RankingWeights> {
  try {
    const raw = await readSetting(RANKING_WEIGHTS_KEY);
    return normalizeWeights(raw ? JSON.parse(raw) : {});
  } catch (err) {
    console.error("[settings] ranking weights unreadable, using defaults:", err);
    return { ...DEFAULT_RANKING_WEIGHTS };
  }
}
