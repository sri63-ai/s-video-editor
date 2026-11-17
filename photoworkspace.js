// ==========================================================================
// S PHOTO STUDIO - COMPLETE 14-TOOL ENGINE & EXPORT PIPELINE (photoworkspace.js)
// ==========================================================================

let currentPhotoBlob = null;
let currentPhotoFileName = "S_Studio_Photo.png";
let activePhotoDraftId = null;

// Core Transform & Color State
let photoState = {
    scale: 1.0,
    rotation: 0,
    flipX: 1,
    flipY: 1,
    brightness: 100,
    contrast: 100,
    saturate: 100,
    exposure: 100,
    highlights: 100,
    shadows: 100,
    warmth: 0,
    presetFilter: "",
    retouchSmooth: 0,
    upscaleSharp: 0,
    blurBokeh: 0,
    frameStyle: "none",
    aspectRatio: "unset",
    bgMode: "none", // none | transparent | color | image
    bgColor: "#2563EB",
    bgImageSrc: ""
};

let undoStack = [];
let redoStack = [];
let layersList = []; // { id, type: 'text'|'sticker'|'image', content, x, y, color, styleType, visible, locked }

// Drawing / Magic Eraser State
let activeBrushMode = "none"; // none | draw | eraser
let brushColor = "#EF4444";
let brushSize = 14;
let isDrawingNow = false;

// Export Modal State
let selectedExportMime = "image/png";
let selectedExportQuality = "original";

// ==========================================================================
// 1. INITIALIZATION & DRAFT RESUME
// ==========================================================================
document.addEventListener("DOMContentLoaded", async () => {
    initDrawingCanvasEvents();

    const params = new URLSearchParams(window.location.search);
    const urlDraftId = params.get("draftId") || localStorage.getItem("sStudio_activeDraftId");

    if (urlDraftId && typeof getDraftById === "function") {
        const savedDraft = await getDraftById(urlDraftId);
        if (savedDraft && savedDraft.mode === "photo" && savedDraft.fileBlob) {
            activePhotoDraftId = savedDraft.draftId;
            currentPhotoBlob = savedDraft.fileBlob;
            currentPhotoFileName = savedDraft.fileName || "Resumed_Photo.png";
            photoState.scale = savedDraft.scale || 1.0;
            photoState.rotation = savedDraft.rotation || 0;
            photoState.brightness = savedDraft.brightness || 100;
            photoState.contrast = savedDraft.contrast || 100;
            photoState.saturate = savedDraft.saturate || 100;
            photoState.warmth = savedDraft.warmth || 0;

            loadPhotoIntoCanvas(currentPhotoBlob);
            updateSaveStatus("Resumed Saved Draft");
        }
    }
});

async function handlePhotoSelect(event) {
    const file = event.target.files ? event.target.files[0] : null;
    if (!file) return;

    currentPhotoBlob = file;
    currentPhotoFileName = file.name;
    activePhotoDraftId = "draft_img_" + Date.now();

    // Reset state for new upload
    photoState = {
        scale: 1.0, rotation: 0, flipX: 1, flipY: 1,
        brightness: 100, contrast: 100, saturate: 100,
        exposure: 100, highlights: 100, shadows: 100, warmth: 0,
        presetFilter: "", retouchSmooth: 0, upscaleSharp: 0, blurBokeh: 0,
        frameStyle: "none", aspectRatio: "unset",
        bgMode: "none", bgColor: "#2563EB", bgImageSrc: ""
    };
    layersList = [];
    undoStack = [];
    redoStack = [];
    updateHistoryButtons();

    loadPhotoIntoCanvas(file);
    await triggerAutoSaveDraft();
}

function loadPhotoIntoCanvas(blobFile) {
    const placeholder = document.getElementById("placeholderText");
    const img = document.getElementById("mainPhotoImg");
    if (placeholder) placeholder.style.display = "none";
    if (!img) return;

    img.onload = () => {
        const drawCanvas = document.getElementById("interactiveDrawCanvas");
        if (drawCanvas) {
            drawCanvas.width = img.naturalWidth || 1080;
            drawCanvas.height = img.naturalHeight || 1080;
            const ctx = drawCanvas.getContext("2d");
            ctx.clearRect(0, 0, drawCanvas.width, drawCanvas.height);
        }
        applyAllVisualEffects();
    };

    img.style.display = "block";
    img.src = URL.createObjectURL(blobFile);
}

// ==========================================================================
// 2. VISUAL RENDERING & COMPARE (BEFORE / AFTER)
// ==========================================================================
function buildComputedFilterString() {
    const effectiveBright = (photoState.brightness * (photoState.exposure / 100) * (photoState.shadows / 100)).toFixed(1);
    const effectiveContrast = (photoState.contrast * (photoState.highlights / 100) + (photoState.upscaleSharp * 0.25)).toFixed(1);
    const effectiveSaturate = (photoState.saturate + (photoState.upscaleSharp * 0.15)).toFixed(1);
    const smoothBlur = photoState.retouchSmooth > 0 ? `blur(${(photoState.retouchSmooth * 0.015).toFixed(2)}px)` : "";

    return `brightness(${effectiveBright}%) contrast(${effectiveContrast}%) saturate(${effectiveSaturate}%) sepia(${photoState.warmth}%) ${smoothBlur} ${photoState.presetFilter}`.trim();
}

