// ==========================================================================
// S STUDIO - LANDING PAGE CONTROLLER (home.js)
// ==========================================================================

function toggleModal(modalId, show) {
    const modal = document.getElementById(modalId);
    if (modal) modal.style.display = show ? "flex" : "none";
}

function toggleNavDropdown(id) {
    const item = document.getElementById(id);
    if (!item) return;
    const subMenu = item.querySelector(".nav-sub-menu");
    const arrow = item.querySelector(".nav-arrow-icon");
    const isAlreadyOpen = subMenu.style.display === "block";

    closeAllNavDropdowns();

    if (!isAlreadyOpen) {
        subMenu.style.display = "block";
        if (arrow) arrow.style.transform = "rotate(180deg)";
    }
}

function closeAllNavDropdowns() {
    document.querySelectorAll(".nav-sub-menu").forEach(m => m.style.display = "none");
    document.querySelectorAll(".nav-arrow-icon").forEach(a => a.style.transform = "rotate(0deg)");
}

document.addEventListener("click", function(e) {
    if (!e.target.closest(".nav-dropdown-item")) {
        closeAllNavDropdowns();
    }
});

function scrollToTopHome() {
    window.scrollTo({ top: 0, behavior: "smooth" });
}

function scrollToSupportChannels() {
    const support = document.querySelector(".support-channels-card");
    if (support) support.scrollIntoView({ behavior: "smooth" });
}

// Login Modal Handlers
function openRegisterIdLoginModal() {
    const modal = document.getElementById("registerIdLoginModal");
    if (modal) modal.style.display = "flex";
}

function closeRegisterIdLoginModal() {
    const modal = document.getElementById("registerIdLoginModal");
    if (modal) modal.style.display = "none";
}

function handleUserLoginSubmit(e) {
    e.preventDefault();
    const idVal = document.getElementById("loginUserIdInput").value.trim();
    if (!idVal) return;
    localStorage.setItem("s_studio_register_id", idVal);
    const label = document.getElementById("headerLoginLabel");
    if (label) label.innerText = idVal;
    closeRegisterIdLoginModal();
}

// Legal Disclaimer Modal
function showFullPageModal(type) {
    const modal = document.getElementById("fullScreenLegalModal");
    const title = document.getElementById("fullScreenModalTitle");
    const body = document.getElementById("fullScreenModalContent");
    if (!modal) return;

    if (type === "disclaimer") {
        title.innerText = "Legal Disclaimer";
        body.innerHTML = "<p>All video and photo editing utilities on S Studio (svideoeditor.com) run locally in your browser. Users retain full ownership and responsibility for their media files.</p>";
    }
    modal.style.display = "flex";
}

function closeFullPageModal() {
    const modal = document.getElementById("fullScreenLegalModal");
    if (modal) modal.style.display = "none";
}

// Tech Trends Popup Modal
function openTechTrendsModal(type) {
    const modal = document.getElementById("techTrendsPopupModal");
    const titleEl = document.getElementById("techModalTitle");
    const bodyEl = document.getElementById("techModalBody");
    if (!modal) return;

    if (type === "trends") {
        titleEl.innerText = "Modern Tech Trends in Web Media";
        bodyEl.innerHTML = "<p><strong>Browser-Native Computing:</strong> WebAssembly, HTML5 Canvas, and WebGL bring desktop-level video and photo editing directly into standard web browsers with zero server uploads.</p>";
    } else if (type === "ai") {
        titleEl.innerText = "Next-Gen AI Workflows";
        bodyEl.innerHTML = "<p><strong>Smart Creator Automation:</strong> Instant Speech-to-Text subtitles, neural foreground subject isolation, and DSP audio noise filtering streamline content creation.</p>";
    } else if (type === "howTo") {
        titleEl.innerText = "How to Stay Updated in Tech?";
        bodyEl.innerHTML = "<p>Practice hands-on with modern web APIs, follow W3C web standards, and explore our <a href='blog.html' style='color:#111827; font-weight:bold;'>Tutorials & Blog</a>.</p>";
    }
    modal.style.display = "flex";
}

function closeTechTrendsModal() {
    const modal = document.getElementById("techTrendsPopupModal");
    if (modal) modal.style.display = "none";
}

// Check Saved Drafts Count on Load
document.addEventListener("DOMContentLoaded", async () => {
    const savedId = localStorage.getItem("s_studio_register_id");
    if (savedId) {
        const label = document.getElementById("headerLoginLabel");
        if (label) label.innerText = savedId;
    }

    if (typeof getAllSavedDrafts === "function") {
        const drafts = await getAllSavedDrafts();
        if (drafts && drafts.length > 0) {
            const badge = document.getElementById("draftsCountBadge");
            const resumeBtn = document.getElementById("resumeDraftQuickBtn");
            if (badge) {
                badge.innerText = drafts.length;
                badge.style.display = "inline-block";
            }
            if (resumeBtn) {
                resumeBtn.style.display = "inline-flex";
            }
        }
    }
});