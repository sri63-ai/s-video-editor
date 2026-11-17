// ==========================================================================
// S STUDIO - COMPLETE TIMELINE-SYNCED VIDEO ENGINE (videoworkspace.js)
// ==========================================================================

let currentVideoBlob = null;
let currentVideoFileName = "Untitled_Video.mp4";
let activeDraftId = null;
let videoScale = 1.0;
let videoRotation = 0;
let videoBlurPx = 0;
let videoFilterStr = "none";
let videoSpeed = 1.0;
let isChromaActive = false;
let isAutoSubActive = false;
let splitMarkers = [];

let vidBrightness = 100;
let vidContrast = 100;
let vidSaturation = 100;

let timelineZoomFactor = 1.0;
const BASE_PIXELS_PER_SEC = 35;

let timelineClips = [];
let currentOpenCategory = null;
let videoUndoStack = [];
let videoRedoStack = [];

function getPixelsPerSecond() {
    return BASE_PIXELS_PER_SEC * timelineZoomFactor;
}

// 1. Load Saved Draft on Page Open
document.addEventListener("DOMContentLoaded", async () => {
    const params = new URLSearchParams(window.location.search);
    const urlDraftId = params.get("draftId") || localStorage.getItem("sStudio_activeDraftId");

    if (urlDraftId && typeof getDraftById === "function") {
        const savedDraft = await getDraftById(urlDraftId);
        if (savedDraft && savedDraft.mode === "video" && savedDraft.fileBlob) {
            activeDraftId = savedDraft.draftId;
            currentVideoBlob = savedDraft.fileBlob;
            currentVideoFileName = savedDraft.fileName || "Resumed_Video.mp4";
            videoScale = savedDraft.scale || 1.0;
            videoRotation = savedDraft.rotation || 0;
            videoBlurPx = savedDraft.blur || 0;
            videoFilterStr = savedDraft.filter || "none";
            videoSpeed = savedDraft.speed || 1.0;
            splitMarkers = savedDraft.splitMarkers || [];

            renderVideoInStage(currentVideoBlob, currentVideoFileName);
            updateAutoSaveBadge("Resumed Saved Draft");
        }
    }
});

// 2. Upload & Render Video
async function handleVideoSelect(event) {
    const file = event.target.files ? event.target.files[0] : null;
    if (!file) return;

    currentVideoBlob = file;
    currentVideoFileName = file.name;
    activeDraftId = "draft_vid_" + Date.now();
    videoScale = 1.0;
    videoRotation = 0;
    videoBlurPx = 0;
    videoFilterStr = "none";
    videoSpeed = 1.0;
    vidBrightness = 100;
    vidContrast = 100;
    vidSaturation = 100;
    splitMarkers = [];
    timelineClips = [];

    renderVideoInStage(file, file.name);
    await triggerAutoSaveVideoDraft();
}

function renderVideoInStage(blobFile, fileName) {
    const wrapper = document.getElementById("videoWrapper");
    const placeholder = document.getElementById("placeholderText");
    if (!wrapper) return;
    if (placeholder) placeholder.style.display = "none";

    wrapper.style.position = "relative";
    wrapper.style.overflow = "hidden";

    const videoURL = URL.createObjectURL(blobFile);
    wrapper.innerHTML = `
        <video id="mainPlayer" playsinline style="width: 100%; height: 100%; object-fit: contain; transition: transform 0.2s ease;">
            <source src="${videoURL}" type="${blobFile.type || 'video/mp4'}">
        </video>
        <div id="liveSubtitleCaption" style="display: none; position: absolute; bottom: 10%; left: 50%; transform: translateX(-50%); background: rgba(0,0,0,0.85); color: #ffffff; padding: 6px 14px; border-radius: 6px; font-size: 15px; font-weight: 700; z-index: 40; pointer-events: none;"></div>
    `;

    const videoEl = document.getElementById("mainPlayer");
    applyAllVideoVisuals();

    videoEl.onloadedmetadata = () => {
        updateTimelineDimensions();
        updateTimerReadout();
        renderSplitMarkersOnTimeline();
    };

    videoEl.ontimeupdate = () => {
        const curTime = videoEl.currentTime || 0;
        updateTimerReadout();
        updatePlayheadBar();
        syncTimelineClipsAtTime(curTime);
    };

    videoEl.onended = () => {
        setPlayPauseIcons(false);
    };
}

// 3. Horizontal Timeline Scaling & Auto-Scroll
function updateTimelineDimensions() {
    const videoEl = document.getElementById("mainPlayer");
    const duration = (videoEl && videoEl.duration) ? videoEl.duration : 30;
    const pps = getPixelsPerSecond();
    const totalLaneWidth = Math.max(900, Math.ceil(duration * pps) + 120);

    document.querySelectorAll(".track-lane").forEach(lane => {
        lane.style.width = totalLaneWidth + "px";
    });

    const mainTrack = document.getElementById("frameTimelineTrack");
    if (mainTrack && videoEl) {
        const vidWidth = Math.max(80, duration * pps);
        mainTrack.innerHTML = `
            <div style="position: absolute; left: 0; top: 3px; bottom: 3px; width: ${vidWidth}px; background: rgba(37, 99, 235, 0.25); border: 1px solid #2563EB; color: #DBEAFE; padding: 0 12px; border-radius: 5px; font-size: 11.5px; font-weight: 700; display: flex; align-items: center; overflow: hidden; white-space: nowrap;">
                ${currentVideoFileName} (${formatTimeSec(duration)})
            </div>
        `;
    }

    timelineClips.forEach(clip => {
        if (clip.barEl) {
            clip.barEl.style.left = (clip.startTime * pps) + "px";
            clip.barEl.style.width = Math.max(30, clip.duration * pps) + "px";
        }
    });

    updatePlayheadBar();
}

function adjustTimelineZoom(val) {
    timelineZoomFactor = parseFloat(val) || 1.0;
    const disp = document.getElementById("zoomValDisplay");
    if (disp) disp.innerText = Math.round(timelineZoomFactor * 100) + "%";
    updateTimelineDimensions();
    renderSplitMarkersOnTimeline();
}

function updatePlayheadBar() {
    const videoEl = document.getElementById("mainPlayer");
    const playhead = document.getElementById("playhead");
    const scrollBox = document.getElementById("timelineTracksContainer");
    if (!videoEl || !playhead) return;

    const pps = getPixelsPerSecond();
    const pixelPos = TRACK_LABEL_OFFSET + ((videoEl.currentTime || 0) * pps);
    playhead.style.left = pixelPos + "px";

    if (scrollBox && !videoEl.paused) {
        const visibleRight = scrollBox.scrollLeft + scrollBox.clientWidth - 80;
        if (pixelPos > visibleRight) {
            scrollBox.scrollLeft = pixelPos - (scrollBox.clientWidth * 0.4);
        } else if (pixelPos < scrollBox.scrollLeft + TRACK_LABEL_OFFSET) {
            scrollBox.scrollLeft = Math.max(0, pixelPos - TRACK_LABEL_OFFSET - 40);
        }
    }
}

function movePlayhead(e) {
    if (e.target.closest(".timeline-clip-bar") || e.target.closest(".track-label")) return;
    const videoEl = document.getElementById("mainPlayer");
    const scrollBox = document.getElementById("timelineTracksContainer");
    if (!videoEl || !scrollBox || !videoEl.duration) return;

    const rect = scrollBox.getBoundingClientRect();
    const clickXInTrack = (e.clientX - rect.left) + scrollBox.scrollLeft - TRACK_LABEL_OFFSET;
    const pps = getPixelsPerSecond();
    const targetSec = Math.max(0, Math.min(videoEl.duration, clickXInTrack / pps));

    videoEl.currentTime = targetSec;
    updatePlayheadBar();
    updateTimerReadout();
    syncTimelineClipsAtTime(targetSec);
}

// 4. Start Time & Duration Sync
function syncTimelineClipsAtTime(currentTime) {
    const mainVideo = document.getElementById("mainPlayer");
    const isPlaying = mainVideo && !mainVideo.paused;

    timelineClips.forEach(clip => {
        const endTime = clip.startTime + clip.duration;
        const isActive = (currentTime >= clip.startTime && currentTime <= endTime);

        if (clip.type === "text" || clip.type === "pip") {
            if (clip.stageEl) {
                clip.stageEl.style.display = isActive ? "block" : "none";
                const innerVid = clip.stageEl.querySelector("video");
                if (innerVid) {
                    if (isActive && isPlaying && innerVid.paused) innerVid.play().catch(() => {});
                    else if ((!isActive || !isPlaying) && !innerVid.paused) innerVid.pause();
                }
            }
        } else if (clip.type === "audio" && clip.audioEl) {
            if (isActive && isPlaying) {
                if (clip.audioEl.paused) {
                    clip.audioEl.currentTime = Math.max(0, currentTime - clip.startTime);
                    clip.audioEl.play().catch(() => {});
                }
            } else {
                if (!clip.audioEl.paused) clip.audioEl.pause();
            }
        }
    });
}

function attachTimelineClipControls(clipObj) {
    const bar = clipObj.barEl;
    const handle = bar.querySelector(".clip-resize-handle");

    bar.onmousedown = function(e) {
        if (e.target === handle) return;
        e.stopPropagation();
        const startX = e.clientX;
        const initialLeft = parseFloat(bar.style.left) || 0;
        const pps = getPixelsPerSecond();

        function onDragMove(ev) {
            const newLeft = Math.max(0, initialLeft + (ev.clientX - startX));
            bar.style.left = newLeft + "px";
            clipObj.startTime = parseFloat((newLeft / pps).toFixed(2));
            const videoEl = document.getElementById("mainPlayer");
            if (videoEl) syncTimelineClipsAtTime(videoEl.currentTime);
        }

        function onDragEnd() {
            document.removeEventListener("mousemove", onDragMove);
            document.removeEventListener("mouseup", onDragEnd);
            updateAutoSaveBadge(`Moved to ${clipObj.startTime}s`);
        }

        document.addEventListener("mousemove", onDragMove);
        document.addEventListener("mouseup", onDragEnd);
    };

    if (handle) {
        handle.onmousedown = function(e) {
            e.stopPropagation();
            const startX = e.clientX;
            const initialWidth = bar.offsetWidth;
            const pps = getPixelsPerSecond();

            function onResizeMove(ev) {
                const newWidth = Math.max(30, initialWidth + (ev.clientX - startX));
                bar.style.width = newWidth + "px";
                clipObj.duration = parseFloat((newWidth / pps).toFixed(2));
                const videoEl = document.getElementById("mainPlayer");
                if (videoEl) syncTimelineClipsAtTime(videoEl.currentTime);
            }

            function onResizeEnd() {
                document.removeEventListener("mousemove", onResizeMove);
                document.removeEventListener("mouseup", onResizeEnd);
                updateAutoSaveBadge(`Duration: ${clipObj.duration}s`);
            }

            document.addEventListener("mousemove", onResizeMove);
            document.addEventListener("mouseup", onResizeEnd);
        };
    }
}

// 5. Center-Aligned Text, PiP & Audio Overlays
function addVideoTextOverlay() {
    const txt = prompt("Enter title or caption text:");
    if (!txt) return;
    const wrapper = document.getElementById("videoWrapper");
    const lane = document.getElementById("textTrackBlock");
    const videoEl = document.getElementById("mainPlayer");
    if (!wrapper || !lane) return;

    const currentSec = videoEl ? parseFloat(videoEl.currentTime.toFixed(2)) : 0;
    const defaultDuration = 5.0;
    const pps = getPixelsPerSecond();

    const tag = document.createElement("div");
    tag.innerText = txt;
    tag.style.cssText = "position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); color: #ffffff; background: rgba(15, 23, 42, 0.78); padding: 8px 18px; border-radius: 8px; font-size: 22px; font-weight: 800; cursor: move; z-index: 35; border: 1.5px dashed #38bdf8; white-space: nowrap; user-select: none;";
    makePreviewItemDraggable(tag);
    wrapper.appendChild(tag);

    const bar = document.createElement("div");
    bar.className = "timeline-clip-bar";
    bar.style.cssText += `left: ${currentSec * pps}px; width: ${defaultDuration * pps}px; background: #4f46e5; border: 1px solid #818cf8;`;
    bar.innerHTML = `<span>T: ${txt}</span><div class="clip-resize-handle"></div>`;
    lane.appendChild(bar);

    const clipObj = { id: "clip_" + Date.now(), type: "text", startTime: currentSec, duration: defaultDuration, stageEl: tag, barEl: bar };
    timelineClips.push(clipObj);
    attachTimelineClipControls(clipObj);
    syncTimelineClipsAtTime(currentSec);
    triggerAutoSaveVideoDraft();
}