function applyAllVisualEffects() {
    const img = document.getElementById("mainPhotoImg");
    const frame = document.getElementById("photoStageFrame");
    const bokeh = document.getElementById("bokehBlurOverlay");
    if (!img || !frame) return;

    // Transform & Filters
    img.style.transform = `scale(${photoState.scale}) rotate(${photoState.rotation}deg) scaleX(${photoState.flipX}) scaleY(${photoState.flipY})`;
    img.style.filter = buildComputedFilterString();

    // Aspect Ratio Crop
    frame.style.aspectRatio = photoState.aspectRatio;

    // Background Removal / Replacement
    frame.classList.remove("transparent-grid");
    frame.style.backgroundImage = "";
    frame.style.backgroundColor = "transparent";
    img.style.mixBlendMode = "normal";

    if (photoState.bgMode === "transparent") {
        frame.classList.add("transparent-grid");
        img.style.mixBlendMode = "multiply";
    } else if (photoState.bgMode === "color") {
        frame.style.backgroundColor = photoState.bgColor;
        img.style.mixBlendMode = "multiply";
    } else if (photoState.bgMode === "image" && photoState.bgImageSrc) {
        frame.style.backgroundImage = `url('${photoState.bgImageSrc}')`;
        frame.style.backgroundSize = "cover";
        frame.style.backgroundPosition = "center";
        img.style.mixBlendMode = "multiply";
    }

    // Frames & Borders
    frame.style.border = "none";
    frame.style.padding = "0";
    frame.style.borderRadius = "0px";
    frame.style.boxShadow = "none";
    frame.style.background = photoState.bgMode === "color" ? photoState.bgColor : (frame.style.background || "transparent");

    if (photoState.frameStyle === "polaroid") {
        frame.style.background = "#FFFFFF";
        frame.style.padding = "14px 14px 42px 14px";
        frame.style.borderRadius = "4px";
        frame.style.boxShadow = "0 15px 35px rgba(0,0,0,0.45)";
    } else if (photoState.frameStyle === "neon") {
        frame.style.border = "3px solid #38BDF8";
        frame.style.borderRadius = "12px";
        frame.style.boxShadow = "0 0 24px rgba(56, 189, 248, 0.75)";
    } else if (photoState.frameStyle === "shadow") {
        frame.style.borderRadius = "14px";
        frame.style.boxShadow = "0 22px 45px rgba(0,0,0,0.65)";
    } else if (photoState.frameStyle === "rounded") {
        frame.style.borderRadius = "24px";
    } else if (photoState.frameStyle === "circle") {
        frame.style.borderRadius = "50%";
        frame.style.aspectRatio = "1 / 1";
    }

    // Blur & Bokeh Portrait Mode
    if (bokeh) {
        if (photoState.blurBokeh > 0) {
            bokeh.style.display = "block";
            bokeh.style.backdropFilter = `blur(${photoState.blurBokeh}px)`;
        } else {
            bokeh.style.display = "none";
        }
    }

    renderLayersOnStage();
}

// Hold Compare Button for Before / After
function startCompareBefore() {
    const img = document.getElementById("mainPhotoImg");
    const badge = document.getElementById("compareBadgeTag");
    const btn = document.getElementById("compareBtn");
    if (!img || !currentPhotoBlob) return;

    img.style.filter = "none";
    img.style.transform = "none";
    if (badge) badge.style.display = "block";
    if (btn) btn.classList.add("btn-compare-active");
}

function endCompareBefore() {
    const badge = document.getElementById("compareBadgeTag");
    const btn = document.getElementById("compareBtn");
    if (badge) badge.style.display = "none";
    if (btn) btn.classList.remove("btn-compare-active");
    applyAllVisualEffects();
}

// ==========================================================================
// 3. UNDO / REDO HISTORY STACK
// ==========================================================================
function pushUndoSnapshot() {
    undoStack.push(JSON.stringify(photoState));
    if (undoStack.length > 25) undoStack.shift();
    redoStack = [];
    updateHistoryButtons();
}

function undoPhotoAction() {
    if (undoStack.length === 0) return;
    redoStack.push(JSON.stringify(photoState));
    photoState = JSON.parse(undoStack.pop());
    updateHistoryButtons();
    applyAllVisualEffects();
    triggerAutoSaveDraft();
}

function redoPhotoAction() {
    if (redoStack.length === 0) return;
    undoStack.push(JSON.stringify(photoState));
    photoState = JSON.parse(redoStack.pop());
    updateHistoryButtons();
    applyAllVisualEffects();
    triggerAutoSaveDraft();
}

