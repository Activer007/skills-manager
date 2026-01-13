// Utility functions for text analysis and processing
//
// This module provides core text analysis functions used across all scorers.
// Reference: ~/workspace/ordinary-claude-skills/tools/analyzer/utils.py

use pulldown_cmark::{Event, Parser, Tag, TagEnd, CodeBlockKind};
use regex::Regex;

/// Code block information
#[derive(Debug, Clone)]
pub struct CodeBlock {
    /// Language of the code block (if specified)
    pub language: Option<String>,

    /// Code content
    pub content: String,

    /// Number of lines
    pub line_count: usize,
}

/// Section information
#[derive(Debug, Clone)]
pub struct Section {
    /// Section title
    pub title: String,

    /// Section level (1-6 for h1-h6)
    pub level: usize,

    /// Section content
    pub content: String,
}

/// Count code blocks in markdown content
pub fn count_code_blocks(content: &str) -> usize {
    let parser = Parser::new(content);
    let mut count = 0;

    let mut in_code_block = false;
    for event in parser {
        match event {
            Event::Start(Tag::CodeBlock(_)) => {
                in_code_block = true;
                count += 1;
            }
            Event::End(TagEnd::CodeBlock) => {
                in_code_block = false;
            }
            _ => {}
        }
    }

    count
}

/// Extract all code blocks with their languages and content
pub fn extract_code_blocks(content: &str) -> Vec<CodeBlock> {
    let parser = Parser::new(content);
    let mut code_blocks = Vec::new();

    let mut current_language: Option<String> = None;
    let mut current_code = String::new();
    let mut in_code_block = false;

    for event in parser {
        match event {
            Event::Start(Tag::CodeBlock(kind)) => {
                in_code_block = true;
                current_language = match kind {
                    CodeBlockKind::Fenced(lang) => {
                        let lang_str = lang.to_string();
                        if lang_str.is_empty() {
                            None
                        } else {
                            Some(lang_str)
                        }
                    }
                    CodeBlockKind::Indented => None,
                };
                current_code.clear();
            }
            Event::End(TagEnd::CodeBlock) => {
                if in_code_block {
                    let line_count = current_code.lines().count();
                    code_blocks.push(CodeBlock {
                        language: current_language.clone(),
                        content: current_code.clone(),
                        line_count,
                    });
                    in_code_block = false;
                }
            }
            Event::Text(text) if in_code_block => {
                current_code.push_str(&text);
            }
            _ => {}
        }
    }

    code_blocks
}

/// Count language diversity in code blocks
pub fn count_language_diversity(code_blocks: &[CodeBlock]) -> usize {
    let mut languages = std::collections::HashSet::new();
    for block in code_blocks {
        if let Some(ref lang) = block.language {
            languages.insert(lang.to_lowercase());
        }
    }
    languages.len()
}

/// Count markdown sections (headers)
pub fn count_sections(content: &str) -> usize {
    let parser = Parser::new(content);
    let mut count = 0;

    for event in parser {
        if let Event::Start(Tag::Heading { .. }) = event {
            count += 1;
        }
    }

    count
}

/// Extract all sections with their titles and content
pub fn extract_sections(content: &str) -> Vec<Section> {
    let parser = Parser::new(content);
    let mut sections = Vec::new();

    let mut current_level: Option<usize> = None;
    let mut current_title = String::new();
    let mut in_heading = false;

    for event in parser {
        match event {
            Event::Start(Tag::Heading { level, .. }) => {
                in_heading = true;
                current_level = Some(level as usize);
                current_title.clear();
            }
            Event::End(TagEnd::Heading(_)) => {
                if let Some(level) = current_level {
                    sections.push(Section {
                        title: current_title.clone(),
                        level,
                        content: String::new(), // Content extraction would require more complex state management
                    });
                }
                in_heading = false;
            }
            Event::Text(text) if in_heading => {
                current_title.push_str(&text);
            }
            _ => {}
        }
    }

    sections
}

/// Check if content has a specific section (case-insensitive)
pub fn has_section(content: &str, section_name: &str) -> bool {
    let sections = extract_sections(content);
    let section_name_lower = section_name.to_lowercase();

    sections.iter().any(|s| s.title.to_lowercase().contains(&section_name_lower))
}

/// Check if content contains any of the given keywords (case-insensitive)
pub fn check_keywords(content: &str, keywords: &[String]) -> bool {
    let content_lower = content.to_lowercase();
    keywords.iter().any(|kw| content_lower.contains(&kw.to_lowercase()))
}

/// Extract use cases from content
/// Use cases are typically in lists under "When to Use" or similar sections
pub fn extract_use_cases(content: &str) -> Vec<String> {
    let mut use_cases = Vec::new();
    let lines: Vec<&str> = content.lines().collect();

    let mut in_use_case_section = false;

    for line in lines {
        let line_lower = line.to_lowercase();

        // Detect "When to Use" section
        if line_lower.contains("when to use")
            || line_lower.contains("use when")
            || line_lower.contains("usage scenario")
            || line_lower.contains("适用场景")
        {
            in_use_case_section = true;
            continue;
        }

        // Exit section if we hit another header
        if line.starts_with('#') && in_use_case_section {
            in_use_case_section = false;
        }

        // Extract list items
        if in_use_case_section {
            let trimmed = line.trim();
            if trimmed.starts_with('-') || trimmed.starts_with('*') || trimmed.starts_with('+') {
                // Remove list marker
                let use_case = trimmed
                    .trim_start_matches('-')
                    .trim_start_matches('*')
                    .trim_start_matches('+')
                    .trim()
                    .to_string();

                if !use_case.is_empty() {
                    use_cases.push(use_case);
                }
            }
        }
    }

    use_cases
}

