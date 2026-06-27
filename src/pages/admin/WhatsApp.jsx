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
      if (res.connected || res.instance?.state === 'open') {
        setStatus('connected');
        clearInterval(intervalRef.current);
      } else {
        setStatus('disconnected');
      }
    } catch {
      setStatus('disconnected');
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
          if (check.connected || check.instance?.state === 'open') {
            setStatus('connected');
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

  async function handleDesconectar() {
    if (!lojista) return;
    const confirm = window.confirm("Deseja realmente desconectar o WhatsApp?");
    if (!confirm) return;
    
    setStatus('loading');
    try {
      await desconectarWhatsApp(lojista.id);
      toast.success('WhatsApp desconectado com sucesso!');
      setStatus('disconnected');
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
          <div className="wpp-status-center slide-up">
            <div className="wpp-status-icon-wrapper">
              <FiCheckCircle size={40} />
            </div>
            <div>
              <h2 className="wpp-status-title">WhatsApp Conectado</h2>
              <p className="wpp-subtitle">Seu robô de mensagens e notificações está pronto e operante.</p>
            </div>
            <div className="wpp-actions-row">
              <button className="btn btn-secondary" onClick={checkStatus}><FiRefreshCw /> Verificar novamente</button>
              <button className="btn btn-danger" onClick={handleDesconectar}><FiLogOut /> Desconectar Bot</button>
            </div>
            
            <hr className="wpp-divider" />
            
            <div className="wpp-autoresponder">
              <div className="wpp-autoresponder-header">
                <FiMessageCircle size={20} />
                <h3 className="wpp-autoresponder-title">Mensagem Automática</h3>
              </div>
              <p className="wpp-autoresponder-desc">Envie uma mensagem de boas-vindas ou ausência de forma automática sempre que um cliente iniciar uma conversa no seu WhatsApp.</p>
              
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
                <div className="wpp-form-group slide-down">
                  <label>Mensagem de Boas-Vindas / Ausência</label>
                  <textarea 
                    className="wpp-textarea"
                    rows="4"
                    placeholder="Ex: Olá! Como podemos ajudar? Já fez o seu pedido no nosso cardápio virtual?"
                    value={autoResponderMessage}
                    onChange={e => setAutoResponderMessage(e.target.value)}
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
    </div>
  );
}
