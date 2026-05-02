export const userBubbleAnim = {
  initial: { x: 60, opacity: 0, scale: 0.96 },
  animate: { x: 0, opacity: 1, scale: 1 },
  transition: {
    duration: 0.25,
    ease: [0.22, 1, 0.36, 1] as const,
  },
}

export const botBubbleAnim = {
  initial: { x: -60, opacity: 0, scale: 0.96 },
  animate: { x: 0, opacity: 1, scale: 1 },
  transition: {
    duration: 0.28,
    ease: [0.22, 1, 0.36, 1] as const,
  },
}