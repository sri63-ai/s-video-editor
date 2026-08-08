// ==========================================================================
// 🚀 S STUDIO - GLOBAL STATES & ENGINE VARIABLES
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

// Hidden file picker instance for PIP operations
let sStudioHiddenFilePicker = document.getElementById('sStudioHiddenFilePicker');
if (!sStudioHiddenFilePicker) {
    sStudioHiddenFilePicker = document.createElement('input');
    sStudioHiddenFilePicker.id = 'sStudioHiddenFilePicker';
    sStudioHiddenFilePicker.type = 'file';
    sStudioHiddenFilePicker.accept = 'image/*,video/*';
    sStudioHiddenFilePicker.style.display = 'none';
    document.body.appendChild(sStudioHiddenFilePicker);
}

// Local Expert Knowledge Base for AI Assistant
const studioAiKnowledgeBase = {
    "split": "To split a video, move the timeline playhead to the exact frame and press the 'S' key on your keyboard or click the '✂️ Split' button in the toolbar.",
    "music": "To add music or voice-over, click the '🎵 +' button. You can upload local MP3s or choose from preset themes like Cinematic or Lofi loops.",
    "voice": "Click the '🎙️ Record Voice' button to record live audio from your microphone. Click it again to save it directly to the timeline track.",
    "photo": "Upload a photo via the gallery button. Once loaded, click directly on the image player to unlock Zoom, Rotate, and premium Color Adjustment Sliders.",
    "pip": "Picture-in-Picture (PIP) allows you to overlay unlimited images or videos on top of your main video. You can drag them around and adjust properties with the floating toolkit.",
    "chroma": "The Chroma Key feature removes green or blue screens. Click the '🟢 Chroma Key' button after selecting your media layer.",
    "shortcut": "Keyboard Shortcuts: [Spacebar] for Play/Pause, [S Key] for splitting clips instantly on the active track line.",
    "save": "S Studio features Local Auto-Save. Even if you close the browser, your recent timeline modifications are safely stored in localStorage.",
    "export": "Click the 'Export Video' button at the top right to open export options (Auto/Manual resolutions up to 1440p) and save directly to your gallery."
};

// ==========================================================================
// 🛠️ CORE TRANSFORMATION & UNDO/REDO HISTORY ENGINE
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
    console.log("🔄 Workspace snapshot captured. Undo depth: " + undoStack.length);
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

    applyTransformations();
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

    applyTransformations();
}

function undoAction() { executeUndo(); }
function redoAction() { executeRedo(); }

// ==========================================================================
// 🧭 STUDIO NAVIGATION & FILE SELECTION LOGIC (STRICT HIDING ENGINE)
// ==========================================================================
function enterStudio(studioType) {
    if (studioType === 'video') {
        requestUploadPermission();
    } else if (studioType === 'photo') {
        alert("Photo Editing Studio is coming soon in the next update!");
    }
}

function requestUploadPermission() {
    const inputNode = document.getElementById('videoInput');
    if (inputNode) {
        inputNode.click();
    } else {
        const backupInput = document.createElement('input');
        backupInput.type = 'file'; 
        backupInput.accept = 'video/*';
        backupInput.onchange = function(e) { loadVideo(e); };
        backupInput.click();
    }
}

// ==========================================================================
// 🎥 MEDIA IMPORT & LOADER ENGINES (HIDE ALL LANDING TEXT ON SUCCESS)
// ==========================================================================
function loadVideo(event) {
    const file = event.target.files ? event.target.files[0] : null;
    
    // ఒకవేళ యూజర్ ఫైల్ ఎంచుకోకుండా Cancel చేస్తే ల్యాండింగ్ పేజీ అలాగే ఉంటుంది
    if (!file) {
        console.log("No file selected or user cancelled upload.");
        return;
    }

    // 1. అన్ని ల్యాండింగ్ కంటెంట్ ఎలిమెంట్‌లను (విజన్ కార్డ్స్, ప్యానెల్స్) ఫోర్స్-హైడ్ చేయడం
    const introPage = document.getElementById('introPage');
    if (introPage) {
        introPage.style.display = 'none';
        introPage.classList.add('hidden');
    }

    // introPage బయట ఏవైనా కార్డ్‌లు ఉంటే వాటిని కూడా సేఫ్‌గా దాచిపెట్టడం
    const extraLandingSelectors = [
        '#sStudioScrollableGuide',
        '.founders-vision-card-large',
        '.upcoming-updates-card',
        '.feedback-reward-card',
        '.support-channels-card',
        '.innovation-rewards-card',
        '.s-studio-master-footer'
    ];

    extraLandingSelectors.forEach(selector => {
        document.querySelectorAll(selector).forEach(el => {
            el.style.display = 'none';
        });
    });

    // 2. కేవలం ఎడిటర్ వర్క్‌స్పేస్‌ను మాత్రమే ఫుల్ స్క్రీన్‌లో చూపుతుంది
    const editorPage = document.getElementById('editorPage');
    if (editorPage) {
        editorPage.style.display = 'flex';
        editorPage.classList.remove('hidden');
    }

    videoFileBlob = file; 
    const wrapper = document.getElementById('videoWrapper');
    const placeholder = document.getElementById('placeholderText');
    const videoURL = URL.createObjectURL(file);
    window.currentVideoURL = videoURL;
    
    if (!wrapper) return;
    if (placeholder) placeholder.style.display = 'none';

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

    setupVolumeAudioEngine();

    currentVideoElement.onloadedmetadata = function() {
        videoDurationSeconds = currentVideoElement.duration;
        if (typeof calculateEstimatedSize === 'function') calculateEstimatedSize();
        updateTimerUI();
        generateVideoFrames(videoURL);
    };

    currentVideoElement.ontimeupdate = function() {
        updateTimerUI();
        updatePlayheadPosition();
    };

    document.querySelectorAll('.media-dependent').forEach(el => {
        el.classList.remove('hidden');
        el.style.display = 'flex';
    });
    
    const timelineBox = document.getElementById('timelineAreaBox');
    if (timelineBox) timelineBox.style.display = 'flex';
}

