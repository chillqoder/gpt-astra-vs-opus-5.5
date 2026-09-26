import './style.css';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const $ = (id) => document.getElementById(id);
const viewport = $('viewer');
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(32, 1, .05, 35);
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.7));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
viewport.appendChild(renderer.domElement);
const pmrem = new THREE.PMREMGenerator(renderer);
const room = new RoomEnvironment();
const environment = pmrem.fromScene(room, .04);
scene.environment = environment.texture;
scene.environmentIntensity = .62;
room.dispose(); pmrem.dispose();

// 01 — A quiet photographic stage, measured in metres.
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, .94, 0);
controls.enableDamping = true; controls.dampingFactor = .055;
controls.enablePan = false; controls.minDistance = 1.65; controls.maxDistance = 6.3;
controls.minPolarAngle = .22; controls.maxPolarAngle = Math.PI / 2 - .045;
controls.autoRotate = !matchMedia('(prefers-reduced-motion: reduce)').matches;
controls.autoRotateSpeed = .28;
controls.rotateSpeed = .65; controls.zoomSpeed = .7;
camera.position.set(2.05, 1.55, 3.95);
const key = new THREE.DirectionalLight(0xffeee2, 2.5);
key.position.set(-3, 5, 5); key.castShadow = true;
key.shadow.mapSize.set(2048, 2048); key.shadow.camera.left = -2; key.shadow.camera.right = 2;
key.shadow.camera.top = 3; key.shadow.camera.bottom = -2; key.shadow.normalBias = .015;
key.shadow.bias = -.0001; key.shadow.radius = 5; scene.add(key);
const fill = new THREE.DirectionalLight(0xcfe5ff, 1.1); fill.position.set(3, 3, 1); scene.add(fill);
const rim = new THREE.DirectionalLight(0xffc4a5, 2.3); rim.position.set(1, 4, -3); scene.add(rim);
const ambient = new THREE.HemisphereLight(0xe5edff, 0x222320, 1.1); scene.add(ambient);
const floor = new THREE.Mesh(new THREE.PlaneGeometry(200,200), new THREE.ShadowMaterial({ opacity: .055 }));
floor.rotation.x = -Math.PI / 2; floor.position.y = -.007; floor.receiveShadow = true; scene.add(floor);
const contactCanvas = document.createElement('canvas'); contactCanvas.width = contactCanvas.height = 128;
const cc = contactCanvas.getContext('2d'), grad = cc.createRadialGradient(64,64,8,64,64,64);
grad.addColorStop(0,'rgba(0,0,0,.6)'); grad.addColorStop(.45,'rgba(0,0,0,.3)'); grad.addColorStop(1,'rgba(0,0,0,0)');
cc.fillStyle=grad; cc.fillRect(0,0,128,128);
const contact = new THREE.Mesh(new THREE.PlaneGeometry(1.9,1.3),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(contactCanvas),transparent:true,depthWrite:false}));
contact.rotation.x=-Math.PI/2; contact.position.set(0,.001,.02); scene.add(contact);