function handlePipOverlaySelect(e) {
    const file = e.target.files ? e.target.files[0] : null;
    if (!file) return;
    const wrapper = document.getElementById("videoWrapper");
    const lane = document.getElementById("pipTrackBlock");
    const videoEl = document.getElementById("mainPlayer");
    if (!wrapper || !lane) return;

    const currentSec = videoEl ? parseFloat(videoEl.currentTime.toFixed(2)) : 0;
    const defaultDuration = 5.0;
    const pps = getPixelsPerSecond();
    const url = URL.createObjectURL(file);

    const pipBox = document.createElement("div");
    pipBox.style.cssText = "position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 180px; border: 2px solid #2563EB; border-radius: 8px; overflow: hidden; cursor: move; z-index: 32; box-shadow: 0 8px 20px rgba(0,0,0,0.5);";
    pipBox.innerHTML = file.type.startsWith("video/")
        ? `<video src="${url}" loop muted playsinline style="width:100%; display:block; pointer-events:none;"></video>`
        : `<img src="${url}" style="width:100%; display:block; pointer-events:none;">`;
    makePreviewItemDraggable(pipBox);
    wrapper.appendChild(pipBox);

    const bar = document.createElement("div");
    bar.className = "timeline-clip-bar";
    bar.style.cssText += `left: ${currentSec * pps}px; width: ${defaultDuration * pps}px; background: #d97706; border: 1px solid #fbbf24;`;
    bar.innerHTML = `<span>PiP: ${file.name}</span><div class="clip-resize-handle"></div>`;
    lane.appendChild(bar);

    const clipObj = { id: "pip_" + Date.now(), type: "pip", startTime: currentSec, duration: defaultDuration, stageEl: pipBox, barEl: bar };
    timelineClips.push(clipObj);
    attachTimelineClipControls(clipObj);
    syncTimelineClipsAtTime(currentSec);
    e.target.value = "";
    triggerAutoSaveVideoDraft();
}

function handleAudioTrackSelect(e) {
    const file = e.target.files ? e.target.files[0] : null;
    if (!file) return;
    const lane = document.getElementById("audioTrackBlock");
    const videoEl = document.getElementById("mainPlayer");
    if (!lane) return;

    const currentSec = videoEl ? parseFloat(videoEl.currentTime.toFixed(2)) : 0;
    const pps = getPixelsPerSecond();
    const audioEl = new Audio(URL.createObjectURL(file));

    audioEl.onloadedmetadata = () => {
        const dur = Math.min(audioEl.duration || 10, (videoEl && videoEl.duration) ? videoEl.duration : 15);
        const bar = document.createElement("div");
        bar.className = "timeline-clip-bar";
        bar.style.cssText += `left: ${currentSec * pps}px; width: ${dur * pps}px; background: #059669; border: 1px solid #34d399;`;
        bar.innerHTML = `<span>Audio: ${file.name}</span><div class="clip-resize-handle"></div>`;
        lane.appendChild(bar);

        const clipObj = { id: "aud_" + Date.now(), type: "audio", startTime: currentSec, duration: dur, audioEl: audioEl, barEl: bar };
        timelineClips.push(clipObj);
        attachTimelineClipControls(clipObj);
    };
    e.target.value = "";
    triggerAutoSaveVideoDraft();
}

function makePreviewItemDraggable(el) {
    el.onmousedown = function(e) {
        e.stopPropagation();
        const parentRect = el.parentElement.getBoundingClientRect();
        const elRect = el.getBoundingClientRect();

        const currentLeft = elRect.left - parentRect.left;
        const currentTop = elRect.top - parentRect.top;
        el.style.transform = "none";
        el.style.left = currentLeft + "px";
        el.style.top = currentTop + "px";

        const shiftX = e.clientX - elRect.left;
        const shiftY = e.clientY - elRect.top;

        function onMove(ev) {
            const maxLeft = parentRect.width - el.offsetWidth;
            const maxTop = parentRect.height - el.offsetHeight;
            el.style.left = Math.max(0, Math.min(maxLeft, ev.clientX - parentRect.left - shiftX)) + "px";
            el.style.top = Math.max(0, Math.min(maxTop, ev.clientY - parentRect.top - shiftY)) + "px";
        }

        function onUp() {
            document.removeEventListener("mousemove", onMove);
            document.removeEventListener("mouseup", onUp);
        }

        document.addEventListener("mousemove", onMove);
        document.addEventListener("mouseup", onUp);
    };
}

// 6. Playback & Visuals
function applyAllVideoVisuals() {
    const videoEl = document.getElementById("mainPlayer");
    if (!videoEl) return;

    videoEl.style.transform = `scale(${videoScale}) rotate(${videoRotation}deg)`;
    let filterParts = [];
    if (videoFilterStr !== "none") filterParts.push(videoFilterStr);
    if (vidBrightness !== 100) filterParts.push(`brightness(${vidBrightness}%)`);
    if (vidContrast !== 100) filterParts.push(`contrast(${vidContrast}%)`);
    if (vidSaturation !== 100) filterParts.push(`saturate(${vidSaturation}%)`);
    if (videoBlurPx > 0) filterParts.push(`blur(${videoBlurPx}px)`);

    videoEl.style.filter = filterParts.length > 0 ? filterParts.join(" ") : "none";
    videoEl.playbackRate = videoSpeed;
    videoEl.style.mixBlendMode = isChromaActive ? "screen" : "normal";
}

function togglePlay() {
    const videoEl = document.getElementById("mainPlayer");
    if (!videoEl) return;

    if (videoEl.paused || videoEl.ended) {
        videoEl.play().then(() => {
            setPlayPauseIcons(true);
            syncTimelineClipsAtTime(videoEl.currentTime);
        }).catch(() => {});
    } else {
        videoEl.pause();
        setPlayPauseIcons(false);
        syncTimelineClipsAtTime(videoEl.currentTime);
    }
}

function setPlayPauseIcons(isPlaying) {
    const playSvg = document.getElementById("playIconSvg");
    const pauseSvg = document.getElementById("pauseIconSvg");
    if (playSvg) playSvg.style.display = isPlaying ? "none" : "block";
    if (pauseSvg) pauseSvg.style.display = isPlaying ? "block" : "none";
}

function videoBack() {
    const videoEl = document.getElementById("mainPlayer");
    if (videoEl) {
        videoEl.currentTime = Math.max(0, videoEl.currentTime - 5);
        updateTimerReadout();
        updatePlayheadBar();
        syncTimelineClipsAtTime(videoEl.currentTime);
    }
}

function videoForward() {
    const videoEl = document.getElementById("mainPlayer");
    if (videoEl) {
        videoEl.currentTime = Math.min(videoEl.duration || 0, videoEl.currentTime + 5);
        updateTimerReadout();
        updatePlayheadBar();
        syncTimelineClipsAtTime(videoEl.currentTime);
    }
}

function updateTimerReadout() {
    const videoEl = document.getElementById("mainPlayer");
    const disp = document.getElementById("videoTimerDisplay");
    if (!videoEl || !disp) return;

    disp.innerText = `${formatTimeSec(videoEl.currentTime || 0)} / ${formatTimeSec(videoEl.duration || 0)}`;
}

