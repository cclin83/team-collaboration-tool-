import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Particle {
  id: number;
  x: number;
  y: number;
  color: string;
  size: number;
  rotation: number;
  delay: number;
}

const COLORS = ['#FF6B35', '#F7C948', '#FF69B4', '#7B68EE', '#2EC4B6', '#E71D36', '#20B2AA'];

export default function Confetti({ active }: { active: boolean }) {
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    if (active) {
      const newParticles: Particle[] = Array.from({ length: 60 }, (_, i) => ({
        id: i,
        x: Math.random() * window.innerWidth,
        y: -20,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        size: Math.random() * 12 + 6,
        rotation: Math.random() * 360,
        delay: Math.random() * 0.8,
      }));
      setParticles(newParticles);
      const timer = setTimeout(() => setParticles([]), 3000);
      return () => clearTimeout(timer);
    } else {
      setParticles([]);
    }
  }, [active]);

  return (
    <div className="particles-container">
      <AnimatePresence>
        {particles.map((p) => (
          <motion.div
            key={p.id}
            initial={{ x: p.x, y: p.y, rotate: 0, opacity: 1 }}
            animate={{
              y: window.innerHeight + 50,
              rotate: p.rotation + 720,
              x: p.x + (Math.random() - 0.5) * 200,
            }}
            exit={{ opacity: 0 }}
            transition={{ duration: 2.5 + Math.random(), delay: p.delay, ease: 'easeIn' }}
            style={{
              position: 'fixed',
              width: p.size,
              height: p.size,
              backgroundColor: p.color,
              borderRadius: Math.random() > 0.5 ? '50%' : '2px',
              zIndex: 9999,
            }}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}
