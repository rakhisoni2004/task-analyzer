/* main API functions */
async function postAnalyze(tasks, strategy){
  const payload = { tasks, strategy };
  const res = await fetch('/api/tasks/analyze/', {
    method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload)
  });
  if(!res.ok) throw new Error(await res.text());
  return res.json();
}

async function fetchSuggestions(tasks, strategy){
  const payload = { tasks, strategy };
  const res = await fetch('/api/tasks/suggest/', {
    method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload)
  });
  if(!res.ok) throw new Error(await res.text());
  return res.json();
}

/* UI helpers */
function showLoader(){ document.getElementById('output').innerHTML = '<div class="loader">Analyzing… ⏳</div>'; }
function errorBox(msg){ document.getElementById('output').innerHTML = `<div class="alert error">${msg}</div>`; }

/* render results (task list) */
function renderResults(results, warning){
  const out = document.getElementById('output');
  out.innerHTML = "";
  if(warning) out.innerHTML += `<div class="alert warn">⚠️ ${warning}</div>`;
  results.forEach(r=>{
    const card = document.createElement('div');
    card.className = 'task-card';
    card.innerHTML = `
      <div class="task-title">${r.title} (#${r.id})</div>
      <div class="meta">Score: <b>${r.score}</b> — Due: ${r.due_date || "N/A"} | Importance: ${r.importance} | Effort: ${r.estimated_hours}h</div>
      <div style="margin-top:8px;">
        <span class="badge">⏰ ${r.explanation.urgency_text}</span>
        <span class="badge">⭐ ${r.explanation.importance}</span>
        <span class="badge">⚙ ${r.explanation.effort_hours}h</span>
        <span class="badge">🔗 blocks: ${r.explanation.blocks_count}</span>
      </div>
    `;
    out.appendChild(card);
  });
}

/* render suggestions */
function renderSuggestions(list){
  const box = document.getElementById('suggested');
  box.innerHTML = "<h2 class='section-title'>✨ Suggested Tasks <span class='top'>(Top 3)</span></h2>";
  if(!list || list.length===0){ box.innerHTML += '<div style="color:#aaa">No suggestions available.</div>'; return; }
  list.forEach(s=>{
    const item = document.createElement('div');
    item.className = 'suggest-card';
    item.innerHTML = `
      <div class="suggest-title">${s.title} (#${s.id})</div>
      <div class="suggest-meta">Score: <b>${s.score}</b> • ${s.explanation.urgency_text}<br>Importance: ${s.explanation.importance} • Effort: ${s.explanation.effort_hours}h</div>
    `;
    box.appendChild(item);
  });
}

/* ------------------ EISENHOWER MATRIX ------------------ */
/* urgency: true if due within 3 days or past due */
function isUrgent(task){
  if(!task.due_date) return false;
  const d = new Date(task.due_date + 'T00:00:00');
  const today = new Date();
  const diffMs = (d - new Date(today.getFullYear(), today.getMonth(), today.getDate()));
  const diffDays = Math.floor(diffMs / (1000*60*60*24));
  return diffDays <= 3; // within 3 days or past due
}

function isImportant(task){
  return Number(task.importance || 0) >= 7; // threshold: 7+
}

