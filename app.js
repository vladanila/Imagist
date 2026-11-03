// app.js - Controller for Resizer, Cropper & Format Converter
import { optimizeImageToTargetSize, convertImageDirectly } from './engine.js';

// Application State
const state = {
  currentTab: 'resizer', // 'resizer' or 'converter'
  
  // Resizer state
  cropper: null,
  sourceImage: null,
  sourceFileName: 'image',
  activeFilter: 'none',
  filterThreshold: 170,
  addNameDate: false,
  candidateName: '',
  photoDate: '',
  targetWidth: 350,
  targetHeight: 450,
  minKb: 20,
  maxKb: 50,
  unit: 'px',
  outputFormat: 'jpeg', // 'jpeg', 'png', 'webp', 'pdf'
  currentBlob: null,
  debounceTimer: null,

  // Standalone Converter state
  convSourceFile: null,
  convSourceImg: null,
  convTargetFormat: 'jpeg',
  convResultBlob: null,
  convResultExt: 'jpg'
};

// DOM Elements
const elements = {
  // Navigation
  tabResizer: document.getElementById('tab-resizer'),
  tabConverter: document.getElementById('tab-converter'),
  viewResizer: document.getElementById('view-resizer'),
  viewConverter: document.getElementById('view-converter'),
  headerActions: document.getElementById('header-actions'),
  mobileHeaderActions: document.getElementById('mobile-header-actions'),

  // Resizer view elements
  dropzoneContainer: document.getElementById('dropzone-container'),
  fileInput: document.getElementById('file-input'),
  editorWorkspace: document.getElementById('editor-workspace'),
  cropperImage: document.getElementById('cropper-image'),
  btnChangeImage: document.getElementById('btn-change-image'),
  btnRotateLeft: document.getElementById('btn-rotate-left'),
  btnRotateRight: document.getElementById('btn-rotate-right'),
  btnFlipH: document.getElementById('btn-flip-h'),
  btnResetCrop: document.getElementById('btn-reset-crop'),
  lockRatioToggle: document.getElementById('lock-ratio-toggle'),
  filterButtons: document.querySelectorAll('.filter-btn'),
  signatureSliderBox: document.getElementById('signature-slider-box'),
  signatureThreshold: document.getElementById('signature-threshold'),
  sliderThresholdVal: document.getElementById('slider-threshold-val'),
  stampToggle: document.getElementById('stamp-toggle'),
  stampInputs: document.getElementById('stamp-inputs'),
  inputCandidateName: document.getElementById('input-candidate-name'),
  inputPhotoDate: document.getElementById('input-photo-date'),
  previewImage: document.getElementById('preview-image'),
  processingLoader: document.getElementById('processing-loader'),
  statSize: document.getElementById('stat-size'),
  statDimensions: document.getElementById('stat-dimensions'),
  statFormat: document.getElementById('stat-format'),
  btnDownload: document.getElementById('btn-download'),
  btnDownloadText: document.getElementById('btn-download-text'),
  resizerFormatButtons: document.querySelectorAll('.resizer-format-btn'),
  targetKbBox: document.getElementById('target-kb-box'),
  inputWidth: document.getElementById('input-width'),
  inputHeight: document.getElementById('input-height'),
  inputMinKb: document.getElementById('input-min-kb'),
  inputMaxKb: document.getElementById('input-max-kb'),
  unitPx: document.getElementById('unit-px'),
  unitCm: document.getElementById('unit-cm'),
  btnReapplySpecs: document.getElementById('btn-reapply-specs'),

  // Converter view elements
  converterDropzone: document.getElementById('converter-dropzone'),
  converterFileInput: document.getElementById('converter-file-input'),
  converterWorkspace: document.getElementById('converter-workspace'),
  convFileName: document.getElementById('conv-file-name'),
  convFileMeta: document.getElementById('conv-file-meta'),
  btnConvChangeFile: document.getElementById('btn-conv-change-file'),
  convFormatButtons: document.querySelectorAll('.conv-format-btn'),
  convOutputSize: document.getElementById('conv-output-size'),
  convOutputFormat: document.getElementById('conv-output-format'),
  btnConvertDownload: document.getElementById('btn-convert-download'),

  // Shared
  toast: document.getElementById('toast'),
  toastMessage: document.getElementById('toast-message')
};

