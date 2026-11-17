const app = document.getElementById('app');
const LEVELS = [['must', '必须改·卡审核'], ['should', '建议改·大问题'], ['optional', '可以改·小问题'], ['human', '待确认'], ['unknown', '无法核'], ['checklist', '内容方面']];
const LNAME = Object.fromEntries(LEVELS);
let me = null, timer = null;

const api = async (m, u, b) => {
  const r = await fetch(u, { method: m, headers: { 'Content-Type': 'application/json' }, body: b ? JSON.stringify(b) : undefined });
  if (r.status === 401) { me = null; location.hash = '#/login'; throw new Error('401'); }
  return r.json();
};
const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function header() {
  return `<div class="top"><div class="wrap">
    <span class="brand"><span class="dot"></span>审片工作台</span>
    <span class="muted">v0.1</span>
    <div class="spacer"></div>
    <span class="muted">${me ? esc(me) : ''}</span>
    ${me ? '<button class="ghost tiny" onclick="logout()">退出</button>' : ''}
  </div></div>`;
}

window.logout = async () => { await fetch('/api/logout'); me = null; location.hash = '#/login'; };

// ---------- 登录 ----------
function renderLogin() {
  app.innerHTML = header() + `<div class="wrap"><div class="card login">
    <h2>登录</h2>
    <label>账号</label><input id="u" value="admin" autocomplete="username">
    <label>密码</label><input id="p" type="password" value="" autocomplete="current-password">
    <p></p><button id="go" style="width:100%">进入工作台</button>
    <p class="muted">默认 admin / 123456</p>
  </div></div>`;
  const gu = document.getElementById('u'), gp = document.getElementById('p'), gb = document.getElementById('go');
  gb.onclick = async () => {
    const r = await fetch('/api/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user: gu.value, pass: gp.value }) });
    const d = await r.json();
    if (d.ok) { me = d.user; location.hash = '#/jobs'; } else alert(d.msg || '登录失败');
  };
  gp.onkeydown = e => { if (e.key === 'Enter') gb.click(); };
}

// ---------- 列表 ----------
async function renderJobs() {
  app.innerHTML = header() + `<div class="wrap">
    <div class="card">
      <div class="drop" id="drop">把视频拖进来，或 <a href="#" id="pick">点这里选文件</a><br><span class="muted">mp4 / mov，单条 500MB 以内</span></div>
      <input type="file" id="file" accept="video/*" style="display:none">
    </div>
    <div class="card"><table><thead><tr><th>片子</th><th>状态</th><th>阶段</th><th>上传时间</th><th></th></tr></thead>
    <tbody id="tb"><tr><td colspan="5" class="muted">加载中…</td></tr></tbody></table></div>
  </div>`;

  const drop = document.getElementById('drop'), file = document.getElementById('file');
  document.getElementById('pick').onclick = e => { e.preventDefault(); file.click(); };
  file.onchange = () => file.files[0] && upload(file.files[0]);
  drop.ondragover = e => { e.preventDefault(); drop.classList.add('hot'); };
  drop.ondragleave = () => drop.classList.remove('hot');
  drop.ondrop = e => { e.preventDefault(); drop.classList.remove('hot'); const f = e.dataTransfer.files[0]; if (f) upload(f); };

  async function upload(f) {
    drop.innerHTML = `上传中：${esc(f.name)}　<span class="muted">${(f.size / 1048576).toFixed(1)} MB</span>`;
    const r = await fetch('/api/jobs', { method: 'POST', headers: { 'X-Filename': encodeURIComponent(f.name) }, body: f });
    const d = await r.json();
    if (d.ok) location.hash = '#/job/' + d.id; else alert(d.msg || '上传失败');
  }

  const draw = async () => {
    const { jobs } = await api('GET', '/api/jobs');
    const tb = document.getElementById('tb');
    if (!tb) return;
    tb.innerHTML = jobs.length ? jobs.map(j => `<tr>
      <td><a href="#/job/${j.id}">${esc(j.name)}</a></td>
      <td><span class="badge ${j.status === 'reviewed' ? 'b-done' : j.status === 'done' ? 'b-done' : j.status === 'running' ? 'b-run' : 'b-wait'}">${j.status === 'reviewed' ? '已审核' : j.status === 'done' ? '已出结果' : j.status === 'running' ? '分析中' : '排队'}</span></td>
      <td class="muted">${esc(j.stage || '')}</td>
      <td class="muted">${new Date(j.createdAt).toLocaleString('zh-CN')}</td>
      <td><a href="#/job/${j.id}">打开</a></td></tr>`).join('') : `<tr><td colspan="5" class="muted">还没有片子，先传一条</td></tr>`;
    if (jobs.some(j => j.status === 'pending' || j.status === 'running')) { clearTimeout(timer); timer = setTimeout(draw, 1200); }
  };
  draw();
}

let FILTER = 'all';

async function renderJob(id) {
  clearTimeout(timer);
  app.innerHTML = header() + `<div class="wrap"><div class="card muted">加载中…</div></div>`;
  const j = await api('GET', '/api/jobs/' + id);
  j.id = id; CUR = j;
  paint();
  // 只在真的还在跑的时候轮询；done / reviewed 都停
  if (j.status === 'pending' || j.status === 'running') {
    timer = setTimeout(() => renderJob(id), 1200);
  }
}

/* 只重画，不重新拉接口——本地改动不会被服务端数据冲掉 */
function paint() {
  const j = CUR;
  if (!j) return;
  const stages = (j.stages || []).map(s => `<span class="stage ${s.status}">${s.status === 'done' ? '✓' : s.status === 'running' ? '●' : '○'} ${esc(s.name)}</span>`).join('');
  const v = j.verdict;

  if (!v) {
    app.innerHTML = header() + `<div class="wrap">
      <div class="card"><a href="#/jobs">← 返回</a>　<b>${esc(j.name)}</b>
      <p>${stages || '排队中…'}</p></div></div>`;
    return;
  }

  const items = v.items || [];
  const cnt = k => items.filter(x => x.level === k).length;
  const shown = FILTER === 'all' ? items : items.filter(x => x.level === FILTER);
  const chips = [['all', '全部', items.length]]
    .concat(LEVELS.map(([k, n]) => [k, n, cnt(k)]))
    .map(([k, n, c]) => `<button class="chip ${FILTER === k ? 'on' : ''}" onclick="setFilter('${k}')">${n}<span class="muted"> ${c}</span></button>`).join('');

  app.innerHTML = header() + `
  <div class="topbar">
    <div class="wrap">
      <div class="tb-top">
        <a href="#/jobs" class="tb-back">←</a>
        <b class="tb-name">${esc(j.name)}</b>
        <span class="tb-meta">
          <span id="dur">—</span> · ${(j.size / 1048576).toFixed(1)} MB · ${new Date(j.createdAt).toLocaleString('zh-CN')}
        </span>
        <span class="tb-gap"></span>
        <select id="concl">${['不能投', '整改后可投', '可投'].map(x => `<option ${v.conclusion === x ? 'selected' : ''}>${x}</option>`).join('')}</select>
        <button class="ghost" onclick="save('${j.id}')">保存</button>
        <button onclick="save('${j.id}', true)">保存并标记已审核</button>
        ${v.reviewed ? `<button class="ghost" onclick="unreview('${j.id}')">取消审核标记</button>` : ''}
        <button class="ghost" onclick="exportDoc('${j.id}')">导出 Word</button>
        <span class="muted" id="stat">${statText()}</span>
      </div>
      <div class="tb-video"><video src="/uploads/${esc(j.file)}" controls></video></div>
      <div class="chips tb-chips">${chips}<span style="flex:1"></span>
        <button class="ghost tiny" onclick="addItem('${FILTER}')">+ 加一条</button></div>
      <p class="tb-reason"><input id="reason" value="${esc(v.reason)}" placeholder="一句话理由"></p>
    </div>
  </div>
  <div class="wrap layout">
    <aside class="side">
      <video src="/uploads/${esc(j.file)}" controls></video>
      <p class="muted side-note">${stages}</p>
    </aside>
    <main class="main">
      <div id="list">${shown.length ? shown.map(x => itemHtml(x)).join('') : '<div class="card muted">这一类没有条目，点右上「+ 加一条」</div>'}</div>
    </main>
  </div>`;

  const vids = document.querySelectorAll('video');
  vids.forEach(vd => vd.addEventListener('loadedmetadata', () => {
    const el = document.getElementById('dur');
    if (el) el.textContent = Math.floor(vd.duration / 60) + ':' + String(Math.round(vd.duration % 60)).padStart(2, '0');
  }));
  if (vids[1]) {
    vids[0].addEventListener('play', () => vids[1].pause());
    vids[1].addEventListener('play', () => vids[0].pause());
  }
  document.querySelectorAll('textarea.ta').forEach(el => { el.style.height = 'auto'; el.style.height = (el.scrollHeight + el.offsetHeight - el.clientHeight) + 'px'; });
}

function statText() {
  const v = (CUR && CUR.verdict) || {};
  const t = ms => new Date(ms).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
  if (v.reviewed) return `<span class="st-ok">● 已人工审核 ${v.reviewedAt ? t(v.reviewedAt) : ''}</span>`;
  if (v.edited) return `<span class="st-draft">○ 草稿已存 ${v.editedAt ? t(v.editedAt) : ''}</span>`;
  return '<span class="st-none">未改动</span>';
}

/* 删掉这个条目的配图（有的问题不需要图） */
window.delShot = async id => {
  const it = CUR.verdict.items.find(x => x.id === id);
  if (!it) return;
  const key = shotKey(it);
  it.shot = '';
  it.noShot = true;          // 明确标记：不要图，别再自动回退到原始帧
  it.dirty = true;
  paint();
  try { await api('DELETE', `/api/jobs/${CUR.id}/shot`, { itemId: key }); } catch (e) { }
};

/* 服务端文件名用的 key：截图时会带上秒数，这里回到截图时那个 key */
function shotKey(it) { return it.shotKey || it.id; }

window.grow = el => {
  el.style.height = 'auto';
  el.style.height = (el.scrollHeight + el.offsetHeight - el.clientHeight) + 'px';
};
window.setFilter = k => { FILTER = k; paint(); };

/* 点画面 → 标注 → 存回条目 */
window.annotateItem = id => {
  const it = CUR.verdict.items.find(x => x.id === id);
  if (!it) return;
  const src = it.shot || frameUrl(it.time, it.what);
  if (!src) return alert('这条没有对应画面，先把「第几秒」填上');
  openAnnotator(src, async dataUrl => {
    const d = await api('POST', `/api/jobs/${CUR.id}/shot`, { itemId: id, data: dataUrl });
    if (!d.ok) return alert('保存失败');
    it.shot = d.url;
    delete it.noShot;
    it.dirty = true;
    paint();
    await persist();   // 立刻落库，切页面也不丢
  });
};

/* 取视频当前这一帧，挂到这条意见上 */
window.capTo = id => {
  const it = CUR.verdict.items.find(x => x.id === id);
  if (!it) return;
  const v = document.querySelector('.side video') || document.querySelector('video');
  if (!v) return alert('视频还没加载');
  if (v.readyState < 2) return alert('视频还没加载完，等一下');
  const sec = v.currentTime || 0;
  if (!CUR.cid) return alert('这条片子没有对应案例帧，截不了');
  const txt = id + '_' + Math.round(sec * 10);
  const capSrc = `/frames/${CUR.cid}/f_${String(Math.max(1, Math.round(sec * 10))).padStart(5, '0')}.jpg`;
  openAnnotator(capSrc, async dataUrl => {
    const d = await api('POST', `/api/jobs/${CUR.id}/shot`, { itemId: txt, data: dataUrl });
    if (!d.ok) return alert('保存失败');
    it.shot = d.url;
    it.shotKey = txt;
    delete it.noShot;
    // 只在原来没写秒数时才填：不覆盖这条意见本来对应的时间，免图和问题对不上
    if (!String(it.time || '').trim()) it.time = sec.toFixed(1) + ' 秒';
    it.dirty = true;
    paint();
    await persist();
  });
};

function frameUrl(time, txt) {
  if (!CUR || !CUR.cid) return '';
  const all = String(time || '').match(/\d+(?:\.\d+)?/g) || [];
  if (!all.length) return '';
  let sec = parseFloat(all[0]);
  if (all.length > 1 && /结尾|落版/.test(txt || '')) sec = parseFloat(all[all.length - 1]);
  const n = Math.max(0, Math.round(sec)) * 10;  // demo: 帧只有整秒
  return `/frames/${CUR.cid}/f_${String(n).padStart(5, '0')}.jpg`;
}

function itemHtml(x) {
  const lv = LEVELS.find(l => l[0] === x.level) || ['should', x.level];
  // 显式删过图的条目不再自动回退到原始帧
  const shot = x.noShot ? '' : (x.shot || frameUrl(x.time, x.what));
  const blank = !String(x.what || '').trim() && !String(x.action || '').trim();
  return `<div class="item lv-${x.level} ${x.dirty ? 'edited' : ''} ${blank ? 'blank' : ''}" data-id="${x.id}">
    <div class="item-head">
      <input class="t-time" value="${esc(x.time)}" onchange="upd('${x.id}','time',this.value)" placeholder="第几秒">
      <select class="t-lv lv-${x.level}" onchange="upd('${x.id}','level',this.value)">${LEVELS.map(([k, n]) => `<option value="${k}" ${x.level === k ? 'selected' : ''}>${n}</option>`).join('')}</select>
      <button class="ghost tiny" onclick="delItem('${x.id}')">删</button>
    </div>
    <div class="item-body-row">
      ${shot ? `<div class="shot"><img src="${shot}" loading="lazy" alt="画面" onclick="annotateItem('${x.id}')"><button class="ghost tiny cap" onclick="capTo('${x.id}')">截当前帧</button>${x.shot ? `<button class="ghost tiny cap del" onclick="delShot('${x.id}')">删除图片</button>` : ''}</div>` : `<div class="shot"><button class="ghost tiny cap" onclick="capTo('${x.id}')">截当前帧</button></div>`}
      <div class="fields">
        <label>问题</label><textarea class="ta" rows="2" oninput="grow(this)" onchange="upd('${x.id}','what',this.value)" placeholder="第几秒、看到什么、错在哪">${esc(x.what)}</textarea>
        <div class="row">
          <div><label>怎么改</label><textarea class="ta" rows="2" oninput="grow(this)" onchange="upd('${x.id}','action',this.value)" placeholder="具体动作，到秒、到素材">${esc(x.action)}</textarea></div>
          <div><label>为什么改</label><textarea class="ta" rows="2" oninput="grow(this)" onchange="upd('${x.id}','why',this.value)" placeholder="一句话说清后果，商家要看得懂">${esc(x.why)}</textarea></div>
        </div>
      </div>
    </div>
  </div>`;
}

// ---------- 编辑操作（挂在 window 上，供内联事件调用） ----------
let CUR = null;

window.upd = (id, k, v) => {
  const it = CUR.verdict.items.find(x => x.id === id);
  if (!it) return;
  it[k] = v; it.dirty = true;
  const el = document.querySelector(`.item[data-id="${id}"]`);
  if (el) el.classList.add('edited');
};
window.delItem = id => {
  if (!confirm('删掉这条？')) return;
  CUR.verdict.items = CUR.verdict.items.filter(x => x.id !== id);
  paint();
};
window.addItem = lv => {
  const id = 'n' + Math.random().toString(36).slice(2, 7);
  const level = lv && lv !== 'all' ? lv : 'should';
  CUR.verdict.items.unshift({ id, level, code: '', time: '', what: '', action: '', why: '', dirty: true });
  FILTER = 'all';
  paint();
  const el = document.querySelector(`.item[data-id="${id}"]`);
  if (el) {
    el.scrollIntoView({ block: 'center', behavior: 'smooth' });
    const ta = el.querySelector('textarea');
    if (ta) ta.focus();
  }
};
/* 统一的落库：返回是否成功。保存、标记审核、导出前都会先用它 */
async function persist(mark, override) {
  if (!CUR) return false;
  const items = CUR.verdict.items.filter(x => String(x.what).trim() || String(x.action).trim() || String(x.time).trim() || x.shot);
  const payload = {
    conclusion: (override && override.conclusion) || (document.getElementById('concl') || {}).value || CUR.verdict.conclusion,
    reason: (override && override.reason) !== undefined ? override.reason : ((document.getElementById('reason') || {}).value ?? CUR.verdict.reason),
    items,
  };
  if (mark === true) payload.reviewed = true;
  if (mark === false) payload.reviewed = false;
  const d = await api('PUT', `/api/jobs/${CUR.id}/verdict`, payload);
  if (!d.ok) return false;
  CUR.verdict.items = items;
  CUR.verdict.edited = true;
  CUR.verdict.editedAt = Date.now();
  if (mark === true) { CUR.verdict.reviewed = true; CUR.verdict.reviewedAt = d.reviewedAt; }
  if (mark === false) { CUR.verdict.reviewed = false; delete CUR.verdict.reviewedAt; }
  return true;
}

window.save = async (id, mark) => {
  const ok = await persist(mark === true ? true : undefined);
  if (!ok) { alert('保存失败'); return; }
  paint();
};

/* 撤销审核标记：回到「已出结果」，草稿状态保留 */
window.unreview = async id => {
  if (!confirm('撤销审核标记？这条会退回「已出结果」状态。')) return;
  const ok = await persist(false);
  if (!ok) { alert('撤销失败'); return; }
  paint();
};
window.exportDoc = async id => {
  // 先存一次：标注图只在内存里，不存就导不出
  const ok = await persist(undefined);
  if (!ok) { alert('保存失败，导出取消'); return; }
  const d = await api('POST', `/api/jobs/${id}/export`);
  if (d.ok) location.href = d.url; else alert('导出失败：' + (d.msg || ''));
};

// ---------- 路由 ----------
async function route() {
  clearTimeout(timer);
  const h = location.hash || '#/jobs';
  if (!me) { try { const r = await fetch('/api/me'); const d = await r.json(); me = d.user; } catch { } }
  if (h === '#/login' || (!me && h !== '#/login')) { renderLogin(); return; }
  if (h.startsWith('#/job/')) {
    const id = h.slice(6);
    CUR = await api('GET', '/api/jobs/' + id);
    CUR.id = id;
    renderJob(id);
    return;
  }
  renderJobs();
}
addEventListener('hashchange', route);
route();
