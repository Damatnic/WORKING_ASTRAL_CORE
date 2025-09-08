import re

file_path = 'src/app/api/admin/reports/route.ts'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Fix missing commas in object properties
patterns = [
    # Fix lines like: gte: startDate (missing comma at end)
    (r'(\s+)(gte|lte):\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\n(\s+)(gte|lte):', r'\1\2: \3,\n\4\5:'),
    
    # Fix lines like: email: true (missing comma at end when followed by another property)
    (r'(\s+)([a-zA-Z_][a-zA-Z0-9_]*):\s*(true|false|null|[a-zA-Z_][a-zA-Z0-9_]*)\s*\n(\s+)([a-zA-Z_][a-zA-Z0-9_]*):', r'\1\2: \3,\n\4\5:'),
    
    # Fix lines ending with }) without comma when followed by another property
    (r'(\}\))\s*\n(\s+)(skip|take|orderBy|where|include):', r'\1,\n\2\3:'),
    
    # Fix object literal properties without commas
    (r'(\s+)(type|dateRange|data|meta|filters|schedule|config|message|reportId):\s*([^\n,]+)\s*\n(\s+)([a-zA-Z_][a-zA-Z0-9_]*):', r'\1\2: \3,\n\4\5:'),
    
    # Fix nested object properties
    (r'(\s+)(id|timestamp|action|resource|resourceId|outcome|details|ipAddress|userAgent|email|displayName|role|createdAt|severityLevel|triggerType|interventionType|responseTime|resolved|resolvedAt|emergencyContactUsed|userAnonymousId|reason|evidence|duration|appealable|appealed|expiresAt|moderator|targetUser|detectedAt|type|severity|context|indicators|handled|handledAt|handledBy|actions|notes|lastLoginAt|lastActiveAt|moodEntries|journalEntries|appointments|name|description|createdBy):\s*([^\n,]+)\s*\n(\s+)([a-zA-Z_][a-zA-Z0-9_]*):', r'\1\2: \3,\n\4\5:'),
]

for pattern, replacement in patterns:
    content = re.sub(pattern, replacement, content)

# Fix specific problematic lines
# Fix object literal syntax issues
content = re.sub(r'(\s+where)\s*\n', r'\1,\n', content)
content = re.sub(r'(\s+include:\s*\{[^}]+\})\s*\n(\s+)(skip|take|orderBy):', r'\1,\n\2\3:', content)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print(f"Fixed remaining syntax errors in {file_path}")