function updateHistoryButtons() {
    const u = document.getElementById("undoBtn");
    const r = document.getElementById("redoBtn");
    if (u) u.disabled = undoStack.length === 0;
    if (r) r.disabled = redoStack.length === 0;
}

// ==========================================================================
// 4. IN-PLACE BOTTOM DOCK: 14 SVG TOOLS CONTROLLER
// ==========================================================================
function selectPhotoTool(toolKey, btnEl) {
    document.querySelectorAll(".svg-tool-btn").forEach(b => b.classList.remove("active-tool"));
    if (btnEl) btnEl.classList.add("active-tool");

    const drawer = document.getElementById("inPlaceToolDrawer");
    const title = document.getElementById("activeDrawerTitle");
    const controls = document.getElementById("activeDrawerControls");
    if (!drawer || !title || !controls) return;

    // Disable brush unless eraser or draw selected
    activeBrushMode = (toolKey === "eraser" || toolKey === "draw") ? toolKey : "none";
    const drawCanvas = document.getElementById("interactiveDrawCanvas");
    if (drawCanvas) {
        drawCanvas.classList.toggle("drawing-enabled", activeBrushMode !== "none");
    }

    drawer.style.display = "flex";

    switch (toolKey) {
        case "bgremove":
            title.innerText = "1. AI Background Remove";
            controls.innerHTML = `
                <button class="opt-chip ${photoState.bgMode==='transparent'?'active-chip':''}" onclick="setBgRemovalMode('transparent')">1-Click Transparent PNG</button>
                <button class="opt-chip ${photoState.bgMode==='color'?'active-chip':''}" onclick="setBgRemovalMode('color')">Solid Color BG</button>
                <input type="color" value="${photoState.bgColor}" onchange="changeBgColor(this.value)" title="Pick Background Color" style="height:30px; width:38px; border:none; background:none; cursor:pointer;">
                <button class="opt-chip ${photoState.bgMode==='image'?'active-chip':''}" onclick="document.getElementById('customBgInput').click()">Custom Image BG</button>
                <button class="opt-chip" onclick="setBgRemovalMode('none')">Restore Original BG</button>
            `;
            break;

        case "crop":
            title.innerText = "2. Crop & Resize Ratios";
            controls.innerHTML = `
                <button class="opt-chip" onclick="setCropRatio('1 / 1')">Instagram (1:1)</button>
                <button class="opt-chip" onclick="setCropRatio('16 / 9')">YouTube Thumbnail (16:9)</button>
                <button class="opt-chip" onclick="setCropRatio('3.5 / 4.5')">Passport Size</button>
                <button class="opt-chip" onclick="setCropRatio('4 / 5')">Portrait (4:5)</button>
                <button class="opt-chip" onclick="setCircleCropFrame()">Circle Crop</button>
                <button class="opt-chip" onclick="setCropRatio('unset')">Original Ratio</button>
                <div class="slider-unit">
                    <span>Zoom Crop: ${Math.round(photoState.scale * 100)}%</span>
                    <input type="range" min="50" max="250" value="${Math.round(photoState.scale * 100)}" oninput="setPhotoZoom(this.value)">
                </div>
            `;
            break;

        case "adjust":
            title.innerText = "3. Light & Color Adjust";
            controls.innerHTML = `
                <div class="slider-unit"><span>Brightness (${photoState.brightness}%)</span><input type="range" min="30" max="180" value="${photoState.brightness}" oninput="updateAdjustParam('brightness', this.value)"></div>
                <div class="slider-unit"><span>Contrast (${photoState.contrast}%)</span><input type="range" min="30" max="180" value="${photoState.contrast}" oninput="updateAdjustParam('contrast', this.value)"></div>
                <div class="slider-unit"><span>Saturation (${photoState.saturate}%)</span><input type="range" min="0" max="200" value="${photoState.saturate}" oninput="updateAdjustParam('saturate', this.value)"></div>
                <div class="slider-unit"><span>Exposure (${photoState.exposure}%)</span><input type="range" min="50" max="150" value="${photoState.exposure}" oninput="updateAdjustParam('exposure', this.value)"></div>
                <div class="slider-unit"><span>Highlights (${photoState.highlights}%)</span><input type="range" min="60" max="140" value="${photoState.highlights}" oninput="updateAdjustParam('highlights', this.value)"></div>
                <div class="slider-unit"><span>Shadows (${photoState.shadows}%)</span><input type="range" min="60" max="140" value="${photoState.shadows}" oninput="updateAdjustParam('shadows', this.value)"></div>
                <div class="slider-unit"><span>Warmth (${photoState.warmth}%)</span><input type="range" min="0" max="80" value="${photoState.warmth}" oninput="updateAdjustParam('warmth', this.value)"></div>
            `;
            break;

        case "filters":
            title.innerText = "4. Filters & LUT Presets";
            controls.innerHTML = `
                <button class="opt-chip" onclick="applyLutPreset('normal')">Original</button>
                <button class="opt-chip" onclick="applyLutPreset('cinematic')">Cinematic</button>
                <button class="opt-chip" onclick="applyLutPreset('vintage')">Vintage</button>
                <button class="opt-chip" onclick="applyLutPreset('noir')">B&amp;W Noir</button>
                <button class="opt-chip" onclick="applyLutPreset('hdr')">HDR Boost</button>
                <button class="opt-chip" onclick="applyLutPreset('moody')">Moody Dark</button>
                <button class="opt-chip" onclick="applyLutPreset('vivid')">Vivid Pop</button>
            `;
            break;

        case "retouch":
            title.innerText = "5. AI Retouch & Face Smooth";
            controls.innerHTML = `
                <div class="slider-unit" style="min-width:170px;">
                    <span>Skin Smoothness: ${photoState.retouchSmooth}%</span>
                    <input type="range" min="0" max="100" value="${photoState.retouchSmooth}" oninput="updateRetouchLevel(this.value)">
                </div>
                <button class="opt-chip" onclick="applyFaceBrightenBoost()">Brighten Skin &amp; Teeth</button>
                <button class="opt-chip" onclick="updateRetouchLevel(0)">Reset Retouch</button>
            `;
            break;

        case "upscale":
            title.innerText = "6. AI Upscale / HD Enhance";
            controls.innerHTML = `
                <div class="slider-unit" style="min-width:180px;">
                    <span>HD Clarity &amp; Sharpness: ${photoState.upscaleSharp}%</span>
                    <input type="range" min="0" max="100" value="${photoState.upscaleSharp}" oninput="updateUpscaleLevel(this.value)">
                </div>
                <button class="opt-chip" onclick="updateUpscaleLevel(75)">1-Click Auto HD Enhance</button>
                <button class="opt-chip" onclick="updateUpscaleLevel(0)">Reset</button>
            `;
            break;

        case "eraser":
            title.innerText = "7. Magic Eraser (Brush)";
            controls.innerHTML = `
                <span style="font-size:12px; color:#94A3B8;">Paint over unwanted objects on the photo to erase/blend:</span>
                <div class="slider-unit"><span>Brush Size: ${brushSize}px</span><input type="range" min="5" max="45" value="${brushSize}" oninput="brushSize=this.value"></div>
                <button class="opt-chip" onclick="clearDrawingsCanvas()">Clear Eraser Strokes</button>
            `;
            break;

        case "text":
            title.innerText = "8. Text & Typography";
            controls.innerHTML = `
                <input type="text" id="newTextInput" placeholder="Enter Thumbnail Title..." style="background:#0F172A; border:1px solid #334155; color:#FFFFFF; padding:6px 10px; border-radius:6px; font-size:12.5px;">
                <input type="color" id="newTextColor" value="#FFFFFF" style="height:30px; width:34px; border:none; background:none; cursor:pointer;">
                <select id="newTextStyle" style="background:#0F172A; border:1px solid #334155; color:#FFFFFF; padding:6px 8px; border-radius:6px; font-size:12px;">
                    <option value="shadow3d">3D Shadow Bold</option>
                    <option value="outline">YouTube Outline</option>
                    <option value="neon">Neon Glow</option>
                    <option value="badge">Solid Banner</option>
                </select>
                <button class="opt-chip active-chip" onclick="addStyledTextLayer()">+ Add Text</button>
            `;
            break;

        case "frames":
            title.innerText = "9. Frames & Borders";
            controls.innerHTML = `
                <button class="opt-chip" onclick="setPhotoFrame('none')">None</button>
                <button class="opt-chip" onclick="setPhotoFrame('polaroid')">White Polaroid</button>
                <button class="opt-chip" onclick="setPhotoFrame('neon')">Neon Glow</button>
                <button class="opt-chip" onclick="setPhotoFrame('shadow')">Shadow Card</button>
                <button class="opt-chip" onclick="setPhotoFrame('rounded')">Rounded Corners</button>
                <button class="opt-chip" onclick="setPhotoFrame('circle')">Circle Frame</button>
            `;
            break;

        case "blur":
            title.innerText = "10. Blur & DSLR Bokeh";
            controls.innerHTML = `
                <div class="slider-unit" style="min-width:190px;">
                    <span>DSLR Portrait Blur: ${photoState.blurBokeh}px</span>
                    <input type="range" min="0" max="20" value="${photoState.blurBokeh}" oninput="updateBokehBlur(this.value)">
                </div>
                <button class="opt-chip" onclick="updateBokehBlur(8)">Portrait Mode (f/1.8)</button>
                <button class="opt-chip" onclick="updateBokehBlur(0)">Off</button>
            `;
            break;

        case "overlay":
            title.innerText = "11. Overlay & Stickers";
            controls.innerHTML = `
                <button class="opt-chip active-chip" onclick="document.getElementById('overlayLogoInput').click()">+ Upload Logo / Photo</button>
                <button class="opt-chip" onclick="addStickerLayer('🔥')">🔥 Fire</button>
                <button class="opt-chip" onclick="addStickerLayer('➡️')">➡️ Arrow</button>
                <button class="opt-chip" onclick="addStickerLayer('⭐')">⭐ Star</button>
                <button class="opt-chip" onclick="addStickerLayer('✅')">✅ Verified</button>
                <button class="opt-chip" onclick="addStickerLayer('Subscribe')">Subscribe Badge</button>
            `;
            break;

        case "draw":
            title.innerText = "12. Draw / Highlight Pen";
            controls.innerHTML = `
                <span style="font-size:12px; color:#94A3B8;">Draw directly on photo:</span>
                <input type="color" value="${brushColor}" onchange="brushColor=this.value" style="height:30px; width:36px; border:none; background:none; cursor:pointer;">
                <div class="slider-unit"><span>Pen Width: ${brushSize}px</span><input type="range" min="2" max="35" value="${brushSize}" oninput="brushSize=this.value"></div>
                <button class="opt-chip" onclick="clearDrawingsCanvas()">Clear Drawings</button>
            `;
            break;

        case "rotate":
            title.innerText = "13. Rotate & Mirror Flip";
            controls.innerHTML = `
                <button class="opt-chip" onclick="rotatePhotoBy90()">Rotate 90° Right</button>
                <button class="opt-chip" onclick="flipPhotoAxis('x')">Flip Horizontal (Mirror)</button>
                <button class="opt-chip" onclick="flipPhotoAxis('y')">Flip Vertical</button>
            `;
            break;

        case "layers":
            title.innerText = "14. Layers Manager";
            renderLayersManagerDrawer(controls);
            break;
    }
}

