#!/usr/bin/env python3
import sys, codecs
sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer, errors='replace')

with open('SESSION-HANDOVER.md', 'rb') as f:
    raw = f.read()

text = raw.decode('utf-8', errors='replace')

# Collapse \r\n\r\n -> \r\n everywhere (fixes double-spacing from Windows newline conversion)
text = text.replace('\r\n\r\n', '\r\n')

with open('SESSION-HANDOVER.md', 'w', encoding='utf-8', newline='') as f:
    f.write(text)

print(f'Done. Size: {len(text)}')
lines = text.split('\n')
print(f'Lines: {len(lines)}')
for i, l in enumerate(lines[:8], 1):
    print(f'{i:3d}: {l[:80]}')
