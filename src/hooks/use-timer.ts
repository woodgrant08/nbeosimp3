import { useEffect, useState, useRef } from "react"

// A reusable countdown timer hook
export function useTimer(initialSeconds: number, onExpire: () => void) {
  const [timeLeft, setTimeLeft] = useState(initialSeconds)
  const [isRunning, setIsRunning] = useState(false)
  const intervalRef = useRef<number | null>(null)

  // Start the timer
  const start = () => setIsRunning(true)

  // Stop the timer
  const stop = () => setIsRunning(false)
  const reset = () => {
    if (intervalRef.current) {
      window.clearInterval(intervalRef.current)
    }
    setTimeLeft(initialSeconds)
    setIsRunning(false)
  }

  useEffect(() => {
    if (!isRunning) return

    intervalRef.current = window.setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          // Timer hits zero
          window.clearInterval(intervalRef.current!)
          setIsRunning(false)
          onExpire()
          return 0
        }
        return prev - 1
      })
    }, 1000)

    // Cleanup when component unmounts or timer stops
    return () => {
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current)
      }
    }
  }, [isRunning, onExpire])

  return {
    timeLeft,
    isRunning,
    start,
    stop,
    reset,
  }
}
