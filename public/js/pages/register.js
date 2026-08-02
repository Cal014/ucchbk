/* ============================================
   Register Page
   ============================================ */
const RegisterPage = {
    render() {
        return `
        <div class="auth-page">
            <div class="auth-card" style="max-width: 520px;">
                <div class="auth-header">
                    <div class="logo" style="position:relative;">
                        <div style="position:absolute;inset:-12px;border-radius:50%;background:radial-gradient(circle,rgba(212,168,67,0.15),transparent 70%);"></div>
                        <img src="/images/ucc-logo.png" alt="UCC Logo" style="width:72px;height:72px;object-fit:contain;position:relative;">
                    </div>
                    <h1>Create Account</h1>
                    <p>Join UCC Hospital Booking Platform</p>
                </div>
                <form id="register-form">
                    <input type="hidden" id="reg-role" value="patient">
                    <div class="form-row">
                        <div class="form-group">
                            <label for="reg-name">Full Name</label>
                            <input type="text" id="reg-name" placeholder="Kofi Boakye" required>
                        </div>
                        <div class="form-group">
                            <label for="reg-email">Email</label>
                            <input type="email" id="reg-email" placeholder="kofi@example.com" required>
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label for="reg-password">Password</label>
                            <input type="password" id="reg-password" placeholder="Min 6 characters" required minlength="6">
                        </div>
                        <div class="form-group">
                            <label for="reg-phone">Phone</label>
                            <input type="tel" id="reg-phone" placeholder="+233-000000000">
                        </div>
                    </div>

                    <!-- Patient fields -->
                    <div id="patient-fields">
                        <div class="form-row">
                            <div class="form-group">
                                <label for="reg-dob">Date of Birth</label>
                                <input type="date" id="reg-dob">
                            </div>
                            <div class="form-group">
                                <label for="reg-gender">Gender</label>
                                <select id="reg-gender">
                                    <option value="">Select</option>
                                    <option value="Male">Male</option>
                                    <option value="Female">Female</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label for="reg-blood">Blood Group</label>
                                <select id="reg-blood">
                                    <option value="">Select</option>
                                    <option>A+</option><option>A-</option>
                                    <option>B+</option><option>B-</option>
                                    <option>AB+</option><option>AB-</option>
                                    <option>O+</option><option>O-</option>
                                    <option>Unknown</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label for="reg-address">Address</label>
                                <input type="text" id="reg-address" placeholder="123 Main St, Accra">
                            </div>
                        </div>
                    </div>


                    <button type="submit" class="btn btn-primary btn-block" id="reg-btn">Create Account</button>
                </form>
                <div class="text-center mt-24">
                    <span style="color: var(--text-secondary); font-size: 0.9rem;">Already have an account? </span>
                    <a class="btn-link" onclick="App.navigate('login')">Sign in</a>
                </div>
            </div>
        </div>`;
    },

    init() {

        document.getElementById('register-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = document.getElementById('reg-btn');
            const body = {
                name: document.getElementById('reg-name').value.trim(),
                email: document.getElementById('reg-email').value.trim(),
                password: document.getElementById('reg-password').value,
                phone: document.getElementById('reg-phone').value.trim(),
                role: 'patient',
                date_of_birth: document.getElementById('reg-dob').value,
                gender: document.getElementById('reg-gender').value,
                blood_group: document.getElementById('reg-blood').value,
                address: document.getElementById('reg-address').value.trim()
            };

            if (!body.name || !body.email || !body.password) {
                App.toast('Please fill in all required fields', 'warning');
                return;
            }

            if (body.password.length < 6) {
                App.toast('Password must be at least 6 characters', 'warning');
                return;
            }

            btn.disabled = true;
            btn.textContent = 'Creating account...';

            try {
                await App.api('/auth/register', {
                    method: 'POST',
                    body: JSON.stringify(body)
                });
                App.toast('Account created! Please sign in.', 'success');
                App.navigate('login');
            } catch (err) {
                btn.disabled = false;
                btn.textContent = 'Create Account';
            }
        });
    }
};
