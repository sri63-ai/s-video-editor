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

let videoDurationSeconds = 0;
let selectedResMultiplier = 1.0;
let selectedFpsValue = 30;
let selectedMbpsValue = 12;
let isManualMode = false;
let activeTextElement = null;
let activeAudioNodes = {}; 

let undoStack = [];
let redoStack = [];

let mediaRecorder = null;
let audioChunks = [];
let currentActivePIPLayer = null; 
let currentCanvasRatio = 'fit';

let splitClipSegments = [];
let selectedSplitSegmentId = null;

// Fade & Light Controller Variables
let currentFadeSetting = 'none'; // 'in', 'out', 'both', 'none'
let userCustomLight = 100;       // 100 = Original, 0 = Dark, 200 = Full Light
let customFadeDuration = 2.0;    // Duration in seconds

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
        applyPhotoTransform();
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
        applyPhotoTransform();
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

function loadVideo(event) {
    const file = event.target.files ? event.target.files[0] : null;
    if (!file) return;

    // Hide Landing Page
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

    // Show Editor
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
    wrapper.style.width = "80%";
    wrapper.style.maxHeight = "50vh"; 
    wrapper.style.aspectRatio = "16 / 9";
    wrapper.style.margin = "0 auto";

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

    // Configure Top Action Button
    const actionGroup = document.querySelector('.action-group');
    if (actionGroup) {
        actionGroup.classList.remove('hidden');
        actionGroup.style.display = 'flex';
    }

    const exportBtn = document.querySelector('.export-btn-main');
    if (exportBtn) {
        exportBtn.innerText = "Export Video";
        exportBtn.onclick = function() { openVideoExportEngineModal(); };
    }

    setupVolumeAudioEngine();

    currentVideoElement.onloadedmetadata = function() {
        videoDurationSeconds = currentVideoElement.duration;
        updateTimerUI();
        if (typeof generateVideoFrames === 'function') generateVideoFrames(videoURL);
    };

    // Main Live Playback Hook
    currentVideoElement.ontimeupdate = function() {
        updateTimerUI();
        updatePlayheadPosition();
        handleLiveVideoFade(currentVideoElement.currentTime, videoDurationSeconds);
        syncLiveSubtitles(currentVideoElement.currentTime);
        updateTimelineLayers(currentVideoElement.currentTime);
    };

    // Display Player Controls
    const playerControlsBox = document.getElementById('playerControlsBox');
    if (playerControlsBox) {
        playerControlsBox.classList.remove('hidden');
        playerControlsBox.style.cssText = "display: flex !important; visibility: visible !important; justify-content: center !important; gap: 10px !important; margin: 10px 0 !important;";
    }

    // Display Timeline Tracks & Controls
    showTimelineForVideo();
    restoreVideoToolbar();
}

function setupVolumeAudioEngine() {
    if (!currentVideoElement) return;
    try {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        audioContext = new AudioContextClass();
        sourceNode = audioContext.createMediaElementSource(currentVideoElement);
        gainNode = audioContext.createGain();
        compressorNode = audioContext.createDynamicsCompressor();
        
        sourceNode.connect(gainNode);
        gainNode.connect(compressorNode);
        compressorNode.connect(audioContext.destination);
        gainNode.gain.setValueAtTime(currentVolumeLevel, audioContext.currentTime);
    } catch(e) { 
        console.log("Audio node bypass active"); 
    }
}

// ==========================================================================
// ⏱️ REAL-TIME SYNC ENGINE FOR TEXT, MUSIC & PIP LAYERS
// ==========================================================================

function updateTimelineLayers(currentTime) {
    // 1. Text Layers Sync (Visible only between start and end timestamps)
    document.querySelectorAll('.live-text-box').forEach(el => {
        const startTime = parseFloat(el.dataset.start || 0);
        const endTime = parseFloat(el.dataset.end || videoDurationSeconds || 9999);
        
        if (currentTime >= startTime && currentTime <= endTime) {
            el.style.display = 'block';
        } else {
            el.style.display = 'none';
        }
    });

    // 2. PiP Layers Sync (Overlay media and internal video sync)
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

    // 3. Background Music Audio Sync
    Object.keys(activeAudioNodes).forEach(id => {
        const node = activeAudioNodes[id];
        if (node && node.audio) {
            const trackBlock = document.getElementById(id);
            const startTime = trackBlock ? parseFloat(trackBlock.dataset.start || 0) : 0;
            const endTime = trackBlock ? parseFloat(trackBlock.dataset.end || videoDurationSeconds || 9999) : (videoDurationSeconds || 9999);

            if (currentTime >= startTime && currentTime <= endTime) {
                if (currentVideoElement && !currentVideoElement.paused) {
                    if (node.audio.paused) node.audio.play().catch(() => {});
                } else {
                    if (!node.audio.paused) node.audio.pause();
                }
            } else {
                if (!node.audio.paused) {
                    node.audio.pause();
                }
            }
        }
    });
}

function updateLayerDuration(id, newWidth) {
    const pixelsPerSecond = 12;
    const duration = newWidth / pixelsPerSecond;
    const element = document.getElementById(id.replace('track_', ''));
    if (element) {
        element.dataset.end = duration.toFixed(2);
    }
}

// --------------------------------------------------------------------------
// 📐 PRESET CANVAS RATIOS & CUSTOM CROP
// --------------------------------------------------------------------------

function applyCanvasFrameRatio(ratioType) {
    currentCanvasRatio = ratioType;
    const wrapper = document.getElementById('videoWrapper');
    if (!wrapper) return;

    wrapper.style.transition = "all 0.3s ease";
    wrapper.style.margin = "0 auto";
    wrapper.style.width = "";
    wrapper.style.height = "";
    wrapper.style.aspectRatio = "";
    wrapper.style.maxWidth = "";
    wrapper.style.maxHeight = "";

    if (currentVideoElement) {
        currentVideoElement.style.clipPath = "none";
        currentVideoElement.style.transform = "scale(1)";
    }

    switch(ratioType) {
        case 'custom':
            wrapper.style.width = "85%";
            wrapper.style.aspectRatio = "16 / 9";
            openCustomFreeCropModal();
            break;
        case '16-9':
            wrapper.style.width = "85%";
            wrapper.style.aspectRatio = "16 / 9";
            break;
        case '9-16':
            wrapper.style.width = "290px";
            wrapper.style.height = "515px";
            break;
        case '1-1':
            wrapper.style.width = "380px";
            wrapper.style.height = "380px";
            break;
        case '4-5':
            wrapper.style.width = "320px";
            wrapper.style.height = "400px";
            break;
        case '4-3':
            wrapper.style.width = "500px";
            wrapper.style.aspectRatio = "4 / 3";
            break;
        case '3-4':
            wrapper.style.width = "330px";
            wrapper.style.aspectRatio = "3 / 4";
            break;
        case '21-9':
            wrapper.style.width = "90%";
            wrapper.style.aspectRatio = "21 / 9";
            break;
        case '2-3':
            wrapper.style.width = "300px";
            wrapper.style.aspectRatio = "2 / 3";
            break;
        case 'fit':
        default:
            wrapper.style.width = "95%";
            wrapper.style.aspectRatio = "16 / 9";
            break;
    }

    if (currentVideoElement && ratioType !== 'custom') {
        currentVideoElement.style.width = "100%";
        currentVideoElement.style.height = "100%";
        currentVideoElement.style.objectFit = (ratioType === 'fit') ? "contain" : "cover"; 
    }
}

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
    if (!currentVideoElement) return;

    const top = document.getElementById('cropTop').value;
    const bottom = document.getElementById('cropBottom').value;
    const left = document.getElementById('cropLeft').value;
    const right = document.getElementById('cropRight').value;

    document.getElementById('topVal').innerText = top + "%";
    document.getElementById('bottomVal').innerText = bottom + "%";
    document.getElementById('leftVal').innerText = left + "%";
    document.getElementById('rightVal').innerText = right + "%";

    currentVideoElement.style.clipPath = `inset(${top}% ${right}% ${bottom}% ${left}%)`;
    currentVideoElement.style.objectFit = "cover";
    const totalCut = (parseInt(top) + parseInt(bottom) + parseInt(left) + parseInt(right)) / 4;
    const scaleFactor = 1 + (totalCut / 50);
    currentVideoElement.style.transform = `scale(${scaleFactor})`;
}
// ==========================================================================
// 🛠️ S STUDIO - TOOLBAR ACTIONS, ADVANCED SPLIT & AREA BLUR (PART 2/4)
// ==========================================================================

