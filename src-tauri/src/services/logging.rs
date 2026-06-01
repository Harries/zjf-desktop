fn redact_word(word: &str) -> String {
    let trimmed = word
        .trim_matches(|char: char| matches!(char, ',' | ';' | '"' | '\'' | ')' | '(' | '[' | ']'));

    if trimmed.starts_with("zjf_") {
        word.replace(trimmed, "zjf_****")
    } else {
        word.to_string()
    }
}

pub fn redact_sensitive(input: &str) -> String {
    let mut redacted = Vec::new();
    let mut redact_next = false;

    for word in input.split_whitespace() {
        if redact_next {
            redacted.push("****".to_string());
            redact_next = false;
            continue;
        }

        let normalized = word.trim_end_matches(':').to_ascii_lowercase();
        if normalized == "bearer" {
            redacted.push("Bearer".to_string());
            redact_next = true;
            continue;
        }

        if normalized == "authorization" {
            redacted.push("Authorization:".to_string());
            redact_next = true;
            continue;
        }

        redacted.push(redact_word(word));
    }

    redacted.join(" ")
}

pub fn warn(context: &str, message: impl AsRef<str>) {
    eprintln!(
        "[zjf-desktop] {}: {}",
        context,
        redact_sensitive(message.as_ref())
    );
}

#[cfg(test)]
mod tests {
    use super::redact_sensitive;

    #[test]
    fn redacts_authorization_and_token_values() {
        assert_eq!(
            redact_sensitive("Authorization: Bearer zjf_secret_token"),
            "Authorization: **** zjf_****"
        );
    }

    #[test]
    fn redacts_bearer_values() {
        assert_eq!(redact_sensitive("Bearer zjf_secret_token"), "Bearer ****");
    }
}
