import importlib.util
import json
from pathlib import Path
from types import SimpleNamespace
import tempfile
import unittest
from PIL import Image, ImageDraw

spec=importlib.util.spec_from_file_location('creature_prepare',Path(__file__).with_name('prepare.py'))
pipeline=importlib.util.module_from_spec(spec);spec.loader.exec_module(pipeline)

class PreparationTests(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory();self.root=Path(self.temp.name)
        pipeline.ROOT=self.root;pipeline.HERE=self.root/'dev/art/creatures';pipeline.MANIFEST=pipeline.HERE/'manifest.json';pipeline.FEEDBACK=pipeline.HERE/'review/feedback.json'
        pipeline.write(self.root/'dev/bestiary/bestiary.json',{key:{'name':key,'size':'med','lore':{'wyglad':'Example'}} for key in pipeline.BESTIARY})
        pipeline.init();self.id='towarzysz-psi-partner'
        p=self.root/'portrait.png';Image.new('RGB',(200,250),'#3b352c').save(p)
        self.portrait=self.add('portrait','p01',p)
    def tearDown(self):self.temp.cleanup()
    def add(self,kind,candidate,source,portrait=None):
        prompt=pipeline.HERE/'prompts'/f'{kind}-{candidate}.json'
        subject=self.portrait['src'] if kind=='token' else None
        pipeline.write(prompt,dict(creatureId=self.id,asset=kind,candidateId=candidate,portraitId=portrait,tool='fixture',model=None,references=[{'path':subject}] if subject else []))
        return pipeline.add(SimpleNamespace(id=self.id,kind=kind,candidate=candidate,portrait=portrait,source=str(source),prompt=str(prompt),note=None))
    def token(self):
        p=self.root/'token.png';im=Image.new('RGBA',(300,400));ImageDraw.Draw(im).rectangle((100,40,180,360),fill=(90,60,35,255));im.save(p)
        return self.add('token','t01',p,'p01')
    def test_alpha_framing_and_provenance(self):
        token=self.token();im=Image.open(self.root/token['src']);box=im.getchannel('A').point(lambda x:255 if x>8 else 0).getbbox()
        self.assertEqual(im.size,(400,400));self.assertAlmostEqual(max(box[2]-box[0],box[3]-box[1])/400,.7,delta=.005)
        self.assertEqual(token['portraitSha256'],self.portrait['sha256']);self.assertEqual(pipeline.validate()['errors'],[])
        p=self.root/'opaque.png';Image.new('RGBA',(400,400),'white').save(p)
        with self.assertRaisesRegex(ValueError,'genuine transparent'):self.add('token','t02',p,'p01')
    def test_existing_candidate_cannot_be_overwritten(self):
        before=(self.root/self.portrait['src']).read_bytes()
        with self.assertRaisesRegex(ValueError,'never overwrite'):self.add('portrait','p01',self.root/'portrait.png')
        self.assertEqual(before,(self.root/self.portrait['src']).read_bytes())
    def test_two_stage_workflow_requires_approval_of_exact_portrait(self):
        data=pipeline.read(pipeline.MANIFEST);pipeline.entry_for(data,self.id)['stage']='portrait-approval';pipeline.write(pipeline.MANIFEST,data)
        with self.assertRaisesRegex(ValueError,'Approve this exact portrait'):self.token()
        decision={'decision':'approve','candidateId':'p01','sha256':self.portrait['sha256']}
        pipeline.write(pipeline.FEEDBACK,{'items':{f'{self.id}:portrait':decision}})
        self.assertEqual(self.token()['portraitId'],'p01')
        decision['sha256']='stale';pipeline.write(pipeline.FEEDBACK,{'items':{f'{self.id}:portrait':decision}})
        args=SimpleNamespace(id=self.id,kind='token',candidate='t02',portrait='p01')
        with self.assertRaisesRegex(ValueError,'Approve this exact portrait'):pipeline.prompt(args)
    def test_install_requires_matching_approvals_and_preserves_exact_selected_bytes(self):
        token=self.token();args=SimpleNamespace(id=self.id)
        with self.assertRaisesRegex(ValueError,'not approved'):pipeline.install(args)
        self.assertFalse((self.root/'tokens/towarzysz-psi-partner.webp').exists())
        pipeline.write(pipeline.FEEDBACK,{'items':{f'{self.id}:{kind}':{'decision':'approve','candidateId':c['id'],'sha256':c['sha256']} for kind,c in [('portrait',self.portrait),('token',token)]}})
        installed=pipeline.install(args)
        for kind,c in [('portrait',self.portrait),('token',token)]:self.assertEqual((self.root/installed[kind]['path']).read_bytes(),(self.root/c['src']).read_bytes())

if __name__=='__main__':unittest.main()
