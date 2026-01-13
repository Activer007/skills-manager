// Skill document parser for SKILL.md files
//
// This module handles parsing of SKILL.md files, extracting YAML frontmatter
// and markdown content for analysis.
// Reference: ~/workspace/ordinary-claude-skills/tools/analyzer/skill_document.py

use crate::analyzer::{AnalyzerError, SkillMetadata};
use crate::analyzer::utils::*;
use std::fs;
use std::path::Path;

/// Parsed skill document containing metadata and content
#[derive(Debug, Clone)]
pub struct SkillDocument {
    /// Skill metadata from YAML frontmatter
    pub metadata: SkillMetadata,

    /// Raw markdown content (without frontmatter)
    pub content: String,

    /// Extracted code blocks
    pub code_blocks: Vec<CodeBlock>,

    /// Extracted sections
    pub sections: Vec<Section>,

    /// File path
    pub file_path: String,
}

impl SkillDocument {
    /// Parse a SKILL.md file from a given path
    pub fn from_file<P: AsRef<Path>>(path: P) -> Result<Self, AnalyzerError> {
        let file_path = path.as_ref().to_string_lossy().to_string();

        // Read file content
        let raw_content = fs::read_to_string(path.as_ref()).map_err(|e| {
            AnalyzerError::FileReadError(format!(
                "Failed to read file '{}': {}",
                file_path,
                e
            ))
        })?;

        Self::from_string(&raw_content, file_path)
    }

    /// Parse SKILL.md content from a string
    pub fn from_string(raw_content: &str, file_path: String) -> Result<Self, AnalyzerError> {
        // Extract frontmatter and content
        let (metadata, content) = Self::parse_frontmatter(raw_content)?;

        // Extract code blocks and sections
        let code_blocks = extract_code_blocks(&content);
        let sections = extract_sections(&content);

        Ok(SkillDocument {
            metadata,
            content,
            code_blocks,
            sections,
            file_path,
        })
    }

    /// Parse YAML frontmatter from markdown content
    fn parse_frontmatter(raw_content: &str) -> Result<(SkillMetadata, String), AnalyzerError> {
        let lines: Vec<&str> = raw_content.lines().collect();

        // Check if content starts with frontmatter delimiter
        if lines.is_empty() || !lines[0].trim().starts_with("---") {
            // No frontmatter, return default metadata and full content
            return Ok((SkillMetadata::default(), raw_content.to_string()));
        }

        // Find the closing frontmatter delimiter
        let mut frontmatter_end = None;
        for (i, line) in lines.iter().enumerate().skip(1) {
            if line.trim().starts_with("---") || line.trim().starts_with("...") {
                frontmatter_end = Some(i);
                break;
            }
        }

        if let Some(end_idx) = frontmatter_end {
            // Extract frontmatter YAML
            let frontmatter_lines = &lines[1..end_idx];
            let frontmatter_yaml = frontmatter_lines.join("\n");

            // Parse YAML
            let metadata: SkillMetadata = serde_yaml::from_str(&frontmatter_yaml).map_err(|e| {
                AnalyzerError::YamlParseError(format!("Failed to parse YAML frontmatter: {}", e))
            })?;

            // Extract content after frontmatter
            let content_lines = &lines[(end_idx + 1)..];
            let content = content_lines.join("\n");

            Ok((metadata, content))
        } else {
            // Frontmatter not properly closed
            Err(AnalyzerError::YamlParseError(
                "Frontmatter delimiter '---' found but no closing delimiter".to_string(),
            ))
        }
    }

    /// Get the number of code blocks
    pub fn code_blocks_count(&self) -> usize {
        self.code_blocks.len()
    }

    /// Get the number of sections
    pub fn sections_count(&self) -> usize {
        self.sections.len()
    }

    /// Get language diversity in code blocks
    pub fn language_diversity(&self) -> usize {
        count_language_diversity(&self.code_blocks)
    }

    /// Check if document has a specific section (case-insensitive)
    pub fn has_section(&self, section_name: &str) -> bool {
        has_section(&self.content, section_name)
    }

    /// Extract use cases from content
    pub fn extract_use_cases(&self) -> Vec<String> {
        extract_use_cases(&self.content)
    }

    /// Check if content has step-by-step instructions
    pub fn has_step_by_step(&self) -> bool {
        has_step_by_step(&self.content)
    }

    /// Calculate average line length
    pub fn avg_line_length(&self) -> f64 {
        calculate_avg_line_length(&self.content)
    }

    /// Count non-empty lines
    pub fn non_empty_lines(&self) -> usize {
        count_non_empty_lines(&self.content)
    }

    /// Check if content has input/output examples
    pub fn has_io_examples(&self) -> bool {
        has_io_examples(&self.content)
    }

