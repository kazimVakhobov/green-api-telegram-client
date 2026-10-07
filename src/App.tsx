import { useState } from 'react'

import type { InstanceCredentials } from './api/types'
import { AuthScreen } from './components/AuthScreen'
import {
  clearCredentials,
  loadCredentials,
  saveCredentials,
} from './store/persistence'
import styles from './App.module.css'

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

  return (
    <div className={styles.app}>
      <div className={styles.splash}>
        <span>Инстанс {credentials.idInstance} подключён</span>
        <button className={styles.logout} type="button" onClick={handleLogout}>
          Выйти
        </button>
      </div>
    </div>
  )
}
