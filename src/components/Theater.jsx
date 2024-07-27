import React from 'react'
import Stack from '@mui/material/Stack'

/**
 * An expanded container with a cool border
 * that fades-in new children as they appear.
 */
export default function Theater({
  sx,
  children,
  ...props
}) {
  return (
      <Stack
        direction="row"
        width="100%"
        sx={{
          margin: 0,
          backgroundColor: "#7773",
          boxShadow: (theme)=>
            `inset 0 0 .2em .2em ${theme.palette.primary.main}`,
          p: '.4em', // 2em + 2em from boxShadow
          flexGrow: 1,
          '&>*': {
            // Fade in when switching child
            animation: 'fadein 0.5s linear',
            '@keyframes fadein': { from: { opacity: 0 }, to: { opacity: 1 } },
          },
          ...sx,
        }}
      >
    {children}
    </Stack>
  )
}


