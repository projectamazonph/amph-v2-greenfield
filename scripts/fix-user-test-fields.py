import re
import os

files = [
    r"D:\Web Project\amph-v2-greenfield\src\components\admin\__tests__\NavSidebar.test.tsx",
    r"D:\Web Project\amph-v2-greenfield\src\components\admin\__tests__\UserCard.test.tsx",
    r"D:\Web Project\amph-v2-greenfield\src\usecases\__tests__\GetAdminDashboardStats.test.ts",
    r"D:\Web Project\amph-v2-greenfield\src\usecases\__tests__\ImpersonateUser.test.ts",
    r"D:\Web Project\amph-v2-greenfield\src\usecases\__tests__\AuthorizeLessonAccess.test.ts",
    r"D:\Web Project\amph-v2-greenfield\src\usecases\__tests__\EnrollStudent.test.ts",
    r"D:\Web Project\amph-v2-greenfield\src\infra\repositories\InMemoryUserRepository.ts",
    r"D:\Web Project\amph-v2-greenfield\tests\unit\usecases\AwardXP.test.ts",
    r"D:\Web Project\amph-v2-greenfield\tests\unit\usecases\EnrollStudent.test.ts",
    r"D:\Web Project\amph-v2-greenfield\tests\unit\usecases\MarkLessonComplete.test.ts",
    r"D:\Web Project\amph-v2-greenfield\src\infra\access\__tests__\TierAccessPolicy.test.ts",
]

def insert_after_email_verified_at(content):
    """Insert currentSessionVersion and lockedUntil after 'emailVerifiedAt: null,' line."""
    lines = content.split('\n')
    result = []
    for i, line in enumerate(lines):
        result.append(line)
        # Check if this line ends the emailVerifiedAt entry
        stripped = line.strip()
        if stripped.startswith('emailVerifiedAt:') and stripped.endswith(','):
            # Detect indentation from the current line
            indent = line[:len(line) - len(line.lstrip())]
            # Add new fields with same indentation
            result.append(f'{indent}currentSessionVersion: 0,')
            result.append(f'{indent}lockedUntil: null')
    return '\n'.join(result)

def add_mock_methods(content):
    """Add getCurrentSessionVersion and revokeAllSessions to UserRepository mocks."""
    lines = content.split('\n')
    result = []
    i = 0
    while i < len(lines):
        result.append(lines[i])
        stripped = lines[i].strip()
        # If this is the setTwoFactorSecret line in a mock UserRepository object
        if stripped.startswith('setTwoFactorSecret:') and stripped.endswith(','):
            # Check if next non-empty line is the closing };
            j = i + 1
            while j < len(lines) and lines[j].strip() == '':
                j += 1
            if j < len(lines) and lines[j].strip() == '};':
                # This is the last method — insert new methods before the closing line
                indent = lines[i][:len(lines[i]) - len(lines[i].lstrip())]
                result.append(f'{indent}getCurrentSessionVersion: vi.fn(),')
                result.append(f'{indent}revokeAllSessions: vi.fn()')
        i += 1
    return '\n'.join(result)

for fpath in files:
    if not os.path.exists(fpath):
        print(f"SKIP: {fpath}")
        continue
    with open(fpath, encoding='utf-8') as f:
        content = f.read()

    original = content
    content = insert_after_email_verified_at(content)
    content = add_mock_methods(content)

    if content != original:
        with open(fpath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"FIXED: {fpath}")
    else:
        print(f"NO CHANGE: {fpath}")

print("Done")