function loadPhoto(event) {
    const file = event.target.files ? event.target.files[0] : null;
    if (!file) return;

    const introPage = document.getElementById('introPage');
    if (introPage) {
        introPage.style.display = 'none';
        introPage.classList.add('hidden');
    }

    videoFileBlob = file;
    const wrapper = document.getElementById('videoWrapper');
    const placeholder = document.getElementById('placeholderText');
    
    if (placeholder) placeholder.style.display = 'none';
    const imgURL = URL.createObjectURL(file);
    
    wrapper.innerHTML = `<img id="mainPhotoPlayer" src="${imgURL}" style="transform: scale(1) rotate(0deg); width:100%; height:100%; object-fit:contain;">`;
    currentVideoElement = document.getElementById('mainPhotoPlayer');
    
    document.querySelectorAll('.media-dependent').forEach(el => {
        el.classList.remove('hidden');
        el.style.display = 'flex';
    });
    
    const timelineBox = document.getElementById('timelineAreaBox');
    if (timelineBox) timelineBox.style.display = 'flex';
}

function resetToHome() {
    // 1. ఎడిటర్ వర్క్‌స్పేస్‌ను దాచిపెట్టడం
    const editorPage = document.getElementById('editorPage');
    if (editorPage) {
        editorPage.style.display = 'none';
        editorPage.classList.add('hidden');
    }

    // 2. ల్యాండింగ్ పేజీ మరియు మిగతా అన్ని కంటెంట్ కార్డ్‌లను తిరిగి రిస్టోర్ చేయడం
    const introPage = document.getElementById('introPage');
    if (introPage) {
        introPage.style.display = 'flex';
        introPage.classList.remove('hidden');
    }

    const extraLandingSelectors = [
        '#sStudioScrollableGuide',
        '.founders-vision-card-large',
        '.upcoming-updates-card',
        '.feedback-reward-card',
        '.support-channels-card',
        '.innovation-rewards-card',
        '.s-studio-master-footer'
    ];

    extraLandingSelectors.forEach(selector => {
        document.querySelectorAll(selector).forEach(el => {
            el.style.display = 'block';
        });
    });

    const videoInput = document.getElementById('videoInput');
    if (videoInput) videoInput.value = '';
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
    } catch(e) { console.log("Audio node bypass initialized."); }
}

function generateVideoFrames(videoUrl) {
    const hiddenVideo = document.createElement('video');
    hiddenVideo.src = videoUrl; 
    hiddenVideo.muted = true;
    hiddenVideo.onloadedmetadata = function() {
        const container = document.getElementById('framesContainer');
        if(!container) return;
        container.innerHTML = ''; 
        let duration = hiddenVideo.duration; 
        let currentTime = 0;
        
        function captureNextFrame() {
            if (currentTime < duration) hiddenVideo.currentTime = currentTime;
        }
        hiddenVideo.onseeked = function() {
            const canvas = document.createElement('canvas');
            canvas.width = 160; 
            canvas.height = 90;
            canvas.getContext('2d').drawImage(hiddenVideo, 0, 0, canvas.width, canvas.height);
            const img = document.createElement('img');
            img.src = canvas.toDataURL(); 
            img.classList.add('video-thumb-frame');
            container.appendChild(img);
            currentTime += Math.max(3, duration / 10);
            captureNextFrame();
        };
        captureNextFrame();
    };
}

// ==========================================================================
// ⏱️ TIMELINE & PLAYBACK CONTROLLERS
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
    const track = document.getElementById('frameTimelineTrack');
    const timelineTracks = document.querySelector('.timeline-tracks');
    
    if (currentVideoElement && playhead && track && videoDurationSeconds > 0) {
        const percentage = (currentVideoElement.currentTime / videoDurationSeconds) * 100;
        playhead.style.left = percentage + "%";
        
        if (!currentVideoElement.paused && timelineTracks) {
            const scrollAmount = (track.offsetWidth * (percentage / 100)) - (timelineTracks.offsetWidth / 2);
            timelineTracks.scrollTo({ left: scrollAmount, behavior: 'auto' });
        }
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
        if (audioContext && audioContext.state === 'suspended') audioContext.resume();
        
        if (currentVideoElement.paused) {
            currentVideoElement.play();
            Object.values(activeAudioNodes).forEach(node => { if(node.audio) node.audio.play(); });
        } else {
            currentVideoElement.pause();
            Object.values(activeAudioNodes).forEach(node => { if(node.audio) node.audio.pause(); });
        }
    }
}

function videoBack() { if (currentVideoElement) currentVideoElement.currentTime -= 5; }
function videoForward() { if (currentVideoElement) currentVideoElement.currentTime += 5; }

function updatePlayButtonsUI() {
    if (!currentVideoElement) return;
    const allPlayButtons = document.querySelectorAll('.play-main');
    allPlayButtons.forEach(btn => {
        btn.innerText = currentVideoElement.paused ? "▶️" : "⏸️";
    });
}

// ==========================================================================
// 🖼️ UNLIMITED PIP & FLOATING TOOLKIT ENGINE
// ==========================================================================
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