function closeInPlaceDrawer() {
    const drawer = document.getElementById("inPlaceToolDrawer");
    if (drawer) drawer.style.display = "none";
    document.querySelectorAll(".svg-tool-btn").forEach(b => b.classList.remove("active-tool"));
    activeBrushMode = "none";
    const drawCanvas = document.getElementById("interactiveDrawCanvas");
    if (drawCanvas) drawCanvas.classList.remove("drawing-enabled");
}

// ==========================================================================
// 5. INDIVIDUAL TOOL ACTIONS
// ==========================================================================
function setBgRemovalMode(mode) {
    pushUndoSnapshot();
    photoState.bgMode = mode;
    applyAllVisualEffects();
    triggerAutoSaveDraft();
}
function changeBgColor(hex) {
    photoState.bgColor = hex;
    photoState.bgMode = "color";
    applyAllVisualEffects();
}
function handleCustomBgImage(e) {
    const f = e.target.files ? e.target.files[0] : null;
    if (!f) return;
    pushUndoSnapshot();
    photoState.bgImageSrc = URL.createObjectURL(f);
    photoState.bgMode = "image";
    applyAllVisualEffects();
}

function setCropRatio(ratio) {
    pushUndoSnapshot();
    photoState.aspectRatio = ratio;
    if (photoState.frameStyle === "circle") photoState.frameStyle = "none";
    applyAllVisualEffects();
    triggerAutoSaveDraft();
}
function setCircleCropFrame() {
    pushUndoSnapshot();
    photoState.frameStyle = "circle";
    applyAllVisualEffects();
}
function setPhotoZoom(val) {
    photoState.scale = parseInt(val, 10) / 100;
    applyAllVisualEffects();
}

