// Floating Stone Solver for Snail Lab
// Inventory is stored in localStorage and is included in Snail Lab global backups.
// Floating Stone carving board: 9 columns x 6 rows with shaped outer edges.
const BOARD=[
 [0,1,1,1,1,1,1,1,0],
 [0,1,1,1,1,1,1,1,0],
 [1,1,1,1,1,1,1,1,1],
 [1,1,1,1,1,1,1,1,1],
 [0,1,1,1,1,1,1,1,0],
 [0,1,1,1,1,1,1,1,0]
];
// Base orientations are stored here; rotations are generated, reflections are not.
const TYPES=[
 {id:'L3',name:'3-cell L',qty:0,c:[[0,0],[1,0],[1,1]]},
 {id:'I3',name:'3-cell line',qty:0,c:[[0,0],[1,0],[2,0]]},
 {id:'I2',name:'Domino',qty:0,c:[[0,0],[1,0]]},
 {id:'I1',name:'Single',qty:0,c:[[0,0]]},
 {id:'O4',name:'2×2 square',qty:0,c:[[0,0],[1,0],[0,1],[1,1]]},
 {id:'T4',name:'4-cell T',qty:0,c:[[0,0],[1,0],[2,0],[1,1]]},
 {id:'L4',name:'4-cell L',qty:0,c:[[0,0],[0,1],[0,2],[1,2]]},
 {id:'I4',name:'4-cell line',qty:0,c:[[0,0],[1,0],[2,0],[3,0]]},
 {id:'L5',name:'5-cell big L',qty:0,c:[[0,0],[0,1],[0,2],[1,2],[2,2]]},
 {id:'P5',name:'5-cell P',qty:0,c:[[0,0],[1,0],[0,1],[1,1],[0,2]]},
 {id:'X5',name:'5-cell plus',qty:0,c:[[1,0],[0,1],[1,1],[2,1],[1,2]]},
 {id:'S4',name:'4-cell stair',qty:0,c:[[1,0],[2,0],[0,1],[1,1]]},
 {id:'U4',name:'5-cell U',qty:0,c:[[0,0],[2,0],[0,1],[1,1],[2,1]]}, // U-shaped piece uses 5 cells
 {id:'T5',name:'5-cell T',qty:0,c:[[0,0],[1,0],[2,0],[1,1],[1,2]]},
 {id:'Z5',name:'5-cell zigzag',qty:0,c:[[0,0],[1,0],[1,1],[1,2],[2,2]]}
];
const DROP_PROBS=[.067,.067,.067,.062,.067,.067,.067,.067,.067,.067,.067,.067,.067,.067,.067];
const colors=[
 '#e8afd0', // L3 - pink/lilac
 '#c8dc83', // I3 - green
 '#f2bd84', // I2 - orange
 '#d9c5b7', // I1 - neutral
 '#91d6e3', // O4 - blue
 '#c8dc83', // T4 - green
 '#f09ab7', // L4 - pink
 '#f2bd84', // I4 - orange
 '#c8dc83', // L5 - green
 '#f2bd84', // P5 - orange
 '#e8afd0', // X5 - pink/lilac
 '#91d6e3', // S4 - blue
 '#91d6e3', // U4 - blue
 '#f09ab7', // T5 - pink
 '#e8afd0'  // Z5 - pink/lilac
];
const boardCells=[]; const cellIndex=new Map();
BOARD.forEach((r,y)=>r.forEach((v,x)=>{if(v){cellIndex.set(x+','+y,boardCells.length);boardCells.push([x,y])}}));
function norm(c){let minx=Math.min(...c.map(p=>p[0])),miny=Math.min(...c.map(p=>p[1]));return c.map(([x,y])=>[x-minx,y-miny]).sort((a,b)=>a[1]-b[1]||a[0]-b[0])}
function rotations(c){let out=[],cur=c.map(p=>[...p]);for(let k=0;k<4;k++){let n=norm(cur),key=JSON.stringify(n);if(!out.some(o=>JSON.stringify(o)==key))out.push(n);cur=cur.map(([x,y])=>[-y,x])}return out}
TYPES.forEach((t,ti)=>{t.rots=rotations(t.c);t.area=t.c.length;t.placements=[];for(const r of t.rots){let w=Math.max(...r.map(p=>p[0]))+1,h=Math.max(...r.map(p=>p[1]))+1;for(let y=0;y<=BOARD.length-h;y++)for(let x=0;x<=BOARD[0].length-w;x++){let inds=[],ok=true;for(const [dx,dy] of r){let ix=cellIndex.get((x+dx)+','+(y+dy));if(ix===undefined){ok=false;break}inds.push(ix)}if(ok){let mask=0n;inds.forEach(i=>mask|=1n<<BigInt(i));t.placements.push({mask,inds,ti})}}}});
const byCell=Array.from({length:boardCells.length},()=>[]);TYPES.forEach((t,ti)=>t.placements.forEach(p=>p.inds.forEach(i=>byCell[i].push(p))));
function drawMini(el,c,color){let n=norm(c),w=Math.max(...n.map(p=>p[0]))+1,h=Math.max(...n.map(p=>p[1]))+1;el.style.gridTemplateColumns=`repeat(${w},13px)`;el.style.gridTemplateRows=`repeat(${h},13px)`;el.style.setProperty('--piece-color',color||'#89cfd8');let set=new Set(n.map(p=>p.join(',')));for(let y=0;y<h;y++)for(let x=0;x<w;x++){let d=document.createElement('span');d.className=set.has(x+','+y)?'sq':'sq empty';el.appendChild(d)}}
const STORAGE_KEY='snailLabFloatingStoneInventoryV1';

