import { Suspense, useState, useRef, useLayoutEffect, useMemo } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { useGLTF, Environment } from '@react-three/drei'
import { EffectComposer, Noise, ToneMapping } from '@react-three/postprocessing'
import { useSpring, animated } from '@react-spring/three'
import * as THREE from 'three'

const FILL_COLOR = new THREE.Color('#eae6e4') 
const WHITE = new THREE.Color('#ffffff')

function GbaInstance({ index, url, onHover, active, ...props }) {
  const { scene } = useGLTF(url)
  const clone = useMemo(() => scene.clone(true), [scene])
  const groupRef = useRef()
  const startTime = useRef(0) 
  const lastActive = useRef(false) 

  useLayoutEffect(() => {
    clone.traverse((child) => {
      if (child.isMesh) {
        child.material = child.material.clone()
        child.material.dithering = true
        child.material.color.set(WHITE)
        child.material.emissive.set(WHITE)
        child.material.metalness = 0.2
        child.material.roughness = 0.4
        child.material.transparent = false 
        if (child.material.map) child.material.map.colorSpace = THREE.SRGBColorSpace
      }
    })
  }, [clone, url])

  const { posY, factor } = useSpring({
    posY: active ? 0.35 : 0,
    factor: active ? 1 : 0,
    config: { mass: 2, tension: 70, friction: 26 }
  })

  useFrame((state) => {
    const t = state.clock.getElapsedTime()
    const f = factor.get()

    if (active && !lastActive.current) startTime.current = t
    lastActive.current = active

    const localTime = t - startTime.current
    const activePulse = 8.5 + (Math.sin(localTime * 3.75 + Math.PI / 2) * 6.5)
    const restIntensity = 2.5 

    if (groupRef.current) {
      groupRef.current.position.y = (Math.sin(t * 1.5 + index) * 0.012) * f
      groupRef.current.rotation.x = (Math.cos(t * 1 + index) * 0.015) * f
      groupRef.current.rotation.z = (Math.sin(t * 1 + index) * 0.01) * f
    }

    clone.traverse((child) => {
      if (child.isMesh) {
        child.material.color.lerpColors(WHITE, FILL_COLOR, f)
        child.material.emissive.lerpColors(WHITE, FILL_COLOR, f)
        child.material.emissiveIntensity = THREE.MathUtils.lerp(restIntensity, activePulse, f)
      }
    })
  })

  return (
    <animated.group {...props} position-y={posY}>
      <group ref={groupRef}>
        <mesh 
          onPointerOver={(e) => { e.stopPropagation(); onHover(index) }} 
          onPointerOut={() => onHover(null)}
        >
          <boxGeometry args={[0.35, 0.5, 0.06]} /> 
          <meshBasicMaterial transparent opacity={0} />
        </mesh>
        <primitive object={clone} rotation={[0, Math.PI + (75 * Math.PI / 180), 0]} scale={[1.2, 1.2, 1.2]} />
      </group>
    </animated.group>
  )
}

export default function App() {
  const [hoveredIndex, setHoveredIndex] = useState(null)
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)

  useLayoutEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const cartridgeModels = [
    '/Cartridge_Web_04.glb',
    '/Web_Cart_02_V1.glb',
    '/Web_Cart_03_V1.glb',
    '/Web_Cart_04_V1.glb',
    '/Web_Cart_05_V1.glb',
    '/Web_Cart_06_V1.glb',
    '/Web_Cart_07_V1.glb',
    '/Web_Cart_08_V1.glb'
  ]

  const moveLeft = () => {
    setHoveredIndex((prev) => (prev === null || prev >= 7 ? 0 : prev + 1))
  }
  const moveRight = () => {
    setHoveredIndex((prev) => (prev === null || prev <= 0 ? 7 : prev - 1))
  }

  const getBgImage = () => {
    if (hoveredIndex === null) return "/bg.png"
    const num = String(hoveredIndex + 1).padStart(2, '0')
    return `/Web_BG_${num}.png`
  }
  
  return (
    <>
      <style>{`
        * { margin: 0; padding: 0; -webkit-tap-highlight-color: transparent; }
        html, body, #root { width: 100%; height: 100%; overflow: hidden; background-color: #000; font-family: sans-serif; }
        
        .bg-container { position: absolute; top: 0; left: 0; width: 100%; height: 100%; z-index: 1; }
        .bg-layer { position: absolute; top: 0; left: 0; width: 100%; height: 100%; background-size: cover; background-position: center; background-repeat: no-repeat; transition: background-image 0.5s ease-in-out, opacity 0.5s ease-in-out; }
        
        .ui-overlay {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          z-index: 20;
          pointer-events: none;
          display: flex;
          align-items: flex-end; /* ANCHORED TO BOTTOM */
          justify-content: space-between;
          padding: 0 30px 60px 30px; /* 60px bottom margin */
          box-sizing: border-box;
        }

        .nav-button {
          width: 60px;
          height: 60px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.2);
          color: white;
          font-size: 22px;
          font-weight: bold;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          pointer-events: auto;
          transition: all 0.2s;
          user-select: none;
          line-height: 0;
          padding-bottom: 2px;
        }

        .nav-button:active {
          transform: scale(0.85);
          background: rgba(255, 255, 255, 0.3);
        }

        @media (min-width: 769px) {
          .nav-button { display: none; }
        }
      `}</style>

      <div className="bg-container">
        <div className="bg-layer" style={{ backgroundImage: `url('/bg.png')`, zIndex: 1 }} />
        <div className="bg-layer" style={{ backgroundImage: `url('${getBgImage()}')`, opacity: hoveredIndex !== null ? 1 : 0, zIndex: 2 }} />
      </div>

      <div className="ui-overlay">
        <div className="nav-button" onClick={moveLeft}> &lt; </div>
        <div className="nav-button" onClick={moveRight}> &gt; </div>
      </div>

      <div style={{ width: '100vw', height: '100vh', position: 'relative', zIndex: 10 }}>
        <Canvas 
          key={isMobile ? 'mobile' : 'desktop'}
          dpr={[1, 2]} 
          gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }} 
          camera={{ 
            position: isMobile ? [4, 0.8, 4] : [5, 0.8, 5], 
            fov: isMobile ? 25 : 10 
          }} 
        >
          <Suspense fallback={null}>
             <Environment files="/the_sky_is_on_fire_2kBW.hdr" intensity={35} rotation={[0, Math.PI * (200 / 180), 0]} />
             
             <group position={isMobile ? [0.73, 0.1, 0.4] : [0.9, -0.1, 0.4]}>
                {cartridgeModels.map((url, i) => (
                  <GbaInstance 
                    key={i} 
                    index={i} 
                    url={url} 
                    active={hoveredIndex === i} 
                    onHover={setHoveredIndex} 
                    position={[i * -0.28, 0, i * -0.15]} 
                  />
                ))}
             </group>
          </Suspense>

          <EffectComposer multisampling={0}>
            <ToneMapping mode={THREE.ACESFilmicToneMapping} exposure={3.0} />
            <Noise opacity={0.015} />
          </EffectComposer>
        </Canvas>
      </div>
    </>
  )
}