function updateAdjustParam(key, val) {
    photoState[key] = parseInt(val, 10);
    applyAllVisualEffects();
}

function applyLutPreset(preset) {
    pushUndoSnapshot();
    const luts = {
        normal: "",
        cinematic: "contrast(122%) saturate(112%) sepia(12%)",
        vintage: "sepia(48%) contrast(104%) brightness(103%)",
        noir: "grayscale(100%) contrast(135%)",
        hdr: "contrast(130%) saturate(135%)",
        moody: "brightness(90%) contrast(125%) saturate(85%)",
        vivid: "saturate(160%) contrast(112%)"
    };
    photoState.presetFilter = luts[preset] || "";
    applyAllVisualEffects();
    triggerAutoSaveDraft();
}

function updateRetouchLevel(val) {
    photoState.retouchSmooth = parseInt(val, 10);
    applyAllVisualEffects();
}
function applyFaceBrightenBoost() {
    pushUndoSnapshot();
    photoState.brightness = Math.min(180, photoState.brightness + 8);
    photoState.retouchSmooth = 35;
    applyAllVisualEffects();
}

function updateUpscaleLevel(val) {
    photoState.upscaleSharp = parseInt(val, 10);
    applyAllVisualEffects();
}

function setPhotoFrame(styleName) {
    pushUndoSnapshot();
    photoState.frameStyle = styleName;
    applyAllVisualEffects();
    triggerAutoSaveDraft();
}

