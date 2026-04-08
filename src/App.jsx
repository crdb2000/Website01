import { Suspense, useState, useRef, useLayoutEffect, useMemo, useEffect } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { useGLTF, Environment, useVideoTexture } from '@react-three/drei'
import { EffectComposer, Noise, ToneMapping } from '@react-three/postprocessing'
import { useSpring, animated } from '@react-spring/three'
import * as THREE from 'three'

const FILL_COLOR = new THREE.Color('#eae6e4') 
const WHITE = new THREE.Color('#ffffff')

function VideoOverlay({ url, active }) {
  const texture = useVideoTexture(url, { muted: true, loop: true, start: true })
  const meshRef = useRef()
  useFrame((state) => {
    meshRef.current.position.copy(state.camera.position)
    meshRef.current.quaternion.copy(state.camera.quaternion)
    meshRef.current.translateZ(-1) 
  })

  return (
    <mesh ref={meshRef} renderOrder={1}>
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial 
        map={texture} 
        transparent={true} 
        opacity={active ? 0.25 : 0} 
        depthTest={false} 
      />
    </mesh>
  )
}

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
        child.renderOrder = active ? 2 : 0 
        if (child.material.map) child.material.map.colorSpace = THREE.SRGBColorSpace
      }
    })
  }, [clone, url, active])

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
      const idleWave = Math.sin(t * 1 + index * 0.8) * 0.02
      const activeExtra = (Math.sin(t * 1.5 + index) * 0.012) * f
      groupRef.current.position.y = idleWave + activeExtra
      groupRef.current.rotation.x = (Math.cos(t * 1 + index) * 0.015) * f
      groupRef.current.rotation.z = (Math.sin(t * 1 + index) * 0.01) * f
    }

    clone.traverse((child) => {
      if (child.isMesh) {
        child.material.emissiveIntensity = THREE.MathUtils.lerp(restIntensity, activePulse, f)
        const dimFactor = (!active && props.anyActive) ? 0.5 : 1
        child.material.color.lerpColors(WHITE, FILL_COLOR, f).multiplyScalar(dimFactor)
      }
    })
  })

  return (
    <animated.group {...props} position-y={posY}>
      <group ref={groupRef}>
        <mesh onPointerOver={(e) => { e.stopPropagation(); onHover(index) }} onPointerOut={() => onHover(null)}>
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
    '/Cartridge_Web_04.glb', '/Web_Cart_02_V1.glb', '/Web_Cart_03_V1.glb', '/Web_Cart_04_V1.glb',
    '/Web_Cart_05_V1.glb', '/Web_Cart_06_V1.glb', '/Web_Cart_07_V1.glb', '/Web_Cart_08_V1.glb'
  ]

  const moveLeft = () => {
    setHoveredIndex((prev) => (prev === null || prev >= 7 ? 0 : prev + 1))
  }
  const moveRight = () => {
    setHoveredIndex((prev) => (prev === null || prev <= 0 ? 7 : prev - 1))
  }

  // KEYBOARD NAVIGATION LOGIC
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'ArrowLeft') moveLeft()
      if (event.key === 'ArrowRight') moveRight()
    }
    window.addEventListener('keydown', handleKeyDown)
    // Clean up listener when component unmounts
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, []) // Empty array means this runs once on load

  const activeVideo = useMemo(() => {
    if (hoveredIndex === 1) return "/WebBG_LBL_01_NewLarge.mp4"
    if (hoveredIndex !== null) return `/Web_BG_${String(hoveredIndex + 1).padStart(2, '0')}.mp4`
    return null
  }, [hoveredIndex])
  
  return (
    <>
      <style>{`
        * { margin: 0; padding: 0; -webkit-tap-highlight-color: transparent; }
        html, body, #root { width: 100%; height: 100%; overflow: hidden; background-color: #000; font-family: sans-serif; }
        .bg-container { position: absolute; top: 0; left: 0; width: 100%; height: 100%; z-index: 1; }
        .bg-layer { position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: cover; transition: opacity 0.8s ease-in-out; }
        .base-bg { z-index: 1; background-image: url('/bg.png'); background-size: cover; background-position: center; }
        .ui-overlay { position: absolute; top: 0; left: 0; width: 100%; height: 100%; z-index: 20; pointer-events: none; display: flex; box-sizing: border-box; padding: 0 40px; align-items: flex-end; justify-content: space-between; padding-bottom: 60px; }
        .nav-button { width: 65px; height: 65px; border-radius: 50%; background: rgba(255, 255, 255, 0.08); backdrop-filter: blur(15px); -webkit-backdrop-filter: blur(15px); border: 1px solid rgba(255, 255, 255, 0.15); color: white; font-size: 24px; font-weight: bold; display: flex; align-items: center; justify-content: center; cursor: pointer; pointer-events: auto; transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275); user-select: none; line-height: 0; padding-bottom: 3px; }
        .nav-button:hover { background: rgba(255, 255, 255, 0.15); border: 1px solid rgba(255, 255, 255, 0.4); transform: scale(1.1); }
        .nav-button:active { transform: scale(0.9); }
        @media (min-width: 769px) { .ui-overlay { align-items: center; padding-bottom: 0; } .nav-button { width: 80px; height: 80px; font-size: 30px; } .nav-button:hover { transform: scale(1.1); } .nav-button:active { transform: scale(0.95); } }
      `}</style>

      <div className="bg-container">
        <div className="bg-layer base-bg" />
        <video key={activeVideo} className="bg-layer" muted loop playsInline autoPlay style={{ opacity: hoveredIndex !== null ? 1 : 0, zIndex: 2 }}>
          <source src={activeVideo} type="video/mp4" />
        </video>
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
          camera={{ position: isMobile ? [4, 0.8, 4] : [5, 0.8, 5], fov: isMobile ? 25 : 10 }} 
        >
          <Suspense fallback={null}>
             <Environment files="/the_sky_is_on_fire_2kBW.hdr" intensity={35} rotation={[0, Math.PI * (200 / 180), 0]} />
             {activeVideo && <VideoOverlay url={activeVideo} active={hoveredIndex !== null} />}
             <group position={isMobile ? [0.73, 0.1, 0.4] : [0.75, -0.1, 0.4]}>
                {cartridgeModels.map((url, i) => (
                  <GbaInstance 
                    key={i} 
                    index={i} 
                    url={url} 
                    active={hoveredIndex === i} 
                    anyActive={hoveredIndex !== null} 
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