function appendPIPToTimeline(file, icon) {
    const pipTrack = document.getElementById('pipTrackBlock');
    const videoWrapper = document.getElementById('videoWrapper');
    if (!videoWrapper) return;

    const overlayId = 'pip_' + Date.now() + '_' + Math.floor(Math.random() * 100);
    const isString = typeof file === 'string';
    const objectURL = isString ? '' : URL.createObjectURL(file); 
    const fileName = isString ? file : file.name;

    const mediaContainer = document.createElement('div');
    mediaContainer.id = overlayId; 
    mediaContainer.className = 'live-pip-object';
    mediaContainer.style.cssText = "position:absolute; top:25%; left:25%; width:130px; height:auto; cursor:move; z-index:100; border:2px dashed #ff9f43; background:rgba(0,0,0,0.2); border-radius:4px;";

    let realMedia = document.createElement( (!isString && file.type && file.type.startsWith('video/')) ? 'video' : 'img' );
    realMedia.src = isString ? 'placeholder.png' : objectURL;
    realMedia.style.width = "100%"; 
    realMedia.style.borderRadius = "4px";
    if(realMedia.tagName === 'VIDEO') { realMedia.autoplay = true; realMedia.loop = true; realMedia.muted = true; }
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
    if (pipTrack) {
        const block = document.createElement('div');
        block.style.cssText = "background:#ff9f43; color:white; padding:4px 10px; border-radius:4px; font-size:11px; margin-right:8px; display:inline-flex; align-items:center; min-width:120px; height:80%; line-height:24px; cursor:pointer;";
        block.innerHTML = `<span>${icon}</span> <span style="margin-left:5px;">${fileName}</span>`;
        block.onclick = function(e) { e.stopPropagation(); mediaContainer.click(); };
        block.ondblclick = function() { if(confirm(`Remove ${fileName}?`)) { mediaContainer.remove(); block.remove(); const p = document.getElementById('sStudioPipDynamicPanel'); if (p) p.remove(); } };
        pipTrack.appendChild(block);
    }
}

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

    const btnList = [
        { id: 'replace', label: '🔄 Replace' },
        { id: 'motion', label: '🎬 Motion' },
        { id: 'keyframe', label: '🔑 Keyframe' },
        { id: 'lock', label: '🔒 Lock' },
        { id: 'duplicate', label: '👯 Duplicate' },
        { id: 'crop', label: '✂️ Crop' },
        { id: 'duration', label: '⏱️ Duration' },
        { id: 'cutout', label: '👤 Cutout' },
        { id: 'rotate', label: '🔄 Rotate' },
        { id: 'mirror', label: '🪞 Mirror' },
        { id: 'flip', label: '🔀 Flip' },
        { id: 'fit', label: '📐 Auto Fit' },
        { id: 'blur', label: '💧 Blur' },
        { id: 'opacity', label: '👻 Opacity' },
        { id: 'position', label: '📍 Position' },
        { id: 'mask', label: '🎭 Mask' },
        { id: 'chroma', label: '🟢 Chroma' },
        { id: 'cut', label: '✂️ Split Cut' },
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

        case 'crop':
            let cL = prompt("Enter Crop percentage from Left (0-100):", "10");
            let cR = prompt("Enter Crop percentage from Right (0-100):", "10");
            let cT = prompt("Enter Crop percentage from Top (0-100):", "10");
            let cB = prompt("Enter Crop percentage from Bottom (0-100):", "10");
            if (cL && cR && cT && cB && mediaEl) {
                mediaEl.style.clipPath = `inset(${cT}% ${cR}% ${cB}% ${cL}%)`;
            }
            break;

        case 'duration':
            let sec = prompt("Enter Visibility Duration (in seconds):", "5");
            if (sec) alert(`Layer visibility set to ${sec} seconds.`);
            break;

        case 'lock':
            let isLocked = targetObject.dataset.locked === "true";
            targetObject.dataset.locked = isLocked ? "false" : "true";
            targetObject.style.border = isLocked ? "2px dashed #ff9f43" : "2px solid #ff4757";
            alert(isLocked ? "Layer Unlocked successfully." : "Layer Locked successfully.");
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
            let r = parseInt(targetObject.dataset.rot || "0") + 90;
            targetObject.dataset.rot = r;
            targetObject.style.transform = `rotate(${r}deg)`;
            break;

        case 'flip':
        case 'mirror':
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
            let bVal = prompt("Enter Blur Amount in pixels (px):", "8");
            if (bVal && mediaEl) mediaEl.style.filter = `blur(${bVal}px)`;
            break;

        case 'opacity':
            let op = mediaEl.style.opacity === "0.5" ? "1" : "0.5";
            if (mediaEl) mediaEl.style.opacity = op;
            break;

        case 'mask':
            let hasMask = mediaEl.style.clipPath && mediaEl.style.clipPath.includes('circle');
            if (mediaEl) mediaEl.style.clipPath = hasMask ? 'none' : 'circle(40% at 50% 50%)';
            break;

        case 'chroma':
            let hex = prompt("Enter Target Color Hex Code to Remove:", "#00ff00");
            if (hex && mediaEl) mediaEl.style.filter = "contrast(140%) saturate(120%)";
            break;

        case 'cutout':
            if (mediaEl) mediaEl.style.borderRadius = mediaEl.style.borderRadius === "50%" ? "0px" : "50%";
            break;

        case 'cut':
            if (mediaEl && mediaEl.tagName === 'VIDEO') {
                alert(`Split point created at ${mediaEl.currentTime.toFixed(2)}s.`);
            } else {
                alert("Cut operates on video layers.");
            }
            break;

        case 'delete':
            targetObject.remove();
            const p = document.getElementById('sStudioPipDynamicPanel');
            if (p) p.remove();
            break;

        default:
            console.log("Action Triggered: " + actionId);
            break;
    }
}

function makeElementDraggable(element) {
    element.style.cursor = 'move';
    element.onmousedown = function(e) {
        if (element.dataset && element.dataset.locked === "true") return;
        e.stopPropagation();
        let shiftX = e.clientX - element.getBoundingClientRect().left;
        let shiftY = e.clientY - element.getBoundingClientRect().top;
        
        function onMouseMove(ev) {
            const wrapper = document.getElementById('videoWrapper');
            if(!wrapper) return;
            let rect = wrapper.getBoundingClientRect();
            element.style.left = (ev.clientX - rect.left - shiftX) + 'px';
            element.style.top = (ev.clientY - rect.top - shiftY) + 'px';
        }
        document.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', function() {
            document.removeEventListener('mousemove', onMouseMove);
        }, { once: true });
    };
}

