import { Suspense, useState, useRef, useLayoutEffect, useMemo } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { ContactShadows, useGLTF, Environment } from '@react-three/drei'
import { EffectComposer, Noise, ToneMapping } from '@react-three/postprocessing'
import { useSpring, animated } from '@react-spring/three'
import * as THREE from 'three'

const FILL_COLOR = new THREE.Color('#eae6e4') 
const WHITE = new THREE.Color('#ffffff')

// Updated GbaInstance to take a 'url' prop
function GbaInstance({ index, url, ...props }) {
  const { scene } = useGLTF(url)
  const clone = useMemo(() => scene.clone(true), [scene])
  const [hovered, setHovered] = useState(false)
  const groupRef = useRef()
  const startTime = useRef(0) 
  const lastHovered = useRef(false) 

  useLayoutEffect(() => {
    clone.traverse((child) => {
      if (child.isMesh) {
        child.material = child.material.clone()
        child.material.dithering = true
        child.material.color.set(WHITE)
        child.material.emissive.set(WHITE)
        child.material.metalness = 0.25
        child.material.roughness = 0.4
        if (child.material.map) child.material.map.colorSpace = THREE.SRGBColorSpace
      }
    })
  }, [clone, url]) // Re-run if url changes

  const { posY, factor } = useSpring({
    posY: hovered ? 0.35 : 0,
    factor: hovered ? 1 : 0,
    config: (key) => {
      if (hovered) return { mass: 2, tension: 75, friction: 35 } 
      return { mass: 1, tension: 150, friction: 30 } 
    }
  })

  useFrame((state) => {
    const t = state.clock.getElapsedTime()
    const f = factor.get()

    if (hovered && !lastHovered.current) startTime.current = t
    lastHovered.current = hovered

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
        child.material.metalness = 0.25 * (1 - f)
        child.material.roughness = 0.4 + (f * 0.6)
      }
    })
  })

  return (
    <animated.group {...props} position-y={posY}>
      <group ref={groupRef}>
        <mesh 
          onPointerOver={(e) => (e.stopPropagation(), setHovered(true))} 
          onPointerOut={(e) => setHovered(false)}
        >
          <boxGeometry args={[0.35, 0.5, 0.06]} /> 
          <meshBasicMaterial transparent opacity={0} />
        </mesh>
        <primitive 
            object={clone} 
            rotation={[0, Math.PI + (75 * Math.PI / 180), 0]} 
            scale={[1.2, 1.2, 1.2]} 
        />
      </group>
    </animated.group>
  )
}

export default function App() {
  // Updated list with all 8 of your cartridges in order
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
  
  return (
    <>
      {/* ... keep style and div wrapper ... */}
      <Canvas 
          shadows
          dpr={[1, 2]} 
          gl={{ antialias: true, powerPreference: "high-performance" }}
          /* I slightly adjusted the camera position to fit 8 items better */
          camera={{ position: [5, 0.8, 5], fov: 10 }} 
        >
          <color attach="background" args={['#050505']} />

          <Suspense fallback={null}>
             <Environment 
                files="/the_sky_is_on_fire_2kBW.hdr" 
                intensity={30} 
                rotation={[0, Math.PI * (200 / 180), 0]}
             />
             
             {/* I adjusted the group position to [0.9, -0.1, 0.4] to keep the longer line centered */}
             <group position={[0.9, -0.1, 0.4]}>
                {cartridgeModels.map((url, i) => (
                  <GbaInstance 
                    key={i} 
                    index={i} 
                    url={url} 
                    position={[i * -0.28, 0, i * -0.15]} 
                  />
                ))}
             </group>
          </Suspense>
          {/* ... keep the rest of your code ... */}