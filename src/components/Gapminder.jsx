import React from 'react'
import Box from '@mui/material/Box'
import OpenData, { Gapminder as D3Gapminder } from '../services/opendata'

export default function Gapminder({
  xMetric,
  yMetric,
  rMetric,
  playing,
  setPlaying,
}) {
  const container = React.useRef()
  const [width, setWidth] = React.useState(0)
  const [height, setHeight] = React.useState(0)

  React.useEffect(()=>{
    const deregister = window.addEventListener('resize', handleResize)
    handleResize()
    return deregister
  }, [])
 
  React.useEffect(()=>{
    if (D3Gapminder.api) return
    D3Gapminder.oninit(setPlaying)
    D3Gapminder.oncreate(container.current)
  },[])

  React.useEffect(()=>D3Gapminder.setXMetric && D3Gapminder.setXMetric(xMetric), [xMetric])
  React.useEffect(()=>D3Gapminder.setYMetric && D3Gapminder.setYMetric(yMetric), [yMetric])
  React.useEffect(()=>D3Gapminder.setRMetric && D3Gapminder.setRMetric(rMetric), [rMetric])
  React.useEffect(()=>D3Gapminder.resize && D3Gapminder.resize(), [width, height])
  React.useEffect(()=>D3Gapminder.externalPlay && D3Gapminder.externalPlay(playing), [playing])

  function handleResize() {
    if (!container.current) return
    const width = container.current.offsetWidth
    const height = container.current.offsetHeight
    setWidth(width)
    setHeight(height)
  }

  return <Box className="gapminder" ref={container} height="100%" width="100%" p="0" m="0" >
   </Box>
}