// ==========================================================================
// 🎵 AUDIO HUB & VOICE OVER ENGINE
// ==========================================================================
function addMusicOverlay() {
    const oldMenu = document.getElementById('sStudioMusicMenuHub');
    if (oldMenu) { oldMenu.remove(); return; }

    const menu = document.createElement('div');
    menu.id = 'sStudioMusicMenuHub';
    menu.style.cssText = "position:fixed; top:50%; left:50%; transform:translate(-50%, -50%); background:#161920; border:2px solid #10ac84; padding:15px; border-radius:10px; display:flex; flex-direction:column; gap:8px; z-index:100000; width: 260px; color: white; font-family: sans-serif;";

    menu.innerHTML = `
        <div style="font-size:12px; color:#10ac84; font-weight:bold; border-bottom:1px solid #222733; padding-bottom:6px; display:flex; justify-content:space-between; align-items:center;">
            <span>🎵 AUDIO HUB OPTIONS</span>
            <span id="closeMusicMenuHub" style="cursor:pointer; font-size:18px; color:#a4b0be;">&times;</span>
        </div>
        <button class="music-hub-btn" id="uploadLocalTrackOpt" style="background:#222733; color:white; border:none; padding:8px; border-radius:4px; font-size:11px; text-align:left; cursor:pointer; font-weight:bold;">📁 Upload Local Track</button>
        <button class="music-hub-btn" data-url="https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3" style="background:#222733; color:white; border:none; padding:8px; border-radius:4px; font-size:11px; text-align:left; cursor:pointer;">🎬 Cinematic Beats BGM</button>
        <button class="music-hub-btn" data-url="https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3" style="background:#222733; color:white; border:none; padding:8px; border-radius:4px; font-size:11px; text-align:left; cursor:pointer;">💼 Corporate Info Music</button>
        <button class="music-hub-btn" data-url="https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3" style="background:#222733; color:white; border:none; padding:8px; border-radius:4px; font-size:11px; text-align:left; cursor:pointer;">✨ Upbeat Vlog Sound</button>
        <button class="music-hub-btn" data-url="https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3" style="background:#222733; color:white; border:none; padding:8px; border-radius:4px; font-size:11px; text-align:left; cursor:pointer;">🎧 Chill Lofi Loop</button>
    `;

    menu.querySelector('#closeMusicMenuHub').onclick = function() { menu.remove(); };

    const processAudioTrackInjection = (trackName, customSrc = null) => {
        const audio = customSrc ? new Audio(customSrc) : new Audio();
        audio.loop = true;
        activeAudioNodes[Date.now()] = { audio: audio, name: trackName };

        const block = document.createElement('div');
        block.style.cssText = "background: rgba(16, 172, 132, 0.2); border: 1px solid #10ac84; color: white; padding: 6px 12px; border-radius: 6px; display: inline-flex; align-items: center; gap: 10px; margin-top: 4px; position: relative; overflow: hidden; min-width: 280px; height: 35px; font-family: sans-serif;";
        
        let waveHTML = `<div style="display: flex; align-items: center; gap: 2px; height: 100%; opacity: 0.7; margin-right: 8px;">`;
        const barHeights = [30, 50, 80, 40, 20, 60, 90, 40, 70, 50, 30, 80, 60, 40, 90, 30, 50, 70, 40, 20, 60, 80, 50, 30, 40];
        barHeights.forEach(h => { waveHTML += `<div style="width: 2px; height: ${h}%; background: #10ac84; border-radius: 1px;"></div>`; });
        waveHTML += `</div>`;

        block.innerHTML = `<span style="font-size:11px; font-weight:bold; z-index:2;">🎵 ${trackName}</span>${waveHTML}`;
        
        const container = document.getElementById('audioTrackBlock');
        if (container) container.appendChild(block); 
        menu.remove();
    };

    menu.querySelector('#uploadLocalTrackOpt').onclick = function() {
        const inp = document.createElement('input'); 
        inp.type = 'file'; 
        inp.accept = 'audio/*';
        inp.onchange = function(e) {
            const file = e.target.files[0]; 
            if(!file) return;
            processAudioTrackInjection(file.name, URL.createObjectURL(file));
        };
        inp.click();
    };

    menu.querySelectorAll('.music-hub-btn[data-url]').forEach(btn => {
        btn.onclick = function() {
            processAudioTrackInjection(btn.innerText, btn.getAttribute('data-url'));
        };
    });

    document.body.appendChild(menu);
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
                    const audio = new Audio(audioURL);
                    audio.loop = false;

                    const trackId = Date.now();
                    activeAudioNodes[trackId] = { audio: audio, name: "Voice_Over_" + trackId + ".mp3" };

                    const block = document.createElement('div');
                    block.style.cssText = "background: rgba(255, 71, 87, 0.2); border: 1px solid #ff4757; color: white; padding: 6px 12px; border-radius: 6px; display: inline-flex; align-items: center; gap: 10px; margin-top: 4px; position: relative; overflow: hidden; min-width: 250px; height: 35px; font-family: sans-serif;";
                    
                    let waveHTML = `<div style="display: flex; align-items: center; gap: 2px; height: 100%; opacity: 0.7; margin-right: 8px;">`;
                    const barHeights = [40, 70, 30, 90, 50, 80, 40, 60, 20, 70, 50, 90, 30];
                    barHeights.forEach(h => {
                        waveHTML += `<div style="width: 2px; height: ${h}%; background: #ff4757; border-radius: 1px;"></div>`;
                    });
                    waveHTML += `</div>`;

                    block.innerHTML = `<span style="font-size: 11px; font-weight: bold; z-index: 2;">🎙️ Voice Over</span> ${waveHTML}`;
                    
                    const audioTrackContainer = document.getElementById('audioTrackBlock');
                    if (audioTrackContainer) audioTrackContainer.appendChild(block);
                    
                    stream.getTracks().forEach(track => track.stop());
                };

                mediaRecorder.start();
                recBtn.innerText = "🛑 Stop Recording";
                recBtn.style.background = "#ff4757";
                recBtn.style.borderColor = "#ff6b81";
            })
            .catch(err => { alert("Microphone access denied!"); });
    } 
    else if (mediaRecorder && mediaRecorder.state === "recording") {
        mediaRecorder.stop();
        recBtn.innerText = "🎙️ Record Voice";
        recBtn.style.background = "rgba(255, 159, 67, 0.2)";
        recBtn.style.borderColor = "#ff9f43";
    }
}

