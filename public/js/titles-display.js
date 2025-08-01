// Generated Titles Display Management
class TitlesDisplay {
  constructor() {
    this.currentProject = null;
    this.titlesData = null;
    this.initializeEventListeners();
  }

  initializeEventListeners() {
    // Back to dashboard button
    document.getElementById('back-to-dashboard')?.addEventListener('click', () => {
      this.hideTitlesView();
    });
  }

  async showTitlesForProject(project) {
    this.currentProject = project;
    
    try {
      // Show loading
      document.getElementById('project-title-info').textContent = `Loading titles for ${project.name}...`;
      
      // Fetch generated content
      this.titlesData = await ApiClient.getGeneratedContent(project.id);
      
      // Update UI
      this.showTitlesView();
      this.renderTitles();
      
    } catch (error) {
      console.error('Error loading titles:', error);
      document.getElementById('project-title-info').textContent = 'Error loading titles';
    }
  }

  showTitlesView() {
    document.getElementById('dashboard-container').classList.add('hidden');
    document.getElementById('titles-container').classList.remove('hidden');
  }

  hideTitlesView() {
    document.getElementById('dashboard-container').classList.remove('hidden');
    document.getElementById('titles-container').classList.add('hidden');
  }

  renderTitles() {
    if (!this.titlesData) return;

    const container = document.getElementById('titles-content');
    const projectInfo = document.getElementById('project-title-info');

    // Update project info
    projectInfo.textContent = `${this.currentProject.name} - ${this.titlesData.total_titles} FAQ titles across ${this.titlesData.clusters_with_content} clusters`;

    // Clear container
    container.innerHTML = '';

    if (this.titlesData.total_titles === 0) {
      container.innerHTML = `
        <div class="text-center py-8">
          <p class="text-lg text-secondary">No FAQ titles generated yet for this project.</p>
          <p class="text-sm text-tertiary mt-2">Use the CLI command "Generate More Content" to create FAQ titles.</p>
        </div>
      `;
      return;
    }

    // Group by clusters
    Object.entries(this.titlesData.by_cluster).forEach(([clusterName, clusterData]) => {
      const clusterElement = this.createClusterSection(clusterName, clusterData);
      container.appendChild(clusterElement);
    });
  }

  createClusterSection(clusterName, clusterData) {
    const section = document.createElement('div');
    section.className = 'bg-secondary rounded-lg p-4';

    section.innerHTML = `
      <div class="mb-3">
        <h3 class="text-lg font-semibold text-primary">${clusterName}</h3>
        ${clusterData.cluster_description ? `<p class="text-sm text-secondary mt-1">${clusterData.cluster_description}</p>` : ''}
        <p class="text-xs text-tertiary mt-1">${clusterData.titles.length} titles generated</p>
      </div>
      
      <div class="space-y-2">
        ${clusterData.titles.map(title => this.createTitleItem(title)).join('')}
      </div>
    `;

    return section;
  }

  createTitleItem(title) {
    const approvedBadge = title.is_approved ? 
      '<span class="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">Approved</span>' : 
      '<span class="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded">Pending</span>';

    const qualityScore = title.quality_score ? 
      `<span class="text-xs text-tertiary">Quality: ${(title.quality_score * 100).toFixed(0)}%</span>` : '';

    return `
      <div class="bg-primary p-3 rounded border-l-4 border-blue-500">
        <div class="flex justify-between items-start">
          <div class="flex-1">
            <h4 class="font-medium text-primary">${title.content}</h4>
            <div class="flex items-center space-x-4 mt-2 text-xs text-secondary">
              <span>Words: ${title.word_count || 0}</span>
              <span>Characters: ${title.character_count || 0}</span>
              ${qualityScore}
              <span>Created: ${new Date(title.created_at).toLocaleDateString()}</span>
            </div>
            ${title.related_keyword ? `
              <div class="mt-2 text-xs text-tertiary">
                Related keyword: "${title.related_keyword}" (Vol: ${title.search_volume || 'N/A'}, Comp: ${title.competition || 'N/A'})
              </div>
            ` : ''}
          </div>
          <div class="ml-4">
            ${approvedBadge}
          </div>
        </div>
      </div>
    `;
  }
}

// Initialize titles display
const titlesDisplay = new TitlesDisplay();