function renderEisenhower(tasks){
  const container = document.getElementById('matrix');
  container.innerHTML = '';
  // 4 cells: Q1: Urgent+Important, Q2: NotUrgent+Important, Q3: Urgent+NotImportant, Q4: NotUrgent+NotImportant
  const q = {
    q1: [], q2: [], q3: [], q4: []
  };
  tasks.forEach(t=>{
    const urgent = isUrgent(t);
    const important = isImportant(t);
    if(urgent && important) q.q1.push(t);
    else if(!urgent && important) q.q2.push(t);
    else if(urgent && !important) q.q3.push(t);
    else q.q4.push(t);
  });

  // create cells
  const cells = [
    {id:'q1', title:'Urgent & Important (Do first)', items:q.q1},
    {id:'q2', title:'Not Urgent & Important (Plan)', items:q.q2},
    {id:'q3', title:'Urgent & Not Important (Delegate)', items:q.q3},
    {id:'q4', title:'Not Urgent & Not Important (Eliminate)', items:q.q4}
  ];

  cells.forEach(c=>{
    const cell = document.createElement('div');
    cell.className = 'matrix-cell';
    const h = document.createElement('h3');
    h.innerText = c.title;
    cell.appendChild(h);
    if(c.items.length===0){
      const em = document.createElement('div');
      em.style.color = '#8fa2b8';
      em.style.fontSize = '13px';
      em.innerText = '—';
      cell.appendChild(em);
    } else {
      c.items.forEach(it=>{
        const r = document.createElement('div');
        r.className = 'matrix-item';
        r.innerHTML = `<div>${it.title} <small style="opacity:.7">#${it.id}</small></div><div style="opacity:.8">${it.estimated_hours}h • ${it.importance}</div>`;
        // on click show details in output area
        r.addEventListener('click', ()=> {
          renderResults([it], `Selected from matrix: ${c.title}`);
          window.scrollTo({top:0,behavior:'smooth'});
        });
        cell.appendChild(r);
      });
    }
    container.appendChild(cell);
  });
}

/* ------------------ DEPENDENCY GRAPH ------------------ */
/* Build adjacency, detect cycles (frontend), compute levels (simple BFS layering), render SVG */
function detectCycles(tasks){
  const map = {}; tasks.forEach(t=> map[t.id]= (t.dependencies||[]).slice());
  const visited = {}, rec = {};
  let hasCycle = false;
  function dfs(u){
    if(rec[u]) return (hasCycle = true);
    if(visited[u]) return;
    visited[u]=true; rec[u]=true;
    (map[u]||[]).forEach(v=> { if(map[v]===undefined) map[v]=[]; dfs(v); });
    rec[u]=false;
  }
  Object.keys(map).forEach(k=> { if(!visited[k]) dfs(k); });
  return hasCycle;
}

function findCycleNodes(tasks){
  // Return set of node ids that are in any cycle (simple detection)
  const ids = tasks.map(t=>t.id);
  const g = {}; tasks.forEach(t=> g[t.id] = (t.dependencies||[]).slice());
  const inCycle = new Set();
  const temp = new Set(), perm = new Set();
  function visit(n, stack){
    if(temp.has(n)){
      // cycle found: all nodes from n onwards in stack are in cycle
      const idx = stack.indexOf(n);
      stack.slice(idx).forEach(x=> inCycle.add(x));
      return;
    }
    if(perm.has(n) || !g[n]) return;
    temp.add(n); stack.push(n);
    g[n].forEach(m=> visit(m, stack));
    stack.pop();
    temp.delete(n);
    perm.add(n);
  }
  ids.forEach(i=> visit(i, []));
  return inCycle;
}

function computeLevels(tasks){
  // Kahn-style layering from roots (nodes with no incoming edges)
  const nodes = {};
  const indeg = {};
  tasks.forEach(t=>{ nodes[t.id]=t; indeg[t.id]=0; });
  tasks.forEach(t => {
    (t.dependencies||[]).forEach(d => { if(indeg[d]===undefined) indeg[d]=0; indeg[t.id] = (indeg[t.id]||0) + 1; });
  });
  // roots: indeg == 0
  const levels = {};
  let current = Object.keys(indeg).filter(k=>indeg[k]===0);
  let level = 0;
  const remainingIndeg = Object.assign({}, indeg);
  while(current.length){
    current.forEach(n=> levels[n]=level);
    const next = [];
    current.forEach(n=>{
      tasks.forEach(t=>{
        if((t.dependencies||[]).includes(n)){
          remainingIndeg[t.id] = (remainingIndeg[t.id]||0) - 1;
          if(remainingIndeg[t.id] === 0) next.push(t.id);
        }
      });
    });
    current = Array.from(new Set(next));
    level++;
  }
  // nodes not assigned (cycles) -> give them high level
  Object.keys(nodes).forEach(k=>{ if(levels[k]===undefined) levels[k]=level+1; });
  return levels;
}