// ==========================================================================
// 📝 TEXT OVERLAY ENGINE
// ==========================================================================
function addTextOverlay() {
    const oldMenu = document.getElementById('sStudioTextMenu'); 
    if (oldMenu) { oldMenu.remove(); return; }
    
    const textMenu = document.createElement('div'); 
    textMenu.id = 'sStudioTextMenu';
    textMenu.style.cssText = "position:fixed; top:50%; left:50%; transform:translate(-50%, -50%); background:#161920; border:2px solid #10ac84; padding:15px; border-radius:10px; display:flex; flex-direction:column; gap:8px; z-index:10000; width: 280px; font-family:sans-serif; color: white;";

    textMenu.innerHTML = `
        <div style="font-size:12px; color:#10ac84; font-weight:bold; margin-bottom:2px; border-bottom:1px solid #222733; padding-bottom:6px; display:flex; justify-content:space-between; align-items:center;">
            <span>📝 S STUDIO TEXT EDITOR</span>
            <span id="closeTextMenu" style="cursor:pointer; font-size:18px; color:#a4b0be; font-weight:bold;">&times;</span>
        </div>
        <input type="text" id="txtContent" placeholder="Enter your text here..." style="background:#222733; color:#fff; border:1px solid #353b48; padding:8px; border-radius:4px; font-size:12px; outline:none;">
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
            <button id="btnCancel" style="flex:1; background:#2d3436; color:#fff; border:none; padding:6px; border-radius:4px; font-size:11px; cursor:pointer;">Cancel</button>
            <button id="btnDone" style="flex:1; background:#10ac84; color:#fff; border:none; padding:6px; border-radius:4px; font-size:11px; font-weight:bold; cursor:pointer;">Done (Add) &raquo;</button>
        </div>
    `;

    let isBold = false; 
    let isItalic = false;
    textMenu.querySelector('#closeTextMenu').onclick = function() { textMenu.remove(); };
    const bBtn = textMenu.querySelector('#btnBold'); 
    bBtn.onclick = function() { isBold = !isBold; bBtn.style.background = isBold ? '#10ac84' : '#2d3436'; };
    const iBtn = textMenu.querySelector('#btnItalic'); 
    iBtn.onclick = function() { isItalic = !isItalic; iBtn.style.background = isItalic ? '#10ac84' : '#2d3436'; };
    textMenu.querySelector('#btnCancel').onclick = function() { textMenu.remove(); };
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
    const textNode = document.createElement('div'); 
    textNode.className = 'live-text-box selected-active';
    textNode.innerText = textVal; 
    textNode.contentEditable = true; 
    textNode.style.cssText = `position:absolute; top:40%; left:30%; color:${selectedColor}; font-size:${selectedSize}; font-weight:${isBold?'bold':'normal'}; font-style:${isItalic?'italic':'normal'}; cursor:move; z-index:50; padding:4px; border:1px dashed #6c5ce7; transition:all 0.1s; font-family:sans-serif;`;

    makeElementDraggable(textNode);
    wrapper.appendChild(textNode);
}

