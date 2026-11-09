let current = null, courses = [], quiz = [], questionIndex = 0, answers = {}, selectedCourse = null;
let quickGames = [], phishMsgs = [], progress = { lessons: {}, labs: {} };
const $ = (id) => document.getElementById(id);
const safe = (v) => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const fmtDate = (v) => { const d = new Date(v); return isNaN(d) ? '' : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }); };

async function api(url, options = {}) {
    const response = await fetch(url, {
        credentials: 'same-origin',
        ...options,
        headers: { ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...(options.headers || {}) }
    });
    const raw = await response.text();
    let data;
    try { data = raw ? JSON.parse(raw) : {}; }
    catch (error) {
        console.error('Expected JSON but server returned:', raw);
        throw new Error(`Server returned a webpage instead of JSON (HTTP ${response.status}). Open MAYCRYPT at http://127.0.0.1:5000 and check the VS Code terminal.`);
    }
    if (!response.ok) throw new Error(data.error || `Request failed (HTTP ${response.status}).`);
    return data;
}
const post = (url, body) => api(url, { method: 'POST', body: JSON.stringify(body || {}) });

const LESSONS=[
[["IP addresses and DNS","Every device on a network has an IP address, such as <code>192.168.1.10</code>. People remember names, so <b>DNS</b> translates a name like example.com into an IP address. <b>DHCP</b> hands out IP addresses automatically, so you don’t configure each device by hand."],
["Routers, switches and VLANs","A <b>switch</b> connects devices inside one network (a LAN). A <b>router</b> connects different networks and decides where packets go next. A <b>VLAN</b> splits one physical network into separate virtual networks, so a problem in one part doesn’t spread everywhere."],
["Ports, protocols and firewalls","A port is a numbered door on a device: 80 is HTTP, 443 is HTTPS, 22 is SSH. A <b>firewall</b> allows or blocks traffic by rules, and defenders open only the ports a service really needs. Try <code>nmap</code> on the lab target in the Network Lab."]],
[["The terminal and navigation","The terminal lets you control a computer with text. <code>pwd</code> shows where you are, <code>ls</code> lists files, and <code>cd folder</code> moves into a folder. Use <code>cd ..</code> to go back up one level."],
["Files and directories","<code>mkdir name</code> makes a folder, <code>touch file.txt</code> creates an empty file, <code>cat file.txt</code> shows its content and <code>echo hello &gt; file.txt</code> writes text into it. <code>rm file.txt</code> deletes a file, and deletes are permanent, so be careful."],
["Permissions","Every file has read (r), write (w) and execute (x) permissions for owner, group and others. <code>chmod 644 file</code> gives the owner read and write, and everyone else read only. Use the least permission needed, and avoid working as the root user."]],
[["How the web works","Your browser (the client) sends a request to a server, and the server sends back a response. <b>HTTP</b> sends data as plain text, and <b>HTTPS</b> encrypts it in transit. Cookies let a site remember who you are between requests, so they must be protected."],
["Common web attacks","<b>SQL injection</b> sneaks database commands into an input field. <b>XSS</b> (cross-site scripting) injects malicious script into a page other users view. <b>CSRF</b> tricks a logged-in user’s browser into sending an unwanted request."],
["Defending a website","Validate and sanitise all input. Use <b>parameterized queries</b> instead of building SQL from strings. Escape output, use HTTPS, keep software updated and add MFA to logins."]],
[["Encryption basics","Encryption scrambles data so only someone with the key can read it. <b>Symmetric</b> encryption uses one shared key. <b>Asymmetric</b> encryption uses a public key to lock and a private key to unlock. The Caesar cipher in the Games section is a simple toy example."],
["Hashing","A hash turns any data into a fixed-length fingerprint, and it can’t be reversed. Websites should store passwords as <b>salted hashes</b>, never as plain text. The salt is random data added so identical passwords produce different hashes."],
["Digital signatures and certificates","A digital signature is made with a private key and checked with the public key, which proves who sent something and that it wasn’t changed. A website’s HTTPS certificate links its domain to a public key, vouched for by a trusted authority."]],
[["Spotting phishing","Phishing messages create urgency and push you to click a link or share a code. Check the real sender address, hover over links to see the true domain, and watch for small spelling tricks like <code>paypa1</code>. Play “Phishing or Safe?” in Games to practise."],
["Passwords and MFA","Use long passphrases (14+ characters), a different one for every site, kept in a password manager. Turn on <b>MFA</b> so a stolen password alone isn’t enough. Never share an OTP, even with someone claiming to be your bank."],
["Safe everyday habits","Install updates quickly, back up important files, lock your screen and avoid unknown USB drives. Be careful on public Wi-Fi, and report suspicious messages instead of replying to them."]],
[["Types of malware","A <b>virus</b> attaches to files, a <b>worm</b> spreads by itself across networks, and a <b>trojan</b> pretends to be useful software. <b>Ransomware</b> locks your files for money, and <b>spyware</b> secretly watches what you do."],
["Prevention","Install software only from trusted sources, keep your system updated, use reputable security software and avoid unknown attachments. Give accounts only the access they need, and keep offline backups."],
["Responding to an infection","Disconnect the device from the network, don’t pay a ransom without expert advice, and restore from clean backups. Change passwords from a clean device, report the incident, and write down what happened so you can learn from it."]]];


