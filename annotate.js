// 画面标注：点条目上的画面，圈出问题位置，存回条目
(function () {
  let host, cv, ctx, img, cb, shapes = [], tool = 'rect', color = '#e11d48', textBuf = '';
  let drawing = false, cur = null, dip = false;

  const CSS = `
  .anno-mask{position:fixed;inset:0;background:rgba(17,24,39,.62);display:flex;align-items:center;justify-content:center;z-index:200}
  .anno{background:#fff;border-radius:10px;max-width:min(96vw,1100px);max-height:94vh;display:flex;flex-direction:column;overflow:hidden}
  .anno-bar{display:flex;align-items:center;gap:6px;padding:10px 12px;border-bottom:1px solid #e8eaee;flex-wrap:wrap}
  .anno-bar button{padding:5px 10px;font-size:12px;border-radius:6px;background:#fff;color:#4a5058;border:1px solid #e8eaee}
  .anno-bar button.on{background:#1a1d21;color:#fff;border-color:#1a1d21}
  .anno-bar .sw{width:20px;height:20px;border-radius:50%;border:2px solid #fff;box-shadow:0 0 0 1px #d3d8e0;cursor:pointer}
  .anno-bar .sw.on{box-shadow:0 0 0 2px #1a1d21}
  .anno-body{padding:10px;overflow:auto;background:#f6f7f9}
  .anno-body canvas{display:block;max-width:100%;cursor:crosshair}
  .anno-tip{font-size:12px;color:#8a919b;margin-left:auto}
  `;

  function ensure() {
    if (host) return;
    host = document.createElement('div');
    host.innerHTML = `<style>${CSS}</style>
    <div class="anno-mask" style="display:none">
      <div class="anno">
        <div class="anno-bar">
          <button data-t="rect">方框</button>
          <button data-t="arrow">箭头</button>
          <button data-t="pen">画笔</button>
          <button data-t="text">文字</button>
          <span style="width:1px;height:18px;background:#e8eaee;margin:0 4px"></span>
          <span class="sw on" data-c="#e11d48" style="background:#e11d48"></span>
          <span class="sw" data-c="#f59e0b" style="background:#f59e0b"></span>
          <span class="sw" data-c="#1f5fd1" style="background:#1f5fd1"></span>
          <span class="sw" data-c="#111827" style="background:#111827"></span>
          <span style="width:1px;height:18px;background:#e8eaee;margin:0 4px"></span>
          <button data-a="undo">撤销</button>
          <button data-a="clear">清空</button>
          <span class="anno-tip" id="annoTip">拖拽即可标注</span>
          <button data-a="cancel" style="margin-left:auto">取消</button>
          <button data-a="save" style="background:#1f5fd1;color:#fff;border-color:#1f5fd1">保存</button>
        </div>
        <div class="anno-body"><canvas id="annoCv"></canvas></div>
      </div>
    </div>`;
    document.body.appendChild(host);
    cv = host.querySelector('#annoCv');
    ctx = cv.getContext('2d');

    host.querySelectorAll('.anno-bar button[data-t]').forEach(b => b.onclick = () => { tool = b.dataset.t; markTool(); });
    host.querySelectorAll('.sw').forEach(s => s.onclick = () => {
      color = s.dataset.c;
      host.querySelectorAll('.sw').forEach(x => x.classList.remove('on'));
      s.classList.add('on');
    });
    host.querySelector('[data-a="undo"]').onclick = () => { shapes.pop(); redraw(); };
    host.querySelector('[data-a="clear"]').onclick = () => { shapes = []; redraw(); };
    host.querySelector('[data-a="cancel"]').onclick = () => close();
    host.querySelector('[data-a="save"]').onclick = () => {
      cb(cv.toDataURL('image/png'));
      close();
    };

    cv.addEventListener('mousedown', down);
    cv.addEventListener('mousemove', move);
    cv.addEventListener('mouseup', up);
    cv.addEventListener('mouseleave', up);
    markTool();
  }

  function markTool() {
    host.querySelectorAll('button[data-t]').forEach(b => b.classList.toggle('on', b.dataset.t === tool));
    host.querySelector('#annoTip').textContent =
      tool === 'text' ? '点一下，然后打字，回车确认' :
        tool === 'pen' ? '按住拖动画线' : '按住拖出' + (tool === 'rect' ? '方框' : '箭头');
  }

  function pos(e) {
    const r = cv.getBoundingClientRect();
    return { x: (e.clientX - r.left) * (cv.width / r.width), y: (e.clientY - r.top) * (cv.height / r.height) };
  }

  function down(e) {
    e.preventDefault();
    if (tool === 'text') {
      const t = prompt('写什么？');
      if (!t) return;
      shapes.push({ type: 'text', x: pos(e).x, y: pos(e).y, text: t, color });
      redraw(); return;
    }
    drawing = true;
    cur = tool === 'pen' ? { type: 'pen', pts: [pos(e)], color } : { type: tool, a: pos(e), b: pos(e), color };
  }
  function move(e) {
    if (!drawing || !cur) return;
    const p = pos(e);
    if (cur.type === 'pen') cur.pts.push(p); else cur.b = p;
    redraw(); drawShape(cur);
  }
  function up() {
    if (!drawing) return;
    drawing = false;
    if (cur) shapes.push(cur);
    cur = null;
    redraw();
  }

  function drawShape(s) {
    ctx.save();
    ctx.strokeStyle = s.color; ctx.fillStyle = s.color;
    ctx.lineWidth = Math.max(2, cv.width / 380); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    if (s.type === 'rect') {
      ctx.strokeRect(s.a.x, s.a.y, s.b.x - s.a.x, s.b.y - s.a.y);
    } else if (s.type === 'arrow') {
      const { a, b } = s;
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      const ang = Math.atan2(b.y - a.y, b.x - a.x), L = Math.max(12, cv.width / 45);
      ctx.beginPath();
      ctx.moveTo(b.x, b.y);
      ctx.lineTo(b.x - L * Math.cos(ang - .4), b.y - L * Math.sin(ang - .4));
      ctx.lineTo(b.x - L * Math.cos(ang + .4), b.y - L * Math.sin(ang + .4));
      ctx.closePath(); ctx.fill();
    } else if (s.type === 'pen') {
      ctx.beginPath();
      s.pts.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y));
      ctx.stroke();
    } else if (s.type === 'text') {
      const fs = Math.max(16, cv.width / 34);
      ctx.font = `600 ${fs}px "Microsoft YaHei", sans-serif`;
      ctx.lineWidth = Math.max(3, fs / 7); ctx.strokeStyle = 'rgba(255,255,255,.9)';
      ctx.strokeText(s.text, s.x, s.y);
      ctx.fillStyle = s.color; ctx.fillText(s.text, s.x, s.y);
    }
    ctx.restore();
  }

  function redraw() {
    ctx.clearRect(0, 0, cv.width, cv.height);
    if (img) ctx.drawImage(img, 0, 0, cv.width, cv.height);
    shapes.forEach(drawShape);
  }

  function close() {
    dip = false;
    host.querySelector('.anno-mask').style.display = 'none';
  }

  window.openAnnotator = function (src, callback) {
    ensure();
    cb = callback;
    shapes = []; drawing = false; cur = null;
    img = new Image();
    img.onload = () => {
      cv.width = img.naturalWidth;
      cv.height = img.naturalHeight;
      cv.style.maxHeight = (window.innerHeight * 0.74) + 'px';
      redraw();
      host.querySelector('.anno-mask').style.display = 'flex';
    };
    img.onerror = () => alert('这张帧没取到，换个秒数试试');
    img.src = src + (src.includes('?') ? '&' : '?') + 't=' + Date.now();
  };
})();