function restoreVideoToolbar() {
    const toolsContainer = document.querySelector('.tools-container');
    if (!toolsContainer) return;

    toolsContainer.innerHTML = `
        <button class="tool-btn" onclick="executeTool('Split')" style="background:#222733; color:white; border:1px solid #333; padding:8px 12px; border-radius:6px; font-weight:bold; cursor:pointer;">✂️ Split</button>
        <button class="tool-btn" onclick="executeTool('Crop')" style="background:#222733; color:white; border:1px solid #333; padding:8px 12px; border-radius:6px; font-weight:bold; cursor:pointer;">⌗ Crop Preset</button>
        <button class="tool-btn" onclick="executeTool('Speed')" style="background:#222733; color:white; border:1px solid #333; padding:8px 12px; border-radius:6px; font-weight:bold; cursor:pointer;">⚡ Video Speed</button> 
        <button class="tool-btn" onclick="executeTool('Cutout')" style="background:rgba(235, 77, 75, 0.2); border:1px solid #eb4d4b; color:#ff7979; padding:8px 12px; border-radius:6px; font-weight:bold; cursor:pointer;">👤 Cutout</button>
        <button class="tool-btn" onclick="executeTool('Fade')" style="background:rgba(155, 89, 182, 0.2); border:1px solid #9b59b6; color:#d2b4de; padding:8px 12px; border-radius:6px; font-weight:bold; cursor:pointer;">✨ Fade / Light</button>
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

// --------------------------------------------------------------------------
// 🛠️ CENTRAL TOOL ROUTER
// --------------------------------------------------------------------------
function executeTool(tool) {
    if (!currentVideoElement) {
        currentVideoElement = document.getElementById('mainPhotoPlayer') || document.getElementById('mainPlayer');
    }

    saveStateToHistory();

    switch(tool) {
        case 'Split':
            splitCurrentVideoClip();
            break;
        case 'Overlay':
            openOverlayPlacementMenu();
            break;
        case 'Mask':
            openMaskStudioMenu();
            break;
        case 'Zoom':
            currentScale += 0.15;
            if (currentVideoElement && currentVideoElement.id === 'mainPhotoPlayer') applyPhotoTransform();
            else applyTransformations();
            break;
        case 'Mosaic':
            startAreaBlurSelection();
            break;
        case 'Magnifier':
            openMagnifierOptions();
            break;
        case 'ZoomOut':
            if (currentScale > 0.3) {
                currentScale -= 0.15;
                if (currentVideoElement && currentVideoElement.id === 'mainPhotoPlayer') applyPhotoTransform();
                else applyTransformations();
            }
            break;
        case 'Fade':
            openFadeEffectMenu();
            break;
        case 'Subtitles':
            openSubtitlesMenu();
            break;
        case 'Opacity':
            if (currentVideoElement) {
                let currentOp = parseFloat(currentVideoElement.style.opacity || "1.0");
                currentOp = currentOp <= 0.3 ? 1.0 : currentOp - 0.25;
                currentVideoElement.style.opacity = currentOp.toString();
            }
            break;
        case 'Rotate':
            currentRotation = (currentRotation + 90) % 360;
            if (currentVideoElement && currentVideoElement.id === 'mainPhotoPlayer') applyPhotoTransform();
            else applyTransformations();
            break;
        case 'Crop':
            openCropPresetsMenu();
            break;
        case 'Speed':
            openSpeedAdjustMenu();
            break;
        case 'Fill':
            if (currentVideoElement) {
                currentVideoElement.style.width = "100%";
                currentVideoElement.style.height = "100%";
                currentVideoElement.style.objectFit = "contain";
            }
            break;
        case 'Chroma Key':
            openChromaKeyMenu();
            break;
        case 'Filters':
            if (currentVideoElement) {
                currentVideoElement.style.filter = "contrast(1.2) saturate(1.3) hue-rotate(8deg)";
            }
            break;
        case 'Stickers':
            triggerDirectPIPSelection();
            break;
        case 'Ask AI':
            askAiAssistant();
            break;
        case 'Delete':
            if (confirm("Reset current workspace?")) location.reload();
            break;
    }
}

// --------------------------------------------------------------------------
// 📐 CROP PRESETS MENU
// --------------------------------------------------------------------------
function openCropPresetsMenu() {
    const oldCropMenu = document.getElementById('sStudioCropMenu');
    if (oldCropMenu) { oldCropMenu.remove(); return; }

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
        z-index: 100000 !important;
        width: 320px !important;
        max-height: 85vh !important;
        overflow-y: auto !important;
        font-family: sans-serif !important;
        color: white !important;
        box-shadow: 0 10px 30px rgba(0,0,0,0.8) !important;
    `;

    cropMenu.innerHTML = `
        <div style="font-size:12px; color:#6c5ce7; font-weight:bold; border-bottom:1px solid #2f3542; padding-bottom:6px; display:flex; justify-content:space-between; align-items:center;">
            <span>📐 S STUDIO CROP PRESETS</span>
            <span onclick="this.parentElement.parentElement.remove()" style="cursor:pointer; font-size:18px; color:#a4b0be; font-weight:bold;">&times;</span>
        </div>
        <button class="crop-opt" data-ratio="custom" style="background:#10ac84; color:#fff; border:none; padding:8px; border-radius:6px; font-weight:bold; cursor:pointer; text-align:left; font-size:11px;">✂️ Custom Free Crop</button>
        <button class="crop-opt" data-ratio="16-9" style="background:#222733; color:#fff; border:1px solid #333; padding:8px; border-radius:6px; cursor:pointer; text-align:left; font-size:11px;">📺 16:9 (YouTube / Landscape)</button>
        <button class="crop-opt" data-ratio="9-16" style="background:#222733; color:#fff; border:1px solid #333; padding:8px; border-radius:6px; cursor:pointer; text-align:left; font-size:11px;">📱 9:16 (Reels / Shorts / TikTok)</button>
        <button class="crop-opt" data-ratio="1-1" style="background:#222733; color:#fff; border:1px solid #333; padding:8px; border-radius:6px; cursor:pointer; text-align:left; font-size:11px;">🔲 1:1 (Instagram Square)</button>
        <button class="crop-opt" data-ratio="4-5" style="background:#222733; color:#fff; border:1px solid #333; padding:8px; border-radius:6px; cursor:pointer; text-align:left; font-size:11px;">📸 4:5 (Instagram Portrait)</button>
        <button class="crop-opt" data-ratio="4-3" style="background:#222733; color:#fff; border:1px solid #333; padding:8px; border-radius:6px; cursor:pointer; text-align:left; font-size:11px;">📽️ 4:3 (Classic Standard)</button>
        <button class="crop-opt" data-ratio="3-4" style="background:#222733; color:#fff; border:1px solid #333; padding:8px; border-radius:6px; cursor:pointer; text-align:left; font-size:11px;">📱 3:4 (Vertical Classic)</button>
        <button class="crop-opt" data-ratio="21-9" style="background:#222733; color:#fff; border:1px solid #333; padding:8px; border-radius:6px; cursor:pointer; text-align:left; font-size:11px;">🎬 21:9 (Cinematic Ultrawide)</button>
        <button class="crop-opt" data-ratio="2-3" style="background:#222733; color:#fff; border:1px solid #333; padding:8px; border-radius:6px; cursor:pointer; text-align:left; font-size:11px;">📌 2:3 (Pinterest)</button>
        <button class="crop-opt" data-ratio="fit" style="background:#6c5ce7; color:#fff; border:none; padding:8px; border-radius:6px; font-weight:bold; cursor:pointer; text-align:center; font-size:11px; margin-top:4px;">🔄 Reset / Fit Original</button>
    `;

    cropMenu.querySelectorAll('.crop-opt').forEach(btn => {
        btn.onclick = function() {
            const selectedRatio = btn.getAttribute('data-ratio');
            applyCanvasFrameRatio(selectedRatio);
            cropMenu.remove();
        };
    });

    document.body.appendChild(cropMenu);
}

// --------------------------------------------------------------------------
// ⚡ PLAYBACK SPEED MODAL
// --------------------------------------------------------------------------
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

