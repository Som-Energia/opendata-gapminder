import React from 'react'
import Box from '@mui/material/Box'
import OpenData, { Gapminder as GapminderD3 } from '../services/opendata'

export default function Gapminder({}) {
  const container = React.useRef()
  const [width, setWidth] = React.useState(0)
  const [height, setHeight] = React.useState(0)

  React.useEffect(()=>{
    const deregister = window.addEventListener('resize', handleResize)
    handleResize()
    return deregister
  }, [])
 
  function handleResize() {
    const width = container.current.offsetWidth
    const height = container.current.offsetHeight
    setWidth(width)
    setHeight(height)
    console.log({ width, height })
  }

  return <Box className="gapminder" ref={container} height="100%" width="100%" border="1pt solid red">
    <Box component="span" display="absolute" top={height/2} left={width/2}>hello {width} {height}</Box>
   </Box>
}
