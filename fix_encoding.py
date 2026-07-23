#!/usr/bin/env python3
import sys, codecs
sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer, errors='replace')

with open('SESSION-HANDOVER.md', 'rb') as f:
    raw = f.read()

text = raw.decode('utf-8', errors='replace')

# Fix garbled UTF-8 sequences that appear as literal strings in the file
garbled_to_clean = [
    ('ΓÇö', '—'),
    ('ΓÇô', '–'),
    ('ΓÇ¼', '¼'),
    ('ΓÇ½', '½'),
    ('ΓÇ»', '»'),
    ('ΓÇª', 'ª'),
]

for garbled, clean in garbled_to_clean:
    count = text.count(garbled)
    if count > 0:
        print(f'  Replacing {count}x')
        text = text.replace(garbled, clean)

# Write with Unix newlines so the file is clean
with open('SESSION-HANDOVER.md', 'w', encoding='utf-8', newline='\n') as f:
    f.write(text)

print(f'Done. Size: {len(text)} chars')
