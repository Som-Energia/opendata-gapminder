import React from 'react'
import Stack from '@mui/material/Stack'
import Button from '@mui/material/Button'
import MenuItem from '@mui/material/MenuItem'
import TextField from '@mui/material/TextField'
import PlayIcon from '@mui/icons-material/PlayArrow'
import StopIcon from '@mui/icons-material/Stop'
import ColorModeButton from '@somenergia/somenergia-ui/ColorModeButton'

function t(x) {
  return x
}

function MetricSelector({ label, onChange, value, options }) {
  return (
    <TextField select size="small" {...{ label, value, onChange }} sx={{ flexGrow: 2 }}>
      {options.map((option) => (
        <MenuItem key={option.value} value={option.value}>
          {option.label}
        </MenuItem>
      ))}
    </TextField>
  )
}

function Console() {
  const [xMetric, setXMetric] = React.useState('')
  const [yMetric, setYMetric] = React.useState('')
  const [rMetric, setRMetric] = React.useState('')
  const [options, setOptions] = React.useState([])

  function handleXMetricChange(e) {
    setXMetric(e.target.value)
  }
  function handleYMetricChange(e) {
    setYMetric(e.target.value)
  }
  function handleRMetricChange(e) {
    setRMetric(e.target.value)
  }
  return (
    <Stack
      boxSizing="border-box"
      position="fixed"
      inset="0"
      margin="0"
      padding="0"
      direction="column"
      width="calc(100% - 2pt)"
      height="calc(100vh - 20pt)"
    >
      <Stack direction="row" sx={{ flexGrow: 1 }}>
        <svg width="100%">
          <rect
            x="0"
            y="0"
            width="100%"
            height="100%"
            fill="#333"
            stroke="green"
            strokeWidth="10"
          />
        </svg>
      </Stack>
      <Stack direction="row" margin="1rem 1rem 2rem" gap="1rem">
        <Stack direction="row" gap="1rem">
          <Button variant="contained" startIcon={<PlayIcon />}>{t('PLAY')}</Button>
          <Button variant="contained" startIcon={<StopIcon />}>{t('PAUSE')}</Button>
        </Stack>
        <MetricSelector
          label={t('XAXIS')}
          value={xMetric}
          onChange={handleXMetricChange}
          options={options}
        />
        <MetricSelector
          label={t('YAXIS')}
          value={yMetric}
          onChange={handleYMetricChange}
          options={options}
        />
        <MetricSelector
          label={t('RADIUS')}
          value={rMetric}
          onChange={handleRMetricChange}
          options={options}
        />
        <div><ColorModeButton /></div>
      </Stack>
    </Stack>
  )
}

export default Console