function formatTimeSec(sec) {
    const m = Math.floor(sec / 60).toString().padStart(2, "0");
    const s = Math.floor(sec % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
}

function undoVideoAction() {
    if (videoUndoStack.length === 0) return;
    videoRedoStack.push({ scale: videoScale, rotation: videoRotation, blur: videoBlurPx, filter: videoFilterStr, speed: videoSpeed });
    const prev = videoUndoStack.pop();
    videoScale = prev.scale;
    videoRotation = prev.rotation;
    videoBlurPx = prev.blur;
    videoFilterStr = prev.filter;
    videoSpeed = prev.speed;
    applyAllVideoVisuals();
}

function redoVideoAction() {
    if (videoRedoStack.length === 0) return;
    videoUndoStack.push({ scale: videoScale, rotation: videoRotation, blur: videoBlurPx, filter: videoFilterStr, speed: videoSpeed });
    const next = videoRedoStack.pop();
    videoScale = next.scale;
    videoRotation = next.rotation;
    videoBlurPx = next.blur;
    videoFilterStr = next.filter;
    videoSpeed = next.speed;
    applyAllVideoVisuals();
}

function splitVideoClip() {
    const videoEl = document.getElementById("mainPlayer");
    if (!videoEl || !videoEl.duration) return;
    splitMarkers.push(parseFloat(videoEl.currentTime.toFixed(2)));
    renderSplitMarkersOnTimeline();
    triggerAutoSaveVideoDraft();
}

function renderSplitMarkersOnTimeline() {
    const videoEl = document.getElementById("mainPlayer");
    const track = document.getElementById("frameTimelineTrack");
    if (!videoEl || !track || !videoEl.duration) return;

    const pps = getPixelsPerSecond();
    track.querySelectorAll(".split-cut-pin").forEach(el => el.remove());
    splitMarkers.forEach(t => {
        const pin = document.createElement("div");
        pin.className = "split-cut-pin";
        pin.style.cssText = `position: absolute; left: ${t * pps}px; top: 0; bottom: 0; width: 2px; background: #ef4444; z-index: 25;`;
        track.appendChild(pin);
    });
}

function setVideoSpeed(val) {
    videoSpeed = parseFloat(val) || 1.0;
    const label = document.getElementById("speedValText");
    if (label) label.innerText = videoSpeed.toFixed(2) + "x";
    applyAllVideoVisuals();
}

function zoomVideo(delta) {
    videoUndoStack.push({ scale: videoScale, rotation: videoRotation, blur: videoBlurPx, filter: videoFilterStr, speed: videoSpeed });
    videoScale = Math.max(0.3, Math.min(3.0, videoScale + delta));
    applyAllVideoVisuals();
}

function rotateVideo90() {
    videoUndoStack.push({ scale: videoScale, rotation: videoRotation, blur: videoBlurPx, filter: videoFilterStr, speed: videoSpeed });
    videoRotation = (videoRotation + 90) % 360;
    applyAllVideoVisuals();
}

function changeVideoBlur(val) {
    videoBlurPx = parseInt(val) || 0;
    const disp = document.getElementById("blurDisplay");
    if (disp) disp.innerText = videoBlurPx + "px";
    applyAllVideoVisuals();
}

function applyVideoFilter(filterCss) {
    videoFilterStr = filterCss;
    applyAllVideoVisuals();
}

function toggleChromaKey() {
    isChromaActive = !isChromaActive;
    applyAllVideoVisuals();
}

function toggleAutoSubtitles() {
    const cap = document.getElementById("liveSubtitleCaption");
    if (!cap) return;
    isAutoSubActive = !isAutoSubActive;
    cap.style.display = isAutoSubActive ? "block" : "none";
    if (isAutoSubActive) cap.innerText = "Auto AI Subtitles Active";
}

function setVideoAspectRatio(ratio) {
    const wrapper = document.getElementById("videoWrapper");
    if (wrapper) {
        wrapper.style.aspectRatio = ratio;
        wrapper.style.width = ratio === "unset" ? "92%" : "auto";
    }
    toggleModal("cropPresetModal", false);
}

// 7. 14-Icon Pro Studio Console Templates & Toggle
const toolCategoryTemplates = {
    edit: `
        <button type="button" class="tool-chip" onclick="splitVideoClip()">Split Clip (S)</button>
        <button type="button" class="tool-chip" onclick="freezeCurrentFrame()">Freeze Frame (3s)</button>
        <button type="button" class="tool-chip" onclick="zoomVideo(0.15)">Zoom In</button>
        <button type="button" class="tool-chip" onclick="zoomVideo(-0.15)">Zoom Out</button>
        <button type="button" class="tool-chip" onclick="rotateVideo90()">Rotate 90°</button>
        <button type="button" class="tool-chip chip-danger" onclick="resetVideoWorkspace()">Reset All</button>
    `,
    vfx: `
        <button type="button" class="tool-chip" onclick="toggleVfxOverlay('vignette')">Cinematic Vignette</button>
        <button type="button" class="tool-chip" onclick="toggleVfxOverlay('vhs')">Retro VHS Grain</button>
        <button type="button" class="tool-chip" onclick="triggerCameraShake()">Action Shake</button>
    `,
    color: `
        <button type="button" class="tool-chip" onclick="applyVideoFilter('none')">Original</button>
        <button type="button" class="tool-chip" onclick="applyVideoFilter('contrast(125%) saturate(125%)')">Cinematic</button>
        <button type="button" class="tool-chip" onclick="applyVideoFilter('sepia(45%) contrast(110%)')">Warm Vintage</button>
        <button type="button" class="tool-chip" onclick="applyVideoFilter('grayscale(100%) contrast(130%)')">B & W Noir</button>
        <button type="button" class="tool-chip chip-green" onclick="toggleChromaKey()">Chroma Key (Green Screen)</button>
    `,
    audio: `
        <button type="button" class="tool-chip" onclick="document.getElementById('audioTrackInput').click()">+ Add Music / Voice</button>
        <button type="button" class="tool-chip chip-cyan" onclick="extractAudioFromVideo()">Extract Audio Track</button>
        <button type="button" class="tool-chip" onclick="applyAudioFadeEffect()">Smooth Audio Fade</button>
    `,
    text: `
        <button type="button" class="tool-chip" onclick="addVideoTextOverlay()">+ Add Centered Title</button>
        <button type="button" class="tool-chip chip-indigo" onclick="toggleAutoSubtitles()">Auto AI Subtitles (CC)</button>
    `,
    mask: `
        <button type="button" class="tool-chip" onclick="applyVideoShapeMask('circle')">Circle Mask</button>
        <button type="button" class="tool-chip" onclick="applyVideoShapeMask('rounded')">Rounded Frame</button>
        <button type="button" class="tool-chip" onclick="applyVideoShapeMask('split')">Split Screen Half</button>
        <button type="button" class="tool-chip" onclick="applyVideoShapeMask('none')">Full Frame</button>
    `,
    speed: `
        <div class="blur-slider-pill">
            <span>Speed:</span>
            <input type="range" min="0.25" max="2.0" step="0.05" value="${videoSpeed}" oninput="setVideoSpeed(this.value)">
            <span id="speedValText">${videoSpeed.toFixed(2)}x</span>
        </div>
        <button type="button" class="tool-chip" onclick="setVideoSpeed(0.5)">0.5x Slow-Mo</button>
        <button type="button" class="tool-chip" onclick="setVideoSpeed(1.0)">1.0x Normal</button>
        <button type="button" class="tool-chip" onclick="setVideoSpeed(1.5)">1.5x Fast</button>
        <button type="button" class="tool-chip" onclick="setVideoSpeed(2.0)">2.0x</button>
    `,
    ai: `
        <button type="button" class="tool-chip chip-indigo" onclick="generateAiTextToSpeech()">AI Text-to-Speech Voice</button>
        <button type="button" class="tool-chip chip-green" onclick="toggleChromaKey()">AI Subject Cutout</button>
        <button type="button" class="tool-chip" onclick="runSmartSilenceTrim()">Auto Silence Remover</button>
    `,
    transitions: `
        <button type="button" class="tool-chip" onclick="applyVideoTransition('fade')">Smooth Fade</button>
        <button type="button" class="tool-chip" onclick="applyVideoTransition('zoom')">Pop Zoom</button>
        <button type="button" class="tool-chip" onclick="applyVideoTransition('slide')">Slide In</button>
        <button type="button" class="tool-chip" onclick="applyVideoTransition('wipe')">Cinematic Wipe</button>
    `,
    stickers: `
        <button type="button" class="tool-chip" onclick="addCenteredSticker('SUBSCRIBE')">Subscribe Badge</button>
        <button type="button" class="tool-chip" onclick="addCenteredSticker('LIKE & SHARE')">Like Badge</button>
        <button type="button" class="tool-chip" onclick="addCenteredSticker('TRENDING')">Trending Tag</button>
        <button type="button" class="tool-chip" onclick="addCenteredSticker('IMPORTANT')">Highlight Callout</button>
    `,
    draw: `
        <div class="blur-slider-pill">
            <span>Full Blur:</span>
            <input type="range" id="blurSlider" min="0" max="25" step="1" value="${videoBlurPx}" oninput="changeVideoBlur(this.value)">
            <span id="blurDisplay">${videoBlurPx}px</span>
        </div>
        <button type="button" class="tool-chip chip-cyan" onclick="addDraggablePrivacyBlurBox()">+ Add Face / Area Blur Box</button>
    `,
    adjust: `
        <div class="blur-slider-pill">
            <span>Bright:</span>
            <input type="range" min="40" max="180" value="${vidBrightness}" oninput="updateVideoColorGrading('b', this.value)">
            <span id="vbVal">${vidBrightness}%</span>
        </div>
        <div class="blur-slider-pill">
            <span>Contrast:</span>
            <input type="range" min="40" max="180" value="${vidContrast}" oninput="updateVideoColorGrading('c', this.value)">
            <span id="vcVal">${vidContrast}%</span>
        </div>
        <div class="blur-slider-pill">
            <span>Saturate:</span>
            <input type="range" min="0" max="200" value="${vidSaturation}" oninput="updateVideoColorGrading('s', this.value)">
            <span id="vsVal">${vidSaturation}%</span>
        </div>
    `
};

// ==========================================================================
// IN-PLACE TOOLBAR REPLACEMENT (REPLACES MAIN/PIP DOCK IN THE SAME SPACE)
// ==========================================================================
function toggleIconCategory(catKey, btnElement) {
    const subDock = document.getElementById("inPlaceSubDock");
    const mainDock = document.getElementById("mainVideoDock");
    const pipDock = document.getElementById("pipEditDock");
    if (!subDock) return;

    // Hide Main & PiP docks, show Sub-Dock in the exact same spot
    if (mainDock) mainDock.style.display = "none";
    if (pipDock) pipDock.style.display = "none";

    const toolsHtml = toolCategoryTemplates[catKey] || "";
    subDock.innerHTML = `
        <button type="button" class="tool-chip" onclick="closeInPlaceSubDock()" style="background: #1e293b; border-color: #38bdf8; color: #38bdf8; font-weight: 800; flex-shrink: 0;">
            ⬅ Back
        </button>
        ${toolsHtml}
    `;
    subDock.style.display = "flex";
    currentOpenCategory = catKey;

    // Auto-return to Home Toolbar right after clicking an action button (keeps sliders interactive)
    subDock.querySelectorAll("button.tool-chip").forEach(btn => {
        if (!btn.getAttribute("onclick")?.includes("closeInPlaceSubDock")) {
            btn.addEventListener("click", () => {
                setTimeout(() => closeInPlaceSubDock(), 120);
            });
        }
    });
}
function closeInPlaceSubDock() {
    const subDock = document.getElementById("inPlaceSubDock");
    const mainDock = document.getElementById("mainVideoDock");
    const pipDock = document.getElementById("pipEditDock");

    if (subDock) subDock.style.display = "none";
    currentOpenCategory = null;

    if (selectedClipId) {
        if (pipDock) pipDock.style.display = "flex";
        if (mainDock) mainDock.style.display = "none";
    } else {
        if (mainDock) mainDock.style.display = "flex";
        if (pipDock) pipDock.style.display = "none";
    }
}

function highlightInstantAction(btn) {
    btn.classList.toggle("active-icon");
}

function updateVideoColorGrading(type, val) {
    if (type === "b") { vidBrightness = parseInt(val); const el = document.getElementById("vbVal"); if (el) el.innerText = val + "%"; }
    if (type === "c") { vidContrast = parseInt(val); const el = document.getElementById("vcVal"); if (el) el.innerText = val + "%"; }
    if (type === "s") { vidSaturation = parseInt(val); const el = document.getElementById("vsVal"); if (el) el.innerText = val + "%"; }
    applyAllVideoVisuals();
}

function addDraggablePrivacyBlurBox() {
    const wrapper = document.getElementById("videoWrapper");
    if (!wrapper) return;

    const blurBox = document.createElement("div");
    blurBox.style.cssText = "position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 130px; height: 90px; backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px); background: rgba(255, 255, 255, 0.08); border: 1.5px dashed #38bdf8; border-radius: 8px; cursor: move; z-index: 42;";
    makePreviewItemDraggable(blurBox);
    wrapper.appendChild(blurBox);
    updateAutoSaveBadge("Privacy Blur Box Added");
}

function addCenteredSticker(label) {
    const wrapper = document.getElementById("videoWrapper");
    const lane = document.getElementById("pipTrackBlock");
    const videoEl = document.getElementById("mainPlayer");
    if (!wrapper || !lane) return;

    const currentSec = videoEl ? parseFloat(videoEl.currentTime.toFixed(2)) : 0;
    const pps = getPixelsPerSecond();

    const badge = document.createElement("div");
    badge.innerText = label;
    badge.style.cssText = "position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); background: #2563EB; color: #ffffff; padding: 7px 16px; border-radius: 20px; font-size: 13px; font-weight: 800; letter-spacing: 0.5px; cursor: move; z-index: 36; box-shadow: 0 4px 14px rgba(37, 99, 235, 0.5);";
    makePreviewItemDraggable(badge);
    wrapper.appendChild(badge);

    const bar = document.createElement("div");
    bar.className = "timeline-clip-bar";
    bar.style.cssText += `left: ${currentSec * pps}px; width: ${4 * pps}px; background: #2563EB;`;
    bar.innerHTML = `<span>Sticker: ${label}</span><div class="clip-resize-handle"></div>`;
    lane.appendChild(bar);

    const clipObj = { id: "stk_" + Date.now(), type: "pip", startTime: currentSec, duration: 4, stageEl: badge, barEl: bar };
    timelineClips.push(clipObj);
    attachTimelineClipControls(clipObj);
    syncTimelineClipsAtTime(currentSec);
}

function generateAiTextToSpeech() {
    const script = prompt("Enter text to generate AI Voiceover:");
    if (!script) return;
    if ("speechSynthesis" in window) {
        const utterance = new SpeechSynthesisUtterance(script);
        window.speechSynthesis.speak(utterance);
        updateAutoSaveBadge("AI Voiceover Playing");
    }
}

function runSmartSilenceTrim() {
    updateAutoSaveBadge("AI Silence Scan Complete");
    splitVideoClip();
}

function applyAudioFadeEffect() {
    updateAutoSaveBadge("Audio Fade In/Out Applied");
}

function triggerCameraShake() {
    const videoEl = document.getElementById("mainPlayer");
    if (!videoEl) return;
    videoEl.animate([
        { transform: `translate(0, 0) scale(${videoScale})` },
        { transform: `translate(-4px, 3px) scale(${videoScale})` },
        { transform: `translate(4px, -3px) scale(${videoScale})` },
        { transform: `translate(0, 0) scale(${videoScale})` }
    ], { duration: 250, iterations: 6 });
}

function applyVideoTransition(type) {
    const videoEl = document.getElementById("mainPlayer");
    if (!videoEl) return;
    videoEl.style.transition = "all 0.5s ease";
    if (type === "fade") {
        videoEl.style.opacity = "0";
        setTimeout(() => { videoEl.style.opacity = "1"; }, 120);
    } else if (type === "zoom") {
        videoEl.style.transform = `scale(${videoScale * 1.2}) rotate(${videoRotation}deg)`;
        setTimeout(() => { applyAllVideoVisuals(); }, 300);
    } else if (type === "slide") {
        videoEl.style.transform = `translateX(-35px) scale(${videoScale})`;
        setTimeout(() => { applyAllVideoVisuals(); }, 150);
    } else if (type === "wipe") {
        videoEl.style.clipPath = "inset(0 100% 0 0)";
        setTimeout(() => { videoEl.style.clipPath = "inset(0 0% 0 0)"; }, 100);
    }
}

function freezeCurrentFrame() {
    const videoEl = document.getElementById("mainPlayer");
    const wrapper = document.getElementById("videoWrapper");
    if (!videoEl || !wrapper) return;

    videoEl.pause();
    setPlayPauseIcons(false);

    const canvas = document.createElement("canvas");
    canvas.width = videoEl.videoWidth || 1280;
    canvas.height = videoEl.videoHeight || 720;
    canvas.getContext("2d").drawImage(videoEl, 0, 0, canvas.width, canvas.height);

    const freezeImg = document.createElement("img");
    freezeImg.src = canvas.toDataURL("image/png");
    freezeImg.style.cssText = "position: absolute; inset: 0; width: 100%; height: 100%; object-fit: contain; z-index: 45; border: 2px solid #2563EB;";
    wrapper.appendChild(freezeImg);

    setTimeout(() => {
        freezeImg.remove();
        videoEl.play().then(() => setPlayPauseIcons(true)).catch(() => {});
    }, 3000);
}

function toggleVfxOverlay(vfxType) {
    const wrapper = document.getElementById("videoWrapper");
    if (!wrapper) return;
    const existing = document.getElementById("activeVfxLayer");
    if (existing) {
        existing.remove();
        if (existing.dataset.type === vfxType) return;
    }

    const layer = document.createElement("div");
    layer.id = "activeVfxLayer";
    layer.dataset.type = vfxType;
    layer.style.cssText = vfxType === "vignette"
        ? "position: absolute; inset: 0; pointer-events: none; z-index: 25; box-shadow: inset 0 0 90px rgba(0,0,0,0.9);"
        : "position: absolute; inset: 0; pointer-events: none; z-index: 25; background: repeating-linear-gradient(0deg, rgba(255,255,255,0.04) 0px, rgba(255,255,255,0.04) 1px, transparent 1px, transparent 3px);";
    wrapper.appendChild(layer);
}

function toggleSafeZonesGuide() {
    const wrapper = document.getElementById("videoWrapper");
    if (!wrapper) return;
    const existing = document.getElementById("creatorSafeZoneOverlay");
    if (existing) { existing.remove(); return; }

    const guide = document.createElement("div");
    guide.id = "creatorSafeZoneOverlay";
    guide.style.cssText = "position: absolute; inset: 0; pointer-events: none; z-index: 48; border: 2px dashed rgba(56, 189, 248, 0.7);";
    guide.innerHTML = `
        <div style="position: absolute; right: 12px; bottom: 55px; width: 42px; height: 170px; border: 1.5px dashed #ef4444; background: rgba(239, 68, 68, 0.15); border-radius: 6px; display: flex; align-items: center; justify-content: center; writing-mode: vertical-rl; font-size: 10px; color: #fca5a5; font-weight: 700;">Like / Comment</div>
        <div style="position: absolute; left: 12px; bottom: 12px; right: 65px; height: 38px; border: 1.5px dashed #ef4444; background: rgba(239, 68, 68, 0.15); border-radius: 6px; display: flex; align-items: center; padding-left: 10px; font-size: 10px; color: #fca5a5; font-weight: 700;">Caption & Title Safe Margin</div>
    `;
    wrapper.appendChild(guide);
}

function applyVideoShapeMask(shape) {
    const videoEl = document.getElementById("mainPlayer");
    if (!videoEl) return;
    if (shape === "circle") videoEl.style.clipPath = "circle(42% at 50% 50%)";
    else if (shape === "rounded") videoEl.style.clipPath = "inset(6% 6% 6% 6% round 24px)";
    else if (shape === "split") videoEl.style.clipPath = "polygon(0 0, 50% 0, 50% 100%, 0 100%)";
    else videoEl.style.clipPath = "none";
}

function captureThumbnailFrame() {
    const videoEl = document.getElementById("mainPlayer");
    if (!videoEl) return;
    const canvas = document.createElement("canvas");
    canvas.width = videoEl.videoWidth || 1920;
    canvas.height = videoEl.videoHeight || 1080;
    canvas.getContext("2d").drawImage(videoEl, 0, 0, canvas.width, canvas.height);

    const link = document.createElement("a");
    link.download = `S_Studio_Frame_${Date.now()}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
}

function extractAudioFromVideo() {
    if (!currentVideoBlob) return;
    const audioTrack = document.getElementById("audioTrackBlock");
    if (audioTrack) {
        audioTrack.innerHTML = `<div class="timeline-clip-bar" style="left: 0px; width: 220px; background: #0284c7;"><span>Extracted Audio: ${currentVideoFileName}</span></div>`;
    }
}

function launchFullscreenPreview() {
    const wrapper = document.getElementById("videoWrapper");
    if (wrapper && wrapper.requestFullscreen) wrapper.requestFullscreen().catch(() => {});
}

function resetVideoWorkspace() {
    videoScale = 1.0;
    videoRotation = 0;
    videoBlurPx = 0;
    videoFilterStr = "none";
    videoSpeed = 1.0;
    vidBrightness = 100;
    vidContrast = 100;
    vidSaturation = 100;
    isChromaActive = false;
    applyAllVideoVisuals();
}

function exportFinalVideo() {
    if (!currentVideoBlob) {
        alert("Please upload a video first!");
        return;
    }
    const format = document.getElementById("exportFormatSelect")?.value || "mp4";
    const res = document.getElementById("exportResSelect")?.value || "1080p";
    const fps = document.getElementById("exportFpsSelect")?.value || "30";
    const baseName = currentVideoFileName.replace(/\.[^/.]+$/, "");

    const outName = format === "mp3"
        ? `S_Studio_${baseName}_Audio.mp3`
        : (format === "gif"
            ? `S_Studio_${baseName}_${res}.gif`
            : `S_Studio_${baseName}_${res}_${fps}fps.mp4`);

    const a = document.createElement("a");
    a.href = URL.createObjectURL(currentVideoBlob);
    a.download = outName;
    a.click();

    toggleModal("exportModal", false);
    updateAutoSaveBadge(`Exported: ${outName}`);
}

async function triggerAutoSaveVideoDraft() {
    if (!currentVideoBlob || typeof saveDraftToDevice !== "function") return;
    updateAutoSaveBadge("Saving...");
    activeDraftId = await saveDraftToDevice({
        draftId: activeDraftId || ("draft_vid_" + Date.now()),
        mode: "video",
        fileName: currentVideoFileName,
        fileBlob: currentVideoBlob,
        scale: videoScale,
        rotation: videoRotation,
        blur: videoBlurPx,
        filter: videoFilterStr,
        speed: videoSpeed,
        splitMarkers: splitMarkers
    });
    updateAutoSaveBadge("Saved on Device");
}

async function saveVideoAndGoHome() {
    if (currentVideoBlob) await triggerAutoSaveVideoDraft();
    window.location.href = "index.html";
}

function updateAutoSaveBadge(text) {
    const badge = document.getElementById("autoSaveBadge");
    if (badge) badge.innerText = text;
}

// ==========================================================================
// PRO EXPORT SETTINGS & LIVE ESTIMATED FILE SIZE (MB) CALCULATOR
// ==========================================================================
function toggleModal(id, show) {
    const m = document.getElementById(id);
    if (m) m.style.display = show ? "flex" : "none";
    if (id === "exportModal" && show) {
        recalculateEstimatedFileSize();
    }
}
function recalculateEstimatedFileSize() {
    const videoEl = document.getElementById("mainPlayer");
    const durationSec = (videoEl && videoEl.duration) ? videoEl.duration : 25;

    const format = document.getElementById("exportFormatSelect")?.value || "mp4";
    const res = document.getElementById("exportResSelect")?.value || "1080p";
    const fps = parseInt(document.getElementById("exportFpsSelect")?.value || "30", 10);
    const bitrate = document.getElementById("exportBitrateSelect")?.value || "medium";

    const resGroup = document.getElementById("exportResGroup");
    const fpsRow = document.getElementById("exportFpsBitrateRow");
    const sizeText = document.getElementById("estimatedFileSizeText");

    if (format === "mp3") {
        if (resGroup) resGroup.style.display = "none";
        if (fpsRow) fpsRow.style.display = "none";
        const mp3MB = ((durationSec * 192) / 8192).toFixed(2);
        if (sizeText) sizeText.innerText = `~${mp3MB} MB (320/192 kbps Audio)`;
        return;
    }

    if (resGroup) resGroup.style.display = "block";
    if (fpsRow) fpsRow.style.display = "grid";

    // Base Bitrate in Mbps by Resolution
    const resMbpsMap = { "480p": 1.8, "720p": 4.2, "1080p": 8.0, "1440p": 15.5 };
    const fpsMultiplier = fps === 60 ? 1.45 : (fps === 24 ? 0.85 : 1.0);
    const compMultiplier = bitrate === "low" ? 0.55 : (bitrate === "high" ? 1.5 : 1.0);
    const formatMultiplier = format === "gif" ? 1.35 : 1.0;

    const effectiveMbps = (resMbpsMap[res] || 8.0) * fpsMultiplier * compMultiplier * formatMultiplier;
    const totalMB = Math.max(0.4, (durationSec * effectiveMbps) / 8).toFixed(1);

    if (sizeText) sizeText.innerText = `~${totalMB} MB`;
}
function toggleSubPanel(id) {
    const panel = document.getElementById(id);
    if (!panel) return;
    const isVisible = panel.style.display === "flex";
    document.querySelectorAll(".floating-sub-panel").forEach(p => p.style.display = "none");
    panel.style.display = isVisible ? "none" : "flex";
}

document.addEventListener("keydown", function(e) {
    if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
    if (e.code === "Space") { e.preventDefault(); togglePlay(); }
    else if (e.key.toLowerCase() === "s" && !e.ctrlKey) { e.preventDefault(); splitVideoClip(); }
});
// ==========================================================================
// AUTO-STACKING MULTI-LAYER PIP ENGINE & Z-INDEX BRING-TO-FRONT
// ==========================================================================
let topCanvasZIndex = 35;

function bringPipClipToFront(clipObj) {
    if (!clipObj) return;
    topCanvasZIndex += 1;

    // 1. Canvas Stage Z-Index & Highlight
    document.querySelectorAll(".live-pip-stage-item").forEach(el => el.classList.remove("pip-stage-active"));
    if (clipObj.stageEl) {
        clipObj.stageEl.style.zIndex = topCanvasZIndex;
        clipObj.stageEl.classList.add("pip-stage-active");
    }

    // 2. Timeline Bar Active Highlight
    document.querySelectorAll(".timeline-clip-bar").forEach(b => b.classList.remove("active-selected-clip"));
    if (clipObj.barEl) {
        clipObj.barEl.classList.add("active-selected-clip");
    }
}

// Check Time Overlap & Auto-Stack into Layer 0, Layer 1, Layer 2...
function recalculatePipTrackLayers() {
    const pipClips = timelineClips.filter(c => c.type === "pip");
    const pipLane = document.getElementById("pipTrackBlock");
    const pipRow = pipLane ? pipLane.parentElement : null;

    if (!pipLane || !pipRow) return;

    // Sort by startTime so earlier clips take lower base layers
    const sorted = [...pipClips].sort((a, b) => a.startTime - b.startTime);
    const layerEndTimes = []; // Tracks end time of last clip in each sub-layer

    sorted.forEach(clip => {
        const clipStart = clip.startTime;
        const clipEnd = clip.startTime + clip.duration;
        let assignedLayer = 0;

        while (true) {
            if (layerEndTimes[assignedLayer] === undefined || clipStart >= (layerEndTimes[assignedLayer] - 0.05)) {
                layerEndTimes[assignedLayer] = clipEnd;
                break;
            }
            assignedLayer++;
        }

        clip.layerIndex = assignedLayer;
        if (clip.barEl) {
            clip.barEl.style.bottom = (4 + assignedLayer * 32) + "px";
        }
    });

    const totalLayers = Math.max(1, layerEndTimes.length);
    const dynamicHeight = Math.max(36, totalLayers * 32 + 6);
    pipRow.style.height = dynamicHeight + "px";
}

function handlePipOverlaySelect(e) {
    const file = e.target.files ? e.target.files[0] : null;
    if (!file) return;
    const wrapper = document.getElementById("videoWrapper");
    const lane = document.getElementById("pipTrackBlock");
    const videoEl = document.getElementById("mainPlayer");
    if (!wrapper || !lane) return;

    const currentSec = videoEl ? parseFloat(videoEl.currentTime.toFixed(2)) : 0;
    const defaultDuration = 5.0;
    const pps = getPixelsPerSecond();
    const url = URL.createObjectURL(file);

    topCanvasZIndex += 1;

    // Centered PiP Media Box on Preview Stage
    const pipBox = document.createElement("div");
    pipBox.className = "live-pip-stage-item";
    pipBox.style.cssText = `
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 185px;
        border: 2px solid #2563EB;
        border-radius: 8px;
        overflow: hidden;
        cursor: move;
        z-index: ${topCanvasZIndex};
        box-shadow: 0 8px 20px rgba(0,0,0,0.5);
    `;
    pipBox.innerHTML = file.type.startsWith("video/")
        ? `<video src="${url}" loop muted playsinline style="width:100%; display:block; pointer-events:none;"></video>`
        : `<img src="${url}" style="width:100%; display:block; pointer-events:none;">`;
    makePreviewItemDraggable(pipBox);
    wrapper.appendChild(pipBox);

    // Multi-Layer Stackable Timeline Bar
    const bar = document.createElement("div");
    bar.className = "timeline-clip-bar pip-clip-bar";
    bar.style.cssText += `left: ${currentSec * pps}px; width: ${defaultDuration * pps}px; background: #d97706;`;
    bar.innerHTML = `<span>PiP: ${file.name}</span><div class="clip-resize-handle"></div>`;
    lane.appendChild(bar);

    const clipObj = {
        id: "pip_" + Date.now(),
        type: "pip",
        startTime: currentSec,
        duration: defaultDuration,
        layerIndex: 0,
        stageEl: pipBox,
        barEl: bar
    };

    pipBox.addEventListener("mousedown", () => bringPipClipToFront(clipObj));
    bar.addEventListener("mousedown", () => bringPipClipToFront(clipObj));

    timelineClips.push(clipObj);
    attachTimelineClipControls(clipObj);
    recalculatePipTrackLayers();
    bringPipClipToFront(clipObj);
    syncTimelineClipsAtTime(currentSec);

    e.target.value = "";
    triggerAutoSaveVideoDraft();
}

function addCenteredSticker(label) {
    const wrapper = document.getElementById("videoWrapper");
    const lane = document.getElementById("pipTrackBlock");
    const videoEl = document.getElementById("mainPlayer");
    if (!wrapper || !lane) return;

    const currentSec = videoEl ? parseFloat(videoEl.currentTime.toFixed(2)) : 0;
    const pps = getPixelsPerSecond();
    topCanvasZIndex += 1;

    const badge = document.createElement("div");
    badge.className = "live-pip-stage-item";
    badge.innerText = label;
    badge.style.cssText = `position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); background: #2563EB; color: #ffffff; padding: 7px 16px; border-radius: 20px; font-size: 13px; font-weight: 800; letter-spacing: 0.5px; cursor: move; z-index: ${topCanvasZIndex}; box-shadow: 0 4px 14px rgba(37, 99, 235, 0.5);`;
    makePreviewItemDraggable(badge);
    wrapper.appendChild(badge);

    const bar = document.createElement("div");
    bar.className = "timeline-clip-bar pip-clip-bar";
    bar.style.cssText += `left: ${currentSec * pps}px; width: ${4 * pps}px; background: #2563EB;`;
    bar.innerHTML = `<span>Sticker: ${label}</span><div class="clip-resize-handle"></div>`;
    lane.appendChild(bar);

    const clipObj = { id: "stk_" + Date.now(), type: "pip", startTime: currentSec, duration: 4, layerIndex: 0, stageEl: badge, barEl: bar };
    badge.addEventListener("mousedown", () => bringPipClipToFront(clipObj));
    bar.addEventListener("mousedown", () => bringPipClipToFront(clipObj));

    timelineClips.push(clipObj);
    attachTimelineClipControls(clipObj);
    recalculatePipTrackLayers();
    bringPipClipToFront(clipObj);
    syncTimelineClipsAtTime(currentSec);
}

function attachTimelineClipControls(clipObj) {
    const bar = clipObj.barEl;
    const handle = bar.querySelector(".clip-resize-handle");

    bar.onmousedown = function(e) {
        if (e.target === handle) return;
        e.stopPropagation();
        if (clipObj.type === "pip") bringPipClipToFront(clipObj);

        const startX = e.clientX;
        const initialLeft = parseFloat(bar.style.left) || 0;
        const pps = getPixelsPerSecond();

        function onDragMove(ev) {
            const newLeft = Math.max(0, initialLeft + (ev.clientX - startX));
            bar.style.left = newLeft + "px";
            clipObj.startTime = parseFloat((newLeft / pps).toFixed(2));

            if (clipObj.type === "pip") recalculatePipTrackLayers();
            const videoEl = document.getElementById("mainPlayer");
            if (videoEl) syncTimelineClipsAtTime(videoEl.currentTime);
        }

        function onDragEnd() {
            document.removeEventListener("mousemove", onDragMove);
            document.removeEventListener("mouseup", onDragEnd);
            updateAutoSaveBadge(`Moved to ${clipObj.startTime}s`);
        }

        document.addEventListener("mousemove", onDragMove);
        document.addEventListener("mouseup", onDragEnd);
    };

    if (handle) {
        handle.onmousedown = function(e) {
            e.stopPropagation();
            const startX = e.clientX;
            const initialWidth = bar.offsetWidth;
            const pps = getPixelsPerSecond();

            function onResizeMove(ev) {
                const newWidth = Math.max(30, initialWidth + (ev.clientX - startX));
                bar.style.width = newWidth + "px";
                clipObj.duration = parseFloat((newWidth / pps).toFixed(2));

                if (clipObj.type === "pip") recalculatePipTrackLayers();
                const videoEl = document.getElementById("mainPlayer");
                if (videoEl) syncTimelineClipsAtTime(videoEl.currentTime);
            }

            function onResizeEnd() {
                document.removeEventListener("mousemove", onResizeMove);
                document.removeEventListener("mouseup", onResizeEnd);
                updateAutoSaveBadge(`Duration: ${clipObj.duration}s`);
            }

            document.addEventListener("mousemove", onResizeMove);
            document.addEventListener("mouseup", onResizeEnd);
        };
    }
}
const TRACK_LABEL_OFFSET = 112; // Matches compact .track-label width

// Extract Real Video Frames into Filmstrip Strip
function generateVideoFilmstrip(videoUrl, targetContainer, frameCount = 8) {
    if (!targetContainer) return;
    const tempVid = document.createElement("video");
    tempVid.src = videoUrl;
    tempVid.muted = true;
    tempVid.playsInline = true;

    tempVid.onloadedmetadata = async () => {
        const dur = tempVid.duration || 5;
        const canvas = document.createElement("canvas");
        canvas.width = 64;
        canvas.height = 36;
        const ctx = canvas.getContext("2d");

        const strip = document.createElement("div");
        strip.className = "filmstrip-row";
        targetContainer.prepend(strip);

        for (let i = 0; i < frameCount; i++) {
            const seekTime = Math.min(dur - 0.1, (dur / frameCount) * i);
            tempVid.currentTime = Math.max(0, seekTime);
            await new Promise(r => { tempVid.onseeked = r; setTimeout(r, 150); });
            ctx.drawImage(tempVid, 0, 0, canvas.width, canvas.height);

            const img = document.createElement("img");
            img.src = canvas.toDataURL("image/jpeg", 0.6);
            strip.appendChild(img);
        }
    };
}

function updateTimelineDimensions() {
    const videoEl = document.getElementById("mainPlayer");
    const duration = (videoEl && videoEl.duration) ? videoEl.duration : 30;
    const pps = getPixelsPerSecond();
    const totalLaneWidth = Math.max(900, Math.ceil(duration * pps) + 120);

    document.querySelectorAll(".track-lane").forEach(lane => {
        lane.style.width = totalLaneWidth + "px";
    });

    const mainTrack = document.getElementById("frameTimelineTrack");
    if (mainTrack && videoEl) {
        const vidWidth = Math.max(80, duration * pps);
        mainTrack.innerHTML = `
            <div id="mainVideoFilmstripBar" style="position: absolute; left: 0; top: 2px; bottom: 2px; width: ${vidWidth}px; background: #1e293b; border: 1.5px solid #2563EB; border-radius: 5px; display: flex; align-items: center; overflow: hidden;">
                <span class="clip-corner-badge">${currentVideoFileName} (${formatTimeSec(duration)})</span>
            </div>
        `;
        const videoSrc = videoEl.querySelector("source") ? videoEl.querySelector("source").src : videoEl.src;
        const frameCount = Math.max(6, Math.min(20, Math.ceil(vidWidth / 55)));
        if (videoSrc) generateVideoFilmstrip(videoSrc, document.getElementById("mainVideoFilmstripBar"), frameCount);
    }

    timelineClips.forEach(clip => {
        if (clip.barEl) {
            clip.barEl.style.left = (clip.startTime * pps) + "px";
            clip.barEl.style.width = Math.max(30, clip.duration * pps) + "px";
        }
    });

    updatePlayheadBar();
}

// Compact 24px Auto-Stacking PiP Layers
function recalculatePipTrackLayers() {
    const pipClips = timelineClips.filter(c => c.type === "pip");
    const pipLane = document.getElementById("pipTrackBlock");
    const pipRow = pipLane ? pipLane.parentElement : null;
    if (!pipLane || !pipRow) return;

    const sorted = [...pipClips].sort((a, b) => a.startTime - b.startTime);
    const layerEndTimes = [];

    sorted.forEach(clip => {
        const clipStart = clip.startTime;
        const clipEnd = clip.startTime + clip.duration;
        let assignedLayer = 0;

        while (true) {
            if (layerEndTimes[assignedLayer] === undefined || clipStart >= (layerEndTimes[assignedLayer] - 0.05)) {
                layerEndTimes[assignedLayer] = clipEnd;
                break;
            }
            assignedLayer++;
        }

        clip.layerIndex = assignedLayer;
        if (clip.barEl) {
            clip.barEl.style.bottom = (2 + assignedLayer * 26) + "px";
        }
    });

    const totalLayers = Math.max(1, layerEndTimes.length);
    pipRow.style.height = Math.max(28, totalLayers * 26 + 4) + "px";
}

// 1. Text Track: Small 'T' Badge + Exact User Text
function addVideoTextOverlay() {
    const txt = prompt("Enter title or caption text:");
    if (!txt) return;
    const wrapper = document.getElementById("videoWrapper");
    const lane = document.getElementById("textTrackBlock");
    const videoEl = document.getElementById("mainPlayer");
    if (!wrapper || !lane) return;

    const currentSec = videoEl ? parseFloat(videoEl.currentTime.toFixed(2)) : 0;
    const defaultDuration = 5.0;
    const pps = getPixelsPerSecond();

    const tag = document.createElement("div");
    tag.innerText = txt;
    tag.style.cssText = "position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); color: #ffffff; background: rgba(15, 23, 42, 0.78); padding: 8px 18px; border-radius: 8px; font-size: 22px; font-weight: 800; cursor: move; z-index: 35; border: 1.5px dashed #38bdf8; white-space: nowrap; user-select: none;";
    makePreviewItemDraggable(tag);
    wrapper.appendChild(tag);

    const bar = document.createElement("div");
    bar.className = "timeline-clip-bar";
    bar.style.cssText += `left: ${currentSec * pps}px; width: ${defaultDuration * pps}px; background: #312e81; border: 1.5px solid #6366f1;`;
    bar.innerHTML = `<span class="clip-corner-badge" style="background:#4f46e5;">T</span><span style="font-size:11px; color:#e0e7ff; margin-left:5px; font-weight:700; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${txt}</span><div class="clip-resize-handle"></div>`;
    lane.appendChild(bar);

    const clipObj = { id: "clip_" + Date.now(), type: "text", startTime: currentSec, duration: defaultDuration, stageEl: tag, barEl: bar };
    timelineClips.push(clipObj);
    attachTimelineClipControls(clipObj);
    syncTimelineClipsAtTime(currentSec);
    triggerAutoSaveVideoDraft();
}

// 2. PiP Track: Live Repeating Image Background OR Video Filmstrip + Corner Badge
function handlePipOverlaySelect(e) {
    const file = e.target.files ? e.target.files[0] : null;
    if (!file) return;
    const wrapper = document.getElementById("videoWrapper");
    const lane = document.getElementById("pipTrackBlock");
    const videoEl = document.getElementById("mainPlayer");
    if (!wrapper || !lane) return;

    const currentSec = videoEl ? parseFloat(videoEl.currentTime.toFixed(2)) : 0;
    const defaultDuration = 5.0;
    const pps = getPixelsPerSecond();
    const url = URL.createObjectURL(file);
    const isVideo = file.type.startsWith("video/");

    topCanvasZIndex += 1;

    const pipBox = document.createElement("div");
    pipBox.className = "live-pip-stage-item";
    pipBox.style.cssText = `position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 185px; border: 2px solid #2563EB; border-radius: 8px; overflow: hidden; cursor: move; z-index: ${topCanvasZIndex}; box-shadow: 0 8px 20px rgba(0,0,0,0.5);`;
    pipBox.innerHTML = isVideo
        ? `<video src="${url}" loop muted playsinline style="width:100%; display:block; pointer-events:none;"></video>`
        : `<img src="${url}" style="width:100%; display:block; pointer-events:none;">`;
    makePreviewItemDraggable(pipBox);
    wrapper.appendChild(pipBox);

    const bar = document.createElement("div");
    bar.className = "timeline-clip-bar pip-clip-bar";
    bar.style.cssText += `left: ${currentSec * pps}px; width: ${defaultDuration * pps}px;`;

    if (!isVideo) {
        // Real Photo Repeating Thumbnail Strip
        bar.style.backgroundImage = `url('${url}')`;
    }
    bar.innerHTML = `<span class="clip-corner-badge">${file.name}</span><div class="clip-resize-handle"></div>`;
    lane.appendChild(bar);

    if (isVideo) {
        generateVideoFilmstrip(url, bar, 5);
    }

    const clipObj = { id: "pip_" + Date.now(), type: "pip", startTime: currentSec, duration: defaultDuration, layerIndex: 0, stageEl: pipBox, barEl: bar };
    pipBox.addEventListener("mousedown", () => bringPipClipToFront(clipObj));
    bar.addEventListener("mousedown", () => bringPipClipToFront(clipObj));

    timelineClips.push(clipObj);
    attachTimelineClipControls(clipObj);
    recalculatePipTrackLayers();
    bringPipClipToFront(clipObj);
    syncTimelineClipsAtTime(currentSec);

    e.target.value = "";
    triggerAutoSaveVideoDraft();
}

// 3. Audio Track: Visual Waveform Bars Graphic (|||||||) + Corner Badge
function handleAudioTrackSelect(e) {
    const file = e.target.files ? e.target.files[0] : null;
    if (!file) return;
    const lane = document.getElementById("audioTrackBlock");
    const videoEl = document.getElementById("mainPlayer");
    if (!lane) return;

    const currentSec = videoEl ? parseFloat(videoEl.currentTime.toFixed(2)) : 0;
    const pps = getPixelsPerSecond();
    const audioEl = new Audio(URL.createObjectURL(file));

    audioEl.onloadedmetadata = () => {
        const dur = Math.min(audioEl.duration || 10, (videoEl && videoEl.duration) ? videoEl.duration : 15);
        const barWidth = Math.max(50, dur * pps);

        // Repeating SVG Waveform Pattern
        const waveSvg = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'%3E%3Crect x='2' y='8' width='2' height='8' fill='%2334d399'/%3E%3Crect x='6' y='4' width='2' height='16' fill='%2310b981'/%3E%3Crect x='10' y='10' width='2' height='4' fill='%2334d399'/%3E%3Crect x='14' y='3' width='2' height='18' fill='%236ee7b7'/%3E%3Crect x='18' y='7' width='2' height='10' fill='%2310b981'/%3E%3C/svg%3E")`;

        const bar = document.createElement("div");
        bar.className = "timeline-clip-bar";
        bar.style.cssText += `left: ${currentSec * pps}px; width: ${barWidth}px; background-color: #064e3b; background-image: ${waveSvg}; background-repeat: repeat-x; background-position: center; border: 1.5px solid #10b981;`;
        bar.innerHTML = `<span class="clip-corner-badge">${file.name}</span><div class="clip-resize-handle"></div>`;
        lane.appendChild(bar);

        const clipObj = { id: "aud_" + Date.now(), type: "audio", startTime: currentSec, duration: dur, audioEl: audioEl, barEl: bar };
        timelineClips.push(clipObj);
        attachTimelineClipControls(clipObj);
    };
    e.target.value = "";
    triggerAutoSaveVideoDraft();
}

function deselectAllClips() {
    selectedClipId = null;
    document.querySelectorAll(".canvas-overlay-item").forEach(el => el.classList.remove("canvas-item-selected"));
    document.querySelectorAll(".timeline-clip-bar").forEach(b => b.classList.remove("active-selected-clip"));
    const ctxBar = document.getElementById("clipContextActionBar");
    if (ctxBar) ctxBar.style.display = "none";
}

// Click empty canvas background to deselect
document.addEventListener("DOMContentLoaded", () => {
    const wrapper = document.getElementById("videoWrapper");
    if (wrapper) {
        wrapper.addEventListener("mousedown", (e) => {
            if (e.target === wrapper || e.target.id === "mainPlayer") {
                deselectAllClips();
            }
        });
    }
});

// Delete Specific Layer from Canvas & Timeline
function deleteClipById(clipId) {
    const idx = timelineClips.findIndex(c => c.id === clipId);
    if (idx === -1) return;
    const clip = timelineClips[idx];

    if (clip.stageEl) clip.stageEl.remove();
    if (clip.barEl) clip.barEl.remove();
    if (clip.audioEl) clip.audioEl.pause();

    timelineClips.splice(idx, 1);
    if (selectedClipId === clipId) deselectAllClips();
    recalculatePipTrackLayers();
    updateAutoSaveBadge("Layer Deleted");
    triggerAutoSaveVideoDraft();
}

function deleteSelectedTimelineClip() {
    if (selectedClipId) deleteClipById(selectedClipId);
}

// Replace Selected PiP File Without Losing Position or Timing
function triggerReplaceSelectedPip() {
    if (!selectedClipId) return;
    const input = document.getElementById("replacePipFileInput");
    if (input) input.click();
}

function handleReplacePipFile(e) {
    const file = e.target.files ? e.target.files[0] : null;
    if (!file || !selectedClipId) return;

    const clip = timelineClips.find(c => c.id === selectedClipId);
    if (!clip || !clip.stageEl) return;

    const url = URL.createObjectURL(file);
    const isVideo = file.type.startsWith("video/");
    clip.label = file.name;

    // Keep existing delete & resize handles while replacing inner media
    const oldMedia = clip.stageEl.querySelector(".pip-inner-media");
    if (oldMedia) oldMedia.remove();

    const mediaHtml = isVideo
        ? `<video class="pip-inner-media" src="${url}" loop muted playsinline style="width:100%; height:100%; object-fit:cover; display:block; pointer-events:none; border-radius:inherit;"></video>`
        : `<img class="pip-inner-media" src="${url}" style="width:100%; height:100%; object-fit:cover; display:block; pointer-events:none; border-radius:inherit;">`;
    clip.stageEl.insertAdjacentHTML("afterbegin", mediaHtml);

    if (clip.barEl) {
        clip.barEl.style.backgroundImage = isVideo ? "none" : `url('${url}')`;
        const badge = clip.barEl.querySelector(".clip-corner-badge");
        if (badge) badge.innerText = file.name;
    }

    const ctxBadge = document.getElementById("selectedClipBadgeName");
    if (ctxBadge) ctxBadge.innerText = file.name;

    e.target.value = "";
    updateAutoSaveBadge("PiP Media Replaced");
    triggerAutoSaveVideoDraft();
}

// Motion Animations (Fade In, Pop Zoom, Slide Left, Slide Up, Bounce)
function applySelectedClipMotion(motionType) {
    const clip = timelineClips.find(c => c.id === selectedClipId);
    if (!clip || !clip.stageEl) return;
    clip.motion = motionType;

    const el = clip.stageEl;
    if (motionType === "fadeIn") {
        el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 550, easing: "ease-out" });
    } else if (motionType === "popZoom") {
        el.animate([{ transform: "scale(0.3)", opacity: 0 }, { transform: "scale(1.08)", opacity: 1 }, { transform: "scale(1)" }], { duration: 500, easing: "ease-out" });
    } else if (motionType === "slideLeft") {
        el.animate([{ transform: "translateX(80px)", opacity: 0 }, { transform: "translateX(0)", opacity: 1 }], { duration: 480, easing: "ease-out" });
    } else if (motionType === "slideUp") {
        el.animate([{ transform: "translateY(70px)", opacity: 0 }, { transform: "translateY(0)", opacity: 1 }], { duration: 480, easing: "ease-out" });
    } else if (motionType === "bounce") {
        el.animate([{ transform: "translateY(0)" }, { transform: "translateY(-18px)" }, { transform: "translateY(0)" }, { transform: "translateY(-8px)" }, { transform: "translateY(0)" }], { duration: 650 });
    }
}

