import React from 'react'
import Box from '@mui/material/Box'
import OpenData, { Gapminder as D3Gapminder } from '../services/opendata'

export default function Gapminder({}) {
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
    D3Gapminder.oninit()
    D3Gapminder.oncreate(container.current)
  },[])

  function handleResize() {
    if (!container.current) return
    const width = container.current.offsetWidth
    const height = container.current.offsetHeight
    setWidth(width)
    setHeight(height)
    console.log({ width, height })
  }

  return <Box className="gapminder" ref={container} height="100%" width="100%" border="1pt solid red">
    <Box component="span" position="absolute" top={height/2} left={width/2}>hello {width} {height}</Box>
   </Box>
}
