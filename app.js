(() => {
  const app = document.getElementById('app');
  const boardEl = document.getElementById('board');
  const statusEl = document.getElementById('status');
  const subtitle = document.getElementById('subtitle');
  const settingsPanel = document.getElementById('settingsPanel');
  const settingsBtn = document.getElementById('settingsBtn');
  const testingBtn = document.getElementById('testingBtn');
  const modeBanner = document.getElementById('modeBanner');
  const newBtn = document.getElementById('newBtn');
  const submitBtn = document.getElementById('submitBtn');
  const mobileKeys = document.getElementById('mobileKeys');
  const keypadLabel = document.getElementById('keypadLabel');
  const rejectMistakes = document.getElementById('rejectMistakes');
  const clearBtn = document.getElementById('clearBtn');
  const resultPanel = document.getElementById('resultPanel');
  const resultTitle = document.getElementById('resultTitle');
  const resultText = document.getElementById('resultText');
  const resultNewBtn = document.getElementById('resultNewBtn');

  const targets = { easy: 42, medium: 36, hard: 30 };
  const labels = { easy: 'Easy', medium: 'Medium', hard: 'Hard' };

  let difficulty = 'easy';
  let solution = [];
  let puzzle = [];
  let entries = Array(81).fill(0);
  let maybeNotes = Array(81).fill(0);
  let selected = -1;
  let locked = false;
  let flashing = -1;
  let conflictPeers = new Set();
  let generationId = 0;
  let maybeMode = false;

  const range = n => Array.from({length:n}, (_,i)=>i);

  function shuffled(arr){
    const a = arr.slice();
    for(let i=a.length-1;i>0;i--){
      const j=Math.floor(Math.random()*(i+1));
      [a[i],a[j]]=[a[j],a[i]];
    }
    return a;
  }

  function candidates(board, idx){
    if(board[idx]) return [];
    const r=Math.floor(idx/9), c=idx%9;
    const used=new Set();

    for(let i=0;i<9;i++){
      used.add(board[r*9+i]);
      used.add(board[i*9+c]);
    }

    const br=Math.floor(r/3)*3;
    const bc=Math.floor(c/3)*3;

    for(let rr=br;rr<br+3;rr++){
      for(let cc=bc;cc<bc+3;cc++){
        used.add(board[rr*9+cc]);
      }
    }

    const out=[];
    for(let n=1;n<=9;n++){
      if(!used.has(n)) out.push(n);
    }
    return out;
  }

  function generateSolvedBoard(){
    const board=Array(81).fill(0);

    function fill(){
      let best=-1;
      let opts=null;

      for(let i=0;i<81;i++){
        if(board[i]) continue;

        const cs=candidates(board,i);
        if(!cs.length) return false;

        if(best===-1 || cs.length<opts.length){
          best=i;
          opts=cs;
          if(cs.length===1) break;
        }
      }

      if(best===-1) return true;

      for(const n of shuffled(opts)){
        board[best]=n;
        if(fill()) return true;
        board[best]=0;
      }

      return false;
    }

    // Strong randomization in the first row, followed by randomized backtracking.
    const nums=shuffled([1,2,3,4,5,6,7,8,9]);
    for(let i=0;i<9;i++) board[i]=nums[i];
    fill();

    return board.slice();
  }

  function countSolutions(board, limit=2){
    let best=-1;
    let opts=null;

    for(let i=0;i<81;i++){
      if(board[i]) continue;

      const cs=candidates(board,i);
      if(!cs.length) return 0;

      if(best===-1 || cs.length<opts.length){
        best=i;
        opts=cs;
        if(cs.length===1) break;
      }
    }

    if(best===-1) return 1;

    let total=0;

    for(const n of opts){
      board[best]=n;
      total += countSolutions(board, limit-total);
      board[best]=0;

      if(total>=limit) break;
    }

    return total;
  }

  function logicalSinglesSolve(input){
    const b=input.slice();
    let progress=true;

    while(progress){
      progress=false;

      // Naked singles.
      for(let i=0;i<81;i++){
        if(b[i]) continue;

        const cs=candidates(b,i);

        if(!cs.length) return false;

        if(cs.length===1){
          b[i]=cs[0];
          progress=true;
        }
      }

      if(progress) continue;

      // Hidden singles.
      const units=[];

      for(let r=0;r<9;r++){
        units.push(range(9).map(c=>r*9+c));
      }

      for(let c=0;c<9;c++){
        units.push(range(9).map(r=>r*9+c));
      }

      for(let br=0;br<3;br++){
        for(let bc=0;bc<3;bc++){
          const unit=[];

          for(let r=0;r<3;r++){
            for(let c=0;c<3;c++){
              unit.push((br*3+r)*9+(bc*3+c));
            }
          }

          units.push(unit);
        }
      }

      outer:
      for(const unit of units){
        for(let n=1;n<=9;n++){
          if(unit.some(i=>b[i]===n)) continue;

          const spots=unit.filter(
            i=>b[i]===0 && candidates(b,i).includes(n)
          );

          if(!spots.length) return false;

          if(spots.length===1){
            b[spots[0]]=n;
            progress=true;
            break outer;
          }
        }
      }
    }

    return b.every(Boolean);
  }

  function generatePuzzle(target){
    let best=null;

    for(let attempt=0;attempt<10;attempt++){
      const solved=generateSolvedBoard();
      const p=solved.slice();
      let clues=81;

      for(const idx of shuffled(range(81))){
        if(clues<=target) break;

        const old=p[idx];
        p[idx]=0;

        const unique=countSolutions(p.slice(),2)===1;
        const direct=unique && logicalSinglesSolve(p);

        if(unique && direct){
          clues--;
        }else{
          p[idx]=old;
        }
      }

      if(!best || clues<best.clues){
        best={p,solved,clues};
      }

      if(clues<=target){
        return {p,solved,clues};
      }
    }

    return best;
  }

  function currentValue(i){
    return puzzle[i] || entries[i];
  }

  function isPeer(a,b){
    if(a<0 || b<0) return false;

    const ar=Math.floor(a/9);
    const ac=a%9;
    const br=Math.floor(b/9);
    const bc=b%9;

    return (
      ar===br ||
      ac===bc ||
      (
        Math.floor(ar/3)===Math.floor(br/3) &&
        Math.floor(ac/3)===Math.floor(bc/3)
      )
    );
  }

  function findVisibleConflicts(idx,num){
    const conflicts=new Set();
    const r=Math.floor(idx/9);
    const c=idx%9;

    for(let i=0;i<9;i++){
      const rowIndex=r*9+i;
      const colIndex=i*9+c;

      if(rowIndex!==idx && currentValue(rowIndex)===num){
        conflicts.add(rowIndex);
      }

      if(colIndex!==idx && currentValue(colIndex)===num){
        conflicts.add(colIndex);
      }
    }

    const br=Math.floor(r/3)*3;
    const bc=Math.floor(c/3)*3;

    for(let rr=br;rr<br+3;rr++){
      for(let cc=bc;cc<bc+3;cc++){
        const j=rr*9+cc;

        if(j!==idx && currentValue(j)===num){
          conflicts.add(j);
        }
      }
    }

    return conflicts;
  }

  function render(){
    boardEl.innerHTML='';

    const selectedValue=selected>=0 ? currentValue(selected) : 0;

    for(let i=0;i<81;i++){
      const r=Math.floor(i/9);
      const c=i%9;

      const button=document.createElement('button');
      button.type='button';
      button.className='cell';
      button.setAttribute('role','gridcell');

      const value=currentValue(i);
      const note=maybeNotes[i];

      button.setAttribute(
        'aria-label',
        `Row ${r+1}, column ${c+1}` +
        (value ? `, ${value}` : note ? `, maybe ${note}` : ', empty')
      );

      if(c===2 || c===5) button.classList.add('box-r');
      if(r===2 || r===5) button.classList.add('box-b');
      if(puzzle[i]) button.classList.add('given');

      if(selected>=0 && isPeer(i,selected) && i!==selected){
        button.classList.add('peer');
      }

      if(selectedValue && currentValue(i)===selectedValue && i!==selected){
        button.classList.add('same');
      }

      if(i===selected){
        button.classList.add('selected');

        if(maybeMode){
          button.classList.add('maybe-selected');
        }
      }

      if(i===flashing){
        button.classList.add('conflict');
      }

      if(conflictPeers.has(i)){
        button.classList.add('conflict-peer');
      }

      if(value){
        const valueSpan=document.createElement('span');
        valueSpan.textContent=String(value);
        button.appendChild(valueSpan);
      }

      if(note && !puzzle[i]){
        const noteSpan=document.createElement('span');
        noteSpan.className='maybe-note';
        noteSpan.textContent=String(note);
        button.appendChild(noteSpan);
      }

      button.addEventListener('click',()=>selectCell(i));
      boardEl.appendChild(button);
    }
  }

  function selectCell(i){
    if(locked) return;

    selected=i;

    mobileKeys.classList.toggle('hidden', !!puzzle[i]);

    if(puzzle[i]){
      statusEl.textContent='That number is part of the puzzle.';
    }else if(maybeMode){
      statusEl.textContent='Maybe mode: choose a number to save as a small orange note.';
    }else{
      statusEl.textContent='Enter a number from 1 to 9.';
    }

    keypadLabel.textContent = maybeMode
      ? 'Choose a maybe number'
      : 'Choose a number';

    render();
    app.focus();
  }

  function toggleMaybeMode(){
    maybeMode=!maybeMode;

    testingBtn.classList.toggle('active',maybeMode);
    testingBtn.setAttribute('aria-pressed',String(maybeMode));
    testingBtn.textContent=maybeMode ? 'Maybe ✓' : 'Maybe';
    modeBanner.classList.toggle('hidden',!maybeMode);

    keypadLabel.textContent=maybeMode
      ? 'Choose a maybe number'
      : 'Choose a number';

    if(selected>=0 && !puzzle[selected]){
      mobileKeys.classList.remove('hidden');
    }

    if(maybeMode){
      statusEl.textContent='Maybe mode is on. Numbers will be saved as orange notes.';
    }else{
      statusEl.textContent='Normal mode is on. Numbers will be entered as answers.';
    }

    render();
    app.focus();
  }

  function enterNumber(num){
    if(locked || selected<0 || puzzle[selected]) return;

    num=Number(num);

    if(num<1 || num>9) return;

    // Maybe/testing mode never submits a real answer.
    if(maybeMode){
      maybeNotes[selected] = maybeNotes[selected]===num ? 0 : num;

      statusEl.textContent = maybeNotes[selected]
        ? `Saved ${num} as a maybe number.`
        : 'Maybe number removed.';

      render();
      return;
    }

    entries[selected]=num;

    // A committed answer replaces any note in the same square.
    maybeNotes[selected]=0;

    if(rejectMistakes.checked && num!==solution[selected]){
      const badIndex=selected;
      const peers=findVisibleConflicts(badIndex,num);

      locked=true;
      flashing=badIndex;
      conflictPeers=peers;

      if(peers.size){
        statusEl.textContent=
          'That number conflicts with the highlighted row, column, or 3×3 box.';
      }else{
        statusEl.textContent=
          'That number does not create a visible duplicate, but it is not correct for this square.';
      }

      render();

      setTimeout(()=>{
        entries[badIndex]=0;
        flashing=-1;
        conflictPeers=new Set();
        locked=false;

        statusEl.textContent=peers.size
          ? 'The conflicting cells were highlighted to show why it could not go there.'
          : 'Try a different number.';

        render();
      },650);

      return;
    }

    statusEl.textContent='Number entered.';
    render();
  }

  function clearSelected(){
    if(locked || selected<0 || puzzle[selected]) return;

    if(maybeMode){
      maybeNotes[selected]=0;
      statusEl.textContent='Maybe number cleared.';
    }else{
      entries[selected]=0;
      statusEl.textContent='Square cleared.';
    }

    render();
  }

  function moveSelection(dx,dy){
    if(locked) return;

    if(selected<0){
      selectCell(0);
      return;
    }

    const r=Math.floor(selected/9);
    const c=selected%9;

    const nr=Math.max(0,Math.min(8,r+dy));
    const nc=Math.max(0,Math.min(8,c+dx));

    selectCell(nr*9+nc);
  }

  function newPuzzle(){
    const id=++generationId;

    locked=true;
    selected=-1;
    flashing=-1;
    conflictPeers=new Set();
    resultPanel.classList.add('hidden');
    mobileKeys.classList.add('hidden');
    statusEl.textContent='Creating a new puzzle…';
    boardEl.innerHTML='';

    setTimeout(()=>{
      if(id!==generationId) return;

      const made=generatePuzzle(targets[difficulty]);

      solution=made.solved;
      puzzle=made.p;
      entries=Array(81).fill(0);
      maybeNotes=Array(81).fill(0);

      locked=false;

      subtitle.textContent=
        `No guessing required • ${labels[difficulty]}`;

      statusEl.textContent=
        maybeMode
          ? 'Maybe mode is on. Select an empty square.'
          : 'Select an empty square and enter a number.';

      render();
      app.focus();
    },20);
  }

  function submit(){
    if(locked || !solution.length) return;

    locked=true;
    mobileKeys.classList.add('hidden');

    const wrong=[];

    for(let i=0;i<81;i++){
      if(currentValue(i)!==solution[i]){
        wrong.push(i);
      }
    }

    const correct=wrong.length===0;
    const cells=[...boardEl.children];

    cells.forEach((cell,i)=>{
      setTimeout(
        ()=>cell.classList.add('finish-green'),
        Math.min(i*11,640)
      );
    });

    setTimeout(()=>{
      wrong.forEach(i=>{
        cells[i].classList.remove('finish-green');
        cells[i].classList.add('finish-wrong');
      });

      resultPanel.classList.remove('hidden');

      if(correct){
        resultTitle.textContent='Correct!';
        resultTitle.style.color='var(--good)';
        resultText.textContent='You completed the entire Sudoku.';
        statusEl.textContent='Puzzle completed.';
      }else{
        resultTitle.textContent='Incorrect';
        resultTitle.style.color='var(--bad)';

        const filled=range(81).filter(i=>currentValue(i)).length;

        resultText.textContent=
          `Some squares are incorrect or unfinished. ${filled} of 81 squares are filled.`;

        statusEl.textContent='Incorrect — red squares need attention.';
      }
    },850);
  }

  settingsBtn.addEventListener('click',()=>{
    settingsPanel.classList.toggle('hidden');
  });

  testingBtn.addEventListener('click',toggleMaybeMode);
  newBtn.addEventListener('click',newPuzzle);
  resultNewBtn.addEventListener('click',newPuzzle);
  submitBtn.addEventListener('click',submit);
  clearBtn.addEventListener('click',clearSelected);

  document.querySelectorAll('[data-difficulty]').forEach(button=>{
    button.addEventListener('click',()=>{
      difficulty=button.dataset.difficulty;

      document.querySelectorAll('[data-difficulty]').forEach(b=>{
        b.classList.toggle('active',b===button);
      });

      settingsPanel.classList.add('hidden');
      newPuzzle();
    });
  });

  document.querySelectorAll('[data-number]').forEach(button=>{
    button.addEventListener('pointerdown',event=>{
      event.preventDefault();
      enterNumber(button.dataset.number);
      app.focus();
    });
  });

  app.addEventListener('keydown',event=>{
    if(event.key>='1' && event.key<='9'){
      event.preventDefault();
      enterNumber(Number(event.key));
    }else if(
      event.key==='Backspace' ||
      event.key==='Delete' ||
      event.key==='0'
    ){
      event.preventDefault();
      clearSelected();
    }else if(event.key==='Enter'){
      event.preventDefault();
      submit();
    }else if(event.key==='m' || event.key==='M'){
      event.preventDefault();
      toggleMaybeMode();
    }else if(event.key==='ArrowLeft'){
      event.preventDefault();
      moveSelection(-1,0);
    }else if(event.key==='ArrowRight'){
      event.preventDefault();
      moveSelection(1,0);
    }else if(event.key==='ArrowUp'){
      event.preventDefault();
      moveSelection(0,-1);
    }else if(event.key==='ArrowDown'){
      event.preventDefault();
      moveSelection(0,1);
    }
  });

  if('serviceWorker' in navigator){
    window.addEventListener('load',()=>{
      navigator.serviceWorker.register('./sw.js').catch(()=>{});
    });
  }

  newPuzzle();
})();
