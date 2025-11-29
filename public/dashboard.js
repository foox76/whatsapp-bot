document.addEventListener('DOMContentLoaded', () => {
    // Auth Check
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = 'login.html';
        return;
    }

    const form = document.getElementById('addBusinessForm');
    const businessList = document.getElementById('businessList');
    const modal = document.getElementById('businessModal');
    const openModalBtn = document.getElementById('openModalBtn');
    const closeModalBtn = document.getElementById('closeModalBtn');
    const cancelBtn = document.getElementById('cancelBtn');
    const totalBusinessesEl = document.getElementById('totalBusinesses');
    const logoutBtn = document.getElementById('logoutBtn');

    // Logout
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            localStorage.removeItem('token');
            window.location.href = 'login.html';
        });
    }

    // Modal Controls
    openModalBtn.addEventListener('click', () => {
        modal.classList.add('active');
    });

    const closeModal = () => {
        modal.classList.remove('active');
        form.reset();
    };

    closeModalBtn.addEventListener('click', closeModal);
    cancelBtn.addEventListener('click', closeModal);

    // Close on backdrop click
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeModal();
        }
    });

    // Fetch and display businesses
    async function loadBusinesses() {
        try {
            const res = await fetch('/api/businesses', {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.status === 401) {
                localStorage.removeItem('token');
                window.location.href = 'login.html';
                return;
            }

            const businesses = await res.json();

            totalBusinessesEl.textContent = businesses.length;
            businessList.innerHTML = '';

            if (businesses.length === 0) {
                businessList.innerHTML = `
                    <div style="grid-column: 1/-1; text-align: center; padding: 4rem; color: var(--text-secondary); background: var(--bg-card); border-radius: 20px; border: var(--glass-border);">
                        <div style="background: rgba(99, 102, 241, 0.1); width: 64px; height: 64px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 1.5rem; color: #818cf8;">
                            <svg width="32" height="32" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M12 5v14M5 12h14"/>
                            </svg>
                        </div>
                        <p style="font-size: 1.25rem; font-weight: 600; color: var(--text-primary); margin-bottom: 0.5rem;">No businesses yet</p>
                        <p style="font-size: 0.95rem;">Add your first business to get started with the AI bot.</p>
                    </div>
                `;
                return;
            }

            businesses.forEach((business, index) => {
                const card = document.createElement('div');
                card.className = 'business-card';
                card.style.animationDelay = `${index * 0.1}s`; // Staggered animation

                card.innerHTML = `
                    <h3>
                        ${business.name}
                        <span style="font-size: 0.75rem; background: rgba(16, 185, 129, 0.1); color: #10b981; padding: 0.25rem 0.75rem; border-radius: 20px; border: 1px solid rgba(16, 185, 129, 0.2);">Active</span>
                    </h3>
                    
                    <div class="business-card-row">
                        <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
                        </svg>
                        <span>${business.phoneNumber}</span>
                    </div>
                    
                    <div class="business-card-row">
                        <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round">
                            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                            <line x1="3" y1="9" x2="21" y2="9"/>
                            <line x1="9" y1="21" x2="9" y2="9"/>
                        </svg>
                        <span title="${business.sheetId}">Sheet: ${business.sheetId.substring(0, 8)}...${business.sheetId.substring(business.sheetId.length - 4)}</span>
                    </div>
                    
                    <div class="business-card-row">
                        <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round">
                            <circle cx="12" cy="12" r="10"/>
                            <polyline points="12 6 12 12 16 14"/>
                        </svg>
                        <span>${business.timezone || 'UTC'}</span>
                    </div>

                    <div class="actions">
                        <button onclick="deleteBusiness('${business._id}')" class="btn-danger" style="width: 100%; display: flex; justify-content: center; gap: 8px;">
                            <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                                <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                            </svg>
                            Delete Business
                        </button>
                    </div>
                `;
                businessList.appendChild(card);
            });
        } catch (err) {
            console.error('Failed to load businesses', err);
            businessList.innerHTML = `
                <div style="grid-column: 1/-1; text-align: center; padding: 3rem; color: var(--danger);">
                    <p>Failed to load businesses. Please refresh the page.</p>
                </div>
            `;
        }
    }

    // Add new business
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const submitBtn = form.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.textContent = 'Creating...';
        submitBtn.disabled = true;

        const data = {
            name: document.getElementById('name').value,
            phoneNumber: document.getElementById('phoneNumber').value,
            sheetId: document.getElementById('sheetId').value,
            systemInstruction: document.getElementById('systemInstruction').value
        };

        try {
            const res = await fetch('/api/businesses', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(data)
            });

            if (res.ok) {
                closeModal();
                loadBusinesses();

                // Show success feedback
                const successMsg = document.createElement('div');
                successMsg.style.cssText = `
                    position: fixed;
                    top: 2rem;
                    right: 2rem;
                    background: linear-gradient(135deg, #10b981 0%, #059669 100%);
                    color: white;
                    padding: 1rem 1.5rem;
                    border-radius: 8px;
                    box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
                    z-index: 2000;
                    animation: slideInRight 0.3s ease;
                `;
                successMsg.textContent = '✓ Business created successfully!';
                document.body.appendChild(successMsg);

                setTimeout(() => {
                    successMsg.remove();
                }, 3000);
            } else {
                const error = await res.json();
                alert('Error: ' + error.message);
            }
        } catch (err) {
            console.error('Error adding business', err);
            alert('Failed to create business. Please try again.');
        } finally {
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
        }
    });

    // Delete business (exposed globally for onclick)
    window.deleteBusiness = async (id) => {
        if (!confirm('Are you sure you want to delete this business?')) return;

        try {
            const res = await fetch(`/api/businesses/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.ok) {
                loadBusinesses();
            } else {
                alert('Failed to delete business');
            }
        } catch (err) {
            console.error('Error deleting business', err);
            alert('Failed to delete business. Please try again.');
        }
    };

    // Initial load
    loadBusinesses();
});
