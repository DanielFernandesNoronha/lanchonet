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

  async function checkStatus() {
    if (!lojista) return;
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
        toast.error('Não foi possível gerar o QR Code');
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
 
      <div className="whatsapp-card card">
        {status === 'checking' && (
          <div className="wpp-status-center">
            <FiRefreshCw className="spin" size={32} color="var(--accent)" />
            <p style={{ fontWeight: 500, color: 'var(--text-secondary)' }}>Verificando conexão...</p>
          </div>
        )}
 
        {status === 'connected' && (
          <div className="wpp-dashboard-grid slide-up">
            {/* Left Side: Connection Info and Analytics */}
            <div className="wpp-section">
              <h4 className="wpp-section-title">
                <FiCheckCircle size={14} color="#22c55e" /> Instância Conectada
              </h4>
              
              <div className="wpp-info-list">
                <div className="wpp-info-row">
                  <span className="wpp-info-label">Nome da Conta</span>
                  <span className="wpp-info-val">{connectionDetails?.profileName || lojista?.nome || 'Dispositivo WhatsApp'}</span>
                </div>
                <div className="wpp-info-row">
                  <span className="wpp-info-label">Número Conectado</span>
                  <span className="wpp-info-val">
                    {connectionDetails?.owner ? `+${connectionDetails.owner.split('@')[0]}` : 'Verificando...'}
                  </span>
                </div>
                <div className="wpp-info-row">
                  <span className="wpp-info-label">Status Geral</span>
                  <span className="wpp-badge-status active">Ativo e Operante</span>
                </div>
                <div className="wpp-info-row">
                  <span className="wpp-info-label">Serviço de Notificações</span>
                  <span className="wpp-info-val" style={{ color: '#22c55e' }}>ONLINE</span>
                </div>
              </div>

              <div className="wpp-actions-row">
                <button className="btn btn-secondary btn-sm" onClick={checkStatus}><FiRefreshCw /> Atualizar</button>
                <button className="btn btn-danger btn-sm" onClick={triggerDesconectar}><FiLogOut /> Desconectar</button>
              </div>
            </div>
            
            {/* Right Side: Autoresponder settings */}
            <div className="wpp-section">
              <h4 className="wpp-section-title">
                <FiMessageCircle size={14} /> Mensagem Automática
              </h4>
              <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Envie uma mensagem de boas-vindas automática ao iniciar conversas.</p>
              
              <div className="wpp-toggle-container">
                <label className="wpp-toggle-switch">
                  <input 
                    type="checkbox" 
                    checked={autoResponderEnabled} 
                    onChange={e => setAutoResponderEnabled(e.target.checked)} 
                  />
                  <span className="wpp-toggle-slider"></span>
                </label>
                <span className="wpp-toggle-label">
                  {autoResponderEnabled ? 'Robô Ativo' : 'Robô Inativo'}
                </span>
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
              >
                {savingConfig ? 'Salvando...' : <><FiSave /> Salvar Configurações</>}
              </button>
            </div>
          </div>
        )}
 
        {status === 'disconnected' && (
          <div className="wpp-status-center slide-up">
            <div className="wpp-status-icon-wrapper disconnected">
              <FiSmartphone size={40} />
            </div>
            <div>
              <h2 className="wpp-status-title">Conectar WhatsApp</h2>
              <p className="wpp-subtitle">Pareie seu aparelho celular para começar a enviar mensagens e notificações de pedidos de forma 100% automatizada.</p>
            </div>
            <button className="btn btn-primary btn-lg" onClick={gerarQR}><FiSmartphone /> Gerar QR Code</button>
          </div>
        )}
 
        {status === 'loading' && (
          <div className="wpp-status-center">
            <FiRefreshCw className="spin" size={32} color="var(--accent)" />
            <p style={{ fontWeight: 500, color: 'var(--text-secondary)' }}>Gerando QR Code...</p>
          </div>
        )}
 
        {status === 'qr' && qrCode && (
          <div className="wpp-status-center slide-up">
            <h2 className="wpp-status-title">Escaneie o QR Code</h2>
            <p className="wpp-subtitle">Abra o WhatsApp no seu celular → Configurações → Aparelhos conectados → Conectar aparelho</p>
            <img src={qrCode} alt="QR Code WhatsApp" className="wpp-qr" />
            <p className="wpp-polling">⏳ Aguardando pareamento... (verificando a cada 5 segundos)</p>
          </div>
        )}
      </div>

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