const machine = new THREE.Group(); scene.add(machine);
const mats = {};
function mat(name,color,roughness=.4,metalness=0,extra={}) { return mats[name] = new THREE.MeshStandardMaterial({color,roughness,metalness,...extra}); }
const red = mat('enamel',0xa7101d,.24,.45);
const redTrim = mat('trim',0xd32b35,.22,.4);
const ivory = mat('ivory',0xe4e8df,.32,.13);
const white = mat('porcelain',0xf4f3e7,.26,.05);
const steel = mat('steel',0x939e9e,.3,.9);
const chrome = mat('chrome',0xc6d1cf,.17,1);
const dark = mat('graphite',0x182124,.65,.12);
const rubber = mat('rubber',0x0d1215,.92,0);
const interior = mat('interior',0xc0cbd1,.38,.35);
const blueLight = mat('ice',0xb8e9ef,.25,0,{emissive:0xc3f0ff,emissiveIntensity:1.2});
const warmLight = mat('warm',0xffdeb0,.4,0,{emissive:0xffcb83,emissiveIntensity:1.1});
const greenLight = mat('green',0xb7f2c4,.25,.1,{emissive:0x5cf29b,emissiveIntensity:.8});
const amber = mat('amber',0xf18e4e,.3,.05,{emissive:0xf07832,emissiveIntensity:1.2});
const geometries = new Map();
function box(w,h,d,x,y,z,material=red,r=.004,parent=machine) {
  const k=[w,h,d,r].join('|');
  if(!geometries.has(k)) geometries.set(k,r ? new RoundedBoxGeometry(w,h,d,2,r) : new THREE.BoxGeometry(w,h,d));
  const mesh=new THREE.Mesh(geometries.get(k),material); mesh.position.set(x,y,z); mesh.castShadow=true; mesh.receiveShadow=true;parent.add(mesh);return mesh;
}
function cylinder(rt,rb,h,x,y,z,material=steel,parent=machine,segments=20){
  const k=['c',rt,rb,h,segments].join('|');if(!geometries.has(k))geometries.set(k,new THREE.CylinderGeometry(rt,rb,h,segments));
  const mesh=new THREE.Mesh(geometries.get(k),material);mesh.position.set(x,y,z);mesh.castShadow=true;parent.add(mesh);return mesh;
}
function torus(radius,tube,x,y,z,material=chrome,parent=machine){const mesh=new THREE.Mesh(new THREE.TorusGeometry(radius,tube,6,24),material);mesh.position.set(x,y,z);parent.add(mesh);return mesh;}
function texture(w,h,draw){const c=document.createElement('canvas');c.width=w;c.height=h;const ctx=c.getContext('2d');draw(ctx,w,h);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());return t;}
const font='Arial, "Hiragino Kaku Gothic ProN", "Noto Sans CJK JP", sans-serif';
function lettering(text,{bg='#eef0e8',fg='#24373b',size=36,sub='',glow=false,w=512,h=128}={}){
  const t=texture(w,h,(c)=>{c.fillStyle=bg;c.fillRect(0,0,w,h);c.fillStyle=fg;c.textAlign='center';c.textBaseline='middle';c.font=`600 ${size}px ${font}`;c.fillText(text,w/2,sub?h*.38:h*.51);if(sub){c.font=`${size*.34}px ${font}`;c.fillText(sub,w/2,h*.79);}});
  return new THREE.MeshStandardMaterial({map:t,roughness:.48,metalness:.02,...(glow?{emissiveMap:t,emissive:0xffffff,emissiveIntensity:.55}:{})});
}
function decal(material,w,h,x,y,z,parent=machine){const m=new THREE.Mesh(new THREE.PlaneGeometry(w,h),material);m.position.set(x,y,z);parent.add(m);return m;}
function screw(x,y,z,parent=machine,rotation=0){const s=cylinder(.005,.005,.002,x,y,z,chrome,parent,10);s.rotation.x=Math.PI/2;const slit=box(.006,.0009,.001,x,y,z+.0015,dark,0,parent);slit.rotation.z=rotation;}
function wire(points,radius,material,parent=machine){const curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)));const m=new THREE.Mesh(new THREE.TubeGeometry(curve,28,radius,8,false),material);parent.add(m);return m;}

// 02 — Folded steel cabinet, separate door, chassis, and adjustable feet.
box(.98,1.7,.23,0,.98,-.232,red,.025);
box(.054,1.7,.68,-.474,.98,0,red,.016);box(.054,1.7,.68,.474,.98,0,red,.016);
box(.96,.055,.67,0,1.813,0,redTrim,.015);box(.96,.055,.68,0,.15,0,red,.015);
box(.965,.025,.025,0,1.813,.354,redTrim,.009);
box(.94,.095,.65,0,.097,-.005,dark,.014);
for(const x of [-.38,.38])for(const z of [-.25,.25]){cylinder(.031,.036,.039,x,.023,z,rubber);cylinder(.017,.017,.035,x,.05,z,steel);}
for (const x of [-.455,.455]) box(.018,1.627,.035,x,.971,.345,rubber,.004);
for (const y of [.165,1.777]) box(.927,.018,.035,0,y,.345,rubber,.004);
box(.923,.47,.06,0,.405,.366,redTrim,.014);
box(.923,.035,.045,0,.656,.358,redTrim,.008);
box(.923,.024,.05,0,.165,.369,red,.008);
box(.923,.167,.07,0,1.726,.367,redTrim,.012);
box(.012,1.62,.024,-.467,.985,.374,red,.003);box(.012,1.62,.024,.467,.985,.374,red,.003);
box(.947,.008,.011,0,.625,.404,rubber,.001);

// 03 — Recessed display with individual shelf lips and edge lighting.
box(.723,1.017,.018,-.105,1.153,.084,interior,.001);
box(.735,1.033,.029,-.105,1.152,.103,ivory,.01);
box(.698,.983,.014,-.105,1.152,.126,interior,.004);
for(const x of [-.473,.265])box(.038,1.023,.092,x,1.152,.389,ivory,.008);
box(.762,.028,.1,-.105,1.656,.39,ivory,.006);
box(.762,.026,.1,-.105,.646,.39,ivory,.006);
for(const x of [-.446,.239]){box(.011,.978,.011,x,1.15,.403,blueLight,.003);box(.012,.978,.245,x,1.15,.25,ivory,.003);}
const shelfBases=[1.431,1.188,.945,.702];
for(const y of shelfBases){box(.679,.014,.268,-.103,y,.265,white,.002);box(.679,.049,.025,-.103,y-.027,.394,ivory,.003);box(.677,.008,.009,-.103,y+.008,.411,chrome,.001);}
const glassMat=new THREE.MeshPhysicalMaterial({color:0xb6dcdf,transparent:true,opacity:.055,roughness:.15,metalness:.1,clearcoat:1,side:THREE.DoubleSide,depthWrite:false});
decal(glassMat,.679,.938,-.104,1.173,.428);
const glassShine = new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.025,depthWrite:false});
const glint=decal(glassShine,.044,.88,-.382,1.18,.43);glint.rotation.z=-.08;

