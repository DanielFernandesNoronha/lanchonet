import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { verificarStatusWhatsApp, obterQRCodeWhatsApp, desconectarWhatsApp } from '../../lib/api';
import { supabase } from '../../lib/supabase';
import { FiSmartphone, FiCheckCircle, FiRefreshCw, FiMessageCircle, FiSave, FiLogOut } from 'react-icons/fi';
import toast from 'react-hot-toast';
import './WhatsApp.css';

export default function WhatsApp() {
  const { lojista } = useAuth();
  const [status, setStatus] = useState('checking'); // checking | disconnected | connected | qr
  const [qrCode, setQrCode] = useState(null);
  const [connectionDetails, setConnectionDetails] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const [autoResponderEnabled, setAutoResponderEnabled] = useState(false);
  const [autoResponderMessage, setAutoResponderMessage] = useState('');
  const [savingConfig, setSavingConfig] = useState(false);

  const intervalRef = useRef(null);

  useEffect(() => {
    checkStatus();
    loadConfigs();
    return () => clearInterval(intervalRef.current);
  }, []);

  useEffect(() => {
    const pollInterval = setInterval(() => {
      if (status === 'connected' || status === 'disconnected') {
        checkStatus(true);
      }
    }, 15000);
    return () => clearInterval(pollInterval);
  }, [status]);

  async function loadConfigs() {
    if (!lojista) return;
    try {
      const { data, error } = await supabase
        .from('lojistas')
        .select('auto_responder_enabled, auto_responder_message')
        .eq('id', lojista.id)
        .single();

      if (!error && data) {
        setAutoResponderEnabled(data.auto_responder_enabled || false);
        setAutoResponderMessage(data.auto_responder_message || '');
      }
    } catch (e) {
      console.error(e);
    }
  }

  async function saveConfigs() {
    setSavingConfig(true);
    try {
      const { error } = await supabase
        .from('lojistas')
        .update({
          auto_responder_enabled: autoResponderEnabled,
          auto_responder_message: autoResponderMessage
        })
        .eq('id', lojista.id);

      if (error) throw error;
      toast.success('Configurações salvas!');
    } catch (e) {
      console.error(e);
      toast.error('Erro ao salvar as configurações.');
    } finally {
      setSavingConfig(false);
    }
  }

  async function checkStatus(silent = false) {
    if (!lojista) return;
    if (!silent && status !== 'checking' && status !== 'loading') setStatus('checking');
    try {
      const res = await verificarStatusWhatsApp(lojista.id);
      if (res.connected) {
        setStatus('connected');
        setConnectionDetails(res);
        clearInterval(intervalRef.current);
      } else {
        setStatus('disconnected');
        setConnectionDetails(null);
      }
    } catch {
      setStatus('disconnected');
      setConnectionDetails(null);
    }
  }

  async function gerarQR() {
    setStatus('loading');
    try {
      const res = await obterQRCodeWhatsApp(lojista.id);
      if (res.qrCode || res.base64) {
        const base64Str = res.base64 || '';
        const qrSrc = res.qrCode || (base64Str.startsWith('data:image') ? base64Str : `data:image/png;base64,${base64Str}`);
        setQrCode(qrSrc);
        setStatus('qr');
        // Start polling every 5 seconds
        intervalRef.current = setInterval(async () => {
          const check = await verificarStatusWhatsApp(lojista.id);
          if (check.connected) {
            setStatus('connected');
            setConnectionDetails(check);
            clearInterval(intervalRef.current);
            toast.success('WhatsApp conectado com sucesso!');
          }
        }, 5000);
      } else {
        console.error("N8N response for QR Code:", res);
        toast.error(res.error ? `Erro: ${res.error}` : 'Não foi possível gerar o QR Code');
        setStatus('disconnected');
      }
    } catch {
      toast.error('Erro de conexão');
      setStatus('disconnected');
    }
  }

  function triggerDesconectar() {
    setShowConfirmModal(true);
  }

  async function handleDesconectarConfirmado() {
    setShowConfirmModal(false);
    if (!lojista) return;

    setStatus('loading');
    try {
      await desconectarWhatsApp(lojista.id);
      toast.success('WhatsApp desconectado com sucesso!');
      setStatus('disconnected');
      setConnectionDetails(null);
    } catch (e) {
      console.error(e);
      toast.error('Erro ao desconectar.');
      setStatus('connected');
    }
  }

  return (
    <div className="whatsapp-page">
      <h1 className="page-title">WhatsApp</h1>

      {status === 'checking' && (
        <div className="card wpp-status-card" style={{ maxWidth: 600, margin: '40px auto', padding: '40px 24px', textAlign: 'center' }}>
          <div className="wpp-status-center">
            <FiRefreshCw className="spin" size={32} color="var(--accent)" />
            <p style={{ fontWeight: 500, color: 'var(--text-secondary)', margin: '12px 0 0 0' }}>Verificando conexão...</p>
          </div>
        </div>
      )}

      {status === 'connected' && (
        <div className="wpp-dashboard-grid slide-up">
          {/* Left Side: Connection Info and Analytics */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <h4 className="wpp-section-title" style={{ fontSize: '0.85rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-secondary)', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
              <FiCheckCircle size={16} color="#22c55e" /> Instância Conectada
            </h4>

            <div className="wpp-info-list" style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div className="wpp-info-row" style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
                <span className="wpp-info-label" style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Nome da Conta</span>
                <span className="wpp-info-val" style={{ fontSize: '0.9rem', fontWeight: 600 }}>{connectionDetails?.profileName || lojista?.nome || 'Dispositivo WhatsApp'}</span>
              </div>
              <div className="wpp-info-row" style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
                <span className="wpp-info-label" style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Número Conectado</span>
                <span className="wpp-info-val" style={{ fontSize: '0.9rem', fontWeight: 600 }}>
                  {connectionDetails?.owner ? `+${connectionDetails.owner.split('@')[0]}` : 'Verificando...'}
                </span>
              </div>
              <div className="wpp-info-row" style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
                <span className="wpp-info-label" style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Status Geral</span>
                <span className="wpp-badge-status active">Ativo e Operante</span>
              </div>
              <div className="wpp-info-row" style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: 'none' }}>
                <span className="wpp-info-label" style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Serviço de Notificações</span>
                <span className="wpp-info-val" style={{ fontSize: '0.9rem', fontWeight: 600, color: '#22c55e' }}>ONLINE</span>
              </div>
            </div>

            <div className="wpp-actions-row" style={{ display: 'flex', gap: 12, marginTop: 8 }}>
              <button className="btn btn-secondary btn-sm" onClick={checkStatus} style={{ padding: '8px 16px' }}><FiRefreshCw /> Atualizar</button>
              <button className="btn btn-danger btn-sm" onClick={triggerDesconectar} style={{ padding: '8px 16px' }}><FiLogOut /> Desconectar</button>
            </div>
          </div>

          {/* Right Side: Autoresponder settings */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <h4 className="wpp-section-title" style={{ fontSize: '0.85rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-secondary)', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
              <FiMessageCircle size={16} /> Mensagem Automática
            </h4>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
              Envie uma mensagem de boas-vindas automática ao iniciar conversas.
            </p>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <button
                type="button"
                className={`toggle ${autoResponderEnabled ? 'on' : 'off'}`}
                onClick={() => setAutoResponderEnabled(!autoResponderEnabled)}
                style={{ fontSize: '0.85rem', padding: '6px 16px', display: 'inline-flex', alignItems: 'center', width: 'fit-content' }}
              >
                {autoResponderEnabled ? 'Robô Ativo' : 'Robô Inativo'}
              </button>
            </div>

            {autoResponderEnabled && (
              <div className="input-group">
                <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Sua Mensagem de Boas Vindas/Ausência</label>
                <textarea
                  className="input"
                  rows="4"
                  placeholder="Ex: Olá! Como podemos ajudar?"
                  value={autoResponderMessage}
                  onChange={e => setAutoResponderMessage(e.target.value)}
                  style={{ minHeight: '110px', resize: 'vertical' }}
                />
              </div>
            )}

            <button
              className="btn btn-primary wpp-save-btn"
              onClick={saveConfigs}
              disabled={savingConfig}
              style={{ width: 'fit-content', padding: '12px 24px' }}
            >
              {savingConfig ? 'Salvando...' : <><FiSave /> Salvar Configurações</>}
            </button>
          </div>
        </div>
      )}

      {status === 'disconnected' && (
        <div className="card wpp-status-card" style={{ maxWidth: 600, margin: '40px auto', padding: '40px 24px', textAlign: 'center' }}>
          <div className="wpp-status-center slide-up" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
            <div className="wpp-status-icon-wrapper disconnected">
              <FiSmartphone size={40} />
            </div>
            <div>
              <h2 className="wpp-status-title">Conectar WhatsApp</h2>
              <p className="wpp-subtitle" style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', maxWidth: '440px', margin: '8px auto 0 auto', lineHeight: 1.5 }}>
                Pareie seu aparelho celular para começar a enviar mensagens e notificações de pedidos de forma 100% automatizada.
              </p>
            </div>
            <button className="btn btn-primary btn-lg" onClick={gerarQR} style={{ padding: '12px 28px' }}><FiSmartphone /> Gerar QR Code</button>
          </div>
        </div>
      )}

      {status === 'loading' && (
        <div className="card wpp-status-card" style={{ maxWidth: 600, margin: '40px auto', padding: '40px 24px', textAlign: 'center' }}>
          <div className="wpp-status-center">
            <FiRefreshCw className="spin" size={32} color="var(--accent)" />
            <p style={{ fontWeight: 500, color: 'var(--text-secondary)', margin: '12px 0 0 0' }}>Gerando QR Code...</p>
          </div>
        </div>
      )}

      {status === 'qr' && qrCode && (
        <div className="card wpp-status-card" style={{ maxWidth: 600, margin: '40px auto', padding: '40px 24px', textAlign: 'center' }}>
          <div className="wpp-status-center slide-up" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
            <h2 className="wpp-status-title">Escaneie o QR Code</h2>
            <p className="wpp-subtitle" style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', maxWidth: '440px', margin: '0 auto', lineHeight: 1.5 }}>
              Abra o WhatsApp no seu celular → Configurações → Aparelhos conectados → Conectar aparelho
            </p>
            <img src={qrCode} alt="QR Code WhatsApp" className="wpp-qr" style={{ border: '1px solid var(--border)' }} />
            <p className="wpp-polling" style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>⏳ Aguardando pareamento... (verificando a cada 5 segundos)</p>
          </div>
        </div>
      )}

      {/* Custom Confirmation Modal */}
      {showConfirmModal && (
        <div className="modal-overlay">
          <div className="confirm-modal-card slide-up">
            <div className="confirm-modal-icon danger">
              <FiLogOut />
            </div>
            <h3 className="confirm-modal-title">Desconectar WhatsApp</h3>
            <p className="confirm-modal-message">
              Tem certeza que deseja desconectar o robô do seu WhatsApp? Você deixará de enviar notificações automáticas de status de pedidos para seus clientes.
            </p>
            <div className="confirm-modal-actions">
              <button className="btn btn-ghost" onClick={() => setShowConfirmModal(false)}>Cancelar</button>
              <button className="btn btn-danger" onClick={handleDesconectarConfirmado}>Confirmar Desconexão</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
