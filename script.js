// ------------------------------
// Firebase config - REPLACE THIS
// ------------------------------
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_ID",
  appId: "YOUR_APP_ID"
};

// Initialize
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// ------------------------------
// UI references
// ------------------------------
const langSelect = document.getElementById('langSelect');
const welcomeText = document.getElementById('welcomeText');
const authSection = document.getElementById('authSection');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const signInBtn = document.getElementById('signInBtn');
const questionSection = document.getElementById('questionSection');
const questionsDiv = document.getElementById('questionsDiv');
const submitBtn = document.getElementById('submitBtn');
const recSection = document.getElementById('recommendationsSection');
const recList = document.getElementById('recList');

let selectedLang = 'en';
let questionsData = []; // will hold category docs
let trainingPrograms = {}; // will hold programs keyed by id

// ------------------------------
// UI text per language
// ------------------------------
const uiText = {
  en: { welcome: "Welcome", signIn: "Sign In / Register", questionnaire: "Questionnaire", submit: "Submit", recommendations: "Recommendations" },
  tl: { welcome: "Maligayang pagdating", signIn: "Mag-sign in / Magrehistro", questionnaire: "Questionnaire", submit: "Isumite", recommendations: "Mga Rekomendasyon" },
  ilo:{ welcome: "Naragsak a panawen", signIn: "Sign in / Agrehistro", questionnaire: "Questionnaire", submit: "I-sumite", recommendations: "Dagiti Rekomendasion" }
};

// ------------------------------
// Scale labels 1-5 (multilingual)
// ------------------------------
const scaleLabels = {
  1: { en: "No knowledge", tl: "Walang alam", ilo: "Awan ammok" },
  2: { en: "Basic awareness", tl: "Pangunahing kaalaman", ilo: "Basico a pannakaammo" },
  3: { en: "Some competence", tl: "May kaunting kasanayan", ilo: "Adda bassit a kinaadalen" },
  4: { en: "Proficient", tl: "Sanay", ilo: "Nakaadal" },
  5: { en: "Expert", tl: "Eksperto", ilo: "Eksperto" }
};

// ------------------------------
// Language change handler
// ------------------------------
langSelect.addEventListener('change', (e) => {
  selectedLang = e.target.value;
  updateUIText();
  renderQuestions(); // re-render to use new language fields and labels
});

function updateUIText(){
  welcomeText.textContent = uiText[selectedLang].welcome;
  document.getElementById('authTitle').textContent = uiText[selectedLang].signIn;
  document.getElementById('questionHeader').textContent = uiText[selectedLang].questionnaire;
  submitBtn.textContent = uiText[selectedLang].submit;
  document.getElementById('recHeader').textContent = uiText[selectedLang].recommendations;
}

// ------------------------------
// Auth: Sign in or Register
// ------------------------------
signInBtn.addEventListener('click', async () => {
  const email = emailInput.value.trim();
  const pass = passwordInput.value;
  if(!email || !pass) { alert('Enter email and password'); return; }
  try {
    await auth.signInWithEmailAndPassword(email, pass);
  } catch(err) {
    // if sign-in fails, try creating account
    try {
      await auth.createUserWithEmailAndPassword(email, pass);
    } catch(createErr) {
      alert('Auth error: ' + createErr.message);
    }
  }
});

// ------------------------------
// Load training programs (to recommend later)
// ------------------------------
async function loadTrainingPrograms(){
  const snap = await db.collection('trainingPrograms').get();
  snap.forEach(doc=>{
    trainingPrograms[doc.id] = doc.data();
  });
}

// ------------------------------
// After auth state changes
// ------------------------------
auth.onAuthStateChanged(async (user) => {
  if(user){
    // hide auth, show questionnaire
    authSection.style.display = 'none';
    questionSection.style.display = 'block';
    recSection.style.display = 'none';
    // load questions and programs
    await loadTrainingPrograms();
    await loadQuestions();
    renderQuestions();
  } else {
    authSection.style.display = 'block';
    questionSection.style.display = 'none';
    recSection.style.display = 'none';
  }
});

// ------------------------------
// Load category documents (A..H) from 'questions' collection
// expects documents named A,B,... with fields like a1_en,a1_tl,a1_ilo and title_en, etc.
// ------------------------------
async function loadQuestions(){
  const snap = await db.collection('questions').get();
  questionsData = snap.docs.map(d => ({ id: d.id, data: d.data() }))
                          .sort((a,b) => a.id.localeCompare(b.id)); // A..H
}

