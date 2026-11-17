// ==========================================================================
// S STUDIO - CREATOR PROFILE POPUP, ACCOUNT DELETE REQUEST & AUTH ENGINE
// ==========================================================================

const S_STUDIO_AUTH_API = "https://script.google.com/macros/s/AKfycbwPbUN34AcyNgrHvxcLusf8gU0L3utFzd7COQ4P_vmyVwK4nEagr_iSyD__7Aj7K7e3/exec";
const GOOGLE_OAUTH_CLIENT_ID = "";

const SESSION_STORAGE_KEY = "sStudio_persistentSession";
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
const TWENTY_ONE_DAYS_MS = 21 * 24 * 60 * 60 * 1000;

let pendingExportCallback = null;
let isSignupEmailVerified = false;

// ==========================================================================
// 1. SLIDING SESSION (7 DAYS IDLE LOGOUT / MAX 21 DAYS ACTIVE)
// ==========================================================================
function getValidCreatorSession() {
    try {
        const raw = localStorage.getItem(SESSION_STORAGE_KEY);
        if (!raw) return null;

        const session = JSON.parse(raw);
        const now = Date.now();

        if (now - (session.lastActiveAt || session.loginAt) > SEVEN_DAYS_MS) {
            localStorage.removeItem(SESSION_STORAGE_KEY);
            return null;
        }
        if (now - session.loginAt > TWENTY_ONE_DAYS_MS) {
            localStorage.removeItem(SESSION_STORAGE_KEY);
            return null;
        }

        session.lastActiveAt = now;
        localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
        return session;
    } catch (e) {
        localStorage.removeItem(SESSION_STORAGE_KEY);
        return null;
    }
}

function createCreatorSession(userObj) {
    const now = Date.now();
    const sessionPayload = {
        registerId: userObj.registerId,
        name: userObj.name,
        email: userObj.email,
        mobile: userObj.mobile || "Not Provided",
        loginAt: now,
        lastActiveAt: now
    };
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(sessionPayload));
    updateLoggedInHeaderUI();
}

window.logoutCreatorSession = function () {
    localStorage.removeItem(SESSION_STORAGE_KEY);
    closeCreatorProfileModal();
    updateLoggedInHeaderUI();
};

// ==========================================================================
// 2. PASSWORD EYE VISIBILITY TOGGLE
// ==========================================================================
window.togglePasswordEye = function (inputId, btnEl) {
    const input = document.getElementById(inputId);
    if (!input) return;
    if (input.type === "password") {
        input.type = "text";
        btnEl.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2563EB" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`;
    } else {
        input.type = "password";
        btnEl.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#64748B" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`;
    }
};

// ==========================================================================
// 3. SMART HEADER CLICK HANDLER (LOGGED IN -> PROFILE | LOGGED OUT -> LOGIN)
// ==========================================================================
window.openRegisterIdLoginModal = function (isFromExport = false) {
    ensureAuthModalInjected();
    ensureProfileModalInjected();

    // If user is ALREADY logged in, open Professional Profile Modal instead of Login Form!
    const activeUser = getValidCreatorSession();
    if (activeUser && activeUser.registerId && !isFromExport) {
        openCreatorProfileModal(activeUser);
        return;
    }

    openLoginView();
    const exportTag = document.getElementById("authExportNoticeTag");
    if (exportTag) exportTag.style.display = isFromExport ? "block" : "none";
    document.getElementById("registerIdLoginModal").style.display = "flex";
};

