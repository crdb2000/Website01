import { Suspense, useState, useRef, useLayoutEffect, useMemo, useEffect } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { useGLTF, Environment } from '@react-three/drei'
import { EffectComposer, Noise, ToneMapping } from '@react-three/postprocessing'
import { useSpring, animated } from '@react-spring/three'
import * as THREE from 'three'
import { BrowserRouter as Router, Routes, Route, useNavigate, useParams, Link } from 'react-router-dom'

const FILL_COLOR = new THREE.Color('#eae6e4') 
const WHITE = new THREE.Color('#ffffff')

// --- SHARED COMPONENTS ---

function VideoLayer({ src, active }) {
  const videoRef = useRef()
  const [hasLoaded, setHasLoaded] = useState(false)
  useEffect(() => { if (active && !hasLoaded) setHasLoaded(true) }, [active, hasLoaded])
  useEffect(() => {
    if (hasLoaded && videoRef.current) {
      if (active) videoRef.current.play().catch(() => {})
      else videoRef.current.pause()
    }
  }, [active, hasLoaded])

  return (
    <video ref={videoRef} src={hasLoaded ? src : undefined} className="bg-layer" muted loop playsInline
      style={{ opacity: active ? 1 : 0, zIndex: active ? 2 : 1, pointerEvents: 'none' }} />
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
        child.material.color.set(WHITE)
        child.material.emissive.set(WHITE)
        child.material.metalness = 0.2
        child.material.roughness = 0.4
      }
    })
  }, [clone])

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
        child.material.color.lerpColors(WHITE, FILL_COLOR, f)
        child.material.emissive.lerpColors(WHITE, FILL_COLOR, f)
        child.material.emissiveIntensity = THREE.MathUtils.lerp(restIntensity, activePulse, f)
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

// --- PAGES ---

function Home() {
  const [hoveredIndex, setHoveredIndex] = useState(null)
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)
  const navigate = useNavigate()

  useLayoutEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const cartridges = [
    { model: '/Cartridge_Web_04.glb', video: '/WebBG_Reel_01_NewLarge.mp4', id: 'reel' },
    { model: '/Web_Cart_02_V1.glb',   video: '/WebBG_LBL_01_NewLarge.mp4', id: 'lbl' },
    { model: '/Web_Cart_03_V1.glb',   video: '/WebBG_F1_01_NewLarge.mp4', id: 'f1' },
    { model: '/Web_Cart_04_V1.glb',   video: '/WebBG_SW_01_NewLarge.mp4', id: 'sw' },
    { model: '/Web_Cart_05_V1.glb',   video: '/WebBG_Holds_01_NewLarge.mp4', id: 'holds' },
    { model: '/Web_Cart_07_V1.glb',   video: '/WebBG_DND_01_NewLarge.mp4', id: 'dnd' },
    { model: '/Web_Cart_08_V1.glb',   video: '/WebBG_Further_01_NewLarge.mp4', id: 'further' }
  ]

  const moveLeft = () => setHoveredIndex((prev) => (prev === null || prev >= 6 ? 0 : prev + 1))
  const moveRight = () => setHoveredIndex((prev) => (prev === null || prev <= 0 ? 6 : prev - 1))
  
  const handleSelect = () => {
    if (hoveredIndex !== null) navigate(`/case-study/${cartridges[hoveredIndex].id}`)
  }

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowLeft') moveLeft()
      if (e.key === 'ArrowRight') moveRight()
      if (e.key === 'Enter') handleSelect()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [hoveredIndex])

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
      <div className="bg-container">
        <div className="bg-layer base-bg" />
        {cartridges.map((item, i) => (
          <VideoLayer key={i} src={item.video} active={hoveredIndex === i} />
        ))}
      </div>

      <div className="ui-overlay">
        <div className="nav-button" onClick={moveLeft}> &lt; </div>
        <div className={`select-button ${hoveredIndex !== null ? 'active' : ''}`} onClick={handleSelect}>
          SELECT
        </div>
        <div className="nav-button" onClick={moveRight}> &gt; </div>
      </div>

      <Canvas 
        key={isMobile ? 'mobile' : 'desktop'}
        dpr={[1, 2]} 
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }} 
        camera={{ position: isMobile ? [4, 0.8, 4] : [5, 0.8, 5], fov: isMobile ? 25 : 10 }} 
        style={{ width: '100%', height: '100%' }}
      >
        <Suspense fallback={null}>
           <Environment files="/the_sky_is_on_fire_2kBW.hdr" intensity={35} rotation={[0, Math.PI * (200 / 180), 0]} />
           <group position={isMobile ? [0.73, 0.1, 0.4] : [0.75, -0.1, 0.4]}>
              {cartridges.map((item, i) => (
                <GbaInstance 
                  key={i} 
                  index={i} 
                  url={item.model} 
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
  )
}

function CaseStudy() {
  const { id } = useParams()
  return (
    <div className="case-study-page">
      <Link to="/" className="home-btn">BACK TO COLLECTION</Link>
      <div className="case-content">
        <h1>{id.toUpperCase()}</h1>
        <p>Deep dive content coming soon...</p>
      </div>
    </div>
  )
}

// --- MAIN APP ---

export default function App() {
  return (
    <Router>
      <style>{`
        * { margin: 0; padding: 0; -webkit-tap-highlight-color: transparent; }
        html, body, #root { width: 100%; height: 100%; overflow: hidden; background-color: #000; font-family: 'Helvetica', sans-serif; }
        
        .bg-container { position: absolute; top: 0; left: 0; width: 100%; height: 100%; z-index: 1; pointer-events: none; }
        .bg-layer { position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: cover; transition: opacity 0.8s ease-in-out; }
        .base-bg { z-index: 0; background-image: url('/bg.png'); background-size: cover; background-position: center; }
        
        .ui-overlay {
          position: absolute;
          bottom: 60px;
          left: 50%;
          transform: translateX(-50%);
          width: 100%;
          max-width: 500px;
          z-index: 50; /* Above the canvas */
          pointer-events: none;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 40px;
          box-sizing: border-box;
        }

        .nav-button, .select-button { pointer-events: auto; }

        .nav-button {
          width: 60px; height: 60px; border-radius: 50%;
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(15px); -webkit-backdrop-filter: blur(15px);
          border: 1px solid rgba(255, 255, 255, 0.2);
          color: white; font-size: 20px; font-weight: bold;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer; transition: all 0.2s; user-select: none;
        }

        .select-button {
          padding: 12px 40px; border-radius: 40px;
          background: rgba(255, 255, 255, 0.05);
          backdrop-filter: blur(15px); -webkit-backdrop-filter: blur(15px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: rgba(255, 255, 255, 0.3);
          font-weight: 900; letter-spacing: 2px; font-size: 14px;
          cursor: pointer; transition: all 0.3s; user-select: none;
        }

        .select-button.active {
          background: white; color: black; transform: scale(1.1);
          box-shadow: 0 10px 30px rgba(255,255,255,0.2);
        }

        .nav-button:active, .select-button:active { transform: scale(0.9); }

        .case-study-page { width: 100vw; height: 100vh; background: #000; color: white; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; }
        .home-btn { position: fixed; top: 40px; border: 1px solid #333; padding: 10px 20px; border-radius: 20px; color: #777; text-decoration: none; font-size: 12px; transition: 0.2s; z-index: 100; }
        .home-btn:hover { border-color: #fff; color: #fff; }
        .case-content h1 { font-size: 80px; letter-spacing: -3px; }
      `}</style>

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/case-study/:id" element={<CaseStudy />} />
      </Routes>
    </Router>
  )
}