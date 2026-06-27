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
            <FiRefreshCw className="spin" size={32} />
            <p>Verificando conexão...</p>
          </div>
        )}

        {status === 'connected' && (
          <div className="wpp-status-center wpp-connected slide-up">
            <FiCheckCircle size={48} color="var(--green)" />
            <h2>WhatsApp Conectado e Operante!</h2>
            <p className="wpp-subtitle">🟢 Seu robô de mensagens e notificações está pronto.</p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <button className="btn btn-secondary" onClick={checkStatus}><FiRefreshCw /> Verificar novamente</button>
              <button className="btn btn-danger" onClick={handleDesconectar}><FiLogOut /> Desconectar Bot</button>
            </div>
            
            <hr className="wpp-divider" />
            
            <div className="wpp-autoresponder">
              <h3><FiMessageCircle /> Mensagem Automática</h3>
              <p>Envie uma mensagem automática sempre que um cliente chamar no seu WhatsApp.</p>
              
              <div className="form-group wpp-toggle-group">
                <label className="toggle-switch">
                  <input 
                    type="checkbox" 
                    checked={autoResponderEnabled} 
                    onChange={e => setAutoResponderEnabled(e.target.checked)} 
                  />
                  <span className="slider round"></span>
                </label>
                <span>{autoResponderEnabled ? 'Robô Ligado' : 'Robô Desligado'}</span>
              </div>

              {autoResponderEnabled && (
                <div className="form-group slide-down">
                  <label>Sua Mensagem de Boas Vindas/Ausência</label>
                  <textarea 
                    className="form-control"
                    rows="4"
                    placeholder="Ex: Olá! Aqui é da LanchoNet. Como podemos ajudar? Já fez o seu pedido no nosso cardápio virtual?"
                    value={autoResponderMessage}
                    onChange={e => setAutoResponderMessage(e.target.value)}
                  ></textarea>
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
            <FiSmartphone size={48} color="var(--text-muted)" />
            <h2>Conectar WhatsApp</h2>
            <p className="wpp-subtitle">Pareie seu WhatsApp para enviar notificações automáticas de pedidos aos seus clientes.</p>
            <button className="btn btn-primary btn-lg" onClick={gerarQR}><FiSmartphone /> Gerar QR Code</button>
          </div>
        )}

        {status === 'loading' && (
          <div className="wpp-status-center">
            <FiRefreshCw className="spin" size={32} />
            <p>Gerando QR Code...</p>
          </div>
        )}

        {status === 'qr' && qrCode && (
          <div className="wpp-status-center slide-up">
            <h2>Escaneie o QR Code</h2>
            <p className="wpp-subtitle">Abra o WhatsApp no seu celular → Configurações → Aparelhos conectados → Conectar aparelho</p>
            <img src={qrCode} alt="QR Code WhatsApp" className="wpp-qr" />
            <p className="wpp-polling">⏳ Aguardando pareamento... (verificando a cada 5 segundos)</p>
          </div>
        )}
      </div>
    </div>
  );
}