// ==========================================================================
// 4. PROFESSIONAL CREATOR PROFILE MODAL (DETAILS + LOGOUT + DELETE ACCOUNT)
// ==========================================================================
function ensureProfileModalInjected() {
    if (document.getElementById("creatorProfileModal")) return;

    const profileHTML = `
    <div id="creatorProfileModal" style="display: none; position: fixed; inset: 0; background: rgba(15, 23, 42, 0.65); backdrop-filter: blur(4px); z-index: 9999999; justify-content: center; align-items: center; padding: 16px;">
        <div style="background: #FFFFFF; border: 1px solid #CBD5E1; border-radius: 16px; max-width: 420px; width: 100%; box-shadow: 0 25px 50px rgba(0,0,0,0.25); overflow: hidden; color: #0F172A; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
            
            <!-- Top Header -->
            <div style="padding: 16px 20px; background: #F8FAFC; border-bottom: 1px solid #E2E8F0; display: flex; justify-content: space-between; align-items: center;">
                <div style="display: flex; align-items: center; gap: 8px;">
                    <span style="width: 9px; height: 9px; border-radius: 50%; background: #10B981; display: inline-block;"></span>
                    <h3 style="margin: 0; font-size: 16px; font-weight: 800; color: #0F172A;">Creator Profile</h3>
                </div>
                <button type="button" onclick="closeCreatorProfileModal()" style="background: none; border: none; font-size: 20px; cursor: pointer; color: #475569;">✕</button>
            </div>

            <!-- Profile Body -->
            <div style="padding: 22px 20px;">
                
                <!-- Avatar + Name + Register ID Badge -->
                <div style="display: flex; align-items: center; gap: 14px; margin-bottom: 18px;">
                    <div id="profAvatarCircle" style="width: 54px; height: 54px; min-width: 54px; border-radius: 50%; background: #EFF6FF; border: 2px solid #93C5FD; color: #2563EB; display: flex; align-items: center; justify-content: center; font-size: 22px; font-weight: 900;">
                        S
                    </div>
                    <div>
                        <h4 id="profDisplayName" style="margin: 0 0 4px 0; font-size: 18px; font-weight: 800; color: #0F172A;">Creator Name</h4>
                        <span id="profDisplayRegId" style="display: inline-block; background: #EFF6FF; color: #2563EB; border: 1px solid #BFDBFE; font-size: 12px; font-weight: 800; padding: 2px 10px; border-radius: 6px; letter-spacing: 0.4px;">
                            SRG000000
                        </span>
                    </div>
                </div>

                <!-- Details Box: Register ID, Email ID, Mobile Number -->
                <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 10px; padding: 14px 16px; display: flex; flex-direction: column; gap: 11px; margin-bottom: 18px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; font-size: 13px; border-bottom: 1px solid #E2E8F0; padding-bottom: 8px;">
                        <span style="color: #64748B; font-weight: 600;">Register ID</span>
                        <strong id="profRowRegId" style="color: #0F172A; font-weight: 800;">—</strong>
                    </div>
                    <div style="display: flex; justify-content: space-between; align-items: center; font-size: 13px; border-bottom: 1px solid #E2E8F0; padding-bottom: 8px;">
                        <span style="color: #64748B; font-weight: 600;">Email ID</span>
                        <strong id="profRowEmail" style="color: #0F172A; font-weight: 700;">—</strong>
                    </div>
                    <div style="display: flex; justify-content: space-between; align-items: center; font-size: 13px;">
                        <span style="color: #64748B; font-weight: 600;">Mobile Number</span>
                        <strong id="profRowMobile" style="color: #0F172A; font-weight: 700;">—</strong>
                    </div>
                </div>

                <!-- Action Feedback Banner -->
                <div id="profileActionBanner" style="display: none; padding: 10px 12px; border-radius: 8px; font-size: 12.5px; font-weight: 600; margin-bottom: 14px;"></div>

                <!-- Logout Button -->
                <button type="button" onclick="logoutCreatorSession()" style="width: 100%; background: #0F172A; color: #FFFFFF; border: none; padding: 11px; border-radius: 8px; font-weight: 700; font-size: 13.5px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; margin-bottom: 10px;">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                    <span>Logout</span>
                </button>

            </div>
        </div>
    </div>`;

    document.body.insertAdjacentHTML("beforeend", profileHTML);
}

function openCreatorProfileModal(user) {
    ensureProfileModalInjected();
    const banner = document.getElementById("profileActionBanner");
    if (banner) banner.style.display = "none";

    const initial = (user.name || "C").trim().charAt(0).toUpperCase();
    document.getElementById("profAvatarCircle").innerText = initial;
    document.getElementById("profDisplayName").innerText = user.name || "Creator";
    document.getElementById("profDisplayRegId").innerText = user.registerId || "—";
    document.getElementById("profRowRegId").innerText = user.registerId || "—";
    document.getElementById("profRowEmail").innerText = user.email || "—";
    document.getElementById("profRowMobile").innerText = user.mobile || "Registered";

    document.getElementById("creatorProfileModal").style.display = "flex";
}

window.closeCreatorProfileModal = function () {
    const m = document.getElementById("creatorProfileModal");
    if (m) m.style.display = "none";
};

