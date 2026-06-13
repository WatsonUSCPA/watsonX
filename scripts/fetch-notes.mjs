// =============================================================
// note記事の自動取得スクリプト
// -------------------------------------------------------------
// noteの公開API(creators contents)を最後のページまで巡回し、
// assets/data/notes.json を生成します。
//
//   使い方:  node scripts/fetch-notes.mjs <urlname>
//   例:      node scripts/fetch-notes.mjs wtcajptc
//
// ※ このスクリプトはインターネット接続が必要なため、
//    GitHub Actions のランナー上で実行されます。
// ※ 取得0件のときは既存の notes.json を上書きしません
//    （ネットワーク不調で記事一覧が消えるのを防止）。
// =============================================================
import { writeFile, readFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";

const URLNAME = process.argv[2] || "wtcajptc";
const OUT = "assets/data/notes.json";
const MAX_PAGES = 60; // 安全弁（1ページ≈6件なので300本でも十分）
const UA = "Mozilla/5.0 (compatible; watsonX-notes-bot/1.0; +https://watsonuscpa.github.io/watsonX/)";

function pick(obj, keys) {
  for (const k of keys) if (obj && obj[k] != null && obj[k] !== "") return obj[k];
  return null;
}

function normalize(c) {
  const title = pick(c, ["name", "title"]);
  let url = pick(c, ["noteUrl", "note_url", "url"]);
  const key = pick(c, ["key", "id"]);
  if (!url && key) url = `https://note.com/${URLNAME}/n/${key}`;
  const publishAt = pick(c, ["publishAt", "publish_at", "publishedAt"]);
  const eyecatch = pick(c, ["eyecatch", "thumbnail"]);
  // ハッシュタグ（補助。形が版で違うので両対応）
  let hashtags = [];
  const raw = c.hashtags || c.hash_tags || [];
  if (Array.isArray(raw)) {
    hashtags = raw
      .map((h) => (h && h.hashtag ? h.hashtag.name : h && h.name ? h.name : typeof h === "string" ? h : null))
      .filter(Boolean);
  }
  if (!title || !url) return null;
  return { title: String(title).trim(), url, publishAt: publishAt || null, eyecatch: eyecatch || null, hashtags };
}

async function fetchPage(page) {
  const api = `https://note.com/api/v2/creators/${URLNAME}/contents?kind=note&page=${page}`;
  // 1リクエストが応答しないと無人ジョブが固まるため、20秒で打ち切る
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 20000);
  let res;
  try {
    res = await fetch(api, { headers: { "User-Agent": UA, Accept: "application/json" }, signal: ctrl.signal });
  } finally {
    clearTimeout(timer);
  }
  if (!res.ok) throw new Error(`HTTP ${res.status} on page ${page}`);
  const json = await res.json();
  const d = json.data || json;
  const contents = d.contents || d.notes || [];
  const isLast = d.isLastPage === true || contents.length === 0;
  return { contents, isLast, totalCount: d.totalCount ?? d.total_count ?? null };
}

async function main() {
  const collected = [];
  const seen = new Set();
  let totalCount = null;

  for (let page = 1; page <= MAX_PAGES; page++) {
    let r;
    try {
      r = await fetchPage(page);
    } catch (e) {
      console.error(`[fetch-notes] ページ${page}の取得に失敗: ${e.message}`);
      break;
    }
    if (r.totalCount != null) totalCount = r.totalCount;
    for (const c of r.contents) {
      const n = normalize(c);
      if (n && !seen.has(n.url)) { seen.add(n.url); collected.push(n); }
    }
    console.error(`[fetch-notes] page ${page}: +${r.contents.length} (累計 ${collected.length})`);
    if (r.isLast) break;
    await new Promise((res) => setTimeout(res, 350)); // 礼儀的な間隔
  }

  if (collected.length === 0) {
    console.error("[fetch-notes] 取得0件。既存ファイルを保持して終了します。");
    process.exitCode = 0;
    return;
  }

  // 公開日の新しい順
  collected.sort((a, b) => new Date(b.publishAt || 0) - new Date(a.publishAt || 0));

  const out = {
    source: `https://note.com/${URLNAME}`,
    updatedAt: new Date().toISOString(),
    count: collected.length,
    totalCount,
    articles: collected,
  };

  await mkdir(dirname(OUT), { recursive: true });
  await writeFile(OUT, JSON.stringify(out, null, 2) + "\n", "utf8");
  console.error(`[fetch-notes] 完了: ${collected.length}件を ${OUT} に書き出しました。`);
}

main().catch((e) => { console.error(e); process.exit(1); });
