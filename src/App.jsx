import { Suspense, useState, useRef, useLayoutEffect, useMemo, useEffect } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { useGLTF, Environment, useProgress } from '@react-three/drei'
import { EffectComposer, Noise, ToneMapping } from '@react-three/postprocessing'
import { useSpring, animated } from '@react-spring/three'
import * as THREE from 'three'
import { BrowserRouter as Router, Routes, Route, useNavigate, useParams, Link } from 'react-router-dom'

// --- DESIGN CONSTANTS ---
const NEW_WHITE = new THREE.Color('#eae5e3') 
const FILL_COLOR = new THREE.Color('#eae6e4') 
const DARK_THEME = '#212020' 

const CARTRIDGE_DATA = [
  { model: '/Cartridge_Web_04.glb', video: '/WebBG_Reel_01_NewLarge.mp4', id: 'showreel', title: 'Showreel' },
  { model: '/Web_Cart_02_V1.glb',   video: '/WebBG_LBL_01_NewLarge.mp4', id: 'less-but-loud', title: 'Less But Loud' },
  { model: '/Web_Cart_03_V1.glb',   video: '/WebBG_F1_01_NewLarge.mp4', id: 'f125', title: 'EA Sports F125' },
  { model: '/Web_Cart_04_V1.glb',   video: '/WebBG_SW_01_NewLarge.mp4', id: 'sendwave', title: 'Sendwave' },
  { model: '/Web_Cart_05_V1.glb',   video: '/WebBG_Holds_01_NewLarge.mp4', id: 'hold-friends', title: 'Hold Friends' },
  { model: '/Web_Cart_07_V1.glb',   video: '/WebBG_DND_01_NewLarge.mp4', id: 'dice-n-dice', title: 'Dice N Dice' },
  { model: '/Web_Cart_08_V1.glb',   video: '/WebBG_Further_01_NewLarge.mp4', id: 'further', title: 'Further' }
]

// --- LOADING COMPONENT ---

function Loader({ finished, onExit }) {
  const { progress } = useProgress()
  const videoRef = useRef()
  const [initialPauseDone, setInitialPauseDone] = useState(false)

  // 1. Logic for the initial half-second play then pause
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.play().catch(e => console.log("Autoplay blocked", e))
      
      const pauseTimer = setTimeout(() => {
        if (videoRef.current && progress < 100) {
          videoRef.current.pause()
          setInitialPauseDone(true)
        }
      }, 500) // Pause exactly at 0.5s

      return () => clearTimeout(pauseTimer)
    }
  }, [])

  // 2. Logic to resume when 100% loaded
  useEffect(() => {
    if (progress === 100) {
      const resumeTimer = setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.play().catch(e => console.log("Resume error", e))
        }
        
        // Trigger slide down 500ms after the resume starts
        setTimeout(() => {
          onExit()
        }, 500) 

      }, 300) 

      return () => clearTimeout(resumeTimer)
    }
  }, [progress, onExit])

  return (
    <div className={`loader-screen ${finished ? 'slide-down' : ''}`}>
      <div className="loader-content">
        <video 
            ref={videoRef} 
            src="/wink.mp4" 
            muted 
            playsInline 
            className="wink-video" 
            preload="auto" 
        />
        <div className="loader-bar-container">
          <div className="loader-bar" style={{ width: `${progress}%` }} />
        </div>
        <p className="loader-text">itsconnorbannister — {Math.round(progress)}%</p>
      </div>
    </div>
  )
}

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
  return <video ref={videoRef} src={hasLoaded ? src : undefined} className="bg-layer" muted loop playsInline style={{ opacity: active ? 1 : 0, zIndex: active ? 2 : 1, pointerEvents: 'none' }} />
}

