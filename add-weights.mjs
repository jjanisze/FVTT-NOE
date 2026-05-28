import fs from 'fs';

let content = fs.readFileSync('scripts/config/ammo-data.mjs', 'utf8');

const weights = {
  '22lr': '0.005', '38spl': '0.013', '9mm': '0.012', '45acp': '0.021', '44mag': '0.025',
  '556': '0.012', '76239ak': '0.016', '762': '0.024', '3006': '0.027', '50bmg': '0.115',
  '12ga_s': '0.045', '12ga_b': '0.045',
  '40mm': '0.230', '60mm': '1.700', '120mm': '18.000',
  'strzala': '0.030', 'belt': '0.030', 'kulka': '0.015', 'igla': '0.002', 'strzykawka': '0.010'
};

for(const [id, weight] of Object.entries(weights)) {
  const regex = new RegExp(`id: "${id}",[\\s\\S]*?avail: \\d+`, 'g');
  content = content.replace(regex, (match) => {
      if (!match.includes('weight:')) {
         return match + `, weight: ${weight}`;
      }
      return match;
  });
}

fs.writeFileSync('scripts/config/ammo-data.mjs', content);
console.log('Done!');
