import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

/**
 * InvoiceX Subtle Ambient Background
 * Features small floating, glass-like 3D finance icons:
 * - Invoice / document
 * - Verification check
 * - Search
 * - Approval shield
 * - Payment / card
 * - Reconciliation balance
 * - Report / analytics
 * - Vendor / business
 *
 * Minimal, lightweight, balanced spacing, low opacity, no network lines or distracting graphics.
 */
export const CinematicBackground = () => {
  const mountRef = useRef(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    // Scene, Camera, Renderer
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 1, 1000);
    camera.position.z = 220;

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: 'low-power',
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    mount.appendChild(renderer.domElement);

    /**
     * Helper: Generate a high-DPI glass-style icon texture
     */
    const createIconTexture = (type) => {
      const canvas = document.createElement('canvas');
      canvas.width = 128;
      canvas.height = 128;
      const ctx = canvas.getContext('2d');
      if (!ctx) return new THREE.Texture();

      ctx.clearRect(0, 0, 128, 128);

      // Glass-like rounded card backing
      const r = 24;
      const x = 14;
      const y = 14;
      const w = 100;
      const h = 100;

      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.lineTo(x + w - r, y);
      ctx.quadraticCurveTo(x + w, y, x + w, y + r);
      ctx.lineTo(x + w, y + h - r);
      ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      ctx.lineTo(x + r, y + h);
      ctx.quadraticCurveTo(x, y + h, x, y + h - r);
      ctx.lineTo(x, y + r);
      ctx.quadraticCurveTo(x, y, x + r, y);
      ctx.closePath();

      // Soft translucent glass gradient fill
      const grad = ctx.createLinearGradient(x, y, x + w, y + h);
      grad.addColorStop(0, 'rgba(255, 255, 255, 0.16)');
      grad.addColorStop(1, 'rgba(224, 242, 254, 0.05)');
      ctx.fillStyle = grad;
      ctx.fill();

      // Crisp 1px glass rim
      ctx.strokeStyle = 'rgba(186, 230, 253, 0.45)';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Icon stroke styles
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.85)'; // Sky blue
      ctx.fillStyle = 'rgba(56, 189, 248, 0.85)';
      ctx.lineWidth = 3.5;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      ctx.beginPath();

      switch (type) {
        case 'INVOICE': {
          // Document with folded top-right corner and lines
          ctx.strokeRect(42, 34, 44, 60);
          // Top-right corner fold
          ctx.moveTo(70, 34);
          ctx.lineTo(70, 48);
          ctx.lineTo(86, 48);
          // Horizontal ledger lines
          ctx.moveTo(50, 58);
          ctx.lineTo(76, 58);
          ctx.moveTo(50, 68);
          ctx.lineTo(76, 68);
          ctx.moveTo(50, 78);
          ctx.lineTo(66, 78);
          ctx.stroke();
          break;
        }

        case 'VERIFICATION': {
          // Rounded check badge
          ctx.arc(64, 64, 26, 0, Math.PI * 2);
          ctx.stroke();
          // Checkmark
          ctx.beginPath();
          ctx.moveTo(50, 64);
          ctx.lineTo(60, 74);
          ctx.lineTo(78, 54);
          ctx.stroke();
          break;
        }

        case 'SEARCH': {
          // Magnifying lens
          ctx.arc(58, 56, 18, 0, Math.PI * 2);
          ctx.stroke();
          // Handle
          ctx.beginPath();
          ctx.moveTo(71, 69);
          ctx.lineTo(88, 86);
          ctx.lineWidth = 4.5;
          ctx.stroke();
          break;
        }

        case 'APPROVAL': {
          // Manager approval shield
          ctx.moveTo(64, 34);
          ctx.quadraticCurveTo(86, 36, 86, 62);
          ctx.quadraticCurveTo(86, 82, 64, 94);
          ctx.quadraticCurveTo(42, 82, 42, 62);
          ctx.quadraticCurveTo(42, 36, 64, 34);
          ctx.stroke();
          // Inner checkmark
          ctx.beginPath();
          ctx.moveTo(52, 62);
          ctx.lineTo(60, 70);
          ctx.lineTo(76, 54);
          ctx.stroke();
          break;
        }

        case 'PAYMENT': {
          // Credit / debit card
          ctx.strokeRect(36, 42, 56, 38);
          // Magnetic strip
          ctx.moveTo(36, 52);
          ctx.lineTo(92, 52);
          ctx.stroke();
          // Chip badge
          ctx.beginPath();
          ctx.strokeRect(44, 62, 10, 8);
          break;
        }

        case 'RECONCILIATION': {
          // Balance scale
          // Central pillar
          ctx.moveTo(64, 38);
          ctx.lineTo(64, 88);
          // Beam
          ctx.moveTo(40, 48);
          ctx.lineTo(88, 48);
          // Base
          ctx.moveTo(48, 88);
          ctx.lineTo(80, 88);
          ctx.stroke();
          // Left Pan
          ctx.beginPath();
          ctx.moveTo(36, 66);
          ctx.lineTo(52, 66);
          ctx.moveTo(44, 48);
          ctx.lineTo(36, 66);
          ctx.moveTo(44, 48);
          ctx.lineTo(52, 66);
          // Right Pan
          ctx.moveTo(76, 66);
          ctx.lineTo(92, 66);
          ctx.moveTo(84, 48);
          ctx.lineTo(76, 66);
          ctx.moveTo(84, 48);
          ctx.lineTo(92, 66);
          ctx.stroke();
          break;
        }

        case 'REPORT': {
          // 3 ascending metric bars + trend line
          ctx.strokeRect(40, 68, 10, 22);
          ctx.strokeRect(58, 54, 10, 36);
          ctx.strokeRect(76, 40, 10, 50);
          // Ascending trend line
          ctx.beginPath();
          ctx.moveTo(36, 64);
          ctx.lineTo(54, 48);
          ctx.lineTo(72, 52);
          ctx.lineTo(90, 34);
          ctx.stroke();
          break;
        }

        case 'VENDOR': {
          // Minimal enterprise building
          ctx.strokeRect(44, 42, 40, 48);
          // Door
          ctx.strokeRect(58, 72, 12, 18);
          // Windows
          ctx.strokeRect(50, 48, 8, 8);
          ctx.strokeRect(70, 48, 8, 8);
          ctx.strokeRect(50, 60, 8, 8);
          ctx.strokeRect(70, 60, 8, 8);
          break;
        }

        default:
          break;
      }

      const texture = new THREE.CanvasTexture(canvas);
      texture.minFilter = THREE.LinearFilter;
      texture.magFilter = THREE.LinearFilter;
      return texture;
    };

    // Pre-create textures for the 8 finance archetypes
    const iconTypes = [
      'INVOICE',
      'VERIFICATION',
      'SEARCH',
      'APPROVAL',
      'PAYMENT',
      'RECONCILIATION',
      'REPORT',
      'VENDOR',
    ];

    const textures = iconTypes.map((type) => createIconTexture(type));

    // Spawn 18 balanced, floating 3D tiles with plenty of empty space
    const tileCount = 18;
    const tiles = [];
    const tileGeometry = new THREE.PlaneGeometry(16, 16);

    for (let i = 0; i < tileCount; i++) {
      const tex = textures[i % textures.length];
      const material = new THREE.MeshBasicMaterial({
        map: tex,
        transparent: true,
        opacity: 0.28,
        side: THREE.DoubleSide,
        depthWrite: false,
      });

      const mesh = new THREE.Mesh(tileGeometry, material);

      // Distribute evenly across viewport with depth
      const col = (i % 6) - 2.5; // -2.5 to 2.5
      const row = Math.floor(i / 6) - 1; // -1 to 1

      mesh.position.x = col * 75 + (Math.random() - 0.5) * 30;
      mesh.position.y = row * 65 + (Math.random() - 0.5) * 25;
      mesh.position.z = (Math.random() - 0.5) * 60;

      // Subtle initial 3D rotation
      mesh.rotation.x = (Math.random() - 0.5) * 0.4;
      mesh.rotation.y = (Math.random() - 0.5) * 0.4;
      mesh.rotation.z = (Math.random() - 0.5) * 0.2;

      // Unique gentle float & sway physics
      const floatData = {
        baseY: mesh.position.y,
        baseX: mesh.position.x,
        speedY: 0.0008 + Math.random() * 0.0006,
        speedRot: 0.001 + Math.random() * 0.0015,
        offset: Math.random() * Math.PI * 2,
        amplitude: 6 + Math.random() * 6,
      };

      scene.add(mesh);
      tiles.push({ mesh, data: floatData, material });
    }

    // Gentle mouse parallax
    let mouseX = 0;
    let mouseY = 0;
    let targetX = 0;
    let targetY = 0;

    const onMouseMove = (e) => {
      mouseX = (e.clientX - window.innerWidth / 2) * 0.03;
      mouseY = (e.clientY - window.innerHeight / 2) * 0.03;
    };

    window.addEventListener('mousemove', onMouseMove, { passive: true });

    // Window resize handler
    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };

    window.addEventListener('resize', handleResize);

    // Animation Loop (60 FPS lightweight)
    let animId;
    let clock = 0;

    const animate = () => {
      animId = requestAnimationFrame(animate);
      clock += 0.016;

      // Smooth subtle mouse follow
      targetX += (mouseX - targetX) * 0.03;
      targetY += (mouseY - targetY) * 0.03;
      scene.rotation.y = targetX * 0.0008;
      scene.rotation.x = targetY * 0.0008;

      // Update each icon's gentle float
      for (let i = 0; i < tiles.length; i++) {
        const { mesh, data } = tiles[i];
        mesh.position.y = data.baseY + Math.sin(clock * 1.5 + data.offset) * data.amplitude;
        mesh.position.x = data.baseX + Math.cos(clock * 0.8 + data.offset) * 2;
        mesh.rotation.y += data.speedRot * 0.5;
        mesh.rotation.z = Math.sin(clock * 0.5 + data.offset) * 0.08;
      }

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('resize', handleResize);
      if (mount && renderer.domElement) {
        mount.removeChild(renderer.domElement);
      }
      tileGeometry.dispose();
      textures.forEach((t) => t.dispose());
      tiles.forEach((t) => t.material.dispose());
      renderer.dispose();
    };
  }, []);

  return (
    <div
      ref={mountRef}
      className="fixed inset-0 pointer-events-none z-0 opacity-45 overflow-hidden"
      aria-hidden="true"
    />
  );
};

export default CinematicBackground;
