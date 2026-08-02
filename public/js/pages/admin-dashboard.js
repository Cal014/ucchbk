/* ============================================
   Admin Dashboard
   ============================================ */
const AdminDashboard = {
    render() {
        return `
        <div class="dashboard">
            <div class="dashboard-header">
                <div class="flex-between">
                    <div>
                        <h1>Admin Dashboard</h1>
                        <p>System overview and management</p>
                    </div>
                    <div style="display:flex; gap:10px;">
                        <button class="btn btn-primary" onclick="AdminDashboard.showAddDoctorModal()">
                            <i data-lucide="user-plus" style="width:16px;height:16px;"></i> Add Doctor
                        </button>
                        <button class="btn btn-secondary" onclick="AdminDashboard.exportData()">
                            <i data-lucide="download" style="width:16px;height:16px;"></i> Export CSV
                        </button>
                    </div>
                </div>
            </div>

            <div class="stats-grid" id="admin-stats">${App.loading()}</div>

            <!-- Recent Appointments -->
            <div class="card">
                <div class="card-header">
                    <h2>Recent Appointments</h2>
                </div>
                <div class="card-body no-padding">
                    <div class="table-wrap" id="admin-appointments-table">
                        ${App.loading()}
                    </div>
                </div>
            </div>

            <!-- User Management -->
            <div class="card">
                <div class="card-header">
                    <h2>User Management</h2>
                    <select id="admin-role-filter" class="btn btn-secondary btn-sm" style="font-family:var(--font);">
                        <option value="all">All Roles</option>
                        <option value="patient">Patients</option>
                        <option value="doctor">Doctors</option>
                        <option value="admin">Admins</option>
                    </select>
                </div>
                <div class="card-body no-padding">
                    <div class="table-wrap" id="admin-users-table">
                        ${App.loading()}
                    </div>
                </div>
            </div>

            <!-- Revenue Overview -->
            <div class="card">
                <div class="card-header">
                    <h2>Revenue Overview</h2>
                </div>
                <div class="card-body">
                    <div class="stats-grid" id="revenue-stats">${App.loading()}</div>
                </div>
            </div>
            <!-- Add Doctor Modal -->
            <div id="add-doctor-modal" class="hidden" style="position:fixed;inset:0;z-index:1000;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.6);backdrop-filter:blur(4px);">
                <div class="auth-card" style="max-width:500px;width:90%;max-height:90vh;overflow-y:auto;margin:0;animation:fadeIn 0.2s ease;">
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
                        <h2 style="margin:0;color:var(--text-primary);">Add Verified Doctor</h2>
                        <button class="btn btn-secondary btn-sm" onclick="AdminDashboard.hideAddDoctorModal()" style="padding:6px 10px;">✕</button>
                    </div>
                    <form id="add-doctor-form">
                        <div class="form-row">
                            <div class="form-group">
                                <label for="doc-name">Full Name *</label>
                                <input type="text" id="doc-name" placeholder="Dr. Kofi Mensah" required>
                            </div>
                            <div class="form-group">
                                <label for="doc-email">Email *</label>
                                <input type="email" id="doc-email" placeholder="doctor@ucc.edu.gh" required>
                            </div>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label for="doc-password">Password *</label>
                                <input type="password" id="doc-password" placeholder="Min 8 characters" required minlength="8">
                            </div>
                            <div class="form-group">
                                <label for="doc-phone">Phone</label>
                                <input type="tel" id="doc-phone" placeholder="+233-000000000">
                            </div>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label for="doc-spec">Specialization *</label>
                                <select id="doc-spec" required>
                                    <option value="General Medicine">General Medicine</option>
                                    <option value="Cardiology">Cardiology</option>
                                    <option value="Dermatology">Dermatology</option>
                                    <option value="Neurology">Neurology</option>
                                    <option value="Orthopedics">Orthopedics</option>
                                    <option value="Pediatrics">Pediatrics</option>
                                    <option value="Psychiatry">Psychiatry</option>
                                    <option value="Surgery">Surgery</option>
                                    <option value="ENT">ENT</option>
                                    <option value="Ophthalmology">Ophthalmology</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label for="doc-fee">Consultation Fee (GHS)</label>
                                <input type="number" id="doc-fee" placeholder="0.00" min="0" step="0.01">
                            </div>
                        </div>
                        <div class="form-group">
                            <label for="doc-bio">Bio</label>
                            <textarea id="doc-bio" placeholder="Brief professional description..." rows="3"></textarea>
                        </div>
                        <button type="submit" class="btn btn-primary btn-block" id="doc-submit-btn">Create Doctor Account</button>
                    </form>
                </div>
            </div>
        </div>`;
    },

    users: [],
    stats: null,

    paymentStats: null,

    async init() {
        try {
            const [stats, users, paymentStats] = await Promise.all([
                App.api('/admin/stats'),
                App.api('/admin/users'),
                App.api('/payments/stats').catch(() => null)
            ]);

            this.stats = stats;
            this.users = users || [];
            this.paymentStats = paymentStats;

            this.renderStats();
            this.renderRevenueStats();
            this.renderRecentAppointments();
            this.renderUsers();
            this.bindFilters();
        } catch (e) { /* handled by api */ }
    },

    renderStats() {
        const s = this.stats;
        if (!s) return;

        document.getElementById('admin-stats').innerHTML = `
            <div class="stat-card highlight">
                <div class="stat-icon"><i data-lucide="calendar" style="width:24px;height:24px;"></i></div>
                <div class="stat-value">${s.todayAppointments}</div>
                <div class="stat-label">Today's Appointments</div>
            </div>
            <div class="stat-card">
                <div class="stat-icon"><i data-lucide="users" style="width:24px;height:24px;"></i></div>
                <div class="stat-value">${s.totalUsers}</div>
                <div class="stat-label">Total Users</div>
            </div>
            <div class="stat-card">
                <div class="stat-icon"><i data-lucide="stethoscope" style="width:24px;height:24px;"></i></div>
                <div class="stat-value">${s.totalDoctors}</div>
                <div class="stat-label">Doctors</div>
            </div>
            <div class="stat-card">
                <div class="stat-icon"><i data-lucide="heart" style="width:24px;height:24px;"></i></div>
                <div class="stat-value">${s.totalPatients}</div>
                <div class="stat-label">Patients</div>
            </div>
            <div class="stat-card">
                <div class="stat-icon"><i data-lucide="bar-chart-3" style="width:24px;height:24px;"></i></div>
                <div class="stat-value">${s.totalAppointments}</div>
                <div class="stat-label">Total Appointments</div>
            </div>
            <div class="stat-card">
                <div class="stat-icon"><i data-lucide="clock" style="width:24px;height:24px;"></i></div>
                <div class="stat-value">${s.scheduledAppointments}</div>
                <div class="stat-label">Scheduled</div>
            </div>
            <div class="stat-card">
                <div class="stat-icon"><i data-lucide="check-circle" style="width:24px;height:24px;"></i></div>
                <div class="stat-value">${s.completedAppointments}</div>
                <div class="stat-label">Completed</div>
            </div>
            <div class="stat-card">
                <div class="stat-icon"><i data-lucide="x-circle" style="width:24px;height:24px;"></i></div>
                <div class="stat-value">${s.cancelledAppointments}</div>
                <div class="stat-label">Cancelled</div>
            </div>
        `;
        App.refreshIcons();
    },

    renderRevenueStats() {
        const ps = this.paymentStats;
        const container = document.getElementById('revenue-stats');
        if (!ps) {
            container.innerHTML = '<p style="color:var(--text-muted);">No payment data yet</p>';
            return;
        }

        const methodNames = {
            mtn_momo: 'MTN MoMo',
            telecel_cash: 'Telecel Cash',
            airteltigo_money: 'AirtelTigo',
            card: 'Card'
        };

        const byMethodHtml = (ps.byMethod || []).map(m =>
            `<div class="stat-card">
                <div class="stat-icon"><i data-lucide="${m.payment_method === 'card' ? 'credit-card' : 'smartphone'}" style="width:24px;height:24px;"></i></div>
                <div class="stat-value">GHS ${m.total.toFixed(2)}</div>
                <div class="stat-label">${methodNames[m.payment_method] || m.payment_method} (${m.count})</div>
            </div>`
        ).join('');

        container.innerHTML = `
            <div class="stat-card highlight">
                <div class="stat-icon"><i data-lucide="wallet" style="width:24px;height:24px;"></i></div>
                <div class="stat-value" style="color:var(--accent);">GHS ${ps.totalRevenue.toFixed(2)}</div>
                <div class="stat-label">Total Revenue</div>
            </div>
            <div class="stat-card">
                <div class="stat-icon"><i data-lucide="trending-up" style="width:24px;height:24px;"></i></div>
                <div class="stat-value">GHS ${ps.todayRevenue.toFixed(2)}</div>
                <div class="stat-label">Today's Revenue</div>
            </div>
            <div class="stat-card">
                <div class="stat-icon"><i data-lucide="hash" style="width:24px;height:24px;"></i></div>
                <div class="stat-value">${ps.totalPayments}</div>
                <div class="stat-label">Total Payments</div>
            </div>
            ${byMethodHtml}
        `;
        App.refreshIcons();
    },

    renderRecentAppointments() {
        const appts = this.stats?.recentAppointments || [];
        const container = document.getElementById('admin-appointments-table');

        if (appts.length === 0) {
            container.innerHTML = '<div class="empty-state"><p>No appointments yet</p></div>';
            return;
        }

        container.innerHTML = `
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Date</th>
                        <th>Time</th>
                        <th>Patient</th>
                        <th>Doctor</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>
                    ${appts.map(a => `
                        <tr>
                            <td>${App.formatDate(a.date)}</td>
                            <td>${App.escapeHtml(a.time_slot)}</td>
                            <td>${App.escapeHtml(a.patient_name)}</td>
                            <td>${App.escapeHtml(a.doctor_name)}</td>
                            <td><span class="status-badge ${a.status}">${a.status}</span></td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>`;
    },

    renderUsers(filter = 'all') {
        let filtered = this.users;
        if (filter !== 'all') filtered = filtered.filter(u => u.role === filter);

        const container = document.getElementById('admin-users-table');

        if (filtered.length === 0) {
            container.innerHTML = '<div class="empty-state"><p>No users found</p></div>';
            return;
        }

        container.innerHTML = `
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Role</th>
                        <th>Specialization</th>
                        <th>Joined</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${filtered.map(u => `
                        <tr>
                            <td>${App.escapeHtml(u.name)}</td>
                            <td>${App.escapeHtml(u.email)}</td>
                            <td><span class="user-role-badge ${u.role}" style="display:inline-flex">${u.role}</span></td>
                            <td>${App.escapeHtml(u.specialization) || '—'}</td>
                            <td>${new Date(u.created_at).toLocaleDateString()}</td>
                            <td>
                                ${u.role !== 'admin' ? `
                                    <button class="btn btn-danger btn-sm" onclick="AdminDashboard.deleteUser('${u.id}', '${App.escapeAttr(u.name)}')">Delete</button>
                                ` : '<span style="color:var(--text-muted);font-size:0.8rem;">Protected</span>'}
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>`;
    },

    bindFilters() {
        document.getElementById('admin-role-filter').addEventListener('change', (e) => {
            this.renderUsers(e.target.value);
        });
    },

    async deleteUser(id, name) {
        if (!confirm(`Are you sure you want to delete user "${name}"? This cannot be undone.`)) return;
        try {
            await App.api(`/admin/users/${id}`, { method: 'DELETE' });
            App.toast(`User ${name} deleted`, 'success');
            await this.init();
        } catch (e) { /* handled by api */ }
    },

    async exportData() {
        try {
            const result = await App.api('/admin/export');
            if (result && result.blob) {
                const url = URL.createObjectURL(result.blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'appointments_export.csv';
                a.click();
                URL.revokeObjectURL(url);
                App.toast('Export downloaded!', 'success');
            }
        } catch (e) {
            App.toast('Export failed', 'error');
        }
    },

    showAddDoctorModal() {
        const modal = document.getElementById('add-doctor-modal');
        modal.classList.remove('hidden');
        modal.style.display = 'flex';

        // Close on backdrop click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) AdminDashboard.hideAddDoctorModal();
        });

        // Bind form submit
        const form = document.getElementById('add-doctor-form');
        form.onsubmit = async (e) => {
            e.preventDefault();
            const btn = document.getElementById('doc-submit-btn');
            const body = {
                name: document.getElementById('doc-name').value.trim(),
                email: document.getElementById('doc-email').value.trim(),
                password: document.getElementById('doc-password').value,
                phone: document.getElementById('doc-phone').value.trim(),
                specialization: document.getElementById('doc-spec').value,
                consultation_fee: document.getElementById('doc-fee').value || '0',
                bio: document.getElementById('doc-bio').value.trim()
            };

            if (!body.name || !body.email || !body.password || !body.specialization) {
                App.toast('Please fill in all required fields', 'warning');
                return;
            }
            if (body.password.length < 8) {
                App.toast('Password must be at least 8 characters', 'warning');
                return;
            }

            btn.disabled = true;
            btn.textContent = 'Creating...';

            try {
                await App.api('/admin/doctors', {
                    method: 'POST',
                    body: JSON.stringify(body)
                });
                App.toast(`Doctor account for ${body.name} created successfully!`, 'success');
                AdminDashboard.hideAddDoctorModal();
                await AdminDashboard.init(); // Refresh dashboard
            } catch (err) {
                btn.disabled = false;
                btn.textContent = 'Create Doctor Account';
            }
        };
    },

    hideAddDoctorModal() {
        const modal = document.getElementById('add-doctor-modal');
        modal.classList.add('hidden');
        modal.style.display = 'none';
        // Reset form
        const form = document.getElementById('add-doctor-form');
        if (form) form.reset();
        const btn = document.getElementById('doc-submit-btn');
        if (btn) { btn.disabled = false; btn.textContent = 'Create Doctor Account'; }
    }
};
