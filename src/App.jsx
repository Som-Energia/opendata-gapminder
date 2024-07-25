import React from 'react'
import './App.css'
import GlobalTheming from '@somenergia/somenergia-ui/GlobalTheming'
import Console from './components/Console'


function App() {
  return (
    <GlobalTheming>
      <Console/>
    </GlobalTheming>
  )
}

export default App
