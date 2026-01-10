import { useMemo } from 'react'

export function Background() {
  // Generate random particles once
  const particles = useMemo(() => {
    return [...Array(40)].map((_, i) => ({
      id: i,
      left: Math.random() * 100,
      top: Math.random() * 100,
      delay: Math.random() * 5,
      duration: 15 + Math.random() * 20,
      size: Math.random() > 0.7 ? 2 : 1,
    }))
  }, [])

  return (
    <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
      {/* Base gradient - deep space */}
      <div className="absolute inset-0 bg-gradient-to-b from-black via-gray-950 to-black" />

      {/* Subtle radial gradient for depth */}
      <div
        className="absolute inset-0 opacity-50"
        style={{
          background:
            'radial-gradient(ellipse at 50% 0%, rgba(0, 100, 150, 0.15) 0%, transparent 50%)',
        }}
      />

      {/* Grid overlay */}
      <div
        className="absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(0,255,255,0.3) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0,255,255,0.3) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px',
        }}
      />

      {/* Perspective grid at bottom */}
      <div
        className="absolute bottom-0 left-0 right-0 h-[40%] opacity-20"
        style={{
          background: `
            linear-gradient(transparent 0%, rgba(0,0,0,0.8) 100%),
            repeating-linear-gradient(
              90deg,
              transparent,
              transparent 59px,
              rgba(0,255,255,0.1) 59px,
              rgba(0,255,255,0.1) 60px
            )
          `,
          transform: 'perspective(500px) rotateX(60deg)',
          transformOrigin: 'bottom center',
        }}
      />

      {/* Floating particles */}
      <div className="absolute inset-0">
        {particles.map((particle) => (
          <div
            key={particle.id}
            className="absolute rounded-full bg-cyan-400/40 animate-float"
            style={{
              left: `${particle.left}%`,
              top: `${particle.top}%`,
              width: particle.size,
              height: particle.size,
              animationDelay: `${particle.delay}s`,
              animationDuration: `${particle.duration}s`,
              boxShadow: '0 0 6px rgba(0, 255, 255, 0.6)',
            }}
          />
        ))}
      </div>

      {/* Scan line effect */}
      <div className="absolute inset-0 overflow-hidden">
        <div
          className="absolute w-full h-[2px] animate-scan"
          style={{
            background:
              'linear-gradient(90deg, transparent 0%, rgba(0,255,255,0.4) 50%, transparent 100%)',
            boxShadow: '0 0 20px rgba(0, 255, 255, 0.3)',
          }}
        />
      </div>

      {/* Vignette */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse at center, transparent 0%, rgba(0,0,0,0.4) 70%, rgba(0,0,0,0.8) 100%)',
        }}
      />

      {/* Noise texture overlay */}
      <div
        className="absolute inset-0 opacity-[0.015]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        }}
      />
    </div>
  )
}
