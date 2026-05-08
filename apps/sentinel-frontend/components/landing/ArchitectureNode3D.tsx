'use client';
import { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface Props {
  type: 'blockchain' | 'stream' | 'parser' | 'engine' | 'responder' | 'dashboard';
  color: string;
  isActive: boolean;
  width: number;
  height: number;
}

export default function ArchitectureNode3D({ type, color, isActive, width, height }: Props) {
  const mountRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const frameRef = useRef<number>(0);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    // Scene
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 1.5, 4);
    camera.lookAt(0, 0, 0);

    // Renderer — transparent background
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = true;
    mount.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Lights
    const ambient = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambient);
    const dirLight = new THREE.DirectionalLight(0xdbeafe, 1.2);
    dirLight.position.set(3, 5, 3);
    scene.add(dirLight);

    // Active glow light
    const glowLight = new THREE.PointLight(new THREE.Color(color), isActive ? 1.5 : 0, 3);
    glowLight.position.set(0, 0.5, 0);
    scene.add(glowLight);

    // Material
    const mat = new THREE.MeshPhongMaterial({
      color: new THREE.Color(color),
      shininess: 80,
      specular: new THREE.Color(0xffffff),
      transparent: true,
      opacity: 0.92,
    });

    // Build geometry based on type
    let mesh: THREE.Object3D;

    switch (type) {
      case 'blockchain': {
        const group = new THREE.Group();
        const boxGeo = new THREE.BoxGeometry(0.7, 0.7, 0.7);
        for (let i = 0; i < 3; i++) {
          const cube = new THREE.Mesh(boxGeo, mat.clone());
          cube.position.set(
            (i - 1) * 0.3,
            i * 0.4,
            (i % 2 === 0 ? 0.1 : -0.1)
          );
          cube.rotation.y = (i * Math.PI) / 6;
          group.add(cube);
          if (i > 0) {
            const linkGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.5, 8);
            const link = new THREE.Mesh(linkGeo, new THREE.MeshPhongMaterial({ color: new THREE.Color(color), opacity: 0.5, transparent: true }));
            link.position.set((i - 1.5) * 0.3, (i - 0.5) * 0.4, 0);
            link.rotation.z = Math.PI / 4;
            group.add(link);
          }
        }
        mesh = group;
        break;
      }
      case 'stream': {
        const group = new THREE.Group();
        const tubeGeo = new THREE.CylinderGeometry(0.08, 0.08, 2, 12);
        const tube = new THREE.Mesh(tubeGeo, new THREE.MeshPhongMaterial({ color: new THREE.Color(color), opacity: 0.4, transparent: true }));
        tube.rotation.z = Math.PI / 4;
        group.add(tube);
        for (let i = 0; i < 4; i++) {
          const orb = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 12), mat.clone());
          orb.position.set(-0.7 + i * 0.45, -0.7 + i * 0.45, 0);
          group.add(orb);
        }
        mesh = group;
        break;
      }
      case 'parser': {
        const group = new THREE.Group();
        const hexGeo = new THREE.CylinderGeometry(0.3, 0.3, 0.8, 6);
        for (let i = 0; i < 3; i++) {
          const hex = new THREE.Mesh(hexGeo, mat.clone());
          hex.position.set((i - 1) * 0.6, i * 0.25, 0);
          hex.scale.y = 0.7 + i * 0.2;
          group.add(hex);
        }
        mesh = group;
        break;
      }
      case 'engine': {
        const group = new THREE.Group();
        const pyGeo = new THREE.ConeGeometry(0.6, 1.2, 4);
        const pyramid = new THREE.Mesh(pyGeo, mat.clone());
        group.add(pyramid);
        const tip = new THREE.Mesh(
          new THREE.SphereGeometry(0.12, 12, 12),
          new THREE.MeshPhongMaterial({ color: 0xfbbf24, emissive: 0xf59e0b, emissiveIntensity: isActive ? 1.5 : 0.3 })
        );
        tip.position.set(0, 0.7, 0);
        group.add(tip);
        mesh = group;
        break;
      }
      case 'responder': {
        const shape = new THREE.Shape();
        shape.moveTo(0, 1);
        shape.lineTo(0.8, 0.5);
        shape.lineTo(0.8, -0.3);
        shape.lineTo(0, -1);
        shape.lineTo(-0.8, -0.3);
        shape.lineTo(-0.8, 0.5);
        shape.closePath();
        const extrudeSettings = { depth: 0.25, bevelEnabled: true, bevelSize: 0.05, bevelThickness: 0.05 };
        const shieldGeo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
        mesh = new THREE.Mesh(shieldGeo, mat.clone());
        mesh.scale.set(0.65, 0.65, 0.65);
        break;
      }
      case 'dashboard': {
        const group = new THREE.Group();
        const screen = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.9, 0.06), mat.clone());
        const frame = new THREE.Mesh(
          new THREE.BoxGeometry(1.5, 1.0, 0.04),
          new THREE.MeshPhongMaterial({ color: new THREE.Color(color), opacity: 0.3, transparent: true })
        );
        screen.position.z = 0.03;
        group.add(frame);
        group.add(screen);
        group.rotation.x = 0.15;
        mesh = group;
        break;
      }
      default:
        mesh = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.8, 0.8), mat.clone());
    }

    scene.add(mesh);

    let t = 0;
    function animate() {
      frameRef.current = requestAnimationFrame(animate);
      t += 0.016;
      mesh.rotation.y += 0.004;
      mesh.position.y = Math.sin(t * 0.8) * 0.06;
      glowLight.intensity = isActive ? 1.2 + Math.sin(t * 2) * 0.3 : 0;
      renderer.render(scene, camera);
    }
    animate();

    return () => {
      cancelAnimationFrame(frameRef.current);
      renderer.dispose();
      if (mount.contains(renderer.domElement)) {
        mount.removeChild(renderer.domElement);
      }
    };
  }, [type, color, isActive, width, height]);

  return <div ref={mountRef} style={{ width, height }} />;
}
