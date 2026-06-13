/* =============================================================
 * Watson US CPA – 診断エンジン
 * content.js の FLOW / ARTICLES を読み取り、質問→結果を描画します。
 * 通常このファイルを編集する必要はありません。
 * ============================================================= */
(function () {
  "use strict";

  var data = window.WCONTENT;
  var mount = document.getElementById("diagnosis-app");
  if (!data || !mount) return;

  var FLOW = data.FLOW;
  var ARTICLES = data.ARTICLES;
  var KEYWORDS = data.KEYWORDS || {};
  var NOTE_PROFILE = data.NOTE_PROFILE;
  var CONTACT_URL = data.CONTACT_URL;

  // 訪問した質問ノードの履歴（戻る用）
  var history = ["start"];
  // 結果に到達するまでのおおよその深さ（プログレス表示用）
  var APPROX_STEPS = 2;

  function el(tag, className, html) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (html != null) node.innerHTML = html;
    return node;
  }

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function renderProgress(step, total) {
    var wrap = el("div", "dx-progress");
    var bar = el("div", "dx-progress-bar");
    var fill = el("div", "dx-progress-fill");
    var pct = Math.min(100, Math.round((step / total) * 100));
    fill.style.width = pct + "%";
    bar.appendChild(fill);
    wrap.appendChild(bar);
    wrap.appendChild(el("span", "dx-step-label", "ステップ " + step + " / " + total));
    return wrap;
  }

  function renderBranch(nodeId) {
    var node = FLOW[nodeId];
    mount.innerHTML = "";

    var card = el("div", "dx-fade");
    card.appendChild(renderProgress(history.length, APPROX_STEPS + 1));
    card.appendChild(el("h3", "dx-question", escapeHtml(node.question)));
    if (node.sub) card.appendChild(el("p", "dx-sub", escapeHtml(node.sub)));

    var opts = el("div", "dx-options");
    node.options.forEach(function (opt) {
      var btn = el("button", "dx-option");
      btn.type = "button";
      var labelHtml = "<span>" + escapeHtml(opt.label) +
        (opt.hint ? "<small>" + escapeHtml(opt.hint) + "</small>" : "") + "</span>";
      btn.innerHTML = labelHtml + '<span class="arrow" aria-hidden="true">→</span>';
      btn.addEventListener("click", function () {
        history.push(opt.next);
        go(opt.next);
      });
      opts.appendChild(btn);
    });
    card.appendChild(opts);

    // 最初の質問以外には「戻る」を出す
    if (history.length > 1) {
      var actions = el("div", "dx-actions");
      actions.appendChild(makeBackButton());
      actions.appendChild(makeRestartButton());
      card.appendChild(actions);
    }

    mount.appendChild(card);
  }

  // notes.json の記事オブジェクト（title/url）→ リンクDOM
  function noteArticleLink(a) {
    var link = el("a", "dx-article");
    link.href = a.url;
    link.target = "_blank";
    link.rel = "noopener";
    var ico = el("span", "ico", "note");
    var meta = el("span", "meta");
    meta.appendChild(el("strong", null, escapeHtml(a.title)));
    meta.appendChild(el("span", null, "noteで読む →"));
    link.appendChild(ico);
    link.appendChild(meta);
    return link;
  }

  function renderResult(nodeId) {
    var node = FLOW[nodeId];
    mount.innerHTML = "";

    var card = el("div", "dx-fade");
    card.appendChild(renderProgress(APPROX_STEPS + 1, APPROX_STEPS + 1));

    if (node.tag) card.appendChild(el("span", "dx-result-tag", escapeHtml(node.tag)));
    card.appendChild(el("h3", "dx-result-title", escapeHtml(node.title)));

    // 節税ポイント
    var ul = el("ul", "dx-points");
    (node.points || []).forEach(function (p) {
      ul.appendChild(el("li", null, escapeHtml(p)));
    });
    card.appendChild(ul);

    // 補足メモ
    if (node.note) {
      card.appendChild(el("div", "dx-disclaimer", escapeHtml(node.note)));
    }

    // 関連note（厳選ピン留め＋タイトル連動の自動補充を「1つのリスト」に統合）
    var NOTE_MAX = 6;
    var shownUrls = {};
    var noteHead = el("p", "dx-articles-head", "📘 もっと深掘りする（関連note）");
    var noteList = el("div", "dx-articles");
    noteHead.style.display = "none";
    card.appendChild(noteHead);
    card.appendChild(noteList);

    function revealNotes() { if (noteList.children.length) noteHead.style.display = ""; }

    // 1) 手書きカタログのうちURLが入っている記事を先頭にピン留め（準備中は出さない）
    (node.articles || []).forEach(function (k) {
      var a = ARTICLES[k];
      if (!a || !a.url || shownUrls[a.url]) return;
      shownUrls[a.url] = true;
      noteList.appendChild(noteArticleLink({ title: a.title, url: a.url }));
    });
    revealNotes();

    // 2) 残り枠を、noteから自動取得した記事でタイトル連動して補充（重複除外）
    if (window.WNOTES) {
      window.WNOTES.ready.then(function () {
        var room = NOTE_MAX - noteList.children.length;
        if (room > 0) {
          window.WNOTES.match(KEYWORDS[nodeId] || [], room + 5)
            .filter(function (a) { return a.url && !shownUrls[a.url]; })
            .slice(0, room)
            .forEach(function (a) { shownUrls[a.url] = true; noteList.appendChild(noteArticleLink(a)); });
        }
        revealNotes();
      });
    }

    // シェア（選んだテーマと結果見出しのみ。個人情報は一切含めない）
    var shareText = "「" + (node.title || "") + "」｜日米の税務をUSCPAが解説 - Watson US CPA";
    card.appendChild(makeShareRow(shareText, "このトピックをXでシェア"));

    // CTA
    var cta = el("div", "dx-cta");
    cta.appendChild(el("p", null, "より詳しい解説は note で発信しています。フォローすると新しい記事が届きます。"));
    var ctaBtn = el("a", "btn btn-primary", "noteをフォローする");
    ctaBtn.href = NOTE_PROFILE;
    ctaBtn.target = "_blank";
    ctaBtn.rel = "noopener";
    cta.appendChild(ctaBtn);
    card.appendChild(cta);

    // 操作
    var actions = el("div", "dx-actions");
    actions.appendChild(makeBackButton());
    actions.appendChild(makeRestartButton());
    card.appendChild(actions);

    // 免責
    card.appendChild(el("div", "dx-disclaimer",
      "※ 表示内容は一般的な情報であり、個別の税務アドバイスではありません。要件・金額基準は年度や状況で変わります。実際のご判断は専門家にご相談ください。"));

    mount.appendChild(card);
  }

  // サイトの正規URL（個人情報を含むhash等は付けない）
  function siteUrl() { return location.origin + location.pathname; }

  function makeShareRow(text, label) {
    var row = el("div", "dx-share");
    var a = el("a", "dx-share-btn");
    a.href = "https://twitter.com/intent/tweet?text=" +
      encodeURIComponent(text) + "&url=" + encodeURIComponent(siteUrl());
    a.target = "_blank";
    a.rel = "noopener";
    a.innerHTML = '<span class="dx-x" aria-hidden="true">𝕏</span>' + escapeHtml(label || "Xでシェア");
    row.appendChild(a);
    return row;
  }

  function makeBackButton() {
    var back = el("button", "dx-back", "← 前に戻る");
    back.type = "button";
    back.addEventListener("click", function () {
      if (history.length > 1) {
        history.pop();
        go(history[history.length - 1]);
      }
    });
    return back;
  }

  function makeRestartButton() {
    var restart = el("button", "dx-restart", "↺ 最初からやり直す");
    restart.type = "button";
    restart.addEventListener("click", function () {
      history = ["start"];
      go("start");
    });
    return restart;
  }

  function go(nodeId) {
    var node = FLOW[nodeId];
    if (!node) {
      mount.innerHTML = '<p class="dx-disclaimer">コンテンツの読み込みに失敗しました。</p>';
      return;
    }
    if (node.result) {
      renderResult(nodeId);
    } else {
      renderBranch(nodeId);
    }
    // モバイルで質問が見えるようカードの先頭へ
    if (history.length > 1 || node.result) {
      var rect = mount.getBoundingClientRect();
      if (rect.top < 0) mount.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  // 初期描画
  go("start");

  // ===== note記事検索（#notesSearch があるページのみ） =====
  (function initNotesSearch() {
    var input = document.getElementById("notesSearch");
    var listEl = document.getElementById("notesList");
    var metaEl = document.getElementById("notesMeta");
    if (!input || !listEl || !window.WNOTES) return;

    function render(query) {
      var items = window.WNOTES.search(query, 24);
      listEl.innerHTML = "";
      items.forEach(function (a) { listEl.appendChild(noteArticleLink(a)); });
      if (metaEl) {
        var total = window.WNOTES.state.totalCount;
        if (!query) {
          metaEl.textContent = total ? "公開中の記事 " + total + " 件（新着順）" : "";
        } else {
          metaEl.textContent = items.length ? items.length + " 件ヒット" : "該当する記事が見つかりませんでした。別のキーワードでお試しください。";
        }
      }
    }

    window.WNOTES.ready.then(function () { render(""); });
    var timer = null;
    input.addEventListener("input", function () {
      clearTimeout(timer);
      timer = setTimeout(function () { render(input.value); }, 150);
    });
  })();

  // フッターの年号
  var y = document.getElementById("year");
  if (y) y.textContent = new Date().getFullYear();
})();
