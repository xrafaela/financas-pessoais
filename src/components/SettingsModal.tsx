import { useState } from 'react';
import type { ReactElement } from 'react';

import { Modal } from './Modal.tsx';
import { OneDriveError } from '../domain/onedrive.ts';
import type { OneDriveClient } from '../domain/onedrive.ts';

export function SettingsModal(props: {
  client: OneDriveClient;
  lastSync: string;
  syncing: boolean;
  onSync: () => void;
  onClose: () => void;
}): ReactElement {
  const { client, lastSync, syncing, onSync, onClose } = props;
  const [clientId, setClientId] = useState<string>(client.getClientId());
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [authVersion, setAuthVersion] = useState<number>(0);

  const authenticated = client.isAuthenticated();
  const configured = client.isConfigured();

  function handleSaveClientId(): void {
    client.setClientId(clientId);
    setAuthVersion((v) => v + 1);
    setMessage('Client ID guardado.');
  }

  async function handleLogin(): Promise<void> {
    setError(null);
    setMessage(null);
    try {
      await client.login();
    } catch (e) {
      setError(e instanceof OneDriveError ? e.message : 'Falha ao iniciar a autenticação.');
    }
  }

  function handleLogout(): void {
    client.logout();
    setAuthVersion((v) => v + 1);
    setMessage('Sessão terminada.');
  }

  const authSection =
    !configured || clientId.trim() === '' ? (
      <p className="muted-note">
        Falta configurar o Client ID. Segue os passos do ficheiro README para registar a app no portal Azure.
      </p>
    ) : authenticated ? (
      <>
        <p className="muted-note">
          Sessão iniciada{client.getAccountName() !== '' ? ` como ${client.getAccountName()}` : ''}.
          {lastSync !== '' ? ` Última sincronização: ${new Date(lastSync).toLocaleString('pt-PT')}.` : ' Ainda sem sincronização.'}
        </p>
        <div className="btn-row">
          <button type="button" className="btn primary" onClick={onSync} disabled={syncing}>
            {syncing ? 'A sincronizar…' : 'Sincronizar agora'}
          </button>
          <button type="button" className="btn danger-outline" onClick={handleLogout}>
            Terminar sessão
          </button>
        </div>
      </>
    ) : (
      <>
        <p className="muted-note">
          Entra com a tua conta Microsoft para guardar os dados na pasta da app no OneDrive
          (Apps/financas-pessoais). Os dados continuam sempre disponíveis offline.
        </p>
        <div className="btn-row">
          <button type="button" className="btn primary" onClick={() => void handleLogin()}>
            Entrar com a Microsoft
          </button>
        </div>
      </>
    );

  return (
    <Modal title="Definições" onClose={onClose}>
      <h3 className="card-title">Sincronização OneDrive</h3>
      {error !== null && <div className="form-error">{error}</div>}
      {message !== null && <div className="form-ok">{message}</div>}

      <div className="field" key={authVersion}>
        <label htmlFor="client-id">Client ID da aplicação (Azure)</label>
        <input
          id="client-id"
          type="text"
          value={clientId}
          placeholder="00000000-0000-0000-0000-000000000000"
          onChange={(e) => setClientId(e.target.value)}
          autoComplete="off"
          spellCheck={false}
        />
      </div>
      <div className="btn-row" style={{ marginBottom: 16 }}>
        <button type="button" className="btn secondary" onClick={handleSaveClientId}>
          Guardar Client ID
        </button>
      </div>

      {authSection}
    </Modal>
  );
}
