import React from 'react'
import Stack from '@mui/material/Stack'
import Button from '@mui/material/Button'
import MenuItem from '@mui/material/MenuItem'
import TextField from '@mui/material/TextField'
import PlayIcon from '@mui/icons-material/PlayArrow'
import StopIcon from '@mui/icons-material/Stop'

function t(x) {
  return x
}

function MetricSelector({ label, onChange, value, options }) {
  return (
    <TextField compact select {...{ label, value, onChange }}
    sx={{flexGrow: 1}}
    >
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
      <Stack direction="row" 
          sx={{flexGrow:1}}
      >
        Hello
      </Stack>
      <Stack direction="row">
        <Button startIcon={<PlayIcon />}>{t('PLAY')}</Button>
        <Button startIcon={<StopIcon />}>{t('PAUSE')}</Button>
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
      </Stack>
    </Stack>
  )
}

export default Console
