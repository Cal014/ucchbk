/* ============================================
   Profile Slide Panel
   ============================================ */
const ProfilePanel = {
    isOpen: false,
    isEditing: false,
    profileData: null,

    toggle() {
        if (this.isOpen) {
            this.close();
        } else {
            this.open();
        }
    },

    async open() {
        this.isOpen = true;
        this.isEditing = false;
        document.getElementById('profile-backdrop').classList.remove('hidden');
        const panel = document.getElementById('profile-panel');
        panel.classList.remove('hidden');
        setTimeout(() => panel.classList.add('open'), 10);

        // Load profile data
        panel.querySelector('.profile-panel-body').innerHTML = App.loading();
        try {
            this.profileData = await App.api('/auth/profile');
            this.render();
        } catch (e) {
            panel.querySelector('.profile-panel-body').innerHTML =
                '<div class="empty-state"><p>Failed to load profile</p></div>';
        }
    },

    close() {
        this.isOpen = false;
        this.isEditing = false;
        const panel = document.getElementById('profile-panel');
        panel.classList.remove('open');
        setTimeout(() => {
            panel.classList.add('hidden');
            document.getElementById('profile-backdrop').classList.add('hidden');
        }, 300);
    },

    toggleEdit() {
        this.isEditing = !this.isEditing;
        this.render();
    },

    render() {
        const p = this.profileData;
        if (!p) return;

        const e = App.escapeHtml;
        const role = p.role;
        const initials = p.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
        const joinDate = new Date(p.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

        let roleFields = '';

        if (role === 'patient') {
            roleFields = this.isEditing ? `
                <div class="profile-section-title">Patient Information</div>
                <div class="profile-field">
                    <label>Date of Birth</label>
                    <input type="date" id="prof-dob" value="${p.date_of_birth || ''}">
                </div>
                <div class="profile-field">
                    <label>Gender</label>
                    <select id="prof-gender">
                        <option value="">Select</option>
                        <option value="Male" ${p.gender === 'Male' ? 'selected' : ''}>Male</option>
                        <option value="Female" ${p.gender === 'Female' ? 'selected' : ''}>Female</option>
                        <option value="Other" ${p.gender === 'Other' ? 'selected' : ''}>Other</option>
                    </select>
                </div>
                <div class="profile-field">
                    <label>Blood Group</label>
                    <select id="prof-blood">
                        <option value="">Select</option>
                        ${['A+','A-','B+','B-','AB+','AB-','O+','O-','Unknown'].map(bg =>
                            `<option ${p.blood_group === bg ? 'selected' : ''}>${bg}</option>`
                        ).join('')}
                    </select>
                </div>
                <div class="profile-field">
                    <label>Address</label>
                    <input type="text" id="prof-address" value="${e(p.address || '')}" placeholder="Enter address">
                </div>
            ` : `
                <div class="profile-section-title">Patient Information</div>
                <div class="profile-field-row">
                    <span class="profile-label">Date of Birth</span>
                    <span class="profile-value">${p.date_of_birth ? App.formatDate(p.date_of_birth) : '—'}</span>
                </div>
                <div class="profile-field-row">
                    <span class="profile-label">Gender</span>
                    <span class="profile-value">${e(p.gender) || '—'}</span>
                </div>
                <div class="profile-field-row">
                    <span class="profile-label">Blood Group</span>
                    <span class="profile-value">${e(p.blood_group) || '—'}</span>
                </div>
                <div class="profile-field-row">
                    <span class="profile-label">Address</span>
                    <span class="profile-value">${e(p.address) || '—'}</span>
                </div>
            `;
        } else if (role === 'doctor') {
            roleFields = this.isEditing ? `
                <div class="profile-section-title">Doctor Information</div>
                <div class="profile-field-row">
                    <span class="profile-label">Specialization</span>
                    <span class="profile-value">${e(p.specialization)}</span>
                </div>
                <div class="profile-field">
                    <label>Bio</label>
                    <textarea id="prof-bio" placeholder="Professional bio...">${e(p.bio || '')}</textarea>
                </div>
                <div class="profile-field">
                    <label>Consultation Fee (GHS)</label>
                    <input type="number" id="prof-fee" value="${p.consultation_fee || 0}" min="0" step="0.01">
                </div>
            ` : `
                <div class="profile-section-title">Doctor Information</div>
                <div class="profile-field-row">
                    <span class="profile-label">Specialization</span>
                    <span class="profile-value">${e(p.specialization)}</span>
                </div>
                <div class="profile-field-row">
                    <span class="profile-label">Bio</span>
                    <span class="profile-value" style="font-size:0.82rem;">${e(p.bio) || '—'}</span>
                </div>
                <div class="profile-field-row">
                    <span class="profile-label">Consultation Fee</span>
                    <span class="profile-value" style="color:var(--accent);font-weight:700;">GHS ${(p.consultation_fee || 0).toFixed(2)}</span>
                </div>
            `;
        } else if (role === 'admin') {
            roleFields = `
                <div class="profile-section-title">Administrator</div>
                <div class="profile-field-row">
                    <span class="profile-label">Role</span>
                    <span class="profile-value"><span class="user-role-badge admin" style="display:inline-flex">Admin</span></span>
                </div>
            `;
        }

        const body = document.getElementById('profile-panel').querySelector('.profile-panel-body');
        body.innerHTML = `
            <div class="profile-avatar-section">
                <div class="profile-avatar ${role}">${initials}</div>
                <div class="profile-name">${e(p.name)}</div>
                <div class="profile-email">${e(p.email)}</div>
                <span class="user-role-badge ${role}" style="display:inline-flex;margin-top:6px;">${role}</span>
                <div class="profile-joined">Member since ${joinDate}</div>
            </div>

            <div class="profile-fields">
                ${this.isEditing ? `
                    <div class="profile-section-title">Basic Information</div>
                    <div class="profile-field">
                        <label>Full Name</label>
                        <input type="text" id="prof-name" value="${e(p.name)}">
                    </div>
                    <div class="profile-field">
                        <label>Phone</label>
                        <input type="tel" id="prof-phone" value="${e(p.phone || '')}" placeholder="+233-000-0000">
                    </div>
                ` : `
                    <div class="profile-section-title">Contact</div>
                    <div class="profile-field-row">
                        <span class="profile-label">Phone</span>
                        <span class="profile-value">${e(p.phone) || '—'}</span>
                    </div>
                `}

                ${roleFields}

                ${this.isEditing ? `
                    <div class="profile-actions">
                        <button class="btn btn-primary btn-block" onclick="ProfilePanel.saveProfile()">
                            <i data-lucide="save" style="width:16px;height:16px;"></i> Save Changes
                        </button>
                        <button class="btn btn-secondary btn-block" onclick="ProfilePanel.toggleEdit()" style="margin-top:8px;">Cancel</button>
                    </div>
                ` : `
                    <button class="btn btn-secondary btn-block" onclick="ProfilePanel.toggleEdit()" style="margin-top:16px;">
                        <i data-lucide="edit-2" style="width:15px;height:15px;"></i> Edit Profile
                    </button>
                `}
            </div>

            <div class="profile-password-section">
                <button class="btn btn-ghost btn-block" onclick="ProfilePanel.togglePasswordSection()" id="pwd-toggle-btn">
                    <i data-lucide="lock" style="width:15px;height:15px;"></i> Change Password
                </button>
                <div class="profile-password-form hidden" id="password-form">
                    <div class="profile-field">
                        <label>Current Password</label>
                        <input type="password" id="prof-current-pwd" placeholder="Enter current password">
                    </div>
                    <div class="profile-field">
                        <label>New Password</label>
                        <input type="password" id="prof-new-pwd" placeholder="Min 6 characters" minlength="6">
                    </div>
                    <div class="profile-field">
                        <label>Confirm New Password</label>
                        <input type="password" id="prof-confirm-pwd" placeholder="Confirm new password">
                    </div>
                    <button class="btn btn-primary btn-block" onclick="ProfilePanel.changePassword()">
                        <i data-lucide="key" style="width:15px;height:15px;"></i> Update Password
                    </button>
                </div>
            </div>

            <div style="padding:0 20px 20px;">
                <button class="btn btn-danger btn-block btn-sm" onclick="App.logout()" style="margin-top:8px;">
                    <i data-lucide="log-out" style="width:14px;height:14px;"></i> Logout
                </button>
            </div>
        `;
        App.refreshIcons();
    },

    togglePasswordSection() {
        const form = document.getElementById('password-form');
        form.classList.toggle('hidden');
    },

    async saveProfile() {
        const body = {};
        const p = this.profileData;

        body.name = document.getElementById('prof-name').value.trim();
        body.phone = document.getElementById('prof-phone').value.trim();

        if (!body.name) {
            App.toast('Name is required', 'warning');
            return;
        }

        if (p.role === 'patient') {
            body.date_of_birth = document.getElementById('prof-dob').value;
            body.gender = document.getElementById('prof-gender').value;
            body.blood_group = document.getElementById('prof-blood').value;
            body.address = document.getElementById('prof-address').value.trim();
        } else if (p.role === 'doctor') {
            body.bio = document.getElementById('prof-bio').value.trim();
            body.consultation_fee = document.getElementById('prof-fee').value;
        }

        try {
            const result = await App.api('/auth/profile', {
                method: 'PUT',
                body: JSON.stringify(body)
            });

            if (result && result.user) {
                // Update the stored user in localStorage
                App.user.name = result.user.name;
                App.user.phone = result.user.phone;
                localStorage.setItem('user', JSON.stringify(App.user));
                document.getElementById('user-name').textContent = result.user.name;
            }

            App.toast('Profile updated!', 'success');
            this.isEditing = false;
            // Reload profile data
            this.profileData = await App.api('/auth/profile');
            this.render();
        } catch (e) { /* handled by api */ }
    },

    async changePassword() {
        const current = document.getElementById('prof-current-pwd').value;
        const newPwd = document.getElementById('prof-new-pwd').value;
        const confirm = document.getElementById('prof-confirm-pwd').value;

        if (!current || !newPwd || !confirm) {
            App.toast('Please fill in all password fields', 'warning');
            return;
        }
        if (newPwd.length < 6) {
            App.toast('New password must be at least 6 characters', 'warning');
            return;
        }
        if (newPwd !== confirm) {
            App.toast('New passwords do not match', 'error');
            return;
        }

        try {
            await App.api('/auth/change-password', {
                method: 'POST',
                body: JSON.stringify({ current_password: current, new_password: newPwd })
            });
            App.toast('Password changed successfully!', 'success');
            document.getElementById('prof-current-pwd').value = '';
            document.getElementById('prof-new-pwd').value = '';
            document.getElementById('prof-confirm-pwd').value = '';
            document.getElementById('password-form').classList.add('hidden');
        } catch (e) { /* handled by api */ }
    }
};
