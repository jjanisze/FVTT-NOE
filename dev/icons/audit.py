import re
import os

icons_js_path = r'c:\Users\archo\AppData\Local\FoundryVTT\Data\modules\neuroshima-2026-overrides\scripts\weapons\icons.js'
with open(icons_js_path, 'r', encoding='utf-8') as f:
    icons_js_content = f.read()

rules_block = re.search(r'const RULES = \[([\s\S]*?)\];', icons_js_content).group(1)
mapped_keys = []
for line in rules_block.splitlines():
    match = re.search(r'keys:\s*\[(.*?)\]', line)
    if match:
        keys_str = match.group(1)
        # Parse by splitting by comma, but be careful with strings like "ol, bmg" 
        # Actually a simple eval or manual parsing is better, but since it's just strings...
        keys = [k.strip(' "\'') for k in keys_str.split(',')]
        mapped_keys.extend(keys)

# Fix for comma-separated elements in strings if any were broken,
# but our split might be fine for simple arrays because they are formatted neatly.

def check_file(filepath):
    if not os.path.exists(filepath): return [], []
    with open(filepath, 'r', encoding='utf-8') as f:
        lines = f.read().splitlines()
    in_table = False
    items = []
    for line in lines:
        if '|' in line and 'Nazwa' in line:
            in_table = True
            continue
        if in_table and line.startswith('|') and not line.startswith('|-'):
            parts = line.split('|')
            if len(parts) > 1:
                name = parts[1].strip()
                if name: items.append(name)
        elif not line.strip() and in_table:
            # End of table
            in_table = False
    
    missing = []
    found = []
    
    for item in items:
        item_lower = item.lower()
        is_mapped = False
        for k in mapped_keys:
            if k in item_lower:
                is_mapped = True
                break
        if is_mapped:
            found.append(item)
        else:
            missing.append(item)
    return missing, found

b_palna = check_file(r'c:\Git\Neuroshima\neuro5e\Neuro 5e\Tabele\Bronie\BronPalna.md')
b_biala = check_file(r'c:\Git\Neuroshima\neuro5e\Neuro 5e\Tabele\Bronie\BronBiala.md')
b_miotana = check_file(r'c:\Git\Neuroshima\neuro5e\Neuro 5e\Tabele\Bronie\BronMiotana.md')

print('--- Bron Palna Missing ---')
for m in b_palna[0]: print('-', m)
print('\n--- Bron Biala Missing ---')
for m in b_biala[0]: print('-', m)
print('\n--- Bron Miotana Missing ---')
for m in b_miotana[0]: print('-', m)
