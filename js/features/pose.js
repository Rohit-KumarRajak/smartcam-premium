let detector;
let isEstimating = false;
let lastPoseTime = 0;
const poseInterval = 250;

export async function init({ videoElement, canvasElement, statusElement }) {
  statusElement.textContent = 'Loading pose estimation model...';

  try {
    await tf.ready();

    if (detector) await detector.dispose();

    detector = await poseDetection.createDetector(
      poseDetection.SupportedModels.MoveNet,
      { modelType: poseDetection.movenet.modelType.SINGLEPOSE_THUNDER }
    );

    statusElement.textContent = 'Pose estimation ready. Show your pose!';
    isEstimating = true;
    estimateLoop(videoElement, canvasElement, statusElement);
  } catch (err) {
    console.error('Pose model error:', err);
    statusElement.textContent = 'Failed to load pose estimation';
    statusElement.style.color = '#f00';
  }
}

async function estimateLoop(video, canvas, status) {
  if (!isEstimating || video.paused || video.ended) return;

  const now = Date.now();
  if (now - lastPoseTime < poseInterval) {
    requestAnimationFrame(() => estimateLoop(video, canvas, status));
    return;
  }
  lastPoseTime = now;

  try {
    const poses = await detector.estimatePoses(video);
    renderPose(canvas, poses, status);
  } catch (err) {
    console.error('Pose estimation failed:', err);
    status.textContent = 'Pose estimation error';
  }

  requestAnimationFrame(() => estimateLoop(video, canvas, status));
}

function renderPose(canvas, poses, status) {
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (!poses || poses.length === 0) {
    status.textContent = 'No pose detected';
    return;
  }

  const keypoints = poses[0].keypoints;
  const minScore = 0.4;

  // Draw keypoints
  keypoints.forEach(kp => {
    if (kp.score > minScore) {
      ctx.beginPath();
      ctx.arc(kp.x, kp.y, 5, 0, 2 * Math.PI);
      ctx.fillStyle = '#00FFAA';
      ctx.fill();
    }
  });

  // Draw skeleton
  const connections = poseDetection.util.getAdjacentPairs(poseDetection.SupportedModels.MoveNet);
  connections.forEach(([i, j]) => {
    const kp1 = keypoints[i];
    const kp2 = keypoints[j];
    if (kp1.score > minScore && kp2.score > minScore) {
      ctx.beginPath();
      ctx.moveTo(kp1.x, kp1.y);
      ctx.lineTo(kp2.x, kp2.y);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  });

  // Pose Description (basic heuristic)
  const leftWrist = keypoints.find(k => k.name === 'left_wrist');
  const rightWrist = keypoints.find(k => k.name === 'right_wrist');
  const leftHip = keypoints.find(k => k.name === 'left_hip');
  const rightHip = keypoints.find(k => k.name === 'right_hip');

  if (leftWrist?.score > minScore && rightWrist?.score > minScore && leftHip?.score > minScore && rightHip?.score > minScore) {
    const handAboveHips =
      leftWrist.y < leftHip.y && rightWrist.y < rightHip.y;
    if (handAboveHips) {
      status.textContent = 'Pose: Arms Raised';
      return;
    }
  }

  const nose = keypoints.find(k => k.name === 'nose');
  const leftKnee = keypoints.find(k => k.name === 'left_knee');
  const rightKnee = keypoints.find(k => k.name === 'right_knee');

  if (nose && leftKnee && rightKnee &&
      nose.score > minScore && leftKnee.score > minScore && rightKnee.score > minScore) {
    const sittingPosture = Math.abs(nose.y - leftKnee.y) < 100;
    if (sittingPosture) {
      status.textContent = 'Pose: Sitting';
      return;
    }
  }

  status.textContent = 'Pose: Standing';
}

export function cleanup() {
  isEstimating = false;
  if (detector) detector.dispose();
}
