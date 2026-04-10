import { Suspense, useState, useRef, useLayoutEffect, useMemo, useEffect } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { useGLTF, Environment, useProgress } from '@react-three/drei'
import { EffectComposer, Noise, ToneMapping } from '@react-three/postprocessing'
import { useSpring, animated } from '@react-spring/three'
import * as THREE from 'three'
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom'

// --- DESIGN CONSTANTS ---
const NEW_WHITE = new THREE.Color('#eae5e3') 
const FILL_COLOR = new THREE.Color('#eae6e4') 
const DARK_THEME = '#212020' 

const CARTRIDGE_DATA = [
  { model: '/Cartridge_Web_04.glb', video: '/WebBG_Reel_01_NewLarge.mp4', id: 'showreel', title: 'Showreel', year: '2025', headerImg: '/Web_Header_Reel_01.png' },
  { model: '/Web_Cart_02_V1.glb',   video: '/WebBG_LBL_01_NewLarge.mp4', id: 'less-but-loud', title: 'Less But Loud', year: '2025', headerImg: '/Web_Header_LBL_01.png' },
  { model: '/Web_Cart_03_V1.glb',   video: '/WebBG_F1_01_NewLarge.mp4', id: 'f125', title: 'EA Sports F125', year: '2025', headerImg: '/Web_Header_F1_01.png' },
  { model: '/Web_Cart_04_V1.glb',   video: '/WebBG_SW_01_NewLarge.mp4', id: 'sendwave', title: 'Sendwave', year: '2024', headerImg: '/Web_Header_Sendwave_01.png' },
  { model: '/Web_Cart_05_V1.glb',   video: '/WebBG_Holds_01_NewLarge.mp4', id: 'hold-friends', year: '2024', headerImg: '/Web_Header_Holds_01.png' },
  { model: '/Web_Cart_07_V1.glb',   video: '/WebBG_DND_01_NewLarge.mp4', id: 'dice-n-dice', year: '2024', headerImg: '/Web_Header_DND_01.png' },
  { model: '/Web_Cart_08_V1.glb',   video: '/WebBG_Further_01_NewLarge.mp4', id: 'further', title: 'Further', year: '2025', headerImg: '/Web_Header_Further_01.png' }
]

const PLACE_TEXT = "This is a few lines about the project, roughly outlining the concept, the studio worked with if applicable and the outcomes and lookfeel. This is a few lines about the project, roughly outlining the concept, the studio worked with if applicable and the outcomes and lookfeel.";

// --- COMPONENTS ---

function Loader({ onExit }) {
  const { progress } = useProgress()
  const videoRef = useRef()
  const [loaderStep, setLoaderStep] = useState('initial') // initial -> paused -> resuming -> exiting

  // 1. Force initial playback and pause at 0.5s
  useEffect(() => {
    const vid = videoRef.current
    if (!vid) return
    vid.currentTime = 0
    vid.play().catch(() => {})

    const pauseTimer = setTimeout(() => {
      // If we haven't already finished loading, pause.
      // If we are already at 100%, skip the pause and just keep going.
      if (progress < 100) {
        vid.pause()
        setLoaderStep('paused')
      } else {
        setLoaderStep('resuming')
      }
    }, 500)

    return () => clearTimeout(pauseTimer)
  }, [])

  // 2. Watch for 100% loading AND that we have reached the pause point
  useEffect(() => {
    if (progress === 100 && loaderStep === 'paused') {
      setLoaderStep('resuming')
    }
  }, [progress, loaderStep])

  // 3. Handle the Exit sequence
  useEffect(() => {
    if (loaderStep === 'resuming') {
      if (videoRef.current) videoRef.current.play().catch(() => {})
      
      const slideDelay = setTimeout(() => {
        setLoaderStep('exiting')
        setTimeout(onExit, 1200) // Unmount after animation
      }, 500)

      return () => clearTimeout(slideDelay)
    }
  }, [loaderStep, onExit])

  return (
    <div className={`loader-screen ${loaderStep === 'exiting' ? 'slide-down-exit' : ''}`}>
      <div className="loader-content">
        <video ref={videoRef} src="/wink.mp4" muted playsInline className="wink-video" preload="auto" style={{ background: DARK_THEME }} />
        <div className="loader-bar-container"><div className="loader-bar" style={{ width: `${progress}%` }} /></div>
        <p className="loader-text">itsconnorbannister — {Math.round(progress)}%</p>
      </div>
    </div>
  )
}