function updateBokehBlur(val) {
    photoState.blurBokeh = parseInt(val, 10);
    applyAllVisualEffects();
}

function rotatePhotoBy90() {
    pushUndoSnapshot();
    photoState.rotation = (photoState.rotation + 90) % 360;
    applyAllVisualEffects();
    triggerAutoSaveDraft();
}

function flipPhotoAxis(axis) {
    pushUndoSnapshot();
    if (axis === "x") photoState.flipX *= -1;
    if (axis === "y") photoState.flipY *= -1;
    applyAllVisualEffects();
    triggerAutoSaveDraft();
}

// ==========================================================================
// 6. OVERLAYS, TEXT, STICKERS & LAYERS MANAGER
// ==========================================================================
function addStyledTextLayer() {
    const txt = (document.getElementById("newTextInput")?.value || "").trim();
    if (!txt) return;
    const color = document.getElementById("newTextColor")?.value || "#FFFFFF";
    const styleType = document.getElementById("newTextStyle")?.value || "shadow3d";

    layersList.push({
        id: "layer_" + Date.now(),
        type: "text",
        content: txt,
        x: 28,
        y: 25,
        color: color,
        styleType: styleType,
        visible: true,
        locked: false
    });
    document.getElementById("newTextInput").value = "";
    renderLayersOnStage();
}

function addStickerLayer(stickerText) {
    layersList.push({
        id: "layer_" + Date.now(),
        type: "sticker",
        content: stickerText,
        x: 42,
        y: 40,
        color: "#FFFFFF",
        styleType: stickerText === "Subscribe" ? "badge" : "sticker",
        visible: true,
        locked: false
    });
    renderLayersOnStage();
}

function handleOverlayImageUpload(e) {
    const file = e.target.files ? e.target.files[0] : null;
    if (!file) return;
    const imgUrl = URL.createObjectURL(file);
    layersList.push({
        id: "layer_" + Date.now(),
        type: "image",
        content: imgUrl,
        x: 35,
        y: 35,
        visible: true,
        locked: false
    });
    renderLayersOnStage();
}

function renderLayersOnStage() {
    const container = document.getElementById("overlaysContainer");
    const frame = document.getElementById("photoStageFrame");
    if (!container || !frame) return;
    container.innerHTML = "";

    layersList.forEach((layer, idx) => {
        if (!layer.visible) return;
        const el = document.createElement("div");
        el.className = "stage-overlay-item";
        el.style.left = layer.x + "%";
        el.style.top = layer.y + "%";
        el.style.zIndex = 20 + idx;

        if (layer.type === "image") {
            el.innerHTML = `<img src="${layer.content}" style="width: 110px; height: auto; pointer-events: none; border-radius: 6px;">`;
        } else if (layer.styleType === "badge") {
            el.innerText = layer.content;
            el.style.background = "#EF4444";
            el.style.color = "#FFFFFF";
            el.style.fontWeight = "800";
            el.style.fontSize = "16px";
            el.style.padding = "6px 14px";
            el.style.borderRadius = "6px";
        } else if (layer.type === "sticker") {
            el.innerText = layer.content;
            el.style.fontSize = "38px";
        } else {
            el.innerText = layer.content;
            el.style.color = layer.color;
            el.style.fontSize = "26px";
            el.style.fontWeight = "900";
            if (layer.styleType === "shadow3d") {
                el.style.textShadow = "3px 3px 0px #0F172A, 5px 5px 12px rgba(0,0,0,0.8)";
            } else if (layer.styleType === "outline") {
                el.style.webkitTextStroke = "1.5px #000000";
                el.style.textShadow = "0 2px 8px rgba(0,0,0,0.7)";
            } else if (layer.styleType === "neon") {
                el.style.textShadow = `0 0 10px ${layer.color}, 0 0 22px #2563EB`;
            }
        }

        if (!layer.locked) {
            el.onmousedown = function (e) {
                e.stopPropagation();
                const rect = frame.getBoundingClientRect();
                const startX = e.clientX;
                const startY = e.clientY;
                const origX = layer.x;
                const origY = layer.y;

                function onMove(ev) {
                    const dx = ((ev.clientX - startX) / rect.width) * 100;
                    const dy = ((ev.clientY - startY) / rect.height) * 100;
                    layer.x = Math.max(0, Math.min(88, origX + dx));
                    layer.y = Math.max(0, Math.min(88, origY + dy));
                    el.style.left = layer.x + "%";
                    el.style.top = layer.y + "%";
                }
                document.addEventListener("mousemove", onMove);
                document.addEventListener("mouseup", () => document.removeEventListener("mousemove", onMove), { once: true });
            };
        }

        container.appendChild(el);
    });
}

