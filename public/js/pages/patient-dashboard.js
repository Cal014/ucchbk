/* ============================================
   Patient Dashboard
   ============================================ */
const PatientDashboard = {
    render() {
        return `
        <div class="dashboard">
            <div class="dashboard-header">
                <div class="flex-between">
                    <div>
                        <h1>My Appointments</h1>
                        <p>View and manage your upcoming appointments</p>
                    </div>
                    <button class="btn btn-primary" onclick="App.navigate('book-appointment')">
                        + Book Appointment
                    </button>
                </div>
            </div>

            <div class="stats-grid" id="patient-stats"></div>

            <div class="card">
                <div class="card-header">
                    <h2>Appointment History</h2>
                    <div style="display:flex; gap:8px;">
                        <select id="filter-status" class="btn btn-secondary btn-sm" style="font-family:var(--font);">
                            <option value="all">All Status</option>
                            <option value="scheduled">Scheduled</option>
                            <option value="rescheduled">Rescheduled</option>
                            <option value="completed">Completed</option>
                            <option value="cancelled">Cancelled</option>
                        </select>
                    </div>
                </div>
                <div class="card-body no-padding">
                    <div class="table-wrap" id="appointments-table">
                        ${App.loading()}
                    </div>
                </div>
            </div>

            <!-- Payment History -->
            <div class="card">
                <div class="card-header">
                    <h2>Payment History</h2>
                </div>
                <div class="card-body no-padding">
                    <div class="table-wrap" id="payments-table">
                        ${App.loading()}
                    </div>
                </div>
            </div>

            <!-- Medical Records -->
            <div class="card">
                <div class="card-header">
                    <h2>Medical Records</h2>
                </div>
                <div class="card-body no-padding">
                    <div class="table-wrap" id="medical-records-table">
                        ${App.loading()}
                    </div>
                </div>
            </div>
        </div>

        <!-- Reschedule Modal -->
        <div class="modal-overlay hidden" id="reschedule-modal">
            <div class="modal">
                <div class="modal-header">
                    <h2>Reschedule Appointment</h2>
                    <button class="modal-close" onclick="document.getElementById('reschedule-modal').classList.add('hidden')">✕</button>
                </div>
                <div class="modal-body">
                    <div class="form-group">
                        <label>New Date</label>
                        <input type="date" id="reschedule-date">
                    </div>
                    <div class="form-group">
                        <label>Available Slots</label>
                        <div class="slots-grid" id="reschedule-slots"></div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="document.getElementById('reschedule-modal').classList.add('hidden')">Cancel</button>
                    <button class="btn btn-primary" id="confirm-reschedule">Reschedule</button>
                </div>
            </div>
        </div>`;
    },

    appointments: [],

    payments: [],

    medicalRecords: [],

    async init() {
        try {
            const [appointments, payments, medicalRecords] = await Promise.all([
                App.api('/appointments'),
                App.api('/payments').catch(() => []),
                App.api('/medical-records').catch(() => [])
            ]);
            this.appointments = appointments || [];
            this.payments = payments || [];
            this.medicalRecords = medicalRecords || [];
            this.renderStats();
            this.renderTable();
            this.renderPayments();
            this.renderMedicalRecords();
            this.bindFilters();
        } catch (err) {
            document.getElementById('appointments-table').innerHTML =
                '<div class="empty-state"><div class="empty-icon"><i data-lucide="alert-triangle" style="width:40px;height:40px;color:var(--warning);"></i></div><h3>Error loading appointments</h3></div>';
            App.refreshIcons();
        }
    },

    renderStats() {
        const a = this.appointments;
        const upcoming = a.filter(x => x.status === 'scheduled' || x.status === 'rescheduled').length;
        const completed = a.filter(x => x.status === 'completed').length;
        const cancelled = a.filter(x => x.status === 'cancelled').length;

        document.getElementById('patient-stats').innerHTML = `
            <div class="stat-card highlight">
                <div class="stat-icon"><i data-lucide="calendar" style="width:24px;height:24px;"></i></div>
                <div class="stat-value">${upcoming}</div>
                <div class="stat-label">Upcoming</div>
            </div>
            <div class="stat-card">
                <div class="stat-icon"><i data-lucide="check-circle" style="width:24px;height:24px;"></i></div>
                <div class="stat-value">${completed}</div>
                <div class="stat-label">Completed</div>
            </div>
            <div class="stat-card">
                <div class="stat-icon"><i data-lucide="x-circle" style="width:24px;height:24px;"></i></div>
                <div class="stat-value">${cancelled}</div>
                <div class="stat-label">Cancelled</div>
            </div>
            <div class="stat-card">
                <div class="stat-icon"><i data-lucide="bar-chart-3" style="width:24px;height:24px;"></i></div>
                <div class="stat-value">${a.length}</div>
                <div class="stat-label">Total</div>
            </div>
        `;
        App.refreshIcons();
    },

    renderTable(filter = 'all') {
        let filtered = this.appointments;
        if (filter !== 'all') filtered = filtered.filter(a => a.status === filter);

        const container = document.getElementById('appointments-table');

        if (filtered.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon"><i data-lucide="clipboard-list" style="width:40px;height:40px;color:var(--text-muted);"></i></div>
                    <h3>No appointments found</h3>
                    <p>Book your first appointment to get started.</p>
                    <button class="btn btn-primary mt-16" onclick="App.navigate('book-appointment')">Book Now</button>
                </div>`;
            return;
        }

        container.innerHTML = `
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Date</th>
                        <th>Time</th>
                        <th>Doctor</th>
                        <th>Specialization</th>
                        <th>Status</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${filtered.map(a => `
                        <tr>
                            <td>${App.formatDate(a.date)}</td>
                            <td>${App.escapeHtml(a.time_slot)}</td>
                            <td>${App.escapeHtml(a.doctor_name) || '—'}</td>
                            <td>${App.escapeHtml(a.specialization) || '—'}</td>
                            <td><span class="status-badge ${a.status}">${a.status}</span></td>
                            <td>
                                ${(a.status === 'scheduled' || a.status === 'rescheduled') ? `
                                    <button class="btn btn-warning btn-sm" onclick="PatientDashboard.openReschedule('${a.id}', '${a.doctor_id}')">Reschedule</button>
                                    <button class="btn btn-danger btn-sm" onclick="PatientDashboard.cancelAppointment('${a.id}')">Cancel</button>
                                ` : '—'}
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>`;
    },

    bindFilters() {
        document.getElementById('filter-status').addEventListener('change', (e) => {
            this.renderTable(e.target.value);
        });
    },

    // --- Reschedule ---
    rescheduleData: {},

    async openReschedule(appointmentId, doctorId) {
        this.rescheduleData = { appointmentId, doctorId, selectedSlot: null };
        document.getElementById('reschedule-modal').classList.remove('hidden');
        document.getElementById('reschedule-slots').innerHTML = '<p style="color:var(--text-muted);font-size:0.85rem;">Select a date first</p>';

        const dateInput = document.getElementById('reschedule-date');
        const today = new Date().toISOString().split('T')[0];
        dateInput.min = today;
        dateInput.value = '';

        dateInput.onchange = async () => {
            const date = dateInput.value;
            if (!date) return;
            document.getElementById('reschedule-slots').innerHTML = App.loading();
            try {
                const data = await App.api(`/doctors/${doctorId}/slots?date=${date}`);
                const available = (data.slots || []).filter(s => s.available);
                if (available.length === 0) {
                    document.getElementById('reschedule-slots').innerHTML = '<p style="color:var(--text-muted);">No available slots on this date</p>';
                    return;
                }
                document.getElementById('reschedule-slots').innerHTML = available.map(s => `
                    <button class="slot-btn" onclick="PatientDashboard.selectRescheduleSlot('${s.time}', this)">${s.time}</button>
                `).join('');
            } catch (e) { /* handled by api */ }
        };

        document.getElementById('confirm-reschedule').onclick = async () => {
            const date = dateInput.value;
            const slot = this.rescheduleData.selectedSlot;
            if (!date || !slot) {
                App.toast('Select a date and time slot', 'warning');
                return;
            }
            try {
                await App.api(`/appointments/${this.rescheduleData.appointmentId}`, {
                    method: 'PUT',
                    body: JSON.stringify({ date, time_slot: slot })
                });
                App.toast('Appointment rescheduled!', 'success');
                document.getElementById('reschedule-modal').classList.add('hidden');
                await this.init();
            } catch (e) { /* handled by api */ }
        };
    },

    selectRescheduleSlot(time, el) {
        document.querySelectorAll('#reschedule-slots .slot-btn').forEach(b => b.classList.remove('selected'));
        el.classList.add('selected');
        this.rescheduleData.selectedSlot = time;
    },

    async cancelAppointment(id) {
        if (!confirm('Are you sure you want to cancel this appointment?')) return;
        try {
            await App.api(`/appointments/${id}/cancel`, { method: 'PATCH' });
            App.toast('Appointment cancelled', 'success');
            await this.init();
        } catch (e) { /* handled by api */ }
    },

    renderPayments() {
        const container = document.getElementById('payments-table');
        const payments = this.payments;

        if (payments.length === 0) {
            container.innerHTML = '<div class="empty-state"><div class="empty-icon"><i data-lucide="credit-card" style="width:40px;height:40px;color:var(--text-muted);"></i></div><h3>No payments yet</h3><p>Payments will appear here after you book and pay.</p></div>';
            App.refreshIcons();
            return;
        }

        const methodNames = {
            mtn_momo: 'MTN MoMo',
            telecel_cash: 'Telecel Cash',
            airteltigo_money: 'AirtelTigo',
            card: 'Card'
        };

        container.innerHTML = `
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Date</th>
                        <th>Doctor</th>
                        <th>Method</th>
                        <th>Amount</th>
                        <th>Ref</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>
                    ${payments.map(p => `
                        <tr>
                            <td>${App.formatDate(p.date)}</td>
                            <td>${App.escapeHtml(p.doctor_name) || '—'}</td>
                            <td>${methodNames[p.payment_method] || App.escapeHtml(p.payment_method)}</td>
                            <td style="font-weight:600;color:var(--accent);">GHS ${p.amount.toFixed(2)}</td>
                            <td style="font-size:0.78rem;color:var(--text-muted);">${App.escapeHtml(p.transaction_ref)}</td>
                            <td><span class="status-badge completed">Paid</span></td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>`;
    },

    renderMedicalRecords() {
        const container = document.getElementById('medical-records-table');
        const records = this.medicalRecords;

        if (records.length === 0) {
            container.innerHTML = '<div class="empty-state"><div class="empty-icon"><i data-lucide="file-text" style="width:40px;height:40px;color:var(--text-muted);"></i></div><h3>No medical records</h3><p>Records will appear here after a doctor completes your appointment.</p></div>';
            App.refreshIcons();
            return;
        }

        container.innerHTML = `
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Date</th>
                        <th>Doctor</th>
                        <th>Specialization</th>
                        <th>Diagnosis</th>
                        <th>Treatment</th>
                    </tr>
                </thead>
                <tbody>
                    ${records.map(r => `
                        <tr>
                            <td>${App.formatDate(r.created_at)}</td>
                            <td>${App.escapeHtml(r.doctor_name) || '—'}</td>
                            <td>${App.escapeHtml(r.specialization) || '—'}</td>
                            <td>${App.escapeHtml(r.diagnosis)}</td>
                            <td>${App.escapeHtml(r.treatment)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>`;
    }
};