// Initialize
function init() {
  setupNavigation();
  setupResizerEvents();
  setupConverterEvents();
  updateLucideIcons();
  
  // Set default photo date
  const today = new Date();
  const formattedDate = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`;
  elements.inputPhotoDate.value = `DOPO: ${formattedDate}`;
  state.photoDate = elements.inputPhotoDate.value;
}

// Tab Switching
function setupNavigation() {
  elements.tabResizer.addEventListener('click', () => switchTab('resizer'));
  elements.tabConverter.addEventListener('click', () => switchTab('converter'));
}

function switchTab(tab) {
  state.currentTab = tab;
  if (tab === 'resizer') {
    elements.tabResizer.className = 'tab-button active flex-1 sm:flex-initial px-3.5 py-1.5 rounded-lg text-white font-medium bg-[#1C1C1E] transition text-center';
    elements.tabConverter.className = 'tab-button flex-1 sm:flex-initial px-3.5 py-1.5 rounded-lg text-[#8E8E93] hover:text-white transition text-center';
    elements.viewResizer.classList.remove('hidden');
    elements.viewConverter.classList.add('hidden');
    if (state.sourceImage) {
      elements.headerActions.classList.remove('hidden');
      elements.mobileHeaderActions.classList.remove('hidden');
    }
  } else {
    elements.tabConverter.className = 'tab-button active flex-1 sm:flex-initial px-3.5 py-1.5 rounded-lg text-white font-medium bg-[#1C1C1E] transition text-center';
    elements.tabResizer.className = 'tab-button flex-1 sm:flex-initial px-3.5 py-1.5 rounded-lg text-[#8E8E93] hover:text-white transition text-center';
    elements.viewResizer.classList.add('hidden');
    elements.viewConverter.classList.remove('hidden');
    elements.headerActions.classList.add('hidden');
    elements.mobileHeaderActions.classList.add('hidden');
  }
  updateLucideIcons();
}

// Setup Resizer Events
function setupResizerEvents() {
  const dropzone = elements.dropzoneContainer;

  ['dragenter', 'dragover'].forEach(name => {
    dropzone.addEventListener(name, (e) => {
      e.preventDefault();
      dropzone.classList.add('drag-over');
    });
  });

  ['dragleave', 'drop'].forEach(name => {
    dropzone.addEventListener(name, (e) => {
      e.preventDefault();
      dropzone.classList.remove('drag-over');
    });
  });

  dropzone.addEventListener('drop', (e) => {
    const files = e.dataTransfer.files;
    if (files.length > 0) handleResizerFile(files[0]);
  });

  elements.fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) handleResizerFile(e.target.files[0]);
  });

  // Global paste (Ctrl + V)
  window.addEventListener('paste', (e) => {
    const items = (e.clipboardData || e.originalEvent.clipboardData).items;
    for (const item of items) {
      if (item.type.indexOf('image') !== -1) {
        const file = item.getAsFile();
        if (state.currentTab === 'resizer') {
          handleResizerFile(file);
          showToast('Image loaded into Resizer');
        } else {
          handleConverterFile(file);
          showToast('Image loaded into Converter');
        }
        break;
      }
    }
  });

  // Change Image (desktop + mobile)
  const triggerChange = () => {
    elements.fileInput.value = '';
    elements.fileInput.click();
  };
  elements.btnChangeImage.addEventListener('click', triggerChange);
  document.querySelectorAll('.btn-change-image-trigger').forEach(b => b.addEventListener('click', triggerChange));

  // Cropper Controls
  elements.btnRotateLeft.addEventListener('click', () => {
    if (state.cropper) {
      state.cropper.rotate(-90);
      triggerLiveOptimization();
    }
  });

  elements.btnRotateRight.addEventListener('click', () => {
    if (state.cropper) {
      state.cropper.rotate(90);
      triggerLiveOptimization();
    }
  });

  let scaleX = 1;
  elements.btnFlipH.addEventListener('click', () => {
    if (state.cropper) {
      scaleX = -scaleX;
      state.cropper.scaleX(scaleX);
      triggerLiveOptimization();
    }
  });

  elements.btnResetCrop.addEventListener('click', () => {
    if (state.cropper) {
      scaleX = 1;
      state.cropper.reset();
      triggerLiveOptimization();
    }
  });

  elements.lockRatioToggle.addEventListener('change', (e) => {
    if (state.cropper) {
      if (e.target.checked) {
        const w = parseInt(elements.inputWidth.value, 10) || state.targetWidth;
        const h = parseInt(elements.inputHeight.value, 10) || state.targetHeight;
        state.cropper.setAspectRatio(w / h);
      } else {
        state.cropper.setAspectRatio(NaN);
      }
      triggerLiveOptimization();
    }
  });

  // Filters
  elements.filterButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      setFilter(btn.dataset.filter);
      triggerLiveOptimization();
    });
  });

  // Output Format Selector inside Resizer
  elements.resizerFormatButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const fmt = btn.dataset.outformat;
      state.outputFormat = fmt;

      elements.resizerFormatButtons.forEach(b => {
        if (b === btn) {
          b.className = 'resizer-format-btn active py-1.5 rounded-lg text-xs font-medium border border-[#FF3B30] bg-[#FF3B30]/10 text-white transition';
        } else {
          b.className = 'resizer-format-btn py-1.5 rounded-lg text-xs font-medium border border-[#2C2C2E] bg-[#121214] text-[#8E8E93] hover:text-white transition';
        }
      });

      const displayFormat = fmt.toUpperCase() === 'JPEG' ? 'JPG' : fmt.toUpperCase();
      elements.statFormat.textContent = displayFormat;
      elements.btnDownloadText.textContent = `Download ${displayFormat}`;

      triggerLiveOptimization();
    });
  });

  // Signature threshold slider
  elements.signatureThreshold.addEventListener('input', (e) => {
    state.filterThreshold = parseInt(e.target.value, 10);
    elements.sliderThresholdVal.textContent = state.filterThreshold;
    triggerLiveOptimization();
  });

  // Name & Date Stamp
  elements.stampToggle.addEventListener('change', (e) => {
    state.addNameDate = e.target.checked;
    elements.stampInputs.classList.toggle('hidden', !state.addNameDate);
    triggerLiveOptimization();
  });

  elements.inputCandidateName.addEventListener('input', (e) => {
    state.candidateName = e.target.value.trim();
    triggerLiveOptimization();
  });

  elements.inputPhotoDate.addEventListener('input', (e) => {
    state.photoDate = e.target.value.trim();
    triggerLiveOptimization();
  });

  // Apply Changes
  elements.btnReapplySpecs.addEventListener('click', applyCustomSpecifications);

  [elements.inputWidth, elements.inputHeight, elements.inputMinKb, elements.inputMaxKb].forEach(input => {
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') applyCustomSpecifications();
    });
  });

  // Units
  elements.unitPx.addEventListener('click', () => setUnit('px'));
  elements.unitCm.addEventListener('click', () => setUnit('cm'));

  // Download
  elements.btnDownload.addEventListener('click', handleDownload);
}

// Setup Converter Events
function setupConverterEvents() {
  const dropzone = elements.converterDropzone;

  ['dragenter', 'dragover'].forEach(name => {
    dropzone.addEventListener(name, (e) => {
      e.preventDefault();
      dropzone.classList.add('drag-over');
    });
  });

  ['dragleave', 'drop'].forEach(name => {
    dropzone.addEventListener(name, (e) => {
      e.preventDefault();
      dropzone.classList.remove('drag-over');
    });
  });

  dropzone.addEventListener('drop', (e) => {
    const files = e.dataTransfer.files;
    if (files.length > 0) handleConverterFile(files[0]);
  });

  elements.converterFileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) handleConverterFile(e.target.files[0]);
  });

  elements.btnConvChangeFile.addEventListener('click', () => {
    elements.converterFileInput.value = '';
    elements.converterFileInput.click();
  });

  // Converter format choice buttons
  elements.convFormatButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.target;
      state.convTargetFormat = target;

      elements.convFormatButtons.forEach(b => {
        if (b === btn) {
          b.className = 'conv-format-btn active py-3 px-2 sm:px-4 rounded-xl border border-[#FF3B30] bg-[#FF3B30]/10 text-white font-semibold text-xs sm:text-sm transition text-center';
        } else {
          b.className = 'conv-format-btn py-3 px-2 sm:px-4 rounded-xl border border-[#2C2C2E] bg-[#121214] text-[#8E8E93] hover:text-white font-semibold text-xs sm:text-sm transition text-center';
        }
      });

      runConverterProcess();
    });
  });

  // Convert & Download
  elements.btnConvertDownload.addEventListener('click', () => {
    if (!state.convResultBlob) return;
    const baseName = state.convSourceFile ? state.convSourceFile.name.replace(/\.[^/.]+$/, "") : "converted";
    const filename = `${baseName}.${state.convResultExt}`;

    const link = document.createElement('a');
    link.href = URL.createObjectURL(state.convResultBlob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast(`Converted & downloaded: ${filename}`);
  });
}

// Handle Resizer File Upload
function handleResizerFile(file) {
  if (!file || !file.type.startsWith('image/')) {
    showToast('Please select a valid image file');
    return;
  }

  state.sourceFileName = file.name.replace(/\.[^/.]+$/, "");
  const reader = new FileReader();

  reader.onload = (e) => {
    state.sourceImage = e.target.result;
    elements.cropperImage.src = state.sourceImage;

    elements.dropzoneContainer.classList.add('hidden');
    elements.editorWorkspace.classList.remove('hidden');
    elements.headerActions.classList.remove('hidden');
    elements.mobileHeaderActions.classList.remove('hidden');

    initCropper();
  };

  reader.readAsDataURL(file);
}

// Handle Converter File Upload
function handleConverterFile(file) {
  if (!file || !file.type.startsWith('image/')) {
    showToast('Please select a valid image file');
    return;
  }

  state.convSourceFile = file;
  const sizeMb = (file.size / (1024 * 1024)).toFixed(2);
  const sizeKb = (file.size / 1024).toFixed(1);
  const displaySize = file.size > 1024 * 1024 ? `${sizeMb} MB` : `${sizeKb} KB`;

  elements.convFileName.textContent = file.name;
  elements.convFileMeta.textContent = `${displaySize} • ${file.type.split('/')[1]?.toUpperCase() || 'IMAGE'}`;

  const reader = new FileReader();
  reader.onload = (e) => {
    const img = new Image();
    img.onload = () => {
      state.convSourceImg = img;
      elements.converterDropzone.classList.add('hidden');
      elements.converterWorkspace.classList.remove('hidden');
      runConverterProcess();
      updateLucideIcons();
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

// Run Standalone Conversion
async function runConverterProcess() {
  if (!state.convSourceImg) return;

  const result = await convertImageDirectly(state.convSourceImg, state.convTargetFormat, 0.92);
  state.convResultBlob = result.blob;
  state.convResultExt = result.extension;

  elements.convOutputSize.textContent = `${result.sizeKb} KB`;
  elements.convOutputFormat.textContent = result.formatName;
}

// Initialize Cropper
function initCropper() {
  if (state.cropper) {
    state.cropper.destroy();
  }

  const aspectRatio = elements.lockRatioToggle.checked 
    ? (state.targetWidth / state.targetHeight) 
    : NaN;

  state.cropper = new Cropper(elements.cropperImage, {
    aspectRatio: aspectRatio,
    viewMode: 1,
    dragMode: 'move',
    autoCropArea: 0.9,
    responsive: true,
    restore: false,
    guides: true,
    center: true,
    highlight: false,
    cropBoxMovable: true,
    cropBoxResizable: true,
    toggleDragModeOnDblclick: false,
    ready: () => triggerLiveOptimization(),
    cropend: () => triggerLiveOptimization(),
    zoom: () => triggerLiveOptimization()
  });
}

// Debounced live optimization in Resizer
function triggerLiveOptimization() {
  clearTimeout(state.debounceTimer);
  elements.processingLoader.classList.remove('hidden');

  state.debounceTimer = setTimeout(async () => {
    await runOptimization();
    elements.processingLoader.classList.add('hidden');
  }, 180);
}

// Run canvas processing
async function runOptimization() {
  if (!state.cropper) return;

  const croppedCanvas = state.cropper.getCroppedCanvas({
    imageSmoothingQuality: 'high'
  });

  if (!croppedCanvas) return;

  const result = await optimizeImageToTargetSize(
    croppedCanvas,
    state.targetWidth,
    state.targetHeight,
    state.minKb,
    state.maxKb,
    {
      format: state.outputFormat,
      filter: state.activeFilter,
      filterOptions: { threshold: state.filterThreshold },
      addNameDate: state.addNameDate,
      candidateName: state.candidateName,
      photoDate: state.photoDate
    }
  );

  state.currentBlob = result.blob;
  elements.previewImage.src = result.dataUrl;
  elements.statSize.textContent = `${result.sizeKb} KB`;
  elements.statDimensions.textContent = `${result.width} × ${result.height}`;
}

// Apply Specifications
function applyCustomSpecifications() {
  let w = parseFloat(elements.inputWidth.value);
  let h = parseFloat(elements.inputHeight.value);
  const minKb = parseInt(elements.inputMinKb.value, 10);
  const maxKb = parseInt(elements.inputMaxKb.value, 10);

  if (state.unit === 'cm') {
    w = Math.round(w * 78.7);
    h = Math.round(h * 78.7);
  }

  if (w > 0 && h > 0) {
    state.targetWidth = Math.round(w);
    state.targetHeight = Math.round(h);
  }
  if (minKb >= 0) state.minKb = minKb;
  if (maxKb > 0) state.maxKb = maxKb;

  if (state.cropper && elements.lockRatioToggle.checked) {
    state.cropper.setAspectRatio(state.targetWidth / state.targetHeight);
  }

  showToast('Settings applied');
  triggerLiveOptimization();
}

// Set active filter
function setFilter(filter) {
  state.activeFilter = filter;
  elements.filterButtons.forEach(btn => {
    if (btn.dataset.filter === filter) {
      btn.classList.add('border-[#FF3B30]', 'bg-[#FF3B30]/10', 'text-white');
      btn.classList.remove('border-[#2C2C2E]', 'bg-[#121214]', 'text-[#8E8E93]');
    } else {
      btn.classList.remove('border-[#FF3B30]', 'bg-[#FF3B30]/10', 'text-white');
      btn.classList.add('border-[#2C2C2E]', 'bg-[#121214]', 'text-[#8E8E93]');
    }
  });

  if (filter === 'clean-signature') {
    elements.signatureSliderBox.classList.remove('hidden');
  } else {
    elements.signatureSliderBox.classList.add('hidden');
  }
}

// Unit switch
function setUnit(unit) {
  state.unit = unit;
  const unitLabels = document.querySelectorAll('.unit-label');

  if (unit === 'cm') {
    elements.unitCm.className = 'px-2 py-0.5 rounded bg-white text-black font-semibold';
    elements.unitPx.className = 'px-2 py-0.5 rounded bg-[#121214] text-[#8E8E93] hover:text-white';
    elements.inputWidth.value = (state.targetWidth / 78.7).toFixed(1);
    elements.inputHeight.value = (state.targetHeight / 78.7).toFixed(1);
    unitLabels.forEach(l => l.textContent = 'cm');
  } else {
    elements.unitPx.className = 'px-2 py-0.5 rounded bg-white text-black font-semibold';
    elements.unitCm.className = 'px-2 py-0.5 rounded bg-[#121214] text-[#8E8E93] hover:text-white';
    elements.inputWidth.value = state.targetWidth;
    elements.inputHeight.value = state.targetHeight;
    unitLabels.forEach(l => l.textContent = 'px');
  }
}

// Handle Download
function handleDownload() {
  if (!state.currentBlob) return;

  const ext = state.outputFormat === 'jpeg' ? 'jpg' : state.outputFormat;
  const filename = `${state.sourceFileName}_${Math.round(state.currentBlob.size / 1024)}kb.${ext}`;

  const link = document.createElement('a');
  link.href = URL.createObjectURL(state.currentBlob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  showToast(`Downloaded ${filename}`);
}

// Toast
function showToast(message) {
  elements.toastMessage.textContent = message;
  elements.toast.classList.remove('translate-y-20', 'opacity-0');
  elements.toast.classList.add('translate-y-0', 'opacity-100');

  setTimeout(() => {
    elements.toast.classList.remove('translate-y-0', 'opacity-100');
    elements.toast.classList.add('translate-y-20', 'opacity-0');
  }, 2400);
}

// Helper to update icons
function updateLucideIcons() {
  if (window.lucide) {
    window.lucide.createIcons();
  }
}

document.addEventListener('DOMContentLoaded', init);
