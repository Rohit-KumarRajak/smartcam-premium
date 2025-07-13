let model;
let isDetecting = false;
let lastDetectionTime = 0;
const detectionInterval = 300;

export async function init({ videoElement, canvasElement, statusElement }) {
  statusElement.textContent = 'Loading object detection model...';

  try {
    if (model) await model.dispose();

    model = await cocoSsd.load();
    statusElement.textContent = 'Object detection ready. Point the camera at objects.';

    isDetecting = true;
    detectLoop(videoElement, canvasElement, statusElement);
  } catch (err) {
    console.error('Model load failed:', err);
    statusElement.textContent = 'Failed to load object detection';
    statusElement.style.color = '#f00';
  }
}

async function detectLoop(video, canvas, status) {
  if (!isDetecting || video.paused || video.ended) return;

  const now = Date.now();
  if (now - lastDetectionTime < detectionInterval) {
    requestAnimationFrame(() => detectLoop(video, canvas, status));
    return;
  }
  lastDetectionTime = now;

  try {
    const predictions = await model.detect(video);
    drawPredictions(canvas, predictions);
    updateStatus(status, predictions);
  } catch (err) {
    console.error('Detection error:', err);
    status.textContent = 'Detection error';
  }

  requestAnimationFrame(() => detectLoop(video, canvas, status));
}

function drawPredictions(canvas, predictions) {
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  predictions.forEach(pred => {
    if (pred.score > 0.6) {
      const [x, y, w, h] = pred.bbox;
      ctx.strokeStyle = '#00ff00';
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, w, h);

      const label = `${pred.class} (${Math.round(pred.score * 100)}%)`;
      ctx.fillStyle = '#00ff00';
      ctx.font = '16px sans-serif';
      ctx.fillText(label, x, y > 20 ? y - 8 : y + 20);
    }
  });
}

function updateStatus(status, predictions) {
  const objects = predictions
    .filter(p => p.score > 0.6)
    .map(p => p.class);

  if (objects.length > 0) {
    status.textContent = `Detected: ${[...new Set(objects)].join(', ')}`;
  } else {
    status.textContent = 'No objects detected';
  }
}

export function cleanup() {
  isDetecting = false;
  if (model) model.dispose();
}