window.requestDeleteCreatorAccount = async function () {
    const user = getValidCreatorSession();
    if (!user) return;

    const confirmed = confirm(
        `Are you sure you want to send an Account Deletion Request for ${user.name} (${user.registerId})?\n\nA confirmation email will be sent to your registered Email ID and Sriram Groups Official support desk.`
    );
    if (!confirmed) return;

    const btn = document.getElementById("deleteAccountReqBtn");
    const banner = document.getElementById("profileActionBanner");
    btn.disabled = true;
    btn.innerText = "Sending Delete Request Email...";

    try {
        const res = await fetch(S_STUDIO_AUTH_API, {
            method: "POST",
            body: JSON.stringify({
                action: "request_delete_account",
                registerId: user.registerId,
                email: user.email,
                name: user.name,
                mobile: user.mobile || ""
            })
        });
        const result = await res.json();

        banner.style.display = "block";
        if (result.status === "success") {
            banner.style.background = "#ECFDF5";
            banner.style.color = "#059669";
            banner.style.border = "1px solid #6EE7B7";
            banner.innerHTML = result.message || "Delete account request email sent successfully.";
        } else {
            banner.style.background = "#FEF2F2";
            banner.style.color = "#DC2626";
            banner.style.border = "1px solid #FCA5A5";
            banner.innerHTML = result.message || "Unable to process request.";
        }
    } catch (err) {
        banner.style.display = "block";
        banner.style.background = "#FEF2F2";
        banner.style.color = "#DC2626";
        banner.innerHTML = "Network error sending delete request email.";
    } finally {
        btn.disabled = false;
        btn.innerText = "Request for Delete Account";
    }
};

