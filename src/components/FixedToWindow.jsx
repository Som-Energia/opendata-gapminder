import React from 'react'
import Stack from '@mui/material/Stack'

/**
 * A container expanded and fixed to the window borders.
 *
 * Use this if you want your interface frame
 * not to scroll but adjust to the borders
 * like a desktop/mobile application.
 *
 * By default it is a vertical flex stack.
 * You can add props to customize it.
 */
export default function FixedToWindow({
  children,
  ...props
}) {
  return (
    <Stack
      boxSizing="border-box"
      position="fixed"
      inset="0"
      margin="0"
      padding="0"
      direction="column"
      width="100%"
      height="100%"
      {...props}
    >
      {children}
    </Stack>
  )
}


