let detector;
let lastPoseTime = 0;
const poseInterval = 200; // ms
let isEstimating = false;

export async function init({ videoElement, canvasElement, statusElement }) {
  statusElement.textContent = 'Loading pose estimation model...';
  
  try {
    await tf.ready();
    
    // Dispose previous detector if exists
    if (detector) {
      await detector.dispose();
    }
    
    detector = await poseDetection.createDetector(
      poseDetection.SupportedModels.MoveNet,
      { modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING }
    );
    
    statusElement.textContent = 'Pose estimation ready. Show your pose!';
    isEstimating = true;
    estimatePoses(videoElement, canvasElement, statusElement);
  } catch (error) {
    statusElement.textContent = 'Failed to load pose estimation';
    statusElement.style.color = '#f00';
    console.error(error);
  }
}

async function estimatePoses(video, canvas, status) {
  if (!isEstimating || video.paused || video.ended) {
    return;
  }

  const now = Date.now();
  if (now - lastPoseTime < poseInterval) {
    requestAnimationFrame(() => estimatePoses(video, canvas, status));
    return;
  }
  lastPoseTime = now;

  try {
    const poses = await detector.estimatePoses(video);
    renderPoses(canvas, poses, status);
  } catch (error) {
    if (error.message.includes('backend')) {
      console.warn('Backend error - reinitializing pose detection');
      isEstimating = false;
      init({ videoElement: video, canvasElement: canvas, statusElement: status });
      return;
    }
    console.error('Pose estimation error:', error);
  }

  requestAnimationFrame(() => estimatePoses(video, canvas, status));
}

function renderPoses(canvas, poses, status) {
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  if (poses.length > 0) {
    const pose = poses[0];
    const keypoints = pose.keypoints;
    
    // Draw keypoints
    keypoints.forEach(kp => {
      if (kp.score > 0.3) {
        ctx.beginPath();
        ctx.arc(kp.x, kp.y, 5, 0, 2 * Math.PI);
        ctx.fillStyle = 'aqua';
        ctx.fill();
      }
    });
    
    // Draw skeleton
    const connections = poseDetection.util.getAdjacentPairs(
      poseDetection.SupportedModels.MoveNet
    );
    
    connections.forEach(([i, j]) => {
      const kp1 = keypoints[i];
      const kp2 = keypoints[j];
      
      if (kp1.score > 0.3 && kp2.score > 0.3) {
        ctx.beginPath();
        ctx.moveTo(kp1.x, kp1.y);
        ctx.lineTo(kp2.x, kp2.y);
        ctx.lineWidth = 2;
        ctx.strokeStyle = 'white';
        ctx.stroke();
      }
    });
    
    status.textContent = 'Pose detected';
  } else {
    status.textContent = 'No pose detected';
  }
}

export function cleanup() {
  isEstimating = false;
  if (detector) {
    detector.dispose();
  }
}