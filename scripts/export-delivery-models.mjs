import { readFile, mkdir, writeFile } from 'node:fs/promises';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';

globalThis.FileReader ??= class {
  readAsArrayBuffer(blob) { blob.arrayBuffer().then(result => { this.result = result; this.onloadend?.(); }); }
  readAsDataURL(blob) { blob.arrayBuffer().then(result => { this.result = `data:${blob.type};base64,${Buffer.from(result).toString('base64')}`; this.onloadend?.(); }); }
};
const destination = 'deliverables/models';
await mkdir(destination, { recursive: true });
const report = [];
for (const [kind, extent] of [['habitat',20],['greenhouse',12.5],['astronaut',2.7],['rover',7]]) {
  const data = await readFile(`public/models/${kind}-scene.glb`);
  const gltf = await new GLTFLoader().parseAsync(data.buffer.slice(data.byteOffset,data.byteOffset+data.byteLength),'');
  const root = gltf.scene;
  const bounds = new THREE.Box3().setFromObject(root), size = bounds.getSize(new THREE.Vector3()), center = bounds.getCenter(new THREE.Vector3());
  const scale = extent / (kind === 'astronaut' ? size.y : Math.max(size.x,size.z));
  root.scale.setScalar(scale);
  root.position.set(-center.x*scale,-bounds.min.y*scale,-center.z*scale);
  let triangles=0;
  root.traverse(object=>{
    if(!object.isMesh)return;
    const positions=object.geometry.getAttribute('position');
    object.geometry.computeBoundingBox();
    const b=object.geometry.boundingBox;
    const colors=new Float32Array(positions.count*3);
    const ivory=new THREE.Color('#dfd2b8'),dark=new THREE.Color('#283441'),gold=new THREE.Color('#bb843c'),steel=new THREE.Color('#687783');
    for(let i=0;i<positions.count;i++){
      const y=(positions.getY(i)-b.min.y)/(b.max.y-b.min.y);
      const side=Math.abs(positions.getX(i)-(b.min.x+b.max.x)/2)/(b.max.x-b.min.x);
      let color=ivory;
      if(kind==='rover'){
        if(y<.27&&side>.22)color=dark;
        else if(y<.36)color=steel;
        else if(y>.65&&y<.76)color=gold;
      } else if((kind==='habitat'||kind==='greenhouse')&&y>.4&&y<.48)color=steel;
      else if(kind==='astronaut'&&y<.13)color=dark;
      color.toArray(colors,i*3);
    }
    object.geometry.setAttribute('color',new THREE.BufferAttribute(colors,3));
    object.material=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.8,metalness:.12});
    triangles+=(object.geometry.index?.count??positions.count)/3;
  });
  const buffer=await new GLTFExporter().parseAsync(root,{binary:true});
  await writeFile(`${destination}/${kind}.glb`,Buffer.from(buffer));
  // Validate the exported GLB through the same loader used in the game.
  const checked=await new GLTFLoader().parseAsync(buffer,'');
  const outputBounds=new THREE.Box3().setFromObject(checked.scene);
  if(outputBounds.isEmpty())throw new Error(`Empty model: ${kind}`);
  report.push({file:`${kind}.glb`,bytes:buffer.byteLength,triangles,size:outputBounds.getSize(new THREE.Vector3()).toArray()});
}
await writeFile(`${destination}/model-manifest.json`,JSON.stringify(report,null,2));
console.log(JSON.stringify(report));
