#[cfg(test)]
mod tests {
    use crate::models::source::SourceFilter;

    #[test]
    fn test_source_filter_parsing() {
        // Test parsing of source filter strings
        assert_eq!("featured".parse::<SourceFilter>().unwrap(), SourceFilter::Featured);
        assert_eq!("user".parse::<SourceFilter>().unwrap(), SourceFilter::User);
        assert_eq!("all".parse::<SourceFilter>().unwrap(), SourceFilter::All);
    }

    #[test]
    fn test_source_filter_display() {
        // Test display formatting of SourceFilter
        assert_eq!(SourceFilter::Featured.to_string(), "featured");
        assert_eq!(SourceFilter::User.to_string(), "user");
        assert_eq!(SourceFilter::All.to_string(), "all");
    }

    #[test]
    fn test_source_filter_default() {
        // Test that default is All
        let default_filter = SourceFilter::default();
        assert_eq!(default_filter, SourceFilter::All);
    }

    #[test]
    fn test_invalid_source_filter() {
        // Test parsing invalid source filter
        let result = "invalid".parse::<SourceFilter>();
        assert!(result.is_err());
    }
}