function GbaInstance({ index, url, onHover, onClick, active, isMobile, ...props }) {
  const { scene } = useGLTF(url)
  const clone = useMemo(() => scene.clone(true), [scene])
  const groupRef = useRef()
  const startTime = useRef(0) 
  const lastActive = useRef(false) 

  useLayoutEffect(() => {
    clone.traverse((child) => {
      if (child.isMesh) {
        child.material = child.material.clone()
        child.material.color.set(NEW_WHITE)
        child.material.emissive.set(NEW_WHITE)
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
    if (groupRef.current) {
      const idleWave = Math.sin(t * 1 + index * 0.8) * 0.02
      const activeExtra = (Math.sin(t * 1.5 + index) * 0.012) * f
      groupRef.current.position.y = idleWave + activeExtra
      groupRef.current.rotation.x = (Math.cos(t * 1 + index) * 0.015) * f
      groupRef.current.rotation.z = (Math.sin(t * 1 + index) * 0.01) * f
    }
    clone.traverse((child) => {
      if (child.isMesh) {
        child.material.color.lerpColors(NEW_WHITE, FILL_COLOR, f)
        child.material.emissive.lerpColors(NEW_WHITE, FILL_COLOR, f)
        child.material.emissiveIntensity = THREE.MathUtils.lerp(2.5, activePulse, f)
      }
    })
  })

  return (
    <animated.group {...props} position-y={posY}>
      <group ref={groupRef}>
        <mesh onPointerOver={(e) => { if(!isMobile) { e.stopPropagation(); onHover(index); } }} onPointerOut={() => { if(!isMobile) onHover(null); }} onClick={(e) => { e.stopPropagation(); onClick(index); }}>
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
  const [isLoaderActive, setIsLoaderActive] = useState(true)
  const { progress } = useProgress()
  const navigate = useNavigate()

  useEffect(() => { document.title = "Selection | itsconnorbannister" }, [])
  useLayoutEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const moveLeft = () => setHoveredIndex((prev) => (prev === null || prev >= 6 ? 0 : prev + 1))
  const moveRight = () => setHoveredIndex((prev) => (prev === null || prev <= 0 ? 6 : prev - 1))
  const handleSelect = (index) => {
    const targetIndex = index !== undefined ? index : hoveredIndex;
    if (targetIndex !== null) {
      if (isMobile && hoveredIndex !== targetIndex) setHoveredIndex(targetIndex)
      else navigate(`/case-study/${CARTRIDGE_DATA[targetIndex].id}`)
    }
  }

  return (
    <div className="home-wrapper">
      <Loader finished={!isLoaderActive} onExit={() => setIsLoaderActive(false)} />
      <div className="main-content">
        <div className="bg-container"><div className="bg-layer base-bg" />{CARTRIDGE_DATA.map((item, i) => (<VideoLayer key={i} src={item.video} active={hoveredIndex === i} />))}</div>
        <div className="ui-overlay"><div className="nav-button" onClick={moveLeft}> &lt; </div><div className={`select-button ${hoveredIndex !== null ? 'active' : ''}`} onClick={() => handleSelect()}>Select</div><div className="nav-button" onClick={moveRight}> &gt; </div></div>
        <div className="canvas-container">
          <Canvas key={isMobile ? 'mobile' : 'desktop'} dpr={[1, 2]} gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }} camera={{ position: isMobile ? [4, 0.8, 4] : [5, 0.8, 5], fov: isMobile ? 25 : 10 }}>
            <Suspense fallback={null}>
               <Environment files="/the_sky_is_on_fire_2kBW.hdr" intensity={35} rotation={[0, Math.PI * (200 / 180), 0]} />
               <group position={isMobile ? [0.73, 0.1, 0.4] : [0.75, -0.1, 0.4]}>
                  {CARTRIDGE_DATA.map((item, i) => (<GbaInstance key={i} index={i} url={item.model} active={hoveredIndex === i} isMobile={isMobile} onHover={setHoveredIndex} onClick={handleSelect} position={[i * -0.28, 0, i * -0.15]} />))}
               </group>
            </Suspense>
            <EffectComposer multisampling={0}><ToneMapping mode={THREE.ACESFilmicToneMapping} exposure={3.0} /><Noise opacity={0.015} /></EffectComposer>
          </Canvas>
        </div>
      </div>
    </div>
  )
}

function CaseStudy() {
  const { id } = useParams()
  const project = CARTRIDGE_DATA.find(p => p.id === id)
  const displayTitle = project ? project.title : id
  useEffect(() => { document.title = `${displayTitle} | itsconnorbannister` }, [displayTitle])
  return (
    <div className="case-study-page">
      <Link to="/" className="home-btn">Back to collection</Link>
      <div className="case-content">
        <h1 className="header-title">{displayTitle}</h1>
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
        @font-face { font-family: 'Thunder'; src: url('/Thunder-BoldLC.ttf') format('truetype'); font-weight: bold; font-style: normal; }
        * { margin: 0; padding: 0; -webkit-tap-highlight-color: transparent; }
        html, body, #root { width: 100%; height: 100%; overflow: hidden; background-color: ${DARK_THEME}; font-family: degular, sans-serif; font-weight: 600; color: #eae5e3; text-transform: none; }
        
        .loader-screen {
          position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
          background: ${DARK_THEME}; z-index: 1000;
          display: flex; align-items: center; justify-content: center;
          transition: transform 1.0s cubic-bezier(0.85, 0, 1, 1);
        }
        .loader-screen.slide-down { transform: translateY(100%); }

        .loader-content { display: flex; flex-direction: column; align-items: center; width: 100%; }
        
        .wink-video { 
          width: 500px; height: 500px; 
          max-width: 85vw; max-height: 85vw; 
          margin-bottom: 5px; 
          object-fit: cover; 
        }

        .loader-bar-container { 
          /* Exactly matching video width */
          width: 500px; 
          max-width: 85vw; 
          height: 2px; 
          background: rgba(234, 229, 227, 0.1); 
          border-radius: 2px; 
          margin-bottom: 12px; 
          overflow: hidden; 
        }
        .loader-bar { height: 100%; background: #eae5e3; transition: width 0.3s ease; }
        .loader-text { font-family: degular, sans-serif; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; opacity: 0.6; }

        .main-content { width: 100%; height: 100%; }
        .home-wrapper { width: 100vw; height: 100vh; position: relative; }
        .bg-container { position: absolute; top: 0; left: 0; width: 100%; height: 100%; z-index: 1; }
        .bg-layer { position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: cover; transition: opacity 0.8s ease-in-out; }
        .base-bg { z-index: 0; background-image: url('/bg.png'); background-size: cover; background-position: center; }
        .canvas-container { position: absolute; top: 0; left: 0; width: 100%; height: 100%; z-index: 10; pointer-events: none; }
        .canvas-container canvas { pointer-events: auto; }
        .ui-overlay { position: absolute; bottom: 100px; left: 50%; transform: translateX(-50%); width: 100%; max-width: 450px; z-index: 100; pointer-events: none; display: flex; align-items: center; justify-content: space-between; padding: 0 40px; box-sizing: border-box; }
        .nav-button, .select-button { pointer-events: auto; display: flex; align-items: center; justify-content: center; }
        .nav-button { width: 55px; height: 55px; border-radius: 50%; background: rgba(234, 229, 227, 0.1); border: 1px solid rgba(234, 229, 227, 0.15); color: #eae5e3; font-size: 20px; cursor: pointer; transition: all 0.2s; user-select: none; }
        .select-button { height: 45px; padding: 0 35px; border-radius: 40px; background: rgba(234, 229, 227, 0.05); border: 1px solid rgba(234, 229, 227, 0.1); color: rgba(234, 229, 227, 0.3); font-weight: 600; letter-spacing: 1px; font-size: 14px; cursor: pointer; transition: all 0.3s; user-select: none; }
        .select-button.active { background: #eae5e3; color: ${DARK_THEME}; transform: scale(1.1); }
        .nav-button:active, .select-button:active { transform: scale(0.9); }
        .case-study-page { width: 100vw; height: 100vh; background: ${DARK_THEME}; color: #eae5e3; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; }
        .header-title { font-family: 'Thunder', sans-serif; font-size: 120px; line-height: 0.9; text-transform: uppercase; margin-bottom: 10px; }
        .home-btn { position: fixed; top: 40px; border: 1px solid rgba(234, 229, 227, 0.2); padding: 10px 20px; border-radius: 20px; color: #eae5e3; text-decoration: none; font-size: 12px; transition: 0.2s; z-index: 100; }
        .home-btn:hover { background: #eae5e3; color: ${DARK_THEME}; }
        @media (min-width: 769px) { .ui-overlay { bottom: 80px; max-width: 600px; } .nav-button { width: 70px; height: 70px; font-size: 24px; } .select-button { height: 50px; font-size: 16px; } .header-title { font-size: 200px; } }
      `}</style>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/case-study/:id" element={<CaseStudy />} />
      </Routes>
    </Router>
  )
}