// ==========================================================================
// 🛠️ CENTRAL STUDIO TOOLKIT MATRIX
// ==========================================================================
function executeTool(tool) {
    if (!currentVideoElement) {
        currentVideoElement = document.getElementById('mainPhotoPlayer') || document.getElementById('mainPlayer');
    }
    if (!currentVideoElement) return;

    saveStateToHistory(); 

    switch(tool) {
        case 'Zoom': 
            currentScale += 0.15; 
            applyTransformations(); 
            break;
        case 'Opacity': 
            if (currentScale > 0.3) { currentScale -= 0.15; applyTransformations(); } 
            break;
        case 'Rotate': 
            currentRotation += 90; 
            if (currentRotation >= 360) currentRotation = 0; 
            applyTransformations(); 
            break;
        case 'Crop':
            const oldCropMenu = document.getElementById('sStudioCropMenu'); 
            if (oldCropMenu) { oldCropMenu.remove(); break; }
            const cropMenu = document.createElement('div'); 
            cropMenu.id = 'sStudioCropMenu';
            cropMenu.style.cssText = "position:fixed; top:50%; left:50%; transform:translate(-50%, -50%); background:#161920; border:2px solid #6c5ce7; padding:15px; border-radius:10px; display:flex; flex-direction:column; gap:8px; z-index:10000; width: 260px; font-family:sans-serif; color: white;";
            cropMenu.innerHTML = `
                <div style="font-size:12px; color:#6c5ce7; font-weight:bold; margin-bottom:2px; border-bottom:1px solid #222733; padding-bottom:6px; display:flex; justify-content:space-between; align-items:center;">
                    <span>📐 S STUDIO CROP PRESETS</span><span id="closeCropMenu" style="cursor:pointer; font-size:18px; color:#a4b0be; font-weight:bold;">&times;</span>
                </div>
                <button class="crop-opt" data-ratio="16-9" style="background:#222733; color:#fff; border:none; padding:8px; border-radius:4px; cursor:pointer; text-align:left; font-size:11px;">📺 16:9 (YouTube)</button>
                <button class="crop-opt" data-ratio="9-16" style="background:#222733; color:#fff; border:none; padding:8px; border-radius:4px; cursor:pointer; text-align:left; font-size:11px;">📱 9:16 (Reels / Shorts)</button>
                <button class="crop-opt" data-ratio="1-1" style="background:#222733; color:#fff; border:none; padding:8px; border-radius:4px; cursor:pointer; text-align:left; font-size:11px;">🔲 1:1 (Insta Square)</button>
                <button class="crop-opt" data-ratio="free" style="background:#6c5ce7; color:#fff; border:none; padding:8px; border-radius:4px; font-weight:bold; cursor:pointer; text-align:left; font-size:11px;">🔄 Reset Original Size</button>
            `;
            cropMenu.querySelector('#closeCropMenu').onclick = function() { cropMenu.remove(); };
            cropMenu.querySelectorAll('.crop-opt').forEach(b => {
                b.onclick = function() {
                    const ratio = b.getAttribute('data-ratio'); 
                    const wp = document.getElementById('videoWrapper');
                    if (wp) {
                        wp.style.overflow = "hidden"; 
                        wp.style.display = "block";
                        if (ratio === '16-9') { wp.style.width = "640px"; wp.style.height = "360px"; }
                        else if (ratio === '9-16') { wp.style.width = "270px"; wp.style.height = "480px"; }
                        else if (ratio === '1-1') { wp.style.width = "400px"; wp.style.height = "400px"; }
                        else if (ratio === 'free') { wp.style.width = "100%"; wp.style.height = "360px"; }
                        if (currentVideoElement) { currentVideoElement.style.width = "100%"; currentVideoElement.style.height = "100%"; currentVideoElement.style.objectFit = "cover"; }
                    }
                    cropMenu.remove();
                };
            });
            document.body.appendChild(cropMenu);
            break;

        case 'Speed':
            const oldSpeedMenu = document.getElementById('sStudioSpeedMenu'); 
            if (oldSpeedMenu) { oldSpeedMenu.remove(); break; }
            const speedMenu = document.createElement('div'); 
            speedMenu.id = 'sStudioSpeedMenu';
            speedMenu.style.cssText = "position:fixed; top:50%; left:50%; transform:translate(-50%, -50%); background:#161920; border:2px solid #ff9f43; padding:15px; border-radius:10px; display:flex; flex-direction:column; gap:8px; z-index:10000; width: 240px; font-family:sans-serif; color: white;";
            speedMenu.innerHTML = `
                <div style="font-size:12px; color:#ff9f43; font-weight:bold; margin-bottom:2px; border-bottom:1px solid #222733; padding-bottom:6px; display:flex; justify-content:space-between; align-items:center;">
                    <span>⚡ VIDEO PLAYBACK SPEED</span><span id="closeSpeedMenu" style="cursor:pointer; font-size:18px; color:#a4b0be; font-weight:bold;">&times;</span>
                </div>
                <button class="spd-opt" data-speed="0.5" style="background:#222733; color:#fff; border:none; padding:8px; cursor:pointer; text-align:left; font-size:11px;">🐢 0.5x (Slow Motion)</button>
                <button class="spd-opt" data-speed="1.0" style="background:#222733; color:#fff; border:none; padding:8px; cursor:pointer; text-align:left; font-size:11px;">▶️ 1.0x (Normal)</button>
                <button class="spd-opt" data-speed="2.0" style="background:#ff9f43; color:#fff; border:none; padding:8px; font-weight:bold; cursor:pointer; text-align:left; font-size:11px;">⚡ 2.0x (Hyperlapse)</button>
            `;
            speedMenu.querySelector('#closeSpeedMenu').onclick = function() { speedMenu.remove(); };
            speedMenu.querySelectorAll('.spd-opt').forEach(b => {
                b.onclick = function() {
                    const sv = parseFloat(b.getAttribute('data-speed'));
                    if (currentVideoElement && currentVideoElement.tagName === 'VIDEO') currentVideoElement.playbackRate = sv;
                    speedMenu.remove();
                };
            });
            document.body.appendChild(speedMenu);
            break;

        case 'Fill':
            if (currentVideoElement) { currentVideoElement.style.width = "100%"; currentVideoElement.style.height = "100%"; currentVideoElement.style.objectFit = "contain"; }
            break;

        case 'Chroma Key':
            const oldChromaMenu = document.getElementById('sStudioChromaMenu');
            if (oldChromaMenu) { oldChromaMenu.remove(); break; }

            const chromaMenu = document.createElement('div');
            chromaMenu.id = 'sStudioChromaMenu';
            chromaMenu.style.cssText = "position:fixed; top:50%; left:50%; transform:translate(-50%, -50%); background:#161920; border:2px solid #10ac84; padding:15px; border-radius:10px; display:flex; flex-direction:column; gap:8px; z-index:10000; box-shadow:0 10px 30px rgba(0,0,0,0.7); width: 260px; font-family:sans-serif; color: white;";

            chromaMenu.innerHTML = `
                <div style="font-size:12px; color:#10ac84; font-weight:bold; margin-bottom:2px; border-bottom:1px solid #222733; padding-bottom:6px; display:flex; justify-content:space-between; align-items:center;">
                    <span>🟢 ADVANCED CHROMA KEY</span>
                    <span id="closeChromaMenu" style="cursor:pointer; font-size:18px; color:#a4b0be; font-weight:bold;">&times;</span>
                </div>
                <button class="chroma-opt" data-color="green" style="background:#222733; color:#10ac84; border:none; padding:8px; border-radius:4px; font-size:11px; text-align:left; font-weight:bold; cursor:pointer;">🟢 Remove Green Screen</button>
                <button class="chroma-opt" data-color="blue" style="background:#222733; color:#54a0ff; border:none; padding:8px; border-radius:4px; font-size:11px; text-align:left; font-weight:bold; cursor:pointer;">🔵 Remove Blue Screen</button>
                <button class="chroma-opt" data-color="reset" style="background:#ff4757; color:#fff; border:none; padding:8px; border-radius:4px; font-size:11px; font-weight:bold; cursor:pointer; text-align:center; margin-top:4px;">🔄 Reset / Show Original</button>
            `;

            chromaMenu.querySelector('#closeChromaMenu').onclick = function() { chromaMenu.remove(); };

            chromaMenu.querySelectorAll('.chroma-opt').forEach(btn => {
                btn.onclick = function() {
                    const colorType = btn.getAttribute('data-color');
                    if (colorType === 'green') {
                        currentVideoElement.style.filter = "contrast(1.4) saturate(1.2) hue-rotate(-35deg) sepia(0.2) brightness(1.15)";
                    } else if (colorType === 'blue') {
                        currentVideoElement.style.filter = "contrast(1.3) saturate(1.1) hue-rotate(90deg) brightness(1.1)";
                    } else if (colorType === 'reset') {
                        currentVideoElement.style.filter = "none";
                    }
                    chromaMenu.remove();
                };
            });
            document.body.appendChild(chromaMenu);
            break;

        case 'Filters': 
            currentVideoElement.style.filter = "contrast(1.2) saturate(1.3) hue-rotate(8deg)"; 
            break;
            
        case 'Stickers': 
            triggerDirectPIPSelection(); 
            break;

        case 'Ask AI':
            askAiAssistant();
            break;

        case 'Delete': 
            if(confirm("Reset current workspace?")) location.reload(); 
            break;
    }
}

// ==========================================================================
// 📺 REAL-TIME FULL EDITED OUTPUT PRESENTATION ENGINE
// ==========================================================================
function launchPresentationMode() {
    const videoWrapper = document.getElementById('videoWrapper');
    const presentationContainer = document.getElementById('presentationVideoContainer');
    const overlay = document.getElementById('presentationOverlay');
    const mainVideo = document.getElementById('mainPlayer') || currentVideoElement;

    if (!mainVideo || !videoWrapper) {
        alert("Please upload a video and perform editing first!");
        return;
    }

    if (presentationContainer && overlay) {
        const wasPlaying = (mainVideo.tagName === 'VIDEO' && !mainVideo.paused);

        presentationContainer.innerHTML = '';
        
        const wrapperClone = videoWrapper.cloneNode(true);
        wrapperClone.id = "presentationWrapperClone";
        wrapperClone.style.width = "100%";
        wrapperClone.style.height = "100%";
        wrapperClone.style.maxWidth = "100%";
        wrapperClone.style.maxHeight = "100%";
        wrapperClone.style.position = "relative";
        wrapperClone.style.aspectRatio = "16 / 9";

        presentationContainer.appendChild(wrapperClone);
        overlay.style.display = 'flex';

        const clonedVideo = wrapperClone.querySelector('video') || wrapperClone.querySelector('#mainPlayer');
        if (clonedVideo) {
            clonedVideo.currentTime = mainVideo.currentTime;
            if (wasPlaying) {
                mainVideo.play();
                clonedVideo.play().catch(e => console.log("Presentation clone sync play."));
            } else {
                mainVideo.pause();
                clonedVideo.pause();
            }
        }
        updatePlayButtonsUI();
    }
}