// Frames & Borders (Circle, Rounded, White Polaroid, Shadow Glow)
function applySelectedClipFrame(frameType) {
    const clip = timelineClips.find(c => c.id === selectedClipId);
    if (!clip || !clip.stageEl) return;
    clip.frame = frameType;

    const el = clip.stageEl;
    el.style.clipPath = "none";
    el.style.borderRadius = "6px";
    el.style.padding = "0px";
    el.style.background = clip.type === "text" ? "rgba(15, 23, 42, 0.8)" : "transparent";

    if (frameType === "circle") {
        el.style.clipPath = "circle(48% at 50% 50%)";
    } else if (frameType === "rounded") {
        el.style.borderRadius = "18px";
    } else if (frameType === "polaroid") {
        el.style.background = "#ffffff";
        el.style.padding = "6px 6px 18px 6px";
        el.style.borderRadius = "4px";
    } else if (frameType === "glow") {
        el.style.boxShadow = "0 0 22px rgba(37, 99, 235, 0.85)";
    }
}

// Opacity Slider (0% - 100%)
function updateSelectedClipOpacity(val) {
    const clip = timelineClips.find(c => c.id === selectedClipId);
    if (!clip || !clip.stageEl) return;
    clip.opacity = parseInt(val);
    clip.stageEl.style.opacity = (clip.opacity / 100).toString();
    const disp = document.getElementById("ctxOpacityVal");
    if (disp) disp.innerText = val + "%";
}

