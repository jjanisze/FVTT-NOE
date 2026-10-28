"""Roof assembly guide registered over the painted M1A1 cutaway."""
import base64
from pathlib import Path
HERE=Path(__file__).resolve().parent
off=base64.b64encode((HERE/'roof-off-native.png').read_bytes()).decode()
roof='''<g stroke="#635f49" stroke-width="5" stroke-linejoin="round">
 <rect x="155" y="639" width="470" height="748" fill="#b2a37b"/>
 <rect x="335" y="1241" width="118" height="147" rx="9" fill="#c1b28a"/>
 <path d="M344 1374H444" stroke="#484e3b" stroke-width="12"/>
 <!-- Rear bustle rack and broad armored bustle. -->
 <rect x="135" y="475" width="510" height="160" rx="5" fill="#958966"/>
 <path d="M145 491H635M145 529H635M145 567H635M145 609H635M165 481V625M245 481V625M325 481V625M405 481V625M485 481V625M565 481V625M625 481V625" stroke="#c1ae80" stroke-width="10"/>
 <path d="M155 570H625L665 700L690 980L610 1130L460 1200H318L155 1130L88 980L112 700Z" fill="#b1a179"/>
 <path d="M88 980L155 1130L318 1200H460L610 1130L690 980L583 1003L447 1108H333L201 1003Z" fill="#8f8664"/>
 <path d="M190 591H590V690H190Z" fill="#c2b38c"/>
 <path d="M390 598V680" stroke="#807b5a"/>
 <!-- Exactly two crew hatches: commander on image-left, loader image-right. -->
 <circle cx="285" cy="770" r="62" fill="#817b5c"/>
 <circle cx="285" cy="770" r="50" fill="#c3b28a"/>
 <path d="M247 742H323M248 799H322" stroke="#434d3b" stroke-width="11"/>
 <path d="M469 833Q517 807 565 833V913H469Z" fill="#c8b88d"/>
 <path d="M480 894H554" stroke="#7d7b59" stroke-width="7"/>
 <!-- Gunner below and forward of commander: low sight, no third hatch. -->
 <rect x="233" y="929" width="85" height="84" rx="5" fill="#867d5c"/>
 <rect x="244" y="971" width="64" height="26" fill="#3c4c43"/>
 <!-- Long front projection extends beyond the physical hull. -->
 <rect x="347" y="1159" width="86" height="133" rx="10" fill="#968967"/>
 <rect x="372" y="1271" width="36" height="747" fill="#ada17c"/>
 <rect x="355" y="1545" width="70" height="109" rx="9" fill="#b8aa81"/>
 <path d="M372 1410H408M372 1503H408M372 1704H408M372 1830H408M372 1945H408" stroke="#7a785a" stroke-width="8"/>
 <rect x="373" y="2010" width="34" height="28" fill="#676d55"/>
</g>'''
(HERE/'closed-guide.svg').write_text(f'<svg xmlns="http://www.w3.org/2000/svg" width="780" height="2100" viewBox="0 0 780 2100"><image href="data:image/png;base64,{off}" width="780" height="2100"/>{roof}</svg>',encoding='utf-8')
