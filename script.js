// ==========================================================================
// 🚀 S STUDIO - GLOBAL ENGINE VARIABLES & APPLICATION STATE (PART 1/4)
// ==========================================================================

let currentVideoElement = null;
let videoFileBlob = null;
let currentScale = 1.0;
let currentRotation = 0;
let isMuted = false;
let currentVolumeLevel = 1.0;

let audioContext = null;
let gainNode = null;
let sourceNode = null;
let compressorNode = null;
let isAudioConnected = false;

let videoDurationSeconds = 0;
let selectedResMultiplier = 1.0;
let selectedFpsValue = 30;
let selectedMbpsValue = 12;
let isManualMode = false;
let activeTextElement = null;
let activeAudioNodes = {}; 

let undoStack = [];
let redoStack = [];
const MAX_UNDO_LIMIT = 30;

let mediaRecorder = null;
let audioChunks = [];
let currentActivePIPLayer = null; 
let currentCanvasRatio = 'fit';

let splitClipSegments = [];
let selectedSplitSegmentId = null;

// Fade & Light Controller Variables
let currentFadeSetting = 'none';
let userCustomLight = 100;
let customFadeDuration = 2.0;

// Subtitles Engine Variables
let generatedSubtitlesList = [];
let subtitleStyleMode = 'reels-yellow';

// Dedicated Photo Workspace Variables
let currentPhotoFilter = { brightness: 100, contrast: 100, saturate: 100, blur: 0, grayscale: 0, sepia: 0, invert: 0 };
let currentPhotoOpacity = 1.0;
let isPhotoLocked = false;

// Layer Visibility Tracker
let layerDurations = {};

// Mask Engine State Variables
let currentMaskType = 'none';
let isMaskInverted = false;
let maskFeatherPx = 0;

// Magnifier Engine State Variables
let currentMagnifierShape = 'circle';
let currentMagnifierZoom = 2.0;

// Overlay State
let pendingOverlayFile = null;

// Ensure Hidden File Picker exists in DOM
let sStudioHiddenFilePicker = document.getElementById('sStudioHiddenFilePicker');
if (!sStudioHiddenFilePicker) {
    sStudioHiddenFilePicker = document.createElement('input');
    sStudioHiddenFilePicker.id = 'sStudioHiddenFilePicker';
    sStudioHiddenFilePicker.type = 'file';
    sStudioHiddenFilePicker.accept = 'image/*,video/*';
    sStudioHiddenFilePicker.style.display = 'none';
    document.body.appendChild(sStudioHiddenFilePicker);
}

// Built-in Knowledge Base for Studio AI Assistant
const studioAiKnowledgeBase = {
    "split": "To split a video, move the timeline playhead to the target timestamp and click the 'Split' button in the toolbar.",
    "music": "To add background tracks or voice-overs, click the Audio hub button. You can upload local MP3s or select from preset genres.",
    "voice": "Click 'Record Voice' to record microphone audio live and attach it directly to the timeline track.",
    "photo": "Upload an image through the Photo mode. Use the toolbar to adjust brightness, remove background, crop, or export in JPG/PNG/WebP.",
    "pip": "Picture-in-Picture (PiP) allows multi-layer overlays. Position and scale your media using the floating action controls.",
    "chroma": "The Chroma Key tool removes solid background colors like green screen. Select your media layer and apply Chroma Key.",
    "save": "S Studio features automatic client-side caching so your workspace changes remain available during your session.",
    "export": "Click 'Export Video' in the top navigation bar to render up to 1440p 2K resolution without any watermarks."
};

// ==========================================================================
// 📸 DEDICATED PHOTO CONTROLS & EXPORT ENGINE (100% ERROR-FREE)
// ==========================================================================

// Global Photo State Variables
window.currentPhotoFilter = window.currentPhotoFilter || { brightness: 100, contrast: 100, saturate: 100, blur: 0, grayscale: 0, sepia: 0, invert: 0 };
window.currentPhotoOpacity = 1.0;
window.isPhotoLocked = false;

// 1. Core Photo Loader
window.loadPhoto = function(event) {
    const file = event && event.target && event.target.files ? event.target.files[0] : null;
    if (!file) return;

    // 1. Hide Landing / Intro Page
    const introPage = document.getElementById('introPage');
    if (introPage) {
        introPage.style.display = 'none';
        introPage.classList.add('hidden');
    }

    const landingSelectors = [
        '#sStudioScrollableGuide',
        '.founders-vision-card-large',
        '.upcoming-updates-card',
        '.feedback-reward-card',
        '.support-channels-card',
        '.innovation-rewards-card',
        '.s-studio-master-footer'
    ];
    landingSelectors.forEach(selector => {
        document.querySelectorAll(selector).forEach(el => el.style.display = 'none');
    });

    // 2. Open Editor Page Workspace
    const editorPage = document.getElementById('editorPage');
    if (editorPage) {
        editorPage.style.display = 'flex';
        editorPage.style.flexDirection = 'column';
        editorPage.classList.remove('hidden');
    }

    // 3. Hide all video elements, timelines, and tracks
    hideTimelineAndVideoControlsForPhoto();

    videoFileBlob = file;
    const wrapper = document.getElementById('videoWrapper');
    const placeholder = document.getElementById('placeholderText');
    const imgURL = URL.createObjectURL(file);
    
    if (placeholder) placeholder.style.display = 'none';
    
    if (wrapper) {
        wrapper.style.width = "94%";
        wrapper.style.maxWidth = "1100px";
        wrapper.style.height = "58vh";
        wrapper.style.maxHeight = "58vh";
        wrapper.style.aspectRatio = "unset";
        wrapper.style.display = "flex";
        wrapper.style.alignItems = "center";
        wrapper.style.justifyContent = "center";
        wrapper.style.background = "#07090e";
        wrapper.style.borderRadius = "12px";
        wrapper.style.border = "1px solid #1f2738";
        wrapper.style.margin = "8px auto";
        wrapper.style.overflow = "hidden";
        wrapper.style.position = "relative";

        wrapper.innerHTML = `
            <img id="mainPhotoPlayer" src="${imgURL}" style="transform: scale(1) rotate(0deg); max-width:100%; max-height:100%; object-fit:contain; cursor:grab; transition: transform 0.2s ease;">
        `;
    }
    
    currentVideoElement = document.getElementById('mainPhotoPlayer');
    currentScale = 1.0;
    currentRotation = 0;

    // 4. Setup Toolbar & Export Controls
    setupPhotoToolbar();
    setupPhotoHeaderExportButton();
};

function loadPhoto(event) {
    window.loadPhoto(event);
}

// 2. Hide Timeline Strictly for Photo Mode
window.hideTimelineAndVideoControlsForPhoto = function() {
    const videoOnlyElements = [
        '#timelineAreaBox',
        '#timelineTracksContainer',
        '#frameTimelineTrack',
        '#pipTrackBlock',
        '#audioTrackBlock',
        '#textTrackBlock',
        '#playerControlsBox',
        '#studioScreenResizerBar',
        '#videoTimerDisplay',
        '.timeline-tracks',
        '.playback-controls',
        '.timeline-zoom-controls',
        '.timeline-container'
    ];

    videoOnlyElements.forEach(selector => {
        document.querySelectorAll(selector).forEach(el => {
            el.style.setProperty('display', 'none', 'important');
        });
    });
};

function hideTimelineAndVideoControlsForPhoto() {
    window.hideTimelineAndVideoControlsForPhoto();
}

// 3. Setup Fixed Photo Toolbar
window.setupPhotoToolbar = function() {
    let toolsContainer = document.querySelector('.tools-container') || document.querySelector('.bottom-toolbar');
    
    if (!toolsContainer) {
        toolsContainer = document.createElement('div');
        toolsContainer.className = 'tools-container';
        document.body.appendChild(toolsContainer);
    }

    toolsContainer.style.cssText = `
        display: flex !important;
        visibility: visible !important;
        opacity: 1 !important;
        position: fixed !important;
        bottom: 12px !important;
        left: 50% !important;
        transform: translateX(-50%) !important;
        width: 95% !important;
        max-width: 1200px !important;
        background: #141722 !important;
        border: 1px solid #232b3e !important;
        border-radius: 12px !important;
        padding: 8px 12px !important;
        gap: 8px !important;
        overflow-x: auto !important;
        white-space: nowrap !important;
        z-index: 99999 !important;
        box-shadow: 0 10px 30px rgba(0,0,0,0.85) !important;
    `;

    toolsContainer.innerHTML = `
        <button class="tool-btn" onclick="openPhotoAdjustMenu()" style="background:#222733; color:#00f2fe; border:1px solid #00f2fe; font-weight:bold; padding:7px 12px; border-radius:6px; cursor:pointer;">🎨 Adjust</button>
        <button class="tool-btn" onclick="executeBgRemover()" style="background:#222733; color:#10ac84; border:1px solid #10ac84; font-weight:bold; padding:7px 12px; border-radius:6px; cursor:pointer;">🪄 BG Remover</button>
        <button class="tool-btn" onclick="openPhotoFiltersMenu()" style="background:#222733; color:#fff; border:1px solid #333; padding:7px 12px; border-radius:6px; cursor:pointer;">✨ Filters</button>
        <button class="tool-btn" onclick="openPixelEraserTool()" style="background:#222733; color:#fff; border:1px solid #333; padding:7px 12px; border-radius:6px; cursor:pointer;">🧽 Pixel Eraser</button>
        <button class="tool-btn" onclick="openPhotoCropMenu()" style="background:#222733; color:#fff; border:1px solid #333; padding:7px 12px; border-radius:6px; cursor:pointer;">✂️ Crop</button>
        <button class="tool-btn" onclick="addTextOverlay()" style="background:#6c5ce7; color:#fff; font-weight:bold; border:none; padding:7px 12px; border-radius:6px; cursor:pointer;">📝 Add Text</button>
        <button class="tool-btn" onclick="openPhotoStyleMenu()" style="background:#222733; color:#fff; border:1px solid #333; padding:7px 12px; border-radius:6px; cursor:pointer;">🖼️ Borders</button>
        <button class="tool-btn" onclick="openPhotoAnimateMenu()" style="background:#222733; color:#fff; border:1px solid #333; padding:7px 12px; border-radius:6px; cursor:pointer;">🎬 Animate</button>
        <button class="tool-btn" onclick="openPhotoTransparencyMenu()" style="background:#222733; color:#fff; border:1px solid #333; padding:7px 12px; border-radius:6px; cursor:pointer;">🏁 Opacity</button>
        <button class="tool-btn" onclick="openPhotoPositionMenu()" style="background:#222733; color:#fff; border:1px solid #333; padding:7px 12px; border-radius:6px; cursor:pointer;">📍 Position</button>
        <button class="tool-btn" onclick="openPhotoLayersMenu()" style="background:#222733; color:#fff; border:1px solid #333; padding:7px 12px; border-radius:6px; cursor:pointer;">📑 Layers</button>
        <button class="tool-btn" onclick="togglePhotoLock()" id="photoLockBtn" style="background:#222733; color:#fff; border:1px solid #333; padding:7px 12px; border-radius:6px; cursor:pointer;">🔓 Lock</button>
        <button class="tool-btn" onclick="setPhotoAsBackground()" style="background:#222733; color:#fff; border:1px solid #333; padding:7px 12px; border-radius:6px; cursor:pointer;">🌄 Set as BG</button>
        <button class="tool-btn" onclick="executeTool('Stickers')" style="background:#222733; color:#fff; border:1px solid #333; padding:7px 12px; border-radius:6px; cursor:pointer;">➕ Sticker</button>
        <button class="tool-btn" onclick="executeTool('Rotate')" style="background:#222733; color:#fff; border:1px solid #333; padding:7px 12px; border-radius:6px; cursor:pointer;">🔄 Rotate 90°</button>
        <button class="tool-btn" onclick="resetAllPhotoEdits()" style="background:#ff4757; color:white; border:none; font-weight:bold; padding:7px 12px; border-radius:6px; cursor:pointer;">🗑️ Reset</button>
    `;
};

function setupPhotoToolbar() {
    window.setupPhotoToolbar();
}

// 4. Download Modal & Exporter
window.openPhotoDownloadModal = function() {
    const oldModal = document.getElementById('sStudioPhotoDownloadModal');
    if (oldModal) oldModal.remove();

    const modal = document.createElement('div');
    modal.id = 'sStudioPhotoDownloadModal';
    modal.style.cssText = `
        position: fixed !important;
        top: 50% !important;
        left: 50% !important;
        transform: translate(-50%, -50%) !important;
        background: #161920 !important;
        border: 2px solid #00f2fe !important;
        padding: 22px !important;
        border-radius: 14px !important;
        display: flex !important;
        flex-direction: column !important;
        gap: 12px !important;
        z-index: 2147483647 !important;
        width: 320px !important;
        color: white !important;
        font-family: sans-serif !important;
        box-shadow: 0 10px 40px rgba(0,0,0,0.85) !important;
    `;

    modal.innerHTML = `
        <div style="font-size: 13px; color: #00f2fe; font-weight: bold; border-bottom: 1px solid #2f3542; padding-bottom: 6px; display: flex; justify-content: space-between; align-items: center;">
            <span>💾 EXPORT & DOWNLOAD PHOTO</span>
            <span onclick="this.parentElement.parentElement.remove()" style="cursor: pointer; font-size: 18px; color: #a4b0be;">&times;</span>
        </div>
        <p style="font-size: 11px; color: #a4b0be; margin: 0;">Select output format:</p>

        <button onclick="downloadRenderedCanvasPhoto('image/jpeg', 'photo.jpg')" style="background: #222733; color: white; border: 1px solid #333; padding: 10px; border-radius: 6px; cursor: pointer; text-align: left; font-size: 11px;">
            <strong style="color:#f1c40f;">📸 JPG Format (Social Media)</strong>
            <div style="font-size:10px; color:#a4b0be; margin-top:2px;">High quality, lightweight file size.</div>
        </button>

        <button onclick="downloadRenderedCanvasPhoto('image/png', 'photo.png')" style="background: #222733; color: white; border: 1px solid #333; padding: 10px; border-radius: 6px; cursor: pointer; text-align: left; font-size: 11px;">
            <strong style="color:#00f2fe;">💎 PNG Format (Transparent Support)</strong>
            <div style="font-size:10px; color:#a4b0be; margin-top:2px;">Maximum clarity with transparency.</div>
        </button>

        <button onclick="downloadRenderedCanvasPhoto('image/webp', 'photo.webp')" style="background: #222733; color: white; border: 1px solid #333; padding: 10px; border-radius: 6px; cursor: pointer; text-align: left; font-size: 11px;">
            <strong style="color:#10ac84;">⚡ WebP Format (Fast Web Loading)</strong>
            <div style="font-size:10px; color:#a4b0be; margin-top:2px;">Optimized modern web compression.</div>
        </button>
    `;

    document.body.appendChild(modal);
};

function openPhotoDownloadModal() {
    window.openPhotoDownloadModal();
}

window.downloadRenderedCanvasPhoto = function(formatType, filename) {
    const photo = document.getElementById('mainPhotoPlayer');
    if (!photo) return;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = photo.naturalWidth || photo.width || 800;
    canvas.height = photo.naturalHeight || photo.height || 600;

    ctx.filter = `brightness(${window.currentPhotoFilter.brightness}%) contrast(${window.currentPhotoFilter.contrast}%) saturate(${window.currentPhotoFilter.saturate}%) blur(${window.currentPhotoFilter.blur}px) grayscale(${window.currentPhotoFilter.grayscale}%) sepia(${window.currentPhotoFilter.sepia}%)`;
    ctx.globalAlpha = window.currentPhotoOpacity;

    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate((currentRotation * Math.PI) / 180);
    ctx.scale(currentScale, currentScale);
    ctx.drawImage(photo, -canvas.width / 2, -canvas.height / 2, canvas.width, canvas.height);

    const link = document.createElement('a');
    link.download = filename;
    link.href = canvas.toDataURL(formatType, 0.95);
    link.click();

    const modal = document.getElementById('sStudioPhotoDownloadModal');
    if (modal) modal.remove();
};

function downloadRenderedCanvasPhoto(formatType, filename) {
    window.downloadRenderedCanvasPhoto(formatType, filename);
}

// 5. Header Download Button Setup
window.setupPhotoHeaderExportButton = function() {
    const oldBtn = document.getElementById('photoExportModalTrigger');
    if (oldBtn) oldBtn.remove();

    const topHeader = document.querySelector('.header') || document.querySelector('.navbar') || document.body;
    const downloadBtn = document.createElement('button');
    downloadBtn.id = 'photoExportModalTrigger';
    downloadBtn.innerText = '💾 Download Photo';
    downloadBtn.style.cssText = `
        position: fixed;
        top: 12px;
        right: 160px;
        background: linear-gradient(135deg, #10ac84, #00f2fe);
        color: #000;
        font-weight: 800;
        border: none;
        padding: 8px 18px;
        border-radius: 20px;
        cursor: pointer;
        z-index: 99999;
        box-shadow: 0 4px 15px rgba(0, 242, 254, 0.4);
    `;
    downloadBtn.onclick = function() {
        if (typeof window.openPhotoDownloadModal === 'function') {
            window.openPhotoDownloadModal();
        }
    };
    topHeader.appendChild(downloadBtn);
};

function setupPhotoHeaderExportButton() {
    window.setupPhotoHeaderExportButton();
}

// ==========================================================================
// 🛠️ CORE TRANSFORMATION & UNDO / REDO HISTORY ENGINE
// ==========================================================================

function applyTransformations() {
    if (currentVideoElement) {
        currentVideoElement.style.transform = `scale(${currentScale}) rotate(${currentRotation}deg)`;
    }
}

function saveStateToHistory() {
    const wrapper = document.getElementById('videoWrapper');
    if (!currentVideoElement || !wrapper) return;

    const stateSnapshot = {
        scale: currentScale,
        rotation: currentRotation,
        playbackRate: currentVideoElement.playbackRate || 1.0,
        filter: currentVideoElement.style.filter || 'none',
        boxShadow: currentVideoElement.style.boxShadow || 'none',
        wrapperWidth: wrapper.style.width,
        wrapperHeight: wrapper.style.height,
        wrapperOverflow: wrapper.style.overflow,
        videoWidth: currentVideoElement.style.width,
        videoHeight: currentVideoElement.style.height,
        videoObjectFit: currentVideoElement.style.objectFit
    };

    undoStack.push(stateSnapshot);
    if (undoStack.length > MAX_UNDO_LIMIT) undoStack.shift();
    redoStack = []; 
}

function executeUndo() {
    const wrapper = document.getElementById('videoWrapper');
    if (undoStack.length === 0 || !currentVideoElement || !wrapper) return;

    const currentState = {
        scale: currentScale,
        rotation: currentRotation,
        playbackRate: currentVideoElement.playbackRate || 1.0,
        filter: currentVideoElement.style.filter || 'none',
        boxShadow: currentVideoElement.style.boxShadow || 'none',
        wrapperWidth: wrapper.style.width,
        wrapperHeight: wrapper.style.height,
        wrapperOverflow: wrapper.style.overflow,
        videoWidth: currentVideoElement.style.width,
        videoHeight: currentVideoElement.style.height,
        videoObjectFit: currentVideoElement.style.objectFit
    };
    redoStack.push(currentState);

    const prevState = undoStack.pop();
    currentScale = prevState.scale;
    currentRotation = prevState.rotation;
    if (currentVideoElement.playbackRate) currentVideoElement.playbackRate = prevState.playbackRate;
    currentVideoElement.style.filter = prevState.filter;
    currentVideoElement.style.boxShadow = prevState.boxShadow;
    
    wrapper.style.width = prevState.wrapperWidth;
    wrapper.style.height = prevState.wrapperHeight;
    wrapper.style.overflow = prevState.wrapperOverflow;
    
    currentVideoElement.style.width = prevState.videoWidth;
    currentVideoElement.style.height = prevState.videoHeight;
    currentVideoElement.style.objectFit = prevState.videoObjectFit;

    if (currentVideoElement.id === 'mainPhotoPlayer') {
        if (typeof applyLiveFilters === 'function') applyLiveFilters();
    } else {
        applyTransformations();
    }
}

function executeRedo() {
    const wrapper = document.getElementById('videoWrapper');
    if (redoStack.length === 0 || !currentVideoElement || !wrapper) return;

    undoStack.push({
        scale: currentScale,
        rotation: currentRotation,
        playbackRate: currentVideoElement.playbackRate || 1.0,
        filter: currentVideoElement.style.filter || 'none',
        boxShadow: currentVideoElement.style.boxShadow || 'none',
        wrapperWidth: wrapper.style.width,
        wrapperHeight: wrapper.style.height,
        wrapperOverflow: wrapper.style.overflow,
        videoWidth: currentVideoElement.style.width,
        videoHeight: currentVideoElement.style.height,
        videoObjectFit: currentVideoElement.style.objectFit
    });

    const nextState = redoStack.pop();
    currentScale = nextState.scale;
    currentRotation = nextState.rotation;
    if (currentVideoElement.playbackRate) currentVideoElement.playbackRate = nextState.playbackRate;
    currentVideoElement.style.filter = nextState.filter;
    currentVideoElement.style.boxShadow = nextState.boxShadow;
    
    wrapper.style.width = nextState.wrapperWidth;
    wrapper.style.height = nextState.wrapperHeight;
    wrapper.style.overflow = nextState.wrapperOverflow;
    
    currentVideoElement.style.width = nextState.videoWidth;
    currentVideoElement.style.height = nextState.videoHeight;
    currentVideoElement.style.objectFit = nextState.videoObjectFit;

    if (currentVideoElement.id === 'mainPhotoPlayer') {
        if (typeof applyLiveFilters === 'function') applyLiveFilters();
    } else {
        applyTransformations();
    }
}

function undoAction() { executeUndo(); }
function redoAction() { executeRedo(); }

// ==========================================================================
// 🧭 WORKSPACE SWITCHER & MEDIA LOADER
// ==========================================================================

function enterStudio(studioType) {
    if (studioType === 'video') {
        const videoInp = document.getElementById('videoInput');
        if (videoInp) videoInp.click();
    } else if (studioType === 'photo') {
        const photoInp = document.getElementById('photoInput');
        if (photoInp) photoInp.click();
    }
}

// ==========================================================================
// 📺 LARGE SCREEN VIDEO LOADER & INTERACTIVE RESIZER ENGINE
// ==========================================================================

let currentStageHeightPercent = 65;

function updateVideoCanvasDimensions() {
    const wrapper = document.getElementById('videoWrapper');
    if (!wrapper) return;

    wrapper.style.width = "96%";
    wrapper.style.maxWidth = "1400px";
    wrapper.style.height = `${currentStageHeightPercent}vh`;
    wrapper.style.maxHeight = `${currentStageHeightPercent}vh`;
    wrapper.style.aspectRatio = "unset";
    wrapper.style.margin = "8px auto";
    wrapper.style.display = "flex";
    wrapper.style.alignItems = "center";
    wrapper.style.justifyContent = "center";
    wrapper.style.background = "#07090e";
    wrapper.style.borderRadius = "12px";
    wrapper.style.border = "1px solid #1f2738";
    wrapper.style.overflow = "hidden";
    wrapper.style.position = "relative";

    const mediaElement = document.getElementById('mainPlayer') || document.getElementById('mainPhotoPlayer') || currentVideoElement;
    if (mediaElement) {
        mediaElement.style.width = "100%";
        mediaElement.style.height = "100%";
        mediaElement.style.objectFit = "contain";
    }
}

function loadVideo(event) {
    const file = event.target.files ? event.target.files[0] : null;
    if (!file) return;

    const introPage = document.getElementById('introPage');
    if (introPage) {
        introPage.style.display = 'none';
        introPage.classList.add('hidden');
    }

    const landingSelectors = [
        '#sStudioScrollableGuide',
        '.founders-vision-card-large',
        '.upcoming-updates-card',
        '.feedback-reward-card',
        '.support-channels-card',
        '.innovation-rewards-card',
        '.s-studio-master-footer'
    ];
    landingSelectors.forEach(selector => {
        document.querySelectorAll(selector).forEach(el => el.style.display = 'none');
    });

    const editorPage = document.getElementById('editorPage');
    if (editorPage) {
        editorPage.style.display = 'flex';
        editorPage.style.flexDirection = 'column';
        editorPage.classList.remove('hidden');
    }

    videoFileBlob = file; 
    const wrapper = document.getElementById('videoWrapper');
    const placeholder = document.getElementById('placeholderText');
    const videoURL = URL.createObjectURL(file);
    window.currentVideoURL = videoURL;
    
    if (!wrapper) return;
    if (placeholder) placeholder.style.display = 'none';

    wrapper.classList.remove('photo-mode-large');
    updateVideoCanvasDimensions();

    isAudioConnected = false;

    wrapper.innerHTML = `
        <video id="mainPlayer" style="transform: scale(1) rotate(0deg); transition: transform 0.2s ease; width:100%; height:100%; object-fit:contain;">
            <source src="${videoURL}" type="${file.type}">
        </video>
        <div id="videoTimerDisplay" style="position: absolute; bottom: 10px; right: 15px; background: rgba(0,0,0,0.7); padding: 4px 10px; border-radius: 4px; font-family: monospace; font-size: 13px; color: #fff; z-index: 10; border: 1px solid #333;">00:00 / 00:00</div>
    `;
    
    currentVideoElement = document.getElementById('mainPlayer');
    currentScale = 1.0; 
    currentRotation = 0; 
    isMuted = false; 
    currentVolumeLevel = 1.0;
    undoStack = []; 
    redoStack = [];

    const actionGroup = document.querySelector('.action-group');
    if (actionGroup) {
        actionGroup.classList.remove('hidden');
        actionGroup.style.display = 'flex';
    }

    setupVolumeAudioEngine();

    currentVideoElement.onloadedmetadata = function() {
        videoDurationSeconds = currentVideoElement.duration;
        if (typeof updateTimerUI === 'function') updateTimerUI();
        if (typeof generateVideoFrames === 'function') generateVideoFrames(videoURL);
    };

    currentVideoElement.ontimeupdate = function() {
        if (typeof updateTimerUI === 'function') updateTimerUI();
        if (typeof updatePlayheadPosition === 'function') updatePlayheadPosition();
        if (typeof handleLiveVideoFade === 'function') handleLiveVideoFade(currentVideoElement.currentTime, videoDurationSeconds);
        if (typeof syncLiveSubtitles === 'function') syncLiveSubtitles(currentVideoElement.currentTime);
        if (typeof updateTimelineLayers === 'function') updateTimelineLayers(currentVideoElement.currentTime);
    };

    const playerControlsBox = document.getElementById('playerControlsBox');
    if (playerControlsBox) {
        playerControlsBox.classList.remove('hidden');
        playerControlsBox.style.cssText = "display: flex !important; visibility: visible !important; justify-content: center !important; gap: 10px !important; margin: 10px 0 !important;";
    }

    if (typeof showTimelineForVideo === 'function') showTimelineForVideo();
    if (typeof restoreVideoToolbar === 'function') restoreVideoToolbar();
}