function clampQty(value){
  return Math.max(0,Math.min(99,Math.floor(Number(value)||0)));
}

function loadSavedInventory(){
  try{
    const saved=JSON.parse(localStorage.getItem(STORAGE_KEY));
    if(saved && typeof saved==='object'){
      return TYPES.map(t=>clampQty(saved[t.id]));
    }
  }catch{}
  return TYPES.map(()=>0);
}

function saveInventory(){
  const saved={};
  TYPES.forEach((t,i)=>{
    const input=document.querySelector('#q'+i);
    saved[t.id]=input?clampQty(input.value):0;
  });
  localStorage.setItem(STORAGE_KEY,JSON.stringify(saved));
}

function renderInputs(){
  const root=document.querySelector('#pieces');
  const counts=loadSavedInventory();
  root.innerHTML='';
  TYPES.forEach((t,i)=>{
    const d=document.createElement('div');
    d.className='piece';

    const m=document.createElement('div');
    m.className='mini';
    drawMini(m,t.c,colors[i]);

    const right=document.createElement('div');
    const nm=document.createElement('div');
    nm.className='name';
    nm.textContent=`${t.name} (${t.area})`;

    const input=document.createElement('input');
    input.className='qty';
    input.id='q'+i;
    input.type='number';
    input.min='0';
    input.max='99';
    input.value=counts[i];
    input.setAttribute('aria-label',`${t.name} quantity`);
    input.addEventListener('change',()=>{
      input.value=clampQty(input.value);
      saveInventory();
      clearSolvedDisplay('Inventory changed. Solve again.');
    });

    right.append(nm,input);
    d.append(m,right);
    root.append(d);
  });
}

