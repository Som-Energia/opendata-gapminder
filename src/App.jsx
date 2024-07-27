import React from 'react'
import GlobalTheming from '@somenergia/somenergia-ui/GlobalTheming'
import Console from './components/Console'
import './i18n/i18n'

function App() {
  return (
    <GlobalTheming>
      <Console/>
    </GlobalTheming>
  )
}

export default App