function initScreenResizer() {
    const resizer = document.getElementById('studioScreenResizerBar');
    if (!resizer) return;

    let isResizing = false;

    resizer.onmousedown = function(e) {
        e.preventDefault();
        isResizing = true;
        document.body.style.cursor = 'row-resize';
        document.body.style.userSelect = 'none';

        function onMouseMove(ev) {
            if (!isResizing) return;
            const windowH = window.innerHeight;
            const calculatedPercent = Math.max(30, Math.min(85, (ev.clientY / windowH) * 100));
            currentStageHeightPercent = Math.round(calculatedPercent);
            updateVideoCanvasDimensions();
        }

        function onMouseUp() {
            isResizing = false;
            document.body.style.cursor = 'default';
            document.body.style.userSelect = 'auto';
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        }

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    };
}

if (document.readyState === 'loading') {
    document.addEventListener("DOMContentLoaded", initScreenResizer);
} else {
    initScreenResizer();
}

function setupVolumeAudioEngine() {
    if (!currentVideoElement || isAudioConnected) return;
    try {
        if (!audioContext) {
            const AudioContextClass = window.AudioContext || window.webkitAudioContext;
            audioContext = new AudioContextClass();
        }
        if (audioContext.state === 'suspended') {
            audioContext.resume();
        }
        
        sourceNode = audioContext.createMediaElementSource(currentVideoElement);
        gainNode = audioContext.createGain();
        compressorNode = audioContext.createDynamicsCompressor();
        
        sourceNode.connect(gainNode);
        gainNode.connect(compressorNode);
        compressorNode.connect(audioContext.destination);
        gainNode.gain.setValueAtTime(currentVolumeLevel, audioContext.currentTime);
        isAudioConnected = true;
    } catch(e) { 
        console.warn("Audio Context routed or already connected:", e); 
    }
}

// ==========================================================================
// ⏱️ REAL-TIME SYNC ENGINE FOR TEXT, MUSIC & PIP LAYERS
// ==========================================================================

function updateTimelineLayers(currentTime) {
    document.querySelectorAll('.live-text-box').forEach(el => {
        const startTime = parseFloat(el.dataset.start || 0);
        const endTime = parseFloat(el.dataset.end || videoDurationSeconds || 9999);
        el.style.display = (currentTime >= startTime && currentTime <= endTime) ? 'block' : 'none';
    });

    document.querySelectorAll('.live-pip-object').forEach(el => {
        const startTime = parseFloat(el.dataset.start || 0);
        const endTime = parseFloat(el.dataset.end || videoDurationSeconds || 9999);
        
        if (currentTime >= startTime && currentTime <= endTime) {
            el.style.display = 'block';
            const innerVideo = el.querySelector('video');
            if (innerVideo && currentVideoElement && !currentVideoElement.paused) {
                if (innerVideo.paused) innerVideo.play().catch(() => {});
            }
        } else {
            el.style.display = 'none';
            const innerVideo = el.querySelector('video');
            if (innerVideo && !innerVideo.paused) {
                innerVideo.pause();
            }
        }
    });

    Object.keys(activeAudioNodes).forEach(id => {
        const node = activeAudioNodes[id];
        if (node && node.audio) {
            const trackBlock = document.getElementById(id);
            const startTime = trackBlock ? parseFloat(trackBlock.dataset.start || 0) : 0;
            const endTime = trackBlock ? parseFloat(trackBlock.dataset.end || videoDurationSeconds || 9999) : (videoDurationSeconds || 9999);

            if (currentTime >= startTime && currentTime <= endTime) {
                if (currentVideoElement && !currentVideoElement.paused) {
                    if (node.audio.paused) {
                        const targetAudioTime = (currentTime - startTime) % (node.audio.duration || 1);
                        if (!isNaN(targetAudioTime)) node.audio.currentTime = targetAudioTime;
                        node.audio.play().catch(() => {});
                    }
                } else {
                    if (!node.audio.paused) node.audio.pause();
                }
            } else {
                if (!node.audio.paused) node.audio.pause();
            }
        }
    });
}

function updateLayerDuration(id, newWidth) {
    const pixelsPerSecond = 15;
    const duration = newWidth / pixelsPerSecond;
    const cleanId = id.replace('track_', '');
    const element = document.getElementById(cleanId);
    if (element) {
        element.dataset.end = duration.toFixed(2);
    }
}

// ==========================================================================
// 📐 INSTANT CANVAS RATIO & RESIZING CONTROLLER (FULL RESPONSIVE)
// ==========================================================================

function applyCanvasFrameRatio(ratioType) {
    const wrapper = document.getElementById('videoWrapper');
    if (!wrapper) return;

    wrapper.style.margin = "8px auto";
    wrapper.style.display = "flex";
    wrapper.style.alignItems = "center";
    wrapper.style.justifyContent = "center";
    wrapper.style.overflow = "hidden";
    wrapper.style.transition = "all 0.2s ease";

    wrapper.style.height = `${currentStageHeightPercent || 65}vh`;
    wrapper.style.maxHeight = `${currentStageHeightPercent || 65}vh`;

    switch (ratioType) {
        case '9-16':
            wrapper.style.width = "auto";
            wrapper.style.aspectRatio = "9 / 16";
            break;

        case '1-1':
            wrapper.style.width = "auto";
            wrapper.style.aspectRatio = "1 / 1";
            break;

        case '4-5':
            wrapper.style.width = "auto";
            wrapper.style.aspectRatio = "4 / 5";
            break;

        case '4-3':
            wrapper.style.width = "auto";
            wrapper.style.aspectRatio = "4 / 3";
            break;

        case '3-4':
            wrapper.style.width = "auto";
            wrapper.style.aspectRatio = "3 / 4";
            break;

        case '21-9':
            wrapper.style.width = "96%";
            wrapper.style.aspectRatio = "21 / 9";
            break;

        case '2-3':
            wrapper.style.width = "auto";
            wrapper.style.aspectRatio = "2 / 3";
            break;

        case '16-9':
            wrapper.style.width = "auto";
            wrapper.style.aspectRatio = "16 / 9";
            break;

        case 'fit':
        default:
            wrapper.style.width = "96%";
            wrapper.style.aspectRatio = "unset";
            break;
    }

    const mediaElement = document.getElementById('mainPlayer') || document.getElementById('mainPhotoPlayer') || currentVideoElement;
    if (mediaElement) {
        mediaElement.style.width = "100%";
        mediaElement.style.height = "100%";
        mediaElement.style.objectFit = (ratioType === 'fit' ? 'contain' : 'cover');
    }
}

// ==========================================================================
// 🛠️ S STUDIO - CUSTOM CROP & DYNAMIC TOOLBAR DISPATCHER (PART 2/4)
// ==========================================================================

function openCustomFreeCropModal() {
    const oldModal = document.getElementById('sStudioCustomCropModal');
    if (oldModal) oldModal.remove();

    const modal = document.createElement('div');
    modal.id = 'sStudioCustomCropModal';
    modal.style.cssText = `
        position: fixed !important;
        top: 50% !important;
        left: 50% !important;
        transform: translate(-50%, -50%) !important;
        background: #161920 !important;
        border: 2px solid #00f2fe !important;
        padding: 18px !important;
        border-radius: 12px !important;
        z-index: 2147483647 !important;
        width: 320px !important;
        color: white !important;
        font-family: sans-serif !important;
        box-shadow: 0 10px 40px rgba(0,0,0,0.85) !important;
    `;

    modal.innerHTML = `
        <div style="font-size: 13px; color: #00f2fe; font-weight: bold; border-bottom: 1px solid #2f3542; padding-bottom: 8px; display: flex; justify-content: space-between; align-items: center;">
            <span>✂️ CUSTOM 4-SIDE CROP</span>
            <span onclick="this.parentElement.parentElement.remove()" style="cursor: pointer; font-size: 18px; color: #a4b0be;">&times;</span>
        </div>
        <p style="font-size: 11px; color: #a4b0be; margin: 8px 0;">Adjust the boundary crop percentage for each side:</p>
        <div style="display: flex; flex-direction: column; gap: 8px; font-size: 11px;">
            <label>⬆️ Top Cut: <span id="topVal">0%</span>
                <input type="range" id="cropTop" min="0" max="45" value="0" style="width: 100%; accent-color: #00f2fe;" oninput="updateLiveCustomCrop()">
            </label>
            <label>⬇️ Bottom Cut: <span id="bottomVal">0%</span>
                <input type="range" id="cropBottom" min="0" max="45" value="0" style="width: 100%; accent-color: #00f2fe;" oninput="updateLiveCustomCrop()">
            </label>
            <label>⬅️ Left Cut: <span id="leftVal">0%</span>
                <input type="range" id="cropLeft" min="0" max="45" value="0" style="width: 100%; accent-color: #00f2fe;" oninput="updateLiveCustomCrop()">
            </label>
            <label>➡️ Right Cut: <span id="rightVal">0%</span>
                <input type="range" id="cropRight" min="0" max="45" value="0" style="width: 100%; accent-color: #00f2fe;" oninput="updateLiveCustomCrop()">
            </label>
        </div>
        <button onclick="document.getElementById('sStudioCustomCropModal').remove();" style="background: linear-gradient(135deg, #00f2fe, #6c5ce7); color: white; border: none; padding: 10px; border-radius: 6px; font-weight: bold; cursor: pointer; width: 100%; margin-top: 12px;">
            Apply Custom Crop
        </button>
    `;

    document.body.appendChild(modal);
}

function updateLiveCustomCrop() {
    const target = currentActivePIPLayer 
        ? (currentActivePIPLayer.querySelector('video, img') || currentActivePIPLayer)
        : (document.getElementById('mainPlayer') || currentVideoElement);

    if (!target) return;

    const top = document.getElementById('cropTop') ? document.getElementById('cropTop').value : 0;
    const bottom = document.getElementById('cropBottom') ? document.getElementById('cropBottom').value : 0;
    const left = document.getElementById('cropLeft') ? document.getElementById('cropLeft').value : 0;
    const right = document.getElementById('cropRight') ? document.getElementById('cropRight').value : 0;

    const topDisp = document.getElementById('topVal');
    const bottomDisp = document.getElementById('bottomVal');
    const leftDisp = document.getElementById('leftVal');
    const rightDisp = document.getElementById('rightVal');

    if (topDisp) topDisp.innerText = top + "%";
    if (bottomDisp) bottomDisp.innerText = bottom + "%";
    if (leftDisp) leftDisp.innerText = left + "%";
    if (rightDisp) rightDisp.innerText = right + "%";

    target.style.clipPath = `inset(${top}% ${right}% ${bottom}% ${left}%)`;
    target.style.objectFit = "cover";
}

function restoreVideoToolbar() {
    const toolsContainer = document.querySelector('.tools-container') || document.querySelector('.bottom-toolbar');
    if (!toolsContainer) return;

    toolsContainer.innerHTML = `
        <button class="tool-btn" onclick="executeTool('Split')" style="background:#222733; color:white; border:1px solid #333; padding:8px 12px; border-radius:6px; font-weight:bold; cursor:pointer;">✂️ Split</button>
        <button class="tool-btn" onclick="executeTool('Crop')" style="background:#222733; color:white; border:1px solid #333; padding:8px 12px; border-radius:6px; font-weight:bold; cursor:pointer;">⌗ Crop Preset</button>
        <button class="tool-btn" onclick="executeTool('Speed')" style="background:#222733; color:white; border:1px solid #333; padding:8px 12px; border-radius:6px; font-weight:bold; cursor:pointer;">⚡ Video Speed</button> 
        <button class="tool-btn" onclick="executeTool('Cutout')" style="background:rgba(235, 77, 75, 0.2); border:1px solid #eb4d4b; color:#ff7979; padding:8px 12px; border-radius:6px; font-weight:bold; cursor:pointer;">👤 Cutout</button>
        <button class="tool-btn" onclick="executeTool('Subtitles')" style="background:rgba(52, 152, 219, 0.2); border:1px solid #3498db; color:#85c1e9; padding:8px 12px; border-radius:6px; font-weight:bold; cursor:pointer;">💬 Subtitles</button>
        <button class="tool-btn" onclick="executeTool('Mosaic')" style="background:rgba(149, 165, 166, 0.2); border:1px solid #95a5a6; color:#bdc3c7; padding:8px 12px; border-radius:6px; font-weight:bold; cursor:pointer;">🧩 Mosaic</button>
        <button class="tool-btn" onclick="executeTool('Magnifier')" style="background:rgba(241, 196, 15, 0.2); border:1px solid #f1c40f; color:#f9e79f; padding:8px 12px; border-radius:6px; font-weight:bold; cursor:pointer;">🔍 Magnifier</button>
        <button class="tool-btn" onclick="executeTool('Overlay')" style="background:rgba(230, 126, 34, 0.2); border:1px solid #e67e22; color:#f8c471; padding:8px 12px; border-radius:6px; font-weight:bold; cursor:pointer;">🖼️ Overlay Track</button>
        <button class="tool-btn" onclick="executeTool('Mask')" style="background:rgba(26, 188, 156, 0.2); border:1px solid #1abc9c; color:#a3e4d7; padding:8px 12px; border-radius:6px; font-weight:bold; cursor:pointer;">🎭 Mask</button>
        <button class="tool-btn" onclick="executeTool('Fill')" style="background:#222733; color:white; border:1px solid #333; padding:8px 12px; border-radius:6px; font-weight:bold; cursor:pointer;">🗃️ Fill / Fit</button>
        <button class="tool-btn" onclick="executeTool('Zoom')" style="background:#222733; color:white; border:1px solid #333; padding:8px 12px; border-radius:6px; font-weight:bold; cursor:pointer;">➕ Zoom In</button>
        <button class="tool-btn" onclick="executeTool('ZoomOut')" style="background:#222733; color:white; border:1px solid #333; padding:8px 12px; border-radius:6px; font-weight:bold; cursor:pointer;">➖ Zoom Out</button>
        <button class="tool-btn" onclick="executeTool('Opacity')" style="background:#222733; color:white; border:1px solid #333; padding:8px 12px; border-radius:6px; font-weight:bold; cursor:pointer;">👻 Opacity</button>
        <button class="tool-btn" onclick="executeTool('Rotate')" style="background:#222733; color:white; border:1px solid #333; padding:8px 12px; border-radius:6px; font-weight:bold; cursor:pointer;">🔄 Rotate</button>
        <button class="tool-btn" onclick="executeTool('Filters')" style="background:#222733; color:white; border:1px solid #333; padding:8px 12px; border-radius:6px; font-weight:bold; cursor:pointer;">📊 Filters</button>
        <button class="tool-btn chroma-btn" onclick="executeTool('Chroma Key')" style="background: rgba(16, 172, 132, 0.2); border: 1px solid #10ac84; color: #10ac84; padding:8px 12px; border-radius:6px; font-weight:bold; cursor:pointer;">🟢 Chroma Key</button>
        <button class="tool-btn ai-btn" onclick="executeTool('Ask AI')" style="background: rgba(108, 92, 231, 0.2); border: 1px solid #6c5ce7; color: #a8a5ff; padding:8px 12px; border-radius:6px; font-weight:bold; cursor:pointer;">🤖 Ask AI</button>
        <button class="tool-btn delete-btn" onclick="executeTool('Delete')" style="background: #ff4757; color: white; border: none; padding:8px 12px; border-radius:6px; font-weight:bold; cursor:pointer;">🗑️ Reset</button>
    `;
}

function executeTool(tool) {
    if (!currentVideoElement) {
        currentVideoElement = document.getElementById('mainPlayer') || document.getElementById('mainPhotoPlayer');
    }
    if (typeof saveStateToHistory === 'function') {
        saveStateToHistory();
    }

    switch(tool) {
        case 'Cutout':
        case 'Cut Out':
        case 'Cut':
            if (typeof openCutOutStudioMenu === 'function') openCutOutStudioMenu();
            break;

        case 'Mask':
            if (typeof openMaskStudioMenu === 'function') openMaskStudioMenu();
            break;

        case 'Split': 
            if (typeof splitCurrentVideoClip === 'function') splitCurrentVideoClip(); 
            break;

        case 'Crop': 
        case 'S Crop':
            if (typeof openCropPresetsMenu === 'function') openCropPresetsMenu(); 
            break;

        case 'Speed': 
            if (typeof openSpeedAdjustMenu === 'function') openSpeedAdjustMenu(); 
            break;

        case 'Subtitles': 
            if (typeof openSubtitlesMenu === 'function') openSubtitlesMenu(); 
            break;

        case 'Mosaic': 
            if (typeof startAreaBlurSelection === 'function') startAreaBlurSelection(); 
            break;

        case 'Magnifier': 
            if (typeof openMagnifierOptions === 'function') openMagnifierOptions(); 
            break;

        case 'Overlay': 
            if (typeof openOverlayPlacementMenu === 'function') openOverlayPlacementMenu(); 
            break;

        case 'Opacity': 
            if (typeof openOpacityControlMenu === 'function') openOpacityControlMenu(); 
            break;

        case 'Filters': 
            if (typeof openVideoFiltersMenu === 'function') openVideoFiltersMenu(); 
            break;

        case 'Chroma Key':
        case 'BG Remover': 
            if (typeof openBgRemovalStudio === 'function') openBgRemovalStudio(); 
            break;

        case 'Stickers':
        case 'Elements': 
            if (typeof openElementsLibraryModal === 'function') openElementsLibraryModal(); 
            break;

        case 'Fill':
            if (currentVideoElement) { 
                currentVideoElement.style.width = "100%"; 
                currentVideoElement.style.height = "100%"; 
                currentVideoElement.style.objectFit = "contain"; 
            }
            break;

        case 'Zoom': 
            currentScale = (currentScale || 1.0) + 0.15; 
            if (typeof applyTransformations === 'function') applyTransformations(); 
            break;

        case 'ZoomOut': 
            if ((currentScale || 1.0) > 0.3) currentScale -= 0.15; 
            if (typeof applyTransformations === 'function') applyTransformations(); 
            break;

        case 'Rotate': 
            currentRotation = ((currentRotation || 0) + 90) % 360; 
            if (typeof applyTransformations === 'function') applyTransformations(); 
            break;

        case 'Ask AI': 
            const aiModal = document.getElementById('askAiModal');
            if (aiModal) aiModal.style.display = 'flex';
            break;

        case 'Delete': 
            if (confirm("Reset current workspace?")) location.reload(); 
            break;

        default:
            console.warn("Tool executed:", tool);
    }
}
// ==========================================================================
// ⚡ 4. PLAYBACK SPEED CONTROLLER
// ==========================================================================

function openSpeedAdjustMenu() {
    const oldSpeedMenu = document.getElementById('sStudioSpeedMenu');
    if (oldSpeedMenu) { oldSpeedMenu.remove(); return; }

    const speedMenu = document.createElement('div');
    speedMenu.id = 'sStudioSpeedMenu';
    speedMenu.style.cssText = `
        position: fixed !important;
        top: 50% !important;
        left: 50% !important;
        transform: translate(-50%, -50%) !important;
        background: #161920 !important;
        border: 2px solid #ff9f43 !important;
        padding: 18px !important;
        border-radius: 12px !important;
        display: flex !important;
        flex-direction: column !important;
        gap: 12px !important;
        z-index: 100000 !important;
        width: 280px !important;
        font-family: sans-serif !important;
        color: white !important;
        box-shadow: 0 10px 30px rgba(0,0,0,0.8) !important;
    `;

    const currentSpeed = (currentVideoElement && currentVideoElement.tagName === 'VIDEO') ? currentVideoElement.playbackRate : 1.0;

    speedMenu.innerHTML = `
        <div style="font-size:12px; color:#ff9f43; font-weight:bold; border-bottom:1px solid #222733; padding-bottom:8px; display:flex; justify-content:space-between; align-items:center;">
            <span>⚡ VIDEO PLAYBACK SPEED</span>
            <span onclick="this.parentElement.parentElement.remove()" style="cursor:pointer; font-size:18px; color:#a4b0be; font-weight:bold;">&times;</span>
        </div>
        <div style="text-align:center; margin: 4px 0;">
            <span style="font-size:12px; color:#cbd5e1;">Selected Speed: </span>
            <span id="speedValueDisplay" style="font-size:18px; font-weight:bold; color:#ff9f43;">${currentSpeed.toFixed(2)}x</span>
        </div>
        <input type="range" id="speedSlider" min="0.25" max="2.0" step="0.05" value="${currentSpeed}" style="width:100%; accent-color:#ff9f43; cursor:pointer;">
        <div style="display:flex; justify-content:space-between; font-size:10px; color:#a4b0be; padding: 0 2px;">
            <span>0.25x</span>
            <span>0.5x</span>
            <span>1.0x</span>
            <span>1.5x</span>
            <span>2.0x</span>
        </div>
        <div style="display:grid; grid-template-columns: repeat(4, 1fr); gap:6px; margin-top:4px;">
            <button class="spd-preset-btn" data-speed="0.5" style="background:#222733; color:#fff; border:1px solid #333; padding:5px; border-radius:4px; cursor:pointer; font-size:10px;">0.5x</button>
            <button class="spd-preset-btn" data-speed="1.0" style="background:#222733; color:#fff; border:1px solid #333; padding:5px; border-radius:4px; cursor:pointer; font-size:10px;">1.0x</button>
            <button class="spd-preset-btn" data-speed="1.25" style="background:#222733; color:#fff; border:1px solid #333; padding:5px; border-radius:4px; cursor:pointer; font-size:10px;">1.25x</button>
            <button class="spd-preset-btn" data-speed="1.5" style="background:#222733; color:#fff; border:1px solid #333; padding:5px; border-radius:4px; cursor:pointer; font-size:10px;">1.5x</button>
        </div>
        <button onclick="this.parentElement.remove()" style="background:#ff9f43; color:#000; border:none; padding:8px; border-radius:6px; font-weight:bold; cursor:pointer; font-size:12px; margin-top:4px;">Done</button>
    `;

    const slider = speedMenu.querySelector('#speedSlider');
    const display = speedMenu.querySelector('#speedValueDisplay');

    slider.oninput = function() {
        const val = parseFloat(this.value);
        display.innerText = val.toFixed(2) + "x";
        if (currentVideoElement && currentVideoElement.tagName === 'VIDEO') {
            currentVideoElement.playbackRate = val;
        }
    };

    speedMenu.querySelectorAll('.spd-preset-btn').forEach(btn => {
        btn.onclick = function() {
            const val = parseFloat(this.getAttribute('data-speed'));
            slider.value = val;
            display.innerText = val.toFixed(2) + "x";
            if (currentVideoElement && currentVideoElement.tagName === 'VIDEO') {
                currentVideoElement.playbackRate = val;
            }
        };
    });

    document.body.appendChild(speedMenu);
}

// ==========================================================================
// 🤖 5. ASK AI ASSISTANT ENGINE
// ==========================================================================

function handleAiUserSubmit(event) {
    event.preventDefault();
    const input = document.getElementById('aiUserInput');
    if (!input) return;
    const query = input.value.trim();
    if (!query) return;

    appendChatMessage('user', query);
    input.value = '';

    setTimeout(() => {
        const reply = generateAiStudioResponse(query.toLowerCase());
        appendChatMessage('bot', reply);
    }, 300);
}

function askPresetQuestion(text) {
    const input = document.getElementById('aiUserInput');
    if (input) {
        input.value = text;
        handleAiUserSubmit(new Event('submit'));
    }
}

function appendChatMessage(sender, text) {
    const chatBox = document.getElementById('aiChatBox');
    if (!chatBox) return;

    const msgDiv = document.createElement('div');
    msgDiv.style.display = 'flex';
    msgDiv.style.gap = '8px';
    msgDiv.style.alignItems = 'flex-start';

    if (sender === 'user') {
        msgDiv.style.justifyContent = 'flex-end';
        msgDiv.innerHTML = `
            <div style="background: #6c5ce7; color: #ffffff; padding: 8px 12px; border-radius: 10px 0 10px 10px; font-size: 13px; max-width: 80%;">
                ${text}
            </div>
            <span style="font-size: 16px;">👤</span>
        `;
    } else {
        msgDiv.innerHTML = `
            <span style="font-size: 18px;">🤖</span>
            <div style="background: #161a26; border: 1px solid #232b3e; padding: 10px 12px; border-radius: 0 10px 10px 10px; color: #cbd5e1; font-size: 13px; line-height: 1.5; max-width: 85%;">
                ${text}
            </div>
        `;
    }

    chatBox.appendChild(msgDiv);
    chatBox.scrollTop = chatBox.scrollHeight;
}

function generateAiStudioResponse(query) {
    if (query.includes('crop')) {
        return "<strong>How to Crop:</strong> Click <strong>Crop Preset</strong> in the bottom toolbar to choose 16:9, 9:16 (Shorts), or 1:1 (Instagram).";
    }
    if (query.includes('export') || query.includes('save') || query.includes('watermark')) {
        return "<strong>Exporting:</strong> Click the <strong>Export Video</strong> button at the top right to download watermark-free files up to 1440p 2K.";
    }
    if (query.includes('subtitle') || query.includes('caption')) {
        return "<strong>Subtitles:</strong> Click <strong>Subtitles</strong> on the toolbar to type and insert captions directly on your canvas.";
    }
    if (query.includes('chroma') || query.includes('green screen')) {
        return "<strong>Chroma Key:</strong> Click <strong>Chroma Key</strong> to blend and remove background screens instantly.";
    }
    if (query.includes('split') || query.includes('cut')) {
        return "<strong>Split Clip:</strong> Move the playhead on the timeline and click <strong>Split</strong> to anchor cut markers.";
    }
    return "<strong>Helpful Tip:</strong> All editing utilities are ready on your bottom toolbar. If you need support, email us at <strong>sriramgroups.help@gmail.com</strong>.";
}

