class SmartCamApp {
  constructor() {
    this.currentFeature = null;
    this.cameraManager = new CameraManager();
    this.isFeatureActive = false;
    
    this.ui = {
      featureGrid: document.getElementById('feature-grid'),
      featureContainer: document.getElementById('feature-container'),
      videoFeed: document.getElementById('video-feed'),
      processingCanvas: document.getElementById('processing-canvas'),
      statusMessage: document.getElementById('status-message'),
      flipBtn: document.getElementById('flip-btn'),
      backBtn: document.getElementById('back-btn')
    };
    
    this.setupEventListeners();
    this.ui.featureGrid.style.display = 'grid';
    this.ui.featureContainer.style.display = 'none';
    this.cameraManager.setVideoElement(this.ui.videoFeed);
  }

  setupEventListeners() {
    this.ui.flipBtn.addEventListener('click', () => this.flipCamera());
    this.ui.backBtn.addEventListener('click', () => this.returnToGrid());
  }

  async safeLoadFeature(featureName) {
    try {
      await this.loadFeature(featureName);
    } catch (error) {
      console.error(`Error in feature ${featureName}:`, error);
      this.showError(`${featureName} encountered an error - trying to recover`);
      
      // Try to recover by reinitializing
      setTimeout(() => {
        this.safeLoadFeature(featureName);
      }, 1000);
    }
  }

  async loadFeature(featureName) {
    try {
      if (this.isFeatureActive) return;
      this.isFeatureActive = true;
      
      this.showStatus(`Loading ${featureName}...`);
      this.ui.featureGrid.style.display = 'none';
      this.ui.featureContainer.style.display = 'block';
      
      // Clear previous drawings
      const ctx = this.ui.processingCanvas.getContext('2d');
      ctx.clearRect(0, 0, this.ui.processingCanvas.width, this.ui.processingCanvas.height);
      
      // Initialize camera stream
      const stream = await this.cameraManager.getStream();
      this.ui.videoFeed.srcObject = stream;
      
      await new Promise((resolve) => {
        this.ui.videoFeed.onloadedmetadata = () => {
          this.ui.processingCanvas.width = this.ui.videoFeed.videoWidth;
          this.ui.processingCanvas.height = this.ui.videoFeed.videoHeight;
          resolve();
        };
      });
      
      // Load the feature module
      const module = await import(`./features/${featureName}.js`);
      
      // Cleanup previous feature if exists
      if (this.currentFeature?.cleanup) {
        await this.currentFeature.cleanup();
      }
      
      this.currentFeature = module;
      
      if (typeof module.init === 'function') {
        await module.init({
          videoElement: this.ui.videoFeed,
          canvasElement: this.ui.processingCanvas,
          statusElement: this.ui.statusMessage,
          getCamera: () => this.cameraManager.getStream()
        });
      }
      
      this.showStatus(`${featureName} ready`);
      this.isFeatureActive = false;
    } catch (error) {
      this.isFeatureActive = false;
      console.error(`Error loading ${featureName}:`, error);
      this.showError(`Failed to load ${featureName}`);
      this.returnToGrid();
      throw error; // Re-throw for safeLoadFeature to handle
    }
  }

  async flipCamera() {
    this.showStatus("Switching camera...");
    try {
      await this.cameraManager.flip();
      this.showStatus("Camera switched");
    } catch (error) {
      this.showError("Failed to switch camera");
      console.error(error);
    }
  }

  returnToGrid() {
    this.isFeatureActive = false;
    
    if (this.currentFeature?.cleanup) {
      this.currentFeature.cleanup();
    }
    
    this.cameraManager.stop();
    this.ui.featureGrid.style.display = 'grid';
    this.ui.featureContainer.style.display = 'none';
    this.ui.statusMessage.textContent = '';
  }

  showStatus(message) {
    this.ui.statusMessage.textContent = message;
    this.ui.statusMessage.style.color = '#000';
  }

  showError(message) {
    this.ui.statusMessage.textContent = message;
    this.ui.statusMessage.style.color = '#f00';
  }
}