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
                    <button class="btn btn-secondary" onclick="AdminDashboard.exportData()">
                        <i data-lucide="download" style="width:16px;height:16px;"></i> Export CSV
                    </button>
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
    }
};
