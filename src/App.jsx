import React from 'react'
import GlobalTheming from '@somenergia/somenergia-ui/GlobalTheming'
import Console from './components/Console'
import {
  createBrowserRouter,
  RouterProvider,
} from "react-router-dom"
import './i18n/i18n'

const router  = createBrowserRouter([
  {
    path: "/",
    element: <Console />
  },
],{
  basename: import.meta.env.BASE_URL || null,
});

function App() {
  return (
    <GlobalTheming>
      <RouterProvider router={router} />
    </GlobalTheming>
  )
}

export default App