function VideoLayer({ src, active }) {
  const videoRef = useRef()
  useEffect(() => {
    if (videoRef.current) {
      if (active) videoRef.current.play().catch(() => {})
      else videoRef.current.pause()
    }
  }, [active])
  return <video ref={videoRef} src={src} className="bg-layer" muted loop playsInline style={{ opacity: active ? 1 : 0, zIndex: active ? 2 : 1, pointerEvents: 'none' }} />
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

function MainScene() {
  const [hoveredIndex, setHoveredIndex] = useState(null)
  const [activeCaseStudy, setActiveCaseStudy] = useState(null)
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)
  const [showLoader, setShowLoader] = useState(true)
  const overlayRef = useRef()

  const onOverlayScroll = (e) => {
    overlayRef.current.style.setProperty('--scroll-y', `${e.target.scrollTop}px`);
  }

  useLayoutEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    if (activeCaseStudy) document.title = `${activeCaseStudy.title} | itsconnorbannister`
    else document.title = "Selection | itsconnorbannister"
  }, [activeCaseStudy])

  const handleSelect = (idx) => {
    const targetIdx = idx !== undefined ? idx : hoveredIndex
    if (targetIdx !== null) {
      if (isMobile && hoveredIndex !== targetIdx) setHoveredIndex(targetIdx)
      else setActiveCaseStudy(CARTRIDGE_DATA[targetIdx])
    }
  }

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (activeCaseStudy && e.key === 'Escape') { setActiveCaseStudy(null); return; }
      if (showLoader || activeCaseStudy) return
      if (e.key === 'ArrowLeft') setHoveredIndex((prev) => (prev === null || prev >= 6 ? 0 : prev + 1))
      if (e.key === 'ArrowRight') setHoveredIndex((prev) => (prev === null || prev <= 0 ? 6 : prev - 1))
      if (e.key === 'Enter') handleSelect()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [hoveredIndex, activeCaseStudy, showLoader])

  return (
    <div className="home-wrapper">
      {showLoader && <Loader onExit={() => setShowLoader(false)} />}
      <div className={`back-bubble ${activeCaseStudy ? 'visible' : ''}`} onClick={() => setActiveCaseStudy(null)}><span>&#x279A;</span></div>
      
      {/* Pre-fetching Images */}
      <div style={{ display: 'none' }}>
        {CARTRIDGE_DATA.map(item => <img key={item.id} src={item.headerImg} alt="" />)}
      </div>

      <div className="bg-container"><div className="bg-layer base-bg" />{CARTRIDGE_DATA.map((item, i) => (<VideoLayer key={i} src={item.video} active={hoveredIndex === i} />))}</div>
      <div className="ui-overlay"><div className="nav-button" onClick={() => setHoveredIndex((prev) => (prev === null || prev >= 6 ? 0 : prev + 1))}> &lt; </div><div className={`select-button ${hoveredIndex !== null ? 'active' : ''}`} onClick={() => handleSelect()}>Select</div><div className="nav-button" onClick={() => setHoveredIndex((prev) => (prev === null || prev <= 0 ? 6 : prev - 1))}> &gt; </div></div>
      <div className="canvas-container">
        <Canvas key={isMobile ? 'mobile' : 'desktop'} dpr={[1, 2]} gl={{ antialias: true, alpha: true }} camera={{ position: isMobile ? [4, 0.8, 4] : [5, 0.8, 5], fov: isMobile ? 25 : 10 }}>
          <Suspense fallback={null}>
             <Environment files="/the_sky_is_on_fire_2kBW.hdr" intensity={35} rotation={[0, Math.PI * (200 / 180), 0]} />
             <group position={isMobile ? [0.71, 0.1, 0.4] : [0.75, -0.1, 0.4]}>
                {CARTRIDGE_DATA.map((item, i) => (<GbaInstance key={i} index={i} url={item.model} active={hoveredIndex === i} isMobile={isMobile} onHover={setHoveredIndex} onClick={handleSelect} position={[i * -0.28, 0, i * -0.15]} />))}
             </group>
          </Suspense>
          <EffectComposer multisampling={0}><ToneMapping mode={THREE.ACESFilmicToneMapping} exposure={3.0} /><Noise opacity={0.015} /></EffectComposer>
        </Canvas>
      </div>
      <div ref={overlayRef} onScroll={onOverlayScroll} className={`case-study-overlay ${activeCaseStudy ? 'open' : ''}`}>
        <div className="case-header"><div className="case-header-img" style={{ backgroundImage: activeCaseStudy?.headerImg ? `url(${activeCaseStudy.headerImg})` : 'none' }} /></div>
        <div className="case-content">
          <div className="title-row">
            <h1 className="header-title">{activeCaseStudy?.title}</h1>
            <h1 className="header-title date-display">{activeCaseStudy?.year}</h1>
          </div>
          <p className="case-description">{PLACE_TEXT}</p>
          <div style={{ height: '150vh' }} />
        </div>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <Router>
      <style>{`
        @font-face { font-family: 'Thunder'; src: url('/Thunder-BoldLC.ttf') format('truetype'); font-weight: bold; font-style: normal; }
        * { margin: 0; padding: 0; -webkit-tap-highlight-color: transparent; }
        html, body, #root { width: 100%; height: 100%; overflow: hidden; background-color: ${DARK_THEME}; font-family: degular, sans-serif; font-weight: 600; color: #eae5e3; text-transform: none; }
        .home-wrapper { width: 100vw; height: 100vh; position: relative; overflow: hidden; }
        .loader-screen { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: ${DARK_THEME}; z-index: 1000; display: flex; align-items: center; justify-content: center; transition: transform 1.0s cubic-bezier(0.85, 0, 1, 1); will-change: transform; }
        .loader-screen.slide-down-exit { transform: translateY(100%); }
        .loader-content { display: flex; flex-direction: column; align-items: center; width: 100%; }
        .wink-video { width: 500px; height: 500px; max-width: 85vw; max-height: 85vw; margin-bottom: 5px; object-fit: cover; background: ${DARK_THEME}; }
        .loader-bar-container { width: 500px; max-width: 85vw; height: 2px; background: rgba(234, 229, 227, 0.1); border-radius: 2px; margin-bottom: 12px; overflow: hidden; }
        .loader-bar { height: 100%; background: #eae5e3; transition: width 0.3s ease; }
        .loader-text { font-size: 11px; text-transform: uppercase; letter-spacing: 1px; opacity: 0.6; }
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
        .case-study-overlay { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: ${DARK_THEME}; z-index: 500; transition: transform 0.8s cubic-bezier(0.16, 1, 0.3, 1); transform: translateY(100%); display: flex; flex-direction: column; align-items: center; overflow-y: auto; overflow-x: hidden; }
        .case-study-overlay.open { transform: translateY(0); }
        .case-header { width: 100%; height: 50vh; overflow: hidden; position: relative; flex-shrink: 0; background-color: #eae5e3; }
        .case-header-img { position: absolute; top: -15vh; left: 0; width: 100%; height: 80vh; background-size: cover; background-position: center; background-repeat: no-repeat; transform: translateY(calc(var(--scroll-y, 0px) * -0.3)); will-change: transform; }
        .case-content { width: 100%; max-width: none; padding: 30px; text-align: left; background: ${DARK_THEME}; position: relative; z-index: 10; box-sizing: border-box; }
        .title-row { display: flex; justify-content: space-between; align-items: baseline; width: 100%; margin-bottom: 20px; gap: 30px; }
        .header-title { font-family: 'Thunder', sans-serif; font-size: clamp(35px, 15vw, 240px); line-height: 1.0; padding-top: 15px; text-transform: uppercase; margin: 0; white-space: nowrap; }
        .date-display { flex-shrink: 0; }
        .case-description { font-family: degular, sans-serif; font-weight: 600; font-size: clamp(16px, 1.8vw, 28px); line-height: 1.35; opacity: 1; width: 100%; margin-top: 20px; }
        .back-bubble { position: fixed; bottom: 40px; left: 40px; width: 60px; height: 60px; background: rgba(234, 229, 227, 0.1); backdrop-filter: blur(15px); -webkit-backdrop-filter: blur(15px); border: 1px solid rgba(234, 229, 227, 0.2); border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; z-index: 2000; transition: all 0.4s ease-out; opacity: 0; visibility: hidden; pointer-events: none; transform: scale(0.5); }
        .back-bubble.visible { opacity: 1; visibility: visible; pointer-events: auto; transform: scale(1); }
        .back-bubble span { color: #eae5e3; font-size: 24px; transform: rotate(180deg); line-height: 0; margin-top: -2px; }
        .back-bubble:hover { background: #eae5e3; transform: scale(1.1); }
        .back-bubble:hover span { color: ${DARK_THEME}; }

        @media (min-width: 769px) { 
           .ui-overlay { bottom: 80px; max-width: 600px; } 
           .nav-button { width: 70px; height: 70px; font-size: 24px; } 
           .select-button { height: 50px; font-size: 16px; } 
           .case-content { padding: 40px; } 
           .back-bubble { left: 40px; bottom: 40px; }
        }
        @media (max-width: 768px) { 
          .case-content { padding: 30px; }
          .title-row { flex-direction: column; align-items: flex-start; gap: 0; margin-bottom: 20px; }
          .header-title { font-size: 80px; white-space: normal; padding-top: 0; line-height: 0.9; }
          .date-display { font-size: 40px; margin-top: 0px; align-self: flex-start; }
          .back-bubble { bottom: 30px; left: 30px; width: 50px; height: 50px; } 
        }
      `}</style>
      <Routes><Route path="/" element={<MainScene />} /></Routes>
    </Router>
  )
}