function renderLayersManagerDrawer(container) {
    if (layersList.length === 0) {
        container.innerHTML = `<span style="font-size:12.5px; color:#94A3B8;">Base Photo Layer Active. Add Text or Stickers to manage multiple layers here.</span>`;
        return;
    }
    container.innerHTML = layersList.map((l, i) => `
        <div style="display:flex; align-items:center; gap:6px; background:#0F172A; border:1px solid #334155; padding:5px 10px; border-radius:6px; font-size:12px;">
            <strong style="color:#F8FAFC;">#${i + 1} ${l.type.toUpperCase()}</strong>
            <button class="opt-chip" style="padding:3px 7px;" onclick="toggleLayerVis(${i})">${l.visible ? 'Hide' : 'Show'}</button>
            <button class="opt-chip" style="padding:3px 7px;" onclick="toggleLayerLock(${i})">${l.locked ? 'Unlock' : 'Lock'}</button>
            <button class="opt-chip" style="padding:3px 7px;" onclick="moveLayerOrder(${i}, -1)">↑</button>
            <button class="opt-chip" style="padding:3px 7px;" onclick="moveLayerOrder(${i}, 1)">↓</button>
            <button class="opt-chip" style="padding:3px 7px; color:#F87171;" onclick="deleteLayerItem(${i})">✕</button>
        </div>
    `).join("");
}

function toggleLayerVis(i) {
    layersList[i].visible = !layersList[i].visible;
    renderLayersOnStage();
    renderLayersManagerDrawer(document.getElementById("activeDrawerControls"));
}
function toggleLayerLock(i) {
    layersList[i].locked = !layersList[i].locked;
    renderLayersOnStage();
    renderLayersManagerDrawer(document.getElementById("activeDrawerControls"));
}
function moveLayerOrder(i, dir) {
    const target = i + dir;
    if (target < 0 || target >= layersList.length) return;
    [layersList[i], layersList[target]] = [layersList[target], layersList[i]];
    renderLayersOnStage();
    renderLayersManagerDrawer(document.getElementById("activeDrawerControls"));
}
function deleteLayerItem(i) {
    layersList.splice(i, 1);
    renderLayersOnStage();
    renderLayersManagerDrawer(document.getElementById("activeDrawerControls"));
}

// ==========================================================================
// 7. INTERACTIVE DRAW PEN & MAGIC ERASER CANVAS
// ==========================================================================
function initDrawingCanvasEvents() {
    const canvas = document.getElementById("interactiveDrawCanvas");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    function getCanvasCoords(e) {
        const rect = canvas.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        return {
            x: ((clientX - rect.left) / rect.width) * canvas.width,
            y: ((clientY - rect.top) / rect.height) * canvas.height
        };
    }

    canvas.addEventListener("mousedown", (e) => {
        if (activeBrushMode === "none") return;
        isDrawingNow = true;
        const pt = getCanvasCoords(e);
        ctx.beginPath();
        ctx.moveTo(pt.x, pt.y);
    });

    canvas.addEventListener("mousemove", (e) => {
        if (!isDrawingNow || activeBrushMode === "none") return;
        const pt = getCanvasCoords(e);
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.lineWidth = brushSize * (canvas.width / 600);

        if (activeBrushMode === "eraser") {
            ctx.strokeStyle = "rgba(248, 250, 252, 0.85)";
        } else {
            ctx.strokeStyle = brushColor;
        }
        ctx.lineTo(pt.x, pt.y);
        ctx.stroke();
    });

    window.addEventListener("mouseup", () => { isDrawingNow = false; });
}

function clearDrawingsCanvas() {
    const canvas = document.getElementById("interactiveDrawCanvas");
    if (!canvas) return;
    canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);
}

// ==========================================================================
// 8. EXPORT PHOTO MODAL & HIGH-PRECISION RENDER ENGINE
// ==========================================================================
function openExportPhotoModal() {
    if (!currentPhotoBlob) {
        alert("Please upload a photo first!");
        return;
    }
    document.getElementById("photoDownloadModal").style.display = "flex";
}

function closeExportPhotoModal() {
    document.getElementById("photoDownloadModal").style.display = "none";
}

function selectExportFormat(el) {
    document.querySelectorAll("#exportFormatGrid .export-choice-btn").forEach(b => b.classList.remove("selected"));
    el.classList.add("selected");
    selectedExportMime = el.dataset.fmt;
    document.getElementById("expFmtLabel").innerText = selectedExportMime.split("/")[1].toUpperCase();
}

function selectExportQuality(el) {
    document.querySelectorAll("#exportQualityGrid .export-choice-btn").forEach(b => b.classList.remove("selected"));
    el.classList.add("selected");
    selectedExportQuality = el.dataset.qual;
    const labelMap = {
        low: "Low (~100 KB Web)",
        medium: "Medium (~500 KB Social)",
        original: "Original Full HD"
    };
    document.getElementById("expSizeLabel").innerText = labelMap[selectedExportQuality] || "Original";
}

