import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';
import { CAR_CATALOG, calculateCarStats, TRACKS } from '../data/catalog';
import {
  CarBuildConfig,
  CarId,
  GameModeType,
  TandemSummary,
  TelemetryState,
  TrackId,
} from '../types/game';
import { driftAudio } from './audioEngine';
import { buildPixarCar, CarRig, loadCarRigWithFallback } from './carBuilder3d';
import { DriftPhysicsCar, pollUnifiedInput } from './driftPhysics';
import { TandemAiCar } from './tandemAi';
import { buildTrackWorld, TrackWorld } from './trackBuilder3d';
import { createWorkshopEnvironment } from './workshopScene';

export type WorkshopCameraPreset = 'overview' | 'action' | 'front' | 'wheels' | 'rear';
export type RaceCameraMode = 'chase' | 'drift' | 'hood' | 'cinematic';

interface ThreeViewportProps {
  mode: 'workshop' | 'race';
  gameMode: GameModeType;
  carId: CarId;
  build: CarBuildConfig;
  trackId: TrackId;
  sessionKey: number;
  workshopPreset: WorkshopCameraPreset;
  workshopPanelOpen?: boolean;
  raceCameraMode: RaceCameraMode;
  isPaused: boolean;
  touchControls: {
    throttle: boolean;
    brake: boolean;
    left: boolean;
    right: boolean;
    handbrake: boolean;
    clutchKick: boolean;
    boost: boolean;
  };
  onTelemetry: (t: TelemetryState) => void;
  onRaceFinish: (summary: {
    totalScore: number;
    maxCombo: number;
    zoneHits: number;
    bodyIntegrityEnd: number;
    tireHealthEnd: number;
    tandemResult?: TandemSummary;
  }) => void;
  onToggleCamera?: () => void;
  onTogglePause?: () => void;
  onToggleAssist?: () => void;
}

// Module-scope reusable scratch objects (zero GC in render loop)
const _camTargetPos = new THREE.Vector3();
const _camLookAt = new THREE.Vector3();
const _smoothLookAt = new THREE.Vector3();
// Sudut kamera mode drift yang dihaluskan (agar background tidak menyapu cepat saat mobil slide)
let _driftCamHeading = 0;
let _driftCamReady = false;
const _dummy = new THREE.Object3D();
const _smokeColor = new THREE.Color();

interface SmokeParticle {
  active: boolean;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  maxLife: number;
  scale: number;
}

interface PebbleParticle {
  active: boolean;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  rx: number;
  ry: number;
  life: number;
  maxLife: number;
  scale: number;
}