function renderDependencyGraph(tasks){
  const area = document.getElementById('graph-area');
  area.innerHTML = ''; // clear
  if(!tasks || tasks.length===0){ area.innerHTML = '<div style="color:#8fa2b8">No tasks to visualize.</div>'; return; }

  // prepare
  const taskMap = {}; tasks.forEach(t=> taskMap[t.id]=t);
  const cycleNodes = findCycleNodes(tasks);
  const levels = computeLevels(tasks);

  // group by level
  const byLevel = {};
  Object.keys(levels).forEach(id=>{
    const lv = levels[id];
    if(!byLevel[lv]) byLevel[lv]=[];
    byLevel[lv].push(id);
  });
  const levelKeys = Object.keys(byLevel).map(x=>Number(x)).sort((a,b)=>a-b);

  // compute SVG size and node positions
  const width = Math.max(800, Math.min(1400, window.innerWidth - 120));
  const levelGapY = 120;
  const nodeH = 44;
  const padding = 20;
  const totalHeight = (levelKeys.length * levelGapY) + 140;
  const svgNS = "http://www.w3.org/2000/svg";

  const svg = document.createElementNS(svgNS,'svg');
  svg.setAttribute('width', width);
  svg.setAttribute('height', totalHeight);
  svg.setAttribute('viewBox', `0 0 ${width} ${totalHeight}`);
  svg.style.maxWidth = '100%';
  svg.style.overflow = 'visible';

  // defs arrowhead
  const defs = document.createElementNS(svgNS,'defs');
  defs.innerHTML = `<marker id="arrowhead" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto"><path d="M0,0 L10,3.5 L0,7 z" fill="#7fb7ff" /></marker>`;
  svg.appendChild(defs);

  const positions = {}; // id -> {x,y}

  // --- DYNAMIC WIDTH + WRAPPED TEXT NODES ---
  const titleMeasure = (s) => {
    return Math.min(340, Math.max(140, s.length * 7 + 40));
  };

  levelKeys.forEach((lv, i) => {
    const ids = byLevel[lv];
    // compute total width for nodes in this level dynamically
    const totalW = ids.reduce((acc, id) => acc + titleMeasure(taskMap[id].title) + 18, -18);
    let startX = Math.max(padding, (width - totalW) / 2);
    ids.forEach((id, idx) => {
      const nodeWLocal = titleMeasure(taskMap[id].title);
      const x = startX;
      const y = padding + i * levelGapY;
      positions[id] = { x: x + nodeWLocal / 2, y: y + nodeH / 2, boxX: x, boxY: y, w: nodeWLocal, h: nodeH };
      // draw rect with dynamic width
      const rect = document.createElementNS(svgNS, 'rect');
      rect.setAttribute('x', x);
      rect.setAttribute('y', y);
      rect.setAttribute('width', nodeWLocal);
      rect.setAttribute('height', nodeH);
      rect.setAttribute('rx', 8);
      rect.setAttribute('ry', 8);
      rect.setAttribute('class', 'node-rect' + (cycleNodes.has(id) ? ' cycle' : ''));
      svg.appendChild(rect);

      // draw wrapped text using foreignObject (allows HTML and word-wrap)
      const fo = document.createElementNS(svgNS, 'foreignObject');
      fo.setAttribute('x', x + 8);
      fo.setAttribute('y', y + 6);
      fo.setAttribute('width', nodeWLocal - 16);
      fo.setAttribute('height', nodeH - 12);
      const div = document.createElement('div');
      div.setAttribute('xmlns', 'http://www.w3.org/1999/xhtml');
      div.style.width = (nodeWLocal - 16) + 'px';
      div.style.fontSize = '12px';
      div.style.color = '#e6eef8';
      div.style.whiteSpace = 'normal';
      div.style.overflow = 'hidden';
      div.style.textOverflow = 'ellipsis';
      div.style.lineHeight = '1.05';
      div.innerText = `${taskMap[id].title} (#${id})`;
      fo.appendChild(div);
      svg.appendChild(fo);

      startX += nodeWLocal + 18;
    });
  });

  // draw edges: from dependency -> task (dep -> child)
  tasks.forEach(t=>{
    (t.dependencies||[]).forEach(dep=>{
      if(!positions[dep] || !positions[t.id]) return;
      const from = positions[dep];
      const to = positions[t.id];
      const svgPath = document.createElementNS(svgNS, 'path');
      const sx = from.x;
      const sy = from.boxY + from.h; // bottom of source box
      const tx = to.x;
      const ty = to.boxY; // top of target box
      const dx = Math.abs(tx - sx) * 0.4;
      const d = `M ${sx} ${sy} C ${sx} ${sy + dx} ${tx} ${ty - dx} ${tx} ${ty}`;
      svgPath.setAttribute('d', d);
      svgPath.setAttribute('class','edge-line');
      svg.appendChild(svgPath);
    });
  });

  area.appendChild(svg);

  // if cycles exist, show warning
  if(cycleNodes.size>0){
    const warn = document.createElement('div');
    warn.className = 'alert warn';
    warn.style.marginTop = '10px';
    warn.innerText = `Circular dependency detected involving tasks: ${Array.from(cycleNodes).join(', ')}`;
    area.appendChild(warn);
  }
}

