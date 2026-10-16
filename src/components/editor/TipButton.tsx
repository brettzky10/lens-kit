'use client'
import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> { tip?: string; side?: 'top' | 'right' | 'bottom' | 'left' }

/** Drop-in <button> that shows a shadcn tooltip from `tip` (or `title`, which is not forwarded to the DOM). */
export const TipButton = forwardRef<HTMLButtonElement, Props>(function TipButton({ tip, title, side = 'top', ...props }, ref) {
  const button = <button ref={ref} type="button" {...props} />
  const label = tip ?? title
  if (!label) return button
  return (
    <Tooltip>
       <TooltipTrigger render={button} />
      <TooltipContent side={side}>{label}</TooltipContent>
    </Tooltip>
  )
})