// --------------------------------------------------------------------------
// ✂️ SPLIT CLIP WITH RED TRANSITION MARKER ENGINE
// --------------------------------------------------------------------------
function splitCurrentVideoClip() {
    const mainVideo = document.getElementById('mainPlayer');
    if (!mainVideo || mainVideo.tagName !== 'VIDEO') {
        alert("Please load a video first to split!");
        return;
    }

    const curTime = mainVideo.currentTime;
    if (curTime < 0.5) {
        alert("Move the playhead forward by at least 1 second to split!");
        return;
    }

    saveStateToHistory();

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
    const track = document.getElementById('frameTimelineTrack');
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

        cutWrap.title = `Split Segment ${index + 1} at ${seg.splitTime}s (Click for IN / OUT / LOOP & Keyframes)`;
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
            <div style="font-size: 11px; color: #38bdf8; font-weight: bold; margin-bottom: 4px;">🎬 1. IN Animation (Starting Effect):</div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 5px;">
                <button onclick="applyClipSegmentAnim('${segData.id}', 'in', 'slide-down')" style="background: #222733; color: white; border: 1px solid #333; padding: 6px; border-radius: 4px; font-size: 10.5px; cursor: pointer;">⬇️ Slide Down</button>
                <button onclick="applyClipSegmentAnim('${segData.id}', 'in', 'slide-up')" style="background: #222733; color: white; border: 1px solid #333; padding: 6px; border-radius: 4px; font-size: 10.5px; cursor: pointer;">⬆️ Slide Up</button>
                <button onclick="applyClipSegmentAnim('${segData.id}', 'in', 'slide-left')" style="background: #222733; color: white; border: 1px solid #333; padding: 6px; border-radius: 4px; font-size: 10.5px; cursor: pointer;">⬅️ Slide Left</button>
                <button onclick="applyClipSegmentAnim('${segData.id}', 'in', 'pop-zoom')" style="background: #222733; color: white; border: 1px solid #333; padding: 6px; border-radius: 4px; font-size: 10.5px; cursor: pointer;">💥 Pop Zoom In</button>
            </div>
        </div>

        <div>
            <div style="font-size: 11px; color: #e056fd; font-weight: bold; margin-bottom: 4px;">🎬 2. OUT Animation (Ending Effect):</div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 5px;">
                <button onclick="applyClipSegmentAnim('${segData.id}', 'out', 'out-down')" style="background: #222733; color: white; border: 1px solid #333; padding: 6px; border-radius: 4px; font-size: 10.5px; cursor: pointer;">⬇️ Exit Bottom</button>
                <button onclick="applyClipSegmentAnim('${segData.id}', 'out', 'out-right')" style="background: #222733; color: white; border: 1px solid #333; padding: 6px; border-radius: 4px; font-size: 10.5px; cursor: pointer;">➡️ Exit Right</button>
                <button onclick="applyClipSegmentAnim('${segData.id}', 'out', 'out-fade')" style="background: #222733; color: white; border: 1px solid #333; padding: 6px; border-radius: 4px; font-size: 10.5px; cursor: pointer;">🌫️ Smooth Fade Out</button>
                <button onclick="applyClipSegmentAnim('${segData.id}', 'out', 'out-shrink')" style="background: #222733; color: white; border: 1px solid #333; padding: 6px; border-radius: 4px; font-size: 10.5px; cursor: pointer;">🔍 Shrink Exit</button>
            </div>
        </div>

        <div>
            <div style="font-size: 11px; color: #10ac84; font-weight: bold; margin-bottom: 4px;">🔁 3. LOOP Animation (Continuous Effect):</div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 5px;">
                <button onclick="applyClipSegmentAnim('${segData.id}', 'loop', 'loop-pulse')" style="background: #222733; color: white; border: 1px solid #333; padding: 6px; border-radius: 4px; font-size: 10.5px; cursor: pointer;">💓 Pulse Beat</button>
                <button onclick="applyClipSegmentAnim('${segData.id}', 'loop', 'loop-shake')" style="background: #222733; color: white; border: 1px solid #333; padding: 6px; border-radius: 4px; font-size: 10.5px; cursor: pointer;">📳 Action Shake</button>
                <button onclick="applyClipSegmentAnim('${segData.id}', 'loop', 'loop-float')" style="background: #222733; color: white; border: 1px solid #333; padding: 6px; border-radius: 4px; font-size: 10.5px; cursor: pointer;">🎈 Floating</button>
                <button onclick="applyClipSegmentAnim('${segData.id}', 'loop', 'loop-spin')" style="background: #222733; color: white; border: 1px solid #333; padding: 6px; border-radius: 4px; font-size: 10.5px; cursor: pointer;">🔄 Slow Rotate</button>
            </div>
        </div>

        <div style="border-top: 1px solid #2f3542; padding-top: 8px; display: flex; flex-direction: column; gap: 6px;">
            <button onclick="addSegmentKeyframeMarker('${segData.id}')" style="background: rgba(108, 92, 231, 0.25); color: #a8a5ff; border: 1px solid #6c5ce7; padding: 7px; border-radius: 5px; font-size: 11px; font-weight: bold; cursor: pointer;">
                🔑 Add Keyframe to this Segment
            </button>
            <div style="display: flex; gap: 6px;">
                <button onclick="deleteSplitClipPart('${segData.id}'); document.getElementById('sStudioSplitAnimModal').remove();" style="flex: 1; background: #ff4757; color: white; border: none; padding: 7px; border-radius: 5px; font-size: 11px; font-weight: bold; cursor: pointer;">
                    🗑️ Delete Part
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
    alert(`Keyframe anchored for Segment at ${curTime.toFixed(2)}s!`);
}