// ==========================================================================
// 5. LOGIN & CREATE ACCOUNT MODAL INJECTION
// ==========================================================================
function ensureAuthModalInjected() {
    const oldModal = document.getElementById("registerIdLoginModal");
    if (oldModal && !oldModal.dataset.sstudioV2) {
        oldModal.remove();
    } else if (oldModal) {
        return;
    }

    const eyeSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#64748B" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`;

    const modalHTML = `
    <div id="registerIdLoginModal" data-sstudio-v2="true" style="display: none; position: fixed; inset: 0; background: rgba(15, 23, 42, 0.65); backdrop-filter: blur(4px); z-index: 9999999; justify-content: center; align-items: center; padding: 16px;">
        <div style="background: #FFFFFF; border: 1px solid #CBD5E1; border-radius: 14px; max-width: 420px; width: 100%; box-shadow: 0 25px 50px rgba(0,0,0,0.25); overflow: hidden; color: #0F172A; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
            
            <div style="padding: 16px 20px; background: #F8FAFC; border-bottom: 1px solid #E2E8F0; display: flex; justify-content: space-between; align-items: center;">
                <div>
                    <h3 id="authModalHeading" style="margin: 0; font-size: 16.5px; font-weight: 800; color: #0F172A;">S Studio Creator Login</h3>
                    <span id="authExportNoticeTag" style="display: none; font-size: 11px; color: #2563EB; font-weight: 700;">Please login or create an account to export your project</span>
                </div>
                <button type="button" onclick="closeRegisterIdLoginModal()" style="background: none; border: none; font-size: 20px; cursor: pointer; color: #475569;">✕</button>
            </div>

            <div id="authStatusBanner" style="display: none; margin: 14px 20px 0 20px; padding: 10px 12px; border-radius: 7px; font-size: 12.5px; font-weight: 600;"></div>

            <!-- 1. LOGIN VIEW -->
            <div id="sStudioLoginContainer" style="padding: 20px; display: flex; flex-direction: column; gap: 14px;">
                
                <button type="button" onclick="triggerGoogleSignInFlow()" style="width: 100%; background: #FFFFFF; color: #1E293B; border: 1px solid #CBD5E1; padding: 10px 14px; border-radius: 7px; font-weight: 700; font-size: 13.5px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 10px;">
                    <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"/><path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24Z"/><path fill="#FBBC05" d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14Z"/><path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96Z"/></svg>
                    <span>Continue with Google</span>
                </button>

                <div style="display: flex; align-items: center; gap: 10px; color: #94A3B8; font-size: 11px; font-weight: 700;">
                    <div style="flex: 1; height: 1px; background: #E2E8F0;"></div>
                    <span>OR LOGIN WITH ID</span>
                    <div style="flex: 1; height: 1px; background: #E2E8F0;"></div>
                </div>

                <form id="sStudioLoginForm" action="javascript:void(0);" method="post" autocomplete="on" onsubmit="handleUserLoginSubmit(event)" style="display: flex; flex-direction: column; gap: 13px;">
                    <div>
                        <label for="loginUserIdInput" style="display: block; font-size: 12.5px; font-weight: 700; color: #334155; margin-bottom: 5px;">Register ID / Email ID</label>
                        <input type="text" id="loginUserIdInput" name="username" autocomplete="username" required placeholder="e.g. SRG263422 or email@gmail.com" style="width: 100%; padding: 10px 12px; border: 1px solid #CBD5E1; border-radius: 7px; font-size: 13.5px; box-sizing: border-box;">
                    </div>

                    <div>
                        <label for="loginPasswordInput" style="display: block; font-size: 12.5px; font-weight: 700; color: #334155; margin-bottom: 5px;">Security PIN / Password</label>
                        <div style="position: relative; display: flex; align-items: center;">
                            <input type="password" id="loginPasswordInput" name="password" autocomplete="current-password" required placeholder="••••••••" style="width: 100%; padding: 10px 40px 10px 12px; border: 1px solid #CBD5E1; border-radius: 7px; font-size: 13.5px; box-sizing: border-box;">
                            <button type="button" onclick="togglePasswordEye('loginPasswordInput', this)" title="Show / Hide Password" style="position: absolute; right: 10px; background: none; border: none; cursor: pointer; padding: 2px; display: flex; align-items: center;">
                                ${eyeSvg}
                            </button>
                        </div>
                        <div style="text-align: right; margin-top: 6px;">
                            <a href="forgotpassword.html" style="font-size: 12px; color: #2563EB; font-weight: 700; text-decoration: none;">Forgot Password?</a>
                        </div>
                    </div>

                    <button type="submit" id="loginSubmitBtn" style="background: #2563EB; color: #FFFFFF; border: none; padding: 11px; border-radius: 7px; font-weight: 700; font-size: 14px; cursor: pointer;">
                        Login
                    </button>
                </form>

                <div style="border-top: 1px solid #E2E8F0; padding-top: 12px; text-align: center;">
                    <button type="button" onclick="openCreateAccountView()" style="width: 100%; background: #F8FAFC; color: #0F172A; border: 1px solid #CBD5E1; padding: 10px; border-radius: 7px; font-weight: 700; font-size: 13.5px; cursor: pointer;">
                        Create Account
                    </button>
                </div>
            </div>

            <!-- 2. CREATE ACCOUNT VIEW -->
            <form id="sStudioRegisterForm" action="javascript:void(0);" method="post" autocomplete="on" onsubmit="handleUserRegisterSubmit(event)" style="padding: 20px; display: none; flex-direction: column; gap: 11px;">
                <div>
                    <label style="display: block; font-size: 12px; font-weight: 700; color: #334155; margin-bottom: 4px;">1. Full Name</label>
                    <input type="text" id="regNameInput" name="name" autocomplete="name" required placeholder="Enter your full name" style="width: 100%; padding: 9px 12px; border: 1px solid #CBD5E1; border-radius: 7px; font-size: 13.5px; box-sizing: border-box;">
                </div>

                <div>
                    <label style="display: block; font-size: 12px; font-weight: 700; color: #334155; margin-bottom: 4px;">2. Mobile Number</label>
                    <input type="tel" id="regMobileInput" name="tel" autocomplete="tel" required placeholder="Enter 10-digit mobile number" style="width: 100%; padding: 9px 12px; border: 1px solid #CBD5E1; border-radius: 7px; font-size: 13.5px; box-sizing: border-box;">
                </div>

                <div>
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                        <label style="font-size: 12px; font-weight: 700; color: #334155;">3. Email ID (OTP Verification)</label>
                        <span id="emailVerifiedBadge" style="display: none; background: #DCFCE7; color: #15803D; font-size: 11px; font-weight: 800; padding: 2px 8px; border-radius: 10px;">✓ Email Verified</span>
                    </div>
                    <div style="display: flex; gap: 8px;">
                        <input type="email" id="regEmailInput" name="username" autocomplete="username" required placeholder="Enter Email ID" oninput="resetEmailOtpState()" style="flex: 1; padding: 9px 12px; border: 1px solid #CBD5E1; border-radius: 7px; font-size: 13.5px; box-sizing: border-box;">
                        <button type="button" id="sendOtpBtn" onclick="sendEmailVerificationOtp()" style="background: #2563EB; color: #FFFFFF; border: none; padding: 0 14px; border-radius: 7px; font-size: 12px; font-weight: 700; cursor: pointer; white-space: nowrap;">
                            Send OTP
                        </button>
                    </div>
                </div>

                <div id="otpVerificationRow" style="display: none; background: #F8FAFC; border: 1px solid #CBD5E1; padding: 10px; border-radius: 8px;">
                    <label style="display: block; font-size: 11.5px; font-weight: 700; color: #1E293B; margin-bottom: 5px;">Enter 6-Digit Email OTP</label>
                    <div style="display: flex; gap: 8px;">
                        <input type="text" id="regOtpInput" maxlength="6" placeholder="123456" style="flex: 1; padding: 8px 12px; border: 1px solid #94A3B8; border-radius: 6px; font-size: 14px; font-weight: 700; letter-spacing: 3px; text-align: center; box-sizing: border-box;">
                        <button type="button" id="verifyOtpBtn" onclick="verifyEmailOtpCode()" style="background: #059669; color: #FFFFFF; border: none; padding: 0 16px; border-radius: 6px; font-size: 12px; font-weight: 700; cursor: pointer; white-space: nowrap;">
                            Verify OTP
                        </button>
                    </div>
                </div>

                <div>
                    <label style="display: block; font-size: 12px; font-weight: 700; color: #334155; margin-bottom: 4px;">4. Create Password (Saved in Google Browser Manager)</label>
                    <div style="position: relative; display: flex; align-items: center;">
                        <input type="password" id="regPasswordInput" name="new-password" autocomplete="new-password" required placeholder="Create password" style="width: 100%; padding: 9px 40px 9px 12px; border: 1px solid #CBD5E1; border-radius: 7px; font-size: 13.5px; box-sizing: border-box;">
                        <button type="button" onclick="togglePasswordEye('regPasswordInput', this)" title="Show / Hide Password" style="position: absolute; right: 10px; background: none; border: none; cursor: pointer; padding: 2px; display: flex; align-items: center;">
                            ${eyeSvg}
                        </button>
                    </div>
                </div>

                <button type="submit" id="registerSubmitBtn" style="background: #059669; color: #FFFFFF; border: none; padding: 11px; border-radius: 7px; font-weight: 700; font-size: 14px; cursor: pointer;">
                    Create Account &amp; Generate ID
                </button>

                <div style="text-align: center; padding-top: 4px;">
                    <button type="button" onclick="openLoginView()" style="background: none; border: none; color: #2563EB; font-size: 12.5px; font-weight: 700; cursor: pointer;">
                        ← Back to Login
                    </button>
                </div>
            </form>

        </div>
    </div>`;

    document.body.insertAdjacentHTML("beforeend", modalHTML);
}