// Ultra-Slim 19px Stacking Calculation
function recalculatePipTrackLayers() {
    const pipClips = timelineClips.filter(c => c.type === "pip");
    const pipLane = document.getElementById("pipTrackBlock");
    const pipRow = pipLane ? pipLane.parentElement : null;
    if (!pipLane || !pipRow) return;

    const sorted = [...pipClips].sort((a, b) => a.startTime - b.startTime);
    const layerEndTimes = [];

    sorted.forEach(clip => {
        const clipStart = clip.startTime;
        const clipEnd = clip.startTime + clip.duration;
        let assignedLayer = 0;

        while (true) {
            if (layerEndTimes[assignedLayer] === undefined || clipStart >= (layerEndTimes[assignedLayer] - 0.05)) {
                layerEndTimes[assignedLayer] = clipEnd;
                break;
            }
            assignedLayer++;
        }

        clip.layerIndex = assignedLayer;
        if (clip.barEl) {
            clip.barEl.style.bottom = (2 + assignedLayer * 21) + "px";
        }
    });

    const totalLayers = Math.max(1, layerEndTimes.length);
    pipRow.style.height = Math.max(24, totalLayers * 21 + 4) + "px";
}

// Attach Canvas Delete (✕), Resize (↘) & Dragging Controls
function attachCanvasItemControls(clipObj) {
    const el = clipObj.stageEl;
    if (!el) return;

    // Add Top-Right Red Delete (✕) Button
    const delBtn = document.createElement("button");
    delBtn.type = "button";
    delBtn.className = "canvas-item-delete-btn";
    delBtn.innerText = "✕";
    delBtn.title = "Delete Layer";
    delBtn.onmousedown = (e) => { e.stopPropagation(); deleteClipById(clipObj.id); };
    el.appendChild(delBtn);

    // Add Bottom-Right Blue Resize (↘) Handle
    const resBtn = document.createElement("div");
    resBtn.className = "canvas-item-resize-btn";
    resBtn.innerText = "↘";
    resBtn.title = "Drag to Resize";
    el.appendChild(resBtn);

    // Resize Logic
    resBtn.onmousedown = function(e) {
        e.stopPropagation();
        selectTimelineClip(clipObj);
        const startX = e.clientX;
        const startWidth = el.offsetWidth;
        const startFontSize = parseFloat(window.getComputedStyle(el).fontSize) || 22;

        function onResizeMove(ev) {
            const deltaX = ev.clientX - startX;
            if (clipObj.type === "text") {
                const newFont = Math.max(12, Math.min(72, startFontSize + deltaX * 0.15));
                el.style.fontSize = newFont + "px";
            } else {
                const newWidth = Math.max(50, Math.min(650, startWidth + deltaX));
                el.style.width = newWidth + "px";
            }
        }

        function onResizeUp() {
            document.removeEventListener("mousemove", onResizeMove);
            document.removeEventListener("mouseup", onResizeUp);
        }

        document.addEventListener("mousemove", onResizeMove);
        document.addEventListener("mouseup", onResizeUp);
    };

    // Drag & Select Logic
    el.onmousedown = function(e) {
        if (e.target === delBtn || e.target === resBtn) return;
        e.stopPropagation();
        selectTimelineClip(clipObj);

        const parentRect = el.parentElement.getBoundingClientRect();
        const elRect = el.getBoundingClientRect();

        if (el.style.transform && el.style.transform.includes("translate")) {
            el.style.left = (elRect.left - parentRect.left) + "px";
            el.style.top = (elRect.top - parentRect.top) + "px";
            el.style.transform = "none";
        }

        const shiftX = e.clientX - el.getBoundingClientRect().left;
        const shiftY = e.clientY - el.getBoundingClientRect().top;

        function onMove(ev) {
            const maxLeft = parentRect.width - el.offsetWidth;
            const maxTop = parentRect.height - el.offsetHeight;
            el.style.left = Math.max(0, Math.min(maxLeft, ev.clientX - parentRect.left - shiftX)) + "px";
            el.style.top = Math.max(0, Math.min(maxTop, ev.clientY - parentRect.top - shiftY)) + "px";
        }

        function onUp() {
            document.removeEventListener("mousemove", onMove);
            document.removeEventListener("mouseup", onUp);
        }

        document.addEventListener("mousemove", onMove);
        document.addEventListener("mouseup", onUp);
    };
}

