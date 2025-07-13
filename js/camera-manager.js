class CameraManager {
  constructor() {
    this.currentStream = null;
    this.facingMode = 'user'; // front camera by default
    this.videoElement = null;
  }

  async getStream(facingMode = this.facingMode) {
    try {
      // Stop current stream if exists
      if (this.currentStream) {
        this.stop();
      }
      
      const constraints = {
        video: { 
          facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      };
      
      this.currentStream = await navigator.mediaDevices.getUserMedia(constraints);
      this.facingMode = facingMode;
      
      if (this.videoElement) {
        this.videoElement.srcObject = this.currentStream;
        await new Promise((resolve) => {
          this.videoElement.onloadedmetadata = resolve;
        });
      }
      
      return this.currentStream;
    } catch (error) {
      console.error('Camera error:', error);
      throw error;
    }
  }

  async flip() {
    const newMode = this.facingMode === 'user' ? 'environment' : 'user';
    return this.getStream(newMode);
  }

  stop() {
    if (this.currentStream) {
      this.currentStream.getTracks().forEach(track => track.stop());
      this.currentStream = null;
    }
    
    if (this.videoElement) {
      this.videoElement.srcObject = null;
    }
  }

  setVideoElement(element) {
    this.videoElement = element;
  }
}