function renderInventoryLike(root,counts,readonly=false){root.innerHTML='';TYPES.forEach((t,i)=>{let d=document.createElement('div');d.className='piece';let m=document.createElement('div');m.className='mini';drawMini(m,t.c,colors[i]);let right=document.createElement('div');let nm=document.createElement('div');nm.className='name';nm.textContent=`${t.name} (${t.area})`;let input=document.createElement('input');input.className='qty'+(readonly?' readonly':'');input.type='number';input.min='0';input.max='99';input.value=counts[i];if(readonly){input.readOnly=true;input.tabIndex=-1;input.setAttribute('aria-label',`${t.name} remaining`)}right.append(nm,input);d.append(m,right);root.append(d)})}
function drawBoard(root,layout){
  root.innerHTML='';
  const NS='http://www.w3.org/2000/svg';
  const CELL=34, PAD=2;
  const wrap=document.createElement('div');
  wrap.className='board-svg-wrap';
  const svg=document.createElementNS(NS,'svg');
  svg.setAttribute('class','board-svg');
  svg.setAttribute('viewBox',`${-PAD} ${-PAD} ${9*CELL+PAD*2} ${6*CELL+PAD*2}`);
  svg.setAttribute('role','img');
  svg.setAttribute('aria-label',layout?'Solved carving board':'Carving board');

  const labels=new Map();
  if(layout){
    layout.forEach((p,k)=>p.inds.forEach(i=>labels.set(i,{k,ti:p.ti})));
  }

  // Solid fills, aligned to exact pixel coordinates.
  BOARD.forEach((row,y)=>row.forEach((v,x)=>{
    if(!v)return;
    const i=cellIndex.get(x+','+y);
    const z=labels.get(i);
    const r=document.createElementNS(NS,'rect');
    r.setAttribute('x',x*CELL);
    r.setAttribute('y',y*CELL);
    r.setAttribute('width',CELL);
    r.setAttribute('height',CELL);
    r.setAttribute('fill',z?colors[z.ti]:'#f9f8f4');
    svg.appendChild(r);
  }));

  // Canonical segment keys prevent any shared edge from being drawn twice.
  function segKey(x1,y1,x2,y2){
    if(x1>x2 || (x1===x2 && y1>y2)) [x1,y1,x2,y2]=[x2,y2,x1,y1];
    return `${x1},${y1},${x2},${y2}`;
  }

  const gridSegs=new Map();
  BOARD.forEach((row,y)=>row.forEach((v,x)=>{
    if(!v)return;
    const x0=x*CELL, y0=y*CELL, x1=(x+1)*CELL, y1=(y+1)*CELL;
    [[x0,y0,x1,y0],[x0,y0,x0,y1],[x0,y1,x1,y1],[x1,y0,x1,y1]].forEach(s=>{
      gridSegs.set(segKey(...s),s);
    });
  }));

  // 1px lines sit on half pixels for consistent rasterization.
  let gridD='';
  for(const [x1,y1,x2,y2] of gridSegs.values()){
    if(y1===y2) gridD+=`M${x1} ${y1+.5}H${x2}`;
    else gridD+=`M${x1+.5} ${y1}V${y2}`;
  }
  const gridPath=document.createElementNS(NS,'path');
  gridPath.setAttribute('d',gridD);
  gridPath.setAttribute('fill','none');
  gridPath.setAttribute('stroke','#596064');
  gridPath.setAttribute('stroke-opacity',layout?'0.16':'0.30');
  gridPath.setAttribute('stroke-width','1');
  gridPath.setAttribute('stroke-linecap','butt');
  svg.appendChild(gridPath);

  if(layout){
    const boundarySegs=new Map();
    const samePiece=(x1,y1,x2,y2)=>{
      const a=cellIndex.get(x1+','+y1), b=cellIndex.get(x2+','+y2);
      if(a===undefined||b===undefined)return false;
      const la=labels.get(a), lb=labels.get(b);
      return !!la && !!lb && la.k===lb.k;
    };

    BOARD.forEach((row,y)=>row.forEach((v,x)=>{
      if(!v)return;
      const here=labels.get(cellIndex.get(x+','+y));
      if(!here)return;
      const x0=x*CELL, y0=y*CELL, x1=(x+1)*CELL, y1=(y+1)*CELL;
      const sides=[
        [x0,y0,x1,y0, x,y-1],
        [x0,y0,x0,y1, x-1,y],
        [x0,y1,x1,y1, x,y+1],
        [x1,y0,x1,y1, x+1,y]
      ];
      for(const [ax,ay,bx,by,nx,ny] of sides){
        if(!BOARD[ny]?.[nx] || !samePiece(x,y,nx,ny)){
          const s=[ax,ay,bx,by];
          boundarySegs.set(segKey(...s),s);
        }
      }
    }));

    let edgeD='';
    for(const [x1,y1,x2,y2] of boundarySegs.values()){
      edgeD+=`M${x1} ${y1}L${x2} ${y2}`;
    }
    const edgePath=document.createElementNS(NS,'path');
    edgePath.setAttribute('d',edgeD);
    edgePath.setAttribute('fill','none');
    edgePath.setAttribute('stroke','var(--fs-edge)');
    edgePath.setAttribute('stroke-width','2');
    edgePath.setAttribute('stroke-linejoin','miter');
    edgePath.setAttribute('stroke-linecap','butt');
    svg.appendChild(edgePath);
  }

  wrap.appendChild(svg);
  root.appendChild(wrap);
}
renderInputs();
document.querySelector('#reset').onclick=()=>{setInputs(TYPES.map(()=>0));clearSolvedDisplay('');};

