/* ============================================
   Forgot Password Page
   ============================================ */
const ForgotPasswordPage = {
    render() {
        return `
        <div class="auth-page">
            <div class="auth-card">
                <div class="auth-header">
                    <div class="logo" style="position:relative;">
                        <div style="position:absolute;inset:-12px;border-radius:50%;background:radial-gradient(circle,rgba(212,168,67,0.15),transparent 70%);"></div>
                        <img src="/images/ucc-logo.png" alt="UCC Logo" style="width:88px;height:88px;object-fit:contain;position:relative;">
                    </div>
                    <h1>Reset Password</h1>
                    <p>Password resets require administrator assistance</p>
                </div>
                <div style="padding: 8px 0 24px;">
                    <div style="background: rgba(245,158,11,0.08); border: 1px solid rgba(245,158,11,0.25); border-radius: var(--radius-sm); padding: 20px; text-align: center;">
                        <div style="font-size: 2rem; margin-bottom: 12px;">🔒</div>
                        <p style="color: var(--text-primary); font-weight: 600; margin-bottom: 8px;">Contact Hospital Admin</p>
                        <p style="color: var(--text-secondary); font-size: 0.85rem; line-height: 1.6;">
                            For your security, password resets must be performed by a system administrator.
                            Please contact the hospital admin desk or email
                            <strong style="color: var(--accent);">admin@hospital.com</strong>
                            to request a password reset.
                        </p>
                    </div>
                </div>
                <div class="text-center mt-24">
                    <span style="color: var(--text-secondary); font-size: 0.9rem;">Remember your password? </span>
                    <a class="btn-link" onclick="App.navigate('login')">Back to Sign In</a>
                </div>
            </div>
        </div>`;
    },

    init() {
        // No form to initialize — this page is informational only
    }
};
