const features = [
  { id: "object", name: "Object Detection", icon: "🔍" },
  { id: "pose", name: "Pose Estimation", icon: "🧘" },
  { id: "multiperson", name: "People Counter", icon: "👥" }
];

let app;

document.addEventListener('DOMContentLoaded', () => {
  app = new SmartCamApp();
  renderFeatureGrid();
});

function renderFeatureGrid() {
  const grid = document.getElementById('feature-grid');
  grid.innerHTML = '';
  
  features.forEach(feature => {
    const card = document.createElement('div');
    card.className = 'feature-card';
    card.innerHTML = `
      <div class="feature-icon">${feature.icon}</div>
      <div class="feature-name">${feature.name}</div>
    `;
    
    card.addEventListener('click', () => {
      app.loadFeature(feature.id).catch(err => {
        console.error('Feature load error:', err);
        app.showError(`Failed to load ${feature.name}`);
      });
    });
    
    grid.appendChild(card);
  });
}