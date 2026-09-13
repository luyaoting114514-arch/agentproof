/* AgentProof UI. Plain script on purpose: it must run from file:// as well as
   from the local server, and ES modules are blocked on file://. */
(function () {
  'use strict';

  var I18N = {
    zh: {
      'brand.sub': '本地 Agent 运行检查器',
      'live.connecting': '正在连接本地服务',
      'live.on': '已连接本地服务',
      'live.off': '未连接 · 离线模式',
      'btn.import': '导入 JSON',
      'btn.refresh': '重新扫描',
      'rail.sessions': '会话',
      'search.placeholder': '搜索标题或目录…',
      'filter.all': '全部',
      'crumb.workspace': '工作区',
      'crumb.session': '会话审计',
      'status.verified': '证据充分',
      'status.attention': '需要复核',
      'status.open': '信息不足',
      'stat.commands': '命令',
      'stat.commands.sub': 'shell 调用',
      'stat.failures': '失败',
      'stat.failures.sub': '记录到错误',
      'stat.files': '文件',
      'stat.files.sub': '被修改',
      'stat.prompts': '指令',
      'stat.prompts.sub': '用户输入',
      'stat.duration': '时长',
      'stat.duration.sub': '会话跨度',
      'stat.tokens': '输出 token',
      'stat.tokens.sub': '上下文峰值',
      'timeline.title': '执行时间线',
      'timeline.sub': '按时间顺序的真实记录。',
      'checks.title': '证据核对',
      'checks.sub': '每条结论由什么支撑。',
      'checks.coverage': '证据覆盖',
      'check.commands': '命令留痕',
      'check.failures': '失败命令',
      'check.tests': '测试与 lint',
      'check.edits': '文件改动',
      'check.repo': '仓库状态',
      'check.permissions': '权限模式',
      'check.commands.ok': '{resolved} / {total} 条命令带完整输出',
      'check.commands.warn': '仅 {resolved} / {total} 条命令留下输出',
      'check.commands.none': '本次会话没有 shell 调用',
      'check.failures.ok': '没有记录到失败命令',
      'check.failures.warn': '{count} 条命令返回错误',
      'check.tests.ok': '{total} 次测试或 lint 全部通过',
      'check.tests.warn': '{failed} / {total} 次测试或 lint 报告失败',
      'check.tests.none': '没有记录到测试或 lint 命令',
      'check.edits.ok': '{files} 个文件，新增 {added} 行',
      'check.edits.none': '没有捕获到文件改动',
      'check.repo.ok': '{root} · 分支 {branch} · {dirty} 处未提交',
      'check.repo.clean': '{root} · 分支 {branch} · 工作区干净',
      'check.repo.none': '工作目录不是 Git 仓库',
      'check.permissions.ok': 'sandbox {sandbox} · 审批 {approval}',
      'check.permissions.warn': 'sandbox {sandbox} · 审批 {approval}（放宽）',
      'git.title': '仓库现状',
      'git.branch': '分支',
      'git.commit': '提交',
      'git.last': '最近提交',
      'git.dirty': '未提交',
      'git.diff': '差异',
      'git.none': '工作目录不是 Git 仓库，或 git 不可用。',
      'files.title': '变更文件',
      'files.none': '这次会话没有捕获到文件改动。',
      'kind.prompt': '指令',
      'kind.think': '推理',
      'kind.read': '读取',
      'kind.edit': '编辑',
      'kind.cmd': '命令',
      'kind.say': '输出',
      'kind.note': '其他',
      'evidence': '证据',
      'empty.events': '当前筛选下没有事件',
      'empty.sessions': '没有找到会话记录',
      'empty.filtered': '没有匹配的会话',
      'empty.server.title': '未连接到本地引擎',
      'empty.server.body': '这个页面读的是本机日志。在项目目录运行下面这条命令，它会启动本地服务并自动打开页面。',
      'empty.server.hint': '也可以导入之前用 scan 生成的报告 JSON。',
      'export.title': 'AgentProof 报告',
      'export.generated': '生成于',
      'toast.refreshed': '已重新扫描',
      'toast.imported': '已导入报告',
      'toast.badjson': 'JSON 无法解析',
      'toast.exported': '报告已导出为 HTML',
      'footer.local': '本地优先 · 无遥测 · 数据不出本机',
      'footer.generated': '生成于',
      'footer.sessions': '{n} 个会话',
      'footer.export': '导出离线 HTML',
      'loading': '读取中…',
    },
    en: {
      'brand.sub': 'LOCAL RUN INSPECTOR',
      'live.connecting': 'Connecting to local engine',
      'live.on': 'Connected to local engine',
      'live.off': 'Not connected · offline mode',
      'btn.import': 'Import JSON',
      'btn.refresh': 'Rescan',
      'rail.sessions': 'Sessions',
      'search.placeholder': 'Search title or folder…',
      'filter.all': 'All',
      'crumb.workspace': 'WORKSPACE',
      'crumb.session': 'SESSION AUDIT',
      'status.verified': 'EVIDENCE HOLDS',
      'status.attention': 'NEEDS REVIEW',
      'status.open': 'THIN EVIDENCE',
      'stat.commands': 'COMMANDS',
      'stat.commands.sub': 'shell calls',
      'stat.failures': 'FAILED',
      'stat.failures.sub': 'errors recorded',
      'stat.files': 'FILES',
      'stat.files.sub': 'modified',
      'stat.prompts': 'PROMPTS',
      'stat.prompts.sub': 'user turns',
      'stat.duration': 'DURATION',
      'stat.duration.sub': 'session span',
      'stat.tokens': 'OUTPUT TOKENS',
      'stat.tokens.sub': 'context peak',
      'timeline.title': 'EXECUTION TIMELINE',
      'timeline.sub': 'The real record, in order.',
      'checks.title': 'EVIDENCE CHECK',
      'checks.sub': 'What backs each claim.',
      'checks.coverage': 'Evidence coverage',
      'check.commands': 'Recorded commands',
      'check.failures': 'Failed commands',
      'check.tests': 'Tests & lint',
      'check.edits': 'File changes',
      'check.repo': 'Repository',
      'check.permissions': 'Permission mode',
      'check.commands.ok': '{resolved} of {total} commands have captured output',
      'check.commands.warn': 'only {resolved} of {total} commands left output',
      'check.commands.none': 'no shell call in this session',
      'check.failures.ok': 'no failing command recorded',
      'check.failures.warn': '{count} commands returned an error',
      'check.tests.ok': '{total} test or lint runs passed',
      'check.tests.warn': '{failed} of {total} test or lint runs reported failure',
      'check.tests.none': 'no test or lint command recorded',
      'check.edits.ok': '{files} files, {added} lines added',
      'check.edits.none': 'no file change captured',
      'check.repo.ok': '{root} · branch {branch} · {dirty} uncommitted',
      'check.repo.clean': '{root} · branch {branch} · clean tree',
      'check.repo.none': 'working directory is not a git repository',
      'check.permissions.ok': 'sandbox {sandbox} · approval {approval}',
      'check.permissions.warn': 'sandbox {sandbox} · approval {approval} (permissive)',
      'git.title': 'REPOSITORY',
      'git.branch': 'BRANCH',
      'git.commit': 'COMMIT',
      'git.last': 'LAST COMMIT',
      'git.dirty': 'UNCOMMITTED',
      'git.diff': 'DIFF',
      'git.none': 'Working directory is not a git repository, or git is unavailable.',
      'files.title': 'CHANGED FILES',
      'files.none': 'No file change was captured in this session.',
      'kind.prompt': 'PROMPT',
      'kind.think': 'THINK',
      'kind.read': 'READ',
      'kind.edit': 'EDIT',
      'kind.cmd': 'COMMAND',
      'kind.say': 'OUTPUT',
      'kind.note': 'OTHER',
      'evidence': 'EVIDENCE',
      'empty.events': 'No events under this filter',
      'empty.sessions': 'No sessions found',
      'empty.filtered': 'No matching session',
      'empty.server.title': 'Local engine not connected',
      'empty.server.body': 'This page reads transcripts from this machine. Run the command below inside the project folder: it starts the local engine and opens this page.',
      'empty.server.hint': 'You can also import a report JSON produced by scan.',
      'export.title': 'AgentProof report',
      'export.generated': 'Generated',
      'toast.refreshed': 'Rescanned',
      'toast.imported': 'Report imported',
      'toast.badjson': 'Could not parse JSON',
      'toast.exported': 'Report exported as HTML',
      'footer.local': 'LOCAL-FIRST · NO TELEMETRY · DATA NEVER LEAVES THIS MACHINE',
      'footer.generated': 'Generated',
      'footer.sessions': '{n} sessions',
      'footer.export': 'Export offline HTML',
      'loading': 'Reading…',
    },
  };

  var KINDS = ['prompt', 'think', 'read', 'edit', 'cmd', 'say', 'note'];
  var KIND_LETTER = { prompt: 'U', think: 'R', read: 'r', edit: 'E', cmd: '$', say: 'A', note: '·' };

  var state = {
    lang: 'zh',
    offline: false,
    sessions: [],
    inventory: null,
    totals: null,
    generatedAt: null,
    selected: null,
    detail: null,
    filter: 'all',
    kind: 'all',
    query: '',
    open: {},
  };

  // ---------- helpers ----------

  function t(key, vars) {
    var dict = I18N[state.lang] || I18N.zh;
    var value = dict[key];
    if (value === undefined) value = I18N.zh[key];
    if (value === undefined) return key;
    if (vars) {
      Object.keys(vars).forEach(function (k) {
        value = value.split('{' + k + '}').join(String(vars[k]));
      });
    }
    return value;
  }

  function esc(value) {
    return String(value === null || value === undefined ? '' : value)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function $(id) { return document.getElementById(id); }
  function pad2(n) { return String(n).padStart(2, '0'); }

  function clockTime(ms) {
    if (!ms) return '--:--:--';
    var d = new Date(ms);
    return pad2(d.getHours()) + ':' + pad2(d.getMinutes()) + ':' + pad2(d.getSeconds());
  }

  function shortDate(ms) {
    if (!ms) return '—';
    var d = new Date(ms);
    return pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()) + ' ' + pad2(d.getHours()) + ':' + pad2(d.getMinutes());
  }

  function fullStamp(ms) {
    if (!ms) return '—';
    var d = new Date(ms);
    return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate())
      + ' ' + pad2(d.getHours()) + ':' + pad2(d.getMinutes());
  }

  function duration(ms) {
    if (!ms || ms < 0) return '—';
    var s = Math.round(ms / 1000);
    if (s < 60) return s + 's';
    var m = Math.floor(s / 60);
    if (m < 60) return m + 'm ' + pad2(s % 60) + 's';
    var h = Math.floor(m / 60);
    if (h < 48) return h + 'h ' + pad2(m % 60) + 'm';
    return Math.floor(h / 24) + 'd ' + (h % 24) + 'h';
  }

  function compact(n) {
    n = Number(n) || 0;
    if (n < 1000) return String(n);
    if (n < 1000000) return (n / 1000).toFixed(n < 10000 ? 1 : 0) + 'k';
    return (n / 1000000).toFixed(1) + 'M';
  }

  function basename(p) {
    var s = String(p || '').replace(/\\/g, '/').replace(/\/+$/, '');
    return s.slice(s.lastIndexOf('/') + 1) || s;
  }

  var toastTimer = null;
  function toast(message) {
    var existing = document.querySelector('.toast');
    if (existing) existing.remove();
    var node = document.createElement('div');
    node.className = 'toast';
    node.setAttribute('role', 'status');
    node.textContent = message;
    document.body.appendChild(node);
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      node.classList.add('out');
      setTimeout(function () { node.remove(); }, 240);
    }, 2200);
  }

  function applyI18n() {
    var nodes = document.querySelectorAll('[data-i18n]');
    for (var i = 0; i < nodes.length; i++) nodes[i].textContent = t(nodes[i].getAttribute('data-i18n'));
    var holders = document.querySelectorAll('[data-i18n-placeholder]');
    for (var j = 0; j < holders.length; j++) holders[j].setAttribute('placeholder', t(holders[j].getAttribute('data-i18n-placeholder')));
    document.documentElement.lang = state.lang === 'zh' ? 'zh-CN' : 'en';
    document.title = state.lang === 'zh' ? 'AgentProof · 本地运行检查器' : 'AgentProof · local run inspector';
    $('langZh').setAttribute('aria-pressed', String(state.lang === 'zh'));
    $('langEn').setAttribute('aria-pressed', String(state.lang === 'en'));
  }

  function setLang(lang) {
    state.lang = lang === 'en' ? 'en' : 'zh';
    try { localStorage.setItem('agentproof-lang', state.lang); } catch (e) { /* private mode */ }
    applyI18n();
    renderRail();
    renderMain();
  }

  // ---------- data ----------

  function setLive(status) {
    $('live').setAttribute('data-state', status);
    $('liveText').textContent = t(status === 'on' ? 'live.on' : (status === 'off' ? 'live.off' : 'live.connecting'));
  }

  function loadReport(quiet) {
    var wanted = readHash().s || null;
    var only = (state.filter === 'codex' || state.filter === 'claude') ? state.filter : null;
    if (!quiet) setLive('busy');
    /* Pull per source when a source filter is active: Claude Code transcripts can
       all be older than the newest Codex ones, so one global slice would hide them. */
    return fetch('/api/report?limit=80' + (only ? '&only=' + encodeURIComponent(only) : ''), { cache: 'no-store' })
      .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .then(function (data) {
        state.offline = false;
        state.sessions = data.sessions || [];
        state.totals = data.totals || null;
        state.inventory = data.inventory || state.inventory;
        state.generatedAt = data.generatedAt || Date.now();
        setLive('on');
        renderRail();
        var stillThere = state.sessions.some(function (s) { return s.id === state.selected; });
        if (!stillThere) {
          var target = wanted && state.sessions.filter(function (s) { return s.id === wanted; })[0];
          var first = target || visibleSessions()[0] || state.sessions[0];
          if (first) selectSession(first.id, !state.bootstrapped);
          else { state.detail = null; renderMain(); }
        }
        state.bootstrapped = true;
        if (!quiet) toast(t('toast.refreshed'));
      })
      .catch(function () {
        state.offline = true;
        setLive('off');
        renderRail();
        renderMain();
      });
  }

  function selectSession(id, keepKind) {
    state.selected = id;
    state.detail = null;
    if (!keepKind) state.kind = 'all';
    state.open = {};
    writeHash();
    renderRail();
    renderMain();
    fetch('/api/session?id=' + encodeURIComponent(id), { cache: 'no-store' })
      .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .then(function (data) {
        if (state.selected !== id) return;
        state.detail = data;
        renderMain();
      })
      .catch(function () {
        if (state.selected !== id) return;
        renderMain();
      });
  }

  function visibleSessions() {
    var q = state.query.trim().toLowerCase();
    return state.sessions.filter(function (s) {
      if (state.filter !== 'all' && s.source !== state.filter) return false;
      if (!q) return true;
      return (String(s.title) + ' ' + String(s.cwd || '')).toLowerCase().indexOf(q) !== -1;
    });
  }

  /* Deep links: #s=<source:id>&kind=cmd&src=codex&lang=en
     A link to one session is the whole point of an audit trail, so it has to be shareable. */
  function readHash() {
    var out = {};
    var raw = String(location.hash || '').replace(/^#/, '');
    if (!raw) return out;
    raw.split('&').forEach(function (pair) {
      var i = pair.indexOf('=');
      if (i > 0) {
        try { out[pair.slice(0, i)] = decodeURIComponent(pair.slice(i + 1)); }
        catch (e) { out[pair.slice(0, i)] = pair.slice(i + 1); }
      }
    });
    return out;
  }

  function writeHash() {
    var parts = [];
    if (state.selected) parts.push('s=' + encodeURIComponent(state.selected));
    if (state.filter !== 'all') parts.push('src=' + encodeURIComponent(state.filter));
    if (state.kind !== 'all') parts.push('kind=' + encodeURIComponent(state.kind));
    if (state.lang === 'en') parts.push('lang=en');
    var next = parts.length ? '#' + parts.join('&') : location.pathname + location.search;
    try { history.replaceState(null, '', next); } catch (e) { /* file:// */ }
  }

  // ---------- rail ----------

  function renderRailFilters() {
    var inv = state.inventory;
    var counts = inv && inv.bySource
      ? { all: inv.total, codex: inv.bySource.codex || 0, claude: inv.bySource.claude || 0 }
      : { all: state.sessions.length, codex: 0, claude: 0 };
    var rows = [['all', t('filter.all')], ['codex', 'Codex'], ['claude', 'Claude Code']];
    $('railFilters').innerHTML = rows.map(function (row) {
      return '<button type="button" class="chip clipped-sm" data-filter="' + row[0] + '" aria-pressed="'
        + (state.filter === row[0]) + '">' + esc(row[1]) + '<b>' + (counts[row[0]] || 0) + '</b></button>';
    }).join('');
  }

  function renderRail() {
    renderRailFilters();
    var list = visibleSessions();
    $('railCount').innerHTML = '<span class="label">' + esc(t('footer.sessions', { n: list.length })) + '</span>'
      + (state.totals ? '<span class="label">' + compact(state.totals.events) + ' '
        + esc(state.lang === 'zh' ? '事件' : 'events') + '</span>' : '');

    if (!list.length) {
      $('railList').innerHTML = '<div class="empty">'
        + esc(state.offline ? t('empty.sessions') : t('empty.filtered')) + '</div>';
      return;
    }

    $('railList').innerHTML = list.map(function (s) {
      return '<button type="button" class="session" role="option" data-id="' + esc(s.id) + '" aria-selected="'
        + (state.selected === s.id) + '">'
        + '<div class="session-top">'
        + '<span class="tag ' + (s.source === 'codex' ? 'tag--codex' : 'tag--claude') + '">' + esc(s.sourceLabel) + '</span>'
        + '<span class="micro num">' + esc(shortDate(s.endedAt)) + '</span>'
        + '<span class="micro num" style="margin-left:auto">' + esc(duration(s.durationMs)) + '</span>'
        + '</div>'
        + '<div class="session-title">' + esc(s.title) + '</div>'
        + '<div class="session-meta">'
        + '<span class="micro num">' + s.counts.commands + ' cmd</span>'
        + (s.counts.failures ? '<span class="tag tag--fail">' + s.counts.failures + ' fail</span>' : '')
        + '<span class="micro num">' + s.counts.edits + ' ' + esc(state.lang === 'zh' ? '文件' : 'files') + '</span>'
        + '<span class="session-path" title="' + esc(s.cwd || '') + '">' + esc(basename(s.cwd) || s.cwd || '') + '</span>'
        + '</div></button>';
    }).join('');
  }

  // ---------- main ----------

  function checkText(check) {
    var d = check.data || {};
    if (check.id === 'commands') {
      if (!d.total) return t('check.commands.none');
      return t(check.level === 'ok' ? 'check.commands.ok' : 'check.commands.warn', { resolved: d.resolved, total: d.total });
    }
    if (check.id === 'failures') {
      if (!d.count) return t('check.failures.ok');
      return t('check.failures.warn', { count: d.count })
        + (d.samples && d.samples.length ? ' · ' + d.samples.join(' · ') : '');
    }
    if (check.id === 'tests') {
      if (!d.total) return t('check.tests.none');
      return d.failed ? t('check.tests.warn', { failed: d.failed, total: d.total }) : t('check.tests.ok', { total: d.total });
    }
    if (check.id === 'edits') {
      if (!d.files) return t('check.edits.none');
      return t('check.edits.ok', { files: d.files, added: d.added });
    }
    if (check.id === 'repo') {
      if (d.none) return t('check.repo.none');
      return d.dirty
        ? t('check.repo.ok', { root: d.root, branch: d.branch || 'detached', dirty: d.dirty })
        : t('check.repo.clean', { root: d.root, branch: d.branch || 'detached' });
    }
    if (check.id === 'permissions') {
      return t(check.level === 'ok' ? 'check.permissions.ok' : 'check.permissions.warn',
        { sandbox: d.sandbox || 'n/a', approval: d.approval || 'n/a' });
    }
    return check.detail || '';
  }

  function scoreRing(score) {
    var r = 34;
    var c = 2 * Math.PI * r;
    var level = score >= 70 ? 'pass' : (score >= 40 ? 'warn' : 'fail');
    return '<div class="score">'
      + '<div class="score-ring clipped-sm" data-level="' + level + '">'
      + '<svg width="84" height="84" viewBox="0 0 84 84" aria-hidden="true">'
      + '<circle class="track" cx="42" cy="42" r="' + r + '" fill="none" stroke-width="4"></circle>'
      + '<circle class="value" cx="42" cy="42" r="' + r + '" fill="none" stroke-width="4" stroke-dasharray="'
      + c.toFixed(1) + '" stroke-dashoffset="' + (c * (1 - score / 100)).toFixed(1) + '"></circle>'
      + '</svg></div>'
      + '<div class="score-caption">'
      + '<span class="label">' + esc(t('checks.coverage')) + '</span>'
      + '<span class="score-num num">' + score + '<small>%</small></span>'
      + '</div></div>';
  }

  function statCell(spec) {
    return '<div class="stat"' + (spec.tone ? ' data-tone="' + spec.tone + '"' : '') + '>'
      + '<dt class="label">' + esc(spec.label) + '</dt>'
      + '<dd class="num">' + esc(spec.value) + (spec.unit ? '<small>' + esc(spec.unit) + '</small>' : '') + '</dd>'
      + '<div class="sub">' + esc(spec.sub || '') + '</div>'
      + '</div>';
  }

  function renderTimeline(session) {
    var events = session.events || [];
    var counts = {};
    events.forEach(function (e) { counts[e.kind] = (counts[e.kind] || 0) + 1; });

    var chips = '<button type="button" class="chip clipped-sm" data-kind="all" aria-pressed="'
      + (state.kind === 'all') + '">' + esc(t('filter.all')) + '<b>' + events.length + '</b></button>';
    KINDS.forEach(function (kind) {
      if (!counts[kind]) return;
      chips += '<button type="button" class="chip clipped-sm" data-kind="' + kind + '" aria-pressed="'
        + (state.kind === kind) + '">' + esc(t('kind.' + kind)) + '<b>' + counts[kind] + '</b></button>';
    });

    var list = state.kind === 'all' ? events : events.filter(function (e) { return e.kind === state.kind; });
    var body;
    if (!list.length) {
      body = '<div class="empty">' + esc(t('empty.events')) + '</div>';
    } else {
      body = list.map(function (e, index) {
        var key = e.kind + ':' + (e.at || index) + ':' + index;
        var isOpen = !!state.open[key];
        var evidence = e.evidence || (e.files && e.files.length ? e.files.join('\n') : '');
        return '<button type="button" class="event" data-key="' + esc(key) + '" data-kind="' + esc(e.kind) + '"'
          + (e.ok === false ? ' data-ok="false"' : '') + ' aria-expanded="' + isOpen + '">'
          + '<span class="event-time num">' + esc(e.at ? clockTime(e.at) : '--:--:--') + '</span>'
          + '<span class="event-dot" aria-hidden="true">' + esc(KIND_LETTER[e.kind] || '·') + '</span>'
          + '<span class="event-body">'
          + '<span class="event-title">' + esc(e.title) + '</span>'
          + (e.detail ? '<span class="event-note">' + esc(e.detail) + '</span>' : '')
          + (isOpen && evidence
            ? '<span class="evidence"><span class="label" style="display:block;margin-bottom:6px">'
              + esc(t('evidence')) + '</span>' + esc(evidence) + '</span>'
            : '')
          + '</span></button>';
      }).join('');
    }

    return '<section class="panel clipped panel--ticked">'
      + '<div class="panel-head"><div><div class="label">' + esc(t('timeline.title')) + '</div>'
      + '<h2>' + esc(t('timeline.sub')) + '</h2></div>'
      + '<div class="chips">' + chips + '</div></div>'
      + '<div class="panel-body"><div class="timeline">' + body + '</div></div></section>';
  }

  function renderChecks(detail) {
    var checks = (detail.verify && detail.verify.checks) || [];
    var mark = { ok: '✓', warn: '!', info: '·' };
    var rows = checks.map(function (c) {
      return '<div class="check" data-level="' + esc(c.level) + '">'
        + '<span class="check-mark" aria-hidden="true">' + (mark[c.level] || '·') + '</span>'
        + '<span><span class="check-id">' + esc(t('check.' + c.id)) + '</span>'
        + '<span class="check-detail">' + esc(checkText(c)) + '</span></span>'
        + '<span class="check-value num">' + (c.value === undefined || c.value === null ? '' : c.value) + '</span>'
        + '</div>';
    }).join('');
    return '<section class="panel clipped"><div class="panel-head"><div>'
      + '<div class="label">' + esc(t('checks.title')) + '</div>'
      + '<h2>' + esc(t('checks.sub')) + '</h2></div></div>'
      + '<div class="panel-body">' + rows + '</div></section>';
  }

  function renderGit(detail) {
    var git = detail.git;
    if (!git) {
      return '<section class="panel clipped"><div class="panel-head"><div>'
        + '<div class="label">' + esc(t('git.title')) + '</div></div></div>'
        + '<div class="panel-body"><p class="check-detail">' + esc(t('git.none')) + '</p></div></section>';
    }
    var total = (git.diff.adds + git.diff.dels) || 1;
    var addPct = Math.round((git.diff.adds / total) * 100);
    return '<section class="panel clipped"><div class="panel-head"><div>'
      + '<div class="label">' + esc(t('git.title')) + '</div></div></div>'
      + '<div class="panel-body"><dl class="kv">'
      + '<dt>' + esc(t('git.branch')) + '</dt><dd class="mono">' + esc(git.branch || 'detached') + '</dd>'
      + '<dt>' + esc(t('git.commit')) + '</dt><dd class="mono">' + esc(git.commit || '—') + '</dd>'
      + '<dt>' + esc(t('git.last')) + '</dt><dd>' + esc(git.lastCommit || '—') + '</dd>'
      + '<dt>' + esc(t('git.dirty')) + '</dt><dd class="mono">' + git.dirty.length + '</dd>'
      + '<dt>' + esc(t('git.diff')) + '</dt><dd class="mono">+' + git.diff.adds + ' / -' + git.diff.dels + '</dd>'
      + '</dl><div class="diffbar"><i class="add" style="width:' + addPct + '%"></i>'
      + '<i class="del" style="width:' + (100 - addPct) + '%"></i></div></div></section>';
  }

  function renderFiles(session) {
    var files = session.files || [];
    var body = files.length
      ? '<div class="filelist">' + files.slice(0, 40).map(function (f) {
          var full = String(f.path || '').replace(/\\/g, '/');
          var cut = full.lastIndexOf('/');
          var name = cut === -1 ? full : full.slice(cut + 1);
          var dir = cut === -1 ? '' : full.slice(0, cut);
          return '<div class="filerow" title="' + esc(full) + '">'
            + '<span class="fname"><b>' + esc(name) + '</b><em>' + esc(dir) + '</em></span>'
            + '<span class="delta num"><b>+' + (f.added || 0) + '</b> <i>-' + (f.removed || 0) + '</i></span></div>';
        }).join('') + '</div>'
        + (files.length > 40 ? '<p class="micro" style="margin-top:8px">+' + (files.length - 40) + '</p>' : '')
      : '<p class="check-detail">' + esc(t('files.none')) + '</p>';
    return '<section class="panel clipped"><div class="panel-head"><div>'
      + '<div class="label">' + esc(t('files.title')) + '</div></div></div>'
      + '<div class="panel-body">' + body + '</div></section>';
  }

  function renderEmptyMain() {
    return '<div class="state-screen"><div class="state-card panel clipped panel--ticked">'
      + '<div class="label">' + esc(t('empty.server.title')) + '</div>'
      + '<h2>' + esc(state.lang === 'zh' ? '本机日志，本机读取' : 'Reads local logs, locally') + '</h2>'
      + '<p>' + esc(t('empty.server.body')) + '</p>'
      + '<div class="code-block">cd D:\\gpt\\vibe\\agentproof\r\nnode agentproof.mjs serve --open</div>'
      + '<p class="micro">' + esc(t('empty.server.hint')) + '</p>'
      + '</div></div>';
  }

  function renderMain() {
    var detail = state.detail;
    if (state.offline && !detail) { $('mainInner').innerHTML = renderEmptyMain(); return; }

    if (!detail) {
      $('mainInner').innerHTML = '<div class="state-screen"><div class="state-card panel clipped">'
        + '<div class="label">' + esc(t('loading')) + '</div>'
        + '<div class="skeleton skel-row"></div><div class="skeleton skel-row"></div>'
        + '<div class="skeleton skel-row"></div></div></div>';
      return;
    }

    var session = detail.session;
    var counts = session.counts || {};
    var score = (detail.verify && detail.verify.score) || 0;
    var status = score >= 70 ? 'verified' : (score >= 40 ? 'attention' : 'open');
    var cmds = session.commands || [];
    var failed = cmds.filter(function (c) { return c.ok === false; }).length;
    var tokens = (session.tokens && session.tokens.output) || 0;
    var ctx = (session.tokens && session.tokens.contextPeak) || 0;

    var html = ''
      + '<div class="crumb"><span class="label">' + esc(t('crumb.workspace')) + '</span><i>/</i>'
      + '<span class="label">' + esc(t('crumb.session')) + '</span></div>'
      + '<section class="hero"><div class="hero-main">'
      + '<div class="status-pill" data-state="' + (status === 'verified' ? 'ok' : (status === 'attention' ? 'warn' : 'fail')) + '">'
      + '<i aria-hidden="true"></i><span>' + esc(t('status.' + status)) + '</span></div>'
      + '<h1>' + esc(session.title) + '</h1>'
      + '<div class="hero-sub">'
      + '<span class="mono">' + esc(session.sourceLabel) + '</span><span class="sep">·</span>'
      + '<span class="mono">' + esc(session.model || 'unknown model') + '</span><span class="sep">·</span>'
      + '<span class="mono" title="' + esc(session.cwd || '') + '">' + esc(session.cwd || '—') + '</span><span class="sep">·</span>'
      + '<span class="mono num">' + esc(fullStamp(session.startedAt)) + ' → ' + esc(clockTime(session.endedAt)) + '</span>'
      + '</div></div>' + scoreRing(score) + '</section>'
      + '<section class="stats">'
      + statCell({ label: t('stat.commands'), value: cmds.length, sub: t('stat.commands.sub') })
      + statCell({ label: t('stat.failures'), value: failed, sub: t('stat.failures.sub'), tone: failed ? 'fail' : null })
      + statCell({ label: t('stat.files'), value: (session.files || []).length, sub: t('stat.files.sub') })
      + statCell({ label: t('stat.prompts'), value: counts.prompts || 0, sub: t('stat.prompts.sub') })
      + statCell({ label: t('stat.duration'), value: duration(session.durationMs), sub: t('stat.duration.sub') })
      + statCell({ label: t('stat.tokens'), value: compact(tokens), sub: t('stat.tokens.sub') + (ctx ? ' ' + compact(ctx) : '') })
      + '</section>'
      + '<div class="columns"><div>' + renderTimeline(session) + '</div>'
      + '<div class="side-stack">' + renderChecks(detail) + renderGit(detail) + renderFiles(session) + '</div>'
      + '</div>'
      + '<footer class="footer">'
      + '<span class="label">' + esc(t('footer.local')) + '</span>'
      + '<span class="label"><a href="#" id="exportLink">' + esc(t('footer.export')) + '</a> · '
      + esc(t('footer.generated')) + ' ' + esc(fullStamp(state.generatedAt)) + '</span>'
      + '</footer>';

    if (session.truncated) {
      html += '<p class="micro" style="margin-top:10px">' + esc(state.lang === 'zh'
        ? '时间线仅显示最近 4000 条事件（共 ' + session.eventsTotal + ' 条）'
        : 'Timeline shows the last 4000 of ' + session.eventsTotal + ' events') + '</p>';
    }

    $('mainInner').innerHTML = html;
  }

  // ---------- export / import ----------

  function exportHtml() {
    var detail = state.detail;
    if (!detail) return;
    var session = detail.session;
    var zh = state.lang === 'zh';
    var checks = ((detail.verify && detail.verify.checks) || []).map(function (c) {
      return '<li><b>' + esc(t('check.' + c.id)) + '</b> — ' + esc(checkText(c)) + '</li>';
    }).join('');
    var events = (session.events || []).map(function (e) {
      return '<tr><td>' + esc(e.at ? clockTime(e.at) : '') + '</td><td>' + esc(t('kind.' + e.kind))
        + '</td><td>' + esc(e.title) + (e.detail ? '<br><small>' + esc(e.detail) + '</small>' : '') + '</td></tr>';
    }).join('');
    var files = (session.files || []).map(function (f) {
      return '<tr><td>' + esc(f.path) + '</td><td>+' + (f.added || 0) + ' / -' + (f.removed || 0) + '</td></tr>';
    }).join('');
    var git = detail.git
      ? '<p class="meta"><b>' + esc(t('git.branch')) + '</b> ' + esc(detail.git.branch || '')
        + ' &nbsp; <b>' + esc(t('git.commit')) + '</b> ' + esc(detail.git.commit || '')
        + ' &nbsp; <b>' + esc(t('git.dirty')) + '</b> ' + detail.git.dirty.length + '</p>'
      : '';

    var doc = '<!doctype html><html lang="' + (zh ? 'zh-CN' : 'en') + '"><meta charset="utf-8">'
      + '<title>' + esc(t('export.title')) + ' · ' + esc(session.title) + '</title>'
      + '<style>'
      + 'body{font:15px/1.6 -apple-system,"Segoe UI",system-ui,sans-serif;max-width:900px;margin:44px auto;padding:0 22px;color:#16191d}'
      + 'h1{font-size:26px;letter-spacing:-.02em;margin:.2em 0}'
      + 'h2{font-size:13px;text-transform:uppercase;letter-spacing:.14em;color:#6b7280;margin:34px 0 10px;font-weight:600}'
      + 'table{width:100%;border-collapse:collapse;font-size:13.5px}'
      + 'td{padding:7px 10px;border-bottom:1px solid #e6e8ec;vertical-align:top}'
      + 'td:first-child{white-space:nowrap;color:#6b7280;font-variant-numeric:tabular-nums}'
      + '.meta{color:#4b5563;font-size:13.5px}.meta b{color:#111;font-weight:600}'
      + 'ul{padding-left:20px}li{margin:5px 0}'
      + '</style>'
      + '<h1>' + esc(session.title) + '</h1>'
      + '<p class="meta"><b>' + esc(session.sourceLabel) + '</b> · ' + esc(session.model || '') + ' · '
      + esc(session.cwd || '') + ' · ' + esc(fullStamp(session.startedAt)) + ' → ' + esc(clockTime(session.endedAt))
      + ' (' + esc(duration(session.durationMs)) + ')</p>'
      + git
      + '<h2>' + esc(t('checks.title')) + '</h2><ul>' + checks + '</ul>'
      + '<h2>' + esc(t('files.title')) + '</h2><table>' + (files || '<tr><td>—</td><td></td></tr>') + '</table>'
      + '<h2>' + esc(t('timeline.title')) + '</h2><table>' + events + '</table>'
      + '<p class="meta" style="margin-top:34px">' + esc(t('footer.local')) + ' · '
      + esc(t('export.generated')) + ' ' + esc(fullStamp(Date.now())) + '</p></html>';

    var a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([doc], { type: 'text/html' }));
    a.download = 'agentproof-' + String(session.id).replace(/[^\w.-]+/g, '').slice(0, 40) + '.html';
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 4000);
    toast(t('toast.exported'));
  }

  function importFile(file) {
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function () {
      var parsed;
      try { parsed = JSON.parse(reader.result); } catch (e) { toast(t('toast.badjson')); return; }
      if (parsed.session) {
        state.detail = parsed;
        state.selected = parsed.session.id;
        renderMain();
        toast(t('toast.imported'));
        return;
      }
      if (parsed.sessions && parsed.sessions.length) {
        state.offline = true;
        state.sessions = parsed.sessions;
        state.totals = parsed.totals || null;
        state.generatedAt = parsed.generatedAt || Date.now();
        state.selected = null;
        state.detail = null;
        renderRail();
        renderMain();
        toast(t('toast.imported'));
        return;
      }
      toast(t('toast.badjson'));
    };
    reader.readAsText(file);
  }

  // ---------- wiring ----------

  function step(delta) {
    var list = visibleSessions();
    if (!list.length) return;
    var index = -1;
    for (var i = 0; i < list.length; i++) if (list[i].id === state.selected) { index = i; break; }
    var next = Math.min(list.length - 1, Math.max(0, (index === -1 ? 0 : index) + delta));
    if (list[next] && list[next].id !== state.selected) selectSession(list[next].id);
  }

  function wire() {
    $('langZh').addEventListener('click', function () { setLang('zh'); });
    $('langEn').addEventListener('click', function () { setLang('en'); });
    $('refreshBtn').addEventListener('click', function () { loadReport(false); });
    $('importBtn').addEventListener('click', function () { $('file').click(); });
    $('file').addEventListener('change', function (e) {
      importFile(e.target.files && e.target.files[0]);
      e.target.value = '';
    });
    $('search').addEventListener('input', function (e) { state.query = e.target.value; renderRail(); });

    $('railFilters').addEventListener('click', function (e) {
      var chip = e.target.closest('[data-filter]');
      if (!chip) return;
      state.filter = chip.getAttribute('data-filter');
      writeHash();
      renderRail();
      loadReport(true);
    });

    $('railList').addEventListener('click', function (e) {
      var item = e.target.closest('[data-id]');
      if (item) selectSession(item.getAttribute('data-id'));
    });

    $('main').addEventListener('click', function (e) {
      if (e.target.closest('#exportLink')) { e.preventDefault(); exportHtml(); return; }
      /* Timeline rows also carry data-kind for styling, so the chip selector
         has to be explicit or clicking a row would filter instead of expand. */
      var chip = e.target.closest('.chip[data-kind]');
      if (chip) { state.kind = chip.getAttribute('data-kind'); writeHash(); renderMain(); return; }
      var event = e.target.closest('.event[data-key]');
      if (event) {
        var key = event.getAttribute('data-key');
        state.open[key] = !state.open[key];
        renderMain();
      }
    });

    document.addEventListener('keydown', function (e) {
      var tag = (e.target && e.target.tagName) || '';
      var typing = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
      if (e.key === '/' && !typing) { e.preventDefault(); $('search').focus(); return; }
      if (e.key === 'Escape' && typing) {
        $('search').value = '';
        state.query = '';
        renderRail();
        $('search').blur();
        return;
      }
      if (typing) return;
      if (e.key === 'ArrowDown' || e.key === 'j') { e.preventDefault(); step(1); }
      else if (e.key === 'ArrowUp' || e.key === 'k') { e.preventDefault(); step(-1); }
      else if (e.key === 'r') loadReport(false);
      else if (e.key === 'e') exportHtml();
    });
  }

  function init() {
    var hash = readHash();
    var saved = null;
    try { saved = localStorage.getItem('agentproof-lang'); } catch (e) { /* ignore */ }
    if (hash.lang === 'en' || hash.lang === 'zh') state.lang = hash.lang;
    else if (saved === 'en' || saved === 'zh') state.lang = saved;
    else state.lang = (navigator.language || 'zh').toLowerCase().indexOf('zh') === 0 ? 'zh' : 'en';
    if (hash.src === 'codex' || hash.src === 'claude') state.filter = hash.src;
    if (hash.kind && KINDS.indexOf(hash.kind) !== -1) state.kind = hash.kind;
    applyI18n();
    wire();
    renderRail();
    renderMain();
    loadReport(true);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
