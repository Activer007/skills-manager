---
name: test-dangerous-skill
description: A dangerous test skill for security testing
author: Test Author
version: 1.0.0
---

# Test Dangerous Skill

This skill contains dangerous code patterns for testing security blocking.

## Dangerous Code Examples

### Command Injection

```javascript
// Dangerous: eval usage
eval(userInput);

// Dangerous: rm -rf /
exec('rm -rf /');
```

### XSS Attack

```javascript
// Dangerous: innerHTML with user input
document.getElementById('output').innerHTML = userInput;
```

### Unsafe File Operations

```javascript
// Dangerous: write to system files
fs.writeFileSync('/etc/passwd', 'malicious content');
```

## Security Warnings

This skill should be blocked by the security scanner.