// ------------------------------
// Render questions: each subtopic gets a 1-5 select with labels
// The field pattern for category X is: <lowercase><num>_<lang>
// e.g., a1_en, b3_tl, etc.
// ------------------------------
function renderQuestions(){
  if(!questionsData.length) { questionsDiv.innerHTML = '<p>No questions found in Firestore.</p>'; return; }
  questionsDiv.innerHTML = '';

  questionsData.forEach(cat => {
    const cid = cat.id; // 'A'
    const data = cat.data;
    const titleField = `title_${selectedLang}`;
    const catTitle = data[titleField] || `Category ${cid}`;
    const h = document.createElement('div');
    h.className = 'category-title';
    h.textContent = `${cid}. ${catTitle}`;
    questionsDiv.appendChild(h);

    // loop subtopics 1..12 (we only expect up to 6, but safe)
    for(let i=1;i<=12;i++){
      const fieldKey = `${cid.toLowerCase()}${i}_${selectedLang}`; // e.g., a1_en
      const qText = data[fieldKey];
      if(!qText) break; // stop when no more sequential fields exist

      // build question row
      const row = document.createElement('div');
      row.className = 'question-row';

      const label = document.createElement('label');
      label.innerText = qText;
      row.appendChild(label);

      const select = document.createElement('select');
      select.className = 'select-scale';
      // identify with key like C_a1
      select.dataset.key = `${cid}_a${i}`;
      select.innerHTML = `<option value="">${selectedLang === 'en' ? 'Select' : selectedLang === 'tl' ? 'Pumili' : 'Agpili'}</option>`
        + [1,2,3,4,5].map(n => `<option value="${n}">${n} - ${scaleLabels[n][selectedLang]}</option>`).join('');
      row.appendChild(select);

      questionsDiv.appendChild(row);
    }
  });
}

// ------------------------------
// Submit: collect all selections, compute category averages, recommend programs
// ------------------------------
submitBtn.addEventListener('click', saveResponsesAndRecommend);

async function saveResponsesAndRecommend(){
  const selects = questionsDiv.querySelectorAll('select[data-key]');
  const responses = {};
  selects.forEach(s => {
    if(s.value) responses[s.dataset.key] = parseInt(s.value);
  });

  // require all answered
  if(Object.keys(responses).length < selects.length){
    alert('Please answer all items.');
    return;
  }

  const uid = auth.currentUser.uid;
  // save responses
  await db.collection('users').doc(uid).set({
    responses: responses,
    lang: selectedLang,
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  }, { merge: true });

  // compute category averages
  const catAgg = {}; // {A:{sum,n}, B:{...}}
  Object.entries(responses).forEach(([k,v])=>{
    const cat = k.split('_')[0]; // 'A'
    if(!catAgg[cat]) catAgg[cat] = { sum:0, n:0 };
    catAgg[cat].sum += v;
    catAgg[cat].n += 1;
  });
  const catScores = {};
  Object.entries(catAgg).forEach(([cat,agg])=>{
    catScores[cat] = +(agg.sum / agg.n).toFixed(2);
  });

  // save category scores
  await db.collection('users').doc(uid).set({ categoryScores: catScores }, { merge: true });

  // Determine recommendations (simple rules)
  const recs = []; // array of program ids
  // Financial Management category is 'C' (we'll use thresholds)
  const cScore = catScores['C'];
  if(cScore !== undefined){
    if(cScore < 2.0) recs.push('prog_bookkeeping_nc3');      // needs hands-on bookkeeping training
    else if(cScore < 3.0) recs.push('prog_fin_literacy');   // needs basic financial literacy modules
    else if(cScore >= 3.0 && cScore < 4.0) recs.push('prog_computerized_bookkeeping_iv'); // intermediate
    // if >=4, optionally recommend advanced like Ateneo
  }

  // Example for Marketing (D) - you can extend these rules later
  const dScore = catScores['D'];
  if(dScore !== undefined && dScore < 3.0){
    recs.push('prog_growth'); // placeholder if you add marketing programs
  }

  // If no recs, push a generic program (use prog_fin_literacy as fallback)
  if(recs.length === 0) recs.push('prog_fin_literacy');

  // Convert program IDs to data and show
  showRecommendations(recs, catScores);
}

// ------------------------------
// Display recommendations
// ------------------------------
function showRecommendations(progIds, catScores){
  recList.innerHTML = '';
  recSection.style.display = 'block';

  // show category scores summary
  const scoreCard = document.createElement('div');
  scoreCard.className = 'rec-card';
  scoreCard.innerHTML = `<strong>${selectedLang === 'en' ? 'Category scores' : selectedLang === 'tl' ? 'Mga marka ng kategorya' : 'Dagiti score ti kategoria'}</strong><br><small>${JSON.stringify(catScores)}</small>`;
  recList.appendChild(scoreCard);

  // for each program id show card with name and description (in selectedLang)
  progIds.forEach(pid=>{
    const p = trainingPrograms[pid];
    if(!p) return;
    const nameKey = `name_${selectedLang}`;
    const descKey = `description_${selectedLang}`;
    const sourceKey = `source_${selectedLang}`;
    const card = document.createElement('div');
    card.className = 'rec-card';
    card.innerHTML = `<strong>${p[nameKey] || p['name_en']}</strong><p>${p[descKey] || p['description_en'] || ''}</p>`;
    if(p[sourceKey]) card.innerHTML += `<small>Source: ${p[sourceKey]}</small>`;
    recList.appendChild(card);
  });
}
