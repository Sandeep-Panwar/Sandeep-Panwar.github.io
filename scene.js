import * as THREE from './vendor/three.module.js';
import { RoundedBoxGeometry } from './vendor/RoundedBoxGeometry.js';
import { RoomEnvironment } from './vendor/RoomEnvironment.js';

const host=document.querySelector('#scene');
const motion=document.querySelector('#motion');
const reduce=matchMedia('(prefers-reduced-motion: reduce)');
let renderer;
try {
 renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:'low-power'});
 renderer.setPixelRatio(Math.min(devicePixelRatio,1.7));
 renderer.setClearColor(0x000000,0);
 renderer.shadowMap.enabled=true;
 renderer.shadowMap.type=THREE.PCFShadowMap;
 renderer.toneMapping=THREE.ACESFilmicToneMapping;
 renderer.toneMappingExposure=.95;
 renderer.domElement.setAttribute('aria-hidden','true');
 renderer.domElement.className='three-canvas';
 host.prepend(renderer.domElement);
 const scene=new THREE.Scene();
 const pmrem=new THREE.PMREMGenerator(renderer);const room=new RoomEnvironment();scene.environment=pmrem.fromScene(room,.04).texture;room.dispose();pmrem.dispose();
 const camera=new THREE.PerspectiveCamera(36,1,.1,100);
 camera.position.set(0,3.2,13.5);camera.lookAt(0,0,0);
 const group=new THREE.Group();scene.add(group);
 const ambient=new THREE.HemisphereLight(0xf5efff,0x60557e,1.7);scene.add(ambient);
 const key=new THREE.DirectionalLight(0xffffff,3);key.position.set(3,8,5);key.castShadow=true;
 key.shadow.mapSize.set(1024,1024);key.shadow.camera.left=-9;key.shadow.camera.right=9;key.shadow.camera.top=9;key.shadow.camera.bottom=-9;key.shadow.normalBias=.04;scene.add(key);
 const rim=new THREE.DirectionalLight(0xb5a1ff,2.5);rim.position.set(-6,2,-4);scene.add(rim);
 const fill=new THREE.PointLight(0xd7ffb4,30,18);fill.position.set(5,-1,3);scene.add(fill);
 const floor=new THREE.Mesh(new THREE.PlaneGeometry(200,200),new THREE.ShadowMaterial({color:0x56406a,opacity:.16}));floor.rotation.x=-Math.PI/2;floor.position.y=-3.3;floor.receiveShadow=true;scene.add(floor);
 const glass=new THREE.MeshPhysicalMaterial({color:0x8962c7,flatShading:true,metalness:.32,roughness:.16,clearcoat:1,clearcoatRoughness:.08,transparent:true,opacity:.94});
 const core=new THREE.Mesh(new THREE.IcosahedronGeometry(1.65,1),glass);core.castShadow=true;group.add(core);
 const coreEdges=new THREE.LineSegments(new THREE.EdgesGeometry(core.geometry),new THREE.LineBasicMaterial({color:0xede2ff,transparent:true,opacity:.5}));core.add(coreEdges);
 const inner=new THREE.Mesh(new THREE.IcosahedronGeometry(.94,0),new THREE.MeshStandardMaterial({color:0xd6ffb9,metalness:.5,roughness:.24}));group.add(inner);
 const ringMaterial=new THREE.MeshStandardMaterial({color:0xc9bbdf,metalness:.65,roughness:.24});
 const rings=[];
 for(let i=0;i<3;i++){const ring=new THREE.Mesh(new THREE.TorusGeometry(2.4+i*.25,.017,8,160),ringMaterial);ring.rotation.set(Math.PI/2+i*.5,i*.7,i*.4);group.add(ring);rings.push(ring);}
 const entries=[['abap','ABAP OO','Reusable logic',0xa88ad9],['cds','CDS Views','Data models',0xd7c2ef],['amdp','AMDP','Database logic',0xb1d981],['odata','OData','Connected services',0x8ebfd4],['rap','ABAP RAP','Learning focus',0xc890ba]];
 const nodes=[],lines=[],labels=[];
 const rounded=new RoundedBoxGeometry(.95,.95,.95,3,.12);
 const lineMaterial=new THREE.LineBasicMaterial({color:0x9381ad,transparent:true,opacity:.35});
 entries.forEach((entry,i)=>{
  const mesh=new THREE.Mesh(rounded,new THREE.MeshPhysicalMaterial({color:entry[3],metalness:.42,roughness:.2,clearcoat:1,clearcoatRoughness:.1}));
  mesh.castShadow=true;mesh.userData={index:i,key:entry[0]};group.add(mesh);nodes.push(mesh);
  const line=new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(),new THREE.Vector3()]),lineMaterial);group.add(line);lines.push(line);
  const label=document.createElement('button');label.type='button';label.className='world-label';label.setAttribute('aria-label',`Select ${entry[1]} in the 3D landscape`);label.innerHTML=`<span class="world-index">0${i+1}</span><strong>${entry[1]}</strong><small>${entry[2]}</small>`;host.append(label);labels.push(label);label.addEventListener('click',()=>select(i));
 });
 const sparkPositions=new Float32Array(70*3);for(let i=0;i<70;i++){const angle=i*2.39996,r=4+(i%7)*.3;sparkPositions[i*3]=Math.cos(angle)*r;sparkPositions[i*3+1]=((i*17)%53)/10-2.6;sparkPositions[i*3+2]=Math.sin(angle)*r;}
 const sparks=new THREE.Points(new THREE.BufferGeometry().setAttribute('position',new THREE.BufferAttribute(sparkPositions,3)),new THREE.PointsMaterial({color:0x9781b4,size:.028,transparent:true,opacity:.5}));scene.add(sparks);
 let mode='connected',selected=-1,paused=reduce.matches||document.body.classList.contains('motion-paused'),visible=true,raf=0,last=0,time=0,targetX=0,targetY=0,dragging=false,lastPointer={x:0,y:0};
 const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2(),projected=new THREE.Vector3();
 const targetPositions=nodes.map(()=>new THREE.Vector3());
 function setTargets(){nodes.forEach((node,i)=>{const a=i*Math.PI*2/5+.2;const r=mode==='expanded'?4.35:3.45;if(mode==='stacked')targetPositions[i].set((i%2?1:-1)*1.7,2.4-i*1.2,Math.sin(i)*.5);else targetPositions[i].set(Math.cos(a)*r,Math.sin(a)*2.05,Math.sin(a*2)*.7);});}
 setTargets();nodes.forEach((n,i)=>n.position.copy(targetPositions[i]));
 const hud=document.querySelector('#scene-insight');hud.querySelector('button').addEventListener('click',()=>{hud.hidden=true;selected=-1;labels.forEach(l=>l.setAttribute('aria-pressed','false'));wake();});
 function select(i){selected=i;const e=entries[i];host.dataset.selectedTech=e[0];hud.querySelector('strong').textContent=e[1];hud.querySelector('p').textContent=['Object-oriented components that turn requirements into maintainable business logic.','CDS models bring useful structure to business data.','ABAP Managed Database Procedures support database-side processing.','OData services connect SAP data to consuming applications.','ABAP RESTful Application Programming Model is my next learning focus.'][i];hud.querySelector('a').dataset.sceneTech=e[0];hud.hidden=false;labels.forEach((l,j)=>l.setAttribute('aria-pressed',String(j===i)));wake();}
 hud.querySelector('a').addEventListener('click',()=>{const tab=document.querySelector(`.stack-select [data-tech="${hud.querySelector('a').dataset.sceneTech}"]`);tab?.click();});
 document.querySelectorAll('[data-view]').forEach(button=>button.addEventListener('click',()=>{mode=button.dataset.view;setTargets();resize();host.dataset.arrangement=mode;wake();}));
 function resize(){const r=host.getBoundingClientRect();renderer.setSize(r.width,r.height,false);camera.aspect=r.width/r.height;camera.position.z=r.width<600?(mode==='expanded'?25:20):(mode==='expanded'?16.5:13.5);camera.updateProjectionMatrix();wake();}
 function wake(){if(!raf&&visible&&!document.hidden)raf=requestAnimationFrame(render);}
 function render(stamp){raf=0;const dt=Math.min((stamp-last)/1000||.016,.04);last=stamp;paused=reduce.matches||document.body.classList.contains('motion-paused');if(!paused)time+=dt;
  const ease=1-Math.exp(-dt*6);group.rotation.x=THREE.MathUtils.lerp(group.rotation.x,targetX,ease);group.rotation.y=THREE.MathUtils.lerp(group.rotation.y,targetY+(paused?0:Math.sin(time*.15)*.09),ease);
  core.rotation.y=time*.16;core.rotation.z=Math.sin(time*.2)*.12;inner.rotation.set(time*.12,-time*.22,.2);core.scale.setScalar(mode==='expanded'?.85:1);
  let moving=false;nodes.forEach((node,i)=>{const target=targetPositions[i].clone();if(!paused)target.y+=Math.sin(time*.8+i)*.08;if(node.position.distanceTo(target)>.003)moving=true;node.position.lerp(target,ease);node.rotation.set(time*.12+i*.2,time*.15+i*.3,Math.sin(time*.3+i)*.12);const active=selected===i;node.material.emissive.setHex(active?0x6b498c:0);node.material.emissiveIntensity=active?.14:0;if(Math.abs(node.scale.x-(active?1.17:1))>.003)moving=true;node.scale.lerp(new THREE.Vector3().setScalar(active?1.17:1),ease);
   const a=lines[i].geometry.attributes.position;a.setXYZ(1,node.position.x,node.position.y,node.position.z);a.needsUpdate=true;
   node.getWorldPosition(projected);projected.project(camera);const x=THREE.MathUtils.clamp((projected.x*.5+.5)*host.clientWidth,55,host.clientWidth-55),y=(-projected.y*.5+.5)*host.clientHeight;labels[i].style.transform=`translate(${x}px,${y+33}px) translate(-50%,0)`;
  });
  rings.forEach((ring,i)=>{ring.rotation.z=time*.06*(i%2?1:-1)+i*.5;ring.scale.setScalar(mode==='expanded'?1.22:mode==='stacked'?.8:1);});sparks.rotation.y=time*.015;renderer.render(scene,camera);
  if(visible&&!document.hidden&&(!paused||moving||Math.abs(group.rotation.x-targetX)+Math.abs(group.rotation.y-targetY)>.005))wake();
 }
 host.addEventListener('pointermove',event=>{if(event.target.closest('button,a'))return;const r=host.getBoundingClientRect();pointer.set((event.clientX-r.left)/r.width*2-1,-((event.clientY-r.top)/r.height)*2+1);if(dragging){targetY+=(event.clientX-lastPointer.x)*.006;targetX=THREE.MathUtils.clamp(targetX+(event.clientY-lastPointer.y)*.003,-.4,.4);}else if(!paused&&event.pointerType!=='touch'){targetY=pointer.x*.16;targetX=-pointer.y*.06;}lastPointer={x:event.clientX,y:event.clientY};wake();});
 host.addEventListener('pointerdown',event=>{if(event.target.closest('button,a')||event.pointerType==='touch')return;dragging=true;lastPointer={x:event.clientX,y:event.clientY};host.setPointerCapture(event.pointerId);});
 host.addEventListener('pointerup',event=>{dragging=false;if(host.hasPointerCapture(event.pointerId))host.releasePointerCapture(event.pointerId);});
 host.addEventListener('click',event=>{if(event.target.closest('button,a'))return;const r=host.getBoundingClientRect();pointer.set((event.clientX-r.left)/r.width*2-1,-((event.clientY-r.top)/r.height)*2+1);raycaster.setFromCamera(pointer,camera);const hit=raycaster.intersectObjects(nodes);if(hit.length)select(hit[0].object.userData.index);});
 host.addEventListener('keydown',event=>{if(event.target!==host||!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key))return;event.preventDefault();targetY+=event.key==='ArrowLeft'?-.15:event.key==='ArrowRight'?.15:0;targetX=THREE.MathUtils.clamp(targetX+(event.key==='ArrowUp'?-.1:event.key==='ArrowDown'?.1:0),-.4,.4);wake();});
 motion.addEventListener('click',wake);reduce.addEventListener('change',wake);new ResizeObserver(resize).observe(host);
 new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;if(visible){last=performance.now();wake();}},{rootMargin:'100px'}).observe(host);document.addEventListener('visibilitychange',()=>{if(!document.hidden){last=performance.now();wake();}});
 renderer.domElement.addEventListener('webglcontextlost',event=>{event.preventDefault();host.classList.remove('webgl-ready');host.dataset.renderer='fallback';if(raf)cancelAnimationFrame(raf);raf=0;});
 resize();host.classList.add('webgl-ready');host.dataset.renderer='threejs';document.querySelector('#render-status').textContent='/ SELECT · ROTATE · DISCOVER';wake();
} catch(error) {
 renderer?.dispose();renderer?.domElement.remove();host.dataset.renderer='fallback';
 console.warn('3D preview unavailable; showing the lightweight sculpture.');
}

