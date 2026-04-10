import indexData from "@/database/index.json";

export interface IndexEntry {
  term: string;
  pages: number[];
}

export interface SearchResult {
  term: string;
  pages: number[];
  score: number;
  matchType: "exact" | "prefix" | "contains" | "fuzzy";
}

// ─── 正規化ユーティリティ ──────────────────────────────────────────────────────

/** NFKC正規化 → 小文字 → スペース除去 */
function normalize(str: string): string {
  return str
    .normalize("NFKC")   // 全角→半角、合成文字を統一
    .toLowerCase()
    .replace(/[\s\u3000・　]/g, ""); // 半角・全角スペース、中点を除去
}

/** カタカナ → ひらがな */
function katakanaToHiragana(str: string): string {
  return str.replace(/[\u30A1-\u30F6]/g, (ch) =>
    String.fromCharCode(ch.charCodeAt(0) - 0x60)
  );
}

/** ひらがな → カタカナ */
function hiraganaToKatakana(str: string): string {
  return str.replace(/[\u3041-\u3096]/g, (ch) =>
    String.fromCharCode(ch.charCodeAt(0) + 0x60)
  );
}

/**
 * 複数の正規化形式を返す。いずれかがヒットすれば「揺らぎ対応」とみなす。
 */
function normalizedVariants(str: string): string[] {
  const base = normalize(str);
  return [
    base,
    katakanaToHiragana(base),
    hiraganaToKatakana(base),
  ];
}

// ─── Levenshtein 距離 ─────────────────────────────────────────────────────────

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  // 長すぎる文字列は計算コストが高いため早期リターン
  if (Math.abs(m - n) > 5) return Math.abs(m - n);
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

// ─── インデックスをメモリにキャッシュ ─────────────────────────────────────────

const entries: IndexEntry[] = indexData.index as IndexEntry[];

/** 検索用に正規化済みバリアントを事前計算してキャッシュ */
const normalizedEntries = entries.map((entry) => ({
  entry,
  variants: normalizedVariants(entry.term),
}));

// ─── 検索本体 ──────────────────────────────────────────────────────────────────

/**
 * @param query  ユーザー入力の検索ワード
 * @param limit  返す件数の上限（デフォルト 20）
 */
export function search(query: string, limit = 20): SearchResult[] {
  if (!query.trim()) return [];

  const qVariants = normalizedVariants(query);

  const scored: SearchResult[] = [];

  for (const { entry, variants: termVariants } of normalizedEntries) {
    let bestScore = -Infinity;
    let bestMatchType: SearchResult["matchType"] = "fuzzy";

    for (const q of qVariants) {
      for (const t of termVariants) {
        // 完全一致
        if (t === q) {
          bestScore = 100;
          bestMatchType = "exact";
          break;
        }
        // 前方一致
        if (t.startsWith(q) || q.startsWith(t)) {
          const s = 80 - Math.abs(t.length - q.length);
          if (s > bestScore) { bestScore = s; bestMatchType = "prefix"; }
        }
        // 部分一致
        if (t.includes(q) || q.includes(t)) {
          const s = 60 - Math.abs(t.length - q.length);
          if (s > bestScore) { bestScore = s; bestMatchType = "contains"; }
        }
        // 編集距離（クエリが3文字以上の場合のみ）
        if (q.length >= 3) {
          const dist = levenshtein(q, t);
          const maxLen = Math.max(q.length, t.length);
          // 許容距離: クエリ長の30%以内
          const threshold = Math.ceil(maxLen * 0.3);
          if (dist <= threshold) {
            const s = 40 - dist * 5;
            if (s > bestScore) { bestScore = s; bestMatchType = "fuzzy"; }
          }
        }
      }
      if (bestScore === 100) break; // 完全一致が見つかれば即終了
    }

    if (bestScore > -Infinity) {
      scored.push({
        term: entry.term,
        pages: entry.pages,
        score: bestScore,
        matchType: bestMatchType,
      });
    }
  }

  // スコア降順 → 用語の昇順（辞書順）でソート
  scored.sort((a, b) => b.score - a.score || a.term.localeCompare(b.term));

  return scored.slice(0, limit);
}
