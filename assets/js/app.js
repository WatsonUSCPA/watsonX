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

  function articleLink(key) {
    var a = ARTICLES[key];
    if (!a) return null;
    var hasUrl = a.url && a.url.trim() !== "";
    var link = el("a", "dx-article" + (hasUrl ? "" : " is-pending"));
    link.href = hasUrl ? a.url : NOTE_PROFILE;
    link.target = "_blank";
    link.rel = "noopener";
    var ico = el("span", "ico", "note");
    var meta = el("span", "meta");
    meta.appendChild(el("strong", null, escapeHtml(a.title)));
    meta.appendChild(el("span", null, hasUrl ? "noteで読む →" : "準備中 — noteの一覧を見る →"));
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

    // 関連note
    var keys = (node.articles || []).filter(function (k) { return ARTICLES[k]; });
    if (keys.length) {
      card.appendChild(el("p", "dx-articles-head", "📘 もっと深掘りする（関連note）"));
      var list = el("div", "dx-articles");
      keys.forEach(function (k) {
        var link = articleLink(k);
        if (link) list.appendChild(link);
      });
      card.appendChild(list);
    }

    // CTA
    var cta = el("div", "dx-cta");
    cta.appendChild(el("p", null, "あなたのケースに合わせて、より詳しい情報を note で発信しています。フォローして最新の節税ポイントを受け取ってください。"));
    var ctaBtn = el("a", "btn btn-primary", "noteをフォローして続きを読む");
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

  // フッターの年号
  var y = document.getElementById("year");
  if (y) y.textContent = new Date().getFullYear();
})();
