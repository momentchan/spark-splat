import './setupDevtoolsPatch'
import './style.css'
// Ensure Three.js is loaded before any Spark library imports
import 'three'
import { createRoot } from 'react-dom/client'
import App from './app/App'
import { StrictMode } from 'react'

createRoot(document.querySelector('#root')).render(<StrictMode><App /></StrictMode>)