window.openCreateAccountView = function () {
    hideAuthBanner();
    document.getElementById("sStudioLoginContainer").style.display = "none";
    document.getElementById("sStudioRegisterForm").style.display = "flex";
    document.getElementById("authModalHeading").innerText = "Create S Studio Account";
};

window.openLoginView = function () {
    hideAuthBanner();
    document.getElementById("sStudioRegisterForm").style.display = "none";
    document.getElementById("sStudioLoginContainer").style.display = "flex";
    document.getElementById("authModalHeading").innerText = "S Studio Creator Login";
};

window.closeRegisterIdLoginModal = function () {
    const modal = document.getElementById("registerIdLoginModal");
    if (modal) modal.style.display = "none";
    pendingExportCallback = null;
};

function showAuthBanner(msg, isError) {
    const banner = document.getElementById("authStatusBanner");
    if (!banner) return;
    banner.style.display = "block";
    banner.style.background = isError ? "#FEF2F2" : "#ECFDF5";
    banner.style.color = isError ? "#DC2626" : "#059669";
    banner.style.border = isError ? "1px solid #FCA5A5" : "1px solid #6EE7B7";
    banner.innerHTML = msg;
}

function hideAuthBanner() {
    const banner = document.getElementById("authStatusBanner");
    if (banner) banner.style.display = "none";
}

