# Rebuilds a pasted private key with proper line breaks (pasting on a phone often joins the lines).
import base64, re, sys
k = sys.stdin.read().replace('\r', '').replace('\\n', '\n').strip().strip('"\'')
# Phones can turn the dashes in -----BEGIN into long dashes
k = re.sub(r'[\u2010-\u2015\u2212-]{2,}', '-----', k)
# Copying only the middle of the key loses the BEGIN/END lines; put them back
if 'BEGIN' not in k:
    raw = re.sub(r'[^A-Za-z0-9+/=]', '', k)
    try:
        if base64.b64decode(raw + '=' * (-len(raw) % 4)).startswith(b'openssh-key-v1'):
            k = f'-----BEGIN OPENSSH PRIVATE KEY-----\n{raw}\n-----END OPENSSH PRIVATE KEY-----'
    except ValueError:
        pass
m = re.search(r'-----BEGIN ([A-Z ]+)-----(.*?)-----END \1-----', k, re.S)
if not m:
    # Describe what was pasted without printing any of it
    hints = [f'{len(k.splitlines())} lines', f'{len(k)} characters']
    for word in ('BEGIN', 'PRIVATE KEY', 'END', 'ssh-rsa', 'ssh-ed25519', 'PuTTY'):
        if word in k:
            hints.append(f'contains "{word}"')
    if any(ord(c) > 127 for c in k):
        hints.append('contains non-ASCII characters')
    sys.exit('SG_SSH_KEY does not contain a -----BEGIN ... PRIVATE KEY----- block (' + ', '.join(hints) + ')')
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
