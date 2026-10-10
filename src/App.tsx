import { useState } from 'react'

import type { InstanceCredentials } from './api/types'
import { AuthScreen } from './components/AuthScreen'
import { ChatLayout } from './components/ChatLayout'
import {
  clearCredentials,
  loadCredentials,
  saveCredentials,
} from './store/persistence'

export function App() {
  const [credentials, setCredentials] = useState(loadCredentials)

  function handleAuthorized(next: InstanceCredentials) {
    saveCredentials(next)
    setCredentials(next)
  }

  function handleLogout() {
    clearCredentials()
    setCredentials(null)
  }

  if (credentials === null) {
    return <AuthScreen onAuthorized={handleAuthorized} />
  }

  // Переписка принадлежит инстансу: со сменой учётных данных каркас пересоздаём,
  // иначе в состоянии останутся чаты прежнего.
  return (
    <ChatLayout
      key={credentials.idInstance}
      credentials={credentials}
      onLogout={handleLogout}
    />
  )
}
