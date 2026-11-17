// 演示用：拦截 fetch，返回假数据。真实环境走后端。
(function () {
  const LV = ['must', 'should', 'optional', 'human', 'unknown', 'checklist'];
  const NAMES = ['示例商家A_签约视频', '示例商家B_回访视频', '示例商家C_完工视频'];

  function mk(name, i, concl, items) {
    return {
      id: 'demo' + i, name: name + '.mp4', cid: '', file: '',
      size: [219, 14, 25][i] * 1048576, createdAt: Date.now() - i * 86400000,
      status: 'done', stages: [{ name: '抽帧', status: 'done' }, { name: '转录', status: 'done' }, { name: '判定', status: 'done' }],
      verdict: {
        conclusion: concl,
        reason: [
          '锦旗挂满全片，剪不掉，只能换机位重拍',
          '四处平台字都能后期改：打码、补提示语',
          '响度真峰值超标，重导即可'
        ][i],
        items: items.map((x, k) => ({
          id: 'it' + i + '_' + k, level: x[0], code: x[1], time: x[2], what: x[3], action: x[4],
          why: x[5] || '平台审核会拦，不改投不出去',
        })),
      },
    };
  }

  const JOBS = [
    mk(NAMES[0], 0, '不能投', [
      ['must', 'DY-07', '0.0–68.9 秒', '左侧墙面从头到尾挂满锦旗，落款带业主姓名和房号', '撤掉全部锦旗后重拍坐播镜头，或换一间没有锦旗的办公室；逐帧打码等于二次遮挡，不可行'],
      ['must', 'DY-09', '68.9–69.8 秒', '结尾卡整块没有提示语', '右下角补一行「具体价格以实际装修方案为准」'],
      ['must', 'DY-02', '68.9–69.8 秒', '结尾卡写「10 天入住 10 年保修」，10 年属超长质保', '改成「住一天保一天，店开多久保多久」'],
      ['must', 'DY-04', '49.5–51.5 秒', '口播说「您刷我抖音时间也久」，字幕已经改成了「视频」', '重录这半句或整句改成「刷我视频」'],
      ['should', 'B-01', '全片', '720×1280、1.66 Mbps，低于竖屏 1080 交付线', '按原片重导到 1080×1920、8 Mbps 以上'],
      ['should', 'A-15', '0–4 秒 / 23.2–28 秒', '同一句话说了两遍', '删掉后一遍，8 秒省下来给结尾'],
      ['should', 'A-21', '33.4 秒', '最强证据出现在 33 秒，前 15 秒没给', '把「效果图 vs 实景」并置剪到 8 秒处'],
      ['optional', 'B-05', '全片', 'warmth 极差 88，暖黄和偏冷来回跳', '统一到同一组色温，或按场景分段调'],
      ['optional', 'C-12', '全片', '音效只有结尾一处', '承诺句、数字、转折各补一个'],
      ['human', 'D-05', '50.1 秒', '字幕写「视频」，盲听像「抖音」，两路证据冲突', '人耳复听一遍'],
      ['unknown', 'M-01', '—', '商家没有建档，质保、价格、案例都核不了', '先补商家档案'],
      ['checklist', 'Q1', '28–36 秒', '卖点凭什么做到：缺支撑', '补自有工班人数、近三年交付套数、返修率'],
    ]),
    mk(NAMES[1], 1, '整改后可投', [
      ['must', 'DY-01', '10.4–12.5 秒', '字幕和口播都说「装修其实最怕两件事」', '字幕改「就怕」，口播半句重录'],
      ['must', 'DY-02', '23.5–25.5 秒', '背景展板印「德国倍涂全柔双组份防水砂浆」', '只糊展板文字区，或换一个空镜'],
      ['must', 'DY-08', '61.0–65.0 秒', '顶部贴纸「约克中央空调」', '局部打码，或补授权书'],
      ['should', 'E-17', '53.4 秒', '口播说「手机能看进度」，全片没有手机画面', '第 53 秒补 2 秒手机特写'],
      ['should', 'E-13', '12.9 秒', '同一机位连续 12.9 秒没切镜', '每 6 秒插 1 秒素材'],
      ['should', 'D-11', '全片', '成片 66.9 秒，硬广档上限 60 秒', '剪掉片头 7 秒'],
      ['optional', 'B-03', '0–1.2 秒', '片头有黑边', '裁掉上下各 40 px'],
      ['human', 'D-05', '32 秒', '字幕「ENF」盲听成「E0」，两路不一致', '人耳复听'],
      ['unknown', 'M-01', '—', '商家未建档', '先建档'],
      ['checklist', 'Q1', '全片', '卖点凭什么做到：缺支撑', '补一句工艺或检测报告'],
    ]),
    mk(NAMES[2], 2, '整改后可投', [
      ['must', 'C-09', '全片', '真峰值 +1.6 dBFS，超过 −1 上限', '整轨降 2 dB，限幅到 −1.5 dBTP 重导'],
      ['must', 'E-04', '63.1–74.0 秒', '开工桌面多个饮料罐，罐身品牌可辨', '逐处局部打码'],
      ['should', 'E-17', '44.0 秒', '口播说「有问题随时来找」，画面没有售后', '补 2 秒上门回访'],
      ['should', 'B-14', '5.0 / 24.0 秒', '转场白闪（已标为转场，不算缺陷）', '无需处理，此处仅示意'],
      ['optional', 'D-01', '全片', '提示语贴在距底 2%，压进平台 UI 区', '上移 154 px'],
      ['optional', 'C-12', '全片', '音效只有 1 处', '补 2 处'],
      ['unknown', 'M-01', '—', '商家未建档', '先建档'],
      ['checklist', 'Q1', '全片', '最强证据出现太晚', '前置到 8 秒处'],
    ]),
  ];

  const ok = (d) => Promise.resolve({ ok: true, status: 200, json: async () => d });

  window.fetch = function (url, opt) {
    const u = String(url), m = (opt && opt.method) || 'GET';
    if (u.includes('/api/me')) return ok({ user: 'demo' });
    if (u.includes('/api/login')) return ok({ ok: true, user: 'demo' });
    if (u.includes('/api/logout')) return ok({ ok: true });
    if (/\/api\/jobs\/[^/]+\/shot/.test(u)) {
      const body = JSON.parse((opt && opt.body) || '{}');
      return ok({ ok: true, url: body.data });     // 直接把 data URL 当结果
    }
    if (/\/api\/jobs\/[^/]+\/export/.test(u)) return ok({ ok: false, msg: '演示环境不导出，正式版会生成 Word' });
    if (/\/api\/jobs\/[^/]+\/verdict/.test(u)) return ok({ ok: true, reviewedAt: Date.now() });
    if (/\/api\/jobs\/[^/]+\/analyze/.test(u)) return ok({ ok: true, engine: 'demo' });
    const mj = /\/api\/jobs\/([^/?]+)$/.exec(u);
    if (mj) {
      const j = JOBS.find(x => x.id === mj[1]);
      return j ? ok(j) : ok({ ok: false });
    }
    if (u.includes('/api/jobs')) return ok({ jobs: JOBS.map(j => ({ id: j.id, name: j.name, status: j.status, createdAt: j.createdAt, stage: '' })) });
    return ok({ ok: true });
  };

  // 没有真视频和真帧，用占位图代替证据帧
  window.__demoFrame = function (time) {
    const t = String(time || '').replace(/[^\d.]/g, '').slice(0, 5) || '0.0';
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="360" height="640">
      <rect width="360" height="640" fill="#1a1d21"/>
      <text x="180" y="300" fill="#8a919b" font-size="20" text-anchor="middle" font-family="sans-serif">示例画面</text>
      <text x="180" y="340" fill="#e8eaee" font-size="34" text-anchor="middle" font-family="sans-serif">${t} 秒</text>
      <text x="180" y="600" fill="#5b6470" font-size="14" text-anchor="middle" font-family="sans-serif">演示占位 · 正式版显示真实帧</text>
    </svg>`;
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  };
})();