export const ThreeViewport: React.FC<ThreeViewportProps> = ({
  mode,
  gameMode,
  carId,
  build,
  trackId,
  sessionKey,
  workshopPreset,
  raceCameraMode,
  isPaused,
  touchControls,
  onTelemetry,
  onRaceFinish,
  onToggleCamera,
  onTogglePause,
  onToggleAssist,
  workshopPanelOpen = false,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [contextLost, setContextLost] = useState(false);

  // Refs synced to props so render loop never tears down WebGL on React state updates
  const propsRef = useRef({
    mode,
    gameMode,
    carId,
    build,
    trackId,
    workshopPreset,
    raceCameraMode,
    isPaused,
    touchControls,
    onTelemetry,
    onRaceFinish,
    onToggleCamera,
    onTogglePause,
    onToggleAssist,
    workshopPanelOpen,
  });
  propsRef.current = {
    mode,
    gameMode,
    carId,
    build,
    trackId,
    workshopPreset,
    raceCameraMode,
    isPaused,
    touchControls,
    onTelemetry,
    onRaceFinish,
    onToggleCamera,
    onTogglePause,
    onToggleAssist,
    workshopPanelOpen,
  };

  // Trigger rebuild flags inside WebGL effect (only structural visual props trigger car rebuild)
  const carDirtyRef = useRef(true);
  const modeTrackDirtyRef = useRef(true);
  const presetDirtyRef = useRef(true);

  useEffect(() => {
    carDirtyRef.current = true;
  }, [
    carId,
    build.engineTier,
    build.turboTier,
    build.diffTier,
    build.brakeTier,
    build.paintHex,
    build.paintFinish,
    build.rimColorHex,
    build.rimStyle,
    build.bodykit,
    build.spoiler,
    build.underglowHex,
    build.rideHeight,
    build.camber,
    build.suspensionTier,
    build.smokeColorHex,
    build.bodyIntegrity,
  ]);

  useEffect(() => {
    modeTrackDirtyRef.current = true;
  }, [mode, gameMode, trackId, sessionKey]);

  useEffect(() => {
    presetDirtyRef.current = true;
  }, [workshopPreset]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // 1. Software WebGL probe
    const isSoftwareGl = (() => {
      try {
        const probeCanvas = document.createElement('canvas');
        const gl = probeCanvas.getContext('webgl2');
        if (!gl) return true;
        const ext = gl.getExtension('WEBGL_debug_renderer_info');
        const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
        const gpu = String(gl.getParameter(param));
        gl.getExtension('WEBGL_lose_context')?.loseContext();
        return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
      } catch {
        return true;
      }
    })();

    // 2. Renderer Setup
    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.94;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const handleContextLost = (e: Event) => {
      e.preventDefault();
      setContextLost(true);
    };
    const handleContextRestored = () => {
      setContextLost(false);
    };
    renderer.domElement.addEventListener('webglcontextlost', handleContextLost);
    renderer.domElement.addEventListener('webglcontextrestored', handleContextRestored);

    // 3. Scene, Camera, RoomEnvironment IBL
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0d1320);
    scene.fog = new THREE.FogExp2(0x0d1320, 0.0022);

    const camera = new THREE.PerspectiveCamera(
      48,
      Math.max(1, container.clientWidth) / Math.max(1, container.clientHeight),
      0.2,
      900,
    );
    camera.position.set(5.4, 2.5, 5.8);

    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const envTex = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envTex;
    pmremGenerator.dispose();

    // 4. Balanced Studio & Outdoor Lighting (prevents washed-out glare while accentuating body creases)
    const hemiLight = new THREE.HemisphereLight(0xdbeafe, 0x1e293b, 0.78);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xfff4e0, 1.72);
    keyLight.position.set(14, 22, 14);
    keyLight.castShadow = !isSoftwareGl;
    keyLight.shadow.mapSize.set(1024, 1024);
    keyLight.shadow.camera.near = 2;
    keyLight.shadow.camera.far = 110;
    keyLight.shadow.camera.left = -26;
    keyLight.shadow.camera.right = 26;
    keyLight.shadow.camera.top = 26;
    keyLight.shadow.camera.bottom = -26;
    keyLight.shadow.bias = -0.0005;
    keyLight.shadow.normalBias = 0.02;
    scene.add(keyLight);
    scene.add(keyLight.target);

    const rimLight = new THREE.DirectionalLight(0x93c5fd, 0.75);
    rimLight.position.set(-15, 11, -16);
    scene.add(rimLight);

    // Calibrated Softbox highlights on GPU in Workshop
    const studioLightsGroup = new THREE.Group();
    if (!isSoftwareGl) {
      RectAreaLightUniformsLib.init();
      const softbox1 = new THREE.RectAreaLight(0xffffff, 1.85, 8, 3);
      softbox1.position.set(0, 6.2, 3.2);
      softbox1.lookAt(0, 0.6, 0);
      const softbox2 = new THREE.RectAreaLight(0xfde68a, 1.25, 7, 2.5);
      softbox2.position.set(-5.5, 4.0, -3.5);
      softbox2.lookAt(0, 0.6, 0);
      studioLightsGroup.add(softbox1, softbox2);
    }
    scene.add(studioLightsGroup);

    // 5. Workshop Showroom Turntable Environment
    const workshopGroup = new THREE.Group();
    const floorGeo = new THREE.CircleGeometry(38, 48);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0xcfc6b4,
      roughness: 0.9,
      metalness: 0.02,
    });
    const floorMesh = new THREE.Mesh(floorGeo, floorMat);
    floorMesh.rotation.x = -Math.PI / 2;
    floorMesh.position.y = -0.02;
    floorMesh.receiveShadow = true;
    workshopGroup.add(floorMesh);

    const platformGeo = new THREE.CylinderGeometry(3.8, 4.15, 0.14, 48);
    const platformMat = new THREE.MeshStandardMaterial({
      color: 0xb9b2a3,
      roughness: 0.6,
      metalness: 0.15,
    });
    const platformMesh = new THREE.Mesh(platformGeo, platformMat);
    platformMesh.position.y = -0.07;
    platformMesh.receiveShadow = true;
    workshopGroup.add(platformMesh);

    const ringGeo = new THREE.RingGeometry(3.82, 3.92, 64);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xf59e0b,
      side: THREE.DoubleSide,
    });
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.rotation.x = -Math.PI / 2;
    ringMesh.position.y = 0.005;
    workshopGroup.add(ringMesh);
    const workshopEnv = createWorkshopEnvironment();
    workshopGroup.add(workshopEnv.group);
    scene.add(workshopGroup);

    // 6. OrbitControls for Workshop
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.07;
    controls.maxPolarAngle = Math.PI * 0.47;
    controls.minPolarAngle = 0.15;
    controls.minDistance = 3.2;
    controls.maxDistance = 12;
    controls.enablePan = false;
    controls.target.set(0, 0.72, 0);

    let activePresetTransition = false;
    const presetTargets: Record<WorkshopCameraPreset, { pos: THREE.Vector3; look: THREE.Vector3 }> = {
      overview: { pos: new THREE.Vector3(4.8, 2.15, 5.2), look: new THREE.Vector3(0, 0.68, 0) },
      action: { pos: new THREE.Vector3(4.2, 1.85, 4.9), look: new THREE.Vector3(-0.35, 0.65, -0.3) },
      front: { pos: new THREE.Vector3(2.2, 1.35, 5.1), look: new THREE.Vector3(0, 0.62, 0.7) },
      wheels: { pos: new THREE.Vector3(4.1, 0.88, 1.8), look: new THREE.Vector3(0.4, 0.45, 0.2) },
      rear: { pos: new THREE.Vector3(-3.6, 1.85, -4.8), look: new THREE.Vector3(0, 0.72, -0.5) },
    };

    const handleControlStart = () => {
      activePresetTransition = false;
    };
    controls.addEventListener('start', handleControlStart);

    // 7. Low-Poly Faceted Tire Smoke / Dust Plume Pool (InstancedMesh)
    const SMOKE_COUNT = 130;
    const smokeGeo = new THREE.IcosahedronGeometry(0.42, 0);
    const smokeMat = new THREE.MeshStandardMaterial({
      color: 0xf1f5f9,
      roughness: 0.92,
      flatShading: true,
      transparent: true,
      opacity: 0.68,
      depthWrite: false,
    });
    const smokeInst = new THREE.InstancedMesh(smokeGeo, smokeMat, SMOKE_COUNT);
    smokeInst.frustumCulled = false;
    const smokePool: SmokeParticle[] = Array.from({ length: SMOKE_COUNT }, () => ({
      active: false,
      x: 0,
      y: -50,
      z: 0,
      vx: 0,
      vy: 0,
      vz: 0,
      life: 0,
      maxLife: 1,
      scale: 0,
    }));
    let smokeCursor = 0;
    scene.add(smokeInst);

    // 7b. Faceted Gravel / Pebble Spray Pool (InstancedMesh)
    const PEBBLE_COUNT = 96;
    const pebbleGeo = new THREE.DodecahedronGeometry(0.11, 0);
    const pebbleMat = new THREE.MeshStandardMaterial({
      color: 0xc29b6c,
      roughness: 0.9,
      flatShading: true,
    });
    const pebbleInst = new THREE.InstancedMesh(pebbleGeo, pebbleMat, PEBBLE_COUNT);
    pebbleInst.frustumCulled = false;
    const pebblePool: PebbleParticle[] = Array.from({ length: PEBBLE_COUNT }, () => ({
      active: false,
      x: 0,
      y: -50,
      z: 0,
      vx: 0,
      vy: 0,
      vz: 0,
      rx: 0,
      ry: 0,
      life: 0,
      maxLife: 0.8,
      scale: 0,
    }));
    let pebbleCursor = 0;
    scene.add(pebbleInst);

    // 8. Skidmark Pool (InstancedMesh quads on asphalt)
    const SKID_COUNT = 320;
    const skidGeo = new THREE.PlaneGeometry(0.36, 0.85);
    skidGeo.rotateX(-Math.PI / 2);
    const skidMat = new THREE.MeshBasicMaterial({
      color: 0x09090b,
      transparent: true,
      opacity: 0.48,
      depthWrite: false,
    });
    const skidInst = new THREE.InstancedMesh(skidGeo, skidMat, SKID_COUNT);
    skidInst.frustumCulled = false;
    for (let i = 0; i < SKID_COUNT; i++) {
      _dummy.position.set(0, -40, 0);
      _dummy.scale.set(0, 0, 0);
      _dummy.updateMatrix();
      skidInst.setMatrixAt(i, _dummy.matrix);
    }
    skidInst.instanceMatrix.needsUpdate = true;
    let skidCursor = 0;
    let skidEmitAccum = 0;
    scene.add(skidInst);

    // 9. Active Car, AI Tandem Car & Track State
    let carRig: CarRig | null = null;
    let carBuildToken = 0;
    let aiCarRig: CarRig | null = null;
    let trackWorld: TrackWorld | null = null;
    const physics = new DriftPhysicsCar();
    const aiCar = new TandemAiCar();
    let timeRemaining = 95;
    let raceFinished = false;
    let telemetryTimer = 0;
    let raceIntroTimer = 0;
    let lastAppliedDamage = 100;

    // Tandem Battle 2-round state
    let tandemRound: 1 | 2 = 1;
    let tandemRole: 'lead' | 'chase' = 'lead';
    let tandemLeadScore = 0;
    let tandemAiChaseScore = 0;
    let tandemAiLeadScore = 0;
    let tandemBumpCooldown = 0;
    let tandemDistanceM = 0;
    let tandemProximityLabel = 'STANDBY';
    let tandemAngleMatchPct = 0;
    let tandemRadarDx = 0;
    let tandemRadarDz = 0;

    // Keyboard listeners
    const keys: Record<string, boolean> = {};
    const onKeyDown = (e: KeyboardEvent) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
        if (propsRef.current.mode === 'race') {
          e.preventDefault();
        }
      }
      if (!e.repeat && propsRef.current.mode === 'race') {
        if (e.code === 'KeyC') {
          raceIntroTimer = 0;
          propsRef.current.onToggleCamera?.();
        }
        if (e.code === 'KeyQ') {
          propsRef.current.onToggleAssist?.();
        }
        if (e.code === 'KeyR' && trackWorld) {
          raceIntroTimer = 0;
          physics.recoverToTrack(trackWorld);
        }
        if (e.code === 'Escape' || e.code === 'KeyP') propsRef.current.onTogglePause?.();
      }
      keys[e.code] = true;
    };
    const onKeyUp = (e: KeyboardEvent) => {
      keys[e.code] = false;
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    // Shift the projection upward while the Workshop panel is open so the car
    // stays visible above it. Value is smoothed to animate open/close.
    let viewShiftPx = 0;
    const applyViewOffset = (force = false, dt = 0) => {
      if (!container) return;
      const w = Math.max(1, container.clientWidth);
      const h = Math.max(1, container.clientHeight);
      const cur = propsRef.current;
      const panelPx = Math.min(h * 0.42, 360);
      const wanted =
        cur.mode === 'workshop' && cur.workshopPanelOpen ? panelPx / 2 : 0;
      const next =
        force || dt <= 0 ? wanted : THREE.MathUtils.damp(viewShiftPx, wanted, 8, dt);
      if (!force && Math.abs(next - viewShiftPx) < 0.01) return;
      viewShiftPx = Math.abs(next - wanted) < 0.5 ? wanted : next;
      if (Math.abs(viewShiftPx) < 0.5) {
        camera.clearViewOffset();
      } else {
        // Positive y offset moves the rendered window down, so the scene shifts up
        camera.setViewOffset(w, h, 0, viewShiftPx, w, h);
      }
      camera.updateProjectionMatrix();
    };

    // Resize observer
    const handleResize = () => {
      if (!container) return;
      const w = Math.max(1, container.clientWidth);
      const h = Math.max(1, container.clientHeight);
      camera.aspect = w / h;
      renderer.setSize(w, h);
      applyViewOffset(true);
    };
    window.addEventListener('resize', handleResize);

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    // Helper: spawn faceted smoke/dust puff & gravel pebbles
    const emitSmoke = (
      wx: number,
      wy: number,
      wz: number,
      intensity: number,
      driftVx = 0,
      driftVz = 0,
    ) => {
      const p = smokePool[smokeCursor];
      smokeCursor = (smokeCursor + 1) % SMOKE_COUNT;
      p.active = true;
      p.x = wx + (Math.random() - 0.5) * 0.28;
      p.y = wy + 0.14;
      p.z = wz + (Math.random() - 0.5) * 0.28;
      p.vx = driftVx + (Math.random() - 0.5) * 1.5;
      p.vy = 0.85 + Math.random() * 1.15;
      p.vz = driftVz + (Math.random() - 0.5) * 1.5;
      p.life = 0;
      p.maxLife = 0.65 + intensity * 0.45;
      p.scale = 0.42 + intensity * 0.52;
    };

    const emitPebble = (
      wx: number,
      wy: number,
      wz: number,
      backX: number,
      backZ: number,
      intensity: number,
    ) => {
      const p = pebblePool[pebbleCursor];
      pebbleCursor = (pebbleCursor + 1) % PEBBLE_COUNT;
      p.active = true;
      p.x = wx + (Math.random() - 0.5) * 0.22;
      p.y = wy + 0.12;
      p.z = wz + (Math.random() - 0.5) * 0.22;
      const kick = 4.5 + intensity * 7.5 + Math.random() * 3.0;
      p.vx = backX * kick + (Math.random() - 0.5) * 2.8;
      p.vy = 2.6 + Math.random() * 3.4;
      p.vz = backZ * kick + (Math.random() - 0.5) * 2.8;
      p.rx = Math.random() * Math.PI;
      p.ry = Math.random() * Math.PI;
      p.life = 0;
      p.maxLife = 0.55 + Math.random() * 0.35;
      p.scale = 0.55 + Math.random() * 0.85;
    };

    const emitSkid = (wx: number, wz: number, heading: number) => {
      _dummy.position.set(wx, 0.035, wz);
      _dummy.rotation.set(0, heading, 0);
      _dummy.scale.set(1, 1, 1);
      _dummy.updateMatrix();
      skidInst.setMatrixAt(skidCursor, _dummy.matrix);
      skidCursor = (skidCursor + 1) % SKID_COUNT;
      skidInst.instanceMatrix.needsUpdate = true;
    };

    // Workshop spring drop state
    let workshopDropOffset = 0;
    let workshopDropVel = 0;
    let workshopActionSpin = 0;

    // Animation Loop
    const clock = new THREE.Clock();
    let frameId = 0;
    let disposed = false;

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        if (disposed) return;
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    const tick = () => {
      if (disposed) return;
      const dt = Math.min(clock.getDelta(), 0.08);
      const elapsed = clock.elapsedTime;
      const current = propsRef.current;

      // Rebuild Car if visual build changed (preserve live race damage if mid-session)
      if (carDirtyRef.current) {
        carDirtyRef.current = false;
        const buildToken = ++carBuildToken;
        if (carRig) {
          scene.remove(carRig.root);
          carRig.dispose();
        }
        carRig = buildPixarCar(current.carId, current.build, { isSoftwareGl });
        const dmgVal = current.mode === 'race' ? physics.bodyIntegrity : current.build.bodyIntegrity;
        carRig.updateDamageVisual(dmgVal);
        lastAppliedDamage = dmgVal;
        scene.add(carRig.root);
        _smokeColor.set(current.build.smokeColorHex);
        smokeMat.color.copy(_smokeColor);
        workshopDropOffset = 0.22;
        workshopDropVel = 0;

        // If external GLB/GLTF modelUrl is configured on this car, upgrade asynchronously with procedural fallback
        const activeMeta = CAR_CATALOG.find((c) => c.id === current.carId);
        if (activeMeta?.modelUrl) {
          void loadCarRigWithFallback(current.carId, current.build, {
            isSoftwareGl,
            modelUrl: activeMeta.modelUrl,
          }).then((loadedRig) => {
            if (disposed || buildToken !== carBuildToken) {
              loadedRig.dispose();
              return;
            }
            if (carRig) {
              loadedRig.root.position.copy(carRig.root.position);
              loadedRig.root.rotation.copy(carRig.root.rotation);
              scene.remove(carRig.root);
              carRig.dispose();
            }
            carRig = loadedRig;
            carRig.updateDamageVisual(
              propsRef.current.mode === 'race' ? physics.bodyIntegrity : propsRef.current.build.bodyIntegrity,
            );
            scene.add(carRig.root);
          });
        }
      }

      // Switch Mode or Track
      if (modeTrackDirtyRef.current) {
        modeTrackDirtyRef.current = false;

        if (trackWorld) {
          scene.remove(trackWorld.group);
          trackWorld.dispose();
          trackWorld = null;
        }
        if (aiCarRig) {
          scene.remove(aiCarRig.root);
          aiCarRig.dispose();
          aiCarRig = null;
        }

        // Clear smoke, pebbles & skids
        for (let i = 0; i < SMOKE_COUNT; i++) {
          smokePool[i].active = false;
          _dummy.position.set(0, -50, 0);
          _dummy.scale.set(0, 0, 0);
          _dummy.updateMatrix();
          smokeInst.setMatrixAt(i, _dummy.matrix);
        }
        smokeInst.instanceMatrix.needsUpdate = true;
        for (let i = 0; i < PEBBLE_COUNT; i++) {
          pebblePool[i].active = false;
          _dummy.position.set(0, -50, 0);
          _dummy.scale.set(0, 0, 0);
          _dummy.updateMatrix();
          pebbleInst.setMatrixAt(i, _dummy.matrix);
        }
        pebbleInst.instanceMatrix.needsUpdate = true;
        for (let i = 0; i < SKID_COUNT; i++) {
          _dummy.position.set(0, -50, 0);
          _dummy.scale.set(0, 0, 0);
          _dummy.updateMatrix();
          skidInst.setMatrixAt(i, _dummy.matrix);
        }
        skidInst.instanceMatrix.needsUpdate = true;

        if (current.mode === 'workshop') {
          driftAudio.stopDriving();
          workshopGroup.visible = true;
          studioLightsGroup.visible = true;
          controls.enabled = true;
          scene.background = new THREE.Color(0x9fd0f2);
          scene.fog = new THREE.FogExp2(0xbfdcf0, 0.0042);
          hemiLight.color.set(0xeaf4ff);
          hemiLight.groundColor.set(0x9bb872);
          hemiLight.intensity = 0.95;
          keyLight.color.set(0xfff4e0);
          keyLight.intensity = 1.72;
          keyLight.position.set(11, 16, 12);
          keyLight.target.position.set(0, 0, 0);
          pebbleMat.color.setHex(0x64748b);
          smokeMat.color.set(current.build.smokeColorHex);

          if (carRig) {
            carRig.root.position.set(0, 0, 0);
            carRig.root.rotation.set(0, 0.55, 0);
            carRig.bodyGroup.rotation.set(0, 0, 0);
            carRig.updateDamageVisual(current.build.bodyIntegrity ?? 100);
          }
          activePresetTransition = true;
        } else {
          workshopGroup.visible = false;
          studioLightsGroup.visible = false;
          controls.enabled = false;
          const trackDef = TRACKS.find((t) => t.id === current.trackId) ?? TRACKS[0];
          trackWorld = buildTrackWorld(trackDef, renderer.capabilities.getMaxAnisotropy());
          scene.add(trackWorld.group);

          scene.background = new THREE.Color(trackDef.skyColor);
          scene.fog = new THREE.FogExp2(trackDef.fogColor, trackDef.propTheme === 'neon' ? 0.0014 : 0.00105);
          hemiLight.color.set(trackDef.propTheme === 'neon' ? 0x60a5fa : 0xe0f2fe);
          hemiLight.groundColor.set(trackDef.groundColor);
          hemiLight.intensity = trackDef.propTheme === 'neon' ? 0.8 : 0.88;
          keyLight.color.set(
            trackDef.propTheme === 'canyon'
              ? 0xffcf99
              : trackDef.propTheme === 'sakura'
                ? 0xfde2eb
                : trackDef.propTheme === 'neon'
                  ? 0x93c5fd
                  : 0xfff3d4,
          );
          keyLight.intensity = trackDef.propTheme === 'neon' ? 1.5 : 1.95;

          pebbleMat.color.setHex(0x64748b);
          smokeMat.color.set(current.build.smokeColorHex);

          physics.bankedScore = 0;
          physics.zoneHits = 0;
          physics.maxCombo = 1.0;
          physics.resetToStart(trackWorld, current.build);
          if (carRig) {
            carRig.updateDamageVisual(physics.bodyIntegrity);
            lastAppliedDamage = physics.bodyIntegrity;
          }

          tandemRound = 1;
          tandemRole = 'lead';
          tandemLeadScore = 0;
          tandemAiChaseScore = 0;
          tandemAiLeadScore = 0;
          tandemBumpCooldown = 0;
          tandemAngleMatchPct = 0;
          aiCar.aiScore = 0;

          if (current.gameMode === 'tandem') {
            // Spawn Pro AI Rival Car (S15 / RX7 visual rival)
            const rivalId: CarId = current.carId === 'silvia_s15' ? 'rx7_fc3s' : 'silvia_s15';
            const rivalMeta = CAR_CATALOG.find((c) => c.id === rivalId) ?? CAR_CATALOG[0];
            const rivalBuild: CarBuildConfig = {
              ...current.build,
              carId: rivalId,
              paintHex: '#2563eb',
              paintFinish: 'metallic',
              rimColorHex: '#f8fafc',
              bodykit: 'widebody',
              spoiler: 'gtwing',
              underglowHex: '#38bdf8',
              bodyIntegrity: 100,
              tireHealth: 100,
              autoCounterSteer: true,
            };
            void rivalMeta;
            aiCarRig = buildPixarCar(rivalId, rivalBuild, { isSoftwareGl });
            scene.add(aiCarRig.root);
            aiCar.resetForRound(trackWorld, 'chase');
            physics.activeZoneBanner = 'RONDE 1: LEAD RUN! JAUHI ATAU PIMPIN AI';
            physics.activeZoneBannerTimer = 2.5;
            timeRemaining = 42;
          } else {
            timeRemaining = trackDef.durationSec;
          }

          raceFinished = false;
          raceIntroTimer = 1.45;
          driftAudio.startDriving();

          // Frame scenic front-quarter Pixar shot on race start, swooping behind car
          const sinH = Math.sin(physics.heading);
          const cosH = Math.cos(physics.heading);
          camera.position.set(
            physics.position.x + sinH * 8.5 + cosH * 5.2,
            3.1,
            physics.position.z + cosH * 8.5 - sinH * 5.2,
          );
          _smoothLookAt.set(physics.position.x, 1.05, physics.position.z);
          camera.lookAt(_smoothLookAt);
        }
      }

      // Smoothly slide the view so the car clears the Workshop panel
      applyViewOffset(false, dt);

      // Workshop Preset Camera Transition & Dynamic Animation
      if (current.mode === 'workshop') {
        if (presetDirtyRef.current) {
          presetDirtyRef.current = false;
          activePresetTransition = true;
        }
        if (activePresetTransition) {
          const target = presetTargets[current.workshopPreset];
          camera.position.x = THREE.MathUtils.damp(camera.position.x, target.pos.x, 6, dt);
          camera.position.y = THREE.MathUtils.damp(camera.position.y, target.pos.y, 6, dt);
          camera.position.z = THREE.MathUtils.damp(camera.position.z, target.pos.z, 6, dt);
          controls.target.x = THREE.MathUtils.damp(controls.target.x, target.look.x, 6, dt);
          controls.target.y = THREE.MathUtils.damp(controls.target.y, target.look.y, 6, dt);
          controls.target.z = THREE.MathUtils.damp(controls.target.z, target.look.z, 6, dt);

          if (camera.position.distanceTo(target.pos) < 0.04) {
            activePresetTransition = false;
          }
        }

        // Spring drop settle animation whenever car/parts change
        const springF = -140 * workshopDropOffset - 16 * workshopDropVel;
        workshopDropVel += springF * dt;
        workshopDropOffset += workshopDropVel * dt;

        if (carRig) {
          if (current.workshopPreset === 'action') {
            // Live Rally/Drift Action Diorama Pose
            carRig.root.rotation.y = THREE.MathUtils.damp(carRig.root.rotation.y, 0.72, 6, dt);
            const rumble = Math.sin(elapsed * 22) * 0.012;
            carRig.bodyGroup.position.y = carRig.baseChassisY + workshopDropOffset + rumble;
            carRig.bodyGroup.rotation.z = THREE.MathUtils.damp(carRig.bodyGroup.rotation.z, -0.11, 7, dt);
            carRig.bodyGroup.rotation.x = THREE.MathUtils.damp(carRig.bodyGroup.rotation.x, -0.04, 7, dt);

            // Dramatic counter-steer!
            carRig.frontLeftSteerGroup.rotation.y = THREE.MathUtils.damp(carRig.frontLeftSteerGroup.rotation.y, -0.58, 10, dt);
            carRig.frontRightSteerGroup.rotation.y = THREE.MathUtils.damp(carRig.frontRightSteerGroup.rotation.y, -0.58, 10, dt);

            workshopActionSpin += dt * 22;
            carRig.frontLeftWheel.rotation.x = -workshopActionSpin;
            carRig.frontRightWheel.rotation.x = workshopActionSpin;
            carRig.rearLeftWheel.rotation.x = -workshopActionSpin;
            carRig.rearRightWheel.rotation.x = workshopActionSpin;
            carRig.mudflaps.forEach((flap) => {
              flap.rotation.x = -0.48 + Math.sin(elapsed * 26) * 0.12;
            });
            carRig.exhaustFlames.forEach((f) => {
              f.visible = current.build.engineTier >= 2 && Math.sin(elapsed * 20) > 0.3;
              if (f.visible) f.scale.setScalar(0.85 + Math.random() * 0.45);
            });

            // Emit billowing dust/smoke & gravel spray from rear tires
            const sinH = Math.sin(carRig.root.rotation.y);
            const cosH = Math.cos(carRig.root.rotation.y);
            const backX = -sinH * 0.75 - cosH * 0.45;
            const backZ = -cosH * 0.75 + sinH * 0.45;
            carRig.rearWheelOffsets.forEach((offset) => {
              const wx = offset.x * cosH + offset.z * sinH;
              const wz = -offset.x * sinH + offset.z * cosH;
              if (Math.random() < 0.75) {
                emitSmoke(wx, 0.14, wz, 0.95, backX * 3.2, backZ * 3.2);
              }
              if (Math.random() < 0.6) {
                emitPebble(wx, 0.12, wz, backX, backZ, 0.85);
              }
            });
          } else {
            carRig.root.rotation.y += dt * 0.14;
            carRig.bodyGroup.position.y = carRig.baseChassisY + workshopDropOffset;
            carRig.bodyGroup.rotation.z = THREE.MathUtils.damp(carRig.bodyGroup.rotation.z, 0, 8, dt);
            carRig.bodyGroup.rotation.x = THREE.MathUtils.damp(carRig.bodyGroup.rotation.x, 0, 8, dt);
            carRig.frontLeftSteerGroup.rotation.y = THREE.MathUtils.damp(carRig.frontLeftSteerGroup.rotation.y, 0.18, 8, dt);
            carRig.frontRightSteerGroup.rotation.y = THREE.MathUtils.damp(carRig.frontRightSteerGroup.rotation.y, 0.18, 8, dt);
            carRig.mudflaps.forEach((flap) => {
              flap.rotation.x = THREE.MathUtils.damp(flap.rotation.x, 0, 8, dt);
            });
            carRig.exhaustFlames.forEach((f) => {
              f.visible = false;
            });
          }
        }
        controls.update();
      } else if (trackWorld && carRig) {
        trackWorld.update(elapsed, dt);
        const input = pollUnifiedInput(keys, current.touchControls);
        const carMeta = CAR_CATALOG.find((c) => c.id === current.carId) ?? CAR_CATALOG[0];
        const stats = calculateCarStats(carMeta, current.build);
        const trackDef = TRACKS.find((t) => t.id === current.trackId) ?? TRACKS[0];

        if (!current.isPaused && !raceFinished) {
          physics.step(
            dt,
            input,
            stats,
            current.build,
            trackWorld,
            trackDef.roadWidth / 2,
            () => driftAudio.playChime('zone'),
            () => driftAudio.playChime('initiate'),
            () => driftAudio.playChime('click'),
          );

          // Live Visual Bumper Damage Sync
          if (Math.abs(physics.bodyIntegrity - lastAppliedDamage) >= 2) {
            carRig.updateDamageVisual(physics.bodyIntegrity);
            lastAppliedDamage = physics.bodyIntegrity;
          }

          // Tandem AI Battle Step & Proximity/Collision Logic
          if (current.gameMode === 'tandem' && aiCarRig) {
            if (tandemBumpCooldown > 0) tandemBumpCooldown -= dt;
            const playerTrackInfo = trackWorld.getTrackInfo(physics.position.x, physics.position.z);
            const aiRole: 'lead' | 'chase' = tandemRole === 'lead' ? 'chase' : 'lead';
            aiCar.step(
              dt,
              aiRole,
              trackWorld,
              physics.position,
              physics.velocity,
              physics.heading,
              playerTrackInfo.t,
              trackDef.roadWidth / 2,
            );

            // Relative distance & radar coordinates in player's local frame
            const dxW = aiCar.position.x - physics.position.x;
            const dzW = aiCar.position.z - physics.position.z;
            tandemDistanceM = Math.round(Math.hypot(dxW, dzW) * 10) / 10;

            const pSin = Math.sin(physics.heading);
            const pCos = Math.cos(physics.heading);
            // Local right (+X right on radar) and local forward (+Z up on radar)
            tandemRadarDx = dxW * pCos - dzW * pSin;
            tandemRadarDz = dxW * pSin + dzW * pCos;

            // Angle Match % (same drift direction & similar angle magnitude)
            if (aiCar.slipAngleDeg >= 10 && physics.slipAngleDeg >= 10) {
              if (Math.sign(physics.signedSlipDeg) === Math.sign(aiCar.signedSlipDeg)) {
                tandemAngleMatchPct = Math.round(
                  THREE.MathUtils.clamp(
                    100 - Math.abs(physics.signedSlipDeg - aiCar.signedSlipDeg) * 2.3,
                    15,
                    100,
                  ),
                );
              } else {
                tandemAngleMatchPct = 0;
              }
            } else if (aiCar.slipAngleDeg < 10 && physics.slipAngleDeg < 12) {
              tandemAngleMatchPct = 100;
            } else {
              tandemAngleMatchPct = 25;
            }

            // Combined Tandem Proximity + Angle Match Scoring
            if (tandemRole === 'chase') {
              if (tandemDistanceM <= 5.8) {
                tandemProximityLabel = 'CLOSE PROXIMITY! 2.0x';
                if (physics.isDrifting) {
                  physics.liveDriftScore += (210 + tandemAngleMatchPct * 1.45) * dt;
                  if (tandemAngleMatchPct >= 75) {
                    physics.comboMultiplier = Math.min(5.0, physics.comboMultiplier + dt * 0.14);
                  }
                }
              } else if (tandemDistanceM <= 10.5) {
                tandemProximityLabel = 'GOOD PROXIMITY 1.5x';
                if (physics.isDrifting) {
                  physics.liveDriftScore += (125 + tandemAngleMatchPct * 0.9) * dt;
                }
              } else if (tandemDistanceM <= 16.5) {
                tandemProximityLabel = 'IN RANGE 1.1x';
                if (physics.isDrifting) {
                  physics.liveDriftScore += (55 + tandemAngleMatchPct * 0.4) * dt;
                }
              } else {
                tandemProximityLabel = 'TERLALU JAUH';
              }
            } else {
              tandemProximityLabel =
                tandemDistanceM <= 7.5 ? 'AI MENEMPEL KETAT!' : 'LEAD CLEAN';
              if (physics.isDrifting && physics.slipAngleDeg >= 24) {
                physics.liveDriftScore += (85 + Math.min(80, physics.slipAngleDeg) * 1.1) * dt;
              }
            }

            // Tandem Car-to-Car Bump Penalty
            if (tandemDistanceM < 2.85 && tandemBumpCooldown <= 0) {
              tandemBumpCooldown = 1.25;
              physics.bodyIntegrity = Math.max(0, physics.bodyIntegrity - 5);
              carRig.updateDamageVisual(physics.bodyIntegrity);
              lastAppliedDamage = physics.bodyIntegrity;
              physics.velocity.multiplyScalar(0.76);
              physics.triggerPenalty('TANDEM COLLISION! -5% BODI', 0.5);
              driftAudio.playChime('click');
            }
          }

          timeRemaining = Math.max(0, timeRemaining - dt);
          if (timeRemaining <= 0 && !raceFinished) {
            physics.bankPendingDrift();
            if (current.gameMode === 'tandem' && tandemRound === 1 && aiCarRig) {
              // Transition to Round 2 (Player Chase, AI Lead)
              tandemLeadScore = physics.bankedScore;
              tandemAiChaseScore = Math.round(aiCar.aiScore);
              tandemRound = 2;
              tandemRole = 'chase';
              tandemAngleMatchPct = 0;
              tandemDistanceM = 9.5;
              physics.bankedScore = 0;
              aiCar.aiScore = 0;
              physics.resetToStart(trackWorld);
              aiCar.resetForRound(trackWorld, 'lead');
              physics.activeZoneBanner = 'RONDE 2: CHASE RUN! KEJAR AI!';
              physics.activeZoneBannerTimer = 2.8;
              timeRemaining = 42;
              raceIntroTimer = 1.1;
              driftAudio.playChime('unlock');
            } else {
              raceFinished = true;
              driftAudio.stopDriving();

              if (current.gameMode === 'tandem') {
                const playerChase = physics.bankedScore;
                const aiLead = Math.round(aiCar.aiScore);
                const playerSum = tandemLeadScore + playerChase;
                const aiSum = tandemAiChaseScore + aiLead;
                current.onRaceFinish({
                  totalScore: playerSum,
                  maxCombo: Number(physics.maxCombo.toFixed(1)),
                  zoneHits: physics.zoneHits,
                  bodyIntegrityEnd: Math.round(physics.bodyIntegrity),
                  tireHealthEnd: Math.round(physics.tireHealth),
                  tandemResult: {
                    playerLead: tandemLeadScore,
                    playerChase,
                    aiLead,
                    aiChase: tandemAiChaseScore,
                    won: playerSum >= aiSum,
                  },
                });
              } else {
                current.onRaceFinish({
                  totalScore: physics.bankedScore,
                  maxCombo: Number(physics.maxCombo.toFixed(1)),
                  zoneHits: physics.zoneHits,
                  bodyIntegrityEnd: Math.round(physics.bodyIntegrity),
                  tireHealthEnd: Math.round(physics.tireHealth),
                });
              }
            }
          }

          // Update audio engine
          driftAudio.updateDriving({
            rpmRatio: physics.rpm / physics.maxRpm,
            throttle: input.throttle,
            slipIntensity:
              physics.isDrifting || physics.rearTraction < 0.65
                ? Math.min(1, Math.max(physics.slipAngleDeg / 42, (1 - physics.rearTraction) * 0.75))
                : 0,
            engineType: carMeta.engineSoundType,
            engineTier: current.build.engineTier,
            turboTier: current.build.turboTier,
          });
        }

        // Apply transforms to 3D Player CarRig (bodyGroup roll/squat + steering pivots + wheel spin)
        carRig.root.position.copy(physics.position);
        carRig.root.rotation.y = physics.heading;
        carRig.bodyGroup.position.y = carRig.baseChassisY + physics.suspensionBounceY;
        carRig.bodyGroup.rotation.z = physics.bodyRollRad;
        carRig.bodyGroup.rotation.x = physics.bodyPitchRad;

        carRig.frontLeftSteerGroup.rotation.y = physics.steerVisualRad;
        carRig.frontRightSteerGroup.rotation.y = physics.steerVisualRad;
        carRig.frontLeftWheel.rotation.x = -physics.frontWheelSpinRad;
        carRig.frontRightWheel.rotation.x = physics.frontWheelSpinRad;
        carRig.rearLeftWheel.rotation.x = -physics.rearWheelSpinRad;
        carRig.rearRightWheel.rotation.x = physics.rearWheelSpinRad;

        // Animate mudflaps & exhaust
        const flapKick = -Math.min(0.68, physics.speedKmh * 0.0038 + (physics.isDrifting ? 0.18 : 0));
        const flapFlutter = physics.speedKmh > 12 ? Math.sin(elapsed * 28) * 0.08 : 0;
        carRig.mudflaps.forEach((flap) => {
          flap.rotation.x = flapKick + flapFlutter;
        });

        carRig.taillightMat.emissiveIntensity = input.brake > 0.1 || input.handbrake ? 3.2 : 1.0;
        carRig.exhaustFlames.forEach((f) => {
          f.visible =
            physics.isBoosting ||
            (current.build.engineTier >= 2 &&
              physics.rpm > physics.maxRpm * 0.88 &&
              Math.random() > 0.5);
          if (f.visible) {
            f.scale.setScalar(0.8 + Math.random() * 0.55);
          }
        });

        // Apply transforms & tire smoke to AI Tandem CarRig
        if (current.gameMode === 'tandem' && aiCarRig) {
          aiCarRig.root.position.copy(aiCar.position);
          aiCarRig.root.rotation.y = aiCar.heading;
          aiCarRig.bodyGroup.position.y = aiCarRig.baseChassisY;
          aiCarRig.bodyGroup.rotation.z = aiCar.bodyRollRad;
          aiCarRig.bodyGroup.rotation.x = aiCar.bodyPitchRad;
          aiCarRig.frontLeftSteerGroup.rotation.y = aiCar.steerVisualRad;
          aiCarRig.frontRightSteerGroup.rotation.y = aiCar.steerVisualRad;
          aiCarRig.frontLeftWheel.rotation.x = -aiCar.wheelSpinRad;
          aiCarRig.frontRightWheel.rotation.x = aiCar.wheelSpinRad;
          aiCarRig.rearLeftWheel.rotation.x = -aiCar.wheelSpinRad;
          aiCarRig.rearRightWheel.rotation.x = aiCar.wheelSpinRad;
          if (!current.isPaused && aiCar.isDrifting && Math.random() < 0.55) {
            const aSin = Math.sin(aiCar.heading);
            const aCos = Math.cos(aiCar.heading);
            aiCarRig.rearWheelOffsets.forEach((offset) => {
              const wx = aiCar.position.x + offset.x * aCos + offset.z * aSin;
              const wz = aiCar.position.z - offset.x * aSin + offset.z * aCos;
              emitSmoke(wx, 0.12, wz, 0.72, -aSin * 1.2, -aCos * 1.2);
            });
          }
        }

        // KeyLight follows car so shadows stay razor sharp
        keyLight.position.set(
          physics.position.x + 22,
          32,
          physics.position.z + 18,
        );
        keyLight.target.position.copy(physics.position);

        // Emit thick asphalt tire smoke (intensified during rear burnout) & dark skidmarks
        if (
          !current.isPaused &&
          physics.speedKmh > 14 &&
          (physics.isDrifting || physics.rearTraction < 0.65 || input.handbrake || input.clutchKick)
        ) {
          const burnoutSmokeBoost =
            physics.rearTraction < 0.7 && input.throttle > 0.2 ? 0.35 * input.throttle : 0;
          const smokeIntensity = Math.min(
            1.35,
            Math.max(physics.slipAngleDeg / 42, 1 - physics.rearTraction) +
              burnoutSmokeBoost +
              (physics.isBoosting || input.clutchKick ? 0.28 : 0),
          );
          const sinH = Math.sin(physics.heading);
          const cosH = Math.cos(physics.heading);
          const pInfo = trackWorld.getTrackInfo(physics.position.x, physics.position.z);
          const offAsphalt = pInfo.distFromCenter > trackDef.roadWidth / 2 + 0.3;

          carRig.rearWheelOffsets.forEach((offset) => {
            const wx = physics.position.x + offset.x * cosH + offset.z * sinH;
            const wz = physics.position.z - offset.x * sinH + offset.z * cosH;
            if (Math.random() < 0.85) {
              emitSmoke(wx, 0.12, wz, smokeIntensity, -sinH * 1.4, -cosH * 1.4);
            }
            if (offAsphalt && Math.random() < 0.5) {
              emitPebble(wx, 0.1, wz, -sinH, -cosH, smokeIntensity);
            }
          });

          skidEmitAccum += physics.speedKmh * dt;
          if (skidEmitAccum > 0.95) {
            skidEmitAccum = 0;
            carRig.rearWheelOffsets.forEach((offset) => {
              const wx = physics.position.x + offset.x * cosH + offset.z * sinH;
              const wz = physics.position.z - offset.x * sinH + offset.z * cosH;
              emitSkid(wx, wz, physics.heading);
            });
          }
        }

        // Dynamic Chase / Drift Camera
        const sinH = Math.sin(physics.heading);
        const cosH = Math.cos(physics.heading);
        const velAngle =
          physics.velocity.lengthSq() > 4
            ? Math.atan2(physics.velocity.x, physics.velocity.z)
            : physics.heading;

        if (raceIntroTimer > 0 && !current.isPaused) {
          raceIntroTimer = Math.max(0, raceIntroTimer - dt);
          const t = 1 - raceIntroTimer / 1.45;
          const arcAngle = physics.heading + (1 - t * t) * (Math.PI * 0.72);
          const dist = 8.4 - t * 0.8;
          _camTargetPos.set(
            physics.position.x - Math.sin(arcAngle) * dist,
            3.15 - t * 0.3,
            physics.position.z - Math.cos(arcAngle) * dist,
          );
          _camLookAt.set(physics.position.x, 1.05, physics.position.z);
          camera.position.x = THREE.MathUtils.damp(camera.position.x, _camTargetPos.x, 7.5, dt);
          camera.position.y = THREE.MathUtils.damp(camera.position.y, _camTargetPos.y, 7.5, dt);
          camera.position.z = THREE.MathUtils.damp(camera.position.z, _camTargetPos.z, 7.5, dt);
          _smoothLookAt.x = THREE.MathUtils.damp(_smoothLookAt.x, _camLookAt.x, 9, dt);
          _smoothLookAt.y = THREE.MathUtils.damp(_smoothLookAt.y, _camLookAt.y, 9, dt);
          _smoothLookAt.z = THREE.MathUtils.damp(_smoothLookAt.z, _camLookAt.z, 9, dt);
        } else if (current.raceCameraMode === 'hood') {
          _camTargetPos.set(
            physics.position.x + sinH * 0.45,
            1.42,
            physics.position.z + cosH * 0.45,
          );
          _camLookAt.set(
            physics.position.x + sinH * 14,
            1.15,
            physics.position.z + cosH * 14,
          );
          camera.position.lerp(_camTargetPos, 0.55);
          _smoothLookAt.lerp(_camLookAt, 0.55);
        } else if (current.raceCameraMode === 'cinematic') {
          const orbitAng = elapsed * 0.45;
          _camTargetPos.set(
            physics.position.x + Math.sin(orbitAng) * 8.5,
            3.4,
            physics.position.z + Math.cos(orbitAng) * 8.5,
          );
          _camLookAt.set(physics.position.x, 0.9, physics.position.z);
          camera.position.x = THREE.MathUtils.damp(camera.position.x, _camTargetPos.x, 5, dt);
          camera.position.y = THREE.MathUtils.damp(camera.position.y, _camTargetPos.y, 5, dt);
          camera.position.z = THREE.MathUtils.damp(camera.position.z, _camTargetPos.z, 5, dt);
          _smoothLookAt.lerp(_camLookAt, 0.25);
        } else {
          // 'chase' or 'drift' (drift swings cleanly toward velocity vector like AI tandem replay shots!)
          let camHeading = physics.heading;
          if (current.raceCameraMode === 'drift') {
            // Target: hampir searah arah gerak (bukan arah hidung mobil), sehingga saat drift
            // mobil tampak miring dari samping dan background tidak menyapu cepat.
            const slipOffset = Math.atan2(Math.sin(velAngle - physics.heading), Math.cos(velAngle - physics.heading));
            const targetHeading = physics.heading + slipOffset * 0.9;
            if (!_driftCamReady) {
              _driftCamHeading = targetHeading;
              _driftCamReady = true;
            }
            // Sudut dihaluskan dengan laju rendah agar putaran kamera lambat dan tenang
            const diff = Math.atan2(
              Math.sin(targetHeading - _driftCamHeading),
              Math.cos(targetHeading - _driftCamHeading),
            );
            _driftCamHeading += THREE.MathUtils.damp(0, diff, 1.7, dt);
            camHeading = _driftCamHeading;
          } else {
            _driftCamReady = false;
          }
          const cSin = Math.sin(camHeading);
          const cCos = Math.cos(camHeading);
          const dist = current.raceCameraMode === 'drift' ? 8.3 : 7.4;
          const height = current.raceCameraMode === 'drift' ? 3.05 : 2.75;

          _camTargetPos.set(
            physics.position.x - cSin * dist,
            height,
            physics.position.z - cCos * dist,
          );
          _camLookAt.set(
            physics.position.x + cSin * 4.5,
            1.15,
            physics.position.z + cCos * 4.5,
          );
          camera.position.x = THREE.MathUtils.damp(camera.position.x, _camTargetPos.x, 8.5, dt);
          camera.position.y = THREE.MathUtils.damp(camera.position.y, _camTargetPos.y, 8.5, dt);
          camera.position.z = THREE.MathUtils.damp(camera.position.z, _camTargetPos.z, 8.5, dt);
          _smoothLookAt.x = THREE.MathUtils.damp(_smoothLookAt.x, _camLookAt.x, 11, dt);
          _smoothLookAt.y = THREE.MathUtils.damp(_smoothLookAt.y, _camLookAt.y, 11, dt);
          _smoothLookAt.z = THREE.MathUtils.damp(_smoothLookAt.z, _camLookAt.z, 11, dt);
        }

        camera.lookAt(_smoothLookAt);

        // Dynamic speed FOV widening
        const targetFov = 50 + Math.min(18, physics.speedKmh * 0.085) + (physics.isBoosting ? 5 : 0);
        if (Math.abs(camera.fov - targetFov) > 0.1) {
          camera.fov = THREE.MathUtils.damp(camera.fov, targetFov, 7, dt);
          camera.updateProjectionMatrix();
        }

        // Throttled telemetry push (~20Hz) so React HUD stays silky without 60fps re-renders
        telemetryTimer += dt;
        if (telemetryTimer >= 0.05) {
          telemetryTimer = 0;
          current.onTelemetry({
            speedKmh: physics.speedKmh,
            rpm: Math.round(physics.rpm),
            maxRpm: physics.maxRpm,
            gear: physics.gear,
            slipAngleDeg: physics.slipAngleDeg,
            signedSlipDeg: physics.signedSlipDeg,
            driftDirection: physics.driftDirection,
            isDrifting: physics.isDrifting,
            rearTraction: physics.rearTraction,
            steerLevel: physics.steerLevel,
            throttleLevel: physics.throttleLevel,
            brakeLevel: physics.brakeLevel,
            transmissionMode: physics.transmissionMode,
            driftPhase: physics.driftPhase,
            bankedScore: physics.bankedScore,
            liveDriftScore: Math.round(physics.liveDriftScore),
            comboMultiplier: Number(physics.comboMultiplier.toFixed(1)),
            comboGraceRatio: Math.max(0, Math.min(1, physics.driftGraceTimer / 1.15)),
            straightenRisk: physics.straightenRisk,
            oversteerRisk: physics.oversteerRisk,
            transitionProgress: physics.transitionProgress,
            driftCallout: physics.driftCallout,
            maxCombo: Number(physics.maxCombo.toFixed(1)),
            zoneHits: physics.zoneHits,
            activeZoneText: physics.activeZoneBanner,
            penaltyBanner: physics.penaltyBanner,
            timeRemaining,
            nitro: physics.nitro,
            carX: physics.position.x,
            carZ: physics.position.z,
            carHeading: physics.heading,
            bodyIntegrity: Math.round(physics.bodyIntegrity),
            tireHealth: Math.round(physics.tireHealth),
            autoCounterSteer: current.build.autoCounterSteer,
            gameMode: current.gameMode,
            tandemRound,
            tandemRole,
            tandemLeadScore,
            tandemChaseScore: tandemRound === 2 ? physics.bankedScore : 0,
            tandemAiScore: Math.round(aiCar.aiScore),
            tandemDistanceM,
            tandemProximityLabel,
            tandemAngleMatchPct,
            tandemAiAngleDeg: aiCar.slipAngleDeg,
            tandemRadarDx,
            tandemRadarDz,
            gamepadConnected: input.gamepadConnected,
            gamepadName: input.gamepadName,
          });
        }
      }

      // Update smoke particles
      let smokeDirty = false;
      for (let i = 0; i < SMOKE_COUNT; i++) {
        const p = smokePool[i];
        if (!p.active) continue;
        smokeDirty = true;
        p.life += dt;
        if (p.life >= p.maxLife) {
          p.active = false;
          _dummy.position.set(0, -50, 0);
          _dummy.scale.set(0, 0, 0);
        } else {
          const progress = p.life / p.maxLife;
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          p.z += p.vz * dt;
          const s = p.scale * (0.65 + progress * 2.0) * (1 - progress * 0.55);
          _dummy.position.set(p.x, p.y, p.z);
          _dummy.scale.set(s, s, s);
          _dummy.rotation.set(progress * 2.2, progress * 1.7, progress);
        }
        _dummy.updateMatrix();
        smokeInst.setMatrixAt(i, _dummy.matrix);
      }
      if (smokeDirty) {
        smokeInst.instanceMatrix.needsUpdate = true;
      }

      // Update kicked-up gravel/pebble chunks with gravity bounce
      let pebbleDirty = false;
      for (let i = 0; i < PEBBLE_COUNT; i++) {
        const p = pebblePool[i];
        if (!p.active) continue;
        pebbleDirty = true;
        p.life += dt;
        if (p.life >= p.maxLife) {
          p.active = false;
          _dummy.position.set(0, -50, 0);
          _dummy.scale.set(0, 0, 0);
        } else {
          p.vy -= 18 * dt;
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          p.z += p.vz * dt;
          if (p.y < 0.06) {
            p.y = 0.06;
            p.vy = Math.abs(p.vy) * 0.42;
            p.vx *= 0.72;
            p.vz *= 0.72;
          }
          const fade = 1 - Math.pow(p.life / p.maxLife, 2);
          const s = p.scale * fade;
          _dummy.position.set(p.x, p.y, p.z);
          _dummy.rotation.set(p.rx + p.life * 8, p.ry + p.life * 6, 0);
          _dummy.scale.set(s, s, s);
        }
        _dummy.updateMatrix();
        pebbleInst.setMatrixAt(i, _dummy.matrix);
      }
      if (pebbleDirty) {
        pebbleInst.instanceMatrix.needsUpdate = true;
      }

      renderer.render(scene, camera);

      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        frameId = requestAnimationFrame(tick);
      }
    };

    tick();

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      driftAudio.stopDriving();
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('resize', handleResize);
      controls.removeEventListener('start', handleControlStart);
      controls.dispose();
      renderer.domElement.removeEventListener('webglcontextlost', handleContextLost);
      renderer.domElement.removeEventListener('webglcontextrestored', handleContextRestored);

      carRig?.dispose();
      aiCarRig?.dispose();
      trackWorld?.dispose();
      floorGeo.dispose();
      floorMat.dispose();
      platformGeo.dispose();
      platformMat.dispose();
      ringGeo.dispose();
      ringMat.dispose();
      smokeGeo.dispose();
      smokeMat.dispose();
      pebbleGeo.dispose();
      pebbleMat.dispose();
      skidGeo.dispose();
      skidMat.dispose();
      envTex.dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <div className="relative w-full h-full overflow-hidden bg-black">
      <div ref={mountRef} className="w-full h-full" />
      {contextLost && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-950/95 text-center p-6 z-50">
          <div className="max-w-md space-y-2">
            <h2 className="text-xl font-semibold text-white">Konteks 3D WebGL Terputus</h2>
            <p className="text-sm text-slate-300">
              GPU sedang memulihkan konteks grafis. Muat ulang halaman jika tampilan tidak kembali otomatis.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