// 04 — Twenty original labels, varied silhouettes, three units deep per facing.
export const drinks=[
 ['SORA','ソーダ','citrus','can','#edc72c','#183e41',150],['MIDORI','緑茶','green tea','bottle','#52844c','#f3efd9',160],['MIZU','水分補給','sports','bottle','#edf3e9','#2173bb',160],['MOMO','白桃','peach','bottle','#eea5b4','#833e5d',180],['COLA CLUB','コーラ','cola','can','#b9232a','#fff5df',150],
 ['RAMUNE','ラムネ','marble soda','ramune','#9fe0cf','#18627b',180],['MUGI','麦茶','barley tea','bottle','#bf8b43','#473518',160],['YUKI','乳酸菌','yogurt','bottle','#f1eee3','#2582a0',150],['LEMON DAY','レモン','lemon tea','bottle','#efd552','#29493c',160],['SUI','天然水','sparkling','bottle','#b7dadd','#276579',130],
 ['KUMA','くま珈琲','black coffee','smallcan','#253b49','#e6c590',130],['MILK & CO.','カフェオレ','café au lait','smallcan','#dbc4a0','#613c2e',150],['MATCHA','抹茶ラテ','matcha latte','can','#849c59','#f3efd8',160],['VOLT','エナジー','energy','slimcan','#233c36','#c7eb63',180],['AKI','秋のぶどう','autumn grape','can','#805878','#f4d7b8',180],
 ['OHAYŌ','朝の珈琲','hot coffee','smallcan','#984526','#f2d4a0',130],['COCOA','ほっとココア','cocoa','smallcan','#694638','#f1d0a5',150],['CORN CLUB','つぶつぶ','corn soup','can','#edba46','#76502d',150],['HŌJI','ほうじ茶','roasted tea','bottle','#aa774a','#fff0c7',160],['FUYU','冬のミルク','winter milk','smallcan','#e6d9ba','#925846',180]
].map((d,i)=>({name:d[0],jp:d[1],flavor:d[2],shape:d[3],color:d[4],ink:d[5],price:d[6],hot:i>=15,soldOut:i===8||i===14}));
function drinkTexture(d){return texture(512,512,(c,w,h)=>{
 c.fillStyle=d.color;c.fillRect(0,0,w,h);
 c.fillStyle=d.ink;c.globalAlpha=.1;for(let y=0;y<h;y+=26){c.fillRect(0,y,w,2);}c.globalAlpha=1;
 for(const x of [0,256,512]){
  c.fillStyle=d.ink;c.textAlign='center';c.font=`bold 17px ${font}`;c.fillText('H I R U  飲料',x,38);
  c.save();c.translate(x,188);c.fillStyle=d.ink;c.globalAlpha=.14;c.beginPath();c.arc(0,0,79,0,Math.PI*2);c.fill();c.globalAlpha=1;
  if(['green tea','barley tea','roasted tea','matcha latte'].includes(d.flavor)){for(let a=0;a<3;a++){c.save();c.rotate(a*1.6-.5);c.beginPath();c.ellipse(0,-26,17,36,.35,0,Math.PI*2);c.fill();c.restore();}}
  else if(['black coffee','hot coffee','café au lait','cocoa'].includes(d.flavor)){c.beginPath();c.roundRect(-32,-15,58,41,7);c.fill();c.lineWidth=7;c.strokeStyle=d.ink;c.beginPath();c.arc(29,3,15,-Math.PI/2,Math.PI/2);c.stroke();c.lineWidth=3;for(let i=-15;i<=15;i+=15){c.beginPath();c.moveTo(i,-29);c.bezierCurveTo(i-10,-39,i+8,-43,i,-54);c.stroke();}}
  else if(d.flavor==='energy'){c.beginPath();c.moveTo(8,-57);c.lineTo(-33,5);c.lineTo(-4,5);c.lineTo(-15,60);c.lineTo(39,-12);c.lineTo(9,-12);c.closePath();c.fill();}
  else{c.beginPath();c.arc(0,0,46,0,Math.PI*2);c.fill();c.strokeStyle=d.color;c.lineWidth=3;for(let a=0;a<6;a++){c.beginPath();c.moveTo(0,0);c.lineTo(Math.cos(a*Math.PI/3)*43,Math.sin(a*Math.PI/3)*43);c.stroke();}c.fillStyle=d.ink;c.beginPath();c.ellipse(20,-54,18,8,-.5,0,Math.PI*2);c.fill();}
  c.restore();c.fillStyle=d.ink;c.font=`900 ${d.name.length>9?26:34}px ${font}`;c.fillText(d.name,x,310,240);c.font=`600 27px ${font}`;c.fillText(d.jp,x,358,235);
  c.font=`14px ${font}`;c.fillText(d.flavor.toUpperCase(),x,393);c.fillRect(x-55,418,110,2);c.font=`12px ${font}`;c.fillText(d.hot?'ほっと、ひといき。':'ひとくちの、しあわせ。',x,449);c.fillText(d.shape.includes('can')?'185 ml   ●   RECYCLE':'280 ml   ●   RECYCLE',x,479);
 }
});}
function makeDrink(d,parent=machine){
 const group=new THREE.Group();parent.add(group);
 if(!d.material){const t=drinkTexture(d);d.material=new THREE.MeshStandardMaterial({map:t,roughness:d.shape.includes('can')?.32:.46,metalness:d.shape.includes('can')?.48:.06});d.capMat=new THREE.MeshStandardMaterial({color:d.shape==='bottle'?d.ink:0xbfd3d4,roughness:.4,metalness:.12});d.liquid=new THREE.MeshStandardMaterial({color:d.color,roughness:.18,metalness:.08});}
 const small=d.shape==='smallcan',slim=d.shape==='slimcan';const radius=slim?.025:small?.032:.034;
 if(d.shape.includes('can')){const h=small?.106:slim?.168:.142;cylinder(radius,radius,h,0,h/2+.003,0,d.material,group,24);cylinder(radius*.99,radius,.007,0,h+.004,0,chrome,group);cylinder(radius,radius*.97,.005,0,.005,0,chrome,group);const ring=torus(radius*.91,.0015,0,h+.008,0,steel,group);ring.rotation.x=Math.PI/2;const tab=torus(.008,.002,0,h+.009,-.003,steel,group);tab.rotation.x=Math.PI/2;box(.014,.001,.008,0,h+.009,.008,dark,.003,group);}
 else {
 const ramune=d.shape==='ramune';const pts=ramune?[[.018,0],[.031,.009],[.031,.082],[.023,.104],[.018,.116],[.023,.131],[.02,.151],[.018,.17]]:[[.021,0],[.032,.008],[.034,.025],[.034,.118],[.032,.132],[.017,.152],[.014,.16]];
 const body=new THREE.Mesh(new THREE.LatheGeometry(pts.map(p=>new THREE.Vector2(...p)),24),d.liquid);body.castShadow=true;group.add(body);
 cylinder(.0345,.0345,.088,0,.068,0,d.material,group,24);
 const top=ramune?.177:.168;cylinder(ramune?.021:.017,ramune?.021:.017,.019,0,top,0,d.capMat,group);
 for(let i=0;i<3;i++)cylinder(.035,.035,.002,0,.013+i*.006,0,d.liquid,group);
 if(ramune){const marble=new THREE.Mesh(new THREE.SphereGeometry(.01,12,8),blueLight);marble.position.set(0,.134,.01);group.add(marble);}
 }
 return group;
}
const selections=[];const buttonRecords=[];
const coldTag=lettering('つめた〜い',{bg:'#276bac',fg:'#effaff',size:29,glow:true});
const hotTag=lettering('あったか〜い',{bg:'#b73327',fg:'#fff0cf',size:27,glow:true});
const soldTag=lettering('売 切',{bg:'#412421',fg:'#ff8b71',size:48,glow:true,w:128,h:64});
for(let row=0;row<4;row++)for(let col=0;col<5;col++){
 const index=row*5+col,d=drinks[index],x=-.374+col*.134,y=shelfBases[row];
 for(let depth=2;depth>=0;depth--){const drink=makeDrink(d);drink.position.set(x,y+.012,.341-depth*.082);}
 decal(d.hot?hotTag:coldTag,.112,.016,x,y-.006,.412);
 decal(lettering(`¥${d.price}`,{size:48,w:256,h:80}),.056,.02,x,y-.027,.409);
 box(.053,.023,.014,x,y-.063,.412,steel,.005);
 box(.046,.017,.016,x,y-.063,.422,d.soldOut?rubber:greenLight,.004);
 const button=box(.037,.012,.011,x,y-.063,.432,d.soldOut?dark:white,.003);
 button.userData={drinkIndex:index,dynamic:true};selections.push(button);buttonRecords.push({button,z:button.position.z});
 if(d.soldOut)decal(soldTag,.032,.011,x,y-.063,.439);else box(.021,.002,.002,x,y-.064,.439,greenLight,.001);
}
// Extra room between product columns makes every silhouette legible.

