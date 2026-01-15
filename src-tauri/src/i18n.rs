//! Internationalization utilities for Skills Manager

/// Validate and normalize locale strings
pub fn validate_locale(locale: &str) -> &'static str {
    match locale.to_lowercase().as_str() {
        "zh" | "zh-cn" | "zh-hans" | "zh_cn" => "zh",
        "en" | "en-us" | "en-gb" | "en_us" => "en",
        _ => "en", // Default to English
    }
}

/// Re-export the t! macro for other modules
pub use rust_i18n::t;
