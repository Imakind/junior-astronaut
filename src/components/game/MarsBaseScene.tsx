"use client";

import { useEffect, useRef, useState } from "react";
import { Sun, Battery, Bot, Sprout, House, X } from "lucide-react";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { useGame } from "@/lib/game-store";
import { BUILD_SITES, type BuildDevice } from "@/lib/building-catalog";

type Site = "solar" | "battery" | "rover" | "greenhouse" | "habitat";
const siteIcons = { solar: Sun, battery: Battery, rover: Bot, greenhouse: Sprout, habitat: House };
const locations: Record<Site, [number, number, number]> = {
  solar: [-22, 2, 1], battery: [-12, 2, 16], rover: [20, 2, 15],
  greenhouse: [11, 5, -6], habitat: [-4, 7, -7],
};

function sitePosition(site: Site): THREE.Vector3 {
  if (site === "solar" || site === "battery" || site === "greenhouse") {
    const s = useGame.getState();
    const slot = s.placements[site] ?? (s.construction?.device === site ? s.construction.slot : 0);
    const [x, z] = BUILD_SITES[site][slot].position;
    return new THREE.Vector3(x, locations[site][1], z);
  }
  return new THREE.Vector3(...locations[site]);
}

function activate(site: Site) {
  const s = useGame.getState();
  const building = s.discovery !== "ready";
  if (site === "solar") {
    if (s.discovery === "base") s.selectBuild("solar");
    else if (building) s.wirePanel();
    else s.openModal("solar");
  } else if (site === "battery") {
    if (s.discovery === "problem") s.selectBuild("battery");
    else if (building) { if (s.baseConnected) s.chargeStorage(); else s.connectBase(); }
    else s.openModal("battery");
  } else if (site === "rover") s.openModal("robot");
  else if (site === "greenhouse") s.openModal("greenhouse");
  else s.openModal("science");
}

function release(root: THREE.Object3D) {
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  const textures = new Set<THREE.Texture>();
  root.traverse(object => {
    if (!(object instanceof THREE.Mesh || object instanceof THREE.Line)) return;
    geometries.add(object.geometry);
    for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
      materials.add(material);
      for (const value of Object.values(material)) if (value instanceof THREE.Texture) textures.add(value);
    }
  });
  geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose()); textures.forEach(t => t.dispose());
}

function prepareModel(root: THREE.Object3D, kind: string, extent: number) {
  const bounds = new THREE.Box3().setFromObject(root);
  const size = bounds.getSize(new THREE.Vector3());
  const center = bounds.getCenter(new THREE.Vector3());
  const scale = extent / (kind === "astronaut" ? size.y : Math.max(size.x, size.z));
  root.scale.setScalar(scale);
  root.position.set(-center.x * scale, -bounds.min.y * scale, -center.z * scale);
  root.traverse(object => {
    if (!(object instanceof THREE.Mesh)) return;
    const old = Array.isArray(object.material) ? object.material : [object.material];
    old.forEach(m => m.dispose());
    const positions = object.geometry.getAttribute("position");
    object.geometry.computeBoundingBox();
    const b = object.geometry.boundingBox!;
    const colors = new Float32Array(positions.count * 3);
    const ivory = new THREE.Color("#dfd2b8"), dark = new THREE.Color("#283441"), gold = new THREE.Color("#bb843c"), steel = new THREE.Color("#687783");
    for (let i = 0; i < positions.count; i++) {
      const y = (positions.getY(i) - b.min.y) / (b.max.y - b.min.y);
      const side = Math.abs(positions.getX(i) - (b.min.x + b.max.x) / 2) / (b.max.x - b.min.x);
      let color = ivory;
      if (kind === "rover") {
        if (y < .27 && side > .22) color = dark;
        else if (y < .36) color = steel;
        else if (y > .65 && y < .76) color = gold;
      } else if ((kind === "habitat" || kind === "greenhouse") && y > .4 && y < .48) color = steel;
      else if (kind === "astronaut" && y < .13) color = dark;
      color.toArray(colors, i * 3);
    }
    object.geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    object.material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .8, metalness: .12 });
    object.castShadow = true; object.receiveShadow = true;
  });
  const group = new THREE.Group(); group.add(root); return group;
}