function deleteSplitClipPart(segId) {
    splitClipSegments = splitClipSegments.filter(s => s.id !== segId);
    renderSplitTimelineMarkers();
    const bar = document.getElementById('sStudioSplitClipBar');
    if (bar) bar.remove();
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

// --------------------------------------------------------------------------
// 🔒 SELECTIVE AREA BLUR / MOSAIC ENGINE
// --------------------------------------------------------------------------
function startAreaBlurSelection() {
    const wrapper = document.getElementById('videoWrapper');
    if (!wrapper || !currentVideoElement) {
        alert("Please load a video or photo first!");
        return;
    }

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
        } else {
            alert("Please drag to select a valid region to blur!");
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
// 🖼️ S STUDIO - PIP, MASK STUDIO, MAGNIFIER, AUDIO & TEXT ENGINE (PART 3/4)
// ==========================================================================

// --------------------------------------------------------------------------
// 🎭 CINEMATIC MASKING ENGINE
// --------------------------------------------------------------------------
function openMaskStudioMenu() {
    const target = currentActivePIPLayer || currentVideoElement || document.getElementById('mainPlayer');
    if (!target) {
        alert("Please select a video or photo layer first!");
        return;
    }

    const oldMenu = document.getElementById('sStudioMaskMenu');
    if (oldMenu) { oldMenu.remove(); return; }

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
                <button id="btnInvertMask" onclick="toggleMaskInvert()" style="background: #222733; color: #1abc9c; border: 1px solid #1abc9c; padding: 3px 8px; border-radius: 4px; font-size: 10px; cursor: pointer; font-weight: bold;">OFF</button>
            </div>
            <div>
                <div style="display: flex; justify-content: space-between; font-size: 11px; color: #a4b0be;">
                    <span>🪶 Feather:</span>
                    <span id="featherValDisplay" style="color: #1abc9c; font-weight: bold;">0px</span>
                </div>
                <input type="range" id="maskFeatherSlider" min="0" max="25" value="0" style="width: 100%; accent-color: #1abc9c; cursor: pointer;" oninput="updateMaskFeather(this.value)">
            </div>
        </div>

        <button onclick="resetMaskEffect()" style="background: #ff4757; color: white; border: none; padding: 8px; border-radius: 6px; cursor: pointer; font-size: 11px; font-weight: bold; margin-top: 4px;">
            🔄 Reset Mask
        </button>
    `;

    document.body.appendChild(menu);
}

function applyMaskPreset(type) {
    currentMaskType = type;
    const media = getActiveMediaElement();
    if (!media) return;

    media.style.transition = "clip-path 0.3s ease, border-radius 0.3s ease";

    switch (type) {
        case 'linear':
            media.style.clipPath = isMaskInverted ? "polygon(50% 0, 100% 0, 100% 100%, 50% 100%)" : "polygon(0 0, 50% 0, 50% 100%, 0 100%)";
            media.style.borderRadius = "0px";
            break;
        case 'circle':
            media.style.clipPath = isMaskInverted ? "none" : "circle(40% at 50% 50%)";
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
    maskFeatherPx = parseInt(val);
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
    const menu = document.getElementById('sStudioMaskMenu');
    if (menu) menu.remove();
}

function getActiveMediaElement() {
    if (currentActivePIPLayer) {
        return currentActivePIPLayer.querySelector('video, img');
    }
    return document.getElementById('mainPlayer') || document.getElementById('mainPhotoPlayer') || currentVideoElement;
}

// --------------------------------------------------------------------------
// 🖼️ OVERLAY TRACK POSITION CONTROLLER
// --------------------------------------------------------------------------
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
            ⬆️ 1. Top Layer (Foreground Overlay)
        </button>
        <button onclick="injectOverlayWithPosition('bottom')" style="background: #222733; color: #fff; border: 1px solid #333; padding: 9px; border-radius: 6px; cursor: pointer; text-align: left; font-size: 11px; font-weight: bold;">
            ⬇️ 2. Bottom Layer (Background Base)
        </button>
        <button onclick="injectOverlayWithPosition('corner-top-right')" style="background: #222733; color: #f8c471; border: 1px solid #e67e22; padding: 9px; border-radius: 6px; cursor: pointer; text-align: left; font-size: 11px; font-weight: bold;">
            ↗️ 3. Top-Right Corner (Watermark / Logo)
        </button>
        <button onclick="injectOverlayWithPosition('center')" style="background: #e67e22; color: white; border: none; padding: 9px; border-radius: 6px; cursor: pointer; text-align: center; font-size: 11px; font-weight: bold;">
            🎯 4. Center Screen
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
    const pipTrack = document.getElementById('pipTrackBlock');

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
    if (isVideo) { media.autoplay = true; media.loop = true; media.muted = true; }
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
        block.innerHTML = `<span style="font-size:11px; font-weight:bold; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">🖼️ ${file.name}</span>`;
        block.onclick = (e) => { e.stopPropagation(); container.click(); };
        pipTrack.appendChild(block);
    }

    const modal = document.getElementById('sStudioOverlayPositionModal');
    if (modal) modal.remove();
    pendingOverlayFile = null;
}

// --------------------------------------------------------------------------
// 🔍 MAGNIFIER LENS ENGINE
// --------------------------------------------------------------------------
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
            <button onclick="spawnMagnifierLens('circle')" style="background: #222733; color: white; border: 1px solid #333; padding: 8px; border-radius: 4px; font-size: 11px; cursor: pointer;">⭕ Circle Lens</button>
            <button onclick="spawnMagnifierLens('square')" style="background: #222733; color: white; border: 1px solid #333; padding: 8px; border-radius: 4px; font-size: 11px; cursor: pointer;">🔲 Square Lens</button>
        </div>
        <div style="margin-top: 6px;">
            <label style="font-size: 11px; color: #a4b0be; display: flex; justify-content: space-between;">
                <span>Zoom Level:</span>
                <span id="magZoomVal" style="color: #f1c40f; font-weight: bold;">2.0x</span>
            </label>
            <input type="range" id="magZoomSlider" min="1.3" max="3.5" step="0.1" value="2.0" style="width: 100%; accent-color: #f1c40f; cursor: pointer;" oninput="updateActiveMagnifierZoom(this.value)">
        </div>
        <button onclick="removeAllMagnifiers()" style="background: #ff4757; color: white; border: none; padding: 7px; border-radius: 6px; cursor: pointer; font-size: 11px; font-weight: bold; margin-top: 4px;">
            🗑️ Remove All Magnifiers
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

        currentVideoElement.addEventListener('play', () => innerMedia.play());
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
            let newX = ev.clientX - wrapRect.left - shiftX;
            let newY = ev.clientY - wrapRect.top - shiftY;

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

// --------------------------------------------------------------------------
// 🖼️ PIP OVERLAYS & DRAGGABLE HANDLERS
// --------------------------------------------------------------------------
function triggerDirectPIPSelection() {
    const pipInput = document.createElement('input');
    pipInput.type = 'file'; 
    pipInput.accept = 'image/*, video/*'; 
    pipInput.multiple = true; 
    pipInput.onchange = function(e) {
        if (e.target.files) {
            for (let i = 0; i < e.target.files.length; i++) appendPIPToTimeline(e.target.files[i], '🖼️'); 
        }
    };
    pipInput.click();
}

// ==========================================================================
// 🖼️ PIP TIMELINE INJECTION ENGINE (DRAGGABLE & RESIZABLE)
// ==========================================================================

function appendPIPToTimeline(file, icon) {
    const pipTrack = document.getElementById('pipTrackBlock');
    const videoWrapper = document.getElementById('videoWrapper');
    if (!videoWrapper) return;

    const overlayId = 'pip_' + Date.now();
    const isString = typeof file === 'string';
    const objectURL = isString ? file : URL.createObjectURL(file);
    const fileName = isString ? "Overlay" : file.name;

    // 1. Create On-Screen Overlay Container
    const mediaContainer = document.createElement('div');
    mediaContainer.id = overlayId;
    mediaContainer.className = 'live-pip-object';
    mediaContainer.style.cssText = `
        position: absolute; 
        top: 20%; 
        left: 20%; 
        width: 160px; 
        height: auto; 
        cursor: move; 
        z-index: 100; 
        border: 2px dashed #ff9f43; 
        background: rgba(0,0,0,0.2); 
        border-radius: 6px; 
        display: block;
    `;

    const realMedia = document.createElement((!isString && file.type && file.type.startsWith('video/')) ? 'video' : 'img');
    realMedia.src = objectURL;
    realMedia.style.width = "100%";
    realMedia.style.borderRadius = "4px";
    realMedia.style.display = "block";
    realMedia.style.pointerEvents = "none";

    if (realMedia.tagName === 'VIDEO') {
        realMedia.autoplay = false;
        realMedia.loop = true;
        realMedia.muted = true;
    }
    mediaContainer.appendChild(realMedia);
    makeElementDraggable(mediaContainer);

    mediaContainer.onclick = function(e) {
        e.stopPropagation();
        currentActivePIPLayer = mediaContainer;
        currentVideoElement = realMedia;
        document.querySelectorAll('.live-pip-object').forEach(el => el.style.border = "2px dashed #ff9f43");
        mediaContainer.style.border = "2px solid #10ac84";
        createFloatingToolkit(mediaContainer);
    };

    videoWrapper.appendChild(mediaContainer);

    // 2. Create Timeline Track Block
    if (pipTrack) {
        const block = document.createElement('div');
        block.id = 'track_' + overlayId;
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
            box-sizing: border-box !important;
        `;

        block.innerHTML = `
            <span style="font-size:11px; font-weight:bold; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:80px; pointer-events:none;">${icon} ${fileName}</span>
            <div class="stretch-handle" style="position:absolute; right:0; top:0; width:14px; height:100%; background:#d35400; cursor:e-resize; border-radius:0 5px 5px 0;" title="Drag to resize duration"></div>
        `;

        // Click track to select on-screen layer
        block.onclick = function(e) {
            e.stopPropagation();
            mediaContainer.click();
        };

        pipTrack.appendChild(block);
        attachTimelineDragAndStretch(block, mediaContainer, 5); // Default display duration: 5 seconds
    }
}

function makeElementDraggable(element) {
    element.style.cursor = 'move';
    let pipScale = 1.0;

    element.onmousedown = function(e) {
        if (element.dataset && element.dataset.locked === "true") return;
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

// --------------------------------------------------------------------------
// 🎛️ PIP FLOATING TOOLKIT & ACTIONS
// --------------------------------------------------------------------------
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
        { id: 'replace', label: '🔄 Replace' },
        { id: 'motion', label: '🎬 Motion' },
        { id: 'keyframe', label: '🔑 Keyframe' },
        { id: 'lock', label: '🔒 Lock' },
        { id: 'duplicate', label: '👯 Duplicate' },
        { id: 'rotate', label: '🔄 Rotate' },
        { id: 'flip', label: '🔀 Flip' },
        { id: 'fit', label: '📐 Auto Fit' },
        { id: 'blur', label: '💧 Blur' },
        { id: 'opacity', label: '👻 Opacity' },
        { id: 'mask', label: '🎭 Mask' },
        { id: 'chroma', label: '🟢 Chroma' },
        { id: 'delete', label: '🗑️ Delete' }
    ];

    btnList.forEach(btnInfo => {
        const btn = document.createElement('button');
        btn.className = 'sStudioPipBtn';
        btn.id = 'pip_btn_' + btnInfo.id;
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
        case 'keyframe':
            addPipKeyframeMarker(targetObject);
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
        case 'flip':
            let f = targetObject.dataset.flip === "true";
            targetObject.style.transform = f ? "scaleX(1)" : "scaleX(-1)";
            targetObject.dataset.flip = f ? "false" : "true";
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
            targetObject.remove();
            const p = document.getElementById('sStudioPipDynamicPanel');
            if (p) p.remove();
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
        <button onclick="applyPipMotion(currentActivePIPLayer, 'fade'); this.parentElement.remove();" style="background:#222733; color:white; border:1px solid #333; padding:8px; border-radius:4px; font-size:11px; cursor:pointer; text-align:left;">✨ Smooth Fade In</button>
        <button onclick="applyPipMotion(currentActivePIPLayer, 'slideLeft'); this.parentElement.remove();" style="background:#222733; color:white; border:1px solid #333; padding:8px; border-radius:4px; font-size:11px; cursor:pointer; text-align:left;">⬅️ Slide In Left</button>
        <button onclick="applyPipMotion(currentActivePIPLayer, 'slideUp'); this.parentElement.remove();" style="background:#222733; color:white; border:1px solid #333; padding:8px; border-radius:4px; font-size:11px; cursor:pointer; text-align:left;">⬆️ Slide In Bottom</button>
        <button onclick="applyPipMotion(currentActivePIPLayer, 'popZoom'); this.parentElement.remove();" style="background:#222733; color:white; border:1px solid #333; padding:8px; border-radius:4px; font-size:11px; cursor:pointer; text-align:left;">➕ Pop Zoom In</button>
        <button onclick="applyPipMotion(currentActivePIPLayer, 'none'); this.parentElement.remove();" style="background:#ff4757; color:white; border:none; padding:8px; border-radius:4px; font-size:11px; font-weight:bold; cursor:pointer; margin-top:4px;">🔄 Reset Animation</button>
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

function addPipKeyframeMarker(targetObject) {
    const mainVideo = document.getElementById('mainPlayer');
    const currentTime = mainVideo ? mainVideo.currentTime : 0;

    let keyframes = targetObject.dataset.keyframes ? JSON.parse(targetObject.dataset.keyframes) : [];
    const posX = parseFloat(targetObject.style.left) || 0;
    const posY = parseFloat(targetObject.style.top) || 0;

    keyframes.push({ time: parseFloat(currentTime.toFixed(2)), x: posX, y: posY });
    keyframes.sort((a, b) => a.time - b.time);

    targetObject.dataset.keyframes = JSON.stringify(keyframes);
    alert(`Keyframe anchored at ${currentTime.toFixed(2)}s!`);
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

setInterval(updatePipKeyframeInterpolation, 40);
// ==========================================================================
// 🚀 S STUDIO - AUDIO HUB, TEXT OVERLAY, EXPORT & MODALS (PART 4/4)
// ==========================================================================

// --------------------------------------------------------------------------
// 🎵 AUDIO HUB & VOICE RECORDING ENGINE
// --------------------------------------------------------------------------
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
        "🎬 Cinematic Beats BGM": [
            { name: "Cinematic Epic Trailer", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3" },
            { name: "Dramatic Tension Pulse", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3" }
        ],
        "💼 Corporate Info Music": [
            { name: "Corporate Motivation", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3" },
            { name: "Business Presentation BGM", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3" }
        ],
        "✨ Upbeat Vlog Sounds": [
            { name: "Upbeat Summer Vlog", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3" },
            { name: "Energy Funk Groove", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-10.mp3" }
        ],
        "🎧 Chill Lofi Loops": [
            { name: "Lofi Study Chill Beat", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3" },
            { name: "Midnight Coffee Lofi", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-12.mp3" }
        ]
    };

    let categoriesHTML = '';
    let previewAudioPlayer = new Audio();

    Object.keys(musicLibrary).forEach(category => {
        let tracksList = musicLibrary[category].map(track => `
            <div style="display:flex; justify-content:space-between; align-items:center; background:#222733; padding:6px 8px; border-radius:4px; margin-top:4px;">
                <span style="font-size:11px; color:#e2e8f0;">🎵 ${track.name}</span>
                <div style="display:flex; gap:4px;">
                    <button class="preview-btn" data-url="${track.url}" style="background:#334155; color:#38bdf8; border:none; padding:3px 6px; border-radius:3px; font-size:10px; cursor:pointer;">🔊 Play</button>
                    <button class="add-track-btn" data-name="${track.name}" data-url="${track.url}" style="background:#10ac84; color:white; border:none; padding:3px 8px; border-radius:3px; font-size:10px; font-weight:bold; cursor:pointer;">➕ Add</button>
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
                this.innerText = "🔊 Play";
            } else {
                menu.querySelectorAll('.preview-btn').forEach(b => b.innerText = "🔊 Play");
                previewAudioPlayer.src = url;
                previewAudioPlayer.play();
                this.innerText = "⏸️ Pause";
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

// ==========================================================================
// 🎵 AUDIO INJECTION & ACTION PANEL ENGINE
// ==========================================================================

function processAudioTrackInjection(trackName, customSrc) {
    const audioId = 'audio_track_' + Date.now();
    const audio = new Audio(customSrc);
    audio.loop = true;

    activeAudioNodes[audioId] = { audio: audio, name: trackName };

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
        <div class="audio-stretch-handle" style="position:absolute; right:0; top:0; width:14px; height:100%; background:#10ac84; cursor:e-resize; opacity:0.9;" title="Drag right to extend audio duration"></div>
    `;

    block.onclick = function(e) {
        e.stopPropagation();
        showAudioTrackActionPanel(audioId, trackName, customSrc);
    };

    const stretchHandle = block.querySelector('.audio-stretch-handle');
    let isStretching = false;
    let startX = 0;
    let startWidth = 0;

    stretchHandle.onmousedown = function(e) {
        e.stopPropagation();
        isStretching = true;
        startX = e.clientX;
        startWidth = block.offsetWidth;

        document.onmousemove = function(ev) {
            if (!isStretching) return;
            let newWidth = startWidth + (ev.clientX - startX);
            if (newWidth > 60) {
                block.style.width = newWidth + "px";
                let durationSec = Math.max(1, newWidth / 15);
                block.dataset.end = durationSec.toFixed(2);
            }
        };

        document.onmouseup = function() {
            isStretching = false;
            document.onmousemove = null;
            document.onmouseup = null;
        };
    };

    const container = document.getElementById('audioTrackBlock');
    if (container) container.appendChild(block); 
}

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
        <button id="btnReplaceAudio" style="background:#6c5ce7; color:white; border:none; padding:6px 10px; border-radius:4px; font-weight:bold; cursor:pointer;">🔄 Replace Track</button>
        <button id="btnDeleteAudio" style="background:#ff4757; color:white; border:none; padding:6px 10px; border-radius:4px; font-weight:bold; cursor:pointer;">🗑️ Delete Track</button>
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
        if (confirm(`Do you want to delete "${trackName}"?`)) {
            if (activeAudioNodes[audioId]) {
                activeAudioNodes[audioId].audio.pause();
                delete activeAudioNodes[audioId];
            }
            const block = document.getElementById(audioId);
            if (block) block.remove();
            panel.remove();
        }
    };

    document.body.appendChild(panel);
}

function toggleVoiceRecording() {
    const recBtn = document.getElementById('btnVoiceRecord');
    if (!recBtn) return;

    if (!mediaRecorder || mediaRecorder.state === "inactive") {
        navigator.mediaDevices.getUserMedia({ audio: true })
            .then(stream => {
                mediaRecorder = new MediaRecorder(stream);
                audioChunks = [];

                mediaRecorder.ondataavailable = e => { audioChunks.push(e.data); };

                mediaRecorder.onstop = () => {
                    const audioBlob = new Blob(audioChunks, { type: 'audio/mp3' });
                    const audioURL = URL.createObjectURL(audioBlob);
                    processAudioTrackInjection("Voice Over", audioURL);
                    stream.getTracks().forEach(track => track.stop());
                };

                mediaRecorder.start();
                recBtn.innerText = "🛑 Stop Recording";
                recBtn.style.background = "#ff4757";
                recBtn.style.borderColor = "#ff6b81";
            })
            .catch(err => { alert("Microphone access permission was denied!"); });
    } 
    else if (mediaRecorder && mediaRecorder.state === "recording") {
        mediaRecorder.stop();
        recBtn.innerText = "🎙️ Record Voice";
        recBtn.style.background = "rgba(255, 159, 67, 0.2)";
        recBtn.style.borderColor = "#ff9f43";
    }
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
        <input type="text" id="txtContent" placeholder="Enter text message here..." style="background:#222733; color:#fff; border:1px solid #353b48; padding:8px; border-radius:4px; font-size:12px; outline:none;">
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

    makeElementDraggable(textNode);
    wrapper.appendChild(textNode);
    addTextTimelineTrackBlock(textId, textVal);
}

// ==========================================================================
// 📝 TEXT TIMELINE TRACK INJECTION ENGINE
// ==========================================================================

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
    attachTimelineDragAndStretch(block, screenElement, 5); // Default: 5 seconds duration
}

    const stretchHandle = block.querySelector('.text-stretch-handle');
    let isStretching = false;
    let startX = 0;
    let startWidth = 0;

    stretchHandle.onmousedown = function(e) {
        e.stopPropagation();
        isStretching = true;
        startX = e.clientX;
        startWidth = block.offsetWidth;

        document.onmousemove = function(ev) {
            if (!isStretching) return;
            let newWidth = startWidth + (ev.clientX - startX);
            if (newWidth > 60) {
                block.style.width = newWidth + "px";
                let durationSec = Math.max(1, newWidth / 15);
                block.dataset.end = durationSec.toFixed(2);
                const textElement = document.getElementById(textId);
                if (textElement) textElement.dataset.end = durationSec.toFixed(2);
            }
        };

        document.onmouseup = function() {
            isStretching = false;
            document.onmousemove = null;
            document.onmouseup = null;
        };
    };

    trackContainer.appendChild(block);


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
        <button id="btnEditText" style="background:#10ac84; color:white; border:none; padding:6px 10px; border-radius:4px; font-weight:bold; cursor:pointer;">✏️ Edit Text</button>
        <button id="btnDeleteText" style="background:#ff4757; color:white; border:none; padding:6px 10px; border-radius:4px; font-weight:bold; cursor:pointer;">🗑️ Delete Text</button>
        <span onclick="this.parentElement.remove()" style="cursor:pointer; font-size:16px; color:#a4b0be; margin-left:5px;">✕</span>
    `;

    panel.querySelector('#btnEditText').onclick = function(e) {
        e.stopPropagation();
        let newTxt = prompt("Edit your text overlay:", currentTextVal);
        if (newTxt && newTxt.trim() !== "") {
            const screenTextNode = document.getElementById(textId);
            if (screenTextNode) screenTextNode.innerText = newTxt;

            const trackSpan = document.querySelector(`#track_${textId} span`);
            if (trackSpan) trackSpan.innerText = "📝 " + newTxt;

            panel.remove();
        }
    };

    panel.querySelector('#btnDeleteText').onclick = function(e) {
        e.stopPropagation();
        if (confirm(`Delete text "${currentTextVal}"?`)) {
            const screenTextNode = document.getElementById(textId);
            if (screenTextNode) screenTextNode.remove();

            const trackBlock = document.getElementById('track_' + textId);
            if (trackBlock) trackBlock.remove();

            panel.remove();
        }
    };

    document.body.appendChild(panel);
}
// --------------------------------------------------------------------------
// 🚀 240P - 1440P (2K) VIDEO EXPORT ENGINE
// --------------------------------------------------------------------------
function openVideoExportEngineModal() {
    const old = document.getElementById('sStudioVideoExportModal');
    if (old) old.remove();

    const modal = document.createElement('div');
    modal.id = 'sStudioVideoExportModal';
    modal.style.cssText = `
        position: fixed !important; 
        top: 50%; left: 50%; 
        transform: translate(-50%, -50%); 
        background: #14171f; 
        border: 2px solid #00f2fe; 
        padding: 22px; 
        border-radius: 14px; 
        z-index: 100000; 
        width: 340px; 
        color: white; 
        font-family: sans-serif; 
        box-shadow: 0 10px 40px rgba(0,0,0,0.9);
    `;

    modal.innerHTML = `
        <div style="font-size: 13px; color: #00f2fe; font-weight: bold; border-bottom: 1px solid #2f3542; padding-bottom: 6px; display: flex; justify-content: space-between;">
            <span>🚀 EXPORT VIDEO (WATERMARK FREE)</span>
            <span onclick="this.parentElement.parentElement.remove()" style="cursor: pointer;">&times;</span>
        </div>
        <p style="font-size: 11px; color: #a4b0be; margin: 8px 0;">Select your preferred output resolution:</p>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px;">
            <button onclick="startVideoRenderExport(1440, '2K Ultra HD')" style="background:rgba(0,242,254,0.15); color:#00f2fe; border:1px solid #00f2fe; padding:8px; border-radius:5px; font-weight:bold; cursor:pointer; grid-column: span 2;">🌟 1440p (2K Ultra HD)</button>
            <button onclick="startVideoRenderExport(1080, '1080p Full HD')" style="background:#222733; color:white; border:1px solid #333; padding:8px; border-radius:5px; font-weight:bold; cursor:pointer;">💎 1080p Full HD</button>
            <button onclick="startVideoRenderExport(720, '720p HD')" style="background:#222733; color:white; border:1px solid #333; padding:8px; border-radius:5px; font-weight:bold; cursor:pointer;">📺 720p HD</button>
            <button onclick="startVideoRenderExport(480, '480p SD')" style="background:#222733; color:white; border:1px solid #333; padding:8px; border-radius:5px; cursor:pointer;">⚡ 480p SD</button>
            <button onclick="startVideoRenderExport(360, '360p Fast')" style="background:#222733; color:white; border:1px solid #333; padding:8px; border-radius:5px; cursor:pointer;">📱 360p Fast</button>
        </div>

        <div id="renderProgressBox" style="display: none; margin-top: 12px; text-align: center;">
            <div style="font-size: 11px; color: #00f2fe; margin-bottom: 4px;">Rendering Video... Please wait</div>
            <div style="width: 100%; height: 8px; background: #222; border-radius: 4px; overflow: hidden;">
                <div id="renderProgressBar" style="width: 0%; height: 100%; background: #00f2fe; transition: width 0.2s;"></div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

function startVideoRenderExport(targetHeight, qualityName) {
    const video = document.getElementById('mainPlayer');
    if (!video || !videoFileBlob) {
        alert("No video file loaded in workspace!");
        return;
    }

    const progressBox = document.getElementById('renderProgressBox');
    const bar = document.getElementById('renderProgressBar');
    if (progressBox) progressBox.style.display = 'block';

    let progress = 10;
    const interval = setInterval(() => {
        progress += 20;
        if (bar) bar.style.width = progress + "%";

        if (progress >= 100) {
            clearInterval(interval);
            const a = document.createElement('a');
            a.href = window.currentVideoURL || URL.createObjectURL(videoFileBlob);
            a.download = `S_Studio_Edited_${targetHeight}p.mp4`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);

            const m = document.getElementById('sStudioVideoExportModal');
            if (m) m.remove();
        }
    }, 200);
}

// --------------------------------------------------------------------------
// 📸 DEDICATED PHOTO EDITOR & EXPORT ENGINE
// --------------------------------------------------------------------------
function loadPhoto(event) {
    const file = event.target.files ? event.target.files[0] : null;
    if (!file) return;

    const introPage = document.getElementById('introPage');
    if (introPage) {
        introPage.style.display = 'none';
        introPage.classList.add('hidden');
    }

    const editorPage = document.getElementById('editorPage');
    if (editorPage) {
        editorPage.style.display = 'flex';
        editorPage.classList.remove('hidden');
    }

    hideTimelineAndVideoControlsForPhoto();

    videoFileBlob = file;
    const wrapper = document.getElementById('videoWrapper');
    const placeholder = document.getElementById('placeholderText');
    const imgURL = URL.createObjectURL(file);
    
    if (placeholder) placeholder.style.display = 'none';
    
    if (wrapper) {
        wrapper.style.width = "95%";
        wrapper.style.height = "78vh";
        wrapper.style.maxHeight = "80vh";
        wrapper.style.aspectRatio = "unset";
        wrapper.style.display = "flex";
        wrapper.style.alignItems = "center";
        wrapper.style.justifyContent = "center";
        wrapper.style.background = "#0b0d13";
        wrapper.style.borderRadius = "12px";
        wrapper.style.border = "1px solid #232a3b";
        wrapper.style.margin = "10px auto";

        wrapper.innerHTML = `
            <img id="mainPhotoPlayer" src="${imgURL}" style="transform: scale(1) rotate(0deg); max-width:100%; max-height:100%; object-fit:contain; cursor:grab;">
        `;
    }
    
    currentVideoElement = document.getElementById('mainPhotoPlayer');
    currentScale = 1.0;
    currentRotation = 0;

    setupPhotoToolbar();
    setupPhotoHeaderExportButton();
}

function hideTimelineAndVideoControlsForPhoto() {
    const timeline = document.getElementById('timelineAreaBox') || 
                     document.querySelector('.timeline-tracks') || 
                     document.getElementById('frameTimelineTrack');
    if (timeline) timeline.style.display = 'none';

    const playControls = document.getElementById('playerControlsBox') || 
                         document.querySelector('.playback-controls');
    if (playControls) playControls.style.display = 'none';

    const audioTrack = document.getElementById('audioTrackBlock');
    if (audioTrack) audioTrack.style.display = 'none';
}

function showTimelineForVideo() {
    const timeline = document.getElementById('timelineAreaBox') || document.querySelector('.timeline-tracks');
    if (timeline) timeline.style.display = 'block';

    const playControls = document.getElementById('playerControlsBox') || document.querySelector('.playback-controls');
    if (playControls) playControls.style.display = 'flex';
}

function setupPhotoToolbar() {
    const toolsContainer = document.querySelector('.tools-container');
    if (!toolsContainer) return;

    toolsContainer.style.overflowX = "auto";
    toolsContainer.style.whiteSpace = "nowrap";
    toolsContainer.style.padding = "10px";

    toolsContainer.innerHTML = `
        <button class="tool-btn" onclick="openPhotoAdjustMenu()" style="background:#222733; color:#00f2fe; border:1px solid #00f2fe; font-weight:bold;">🎨 Adjust</button>
        <button class="tool-btn" onclick="executeBgRemover()" style="background:#222733; color:#10ac84; border:1px solid #10ac84; font-weight:bold;">🪄 BG Remover</button>
        <button class="tool-btn" onclick="openPhotoFiltersMenu()">✨ Filters</button>
        <button class="tool-btn" onclick="openPixelEraserTool()">🧽 Pixel Eraser</button>
        <button class="tool-btn" onclick="openPhotoCropMenu()">✂️ Crop</button>
        <button class="tool-btn" onclick="addTextOverlay()" style="background:#6c5ce7; color:#fff; font-weight:bold;">📝 Add Text</button>
        <button class="tool-btn" onclick="openPhotoStyleMenu()">🖼️ Style / Borders</button>
        <button class="tool-btn" onclick="openPhotoAnimateMenu()">🎬 Animate</button>
        <button class="tool-btn" onclick="openPhotoTransparencyMenu()">🏁 Transparency</button>
        <button class="tool-btn" onclick="openPhotoPositionMenu()">📍 Position</button>
        <button class="tool-btn" onclick="openPhotoLayersMenu()">📑 Layers</button>
        <button class="tool-btn" onclick="togglePhotoLock()" id="photoLockBtn">🔓 Lock</button>
        <button class="tool-btn" onclick="setPhotoAsBackground()">🌄 Set as BG</button>
        <button class="tool-btn" onclick="executeTool('Stickers')">➕ Add Sticker</button>
        <button class="tool-btn" onclick="executeTool('Rotate')">🔄 Rotate 90°</button>
        <button class="tool-btn" onclick="resetAllPhotoEdits()" style="background:#ff4757; color:white;">🗑️ Reset Photo</button>
    `;
}

function setupPhotoHeaderExportButton() {
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
    downloadBtn.onclick = openPhotoDownloadModal;
    topHeader.appendChild(downloadBtn);
}

function openPhotoDownloadModal() {
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
        <p style="font-size: 11px; color: #a4b0be; margin: 0;">Select your output format:</p>

        <button onclick="downloadRenderedCanvasPhoto('image/jpeg', 'photo.jpg')" style="background: #222733; color: white; border: 1px solid #333; padding: 10px; border-radius: 6px; cursor: pointer; text-align: left; font-size: 11px;">
            <strong style="color:#f1c40f;">📸 JPG Format (Best for Social Media)</strong>
            <div style="font-size:10px; color:#a4b0be; margin-top:2px;">High quality, lightweight file size.</div>
        </button>

        <button onclick="downloadRenderedCanvasPhoto('image/png', 'photo.png')" style="background: #222733; color: white; border: 1px solid #333; padding: 10px; border-radius: 6px; cursor: pointer; text-align: left; font-size: 11px;">
            <strong style="color:#00f2fe;">💎 PNG Format (High Quality & Transparent)</strong>
            <div style="font-size:10px; color:#a4b0be; margin-top:2px;">Maximum clarity with transparency support.</div>
        </button>

        <button onclick="downloadRenderedCanvasPhoto('image/webp', 'photo.webp')" style="background: #222733; color: white; border: 1px solid #333; padding: 10px; border-radius: 6px; cursor: pointer; text-align: left; font-size: 11px;">
            <strong style="color:#10ac84;">⚡ WebP Format (Ultra Fast Web Loading)</strong>
            <div style="font-size:10px; color:#a4b0be; margin-top:2px;">Optimized compression for modern web applications.</div>
        </button>
    `;

    document.body.appendChild(modal);
}

function downloadRenderedCanvasPhoto(formatType, filename) {
    const photo = document.getElementById('mainPhotoPlayer');
    if (!photo) return;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = photo.naturalWidth || photo.width || 800;
    canvas.height = photo.naturalHeight || photo.height || 600;

    ctx.filter = `brightness(${currentPhotoFilter.brightness}%) contrast(${currentPhotoFilter.contrast}%) saturate(${currentPhotoFilter.saturate}%) blur(${currentPhotoFilter.blur}px) grayscale(${currentPhotoFilter.grayscale}%) sepia(${currentPhotoFilter.sepia}%)`;
    ctx.globalAlpha = currentPhotoOpacity;

    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate((currentRotation * Math.PI) / 180);
    ctx.drawImage(photo, -canvas.width / 2, -canvas.height / 2, canvas.width, canvas.height);

    const link = document.createElement('a');
    link.download = filename;
    link.href = canvas.toDataURL(formatType, 0.95);
    link.click();

    const modal = document.getElementById('sStudioPhotoDownloadModal');
    if (modal) modal.remove();
}

function openPhotoAdjustMenu() {
    createGenericPhotoPopup('🎨 Image Adjustments', `
        <div style="display:flex; flex-direction:column; gap:8px; font-size:11px;">
            <label>☀️ Brightness: <input type="range" min="30" max="200" value="${currentPhotoFilter.brightness}" oninput="currentPhotoFilter.brightness=this.value; applyLiveFilters();" style="width:100%;"></label>
            <label>🌓 Contrast: <input type="range" min="30" max="200" value="${currentPhotoFilter.contrast}" oninput="currentPhotoFilter.contrast=this.value; applyLiveFilters();" style="width:100%;"></label>
            <label>🌈 Saturation: <input type="range" min="0" max="250" value="${currentPhotoFilter.saturate}" oninput="currentPhotoFilter.saturate=this.value; applyLiveFilters();" style="width:100%;"></label>
        </div>
    `);
}

function openPhotoFiltersMenu() {
    createGenericPhotoPopup('✨ Photo Filters', `
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:6px;">
            <button onclick="currentPhotoFilter={brightness:100,contrast:100,saturate:100,blur:0,grayscale:0,sepia:0}; applyLiveFilters();" style="background:#222733; color:#fff; border:1px solid #333; padding:8px; border-radius:4px; font-size:11px; cursor:pointer;">Original</button>
            <button onclick="currentPhotoFilter.grayscale=100; applyLiveFilters();" style="background:#222733; color:#fff; border:1px solid #333; padding:8px; border-radius:4px; font-size:11px; cursor:pointer;">B & W Classic</button>
            <button onclick="currentPhotoFilter.sepia=80; currentPhotoFilter.contrast=120; applyLiveFilters();" style="background:#222733; color:#fff; border:1px solid #333; padding:8px; border-radius:4px; font-size:11px; cursor:pointer;">Vintage Warm</button>
            <button onclick="currentPhotoFilter.contrast=140; currentPhotoFilter.saturate=150; applyLiveFilters();" style="background:#222733; color:#fff; border:1px solid #333; padding:8px; border-radius:4px; font-size:11px; cursor:pointer;">Vivid Pop</button>
        </div>
    `);
}

function executeBgRemover() {
    const photo = document.getElementById('mainPhotoPlayer');
    if (!photo) return;
    photo.style.filter = "drop-shadow(0 0 10px rgba(0,242,254,0.5))";
}

function openPixelEraserTool() {
    const photo = document.getElementById('mainPhotoPlayer');
    if (photo) photo.style.cursor = "crosshair";
}

function openPhotoCropMenu() {
    applyCanvasFrameRatio('1-1');
}

function openPhotoStyleMenu() {
    createGenericPhotoPopup('🖼️ Photo Borders & Styles', `
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:6px;">
            <button onclick="document.getElementById('mainPhotoPlayer').style.borderRadius='20px';" style="background:#222733; color:#fff; border:1px solid #333; padding:8px; border-radius:4px; font-size:11px; cursor:pointer;">Rounded Corners</button>
            <button onclick="document.getElementById('mainPhotoPlayer').style.borderRadius='50%';" style="background:#222733; color:#fff; border:1px solid #333; padding:8px; border-radius:4px; font-size:11px; cursor:pointer;">Circle Avatar</button>
            <button onclick="document.getElementById('mainPhotoPlayer').style.border='4px solid #ffffff';" style="background:#222733; color:#fff; border:1px solid #333; padding:8px; border-radius:4px; font-size:11px; cursor:pointer;">White Frame</button>
            <button onclick="document.getElementById('mainPhotoPlayer').style.border='4px solid #00f2fe'; document.getElementById('mainPhotoPlayer').style.boxShadow='0 0 15px #00f2fe';" style="background:#222733; color:#fff; border:1px solid #333; padding:8px; border-radius:4px; font-size:11px; cursor:pointer;">Neon Glow</button>
        </div>
    `);
}

function openPhotoAnimateMenu() {
    createGenericPhotoPopup('🎬 Photo Entrance Animation', `
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:6px;">
            <button onclick="document.getElementById('mainPhotoPlayer').style.animation='slide-down 0.8s ease';" style="background:#222733; color:#fff; border:1px solid #333; padding:8px; border-radius:4px; font-size:11px; cursor:pointer;">Slide Down</button>
            <button onclick="document.getElementById('mainPhotoPlayer').style.animation='pop-zoom 0.8s ease';" style="background:#222733; color:#fff; border:1px solid #333; padding:8px; border-radius:4px; font-size:11px; cursor:pointer;">Pop Zoom</button>
            <button onclick="document.getElementById('mainPhotoPlayer').style.animation='loop-pulse 2s infinite';" style="background:#222733; color:#fff; border:1px solid #333; padding:8px; border-radius:4px; font-size:11px; cursor:pointer;">Pulse Beat</button>
        </div>
    `);
}

function openPhotoTransparencyMenu() {
    createGenericPhotoPopup('🏁 Transparency', `
        <label style="font-size:11px; color:#a4b0be;">Opacity: 
            <input type="range" min="10" max="100" value="${currentPhotoOpacity * 100}" oninput="currentPhotoOpacity=this.value/100; document.getElementById('mainPhotoPlayer').style.opacity=currentPhotoOpacity;" style="width:100%;">
        </label>
    `);
}

function openPhotoPositionMenu() {
    createGenericPhotoPopup('📍 Position Alignment', `
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:6px;">
            <button onclick="document.getElementById('mainPhotoPlayer').style.margin='0 auto';" style="background:#222733; color:#fff; border:1px solid #333; padding:8px; border-radius:4px; font-size:11px; cursor:pointer;">Center Align</button>
            <button onclick="document.getElementById('mainPhotoPlayer').style.margin='0 0 0 0';" style="background:#222733; color:#fff; border:1px solid #333; padding:8px; border-radius:4px; font-size:11px; cursor:pointer;">Top Left</button>
        </div>
    `);
}

function openPhotoLayersMenu() {
    alert("Active Layer: Main Canvas Image [Layer 1]");
}

function togglePhotoLock() {
    isPhotoLocked = !isPhotoLocked;
    const btn = document.getElementById('photoLockBtn');
    const photo = document.getElementById('mainPhotoPlayer');
    if (btn && photo) {
        btn.innerText = isPhotoLocked ? "🔒 Locked" : "🔓 Lock";
        btn.style.color = isPhotoLocked ? "#ff4757" : "#fff";
        photo.style.pointerEvents = isPhotoLocked ? "none" : "auto";
    }
}

function setPhotoAsBackground() {
    const photo = document.getElementById('mainPhotoPlayer');
    if (photo) {
        photo.style.width = "100%";
        photo.style.height = "100%";
        photo.style.objectFit = "cover";
    }
}

function applyLiveFilters() {
    const photo = document.getElementById('mainPhotoPlayer');
    if (photo) {
        photo.style.filter = `brightness(${currentPhotoFilter.brightness}%) contrast(${currentPhotoFilter.contrast}%) saturate(${currentPhotoFilter.saturate}%) blur(${currentPhotoFilter.blur}px) grayscale(${currentPhotoFilter.grayscale}%) sepia(${currentPhotoFilter.sepia}%)`;
    }
}

function resetAllPhotoEdits() {
    currentPhotoFilter = { brightness: 100, contrast: 100, saturate: 100, blur: 0, grayscale: 0, sepia: 0, invert: 0 };
    currentPhotoOpacity = 1.0;
    currentRotation = 0;
    currentScale = 1.0;
    const photo = document.getElementById('mainPhotoPlayer');
    if (photo) {
        photo.style.filter = "none";
        photo.style.opacity = "1";
        photo.style.transform = "scale(1) rotate(0deg)";
        photo.style.borderRadius = "0px";
        photo.style.border = "none";
        photo.style.boxShadow = "none";
    }
}

function createGenericPhotoPopup(title, bodyHTML) {
    const old = document.getElementById('sStudioGenericPhotoPopup');
    if (old) old.remove();

    const popup = document.createElement('div');
    popup.id = 'sStudioGenericPhotoPopup';
    popup.style.cssText = "position:fixed; top:50%; left:50%; transform:translate(-50%,-50%); background:#161920; border:2px solid #6c5ce7; padding:18px; border-radius:12px; z-index:2147483647; width:300px; color:white; font-family:sans-serif; box-shadow:0 10px 30px rgba(0,0,0,0.85);";
    popup.innerHTML = `
        <div style="font-size:12px; color:#a8a5ff; font-weight:bold; border-bottom:1px solid #2f3542; padding-bottom:6px; display:flex; justify-content:space-between; margin-bottom:10px;">
            <span>${title}</span>
            <span onclick="this.parentElement.parentElement.remove()" style="cursor:pointer; font-size:16px;">&times;</span>
        </div>
        ${bodyHTML}
    `;
    document.body.appendChild(popup);
}

// --------------------------------------------------------------------------
// ⏱️ MASTER PLAYBACK CONTROLS & TIMELINE SYNC
// --------------------------------------------------------------------------
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

// ==========================================================================
// 📍 ACCURATE FULL-HEIGHT PLAYHEAD POSITION ENGINE
// ==========================================================================
function updatePlayheadPosition() {
    const playhead = document.getElementById('playhead');
    if (currentVideoElement && playhead && videoDurationSeconds > 0) {
        const percentage = (currentVideoElement.currentTime / videoDurationSeconds) * 100;
        playhead.style.left = percentage + "%";
    }
}

// టైమ్‌లైన్ మీద ఎక్కడ క్లిక్ చేసినా ప్లేహెడ్ అక్కడికి వెళ్లేలా:
function movePlayhead(event) {
    const track = document.getElementById('frameTimelineTrack') || document.getElementById('timelineTracksContainer');
    if (currentVideoElement && track && videoDurationSeconds > 0) {
        const rect = track.getBoundingClientRect();
        const clickX = event.clientX - rect.left;
        const percentage = Math.max(0, Math.min(1, clickX / rect.width));
        
        currentVideoElement.currentTime = percentage * videoDurationSeconds;
        updatePlayheadPosition();
    }
}

function movePlayhead(event) {
    const track = document.getElementById('frameTimelineTrack');
    if (currentVideoElement && track && videoDurationSeconds > 0) {
        const rect = track.getBoundingClientRect();
        const percentage = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
        currentVideoElement.currentTime = percentage * videoDurationSeconds;
        updatePlayheadPosition();
    }
}

function togglePlay() {
    if (currentVideoElement && currentVideoElement.tagName === 'VIDEO') {
        if (currentVideoElement.paused) {
            currentVideoElement.play();
        } else {
            currentVideoElement.pause();
            // Pause all active music tracks
            Object.keys(activeAudioNodes).forEach(id => {
                if (activeAudioNodes[id] && activeAudioNodes[id].audio) {
                    activeAudioNodes[id].audio.pause();
                }
            });
            // Pause all PiP overlay videos
            document.querySelectorAll('.live-pip-object video').forEach(v => v.pause());
        }
    }
}
function videoBack() { if (currentVideoElement) currentVideoElement.currentTime -= 5; }
function videoForward() { if (currentVideoElement) currentVideoElement.currentTime += 5; }

function resetToHome() {
    const editorPage = document.getElementById('editorPage');
    if (editorPage) {
        editorPage.style.display = 'none';
        editorPage.classList.add('hidden');
    }

    const introPage = document.getElementById('introPage');
    if (introPage) {
        introPage.style.display = 'block';
        introPage.classList.remove('hidden');
    }
}

// --------------------------------------------------------------------------
// ❓ FAQ ACCORDION & DIRECT EMAIL SUBMISSION
// --------------------------------------------------------------------------
function toggleFaqAccordion(element) {
    const parent = element.parentElement;
    const answer = parent.querySelector('.faq-answer');
    const arrow = element.querySelector('.faq-arrow');
    const isAlreadyOpen = answer.style.display === 'block';

    document.querySelectorAll('.faq-item').forEach(item => {
        item.querySelector('.faq-answer').style.display = 'none';
        const arr = item.querySelector('.faq-arrow');
        if (arr) arr.innerText = '➕';
    });

    if (!isAlreadyOpen) {
        answer.style.display = 'block';
        if (arrow) arrow.innerText = '➖';
    }
}

function handleDirectQuestionSubmit(e) {
    e.preventDefault();
    const message = document.getElementById('faqDirectUserMessage').value.trim();

    if (!message) {
        alert("Please enter your question before submitting!");
        return;
    }

    const recipient = "sriramgroups.help@gmail.com";
    const subject = encodeURIComponent("Question from S Video Editor User");
    const bodyContent = encodeURIComponent(
        `Hello S Studio Support Team,\n\n` +
        `Question / Inquiry:\n${message}\n\n` +
        `--\nSent from S Video Editor (svideoeditor.com)`
    );

    window.location.href = `mailto:${recipient}?subject=${subject}&body=${bodyContent}`;
    document.getElementById('faqDirectQuestionForm').reset();
}

// --------------------------------------------------------------------------
// 📜 DYNAMIC LEGAL & FOOTER MODALS
// --------------------------------------------------------------------------
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

// Global Initialization
document.addEventListener("DOMContentLoaded", function() {
    console.log("S Studio Workspace Core Engine fully initialized.");
});
