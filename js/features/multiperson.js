let model;
let isCounting = false;
let lastCountTime = 0;
const countInterval = 400;

export async function init({ videoElement, canvasElement, statusElement }) {
  statusElement.textContent = 'Loading people detection model...';

  try {
    if (model) await model.dispose();
    model = await cocoSsd.load();
    
    statusElement.textContent = 'People counter ready. Point at a crowd!';
    isCounting = true;
    runPeopleCounter(videoElement, canvasElement, statusElement);
  } catch (err) {
    console.error('People model error:', err);
    statusElement.textContent = 'Failed to load people counter';
    statusElement.style.color = '#f00';
  }
}

async function runPeopleCounter(video, canvas, status) {
  if (!isCounting || video.paused || video.ended) return;

  const now = Date.now();
  if (now - lastCountTime < countInterval) {
    requestAnimationFrame(() => runPeopleCounter(video, canvas, status));
    return;
  }
  lastCountTime = now;

  try {
    const predictions = await model.detect(video);
    const people = predictions.filter(p => p.class === 'person' && p.score > 0.7);
    
    renderPeople(canvas, people);
    status.textContent = `People detected: ${people.length}`;
  } catch (err) {
    if (err.message.includes('Tensor is disposed')) {
      console.warn('Tensor disposed - reinitializing');
      isCounting = false;
      init({ videoElement: video, canvasElement: canvas, statusElement: status });
      return;
    }
    console.error('Counting error:', err);
  }

  requestAnimationFrame(() => runPeopleCounter(video, canvas, status));
}

function renderPeople(canvas, people) {
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  people.forEach(p => {
    const [x, y, width, height] = p.bbox;
    
    // Draw box
    ctx.strokeStyle = '#00FF00';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, width, height);

    // Draw label
    ctx.fillStyle = '#00FF00';
    const label = `Person (${Math.round(p.score * 100)}%)`;
    ctx.font = '14px Arial';
    ctx.fillText(label, x, y > 10 ? y - 5 : y + 15);
  });
}

export function cleanup() {
  isCounting = false;
  if (model) model.dispose();
}