const BOARD_AREA=boardCells.length;
const MAX_PIECE_AREA=Math.max(...TYPES.map(t=>t.area));
const EXPECTED_RESHAPE_AREA=DROP_PROBS.reduce((s,p,i)=>s+p*TYPES[i].area,0);
let lastSolveState=null;


function clearSolvedDisplay(message=''){
  document.querySelector('#status').textContent=message;
  document.querySelector('#out').hidden=true;
  document.querySelector('#results').innerHTML='';
  document.querySelector('#leftoverCard').hidden=true;
  document.querySelector('#leftoverPieces').innerHTML='';
  document.querySelector('#reshapeCard').hidden=true;
  document.querySelector('#reshapePriority').innerHTML='';
  document.querySelector('#reshapeActualResult').textContent='';
  lastSolveState=null;
}

function setInputs(counts){
  TYPES.forEach((t,i)=>{
    document.querySelector('#q'+i).value=clampQty(counts[i]);
  });
  saveInventory();
}

function chanceLargerThan(area){
  return DROP_PROBS.reduce((s,p,i)=>s+(TYPES[i].area>area?p:0),0);
}

function reshapePriorityLabel(delta){
  if(delta>2) return 'Best first';
  if(delta>1) return 'Strong';
  if(delta>.25) return 'Good';
  if(delta>-.25) return 'Neutral';
  return 'Usually keep';
}

function renderReshapeAdvisor(inv,ans){
  lastSolveState={inv:[...inv],ans};

  const card=document.querySelector('#reshapeCard');
  const rem=ans.rem;
  const safeCopies=rem.reduce((a,b)=>a+b,0);
  const currentArea=inv.reduce((s,q,i)=>s+q*TYPES[i].area,0);
  const nextTarget=(ans.k+1)*BOARD_AREA;
  const nextDeficit=Math.max(0,nextTarget-currentArea);
  const safeCeiling=currentArea+rem.reduce((s,q,i)=>s+q*Math.max(0,MAX_PIECE_AREA-TYPES[i].area),0);
  const afterCarveMax=safeCopies*MAX_PIECE_AREA;

  const timing=document.querySelector('#reshapeTiming');
  if(safeCopies===0) timing.textContent='Do not reshape';
  else if(afterCarveMax<BOARD_AREA) timing.textContent='Before carving';
  else timing.textContent='Before or after';

  document.querySelector('#safeSummary').textContent=
    safeCopies ? `${safeCopies} piece${safeCopies===1?'':'s'}` : 'None';

  const nextBoard=document.querySelector('#nextBoardSummary');
  if(safeCopies===0){
    nextBoard.textContent='No safe attempt';
  }else if(safeCeiling<nextTarget){
    nextBoard.textContent='Not possible from safe reshapes';
  }else{
    nextBoard.textContent='Possible with good rolls';
  }

  const priority=document.querySelector('#reshapePriority');
  priority.innerHTML='';
  const candidates=TYPES.map((t,i)=>({
    i,
    q:rem[i],
    area:t.area,
    delta:EXPECTED_RESHAPE_AREA-t.area,
    bigger:chanceLargerThan(t.area)
  })).filter(x=>x.q>0).sort((a,b)=>b.delta-a.delta || b.q-a.q || a.i-b.i);

  candidates.forEach(c=>{
    const row=document.createElement('div');
    row.className='advisor-row';
    const mini=document.createElement('div');
    mini.className='advisor-mini';
    drawMini(mini,TYPES[c.i].c,colors[c.i]);

    const main=document.createElement('div');
    main.className='advisor-main';
    const name=document.createElement('div');
    name.className='advisor-name';
    name.textContent=`${TYPES[c.i].name} × ${c.q}`;
    main.append(name);

    const rank=document.createElement('div');
    rank.className='advisor-rank';
    rank.textContent=reshapePriorityLabel(c.delta);

    row.append(mini,main,rank);
    priority.appendChild(row);
  });

  const used=inv.map((q,i)=>q-rem[i]);
  const protectedCount=used.reduce((a,b)=>a+b,0);
  document.querySelector('#protectedSummary').textContent=
    protectedCount ? `${protectedCount} piece${protectedCount===1?'':'s'}` : 'None';

  const select=document.querySelector('#reshapeSacrifice');
  select.innerHTML='';
  candidates.forEach((c,rank)=>{
    const o=document.createElement('option');
    o.value=c.i;
    o.textContent=`${rank===0?'Recommended: ':''}${TYPES[c.i].name} (${c.q} safe)`;
    select.appendChild(o);
  });

  const resultSelect=document.querySelector('#reshapeResult');
  resultSelect.innerHTML='';
  TYPES.forEach((t,i)=>{
    const o=document.createElement('option');
    o.value=i;
    o.textContent=t.name;
    resultSelect.appendChild(o);
  });

  document.querySelector('#applyActualReshape').disabled=candidates.length===0;
  document.querySelector('#reshapeActualResult').textContent='';
  card.hidden=false;
}

