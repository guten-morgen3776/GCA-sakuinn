"use client";

import { useState, useRef, KeyboardEvent } from "react";

// API レスポンスの型
interface Result {
  term: string;
  pages: number[];
  matchType: "exact" | "prefix" | "contains" | "fuzzy";
}

interface ApiResponse {
  query: string;
  results: Result[];
  total: number;
}

// matchType の日本語ラベルとカラー
const MATCH_LABEL: Record<Result["matchType"], { label: string; className: string }> = {
  exact:    { label: "完全一致", className: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  prefix:   { label: "前方一致", className: "bg-sky-100 text-sky-700 border-sky-200" },
  contains: { label: "部分一致", className: "bg-violet-100 text-violet-700 border-violet-200" },
  fuzzy:    { label: "あいまい", className: "bg-amber-100 text-amber-700 border-amber-200" },
};

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [response, setResponse] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function searchWithQuery(q: string) {
    if (!q.trim()) return;
    setQuery(q);
    setLoading(true);
    setError(null);
    setResponse(null);

    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q.trim())}&limit=50`);
      if (!res.ok) throw new Error("検索に失敗しました");
      const data: ApiResponse = await res.json();
      setResponse(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "エラーが発生しました");
    } finally {
      setLoading(false);
    }
  }

  function handleSearch() {
    searchWithQuery(query);
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") handleSearch();
  }

  function handleClear() {
    setQuery("");
    setResponse(null);
    setError(null);
    inputRef.current?.focus();
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">

      {/* ヘッダー */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-sky-700 tracking-tight">
          GCA 索引検索
        </h1>
        <p className="text-slate-500 mt-1 text-sm">
          Google Cloud の索引からキーワードを検索します
        </p>
      </div>

      {/* 検索ボックス */}
      <div className="flex gap-2 mb-6">
        <div className="relative flex-1">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="例: BigQuery、クラウドストレージ、IAM …"
            className="w-full px-4 py-3 pr-10 rounded-xl border-2 border-sky-200 bg-white
                       text-slate-800 placeholder-slate-400 text-base
                       focus:outline-none focus:border-sky-400 transition"
          />
          {/* クリアボタン */}
          {query && (
            <button
              onClick={handleClear}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400
                         hover:text-slate-600 transition text-xl leading-none"
              aria-label="クリア"
            >
              ×
            </button>
          )}
        </div>
        <button
          onClick={handleSearch}
          disabled={loading || !query.trim()}
          className="px-5 py-3 rounded-xl bg-sky-500 text-white font-semibold text-base
                     hover:bg-sky-600 active:bg-sky-700 disabled:opacity-40
                     transition shadow-sm whitespace-nowrap"
        >
          {loading ? "検索中…" : "検索"}
        </button>
      </div>

      {/* エラー */}
      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm">
          {error}
        </div>
      )}

      {/* 結果ヘッダー */}
      {response && (
        <div className="mb-3 text-slate-500 text-sm">
          <span className="font-semibold text-slate-700">「{response.query}」</span>
          {" "}の検索結果：
          <span className="font-semibold text-sky-600">{response.total} 件</span>
        </div>
      )}

      {/* 結果なし */}
      {response && response.total === 0 && (
        <div className="text-center py-12 text-slate-400">
          <div className="text-4xl mb-3">🔍</div>
          <p>該当する用語が見つかりませんでした</p>
          <p className="text-sm mt-1">別のキーワードで試してみてください</p>
        </div>
      )}

      {/* 結果リスト */}
      {response && response.results.length > 0 && (
        <ul className="space-y-3">
          {response.results.map((result) => {
            const match = MATCH_LABEL[result.matchType];
            return (
              <li
                key={result.term}
                className="bg-white rounded-xl border border-slate-200 px-5 py-4
                           shadow-sm hover:shadow-md transition"
              >
                <div className="flex items-start justify-between gap-3">
                  {/* 用語名 */}
                  <span className="font-semibold text-slate-800 text-base leading-snug">
                    {result.term}
                  </span>
                  {/* 一致種別バッジ */}
                  <span
                    className={`shrink-0 text-xs font-medium px-2 py-0.5 rounded-full
                                border ${match.className}`}
                  >
                    {match.label}
                  </span>
                </div>

                {/* ページ番号 */}
                <div className="mt-2 flex flex-wrap gap-1.5 items-center">
                  <span className="text-xs text-slate-400 mr-1">ページ</span>
                  {result.pages.map((page) => (
                    <span
                      key={page}
                      className="inline-block px-2.5 py-0.5 rounded-lg
                                 bg-sky-50 text-sky-700 text-sm font-medium
                                 border border-sky-200"
                    >
                      {page}
                    </span>
                  ))}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {/* 初期状態のヒント */}
      {!response && !loading && (
        <div className="text-center py-16 text-slate-400">
          <div className="text-5xl mb-4">📖</div>
          <p className="text-base">キーワードを入力して検索してください</p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            {["BigQuery", "IAM", "Cloud Run", "ストレージ", "VPC"].map((hint) => (
              <button
                key={hint}
                onClick={() => searchWithQuery(hint)}
                className="px-3 py-1.5 rounded-full bg-white border border-sky-200
                           text-sky-600 text-sm hover:bg-sky-50 transition shadow-sm"
              >
                {hint}
              </button>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
