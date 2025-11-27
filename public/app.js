const API_BASE = '/api';

// Tab Switching
function showTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.nav-links li').forEach(el => el.classList.remove('active'));

    document.getElementById(tabId).classList.add('active');
    event.currentTarget.classList.add('active');

    if (tabId === 'doctors') loadDoctors();
    if (tabId === 'services') loadServices();
    if (tabId === 'faq') loadFAQ();
}

// Modals
function openModal(modalId) {
    document.getElementById(modalId).style.display = 'flex';
}

function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

// --- DOCTORS ---
async function loadDoctors() {
    const res = await fetch(`${API_BASE}/doctors`);
    const doctors = await res.json();
    const container = document.getElementById('doctors-list');
    container.innerHTML = doctors.map(doc => `
        <div class="card">
            <h3>${doc.name}</h3>
            <p><i class="fas fa-stethoscope"></i> ${doc.specialty}</p>
            <p><i class="far fa-clock"></i> ${doc.availability}</p>
            <button class="btn-danger" onclick="deleteDoctor('${doc.name}')">Delete</button>
        </div>
    `).join('');
}

async function addDoctor() {
    const name = document.getElementById('doc-name').value;
    const specialty = document.getElementById('doc-specialty').value;
    const availability = document.getElementById('doc-availability').value;

    await fetch(`${API_BASE}/doctors`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, specialty, availability })
    });
    closeModal('doctor-modal');
    loadDoctors();
}

async function deleteDoctor(name) {
    if (!confirm('Are you sure?')) return;
    await fetch(`${API_BASE}/doctors`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
    });
    loadDoctors();
}

// --- SERVICES ---
async function loadServices() {
    const res = await fetch(`${API_BASE}/services`);
    const services = await res.json();
    const container = document.getElementById('services-list');
    container.innerHTML = services.map(srv => `
        <tr>
            <td>${srv.service}</td>
            <td>${srv.price}</td>
            <td>${srv.description}</td>
            <td><button class="btn-danger" onclick="deleteService('${srv.service}')">Delete</button></td>
        </tr>
    `).join('');
}

async function addService() {
    const service = document.getElementById('serv-name').value;
    const price = document.getElementById('serv-price').value;
    const description = document.getElementById('serv-desc').value;

    await fetch(`${API_BASE}/services`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ service, price, description })
    });
    closeModal('service-modal');
    loadServices();
}

async function deleteService(service) {
    if (!confirm('Are you sure?')) return;
    await fetch(`${API_BASE}/services`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ service })
    });
    loadServices();
}

// --- FAQ ---
async function loadFAQ() {
    const res = await fetch(`${API_BASE}/faq`);
    const faq = await res.json();
    const container = document.getElementById('faq-list');
    container.innerHTML = faq.map(item => `
        <div class="faq-item">
            <div style="display:flex; justify-content:space-between;">
                <h3>${item.question}</h3>
                <button class="btn-danger" onclick="deleteFAQ('${item.question}')">Delete</button>
            </div>
            <p>${item.answer}</p>
        </div>
    `).join('');
}

async function addFAQ() {
    const question = document.getElementById('faq-question').value;
    const answer = document.getElementById('faq-answer').value;

    await fetch(`${API_BASE}/faq`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, answer })
    });
    closeModal('faq-modal');
    loadFAQ();
}

async function deleteFAQ(question) {
    if (!confirm('Are you sure?')) return;
    await fetch(`${API_BASE}/faq`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question })
    });
    loadFAQ();
}

// Initial Load
loadDoctors();