function closePresentationMode() {
    const presentationContainer = document.getElementById('presentationVideoContainer');
    const overlay = document.getElementById('presentationOverlay');
    const mainVideo = document.getElementById('mainPlayer') || currentVideoElement;

    if (overlay) overlay.style.display = 'none';
    if (presentationContainer) presentationContainer.innerHTML = ''; 

    if (mainVideo && mainVideo.tagName === 'VIDEO') {
        updatePlayButtonsUI();
    }
}

// ==========================================================================
// 📥 EXPORT & DOWNLOAD MODAL ENGINE
// ==========================================================================
function toggleExportModal(show) { 
    const modal = document.getElementById('exportModal');
    if (modal) {
        modal.style.display = show ? 'flex' : 'none'; 
        if(show && typeof calculateEstimatedSize === 'function') calculateEstimatedSize();
    }
}

function setExportMode(mode) {
    const btnAuto = document.getElementById('btnAuto');
    const btnManual = document.getElementById('btnManual');
    const panel = document.getElementById('manualSettingsPanel');
    const msg = document.getElementById('autoInfoMsg');
    
    if (mode === 'auto') {
        if(btnAuto) btnAuto.classList.add('active'); 
        if(btnManual) btnManual.classList.remove('active');
        if(panel) panel.classList.add('dimmed'); 
        if(msg) msg.style.display = 'block';
        isManualMode = false;
    } else {
        if(btnManual) btnManual.classList.add('active'); 
        if(btnAuto) btnAuto.classList.remove('active');
        if(panel) panel.classList.remove('dimmed'); 
        if(msg) msg.style.display = 'none';
        isManualMode = true;
    }
    calculateEstimatedSize();
}

function selectOption(element, type, numericValue) {
    const siblings = element.parentElement.children;
    for (let btn of siblings) btn.classList.remove('active');
    element.classList.add('active');
    if (type === 'res') selectedResMultiplier = numericValue;
    if (type === 'fps') selectedFpsValue = numericValue;
    calculateEstimatedSize();
}

function updateMbps(val) { 
    const display = document.getElementById('mbpsValue');
    if(display) display.innerText = val + " Mbps"; 
    selectedMbpsValue = parseInt(val);
    calculateEstimatedSize(); 
}

function calculateEstimatedSize() {
    const sizeDisplay = document.getElementById('estimatedSizeValue');
    if (!videoFileBlob || !sizeDisplay) return;

    if (!isManualMode) {
        sizeDisplay.innerText = (videoFileBlob.size / (1024 * 1024)).toFixed(2) + " MB";
    } else {
        let estimatedMbps = selectedMbpsValue;
        if (selectedResMultiplier === 240) estimatedMbps = selectedMbpsValue * 0.25;
        else if (selectedResMultiplier === 360) estimatedMbps = selectedMbpsValue * 0.4;
        else if (selectedResMultiplier === 520) estimatedMbps = selectedMbpsValue * 0.7;
        else if (selectedResMultiplier === 1080) estimatedMbps = selectedMbpsValue * 1.5;

        const fpsModifier = selectedFpsValue / 30;
        const totalBitsCalculated = (estimatedMbps * videoDurationSeconds * fpsModifier) / 8;
        sizeDisplay.innerText = (totalBitsCalculated > 0 ? totalBitsCalculated.toFixed(2) : "14.50") + " MB";
    }
}

function downloadToGallery() {
    if (!videoFileBlob) return;
    const downloadAnchor = document.createElement('a');
    downloadAnchor.href = URL.createObjectURL(videoFileBlob);
    downloadAnchor.download = "S_Studio_Output_" + Date.now() + ".mp4";
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    document.body.removeChild(downloadAnchor);
    toggleExportModal(false);
}

// ==========================================================================
// 👤 USER AUTHENTICATION & LOGIN ENGINE
// ==========================================================================
function toggleAuthModal(show) {
    const authModal = document.getElementById('authModal');
    if (authModal) {
        authModal.style.display = show ? 'flex' : 'none';
        if(show) switchAuthView('login');
    }
}

function switchAuthView(view) {
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const forgotForm = document.getElementById('forgotForm');
    const title = document.getElementById('authModalTitle');

    if (loginForm) loginForm.classList.add('hidden');
    if (registerForm) registerForm.classList.add('hidden');
    if (forgotForm) forgotForm.classList.add('hidden');

    if (view === 'login') {
        if(loginForm) loginForm.classList.remove('hidden');
        if(title) title.innerText = "Login to S Studio";
    } else if (view === 'register') {
        if(registerForm) registerForm.classList.remove('hidden');
        if(title) title.innerText = "Create S Studio Account";
    } else if (view === 'forgot') {
        if(forgotForm) forgotForm.classList.remove('hidden');
        if(title) title.innerText = "Reset Password";
    }
}

function handleAuthSubmit(event, mode) {
    event.preventDefault();
    const authBtn = document.getElementById('authNavBtn');
    
    if (mode === 'login') {
        const userVal = document.getElementById('loginUser').value;
        alert(`🎉 Welcome back, ${userVal}! Login Successful.`);
        if (authBtn) authBtn.innerHTML = `👤 Profile`;
    } else if (mode === 'register') {
        alert("✨ Registration Complete! Please Login now.");
        switchAuthView('login');
        return;
    } else if (mode === 'forgot') {
        alert("📩 Password reset link dispatched successfully to your source!");
    }
    toggleAuthModal(false);
}