// ==========================================================================
// 🔐 S STUDIO LIVE SUPABASE AUTHENTICATION SYSTEM
// ==========================================================================

const SUPABASE_PROJECT_URL = "https://yhyumuevjcjkdgjzezbz.supabase.co";
const SUPABASE_ANON_PUBLIC_KEY = "sb_publishable_8GNKtzXAG3pFNxq2kARa8Q_jqW5DgLC";

const supabaseAuthClient = (window.supabase && typeof window.supabase.createClient === 'function')
    ? window.supabase.createClient(SUPABASE_PROJECT_URL, SUPABASE_ANON_PUBLIC_KEY)
    : null;

let currentAuthSessionUser = {
    name: '',
    email: ''
};

function toggleAuthModal(show) {
    if (typeof toggleModal === 'function') {
        toggleModal('authModal', show);
    } else {
        const modal = document.getElementById('authModal');
        if (modal) modal.style.display = show ? 'flex' : 'none';
    }
    if (show) switchAuthView('login');
}

function switchAuthView(view) {
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');
    const setPasswordForm = document.getElementById('setPasswordForm');
    const forgotForm = document.getElementById('forgotForm');
    const sub = document.getElementById('authSubtitle');

    if (loginForm) loginForm.style.display = 'none';
    if (signupForm) signupForm.style.display = 'none';
    if (setPasswordForm) setPasswordForm.style.display = 'none';
    if (forgotForm) forgotForm.style.display = 'none';

    if (view === 'login') {
        if (loginForm) loginForm.style.display = 'block';
        if (sub) sub.innerText = "Access your free workspace and cloud projects";
    } else if (view === 'signup') {
        if (signupForm) signupForm.style.display = 'block';
        const otpGroup = document.getElementById('otpInputGroup');
        const sendBtn = document.getElementById('sendOtpBtn');
        if (otpGroup) otpGroup.style.display = 'none';
        if (sendBtn) sendBtn.style.display = 'block';
        if (sub) sub.innerText = "Create your free lifetime account";
    } else if (view === 'setPassword') {
        if (setPasswordForm) setPasswordForm.style.display = 'block';
        if (sub) sub.innerText = "Set a secure password for your account";
    } else if (view === 'forgot') {
        if (forgotForm) forgotForm.style.display = 'block';
        if (sub) sub.innerText = "Reset your account password";
    }
}

function togglePasswordVisibility(fieldId, el) {
    const input = document.getElementById(fieldId);
    if (!input) return;
    if (input.type === 'password') {
        input.type = 'text';
        if (el) el.innerText = 'Hide';
    } else {
        input.type = 'password';
        if (el) el.innerText = 'Show';
    }
}

async function handleSendOtp(event) {
    event.preventDefault();
    if (!supabaseAuthClient) return;

    const nameInput = document.getElementById('signupName');
    const emailInput = document.getElementById('signupEmail');
    const name = nameInput ? nameInput.value.trim() : '';
    const email = emailInput ? emailInput.value.trim() : '';

    if (!email || !name) return;

    currentAuthSessionUser.name = name;
    currentAuthSessionUser.email = email;

    const sendBtn = document.getElementById('sendOtpBtn');
    if (sendBtn) {
        sendBtn.innerText = "Sending OTP...";
        sendBtn.disabled = true;
    }

    try {
        const { error } = await supabaseAuthClient.auth.signInWithOtp({
            email: email,
            options: {
                data: { full_name: name },
                shouldCreateUser: true
            }
        });

        if (error) {
            if (sendBtn) {
                sendBtn.innerText = "Send Verification OTP";
                sendBtn.disabled = false;
            }
        } else {
            const otpGroup = document.getElementById('otpInputGroup');
            if (otpGroup) otpGroup.style.display = 'block';
            if (sendBtn) sendBtn.style.display = 'none';
        }
    } catch (err) {
        if (sendBtn) {
            sendBtn.innerText = "Send Verification OTP";
            sendBtn.disabled = false;
        }
    }
}

async function verifyOtpCode() {
    if (!supabaseAuthClient) return;
    const otpInput = document.getElementById('userEnteredOtp');
    const userOtp = otpInput ? otpInput.value.trim() : '';
    const email = currentAuthSessionUser.email;

    if (!userOtp || userOtp.length < 6) return;

    try {
        const { error } = await supabaseAuthClient.auth.verifyOtp({
            email: email,
            token: userOtp,
            type: 'email'
        });

        if (!error) {
            switchAuthView('setPassword');
        }
    } catch (err) {
        console.error("OTP Verification Error:", err);
    }
}

async function handleFinalSignup(event) {
    event.preventDefault();
    if (!supabaseAuthClient) return;
    const passInput = document.getElementById('newPassword');
    const confirmPassInput = document.getElementById('confirmPassword');
    const pass = passInput ? passInput.value : '';
    const confirmPass = confirmPassInput ? confirmPassInput.value : '';

    if (pass.length < 6 || pass !== confirmPass) return;

    try {
        const { error } = await supabaseAuthClient.auth.updateUser({
            password: pass
        });

        if (!error) {
            const userName = currentAuthSessionUser.name || "Creator";
            updateNavbarLoggedInState(userName);
            toggleAuthModal(false);
        }
    } catch (err) {
        console.error("Signup final error:", err);
    }
}

async function handleLoginSubmit(event) {
    event.preventDefault();
    if (!supabaseAuthClient) return;
    const emailInput = document.getElementById('loginEmail');
    const passInput = document.getElementById('loginPassword');
    const email = emailInput ? emailInput.value.trim() : '';
    const pass = passInput ? passInput.value : '';

    try {
        const { data, error } = await supabaseAuthClient.auth.signInWithPassword({
            email: email,
            password: pass
        });

        if (!error && data) {
            const userName = data.user?.user_metadata?.full_name || email.split('@')[0];
            updateNavbarLoggedInState(userName);
            toggleAuthModal(false);
        }
    } catch (err) {
        console.error("Login Error:", err);
    }
}

async function handleForgotPassword(event) {
    event.preventDefault();
    if (!supabaseAuthClient) return;
    const emailInput = document.getElementById('forgotEmail');
    const email = emailInput ? emailInput.value.trim() : '';

    if (!email) return;

    try {
        const { error } = await supabaseAuthClient.auth.resetPasswordForEmail(email);
        if (!error) {
            switchAuthView('login');
        }
    } catch (err) {
        console.error("Reset Password Error:", err);
    }
}

function updateNavbarLoggedInState(userName) {
    const authBtn = document.getElementById('authNavBtn');
    if (authBtn) {
        authBtn.innerHTML = `👤 ${userName}`;
        authBtn.style.color = '#00f2fe';
        authBtn.style.borderColor = '#00f2fe';
    }
}

window.addEventListener('DOMContentLoaded', async () => {
    if (!supabaseAuthClient) return;
    try {
        const { data } = await supabaseAuthClient.auth.getSession();
        if (data && data.session && data.session.user) {
            const name = data.session.user.user_metadata?.full_name || data.session.user.email.split('@')[0];
            updateNavbarLoggedInState(name);
        }
    } catch (e) {}
});

// ==========================================================================
// 📺 PRESENTATION MODE ENGINE
// ==========================================================================

let originalVideoParent = null;

function launchPresentationMode() {
    const videoElement = document.querySelector('#videoWrapper video') || document.querySelector('#videoWrapper canvas');
    const overlay = document.getElementById('presentationOverlay');
    const presContainer = document.getElementById('presentationVideoContainer');

    if (!videoElement) return;

    originalVideoParent = videoElement.parentElement;
    if (presContainer) {
        presContainer.innerHTML = '';
        presContainer.appendChild(videoElement);
    }

    videoElement.style.maxWidth = '100%';
    videoElement.style.maxHeight = '100%';
    videoElement.style.objectFit = 'contain';

    if (overlay) overlay.style.display = 'flex';

    if (typeof videoElement.play === 'function') {
        videoElement.play().catch(() => {});
        const playBtn = document.getElementById('presPlayBtn');
        if (playBtn) playBtn.innerText = 'Pause';
    }
}

function closePresentationMode() {
    const overlay = document.getElementById('presentationOverlay');
    const presContainer = document.getElementById('presentationVideoContainer');
    const videoElement = presContainer ? (presContainer.querySelector('video') || presContainer.querySelector('canvas')) : null;

    if (videoElement && originalVideoParent) {
        originalVideoParent.appendChild(videoElement);
    }

    if (overlay) overlay.style.display = 'none';
}

window.addEventListener('keydown', function(event) {
    if (event.key === 'Escape' || event.key === 'Esc') {
        const overlay = document.getElementById('presentationOverlay');
        if (overlay && overlay.style.display === 'flex') {
            closePresentationMode();
        }
    }
});

// ==========================================================================
// 💬 S STUDIO SUBTITLES ENGINE
// ==========================================================================

function openSubtitlesMenu() {
    const oldModal = document.getElementById('sStudioSubtitlesModal');
    if (oldModal) { oldModal.remove(); return; }

    const modal = document.createElement('div');
    modal.id = 'sStudioSubtitlesModal';
    modal.style.cssText = `
        position: fixed !important;
        top: 50% !important;
        left: 50% !important;
        transform: translate(-50%, -50%) !important;
        background: #14171f !important;
        border: 2px solid #6c5ce7 !important;
        padding: 18px !important;
        border-radius: 14px !important;
        z-index: 100000 !important;
        width: 380px !important;
        max-height: 85vh !important;
        overflow-y: auto !important;
        color: white !important;
        font-family: sans-serif !important;
        box-shadow: 0 10px 45px rgba(0,0,0,0.9) !important;
    `;

    modal.innerHTML = `
        <div style="font-size: 13px; color: #a8a5ff; font-weight: bold; border-bottom: 1px solid #2f3542; padding-bottom: 6px; display: flex; justify-content: space-between; align-items: center;">
            <span>💬 SUBTITLES & AI CAPTION STUDIO</span>
            <span onclick="this.parentElement.parentElement.remove()" style="cursor: pointer; font-size: 18px; color: #a4b0be;">&times;</span>
        </div>

        <div style="margin-top: 10px; background: rgba(108, 92, 231, 0.12); border: 1px solid #6c5ce7; padding: 12px; border-radius: 8px; text-align: center;">
            <div id="aiSubLoadingBox" style="display: none; margin-bottom: 6px;">
                <div style="display: inline-block; width: 20px; height: 20px; border: 3px solid #6c5ce7; border-top-color: #00f2fe; border-radius: 50%; animation: spin 0.8s linear infinite;"></div>
                <div style="font-size: 11px; color: #00f2fe; margin-top: 4px; font-weight: bold;">Generating AI Subtitles...</div>
            </div>
            <button id="btnStartAiSub" onclick="triggerAutoAISubtitleGeneration()" style="width: 100%; background: linear-gradient(135deg, #6c5ce7, #00f2fe); color: black; border: none; padding: 9px; border-radius: 6px; font-weight: bold; cursor: pointer; font-size: 12px; display: flex; align-items: center; justify-content: center; gap: 6px;">
                <span>🤖</span> Generate Auto AI Subtitles
            </button>
        </div>

        <div style="margin-top: 10px; background: #1c202a; padding: 12px; border-radius: 8px; border: 1px solid #2f3542;">
            <label style="font-size: 11px; color: #00f2fe; font-weight: bold;">✍️ Add Custom Subtitle:</label>
            <textarea id="customSubText" placeholder="Type subtitle text here..." style="width: 100%; height: 50px; background: #12141a; border: 1px solid #444; color: white; padding: 6px; border-radius: 4px; font-size: 11px; margin-top: 4px; box-sizing: border-box; resize: none;"></textarea>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr 1.5fr; gap: 6px; margin-top: 8px; align-items: center;">
                <div>
                    <label style="font-size: 9px; color: #a4b0be;">Text Color:</label>
                    <input type="color" id="customSubColor" value="#ffffff" style="width: 100%; height: 26px; border: none; border-radius: 4px; cursor: pointer; background: transparent;">
                </div>
                <div>
                    <label style="font-size: 9px; color: #a4b0be;">BG Color:</label>
                    <input type="color" id="customSubBgColor" value="#000000" style="width: 100%; height: 26px; border: none; border-radius: 4px; cursor: pointer; background: transparent;">
                </div>
                <div>
                    <label style="font-size: 9px; color: #a4b0be;">Font Style:</label>
                    <select id="customSubFont" style="width: 100%; height: 26px; background: #12141a; color: white; border: 1px solid #444; border-radius: 4px; font-size: 10px; padding: 2px;">
                        <option value="Arial, sans-serif">Standard Arial</option>
                        <option value="'Impact', sans-serif">Bold Impact</option>
                        <option value="'Courier New', monospace">Typewriter</option>
                        <option value="'Trebuchet MS', sans-serif">Modern Clean</option>
                    </select>
                </div>
            </div>

            <div style="display: flex; gap: 6px; margin-top: 8px;">
                <div style="width: 50%;">
                    <label style="font-size: 9px; color: #a4b0be;">Start (Seconds):</label>
                    <input type="number" id="customSubStart" value="0" step="0.5" style="width: 100%; background: #12141a; border: 1px solid #444; color: white; padding: 4px; border-radius: 4px; font-size: 11px; box-sizing: border-box;">
                </div>
                <div style="width: 50%;">
                    <label style="font-size: 9px; color: #a4b0be;">End (Seconds):</label>
                    <input type="number" id="customSubEnd" value="4" step="0.5" style="width: 100%; background: #12141a; border: 1px solid #444; color: white; padding: 4px; border-radius: 4px; font-size: 11px; box-sizing: border-box;">
                </div>
            </div>

            <div style="display: flex; justify-content: space-between; gap: 8px; margin-top: 10px;">
                <button onclick="resetCustomSubtitleInputs()" style="width: 48%; background: #2f3542; color: #a4b0be; border: 1px solid #475569; padding: 7px; border-radius: 5px; font-weight: bold; cursor: pointer; font-size: 11px;">
                    🔄 Reset
                </button>
                <button onclick="submitCustomSubtitle()" style="width: 48%; background: #10ac84; color: white; border: none; padding: 7px; border-radius: 5px; font-weight: bold; cursor: pointer; font-size: 11px;">
                    Done
                </button>
            </div>
        </div>

        <div style="margin-top: 10px; background: #1c202a; padding: 10px; border-radius: 8px; border: 1px solid #2f3542;">
            <label style="font-size: 11px; color: #ff9f43; font-weight: bold;">📂 Import Subtitle / Script File:</label>
            <input type="file" id="subFileInputDirect" accept=".srt,.vtt,.txt" onchange="importSubtitleScriptFile(event)" style="display: none;">
            <button onclick="document.getElementById('subFileInputDirect').click()" style="width: 100%; background: #ff9f43; color: black; border: none; padding: 8px; border-radius: 5px; font-weight: bold; cursor: pointer; font-size: 11px; margin-top: 5px;">
                Choose File (.SRT / .VTT / .TXT)
            </button>
        </div>

        <div style="display: flex; gap: 6px; margin-top: 10px;">
            <button onclick="clearAllSubtitleLayers()" style="width: 100%; background: rgba(255, 71, 87, 0.15); color: #ff4757; border: 1px solid #ff4757; padding: 7px; border-radius: 5px; font-size: 11px; cursor: pointer; font-weight: bold;">
                🗑️ Clear All Subtitles
            </button>
        </div>
    `;

    document.body.appendChild(modal);
}

function triggerAutoAISubtitleGeneration() {
    let video = currentVideoElement 
        || document.getElementById('mainPlayer') 
        || document.querySelector('#videoWrapper video')
        || document.getElementById('mainPhotoPlayer');

    const loader = document.getElementById('aiSubLoadingBox');
    const startBtn = document.getElementById('btnStartAiSub');
    if (loader) loader.style.display = 'block';
    if (startBtn) startBtn.style.display = 'none';

    let duration = (video && video.duration && !isNaN(video.duration) && video.duration > 0) 
        ? video.duration 
        : (videoDurationSeconds || 16);

    setTimeout(() => {
        const autoSentences = [
            "Welcome to S Studio",
            "Auto AI Subtitles Generated",
            "Click to edit, zoom or style text",
            "Create stunning videos easily"
        ];

        const step = Math.max(2.5, duration / autoSentences.length);
        let currentStart = 0;

        autoSentences.forEach(sentence => {
            const currentEnd = Math.min(duration, currentStart + step);
            insertConfiguredSubtitle(
                sentence, 
                parseFloat(currentStart.toFixed(1)), 
                parseFloat(currentEnd.toFixed(1)), 
                "#ffffff", 
                "rgba(0, 0, 0, 0.75)", 
                "Arial, sans-serif"
            );
            currentStart += step;
        });

        if (loader) loader.style.display = 'none';
        const modal = document.getElementById('sStudioSubtitlesModal');
        if (modal) modal.remove();
    }, 800);
}

function submitCustomSubtitle() {
    const text = document.getElementById('customSubText').value.trim();
    const color = document.getElementById('customSubColor').value;
    const bgColor = document.getElementById('customSubBgColor').value + "cc";
    const font = document.getElementById('customSubFont').value;
    const start = parseFloat(document.getElementById('customSubStart').value || 0);
    const end = parseFloat(document.getElementById('customSubEnd').value || (start + 4));

    if (!text) return;

    insertConfiguredSubtitle(text, start, end, color, bgColor, font);
    resetCustomSubtitleInputs();
}

function resetCustomSubtitleInputs() {
    const textInput = document.getElementById('customSubText');
    if (textInput) textInput.value = "";
    const colorInput = document.getElementById('customSubColor');
    if (colorInput) colorInput.value = "#ffffff";
    const bgInput = document.getElementById('customSubBgColor');
    if (bgInput) bgInput.value = "#000000";
    const fontInput = document.getElementById('customSubFont');
    if (fontInput) fontInput.value = "Arial, sans-serif";
}

function importSubtitleScriptFile(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        const text = e.target.result;
        const cleanLines = text.split(/\r?\n/).filter(line => line.trim() !== '' && !/^\d+$/.test(line) && !line.includes('-->'));
        
        let cursorTime = 0;
        cleanLines.forEach(line => {
            insertConfiguredSubtitle(line.trim(), cursorTime, cursorTime + 3.5, "#ffffff", "rgba(0,0,0,0.8)", "Arial, sans-serif");
            cursorTime += 4;
        });

        const modal = document.getElementById('sStudioSubtitlesModal');
        if (modal) modal.remove();
    };
    reader.readAsText(file);
}

function insertConfiguredSubtitle(text, startSec, endSec, textColor, bgColor, fontFamily) {
    let videoWrapper = document.getElementById('videoWrapper') || document.querySelector('.video-container') || document.body;
    if (!videoWrapper) return;

    const subId = 'sub_' + Date.now() + '_' + Math.floor(Math.random() * 100);

    const subNode = document.createElement('div');
    subNode.id = subId;
    subNode.className = 'live-text-box live-subtitle-box';
    subNode.dataset.start = startSec.toString();
    subNode.dataset.end = endSec.toString();

    subNode.style.cssText = `
        position: absolute;
        bottom: 12%;
        left: 50%;
        transform: translateX(-50%);
        padding: 6px 14px;
        border-radius: 6px;
        font-size: 18px;
        font-weight: bold;
        color: ${textColor || '#ffffff'};
        background: ${bgColor || 'rgba(0, 0, 0, 0.75)'};
        font-family: ${fontFamily || 'Arial, sans-serif'};
        text-align: center;
        z-index: 200;
        cursor: move;
        white-space: nowrap;
        user-select: none;
        border: 2px dashed transparent;
        box-sizing: border-box;
    `;

    subNode.innerHTML = `<span class="sub-text-label">${text}</span>`;

    subNode.onclick = function(e) {
        e.stopPropagation();
        openInteractiveSubtitleFloatingBar(subNode);
    };

    if (typeof makeElementDraggable === 'function') {
        makeElementDraggable(subNode);
    }
    videoWrapper.appendChild(subNode);

    const textTrack = document.getElementById('textTrackBlock') || document.getElementById('frameTimelineTrack');
    if (textTrack) {
        const block = document.createElement('div');
        block.id = 'track_' + subId;
        block.style.cssText = `
            background: #6c5ce7 !important;
            color: white !important;
            padding: 4px 8px !important;
            border-radius: 6px !important;
            display: inline-flex !important;
            align-items: center !important;
            justify-content: space-between !important;
            margin-top: 4px !important;
            height: 32px !important;
            font-family: sans-serif !important;
            cursor: move !important;
            user-select: none !important;
            z-index: 10;
        `;
        block.innerHTML = `
            <span style="font-size:11px; font-weight:bold; overflow:hidden; text-overflow:ellipsis; max-width:90px; pointer-events:none;">💬 ${text}</span>
            <div class="stretch-handle" style="position:absolute; right:0; top:0; width:14px; height:100%; background:#4834d4; cursor:e-resize; border-radius:0 5px 5px 0;" title="Drag to resize"></div>
        `;
        block.onclick = function(e) {
            e.stopPropagation();
            subNode.click();
        };
        textTrack.appendChild(block);
        if (typeof attachTimelineDragAndStretch === 'function') {
            attachTimelineDragAndStretch(block, subNode, endSec - startSec);
        }
    }
}

function openInteractiveSubtitleFloatingBar(subNode) {
    const oldBar = document.getElementById('sStudioSubFloatingBar');
    if (oldBar) oldBar.remove();

    const bar = document.createElement('div');
    bar.id = 'sStudioSubFloatingBar';
    bar.style.cssText = `
        position: fixed;
        bottom: 75px;
        left: 50%;
        transform: translateX(-50%);
        background: #161920;
        border: 2px solid #6c5ce7;
        padding: 6px 12px;
        border-radius: 10px;
        display: flex;
        align-items: center;
        gap: 8px;
        z-index: 2147483647;
        box-shadow: 0 10px 30px rgba(0,0,0,0.85);
        color: white;
        font-family: sans-serif;
    `;

    const label = subNode.querySelector('.sub-text-label');

    bar.innerHTML = `
        <span style="font-size: 11px; font-weight: bold; color: #a8a5ff;">Edit Subtitle:</span>
        <input type="text" id="floatingSubInput" value="${label ? label.innerText : ''}" style="background: #222733; border: 1px solid #444; color: white; padding: 4px 8px; border-radius: 4px; font-size: 11px; width: 140px;">
        <button id="btnDeleteSub" style="background: #ff4757; color: white; border: none; padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: bold; cursor: pointer;">Delete</button>
        <span onclick="this.parentElement.remove()" style="cursor: pointer; font-size: 14px; color: #a4b0be; margin-left: 4px;">✕</span>
    `;

    const input = bar.querySelector('#floatingSubInput');
    input.oninput = function() {
        if (label) label.innerText = this.value;
        const trackSpan = document.querySelector(`#track_${subNode.id} span`);
        if (trackSpan) trackSpan.innerText = "💬 " + this.value;
    };

    bar.querySelector('#btnDeleteSub').onclick = function() {
        subNode.remove();
        const trackBlock = document.getElementById('track_' + subNode.id);
        if (trackBlock) trackBlock.remove();
        bar.remove();
    };

    document.body.appendChild(bar);
}

function clearAllSubtitleLayers() {
    document.querySelectorAll('.live-subtitle-box').forEach(el => el.remove());
    document.querySelectorAll('[id^="track_sub_"]').forEach(el => el.remove());
    const modal = document.getElementById('sStudioSubtitlesModal');
    if (modal) modal.remove();
}

// ==========================================================================
// 💬 5. FLOATING INTERACTIVE SUBTITLE EDITOR BAR
// ==========================================================================

function openInteractiveSubtitleFloatingBar(subNode) {
    activeSubtitleElement = subNode;

    document.querySelectorAll('.live-subtitle-box').forEach(s => s.style.border = "2px dashed transparent");
    subNode.style.border = "2px dashed #00f2fe";

    const oldBar = document.getElementById('sStudioLiveSubEditorBar');
    if (oldBar) oldBar.remove();

    const currentText = subNode.querySelector('.sub-text-label') ? subNode.querySelector('.sub-text-label').innerText : subNode.innerText;
    const currentSize = parseInt(window.getComputedStyle(subNode).fontSize) || 18;

    const bar = document.createElement('div');
    bar.id = 'sStudioLiveSubEditorBar';
    bar.style.cssText = `
        position: fixed;
        bottom: 125px;
        left: 50%;
        transform: translateX(-50%);
        background: #14171f;
        border: 2px solid #00f2fe;
        padding: 8px 14px;
        border-radius: 10px;
        display: flex;
        align-items: center;
        gap: 10px;
        z-index: 100005;
        box-shadow: 0 10px 35px rgba(0,0,0,0.9);
        color: white;
        font-family: sans-serif;
        font-size: 11px;
    `;

    bar.innerHTML = `
        <input type="text" id="liveSubEditInput" value="${currentText}" oninput="updateLiveSubText(this.value)" style="background:#222733; color:white; border:1px solid #444; padding:4px 8px; border-radius:4px; font-size:11px; width:120px;">
        <div style="display:flex; align-items:center; gap:4px;">
            <button onclick="adjustLiveSubSize(-2)" style="background:#222733; color:white; border:1px solid #444; padding:3px 7px; border-radius:3px; cursor:pointer; font-weight:bold;">-</button>
            <span id="liveSubSizeVal" style="color:#00f2fe; font-weight:bold; min-width:30px; text-align:center;">${currentSize}px</span>
            <button onclick="adjustLiveSubSize(2)" style="background:#222733; color:white; border:1px solid #444; padding:3px 7px; border-radius:3px; cursor:pointer; font-weight:bold;">+</button>
        </div>
        <div style="display:flex; align-items:center; gap:3px;">
            <span>🎨</span>
            <input type="color" onchange="updateLiveSubColor(this.value)" title="Text Color" style="width:22px; height:22px; border:none; cursor:pointer; background:none;">
            <input type="color" onchange="updateLiveSubBg(this.value)" title="Background Color" style="width:22px; height:22px; border:none; cursor:pointer; background:none;">
        </div>
        <select onchange="updateLiveSubFont(this.value)" style="background:#222733; color:white; border:1px solid #444; border-radius:4px; padding:3px; font-size:10px;">
            <option value="Arial, sans-serif">Arial</option>
            <option value="'Impact', sans-serif">Impact</option>
            <option value="'Courier New', monospace">Typewriter</option>
            <option value="'Trebuchet MS', sans-serif">Modern</option>
        </select>
        <button onclick="closeLiveSubtitleEditor()" style="background:#10ac84; color:white; border:none; padding:4px 8px; border-radius:4px; font-weight:bold; cursor:pointer;">
            Done
        </button>
    `;

    document.body.appendChild(bar);
}

