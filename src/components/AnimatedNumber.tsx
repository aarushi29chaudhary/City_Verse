import { useEffect, useRef, useState } from "react"

type Props = {
  value: number
  decimals?: number
  prefix?: string
}

export default function AnimatedNumber({
  value,
  decimals = 0,
  prefix = "",
}: Props) {
  const [display, setDisplay] = useState(value)
  const previousTarget = useRef(value)

  useEffect(() => {
    const from = previousTarget.current
    const difference = value - from
    const started = performance.now()
    let frame = 0
    const animate = (time: number) => {
      const progress = Math.min((time - started) / 350, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplay(from + difference * eased)
      if (progress < 1) frame = requestAnimationFrame(animate)
    }
    frame = requestAnimationFrame(animate)
    previousTarget.current = value
    return () => cancelAnimationFrame(frame)
  }, [value])

  return (
    <>
      {prefix}
      {display.toLocaleString("en-IN", {
        maximumFractionDigits: decimals,
        minimumFractionDigits: decimals,
      })}
    </>
  )
}