export default function MarsBaseScene() {
  const host = useRef<HTMLDivElement>(null);
  const labels = useRef<Partial<Record<Site, HTMLButtonElement>>>({});
  const plotLabels = useRef<(HTMLButtonElement | null)[]>([]);
  const command = useRef<(action: string) => void>(() => {});
  const [attempt, setAttempt] = useState(0);
  const [status, setStatus] = useState("Loading Mars base…");
  const [failed, setFailed] = useState(false);
  const [hoveredSite, setHoveredSite] = useState<Site | null>(null);
  const [selectedSite, setSelectedSite] = useState<Site | null>(null);
  const touchInput = useRef(false);
  const state = useGame();
  const { discovery, activeTaskId } = state;
  const building = discovery !== "ready";
  const names: Record<Site, string> = {
    solar: discovery === "base" ? "Build solar panel" : "Solar panel",
    battery: discovery === "problem" ? "Open build site" : "Battery storage",
    rover: "Scout rover", greenhouse: "Greenhouse", habitat: "Habitat · crew 4",
  };
  const focused = activeTaskId === "plan-rover" ? "rover" : activeTaskId === "top-up" ? "solar" : activeTaskId === "grow-plants" ? "greenhouse" : "battery";

  useEffect(() => {
    const container = host.current;
    if (!container) return;
    let active = true;
    let renderer: THREE.WebGLRenderer;
    try { renderer = new THREE.WebGLRenderer({ antialias: true }); }
    catch {
      const id = setTimeout(() => { setStatus("3D map is unavailable. Please retry."); setFailed(true); }, 0);
      return () => clearTimeout(id);
    }
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.domElement.style.touchAction = "none";
    renderer.domElement.setAttribute("aria-label", "Mars base map. Drag to pan, scroll to zoom. Hover or focus a marker to learn its name. Tap a marker to inspect.");
    container.appendChild(renderer.domElement);
    const scene = new THREE.Scene(); scene.background = new THREE.Color("#ba7752");
    const camera = new THREE.OrthographicCamera(-45, 45, 32, -32, .1, 400);
    camera.position.set(80, 95, 80);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 0, 1);
    controls.enableRotate = false; controls.enableDamping = false;
    controls.minZoom = .8; controls.maxZoom = 2.2;
    controls.mouseButtons.LEFT = THREE.MOUSE.PAN;
    controls.touches.ONE = THREE.TOUCH.PAN;
    controls.touches.TWO = THREE.TOUCH.DOLLY_PAN;
    controls.screenSpacePanning = false;
    const ambient = new THREE.HemisphereLight(0xffecd4, 0x62371e, 2);
    const sun = new THREE.DirectionalLight(0xffd4a2, 3);
    sun.position.set(-35, 65, 20); sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    Object.assign(sun.shadow.camera, { left: -65, right: 65, top: 65, bottom: -65, far: 160 });
    sun.shadow.bias = -.0006;
    scene.add(ambient, sun);
    const material = (color: string) => new THREE.MeshStandardMaterial({ color, roughness: .95 });
    const sand = material("#bc714b"), cliff = material("#8f4d32"), route = material("#d29461");
    const shell = material("#d9c9ac"), metal = material("#39434a"), solarBlue = material("#193b61");
    const signal = new THREE.MeshStandardMaterial({ color: "#7de4c5", emissive: "#49ba96", emissiveIntensity: .5 });
    function box(w: number, h: number, d: number, mat: THREE.Material, x: number, y: number, z: number, parent: THREE.Object3D = scene) {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
      mesh.position.set(x, y, z); mesh.castShadow = true; mesh.receiveShadow = true; parent.add(mesh); return mesh;
    }
    box(160, 1, 120, sand, 0, -1, 0);
    // Layered eroded ridge on the far side of the playable basin.
    for (let i = 0; i < 13; i++) {
      const h = 7 + Math.sin(i * 2.3) * 3;
      const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(1, 0), cliff);
      rock.scale.set(9, h, 7); rock.position.set(-68 + i * 11, h / 2 - 1, -43 - Math.sin(i) * 3);
      rock.rotation.y = i * .72; rock.receiveShadow = true; rock.castShadow = true; scene.add(rock);
      box(10, .5, 7, sand, -68 + i * 11, h * .65, -43);
    }
    const rockGeometry = new THREE.DodecahedronGeometry(1, 0);
    const rocks = new THREE.InstancedMesh(rockGeometry, cliff, 100);
    const dummy = new THREE.Object3D();
    for (let i = 0; i < 100; i++) {
      const angle = i * 2.39996, radius = 35 + (i % 9) * 2.7;
      const scale = .4 + (i % 7) * .22;
      dummy.position.set(Math.cos(angle) * radius, scale * .35, Math.sin(angle) * radius * .65);
      dummy.scale.set(scale * 1.5, scale, scale); dummy.rotation.set(i, i * .3, 0); dummy.updateMatrix(); rocks.setMatrixAt(i, dummy.matrix);
    }
    rocks.receiveShadow = true; rocks.castShadow = true; scene.add(rocks);
    function line(points: THREE.Vector3[], width: number, mat: THREE.Material) {
      const curve = new THREE.CatmullRomCurve3(points);
      const mesh = new THREE.Mesh(new THREE.TubeGeometry(curve, 40, width, 5, false), mat); scene.add(mesh); return mesh;
    }
    const routePoints = [[-6, 22], [-19, 23], [-36, 13], [-37, -10], [-18, -26], [10, -25], [24, -12], [28, 10], [22, 24], [7, 27]];
    const walkingRoute = new THREE.CatmullRomCurve3(routePoints.map(([x, z]) => new THREE.Vector3(x, 0, z)), true, "centripetal");
    const road = new THREE.Mesh(new THREE.TubeGeometry(walkingRoute, 100, 2.5, 6, true), route);
    scene.add(road);
    road.scale.y = .05; road.position.y = .06;
    // Keep a clear corridor around the route, including the width of the rover.
    const corridor = walkingRoute.getSpacedPoints(200);
    const rockPosition = new THREE.Vector3();
    for (let i = 0; i < rocks.count; i++) {
      rocks.getMatrixAt(i, dummy.matrix);
      dummy.matrix.decompose(dummy.position, dummy.quaternion, dummy.scale);
      rockPosition.copy(dummy.position); rockPosition.y = 0;
      const clearance = 3.2 + Math.max(dummy.scale.x, dummy.scale.z);
      if (corridor.some(point => point.distanceToSquared(rockPosition) < clearance * clearance)) {
        dummy.scale.setScalar(0); dummy.updateMatrix(); rocks.setMatrixAt(i, dummy.matrix);
      }
    }
    rocks.instanceMatrix.needsUpdate = true;
    const panels = new THREE.Group(); scene.add(panels);
    for (let row = 0; row < 2; row++) for (let col = 0; col < 3; col++) {
      const x = -30 + col * 5, z = -3 + row * 6;
      box(.3, 2.5, .3, metal, x, 1.25, z, panels);
      const panel = box(4.6, .18, 4.5, solarBlue, x, 2.7, z, panels); panel.rotation.x = -.2;
      for (let j = 0; j < 5; j++) box(.045, .035, 4.3, shell, x - 2 + j, 2.85, z, panels);
    }
    const battery = new THREE.Group(); battery.position.set(-12, 0, 16); scene.add(battery);
    box(5, 2.8, 3, shell, 0, 1.4, 0, battery);
    box(5.2, .3, 3.2, metal, 0, 3, 0, battery);
    const chargeBars: THREE.Mesh[] = [];
    for (let i = 0; i < 6; i++) chargeBars.push(box(.5, .8, .12, signal, -1.8 + i * .72, 1.5, 1.56, battery));
    let cable = line([new THREE.Vector3(-22, .15, 3), new THREE.Vector3(-18, .15, 11), new THREE.Vector3(-12, .15, 16), new THREE.Vector3(-6, .15, 10), new THREE.Vector3(-4, .15, -3)], .16, signal);
    let cableKey = "";
    let greenhouseModel: THREE.Group | undefined;
    const plotGroup = new THREE.Group(); scene.add(plotGroup);
    const plotMaterial = new THREE.MeshBasicMaterial({ color: "#a5ffdb", transparent: true, opacity: .7, side: THREE.DoubleSide });
    const plotMeshes = [0, 1].map(() => {
      const mesh = new THREE.Mesh(new THREE.RingGeometry(4.8, 5.1, 48), plotMaterial);
      mesh.rotation.x = -Math.PI / 2; plotGroup.add(mesh); return mesh;
    });
    const buildSite = new THREE.Group(); scene.add(buildSite);
    const foundation = box(12, .35, 12, shell, 0, .2, 0, buildSite);
    const buildFrame = new THREE.Group(); buildSite.add(buildFrame);
    const frameMaterial = new THREE.LineBasicMaterial({ color: "#ffe6a1" });
    const domeFrame = new THREE.LineSegments(new THREE.WireframeGeometry(new THREE.SphereGeometry(5.8, 12, 5, 0, Math.PI * 2, 0, Math.PI / 2)), frameMaterial);
    domeFrame.position.y = .5; buildFrame.add(domeFrame);
    const boxFrame = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(5, 3, 3)), frameMaterial);
    boxFrame.position.y = 1.8; buildFrame.add(boxFrame);
    const arrayFrame = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(14, 2.8, 11)), frameMaterial);
    arrayFrame.position.y = 1.6; buildFrame.add(arrayFrame);
    const buildCrates = new THREE.Group(); buildSite.add(buildCrates);
    for (let i = 0; i < 3; i++) {
      box(1.4, 1.1, 1.1, shell, -2 + i * 1.8, .55, 8, buildCrates);
      box(.22, 1.12, 1.12, metal, -2 + i * 1.8, .56, 8, buildCrates);
    }
    const buildBeacon = new THREE.Mesh(new THREE.RingGeometry(6.6, 6.8, 48), new THREE.MeshBasicMaterial({ color: "#ffd65e", side: THREE.DoubleSide }));
    buildBeacon.rotation.x = -Math.PI / 2; buildBeacon.position.y = .14; buildSite.add(buildBeacon);
    box(.5, 12, .5, metal, -6, 6, -18);
    const dish = new THREE.Mesh(new THREE.SphereGeometry(2.5, 18, 12, 0, Math.PI * 2, 0, Math.PI / 2), shell);
    dish.scale.y = .3; dish.position.set(-6, 11, -18); dish.rotation.x = -.8; scene.add(dish);
    const habitatLight = new THREE.PointLight(0x97f2d5, 40, 30, 2); habitatLight.position.set(0, 5, -1); scene.add(habitatLight);
    const roverGroup = new THREE.Group(); scene.add(roverGroup);
    const crew: { object: THREE.Group; tool: THREE.Group; parcel: THREE.Group; gait: number; meshes: { geometry: THREE.BufferGeometry; original: Float32Array; bounds: THREE.Box3 }[] }[] = [];
    let roverModel: THREE.Group | undefined;
    const crewHomes = [[-5, 8], [-1, 10], [3, 9], [7, 10]];
    const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const roverLabel = new THREE.Vector3(20, 2, 15);
    // Paths leave the roadway to reach specific work sites. Progress belongs to the mission store.
    const surveyPath = [[0, 20, 15], [.2, 32, 15], [.3, 32, 15], [.5, 33, -2], [.6, 33, -2], [.8, 25, 6], [1, 20, 15]];
    const waterPath = [[0, -5, 8], [.3, -15, 9], [.7, -15, 9], [1, -5, 8]];
    const lightPath = [[0, -1, 10], [.3, 16, 8], [.7, 16, 8], [1, -1, 10]];
    function positionForTask(object: THREE.Object3D, path: number[][], progress: number) {
      const fraction = THREE.MathUtils.clamp(progress / 100, 0, 1);
      let segment = 1;
      while (segment < path.length - 1 && fraction > path[segment][0]) segment++;
      const from = path[segment - 1], to = path[segment];
      const t = (fraction - from[0]) / (to[0] - from[0]);
      object.position.set(THREE.MathUtils.lerp(from[1], to[1], t), 0, THREE.MathUtils.lerp(from[2], to[2], t));
      const moving = from[1] !== to[1] || from[2] !== to[2];
      if (moving) object.rotation.y = Math.atan2(to[1] - from[1], to[2] - from[2]);
      return moving && progress > 0 && progress < 100;
    }
    // Clear the survey corridor too, so the rover never drives through decorative rocks.
    for (let i = 0; i < rocks.count; i++) {
      rocks.getMatrixAt(i, dummy.matrix);
      dummy.matrix.decompose(dummy.position, dummy.quaternion, dummy.scale);
      const clear = surveyPath.some((point, index) => {
        if (!index) return false;
        const prior = surveyPath[index - 1];
        const segment = new THREE.Line3(new THREE.Vector3(prior[1], 0, prior[2]), new THREE.Vector3(point[1], 0, point[2]));
        const nearest = segment.closestPointToPoint(new THREE.Vector3(dummy.position.x, 0, dummy.position.z), true, new THREE.Vector3());
        return nearest.distanceTo(new THREE.Vector3(dummy.position.x, 0, dummy.position.z)) < 4;
      });
      if (clear) { dummy.scale.setScalar(0); dummy.updateMatrix(); rocks.setMatrixAt(i, dummy.matrix); }
    }
    rocks.instanceMatrix.needsUpdate = true;
    // A separate supply station makes the astronaut's water-check destination visible.
    box(2, 2, 1.6, solarBlue, -15, 1, 8);
    box(2.1, .2, 1.7, shell, -15, 2.1, 8);
    const workMarkers = new THREE.Group();
    scene.add(workMarkers);
    const markerMaterial = new THREE.MeshBasicMaterial({ color: "#ffdc69", transparent: true, opacity: .85, side: THREE.DoubleSide });
    const marker = new THREE.Mesh(new THREE.RingGeometry(2, 2.3, 40), markerMaterial);
    marker.rotation.x = -Math.PI / 2;
    marker.position.y = .12;
    workMarkers.add(marker);
    const lightTray = box(2.4, .5, 1.8, shell, 16, .25, 7);
    lightTray.add(new THREE.PointLight(0xffb6dd, 3, 5));
    const pickers: THREE.Mesh[] = [];
    const pickerMaterial = new THREE.MeshBasicMaterial({ visible: false });
    for (const [site, p] of Object.entries(locations)) {
      const picker = new THREE.Mesh(new THREE.BoxGeometry(site === "habitat" ? 18 : 9, 9, 9), pickerMaterial);
      picker.position.set(...p); picker.userData.site = site; scene.add(picker); pickers.push(picker);
    }
    const raycaster = new THREE.Raycaster();
    const pointers = new Map<number, THREE.Vector2>();
    let gestureMoved = false;
    const pointerDown = (event: PointerEvent) => {
      if (event.pointerType === "mouse" && event.button !== 0) return;
      if (pointers.size === 0) gestureMoved = false;
      pointers.set(event.pointerId, new THREE.Vector2(event.clientX, event.clientY));
      if (pointers.size > 1) gestureMoved = true;
    };
    const hovered = { site: null as Site | null };
    const hitSite = (event: PointerEvent) => {
      const r = renderer.domElement.getBoundingClientRect();
      raycaster.setFromCamera(new THREE.Vector2((event.clientX-r.left)/r.width*2-1, -(event.clientY-r.top)/r.height*2+1), camera);
      const hit = raycaster.intersectObjects(pickers).find(hit => hit.object.visible);
      return hit ? hit.object.userData.site as Site : null;
    };
    const pointerMove = (event: PointerEvent) => {
      if (!pointers.size && event.pointerType !== "touch") {
        const site = hitSite(event);
        if (site !== hovered.site) { hovered.site = site; setHoveredSite(site); }
        renderer.domElement.style.cursor = site ? "pointer" : "grab";
      }
      const start = pointers.get(event.pointerId);
      if (start && start.distanceTo(new THREE.Vector2(event.clientX, event.clientY)) > 6) gestureMoved = true;
    };
    const pointerUp = (event: PointerEvent) => {
      const start = pointers.get(event.pointerId);
      if (!start) return;
      const tapped = !gestureMoved && pointers.size === 1 && start.distanceTo(new THREE.Vector2(event.clientX, event.clientY)) <= 6;
      pointers.delete(event.pointerId);
      if (!tapped) return;
      const site = hitSite(event);
      if (site) setSelectedSite(site);
      else setSelectedSite(null);
    };
    const pointerLeave = () => { hovered.site = null; setHoveredSite(null); };
    const pointerCancel = (event: PointerEvent) => { pointers.delete(event.pointerId); gestureMoved = true; };
    renderer.domElement.addEventListener("pointerdown", pointerDown);
    renderer.domElement.addEventListener("pointermove", pointerMove);
    renderer.domElement.addEventListener("pointerup", pointerUp);
    renderer.domElement.addEventListener("pointercancel", pointerCancel);
    renderer.domElement.addEventListener("pointerleave", pointerLeave);
    const render = () => {
      if (!active) return;
      const beforeClamp = controls.target.clone();
      controls.target.x = THREE.MathUtils.clamp(controls.target.x, -15, 15);
      controls.target.z = THREE.MathUtils.clamp(controls.target.z, -12, 15);
      controls.target.y = 0;
      camera.position.add(controls.target.clone().sub(beforeClamp));
      renderer.render(scene, camera);
      for (const site of Object.keys(locations) as Site[]) {
        const button = labels.current[site as Site]; if (!button) continue;
        const point = (site === "rover" ? roverLabel.clone() : sitePosition(site)).project(camera);
        button.style.left = `${(point.x + 1) * 50}%`; button.style.top = `${(1 - point.y) * 50}%`;
      }
      const selected = useGame.getState().selectedBuild;
      if (selected) BUILD_SITES[selected].forEach(({ position: [x, z] }, index) => {
        const button = plotLabels.current[index];
        if (!button) return;
        const point = new THREE.Vector3(x, 1, z).project(camera);
        button.style.left = `${(point.x + 1) * 50}%`; button.style.top = `${(1 - point.y) * 50}%`;
      });
      renderer.domElement.dataset.triangles = String(renderer.info.render.triangles);
      renderer.domElement.dataset.drawCalls = String(renderer.info.render.calls);
    };
    controls.addEventListener("change", render);
    const resize = () => {
      const w = container.clientWidth, h = container.clientHeight;
      const aspect = w / Math.max(h, 1); const halfWidth = Math.max(40, 31 * aspect);
      camera.left = -halfWidth; camera.right = halfWidth; camera.top = halfWidth / aspect; camera.bottom = -halfWidth / aspect;
      camera.updateProjectionMatrix(); renderer.setSize(w, h); render();
    };
    controls.update(); controls.saveState();
    const observer = new ResizeObserver(resize); observer.observe(container); resize();
    command.current = action => {
      if (action === "reset") controls.reset();
      else { camera.zoom = THREE.MathUtils.clamp(camera.zoom * (action === "in" ? 1.2 : 1 / 1.2), .8, 2.2); camera.updateProjectionMatrix(); }
      render();
    };
    const update = () => {
      const s = useGame.getState(); const night = s.previewDark || s.timeOfDay === "Night";
      scene.background = new THREE.Color(night ? "#18233a" : s.timeOfDay === "Sunset" ? "#985d54" : "#ba7752");
      ambient.intensity = night ? .65 : 2; sun.intensity = night ? .35 : 3;
      sun.color.set(night ? "#8dafea" : "#ffd4a2");
      const build = s.construction;
      const progress = build?.progress ?? 0;
      const showFinished = (device: BuildDevice) => s.placements[device] !== undefined || build?.device === device && progress >= 75;
      const finishScale = (device: BuildDevice) => build?.device === device ? THREE.MathUtils.clamp((progress - 70) / 20, .25, 1) : 1;
      panels.visible = showFinished("solar");
      const solarPosition = sitePosition("solar");
      panels.position.set(solarPosition.x + 25, 0, solarPosition.z);
      panels.scale.y = finishScale("solar");
      battery.visible = showFinished("battery");
      const batteryPosition = sitePosition("battery");
      battery.position.set(batteryPosition.x, 0, batteryPosition.z);
      battery.scale.y = finishScale("battery");
      if (greenhouseModel) {
        greenhouseModel.visible = showFinished("greenhouse");
        const point = sitePosition("greenhouse"); greenhouseModel.position.set(point.x, 0, point.z);
        greenhouseModel.scale.y = finishScale("greenhouse");
      }
      plotGroup.visible = !!s.selectedBuild;
      if (s.selectedBuild) BUILD_SITES[s.selectedBuild].forEach(({ position: [x, z] }, index) => plotMeshes[index].position.set(x, .14, z));
      buildSite.visible = !!build;
      if (build) {
        const [x, z] = BUILD_SITES[build.device][build.slot].position;
        buildSite.position.set(x, 0, z);
        foundation.visible = progress >= 20 && progress < 90;
        foundation.scale.set(build.device === "solar" ? 1.25 : build.device === "battery" ? .5 : 1, 1, build.device === "battery" ? .35 : 1);
        buildFrame.visible = progress >= 45 && progress < 90;
        buildFrame.scale.y = THREE.MathUtils.clamp((progress - 40) / 20, .2, 1);
        domeFrame.visible = build.device === "greenhouse"; boxFrame.visible = build.device === "battery"; arrayFrame.visible = build.device === "solar";
        buildCrates.visible = progress < 85; buildBeacon.visible = progress < 90;
      }
      const nextCableKey = `${s.placements.solar}:${s.placements.battery}`;
      if (nextCableKey !== cableKey) {
        cableKey = nextCableKey; scene.remove(cable); cable.geometry.dispose();
        const p = solarPosition.clone().setY(.15), b = batteryPosition.clone().setY(.15);
        const points = s.placements.battery !== undefined ? [p, new THREE.Vector3(p.x, .15, b.z), b, new THREE.Vector3(-6, .15, 10), new THREE.Vector3(-4, .15, -3)] : [p, new THREE.Vector3(-14, .15, 3), new THREE.Vector3(-4, .15, -3)];
        cable = line(points, .16, signal);
      }
      roverGroup.visible = s.discovery === "ready";
      const powered = s.discovery === "ready" ? s.baseConnected && s.battery > 0 : ["wired", "problem", "storage", "charged"].includes(s.discovery) && (!s.previewDark || s.discovery === "charged");
      habitatLight.visible = powered; signal.emissiveIntensity = powered ? 1 : 0;
      cable.visible = !["base", "panel"].includes(s.discovery);
      chargeBars.forEach((bar, i) => { bar.visible = i < s.battery; });
      pickers.forEach(p => {
        const id = p.userData.site as Site;
        p.visible = !s.selectedBuild && !build && (id === "rover" ? s.discovery === "ready" : id === "greenhouse" ? s.greenhouseBuilt : id === "battery" ? s.placements.battery !== undefined : id === "solar" ? s.placements.solar !== undefined : true);
        if (id !== "rover") p.position.copy(sitePosition(id));
      });
      renderer.domElement.dataset.greenhouseVisible = String(greenhouseModel?.visible ?? false);
      renderer.domElement.dataset.construction = build ? JSON.stringify(build) : "none";
      renderer.domElement.dataset.placements = JSON.stringify(s.placements);
      render();
    };
    const unsubscribe = useGame.subscribe(update); update();
    let frame = 0;
    let previousTime = performance.now();
    let previousRender = 0;
    let previousPose = "";
    const animate = (time: number) => {
      if (!active) return;
      frame = requestAnimationFrame(animate);
      const delta = Math.min((time - previousTime) / 1000, .05);
      previousTime = time;
      const s = useGame.getState();
      const paused = document.hidden || motionPreference.matches || !!s.modal || document.documentElement.dataset.gameDrawer === "open" || s.previewDark || s.timeOfDay === "Night" || ["intro", "plan-check", "storm-decision", "dawn", "quiz", "complete"].includes(s.phase);
      const job = s.activeResearchJob;
      const research = s.researchProgress;
      const construction = s.construction;
      workMarkers.visible = s.phase === "research" && !!job;
      if (job === "survey") marker.position.set(research.survey < 40 ? 32 : 33, .12, research.survey < 40 ? 15 : -2);
      else if (job === "water") marker.position.set(-15, .12, 9);
      else if (job === "light") marker.position.set(16, .12, 8);
      renderer.domElement.dataset.motion = paused ? "paused" : construction ? "building" : job ? "working" : "idle";
      if (document.hidden) return;
      const pose = `${job}:${research.survey}:${research.water}:${research.light}:${paused}:${crew.length}:${!!roverModel}:${construction?.device}:${construction?.progress}:${s.selectedBuild}`;
      if ((!job && !construction || paused) && pose === previousPose) return;
      if (time - previousRender < 1000 / 30) return;
      previousPose = pose;
      previousRender = time;
      for (const [index, person] of crew.entries()) {
        const builder = !!construction && index < 2;
        const assigned = builder || index === 0 && job === "water" || index === 1 && job === "light";
        const actualProgress = index === 0 ? research.water : research.light;
        const progress = motionPreference.matches && actualProgress < 100 ? 0 : actualProgress;
        let moving = index < 2 && positionForTask(person.object, index === 0 ? waterPath : lightPath, progress);
        let working = false;
        if (builder && construction) {
          const [x, z] = BUILD_SITES[construction.device][construction.slot].position;
          const home = crewHomes[index];
          const side = index === 0 ? -1 : 1;
          const stationX = x + side * (construction.device === "battery" ? 3.4 : 6.4);
          const stationZ = z + (construction.device === "battery" ? 2.5 : 5.5);
          const path = [[0, home[0], home[1]], [.1, stationX, 11], [.2, stationX, stationZ], [.9, stationX, stationZ], [.95, stationX, 11], [1, home[0], home[1]]];
          moving = positionForTask(person.object, path, construction.progress);
          working = construction.progress >= 20 && construction.progress < 90;
          if (motionPreference.matches) {
            person.object.position.set(working ? stationX : home[0], 0, working ? stationZ : home[1]);
            moving = false;
          }
          if (working) person.object.rotation.y = Math.atan2(x - stationX, z - stationZ);
        }
        if (index >= 2) person.object.position.set(crewHomes[index][0], 0, crewHomes[index][1]);
        const walking = assigned && moving && !paused && !motionPreference.matches;
        if (walking) person.gait += delta * Math.PI * 2 * .9;
        const gait = walking ? person.gait : 0;
        person.object.position.y = walking ? .04 + Math.abs(Math.sin(gait)) * .045 : 0;
        const assembling = working && !paused && !motionPreference.matches;
        const hammer = assembling ? Math.sin(time / 220 + index * 2) : 0;
        person.tool.visible = builder && working;
        person.tool.rotation.x = -.35 + hammer * .45;
        person.parcel.visible = builder && !!construction && construction.progress < 20;
        person.object.rotation.z = assembling ? hammer * .025 : 0;
        for (const mesh of person.meshes) {
          const positions = mesh.geometry.getAttribute("position");
          const height = mesh.bounds.max.y - mesh.bounds.min.y;
          const middle = (mesh.bounds.max.x + mesh.bounds.min.x) / 2;
          const width = mesh.bounds.max.x - mesh.bounds.min.x;
          for (let i = 0; i < positions.count; i++) {
            const x = mesh.original[i * 3], y = mesh.original[i * 3 + 1], z = mesh.original[i * 3 + 2];
            const level = (y - mesh.bounds.min.y) / height;
            const side = x < middle ? -1 : 1;
            const swing = Math.sin(gait) * side;
            const legWeight = Math.max(0, 1 - level / .48);
            const armWeight = level > .38 && level < .76 && Math.abs(x - middle) > width * .23 ? Math.sin((level - .38) / .38 * Math.PI) : 0;
            positions.setXYZ(i, x, y + Math.max(0, swing) * height * .035 * legWeight + hammer * height * .025 * armWeight, z + swing * height * (.085 * legWeight - .035 * armWeight));
          }
          positions.needsUpdate = true;
        }
      }
      let roverMoving = false;
      if (roverModel) {
        roverMoving = positionForTask(roverModel, surveyPath, motionPreference.matches && research.survey < 100 ? 0 : research.survey) && job === "survey";
        roverModel.rotation.z = roverMoving && !paused ? Math.sin(research.survey * .5) * .008 : 0;
        roverLabel.copy(roverModel.position); roverLabel.y += 2;
        const picker = pickers.find(p => p.userData.site === "rover");
        if (picker) picker.position.copy(roverLabel);
      }
      renderer.domElement.dataset.crewPositions = JSON.stringify(crew.map(p => p.object.position.toArray().map(n => Number(n.toFixed(3)))));
      renderer.domElement.dataset.roverPosition = JSON.stringify(roverModel?.position.toArray().map(n => Number(n.toFixed(3))) ?? []);
      renderer.domElement.dataset.roverMotion = paused ? "paused" : roverMoving ? "surveying" : job === "survey" ? "sampling" : "parked";
      renderer.domElement.dataset.researchJob = job ?? "none";
      render();
    };
    frame = requestAnimationFrame(animate);
    const loader = new GLTFLoader();
    Promise.all(["habitat", "greenhouse", "astronaut", "rover"].map(async kind => {
      const gltf = await loader.loadAsync(`/models/${kind}-scene.glb`);
      if (!active) { release(gltf.scene); return; }
      const group = prepareModel(gltf.scene, kind, kind === "habitat" ? 20 : kind === "greenhouse" ? 12.5 : kind === "rover" ? 7 : 2.7);
      if (kind === "habitat") { group.position.set(-6, 0, -7); scene.add(group); }
      else if (kind === "greenhouse") {
        greenhouseModel = group; group.visible = false; scene.add(group);
      }
      else if (kind === "rover") {
        roverModel = group; positionForTask(group, surveyPath, useGame.getState().researchProgress.survey); roverGroup.add(group);
        roverLabel.copy(group.position); roverLabel.y += 2;
        const picker = pickers.find(p => p.userData.site === "rover");
        if (picker) picker.position.copy(roverLabel);
      }
      else {
        const originals = new Set<THREE.BufferGeometry>();
        for (let i = 0; i < 4; i++) {
          const person = group.clone(true);
          const meshes: { geometry: THREE.BufferGeometry; original: Float32Array; bounds: THREE.Box3 }[] = [];
          person.traverse(object => {
            if (!(object instanceof THREE.Mesh)) return;
            originals.add(object.geometry);
            object.geometry = object.geometry.clone();
            object.geometry.computeBoundingBox();
            const original = new Float32Array(object.geometry.getAttribute("position").array);
            meshes.push({ geometry: object.geometry, original, bounds: object.geometry.boundingBox!.clone() });
          });
          const tool = new THREE.Group(); tool.position.set(.7, 1.45, .45); person.add(tool);
          box(.13, .7, .13, metal, 0, .1, 0, tool);
          box(.55, .22, .25, shell, 0, .48, 0, tool);
          const parcel = new THREE.Group(); parcel.position.set(0, .95, .55); person.add(parcel);
          box(.9, .65, .6, shell, 0, 0, 0, parcel);
          box(.15, .67, .62, metal, 0, 0, 0, parcel);
          tool.visible = false; parcel.visible = false;
          person.position.set(crewHomes[i][0], 0, crewHomes[i][1]); scene.add(person);
          crew.push({ object: person, tool, parcel, gait: i * Math.PI / 2, meshes });
        }
        originals.forEach(geometry => geometry.dispose());
      }
      update();
    })).then(() => { if (active) { setStatus(""); render(); } }).catch(() => {
      if (active) { setStatus("Some models could not load. Retry the map."); setFailed(true); }
    });
    const lost = (event: Event) => { event.preventDefault(); setStatus("3D display interrupted. Please retry."); setFailed(true); };
    renderer.domElement.addEventListener("webglcontextlost", lost);
    return () => {
      active = false; cancelAnimationFrame(frame); unsubscribe(); observer.disconnect(); controls.dispose();
      renderer.domElement.removeEventListener("pointerdown", pointerDown); renderer.domElement.removeEventListener("pointerup", pointerUp);
      renderer.domElement.removeEventListener("pointerleave", pointerLeave);
      renderer.domElement.removeEventListener("pointermove", pointerMove); renderer.domElement.removeEventListener("pointercancel", pointerCancel);
      renderer.domElement.removeEventListener("webglcontextlost", lost);
      release(scene); renderer.dispose(); renderer.forceContextLoss(); renderer.domElement.remove(); command.current = () => {};
    };
  }, [attempt]);

  return (
    <div className="relative h-full w-full overflow-hidden bg-slate-900">
      <div ref={host} className="absolute inset-0" />
      <div className="absolute right-3 top-[88px] flex gap-1">
        {[['out', '−', 'Zoom out'], ['in', '+', 'Zoom in'], ['reset', '↺', 'Reset map']].map(([id, text, label]) => <button key={id} aria-label={label} onClick={() => command.current(id)} className="h-11 w-11 rounded bg-slate-950/80 text-lg text-white hover:bg-slate-700">{text}</button>)}
      </div>
      {(Object.keys(locations) as Site[]).map(site => {
        const hidden = !!state.selectedBuild || !!state.construction || site === "rover" && building || site === "greenhouse" && !state.greenhouseBuilt || site === "solar" && state.placements.solar === undefined || site === "battery" && state.placements.battery === undefined;
        if (hidden) return null;
        const Icon = siteIcons[site];
        return <button key={site} ref={el => { if (el) labels.current[site] = el; }}
          aria-label={names[site]} aria-describedby={hoveredSite === site ? `site-tip-${site}` : undefined}
          onPointerDown={event => { touchInput.current = event.pointerType === "touch"; }}
          onMouseEnter={() => setHoveredSite(site)} onMouseLeave={() => setHoveredSite(null)}
          onFocus={() => setHoveredSite(site)} onBlur={() => setHoveredSite(null)}
          onClick={() => { if (touchInput.current) setSelectedSite(site); else activate(site); touchInput.current = false; }}
          className={`absolute hidden h-11 w-11 -translate-x-1/2 items-center justify-center rounded-full border shadow-lg sm:flex ${focused === site || site === "solar" && discovery === "base" ? "border-amber-300 bg-amber-950/95 text-amber-100" : "border-white/40 bg-slate-950/85 text-white hover:bg-slate-700"}`}>
          <Icon className="h-5 w-5" aria-hidden="true" />
          {hoveredSite === site && <span id={`site-tip-${site}`} role="tooltip" className="pointer-events-none absolute bottom-full mb-2 whitespace-nowrap rounded bg-slate-950 px-3 py-2 text-xs text-white">{names[site]}</span>}
        </button>;
      })}
      {state.selectedBuild && BUILD_SITES[state.selectedBuild].map((plot, index) => <button
        key={`${state.selectedBuild}-${index}`} ref={element => { plotLabels.current[index] = element; }}
        aria-label={`Place ${state.selectedBuild} at ${plot.name}`} onClick={() => state.placeBuilding(index)}
        className="absolute z-10 flex h-12 w-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-emerald-200 bg-emerald-950 text-xl font-black text-white shadow-xl hover:bg-emerald-700 focus-visible:outline-4 focus-visible:outline-amber-300">
        {index + 1}
      </button>)}
      <div className="absolute inset-x-2 bottom-[calc(var(--game-task-height,150px)+20px)] flex justify-center gap-2 sm:hidden" aria-label="Map objects">
        {(Object.keys(locations) as Site[]).filter(site => !(state.selectedBuild || state.construction || site === "rover" && building || site === "greenhouse" && !state.greenhouseBuilt || site === "solar" && state.placements.solar === undefined || site === "battery" && state.placements.battery === undefined)).map(site => {
          const Icon = siteIcons[site];
          return <button key={site} aria-label={names[site]} onClick={() => setSelectedSite(site)} className="flex h-11 w-11 items-center justify-center rounded-full border border-white/40 bg-slate-950/90 text-white"><Icon className="h-5 w-5" aria-hidden="true" /></button>;
        })}
      </div>
      {selectedSite && !state.selectedBuild && !state.construction && (selectedSite !== "greenhouse" || state.greenhouseBuilt) && <div role="region" aria-label="Selected map object" className="absolute bottom-[calc(var(--game-task-height,150px)+80px)] left-1/2 z-30 max-h-[max(7rem,calc(100dvh-var(--game-task-height,150px)-160px))] w-64 -translate-x-1/2 overflow-y-auto rounded-xl border border-slate-500 bg-slate-950 p-3 text-white shadow-xl">
        <div className="flex items-center justify-between gap-2"><strong className="text-sm">{names[selectedSite]}</strong><button aria-label="Close object hint" onClick={() => setSelectedSite(null)} className="flex h-11 w-11 items-center justify-center"><X className="h-4 w-4" /></button></div>
        <button className="min-h-11 w-full rounded-lg bg-amber-300 px-3 font-bold text-slate-950" onClick={() => { activate(selectedSite); setSelectedSite(null); }}>Inspect</button>
      </div>}
      {status && <div role="status" className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-950/85 p-6 text-center text-sm text-white">
        {status}{failed && <button className="min-h-11 rounded bg-sky-700 px-5" onClick={() => { setFailed(false); setStatus("Loading Mars base…"); setAttempt(a => a + 1); }}>Retry map</button>}
      </div>}
    </div>
  );
}