document.querySelector('#applyActualReshape').addEventListener('click',()=>{
  if(!lastSolveState)return;

  const from=Number(document.querySelector('#reshapeSacrifice').value);
  const to=Number(document.querySelector('#reshapeResult').value);

  if(!Number.isInteger(from) || !Number.isInteger(to))return;
  if(lastSolveState.ans.rem[from]<=0){
    document.querySelector('#reshapeActualResult').textContent='That piece is no longer in the safe surplus.';
    return;
  }

  const next=[...lastSolveState.inv];
  next[from]--;
  next[to]++;

  setInputs(next);
  const message=`Recorded: ${TYPES[from].name} → ${TYPES[to].name}. Inventory updated above.`;
  clearSolvedDisplay(message);
  window.scrollTo({top:0,behavior:'smooth'});
});

document.querySelector('#useLeftovers').addEventListener('click',()=>{
  if(!lastSolveState)return;
  setInputs(lastSolveState.ans.rem);
  clearSolvedDisplay('Leftover inventory loaded above. Enter any real reshape result, then solve again.');
  window.scrollTo({top:0,behavior:'smooth'});
});

function firstEmpty(mask){for(let i=0;i<boardCells.length;i++)if(!(mask&(1n<<BigInt(i))))return i;return -1}
const FULL=(1n<<BigInt(boardCells.length))-1n;
// Finds one tiling under a per-type allowance. Larger pieces are tried first to minimize piece count.
function tileOne(avail,deadline){let used=Array(TYPES.length).fill(0),layout=[];function dfs(mask){if(performance.now()>deadline)throw new Error('timeout');if(mask===FULL)return true;let cell=firstEmpty(mask);let cand=byCell[cell].filter(p=>used[p.ti]<avail[p.ti] && !(p.mask&mask));cand.sort((a,b)=>TYPES[b.ti].area-TYPES[a.ti].area || (avail[b.ti]-used[b.ti])-(avail[a.ti]-used[a.ti]));for(const p of cand){used[p.ti]++;layout.push(p);if(dfs(mask|p.mask))return true;layout.pop();used[p.ti]--}return false}return dfs(0n)?{used:[...used],layout:[...layout]}:null}
// Global strategy: try k boards from the area upper bound down. For each k, repeatedly search boards while reserving enough area for the remainder; randomized scarcity weights diversify attempts. This is exact for each board and aggressively searches the global inventory.
async function solveAll(inv){let total=inv.reduce((s,q,i)=>s+q*TYPES[i].area,0),upper=Math.floor(total/boardCells.length);let best=null;for(let k=upper;k>=1;k--){for(let attempt=0;attempt<90;attempt++){let rem=[...inv],boards=[],ok=true;for(let b=0;b<k;b++){let remainingBoards=k-b-1;let allowance=rem.map((q,i)=>{let reserve=Math.max(0,Math.ceil((remainingBoards/k)*inv[i]*(.55+Math.random()*.25)));return Math.max(0,q-reserve)}); // loosen if too little area
let ar=allowance.reduce((s,q,i)=>s+q*TYPES[i].area,0);if(ar<boardCells.length)allowance=[...rem];let sol;try{sol=tileOne(allowance,performance.now()+250)}catch(e){sol=null}if(!sol){try{sol=tileOne(rem,performance.now()+500)}catch(e){sol=null}}if(!sol){ok=false;break}boards.push(sol);sol.used.forEach((u,i)=>rem[i]-=u)}if(ok){let pieces=boards.reduce((s,x)=>s+x.used.reduce((a,b)=>a+b,0),0);if(!best||k>best.k||(k===best.k&&pieces<best.pieces))best={k,boards,rem,pieces};if(best.k===upper && attempt>20)break}await new Promise(r=>setTimeout(r,0))}if(best&&best.k===k)return best}return best}
document.querySelector('#solve').onclick=async()=>{let btn=document.querySelector('#solve'),st=document.querySelector('#status');btn.disabled=true;clearSolvedDisplay('Solving…');let inv=TYPES.map((t,i)=>Math.max(0,Math.floor(+document.querySelector('#q'+i).value||0)));let area=inv.reduce((s,q,i)=>s+q*TYPES[i].area,0);st.textContent=`Searching… ${area} total squares, theoretical maximum ${Math.floor(area/boardCells.length)} boards.`;let ans=await solveAll(inv);btn.disabled=false;if(!ans){st.textContent='No complete board found with this inventory.';return}st.textContent='Finished.';document.querySelector('#out').hidden=false;document.querySelector('#summary').textContent=`Maximum found: ${ans.k} complete board${ans.k===1?'':'s'} • ${ans.pieces} pieces used`;let rr=document.querySelector('#results');rr.innerHTML='';ans.boards.forEach((sol,bi)=>{
  let box=document.createElement('div');
  box.className='result';

  let left=document.createElement('div');
  left.innerHTML=`<div class="board-title">Board ${bi+1}</div>`;
  drawBoard(left,sol.layout);

  let leg=document.createElement('div');
  leg.className='legend';

  const pieceTotal=sol.used.reduce((a,b)=>a+b,0);
  const head=document.createElement('div');
  head.className='board-piece-head';

  const title=document.createElement('strong');
  title.textContent=`Pieces - ${pieceTotal}`;

  const done=document.createElement('button');
  done.type='button';
  done.className='board-done';
  done.textContent='Complete Carving';
  done.addEventListener('click',()=>{
    const current=TYPES.map((t,i)=>clampQty(document.querySelector('#q'+i).value));
    const next=current.map((q,i)=>Math.max(0,q-sol.used[i]));
    setInputs(next);
    clearSolvedDisplay(`Board ${bi+1} completed. Inventory updated.`);
    setTimeout(()=>document.querySelector('#solve').click(),0);
  });

  head.append(title,done);
  leg.appendChild(head);

  sol.used.forEach((u,i)=>{
    if(u){
      let d=document.createElement('div');
      d.textContent=`${u} × ${TYPES[i].name}`;
      leg.appendChild(d);
    }
  });

  box.append(left,leg);
  rr.appendChild(box);
});
renderInventoryLike(document.querySelector('#leftoverPieces'),ans.rem,true);
document.querySelector('#leftoverCard').hidden=false;
renderReshapeAdvisor(inv,ans)};