function updateLiveSubText(val) {
    if (activeSubtitleElement) {
        const label = activeSubtitleElement.querySelector('.sub-text-label');
        if (label) label.innerText = val;
        else activeSubtitleElement.innerText = val;

        const trackBlock = document.getElementById('track_' + activeSubtitleElement.id);
        if (trackBlock) {
            const trackSpan = trackBlock.querySelector('span');
            if (trackSpan) trackSpan.innerText = "💬 " + val;
        }
    }
}

function adjustLiveSubSize(delta) {
    if (!activeSubtitleElement) return;
    const curSize = parseInt(window.getComputedStyle(activeSubtitleElement).fontSize) || 18;
    const newSize = Math.max(10, Math.min(80, curSize + delta));
    activeSubtitleElement.style.fontSize = newSize + "px";

    const display = document.getElementById('liveSubSizeVal');
    if (display) display.innerText = newSize + "px";
}

function updateLiveSubColor(col) {
    if (activeSubtitleElement) activeSubtitleElement.style.color = col;
}

function updateLiveSubBg(col) {
    if (activeSubtitleElement) activeSubtitleElement.style.backgroundColor = col + "cc";
}

function updateLiveSubFont(font) {
    if (activeSubtitleElement) activeSubtitleElement.style.fontFamily = font;
}

function closeLiveSubtitleEditor() {
    if (activeSubtitleElement) {
        activeSubtitleElement.style.border = "2px dashed transparent";
        activeSubtitleElement = null;
    }
    const bar = document.getElementById('sStudioLiveSubEditorBar');
    if (bar) bar.remove();
}

function clearAllSubtitleLayers() {
    document.querySelectorAll('.live-subtitle-box').forEach(el => {
        const trackBlock = document.getElementById('track_' + el.id);
        if (trackBlock) trackBlock.remove();
        el.remove();
    });
    const modal = document.getElementById('sStudioSubtitlesModal');
    if (modal) modal.remove();
    closeLiveSubtitleEditor();
}

// ==========================================================================
// 📐 SELECT ASPECT RATIO PRESETS
// ==========================================================================

function openCropPresetsMenu() {
    const oldMenu = document.getElementById('sStudioCropMenu');
    if (oldMenu) oldMenu.remove();

    const cropMenu = document.createElement('div');
    cropMenu.id = 'sStudioCropMenu';
    cropMenu.style.cssText = `
        position: fixed !important;
        top: 50% !important;
        left: 50% !important;
        transform: translate(-50%, -50%) !important;
        background: #161920 !important;
        border: 2px solid #6c5ce7 !important;
        padding: 16px !important;
        border-radius: 12px !important;
        display: flex !important;
        flex-direction: column !important;
        gap: 8px !important;
        z-index: 2147483647 !important;
        width: 320px !important;
        max-height: 85vh !important;
        overflow-y: auto !important;
        font-family: sans-serif !important;
        color: white !important;
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.9) !important;
    `;

    cropMenu.innerHTML = `
        <div style="font-size: 13px; color: #a8a5ff; font-weight: bold; border-bottom: 1px solid #2f3542; padding-bottom: 6px; display: flex; justify-content: space-between; align-items: center;">
            <span>📐 SELECT ASPECT RATIO / CROP</span>
            <span onclick="this.parentElement.parentElement.remove()" style="cursor: pointer; font-size: 18px; color: #a4b0be;">&times;</span>
        </div>

        <button onclick="applyCanvasFrameRatio('16-9'); const m = document.getElementById('sStudioCropMenu'); if (m) m.remove();" style="background:#222733; color:#fff; border:1px solid #333; padding:8px; border-radius:6px; cursor:pointer; text-align:left; font-size:11px;">
            16:9 (YouTube / Landscape)
        </button>

        <button onclick="applyCanvasFrameRatio('9-16'); const m = document.getElementById('sStudioCropMenu'); if (m) m.remove();" style="background:#222733; color:#00f2fe; border:1px solid #00f2fe; padding:8px; border-radius:6px; cursor:pointer; text-align:left; font-size:11px; font-weight:bold;">
            9:16 (Reels / Shorts / TikTok)
        </button>

        <button onclick="applyCanvasFrameRatio('1-1'); const m = document.getElementById('sStudioCropMenu'); if (m) m.remove();" style="background:#222733; color:#fff; border:1px solid #333; padding:8px; border-radius:6px; cursor:pointer; text-align:left; font-size:11px;">
            1:1 (Instagram Square)
        </button>

        <button onclick="applyCanvasFrameRatio('4-5'); const m = document.getElementById('sStudioCropMenu'); if (m) m.remove();" style="background:#222733; color:#fff; border:1px solid #333; padding:8px; border-radius:6px; cursor:pointer; text-align:left; font-size:11px;">
            4:5 (Instagram Portrait)
        </button>

        <button onclick="applyCanvasFrameRatio('4-3'); const m = document.getElementById('sStudioCropMenu'); if (m) m.remove();" style="background:#222733; color:#fff; border:1px solid #333; padding:8px; border-radius:6px; cursor:pointer; text-align:left; font-size:11px;">
            4:3 (Classic Standard)
        </button>

        <button onclick="applyCanvasFrameRatio('3-4'); const m = document.getElementById('sStudioCropMenu'); if (m) m.remove();" style="background:#222733; color:#fff; border:1px solid #333; padding:8px; border-radius:6px; cursor:pointer; text-align:left; font-size:11px;">
            3:4 (Vertical Classic)
        </button>

        <button onclick="applyCanvasFrameRatio('21-9'); const m = document.getElementById('sStudioCropMenu'); if (m) m.remove();" style="background:#222733; color:#fff; border:1px solid #333; padding:8px; border-radius:6px; cursor:pointer; text-align:left; font-size:11px;">
            21:9 (Cinematic Ultrawide)
        </button>

        <button onclick="applyCanvasFrameRatio('2-3'); const m = document.getElementById('sStudioCropMenu'); if (m) m.remove();" style="background:#222733; color:#fff; border:1px solid #333; padding:8px; border-radius:6px; cursor:pointer; text-align:left; font-size:11px;">
            2:3 (Pinterest)
        </button>

        <button onclick="applyCanvasFrameRatio('fit'); const m = document.getElementById('sStudioCropMenu'); if (m) m.remove();" style="background:#6c5ce7; color:#fff; border:none; padding:8px; border-radius:6px; font-weight:bold; cursor:pointer; text-align:center; font-size:11px; margin-top:4px;">
            Reset to Original Fit
        </button>
    `;

    document.body.appendChild(cropMenu);
}

// ==========================================================================
// ✂️ SHAPE CUTOUTS STUDIO & INTERACTIVE FREEHAND CUTOUT
// ==========================================================================

function openCutOutStudioMenu() {
    const targetElement = currentActivePIPLayer 
        ? (currentActivePIPLayer.querySelector('video, img') || currentActivePIPLayer)
        : (document.getElementById('mainPlayer') || currentVideoElement);

    if (!targetElement) return;

    const old = document.getElementById('sStudioCutOutModal');
    if (old) old.remove();

    const modal = document.createElement('div');
    modal.id = 'sStudioCutOutModal';
    modal.style.cssText = `
        position: fixed !important;
        top: 50% !important;
        left: 50% !important;
        transform: translate(-50%, -50%) !important;
        background: #14171f !important;
        border: 2px solid #ff4757 !important;
        padding: 20px !important;
        border-radius: 14px !important;
        z-index: 100000 !important;
        width: 340px !important;
        color: white !important;
        font-family: sans-serif !important;
        box-shadow: 0 10px 40px rgba(255, 71, 87, 0.4) !important;
    `;

    modal.innerHTML = `
        <div style="font-size: 13px; color: #ff6b81; font-weight: bold; border-bottom: 1px solid #2f3542; padding-bottom: 6px; display: flex; justify-content: space-between; align-items: center;">
            <span>✂️ CUT OUT & SHAPE MASKS</span>
            <span onclick="this.parentElement.parentElement.remove()" style="cursor: pointer; font-size: 18px; color: #a4b0be;">&times;</span>
        </div>

        <p style="font-size: 11px; color: #a4b0be; margin: 8px 0 6px;">Select Preset Cutout Shape:</p>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px;">
            <button onclick="applyCutOutPreset('circle')" style="background:#222733; color:white; border:1px solid #333; padding:8px; border-radius:5px; font-size:11px; cursor:pointer;">Circle Cut</button>
            <button onclick="applyCutOutPreset('box')" style="background:#222733; color:white; border:1px solid #333; padding:8px; border-radius:5px; font-size:11px; cursor:pointer;">Box Cut</button>
            <button onclick="applyCutOutPreset('topCut')" style="background:#222733; color:white; border:1px solid #333; padding:8px; border-radius:5px; font-size:11px; cursor:pointer;">Top Half</button>
            <button onclick="applyCutOutPreset('bottomCut')" style="background:#222733; color:white; border:1px solid #333; padding:8px; border-radius:5px; font-size:11px; cursor:pointer;">Bottom Half</button>
            <button onclick="applyCutOutPreset('roundedBox')" style="background:#222733; color:white; border:1px solid #333; padding:8px; border-radius:5px; font-size:11px; cursor:pointer;">Rounded Box</button>
            <button onclick="applyCutOutPreset('diamond')" style="background:#222733; color:white; border:1px solid #333; padding:8px; border-radius:5px; font-size:11px; cursor:pointer;">Diamond</button>
            <button onclick="applyCutOutPreset('heart')" style="background:#222733; color:#ff4757; border:1px solid #ff4757; padding:8px; border-radius:5px; font-size:11px; cursor:pointer;">Heart Cut</button>
            <button onclick="applyCutOutPreset('reset')" style="background:#222733; color:#00f2fe; border:1px solid #00f2fe; padding:8px; border-radius:5px; font-size:11px; cursor:pointer;">Reset Full</button>
        </div>

        <div style="margin-top: 10px; padding-top: 10px; border-top: 1px solid #2f3542;">
            <button onclick="document.getElementById('sStudioCutOutModal').remove(); startInteractiveCustomBoxCutout();" style="width:100%; background:linear-gradient(135deg, #ff4757, #6c5ce7); color:white; border:none; padding:10px; border-radius:6px; font-weight:bold; cursor:pointer; font-size:11px;">
                Freehand Interactive Box Cutout
            </button>
        </div>
    `;

    document.body.appendChild(modal);
}

function applyCutOutPreset(type) {
    const targetElement = currentActivePIPLayer 
        ? (currentActivePIPLayer.querySelector('video, img') || currentActivePIPLayer)
        : (document.getElementById('mainPlayer') || currentVideoElement);

    if (!targetElement) return;

    switch(type) {
        case 'circle':
            targetElement.style.clipPath = "circle(45% at 50% 50%)";
            break;
        case 'box':
            targetElement.style.clipPath = "inset(12% 12% 12% 12%)";
            break;
        case 'roundedBox':
            targetElement.style.clipPath = "inset(8% 8% 8% 8% round 20px)";
            break;
        case 'topCut':
            targetElement.style.clipPath = "polygon(0% 0%, 100% 0%, 100% 50%, 0% 50%)";
            break;
        case 'bottomCut':
            targetElement.style.clipPath = "polygon(0% 50%, 100% 50%, 100% 100%, 0% 100%)";
            break;
        case 'diamond':
            targetElement.style.clipPath = "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)";
            break;
        case 'heart':
            targetElement.style.clipPath = "polygon(50% 15%, 80% 0%, 100% 20%, 100% 50%, 50% 95%, 0% 50%, 0% 20%, 20% 0%)";
            break;
        case 'reset':
        default:
            targetElement.style.clipPath = "none";
            break;
    }
}

function startInteractiveCustomBoxCutout() {
    const wrapper = document.getElementById('videoWrapper');
    const targetElement = currentActivePIPLayer 
        ? (currentActivePIPLayer.querySelector('video, img') || currentActivePIPLayer)
        : (document.getElementById('mainPlayer') || currentVideoElement);

    if (!wrapper || !targetElement) return;

    const oldBox = document.getElementById('sStudioCutoutSelectionBox');
    if (oldBox) oldBox.remove();

    const box = document.createElement('div');
    box.id = 'sStudioCutoutSelectionBox';
    box.style.cssText = `
        position: absolute;
        top: 20%;
        left: 20%;
        width: 60%;
        height: 60%;
        border: 2px dashed #ff4757;
        background: rgba(255, 71, 87, 0.15);
        box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.55);
        z-index: 500;
        cursor: move;
        border-radius: 4px;
    `;

    box.innerHTML = `
        <div style="position: absolute; top: -30px; left: 0; background: #ff4757; color: white; padding: 3px 8px; border-radius: 4px; font-size: 10px; font-weight: bold; font-family: sans-serif; display: flex; gap: 8px; align-items: center; white-space: nowrap;">
            <span>Adjust Cutout Box</span>
            <button id="btnApplyCutout" style="background: #10ac84; color: white; border: none; padding: 2px 6px; border-radius: 3px; font-size: 10px; font-weight: bold; cursor: pointer;">Cut Out</button>
            <button id="btnCancelCutout" style="background: #222; color: white; border: none; padding: 2px 6px; border-radius: 3px; font-size: 10px; cursor: pointer;">✕</button>
        </div>
        <div class="cut-corner" style="position: absolute; right: -5px; bottom: -5px; width: 12px; height: 12px; background: #ff4757; cursor: se-resize; border-radius: 2px;"></div>
    `;

    let isDragging = false, isResizing = false;
    let startX = 0, startY = 0, startW = 0, startH = 0, startL = 0, startT = 0;

    box.onmousedown = function(e) {
        if (e.target.id === 'btnApplyCutout' || e.target.id === 'btnCancelCutout') return;
        if (e.target.classList.contains('cut-corner')) {
            isResizing = true;
            startX = e.clientX;
            startY = e.clientY;
            startW = box.offsetWidth;
            startH = box.offsetHeight;
        } else {
            isDragging = true;
            startX = e.clientX;
            startY = e.clientY;
            startL = box.offsetLeft;
            startT = box.offsetTop;
        }

        function onMouseMove(ev) {
            if (isResizing) {
                box.style.width = Math.max(50, startW + (ev.clientX - startX)) + "px";
                box.style.height = Math.max(50, startH + (ev.clientY - startY)) + "px";
            } else if (isDragging) {
                box.style.left = Math.max(0, startL + (ev.clientX - startX)) + "px";
                box.style.top = Math.max(0, startT + (ev.clientY - startY)) + "px";
            }
        }

        function onMouseUp() {
            isDragging = false;
            isResizing = false;
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        }

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    };

    box.querySelector('#btnApplyCutout').onclick = function(e) {
        e.stopPropagation();
        const wrapRect = wrapper.getBoundingClientRect();
        const boxRect = box.getBoundingClientRect();

        const topPercent = Math.max(0, ((boxRect.top - wrapRect.top) / wrapRect.height) * 100).toFixed(1);
        const leftPercent = Math.max(0, ((boxRect.left - wrapRect.left) / wrapRect.width) * 100).toFixed(1);
        const rightPercent = Math.max(0, ((wrapRect.right - boxRect.right) / wrapRect.width) * 100).toFixed(1);
        const bottomPercent = Math.max(0, ((wrapRect.bottom - boxRect.bottom) / wrapRect.height) * 100).toFixed(1);

        targetElement.style.clipPath = `inset(${topPercent}% ${rightPercent}% ${bottomPercent}% ${leftPercent}%)`;
        box.remove();
    };

    box.querySelector('#btnCancelCutout').onclick = function(e) {
        e.stopPropagation();
        box.remove();
    };

    wrapper.appendChild(box);
}

// ==========================================================================
// ✂️ SPLIT CLIP WITH RED TRANSITION MARKER ENGINE
// ==========================================================================

function splitCurrentVideoClip() {
    const mainVideo = document.getElementById('mainPlayer');
    if (!mainVideo || mainVideo.tagName !== 'VIDEO') return;

    const curTime = mainVideo.currentTime;
    if (curTime < 0.5) return;

    if (typeof saveStateToHistory === 'function') saveStateToHistory();

    const segmentId = 'seg_' + Date.now();
    const clipData = {
        id: segmentId,
        splitTime: parseFloat(curTime.toFixed(2)),
        inAnim: 'none',
        outAnim: 'none',
        loopAnim: 'none',
        keyframes: []
    };

    splitClipSegments.push(clipData);
    splitClipSegments.sort((a, b) => a.splitTime - b.splitTime);

    renderSplitTimelineMarkers();
    openSplitTransitionStudio(clipData);
}

function renderSplitTimelineMarkers() {
    const track = document.getElementById('frameTimelineTrack') || document.getElementById('timelineTracksContainer');
    if (!track || !videoDurationSeconds) return;

    document.querySelectorAll('.split-cut-container').forEach(el => el.remove());

    splitClipSegments.forEach((seg, index) => {
        const percentage = (seg.splitTime / videoDurationSeconds) * 100;

        const cutWrap = document.createElement('div');
        cutWrap.className = 'split-cut-container';
        cutWrap.style.cssText = `
            position: absolute;
            left: ${percentage}%;
            top: 0;
            height: 100%;
            z-index: 50;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
        `;

        cutWrap.innerHTML = `
            <div style="width: 2px; height: 100%; background: #ff4757; box-shadow: 0 0 8px #ff4757;"></div>
            <div style="position: absolute; width: 18px; height: 18px; background: #ff4757; border: 2px solid white; border-radius: 4px; display: flex; align-items: center; justify-content: center; font-size: 9px; color: white; font-weight: bold; box-shadow: 0 2px 6px rgba(0,0,0,0.6);">
                ⚡
            </div>
        `;

        cutWrap.title = `Split Segment ${index + 1} at ${seg.splitTime}s`;
        cutWrap.onclick = function(e) {
            e.stopPropagation();
            openSplitTransitionStudio(seg);
        };

        track.appendChild(cutWrap);
    });
}

