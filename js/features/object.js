let model;
let lastDetectionTime = 0;
const detectionInterval = 500; // ms
let isDetecting = false;

export async function init({ videoElement, canvasElement, statusElement }) {
  statusElement.textContent = 'Loading object detection model...';
  
  try {
    // Dispose previous model if exists
    if (model) {
      await model.dispose();
    }
    
    model = await cocoSsd.load();
    statusElement.textContent = 'Object detection ready. Point camera at objects.';
    isDetecting = true;
    detectObjects(videoElement, canvasElement, statusElement);
  } catch (error) {
    statusElement.textContent = 'Failed to load object detection';
    statusElement.style.color = '#f00';
    console.error(error);
  }
}

async function detectObjects(video, canvas, status) {
  if (!isDetecting || video.paused || video.ended) {
    return;
  }

  const now = Date.now();
  if (now - lastDetectionTime < detectionInterval) {
    requestAnimationFrame(() => detectObjects(video, canvas, status));
    return;
  }
  lastDetectionTime = now;

  try {
    const predictions = await model.detect(video);
    renderPredictions(canvas, predictions, status);
  } catch (error) {
    if (error.message.includes('Tensor is disposed')) {
      console.warn('Tensor disposed during detection - restarting detection');
      isDetecting = false;
      init({ videoElement: video, canvasElement: canvas, statusElement: status });
      return;
    }
    console.error('Detection error:', error);
  }

  requestAnimationFrame(() => detectObjects(video, canvas, status));
}

function renderPredictions(canvas, predictions, status) {
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  let detectedObjects = [];
  
  predictions.forEach(pred => {
    if (pred.score > 0.65) {
      const [x, y, width, height] = pred.bbox;
      
      // Draw bounding box
      ctx.strokeStyle = '#00FF00';
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, width, height);
      
      // Draw label
      ctx.fillStyle = '#00FF00';
      const text = `${pred.class} (${Math.round(pred.score * 100)}%)`;
      ctx.fillText(text, x, y > 10 ? y - 5 : y + 15);
      
      detectedObjects.push(pred.class);
    }
  });
  
  if (detectedObjects.length > 0) {
    status.textContent = `Detected: ${detectedObjects.join(', ')}`;
  }
}

export function cleanup() {
  isDetecting = false;
  if (model) {
    model.dispose();
  }
}