// 05/06 — Payment column and the small tactile things people touch.
box(.185,1.005,.065,.364,1.151,.373,ivory,.01);
box(.157,.892,.009,.364,1.152,.409,white,.008);
decal(lettering('お金を入れてください',{bg:'#e4e8df',size:29}),.139,.027,.364,1.591,.417);
box(.141,.092,.022,.364,1.513,.421,steel,.006);
box(.126,.076,.012,.364,1.513,.434,rubber,.004);
let displayCanvas,displayCtx;
const digitTexture=texture(512,192,(c)=>{displayCanvas=c.canvas;displayCtx=c;});
const digitalMaterial=new THREE.MeshStandardMaterial({map:digitTexture,emissiveMap:digitTexture,emissive:0xffb875,emissiveIntensity:1.5,roughness:.45});
decal(digitalMaterial,.115,.06,.364,1.514,.442);
function amountDisplay(amount='0',message='いらっしゃいませ'){
 const c=displayCtx;c.fillStyle='#111b18';c.fillRect(0,0,512,192);c.fillStyle='#eeb478';c.font=`22px ${font}`;c.textAlign='center';c.fillText(message,256,36);
 const digits=String(amount).padStart(3,' '),segments={0:'abcedf',1:'bc',2:'abged',3:'abgcd',4:'fgbc',5:'afgcd',6:'afgecd',7:'abc',8:'abcdefg',9:'abfgcd'};
 const coords={a:[0,0,45,6],b:[42,3,6,36],c:[42,46,6,36],d:[0,79,45,6],e:[-3,46,6,36],f:[-3,3,6,36],g:[0,40,45,6]};
 [...digits].forEach((d,i)=>{for(const [s,r]of Object.entries(coords)){c.fillStyle=segments[d]?.includes(s)?'#ffb06c':'#28332b';c.fillRect(178+i*65+r[0],65+r[1],r[2],r[3]);}});c.fillStyle='#b78b5e';c.font=`24px ${font}`;c.fillText('円',425,144);digitTexture.needsUpdate=true;
}
amountDisplay();
box(.074,.06,.016,.333,1.405,.427,steel,.004);box(.009,.042,.009,.333,1.405,.438,rubber,.003);box(.003,.033,.002,.331,1.405,.444,chrome,.001);
const lever=cylinder(.013,.013,.01,.407,1.405,.43,chrome);lever.rotation.x=Math.PI/2;box(.01,.033,.014,.407,1.393,.444,amber,.004);
decal(lettering('10 · 50 · 100 · 500',{size:28}),.12,.014,.364,1.359,.419);
box(.14,.084,.022,.364,1.291,.424,steel,.004);box(.119,.04,.016,.364,1.297,.438,dark,.003);
box(.102,.008,.012,.364,1.292,.449,rubber,.001);box(.105,.004,.011,.364,1.28,.45,chrome,.001);
decal(lettering('↓  ¥1000  ↓',{bg:'#132322',fg:'#b7ecca',size:32,glow:true}),.105,.017,.364,1.316,.448);
const returnButton=cylinder(.019,.019,.012,.321,1.204,.433,amber);returnButton.rotation.x=Math.PI/2;
decal(lettering('おつり',{size:32}),.054,.016,.39,1.205,.42);
box(.12,.062,.024,.364,1.138,.421,steel,.006);box(.103,.044,.013,.364,1.14,.437,rubber,.005);box(.104,.014,.026,.364,1.115,.445,steel,.003);
box(.126,.112,.02,.364,1.019,.426,dark,.01);
const nfcMat=lettering(')))',{bg:'#19282b',fg:'#c0e4df',size:60,sub:'IC  /  TOUCH',glow:true,w:256,h:256});
decal(nfcMat,.083,.083,.364,1.022,.438);box(.024,.003,.004,.364,.974,.439,greenLight,.001);
const instructions=texture(256,256,(c)=>{c.fillStyle='#eaeadd';c.fillRect(0,0,256,256);c.fillStyle='#3f5454';c.textAlign='center';c.font=`bold 23px ${font}`;c.fillText('かんたん 3 ステップ',128,33);c.font=`20px ${font}`;['① お金を入れる','② ボタンを押す','③ 商品を受け取る'].forEach((s,i)=>c.fillText(s,128,83+i*43));c.fillStyle='#8d9b8d';c.font=`13px ${font}`;c.fillText('ありがとうございます',128,239);});
decal(new THREE.MeshStandardMaterial({map:instructions,roughness:.85}),.12,.108,.364,.879,.421);
box(.05,.07,.008,.364,.739,.421,steel,.012);const lock=cylinder(.014,.014,.01,.364,.745,.43,chrome);lock.rotation.x=Math.PI/2;box(.003,.015,.003,.364,.745,.437,rubber,.001);

