import os
import re
import glob

def fix_file_syntax(file_path):
    """Fix common syntax errors in TypeScript files"""
    
    if not os.path.exists(file_path):
        return False
        
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    original_content = content
    
    # Fix missing commas in object literals
    # Pattern: property: value\n    property:
    content = re.sub(
        r'([a-zA-Z_][a-zA-Z0-9_]*:\s*[^,\n{}]+)\n(\s+)([a-zA-Z_][a-zA-Z0-9_]*:)',
        r'\1,\n\2\3',
        content
    )
    
    # Fix missing commas after closing braces/parens
    content = re.sub(
        r'(\}|\))\n(\s+)([a-zA-Z_][a-zA-Z0-9_]*:)',
        r'\1,\n\2\3',
        content
    )
    
    # Fix trailing commas inside parentheses (common error pattern)
    content = re.sub(r',\s*\)', ')', content)
    
    # Fix missing closing parentheses
    content = re.sub(r'(\w+\([^)]*),\s*$', r'\1)', content, flags=re.MULTILINE)
    
    # Fix object literal syntax
    content = re.sub(r'\{,\s*', '{ ', content)
    
    # Fix updatedAt patterns
    content = re.sub(r',\s*updatedAt:\s*new Date\(\)\}', ', updatedAt: new Date() }', content)
    
    # Remove extra closing parentheses
    content = re.sub(r'\)\s*\)\s*\)', '))', content)
    
    if content != original_content:
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        return True
    return False

# Get all TypeScript files in src/app/api
api_files = glob.glob('src/app/api/**/*.ts', recursive=True)
lib_files = glob.glob('src/lib/**/*.ts', recursive=True)

all_files = api_files + lib_files

fixed_count = 0
for file_path in all_files:
    if fix_file_syntax(file_path):
        print(f"Fixed: {file_path}")
        fixed_count += 1

print(f"\nTotal files fixed: {fixed_count}")
