/* =============================================================
 * Watson US CPA – note記事データ共有ライブラリ
 * -------------------------------------------------------------
 *  assets/data/notes.json（GitHub Actionsが自動更新）を読み込み、
 *  ・match(keywords)  … タイトルのキーワードで関連記事を抽出
 *  ・search(query)    … フリーワード検索
 *  を提供します。トップページ・IRAツールの両方から利用します。
 * ============================================================= */
window.WNOTES = (function () {
  "use strict";

  // 自分(notes.js)のsrcから data/notes.json の場所を推定（/ と /ira/ 両対応）
  var src = (document.currentScript && document.currentScript.src) || "";
  var dataUrl = src.replace(/js\/notes\.js.*$/, "data/notes.json");
  if (!dataUrl || dataUrl === src) dataUrl = "assets/data/notes.json";

  var state = { loaded: false, articles: [], updatedAt: null, totalCount: null };

  function norm(s) { return String(s == null ? "" : s).toLowerCase(); }

  var ready = fetch(dataUrl, { cache: "no-cache" })
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (j) {
      if (j && Array.isArray(j.articles)) {
        state.articles = j.articles;
        state.updatedAt = j.updatedAt || null;
        state.totalCount = j.totalCount != null ? j.totalCount : (j.count != null ? j.count : j.articles.length);
      }
      state.loaded = true;
      return state;
    })
    .catch(function () { state.loaded = true; return state; });

  function rank(scored, limit) {
    scored.sort(function (p, q) {
      return q.score - p.score || (new Date(q.a.publishAt || 0) - new Date(p.a.publishAt || 0));
    });
    return scored.slice(0, limit).map(function (x) { return x.a; });
  }

  // タイトル内にキーワードが含まれる記事を、ヒット数→新しさ順で返す
  function match(keywords, limit) {
    if (!keywords || !keywords.length) return [];
    var kw = keywords.map(norm).filter(Boolean);
    var scored = [];
    state.articles.forEach(function (a) {
      var t = norm(a.title);
      var score = 0;
      kw.forEach(function (k) { if (t.indexOf(k) >= 0) score++; });
      if (score > 0) scored.push({ a: a, score: score });
    });
    return rank(scored, limit || 4);
  }

  // フリーワード検索（空 なら新着順）
  function search(query, limit) {
    var q = norm(query).trim();
    if (!q) return state.articles.slice(0, limit || 24);
    var terms = q.split(/[\s　]+/).filter(Boolean);
    var scored = [];
    state.articles.forEach(function (a) {
      var t = norm(a.title);
      var score = 0;
      terms.forEach(function (k) { if (t.indexOf(k) >= 0) score++; });
      if (score > 0) scored.push({ a: a, score: score });
    });
    return rank(scored, limit || 24);
  }

  return { ready: ready, state: state, match: match, search: search };
})();
