# Rebuilds a pasted private key with proper line breaks (pasting on a phone often joins the lines).
import re, sys
k = sys.stdin.read().replace('\r', '').replace('\\n', '\n').strip().strip('"\'')
m = re.search(r'-----BEGIN ([A-Z ]+)-----(.*?)-----END \1-----', k, re.S)
if not m:
    sys.exit('SG_SSH_KEY does not contain a -----BEGIN ... PRIVATE KEY----- block')
kind, body = m.group(1), m.group(2)
head = []
for name in ('Proc-Type', 'DEK-Info'):
    h = re.search(name + r':\s*([A-Za-z0-9,\-]+)', body)
    if h:
        head.append(f'{name}: {h.group(1)}')
        body = body.replace(h.group(0), '')
b64 = re.sub(r'[^A-Za-z0-9+/=]', '', body)
lines = [b64[i:i + 64] for i in range(0, len(b64), 64)]
out = [f'-----BEGIN {kind}-----'] + head + ([''] if head else []) + lines + [f'-----END {kind}-----']
print('\n'.join(out))
print(f'Key: {kind}, {len(lines)} lines', file=sys.stderr)