/* ------------------ HANDLER ------------------ */
document.getElementById('load-sample').addEventListener('click',()=>{
  document.getElementById('bulk').value = `[
  {"id":"1","title":"Fix login bug","due_date":"2025-11-30","estimated_hours":3,"importance":8,"dependencies":[]},
  {"id":"2","title":"Write docs","due_date":"2025-12-05","estimated_hours":1,"importance":6,"dependencies":["1"]},
  {"id":"3","title":"Deploy site","due_date":"2025-11-25","estimated_hours":4,"importance":9,"dependencies":["1","2"]}
]`;
});

document.getElementById('analyze').addEventListener('click', async ()=>{
  let raw = document.getElementById('bulk').value.trim();
  let tasks;
  try{ tasks = JSON.parse(raw); if(!Array.isArray(tasks)) throw new Error('Not an array'); }
  catch(e){ return errorBox('Invalid JSON data.'); }

  // normalize fields (ensure estimated_hours, importance exist)
  tasks = tasks.map(t=>({
    id: String(t.id),
    title: t.title || ('Task ' + (t.id||'')),
    due_date: t.due_date || null,
    estimated_hours: Number(t.estimated_hours || 0),
    importance: Number(t.importance || 0),
    dependencies: Array.isArray(t.dependencies) ? t.dependencies.map(String) : []
  }));

  showLoader();
  try{
    const res = await postAnalyze(tasks, document.getElementById('strategy').value);
    renderResults(res.results, res.warning);
    // suggestions
    try{
      const sres = await fetchSuggestions(tasks, document.getElementById('strategy').value);
      renderSuggestions(sres.suggestions);
    }catch(e){ console.error('Suggestion error', e); }

    // render matrix & graph using the original tasks (we prefer API-normalized results not necessary)
    renderEisenhower(tasks);
    renderDependencyGraph(tasks);

  }catch(err){
    errorBox(err.message || String(err));
  }
});

// initial try to render suggestions/matrix if textarea has sample on load
(async ()=>{
  try{
    const txt = document.getElementById('bulk').value.trim();
    const obj = JSON.parse(txt);
    renderEisenhower(obj);
    renderDependencyGraph(obj);
    const sres = await fetchSuggestions(obj, document.getElementById('strategy').value);
    renderSuggestions(sres.suggestions);
  }catch(e){ /* ignore on startup */ }
})();