// 07 — Rubber-edged pickup recess, reflective chamber and hinged flap.
box(.655,.195,.016,-.074,.371,.404,rubber,.013);
box(.615,.156,.015,-.074,.371,.417,steel,.009);
box(.589,.134,.01,-.074,.376,.429,dark,.006);
box(.585,.011,.088,-.074,.31,.443,steel,.003);
box(.562,.007,.005,-.074,.437,.44,warmLight,.001);
const flapPivot=new THREE.Group();flapPivot.position.set(-.074,.44,.448);flapPivot.userData.dynamic=true;machine.add(flapPivot);
const flap=box(.563,.112,.005,0,-.056,0,new THREE.MeshPhysicalMaterial({color:0x667576,metalness:.2,roughness:.22,transparent:true,opacity:.65}),.004,flapPivot);
flap.userData={pickup:true};selections.push(flap);
decal(lettering('取り出し口',{bg:'#48595a',fg:'#e6eadf',size:33,sub:'PUSH TO OPEN'}),.166,.033,0,-.051,.0035,flapPivot);
for(const x of [-.325,.177]){const hinge=cylinder(.006,.006,.04,x,.444,.45,chrome);hinge.rotation.z=Math.PI/2;}
decal(lettering('THANK YOU.  また、ここで。',{bg:'#cf2a34',fg:'#f6dfce',size:26}),.37,.028,-.071,.242,.399);

