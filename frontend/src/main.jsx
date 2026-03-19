import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './styles.css'

// Punto de entrada del frontend. Si esto no monta, no existe app.
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)