    /// Check if content contains specific keywords
    pub fn check_keywords(&self, keywords: &[String]) -> bool {
        check_keywords(&self.content, keywords)
    }

    /// Get code blocks in a specific language
    pub fn get_code_blocks_by_language(&self, language: &str) -> Vec<&CodeBlock> {
        let lang_lower = language.to_lowercase();
        self.code_blocks
            .iter()
            .filter(|block| {
                block
                    .language
                    .as_ref()
                    .map(|l| l.to_lowercase() == lang_lower)
                    .unwrap_or(false)
            })
            .collect()
    }

    /// Get all unique languages used in code blocks
    pub fn get_languages(&self) -> Vec<String> {
        let mut languages: Vec<String> = self
            .code_blocks
            .iter()
            .filter_map(|block| block.language.clone())
            .collect();
        languages.sort();
        languages.dedup();
        languages
    }

    /// Get sections by level (1-6)
    pub fn get_sections_by_level(&self, level: usize) -> Vec<&Section> {
        self.sections
            .iter()
            .filter(|section| section.level == level)
            .collect()
    }

    /// Get total lines of code across all code blocks
    pub fn total_code_lines(&self) -> usize {
        self.code_blocks.iter().map(|block| block.line_count).sum()
    }

    /// Check if document is well-structured
    pub fn is_well_structured(&self) -> bool {
        // A well-structured document should have:
        // 1. At least 4 sections
        // 2. At least 1 code block
        // 3. Reasonable average line length (20-120 chars)
        let avg_len = self.avg_line_length();

        self.sections_count() >= 4
            && self.code_blocks_count() >= 1
            && (20.0..=120.0).contains(&avg_len)
    }

    /// Get skill name from metadata or filename
    pub fn get_skill_name(&self) -> String {
        if !self.metadata.name.is_empty() {
            self.metadata.name.clone()
        } else {
            // Extract from filename
            Path::new(&self.file_path)
                .file_stem()
                .and_then(|s| s.to_str())
                .unwrap_or("unknown")
                .to_string()
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_frontmatter() {
        let content = r#"---
name: test-skill
description: A test skill
author: Test Author
version: 1.0.0
---

# Test Skill

This is a test skill.
"#;

        let (metadata, markdown) = SkillDocument::parse_frontmatter(content).unwrap();
        assert_eq!(metadata.name, "test-skill");
        assert_eq!(metadata.author, Some("Test Author".to_string()));
        assert!(markdown.contains("# Test Skill"));
    }

    #[test]
    fn test_parse_no_frontmatter() {
        let content = r#"# Test Skill

This is a test skill without frontmatter.
"#;

        let (metadata, markdown) = SkillDocument::parse_frontmatter(content).unwrap();
        assert_eq!(metadata.name, ""); // default
        assert!(markdown.contains("# Test Skill"));
    }

    #[test]
    fn test_skill_document_from_string() {
        let content = r#"---
name: example-skill
version: 1.0.0
---

# Example Skill

## When to Use

- Use case 1
- Use case 2

## Example

```rust
fn main() {
    println!("Hello");
}
```

```python
print("World")
```
"#;

        let doc = SkillDocument::from_string(content, "test.md".to_string()).unwrap();
        assert_eq!(doc.metadata.name, "example-skill");
        assert_eq!(doc.code_blocks_count(), 2);
        assert_eq!(doc.sections_count(), 3);
        assert_eq!(doc.language_diversity(), 2);
        assert!(doc.has_section("when to use"));
    }

    #[test]
    fn test_extract_use_cases() {
        let content = r#"---
name: test
---

## When to Use

- Case 1
- Case 2
- Case 3
"#;

        let doc = SkillDocument::from_string(content, "test.md".to_string()).unwrap();
        let use_cases = doc.extract_use_cases();
        assert_eq!(use_cases.len(), 3);
    }

    #[test]
    fn test_get_languages() {
        let content = r#"---
name: test
---

```rust
fn test() {}
```

```python
def test(): pass
```

```rust
fn another() {}
```
"#;

        let doc = SkillDocument::from_string(content, "test.md".to_string()).unwrap();
        let languages = doc.get_languages();
        assert_eq!(languages.len(), 2);
        assert!(languages.contains(&"rust".to_string()));
        assert!(languages.contains(&"python".to_string()));
    }

    #[test]
    fn test_is_well_structured() {
        let good_content = r#"---
name: test
---

# Title

## Section 1

## Section 2

## Section 3

## Section 4

```rust
fn main() {}
```
"#;

        let doc = SkillDocument::from_string(good_content, "test.md".to_string()).unwrap();
        assert!(doc.is_well_structured());
    }
}
