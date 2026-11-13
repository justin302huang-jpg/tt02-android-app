// TT-02 改裝助手：3D 展示（Three.js）。內建模型為程式生成的 Porsche 911 GT3 風格示意車，不是原廠 CAD。
import * as THREE from './vendor/three-bundle.min.js';
const {OrbitControls,GLTFLoader,RoomEnvironment}=THREE;
const $=id=>document.getElementById(id);
const wrap=$('model3d');
let renderer,scene,camera,controls,builtin,custom=null,paintMat,rimMat,wheels=[],autoRotate=true,needs=true;

function sideProfile(){
  // 側面輪廓（x：車頭 0 → 車尾 4.5，y：高度），下緣包含前後輪拱。
  const s=new THREE.Shape();
  const fx=0.98, rx=3.42, wr=0.43, wy=0.36;
  s.moveTo(0.06,0.22);
  s.bezierCurveTo(-0.02,0.30,-0.02,0.42,0.08,0.48);        // 前保桿
  s.bezierCurveTo(0.35,0.60,0.85,0.68,1.40,0.74);           // 低矮前蓋
  s.lineTo(1.55,0.76);
  s.lineTo(4.18,0.84);                                        // 腰線（後方由座艙蓋住）
  s.bezierCurveTo(4.40,0.90,4.50,0.86,4.52,0.80);           // 鴨尾
  s.bezierCurveTo(4.56,0.62,4.54,0.40,4.46,0.22);           // 車尾
  // 下緣：後輪拱 → 側裙 → 前輪拱
  s.lineTo(rx+wr+0.02,0.22);
  s.absarc(rx,wy,wr,0,Math.PI,false);
  s.lineTo(fx+wr+0.02,0.20);
  s.absarc(fx,wy,wr,0,Math.PI,false);
  s.lineTo(0.06,0.22);
  return s;
}
function cabinProfile(){
  const s=new THREE.Shape();
  s.moveTo(1.52,0.74);
  s.bezierCurveTo(1.80,0.98,2.05,1.20,2.30,1.24);           // 擋風玻璃
  s.bezierCurveTo(2.60,1.29,2.90,1.27,3.10,1.20);           // 車頂
  s.bezierCurveTo(3.50,1.07,3.90,0.95,4.25,0.86);           // 斜背
  s.lineTo(4.25,0.72);s.lineTo(1.52,0.72);
  return s;
}
function windowShape(){
  const s=new THREE.Shape();
  s.moveTo(1.78,0.88);
  s.bezierCurveTo(1.98,1.03,2.15,1.15,2.34,1.18);
  s.bezierCurveTo(2.62,1.22,2.88,1.20,3.05,1.14);
  s.bezierCurveTo(3.32,1.04,3.55,0.96,3.70,0.90);
  s.lineTo(1.78,0.88);
  return s;
}
function extrude(shape,depth,bevel,mat){
  const g=new THREE.ExtrudeGeometry(shape,{depth,bevelEnabled:true,bevelThickness:bevel,bevelSize:bevel*0.8,bevelSegments:5,curveSegments:28});
  g.translate(0,0,-depth/2);
  return new THREE.Mesh(g,mat);
}
function makeWheel(){
  const g=new THREE.Group();
  const tire=new THREE.Mesh(new THREE.TorusGeometry(0.29,0.11,16,40),new THREE.MeshStandardMaterial({color:0x151515,roughness:.9}));
  const tread=new THREE.Mesh(new THREE.CylinderGeometry(0.39,0.39,0.26,40,1,true),new THREE.MeshStandardMaterial({color:0x111111,roughness:.95,side:THREE.DoubleSide}));
  tread.rotation.x=Math.PI/2;
  g.add(tire,tread);
  const barrel=new THREE.Mesh(new THREE.CylinderGeometry(0.28,0.28,0.22,32,1,true),new THREE.MeshStandardMaterial({color:0x222222,metalness:.6,roughness:.4,side:THREE.DoubleSide}));
  barrel.rotation.x=Math.PI/2;g.add(barrel);
  const face=new THREE.Group();
  const hub=new THREE.Mesh(new THREE.CylinderGeometry(0.07,0.07,0.06,6),rimMat);hub.rotation.x=Math.PI/2;face.add(hub);
  for(let i=0;i<10;i++){ // 10 輻（5 組雙輻），中央單鎖
    const sp=new THREE.Mesh(new THREE.BoxGeometry(0.035,0.24,0.03),rimMat);
    const a=i/10*Math.PI*2+(i%2?0.12:0);
    sp.position.set(Math.sin(a)*0.15,Math.cos(a)*0.15,0);sp.rotation.z=-a;face.add(sp);
  }
  const lip=new THREE.Mesh(new THREE.TorusGeometry(0.275,0.018,8,40),rimMat);face.add(lip);
  const caliper=new THREE.Mesh(new THREE.BoxGeometry(0.12,0.16,0.05),new THREE.MeshStandardMaterial({color:0xd8b400,roughness:.4}));
  caliper.position.set(0.17,0.12,-0.04);face.add(caliper);
  g.add(face);g.userData.face=face;
  return g;
}
function buildCar(){
  const car=new THREE.Group();
  paintMat=new THREE.MeshPhysicalMaterial({color:0x1e63c6,metalness:.55,roughness:.32,clearcoat:1,clearcoatRoughness:.06});
  rimMat=new THREE.MeshStandardMaterial({color:0x2a2d31,metalness:.85,roughness:.3});
  const glass=new THREE.MeshPhysicalMaterial({color:0x0c1218,metalness:.1,roughness:.05,clearcoat:1,transparent:true,opacity:.92});
  const black=new THREE.MeshStandardMaterial({color:0x0d0f12,roughness:.6});
  const body=extrude(sideProfile(),1.66,0.14,paintMat);car.add(body);
  const cabin=extrude(cabinProfile(),1.18,0.16,paintMat);car.add(cabin);
  // 玻璃：側窗、擋風、後窗
  for(const z of [-1,1]){const w=new THREE.Mesh(new THREE.ExtrudeGeometry(windowShape(),{depth:0.02,bevelEnabled:false,curveSegments:24}),glass);w.position.z=z*(0.59+0.165)-(z<0?0.02:0);car.add(w);}
  const pane=(x1,y1,x2,y2,w,off)=>{const dx=x2-x1,dy=y2-y1,len=Math.hypot(dx,dy),a=Math.atan2(dy,dx);const m=new THREE.Mesh(new THREE.BoxGeometry(len,0.02,w),glass);m.rotation.z=a;m.position.set((x1+x2)/2-Math.sin(a)*off,(y1+y2)/2+Math.cos(a)*off,0);return m};
  car.add(pane(1.60,0.80,2.28,1.23,1.30,0.19));   // 擋風玻璃
  car.add(pane(3.20,1.17,3.95,0.94,1.10,0.19));   // 後窗
  // 911 招牌：高於前蓋的前葉子板與寬體後葉子板
  const bulge=(x,y,z,sx,sy,sz)=>{const m=new THREE.Mesh(new THREE.SphereGeometry(1,40,24),paintMat);m.scale.set(sx,sy,sz);m.position.set(x,y,z);return m};
  for(const z of [-1,1]){car.add(bulge(0.95,0.60,z*0.70,0.88,0.22,0.24));car.add(bulge(3.40,0.68,z*0.74,1.0,0.25,0.28));}
  // 圓形大燈
  const lightMat=new THREE.MeshStandardMaterial({color:0xe9f2ff,emissive:0x9fc4ff,emissiveIntensity:.6,roughness:.15});
  for(const z of [-.60,.60]){const h=new THREE.Mesh(new THREE.SphereGeometry(0.16,24,16),lightMat);h.scale.set(0.75,0.95,0.95);h.position.set(0.16,0.64,z*1.17);h.rotation.z=-0.55;car.add(h);}
  // 貫穿式尾燈
  const tail=new THREE.Mesh(new THREE.BoxGeometry(0.03,0.05,1.6),new THREE.MeshStandardMaterial({color:0xff2020,emissive:0xff0000,emissiveIntensity:1.2}));tail.position.set(4.665,0.72,0);car.add(tail);
  // 前下巴、側裙、後擴散器、進氣口
  const lip=new THREE.Mesh(new THREE.BoxGeometry(0.22,0.05,1.8),black);lip.position.set(-0.04,0.19,0);car.add(lip);
  for(const z of [-1,1]){const sk=new THREE.Mesh(new THREE.BoxGeometry(1.5,0.07,0.06),black);sk.position.set(2.2,0.22,z*0.97);car.add(sk);}
  const dif=new THREE.Mesh(new THREE.BoxGeometry(0.3,0.16,1.4),black);dif.position.set(4.56,0.27,0);car.add(dif);
  for(const z of [-.55,0,.55]){const g=new THREE.Mesh(new THREE.BoxGeometry(0.05,0.12,z?0.42:0.6),black);g.position.set(-0.11,0.33,z);car.add(g);}
  // 後視鏡
  for(const z of [-1,1]){const m=new THREE.Mesh(new THREE.BoxGeometry(0.16,0.09,0.16),paintMat);m.position.set(1.85,0.88,z*0.86);car.add(m);}
  // GT3 鵝頸式尾翼
  const wing=new THREE.Mesh(new THREE.BoxGeometry(0.42,0.035,1.86),black);wing.position.set(4.42,1.30,0);wing.rotation.z=0.10;car.add(wing);
  for(const z of [-1,1]){const ep=new THREE.Mesh(new THREE.BoxGeometry(0.46,0.16,0.02),black);ep.position.set(4.42,1.27,z*0.94);car.add(ep);
    const st=new THREE.Mesh(new THREE.BoxGeometry(0.05,0.44,0.04),black);st.position.set(4.28,1.08,z*0.33);st.rotation.z=-0.35;car.add(st);}
  // 輪胎
  wheels=[];
  for(const [x,z] of [[0.98,-0.83],[0.98,0.83],[3.42,-0.86],[3.42,0.86]]){const w=makeWheel();w.position.set(x,0.38,z);if(z<0)w.rotation.y=Math.PI;car.add(w);wheels.push(w);}
  car.position.set(-2.27,0,0);
  const root=new THREE.Group();root.add(car);
  root.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true}});
  return root;
}
function fitObject(obj){
  const box=new THREE.Box3().setFromObject(obj),size=box.getSize(new THREE.Vector3()),c=box.getCenter(new THREE.Vector3());
  const k=4.5/Math.max(size.x,size.z,0.001);obj.scale.setScalar(k);
  const b2=new THREE.Box3().setFromObject(obj),c2=b2.getCenter(new THREE.Vector3());
  obj.position.x-=c2.x;obj.position.z-=c2.z;obj.position.y-=b2.min.y;
}
function init(){
  renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true,alpha:false});
  renderer.setPixelRatio(Math.min(devicePixelRatio,2));
  renderer.shadowMap.enabled=true;renderer.toneMapping=THREE.ACESFilmicToneMapping;
  wrap.appendChild(renderer.domElement);
  scene=new THREE.Scene();scene.background=new THREE.Color(0x111b24);
  const pm=new THREE.PMREMGenerator(renderer);scene.environment=pm.fromScene(new RoomEnvironment(),0.04).texture;scene.environmentIntensity=0.55;
  camera=new THREE.PerspectiveCamera(35,1,0.1,100);camera.position.set(-5.6,2.3,5.6);
  controls=new OrbitControls(camera,renderer.domElement);controls.target.set(0,0.6,0);controls.enableDamping=true;controls.minDistance=3.5;controls.maxDistance=16;controls.maxPolarAngle=Math.PI*0.49;
  controls.addEventListener('start',()=>{autoRotate=false;$('model3dSpin').textContent='自動旋轉：關'});
  const sun=new THREE.DirectionalLight(0xffffff,2.2);sun.position.set(-4,8,5);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);Object.assign(sun.shadow.camera,{left:-5,right:5,top:5,bottom:-5});scene.add(sun,new THREE.HemisphereLight(0xbfd8ff,0x223040,0.6));
  const ground=new THREE.Mesh(new THREE.CircleGeometry(9,64),new THREE.MeshStandardMaterial({color:0x0d141a,roughness:1}));ground.rotation.x=-Math.PI/2;ground.receiveShadow=true;scene.add(ground);
  const grid=new THREE.GridHelper(18,36,0x1f2c37,0x17222b);grid.position.y=0.002;scene.add(grid);
  builtin=buildCar();scene.add(builtin);
  new ResizeObserver(resize).observe(wrap);resize();
  renderer.setAnimationLoop(()=>{if(autoRotate){const a=0.004;const p=camera.position.clone().sub(controls.target);p.applyAxisAngle(new THREE.Vector3(0,1,0),a);camera.position.copy(controls.target).add(p)}controls.update();renderer.render(scene,camera)});
}
function resize(){const w=wrap.clientWidth||400,h=Math.round(Math.min(w*0.68,460));renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix()}
function update({body,rim,tire,rotate}={}){
  if(!paintMat)return;
  if(body)paintMat.color.set(body);
  if(rim)rimMat.color.set(rim);
  const t=(+tire||100)/100;wheels.forEach(w=>{w.scale.set(t,t,1);w.position.y=0.38*t});
  if(rotate!==undefined)builtin.rotation.y=THREE.MathUtils.degToRad(+rotate*2);
}
// ---- 自訂 GLB 模型（IndexedDB：tt02-assistant-model3d-v1）----
function mdb(){return new Promise((res,rej)=>{const r=indexedDB.open('tt02-assistant-model3d-v1',1);r.onupgradeneeded=()=>r.result.createObjectStore('models',{keyPath:'id'});r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)})}
async function mget(){const d=await mdb();return new Promise((res,rej)=>{const q=d.transaction('models').objectStore('models').get('custom');q.onsuccess=()=>res(q.result);q.onerror=()=>rej(q.error)})}
async function mput(v){const d=await mdb();return new Promise((res,rej)=>{const q=d.transaction('models','readwrite').objectStore('models').put(v);q.onsuccess=()=>res();q.onerror=()=>rej(q.error)})}
async function mdel(){const d=await mdb();return new Promise((res,rej)=>{const q=d.transaction('models','readwrite').objectStore('models').delete('custom');q.onsuccess=()=>res();q.onerror=()=>rej(q.error)})}
async function showCustom(buf,name){
  const gltf=await new GLTFLoader().parseAsync(buf,'');
  if(custom)scene.remove(custom);
  custom=gltf.scene;custom.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true}});
  fitObject(custom);scene.add(custom);builtin.visible=false;
  $('model3dStatus').textContent='目前顯示你的模型：'+name+'（顏色與輪胎設定只套用在內建模型）';$('model3dBuiltin').hidden=false;
}
$('model3dFile').onchange=async e=>{const f=e.target.files[0];if(!f)return;
  if(f.size>40*1024*1024){alert('模型檔需小於 40 MB。');return}
  try{const buf=await f.arrayBuffer();await showCustom(buf,f.name);await mput({id:'custom',name:f.name,data:buf,savedAt:new Date().toISOString()})}
  catch(err){alert('模型載入失敗：'+(err.message||err)+'\n請使用單一 .glb 檔（貼圖已內嵌）。')}finally{e.target.value=''}};
$('model3dBuiltin').onclick=async()=>{if(!confirm('移除匯入的模型，改回內建 911 GT3 示意車？'))return;if(custom){scene.remove(custom);custom=null}builtin.visible=true;await mdel();$('model3dBuiltin').hidden=true;$('model3dStatus').textContent='目前顯示內建 Porsche 911 GT3 風格示意車。'};
$('model3dSpin').onclick=()=>{autoRotate=!autoRotate;$('model3dSpin').textContent='自動旋轉：'+(autoRotate?'開':'關')};
$('model3dShot').onclick=()=>{renderer.render(scene,camera);const a=document.createElement('a');a.href=renderer.domElement.toDataURL('image/png');a.download='tt02-911gt3-'+Date.now()+'.png';a.click()};
$('model3dReset').onclick=()=>{camera.position.set(-5.6,2.3,5.6);controls.target.set(0,0.6,0)};
init();
window.TT3D={update};
document.dispatchEvent(new Event('tt3d-ready'));
try{const saved=await mget();if(saved?.data)await showCustom(saved.data,saved.name)}catch(e){console.warn(e)}
