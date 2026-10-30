/* mediCetamol · seat allotments  (loaded by the React page /allotment)
   Exposes window.MediAllotments.mount(el) / unmount(). The data files sit next to this script:
   <this folder>/colleges.json and <this folder>/rounds/*.json, so nothing here depends on the domain. */
(function () {
  "use strict";

  var SCRIPT = (document.currentScript && document.currentScript.src) || "";
  var BASE = SCRIPT ? SCRIPT.slice(0, SCRIPT.lastIndexOf("/") + 1) : "https://medicetamol.github.io/allotments/";
  var DATA_BASE = BASE + "rounds/";
  var COLLEGES_URL = BASE + "colleges.json";
  var SHARED = { colleges: null, index: null, rounds: {} };   /* survives re-mounts */
  var active = null;

  function mount(root) { unmount(); active = create(root); }
  function unmount() { if (active) { active.destroy(); active = null; } }
  window.MediAllotments = { mount: mount, unmount: unmount };

  var TEMPLATE = `<div class="hero rel">
    <span class="pill" id="roundPill">Seat allotments</span>
    <h1>See where every rank <b>landed</b></h1>
    <p>Search the allotment list, check the last rank that got each seat, and see which seats your own rank could have reached. Pick a round below.</p>
    <div class="round-row">
      <label for="roundSel">Round</label>
      <select class="ctl" id="roundSel" style="width:auto;min-width:14rem" disabled><option>Loading…</option></select>
      <span class="stat" id="stat"></span>
    </div>
    <p class="note" id="roundNote" style="margin:.6rem 0 0" hidden></p>
  </div>

  <nav class="tabs rel" aria-label="Views">
    <div class="tabs-in" role="tablist">
      <button class="tab" role="tab" id="tab-list" aria-selected="true" data-tab="list">Allotments</button>
      <button class="tab" role="tab" id="tab-closing" aria-selected="false" data-tab="closing" aria-label="Closing ranks">Closing</button>
      <button class="tab" role="tab" id="tab-summary" aria-selected="false" data-tab="summary">Summary</button>
      <button class="tab" role="tab" id="tab-my" aria-selected="false" data-tab="my">My rank</button>
    </div>
  </nav>

  <div class="rel">
    <!-- My rank panel -->
    <section class="card my" id="myPanel" hidden>
      <h2>Which seats could my rank reach?</h2>
      <p id="myIntro">Enter your NEET-PG rank and category. You will see seats whose last allotted rank was at or beyond yours.</p>
      <div class="my-grid">
        <div class="field"><label for="myRank">Your rank</label><input class="ctl" id="myRank" type="text" inputmode="numeric" autocomplete="off" placeholder="e.g. 12500" /></div>
        <div class="field"><label for="myCat">Your category</label>
          <select class="ctl" id="myCat"></select></div>
        <label class="check"><input type="checkbox" id="myPwd" /> PwD</label>
      </div>
    </section>

    <!-- Filters -->
    <section class="card filters" id="filters" aria-label="Filters">
      <div class="search-row">
        <div class="grow">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
          <label class="sr" for="q">Search</label>
          <input class="ctl" id="q" type="search" autocomplete="off" placeholder="College, branch or rank" />
        </div>
        <button class="btn fold-btn" id="foldBtn" type="button" aria-expanded="false" aria-controls="fold">Filters <span class="badge" id="fcount" hidden>0</span></button>
      </div>
      <div class="sum-opts" id="sumOpts" hidden>
        <div class="seg" id="groupField" role="group" aria-label="Group rows by" hidden><button type="button" id="gBranch" aria-pressed="true">By branch</button><button type="button" id="gCollege" aria-pressed="false">By college</button></div>
      </div>
      <div class="fold" id="fold">
        <div class="fgrid">
          <div class="field" id="stateField"><label for="fState">State</label><select class="ctl" id="fState"></select></div>
          <div class="field"><label>Branch</label><div class="ms" id="msBranch"></div></div>
          <div class="field"><label>Course type</label><div class="ms" id="msDegree"></div></div>
          <div class="field"><label for="fType">Seat type</label><select class="ctl" id="fType"><option value="">All seat types</option><option value="gov">Government</option><option value="pvt">Private / Deemed</option><option value="dnb">DNB</option></select></div>
          <div class="field" id="quotaField"><label>Quota</label><div class="ms" id="msQuota"></div></div>
          <div class="field" id="catField"><label for="fCat">Seat category</label><select class="ctl" id="fCat"></select></div>
          <div class="field"><label for="fCollege">College</label><input class="ctl" id="fCollege" list="collegeList" autocomplete="off" placeholder="Start typing a college name" /><datalist id="collegeList"></datalist></div>
          <div class="field" id="rankField"><label>Rank between</label>
            <div class="two"><input class="ctl" id="fFrom" type="text" inputmode="numeric" placeholder="From" aria-label="Rank from" /><input class="ctl" id="fTo" type="text" inputmode="numeric" placeholder="To" aria-label="Rank to" /></div></div>
          <div class="field" id="pwdField" hidden><label>PwD columns</label><label class="check"><input type="checkbox" id="sumPwd" /> Show PwD</label></div>
        </div>
        <div class="frow"><div class="left"><button class="btn" id="resetBtn" type="button">Clear filters</button></div></div>
      </div>
    </section>

    <button type="button" class="promo" id="sumPromo" hidden>
      <span class="pi"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="3"/><path d="M3 10h18M9 10v10M15 10v10"/></svg></span>
      <span class="pt"><b>Check out the Summary table</b><small>Closing ranks by branch and category for these filters, in one table</small></span>
      <span class="pa" aria-hidden="true">›</span>
    </button>
    <p class="caption" id="caption" hidden></p>

    <div class="rhead">
      <div class="count" id="count" aria-live="polite"></div>
      <div class="sort"><label class="sr" for="sortSel">Sort by</label><span class="cl">Sort</span><select class="ctl" id="sortSel"></select></div>
    </div>

    <div id="results"></div>

    <p class="note" id="note"></p>
  </div>

  <div class="foot">
    Unofficial helper built from the published provisional allotment list. Always confirm seats and cut-offs on the official counselling website.
  </div>`;

  function create(ROOT) {
  ROOT.innerHTML = TEMPLATE;
  var cleanups = [];
  var onDoc = function (type, fn) { document.addEventListener(type, fn); cleanups.push(function () { document.removeEventListener(type, fn); }); };
  var onWin = function (type, fn) { window.addEventListener(type, fn); cleanups.push(function () { window.removeEventListener(type, fn); }); };

  var PAGE = 50;
  var EXAM_NAMES = { "NEET-PG": "NEET-PG (MCC counselling)", "WB-PG": "West Bengal PG counselling" };
  var BASE_CATS = ["Open", "EWS", "OBC", "OBC-A", "OBC-B", "SC", "ST"];
  var QUOTA_SHORT = {
    "Non-Resident Indian": "NRI", "IP University Quota": "IP Univ", "Delhi University Quota": "DU",
    "DNB Quota": "DNB", "Aligarh Muslim University": "AMU", "Banaras Hindu University": "BHU",
    "Self-Financed Merit Seat": "Self-financed", "Armed Forces Medical": "Armed Forces",
    "Open Quota": "Open quota", "Private Management Quota": "Private Mgmt", "In-service Quota": "In-service", "In-service DNB Quota": "In-service DNB", "NRI Quota": "NRI", "Muslim Minority Quota": "Muslim Minority", "Jain Minority Quota": "Jain Minority"
  };
  var SORTS = {
    list: [["rank", "Rank: best first"], ["rank-d", "Rank: last first"], ["college", "College A–Z"], ["course", "Branch A–Z"]],
    closing: [["close", "Closing rank: low to high"], ["close-d", "Closing rank: high to low"], ["college", "College A–Z"], ["course", "Branch A–Z"], ["seats", "Most seats"]],
    summary: [["open", "Open rank: low to high"], ["open-d", "Open rank: high to low"], ["name", "A–Z"], ["seats", "Most seats"]],
    my: [["close", "Toughest seats first"], ["close-d", "Safest seats first"], ["college", "College A–Z"], ["course", "Branch A–Z"]]
  };

  var $ = function (s) { return ROOT.querySelector(s); };
  var esc = function (s) { return String(s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); };
  var fmt = function (n) { return Number(n).toLocaleString("en-IN"); };
  var num = function (v) { var n = parseInt(String(v).replace(/[^\d]/g, ""), 10); return isNaN(n) ? 0 : n; };

  var S = {
    index: null, data: null, tab: "list",
    f: { q: "", state: -1, stype: "", quota: [], degree: [], branch: [], cat: -1, college: "", from: 0, to: 0 },
    sort: { list: "rank", closing: "close", my: "close", summary: "open" },
    sum: { group: "branch", pwd: false }, prevTab: null, autoQuota: false,
    shown: PAGE,
    my: { rank: 0, cat: "General", pwd: false },
    L: null
  };

  /* ---- loading ---- */
  function getJSON(file) {
    var ok = function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); };
    return fetch(DATA_BASE + file).then(ok);
  }
  function getColleges() {
    if (!SHARED.colleges) {
      SHARED.colleges = fetch(COLLEGES_URL).then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); });
      SHARED.colleges.catch(function () { SHARED.colleges = null; });
    }
    return SHARED.colleges;
  }
  /* Round files store only a college code per row; build the college table the page uses from colleges.json */
  function adapt(d, c) {
    if (d.insts) return d;
    var idx = {}, insts = [], stIdx = {}, states = [], codes = [];
    d.rows = d.rows.map(function (r) {
      var code = r[2], i = idx[code];
      if (i === undefined) {
        var x = c.colleges[code] || [code, "", code.slice(3)];
        var sc = x[2] || code.slice(3), si = stIdx[sc];
        if (si === undefined) { si = states.length; stIdx[sc] = si; states.push((c.states && c.states[sc]) || sc); }
        i = idx[code] = insts.length; insts.push([x[0], x[1] || "", si]); codes.push(code);
      }
      return [r[0], r[1], i, r[3], r[4], r[5]];
    });
    d.insts = insts; d.states = states; d.codes = codes; d.v = 3;
    return d;
  }
  function showSkeleton() { $("#results").innerHTML = '<div class="list"><div class="skel"></div><div class="skel"></div><div class="skel"></div><div class="skel"></div></div>'; }
  function showError(msg) {
    $("#results").innerHTML = '<div class="card empty"><b>Could not load the data</b>' + esc(msg) + '<br><button class="btn primary" id="retry" type="button">Try again</button></div>';
    $("#retry").addEventListener("click", boot);
    $("#count").textContent = "";
  }

  function boot() {
    showSkeleton();
    (SHARED.index ? Promise.resolve(SHARED.index) : getJSON("index.json").then(function (i) { SHARED.index = i; return i; })).then(function (idx) {
      S.index = idx;
      var sel = $("#roundSel");
      var groups = {}, order = [], ropt = function (r) { return '<option value="' + esc(r.id) + '">' + esc(r.label) + "</option>"; };
      idx.rounds.forEach(function (r) { var g = r.exam || "NEET-PG"; if (!groups[g]) { groups[g] = []; order.push(g); } groups[g].push(r); });
      sel.innerHTML = order.length > 1
        ? order.map(function (g) { return '<optgroup label="' + esc(EXAM_NAMES[g] || g) + '">' + groups[g].map(ropt).join("") + "</optgroup>"; }).join("")
        : idx.rounds.map(ropt).join("");
      sel.disabled = idx.rounds.length < 2;
      var want = (location.hash || "").replace("#", "").split("&")[0];
      var pick = idx.rounds.some(function (r) { return r.id === want; }) ? want : (idx.default || idx.rounds[0].id);
      sel.value = pick;
      loadRound(pick);
    }).catch(function (e) { showError("Please check your connection and try again."); });
  }

  function loadRound(id) {
    var meta = S.index.rounds.filter(function (r) { return r.id === id; })[0];
    if (!meta) return;
    try { history.replaceState(history.state, "", location.pathname + location.search + "#" + id); } catch (e) {}
    if (SHARED.rounds[id]) { setData(SHARED.rounds[id]); return; }
    showSkeleton();
    $("#stat").textContent = "";
    Promise.all([getJSON(meta.file), getColleges()]).then(function (res) { var d = adapt(res[0], res[1]); SHARED.rounds[id] = d; setData(d); })
      .catch(function (e) { try { console.error(e); } catch (x) {} showError("The round file could not be loaded."); });
  }

  function setData(d) {
    S.data = d;
    var L = { instHay: [], courseHay: [], quotaHay: [], courseLabel: [] };
    L.full = []; L.lblNo = []; L.lblState = [];
    var v3 = (d.v || 1) >= 3;
    d.insts.forEach(function (x, i) {
      var name = x[0], city = v3 ? (x[1] || "") : "", st = (d.states && x[2] != null) ? d.states[x[2]] : "";
      var inName = city && name.toLowerCase().indexOf(city.toLowerCase()) >= 0;
      var c = city && !inName && city.toLowerCase() !== st.toLowerCase() ? city : "";
      var cs = city && !inName ? city : "";
      var stIn = st && (name.toLowerCase().indexOf(st.toLowerCase()) >= 0 || (c && c.toLowerCase().indexOf(st.toLowerCase()) >= 0));
      var stShow = st && v3 && !stIn ? st : "";
      L.full[i] = name + (c ? ", " + c : "") + (stShow ? ", " + stShow : "");
      L.lblState[i] = v3 ? name + (cs ? ", " + cs : "") : name;
      L.lblNo[i] = v3 ? name + (stShow ? ", " + stShow : "") : name;
      L.instHay[i] = (L.full[i] + " " + name + " " + city + " " + st).toLowerCase();
    });
    if (v3) {
      var cnt = {};
      L.lblNo.forEach(function (l) { cnt[l] = (cnt[l] || 0) + 1; });
      d.insts.forEach(function (x, i) { if (cnt[L.lblNo[i]] > 1) L.lblNo[i] = L.full[i]; });
    }
    d.courses.forEach(function (c, i) { L.courseHay[i] = (c[0] + " " + c[1]).toLowerCase(); L.courseLabel[i] = c[0] + " · " + c[1]; });
    d.quotas.forEach(function (q, i) { L.quotaHay[i] = (q + " " + (QUOTA_SHORT[q] || "")).toLowerCase(); });
    L.branches = Array.from(new Set(d.courses.map(function (c) { return c[1]; }))).sort();
    var order = ["MD", "MS", "DNB", "DrNB (6-yr)", "M.Ch", "DNB Diploma", "Diploma"];
    L.degrees = Array.from(new Set(d.courses.map(function (c) { return c[0]; }))).sort(function (a, b) {
      var x = order.indexOf(a), y = order.indexOf(b); return (x < 0 ? 99 : x) - (y < 0 ? 99 : y);
    });
    var GOVQ = ["All India", "Delhi University Quota", "IP University Quota", "Banaras Hindu University", "Aligarh Muslim University", "Armed Forces Medical", "Open Quota", "In-service Quota"];
    var PVTQ = ["Self-Financed Merit Seat", "Non-Resident Indian", "Jain Minority Quota", "Muslim Minority Quota", "Private Management Quota", "NRI Quota"];
    L.qType = d.quotas.map(function (q) { return GOVQ.indexOf(q) >= 0 ? "gov" : PVTQ.indexOf(q) >= 0 ? "pvt" : q === "DNB Quota" || q === "In-service DNB Quota" ? "dnb" : ""; });
    L.baseCats = BASE_CATS.filter(function (c) { return d.cats.indexOf(c) >= 0 || d.cats.indexOf(c + " PwD") >= 0; });
    L.catIdx = {}; d.cats.forEach(function (c, i) { L.catIdx[c] = i; });
    S.L = L;
    resetFilters(true);
    fillControls();
    $("#roundPill").textContent = d.meta.label;
    $("#stat").innerHTML = "<b>" + fmt(d.rows.length) + "</b> allotments · " + fmt(d.insts.length) + " colleges";
    var rn = $("#roundNote");
    if (rn) { var later = d.meta && d.meta.round > 1; rn.hidden = !later; rn.textContent = later ? "Round " + d.meta.round + " lists only the seats allotted in that round (fresh allotments and upgrades). Candidates who kept their earlier seat are not included." : ""; }
    render();
  }

  function opt(v, t, sel) { return '<option value="' + esc(v) + '"' + (sel ? " selected" : "") + ">" + esc(t) + "</option>"; }
  function fillControls() {
    var d = S.data, L = S.L;
    var stOpts = (d.states || []).map(function (n, i) { return [n, i]; }).sort(function (a, b) { return cmpText(a[0], b[0]); });
    $("#stateField").hidden = !stOpts.length;
    $("#fState").innerHTML = opt(-1, "All states") + stOpts.map(function (s) { return opt(s[1], s[0]); }).join("");
    msInit("msBranch", "All branches", L.branches.map(function (b) { return [b, b]; }), "branch");
    msInit("msDegree", "All course types", L.degrees.map(function (b) { return [b, b]; }), "degree");
    buildQuotaOptions();
    var catOrder = ["Open", "OBC", "OBC-A", "OBC-B", "EWS", "SC", "ST"];
    var cats = d.cats.map(function (c, i) { return [c, i]; }).sort(function (a, b) {
      var ba = a[0].replace(" PwD", ""), bb = b[0].replace(" PwD", "");
      var x = catOrder.indexOf(ba), y = catOrder.indexOf(bb);
      return (x - y) || (a[0].length - b[0].length);
    });
    $("#fCat").innerHTML = opt(-1, "All categories") + cats.map(function (c) { return opt(c[1], c[0] === "Open" ? "Open (General)" : c[0]); }).join("");
    $("#collegeList").innerHTML = Array.from(new Set(L.full)).sort().map(function (n) { return "<option value=\"" + esc(n) + "\"></option>"; }).join("");
    var mc = $("#myCat");
    mc.innerHTML = '<option value="General">General / Open</option>' + L.baseCats.filter(function (c) { return c !== "Open"; }).map(function (c) { return '<option value="' + esc(c) + '">' + esc(c) + "</option>"; }).join("");
    if (!L.baseCats.some(function (c) { return c === S.my.cat; })) S.my.cat = "General";
    mc.value = S.my.cat;
    $("#myIntro").textContent = "Enter your NEET-PG all-India rank and category." + " You will see seats whose last allotted rank was at or beyond yours.";
    $("#q").value = ""; $("#fCollege").value = ""; $("#fFrom").value = ""; $("#fTo").value = "";
    $("#fState").value = -1; $("#fType").value = ""; $("#fCat").value = -1;
  }

  /* ---- multi-select dropdown ---- */
  var MS = {};
  function msInit(id, allLabel, options, key) {
    var root = $("#" + id);
    MS[id] = { root: root, options: options, key: key, allLabel: allLabel };
    root.innerHTML = '<button type="button" class="ctl ms-btn" aria-haspopup="listbox" aria-expanded="false"></button>' +
      '<div class="ms-pop" hidden><div class="ms-top"><button type="button" class="btn ms-clear">Clear</button><button type="button" class="btn primary ms-done">Done</button></div>' +
      '<div class="ms-list" role="listbox" aria-multiselectable="true">' +
      options.map(function (o, i) { return '<label class="ms-item"><input type="checkbox" value="' + i + '"><span>' + esc(o[1]) + "</span></label>"; }).join("") + "</div></div>";
    msPaint(id);
  }
  function msPaint(id) {
    var m = MS[id]; if (!m) return;
    var sel = S.f[m.key], btn = m.root.querySelector(".ms-btn"), label = m.allLabel;
    m.root.querySelectorAll("input").forEach(function (cb) { cb.checked = sel.indexOf(m.options[+cb.value][0]) >= 0; });
    if (sel.length) {
      var first = m.options.filter(function (o) { return o[0] === sel[0]; })[0];
      label = (first ? first[1] : String(sel[0])) + (sel.length > 1 ? " +" + (sel.length - 1) : "");
    }
    btn.textContent = label; btn.classList.toggle("on", sel.length > 0);
  }
  function msClose() {
    ROOT.querySelectorAll(".ms-pop").forEach(function (p) { p.hidden = true; });
    ROOT.querySelectorAll(".ms-btn").forEach(function (b) { b.setAttribute("aria-expanded", "false"); });
  }
  function msBind() {
    onDoc("click", function (e) {
      var root = e.target.closest ? e.target.closest(".ms") : null;
      if (!root) { msClose(); return; }
      var m = MS[root.id]; if (!m) return;
      var btn = e.target.closest(".ms-btn");
      if (btn) {
        var pop = root.querySelector(".ms-pop"), open = pop.hidden;
        msClose();
        if (open) { pop.hidden = false; btn.setAttribute("aria-expanded", "true"); }
        return;
      }
      if (e.target.closest(".ms-done")) { msClose(); return; }
      if (e.target.closest(".ms-clear")) { S.f[m.key] = []; if (m.key === "quota") S.autoQuota = false; msPaint(root.id); changed(); }
    });
    onDoc("change", function (e) {
      var cb = e.target; if (!cb.closest || cb.type !== "checkbox") return;
      var root = cb.closest(".ms"); if (!root) return;
      var m = MS[root.id]; if (!m) return;
      S.f[m.key] = m.options.filter(function (o, i) { var c = root.querySelector('input[value="' + i + '"]'); return c && c.checked; }).map(function (o) { return o[0]; });
      if (m.key === "quota") S.autoQuota = false;
      msPaint(root.id); changed();
    });
    onDoc("keydown", function (e) { if (e.key === "Escape") msClose(); });
  }

  function buildQuotaOptions() {
    msInit("msQuota", "All quotas", S.data.quotas.map(function (q, i) { return [i, q]; }), "quota");
  }
  function syncQuotaForTab() {
    var d = S.data, ai = d.quotas.indexOf("All India");
    if (ai < 0) ai = 0;
    if (S.tab === "summary" && S.prevTab !== "summary") {
      if (!S.f.quota.length) { S.f.quota = [ai]; S.autoQuota = true; }
    } else if (S.tab !== "summary" && S.prevTab === "summary") {
      if (S.autoQuota && S.f.quota.length === 1 && S.f.quota[0] === ai) S.f.quota = [];
      S.autoQuota = false;
    }
    S.prevTab = S.tab;
    msPaint("msQuota");
  }
  function resetFilters(silent) {
    S.f = { q: "", state: -1, stype: "", quota: [], degree: [], branch: [], cat: -1, college: "", from: 0, to: 0 };
    if (S.tab === "summary" && S.data) { var ai0 = S.data.quotas.indexOf("All India"); S.f.quota = [ai0 < 0 ? 0 : ai0]; S.autoQuota = true; }
    S.shown = PAGE;
    if (!silent) { fillControls(); render(); }
  }

  /* ---- filtering ---- */
  function filteredRows(opts) {
    var d = S.data, L = S.L, f = S.f, out = [];
    var toks = f.q.trim().toLowerCase().split(/\s+/).filter(Boolean);
    var numQ = (opts.rankSearch && toks.length === 1 && /^\d+$/.test(toks[0])) ? parseInt(toks[0], 10) : null;
    if (numQ !== null) toks = [];
    var col = f.college.trim().toLowerCase();
    var toSet = function (arr) { if (!arr.length) return null; var o = {}; arr.forEach(function (v) { o[v] = true; }); return o; };
    var qSet = toSet(f.quota), degSet = toSet(f.degree), brSet = toSet(f.branch);
    var rows = d.rows;
    for (var n = 0; n < rows.length; n++) {
      var r = rows[n];
      if (numQ !== null && r[0] !== numQ) continue;
      if (f.state >= 0 && d.insts[r[2]][2] !== f.state) continue;
      if (qSet && !qSet[r[1]]) continue;
      if (f.stype && L.qType[r[1]] !== f.stype) continue;
      var c = d.courses[r[3]];
      if (degSet && !degSet[c[0]]) continue;
      if (brSet && !brSet[c[1]]) continue;
      if (opts.anyCat) { /* all seat categories */ }
      else if (opts.catSet) { if (!opts.catSet[r[4]]) continue; }
      else if (f.cat >= 0 && r[4] !== f.cat) continue;
      if (col && L.instHay[r[2]].indexOf(col) < 0) continue;
      if (opts.rank) { if (f.from && r[0] < f.from) continue; if (f.to && r[0] > f.to) continue; }
      if (toks.length) {
        var ok = true;
        for (var t = 0; t < toks.length; t++) {
          var k = toks[t];
          if (L.instHay[r[2]].indexOf(k) < 0 && L.courseHay[r[3]].indexOf(k) < 0 && L.quotaHay[r[1]].indexOf(k) < 0) { ok = false; break; }
        }
        if (!ok) continue;
      }
      out.push(r);
    }
    return out;
  }

  function aggregate(rows) {
    var m = new Map();
    for (var n = 0; n < rows.length; n++) {
      var r = rows[n], key = r[2] + "|" + r[3] + "|" + r[1] + "|" + r[4];
      var g = m.get(key);
      if (!g) { g = { i: r[2], c: r[3], q: r[1], k: r[4], min: r[0], max: r[0], n: 0 }; m.set(key, g); }
      if (r[0] > g.max) g.max = r[0];
      if (r[0] < g.min) g.min = r[0];
      g.n++;
    }
    return Array.from(m.values());
  }

  function myCatSet() {
    var d = S.data, names = ["Open"];
    if (S.my.cat !== "General") names.push(S.my.cat);
    if (S.my.pwd) names = names.concat(names.map(function (x) { return x + " PwD"; }));
    var set = {};
    d.cats.forEach(function (c, i) { if (names.indexOf(c) >= 0) set[i] = true; });
    return set;
  }

  /* ---- sorting ---- */
  function cmpText(a, b) { return a < b ? -1 : a > b ? 1 : 0; }
  function sortList(rows, key) {
    var d = S.data;
    var f = {
      "rank": function (a, b) { return a[0] - b[0]; },
      "rank-d": function (a, b) { return b[0] - a[0]; },
      "college": function (a, b) { return cmpText(S.L.full[a[2]], S.L.full[b[2]]) || a[0] - b[0]; },
      "course": function (a, b) { return cmpText(d.courses[a[3]][1], d.courses[b[3]][1]) || a[0] - b[0]; }
    }[key];
    return rows.slice().sort(f);
  }
  function sortGroups(gs, key) {
    var d = S.data;
    var f = {
      "close": function (a, b) { return a.max - b.max; },
      "close-d": function (a, b) { return b.max - a.max; },
      "seats": function (a, b) { return b.n - a.n || a.max - b.max; },
      "college": function (a, b) { return cmpText(S.L.full[a.i], S.L.full[b.i]) || a.max - b.max; },
      "course": function (a, b) { return cmpText(d.courses[a.c][1], d.courses[b.c][1]) || a.max - b.max; }
    }[key];
    return gs.slice().sort(f);
  }

  /* ---- rendering ---- */
  function catChip(name) {
    var base = name.replace(" PwD", "").toLowerCase();
    var cls = { open: "c-open", obc: "c-obc", "obc-a": "c-obc", "obc-b": "c-obc", ews: "c-ews", sc: "c-sc", st: "c-st" }[base] || "";
    return '<span class="chip ' + cls + '">' + esc(name === "Open" ? "Open" : name) + "</span>";
  }
  function qChip(i) { var q = S.data.quotas[i]; return '<span class="chip">' + esc(QUOTA_SHORT[q] || q) + "</span>"; }

  function listHead() {
    var s = S.sort.list;
    function b(label, asc, desc) {
      var on = s === asc ? " ▲" : s === desc ? " ▼" : "";
      return '<button type="button" data-sort="' + (s === asc ? desc : asc) + '">' + label + on + "</button>";
    }
    return '<div class="thead" role="row"><div>' + b("Rank", "rank", "rank-d") + "</div><div>" + b("College", "college", "college") + "</div><div>" + b("Branch", "course", "course") + "</div><div>Quota</div><div>Seat</div><div>Candidate</div></div>";
  }
  function listRow(r) {
    var d = S.data, L = S.L;
    return '<article class="row t">' +
      '<div class="rk"><small>Rank</small><b>' + fmt(r[0]) + "</b></div>" +
      '<div><div class="cn">' + esc(L.full[r[2]]) + '</div><div class="cs m-only">' + esc(L.courseLabel[r[3]].replace(" · ", " · ")) + "</div></div>" +
      '<div class="cs d-only">' + esc(L.courseLabel[r[3]]) + "</div>" +
      '<div class="tg m-only">' + qChip(r[1]) + catChip(d.cats[r[4]]) + '<span class="chip">Candidate: ' + esc(d.ccats[r[5]]) + "</span></div>" +
      '<div class="d-only">' + qChip(r[1]) + '</div><div class="d-only">' + catChip(d.cats[r[4]]) + '</div><div class="d-only"><span class="chip">' + esc(d.ccats[r[5]]) + "</span></div>" + "</article>";
  }

  function closingHead() {
    var s = S.sort.closing;
    function b(label, asc, desc) {
      var on = s === asc ? " ▲" : s === desc ? " ▼" : "";
      return '<button type="button" data-sort="' + (s === asc ? desc : asc) + '">' + label + on + "</button>";
    }
    return '<div class="thead cthead" role="row"><div>' + b("College", "college", "college") + "</div><div>" + b("Branch", "course", "course") + "</div><div>Quota</div><div>Seat</div><div>" + b("Last rank", "close", "close-d") + "</div><div>" + b("Seats", "seats", "seats") + "</div></div>";
  }
  function groupRow(g, extra) {
    var d = S.data, L = S.L;
    return '<article class="row t cl-t">' +
      '<div><div class="cn">' + esc(L.full[g.i]) + '</div><div class="cs m-only">' + esc(L.courseLabel[g.c]) + "</div></div>" +
      '<div class="cs d-only">' + esc(L.courseLabel[g.c]) + "</div>" +
      '<div class="d-only">' + qChip(g.q) + '</div><div class="d-only">' + catChip(d.cats[g.k]) + "</div>" +
      '<div class="rk"><small>Last rank</small><b>' + fmt(g.max) + "</b></div>" +
      '<div class="d-only cl"><b>' + fmt(g.n) + "</b></div>" +
      '<div class="tg m-only">' + qChip(g.q) + catChip(d.cats[g.k]) + '<span class="cl"><b>' + fmt(g.n) + "</b> seat" + (g.n > 1 ? "s" : "") + " · first rank " + fmt(g.min) + "</span>" + (extra || "") + "</div>" + "</article>";
  }

  /* ---- summary table ---- */
  function summarize() {
    var f = S.f;
    var rows = filteredRows({ rank: false, anyCat: true });
    var mode = f.branch.length === 1 ? "college" : (f.state >= 0 && S.sum.group === "college" ? "college" : "branch");
    var map = new Map();
    for (var n = 0; n < rows.length; n++) {
      var r = rows[n], qk = f.quota.length !== 1 ? "|" + r[1] : "";
      var key = (mode === "branch" ? String(r[3]) : r[2] + "|" + r[3]) + qk;
      var g = map.get(key);
      if (!g) { g = { i: r[2], c: r[3], q: r[1], cells: {}, n: 0 }; map.set(key, g); }
      var cell = g.cells[r[4]];
      if (!cell) cell = g.cells[r[4]] = { max: r[0], n: 0 };
      if (r[0] > cell.max) cell.max = r[0];
      cell.n++; g.n++;
    }
    var gs = Array.from(map.values()), d = S.data, L = S.L, openI = L.catIdx["Open"], k = S.sort.summary;
    function rankKey(g) {
      if (g.cells[openI]) return g.cells[openI].max;
      var m = 1e9; for (var c in g.cells) if (g.cells[c].max < m) m = g.cells[c].max;
      return 1e9 + m;
    }
    function nameKey(g) { return mode === "branch" ? d.courses[g.c][1] + " " + d.courses[g.c][0] : S.L.full[g.i] + " " + d.courses[g.c][1]; }
    gs.sort({
      "open": function (a, b) { return rankKey(a) - rankKey(b); },
      "open-d": function (a, b) { return rankKey(b) - rankKey(a); },
      "name": function (a, b) { return cmpText(nameKey(a), nameKey(b)); },
      "seats": function (a, b) { return b.n - a.n || rankKey(a) - rankKey(b); }
    }[k]);
    return { mode: mode, groups: gs, rows: rows.length };
  }
  function summaryCaption(sm) {
    var f = S.f, d = S.data;
    var what = f.college.trim() ? f.college.trim() : ((f.degree.length ? f.degree.join("/") + " " : "") + (f.branch.length ? f.branch.join(", ") : "all branches"));
    var where = f.college.trim() ? "" : (f.state >= 0 ? " in " + d.states[f.state] : " across India");
    var q = !f.quota.length ? "all quotas (shown separately)" : f.quota.length === 1 ? d.quotas[f.quota[0]] + " quota" : f.quota.map(function (i) { return d.quotas[i]; }).join(", ") + " (shown separately)";
    if (f.stype) q += " · " + ({ gov: "Government", pvt: "Private / Deemed", dnb: "DNB" })[f.stype] + " seats";
    var s = f.q.trim() ? " matching “" + f.q.trim() + "”" : "";
    return "Showing closing ranks of <b>" + esc(what) + "</b>" + esc(where) + esc(s) + " · " + esc(q);
  }
  function setTabsH() {
    var hd = document.querySelector("header"), top = 0;
    if (hd) { var pos = getComputedStyle(hd).position; if (pos === "sticky" || pos === "fixed") top = Math.round(hd.getBoundingClientRect().height); }
    var tb = ROOT.querySelector(".tabs");
    ROOT.style.setProperty("--al-top", top + "px");
    if (tb) ROOT.style.setProperty("--tabsH", (top + Math.round(tb.getBoundingClientRect().height)) + "px");
  }
  function bindSumScroll() {
    var h = $("#sumHead"), b = $("#sumBody");
    if (!h || !b) return;
    var lock = false;
    b.addEventListener("scroll", function () { if (lock) { lock = false; return; } if (h.scrollLeft !== b.scrollLeft) { lock = true; h.scrollLeft = b.scrollLeft; } });
    h.addEventListener("scroll", function () { if (lock) { lock = false; return; } if (b.scrollLeft !== h.scrollLeft) { lock = true; b.scrollLeft = h.scrollLeft; } });
  }
  function summaryTable(list, sm) {
    var d = S.data, L = S.L, cols = L.baseCats.slice(), stateSel = S.f.state >= 0, nb = cols.length;
    if (S.sum.pwd) cols = cols.concat(L.baseCats.map(function (c) { return c + " PwD"; }));
    var maxRank = 1;
    sm.groups.forEach(function (g) { for (var c in g.cells) if (g.cells[c].max > maxRank) maxRank = g.cells[c].max; });
    var colgroup = '<colgroup><col class="c-first">' + cols.map(function () { return '<col class="c-cat">'; }).join("") + '<col class="c-seats"></colgroup>';
    var head = '<tr><th class="stick">' + (sm.mode === "branch" ? "Branch" : "College") + "</th>" + cols.map(function (c, i) {
      return '<th class="' + (S.sum.pwd && i === nb ? "gap" : "") + '">' + esc(c.replace(" PwD", "")) + (c.indexOf("PwD") > 0 ? "<small>PwD</small>" : "") + "</th>";
    }).join("") + '<th class="gap">Seats</th></tr>';
    var body = list.map(function (g) {
      var first, qc = S.f.quota.length !== 1 ? ' <span class="chip c-open">' + esc(QUOTA_SHORT[d.quotas[g.q]] || d.quotas[g.q]) + "</span>" : "";
      if (sm.mode === "branch") {
        first = '<div class="cn">' + esc(d.courses[g.c][1]) + '</div><div class="cl"><span class="chip">' + esc(d.courses[g.c][0]) + "</span>" + qc + "</div>";
      } else {
        first = '<div class="cn">' + esc(stateSel ? L.lblState[g.i] : L.lblNo[g.i]) + '</div><div class="cl">' + esc(L.courseLabel[g.c]) + qc + "</div>";
      }
      var tds = cols.map(function (c, i) {
        var ci = L.catIdx[c], cell = ci === undefined ? null : g.cells[ci], gap = S.sum.pwd && i === nb ? "gap" : "";
        if (!cell) return '<td class="nil ' + gap + '">–</td>';
        var a = (0.07 + 0.27 * (1 - Math.sqrt(cell.max / maxRank))).toFixed(3);
        return '<td class="' + gap + '" style="background:rgb(var(--accent) / ' + a + ')"><b>' + fmt(cell.max) + "</b><small>" + fmt(cell.n) + " seat" + (cell.n > 1 ? "s" : "") + "</small></td>";
      }).join("");
      return '<tr><th class="stick" scope="row">' + first + "</th>" + tds + '<td class="seats gap"><b>' + fmt(g.n) + "</b></td></tr>";
    }).join("");
    return '<div class="card sumwrap" style="--ncat:' + cols.length + '"><div class="sumhead" id="sumHead"><table class="sum">' + colgroup + "<thead>" + head + '</thead></table></div><div class="tscroll" id="sumBody"><table class="sum">' + colgroup + "<tbody>" + body + "</tbody></table></div></div>";
  }

  function activeFilterCount() {
    var f = S.f, n = 0;
    if (f.state >= 0) n++; if (f.stype) n++; if (f.quota.length && S.tab !== "summary") n++; if (f.degree.length) n++; if (f.branch.length) n++;
    if (f.cat >= 0 && S.tab !== "my" && S.tab !== "summary") n++; if (f.college) n++;
    if ((f.from || f.to) && S.tab === "list") n++;
    return n;
  }

  function render() {
    if (!S.data) return;
    var tab = S.tab, out = $("#results"), html = "", total = 0, list = [], extraNote = "";
    setTabsH();

    // tab-dependent controls
    $("#myPanel").hidden = tab !== "my";
    $("#catField").hidden = tab === "my" || tab === "summary";
    syncQuotaForTab();
    $("#sumOpts").hidden = true;
    $("#caption").hidden = tab !== "summary";
    $("#sumPromo").hidden = tab !== "list";
    $("#pwdField").hidden = tab !== "summary";
    $("#rankField").hidden = tab !== "list";
    var sortSel = $("#sortSel");
    sortSel.innerHTML = SORTS[tab].map(function (s) { return opt(s[0], s[1], s[0] === S.sort[tab]); }).join("");
    var fc = activeFilterCount();
    $("#fcount").textContent = fc; $("#fcount").hidden = !fc;
    $("#q").placeholder = tab === "list" ? "College, branch or rank" : "College or branch";

    if (tab === "list") {
      var rows = sortList(filteredRows({ rank: true, rankSearch: true }), S.sort.list);
      total = rows.length;
      list = rows.slice(0, S.shown);
      html = list.length ? listHead() + '<div class="list">' + list.map(listRow).join("") + "</div>" : "";
      $("#count").innerHTML = "<b>" + fmt(total) + "</b> allotment" + (total === 1 ? "" : "s");
      extraNote = "Rank is the NEET-PG all-India rank. " + "Seat is the category of the seat that was allotted; Candidate is the student’s own category.";
    } else if (tab === "summary") {
      var sm = summarize();
      var showG = S.f.state >= 0 && S.f.branch.length !== 1;
      $("#groupField").hidden = !showG;
      $("#sumOpts").hidden = !showG;
      $("#caption").innerHTML = summaryCaption(sm);
      $("#gBranch").setAttribute("aria-pressed", sm.mode === "branch" ? "true" : "false");
      $("#gCollege").setAttribute("aria-pressed", sm.mode === "college" ? "true" : "false");
      total = sm.groups.length;
      list = sm.groups.slice(0, S.shown);
      html = list.length ? summaryTable(list, sm) : "";
      $("#count").innerHTML = "<b>" + fmt(total) + "</b> " + (sm.mode === "branch" ? "branch" : "college row") + (total === 1 ? "" : (sm.mode === "branch" ? "es" : "s")) + " · <b>" + fmt(sm.rows) + "</b> allotments";
      extraNote = "Each cell shows the last rank allotted (bold) and the seats allotted in that category; the Seats column is the row total. A darker shade means the seat closed at a better rank. A dash means no seat in that category. Ranks in other quotas follow their own lists, so pick one quota at a time.";
    } else if (tab === "closing") {
      var gs = sortGroups(aggregate(filteredRows({ rank: false })), S.sort.closing);
      total = gs.length;
      list = gs.slice(0, S.shown);
      html = list.length ? closingHead() + '<div class="list">' + list.map(function (g) { return groupRow(g); }).join("") + "</div>" : "";
      $("#count").innerHTML = "<b>" + fmt(total) + "</b> seat group" + (total === 1 ? "" : "s");
      extraNote = "Last rank = the highest (weakest) rank that was allotted a seat in that college, branch, quota and seat category in this round. It is not the final cut-off, because later rounds usually move further.";
    } else {
      var myRank = S.my.rank;
      if (!myRank) {
        out.innerHTML = '<div class="card empty"><b>Enter your rank above</b>You will see every seat whose last allotted rank reached or crossed it.</div>';
        $("#count").textContent = ""; $("#note").textContent = ""; return;
      }
      var set = myCatSet();
      var all = aggregate(filteredRows({ rank: false, catSet: set }));
      var best = new Map();
      all.forEach(function (g) {
        var key = g.i + "|" + g.c + "|" + g.q, cur = best.get(key);
        if (!cur || g.max > cur.max) best.set(key, g);
      });
      var gs2 = Array.from(best.values()).filter(function (g) { return g.max >= myRank; });
      gs2 = sortGroups(gs2, S.sort.my);
      total = gs2.length;
      list = gs2.slice(0, S.shown);
      html = list.length ? '<div class="list">' + list.map(function (g) {
        var ratio = g.max / myRank;
        var tag = ratio >= 1.15 ? '<span class="chip good">Comfortable</span>' : '<span class="chip tight">Tight</span>';
        return groupRow(g, tag);
      }).join("") + "</div>" : "";
      $("#count").innerHTML = "At rank <b>" + fmt(myRank) + "</b>: <b>" + fmt(total) + "</b> seat" + (total === 1 ? "" : "s") + " reached";
      extraNote = "Comfortable means the seat closed at least 15% beyond your rank; Tight means it closed just beyond it. This only shows what happened in this round, so treat it as a guide and not a guarantee.";
    }

    if (!list.length) {
      html = '<div class="card empty"><b>Nothing matches</b>Try removing a filter or loosening the rank range.<br><button class="btn primary" id="emptyReset" type="button">Clear filters</button></div>';
    } else if (total > list.length) {
      html += '<div class="more"><button class="btn" id="moreBtn" type="button">Show ' + fmt(Math.min(PAGE, total - list.length)) + " more (" + fmt(total - list.length) + " left)</button></div>";
    }
    out.innerHTML = html;
    if (tab === "summary") bindSumScroll();
    $("#note").textContent = extraNote;
  }

  /* ---- events ---- */
  var timers = {};
  function later(key, fn) { clearTimeout(timers[key]); timers[key] = setTimeout(fn, 140); }
  function changed() { S.shown = PAGE; render(); }

  $("#q").addEventListener("input", function (e) { var v = e.target.value; later("q", function () { S.f.q = v; changed(); }); });
  $("#fCollege").addEventListener("input", function (e) { var v = e.target.value; later("college", function () { S.f.college = v; changed(); }); });
  $("#fState").addEventListener("change", function (e) { S.f.state = parseInt(e.target.value, 10); changed(); });
  $("#fType").addEventListener("change", function (e) { S.f.stype = e.target.value; changed(); });
  msBind();
  $("#fCat").addEventListener("change", function (e) { S.f.cat = parseInt(e.target.value, 10); changed(); });
  $("#fFrom").addEventListener("input", function (e) { var v = num(e.target.value); later("from", function () { S.f.from = v; changed(); }); });
  $("#fTo").addEventListener("input", function (e) { var v = num(e.target.value); later("to", function () { S.f.to = v; changed(); }); });
  $("#sortSel").addEventListener("change", function (e) { S.sort[S.tab] = e.target.value; changed(); });
  $("#sumPwd").addEventListener("change", function (e) { S.sum.pwd = e.target.checked; changed(); });
  $("#gBranch").addEventListener("click", function () { S.sum.group = "branch"; changed(); });
  $("#gCollege").addEventListener("click", function () { S.sum.group = "college"; changed(); });
  $("#resetBtn").addEventListener("click", function () { resetFilters(false); });
  $("#roundSel").addEventListener("change", function (e) { loadRound(e.target.value); });
  $("#foldBtn").addEventListener("click", function () {
    var o = $("#fold").classList.toggle("open");
    this.setAttribute("aria-expanded", o ? "true" : "false");
  });

  function setTab(name) {
    S.tab = name; S.shown = PAGE;
    ROOT.querySelectorAll(".tab").forEach(function (x) { x.setAttribute("aria-selected", x.getAttribute("data-tab") === name ? "true" : "false"); });
    render();
    if (name === "my" && !S.my.rank) $("#myRank").focus();
  }
  ROOT.querySelectorAll(".tab").forEach(function (b) {
    b.addEventListener("click", function () { setTab(b.getAttribute("data-tab")); });
  });
  $("#sumPromo").addEventListener("click", function () {
    setTab("summary");
    var tb = ROOT.querySelector(".tabs");
    if (tb && tb.scrollIntoView) tb.scrollIntoView({ block: "start" });
  });

  $("#results").addEventListener("click", function (e) {
    var t = e.target;
    if (t.closest("#moreBtn")) { S.shown += PAGE; render(); return; }
    if (t.closest("#emptyReset")) { resetFilters(false); return; }
    var sb = t.closest("[data-sort]");
    if (sb) { S.sort[S.tab] = sb.getAttribute("data-sort"); changed(); return; }
  });

  /* my rank (remembered on this device) */
  try { var sv = JSON.parse(localStorage.getItem("medicetamol-allot-my") || "null"); if (sv) { S.my.rank = sv.rank || 0; S.my.cat = sv.cat || "General"; S.my.pwd = !!sv.pwd; } } catch (e) {}
  $("#myRank").value = S.my.rank ? String(S.my.rank) : ""; $("#myCat").value = S.my.cat; $("#myPwd").checked = S.my.pwd;
  function saveMy() { try { localStorage.setItem("medicetamol-allot-my", JSON.stringify(S.my)); } catch (e) {} }
  $("#myRank").addEventListener("input", function (e) { var v = num(e.target.value); later("myrank", function () { S.my.rank = v; saveMy(); changed(); }); });
  $("#myCat").addEventListener("change", function (e) { S.my.cat = e.target.value; saveMy(); changed(); });
  $("#myPwd").addEventListener("change", function (e) { S.my.pwd = e.target.checked; saveMy(); changed(); });

  onWin("resize", setTabsH);
  if (window.matchMedia && window.matchMedia("(min-width: 640px)").matches) $("#fold").classList.add("open");
  boot();
  setTabsH();

  return {
    destroy: function () {
      cleanups.forEach(function (fn) { fn(); });
      Object.keys(timers).forEach(function (k) { clearTimeout(timers[k]); });
      ROOT.style.removeProperty("--tabsH"); ROOT.style.removeProperty("--al-top");
      ROOT.innerHTML = "";
    }
  };
  }  /* end create */
})();
