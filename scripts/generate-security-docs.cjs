const fs = require('fs');
const path = require('path');

const rulesPath = path.join(__dirname, '../src-tauri/src/security/rules.rs');
const outputPath = path.join(__dirname, '../docs/security-rules.md');

try {
    const content = fs.readFileSync(rulesPath, 'utf8');

    const rules = [];
    
    // Split by PatternRule::new to separate blocks
    const blocks = content.split('PatternRule::new');
    blocks.shift(); // Remove pre-amble

    blocks.forEach(block => {
        const idMatch = block.match(/^\s*\(\s*"([^"]+)"/);
        if (!idMatch) return;
        const id = idMatch[1];

        const nameMatch = block.match(/^\s*\(\s*"[^"]+"\s*,\s*"([^"]+)"/);
        const name = nameMatch ? nameMatch[1] : 'Unknown';

        const severityMatch = block.match(/Severity::(\w+)/);
        const severity = severityMatch ? severityMatch[1] : 'Unknown';

        const categoryMatch = block.match(/Category::(\w+)/);
        const category = categoryMatch ? categoryMatch[1] : 'Unknown';

        const descMatch = block.match(/Category::\w+,\s*\d+,\s*"([^"]+)"/);
        const description = descMatch ? descMatch[1] : '';

        const remMatch = block.match(/Confidence::\w+,\s*(?:r#")?([^"#]+)(?:"#|")/);
        const remediation = remMatch ? remMatch[1] : '';

        const cweMatch = block.match(/Some\("([^"]+)"\)/);
        const cwe = cweMatch ? cweMatch[1] : '-';

        rules.push({
            id,
            name,
            severity,
            category,
            description,
            remediation,
            cwe
        });
    });

    console.log(`Found ${rules.length} rules.`);

    let md = '# 🛡️ Security Rules Reference\n\n';
    md += '**Generated on**: ' + new Date().toISOString().split('T')[0] + '\n';
    md += '**Total Rules**: ' + rules.length + '\n\n';
    md += 'This document lists all security rules used by the Skills Manager scanner.\n\n';
    md += '## 📊 Summary by Category\n\n';
    md += '| Category | Count |\n';
    md += '|----------|-------|\n';

    const summary = rules.reduce((acc, r) => {
        acc[r.category] = (acc[r.category] || 0) + 1;
        return acc;
    }, {});

    Object.entries(summary).forEach(([cat, count]) => {
        md += '| ' + cat + ' | ' + count + ' |\n';
    });

    md += '\n## 📋 Detailed Rules\n\n';

    const rulesByCategory = rules.reduce((acc, r) => {
        if (!acc[r.category]) acc[r.category] = [];
        acc[r.category].push(r);
        return acc;
    }, {});

    for (const [category, categoryRules] of Object.entries(rulesByCategory)) {
        md += '### ' + category + '\n\n';
        md += '| ID | Severity | Description | Remediation | CWE |\n';
        md += '|----|----------|-------------|-------------|-----|\n';
        categoryRules.forEach(r => {
            md += '| `​' + r.id + '​` | **' + r.severity + '** | ' + r.description + ' | ' + r.remediation + ' | ' + r.cwe + ' |\n';
        });
        md += '\n';
    }

    fs.writeFileSync(outputPath, md);
    console.log('Documentation generated at ' + outputPath);

} catch (err) {
    console.error("Error generating documentation:", err);
    process.exit(1);
}
