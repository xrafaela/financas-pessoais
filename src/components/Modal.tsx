import type { ReactElement, ReactNode } from 'react';

import { CloseIcon } from './icons.tsx';

export function Modal(props: { title: string; onClose: () => void; children: ReactNode }): ReactElement {
  return (
    <div
      className="overlay"
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        if (e.target === e.currentTarget) props.onClose();
      }}
    >
      <div className="sheet">
        <div className="sheet-head">
          <h2>{props.title}</h2>
          <button type="button" className="icon-btn" onClick={props.onClose} aria-label="Fechar">
            <CloseIcon size={20} />
          </button>
        </div>
        {props.children}
      </div>
    </div>
  );
}
