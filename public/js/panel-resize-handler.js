/**
 * Panel Resize Handler - Makes the divider functional
 * Allows users to resize left/right panels by dragging the divider
 */

class PanelResizeHandler {
  constructor() {
    this.isResizing = false;
    this.minPanelWidth = 20; // Minimum 20% width
    this.maxPanelWidth = 80; // Maximum 80% width
    this.init();
  }

  init() {
    this.setupResizeHandler();
    this.loadPanelRatio();
  }

  setupResizeHandler() {
    const divider = document.getElementById('divider');
    const leftPanel = document.getElementById('appLeft');
    const rightPanel = document.getElementById('appRight');

    if (!divider || !leftPanel || !rightPanel) {
      console.warn('Panel resize: Required elements not found');
      return;
    }

    // Mouse events for desktop
    divider.addEventListener('mousedown', (e) => {
      this.startResize(e);
    });

    document.addEventListener('mousemove', (e) => {
      this.handleResize(e);
    });

    document.addEventListener('mouseup', () => {
      this.stopResize();
    });

    // Touch events for mobile
    divider.addEventListener('touchstart', (e) => {
      this.startResize(e.touches[0]);
    });

    document.addEventListener('touchmove', (e) => {
      if (this.isResizing) {
        e.preventDefault();
        this.handleResize(e.touches[0]);
      }
    });

    document.addEventListener('touchend', () => {
      this.stopResize();
    });

    console.log('Panel resize handler initialized');
  }

  startResize(event) {
    this.isResizing = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    
    // Add subtle visual feedback
    const divider = document.getElementById('divider');
    if (divider) {
      divider.classList.remove('bg-gray-700');
      divider.classList.add('bg-gray-500');
    }
  }

  handleResize(event) {
    if (!this.isResizing) return;

    const container = document.querySelector('main');
    const leftPanel = document.getElementById('appLeft');
    const rightPanel = document.getElementById('appRight');

    if (!container || !leftPanel || !rightPanel) return;

    const containerRect = container.getBoundingClientRect();
    const leftWidth = ((event.clientX - containerRect.left) / containerRect.width) * 100;

    // Constrain to min/max values
    const constrainedWidth = Math.min(Math.max(leftWidth, this.minPanelWidth), this.maxPanelWidth);
    const rightWidth = 100 - constrainedWidth;

    // Apply new widths
    leftPanel.style.width = `${constrainedWidth}%`;
    rightPanel.style.width = `${rightWidth}%`;

    // Update global config if available
    this.updateGlobalConfig(constrainedWidth);
  }

  stopResize() {
    if (!this.isResizing) return;

    this.isResizing = false;
    document.body.style.cursor = '';
    document.body.style.userSelect = '';

    // Remove visual feedback
    const divider = document.getElementById('divider');
    if (divider) {
      divider.classList.remove('bg-gray-500');
      divider.classList.add('bg-gray-700');
    }

    // Save current panel ratio
    this.savePanelRatio();
  }

  updateGlobalConfig(leftWidth) {
    if (window.AppStore && window.AppStore.updateGlobalConfig) {
      window.AppStore.updateGlobalConfig({ panelRatio: Math.round(leftWidth) });
    }
  }

  savePanelRatio() {
    const leftPanel = document.getElementById('appLeft');
    if (leftPanel) {
      const leftWidth = parseFloat(leftPanel.style.width) || 50;
      localStorage.setItem('panelRatio', leftWidth.toString());
    }
  }

  loadPanelRatio() {
    const savedRatio = localStorage.getItem('panelRatio');
    if (savedRatio) {
      this.applyPanelRatio(parseFloat(savedRatio));
    }
  }

  applyPanelRatio(leftWidth) {
    const leftPanel = document.getElementById('appLeft');
    const rightPanel = document.getElementById('appRight');

    if (!leftPanel || !rightPanel) return;

    const constrainedWidth = Math.min(Math.max(leftWidth, this.minPanelWidth), this.maxPanelWidth);
    const rightWidth = 100 - constrainedWidth;

    leftPanel.style.width = `${constrainedWidth}%`;
    rightPanel.style.width = `${rightWidth}%`;
  }

  // Public method to set panel ratio from global config
  setPanelRatio(ratio) {
    this.applyPanelRatio(ratio);
    this.savePanelRatio();
  }
}

// Initialize panel resize handler when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.panelResizeHandler = new PanelResizeHandler();
});