import React from 'react'
import Stack from '@mui/material/Stack'
import DizzyError from '@somenergia/somenergia-ui/DizzyError'
import Button from '@mui/material/Button'

/**
 * Error message with a nice dizzy firefly,
 * an error message, and optional error context
 * and a button to execute an action.
 */
export default function ErrorSplash({ error, context, action, actionLabel }) {
  return (
    <Stack
      direction="column"
      height="100%"
      width="100%"
      justifyContent="center"
      alignContent="center"
      alignItems="center"
      gap="1rem"
    >
      <DizzyError />
      {context && <div style={{fontWeight: 'bold'}}>{context}</div>}
      <div>{'' + error}</div>
      {action && (
        <Button variant="contained" color="error" onClick={action}>
          {actionLabel}
        </Button>
      )}
    </Stack>
  )
}