window.triggerGoogleSignInFlow = function () {
    if (!GOOGLE_OAUTH_CLIENT_ID || !window.google || !window.google.accounts) {
        showAuthBanner(
            "Enter your Email ID &amp; Password below and click <strong>Login</strong>—Google Browser will ask to save your password automatically.",
            false
        );
        return;
    }
    google.accounts.id.initialize({
        client_id: GOOGLE_OAUTH_CLIENT_ID,
        callback: async (response) => {
            try {
                const payload = JSON.parse(atob(response.credential.split(".")[1]));
                const res = await fetch(S_STUDIO_AUTH_API, {
                    method: "POST",
                    body: JSON.stringify({
                        action: "google_login",
                        email: payload.email,
                        name: payload.name || payload.email.split("@")[0]
                    })
                });
                const result = await res.json();
                if (result.status === "success" && result.user) {
                    createCreatorSession(result.user);
                    showAuthBanner(`Signed in as <strong>${result.user.name}</strong>!`, false);
                    setTimeout(() => {
                        const cb = pendingExportCallback;
                        closeRegisterIdLoginModal();
                        if (typeof cb === "function") cb();
                    }, 800);
                }
            } catch (e) {
                showAuthBanner("Google Sign-In failed.", true);
            }
        }
    });
    google.accounts.id.prompt();
};

window.resetEmailOtpState = function () {
    isSignupEmailVerified = false;
    document.getElementById("emailVerifiedBadge").style.display = "none";
    const sendBtn = document.getElementById("sendOtpBtn");
    sendBtn.style.display = "inline-block";
    sendBtn.disabled = false;
    sendBtn.innerText = "Send OTP";
};

window.sendEmailVerificationOtp = async function () {
    const email = (document.getElementById("regEmailInput")?.value || "").trim().toLowerCase();
    const sendBtn = document.getElementById("sendOtpBtn");
    if (!email || !email.includes("@")) {
        showAuthBanner("Please enter a valid Email ID first.", true);
        return;
    }
    sendBtn.disabled = true;
    sendBtn.innerText = "Sending...";
    hideAuthBanner();

    try {
        const res = await fetch(S_STUDIO_AUTH_API, {
            method: "POST",
            body: JSON.stringify({ action: "send_otp", email })
        });
        const result = await res.json();
        if (result.status === "success") {
            document.getElementById("otpVerificationRow").style.display = "block";
            sendBtn.innerText = "Resend OTP";
            sendBtn.disabled = false;
            showAuthBanner(result.message, false);
        } else {
            sendBtn.innerText = "Send OTP";
            sendBtn.disabled = false;
            showAuthBanner(result.message || "Unable to send OTP.", true);
        }
    } catch (err) {
        sendBtn.innerText = "Send OTP";
        sendBtn.disabled = false;
        showAuthBanner("Network error sending OTP.", true);
    }
};

window.verifyEmailOtpCode = async function () {
    const email = (document.getElementById("regEmailInput")?.value || "").trim().toLowerCase();
    const otp = (document.getElementById("regOtpInput")?.value || "").trim();
    const verifyBtn = document.getElementById("verifyOtpBtn");

    verifyBtn.disabled = true;
    verifyBtn.innerText = "Checking...";

    try {
        const res = await fetch(S_STUDIO_AUTH_API, {
            method: "POST",
            body: JSON.stringify({ action: "verify_otp", email, otp })
        });
        const result = await res.json();
        if (result.status === "success") {
            isSignupEmailVerified = true;
            const emailEl = document.getElementById("regEmailInput");
            emailEl.readOnly = true;
            emailEl.style.background = "#F1F5F9";
            document.getElementById("otpVerificationRow").style.display = "none";
            document.getElementById("sendOtpBtn").style.display = "none";
            document.getElementById("emailVerifiedBadge").style.display = "inline-block";
            showAuthBanner("✓ Email Verified! Now create your password & click Generate ID.", false);
        } else {
            verifyBtn.disabled = false;
            verifyBtn.innerText = "Verify OTP";
            showAuthBanner(result.message || "Incorrect OTP.", true);
        }
    } catch (err) {
        verifyBtn.disabled = false;
        verifyBtn.innerText = "Verify OTP";
        showAuthBanner("Network error.", true);
    }
};