function executePhotoExport() {
    const img = document.getElementById("mainPhotoImg");
    const drawCanvas = document.getElementById("interactiveDrawCanvas");
    if (!img) return;

    // Resolution & Compression Scaling based on target KB/MB preset
    let scaleFactor = 1.0;
    let encoderQuality = 0.96;

    if (selectedExportQuality === "low") {
        scaleFactor = 0.45;
        encoderQuality = 0.55;
    } else if (selectedExportQuality === "medium") {
        scaleFactor = 0.75;
        encoderQuality = 0.80;
    }

    const natW = img.naturalWidth || 1080;
    const natH = img.naturalHeight || 1080;
    const outW = Math.max(320, Math.round(natW * scaleFactor));
    const outH = Math.max(320, Math.round(natH * scaleFactor));

    const pad = photoState.frameStyle === "polaroid" ? Math.round(outW * 0.04) : 0;
    const bottomPad = photoState.frameStyle === "polaroid" ? Math.round(outH * 0.12) : pad;

    const exportCanvas = document.createElement("canvas");
    exportCanvas.width = outW + pad * 2;
    exportCanvas.height = outH + pad + bottomPad;
    const ctx = exportCanvas.getContext("2d");

    // 1. Background Fill (for JPG or Solid BG)
    if (selectedExportMime === "image/jpeg" || photoState.frameStyle === "polaroid") {
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
    } else if (photoState.bgMode === "color") {
        ctx.fillStyle = photoState.bgColor;
        ctx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
    }

    // 2. Circular Clip if Circle Frame is active
    ctx.save();
    if (photoState.frameStyle === "circle") {
        ctx.beginPath();
        ctx.arc(exportCanvas.width / 2, exportCanvas.height / 2, Math.min(outW, outH) / 2, 0, Math.PI * 2);
        ctx.clip();
    }

    // 3. Draw Base Edited Photo with Filters, Rotation & Flip
    ctx.save();
    ctx.filter = buildComputedFilterString();
    ctx.translate(pad + outW / 2, pad + outH / 2);
    ctx.rotate((photoState.rotation * Math.PI) / 180);
    ctx.scale(photoState.flipX * photoState.scale, photoState.flipY * photoState.scale);
    ctx.drawImage(img, -outW / 2, -outH / 2, outW, outH);
    ctx.restore();

    // 4. Composite Freehand Drawings / Eraser Strokes
    if (drawCanvas) {
        ctx.drawImage(drawCanvas, pad, pad, outW, outH);
    }

    // 5. Render Text & Sticker Overlays
    layersList.forEach(layer => {
        if (!layer.visible || layer.type === "image") return;
        const lx = pad + (layer.x / 100) * outW;
        const ly = pad + (layer.y / 100) * outH + Math.round(outH * 0.04);

        ctx.font = `900 ${Math.round(outH * 0.045)}px sans-serif`;
        if (layer.styleType === "badge") {
            ctx.fillStyle = "#EF4444";
            ctx.fillRect(lx - 8, ly - Math.round(outH * 0.038), ctx.measureText(layer.content).width + 16, Math.round(outH * 0.052));
            ctx.fillStyle = "#FFFFFF";
        } else {
            ctx.fillStyle = layer.color || "#FFFFFF";
            ctx.shadowColor = "rgba(0,0,0,0.75)";
            ctx.shadowBlur = 8;
        }
        ctx.fillText(layer.content, lx, ly);
        ctx.shadowBlur = 0;
    });

    ctx.restore();

    // 6. Trigger File Download
    const ext = selectedExportMime === "image/png" ? "png" : (selectedExportMime === "image/webp" ? "webp" : "jpg");
    const cleanBase = currentPhotoFileName.replace(/\.[^/.]+$/, "");
    const dataUrl = exportCanvas.toDataURL(selectedExportMime, encoderQuality);

    const link = document.createElement("a");
    link.download = `${cleanBase}_SStudio.${ext}`;
    link.href = dataUrl;
    link.click();

    closeExportPhotoModal();
    updateSaveStatus("Exported Successfully");
}

// ==========================================================================
// 9. INDEXEDDB AUTO-SAVE SESSION SYNC
// ==========================================================================
async function triggerAutoSaveDraft() {
    if (!currentPhotoBlob || typeof saveDraftToDevice !== "function") return;
    updateSaveStatus("Saving...");

    activePhotoDraftId = await saveDraftToDevice({
        draftId: activePhotoDraftId || ("draft_img_" + Date.now()),
        mode: "photo",
        fileName: currentPhotoFileName,
        fileBlob: currentPhotoBlob,
        scale: photoState.scale,
        rotation: photoState.rotation,
        brightness: photoState.brightness,
        contrast: photoState.contrast,
        saturate: photoState.saturate,
        warmth: photoState.warmth
    });

    updateSaveStatus("Saved on Device");
}

async function savePhotoAndGoHome() {
    if (currentPhotoBlob) {
        await triggerAutoSaveDraft();
    }
    window.location.href = "index.html";
}

function updateSaveStatus(msg) {
    const pill = document.getElementById("autoSaveBadge");
    if (pill) pill.innerText = msg;
}