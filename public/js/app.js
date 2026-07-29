/* ============================================
   UCC Hospital — Main App (Router, Auth, API)
   ============================================ */

const App = {
    token: localStorage.getItem('token') || null,
    user: JSON.parse(localStorage.getItem('user') || 'null'),
    currentPage: null,

    // --- XSS Protection ---
    escapeHtml(str) {
        if (str == null) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    },

    escapeAttr(str) {
        if (str == null) return '';
        return String(str).replace(/'/g, "\\'").replace(/"/g, '&quot;');
    },

    // --- API Helper ---
    async api(endpoint, options = {}) {
        const url = '/api' + endpoint;
        const headers = { 'Content-Type': 'application/json', ...options.headers };
        if (this.token) headers['Authorization'] = 'Bearer ' + this.token;

        try {
            const res = await fetch(url, { ...options, headers });
            if (res.status === 401) {
                this.logout();
                return null;
            }
            const contentType = res.headers.get('content-type');
            if (contentType && contentType.includes('text/csv')) {
                return { ok: res.ok, blob: await res.blob() };
            }
            const data = await res.json();
            if (!res.ok) {
                const err = new Error(data.error || 'Request failed');
                err.code = data.code;
                throw err;
            }
            return data;
        } catch (err) {
            if (err.message !== 'Failed to fetch') App.toast(err.message, 'error');
            throw err;
        }
    },

    // --- Auth ---
    setAuth(token, user) {
        this.token = token;
        this.user = user;
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));
    },

    logout() {
        this.token = null;
        this.user = null;
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        this.navigate('login');
    },

    isLoggedIn() {
        if (!this.token || !this.user) return false;
        // Check JWT expiry
        try {
            const payload = JSON.parse(atob(this.token.split('.')[1]));
            if (payload.exp && payload.exp * 1000 < Date.now()) {
                this.logout();
                return false;
            }
        } catch (e) {
            this.logout();
            return false;
        }
        return true;
    },

    // --- Toast Notifications ---
    toast(message, type = 'info') {
        const container = document.getElementById('toast-container');
        // Limit toast stacking to 5
        while (container.children.length >= 5) {
            container.removeChild(container.firstChild);
        }
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        const icons = { success: '✓', error: '✕', warning: '⚠', info: 'ℹ' };
        toast.innerHTML = `<span>${icons[type] || 'ℹ'}</span><span>${this.escapeHtml(message)}</span>`;
        container.appendChild(toast);
        setTimeout(() => {
            toast.classList.add('toast-out');
            setTimeout(() => toast.remove(), 300);
        }, 3500);
    },

    // --- Navigation / Router ---
    navigate(page) {
        window.location.hash = '#' + page;
    },

    async route() {
        const hash = window.location.hash.slice(1) || '';
        const app = document.getElementById('app');
        const navbar = document.getElementById('navbar');

        // Close notification panel on navigation
        const notifPanel = document.getElementById('notification-panel');
        if (notifPanel) notifPanel.classList.add('hidden');

        // Close profile panel on navigation
        if (typeof ProfilePanel !== 'undefined' && ProfilePanel.isOpen) {
            ProfilePanel.close();
        }

        // Auth guard
        if (!this.isLoggedIn() && hash !== 'register' && hash !== 'forgot-password') {
            navbar.classList.add('hidden');
            app.classList.remove('with-nav');
            app.innerHTML = LoginPage.render();
            LoginPage.init();
            this.currentPage = 'login';
            this.refreshIcons();
            return;
        }

        if (!this.isLoggedIn() && hash === 'register') {
            navbar.classList.add('hidden');
            app.classList.remove('with-nav');
            app.innerHTML = RegisterPage.render();
            RegisterPage.init();
            this.currentPage = 'register';
            this.refreshIcons();
            return;
        }

        if (!this.isLoggedIn() && hash === 'forgot-password') {
            navbar.classList.add('hidden');
            app.classList.remove('with-nav');
            app.innerHTML = ForgotPasswordPage.render();
            ForgotPasswordPage.init();
            this.currentPage = 'forgot-password';
            this.refreshIcons();
            return;
        }

        // Logged in — show navbar
        navbar.classList.remove('hidden');
        app.classList.add('with-nav');
        this.updateNav();
        this.loadNotifications();

        // Route by role + hash
        const role = this.user.role;
        let page = hash;

        // Default pages by role
        if (!page || page === 'login' || page === 'register') {
            if (role === 'patient') page = 'patient-dashboard';
            else if (role === 'doctor') page = 'doctor-dashboard';
            else page = 'admin-dashboard';
        }

        switch (page) {
            case 'patient-dashboard':
                if (role !== 'patient' && role !== 'admin') page = role + '-dashboard';
                app.innerHTML = PatientDashboard.render();
                await PatientDashboard.init();
                break;
            case 'book-appointment':
                app.innerHTML = BookAppointment.render();
                await BookAppointment.init();
                break;
            case 'doctor-dashboard':
                if (role !== 'doctor' && role !== 'admin') page = role + '-dashboard';
                app.innerHTML = DoctorDashboard.render();
                await DoctorDashboard.init();
                break;
            case 'admin-dashboard':
                if (role !== 'admin') page = role + '-dashboard';
                app.innerHTML = AdminDashboard.render();
                await AdminDashboard.init();
                break;
            default:
                // Fallback to role dashboard
                if (role === 'patient') {
                    app.innerHTML = PatientDashboard.render();
                    await PatientDashboard.init();
                } else if (role === 'doctor') {
                    app.innerHTML = DoctorDashboard.render();
                    await DoctorDashboard.init();
                } else {
                    app.innerHTML = AdminDashboard.render();
                    await AdminDashboard.init();
                }
        }
        this.currentPage = page;
        this.refreshIcons();
    },

    updateNav() {
        const navLinks = document.getElementById('nav-links');
        const userName = document.getElementById('user-name');
        const roleBadge = document.getElementById('user-role-badge');

        userName.textContent = this.user.name;
        roleBadge.textContent = this.user.role;
        roleBadge.className = 'user-role-badge ' + this.user.role;

        let links = '';
        const role = this.user.role;

        if (role === 'patient') {
            links = `
                <a class="nav-link" onclick="App.navigate('patient-dashboard')" id="nav-patient-dashboard">Dashboard</a>
                <a class="nav-link" onclick="App.navigate('book-appointment')" id="nav-book-appointment">Book Appointment</a>
            `;
        } else if (role === 'doctor') {
            links = `
                <a class="nav-link" onclick="App.navigate('doctor-dashboard')" id="nav-doctor-dashboard">Dashboard</a>
            `;
        } else if (role === 'admin') {
            links = `
                <a class="nav-link" onclick="App.navigate('admin-dashboard')" id="nav-admin-dashboard">Dashboard</a>
                <a class="nav-link" onclick="App.navigate('patient-dashboard')" id="nav-patient-dashboard">Appointments</a>
            `;
        }
        navLinks.innerHTML = links;

        // Highlight active link
        document.querySelectorAll('.nav-link').forEach(link => {
            const id = link.id.replace('nav-', '');
            if (id === (window.location.hash.slice(1) || '')) {
                link.classList.add('active');
            }
        });
    },

    // --- Notifications ---
    async loadNotifications() {
        try {
            const notifications = await this.api('/notifications');
            if (!notifications) return;

            const badge = document.getElementById('notification-badge');
            const unread = notifications.filter(n => !n.read).length;
            badge.textContent = unread;
            if (unread > 0) {
                badge.classList.remove('hidden');
            } else {
                badge.classList.add('hidden');
            }

            // Store for panel
            this._notifications = notifications;
        } catch (e) { /* silent */ }
    },

    showNotificationPanel() {
        const panel = document.getElementById('notification-panel');
        const list = document.getElementById('notif-list');

        if (!panel.classList.contains('hidden')) {
            panel.classList.add('hidden');
            return;
        }

        const notifications = this._notifications || [];
        if (notifications.length === 0) {
            list.innerHTML = '<div class="empty-state" style="padding:24px"><p>No notifications</p></div>';
        } else {
            list.innerHTML = notifications.map(n => `
                <div class="notif-item ${n.read ? '' : 'unread'} type-${n.type}"
                     onclick="App.markNotifRead('${n.id}', this)">
                    <div class="notif-message">${App.escapeHtml(n.message)}</div>
                    <div class="notif-time">${new Date(n.created_at).toLocaleString()}</div>
                </div>
            `).join('');
        }

        panel.classList.remove('hidden');
    },

    async markNotifRead(id, el) {
        try {
            await this.api(`/notifications/${id}/read`, { method: 'PATCH' });
            if (el) el.classList.remove('unread');
            this.loadNotifications();
        } catch (e) { /* silent */ }
    },

    async markAllRead() {
        try {
            await this.api('/notifications/read-all', { method: 'PATCH' });
            this.loadNotifications();
            document.querySelectorAll('.notif-item.unread').forEach(el => el.classList.remove('unread'));
        } catch (e) { /* silent */ }
    },

    // --- Utility ---
    formatDate(dateStr) {
        if (!dateStr) return '—';
        return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
    },

    dayName(dayNum) {
        return ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dayNum];
    },

    loading() {
        return '<div class="loading-spinner"><div class="spinner"></div></div>';
    },

    refreshIcons() {
        if (typeof lucide !== 'undefined') lucide.createIcons();
    },

    // --- Theme Toggle ---
    initTheme() {
        const saved = localStorage.getItem('theme') || 'dark';
        document.documentElement.setAttribute('data-theme', saved);
        this.updateThemeIcon(saved);
    },

    toggleTheme() {
        const current = document.documentElement.getAttribute('data-theme') || 'dark';
        const next = current === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', next);
        localStorage.setItem('theme', next);
        this.updateThemeIcon(next);
    },

    updateThemeIcon(theme) {
        const btn = document.getElementById('btn-theme-toggle');
        if (!btn) return;
        btn.innerHTML = theme === 'dark'
            ? '<i data-lucide="sun" style="width:18px;height:18px;"></i>'
            : '<i data-lucide="moon" style="width:18px;height:18px;"></i>';
        this.refreshIcons();
    }
};

// --- Boot after all scripts loaded ---
window.addEventListener('load', () => {
    App.initTheme();
    window.addEventListener('hashchange', () => App.route());

    document.getElementById('btn-logout').addEventListener('click', () => App.logout());
    document.getElementById('notification-bell').addEventListener('click', () => App.showNotificationPanel());
    document.getElementById('mark-all-read').addEventListener('click', () => App.markAllRead());
    document.getElementById('btn-theme-toggle').addEventListener('click', () => App.toggleTheme());

    // Close notification panel on outside click
    document.addEventListener('click', (e) => {
        const panel = document.getElementById('notification-panel');
        const bell = document.getElementById('notification-bell');
        if (!panel.contains(e.target) && !bell.contains(e.target)) {
            panel.classList.add('hidden');
        }
    });

    // Boot
    App.route();
});
