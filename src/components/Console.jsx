import React from 'react'
import Stack from '@mui/material/Stack'
import Button from '@mui/material/Button'
import MenuItem from '@mui/material/MenuItem'
import TextField from '@mui/material/TextField'
import PlayIcon from '@mui/icons-material/PlayArrow'
import StopIcon from '@mui/icons-material/Stop'
import ColorModeButton from '@somenergia/somenergia-ui/ColorModeButton'
import Loading from '@somenergia/somenergia-ui/Loading'
import OpenData from '../services/opendata'
import ErrorSplash from './ErrorSplash'
import FixedToWindow from './FixedToWindow'
import Theater from './Theater'
import Gapminder from './Gapminder'

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
  const notstarted = 'notstarted'
  const inprogress = 'inprogress'
  const done = 'done'
  // Any other value is an exception
  const [loadingOpenData, setLoadingOpenData] = React.useState(notstarted)
  const [playing, setPlaying] = React.useState(true)
  const [xMetric, setXMetric] = React.useState('')
  const [yMetric, setYMetric] = React.useState('')
  const [rMetric, setRMetric] = React.useState('')
  const [options, setOptions] = React.useState([])

  React.useEffect(() => {
    if (loadingOpenData !== notstarted) return // avoid double load in dev mode
    setLoadingOpenData(inprogress)
    OpenData.retrieveData()
      .then((d) => {
        console.log('data loaded', d)
        const options = OpenData.metricOptions().map(({ value, text }) => ({
          value,
          label: text,
        }))
        setOptions(options)
        setXMetric('members')
        setYMetric('contracts')
        setRMetric('members_change')
        setLoadingOpenData(done)
      })
      .catch((e) => {
        console.log(Object.keys(e))
        setLoadingOpenData(e)
      })
  }, [loadingOpenData])

  function togglePlaying() {
    setPlaying((wasPlaying) => !wasPlaying)
  }
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
    <FixedToWindow>
      <Theater>
        {loadingOpenData === notstarted ? null : loadingOpenData === inprogress ? (
          <Loading />
        ) : loadingOpenData === done ? (
          <Gapminder />
        ) : (
          <ErrorSplash
            context={t('ERROR_WHILE_LOADING_DATA')}
            error={'' + loadingOpenData}
            action={() => setLoadingOpenData('notstarted')}
            actionLabel={t('RELOAD_DATA')}
          />
        )}
      </Theater>
      <Stack direction="row" margin="1rem 1rem 2rem" gap="1rem">
        <Stack direction="row" gap="1rem">
          <Button
            variant="contained"
            onClick={togglePlaying}
            startIcon={playing ? <StopIcon /> : <PlayIcon />}
          >
            {playing ? t('PAUSE') : t('PLAY')}
          </Button>
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
        <div>
          <ColorModeButton />
        </div>
      </Stack>
    </FixedToWindow>
  )
}

export default Console