// 08 — Manufacture, maintenance, and a few affectionate imperfections.
const headerTexture=texture(1024,192,(c,w,h)=>{
 c.fillStyle='#f3ecda';c.fillRect(0,0,w,h);c.fillStyle='#bb2731';c.textBaseline='middle';c.textAlign='left';c.font=`900 139px ${font}`;c.fillText('hiru',48,92);c.font=`26px ${font}`;c.fillText('®',301,43);
 c.fillStyle='#66746a';c.font=`600 27px ${font}`;c.fillText('いつもの街に、小さなしあわせ。',389,77);c.font=`16px ${font}`;c.fillText('A LITTLE HAPPINESS.  ANY TIME OF DAY.',392,122);
});
const headerMat=new THREE.MeshStandardMaterial({map:headerTexture,emissiveMap:headerTexture,emissive:0xffead2,emissiveIntensity:.6,roughness:.3});
box(.847,.126,.012,0,1.728,.408,rubber,.008);decal(headerMat,.833,.113,0,1.728,.416);
for(const x of [-.445,.445])for(const y of [1.783,1.668,.641,.193])screw(x,y,.412,machine,.4);
for(const x of [.289,.439])for(const y of [1.628,.693])screw(x,y,.416);
for(const x of [-.427,.226])for(const y of [1.619,.679])screw(x,y,.442,machine,.6);
for(const y of [.55,1.01,1.55]){box(.021,.075,.045,-.488,y,.341,steel,.004);box(.007,.058,.01,-.498,y,.365,chrome,.002);}
// Side graphics run along a separate, correctly oriented plane.
const sideBrand=texture(512,768,(c,w,h)=>{c.clearRect(0,0,w,h);c.fillStyle='#f3d8c0';c.textAlign='center';c.font=`900 130px ${font}`;c.fillText('hiru',256,310);c.font=`24px ${font}`;c.fillText('ひ る',256,365);c.fillStyle='#efab98';c.font=`13px ${font}`;c.fillText('A LITTLE HAPPINESS.',256,416);c.fillText('ANY TIME OF DAY.',256,439);c.strokeStyle='#e4776b';c.lineWidth=2;c.beginPath();c.arc(256,342,191,0,Math.PI*2);c.stroke();});
const sideMat=new THREE.MeshStandardMaterial({map:sideBrand,transparent:true,roughness:.4,metalness:.15,depthWrite:false});
for(const sign of [-1,1]){
 const side=decal(sideMat,.42,.65,sign*.504,1.16,-.015);side.rotation.y=sign*Math.PI/2;
 box(.004,.012,.665,sign*.503,.62,0,ivory,.001);
 const vent=box(.012,.222,.407,sign*.504,.35,-.03,red,.004);
 for(let i=0;i<14;i++){box(.005,.005,.348,sign*.512,.254+i*.014,-.035,rubber,.001);box(.008,.003,.348,sign*.514,.257+i*.014,-.035,redTrim,.001);}
 for(const z of [-.214,.159])for(const y of [.241,.463]){const rivet=cylinder(.004,.004,.003,sign*.513,y,z,steel,machine,8);rivet.rotation.z=Math.PI/2;}
}
box(.808,1.447,.016,0,.992,-.355,red,.009);
box(.71,.37,.017,0,.392,-.371,dark,.008);
for(let i=0;i<20;i++)box(.672,.007,.01,0,.231+i*.017,-.383,steel,.001);
for(const x of [-.3,0,.3])box(.009,.337,.008,x,.394,-.389,dark,.001);
for(let i=0;i<11;i++)box(.537,.005,.009,0,1.56+i*.014,-.37,rubber,.001);
for(const x of [-.381,.381])for(const y of [.207,.69,1.15,1.68]){const s=cylinder(.005,.005,.004,x,y,-.369,steel);s.rotation.x=Math.PI/2;}
const serial=decal(lettering('HIRU INDUSTRIES',{size:28,sub:'MODEL HV-180  /  S/N 001-2026   •   AC 100V',w:512,h:160}),.286,.079,-.14,.737,-.368);serial.rotation.y=Math.PI;
const caution=decal(lettering('⚠  高温注意',{bg:'#dabb65',fg:'#34382a',size:40,sub:'CAUTION · KEEP VENTILATION CLEAR'}),.203,.055,.168,.75,-.368);caution.rotation.y=Math.PI;
wire([[.31,.218,-.377],[.32,.13,-.416],[.34,.026,-.48],[.53,.015,-.55],[.65,.016,-.44],[.62,.02,-.36]],.009,rubber);
box(.033,.023,.062,.62,.021,-.338,dark,.004);
box(.007,.015,.017,.611,.021,-.3,steel,.001);box(.007,.015,.017,.629,.021,-.3,steel,.001);
const power=decal(new THREE.MeshBasicMaterial({color:0x78da91}),.008,.008,.339,.219,-.372);power.rotation.y=Math.PI;
// Mascot: a sleepy sun printed on slightly yellowed paper.
const mascot=texture(256,256,(c)=>{c.clearRect(0,0,256,256);c.fillStyle='#f1dfb5';c.beginPath();c.arc(128,128,117,0,Math.PI*2);c.fill();c.strokeStyle='#ac533c';c.lineWidth=6;for(let i=0;i<10;i++){const a=i/10*Math.PI*2;c.beginPath();c.moveTo(128+Math.cos(a)*75,115+Math.sin(a)*75);c.lineTo(128+Math.cos(a)*88,115+Math.sin(a)*88);c.stroke();}c.fillStyle='#df9350';c.beginPath();c.arc(128,112,62,0,Math.PI*2);c.fill();c.strokeStyle='#794b36';c.lineWidth=5;for(const x of [106,150]){c.beginPath();c.arc(x,105,7,0,Math.PI);c.stroke();}c.beginPath();c.arc(128,123,15,0,Math.PI);c.stroke();c.fillStyle='#97593e';c.textAlign='center';c.font=`bold 17px ${font}`;c.fillText('いい日、ひる。',128,213);});
const mascotSticker=decal(new THREE.MeshStandardMaterial({map:mascot,transparent:true,roughness:.85}),.098,.098,-.363,.547,.403);mascotSticker.rotation.z=.08;
decal(lettering('♻  あきかんはリサイクル',{bg:'#cd2933',fg:'#f5dacc',size:32,sub:'PLEASE RECYCLE YOUR CAN & BOTTLE'}),.284,.044,-.067,.549,.402);
decal(lettering('省エネ  ★★★★★',{bg:'#e3e5c9',fg:'#41715b',size:31,sub:'ENERGY SAVING · ECO MODE'}),.142,.043,.337,.558,.403);
decal(lettering('HIRU  /  001',{bg:'#c2c9c3',fg:'#4b5b55',size:30,sub:'SINCE 1986 · MADE FOR EVERY DAY'}),.154,.035,.334,.229,.403);
const wear=mat('wear',0xe7aaa1,.78,.2);
for(let i=0;i<13;i++){const x=-.38+i*.06;const s=box(.006+(i%3)*.004,.0008,.0008,x,.179+(i%4)*.001,.401,wear,0);s.rotation.z=(i%3-.8)*.18;}
for(const y of [.23,.7,1.5])box(.008,.023,.029,.469,y,.317,rubber,.003);

