"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

function disposeModel(root: THREE.Object3D) {
  const textures = new Set<THREE.Texture>();
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    object.geometry.dispose();
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    for (const material of materials) {
      for (const value of Object.values(material)) {
        if (value instanceof THREE.Texture) textures.add(value);
      }
      material.dispose();
    }
  });
  for (const texture of textures) {
    texture.dispose();
    if (typeof ImageBitmap !== "undefined" && texture.image instanceof ImageBitmap) texture.image.close();
  }
}

function colorRover(root: THREE.Object3D) {
  const body = new THREE.Color("#d7c7a6");
  const wheels = new THREE.Color("#30363b");
  const machinery = new THREE.Color("#667582");
  const trim = new THREE.Color("#bb833d");
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    const positions = object.geometry.getAttribute("position");
    object.geometry.computeBoundingBox();
    const bounds = object.geometry.boundingBox!;
    const height = bounds.max.y - bounds.min.y;
    const width = bounds.max.x - bounds.min.x;
    const centerX = (bounds.min.x + bounds.max.x) / 2;
    const colors = new Float32Array(positions.count * 3);
    // Hunyuan returned one fused mesh. Color regions by height and lateral position.
    for (let index = 0; index < positions.count; index++) {
      const y = (positions.getY(index) - bounds.min.y) / height;
      const side = Math.abs(positions.getX(index) - centerX) / width;
      let color = body;
      if (y < 0.27 && side > 0.22) color = wheels;
      else if (y < 0.36) color = machinery;
      else if (y > 0.65 && y < 0.76) color = trim;
      color.toArray(colors, index * 3);
    }
    object.geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    const oldMaterials = Array.isArray(object.material) ? object.material : [object.material];
    oldMaterials.forEach((material: THREE.Material) => material.dispose());
    object.material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.72, metalness: 0.25 });
  });
}

export default function RoverViewer({ modelUrl = "/models/rover.glb", label = "Rover" }: { modelUrl?: string; label?: string }) {
  const host = useRef<HTMLDivElement>(null);
  const reset = useRef<() => void>(() => {});
  const [attempt, setAttempt] = useState(0);
  const [status, setStatus] = useState("Loading 3D model…");
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const container = host.current;
    if (!container) return;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch {
      const failure = window.setTimeout(() => {
        setStatus("3D preview is unavailable on this device.");
        setFailed(true);
      }, 0);
      return () => window.clearTimeout(failure);
    }
    let active = true;
    let model: THREE.Object3D | undefined;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, 1, 0.01, 100);
    camera.position.set(2, 1.3, 2);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.domElement.setAttribute("aria-label", `${label} 3D preview. Drag to rotate, pinch or scroll to zoom.`);
    renderer.domElement.style.touchAction = "none";
    container.appendChild(renderer.domElement);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enablePan = false;
    controls.minDistance = 1.4;
    controls.maxDistance = 8;
    scene.add(new THREE.HemisphereLight(0xffffff, 0x684b38, 1.5));
    const light = new THREE.DirectionalLight(0xffeadb, 2.5);
    light.position.set(3, 5, 4);
    scene.add(light);
    const render = () => renderer.render(scene, camera);
    controls.addEventListener("change", render);
    const resize = () => {
      const width = container.clientWidth;
      const height = container.clientHeight;
      camera.aspect = width / Math.max(height, 1);
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
      render();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(container);
    resize();
    reset.current = () => controls.reset();
    const onContextLost = (event: Event) => {
      event.preventDefault();
      setFailed(true);
      setStatus("3D preview was interrupted. Please retry.");
    };
    renderer.domElement.addEventListener("webglcontextlost", onContextLost);
    new GLTFLoader().load(modelUrl, (gltf) => {
      if (!active) {
        disposeModel(gltf.scene);
        return;
      }
      model = gltf.scene;
      if (modelUrl === "/models/rover.glb") colorRover(model);
      const bounds = new THREE.Box3().setFromObject(model);
      const size = bounds.getSize(new THREE.Vector3());
      const longest = Math.max(size.x, size.y, size.z);
      if (!Number.isFinite(longest) || longest <= 0) {
        setFailed(true);
        setStatus("The 3D model could not be displayed.");
        return;
      }
      const center = bounds.getCenter(new THREE.Vector3());
      model.scale.multiplyScalar(2 / longest);
      model.position.addScaledVector(center, -2 / longest);
      scene.add(model);
      controls.update();
      controls.saveState();
      setStatus("");
      render();
    }, undefined, () => {
      if (!active) return;
      setFailed(true);
      setStatus(`The ${label.toLowerCase()} model is unavailable. Please retry.`);
    });
    return () => {
      active = false;
      observer.disconnect();
      controls.dispose();
      renderer.domElement.removeEventListener("webglcontextlost", onContextLost);
      if (model) disposeModel(model);
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
      reset.current = () => {};
    };
  }, [attempt, modelUrl, label]);

  return (
    <section className="mb-4 overflow-hidden rounded-md border border-slate-300 bg-slate-100" aria-label={`Inspect ${label.toLowerCase()}`}>
      <div className="relative">
        <div ref={host} className="h-56 w-full sm:h-64" />
        {status && <div role="status" className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-100/95 px-4 text-center text-sm text-slate-700">
          <span>{status}</span>
          {failed && <button type="button" className="min-h-11 rounded bg-sky-700 px-4 text-white" onClick={() => { setFailed(false); setStatus("Loading 3D model…"); setAttempt((value) => value + 1); }}>Retry 3D preview</button>}
        </div>}
      </div>
      <div className="flex items-center justify-between gap-2 border-t border-slate-200 px-3 text-xs text-slate-600">
        <span>Drag to rotate · Pinch or scroll to zoom</span>
        <button type="button" disabled={!!status} onClick={() => reset.current()} className="min-h-11 shrink-0 px-2 font-semibold text-sky-800 disabled:opacity-40">Reset view</button>
      </div>
    </section>
  );
}
