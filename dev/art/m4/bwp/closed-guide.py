"""Make a roof geometry guide over the canonical, painted Bradley cutaway."""
import base64
from pathlib import Path
HERE = Path(__file__).resolve().parent
off = base64.b64encode((HERE / 'roof-off-native.png').read_bytes()).decode()
roof = '''
<g stroke="#303d28" stroke-width="5" stroke-linejoin="round">
 <!-- Rear troop-compartment roof, with cargo hatch. -->
 <path d="M137 104H572V1150H137Z" fill="#6c7551"/>
 <rect x="180" y="138" width="347" height="430" rx="4" fill="#737d58"/>
 <path d="M353 147V559M190 350H516" stroke="#485538"/>
 <path d="M180 594H524M184 615H518" stroke="#434f34"/>
 <!-- Two-man turret, large and angular, with matched seat/hatch positions. -->
 <path d="M153 642L190 612H411L466 661L466 878L410 974H187L135 883V684Z" fill="#737c54"/>
 <path d="M135 883L187 974H410L466 878L406 895H188Z" fill="#586444"/>
 <ellipse cx="231" cy="785" rx="51" ry="66" fill="#879169"/>
 <ellipse cx="370" cy="785" rx="51" ry="66" fill="#879169"/>
 <path d="M194 750H268M333 750H407M194 822H268M333 822H407" stroke="#343f2d" stroke-width="9"/>
 <rect x="281" y="914" width="41" height="77" rx="8" fill="#455438"/>
 <path d="M301 974V1216" stroke="#273426" stroke-width="16"/>
 <rect x="291" y="1200" width="20" height="52" rx="3" fill="#3f4b33"/>
 <!-- TOW twin pod on vehicle-left (image-right), aligned longitudinally, not on hull. -->
 <path d="M463 694H556V921H463Z" fill="#5a6544"/>
 <path d="M483 709V909M534 709V909" stroke="#919a73" stroke-width="30"/>
 <path d="M467 918H551" stroke="#283424" stroke-width="13"/>
 <!-- The sole driver hatch over the sole driver, engine grille opposite. -->
 <path d="M451 943H562V1090H451Z" fill="#7b855e"/>
 <path d="M464 962H549M464 1071H549" stroke="#303e2b" stroke-width="12"/>
 <path d="M151 971H415V1136H151Z" fill="#47543b"/>
 <path d="M157 983H409M157 1003H409M157 1023H409M157 1043H409M157 1063H409M157 1083H409M157 1103H409M157 1123H409" stroke="#87906b" stroke-width="5"/>
</g>'''
(HERE / 'closed-guide.svg').write_text(f'<svg xmlns="http://www.w3.org/2000/svg" width="720" height="1350" viewBox="0 0 720 1350"><image href="data:image/png;base64,{off}" width="720" height="1350"/>{roof}</svg>',encoding='utf-8')