/// Check if content has step-by-step instructions
pub fn has_step_by_step(content: &str) -> bool {
    use std::sync::OnceLock;
    static STEP_RE: OnceLock<Regex> = OnceLock::new();

    let content_lower = content.to_lowercase();

    // Check for numbered lists or step indicators
    let has_numbered_list = STEP_RE
        .get_or_init(|| Regex::new(r"(?m)^\s*\d+\.\s+").unwrap())
        .is_match(content);

    let has_step_keywords = content_lower.contains("step")
        || content_lower.contains("步骤")
        || content_lower.contains("first,")
        || content_lower.contains("second,")
        || content_lower.contains("then,");

    has_numbered_list || has_step_keywords
}

/// Calculate average line length (excluding empty lines)
pub fn calculate_avg_line_length(content: &str) -> f64 {
    let lines: Vec<&str> = content
        .lines()
        .filter(|line| !line.trim().is_empty())
        .collect();

    if lines.is_empty() {
        return 0.0;
    }

    let total_length: usize = lines.iter().map(|line| line.len()).sum();
    total_length as f64 / lines.len() as f64
}

/// Count non-empty lines
pub fn count_non_empty_lines(content: &str) -> usize {
    content.lines().filter(|line| !line.trim().is_empty()).count()
}

/// Extract text content from markdown (strip formatting)
pub fn strip_markdown(content: &str) -> String {
    let parser = Parser::new(content);
    let mut plain_text = String::new();

    for event in parser {
        match event {
            Event::Text(text) | Event::Code(text) => {
                plain_text.push_str(&text);
                plain_text.push(' ');
            }
            Event::SoftBreak | Event::HardBreak => {
                plain_text.push('\n');
            }
            _ => {}
        }
    }

    plain_text
}

/// Check if content has input/output examples
pub fn has_io_examples(content: &str) -> bool {
    let content_lower = content.to_lowercase();

    let has_input = content_lower.contains("input:")
        || content_lower.contains("输入:")
        || content_lower.contains("example input");

    let has_output = content_lower.contains("output:")
        || content_lower.contains("输出:")
        || content_lower.contains("example output");

    has_input && has_output
}

/// Calculate readability score based on various factors
pub fn calculate_readability_score(content: &str, avg_line_length: f64, sections_count: usize) -> f64 {
    let mut score = 0.0;

    // Ideal line length (40-100 characters)
    if (40.0..=100.0).contains(&avg_line_length) {
        score += 3.0;
    } else if (30.0..=120.0).contains(&avg_line_length) {
        score += 1.5;
    }

    // Good section organization (6+ sections)
    if sections_count >= 6 {
        score += 2.0;
    } else if sections_count >= 4 {
        score += 1.0;
    }

    score
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_count_code_blocks() {
        let content = r#"
# Example

```rust
fn main() {}
```

Some text

```python
print("hello")
```
"#;
        assert_eq!(count_code_blocks(content), 2);
    }

    #[test]
    fn test_extract_code_blocks() {
        let content = r#"
```rust
fn main() {
    println!("Hello");
}
```

```python
print("world")
```
"#;
        let blocks = extract_code_blocks(content);
        assert_eq!(blocks.len(), 2);
        assert_eq!(blocks[0].language.as_deref(), Some("rust"));
        assert_eq!(blocks[1].language.as_deref(), Some("python"));
    }

    #[test]
    fn test_count_sections() {
        let content = r#"
# Main Title

## Section 1

### Subsection

## Section 2
"#;
        assert_eq!(count_sections(content), 4);
    }

    #[test]
    fn test_has_section() {
        let content = r#"
# Introduction

## When to Use

Some content
"#;
        assert!(has_section(content, "when to use"));
        assert!(has_section(content, "Introduction"));
        assert!(!has_section(content, "Nonexistent"));
    }

    #[test]
    fn test_extract_use_cases() {
        let content = r#"
## When to Use

- Use case 1
- Use case 2
* Use case 3

## Other Section
"#;
        let use_cases = extract_use_cases(content);
        assert_eq!(use_cases.len(), 3);
    }

    #[test]
    fn test_has_step_by_step() {
        let content = r#"
1. First step
2. Second step
3. Third step
"#;
        assert!(has_step_by_step(content));
    }

    #[test]
    fn test_calculate_avg_line_length() {
        let content = "Hello\nWorld\nTest";
        let avg = calculate_avg_line_length(content);
        assert_eq!(avg, (5.0 + 5.0 + 4.0) / 3.0);
    }

    #[test]
    fn test_has_io_examples() {
        let content = r#"
Input: test data
Output: result
"#;
        assert!(has_io_examples(content));
    }

    #[test]
    fn test_language_diversity() {
        let blocks = vec![
            CodeBlock {
                language: Some("rust".to_string()),
                content: String::new(),
                line_count: 1,
            },
            CodeBlock {
                language: Some("python".to_string()),
                content: String::new(),
                line_count: 1,
            },
            CodeBlock {
                language: Some("rust".to_string()),
                content: String::new(),
                line_count: 1,
            },
        ];
        assert_eq!(count_language_diversity(&blocks), 2);
    }
}
