// ============================================================================
// SubtitleForge — Frontend Application Logic
// Handles upload, job polling, media playback, and subtitle display
// ============================================================================

(() => {
  'use strict';

  // -------------------------------------------------------------------------
  // State
  // -------------------------------------------------------------------------
  const state = {
    file: null,
    jobId: null,
    mediaUrl: null,
    subtitles: { en: [], he: [] },
    currentLang: 'en',     // Player overlay language: en | he | dual
    panelLang: 'en',       // Subtitle list panel language
    isPlaying: false,
    pollTimer: null
  };

  // -------------------------------------------------------------------------
  // DOM References
  // -------------------------------------------------------------------------
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  const dom = {
    // Upload
    dropzone: $('#dropzone'),
    fileInput: $('#file-input'),
    fileSelected: $('#file-selected'),
    fileName: $('#file-name'),
    fileSize: $('#file-size'),
    btnRemove: $('#btn-remove'),
    btnProcess: $('#btn-process'),

    // Processing
    sectionUpload: $('#section-upload'),
    sectionProcessing: $('#section-processing'),
    processingStage: $('#processing-stage'),
    progressFill: $('#progress-fill'),
    progressGlow: $('#progress-glow'),
    progressPercentage: $('#progress-percentage'),
    progressEta: $('#progress-eta'),
    stepExtract: $('#step-extract'),
    stepTranscribe: $('#step-transcribe'),
    stepTranslate: $('#step-translate'),
    stepFormat: $('#step-format'),

    // Results
    sectionResults: $('#section-results'),
    videoPlayer: $('#video-player'),
    audioPlayer: $('#audio-player'),
    audioPlayerWrapper: $('#audio-player-wrapper'),
    subtitleText: $('#subtitle-text'),
    subtitleList: $('#subtitle-list'),

    // Player controls
    btnPlay: $('#btn-play'),
    iconPlay: $('.icon-play'),
    iconPause: $('.icon-pause'),
    timeCurrent: $('#time-current'),
    timeDuration: $('#time-duration'),
    seekbarContainer: $('#seekbar-container'),
    seekbarFill: $('#seekbar-fill'),
    seekbarThumb: $('#seekbar-thumb'),

    // Language
    btnLangEn: $('#btn-lang-en'),
    btnLangHe: $('#btn-lang-he'),
    btnLangDual: $('#btn-lang-dual'),
    tabEn: $('#tab-en'),
    tabHe: $('#tab-he'),

    // Error
    errorToast: $('#error-toast'),
    errorMessage: $('#error-message'),
    errorClose: $('#error-close')
  };

  // -------------------------------------------------------------------------
  // Utilities
  // -------------------------------------------------------------------------
  function formatBytes(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  function formatTime(seconds) {
    if (isNaN(seconds)) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${String(s).padStart(2, '0')}`;
  }

  function formatTimestamp(seconds) {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${String(s).padStart(2, '0')}`;
  }

  function showError(msg) {
    dom.errorMessage.textContent = msg;
    dom.errorToast.hidden = false;
    requestAnimationFrame(() => dom.errorToast.classList.add('visible'));
    setTimeout(() => hideError(), 8000);
  }

  function hideError() {
    dom.errorToast.classList.remove('visible');
    setTimeout(() => { dom.errorToast.hidden = true; }, 500);
  }

  // -------------------------------------------------------------------------
  // File Upload
  // -------------------------------------------------------------------------
  function setupDropzone() {
    const dz = dom.dropzone;

    // Click to browse
    dz.addEventListener('click', () => dom.fileInput.click());
    dz.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        dom.fileInput.click();
      }
    });

    // Drag events
    ['dragenter', 'dragover'].forEach(evt => {
      dz.addEventListener(evt, (e) => {
        e.preventDefault();
        dz.classList.add('drag-over');
      });
    });

    ['dragleave', 'drop'].forEach(evt => {
      dz.addEventListener(evt, (e) => {
        e.preventDefault();
        dz.classList.remove('drag-over');
      });
    });

    dz.addEventListener('drop', (e) => {
      const files = e.dataTransfer.files;
      if (files.length > 0) selectFile(files[0]);
    });

    // File input change
    dom.fileInput.addEventListener('change', (e) => {
      if (e.target.files.length > 0) selectFile(e.target.files[0]);
    });

    // Remove file
    dom.btnRemove.addEventListener('click', () => {
      state.file = null;
      dom.fileSelected.hidden = true;
      dom.dropzone.hidden = false;
      dom.fileInput.value = '';
    });

    // Process button
    dom.btnProcess.addEventListener('click', startProcessing);
  }

  function selectFile(file) {
    const ext = file.name.split('.').pop().toLowerCase();
    if (!['m4a', 'mp4', 'webm'].includes(ext)) {
      showError(`Unsupported file type: .${ext}. Please use .m4a, .mp4, or .webm`);
      return;
    }

    state.file = file;
    dom.fileName.textContent = file.name;
    dom.fileSize.textContent = formatBytes(file.size);
    dom.fileSelected.hidden = false;
    dom.dropzone.hidden = true;
  }

  // -------------------------------------------------------------------------
  // Processing Pipeline
  // -------------------------------------------------------------------------
  async function startProcessing() {
    if (!state.file) return;

    // Show processing section
    dom.sectionProcessing.hidden = false;
    dom.sectionProcessing.classList.add('fade-in');
    dom.btnProcess.disabled = true;
    dom.btnProcess.style.opacity = '0.5';
    dom.btnProcess.style.pointerEvents = 'none';

    // Scroll to processing
    dom.sectionProcessing.scrollIntoView({ behavior: 'smooth', block: 'center' });

    // Upload file
    const formData = new FormData();
    formData.append('media', state.file);

    try {
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Upload failed');
      }

      const data = await res.json();
      state.jobId = data.jobId;
      state.mediaUrl = data.mediaUrl;

      // Start polling
      pollJob();

    } catch (err) {
      showError(`Upload failed: ${err.message}`);
      dom.btnProcess.disabled = false;
      dom.btnProcess.style.opacity = '1';
      dom.btnProcess.style.pointerEvents = 'auto';
    }
  }

  function pollJob() {
    if (!state.jobId) return;

    state.pollTimer = setInterval(async () => {
      try {
        const res = await fetch(`/api/job/${state.jobId}`);
        const data = await res.json();

        updateProgress(data);

        if (data.status === 'complete') {
          clearInterval(state.pollTimer);
          onProcessingComplete(data.result);
        } else if (data.status === 'error') {
          clearInterval(state.pollTimer);
          showError(`Processing failed: ${data.error}`);
        }
      } catch (err) {
        console.error('Poll error:', err);
      }
    }, 1000);
  }

  function updateProgress(data) {
    const pct = data.progress || 0;
    dom.progressFill.style.width = `${pct}%`;
    dom.progressGlow.style.width = `${pct}%`;
    dom.progressPercentage.textContent = `${pct}%`;
    dom.processingStage.textContent = data.stage || 'Processing...';

    // Update pipeline step statuses
    if (pct >= 5) setStepStatus('step-extract', pct >= 15 ? 'done' : 'active');
    if (pct >= 15) setStepStatus('step-transcribe', pct >= 60 ? 'done' : 'active');
    if (pct >= 60) setStepStatus('step-translate', pct >= 90 ? 'done' : 'active');
    if (pct >= 90) setStepStatus('step-format', pct >= 100 ? 'done' : 'active');
  }

  function setStepStatus(stepId, status) {
    const el = document.getElementById(stepId);
    if (el) el.dataset.status = status;
  }

  function onProcessingComplete(result) {
    state.subtitles.en = result.english || [];
    state.subtitles.he = result.hebrew || [];

    // Show results section
    dom.sectionResults.hidden = false;
    dom.sectionResults.classList.add('fade-in');
    dom.sectionResults.scrollIntoView({ behavior: 'smooth', block: 'start' });

    // Setup player
    setupMediaPlayer();

    // Render subtitle list
    renderSubtitleList();

    // Setup download buttons
    setupDownloads();
  }

  // -------------------------------------------------------------------------
  // Media Player
  // -------------------------------------------------------------------------
  function getActivePlayer() {
    return dom.videoPlayer.hidden ? dom.audioPlayer : dom.videoPlayer;
  }

  function setupMediaPlayer() {
    const ext = state.file.name.split('.').pop().toLowerCase();
    const isVideo = ext === 'mp4' || ext === 'webm';

    if (isVideo) {
      dom.videoPlayer.src = state.mediaUrl;
      dom.videoPlayer.hidden = false;
      dom.audioPlayerWrapper.hidden = true;
    } else {
      dom.audioPlayer.src = state.mediaUrl;
      dom.audioPlayerWrapper.hidden = false;
      dom.videoPlayer.hidden = true;
      createAudioWave();
    }

    const player = getActivePlayer();

    // Play/Pause
    dom.btnPlay.addEventListener('click', togglePlay);

    // Time update
    player.addEventListener('timeupdate', onTimeUpdate);
    player.addEventListener('loadedmetadata', () => {
      dom.timeDuration.textContent = formatTime(player.duration);
    });
    player.addEventListener('ended', () => {
      state.isPlaying = false;
      dom.iconPlay.hidden = false;
      dom.iconPause.hidden = true;
    });

    // Seekbar
    dom.seekbarContainer.addEventListener('click', (e) => {
      const rect = dom.seekbarContainer.getBoundingClientRect();
      const pct = (e.clientX - rect.left) / rect.width;
      player.currentTime = pct * player.duration;
    });

    // Language toggles (player overlay)
    dom.btnLangEn.addEventListener('click', () => setPlayerLang('en'));
    dom.btnLangHe.addEventListener('click', () => setPlayerLang('he'));
    dom.btnLangDual.addEventListener('click', () => setPlayerLang('dual'));

    // Panel tabs
    dom.tabEn.addEventListener('click', () => setPanelLang('en'));
    dom.tabHe.addEventListener('click', () => setPanelLang('he'));
  }

  function togglePlay() {
    const player = getActivePlayer();
    if (player.paused) {
      player.play();
      state.isPlaying = true;
      dom.iconPlay.hidden = true;
      dom.iconPause.hidden = false;
    } else {
      player.pause();
      state.isPlaying = false;
      dom.iconPlay.hidden = false;
      dom.iconPause.hidden = true;
    }
  }

  function onTimeUpdate() {
    const player = getActivePlayer();
    const currentTime = player.currentTime;
    const duration = player.duration || 0;

    // Update seekbar
    const pct = duration > 0 ? (currentTime / duration) * 100 : 0;
    dom.seekbarFill.style.width = `${pct}%`;
    dom.seekbarThumb.style.left = `${pct}%`;
    dom.timeCurrent.textContent = formatTime(currentTime);

    // Update subtitle overlay
    updateSubtitleOverlay(currentTime);

    // Highlight active subtitle in list
    highlightActiveSubtitle(currentTime);

    // Animate audio wave if audio
    if (!dom.audioPlayerWrapper.hidden) {
      animateWave(state.isPlaying);
    }
  }

  function updateSubtitleOverlay(time) {
    const lang = state.currentLang;
    let html = '';

    if (lang === 'en' || lang === 'dual') {
      const seg = findSegmentAt(state.subtitles.en, time);
      if (seg) html += `<span class="sub-line">${escapeHtml(seg.text)}</span>`;
    }

    if (lang === 'he' || lang === 'dual') {
      const seg = findSegmentAt(state.subtitles.he, time);
      if (seg) html += `<span class="sub-line sub-line-he">${escapeHtml(seg.text)}</span>`;
    }

    dom.subtitleText.innerHTML = html;
  }

  function findSegmentAt(segments, time) {
    for (const seg of segments) {
      if (time >= seg.start && time <= seg.end) return seg;
    }
    return null;
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function setPlayerLang(lang) {
    state.currentLang = lang;
    dom.btnLangEn.classList.toggle('active', lang === 'en');
    dom.btnLangHe.classList.toggle('active', lang === 'he');
    dom.btnLangDual.classList.toggle('active', lang === 'dual');
  }

  function setPanelLang(lang) {
    state.panelLang = lang;
    dom.tabEn.classList.toggle('active', lang === 'en');
    dom.tabHe.classList.toggle('active', lang === 'he');
    renderSubtitleList();
  }

  // -------------------------------------------------------------------------
  // Audio Visualizer
  // -------------------------------------------------------------------------
  function createAudioWave() {
    const container = document.querySelector('.audio-wave');
    container.innerHTML = '';
    const barCount = 40;
    for (let i = 0; i < barCount; i++) {
      const bar = document.createElement('div');
      bar.className = 'wave-bar';
      bar.style.height = '4px';
      container.appendChild(bar);
    }
  }

  function animateWave(playing) {
    const bars = document.querySelectorAll('.wave-bar');
    bars.forEach((bar, i) => {
      if (playing) {
        const h = 8 + Math.random() * 60;
        bar.style.height = `${h}px`;
      } else {
        bar.style.height = '4px';
      }
    });
  }

  // -------------------------------------------------------------------------
  // Subtitle List
  // -------------------------------------------------------------------------
  function renderSubtitleList() {
    const segments = state.subtitles[state.panelLang] || [];
    const isHebrew = state.panelLang === 'he';

    dom.subtitleList.innerHTML = segments.map((seg, i) => `
      <div class="sub-entry" data-index="${i}" data-start="${seg.start}">
        <span class="sub-entry-time">${formatTimestamp(seg.start)}</span>
        <span class="sub-entry-text" ${isHebrew ? 'dir="rtl"' : ''}>${escapeHtml(seg.text)}</span>
      </div>
    `).join('');

    // Click to seek
    dom.subtitleList.querySelectorAll('.sub-entry').forEach(entry => {
      entry.addEventListener('click', () => {
        const player = getActivePlayer();
        player.currentTime = parseFloat(entry.dataset.start);
        if (player.paused) togglePlay();
      });
    });
  }

  function highlightActiveSubtitle(time) {
    const entries = dom.subtitleList.querySelectorAll('.sub-entry');
    const segments = state.subtitles[state.panelLang] || [];

    entries.forEach((entry, i) => {
      const seg = segments[i];
      const isActive = seg && time >= seg.start && time <= seg.end;
      entry.classList.toggle('active', isActive);

      // Auto-scroll to active
      if (isActive) {
        entry.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    });
  }

  // -------------------------------------------------------------------------
  // Downloads
  // -------------------------------------------------------------------------
  function setupDownloads() {
    const downloadBtns = document.querySelectorAll('.btn-download');
    downloadBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const lang = btn.dataset.lang;
        const format = btn.dataset.format;
        window.location.href = `/api/download/${state.jobId}/${lang}/${format}`;
      });
    });
  }

  // -------------------------------------------------------------------------
  // Error handling
  // -------------------------------------------------------------------------
  dom.errorClose.addEventListener('click', hideError);

  // -------------------------------------------------------------------------
  // Initialize
  // -------------------------------------------------------------------------
  setupDropzone();

})();
