import { NextRequest, NextResponse } from "next/server";
import { search } from "@/lib/search";

export const runtime = "nodejs"; // index.json をファイルシステムから読むので Node.js ランタイム

/**
 * GET /api/search?q=<クエリ>&limit=<件数>
 *
 * レスポンス例:
 * {
 *   "query": "BigQuery",
 *   "results": [
 *     { "term": "BigQuery", "pages": [27, 135, 142, 207, 242, 275], "matchType": "exact" },
 *     ...
 *   ],
 *   "total": 3
 * }
 */
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const query = searchParams.get("q") ?? "";
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "20", 10), 100);

  if (!query.trim()) {
    return NextResponse.json(
      { error: "クエリパラメータ q が必要です" },
      { status: 400 }
    );
  }

  const results = search(query, limit);

  return NextResponse.json({
    query,
    results: results.map(({ term, pages, matchType }) => ({
      term,
      pages,
      matchType,
    })),
    total: results.length,
  });
}

/**
 * POST /api/search
 * Body: { "q": "<クエリ>", "limit": 20 }
 *
 * フロントエンドから JSON で叩く場合はこちらも使用可能
 */
export async function POST(req: NextRequest) {
  let body: { q?: string; limit?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "不正な JSON です" }, { status: 400 });
  }

  const query = body.q ?? "";
  const limit = Math.min(body.limit ?? 20, 100);

  if (!query.trim()) {
    return NextResponse.json(
      { error: "フィールド q が必要です" },
      { status: 400 }
    );
  }

  const results = search(query, limit);

  return NextResponse.json({
    query,
    results: results.map(({ term, pages, matchType }) => ({
      term,
      pages,
      matchType,
    })),
    total: results.length,
  });
}
