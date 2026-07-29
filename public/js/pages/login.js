/* ============================================
   Login Page
   ============================================ */
const LoginPage = {
    render() {
        return `
        <div class="auth-page">
            <div class="auth-card">
                <div class="auth-header">
                    <div class="logo" style="position:relative;">
                        <div style="position:absolute;inset:-12px;border-radius:50%;background:radial-gradient(circle,rgba(212,168,67,0.15),transparent 70%);"></div>
                        <img src="/images/ucc-logo.png" alt="UCC Logo" style="width:88px;height:88px;object-fit:contain;position:relative;">
                    </div>
                    <h1>Group 25</h1>
                    <p>Booking Platform</p>
                </div>
                <form id="login-form">
                    <div class="form-group">
                        <label for="login-email">Email Address</label>
                        <input type="email" id="login-email" placeholder="Enter your email" required>
                    </div>
                    <div class="form-group">
                        <label for="login-password">Password</label>
                        <input type="password" id="login-password" placeholder="Enter your password" required>
                    </div>
                    <div style="text-align: right; margin: -8px 0 8px;">
                        <a class="btn-link" onclick="App.navigate('forgot-password')" style="font-size: 0.85rem;">Forgot Password?</a>
                    </div>
                    <button type="submit" class="btn btn-primary btn-block" id="login-btn">
                        Sign In
                    </button>
                </form>
                <div class="text-center mt-24">
                    <span style="color: var(--text-secondary); font-size: 0.9rem;">Don't have an account? </span>
                    <a class="btn-link" onclick="App.navigate('register')">Create one</a>
                </div>
                
            </div>
        </div>`;
    },

    init() {
        document.getElementById('login-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = document.getElementById('login-btn');
            const email = document.getElementById('login-email').value.trim();
            const password = document.getElementById('login-password').value;

            if (!email || !password) {
                App.toast('Please fill in all fields', 'warning');
                return;
            }

            btn.disabled = true;
            btn.textContent = 'Signing in...';

            try {
                const data = await App.api('/auth/login', {
                    method: 'POST',
                    body: JSON.stringify({ email, password })
                });

                if (data) {
                    App.setAuth(data.token, data.user);
                    App.toast(`Welcome back, ${data.user.name}!`, 'success');
                    App.route();
                }
            } catch (err) {
                btn.disabled = false;
                btn.textContent = 'Sign In';
            }
        });
    }
};
