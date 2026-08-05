/* ============================================
   Forgot Password Page — 2-Step OTP Reset
   ============================================ */
const ForgotPasswordPage = {
    _step: 1,
    _email: '',

    render() {
        return `
        <div class="auth-page">
            <div class="auth-card" style="max-width: 460px;">
                <div class="auth-header">
                    <div class="logo" style="position:relative;">
                        <div style="position:absolute;inset:-12px;border-radius:50%;background:radial-gradient(circle,rgba(212,168,67,0.15),transparent 70%);"></div>
                        <img src="/images/hospital-logo.png" alt="Hospital Logo" style="width:72px;height:72px;object-fit:contain;position:relative;">
                    </div>
                    <h1>Reset Password</h1>
                    <p id="fp-subtitle">Enter your email to receive a verification code</p>
                </div>

                <!-- Step 1: Email Input -->
                <form id="fp-step1">
                    <div class="form-group">
                        <label for="fp-email">Email Address</label>
                        <input type="email" id="fp-email" placeholder="your@email.com" required>
                    </div>
                    <button type="submit" class="btn btn-primary btn-block" id="fp-send-btn">Send Verification Code</button>
                </form>

                <!-- Step 2: OTP + New Password -->
                <form id="fp-step2" class="hidden">
                    <div style="background: rgba(212,168,67,0.08); border: 1px solid rgba(212,168,67,0.25); border-radius: var(--radius-sm); padding: 14px; margin-bottom: 20px; text-align: center;">
                        <p style="color: var(--text-secondary); font-size: 0.85rem; margin: 0;">A 6-digit code was sent to <strong id="fp-sent-email" style="color: var(--accent);"></strong></p>
                    </div>
                    <div class="form-group">
                        <label for="fp-otp">Verification Code</label>
                        <input type="text" id="fp-otp" placeholder="000000" maxlength="6" required
                               style="text-align:center; font-size:1.5rem; letter-spacing:8px; font-weight:700;">
                    </div>
                    <div class="form-group">
                        <label for="fp-newpass">New Password</label>
                        <input type="password" id="fp-newpass" placeholder="Min 8 characters" required minlength="8">
                    </div>
                    <div class="form-group">
                        <label for="fp-confirm">Confirm Password</label>
                        <input type="password" id="fp-confirm" placeholder="Re-enter new password" required minlength="8">
                    </div>
                    <button type="submit" class="btn btn-primary btn-block" id="fp-reset-btn">Reset Password</button>
                    <div class="text-center" style="margin-top: 12px;">
                        <a class="btn-link" style="font-size:0.85rem; cursor:pointer;" id="fp-resend">Resend Code</a>
                    </div>
                </form>

                <div class="text-center mt-24">
                    <span style="color: var(--text-secondary); font-size: 0.9rem;">Remember your password? </span>
                    <a class="btn-link" onclick="App.navigate('login')">Back to Sign In</a>
                </div>
            </div>
        </div>`;
    },

    init() {
        this._step = 1;
        this._email = '';

        // Step 1: Send OTP
        document.getElementById('fp-step1').addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = document.getElementById('fp-send-btn');
            const email = document.getElementById('fp-email').value.trim();

            if (!email) {
                App.toast('Please enter your email address', 'warning');
                return;
            }

            btn.disabled = true;
            btn.textContent = 'Sending...';

            try {
                await App.api('/auth/forgot-password', {
                    method: 'POST',
                    body: JSON.stringify({ email })
                });

                this._email = email;
                this._step = 2;

                // Transition to Step 2
                document.getElementById('fp-step1').classList.add('hidden');
                document.getElementById('fp-step2').classList.remove('hidden');
                document.getElementById('fp-sent-email').textContent = email;
                document.getElementById('fp-subtitle').textContent = 'Enter the code sent to your email';
                document.getElementById('fp-otp').focus();

                App.toast('Verification code sent! Check your email', 'success');
            } catch (err) {
                btn.disabled = false;
                btn.textContent = 'Send Verification Code';
            }
        });

        // Step 2: Verify OTP & Reset Password
        document.getElementById('fp-step2').addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = document.getElementById('fp-reset-btn');
            const otp = document.getElementById('fp-otp').value.trim();
            const newPass = document.getElementById('fp-newpass').value;
            const confirm = document.getElementById('fp-confirm').value;

            if (!otp || otp.length !== 6) {
                App.toast('Please enter the 6-digit verification code', 'warning');
                return;
            }
            if (newPass.length < 8) {
                App.toast('Password must be at least 8 characters', 'warning');
                return;
            }
            if (newPass !== confirm) {
                App.toast('Passwords do not match', 'warning');
                return;
            }

            btn.disabled = true;
            btn.textContent = 'Resetting...';

            try {
                // First verify the OTP
                await App.api('/auth/verify-otp', {
                    method: 'POST',
                    body: JSON.stringify({ email: this._email, otp })
                });

                // Then confirm the reset
                await App.api('/auth/confirm-reset', {
                    method: 'POST',
                    body: JSON.stringify({ email: this._email, otp, new_password: newPass })
                });

                App.toast('Password reset successfully! Please sign in.', 'success');
                App.navigate('login');
            } catch (err) {
                btn.disabled = false;
                btn.textContent = 'Reset Password';
            }
        });

        // Resend OTP
        document.getElementById('fp-resend')?.addEventListener('click', async () => {
            if (!this._email) return;
            try {
                await App.api('/auth/forgot-password', {
                    method: 'POST',
                    body: JSON.stringify({ email: this._email })
                });
                App.toast('New verification code sent!', 'success');
            } catch (err) {
                App.toast('Failed to resend code', 'error');
            }
        });
    }
};
