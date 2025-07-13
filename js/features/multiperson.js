let model;
let peopleCount = 0;
let isCounting = false;

export async function init({ videoElement, canvasElement, statusElement }) {
  statusElement.textContent = 'Loading people detection model...';
  
  try {
    // Dispose previous model if exists
    if (model) {
      await model.dispose();
    }
    
    model = await cocoSsd.load();
    statusElement.textContent = 'Model loaded. Counting people...';
    isCounting = true;
    countPeople(videoElement, canvasElement, statusElement);
  } catch (error) {
    statusElement.textContent = 'Failed to load people counter';
    statusElement.style.color = '#f00';
    console.error(error);
  }
}

async function countPeople(video, canvas, status) {
  if (!isCounting || video.paused || video.ended) {
    return;
  }

  try {
    const predictions = await model.detect(video);
    const people = predictions.filter(p => p.class === 'person' && p.score > 0.7);
    
    if (people.length !== peopleCount) {
      peopleCount = people.length;
      status.textContent = `People detected: ${peopleCount}`;
    }
    
    renderPeople(canvas, people);
  } catch (error) {
    if (error.message.includes('Tensor is disposed')) {
      console.warn('Tensor disposed - restarting people counter');
      isCounting = false;
      init({ videoElement: video, canvasElement: canvas, statusElement: status });
      return;
    }
    console.error('People counting error:', error);
  }

  requestAnimationFrame(() => countPeople(video, canvas, status));
}

function renderPeople(canvas, people) {
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  people.forEach(person => {
    const [x, y, width, height] = person.bbox;
    
    // Draw bounding box
    ctx.strokeStyle = '#00FF00';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, width, height);
    
    // Draw label
    ctx.fillStyle = '#00FF00';
    ctx.fillText(`Person (${Math.round(person.score * 100)}%)`, x, y > 10 ? y - 5 : y + 15);
  });
}

export function cleanup() {
  isCounting = false;
  peopleCount = 0;
  if (model) {
    model.dispose();
  }
}