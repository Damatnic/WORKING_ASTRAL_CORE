import re
import os

# List of files with syntax errors
files_to_fix = [
    'src/app/api/admin/reports/route.ts',
    'src/app/api/admin/system-health/route.ts',
    'src/app/api/admin/users/route.ts',
    'src/app/api/ai/chat/route.ts',
    'src/app/api/audit/events/route.ts',
    'src/app/api/audit/reports/route.ts',
    'src/app/api/auth/mfa/manage/route.ts',
    'src/app/api/auth/mfa/setup/route.ts',
    'src/app/api/auth/register/route.ts',
    'src/app/api/auth/reset-password/route.ts',
    'src/app/api/auth/sessions/route.ts',
    'src/app/api/auth/verify-email/route.ts',
    'src/app/api/community/chat-rooms/route.ts',
    'src/app/api/community/comments/route.ts'
]

def fix_syntax_errors(content):
    # Fix pattern: functionCall(param,
    content = re.sub(r'([a-zA-Z_][a-zA-Z0-9_]*\([^)]*),\s*\n', r'\1)\n', content)
    
    # Fix pattern: property: value,  (with trailing comma followed by nothing)
    content = re.sub(r'([\s\t]*[a-zA-Z_][a-zA-Z0-9_]*:\s*[^,\n]+),\s*$', r'\1', content, flags=re.MULTILINE)
    
    # Fix pattern: new Date(,
    content = re.sub(r'new Date\(,', r'new Date(),', content)
    
    # Fix pattern: {, updatedAt
    content = re.sub(r'\{,\s*updatedAt', r'{ updatedAt', content)
    
    # Fix pattern: value, updatedAt
    content = re.sub(r'([^{]),\s*updatedAt:\s*new Date\(\)\}', r'\1, updatedAt: new Date() }', content)
    
    # Fix pattern: template literal with extra comma ${value,}
    content = re.sub(r'\$\{([^}]+),\s*updatedAt:\s*new Date\(\)\}', r'${\1}', content)
    
    # Fix pattern: limit,  without closing parenthesis
    content = re.sub(r'(getPaginationMeta\([^)]+limit),\s*\n', r'\1)\n', content)
    
    return content

for file_path in files_to_fix:
    if os.path.exists(file_path):
        print(f"Processing {file_path}...")
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        fixed_content = fix_syntax_errors(content)
        
        if content != fixed_content:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(fixed_content)
            print(f"  Fixed syntax errors in {file_path}")
        else:
            print(f"  No changes needed in {file_path}")
    else:
        print(f"  File not found: {file_path}")

print("Done!")