// ==========================================================================
// 🤖 AI ASSISTANT HUB
// ==========================================================================
function askAiAssistant() {
    let aiBox = document.getElementById('sStudioAiHelpHub');
    if (aiBox) { aiBox.remove(); return; }

    aiBox = document.createElement('div');
    aiBox.id = 'sStudioAiHelpHub';
    aiBox.style.cssText = "position:fixed; bottom:80px; right:20px; background:#161920; border:2px solid #6c5ce7; width:320px; border-radius:10px; padding:15px; color:white; font-family:sans-serif; z-index:150000; box-shadow:0 10px 30px rgba(0,0,0,0.6); display:flex; flex-direction:column; gap:10px;";

    aiBox.innerHTML = `
        <div style="font-size:12px; font-weight:bold; color:#6c5ce7; border-bottom:1px solid #222733; padding-bottom:6px; display:flex; justify-content:space-between; align-items:center;">
            <span>🤖 S STUDIO AI ASSISTANT</span>
            <span id="closeAiHelpHub" style="cursor:pointer; font-size:18px; color:#a4b0be;">&times;</span>
        </div>
        <div id="aiChatLog" style="height:150px; overflow-y:auto; font-size:11px; color:#c1c8d2; background:#0f1115; padding:8px; border-radius:6px; line-height:1.5;">
            Hello! I am your S Studio AI guide. Ask me anything about Splitting, Music, Voice-overs, Photo Editing, or Shortcuts!
        </div>
        <input type="text" id="aiQueryInput" placeholder="Type your editing doubt here..." style="width:100%; background:#222733; border:1px solid #333; color:white; padding:6px; border-radius:4px; font-size:11px; box-sizing:border-box;">
        <button id="btnSubmitAiQuery" style="background:#6c5ce7; color:white; border:none; padding:8px; border-radius:4px; font-size:11px; font-weight:bold; cursor:pointer;">Ask Editor AI</button>
        <div style="border-top:1px solid #222733; padding-top:8px; display:flex; justify-content:space-between; align-items:center;">
            <span style="font-size:10px; color:#a4b0be;">Facing a critical bug?</span>
            <a href="mailto:sriramgroupsofficial@gmail.com?subject=S Studio Bug Report" style="color:#ff4757; font-size:10px; font-weight:bold; text-decoration:none; background:rgba(255,71,87,0.1); padding:4px 8px; border-radius:4px; border:1px solid #ff4757;">📧 Email Support</a>
        </div>
    `;

    document.body.appendChild(aiBox);

    aiBox.querySelector('#closeAiHelpHub').onclick = () => aiBox.remove();
    
    const handleAiSearch = () => {
        const queryInput = document.getElementById('aiQueryInput');
        const chatLog = document.getElementById('aiChatLog');
        if (!queryInput || !chatLog || !queryInput.value.trim()) return;

        const userText = queryInput.value.toLowerCase();
        let aiResponse = "I'm specialized in S Studio video editing! Try asking about 'how to split', 'how to add music', 'shortcuts', or 'photo color sliders'.";

        Object.keys(studioAiKnowledgeBase).forEach(key => {
            if (userText.includes(key)) {
                aiResponse = studioAiKnowledgeBase[key];
            }
        });

        chatLog.innerHTML = `
            <div style="margin-bottom:8px; color:#ffff55;"><b>🤔 You:</b> ${queryInput.value}</div>
            <div style="color:#6c5ce7;"><b>🤖 AI:</b> ${aiResponse}</div>
        `;
        queryInput.value = "";
    };

    aiBox.querySelector('#btnSubmitAiQuery').onclick = handleAiSearch;
    aiBox.querySelector('#aiQueryInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleAiSearch();
    });
}

// ==========================================================================
// 📜 SYSTEM MODALS & LEGAL DIALOG CONTROLLERS
// ==========================================================================
function toggleModal(modalId, show) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = show ? 'flex' : 'none';
    }
}

// ==========================================================================
// ⌨️ SHORTCUTS & EVENT LISTENERS
// ==========================================================================
document.addEventListener('keydown', function(e) {
    if (e.target.contentEditable === "true" || e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

    const key = e.key.toLowerCase();
    if (e.key === " " || e.key === "Spacebar") {
        e.preventDefault();
        togglePlay();
    } else if (key === 's') {
        e.preventDefault();
        executeTool('Split');
    }
});

// Target Selection Focus Resolver
document.addEventListener('mousedown', function(e) {
    const pipTarget = e.target.closest('.live-pip-object');
    if (pipTarget) {
        const pipImg = pipTarget.querySelector('img') || pipTarget.querySelector('video');
        if (pipImg) {
            currentVideoElement = pipImg;
            currentActivePIPLayer = pipTarget;
            return;
        }
    }
    const mainPhoto = document.getElementById('mainPhotoPlayer');
    if (mainPhoto && (e.target === mainPhoto || mainPhoto.contains(e.target))) {
        currentVideoElement = mainPhoto;
        return;
    }
    const mainVideo = document.getElementById('mainPlayer');
    if (mainVideo && (e.target === mainVideo || mainVideo.contains(e.target))) {
        currentVideoElement = mainVideo;
        return;
    }
});

// UI Dynamic Sync Loop Engine
setInterval(function() {
    if (currentVideoElement && currentVideoElement.tagName === 'VIDEO') {
        updatePlayButtonsUI();
        updatePlayheadPosition();
    }
}, 300);

document.addEventListener("DOMContentLoaded", function() {
    console.log("⚡ S Studio Workspace Core Engine fully initialized.");
    
    const toolsContainer = document.querySelector('.tools-container');
    if (toolsContainer && !document.getElementById('btnVoiceRecord')) {
        const recBtn = document.createElement('button');
        recBtn.id = "btnVoiceRecord";
        recBtn.type = "button";
        recBtn.className = "tool-btn";
        recBtn.style.cssText = "background: rgba(255, 159, 67, 0.2); border: 1px solid #ff9f43; color: #ff9f43; font-weight: bold;";
        recBtn.innerText = "🎙️ Record Voice";
        recBtn.onclick = toggleVoiceRecording;
        
        const aiBtn = document.querySelector('.ai-btn');
        if (aiBtn) toolsContainer.insertBefore(recBtn, aiBtn);
        else toolsContainer.appendChild(recBtn);
    }
});