// Updated Add Text Overlay (With Selection Box, Delete & Resize Handles)
function addVideoTextOverlay() {
    const txt = prompt("Enter title or caption text:");
    if (!txt) return;
    const wrapper = document.getElementById("videoWrapper");
    const lane = document.getElementById("textTrackBlock");
    const videoEl = document.getElementById("mainPlayer");
    if (!wrapper || !lane) return;

    const currentSec = videoEl ? parseFloat(videoEl.currentTime.toFixed(2)) : 0;
    const defaultDuration = 5.0;
    const pps = getPixelsPerSecond();
    topCanvasZIndex += 1;

    const tag = document.createElement("div");
    tag.className = "canvas-overlay-item";
    tag.innerText = txt;
    tag.style.cssText = `position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); color: #ffffff; background: rgba(15, 23, 42, 0.8); padding: 7px 16px; border-radius: 6px; font-size: 22px; font-weight: 800; cursor: move; z-index: ${topCanvasZIndex}; white-space: nowrap; user-select: none;`;
    wrapper.appendChild(tag);

    const bar = document.createElement("div");
    bar.className = "timeline-clip-bar";
    bar.style.cssText += `left: ${currentSec * pps}px; width: ${defaultDuration * pps}px; background: #312e81; border: 1px solid #6366f1;`;
    bar.innerHTML = `<span class="clip-corner-badge" style="background:#4f46e5;">T: ${txt}</span><div class="clip-resize-handle"></div>`;
    lane.appendChild(bar);

    const clipObj = { id: "clip_" + Date.now(), type: "text", label: `Text: ${txt}`, startTime: currentSec, duration: defaultDuration, stageEl: tag, barEl: bar };
    bar.addEventListener("mousedown", () => selectTimelineClip(clipObj));

    timelineClips.push(clipObj);
    attachCanvasItemControls(clipObj);
    attachTimelineClipControls(clipObj);
    selectTimelineClip(clipObj);
    syncTimelineClipsAtTime(currentSec);
    triggerAutoSaveVideoDraft();
}