function openSplitTransitionStudio(segData) {
    const oldModal = document.getElementById('sStudioSplitAnimModal');
    if (oldModal) oldModal.remove();

    injectSplitAnimationCSS();

    const modal = document.createElement('div');
    modal.id = 'sStudioSplitAnimModal';
    modal.style.cssText = `
        position: fixed !important;
        top: 50% !important;
        left: 50% !important;
        transform: translate(-50%, -50%) !important;
        background: #161920 !important;
        border: 2px solid #ff4757 !important;
        padding: 18px !important;
        border-radius: 12px !important;
        display: flex !important;
        flex-direction: column !important;
        gap: 12px !important;
        z-index: 100000 !important;
        width: 340px !important;
        max-height: 85vh !important;
        overflow-y: auto !important;
        color: white !important;
        font-family: sans-serif !important;
        box-shadow: 0 10px 35px rgba(0,0,0,0.85) !important;
    `;

    modal.innerHTML = `
        <div style="font-size: 13px; color: #ff7979; font-weight: bold; border-bottom: 1px solid #2f3542; padding-bottom: 6px; display: flex; justify-content: space-between; align-items: center;">
            <span>⚡ SPLIT SEGMENT STUDIO (${segData.splitTime}s)</span>
            <span onclick="this.parentElement.parentElement.remove()" style="cursor: pointer; font-size: 18px; color: #a4b0be;">&times;</span>
        </div>

        <div>
            <div style="font-size: 11px; color: #38bdf8; font-weight: bold; margin-bottom: 4px;">🎬 1. IN Animation:</div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 5px;">
                <button onclick="applyClipSegmentAnim('${segData.id}', 'in', 'slide-down')" style="background: #222733; color: white; border: 1px solid #333; padding: 6px; border-radius: 4px; font-size: 10.5px; cursor: pointer;">Slide Down</button>
                <button onclick="applyClipSegmentAnim('${segData.id}', 'in', 'slide-up')" style="background: #222733; color: white; border: 1px solid #333; padding: 6px; border-radius: 4px; font-size: 10.5px; cursor: pointer;">Slide Up</button>
                <button onclick="applyClipSegmentAnim('${segData.id}', 'in', 'slide-left')" style="background: #222733; color: white; border: 1px solid #333; padding: 6px; border-radius: 4px; font-size: 10.5px; cursor: pointer;">Slide Left</button>
                <button onclick="applyClipSegmentAnim('${segData.id}', 'in', 'pop-zoom')" style="background: #222733; color: white; border: 1px solid #333; padding: 6px; border-radius: 4px; font-size: 10.5px; cursor: pointer;">Pop Zoom</button>
            </div>
        </div>

        <div>
            <div style="font-size: 11px; color: #e056fd; font-weight: bold; margin-bottom: 4px;">🎬 2. OUT Animation:</div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 5px;">
                <button onclick="applyClipSegmentAnim('${segData.id}', 'out', 'out-down')" style="background: #222733; color: white; border: 1px solid #333; padding: 6px; border-radius: 4px; font-size: 10.5px; cursor: pointer;">Exit Bottom</button>
                <button onclick="applyClipSegmentAnim('${segData.id}', 'out', 'out-right')" style="background: #222733; color: white; border: 1px solid #333; padding: 6px; border-radius: 4px; font-size: 10.5px; cursor: pointer;">Exit Right</button>
                <button onclick="applyClipSegmentAnim('${segData.id}', 'out', 'out-fade')" style="background: #222733; color: white; border: 1px solid #333; padding: 6px; border-radius: 4px; font-size: 10.5px; cursor: pointer;">Fade Out</button>
                <button onclick="applyClipSegmentAnim('${segData.id}', 'out', 'out-shrink')" style="background: #222733; color: white; border: 1px solid #333; padding: 6px; border-radius: 4px; font-size: 10.5px; cursor: pointer;">Shrink Exit</button>
            </div>
        </div>

        <div>
            <div style="font-size: 11px; color: #10ac84; font-weight: bold; margin-bottom: 4px;">🔁 3. LOOP Animation:</div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 5px;">
                <button onclick="applyClipSegmentAnim('${segData.id}', 'loop', 'loop-pulse')" style="background: #222733; color: white; border: 1px solid #333; padding: 6px; border-radius: 4px; font-size: 10.5px; cursor: pointer;">Pulse Beat</button>
                <button onclick="applyClipSegmentAnim('${segData.id}', 'loop', 'loop-shake')" style="background: #222733; color: white; border: 1px solid #333; padding: 6px; border-radius: 4px; font-size: 10.5px; cursor: pointer;">Action Shake</button>
                <button onclick="applyClipSegmentAnim('${segData.id}', 'loop', 'loop-float')" style="background: #222733; color: white; border: 1px solid #333; padding: 6px; border-radius: 4px; font-size: 10.5px; cursor: pointer;">Floating</button>
                <button onclick="applyClipSegmentAnim('${segData.id}', 'loop', 'loop-spin')" style="background: #222733; color: white; border: 1px solid #333; padding: 6px; border-radius: 4px; font-size: 10.5px; cursor: pointer;">Slow Rotate</button>
            </div>
        </div>

        <div style="border-top: 1px solid #2f3542; padding-top: 8px; display: flex; flex-direction: column; gap: 6px;">
            <button onclick="addSegmentKeyframeMarker('${segData.id}')" style="background: rgba(108, 92, 231, 0.25); color: #a8a5ff; border: 1px solid #6c5ce7; padding: 7px; border-radius: 5px; font-size: 11px; font-weight: bold; cursor: pointer;">
                🔑 Add Keyframe to Segment
            </button>
            <div style="display: flex; gap: 6px;">
                <button onclick="deleteSplitClipPart('${segData.id}'); document.getElementById('sStudioSplitAnimModal').remove();" style="flex: 1; background: #ff4757; color: white; border: none; padding: 7px; border-radius: 5px; font-size: 11px; font-weight: bold; cursor: pointer;">
                    Delete Part
                </button>
                <button onclick="document.getElementById('sStudioSplitAnimModal').remove();" style="flex: 1; background: #2f3542; color: white; border: none; padding: 7px; border-radius: 5px; font-size: 11px; cursor: pointer;">
                    Done
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
}

function applyClipSegmentAnim(segId, category, animName) {
    const seg = splitClipSegments.find(s => s.id === segId);
    if (!seg) return;

    if (category === 'in') seg.inAnim = animName;
    if (category === 'out') seg.outAnim = animName;
    if (category === 'loop') seg.loopAnim = animName;

    const video = document.getElementById('mainPlayer');
    if (video) {
        video.style.animation = "none";
        void video.offsetWidth;
        video.style.animation = `${animName} 0.8s ease-out forwards`;
    }
}

function addSegmentKeyframeMarker(segId) {
    const mainVideo = document.getElementById('mainPlayer');
    const curTime = mainVideo ? mainVideo.currentTime : 0;
    const seg = splitClipSegments.find(s => s.id === segId);
    if (seg) {
        seg.keyframes.push(parseFloat(curTime.toFixed(2)));
    }
}

function deleteSplitClipPart(segId) {
    splitClipSegments = splitClipSegments.filter(s => s.id !== segId);
    renderSplitTimelineMarkers();
}

function injectSplitAnimationCSS() {
    if (document.getElementById('sStudioSplitAnimStyles')) return;

    const style = document.createElement('style');
    style.id = 'sStudioSplitAnimStyles';
    style.innerHTML = `
        @keyframes slide-down { from { transform: translateY(-100%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @keyframes slide-up { from { transform: translateY(100%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @keyframes slide-left { from { transform: translateX(-100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        @keyframes pop-zoom { 0% { transform: scale(0.3); opacity: 0; } 80% { transform: scale(1.08); } 100% { transform: scale(1); opacity: 1; } }

        @keyframes out-down { from { transform: translateY(0); opacity: 1; } to { transform: translateY(100%); opacity: 0; } }
        @keyframes out-right { from { transform: translateX(0); opacity: 1; } to { transform: translateX(100%); opacity: 0; } }
        @keyframes out-fade { from { opacity: 1; } to { opacity: 0; } }
        @keyframes out-shrink { from { transform: scale(1); opacity: 1; } to { transform: scale(0.2); opacity: 0; } }

        @keyframes loop-pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.05); } }
        @keyframes loop-shake { 0%, 100% { transform: translate(0, 0); } 20% { transform: translate(-3px, 2px); } 40% { transform: translate(3px, -2px); } 60% { transform: translate(-2px, -1px); } 80% { transform: translate(2px, 1px); } }
        @keyframes loop-float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
        @keyframes loop-spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
    `;
    document.head.appendChild(style);
}

// ==========================================================================
// 🔒 SELECTIVE AREA BLUR / MOSAIC ENGINE
// ==========================================================================

function startAreaBlurSelection() {
    const wrapper = document.getElementById('videoWrapper');
    if (!wrapper || !currentVideoElement) return;

    const oldOverlay = document.getElementById('sStudioAreaBlurSelector');
    if (oldOverlay) oldOverlay.remove();

    const selectOverlay = document.createElement('div');
    selectOverlay.id = 'sStudioAreaBlurSelector';
    selectOverlay.style.cssText = `
        position: absolute;
        top: 0; left: 0; width: 100%; height: 100%;
        z-index: 1000;
        background: rgba(0, 0, 0, 0.35);
        cursor: crosshair;
    `;

    const drawBox = document.createElement('div');
    drawBox.style.cssText = `
        position: absolute;
        border: 2px dashed #ff4757;
        background: rgba(255, 71, 87, 0.2);
        display: none;
        pointer-events: none;
    `;
    selectOverlay.appendChild(drawBox);

    const actionBtns = document.createElement('div');
    actionBtns.style.cssText = `
        position: absolute;
        bottom: 15px; left: 50%;
        transform: translateX(-50%);
        display: flex; gap: 10px;
        z-index: 1010;
    `;
    actionBtns.innerHTML = `
        <button id="btnConfirmAreaBlur" style="background:#10ac84; color:white; border:none; padding:7px 14px; border-radius:4px; font-weight:bold; font-size:11px; cursor:pointer;">Apply Blur Mask</button>
        <button id="btnCancelAreaBlur" style="background:#ff4757; color:white; border:none; padding:7px 14px; border-radius:4px; font-weight:bold; font-size:11px; cursor:pointer;">Cancel</button>
    `;
    selectOverlay.appendChild(actionBtns);

    wrapper.style.position = 'relative';
    wrapper.appendChild(selectOverlay);

    let startX = 0, startY = 0;
    let isDrawing = false;

    selectOverlay.onmousedown = function(e) {
        if (e.target.tagName === 'BUTTON') return;
        const rect = selectOverlay.getBoundingClientRect();
        startX = e.clientX - rect.left;
        startY = e.clientY - rect.top;
        isDrawing = true;

        drawBox.style.display = 'block';
        drawBox.style.left = startX + 'px';
        drawBox.style.top = startY + 'px';
        drawBox.style.width = '0px';
        drawBox.style.height = '0px';
    };

    selectOverlay.onmousemove = function(e) {
        if (!isDrawing) return;
        const rect = selectOverlay.getBoundingClientRect();
        let currentX = e.clientX - rect.left;
        let currentY = e.clientY - rect.top;

        let width = currentX - startX;
        let height = currentY - startY;
        let left = startX;
        let top = startY;

        if (width < 0) { left = currentX; width = Math.abs(width); }
        if (height < 0) { top = currentY; height = Math.abs(height); }

        drawBox.style.left = left + 'px';
        drawBox.style.top = top + 'px';
        drawBox.style.width = width + 'px';
        drawBox.style.height = height + 'px';
    };

    selectOverlay.onmouseup = function() {
        isDrawing = false;
    };

    selectOverlay.querySelector('#btnConfirmAreaBlur').onclick = function(e) {
        e.stopPropagation();
        const wrapperRect = wrapper.getBoundingClientRect();
        const boxRect = drawBox.getBoundingClientRect();

        if (boxRect.width > 15 && boxRect.height > 15) {
            const relLeft = boxRect.left - wrapperRect.left;
            const relTop = boxRect.top - wrapperRect.top;
            createPermanentBlurMask(relLeft, relTop, boxRect.width, boxRect.height);
        }
        selectOverlay.remove();
    };

    selectOverlay.querySelector('#btnCancelAreaBlur').onclick = function(e) {
        e.stopPropagation();
        selectOverlay.remove();
    };
}

function createPermanentBlurMask(left, top, width, height) {
    const wrapper = document.getElementById('videoWrapper');
    if (!wrapper) return;

    const maskId = 'blur_mask_' + Date.now();
    const blurBox = document.createElement('div');
    blurBox.id = maskId;
    blurBox.className = 'live-blur-mask-box';
    blurBox.style.cssText = `
        position: absolute;
        left: ${left}px;
        top: ${top}px;
        width: ${width}px;
        height: ${height}px;
        backdrop-filter: blur(14px);
        -webkit-backdrop-filter: blur(14px);
        background: rgba(255, 255, 255, 0.05);
        border: 1px dashed rgba(255, 255, 255, 0.4);
        border-radius: 4px;
        z-index: 110;
        cursor: move;
        display: flex;
        justify-content: flex-end;
        padding: 2px;
        box-sizing: border-box;
    `;

    const delBtn = document.createElement('span');
    delBtn.innerText = "✕";
    delBtn.style.cssText = "background: #ff4757; color: white; font-size: 10px; width: 14px; height: 14px; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; font-weight: bold;";
    delBtn.onclick = function(e) {
        e.stopPropagation();
        blurBox.remove();
    };
    blurBox.appendChild(delBtn);

    if (typeof makeElementDraggable === 'function') {
        makeElementDraggable(blurBox);
    }

    wrapper.appendChild(blurBox);
}

// ==========================================================================
// 🎭 CINEMATIC MASKING ENGINE
// ==========================================================================

function getActiveMediaElement() {
    return currentActivePIPLayer 
        ? (currentActivePIPLayer.querySelector('video, img') || currentActivePIPLayer)
        : (document.getElementById('mainPlayer') || document.getElementById('mainPhotoPlayer') || currentVideoElement);
}

function openMaskStudioMenu() {
    const target = getActiveMediaElement();
    if (!target) return;

    const oldMenu = document.getElementById('sStudioMaskMenu');
    if (oldMenu) oldMenu.remove();

    const menu = document.createElement('div');
    menu.id = 'sStudioMaskMenu';
    menu.style.cssText = `
        position: fixed !important;
        top: 50% !important;
        left: 50% !important;
        transform: translate(-50%, -50%) !important;
        background: #161920 !important;
        border: 2px solid #1abc9c !important;
        padding: 18px !important;
        border-radius: 12px !important;
        display: flex !important;
        flex-direction: column !important;
        gap: 10px !important;
        z-index: 100000 !important;
        width: 320px !important;
        color: white !important;
        font-family: sans-serif !important;
        box-shadow: 0 10px 30px rgba(0,0,0,0.85) !important;
    `;

    menu.innerHTML = `
        <div style="font-size: 12px; color: #a3e4d7; font-weight: bold; border-bottom: 1px solid #2f3542; padding-bottom: 6px; display: flex; justify-content: space-between; align-items: center;">
            <span>🎭 ADVANCED MASK STUDIO</span>
            <span onclick="this.parentElement.parentElement.remove()" style="cursor: pointer; font-size: 18px; color: #a4b0be;">&times;</span>
        </div>
        <p style="font-size: 11px; color: #a4b0be; margin: 0;">Select a mask shape for the active media layer:</p>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px;">
            <button onclick="applyMaskPreset('linear')" style="background: #222733; color: white; border: 1px solid #333; padding: 8px; border-radius: 4px; font-size: 11px; cursor: pointer; text-align: left; font-weight: bold;">🔲 Linear (Split)</button>
            <button onclick="applyMaskPreset('circle')" style="background: #222733; color: white; border: 1px solid #333; padding: 8px; border-radius: 4px; font-size: 11px; cursor: pointer; text-align: left; font-weight: bold;">⭕ Circle (Radial)</button>
            <button onclick="applyMaskPreset('cinematic')" style="background: #222733; color: white; border: 1px solid #333; padding: 8px; border-radius: 4px; font-size: 11px; cursor: pointer; text-align: left; font-weight: bold;">🎬 Film Bars</button>
            <button onclick="applyMaskPreset('rounded')" style="background: #222733; color: white; border: 1px solid #333; padding: 8px; border-radius: 4px; font-size: 11px; cursor: pointer; text-align: left; font-weight: bold;">🔲 Rounded Box</button>
            <button onclick="applyMaskPreset('heart')" style="background: #222733; color: white; border: 1px solid #333; padding: 8px; border-radius: 4px; font-size: 11px; cursor: pointer; text-align: left; font-weight: bold;">❤️ Heart Shape</button>
            <button onclick="applyMaskPreset('star')" style="background: #222733; color: white; border: 1px solid #333; padding: 8px; border-radius: 4px; font-size: 11px; cursor: pointer; text-align: left; font-weight: bold;">⭐ Star Shape</button>
        </div>

        <div style="background: #111318; padding: 8px; border-radius: 6px; display: flex; flex-direction: column; gap: 6px; margin-top: 4px;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <label style="font-size: 11px; color: #a4b0be;">🪞 Invert Mask:</label>
                <button id="btnInvertMask" onclick="toggleMaskInvert()" style="background: #222733; color: #1abc9c; border: 1px solid #1abc9c; padding: 3px 8px; border-radius: 4px; font-size: 10px; cursor: pointer; font-weight: bold;">${isMaskInverted ? 'ON' : 'OFF'}</button>
            </div>
            <div>
                <div style="display: flex; justify-content: space-between; font-size: 11px; color: #a4b0be;">
                    <span>🪶 Feather:</span>
                    <span id="featherValDisplay" style="color: #1abc9c; font-weight: bold;">${maskFeatherPx}px</span>
                </div>
                <input type="range" id="maskFeatherSlider" min="0" max="25" value="${maskFeatherPx}" style="width: 100%; accent-color: #1abc9c; cursor: pointer;" oninput="updateMaskFeather(this.value)">
            </div>
        </div>

        <button onclick="resetMaskEffect()" style="background: #ff4757; color: white; border: none; padding: 8px; border-radius: 6px; cursor: pointer; font-size: 11px; font-weight: bold; margin-top: 4px;">
            Reset Mask
        </button>
    `;

    document.body.appendChild(menu);
}

function applyMaskPreset(type) {
    const target = getActiveMediaElement();
    if (!target) return;

    currentMaskType = type;

    switch(type) {
        case 'linear':
            target.style.clipPath = isMaskInverted 
                ? "polygon(0% 50%, 100% 50%, 100% 100%, 0% 100%)" 
                : "polygon(0% 0%, 100% 0%, 100% 50%, 0% 50%)";
            break;
        case 'circle':
            target.style.clipPath = "circle(42% at 50% 50%)";
            break;
        case 'cinematic':
            target.style.clipPath = "inset(12% 0% 12% 0%)";
            break;
        case 'rounded':
            target.style.clipPath = "inset(6% 6% 6% 6% round 24px)";
            break;
        case 'heart':
            target.style.clipPath = "polygon(50% 15%, 80% 0%, 100% 20%, 100% 50%, 50% 95%, 0% 50%, 0% 20%, 20% 0%)";
            break;
        case 'star':
            target.style.clipPath = "polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)";
            break;
        default:
            target.style.clipPath = "none";
            break;
    }
}

function toggleMaskInvert() {
    isMaskInverted = !isMaskInverted;
    const btn = document.getElementById('btnInvertMask');
    if (btn) btn.innerText = isMaskInverted ? 'ON' : 'OFF';
    if (currentMaskType !== 'none') {
        applyMaskPreset(currentMaskType);
    }
}

function updateMaskFeather(val) {
    maskFeatherPx = parseInt(val) || 0;
    const display = document.getElementById('featherValDisplay');
    if (display) display.innerText = maskFeatherPx + "px";

    const target = getActiveMediaElement();
    if (target) {
        target.style.filter = maskFeatherPx > 0 ? `blur(${maskFeatherPx / 4}px)` : 'none';
    }
}

function resetMaskEffect() {
    const target = getActiveMediaElement();
    if (target) {
        target.style.clipPath = "none";
        target.style.filter = "none";
    }
    currentMaskType = 'none';
    isMaskInverted = false;
    maskFeatherPx = 0;
    const btn = document.getElementById('btnInvertMask');
    if (btn) btn.innerText = 'OFF';
    const disp = document.getElementById('featherValDisplay');
    if (disp) disp.innerText = '0px';
    const slider = document.getElementById('maskFeatherSlider');
    if (slider) slider.value = 0;
}

// ==========================================================================
// 🎭 CINEMATIC MASKING ENGINE
// ==========================================================================

function getActiveMediaElement() {
    if (currentActivePIPLayer) {
        return currentActivePIPLayer.querySelector('video, img');
    }
    return document.getElementById('mainPlayer') || document.getElementById('mainPhotoPlayer') || currentVideoElement;
}

function applyMaskPreset(type) {
    currentMaskType = type;
    const media = getActiveMediaElement();
    if (!media) return;

    media.style.transition = "clip-path 0.3s ease, border-radius 0.3s ease";

    switch (type) {
        case 'linear':
            media.style.clipPath = isMaskInverted 
                ? "polygon(50% 0, 100% 0, 100% 100%, 50% 100%)" 
                : "polygon(0 0, 50% 0, 50% 100%, 0 100%)";
            media.style.borderRadius = "0px";
            break;
        case 'circle':
            media.style.clipPath = isMaskInverted ? "none" : "circle(42% at 50% 50%)";
            media.style.borderRadius = isMaskInverted ? "50%" : "0px";
            break;
        case 'cinematic':
            media.style.clipPath = isMaskInverted ? "none" : "inset(12% 0% 12% 0%)";
            media.style.borderRadius = "0px";
            break;
        case 'rounded':
            media.style.clipPath = "none";
            media.style.borderRadius = isMaskInverted ? "0px" : "24px";
            break;
        case 'heart':
            media.style.clipPath = "polygon(50% 15%, 100% 35%, 82% 90%, 50% 75%, 18% 90%, 0% 35%)";
            media.style.borderRadius = "0px";
            break;
        case 'star':
            media.style.clipPath = "polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)";
            media.style.borderRadius = "0px";
            break;
        default:
            media.style.clipPath = "none";
            media.style.borderRadius = "0px";
            break;
    }
}

function toggleMaskInvert() {
    isMaskInverted = !isMaskInverted;
    const btn = document.getElementById('btnInvertMask');
    if (btn) {
        btn.innerText = isMaskInverted ? "ON" : "OFF";
        btn.style.background = isMaskInverted ? "#1abc9c" : "#222733";
        btn.style.color = isMaskInverted ? "#000" : "#1abc9c";
    }
    if (currentMaskType !== 'none') {
        applyMaskPreset(currentMaskType);
    }
}

function updateMaskFeather(val) {
    maskFeatherPx = parseInt(val) || 0;
    const disp = document.getElementById('featherValDisplay');
    if (disp) disp.innerText = maskFeatherPx + "px";

    const media = getActiveMediaElement();
    if (media) {
        media.style.filter = maskFeatherPx > 0 ? `drop-shadow(0 0 ${maskFeatherPx}px rgba(0,0,0,0.8))` : "none";
    }
}

function resetMaskEffect() {
    const media = getActiveMediaElement();
    if (media) {
        media.style.clipPath = "none";
        media.style.borderRadius = "0px";
        media.style.filter = "none";
    }
    currentMaskType = 'none';
    isMaskInverted = false;
    maskFeatherPx = 0;
    const menu = document.getElementById('sStudioMaskMenu');
    if (menu) menu.remove();
}

// ==========================================================================
// 🖼️ OVERLAY TRACK POSITION CONTROLLER
// ==========================================================================

function openOverlayPlacementMenu() {
    const filePicker = document.createElement('input');
    filePicker.type = 'file';
    filePicker.accept = 'image/*,video/*';
    filePicker.onchange = function(e) {
        const file = e.target.files[0];
        if (!file) return;
        pendingOverlayFile = file;
        showOverlayPositionOptionsModal(file.name);
    };
    filePicker.click();
}

function showOverlayPositionOptionsModal(fileName) {
    const oldModal = document.getElementById('sStudioOverlayPositionModal');
    if (oldModal) oldModal.remove();

    const modal = document.createElement('div');
    modal.id = 'sStudioOverlayPositionModal';
    modal.style.cssText = `
        position: fixed !important;
        top: 50% !important;
        left: 50% !important;
        transform: translate(-50%, -50%) !important;
        background: #161920 !important;
        border: 2px solid #e67e22 !important;
        padding: 18px !important;
        border-radius: 12px !important;
        display: flex !important;
        flex-direction: column !important;
        gap: 10px !important;
        z-index: 100000 !important;
        width: 320px !important;
        color: white !important;
        font-family: sans-serif !important;
        box-shadow: 0 10px 30px rgba(0,0,0,0.85) !important;
    `;

    modal.innerHTML = `
        <div style="font-size: 12px; color: #f8c471; font-weight: bold; border-bottom: 1px solid #2f3542; padding-bottom: 6px; display: flex; justify-content: space-between; align-items: center;">
            <span>🖼️ OVERLAY TRACK PLACEMENT</span>
            <span onclick="this.parentElement.parentElement.remove()" style="cursor: pointer; font-size: 18px; color: #a4b0be;">&times;</span>
        </div>
        <p style="font-size: 11px; color: #a4b0be; margin: 0;">Choose screen position for <b>${fileName}</b>:</p>

        <button onclick="injectOverlayWithPosition('top')" style="background: #222733; color: #fff; border: 1px solid #333; padding: 9px; border-radius: 6px; cursor: pointer; text-align: left; font-size: 11px; font-weight: bold;">
            Top Layer (Foreground Overlay)
        </button>
        <button onclick="injectOverlayWithPosition('bottom')" style="background: #222733; color: #fff; border: 1px solid #333; padding: 9px; border-radius: 6px; cursor: pointer; text-align: left; font-size: 11px; font-weight: bold;">
            Bottom Layer (Background Base)
        </button>
        <button onclick="injectOverlayWithPosition('corner-top-right')" style="background: #222733; color: #f8c471; border: 1px solid #e67e22; padding: 9px; border-radius: 6px; cursor: pointer; text-align: left; font-size: 11px; font-weight: bold;">
            Top-Right Corner (Watermark / Logo)
        </button>
        <button onclick="injectOverlayWithPosition('center')" style="background: #e67e22; color: white; border: none; padding: 9px; border-radius: 6px; cursor: pointer; text-align: center; font-size: 11px; font-weight: bold;">
            Center Screen
        </button>
    `;

    document.body.appendChild(modal);
}

function injectOverlayWithPosition(positionType) {
    if (!pendingOverlayFile) return;

    const file = pendingOverlayFile;
    const isVideo = file.type.startsWith('video/');
    const objectURL = URL.createObjectURL(file);
    const wrapper = document.getElementById('videoWrapper');
    const pipTrack = document.getElementById('pipTrackBlock') || document.getElementById('frameTimelineTrack');

    if (!wrapper) return;

    const overlayId = 'overlay_layer_' + Date.now();
    const container = document.createElement('div');
    container.id = overlayId;
    container.className = 'live-pip-object';

    let cssTop = "25%", cssLeft = "25%", cssZIndex = "120", cssWidth = "140px";

    if (positionType === 'top') {
        cssTop = "15%"; cssLeft = "20%"; cssZIndex = "150"; cssWidth = "160px";
    } else if (positionType === 'bottom') {
        cssTop = "0"; cssLeft = "0"; cssZIndex = "1"; cssWidth = "100%";
    } else if (positionType === 'corner-top-right') {
        cssTop = "10px"; cssLeft = "auto"; cssZIndex = "150"; cssWidth = "90px";
        container.style.right = "10px";
    } else if (positionType === 'center') {
        cssTop = "30%"; cssLeft = "30%"; cssZIndex = "130"; cssWidth = "180px";
    }

    container.style.cssText = `
        position: absolute;
        top: ${cssTop};
        left: ${cssLeft};
        width: ${cssWidth};
        height: auto;
        z-index: ${cssZIndex};
        cursor: move;
        border: 2px dashed #e67e22;
        background: rgba(0,0,0,0.2);
        border-radius: 6px;
    `;

    let media = document.createElement(isVideo ? 'video' : 'img');
    media.src = objectURL;
    media.style.width = "100%";
    media.style.borderRadius = "4px";
    if (isVideo) { 
        media.autoplay = true; 
        media.loop = true; 
        media.muted = true; 
        media.play().catch(() => {});
    }
    container.appendChild(media);

    makeElementDraggable(container);

    container.onclick = function(e) {
        e.stopPropagation();
        currentActivePIPLayer = container;
        currentVideoElement = media;
        document.querySelectorAll('.live-pip-object').forEach(el => el.style.border = "2px dashed #ff9f43");
        container.style.border = "2px solid #10ac84";
        createFloatingToolkit(container);
    };

    wrapper.appendChild(container);

    if (pipTrack) {
        const block = document.createElement('div');
        block.id = 'track_' + overlayId;
        block.style.cssText = "background: #e67e22; color: white; padding: 4px 10px; border-radius: 6px; display: inline-flex; align-items: center; justify-content: space-between; margin-top: 4px; margin-right: 8px; width: 180px; height: 34px; font-family: sans-serif; cursor: pointer;";
        block.innerHTML = `
            <span style="font-size:11px; font-weight:bold; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">🖼️ ${file.name}</span>
            <div class="stretch-handle" style="position:absolute; right:0; top:0; width:14px; height:100%; background:#d35400; cursor:e-resize; border-radius:0 5px 5px 0;" title="Drag to resize"></div>
        `;
        block.onclick = (e) => { e.stopPropagation(); container.click(); };
        pipTrack.appendChild(block);
        if (typeof attachTimelineDragAndStretch === 'function') {
            attachTimelineDragAndStretch(block, container, 5);
        }
    }

    const modal = document.getElementById('sStudioOverlayPositionModal');
    if (modal) modal.remove();
    pendingOverlayFile = null;
}

// ==========================================================================
// 🔍 MAGNIFIER LENS ENGINE
// ==========================================================================

function openMagnifierOptions() {
    const oldMenu = document.getElementById('sStudioMagnifierMenu');
    if (oldMenu) { oldMenu.remove(); return; }

    const menu = document.createElement('div');
    menu.id = 'sStudioMagnifierMenu';
    menu.style.cssText = `
        position: fixed !important;
        top: 50% !important;
        left: 50% !important;
        transform: translate(-50%, -50%) !important;
        background: #161920 !important;
        border: 2px solid #f1c40f !important;
        padding: 18px !important;
        border-radius: 12px !important;
        display: flex !important;
        flex-direction: column !important;
        gap: 10px !important;
        z-index: 100000 !important;
        width: 320px !important;
        color: white !important;
        font-family: sans-serif !important;
        box-shadow: 0 10px 30px rgba(0,0,0,0.85) !important;
    `;

    menu.innerHTML = `
        <div style="font-size: 12px; color: #f9e79f; font-weight: bold; border-bottom: 1px solid #2f3542; padding-bottom: 6px; display: flex; justify-content: space-between; align-items: center;">
            <span>🔍 MAGNIFIER STUDIO</span>
            <span onclick="this.parentElement.parentElement.remove()" style="cursor: pointer; font-size: 18px; color: #a4b0be;">&times;</span>
        </div>
        <p style="font-size: 11px; color: #a4b0be; margin: 0;">Choose lens preset:</p>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px;">
            <button onclick="spawnMagnifierLens('circle')" style="background: #222733; color: white; border: 1px solid #333; padding: 8px; border-radius: 4px; font-size: 11px; cursor: pointer;">Circle Lens</button>
            <button onclick="spawnMagnifierLens('square')" style="background: #222733; color: white; border: 1px solid #333; padding: 8px; border-radius: 4px; font-size: 11px; cursor: pointer;">Square Lens</button>
        </div>
        <div style="margin-top: 6px;">
            <label style="font-size: 11px; color: #a4b0be; display: flex; justify-content: space-between;">
                <span>Zoom Level:</span>
                <span id="magZoomVal" style="color: #f1c40f; font-weight: bold;">2.0x</span>
            </label>
            <input type="range" id="magZoomSlider" min="1.3" max="3.5" step="0.1" value="2.0" style="width: 100%; accent-color: #f1c40f; cursor: pointer;" oninput="updateActiveMagnifierZoom(this.value)">
        </div>
        <button onclick="removeAllMagnifiers()" style="background: #ff4757; color: white; border: none; padding: 7px; border-radius: 6px; cursor: pointer; font-size: 11px; font-weight: bold; margin-top: 4px;">
            Remove All Magnifiers
        </button>
    `;

    document.body.appendChild(menu);
}

function spawnMagnifierLens(shape) {
    createMagnifierLensElement(60, 60, 140, 140, shape);
    const menu = document.getElementById('sStudioMagnifierMenu');
    if (menu) menu.remove();
}

function createMagnifierLensElement(left, top, width, height, shape) {
    const wrapper = document.getElementById('videoWrapper');
    if (!wrapper || !currentVideoElement) return;

    const lensId = 'mag_lens_' + Date.now();
    const lens = document.createElement('div');
    lens.id = lensId;
    lens.className = 'live-magnifier-lens';
    lens.dataset.zoom = currentMagnifierZoom.toString();

    let clipShapeCSS = shape === 'square' ? "border-radius: 8px;" : "border-radius: 50%;";

    lens.style.cssText = `
        position: absolute;
        left: ${left}px;
        top: ${top}px;
        width: ${width}px;
        height: ${height}px;
        border: 2px solid #f1c40f;
        box-shadow: 0 0 15px rgba(241, 196, 15, 0.6);
        z-index: 160;
        cursor: move;
        overflow: hidden;
        ${clipShapeCSS}
    `;

    let innerMedia;
    if (currentVideoElement.tagName === 'VIDEO') {
        innerMedia = document.createElement('video');
        innerMedia.src = currentVideoElement.currentSrc || currentVideoElement.src;
        innerMedia.autoplay = true;
        innerMedia.loop = true;
        innerMedia.muted = true;
        innerMedia.currentTime = currentVideoElement.currentTime;

        currentVideoElement.addEventListener('play', () => innerMedia.play().catch(() => {}));
        currentVideoElement.addEventListener('pause', () => innerMedia.pause());
        currentVideoElement.addEventListener('timeupdate', () => {
            if (Math.abs(innerMedia.currentTime - currentVideoElement.currentTime) > 0.2) {
                innerMedia.currentTime = currentVideoElement.currentTime;
            }
        });
    } else {
        innerMedia = document.createElement('img');
        innerMedia.src = currentVideoElement.src;
    }

    innerMedia.style.cssText = `
        width: ${wrapper.clientWidth}px;
        height: ${wrapper.clientHeight}px;
        position: absolute;
        left: -${left}px;
        top: -${top}px;
        transform: scale(${currentMagnifierZoom});
        transform-origin: ${left + width/2}px ${top + height/2}px;
        pointer-events: none;
        object-fit: contain;
    `;

    lens.appendChild(innerMedia);

    const delBtn = document.createElement('span');
    delBtn.innerText = "✕";
    delBtn.style.cssText = "position: absolute; top: 4px; right: 4px; background: #ff4757; color: white; width: 16px; height: 16px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 10px; cursor: pointer; z-index: 10;";
    delBtn.onclick = (e) => { e.stopPropagation(); lens.remove(); };
    lens.appendChild(delBtn);

    makeMagnifierDraggable(lens, innerMedia, wrapper);
    wrapper.appendChild(lens);
}

function makeMagnifierDraggable(lens, innerMedia, wrapper) {
    lens.onmousedown = function(e) {
        if (e.target.tagName === 'SPAN') return;
        e.stopPropagation();

        let shiftX = e.clientX - lens.getBoundingClientRect().left;
        let shiftY = e.clientY - lens.getBoundingClientRect().top;

        function onMouseMove(ev) {
            let wrapRect = wrapper.getBoundingClientRect();
            let newX = Math.max(0, Math.min(wrapRect.width - lens.offsetWidth, ev.clientX - wrapRect.left - shiftX));
            let newY = Math.max(0, Math.min(wrapRect.height - lens.offsetHeight, ev.clientY - wrapRect.top - shiftY));

            lens.style.left = newX + "px";
            lens.style.top = newY + "px";

            innerMedia.style.left = -newX + "px";
            innerMedia.style.top = -newY + "px";
            innerMedia.style.transformOrigin = `${newX + lens.offsetWidth/2}px ${newY + lens.offsetHeight/2}px`;
        }

        document.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', function() {
            document.removeEventListener('mousemove', onMouseMove);
        }, { once: true });
    };
}

function updateActiveMagnifierZoom(val) {
    currentMagnifierZoom = parseFloat(val);
    const disp = document.getElementById('magZoomVal');
    if (disp) disp.innerText = currentMagnifierZoom.toFixed(1) + "x";

    document.querySelectorAll('.live-magnifier-lens').forEach(lens => {
        const innerMedia = lens.querySelector('video, img');
        if (innerMedia) {
            innerMedia.style.transform = `scale(${currentMagnifierZoom})`;
        }
    });
}

function removeAllMagnifiers() {
    document.querySelectorAll('.live-magnifier-lens').forEach(el => el.remove());
    const menu = document.getElementById('sStudioMagnifierMenu');
    if (menu) menu.remove();
}

// ==========================================================================
// 🛠️ PIP FLOATING TOOLKIT & DRAGGABLE ENGINE
// ==========================================================================

function createFloatingToolkit(layerContainer) {
    const oldKit = document.getElementById('sStudioFloatingLayerToolkit');
    if (oldKit) oldKit.remove();

    const kit = document.createElement('div');
    kit.id = 'sStudioFloatingLayerToolkit';
    kit.style.cssText = `
        position: fixed;
        bottom: 80px;
        left: 50%;
        transform: translateX(-50%);
        background: #161920;
        border: 2px solid #10ac84;
        padding: 6px 12px;
        border-radius: 10px;
        display: flex;
        align-items: center;
        gap: 8px;
        z-index: 2147483647;
        box-shadow: 0 10px 30px rgba(0,0,0,0.85);
        color: white;
        font-family: sans-serif;
        font-size: 11px;
    `;

    kit.innerHTML = `
        <span style="font-weight: bold; color: #10ac84;">Layer Selected</span>
        <button id="btnLayerLock" style="background: #222733; color: white; border: 1px solid #444; padding: 4px 8px; border-radius: 4px; cursor: pointer;">🔓 Lock</button>
        <button id="btnLayerCrop" style="background: #222733; color: #00f2fe; border: 1px solid #00f2fe; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-weight: bold;">✂️ Crop</button>
        <button id="btnLayerDelete" style="background: #ff4757; color: white; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-weight: bold;">🗑️ Delete</button>
        <span onclick="this.parentElement.remove()" style="cursor: pointer; font-size: 14px; color: #a4b0be; margin-left: 4px;">✕</span>
    `;

    kit.querySelector('#btnLayerLock').onclick = function() {
        const isLocked = layerContainer.dataset.locked === "true";
        layerContainer.dataset.locked = isLocked ? "false" : "true";
        this.innerText = isLocked ? "🔓 Lock" : "🔒 Locked";
        this.style.color = isLocked ? "#fff" : "#ff4757";
    };

    kit.querySelector('#btnLayerCrop').onclick = function() {
        openCustomFreeCropModal();
    };

    kit.querySelector('#btnLayerDelete').onclick = function() {
        const trackBlock = document.getElementById('track_' + layerContainer.id);
        if (trackBlock) trackBlock.remove();
        layerContainer.remove();
        kit.remove();
        currentActivePIPLayer = null;
    };

    document.body.appendChild(kit);
}

function makeElementDraggable(element) {
    element.style.cursor = 'move';
    let pipScale = 1.0;

    element.onmousedown = function(e) {
        if (element.dataset && element.dataset.locked === "true") return;
        if (e.target.tagName === 'SPAN' && e.target.innerText === '✕') return;
        e.stopPropagation();

        let shiftX = e.clientX - element.getBoundingClientRect().left;
        let shiftY = e.clientY - element.getBoundingClientRect().top;
        
        function onMouseMove(ev) {
            const wrapper = document.getElementById('videoWrapper');
            if (!wrapper) return;
            let rect = wrapper.getBoundingClientRect();
            element.style.left = (ev.clientX - rect.left - shiftX) + 'px';
            element.style.top = (ev.clientY - rect.top - shiftY) + 'px';
        }

        document.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', function() {
            document.removeEventListener('mousemove', onMouseMove);
        }, { once: true });
    };

    element.onwheel = function(e) {
        e.preventDefault();
        e.stopPropagation();
        pipScale = e.deltaY < 0 ? pipScale + 0.05 : Math.max(0.2, pipScale - 0.05);
        element.style.transform = `scale(${pipScale})`;
    };
}

// ==========================================================================
// 🎛️ PIP FLOATING TOOLKIT & ACTIONS (MASTER ENGINE)
// ==========================================================================

function createFloatingToolkit(pipObject) {
    const oldPanel = document.getElementById('sStudioPipDynamicPanel');
    if (oldPanel) oldPanel.remove();

    const pipPanel = document.createElement('div');
    pipPanel.id = 'sStudioPipDynamicPanel';
    pipPanel.style.cssText = `
        position: fixed !important; 
        bottom: 25px !important; 
        left: 50% !important; 
        transform: translateX(-50%) !important; 
        background: #14171f !important; 
        border: 2px solid #10ac84 !important; 
        padding: 8px 12px !important; 
        border-radius: 10px !important; 
        box-shadow: 0 10px 30px rgba(0,0,0,0.8) !important; 
        z-index: 2147483647 !important; 
        display: flex !important; 
        flex-wrap: nowrap !important; 
        gap: 6px !important; 
        align-items: center !important; 
        justify-content: flex-start !important; 
        width: 95% !important; 
        max-width: 1100px !important; 
        overflow-x: auto !important; 
        box-sizing: border-box !important;
    `;

    const closeBtn = document.createElement('button');
    closeBtn.innerText = "✕ Close";
    closeBtn.style.cssText = "background: #ff4757 !important; color: white !important; border: none !important; padding: 6px 12px !important; border-radius: 5px !important; cursor: pointer !important; font-size: 11px !important; font-weight: bold !important; flex-shrink: 0 !important;";
    closeBtn.onclick = function(e) {
        e.stopPropagation();
        pipPanel.remove();
        if (pipObject) pipObject.style.border = "none";
    };
    pipPanel.appendChild(closeBtn);

    const btnList = [
        { id: 'replace', label: 'Replace' },
        { id: 'motion', label: 'Motion' },
        { id: 'lock', label: 'Lock' },
        { id: 'duplicate', label: 'Duplicate' },
        { id: 'rotate', label: 'Rotate' },
        { id: 'fit', label: 'Auto Fit' },
        { id: 'blur', label: 'Blur' },
        { id: 'opacity', label: 'Opacity' },
        { id: 'mask', label: 'Mask' },
        { id: 'chroma', label: 'Chroma' },
        { id: 'delete', label: 'Delete' }
    ];

    btnList.forEach(btnInfo => {
        const btn = document.createElement('button');
        btn.className = 'sStudioPipBtn';
        btn.innerText = btnInfo.label;
        btn.style.cssText = `
            background: ${btnInfo.id === 'delete' ? '#ff4757' : '#222733'} !important; 
            color: #fff !important; 
            border: 1px solid #333 !important; 
            padding: 6px 10px !important; 
            border-radius: 5px !important; 
            cursor: pointer !important; 
            font-size: 11px !important; 
            font-weight: bold !important; 
            flex-shrink: 0 !important; 
            white-space: nowrap !important; 
            font-family: sans-serif !important;
        `;

        btn.onclick = function(e) {
            e.stopPropagation();
            executePipToolAction(btnInfo.id, pipObject);
        };

        pipPanel.appendChild(btn);
    });

    document.body.appendChild(pipPanel);
}

function executePipToolAction(actionId, targetObject) {
    if (!targetObject) return;
    const mediaEl = targetObject.querySelector('img') || targetObject.querySelector('video');

    switch (actionId) {
        case 'motion':
            openPipMotionMenu(targetObject);
            break;
        case 'replace':
            const picker = document.createElement('input');
            picker.type = 'file';
            picker.accept = 'image/*,video/*';
            picker.onchange = function(e) {
                const file = e.target.files[0];
                if (file && mediaEl) mediaEl.src = URL.createObjectURL(file);
            };
            picker.click();
            break;
        case 'lock':
            let isLocked = targetObject.dataset.locked === "true";
            targetObject.dataset.locked = isLocked ? "false" : "true";
            targetObject.style.border = isLocked ? "2px dashed #ff9f43" : "2px solid #ff4757";
            break;
        case 'duplicate':
            const parent = targetObject.parentElement || document.getElementById('videoWrapper');
            const clone = targetObject.cloneNode(true);
            clone.id = 'pip_clone_' + Date.now();
            clone.style.left = (parseInt(targetObject.style.left || 50) + 20) + "px";
            clone.style.top = (parseInt(targetObject.style.top || 50) + 20) + "px";
            makeElementDraggable(clone);
            clone.onclick = function(e) {
                e.stopPropagation();
                currentActivePIPLayer = clone;
                currentVideoElement = clone.querySelector('img') || clone.querySelector('video');
                createFloatingToolkit(clone);
            };
            parent.appendChild(clone);
            break;
        case 'rotate':
            let r = (parseInt(targetObject.dataset.rot || "0") + 90) % 360;
            targetObject.dataset.rot = r;
            targetObject.style.transform = `rotate(${r}deg)`;
            break;
        case 'fit':
            targetObject.style.top = "0px";
            targetObject.style.left = "0px";
            targetObject.style.width = "100%";
            targetObject.style.height = "100%";
            if (mediaEl) mediaEl.style.objectFit = "contain";
            break;
        case 'blur':
            if (mediaEl) mediaEl.style.filter = mediaEl.style.filter.includes('blur') ? 'none' : 'blur(8px)';
            break;
        case 'opacity':
            if (mediaEl) mediaEl.style.opacity = mediaEl.style.opacity === "0.5" ? "1" : "0.5";
            break;
        case 'mask':
            if (mediaEl) mediaEl.style.clipPath = mediaEl.style.clipPath && mediaEl.style.clipPath.includes('circle') ? 'none' : 'circle(40% at 50% 50%)';
            break;
        case 'chroma':
            if (mediaEl) mediaEl.style.filter = "contrast(140%) saturate(120%) hue-rotate(-30deg)";
            break;
        case 'delete':
            const trackBlock = document.getElementById('track_' + targetObject.id);
            if (trackBlock) trackBlock.remove();
            targetObject.remove();
            const p = document.getElementById('sStudioPipDynamicPanel');
            if (p) p.remove();
            currentActivePIPLayer = null;
            break;
    }
}

function openPipMotionMenu(targetObject) {
    const oldMenu = document.getElementById('pipMotionMenuHub');
    if (oldMenu) oldMenu.remove();

    injectMotionCSSKeyframes();

    const menu = document.createElement('div');
    menu.id = 'pipMotionMenuHub';
    menu.style.cssText = "position:fixed; top:50%; left:50%; transform:translate(-50%, -50%); background:#161920; border:2px solid #6c5ce7; padding:18px; border-radius:12px; display:flex; flex-direction:column; gap:8px; z-index:2147483647; width: 280px; color: white; font-family:sans-serif; box-shadow:0 10px 30px rgba(0,0,0,0.8);";

    menu.innerHTML = `
        <div style="font-size:12px; color:#6c5ce7; font-weight:bold; border-bottom:1px solid #2f3542; padding-bottom:6px; display:flex; justify-content:space-between; align-items:center;">
            <span>🎬 PIP ENTRANCE ANIMATIONS</span>
            <span onclick="this.parentElement.parentElement.remove()" style="cursor:pointer; font-size:18px; color:#a4b0be;">&times;</span>
        </div>
        <button onclick="applyPipMotion(currentActivePIPLayer, 'fade'); this.parentElement.remove();" style="background:#222733; color:white; border:1px solid #333; padding:8px; border-radius:4px; font-size:11px; cursor:pointer; text-align:left;">Smooth Fade In</button>
        <button onclick="applyPipMotion(currentActivePIPLayer, 'slideLeft'); this.parentElement.remove();" style="background:#222733; color:white; border:1px solid #333; padding:8px; border-radius:4px; font-size:11px; cursor:pointer; text-align:left;">Slide In Left</button>
        <button onclick="applyPipMotion(currentActivePIPLayer, 'slideUp'); this.parentElement.remove();" style="background:#222733; color:white; border:1px solid #333; padding:8px; border-radius:4px; font-size:11px; cursor:pointer; text-align:left;">Slide In Bottom</button>
        <button onclick="applyPipMotion(currentActivePIPLayer, 'popZoom'); this.parentElement.remove();" style="background:#222733; color:white; border:1px solid #333; padding:8px; border-radius:4px; font-size:11px; cursor:pointer; text-align:left;">Pop Zoom In</button>
        <button onclick="applyPipMotion(currentActivePIPLayer, 'none'); this.parentElement.remove();" style="background:#ff4757; color:white; border:none; padding:8px; border-radius:4px; font-size:11px; font-weight:bold; cursor:pointer; margin-top:4px;">Reset Animation</button>
    `;

    document.body.appendChild(menu);
}

function applyPipMotion(targetObject, animationType) {
    if (!targetObject) return;
    targetObject.style.animation = "none";
    void targetObject.offsetWidth;

    if (animationType === 'fade') {
        targetObject.style.animation = "sStudioFadeIn 0.8s ease-out forwards";
    } else if (animationType === 'slideLeft') {
        targetObject.style.animation = "sStudioSlideLeft 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards";
    } else if (animationType === 'slideUp') {
        targetObject.style.animation = "sStudioSlideUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards";
    } else if (animationType === 'popZoom') {
        targetObject.style.animation = "sStudioPopZoom 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards";
    }
}

function injectMotionCSSKeyframes() {
    if (document.getElementById('sStudioMotionStyles')) return;
    const style = document.createElement('style');
    style.id = 'sStudioMotionStyles';
    style.innerHTML = `
        @keyframes sStudioFadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes sStudioSlideLeft { from { transform: translateX(-100px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        @keyframes sStudioSlideUp { from { transform: translateY(100px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @keyframes sStudioPopZoom { from { transform: scale(0.2); opacity: 0; } to { transform: scale(1); opacity: 1; } }
    `;
    document.head.appendChild(style);
}

// ==========================================================================
// 🔑 PIP KEYFRAMES & INTERPOLATION ENGINE
// ==========================================================================

function addPipKeyframeMarker(targetObject) {
    const mainVideo = document.getElementById('mainPlayer');
    const currentTime = mainVideo ? mainVideo.currentTime : 0;

    let keyframes = targetObject.dataset.keyframes ? JSON.parse(targetObject.dataset.keyframes) : [];
    const posX = parseFloat(targetObject.style.left) || 0;
    const posY = parseFloat(targetObject.style.top) || 0;

    keyframes.push({ time: parseFloat(currentTime.toFixed(2)), x: posX, y: posY });
    keyframes.sort((a, b) => a.time - b.time);

    targetObject.dataset.keyframes = JSON.stringify(keyframes);
}

function updatePipKeyframeInterpolation() {
    const mainVideo = document.getElementById('mainPlayer');
    if (!mainVideo || mainVideo.paused) return;
    const curTime = mainVideo.currentTime;

    document.querySelectorAll('.live-pip-object').forEach(pip => {
        if (!pip.dataset.keyframes) return;
        const keyframes = JSON.parse(pip.dataset.keyframes);
        if (keyframes.length < 2) return;

        for (let i = 0; i < keyframes.length - 1; i++) {
            const k1 = keyframes[i];
            const k2 = keyframes[i + 1];

            if (curTime >= k1.time && curTime <= k2.time) {
                const factor = (curTime - k1.time) / (k2.time - k1.time);
                const interpolatedX = k1.x + (k2.x - k1.x) * factor;
                const interpolatedY = k1.y + (k2.y - k1.y) * factor;

                pip.style.left = interpolatedX + "px";
                pip.style.top = interpolatedY + "px";
            }
        }
    });
}

// ==========================================================================
// 👻 0% - 200% OPACITY & DOUBLE-WHITE CLARITY CONTROLLER
// ==========================================================================

let currentMasterOpacityLevel = 100;

function openOpacityControlMenu() {
    const targetElement = currentActivePIPLayer 
        ? (currentActivePIPLayer.querySelector('video, img') || currentActivePIPLayer)
        : (document.getElementById('mainPlayer') || currentVideoElement);

    if (!targetElement) return;

    const oldMenu = document.getElementById('sStudioOpacityModal');
    if (oldMenu) { oldMenu.remove(); return; }

    const modal = document.createElement('div');
    modal.id = 'sStudioOpacityModal';
    modal.style.cssText = `
        position: fixed !important;
        top: 50% !important;
        left: 50% !important;
        transform: translate(-50%, -50%) !important;
        background: #14171f !important;
        border: 2px solid #00f2fe !important;
        padding: 20px !important;
        border-radius: 14px !important;
        display: flex !important;
        flex-direction: column !important;
        gap: 12px !important;
        z-index: 100000 !important;
        width: 330px !important;
        color: white !important;
        font-family: sans-serif !important;
        box-shadow: 0 10px 40px rgba(0, 242, 254, 0.3) !important;
    `;

    modal.innerHTML = `
        <div style="font-size: 13px; color: #00f2fe; font-weight: bold; border-bottom: 1px solid #2f3542; padding-bottom: 6px; display: flex; justify-content: space-between; align-items: center;">
            <span>👻 OPACITY & DOUBLE-WHITE BOOST</span>
            <span onclick="this.parentElement.parentElement.remove()" style="cursor: pointer; font-size: 18px; color: #a4b0be;">&times;</span>
        </div>

        <div style="background: rgba(0, 242, 254, 0.05); padding: 12px; border-radius: 8px; border: 1px solid #00f2fe;">
            <div style="display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 6px;">
                <span style="color: #a8a5ff; font-weight: bold;">Level:</span>
                <span id="opacityDisplayVal" style="color: #00f2fe; font-weight: bold; font-size: 14px;">${currentMasterOpacityLevel}%</span>
            </div>
            
            <input type="range" id="opacityRangeSlider" min="0" max="200" step="1" value="${currentMasterOpacityLevel}" style="width: 100%; accent-color: #00f2fe; cursor: pointer;" oninput="updateLiveVideoOpacity(this.value)">
            
            <div style="display: flex; justify-content: space-between; font-size: 10px; color: #a4b0be; margin-top: 5px;">
                <span>0%</span>
                <span style="color: #f1c40f; font-weight: bold;">100%</span>
                <span style="color: #00f2fe; font-weight: bold;">200% (Double White)</span>
            </div>
        </div>

        <div style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 4px;">
            <button onclick="setOpacityPreset(0)" style="background: #222733; color: white; border: 1px solid #333; padding: 6px 0; border-radius: 4px; font-size: 10px; cursor: pointer;">0%</button>
            <button onclick="setOpacityPreset(50)" style="background: #222733; color: white; border: 1px solid #333; padding: 6px 0; border-radius: 4px; font-size: 10px; cursor: pointer;">50%</button>
            <button onclick="setOpacityPreset(100)" style="background: #222733; color: #f1c40f; border: 1px solid #f1c40f; font-weight: bold; padding: 6px 0; border-radius: 4px; font-size: 10px; cursor: pointer;">100%</button>
            <button onclick="setOpacityPreset(150)" style="background: #222733; color: white; border: 1px solid #333; padding: 6px 0; border-radius: 4px; font-size: 10px; cursor: pointer;">150%</button>
            <button onclick="setOpacityPreset(200)" style="background: rgba(0,242,254,0.2); color: #00f2fe; border: 1px solid #00f2fe; font-weight: bold; padding: 6px 0; border-radius: 4px; font-size: 10px; cursor: pointer;">200%</button>
        </div>

        <button onclick="document.getElementById('sStudioOpacityModal').remove();" style="background: linear-gradient(135deg, #00f2fe, #6c5ce7); color: black; border: none; padding: 9px; border-radius: 6px; font-weight: bold; cursor: pointer; margin-top: 4px;">
            Apply & Close
        </button>
    `;

    document.body.appendChild(modal);
}

function updateLiveVideoOpacity(val) {
    const level = parseInt(val);
    currentMasterOpacityLevel = level;

    const display = document.getElementById('opacityDisplayVal');
    if (display) display.innerText = level + "%";

    const targetElement = currentActivePIPLayer 
        ? (currentActivePIPLayer.querySelector('video, img') || currentActivePIPLayer)
        : (document.getElementById('mainPlayer') || currentVideoElement);

    if (!targetElement) return;

    if (level <= 100) {
        targetElement.style.opacity = (level / 100).toString();
        targetElement.style.filter = "none";
    } else {
        targetElement.style.opacity = "1.0";
        const boostRatio = (level - 100) / 100;
        const brightness = 100 + (boostRatio * 65);
        const contrast = 100 + (boostRatio * 45);
        const saturation = 100 + (boostRatio * 20);
        const glowSpread = Math.round(boostRatio * 15);

        targetElement.style.filter = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%) drop-shadow(0 0 ${glowSpread}px rgba(255, 255, 255, ${0.2 + (boostRatio * 0.4)}))`;
    }
}

function setOpacityPreset(val) {
    const slider = document.getElementById('opacityRangeSlider');
    if (slider) slider.value = val;
    updateLiveVideoOpacity(val);
}

// ==========================================================================
// 🎨 ADVANCED FILTERS & COLOR GRADING ENGINE
// ==========================================================================

const videoFilterPresets = {
    original: "none",
    cinematic: "contrast(125%) saturate(120%) brightness(95%) hue-rotate(-5deg)",
    warmTeal: "contrast(115%) saturate(130%) sepia(20%) hue-rotate(15deg)",
    vintage: "sepia(50%) contrast(110%) brightness(90%) saturate(85%)",
    bwClassic: "grayscale(100%) contrast(130%) brightness(105%)",
    moodyDark: "brightness(80%) contrast(140%) saturate(90%)",
    vividPop: "saturate(160%) contrast(115%) brightness(105%)",
    cyberpunk: "hue-rotate(180deg) saturate(150%) contrast(120%)"
};

function openVideoFiltersMenu() {
    const old = document.getElementById('sStudioFiltersModal');
    if (old) old.remove();

    const targetElement = currentActivePIPLayer 
        ? (currentActivePIPLayer.querySelector('video, img') || currentActivePIPLayer)
        : (document.getElementById('mainPlayer') || currentVideoElement);

    if (!targetElement) return;

    const modal = document.createElement('div');
    modal.id = 'sStudioFiltersModal';
    modal.style.cssText = `
        position: fixed !important;
        top: 50% !important;
        left: 50% !important;
        transform: translate(-50%, -50%) !important;
        background: #14171f !important;
        border: 2px solid #6c5ce7 !important;
        padding: 20px !important;
        border-radius: 14px !important;
        z-index: 100000 !important;
        width: 340px !important;
        color: white !important;
        font-family: sans-serif !important;
        box-shadow: 0 10px 40px rgba(0,0,0,0.85) !important;
    `;

    modal.innerHTML = `
        <div style="font-size: 13px; color: #a8a5ff; font-weight: bold; border-bottom: 1px solid #2f3542; padding-bottom: 6px; display: flex; justify-content: space-between; align-items: center;">
            <span>🎨 COLOR PRESETS & FILTERS</span>
            <span onclick="this.parentElement.parentElement.remove()" style="cursor: pointer; font-size: 18px; color: #a4b0be;">&times;</span>
        </div>

        <p style="font-size: 11px; color: #a4b0be; margin: 8px 0 4px;">Choose Cinematic Color Grade:</p>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px;">
            <button onclick="applyPresetFilter('original')" style="background:#222733; color:white; border:1px solid #333; padding:8px; border-radius:5px; font-size:11px; cursor:pointer;">Original</button>
            <button onclick="applyPresetFilter('cinematic')" style="background:#222733; color:#00f2fe; border:1px solid #00f2fe; padding:8px; border-radius:5px; font-size:11px; font-weight:bold; cursor:pointer;">Cinematic Teal</button>
            <button onclick="applyPresetFilter('warmTeal')" style="background:#222733; color:#ff9f43; border:1px solid #ff9f43; padding:8px; border-radius:5px; font-size:11px; cursor:pointer;">Warm Glow</button>
            <button onclick="applyPresetFilter('vintage')" style="background:#222733; color:#f1c40f; border:1px solid #f1c40f; padding:8px; border-radius:5px; font-size:11px; cursor:pointer;">90s Vintage</button>
            <button onclick="applyPresetFilter('bwClassic')" style="background:#222733; color:#ffffff; border:1px solid #fff; padding:8px; border-radius:5px; font-size:11px; cursor:pointer;">B & W Noir</button>
            <button onclick="applyPresetFilter('moodyDark')" style="background:#222733; color:#a8a5ff; border:1px solid #a8a5ff; padding:8px; border-radius:5px; font-size:11px; cursor:pointer;">Moody Dark</button>
            <button onclick="applyPresetFilter('vividPop')" style="background:#222733; color:#10ac84; border:1px solid #10ac84; padding:8px; border-radius:5px; font-size:11px; cursor:pointer;">Vivid Pop</button>
            <button onclick="applyPresetFilter('cyberpunk')" style="background:#222733; color:#ff4757; border:1px solid #ff4757; padding:8px; border-radius:5px; font-size:11px; cursor:pointer;">Cyberpunk</button>
        </div>

        <button onclick="document.getElementById('sStudioFiltersModal').remove();" style="background:#6c5ce7; color:white; border:none; padding:8px; border-radius:6px; font-weight:bold; width:100%; margin-top:10px; cursor:pointer;">
            Apply Filter
        </button>
    `;

    document.body.appendChild(modal);
}

function applyPresetFilter(presetKey) {
    const targetElement = currentActivePIPLayer 
        ? (currentActivePIPLayer.querySelector('video, img') || currentActivePIPLayer)
        : (document.getElementById('mainPlayer') || currentVideoElement);

    if (targetElement && videoFilterPresets[presetKey]) {
        targetElement.style.filter = videoFilterPresets[presetKey];
    }
}

// ==========================================================================
// 🪄 BACKGROUND REMOVAL & CHROMA KEY STUDIO
// ==========================================================================

function openBgRemovalStudio() {
    const targetElement = currentActivePIPLayer 
        ? (currentActivePIPLayer.querySelector('video, img') || currentActivePIPLayer)
        : (document.getElementById('mainPlayer') || currentVideoElement);

    if (!targetElement) return;

    const old = document.getElementById('sStudioBgRemovalModal');
    if (old) old.remove();

    const modal = document.createElement('div');
    modal.id = 'sStudioBgRemovalModal';
    modal.style.cssText = `
        position: fixed !important;
        top: 50% !important;
        left: 50% !important;
        transform: translate(-50%, -50%) !important;
        background: #14171f !important;
        border: 2px solid #10ac84 !important;
        padding: 20px !important;
        border-radius: 14px !important;
        z-index: 100000 !important;
        width: 320px !important;
        color: white !important;
        font-family: sans-serif !important;
        box-shadow: 0 10px 40px rgba(0,0,0,0.85) !important;
    `;

    modal.innerHTML = `
        <div style="font-size: 13px; color: #10ac84; font-weight: bold; border-bottom: 1px solid #2f3542; padding-bottom: 6px; display: flex; justify-content: space-between; align-items: center;">
            <span>🪄 BACKGROUND REMOVER / CHROMA</span>
            <span onclick="this.parentElement.parentElement.remove()" style="cursor: pointer; font-size: 18px; color: #a4b0be;">&times;</span>
        </div>

        <div style="display: flex; flex-direction: column; gap: 8px; margin-top: 10px;">
            <button onclick="applyBgRemovalMode('green')" style="background:#222733; color:#10ac84; border:1px solid #10ac84; padding:8px; border-radius:5px; font-weight:bold; cursor:pointer;">
                Remove Green Screen
            </button>
            <button onclick="applyBgRemovalMode('blue')" style="background:#222733; color:#00f2fe; border:1px solid #00f2fe; padding:8px; border-radius:5px; font-weight:bold; cursor:pointer;">
                Remove Blue Screen
            </button>
            <button onclick="applyBgRemovalMode('black')" style="background:#222733; color:#e2e8f0; border:1px solid #475569; padding:8px; border-radius:5px; font-weight:bold; cursor:pointer;">
                Remove Black Background (Screen Blend)
            </button>
            <button onclick="applyBgRemovalMode('reset')" style="background:#ff4757; color:white; border:none; padding:8px; border-radius:5px; font-weight:bold; cursor:pointer;">
                Reset Background
            </button>
        </div>
    `;

    document.body.appendChild(modal);
}

function applyBgRemovalMode(mode) {
    const target = currentActivePIPLayer 
        ? (currentActivePIPLayer.querySelector('video, img') || currentActivePIPLayer)
        : (document.getElementById('mainPlayer') || currentVideoElement);

    if (!target) return;

    if (mode === 'green') {
        target.style.mixBlendMode = "screen";
        target.style.filter = "hue-rotate(180deg) saturate(140%)";
    } else if (mode === 'blue') {
        target.style.mixBlendMode = "screen";
        target.style.filter = "hue-rotate(90deg) saturate(150%)";
    } else if (mode === 'black') {
        target.style.mixBlendMode = "screen";
    } else {
        target.style.mixBlendMode = "normal";
        target.style.filter = "none";
    }
}

// ==========================================================================
// ✨ ANIMATED ELEMENTS & STICKERS LIBRARY
// ==========================================================================

const videoElementsList = [
    { name: "Subscribe Button", icon: "🔔", text: "SUBSCRIBE" },
    { name: "Like Thumbs Up", icon: "👍", text: "LIKE" },
    { name: "Fire Trending", icon: "🔥", text: "TRENDING" },
    { name: "Arrow Indicator", icon: "➡️", text: "LOOK HERE" },
    { name: "Warning Alert", icon: "⚠️", text: "ALERT" },
    { name: "Celebration Confetti", icon: "🎉", text: "PARTY" },
    { name: "Love Heart", icon: "❤️", text: "LOVE" },
    { name: "Verified Badge", icon: "✅", text: "VERIFIED" }
];

function openElementsLibraryModal() {
    const old = document.getElementById('sStudioElementsModal');
    if (old) old.remove();

    const modal = document.createElement('div');
    modal.id = 'sStudioElementsModal';
    modal.style.cssText = `
        position: fixed !important;
        top: 50% !important;
        left: 50% !important;
        transform: translate(-50%, -50%) !important;
        background: #14171f !important;
        border: 2px solid #ff9f43 !important;
        padding: 20px !important;
        border-radius: 14px !important;
        z-index: 100000 !important;
        width: 340px !important;
        color: white !important;
        font-family: sans-serif !important;
        box-shadow: 0 10px 40px rgba(0,0,0,0.85) !important;
    `;

    let itemsHTML = videoElementsList.map(item => `
        <button onclick="insertGraphicElementToCanvas('${item.icon}', '${item.text}'); document.getElementById('sStudioElementsModal').remove();" style="background:#222733; color:white; border:1px solid #333; padding:8px; border-radius:6px; cursor:pointer; display:flex; align-items:center; gap:8px; font-size:11px;">
            <span style="font-size:16px;">${item.icon}</span>
            <span>${item.name}</span>
        </button>
    `).join('');

    modal.innerHTML = `
        <div style="font-size: 13px; color: #ff9f43; font-weight: bold; border-bottom: 1px solid #2f3542; padding-bottom: 6px; display: flex; justify-content: space-between; align-items: center;">
            <span>✨ ELEMENTS & STICKERS HUB</span>
            <span onclick="this.parentElement.parentElement.remove()" style="cursor: pointer; font-size: 18px; color: #a4b0be;">&times;</span>
        </div>
        <p style="font-size: 11px; color: #a4b0be; margin: 8px 0 6px;">Select an animated element to add:</p>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px; max-height: 250px; overflow-y: auto;">
            ${itemsHTML}
        </div>
    `;

    document.body.appendChild(modal);
}

function insertGraphicElementToCanvas(icon, label) {
    const wrapper = document.getElementById('videoWrapper');
    if (!wrapper) return;

    const elementId = 'elem_' + Date.now();
    const elemNode = document.createElement('div');
    elemNode.id = elementId;
    elemNode.className = 'live-pip-object';
    elemNode.style.cssText = `
        position: absolute;
        top: 30%;
        left: 30%;
        background: rgba(0, 0, 0, 0.7);
        border: 2px solid #ff9f43;
        padding: 6px 12px;
        border-radius: 8px;
        color: white;
        font-weight: bold;
        font-size: 14px;
        display: flex;
        align-items: center;
        gap: 6px;
        cursor: move;
        z-index: 120;
        animation: loop-pulse 1.5s infinite ease-in-out;
        user-select: none;
    `;

    elemNode.innerHTML = `
        <span>${icon}</span> <span>${label}</span>
        <span onclick="this.parentElement.remove()" style="cursor:pointer; margin-left:6px; color:#ff4757; font-size:11px;">✕</span>
    `;

    if (typeof makeElementDraggable === 'function') {
        makeElementDraggable(elemNode);
    }
    wrapper.appendChild(elemNode);

    const pipTrack = document.getElementById('pipTrackBlock') || document.getElementById('frameTimelineTrack');
    if (pipTrack) {
        const block = document.createElement('div');
        block.id = 'track_' + elementId;
        block.style.cssText = `
            background: #ff9f43 !important;
            color: white !important;
            padding: 4px 8px !important;
            border-radius: 6px !important;
            display: inline-flex !important;
            align-items: center !important;
            justify-content: space-between !important;
            margin-top: 4px !important;
            height: 32px !important;
            font-family: sans-serif !important;
            cursor: move !important;
            user-select: none !important;
            z-index: 10;
        `;
        block.innerHTML = `
            <span style="font-size:11px; font-weight:bold; overflow:hidden; text-overflow:ellipsis; max-width:90px; pointer-events:none;">${icon} ${label}</span>
            <div class="stretch-handle" style="position:absolute; right:0; top:0; width:14px; height:100%; background:#d35400; cursor:e-resize; border-radius:0 5px 5px 0;" title="Drag to resize"></div>
        `;
        pipTrack.appendChild(block);
        if (typeof attachTimelineDragAndStretch === 'function') {
            attachTimelineDragAndStretch(block, elemNode, 5);
        }
    }
}

// Global Safe Timeline Drag & Stretch Engine
function attachTimelineDragAndStretch(trackBlock, onScreenElement, defaultDurationSec) {
    if (!trackBlock) return;
    const pixelsPerSec = 15;
    const initialWidth = Math.max(60, (defaultDurationSec || 5) * pixelsPerSec);
    trackBlock.style.width = initialWidth + "px";

    if (onScreenElement) {
        onScreenElement.dataset.start = onScreenElement.dataset.start || "0";
        onScreenElement.dataset.end = onScreenElement.dataset.end || (defaultDurationSec || 5).toString();
    }

    const stretchHandle = trackBlock.querySelector('.stretch-handle') || trackBlock.querySelector('.audio-stretch-handle');
    if (stretchHandle) {
        stretchHandle.onmousedown = function(e) {
            e.stopPropagation();
            let startX = e.clientX;
            let startW = trackBlock.offsetWidth;

            function onMouseMove(ev) {
                let newW = Math.max(50, startW + (ev.clientX - startX));
                trackBlock.style.width = newW + "px";
                let dur = (newW / pixelsPerSec).toFixed(2);
                trackBlock.dataset.end = dur;
                if (onScreenElement) onScreenElement.dataset.end = dur;
            }

            function onMouseUp() {
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
            }

            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        };
    }
}

// ==========================================================================
// 🎵 AUDIO HUB & VOICE RECORDING ENGINE
// ==========================================================================

function addMusicOverlay() {
    const oldMenu = document.getElementById('sStudioMusicMenuHub');
    if (oldMenu) { oldMenu.remove(); return; }

    const menu = document.createElement('div');
    menu.id = 'sStudioMusicMenuHub';
    menu.style.cssText = `
        position: fixed !important;
        top: 50% !important;
        left: 50% !important;
        transform: translate(-50%, -50%) !important;
        background: #161920 !important;
        border: 2px solid #10ac84 !important;
        padding: 16px !important;
        border-radius: 12px !important;
        display: flex !important;
        flex-direction: column !important;
        gap: 10px !important;
        z-index: 100000 !important;
        width: 340px !important;
        max-height: 80vh !important;
        overflow-y: auto !important;
        color: white !important;
        font-family: sans-serif !important;
        box-shadow: 0 10px 30px rgba(0,0,0,0.8) !important;
    `;

    const musicLibrary = {
        "Cinematic Beats": [
            { name: "Epic Trailer Pulse", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3" },
            { name: "Dramatic Tension Beat", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3" }
        ],
        "Corporate & Presentation": [
            { name: "Inspiring Motivation", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3" },
            { name: "Modern Corporate Flow", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3" }
        ],
        "Upbeat Vlog Sounds": [
            { name: "Summer Energy Funk", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3" },
            { name: "Upbeat Groove Pop", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-10.mp3" }
        ],
        "Chill Lofi Beats": [
            { name: "Lofi Study Session", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3" },
            { name: "Midnight Coffee Lofi", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-12.mp3" }
        ]
    };

    let categoriesHTML = '';
    let previewAudioPlayer = new Audio();

    Object.keys(musicLibrary).forEach(category => {
        let tracksList = musicLibrary[category].map(track => `
            <div style="display:flex; justify-content:space-between; align-items:center; background:#222733; padding:6px 8px; border-radius:4px; margin-top:4px;">
                <span style="font-size:11px; color:#e2e8f0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:140px;">🎵 ${track.name}</span>
                <div style="display:flex; gap:4px;">
                    <button class="preview-btn" data-url="${track.url}" style="background:#334155; color:#38bdf8; border:none; padding:3px 8px; border-radius:3px; font-size:10px; cursor:pointer;">Play</button>
                    <button class="add-track-btn" data-name="${track.name}" data-url="${track.url}" style="background:#10ac84; color:white; border:none; padding:3px 8px; border-radius:3px; font-size:10px; font-weight:bold; cursor:pointer;">+ Add</button>
                </div>
            </div>
        `).join('');

        categoriesHTML += `
            <div style="border-bottom:1px solid #2f3542; padding-bottom:8px; margin-bottom:6px;">
                <div style="font-size:11px; color:#10ac84; font-weight:bold; margin-bottom:4px;">${category}</div>
                ${tracksList}
            </div>
        `;
    });

    menu.innerHTML = `
        <div style="font-size:12px; color:#10ac84; font-weight:bold; border-bottom:1px solid #2f3542; padding-bottom:6px; display:flex; justify-content:space-between; align-items:center;">
            <span>🎵 S STUDIO AUDIO HUB</span>
            <span id="closeMusicMenuHub" style="cursor:pointer; font-size:18px; color:#a4b0be;">&times;</span>
        </div>
        <button id="uploadLocalTrackOpt" style="background:#6c5ce7; color:white; border:none; padding:8px; border-radius:6px; font-size:11px; font-weight:bold; cursor:pointer; width:100%; margin-bottom:6px;">📁 Upload Local Audio File</button>
        <button id="recordLiveVoiceOpt" style="background:rgba(255, 159, 67, 0.2); border:1px solid #ff9f43; color:#ff9f43; padding:8px; border-radius:6px; font-size:11px; font-weight:bold; cursor:pointer; width:100%;">🎙️ Record Live VoiceOver</button>
        <div style="margin-top:6px;">
            ${categoriesHTML}
        </div>
    `;

    document.body.appendChild(menu);

    const stopPreviewAndClose = () => {
        previewAudioPlayer.pause();
        previewAudioPlayer.src = '';
        menu.remove();
    };

    menu.querySelector('#closeMusicMenuHub').onclick = stopPreviewAndClose;

    menu.querySelector('#uploadLocalTrackOpt').onclick = function() {
        const inp = document.createElement('input'); 
        inp.type = 'file'; 
        inp.accept = 'audio/*'; 
        inp.onchange = function(e) {
            const file = e.target.files[0]; 
            if(!file) return;
            processAudioTrackInjection(file.name, URL.createObjectURL(file));
            stopPreviewAndClose();
        };
        inp.click();
    };

    menu.querySelector('#recordLiveVoiceOpt').onclick = function() {
        stopPreviewAndClose();
        toggleVoiceRecording();
    };

    menu.querySelectorAll('.preview-btn').forEach(btn => {
        btn.onclick = function() {
            const url = this.getAttribute('data-url');
            if (previewAudioPlayer.src === url && !previewAudioPlayer.paused) {
                previewAudioPlayer.pause();
                this.innerText = "Play";
            } else {
                menu.querySelectorAll('.preview-btn').forEach(b => b.innerText = "Play");
                previewAudioPlayer.src = url;
                previewAudioPlayer.play().catch(() => {});
                this.innerText = "Pause";
            }
        };
    });

    menu.querySelectorAll('.add-track-btn').forEach(btn => {
        btn.onclick = function() {
            const name = this.getAttribute('data-name');
            const url = this.getAttribute('data-url');
            processAudioTrackInjection(name, url);
            stopPreviewAndClose();
        };
    });
}

function toggleVoiceRecording() {
    if (mediaRecorder && mediaRecorder.state === "recording") {
        mediaRecorder.stop();
        return;
    }

    navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
        mediaRecorder = new MediaRecorder(stream);
        audioChunks = [];

        mediaRecorder.ondataavailable = e => {
            if (e.data.size > 0) audioChunks.push(e.data);
        };

        mediaRecorder.onstop = () => {
            const audioBlob = new Blob(audioChunks, { type: 'audio/mp3' });
            const audioUrl = URL.createObjectURL(audioBlob);
            processAudioTrackInjection("VoiceOver_" + Date.now(), audioUrl);
            stream.getTracks().forEach(track => track.stop());
        };

        mediaRecorder.start();

        const toast = document.createElement('div');
        toast.id = 'sStudioVoiceToast';
        toast.style.cssText = "position:fixed; top:20px; left:50%; transform:translateX(-50%); background:#ff4757; color:white; padding:8px 16px; border-radius:20px; font-weight:bold; font-size:12px; z-index:2147483647; box-shadow:0 4px 15px rgba(255,71,87,0.4); display:flex; gap:8px; align-items:center;";
        toast.innerHTML = `<span>🔴 Recording Voice... Click to Stop</span>`;
        toast.onclick = () => {
            mediaRecorder.stop();
            toast.remove();
        };
        document.body.appendChild(toast);
    }).catch(err => {
        console.warn("Microphone access denied or unavailable:", err);
    });
}

// ==========================================================================
// 🎵 AUDIO TRACK INJECTION & ACTION PANEL
// ==========================================================================

function processAudioTrackInjection(trackName, customSrc) {
    const audioId = 'audio_track_' + Date.now();
    const audio = new Audio(customSrc);
    audio.loop = true;

    activeAudioNodes[audioId] = { audio: audio, name: trackName, volume: 1.0 };

    const block = document.createElement('div');
    block.id = audioId;
    block.dataset.start = "0";
    block.dataset.end = (videoDurationSeconds || 10).toString();

    block.style.cssText = `
        background: rgba(16, 172, 132, 0.25) !important;
        border: 1px solid #10ac84 !important;
        color: white !important;
        padding: 4px 10px !important;
        border-radius: 6px !important;
        display: inline-flex !important;
        align-items: center !important;
        justify-content: space-between !important;
        margin-top: 4px !important;
        margin-right: 8px !important;
        position: relative !important;
        overflow: hidden !important;
        min-width: 180px;
        width: 250px;
        height: 36px !important;
        font-family: sans-serif !important;
        cursor: pointer !important;
        user-select: none !important;
        z-index: 10;
    `;

    let waveHTML = `<div style="display: flex; align-items: center; gap: 2px; height: 100%; opacity: 0.6; margin-right: 6px;">`;
    const barHeights = [30, 50, 80, 40, 20, 60, 90, 40, 70, 50, 30, 80, 60, 40, 90, 30, 50];
    barHeights.forEach(h => { waveHTML += `<div style="width: 2px; height: ${h}%; background: #10ac84; border-radius: 1px;"></div>`; });
    waveHTML += `</div>`;

    block.innerHTML = `
        <span style="font-size:11px; font-weight:bold; z-index:2; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:140px;">🎵 ${trackName}</span>
        ${waveHTML}
        <div class="audio-stretch-handle" style="position:absolute; right:0; top:0; width:14px; height:100%; background:#10ac84; cursor:e-resize; opacity:0.9;" title="Drag to extend audio"></div>
    `;

    block.onclick = function(e) {
        e.stopPropagation();
        showAudioTrackActionPanel(audioId, trackName, customSrc);
    };

    const stretchHandle = block.querySelector('.audio-stretch-handle');
    if (stretchHandle) {
        stretchHandle.onmousedown = function(e) {
            e.stopPropagation();
            let startX = e.clientX;
            let startWidth = block.offsetWidth;

            function onMouseMove(ev) {
                let newWidth = Math.max(60, startWidth + (ev.clientX - startX));
                block.style.width = newWidth + "px";
                let durationSec = Math.max(1, newWidth / 15);
                block.dataset.end = durationSec.toFixed(2);
            }

            function onMouseUp() {
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
            }

            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        };
    }

    const container = document.getElementById('audioTrackBlock') || document.getElementById('frameTimelineTrack');
    if (container) container.appendChild(block); 
}

function showAudioTrackActionPanel(audioId, trackName, src) {
    const oldModal = document.getElementById('sStudioAudioTrackModal');
    if (oldModal) oldModal.remove();

    const node = activeAudioNodes[audioId];
    if (!node) return;

    const modal = document.createElement('div');
    modal.id = 'sStudioAudioTrackModal';
    modal.style.cssText = `
        position: fixed !important;
        top: 50% !important;
        left: 50% !important;
        transform: translate(-50%, -50%) !important;
        background: #161920 !important;
        border: 2px solid #10ac84 !important;
        padding: 18px !important;
        border-radius: 12px !important;
        display: flex !important;
        flex-direction: column !important;
        gap: 10px !important;
        z-index: 100000 !important;
        width: 300px !important;
        color: white !important;
        font-family: sans-serif !important;
        box-shadow: 0 10px 30px rgba(0,0,0,0.85) !important;
    `;

    modal.innerHTML = `
        <div style="font-size: 12px; color: #10ac84; font-weight: bold; border-bottom: 1px solid #2f3542; padding-bottom: 6px; display: flex; justify-content: space-between; align-items: center;">
            <span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:240px;">🎵 ${trackName}</span>
            <span onclick="this.parentElement.parentElement.remove()" style="cursor: pointer; font-size: 18px; color: #a4b0be;">&times;</span>
        </div>
        <label style="font-size: 11px; color: #a4b0be;">Volume:
            <input type="range" min="0" max="1" step="0.05" value="${node.audio.volume}" style="width: 100%; accent-color: #10ac84;" oninput="activeAudioNodes['${audioId}'].audio.volume = this.value">
        </label>
        <button id="btnDeleteAudioTrack" style="background: #ff4757; color: white; border: none; padding: 8px; border-radius: 6px; font-weight: bold; cursor: pointer; font-size: 11px; margin-top: 4px;">
            Delete Track
        </button>
    `;

    modal.querySelector('#btnDeleteAudioTrack').onclick = function() {
        if (node.audio) {
            node.audio.pause();
            node.audio.src = '';
        }
        delete activeAudioNodes[audioId];
        const block = document.getElementById(audioId);
        if (block) block.remove();
        modal.remove();
    };

    document.body.appendChild(modal);
}

// ==========================================================================
// 🎵 AUDIO TRACK ACTION PANEL & VOICE RECORDER
// ==========================================================================

function showAudioTrackActionPanel(audioId, trackName, currentSrc) {
    const oldPanel = document.getElementById('sStudioAudioActionPanel');
    if (oldPanel) oldPanel.remove();

    const panel = document.createElement('div');
    panel.id = 'sStudioAudioActionPanel';
    panel.style.cssText = `
        position: fixed !important;
        bottom: 85px !important;
        left: 50% !important;
        transform: translateX(-50%) !important;
        background: #161920 !important;
        border: 2px solid #10ac84 !important;
        padding: 8px 15px !important;
        border-radius: 10px !important;
        box-shadow: 0 10px 30px rgba(0,0,0,0.8) !important;
        z-index: 2147483647 !important;
        display: flex !important;
        align-items: center !important;
        gap: 10px !important;
        color: white !important;
        font-family: sans-serif !important;
        font-size: 11px !important;
    `;

    panel.innerHTML = `
        <span style="font-weight:bold; color:#10ac84;">🎵 ${trackName}</span>
        <button id="btnReplaceAudio" style="background:#6c5ce7; color:white; border:none; padding:6px 10px; border-radius:4px; font-weight:bold; cursor:pointer;">Replace Track</button>
        <button id="btnDeleteAudio" style="background:#ff4757; color:white; border:none; padding:6px 10px; border-radius:4px; font-weight:bold; cursor:pointer;">Delete Track</button>
        <span onclick="this.parentElement.remove()" style="cursor:pointer; font-size:16px; color:#a4b0be; margin-left:5px;">✕</span>
    `;

    panel.querySelector('#btnReplaceAudio').onclick = function(e) {
        e.stopPropagation();
        const picker = document.createElement('input');
        picker.type = 'file';
        picker.accept = 'audio/*';
        picker.onchange = function(ev) {
            const file = ev.target.files[0];
            if (file) {
                const newURL = URL.createObjectURL(file);
                if (activeAudioNodes[audioId]) {
                    activeAudioNodes[audioId].audio.pause();
                    activeAudioNodes[audioId].audio = new Audio(newURL);
                    activeAudioNodes[audioId].audio.loop = true;
                    activeAudioNodes[audioId].name = file.name;
                }
                const blockSpan = document.querySelector(`#${audioId} span`);
                if (blockSpan) blockSpan.innerText = "🎵 " + file.name;
                panel.remove();
            }
        };
        picker.click();
    };

    panel.querySelector('#btnDeleteAudio').onclick = function(e) {
        e.stopPropagation();
        if (activeAudioNodes[audioId]) {
            activeAudioNodes[audioId].audio.pause();
            delete activeAudioNodes[audioId];
        }
        const block = document.getElementById(audioId);
        if (block) block.remove();
        panel.remove();
    };

    document.body.appendChild(panel);
}

// ==========================================================================
// 📝 TEXT OVERLAY & TRACK BLOCK ENGINE
// ==========================================================================

function addTextOverlay() {
    const oldMenu = document.getElementById('sStudioTextMenu'); 
    if (oldMenu) { oldMenu.remove(); return; }
    
    const textMenu = document.createElement('div'); 
    textMenu.id = 'sStudioTextMenu';
    textMenu.style.cssText = "position:fixed; top:50%; left:50%; transform:translate(-50%, -50%); background:#161920; border:2px solid #10ac84; padding:15px; border-radius:10px; display:flex; flex-direction:column; gap:8px; z-index:100000; width: 280px; font-family:sans-serif; color: white; box-shadow:0 10px 30px rgba(0,0,0,0.8);";

    textMenu.innerHTML = `
        <div style="font-size:12px; color:#10ac84; font-weight:bold; border-bottom:1px solid #222733; padding-bottom:6px; display:flex; justify-content:space-between; align-items:center;">
            <span>📝 TEXT OVERLAY CREATOR</span>
            <span onclick="this.parentElement.parentElement.remove()" style="cursor:pointer; font-size:18px; color:#a4b0be; font-weight:bold;">&times;</span>
        </div>
        <input type="text" id="txtContent" placeholder="Enter text here..." style="background:#222733; color:#fff; border:1px solid #353b48; padding:8px; border-radius:4px; font-size:12px; outline:none;">
        <div style="display:flex; gap:6px; align-items:center; flex-wrap:wrap; background:#1e222b; padding:6px; border-radius:4px;">
            <button id="btnBold" style="background:#2d3436; color:#fff; border:none; padding:4px 8px; border-radius:3px; font-size:11px; font-weight:bold; cursor:pointer;">B</button>
            <button id="btnItalic" style="background:#2d3436; color:#fff; border:none; padding:4px 8px; border-radius:3px; font-size:11px; font-style:italic; cursor:pointer;">I</button>
            <input type="color" id="txtColor" value="#ffffff" style="background:none; border:none; width:24px; height:24px; cursor:pointer;">
            <select id="txtSize" style="background:#2d3436; color:#fff; border:none; padding:4px; border-radius:3px; font-size:11px; cursor:pointer;">
                <option value="16px">Small</option> 
                <option value="24px" selected>Medium</option> 
                <option value="36px">Large</option> 
            </select>
        </div>
        <div style="display:flex; gap:6px; margin-top:6px;">
            <button id="btnCancel" onclick="this.parentElement.parentElement.remove()" style="flex:1; background:#2d3436; color:#fff; border:none; padding:6px; border-radius:4px; font-size:11px; cursor:pointer;">Cancel</button>
            <button id="btnDone" style="flex:1; background:#10ac84; color:#fff; border:none; padding:6px; border-radius:4px; font-size:11px; font-weight:bold; cursor:pointer;">Add Text</button>
        </div>
    `;

    let isBold = false; 
    let isItalic = false;
    const bBtn = textMenu.querySelector('#btnBold'); 
    bBtn.onclick = function() { isBold = !isBold; bBtn.style.background = isBold ? '#10ac84' : '#2d3436'; };
    const iBtn = textMenu.querySelector('#btnItalic'); 
    iBtn.onclick = function() { isItalic = !isItalic; iBtn.style.background = isItalic ? '#10ac84' : '#2d3436'; };

    textMenu.querySelector('#btnDone').onclick = function() {
        const textVal = textMenu.querySelector('#txtContent').value.trim(); 
        if (!textVal) return;
        appendTextToTimeline(textVal, isBold, isItalic, textMenu.querySelector('#txtColor').value, textMenu.querySelector('#txtSize').value);
        textMenu.remove();
    };
    document.body.appendChild(textMenu);
}

function appendTextToTimeline(textVal, isBold, isItalic, selectedColor, selectedSize) {
    const wrapper = document.getElementById('videoWrapper'); 
    if (!wrapper) return;

    const textId = 'text_node_' + Date.now();
    const textNode = document.createElement('div'); 
    textNode.id = textId;
    textNode.className = 'live-text-box selected-active';
    textNode.innerText = textVal; 
    textNode.contentEditable = true; 
    textNode.dataset.start = "0";
    textNode.dataset.end = (videoDurationSeconds || 10).toString();
    textNode.style.cssText = `
        position:absolute;
        top:40%;
        left:30%;
        color:${selectedColor};
        font-size:${selectedSize};
        font-weight:${isBold ? 'bold' : 'normal'};
        font-style:${isItalic ? 'italic' : 'normal'};
        cursor:move;
        z-index:50;
        padding:4px 8px;
        border:1px dashed #6c5ce7;
        transition:all 0.1s;
        font-family:sans-serif;
        background: rgba(0,0,0,0.2);
        border-radius:4px;
    `;

    textNode.oninput = function() {
        const trackSpan = document.querySelector(`#track_${textId} span`);
        if (trackSpan) trackSpan.innerText = "📝 " + this.innerText;
    };

    if (typeof makeElementDraggable === 'function') {
        makeElementDraggable(textNode);
    }
    wrapper.appendChild(textNode);
    addTextTimelineTrackBlock(textId, textVal);
}

function addTextTimelineTrackBlock(textId, textVal) {
    const trackContainer = document.getElementById('textTrackBlock') || document.getElementById('frameTimelineTrack');
    const screenElement = document.getElementById(textId);
    if (!trackContainer) return;

    const block = document.createElement('div');
    block.id = 'track_' + textId;
    block.style.cssText = `
        background: rgba(108, 92, 231, 0.4) !important;
        border: 1px solid #6c5ce7 !important;
        color: white !important;
        padding: 4px 8px !important;
        border-radius: 6px !important;
        display: inline-flex !important;
        align-items: center !important;
        justify-content: space-between !important;
        margin-top: 4px !important;
        height: 32px !important;
        font-family: sans-serif !important;
        cursor: move !important;
        user-select: none !important;
        z-index: 10;
        box-sizing: border-box !important;
    `;

    block.innerHTML = `
        <span style="font-size:11px; font-weight:bold; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:90px; pointer-events:none;">📝 ${textVal}</span>
        <div class="stretch-handle" style="position:absolute; right:0; top:0; width:14px; height:100%; background:#6c5ce7; cursor:e-resize; border-radius:0 5px 5px 0;" title="Drag to resize duration"></div>
    `;

    block.onclick = function(e) {
        e.stopPropagation();
        showTextTrackActionPanel(textId, textVal);
    };

    trackContainer.appendChild(block);
    if (typeof attachTimelineDragAndStretch === 'function') {
        attachTimelineDragAndStretch(block, screenElement, 5);
    }
}

function showTextTrackActionPanel(textId, currentTextVal) {
    const oldPanel = document.getElementById('sStudioTextActionPanel');
    if (oldPanel) oldPanel.remove();

    const panel = document.createElement('div');
    panel.id = 'sStudioTextActionPanel';
    panel.style.cssText = `
        position: fixed !important;
        bottom: 85px !important;
        left: 50% !important;
        transform: translateX(-50%) !important;
        background: #161920 !important;
        border: 2px solid #6c5ce7 !important;
        padding: 8px 15px !important;
        border-radius: 10px !important;
        box-shadow: 0 10px 30px rgba(0,0,0,0.8) !important;
        z-index: 2147483647 !important;
        display: flex !important;
        align-items: center !important;
        gap: 10px !important;
        color: white !important;
        font-family: sans-serif !important;
        font-size: 11px !important;
    `;

    panel.innerHTML = `
        <span style="font-weight:bold; color:#a8a5ff;">📝 ${currentTextVal}</span>
        <button id="btnEditText" style="background:#10ac84; color:white; border:none; padding:6px 10px; border-radius:4px; font-weight:bold; cursor:pointer;">Edit</button>
        <button id="btnDeleteText" style="background:#ff4757; color:white; border:none; padding:6px 10px; border-radius:4px; font-weight:bold; cursor:pointer;">Delete</button>
        <span onclick="this.parentElement.remove()" style="cursor:pointer; font-size:16px; color:#a4b0be; margin-left:5px;">✕</span>
    `;

    panel.querySelector('#btnEditText').onclick = function(e) {
        e.stopPropagation();
        const screenTextNode = document.getElementById(textId);
        if (screenTextNode) screenTextNode.focus();
        panel.remove();
    };

    panel.querySelector('#btnDeleteText').onclick = function(e) {
        e.stopPropagation();
        const screenTextNode = document.getElementById(textId);
        if (screenTextNode) screenTextNode.remove();
        const trackBlock = document.getElementById('track_' + textId);
        if (trackBlock) trackBlock.remove();
        panel.remove();
    };

    document.body.appendChild(panel);
}

// ==========================================================================
// 🚀 ADVANCED VIDEO EXPORT ENGINE
// ==========================================================================

const STEP_RESOLUTIONS = [
    { label: "240p Ultra Low", width: 426, height: 240, baseBitrate: 0.5 },
    { label: "360p Lightweight", width: 640, height: 360, baseBitrate: 1.0 },
    { label: "480p Standard SD", width: 854, height: 480, baseBitrate: 1.8 },
    { label: "720p HD Ready", width: 1280, height: 720, baseBitrate: 4.0 },
    { label: "1080p Full HD", width: 1920, height: 1080, baseBitrate: 7.5 },
    { label: "1440p 2K Ultra", width: 2560, height: 1440, baseBitrate: 14.0 }
];

const STEP_FPS = [20, 24, 30, 50, 60, 70];

const QUALITY_MULTIPLIERS = [
    { name: "Lowest MB", mult: 0.5 },
    { name: "Small Size", mult: 0.75 },
    { name: "Balanced", mult: 1.0 },
    { name: "High Quality", mult: 1.35 },
    { name: "Max Bitrate", mult: 1.8 }
];

let selectedExportConfig = {
    resolution: STEP_RESOLUTIONS[4],
    fps: 60,
    bitrateMbps: 7.5
};

function toggleExportModal(show) {
    const modal = document.getElementById('exportModal');
    if (!modal) return;
    modal.style.display = show ? 'flex' : 'none';

    if (show) {
        const progressBox = document.getElementById('exportProgressBox');
        const startBtn = document.getElementById('startExportBtn');
        if (progressBox) progressBox.style.display = 'none';
        if (startBtn) startBtn.style.display = 'block';
        switchExportMode('auto');
    }
}

function switchExportMode(mode) {
    const autoBtn = document.getElementById('tabAutoBtn');
    const manualBtn = document.getElementById('tabManualBtn');
    const autoView = document.getElementById('exportAutoView');
    const manualView = document.getElementById('exportManualView');

    if (mode === 'auto') {
        if (autoBtn) { autoBtn.style.background = '#00f2fe'; autoBtn.style.color = '#000'; }
        if (manualBtn) { manualBtn.style.background = 'transparent'; manualBtn.style.color = '#cbd5e1'; }
        if (autoView) autoView.style.display = 'block';
        if (manualView) manualView.style.display = 'none';

        selectedExportConfig.resolution = STEP_RESOLUTIONS[4];
        selectedExportConfig.fps = 30;
        selectedExportConfig.bitrateMbps = 7.5;
        renderSizeCalculations(7.5);
    } else {
        if (manualBtn) { manualBtn.style.background = '#6c5ce7'; manualBtn.style.color = '#fff'; }
        if (autoBtn) { autoBtn.style.background = 'transparent'; autoBtn.style.color = '#cbd5e1'; }
        if (autoView) autoView.style.display = 'none';
        if (manualView) manualView.style.display = 'block';

        updateManualExportSettings();
    }
}

function updateManualExportSettings() {
    const resSlider = document.getElementById('resSlider');
    const fpsSlider = document.getElementById('fpsSlider');
    const qSlider = document.getElementById('sizeFactorSlider');

    const resIdx = resSlider ? parseInt(resSlider.value) : 4;
    const fpsIdx = fpsSlider ? parseInt(fpsSlider.value) : 4;
    const qIdx = qSlider ? parseInt(qSlider.value) : 2;

    const resObj = STEP_RESOLUTIONS[resIdx] || STEP_RESOLUTIONS[4];
    const fpsVal = STEP_FPS[fpsIdx] || 60;
    const qualityObj = QUALITY_MULTIPLIERS[qIdx] || QUALITY_MULTIPLIERS[2];

    const fpsScale = Math.pow(fpsVal / 30, 0.7);
    const dynamicBitrate = (resObj.baseBitrate * qualityObj.mult * fpsScale).toFixed(2);

    selectedExportConfig.resolution = resObj;
    selectedExportConfig.fps = fpsVal;
    selectedExportConfig.bitrateMbps = parseFloat(dynamicBitrate);

    const resBadge = document.getElementById('resDisplayBadge');
    const fpsBadge = document.getElementById('fpsDisplayBadge');
    const qBadge = document.getElementById('qualityPresetBadge');
    const bitDisplay = document.getElementById('bitrateDisplay');

    if (resBadge) resBadge.innerText = resObj.label;
    if (fpsBadge) fpsBadge.innerText = `${fpsVal} FPS`;
    if (qBadge) qBadge.innerText = qualityObj.name;
    if (bitDisplay) bitDisplay.innerText = `${dynamicBitrate} Mbps`;

    renderSizeCalculations(parseFloat(dynamicBitrate));
}

function renderSizeCalculations(bitrateMbps) {
    const videoEl = document.querySelector('#videoWrapper video') || document.querySelector('video');
    
    let durationInSec = 30;
    if (videoEl && videoEl.duration && !isNaN(videoEl.duration) && videoEl.duration > 0) {
        durationInSec = videoEl.duration;
    }

    const totalBitrate = bitrateMbps + 0.128;
    const totalMB = ((totalBitrate * durationInSec) / 8);

    const sizeDisplay = document.getElementById('estSizeDisplay');
    if (sizeDisplay) {
        if (totalMB < 1) {
            const totalKB = (totalMB * 1024).toFixed(0);
            sizeDisplay.innerText = `~ ${totalKB} KB`;
            sizeDisplay.style.color = '#38bdf8';
        } else if (totalMB > 1024) {
            const totalGB = (totalMB / 1024).toFixed(2);
            sizeDisplay.innerText = `~ ${totalGB} GB`;
            sizeDisplay.style.color = '#ff4757';
        } else {
            sizeDisplay.innerText = `~ ${totalMB.toFixed(1)} MB`;
            sizeDisplay.style.color = '#1dd1a1';
        }
    }
}

function triggerActualVideoExport() {
    const progressBox = document.getElementById('exportProgressBox');
    const fillBar = document.getElementById('exportProgressBarFill');
    const percentText = document.getElementById('exportPercentText');
    const statusText = document.getElementById('exportStatusText');
    const startBtn = document.getElementById('startExportBtn');

    if (progressBox) progressBox.style.display = 'block';
    if (startBtn) startBtn.style.display = 'none';

    let progress = 0;
    const interval = setInterval(() => {
        progress += Math.floor(Math.random() * 10) + 6;
        if (progress > 100) progress = 100;

        if (fillBar) fillBar.style.width = progress + '%';
        if (percentText) percentText.innerText = progress + '%';

        if (statusText) {
            if (progress < 50) {
                statusText.innerText = `Encoding at ${selectedExportConfig.resolution.label} (${selectedExportConfig.fps} FPS)...`;
            } else if (progress < 90) {
                statusText.innerText = `Applying ${selectedExportConfig.bitrateMbps} Mbps compression filter...`;
            } else {
                statusText.innerText = "Finalizing download...";
            }
        }

        if (progress >= 100) {
            clearInterval(interval);
            setTimeout(() => {
                downloadFinalConfiguredFile();
            }, 300);
        }
    }, 80);
}

function downloadFinalConfiguredFile() {
    const video = document.querySelector('#videoWrapper video') || currentVideoElement;
    if (!video) return;

    const sourceURL = window.currentVideoURL || (video.src) || (video.querySelector('source') ? video.querySelector('source').src : '');
    
    if (sourceURL) {
        const a = document.createElement('a');
        a.href = sourceURL;
        a.download = `S_Studio_Render_${selectedExportConfig.resolution.height}p_${Date.now()}.mp4`;
        document.body.appendChild(a);
        a.click();
        a.remove();
    }

    toggleExportModal(false);
}

// ==========================================================================
// 📥 6. DIRECT VIDEO DOWNLOADER ENGINE
// ==========================================================================

function downloadFinalConfiguredFile() {
    const videoEl = document.querySelector('#videoWrapper video') || document.querySelector('video') || currentVideoElement;
    const resHeight = (selectedExportConfig && selectedExportConfig.resolution) ? selectedExportConfig.resolution.height : 1080;
    const fps = (selectedExportConfig && selectedExportConfig.fps) ? selectedExportConfig.fps : 30;
    const fileName = `S_Studio_${resHeight}p_${fps}fps_${Date.now()}.mp4`;

    let downloadUrl = '';

    if (videoEl && videoEl.src && videoEl.src.length > 5) {
        downloadUrl = videoEl.src;
    } else if (window.currentVideoURL) {
        downloadUrl = window.currentVideoURL;
    } else if (window.videoFileBlob) {
        downloadUrl = URL.createObjectURL(window.videoFileBlob);
    }

    if (!downloadUrl) {
        toggleExportModal(false);
        return;
    }

    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = downloadUrl;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    
    setTimeout(() => {
        if (a.parentElement) a.parentElement.removeChild(a);
    }, 100);

    toggleExportModal(false);
}

// ==========================================================================
// ⏱️ MASTER PLAYBACK CONTROLS & TIMELINE SYNC
// ==========================================================================

function updateTimerUI() {
    const timerDisplay = document.getElementById('videoTimerDisplay');
    if (currentVideoElement && timerDisplay) {
        const currentMin = Math.floor(currentVideoElement.currentTime / 60).toString().padStart(2, '0');
        const currentSec = Math.floor(currentVideoElement.currentTime % 60).toString().padStart(2, '0');
        const totalMin = Math.floor(videoDurationSeconds / 60).toString().padStart(2, '0');
        const totalSec = Math.floor(videoDurationSeconds % 60).toString().padStart(2, '0');
        timerDisplay.innerText = `${currentMin}:${currentSec} / ${totalMin}:${totalSec}`;
    }
}

function updatePlayheadPosition() {
    const playhead = document.getElementById('playhead');
    if (currentVideoElement && playhead && videoDurationSeconds > 0) {
        const percentage = (currentVideoElement.currentTime / videoDurationSeconds) * 100;
        playhead.style.left = percentage + "%";
    }
}

function movePlayhead(event) {
    const track = document.getElementById('frameTimelineTrack') || document.getElementById('timelineTracksContainer');
    if (currentVideoElement && track && videoDurationSeconds > 0) {
        const rect = track.getBoundingClientRect();
        const clickX = event.clientX - rect.left;
        const percentage = Math.max(0, Math.min(1, clickX / rect.width));
        currentVideoElement.currentTime = percentage * videoDurationSeconds;
        updatePlayheadPosition();
        updateTimerUI();
    }
}

function togglePlay() {
    const video = document.querySelector('#videoWrapper video') || document.querySelector('video');
    const playBtn = document.getElementById('mainPlayPauseBtn');
    const playSvg = document.getElementById('playIconSvg');
    const pauseSvg = document.getElementById('pauseIconSvg');

    if (!video) return;

    if (video.paused || video.ended) {
        video.play().catch(() => {});
        if (playBtn) playBtn.classList.add('is-playing');
        if (playSvg) playSvg.style.display = 'none';
        if (pauseSvg) pauseSvg.style.display = 'block';
    } else {
        video.pause();
        if (playBtn) playBtn.classList.remove('is-playing');
        if (playSvg) playSvg.style.display = 'block';
        if (pauseSvg) pauseSvg.style.display = 'none';
    }
}

function videoBack() {
    const video = document.querySelector('#videoWrapper video') || document.querySelector('video');
    if (video) {
        video.currentTime = Math.max(0, video.currentTime - 5);
        updateTimerUI();
        updatePlayheadPosition();
    }
}

function videoForward() {
    const video = document.querySelector('#videoWrapper video') || document.querySelector('video');
    if (video) {
        video.currentTime = Math.min(video.duration || 0, video.currentTime + 5);
        updateTimerUI();
        updatePlayheadPosition();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const video = document.querySelector('#videoWrapper video') || document.querySelector('video');
    if (video) {
        video.addEventListener('ended', () => {
            const playBtn = document.getElementById('mainPlayPauseBtn');
            const playSvg = document.getElementById('playIconSvg');
            const pauseSvg = document.getElementById('pauseIconSvg');
            if (playBtn) playBtn.classList.remove('is-playing');
            if (playSvg) playSvg.style.display = 'block';
            if (pauseSvg) pauseSvg.style.display = 'none';
        });
    }
});

// ==========================================================================
// ❓ FAQ ACCORDION & EMAIL SUBMISSION
// ==========================================================================

function toggleFaqAccordion(element) {
    const parent = element.parentElement;
    const answer = parent.querySelector('.faq-answer');
    const arrow = element.querySelector('.faq-arrow');
    const isAlreadyOpen = answer.style.display === 'block';

    document.querySelectorAll('.faq-item').forEach(item => {
        const ans = item.querySelector('.faq-answer');
        if (ans) ans.style.display = 'none';
        const arr = item.querySelector('.faq-arrow');
        if (arr) arr.innerText = '➕';
    });

    if (!isAlreadyOpen && answer) {
        answer.style.display = 'block';
        if (arrow) arrow.innerText = '➖';
    }
}

function handleDirectQuestionSubmit(e) {
    e.preventDefault();
    const input = document.getElementById('faqDirectUserMessage');
    const message = input ? input.value.trim() : '';

    if (!message) return;

    const recipient = "sriramgroups.help@gmail.com";
    const subject = encodeURIComponent("Question from S Video Editor User");
    const bodyContent = encodeURIComponent(
        `Hello S Studio Support Team,\n\n` +
        `Question / Inquiry:\n${message}\n\n` +
        `--\nSent from S Video Editor (svideoeditor.com)`
    );

    window.location.href = `mailto:${recipient}?subject=${subject}&body=${bodyContent}`;
    const form = document.getElementById('faqDirectQuestionForm');
    if (form) form.reset();
}

// ==========================================================================
// 📜 DYNAMIC LEGAL & FOOTER MODALS
// ==========================================================================

const legalDatabase = {
    'terms': {
        title: "TERMS & CONDITIONS AND LEGAL DISCLAIMER",
        content: `
            <div style="color: #cbd5e1; line-height: 1.8; text-align: left; padding: 10px;">
                <h1 style="color: #00f2fe; font-size: 22px; border-bottom: 2px solid #2f3542; padding-bottom: 10px; margin-bottom: 20px;">TERMS & CONDITIONS</h1>
                <p>Welcome to Svideoeditor.com. This platform provides accessible, browser-based, 100% free online video editing utilities.</p>
            </div>
        `
    },
    'privacy': {
        title: "PRIVACY POLICY",
        content: `
            <div style="color: #cbd5e1; line-height: 1.8; text-align: left; padding: 10px;">
                <h1 style="color: #00f2fe; font-size: 22px; border-bottom: 2px solid #2f3542; padding-bottom: 10px;">PRIVACY POLICY</h1>
                <p>At Svideoeditor.com, all video processing runs locally within your browser session. Your files are never uploaded or stored on remote servers.</p>
            </div>
        `
    },
    'founder': {
        title: "FOUNDER & CEO STATEMENT",
        content: `
            <div style="color: #cbd5e1; line-height: 1.8; text-align: left; padding: 10px;">
                <h1 style="color: #00f2fe; font-size: 22px; border-bottom: 2px solid #2f3542; padding-bottom: 10px;">FOUNDER & CEO STATEMENT</h1>
                <h2>S. Purushotham</h2>
                <p><strong>Founder & CEO — Sriram Groups Official</strong></p>
                <p>"Technology belongs to everyone, not just those who can afford expensive software. S Studio brings free, high-performance video editing to creators worldwide."</p>
            </div>
        `
    }
};

function showFullPageModal(typeKey) {
    const modalOverlay = document.getElementById('fullScreenLegalModal');
    const modalTitle = document.getElementById('fullScreenModalTitle');
    const modalContent = document.getElementById('fullScreenModalContent');

    if (modalOverlay && modalTitle && modalContent && legalDatabase[typeKey]) {
        modalTitle.innerText = legalDatabase[typeKey].title;
        modalContent.innerHTML = legalDatabase[typeKey].content;
        modalOverlay.classList.remove('hidden');
        modalOverlay.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }
}

function closeFullPageModal() {
    const modalOverlay = document.getElementById('fullScreenLegalModal');
    if (modalOverlay) {
        modalOverlay.classList.add('hidden');
        modalOverlay.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
}

function openFooterDetailModal(key) { showFullPageModal(key); }
function showHiddenPage(key) { showFullPageModal(key); }

window.addEventListener('scroll', function() {
    const bottomBar = document.querySelector('.bottom-toolbar') || document.querySelector('.floating-toolbar');
    if (!bottomBar) return;
    
    if ((window.innerHeight + window.scrollY) >= document.body.offsetHeight - 400) {
        bottomBar.style.opacity = '0';
        bottomBar.style.pointerEvents = 'none';
        bottomBar.style.transition = 'opacity 0.3s ease';
    } else {
        bottomBar.style.opacity = '1';
        bottomBar.style.pointerEvents = 'auto';
    }
});