window.handleUserRegisterSubmit = async function (e) {
    e.preventDefault();
    if (!isSignupEmailVerified) {
        showAuthBanner("Please verify your Email ID with OTP first!", true);
        return;
    }

    const btn = document.getElementById("registerSubmitBtn");
    const name = document.getElementById("regNameInput").value.trim();
    const mobile = document.getElementById("regMobileInput").value.trim();
    const email = document.getElementById("regEmailInput").value.trim().toLowerCase();
    const password = document.getElementById("regPasswordInput").value.trim();

    btn.disabled = true;
    btn.innerText = "Generating ID...";

    try {
        const res = await fetch(S_STUDIO_AUTH_API, {
            method: "POST",
            body: JSON.stringify({ action: "register", name, email, mobile })
        });
        const result = await res.json();

        if (result.status === "success" && result.user) {
            if (window.PasswordCredential && password) {
                try {
                    const cred = new PasswordCredential({ id: email, password: password, name: name });
                    navigator.credentials.store(cred);
                } catch (credErr) {}
            }

            createCreatorSession(result.user);
            showAuthBanner(`Account Created! Your Register ID is <strong>${result.user.registerId}</strong>`, false);

            setTimeout(() => {
                const cb = pendingExportCallback;
                closeRegisterIdLoginModal();
                if (typeof cb === "function") cb();
            }, 1300);
        } else {
            showAuthBanner(result.message || "Could not create account.", true);
        }
    } catch (err) {
        showAuthBanner("Network error.", true);
    } finally {
        btn.disabled = false;
        btn.innerText = "Create Account & Generate ID";
    }
};

window.handleUserLoginSubmit = async function (e) {
    e.preventDefault();
    const btn = document.getElementById("loginSubmitBtn");
    const userId = document.getElementById("loginUserIdInput").value.trim();
    const password = document.getElementById("loginPasswordInput").value.trim();

    btn.disabled = true;
    btn.innerText = "Logging in...";
    hideAuthBanner();

    try {
        const res = await fetch(S_STUDIO_AUTH_API, {
            method: "POST",
            body: JSON.stringify({ action: "login", userId })
        });
        const result = await res.json();

        if (result.status === "success" && result.user) {
            if (window.PasswordCredential && password) {
                try {
                    const cred = new PasswordCredential({
                        id: result.user.email || userId,
                        password: password,
                        name: result.user.name
                    });
                    navigator.credentials.store(cred);
                } catch (credErr) {}
            }

            createCreatorSession(result.user);
            showAuthBanner(`Welcome, <strong>${result.user.name}</strong> (${result.user.registerId})!`, false);

            setTimeout(() => {
                const cb = pendingExportCallback;
                closeRegisterIdLoginModal();
                if (typeof cb === "function") cb();
            }, 900);
        } else {
            showAuthBanner(result.message || "Register ID or Email not found! Please Create Account.", true);
        }
    } catch (err) {
        showAuthBanner("Network error connecting to server.", true);
    } finally {
        btn.disabled = false;
        btn.innerText = "Login";
    }
};

window.getLoggedInCreator = function () {
    return getValidCreatorSession();
};

window.requireLoginBeforeExport = function (exportActionCallback) {
    const user = getValidCreatorSession();
    if (user && user.registerId) {
        exportActionCallback();
    } else {
        pendingExportCallback = exportActionCallback;
        openRegisterIdLoginModal(true);
    }
};

function updateLoggedInHeaderUI() {
    const user = getValidCreatorSession();
    const label = document.getElementById("headerLoginLabel");
    if (label) {
        label.innerText = user ? `${user.name} (${user.registerId})` : "Register ID / Login";
    }
}

document.addEventListener("DOMContentLoaded", () => {
    ensureAuthModalInjected();
    ensureProfileModalInjected();
    updateLoggedInHeaderUI();

    const params = new URLSearchParams(window.location.search);
    const recoverId = params.get("recoverId");
    if (recoverId) {
        openRegisterIdLoginModal(false);
        const input = document.getElementById("loginUserIdInput");
        if (input) input.value = recoverId;
        showAuthBanner(`Register ID <strong>${recoverId}</strong> pre-filled! Enter password & click Login.`, false);
    }
});