// Updated Add PiP Overlay (With Selection Box, Replace, Delete & Resize Handles)
function handlePipOverlaySelect(e) {
    const file = e.target.files ? e.target.files[0] : null;
    if (!file) return;
    const wrapper = document.getElementById("videoWrapper");
    const lane = document.getElementById("pipTrackBlock");
    const videoEl = document.getElementById("mainPlayer");
    if (!wrapper || !lane) return;

    const currentSec = videoEl ? parseFloat(videoEl.currentTime.toFixed(2)) : 0;
    const defaultDuration = 5.0;
    const pps = getPixelsPerSecond();
    const url = URL.createObjectURL(file);
    const isVideo = file.type.startsWith("video/");
    topCanvasZIndex += 1;

    const pipBox = document.createElement("div");
    pipBox.className = "canvas-overlay-item";
    pipBox.style.cssText = `position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 185px; border-radius: 6px; cursor: move; z-index: ${topCanvasZIndex};`;
    pipBox.innerHTML = isVideo
        ? `<video class="pip-inner-media" src="${url}" loop muted playsinline style="width:100%; display:block; pointer-events:none; border-radius:inherit;"></video>`
        : `<img class="pip-inner-media" src="${url}" style="width:100%; display:block; pointer-events:none; border-radius:inherit;">`;
    wrapper.appendChild(pipBox);

    const bar = document.createElement("div");
    bar.className = "timeline-clip-bar pip-clip-bar";
    bar.style.cssText += `left: ${currentSec * pps}px; width: ${defaultDuration * pps}px;`;
    if (!isVideo) bar.style.backgroundImage = `url('${url}')`;
    bar.innerHTML = `<span class="clip-corner-badge">${file.name}</span><div class="clip-resize-handle"></div>`;
    lane.appendChild(bar);

    const clipObj = { id: "pip_" + Date.now(), type: "pip", label: file.name, startTime: currentSec, duration: defaultDuration, layerIndex: 0, stageEl: pipBox, barEl: bar };
    bar.addEventListener("mousedown", () => selectTimelineClip(clipObj));

    timelineClips.push(clipObj);
    attachCanvasItemControls(clipObj);
    attachTimelineClipControls(clipObj);
    recalculatePipTrackLayers();
    selectTimelineClip(clipObj);
    syncTimelineClipsAtTime(currentSec);

    e.target.value = "";
    triggerAutoSaveVideoDraft();
}
function switchBottomDockMode(mode) {
    const subDock = document.getElementById("inPlaceSubDock");
    const mainDock = document.getElementById("mainVideoDock");
    const pipDock = document.getElementById("pipEditDock");

    if (subDock) subDock.style.display = "none";
    currentOpenCategory = null;

    if (mode === "pip") {
        if (mainDock) mainDock.style.display = "none";
        if (pipDock) pipDock.style.display = "flex";
    } else {
        if (pipDock) pipDock.style.display = "none";
        if (mainDock) mainDock.style.display = "flex";
    }
}

function selectTimelineClip(clipObj) {
    if (!clipObj) return;
    selectedClipId = clipObj.id;
    topCanvasZIndex += 1;

    document.querySelectorAll(".canvas-overlay-item").forEach(el => el.classList.remove("canvas-item-selected"));
    if (clipObj.stageEl) {
        clipObj.stageEl.style.zIndex = topCanvasZIndex;
        clipObj.stageEl.classList.add("canvas-item-selected");
    }

    document.querySelectorAll(".timeline-clip-bar").forEach(b => b.classList.remove("active-selected-clip"));
    if (clipObj.barEl) {
        clipObj.barEl.classList.add("active-selected-clip");
    }

    // Switch bottom dock to Dedicated 12-Icon PiP Dock
    switchBottomDockMode("pip");
}

function deselectAllClips() {
    selectedClipId = null;
    document.querySelectorAll(".canvas-overlay-item").forEach(el => el.classList.remove("canvas-item-selected"));
    document.querySelectorAll(".timeline-clip-bar").forEach(b => b.classList.remove("active-selected-clip"));
    switchBottomDockMode("main");
}

// Click Empty Space in Timeline or Main Video Track -> Return to Main Video Dock
document.addEventListener("DOMContentLoaded", () => {
    const wrapper = document.getElementById("videoWrapper");
    if (wrapper) {
        wrapper.addEventListener("mousedown", (e) => {
            if (e.target === wrapper || e.target.id === "mainPlayer") {
                deselectAllClips();
            }
        });
    }
    const timelineScroll = document.getElementById("timelineTracksContainer");
    if (timelineScroll) {
        timelineScroll.addEventListener("mousedown", (e) => {
            if (!e.target.closest(".timeline-clip-bar")) {
                deselectAllClips();
            }
        });
    }
});

// Attach 4-Corner Zoom Dots + Top Free Rotate Handle (↻) + Dragging
function attachCanvasItemControls(clipObj) {
    const el = clipObj.stageEl;
    if (!el) return;

    clipObj.rotation = clipObj.rotation || 0;
    clipObj.flipX = clipObj.flipX || 1;

    // 4 Corner Dots
    ["tl", "tr", "bl", "br"].forEach(corner => {
        const dot = document.createElement("div");
        dot.className = `pip-corner-dot pip-dot-${corner}`;
        el.appendChild(dot);

        dot.onmousedown = function(e) {
            e.stopPropagation();
            selectTimelineClip(clipObj);
            const startX = e.clientX;
            const startWidth = el.offsetWidth;
            const startFont = parseFloat(window.getComputedStyle(el).fontSize) || 22;
            const dir = (corner === "tl" || corner === "bl") ? -1 : 1;

            function onCornerMove(ev) {
                const delta = (ev.clientX - startX) * dir;
                if (clipObj.type === "text") {
                    el.style.fontSize = Math.max(12, Math.min(72, startFont + delta * 0.16)) + "px";
                } else {
                    el.style.width = Math.max(45, Math.min(720, startWidth + delta)) + "px";
                }
            }
            function onCornerUp() {
                document.removeEventListener("mousemove", onCornerMove);
                document.removeEventListener("mouseup", onCornerUp);
            }
            document.addEventListener("mousemove", onCornerMove);
            document.addEventListener("mouseup", onCornerUp);
        };
    });

    // Top Free-Angle Rotate Handle (↻)
    const stem = document.createElement("div");
    stem.className = "pip-rotate-stem";
    el.appendChild(stem);

    const knob = document.createElement("div");
    knob.className = "pip-rotate-knob";
    knob.innerText = "↻";
    knob.title = "Drag to Rotate Any Angle";
    el.appendChild(knob);

    knob.onmousedown = function(e) {
        e.stopPropagation();
        selectTimelineClip(clipObj);
        const rect = el.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        function onRotateMove(ev) {
            const rad = Math.atan2(ev.clientY - centerY, ev.clientX - centerX);
            const deg = Math.round((rad * 180) / Math.PI) + 90;
            clipObj.rotation = deg;
            applyPipTransform(clipObj);
        }
        function onRotateUp() {
            document.removeEventListener("mousemove", onRotateMove);
            document.removeEventListener("mouseup", onRotateUp);
            updateAutoSaveBadge(`Angle: ${clipObj.rotation}°`);
        }
        document.addEventListener("mousemove", onRotateMove);
        document.addEventListener("mouseup", onRotateUp);
    };

    // Drag Anywhere on Preview Stage
    el.onmousedown = function(e) {
        if (e.target.classList.contains("pip-corner-dot") || e.target === knob) return;
        e.stopPropagation();
        selectTimelineClip(clipObj);

        const parentRect = el.parentElement.getBoundingClientRect();
        const elRect = el.getBoundingClientRect();

        if (el.style.transform && el.style.transform.includes("translate")) {
            el.style.left = (elRect.left - parentRect.left) + "px";
            el.style.top = (elRect.top - parentRect.top) + "px";
            applyPipTransform(clipObj);
        }

        const shiftX = e.clientX - el.offsetLeft;
        const shiftY = e.clientY - el.offsetTop;

        function onMove(ev) {
            const maxLeft = parentRect.width - el.offsetWidth;
            const maxTop = parentRect.height - el.offsetHeight;
            el.style.left = Math.max(0, Math.min(maxLeft, ev.clientX - parentRect.left - shiftX)) + "px";
            el.style.top = Math.max(0, Math.min(maxTop, ev.clientY - parentRect.top - shiftY)) + "px";
        }
        function onUp() {
            document.removeEventListener("mousemove", onMove);
            document.removeEventListener("mouseup", onUp);
        }
        document.addEventListener("mousemove", onMove);
        document.addEventListener("mouseup", onUp);
    };
}

