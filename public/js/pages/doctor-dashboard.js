/* ============================================
   Doctor Dashboard
   ============================================ */
const DoctorDashboard = {
    render() {
        return `
        <div class="dashboard">
            <div class="dashboard-header">
                <h1>Doctor Dashboard</h1>
                <p>Manage your schedule and appointments</p>
            </div>

            <div class="stats-grid" id="doctor-stats"></div>

            <!-- Availability Management -->
            <div class="card">
                <div class="card-header">
                    <h2>My Availability</h2>
                    <button class="btn btn-primary btn-sm" onclick="DoctorDashboard.showAddAvailability()">+ Add Hours</button>
                </div>
                <div class="card-body">
                    <div class="availability-grid" id="availability-list">
                        ${App.loading()}
                    </div>
                </div>
            </div>

            <!-- Today's Queue -->
            <div class="card" id="queue-card">
                <div class="card-header" style="background:var(--accent); color:white;">
                    <h2 style="color:white;">Today's Live Queue</h2>
                </div>
                <div class="card-body no-padding">
                    <div class="table-wrap" id="doctor-queue-table">
                        ${App.loading()}
                    </div>
                </div>
            </div>

            <!-- Upcoming Appointments -->
            <div class="card">
                <div class="card-header">
                    <h2>My Appointments</h2>
                    <select id="doc-filter-status" class="btn btn-secondary btn-sm" style="font-family:var(--font);">
                        <option value="all">All</option>
                        <option value="scheduled" selected>Upcoming</option>
                        <option value="completed">Completed</option>
                        <option value="cancelled">Cancelled</option>
                    </select>
                </div>
                <div class="card-body no-padding">
                    <div class="table-wrap" id="doctor-appointments-table">
                        ${App.loading()}
                    </div>
                </div>
            </div>
        </div>

        <!-- Add Availability Modal -->
        <div class="modal-overlay hidden" id="avail-modal">
            <div class="modal">
                <div class="modal-header">
                    <h2>Add Availability</h2>
                    <button class="modal-close" onclick="document.getElementById('avail-modal').classList.add('hidden')">✕</button>
                </div>
                <div class="modal-body">
                    <div class="form-group">
                        <label>Day of Week</label>
                        <select id="avail-day">
                            <option value="1">Monday</option>
                            <option value="2">Tuesday</option>
                            <option value="3">Wednesday</option>
                            <option value="4">Thursday</option>
                            <option value="5">Friday</option>
                            <option value="6">Saturday</option>
                            <option value="0">Sunday</option>
                        </select>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>Start Time</label>
                            <input type="time" id="avail-start" value="09:00">
                        </div>
                        <div class="form-group">
                            <label>End Time</label>
                            <input type="time" id="avail-end" value="17:00">
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="document.getElementById('avail-modal').classList.add('hidden')">Cancel</button>
                    <button class="btn btn-primary" onclick="DoctorDashboard.saveAvailability()">Save</button>
                </div>
            </div>
        </div>

        <!-- Appointment Notes Modal -->
        <div class="modal-overlay hidden" id="notes-modal">
            <div class="modal">
                <div class="modal-header">
                    <h2>Complete Appointment</h2>
                    <button class="modal-close" onclick="document.getElementById('notes-modal').classList.add('hidden')">✕</button>
                </div>
                <div class="modal-body">
                    <div class="form-group">
                        <label>Diagnosis</label>
                        <input type="text" id="complete-diagnosis" placeholder="Enter diagnosis...">
                    </div>
                    <div class="form-group">
                        <label>Treatment</label>
                        <textarea id="complete-treatment" placeholder="Enter treatment plan, prescriptions..." style="min-height:80px;"></textarea>
                    </div>
                    <div class="form-group">
                        <label>Additional Notes</label>
                        <textarea id="complete-notes" placeholder="Any additional follow-up notes..." style="min-height:80px;"></textarea>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="document.getElementById('notes-modal').classList.add('hidden')">Cancel</button>
                    <button class="btn btn-success" id="confirm-complete">Mark Complete</button>
                </div>
            </div>
        </div>`;
    },

    appointments: [],
    queue: [],
    eventSource: null,

    async init() {
        try {
            const [appointments, availability, queue] = await Promise.all([
                App.api('/appointments'),
                App.api('/doctors/availability/me'),
                App.api('/queue/doctor/active').catch(() => [])
            ]);

            this.appointments = appointments || [];
            this.queue = queue || [];
            this.renderStats();
            this.renderAvailability(availability || []);
            this.renderQueue();
            this.renderTable('scheduled');
            this.bindFilters();
            this.startSSE();
        } catch (e) { /* handled by api */ }
    },

    startSSE() {
        if (this.eventSource) return;
        this.eventSource = new EventSource('/api/queue/stream');
        
        this.eventSource.onmessage = (e) => {
            try {
                const data = JSON.parse(e.data);
                if (data.type === 'queue_update') {
                    App.api('/queue/doctor/active').then(q => {
                        this.queue = q || [];
                        this.renderQueue();
                    });
                }
            } catch (err) {
                console.error('SSE parsing error', err);
            }
        };
        
        this.eventSource.onerror = () => {
            this.eventSource.close();
            this.eventSource = null;
            setTimeout(() => this.startSSE(), 10000);
        };
    },

    renderQueue() {
        const container = document.getElementById('doctor-queue-table');
        if (this.queue.length === 0) {
            container.innerHTML = '<div class="empty-state"><h3>No patients in queue</h3><p>Patients will appear here when they check in.</p></div>';
            return;
        }

        container.innerHTML = `
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Ticket</th>
                        <th>Time Slot</th>
                        <th>Patient</th>
                        <th>Status</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${this.queue.map(q => `
                        <tr style="background: ${q.status === 'called' || q.status === 'in_consultation' ? '#f0f9ff' : 'transparent'}">
                            <td style="font-weight:bold; font-size:16px;">${q.ticket_code}</td>
                            <td>${q.time_slot || 'Walk-in'}</td>
                            <td>${App.escapeHtml(q.patient_name)}</td>
                            <td><span class="status-badge ${q.status}">${q.status.replace('_', ' ')}</span></td>
                            <td>
                                ${q.status === 'checked_in' ? `<button class="btn btn-primary btn-sm" onclick="DoctorDashboard.updateQueueStatus('${q.id}', 'called')">Call Next</button>` : ''}
                                ${q.status === 'called' ? `<button class="btn btn-warning btn-sm" onclick="DoctorDashboard.updateQueueStatus('${q.id}', 'in_consultation')">Start</button>` : ''}
                                ${q.status === 'in_consultation' ? `<button class="btn btn-success btn-sm" onclick="DoctorDashboard.updateQueueStatus('${q.id}', 'completed')">Complete</button>` : ''}
                                ${q.status !== 'in_consultation' ? `<button class="btn btn-danger btn-sm" onclick="DoctorDashboard.updateQueueStatus('${q.id}', 'no_show')">No-Show</button>` : ''}
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    },

    async updateQueueStatus(queueId, status) {
        try {
            const res = await App.api(`/queue/${queueId}/status`, 'PUT', { status });
            App.showToast(res.message, 'success');

            // If they completed the consultation, open the medical records prompt
            if (status === 'completed' && res.appointmentId) {
                this.openNotesModal(res.appointmentId);
            } else {
                this.init();
            }
        } catch (e) {
            App.showToast(e.message, 'error');
        }
    },

    renderStats() {
        const a = this.appointments;
        const today = new Date().toISOString().split('T')[0];
        const todayCount = a.filter(x => x.date === today && (x.status === 'scheduled' || x.status === 'rescheduled')).length;
        const upcoming = a.filter(x => x.status === 'scheduled' || x.status === 'rescheduled').length;
        const completed = a.filter(x => x.status === 'completed').length;

        document.getElementById('doctor-stats').innerHTML = `
            <div class="stat-card highlight">
                <div class="stat-icon"><i data-lucide="calendar" style="width:24px;height:24px;"></i></div>
                <div class="stat-value">${todayCount}</div>
                <div class="stat-label">Today</div>
            </div>
            <div class="stat-card">
                <div class="stat-icon"><i data-lucide="clock" style="width:24px;height:24px;"></i></div>
                <div class="stat-value">${upcoming}</div>
                <div class="stat-label">Upcoming</div>
            </div>
            <div class="stat-card">
                <div class="stat-icon"><i data-lucide="check-circle" style="width:24px;height:24px;"></i></div>
                <div class="stat-value">${completed}</div>
                <div class="stat-label">Completed</div>
            </div>
            <div class="stat-card">
                <div class="stat-icon"><i data-lucide="bar-chart-3" style="width:24px;height:24px;"></i></div>
                <div class="stat-value">${a.length}</div>
                <div class="stat-label">Total</div>
            </div>
        `;
        App.refreshIcons();
    },

    renderAvailability(availability) {
        const container = document.getElementById('availability-list');
        if (availability.length === 0) {
            container.innerHTML = '<div class="empty-state"><p>No availability set. Click "+ Add Hours" to get started.</p></div>';
            return;
        }

        container.innerHTML = availability.map(a => `
            <div class="avail-card">
                <div>
                    <div class="avail-day">${App.dayName(a.day_of_week)}</div>
                    <div class="avail-time">${a.start_time} — ${a.end_time}</div>
                </div>
                <button class="btn btn-danger btn-sm" onclick="DoctorDashboard.removeAvailability('${a.id}')" title="Remove">✕</button>
            </div>
        `).join('');
    },

    renderTable(filter = 'all') {
        let filtered = this.appointments;
        if (filter === 'scheduled') filtered = filtered.filter(a => a.status === 'scheduled' || a.status === 'rescheduled');
        else if (filter !== 'all') filtered = filtered.filter(a => a.status === filter);

        const container = document.getElementById('doctor-appointments-table');

        if (filtered.length === 0) {
            container.innerHTML = '<div class="empty-state"><div class="empty-icon"><i data-lucide="clipboard-list" style="width:40px;height:40px;color:var(--text-muted);"></i></div><h3>No appointments</h3></div>';
            App.refreshIcons();
            return;
        }

        container.innerHTML = `
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Date</th>
                        <th>Time</th>
                        <th>Patient</th>
                        <th>Blood Group</th>
                        <th>Status</th>
                        <th>Notes</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${filtered.map(a => `
                        <tr>
                            <td>${App.formatDate(a.date)}</td>
                            <td>${App.escapeHtml(a.time_slot)}</td>
                            <td>${App.escapeHtml(a.patient_name) || '—'}</td>
                            <td>${App.escapeHtml(a.blood_group) || '—'}</td>
                            <td><span class="status-badge ${a.status}">${a.status}</span></td>
                            <td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${App.escapeAttr(a.notes || '')}">${App.escapeHtml(a.notes) || '—'}</td>
                            <td>
                                ${(a.status === 'scheduled' || a.status === 'rescheduled') ? `
                                    <button class="btn btn-success btn-sm" onclick="DoctorDashboard.openComplete('${a.id}')">Complete</button>
                                    <button class="btn btn-danger btn-sm" onclick="DoctorDashboard.cancelAppt('${a.id}')">Cancel</button>
                                ` : '—'}
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>`;
    },

    bindFilters() {
        document.getElementById('doc-filter-status').addEventListener('change', (e) => {
            this.renderTable(e.target.value);
        });
    },

    showAddAvailability() {
        document.getElementById('avail-modal').classList.remove('hidden');
    },

    async saveAvailability() {
        const day = parseInt(document.getElementById('avail-day').value);
        const start = document.getElementById('avail-start').value;
        const end = document.getElementById('avail-end').value;

        if (!start || !end) {
            App.toast('Please set start and end times', 'warning');
            return;
        }

        try {
            await App.api('/doctors/availability', {
                method: 'POST',
                body: JSON.stringify({ day_of_week: day, start_time: start, end_time: end })
            });
            App.toast('Availability added!', 'success');
            document.getElementById('avail-modal').classList.add('hidden');
            await this.init();
        } catch (e) { /* handled by api */ }
    },

    async removeAvailability(id) {
        if (!confirm('Remove this availability window?')) return;
        try {
            await App.api(`/doctors/availability/${id}`, { method: 'DELETE' });
            App.toast('Availability removed', 'success');
            await this.init();
        } catch (e) { /* handled by api */ }
    },

    openComplete(appointmentId) {
        const appointment = this.appointments.find(a => a.id === appointmentId);
        document.getElementById('notes-modal').classList.remove('hidden');
        document.getElementById('complete-diagnosis').value = '';
        document.getElementById('complete-treatment').value = '';
        document.getElementById('complete-notes').value = '';
        document.getElementById('confirm-complete').onclick = async () => {
            const diagnosis = document.getElementById('complete-diagnosis').value.trim();
            const treatment = document.getElementById('complete-treatment').value.trim();
            const notes = document.getElementById('complete-notes').value.trim();
            try {
                await App.api(`/appointments/${appointmentId}/complete`, {
                    method: 'PATCH',
                    body: JSON.stringify({ notes })
                });

                // Create medical record if diagnosis and treatment are provided
                if (diagnosis && treatment && appointment) {
                    await App.api('/medical-records', {
                        method: 'POST',
                        body: JSON.stringify({
                            diagnosis,
                            treatment,
                            patient_id: appointment.patient_id,
                            appointment_id: appointmentId
                        })
                    }).catch(() => {}); // Don't block completion if record fails
                }

                App.toast('Appointment completed', 'success');
                document.getElementById('notes-modal').classList.add('hidden');
                await this.init();
            } catch (e) { /* handled by api */ }
        };
    },

    async cancelAppt(id) {
        if (!confirm('Cancel this appointment?')) return;
        try {
            await App.api(`/appointments/${id}/cancel`, { method: 'PATCH' });
            App.toast('Appointment cancelled', 'success');
            await this.init();
        } catch (e) { /* handled by api */ }
    }
};