const NEEDS_LOGIN = ['dashboard', 'certificates', 'profile'];
function page(id) {
    if (NEEDS_LOGIN.includes(id) && !current) { $('lMsg').textContent = 'Please login to open this page.'; id = 'login'; }
    const target = $(id);
    if (!target) { console.error(`MAYCRYPT page section #${id} was not found.`); return; }
    document.querySelectorAll('main section').forEach(s => s.classList.remove('active'));
    target.classList.add('active');
    document.querySelectorAll('[data-page]').forEach(l => l.classList.toggle('active-link', l.dataset.page === id));
    const sidebar = document.querySelector('aside'); if (sidebar) sidebar.classList.remove('show');
    if (id === 'courses' || id === 'practice') loadCourses();
    if (id === 'learning') renderLearn();
    if (id === 'games') renderGames();
    if (id === 'dashboard') dashboard();
    if (id === 'leaderboard') leaders();
    if (id === 'certificates') certificates();
    if (id === 'profile') profile();
    if (id === 'admin') admin();
    if (id === 'labs') initLabs();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function updNav() {
    $('navAuth').innerHTML = current
        ? `<button class="btn btn-ghost" onclick="page('dashboard')">${safe(current.name)}</button><button class="btn btn-outline" onclick="logout()">Logout</button>`
        : `<button class="btn btn-ghost" onclick="page('login')">Login</button><button class="btn btn-primary" onclick="page('register')">Get started <span>↗</span></button>`;
}
async function loadProgress() {
    try { progress = Object.assign({ lessons: {}, labs: {} }, await api('/api/progress')); }
    catch (e) { progress = { lessons: {}, labs: {} }; }
}
async function init() {
    try { current = (await api('/api/me')).user; } catch (e) { console.warn('Could not load session:', e.message); }
    if (current) await loadProgress();
    updNav();
    await loadCourses();
    resetLab();
}
async function loadCourses() {
    const g1 = $('courseGrid'), g2 = $('practiceGrid');
    try {
        courses = await api('/api/courses');
        const markup = courses.map(c => `<article class="course-card"><div class="course-icon">${safe(c.icon || '🛡️')}</div><small>${safe(c.level || 'Beginner')}</small><h3>${safe(c.title)}</h3><p>${safe(c.description)}</p><button class="primary" onclick="startQuiz(${Number(c.id)})">Start quiz <span>↗</span></button></article>`).join('');
        g1.innerHTML = markup || '<p>No courses found. Import schema.sql into MySQL.</p>';
        g2.innerHTML = markup || '<p>No practice courses found.</p>';
    } catch (error) {
        const m = `<p class="error-text">${safe(error.message)}</p>`; g1.innerHTML = m; g2.innerHTML = m;
    }
}

/* ---------- AUTH ---------- */
async function register() {
    const m = $('rMsg'); m.textContent = '';
    try {
        const r = await post('/api/register', { name: $('rName').value, email: $('rEmail').value, password: $('rPass').value });
        current = r.user || (await api('/api/me')).user; await loadProgress(); updNav(); page('dashboard');
    } catch (e) { m.textContent = e.message; }
}
async function login() {
    const m = $('lMsg'); m.textContent = '';
    try {
        const r = await post('/api/login', { email: $('lEmail').value, password: $('lPass').value });
        current = r.user; $('lPass').value = ''; await loadProgress(); updNav(); page('dashboard');
    } catch (e) { m.textContent = e.message; }
}
async function logout() {
    try { await post('/api/logout'); current = null; progress = { lessons: {}, labs: {} }; updNav(); page('home'); }
    catch (e) { alert(e.message); }
}

/* ---------- LEARNING HUB ---------- */
const lessonsFor = (i) => LESSONS[i] || [];
const doneLessons = (c) => progress.lessons[String(c.id)] || [];
function renderLearn() {
    if (!courses.length) { loadCourses().then(renderLearn); return; }
    $('learnGrid').innerHTML = courses.map((c, i) => `<article class="content-card"><div class="course-icon">${safe(c.icon || '🛡️')}</div><h3>${safe(c.title)}</h3><p>${safe(c.description)}</p><p class="tag">${doneLessons(c).length} / ${lessonsFor(i).length} LESSONS DONE</p><button class="btn btn-primary" onclick="openLesson(${i},0)">Start learning ↗</button></article>`).join('');
}
function openLesson(ci, li) {
    const c = courses[ci], list = lessonsFor(ci), L = list[li];
    if (!L) { alert('Lessons for this course are coming soon.'); return; }
    const done = doneLessons(c);
    page('lesson');
    $('lessonBox').innerHTML = `<div class="eyebrow">${safe(c.title.toUpperCase())}</div><div class="lab-tabs">${list.map((x, k) => `<button class="btn ${k === li ? 'btn-primary' : 'btn-outline'}" onclick="openLesson(${ci},${k})">${done.includes(k) ? '✓ ' : ''}Lesson ${k + 1}</button>`).join('')}</div><h2>${safe(L[0])}</h2><p class="lesson-text">${L[1]}</p><div class="lab-tabs"><button class="btn btn-primary" onclick="markDone(${ci},${li})">${done.includes(li) ? 'Completed ✓' : 'Mark as complete'}</button>${li < list.length - 1 ? `<button class="btn btn-outline" onclick="openLesson(${ci},${li + 1})">Next lesson</button>` : `<button class="btn btn-outline" onclick="startQuiz(${Number(c.id)})">Take the quiz</button>`}<button class="btn btn-outline" onclick="page('learning')">Back to hub</button></div><p class="form-message" id="lessonMsg">${current ? '' : 'Login to save your lesson progress.'}</p>`;
}
async function markDone(ci, li) {
    const c = courses[ci], key = String(c.id);
    if (current) { try { await post('/api/lesson-complete', { course_id: c.id, lesson: li }); } catch (e) { alert(e.message); return; } }
    progress.lessons[key] = progress.lessons[key] || [];
    if (!progress.lessons[key].includes(li)) progress.lessons[key].push(li);
    openLesson(ci, li);
}

/* ---------- QUIZ + CERTIFICATES ---------- */
async function startQuiz(id) {
    if (!current) return page('login');
    try {
        selectedCourse = courses.find(i => Number(i.id) === Number(id));
        quiz = await api(`/api/questions/${id}`);
        if (!quiz.length) throw new Error('No questions are available for this course yet.');
        questionIndex = 0; answers = {}; page('quiz'); drawQuestion();
    } catch (e) { alert(e.message); }
}
function drawQuestion() {
    const q = quiz[questionIndex];
    $('qCourse').textContent = selectedCourse?.title || 'COURSE QUIZ';
    $('qCount').textContent = `QUESTION ${questionIndex + 1} / ${quiz.length}`;
    $('qText').textContent = q.question_text;
    $('qOptions').innerHTML = [['A', q.a], ['B', q.b], ['C', q.c], ['D', q.d]].map(([k, v]) => `<label class="option-row"><input type="radio" name="ans" value="${k}"> <span><b>${k}.</b> ${safe(v)}</span></label>`).join('');
    $('qMsg').textContent = '';
    $('nextQuestionBtn').textContent = questionIndex === quiz.length - 1 ? 'Submit quiz' : 'Next question';
}
async function nextQ() {
    const s = document.querySelector('input[name="ans"]:checked');
    if (!s) { $('qMsg').textContent = 'Please select an answer.'; return; }
    answers[quiz[questionIndex].id] = s.value;
    questionIndex++;
    if (questionIndex < quiz.length) return drawQuestion();
    try {
        const r = await post('/api/quiz/submit', { course_id: selectedCourse.id, answers });
        $('score').textContent = `${r.score} / ${r.total} (${r.percentage}%)`;
        $('resultText').textContent = r.passed ? 'Congratulations! You passed.' : `Keep practising. Passing score is ${r.pass_percent}%.`;
        $('certCode').textContent = r.certificate ? `Certificate ID: ${r.certificate}` : '';
        const ci = courses.indexOf(selectedCourse);
        $('resBtns').innerHTML = (r.certificate ? `<button class="btn btn-primary" onclick="viewCert('${r.certificate}')">View certificate</button>` : '') + `<button class="btn btn-outline" onclick="startQuiz(${selectedCourse.id})">Retry quiz</button><button class="btn btn-outline" onclick="openLesson(${ci},0)">Review lessons</button>`;
        $('review').innerHTML = '<h3>Answer review</h3>' + quiz.map((q, i) => {
            const right = r.review[String(q.id)], mine = answers[q.id], ok = mine === right;
            return `<div class="command-row"><span>${ok ? '✓' : '✗'} ${i + 1}. ${safe(q.question_text)}</span><code>${ok ? 'Correct' : `You: ${safe(mine)} | Right: ${safe(right)}`}</code></div>`;
        }).join('');
        page('result');
    } catch (e) { questionIndex = quiz.length - 1; $('qMsg').textContent = e.message; }
}
function certHtml(d) {
    return `<div class="certificate"><div class="eyebrow cc">MAYCRYPT CYBER ACADEMY</div><h1>Certificate of Completion</h1><p>This certifies that</p><h2 class="cname">${safe(d.name)}</h2><p>has successfully completed the course</p><h3>${safe(d.title)}</h3><p>with a score of <b>${Number(d.percentage)}%</b> on ${safe(fmtDate(d.created_at))}</p><div class="cfoot"><span>Certificate ID: ${safe(d.code)}</span><span>Founder &amp; CEO: Mayur Patil</span></div></div>`;
}
async function viewCert(code) {
    try { $('certBox').innerHTML = certHtml(await api('/api/certificate/' + encodeURIComponent(code))); page('cert'); }
    catch (e) { alert(e.message); }
}
async function verifyCert() {
    const code = $('vCode').value.trim();
    if (!code) { $('vResult').innerHTML = '<p class="form-message">Enter a certificate code.</p>'; return; }
    try { $('vResult').innerHTML = '<p class="form-message">✓ Valid certificate issued by MAYCRYPT.</p>' + certHtml(await api('/api/certificate/' + encodeURIComponent(code))); }
    catch (e) { $('vResult').innerHTML = `<p class="form-message">${safe(e.message)}</p>`; }
}
function printCert() { try { window.print(); } catch (e) { alert('Printing is blocked here. Take a screenshot instead.'); } }
async function certificates() {
    try {
        const d = await api('/api/dashboard');
        $('certList').innerHTML = d.certs.map(c => `<div class="command-row"><span><b>${safe(c.title)}</b> · ${c.percentage}% · ${safe(c.code)}</span><button onclick="viewCert('${safe(c.code)}')">View</button></div>`).join('') || '<p>No certificates yet. Score 70% or more in a course quiz to earn one.</p>';
    } catch (e) { $('certList').textContent = e.message; }
}

/* ---------- GAMES (answers are checked on the server) ---------- */
let gsel = null, gdone = false, pi = 0, pl = false, cInfo = null;
async function renderGames() {
    try {
        if (!quickGames.length) { const d = await api('/api/games'); quickGames = d.quick; phishMsgs = d.phish; }
        $('gameGrid').innerHTML = quickGames.map((g, i) => `<article class="game-card"><div class="course-icon">🎮</div><span class="tag">CYBER CHALLENGE</span><h3>${safe(g.name)}</h3><p>${safe(g.question)}</p><button class="primary" onclick="startGame(${i})">Play game ↗</button></article>`).join('') +
            `<article class="game-card"><div class="course-icon">🎣</div><span class="tag">SPOT THE ATTACK</span><h3>Phishing or Safe?</h3><p>Read ${phishMsgs.length} messages and decide which are scams.</p><button class="primary" onclick="startPhish()">Play game ↗</button></article><article class="game-card"><div class="course-icon">🔓</div><span class="tag">CODE BREAKER</span><h3>Crack the Caesar Cipher</h3><p>Decode hidden cyber words by shifting letters.</p><button class="primary" onclick="startCaesar()">Play game ↗</button></article>`;
    } catch (e) { $('gameGrid').innerHTML = `<p class="error-text">${safe(e.message)}</p>`; }
    if (current) { try { $('pts').textContent = (await api('/api/dashboard')).points.n; } catch (e) {} } else $('pts').textContent = 'Login to earn points';
}
function startGame(i) {
    if (!current) return page('login');
    gsel = i; gdone = false; const g = quickGames[i]; page('game');
    $('gTitle').textContent = g.name; $('gQuestion').textContent = g.question;
    $('gOptions').innerHTML = g.options.map((o, k) => `<label class="option-row"><input type="radio" name="gans" value="${k}"><span>${safe(o)}</span></label>`).join('');
    $('gMsg').textContent = ''; $('gameSubmitBtn').textContent = 'Submit answer';
}
async function nextG() {
    if (gdone) return page('games');
    const s = document.querySelector('input[name="gans"]:checked');
    if (!s) { $('gMsg').textContent = 'Please choose an answer.'; return; }
    try {
        const r = await post('/api/game/answer', { game: gsel, choice: Number(s.value) });
        gdone = true;
        $('gMsg').textContent = r.correct ? `Correct! +${r.points} points.` : `Not this time. Correct answer: ${r.answer}`;
        $('gameSubmitBtn').textContent = 'Back to games';
    } catch (e) { $('gMsg').textContent = e.message; }
}
function startPhish() { if (!current) return page('login'); pi = 0; page('game2'); drawPhish(); }
function drawPhish() {
    const b = $('g2');
    if (pi >= phishMsgs.length) { b.innerHTML = `<h2>Round complete</h2><button class="btn btn-primary" onclick="startPhish()">Play again</button> <button class="btn btn-outline" onclick="page('games')">Back to games</button>`; return; }
    pl = false;
    b.innerHTML = `<div class="eyebrow">PHISHING OR SAFE?</div><p class="question-count">Message ${pi + 1} of ${phishMsgs.length}</p><pre class="msg" id="pm"></pre><div class="options-list"><button class="btn btn-outline" onclick="ansPhish(1)">Phishing</button><button class="btn btn-outline" onclick="ansPhish(0)">Safe</button></div><p class="form-message" id="pf"></p><button class="btn btn-primary" id="pn" hidden onclick="pi++;drawPhish()">Next</button>`;
    $('pm').textContent = phishMsgs[pi].text;
}
async function ansPhish(v) {
    if (pl) return; pl = true;
    try { const r = await post('/api/phish/answer', { index: phishMsgs[pi].id, choice: v }); $('pf').textContent = (r.correct ? `Correct! +${r.points}. ` : 'Not quite. ') + r.why; $('pn').hidden = false; }
    catch (e) { pl = false; $('pf').textContent = e.message; }
}
async function startCaesar() { if (!current) return page('login'); page('game2'); await newC(); }
async function newC() {
    try {
        cInfo = await api('/api/caesar');
        $('g2').innerHTML = `<div class="eyebrow">CODE BREAKER</div><p class="question-count">Each letter was shifted forward by a secret number (1 to 9). Find the original word.</p><h2 class="cipher">${safe(cInfo.cipher)}</h2><input id="cin" type="text" maxlength="20" autocomplete="off" placeholder="Your answer"><div class="options-list"><button class="btn btn-primary" onclick="chkC()">Check</button><button class="btn btn-outline" onclick="hintC()">Hint</button><button class="btn btn-outline" onclick="newC()">New word</button></div><p class="form-message" id="cf"></p>`;
        $('cin').onkeydown = e => { if (e.key === 'Enter') chkC(); };
    } catch (e) { $('g2').innerHTML = `<p class="error-text">${safe(e.message)}</p>`; }
}
async function chkC() {
    try {
        const r = await post('/api/caesar', { answer: $('cin').value });
        if (r.correct) { $('cf').textContent = `Correct! +${r.points} points. The shift was ${r.shift}. Next word…`; setTimeout(newC, 1500); }
        else $('cf').textContent = 'Not yet. Try shifting each letter backwards.';
    } catch (e) { $('cf').textContent = e.message; }
}
function hintC() { $('cf').textContent = `Hint: starts with ${cInfo.first_letter}, ${cInfo.length} letters.`; }

/* ---------- DASHBOARD, LEADERBOARD, PROFILE, ADMIN, CONTACT ---------- */
async function dashboard() {
    try {
        const d = await api('/api/dashboard');
        $('welcome').textContent = `Welcome, ${d.user.name}`;
        $('points').textContent = d.points.n; $('plays').textContent = d.points.plays; $('certcount').textContent = d.certs.length;
        $('lessonsDone').textContent = d.lessons; $('labsDone').textContent = d.labs;
        $('recent').innerHTML = d.results.map(r => `<p>${safe(r.title)} — ${r.percentage}%</p>`).join('') || '<p>No quiz results yet.</p>';
    } catch (e) { $('welcome').textContent = e.message; }
}
async function leaders() {
    try { const d = await api('/api/leaderboard'); $('leaders').innerHTML = d.map((u, i) => `<p class="leader-row"><b>#${i + 1} ${safe(u.name)}</b><strong>${u.points} pts</strong></p>`).join('') || '<p>No scores yet.</p>'; }
    catch (e) { $('leaders').textContent = e.message; }
}
function profile() { $('profileInfo').textContent = current ? `${current.name} | ${current.email}` : 'Please login.'; }
async function admin() {
    try { const d = await api('/api/admin'); $('adminInfo').innerHTML = `Students: ${d.students}<br>Courses: ${d.courses}<br>Quiz attempts: ${d.results}<br>Certificates issued: ${d.certificates}`; }
    catch (e) { $('adminInfo').textContent = e.message; }
}
async function contact() {
    try { const d = await post('/api/contact', { name: $('cName').value, email: $('cEmail').value, message: $('cMessage').value }); $('cMsg').textContent = d.message; }
    catch (e) { $('cMsg').textContent = e.message; }
}

/* ---------- VIRTUAL LABS (simulated: nothing runs on a real system) ---------- */
let fsys,cwd,lab='linux',tlog={},done=new Set();
function resetLab(){fsys={t:'d',c:{home:{t:'d',c:{student:{t:'d',c:{'readme.txt':{t:'f',d:'Welcome to the MAYCRYPT Linux lab.'}}}}}}};cwd=['home','student'];done=new Set();
tlog={linux:'Welcome to the MAYCRYPT Linux Lab (simulated). Type help to see commands.\n',net:'Welcome to the MAYCRYPT Network Lab (simulated). Type help. Only the lab target 192.168.56.10 can be scanned.\n'}}
const node=p=>{let n=fsys;for(const x of p){if(!n||n.t!=='d'||!n.c[x])return null;n=n.c[x]}return n};
function resolve(s){let p=s.startsWith('/')?[]:[...cwd];for(const x of s.split('/')){if(!x||x==='.')continue;if(x==='..')p.pop();else if(x==='~')p=['home','student'];else p.push(x)}return p}
const perm=m=>m.split('').map(d=>['---','--x','-w-','-wx','r--','r-x','rw-','rwx'][d]).join('');
function linux(line){
const e=line.match(/^echo\s+(.+?)\s*>\s*(\S+)$/);
if(e){const p=resolve(e[2]),par=node(p.slice(0,-1));if(!par||par.t!=='d')return 'No such directory';par.c[p[p.length-1]]={t:'f',d:e[1].replace(/^["']|["']$/g,'')};return''}
const [c,...a]=line.split(/\s+/),arg=a.filter(x=>!x.startsWith('-')),fl=a.filter(x=>x.startsWith('-')).join('');
const par=s=>{const p=resolve(s);return [node(p.slice(0,-1)),p[p.length-1]]};
switch(c){
case'help':return'Commands: pwd, ls [-la], cd <dir>, mkdir <name>, touch <file>, cat <file>, echo "text" > file, rm [-r] <name>, chmod <644|755> <file>, whoami, clear';
case'pwd':return'/'+cwd.join('/');
case'whoami':return'student';
case'ls':{const n=node(arg[0]?resolve(arg[0]):cwd);if(!n)return'ls: cannot access: No such file or directory';if(n.t==='f')return arg[0];const k=Object.keys(n.c).sort();
return fl.includes('l')?(k.map(x=>(n.c[x].t==='d'?'drwxr-xr-x':'-'+perm(n.c[x].m||'644'))+' student  '+x).join('\n')||'total 0'):k.join('  ')}
case'cd':{const p=arg[0]?resolve(arg[0]):['home','student'],n=node(p);if(!n||n.t!=='d')return'cd: '+arg[0]+': No such directory';cwd=p;return''}
case'mkdir':{if(!arg[0])return'mkdir: missing name';const [d,n]=par(arg[0]);if(!d||d.t!=='d')return'mkdir: cannot create directory';if(d.c[n])return'mkdir: already exists';d.c[n]={t:'d',c:{}};return''}
case'touch':{if(!arg[0])return'touch: missing file name';const [d,n]=par(arg[0]);if(!d||d.t!=='d')return'touch: No such directory';if(!d.c[n])d.c[n]={t:'f',d:''};return''}
case'cat':{const n=arg[0]&&node(resolve(arg[0]));if(!n)return'cat: No such file';if(n.t==='d')return'cat: Is a directory';return n.d}
case'rm':{const [d,n]=par(arg[0]||'');if(!d||!d.c||!d.c[n])return'rm: cannot remove: No such file';if(d.c[n].t==='d'&&!fl.includes('r'))return'rm: cannot remove: Is a directory (use rm -r)';delete d.c[n];return''}
case'chmod':{const n=arg[1]&&node(resolve(arg[1]));if(!/^[0-7]{3}$/.test(arg[0]||'')||!n)return'Usage: chmod 644 file';n.m=arg[0];return''}
default:return c+': command not found. Type help.'}}
function netw(line){const [c,...a]=line.split(/\s+/),h=a[0];
const H={'localhost':['127.0.0.1',1],'127.0.0.1':['127.0.0.1',1],'example.com':['93.184.216.34',32],'maycrypt.lab':['192.168.56.10',2],'192.168.56.10':['192.168.56.10',2]};
switch(c){
case'help':return'Commands: ipconfig, ping <host>, nslookup <host>, tracert <host>, netstat, nmap <target>, clear\nKnown hosts: localhost, example.com, maycrypt.lab (192.168.56.10)';
case'ipconfig':case'ifconfig':done.add('ip');return'Ethernet adapter (simulated)\n  IPv4 Address . . . : 192.168.56.101\n  Subnet Mask  . . . : 255.255.255.0\n  Default Gateway  . : 192.168.56.1';
case'ping':{if(!h)return'Usage: ping <host>';const k=H[h];if(!k)return'Ping request could not find host '+h+'. Please check the name and try again.';
if(k[0]==='127.0.0.1')done.add('ping');return'Pinging '+h+' ['+k[0]+'] with 32 bytes of data:\n'+[0,1,2,3].map(i=>'Reply from '+k[0]+': bytes=32 time='+(k[1]+i%2)+'ms TTL=64').join('\n')+'\n\nPackets: Sent = 4, Received = 4, Lost = 0 (0% loss)'}
case'nslookup':{if(!h)return'Usage: nslookup <host>';const k=H[h];if(!k||k[0]==='127.0.0.1')return"** can't find "+h+': Non-existent domain';if(h==='example.com')done.add('dns');return'Server:  dns.lab\nAddress: 192.168.56.1\n\nName:    '+h+'\nAddress: '+k[0]}
case'tracert':{const k=H[h||''];if(!k)return'Usage: tracert <known host>';return'Tracing route to '+h+' ['+k[0]+']:\n  1    <1 ms   192.168.56.1\n  2     8 ms   10.20.0.1\n  3    21 ms   '+k[0]+'\n\nTrace complete.'}
case'netstat':return'Proto  Local Address        State\nTCP    192.168.56.101:49712 ESTABLISHED\nTCP    0.0.0.0:80           LISTENING\nTCP    0.0.0.0:443          LISTENING';
case'nmap':{if(!(h==='192.168.56.10'||h==='maycrypt.lab'))return'Blocked: this simulator only scans the lab target 192.168.56.10. Never scan systems you don’t own or have permission to test.';
done.add('scan');return'Starting Nmap (simulated)\nNmap scan report for maycrypt.lab (192.168.56.10)\nHost is up (0.0021s latency).\nPORT      STATE     SERVICE\n22/tcp    open      ssh\n80/tcp    open      http\n443/tcp   open      https\n3306/tcp  filtered  mysql\n\nNmap done: 1 IP address (1 host up) scanned.'}
default:return c+': command not recognised. Type help.'}}

const TASKS = {
    linux: [['pwd', 'Print your location with pwd', () => done.has('pwd')], ['mkdir', 'Create a folder named practice', () => { const n = node(['home', 'student', 'practice']); return n && n.t === 'd'; }], ['create', 'Create notes.txt inside practice', () => !!node(['home', 'student', 'practice', 'notes.txt'])], ['write', 'Write text into notes.txt with echo', () => { const n = node(['home', 'student', 'practice', 'notes.txt']); return n && n.d; }]],
    net: [['ip', 'Show your IP with ipconfig', () => done.has('ip')], ['ping', 'Ping localhost', () => done.has('ping')], ['dns', 'Look up example.com with nslookup', () => done.has('dns')], ['scan', 'Scan the lab target with nmap', () => done.has('scan')]]
};
const QUICK = {
    linux: ['pwd', 'ls -la', 'mkdir practice', 'cd practice', 'touch notes.txt', 'echo "I am learning Linux" > notes.txt', 'cat notes.txt'],
    net: ['ipconfig', 'ping localhost', 'nslookup example.com', 'tracert example.com', 'netstat', 'nmap 192.168.56.10']
};
function initLabs() { if (!fsys) resetLab(); setLab(lab); }
function setLab(l) {
    lab = l;
    $('tabLinux').className = 'btn ' + (l === 'linux' ? 'btn-primary' : 'btn-outline');
    $('tabNet').className = 'btn ' + (l === 'net' ? 'btn-primary' : 'btn-outline');
    $('quick').innerHTML = QUICK[l].map((c, i) => `<div class="command-row"><code>${safe(c)}</code><button onclick="runCmd(QUICK[lab][${i}])">Run</button></div>`).join('');
    renderTerm();
}
function renderTerm() {
    const t = $('term'); t.textContent = tlog[lab]; t.scrollTop = t.scrollHeight;
    $('tprompt').textContent = lab === 'linux' ? 'student@lab:/' + cwd.join('/') + '$' : 'lab>';
    const saved = progress.labs[lab] || [];
    $('tasks').innerHTML = TASKS[lab].map(k => `<label class="check-row"><input type="checkbox" disabled ${(k[2]() || saved.includes(k[0])) ? 'checked' : ''}> ${k[1]}</label>`).join('') + (current ? '' : '<p class="hint-text">Login to save lab progress.</p>');
}
function syncTasks() {
    progress.labs[lab] = progress.labs[lab] || [];
    TASKS[lab].forEach(([key, , test]) => {
        if (test() && !progress.labs[lab].includes(key)) {
            progress.labs[lab].push(key);
            if (current) post('/api/lab-task', { lab, task: key }).catch(() => {});
        }
    });
}
function runCmd(line) {
    line = line.trim(); if (!line) return;
    if (line === 'clear') tlog[lab] = '';
    else {
        const pr = lab === 'linux' ? 'student@lab:/' + cwd.join('/') + '$ ' : 'lab> ';
        const out = lab === 'linux' ? linux(line) : netw(line);
        if (lab === 'linux' && !/not found|missing|cannot|No such/.test(out)) done.add(line.split(/\s+/)[0]);
        tlog[lab] += pr + line + '\n' + (out ? out + '\n' : '');
    }
    $('tin').value = ''; syncTasks(); renderTerm();
}
function resetTerm() { resetLab(); setLab(lab); }
init();