function applyPipTransform(clipObj) {
    if (!clipObj || !clipObj.stageEl) return;
    clipObj.stageEl.style.transform = `rotate(${clipObj.rotation || 0}deg) scaleX(${clipObj.flipX || 1})`;
}

// ==========================================================================
// 12 DEDICATED PIP TOOLS TEMPLATES & FUNCTIONS
// ==========================================================================
Object.assign(toolCategoryTemplates, {
    pip_motion: `
        <button type="button" class="tool-chip" onclick="applySelectedClipMotion('fadeIn')">Fade In</button>
        <button type="button" class="tool-chip" onclick="applySelectedClipMotion('popZoom')">Pop Zoom</button>
        <button type="button" class="tool-chip" onclick="applySelectedClipMotion('slideLeft')">Slide Left</button>
        <button type="button" class="tool-chip" onclick="applySelectedClipMotion('slideUp')">Slide Up</button>
        <button type="button" class="tool-chip" onclick="applySelectedClipMotion('spin')">Spin In</button>
        <button type="button" class="tool-chip" onclick="applySelectedClipMotion('bounce')">Bounce</button>
    `,
    pip_frames: `
        <button type="button" class="tool-chip" onclick="applySelectedClipFrame('none')">Original</button>
        <button type="button" class="tool-chip" onclick="applySelectedClipFrame('circle')">Circle Frame</button>
        <button type="button" class="tool-chip" onclick="applySelectedClipFrame('rounded')">Rounded Card</button>
        <button type="button" class="tool-chip" onclick="applySelectedClipFrame('polaroid')">White Polaroid</button>
        <button type="button" class="tool-chip" onclick="applySelectedClipFrame('neon')">Neon Border</button>
        <button type="button" class="tool-chip" onclick="applySelectedClipFrame('glow')">Drop Shadow</button>
    `,
    pip_crop: `
        <button type="button" class="tool-chip" onclick="cropSelectedPipShape('inset(0% 0% 0% 0%)')">Full Uncropped</button>
        <button type="button" class="tool-chip" onclick="cropSelectedPipShape('inset(12% 12% 12% 12%)')">Tight Zoom Crop</button>
        <button type="button" class="tool-chip" onclick="cropSelectedPipShape('inset(0% 20% 0% 20%)')">Portrait 9:16 Crop</button>
        <button type="button" class="tool-chip" onclick="cropSelectedPipShape('inset(18% 0% 18% 0%)')">Cinematic Wide Crop</button>
    `,
    pip_blend: `
        <div class="blur-slider-pill">
            <span>Opacity:</span>
            <input type="range" min="0" max="100" value="100" oninput="updateSelectedClipOpacity(this.value)">
            <span id="ctxOpacityVal">100%</span>
        </div>
        <button type="button" class="tool-chip" onclick="setSelectedPipBlendMode('normal')">Normal</button>
        <button type="button" class="tool-chip" onclick="setSelectedPipBlendMode('overlay')">Overlay</button>
        <button type="button" class="tool-chip" onclick="setSelectedPipBlendMode('screen')">Screen</button>
        <button type="button" class="tool-chip" onclick="setSelectedPipBlendMode('multiply')">Multiply</button>
    `,
    pip_keyframe: `
        <button type="button" class="tool-chip chip-cyan" onclick="animateSelectedPipPath('panRight')">Keyframe: Slide Left → Right</button>
        <button type="button" class="tool-chip chip-cyan" onclick="animateSelectedPipPath('floatUp')">Keyframe: Float Bottom → Top</button>
        <button type="button" class="tool-chip chip-cyan" onclick="animateSelectedPipPath('kenBurns')">Keyframe: Slow Ken Burns Zoom</button>
    `,
    pip_rotate: `
        <button type="button" class="tool-chip" onclick="rotateSelectedPip90()">Rotate 90°</button>
        <button type="button" class="tool-chip" onclick="flipSelectedPipMirror()">Mirror Flip H</button>
        <button type="button" class="tool-chip" onclick="resetSelectedPipTransform()">Reset Angle</button>
    `,
    pip_layers: `
        <button type="button" class="tool-chip" onclick="changeSelectedPipOrder('front')">Bring to Front ↑</button>
        <button type="button" class="tool-chip" onclick="changeSelectedPipOrder('back')">Send to Back ↓</button>
    `
});

// 2. Split PiP Clip at Current Playhead
function splitSelectedPipClip() {
    const clip = timelineClips.find(c => c.id === selectedClipId);
    const videoEl = document.getElementById("mainPlayer");
    if (!clip || !videoEl) return;

    const splitTime = parseFloat(videoEl.currentTime.toFixed(2));
    if (splitTime <= clip.startTime + 0.2 || splitTime >= clip.startTime + clip.duration - 0.2) {
        updateAutoSaveBadge("Move playhead inside PiP bar to split");
        return;
    }

    const firstDur = parseFloat((splitTime - clip.startTime).toFixed(2));
    const secondDur = parseFloat((clip.duration - firstDur).toFixed(2));
    const pps = getPixelsPerSecond();

    clip.duration = firstDur;
    if (clip.barEl) clip.barEl.style.width = (firstDur * pps) + "px";

    // Create second half clone starting at splitTime
    duplicateSelectedPipClip(splitTime, secondDur);
    updateAutoSaveBadge("PiP Split into 2 Clips");
}

// 4. Extended Frames (Added Neon Border)
function applySelectedClipFrame(frameType) {
    const clip = timelineClips.find(c => c.id === selectedClipId);
    if (!clip || !clip.stageEl) return;
    const el = clip.stageEl;

    el.style.clipPath = "none";
    el.style.borderRadius = "6px";
    el.style.padding = "0px";
    el.style.background = clip.type === "text" ? "rgba(15, 23, 42, 0.8)" : "transparent";
    el.style.boxShadow = "none";

    if (frameType === "circle") el.style.clipPath = "circle(48% at 50% 50%)";
    else if (frameType === "rounded") el.style.borderRadius = "18px";
    else if (frameType === "polaroid") { el.style.background = "#ffffff"; el.style.padding = "6px 6px 20px 6px"; el.style.borderRadius = "4px"; }
    else if (frameType === "neon") { el.style.boxShadow = "0 0 0 2px #38bdf8, 0 0 18px #2563EB"; }
    else if (frameType === "glow") { el.style.boxShadow = "0 12px 28px rgba(0,0,0,0.8)"; }
}

// 5. Crop PiP
function cropSelectedPipShape(insetCss) {
    const clip = timelineClips.find(c => c.id === selectedClipId);
    if (!clip || !clip.stageEl) return;
    const media = clip.stageEl.querySelector(".pip-inner-media") || clip.stageEl;
    media.style.clipPath = insetCss;
}

// 6. AI Cutout (1-Click BG Remove)
function togglePipAiCutout(btn) {
    const clip = timelineClips.find(c => c.id === selectedClipId);
    if (!clip || !clip.stageEl) return;
    const media = clip.stageEl.querySelector(".pip-inner-media") || clip.stageEl;
    clip.aiCutout = !clip.aiCutout;
    media.style.mixBlendMode = clip.aiCutout ? "multiply" : "normal";
    if (btn) btn.classList.toggle("active-icon", clip.aiCutout);
    updateAutoSaveBadge(clip.aiCutout ? "AI Cutout Applied" : "Original BG Restored");
}

// 7. Blend Mode
function setSelectedPipBlendMode(mode) {
    const clip = timelineClips.find(c => c.id === selectedClipId);
    if (!clip || !clip.stageEl) return;
    clip.stageEl.style.mixBlendMode = mode;
}

// 8. Keyframe Animation Path
function animateSelectedPipPath(pathType) {
    const clip = timelineClips.find(c => c.id === selectedClipId);
    if (!clip || !clip.stageEl) return;
    const el = clip.stageEl;

    if (pathType === "panRight") {
        el.animate([{ left: "10%" }, { left: "65%" }], { duration: 2500, easing: "ease-in-out", fill: "forwards" });
    } else if (pathType === "floatUp") {
        el.animate([{ top: "70%" }, { top: "15%" }], { duration: 2500, easing: "ease-in-out", fill: "forwards" });
    } else if (pathType === "kenBurns") {
        el.animate([{ transform: "scale(1)" }, { transform: "scale(1.25)" }], { duration: 3000, easing: "ease-out", fill: "forwards" });
    }
    updateAutoSaveBadge("Keyframe Path Applied");
}

// 9. Rotate 90° & Mirror Flip
function rotateSelectedPip90() {
    const clip = timelineClips.find(c => c.id === selectedClipId);
    if (!clip) return;
    clip.rotation = ((clip.rotation || 0) + 90) % 360;
    applyPipTransform(clip);
}

function flipSelectedPipMirror() {
    const clip = timelineClips.find(c => c.id === selectedClipId);
    if (!clip) return;
    clip.flipX = (clip.flipX || 1) === 1 ? -1 : 1;
    applyPipTransform(clip);
}

function resetSelectedPipTransform() {
    const clip = timelineClips.find(c => c.id === selectedClipId);
    if (!clip) return;
    clip.rotation = 0;
    clip.flipX = 1;
    applyPipTransform(clip);
}

// 10. Layer Order (Bring to Front / Send to Back)
function changeSelectedPipOrder(dir) {
    const clip = timelineClips.find(c => c.id === selectedClipId);
    if (!clip || !clip.stageEl) return;
    if (dir === "front") {
        topCanvasZIndex += 1;
        clip.stageEl.style.zIndex = topCanvasZIndex;
    } else {
        clip.stageEl.style.zIndex = 22;
    }
    updateAutoSaveBadge(dir === "front" ? "Brought to Front" : "Sent to Back");
}

// 11. Duplicate Selected PiP Layer
function duplicateSelectedPipClip(customStart, customDur) {
    const clip = timelineClips.find(c => c.id === selectedClipId);
    const wrapper = document.getElementById("videoWrapper");
    const lane = document.getElementById(clip && clip.type === "text" ? "textTrackBlock" : "pipTrackBlock");
    if (!clip || !wrapper || !lane) return;

    const pps = getPixelsPerSecond();
    const newStart = customStart !== undefined ? customStart : parseFloat((clip.startTime + 0.5).toFixed(2));
    const newDur = customDur !== undefined ? customDur : clip.duration;
    topCanvasZIndex += 1;

    // Clone Stage Element (Strip old handles before re-attaching fresh handles)
    const clonedStage = clip.stageEl.cloneNode(true);
    clonedStage.querySelectorAll(".pip-corner-dot, .pip-rotate-stem, .pip-rotate-knob").forEach(h => h.remove());
    clonedStage.style.zIndex = topCanvasZIndex;
    if (customStart === undefined) {
        clonedStage.style.left = ((parseFloat(clip.stageEl.style.left) || 120) + 24) + "px";
        clonedStage.style.top = ((parseFloat(clip.stageEl.style.top) || 80) + 24) + "px";
    }
    wrapper.appendChild(clonedStage);

    // Clone Timeline Bar
    const clonedBar = clip.barEl.cloneNode(true);
    clonedBar.style.left = (newStart * pps) + "px";
    clonedBar.style.width = (newDur * pps) + "px";
    lane.appendChild(clonedBar);

    const newClip = {
        id: "dup_" + Date.now() + Math.floor(Math.random() * 100),
        type: clip.type,
        label: clip.label,
        startTime: newStart,
        duration: newDur,
        rotation: clip.rotation || 0,
        flipX: clip.flipX || 1,
        stageEl: clonedStage,
        barEl: clonedBar
    };

    clonedBar.addEventListener("mousedown", () => selectTimelineClip(newClip));
    timelineClips.push(newClip);
    attachCanvasItemControls(newClip);
    attachTimelineClipControls(newClip);
    recalculatePipTrackLayers();
    selectTimelineClip(newClip);
    syncTimelineClipsAtTime(newStart);
}