// Batch static geometry by material. Labels are generated once and shared by repeats.
function batchStatic(root){
 const groups=new Map(),remove=[];root.updateMatrixWorld(true);
 root.traverse(o=>{if(!o.isMesh || Array.isArray(o.material) || o.material.transparent)return;let p=o;while(p&&p!==root){if(p.userData.dynamic)return;p=p.parent;}if(o===root)return;const key=o.material.uuid;if(!groups.has(key))groups.set(key,{material:o.material,geometries:[]});const g=o.geometry.clone();g.applyMatrix4(o.matrixWorld);if(g.index) {const n=g.toNonIndexed();g.dispose();groups.get(key).geometries.push(n);}else groups.get(key).geometries.push(g);remove.push(o);});
 for(const {material,geometries:gs}of groups.values()){const merged=mergeGeometries(gs,false);gs.forEach(g=>g.dispose());if(merged){const mesh=new THREE.Mesh(merged,material);mesh.castShadow=true;mesh.receiveShadow=true;scene.add(mesh);}}
 remove.forEach(o=>o.removeFromParent());
}
batchStatic(machine);

// 09 — Modest, slowly breathing emissive light keeps the object feeling alive.
const windowLight=new THREE.PointLight(0xd9efff,.055,.9,2);windowLight.position.set(-.13,1.35,.62);scene.add(windowLight);
const pickupLight=new THREE.PointLight(0xffd39a,.08,.4,2);pickupLight.position.set(-.074,.385,.51);scene.add(pickupLight);
let midnight=false,dispensed=null,dispenseTime=-99,flapTime=-99,elapsed=0,toastTimer,returning=false;
function toast(message){$('toast').textContent=message;$('toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('show'),3500);}
function setRotation(value){controls.autoRotate=value;$('rotate').setAttribute('aria-pressed',String(value));}
setRotation(controls.autoRotate);
controls.addEventListener('start',()=>{setRotation(false);returning=false;});
$('rotate').onclick=()=>setRotation(!controls.autoRotate);
$('reset').onclick=()=>{setRotation(false);returning=true;};
function zoom(factor){setRotation(false);returning=false;const offset=camera.position.clone().sub(controls.target);offset.setLength(THREE.MathUtils.clamp(offset.length()*factor,controls.minDistance,controls.maxDistance));camera.position.copy(controls.target).add(offset);controls.update();}
$('zoom-in').onclick=()=>zoom(.83);$('zoom-out').onclick=()=>zoom(1.2);
$('lighting').onclick=()=>{midnight=!midnight;$('view-name').textContent=midnight?'MIDNIGHT VIEW':'STUDIO VIEW';$('lighting').setAttribute('aria-label',midnight?'Switch to studio lighting':'Switch to midnight lighting');$('lighting').title=midnight?'Switch to studio lighting':'Switch to midnight lighting';$('lighting').setAttribute('aria-pressed',String(midnight));};
$('about').onclick=()=>$('details').showModal();$('close-details').onclick=()=>$('details').close();$('details').addEventListener('click',e=>{if(e.target===$('details')){const r=$('details').getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)$('details').close();}});
const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2();let pointerStart=null;
function hitAt(e){const r=renderer.domElement.getBoundingClientRect();pointer.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);raycaster.setFromCamera(pointer,camera);return raycaster.intersectObjects(selections,false)[0];}
renderer.domElement.addEventListener('pointerdown',e=>{pointerStart={x:e.clientX,y:e.clientY};});
renderer.domElement.addEventListener('pointermove',e=>{renderer.domElement.style.cursor=hitAt(e)?'pointer':e.buttons?'grabbing':'grab';});
renderer.domElement.addEventListener('pointerup',e=>{
 if(!pointerStart || Math.hypot(e.clientX-pointerStart.x,e.clientY-pointerStart.y)>6)return;
 const hit=hitAt(e);if(!hit)return;
 if(hit.object.userData.pickup){flapTime=elapsed;if(dispensed){toast('A little happiness. Enjoy your drink!');scene.remove(dispensed);dispensed=null;}else toast('Your refreshment starts with a selection above.');return;}
 const d=drinks[hit.object.userData.drinkIndex];if(d.soldOut){toast(`${d.name} is sold out. Try another little happiness.`);return;}
 if(elapsed-dispenseTime<1.5)return;
 amountDisplay(d.price,'ありがとうございます');dispenseTime=elapsed;hit.object.position.z-=.006;
 if(dispensed)scene.remove(dispensed);dispensed=makeDrink(d,scene);dispensed.position.set(-.09,.35,.449);dispensed.rotation.z=Math.PI/2;
 toast(`${d.name} · ¥${d.price} — ready in the pickup opening.`);
});
let mobile=false;
function resize(){const w=viewport.clientWidth,h=viewport.clientHeight;mobile=w<=650;renderer.setSize(w,h);camera.fov=mobile?38:32;camera.aspect=w/h;camera.setViewOffset(w,h,mobile?0:-w*.15,mobile?-h*.015:0,w,h);camera.updateProjectionMatrix();}
resize();window.addEventListener('resize',resize);
if(mobile){camera.position.set(2.1,1.55,4.3);camera.fov=38;controls.target.y=1.03;resize();}
const clock=new THREE.Clock();
const initialTarget=new THREE.Vector3(0,.94,0);
function animate(){requestAnimationFrame(animate);const dt=Math.min(clock.getDelta(),.05);elapsed+=dt;
 if(returning){const goal=new THREE.Vector3(.85,1.43,mobile?4.75:4.35);camera.position.lerp(goal,1-Math.exp(-dt*5));controls.target.lerp(initialTarget,1-Math.exp(-dt*5));if(camera.position.distanceTo(goal)<.005)returning=false;}
 controls.update(dt);
 const t=1-Math.exp(-dt*3),level=midnight?.35:1;
 key.intensity=THREE.MathUtils.lerp(key.intensity,2.5*level,t);fill.intensity=THREE.MathUtils.lerp(fill.intensity,1.1*level,t);rim.intensity=THREE.MathUtils.lerp(rim.intensity,2.3*(midnight?.6:1),t);
 scene.environmentIntensity=THREE.MathUtils.lerp(scene.environmentIntensity,midnight?.22:.62,t);ambient.intensity=THREE.MathUtils.lerp(ambient.intensity,midnight?.28:1.1,t);
 const breath=1+Math.sin(elapsed*.8)*.018+Math.sin(elapsed*2.13)*.004;headerMat.emissiveIntensity=.6*breath;blueLight.emissiveIntensity=1.15*breath;nfcMat.emissiveIntensity=.5+Math.sin(elapsed*1.5)*.1;
 const since=elapsed-dispenseTime;if(since>2.8&&since<3)amountDisplay();
 for(const {button,z}of buttonRecords)button.position.z=THREE.MathUtils.lerp(button.position.z,z,.09);
 if(dispensed)dispensed.position.y=.342+Math.max(0,.065-since*.17);
 const flapSince=elapsed-flapTime;flapPivot.rotation.x=flapSince<2?-Math.sin(Math.min(flapSince/2,1)*Math.PI)*1.08:0;
 renderer.render(scene,camera);
}
animate();
requestAnimationFrame(()=>$('loading').classList.add('loaded'));
renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();toast('The 3D view was interrupted. Reload to return to Hiru.');});
// A small read-only inspection surface for visual quality checks.
window.__hiru={renderer,scene,camera,controls,drinks,selections,projectButton(index){const p=selections[index].getWorldPosition(new THREE.Vector3()).project(camera);const r=renderer.domElement.getBoundingClientRect();return {x:r.left+(p.x+1)*r.width/2,y:r.top+(1-p.y)*r.height/2};}};
