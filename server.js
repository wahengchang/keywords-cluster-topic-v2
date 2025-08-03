const express = require('express');

const app = express();
const PORT = process.env.PORT || 3000;

const path = require('path');
const Database = require('better-sqlite3');
const DB_PATH = path.join(__dirname, 'data', 'keywords-cluster.db');
const db = new Database(DB_PATH);

// GET /api/dashboard - List all projects and stats
app.get('/api/dashboard', (req, res) => {
  try {
    const projects = db.prepare(`
      SELECT
        p.id,
        p.name,
        p.last_processed,
        COUNT(DISTINCT k.keyword) AS keyword_count,
        COUNT(DISTINCT k.cluster_id) AS total_clusters,
        CASE WHEN gc.faq_count > 0 THEN 1 ELSE 0 END AS has_faq_titles
      FROM projects p
      LEFT JOIN keywords k ON k.project_id = p.id
      LEFT JOIN (
        SELECT project_id, COUNT(*) as faq_count 
        FROM generated_content 
        WHERE content_type = 'title' 
        GROUP BY project_id
      ) gc ON p.id = gc.project_id
      GROUP BY p.id, p.name, p.last_processed, gc.faq_count
    `).all();

    const stats = db.prepare(`
      SELECT
        COUNT(DISTINCT p.id) AS total_projects,
        COUNT(DISTINCT k.keyword) AS total_keywords,
        COUNT(DISTINCT k.cluster_id) AS total_clusters
      FROM projects p
      LEFT JOIN keywords k ON k.project_id = p.id
    `).get();

    res.json({ projects, stats });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/keywords/:projectId - List all keywords for a project with cluster information
app.get('/api/keywords/:projectId', (req, res) => {
  try {
    const { projectId } = req.params;
    console.log('Loading keywords for project:', projectId);
    
    // Get keywords with cluster information
    let keywords = [];
    let clusters = [];
    
    try {
      // Get processed keywords with cluster info
      keywords = db.prepare(`
        SELECT 
          k.*,
          kc.cluster_theme,
          kc.cluster_description,
          kc.total_search_volume as cluster_total_volume,
          kc.keyword_count as cluster_keyword_count,
          kc.coherence_score as cluster_coherence_score,
          kc.avg_competition as cluster_avg_competition,
          kc.avg_cpc as cluster_avg_cpc
        FROM keywords k
        LEFT JOIN keyword_clusters kc ON k.cluster_id = kc.id AND k.project_id = kc.project_id
        WHERE k.project_id = ?
        ORDER BY k.priority_score DESC, k.search_volume DESC
      `).all(projectId);
      
      console.log('Keywords from "keywords" table with clusters:', keywords.length);
      
      // Get cluster summary information
      clusters = db.prepare(`
        SELECT 
          kc.*,
          COUNT(k.id) as actual_keyword_count,
          SUM(k.search_volume) as actual_total_volume,
          AVG(k.competition) as actual_avg_competition,
          AVG(k.cpc) as actual_avg_cpc,
          AVG(k.priority_score) as avg_priority_score
        FROM keyword_clusters kc
        LEFT JOIN keywords k ON kc.id = k.cluster_id AND kc.project_id = k.project_id
        WHERE kc.project_id = ?
        GROUP BY kc.id
        ORDER BY actual_total_volume DESC, actual_keyword_count DESC
      `).all(projectId);
      
      console.log('Clusters found:', clusters.length);
      
    } catch (keywordsErr) {
      console.log('Error accessing keywords table, trying raw_keywords...', keywordsErr.message);
      try {
        // Fallback to raw keywords if processed keywords aren't available
        keywords = db.prepare(`
          SELECT 
            *,
            NULL as cluster_id,
            NULL as cluster_name,
            NULL as cluster_theme,
            NULL as cluster_description,
            NULL as priority_score,
            NULL as priority_tier
          FROM raw_keywords 
          WHERE project_id = ?
          ORDER BY search_volume DESC
        `).all(projectId);
        console.log('Keywords from "raw_keywords" table:', keywords.length);
      } catch (rawErr) {
        console.log('Neither "keywords" nor "raw_keywords" table accessible:', rawErr.message);
      }
    }
    
    // If still no keywords, provide debug information
    if (keywords.length === 0) {
      try {
        const allProjects = db.prepare(`SELECT id, name, project_type FROM projects LIMIT 5`).all();
        console.log('Available projects:', allProjects);
        
        const tables = db.prepare(`
          SELECT name FROM sqlite_master 
          WHERE type='table' AND name LIKE '%keyword%'
        `).all();
        console.log('Available keyword tables:', tables.map(t => t.name));
        
      } catch (e) {
        console.log('Error checking database structure:', e.message);
      }
    }
    
    res.json({ 
      keywords, 
      clusters,
      total_keywords: keywords.length,
      total_clusters: clusters.length
    });
  } catch (err) {
    console.error('Error in /api/keywords:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/clusters/:projectId - Get cluster information for a project
app.get('/api/clusters/:projectId', (req, res) => {
  try {
    const { projectId } = req.params;
    console.log('Loading clusters for project:', projectId);
    
    const clusters = db.prepare(`
      SELECT 
        kc.*,
        COUNT(k.id) as keyword_count,
        SUM(k.search_volume) as total_search_volume,
        AVG(k.competition) as avg_competition,
        AVG(k.cpc) as avg_cpc,
        AVG(k.priority_score) as avg_priority_score,
        GROUP_CONCAT(k.keyword, ', ') as sample_keywords
      FROM keyword_clusters kc
      LEFT JOIN keywords k ON kc.id = k.cluster_id AND kc.project_id = k.project_id
      WHERE kc.project_id = ?
      GROUP BY kc.id
      ORDER BY total_search_volume DESC, keyword_count DESC
    `).all(projectId);
    
    res.json({ clusters, total_clusters: clusters.length });
  } catch (err) {
    console.error('Error in /api/clusters:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/generated-content/:projectId - Get all generated FAQ titles for a project
app.get('/api/generated-content/:projectId', (req, res) => {
  try {
    const { projectId } = req.params;
    console.log('Loading generated content for project:', projectId);
    
    const content = db.prepare(`
      SELECT 
        gc.*,
        kc.cluster_name,
        kc.cluster_description,
        k.keyword as related_keyword,
        k.search_volume,
        k.competition
      FROM generated_content gc
      LEFT JOIN keyword_clusters kc ON gc.cluster_id = kc.id
      LEFT JOIN keywords k ON gc.primary_keyword_id = k.id
      WHERE gc.project_id = ? AND gc.content_type = 'title'
      ORDER BY gc.created_at DESC, kc.cluster_name
    `).all(projectId);
    
    // Group by cluster for better organization
    const byCluster = {};
    content.forEach(item => {
      const clusterName = item.cluster_name || 'Uncategorized';
      if (!byCluster[clusterName]) {
        byCluster[clusterName] = {
          cluster_id: item.cluster_id,
          cluster_name: clusterName,
          cluster_description: item.cluster_description,
          titles: []
        };
      }
      byCluster[clusterName].titles.push({
        id: item.id,
        content: item.content,
        word_count: item.word_count,
        character_count: item.character_count,
        quality_score: item.quality_score,
        is_approved: item.is_approved,
        is_used: item.is_used,
        created_at: item.created_at,
        related_keyword: item.related_keyword,
        search_volume: item.search_volume,
        competition: item.competition
      });
    });
    
    res.json({ 
      content: content,
      by_cluster: byCluster,
      total_titles: content.length,
      clusters_with_content: Object.keys(byCluster).length
    });
  } catch (err) {
    console.error('Error in /api/generated-content:', err);
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/generated-content/mark-used - Mark titles as used/unused
app.put('/api/generated-content/mark-used', express.json(), (req, res) => {
  try {
    const { projectId, titleIds, isUsed = true } = req.body;
    
    if (!projectId || !Array.isArray(titleIds) || titleIds.length === 0) {
      return res.status(400).json({ error: 'Project ID and title IDs array are required' });
    }
    
    console.log('Marking titles as used:', { projectId, titleIds, isUsed });
    
    // Create placeholders for the IN clause
    const placeholders = titleIds.map(() => '?').join(',');
    
    // Update the titles
    const result = db.prepare(`
      UPDATE generated_content 
      SET is_used = ?
      WHERE project_id = ? AND id IN (${placeholders}) AND content_type = 'title'
    `).run(isUsed ? 1 : 0, projectId, ...titleIds);
    
    res.json({ 
      success: true, 
      updated_count: result.changes,
      is_used: isUsed
    });
  } catch (err) {
    console.error('Error in /api/generated-content/mark-used:', err);
    res.status(500).json({ error: err.message });
  }
});

// Debug endpoint to inspect database structure
app.get('/api/debug/schema', (req, res) => {
  try {
    // Get all tables
    const tables = db.prepare(`
      SELECT name FROM sqlite_master 
      WHERE type='table' 
      ORDER BY name
    `).all();
    
    const schema = {};
    
    // Get schema for each table
    tables.forEach(table => {
      try {
        const columns = db.prepare(`PRAGMA table_info(${table.name})`).all();
        const rowCount = db.prepare(`SELECT COUNT(*) as count FROM ${table.name}`).get();
        schema[table.name] = {
          columns: columns.map(col => ({
            name: col.name,
            type: col.type,
            nullable: !col.notnull,
            primary_key: col.pk === 1
          })),
          row_count: rowCount.count
        };
      } catch (e) {
        schema[table.name] = { error: e.message };
      }
    });
    
    res.json({ tables: tables.map(t => t.name), schema });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Serve static files
app.use(express.static('public'));

// Route for titles page with query parameter
app.get('/titles', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'titles.html'));
});

// Route for project titles page (legacy support)
app.get('/project/:projectId/titles', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'titles.html'));
});

// Route for project keywords page
app.get('/project/:projectId', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'project.html'));
});

// Route for project keywords page with query params (legacy support)
app.get('/project', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'project.html'));
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
