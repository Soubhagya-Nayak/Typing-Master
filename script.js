const SAMPLES = {
      easy: "The quick brown fox jumps over the lazy dog. Typing practice helps improve speed and accuracy.",
      medium: "Learning to type quickly requires consistent practice. Try to focus on accuracy first, then speed will follow.",
      hard: "Asynchronous operations, closures, and prototypal inheritance are common JavaScript concepts. Mastering them improves web development fluency."
    };

    const textDisplay = document.getElementById('textDisplay');
    const input = document.getElementById('input');
    const startBtn = document.getElementById('startBtn');
    const resetBtn = document.getElementById('resetBtn');
    const timeSelect = document.getElementById('timeSelect');
    const sampleSelect = document.getElementById('sampleSelect');
    const customWrap = document.getElementById('customWrap');
    const customText = document.getElementById('customText');
    const timeDisplay = document.getElementById('timeDisplay');
    const wpmEl = document.getElementById('wpm');
    const accuracyEl = document.getElementById('accuracy');
    const errorsEl = document.getElementById('errors');
    const cpmEl = document.getElementById('cpm');
    const charsEl = document.getElementById('chars');
    const correctEl = document.getElementById('correct');
    const bestEl = document.getElementById('best');
    const progressBar = document.getElementById('progressBar');

    let sampleText = SAMPLES.easy;
    let timer = null;
    let timeLeft = parseInt(timeSelect.value,10);
    let started = false;
    let totalTyped = 0;
    let correctChars = 0;
    let errors = 0;
    let startTime = null;

    const BEST_KEY = 'typing_best_wpm_v1';
    function loadBest(){
      const v = localStorage.getItem(BEST_KEY);
      bestEl.textContent = v ? v + ' WPM' : '-';
    }
    loadBest();

    function renderText(){
      textDisplay.innerHTML = '';
      for (let i=0;i<sampleText.length;i++){
        const span = document.createElement('span');
        span.textContent = sampleText[i];
        textDisplay.appendChild(span);
      }
    }

    function resetStats(){
      clearInterval(timer);
      timer = null;
      started = false;
      timeLeft = parseInt(timeSelect.value,10);
      timeDisplay.textContent = timeLeft + 's';
      wpmEl.textContent = '0';
      accuracyEl.textContent = '100%';
      errorsEl.textContent = '0';
      cpmEl.textContent = '0';
      charsEl.textContent = '0';
      correctEl.textContent = '0';
      totalTyped = 0; correctChars = 0; errors = 0; startTime = null;
      progressBar.style.width = '0%';
      input.value = '';
      input.disabled = true;
      updateSpans(0);
    }

    function startTest(){
      if (started) return;
      started = true;
      input.disabled = false;
      input.focus();
      startTime = Date.now();
      timeLeft = parseInt(timeSelect.value,10);
      timeDisplay.textContent = timeLeft + 's';

      timer = setInterval(()=>{
        timeLeft -= 1;
        timeDisplay.textContent = timeLeft + 's';
        const elapsed = parseInt(timeSelect.value,10) - timeLeft;
        const pct = (elapsed / parseInt(timeSelect.value,10)) * 100;
        progressBar.style.width = pct + '%';
        if (timeLeft <= 0){
          finishTest();
        }
      },1000);
    }

    function finishTest(){
      clearInterval(timer);
      input.disabled = true;
      started = false;
      const words = correctChars / 5;
      const minutes = (parseInt(timeSelect.value,10) - timeLeft) / 60 || (parseInt(timeSelect.value,10)/60);
      const wpm = Math.round(words / (minutes || 1));
      wpmEl.textContent = wpm;
      cpmEl.textContent = Math.round((correctChars) / (minutes || 1));
      const prev = parseInt(localStorage.getItem(BEST_KEY)||'0',10);
      if (wpm > prev){
        localStorage.setItem(BEST_KEY, wpm);
        bestEl.textContent = wpm + ' WPM';
      }
    }

    function updateSpans(cursorIndex){
      const spans = textDisplay.querySelectorAll('span');
      for (let i=0;i<spans.length;i++){
        spans[i].className = '';
      }
      const typed = input.value;
      totalTyped = typed.length;
      charsEl.textContent = totalTyped;
      correctChars = 0;
      errors = 0;
      for (let i=0;i<typed.length;i++){
        const span = spans[i];
        if (!span) break;
        if (typed[i] === span.textContent){
          span.classList.add('correct');
          correctChars++;
        } else {
          span.classList.add('incorrect');
          errors++;
        }
      }
      if (spans[cursorIndex]) spans[cursorIndex].classList.add('current');
      correctEl.textContent = correctChars;
      errorsEl.textContent = errors;
      const acc = totalTyped ? Math.round((correctChars/totalTyped)*100) : 100;
      accuracyEl.textContent = acc + '%';

      if (started){
        const elapsedMs = Date.now() - startTime;
        const minutes = (elapsedMs/1000)/60;
        const estimatedWpm = minutes > 0 ? Math.round((correctChars/5)/minutes) : 0;
        wpmEl.textContent = estimatedWpm;
        cpmEl.textContent = minutes > 0 ? Math.round((correctChars)/minutes) : 0;
      }

    }

    sampleSelect.addEventListener('change', ()=>{
      if (sampleSelect.value === 'custom'){
        customWrap.style.display = 'block';n
        sampleText = customText.value || '';
      } else {
        customWrap.style.display = 'none';
        sampleText = SAMPLES[sampleSelect.value] || SAMPLES.easy;
      }
      renderText(); resetStats();
    });

    customText.addEventListener('input', ()=>{
      if (sampleSelect.value === 'custom'){
        sampleText = customText.value || '';
        renderText(); resetStats();
      }
    });

    timeSelect.addEventListener('change', ()=>{
      timeLeft = parseInt(timeSelect.value,10);
      timeDisplay.textContent = timeLeft + 's';
      resetStats();
    });

    startBtn.addEventListener('click', ()=>{
      if (!started) startTest();
    });

    resetBtn.addEventListener('click', ()=>{
      renderText(); resetStats();
    });

    input.addEventListener('input', (e)=>{
      if (!started) startTest();
      const cursor = input.value.length;
      updateSpans(cursor);
    });

    document.addEventListener('keydown', (e)=>{
      if (e.key === 'Escape'){
        renderText(); resetStats();
        return;
      }
      if (!started && e.key.length === 1){
        if (document.activeElement !== input){
          input.focus();
          input.value += e.key;
          updateSpans(input.value.length);
          startTest();
          e.preventDefault();
        }
      }
    });

    (function init(){
      renderText();
      resetStats();
    })();