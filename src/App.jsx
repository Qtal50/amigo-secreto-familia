import React, { useState, useEffect, useMemo, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import {
  getAuth,
  signInAnonymously,
  signInWithCustomToken,
  onAuthStateChanged,
} from 'firebase/auth';
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
} from 'firebase/firestore';
import {
  Gift,
  Sparkles,
  Users,
  Shield,
  Lock,
  LogIn,
  LogOut,
  Heart,
  ThumbsDown,
  AlertTriangle,
  RefreshCw,
  Eye,
  EyeOff,
  Settings,
  Trash2,
  CheckCircle2,
  Clock,
  Search,
  Star,
  UserPlus,
  Edit3,
  Send,
  Shuffle,
  Upload,
  Download,
  FileSpreadsheet,
  Play,
  Pause,
  CheckCircle,
  XCircle,
  ArrowRight,
  ArrowUpRight,
  MessageSquare,
  ChevronDown,
} from 'lucide-react';

// ============================================================================
// 1. CONFIGURAÇÃO DO FIREBASE (COMPATÍVEL COM CANVAS E COM VERCEL/VITE DIRETO)
// ============================================================================
const defaultFirebaseConfig = {
  apiKey: "AIzaSyDROloG5oTL6x-mzAIUdfmldtwyMEnmNx8",
  authDomain: "amigo-secreto-familia-d3db6.firebaseapp.com",
  projectId: "amigo-secreto-familia-d3db6",
  storageBucket: "amigo-secreto-familia-d3db6.firebasestorage.app",
  messagingSenderId: "823718992830",
  appId: "1:823718992830:web:e77ce75b4adf4771abf7ef",
  measurementId: "G-JD70XVYV04"
};

const firebaseConfig =
  typeof __firebase_config !== 'undefined' && __firebase_config
    ? JSON.parse(__firebase_config)
    : defaultFirebaseConfig;

const appId =
  typeof __app_id !== 'undefined' && __app_id
    ? __app_id
    : 'amigo-secreto-familia-2026';

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// ============================================================================
// 2. CRIPTOGRAFIA ZERO-KNOWLEDGE E UTILITÁRIOS DE TELEFONE / SORTEIO
// ============================================================================

/**
 * Gera um hash SHA-256 hexadecimal (usado na senha do Administrador Único)
 */
async function sha256Hash(text, salt = 'natal-familia-2026-sec') {
  const payload = `${salt}::${String(text).trim()}`;
  const buffer = new TextEncoder().encode(payload);
  const digest = await crypto.subtle.digest('SHA-256', buffer);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Deriva uma chave criptográfica AES-GCM de 256 bits a partir do Token exclusivo do link
 */
async function deriveAesKeyFromToken(token) {
  const rawKeyMaterial = new TextEncoder().encode(
    `zk-direct-link-2026::${String(token).trim().toLowerCase()}`
  );
  const hashBuffer = await crypto.subtle.digest('SHA-256', rawKeyMaterial);
  return crypto.subtle.importKey(
    'raw',
    hashBuffer,
    { name: 'AES-GCM' },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Criptografa o resultado individual do participante usando o Token do seu link exclusivo.
 * Assim o familiar abre direto sem precisar digitar código, e o painel admin nunca expõe os pares.
 */
async function encryptSecretResult(token, payloadObject) {
  const key = await deriveAesKeyFromToken(token);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encodedData = new TextEncoder().encode(JSON.stringify(payloadObject));
  const encryptedBuffer = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encodedData
  );

  const encryptedHex = Array.from(new Uint8Array(encryptedBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  const ivHex = Array.from(iv)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  return { encryptedHex, ivHex };
}

/**
 * Descriptografa o resultado automaticamente assim que o participante abre seu link exclusivo
 */
async function decryptSecretResult(token, encryptedHex, ivHex) {
  const key = await deriveAesKeyFromToken(token);
  const encryptedBytes = new Uint8Array(
    encryptedHex.match(/.{1,2}/g).map((byte) => parseInt(byte, 16))
  );
  const ivBytes = new Uint8Array(
    ivHex.match(/.{1,2}/g).map((byte) => parseInt(byte, 16))
  );

  const decryptedBuffer = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: ivBytes },
    key,
    encryptedBytes
  );

  const decodedText = new TextDecoder().decode(decryptedBuffer);
  return JSON.parse(decodedText);
}

/**
 * Gera um token imprevisível de 10 caracteres hexadecimais (ex: 8f7a2c91b4)
 */
function generateSecureToken() {
  const bytes = new Uint8Array(5);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Normaliza texto para comparação de duplicidade
 */
function normalizeText(str) {
  return String(str || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ');
}

/**
 * Limpa telefone deixando apenas números
 */
function sanitizePhone(phone) {
  return String(phone || '').replace(/\D/g, '');
}

/**
 * Formata telefone para exibição amigável: (31) 99999-9999
 */
function formatPhoneDisplay(phone) {
  const digits = sanitizePhone(phone);
  const local =
    digits.startsWith('55') && digits.length >= 12 ? digits.slice(2) : digits;
  if (local.length === 11) {
    return `(${local.slice(0, 2)}) ${local.slice(2, 7)}-${local.slice(7)}`;
  }
  if (local.length === 10) {
    return `(${local.slice(0, 2)}) ${local.slice(2, 6)}-${local.slice(6)}`;
  }
  return phone || '';
}

/**
 * Formata número garantindo automaticamente o DDI 55 (Brasil) na frente de números com 10 ou 11 dígitos
 */
function formatPhoneForWhatsApp(phone) {
  const digits = sanitizePhone(phone);
  if (!digits) return '';
  if (digits.startsWith('55') && digits.length >= 12) {
    return digits;
  }
  return `55${digits}`;
}

/**
 * Valida se o telefone possui DDD + número brasileiro válido (10 ou 11 dígitos locais, ou 12-13 com 55)
 */
function isValidBrazilianPhone(phone) {
  const digits = sanitizePhone(phone);
  const local =
    digits.startsWith('55') && digits.length >= 12 ? digits.slice(2) : digits;
  return local.length === 10 || local.length === 11;
}

/**
 * Algoritmo de Sorteio (Ciclo Único Fechado / Derangement)
 * Garante matematicamente que ninguém tire a si mesmo, todos tirem 1 pessoa e sejam sorteados 1 vez.
 */
function createSecretSantaDerangement(participants) {
  if (!participants || participants.length < 2) {
    throw new Error('O sorteio requer pelo menos 2 participantes ativos.');
  }

  const pool = [...participants];
  for (let i = pool.length - 1; i > 0; i--) {
    const rand = new Uint32Array(1);
    crypto.getRandomValues(rand);
    const j = rand[0] % (i + 1);
    const tmp = pool[i];
    pool[i] = pool[j];
    pool[j] = tmp;
  }

  return pool.map((giver, idx) => {
    const receiver = pool[(idx + 1) % pool.length];
    return { giver, receiver };
  });
}

/**
 * Parser CSV simplificado (focado apenas em nome e telefone)
 */
function parseCsvText(csvString) {
  const lines = String(csvString || '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .filter((line) => line.trim().length > 0);

  if (lines.length === 0) return [];

  const firstLine = lines[0];
  const delimiter =
    (firstLine.match(/;/g) || []).length > (firstLine.match(/,/g) || []).length
      ? ';'
      : ',';

  const splitCsvLine = (line) => {
    const result = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === delimiter && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  };

  const headers = splitCsvLine(lines[0]).map((h) =>
    normalizeText(h).replace(/\s+/g, '_')
  );

  const hasHeader =
    headers.includes('nome') ||
    headers.includes('telefone') ||
    headers.includes('whatsapp');

  const startIndex = hasHeader ? 1 : 0;
  const rows = [];

  for (let i = startIndex; i < lines.length; i++) {
    const cols = splitCsvLine(lines[i]);
    if (cols.every((c) => !c)) continue;

    if (hasHeader) {
      const getCol = (possibleNames, fallbackIdx) => {
        for (const name of possibleNames) {
          const idx = headers.indexOf(name);
          if (idx !== -1 && cols[idx] !== undefined) return cols[idx];
        }
        return cols[fallbackIdx] || '';
      };

      rows.push({
        tempId: `csv_${i}_${Date.now()}`,
        nome: getCol(['nome', 'participante', 'nome_completo'], 0),
        telefone: getCol(['telefone', 'whatsapp', 'celular', 'fone'], 1),
      });
    } else {
      rows.push({
        tempId: `csv_${i}_${Date.now()}`,
        nome: cols[0] || '',
        telefone: cols[1] || '',
      });
    }
  }

  return rows;
}

/**
 * Detecta se a URL atual é um link individual de participante (/amigo-secreto/TOKEN ou ?token=TOKEN)
 */
function extractTokenFromLocation() {
  try {
    const pathMatch = window.location.pathname.match(
      /\/amigo-secreto\/([a-zA-Z0-9_-]+)/i
    );
    if (pathMatch && pathMatch[1]) return pathMatch[1].toLowerCase();

    const hashMatch = window.location.hash.match(
      /\/amigo-secreto\/([a-zA-Z0-9_-]+)/i
    );
    if (hashMatch && hashMatch[1]) return hashMatch[1].toLowerCase();

    const params = new URLSearchParams(window.location.search);
    const queryToken =
      params.get('amigo-secreto') ||
      params.get('token') ||
      params.get('acesso');
    if (queryToken) return queryToken.trim().toLowerCase();
  } catch (e) {
    // Ignora bloqueios de leitura em iframes restritos
  }
  return null;
}

/**
 * Verifica se o participante já preencheu alguma dica de presente
 */
function hasFilledGiftHints(p) {
  if (!p) return false;
  return Boolean(
    (p.wantToGet && p.wantToGet.trim()) ||
      (p.dontWantToGet && p.dontWantToGet.trim()) ||
      (p.shoeSize && p.shoeSize.trim()) ||
      (p.shirtSize && p.shirtSize.trim()) ||
      (p.pantsSize && p.pantsSize.trim()) ||
      (p.observations && p.observations.trim()) ||
      (p.notes && p.notes.trim())
  );
}

// ============================================================================
// MODELO PADRÃO E FUNÇÃO DE CONSTRUÇÃO DA MENSAGEM DO WHATSAPP
// Você pode editar este texto padrão aqui no código OU direto na caixa de texto
// dentro da aba "02. WhatsApp" no Painel Administrativo!
// Variáveis suportadas: {nome}, {nome_completo}, {evento}, {link}
// ============================================================================
const DEFAULT_WHATSAPP_TEMPLATE = `🎄 Olá, *{nome}*!

O sorteio do amigo oculto foi realizado! 🎁

Quer descobrir quem você tirou?
É muito simples! Basta clicar no link abaixo para ver quem é seu amigo secreto:

{link}

Depois, você também poderá informar algumas sugestões de presentes que gostaria de ganhar, para ajudar seu amigo secreto na escolha.
Este acesso é pessoal. Guarde este link com você e boas festas! ✨`;

/**
 * Monta a mensagem personalizada do WhatsApp substituindo as variáveis {nome}, {evento} e {link}
 */
function buildWhatsAppMessage(participant, eventName, link, customTemplate) {
  const fullName = String(
    typeof participant === 'string'
      ? participant
      : participant?.fullName || participant?.participantName || 'Familiar'
  ).trim();
  const firstName = fullName.split(' ')[0] || 'Familiar';
  const activeTemplate =
    customTemplate && customTemplate.trim().length > 0
      ? customTemplate
      : DEFAULT_WHATSAPP_TEMPLATE;

  return activeTemplate
    .replace(/\{nome\}/gi, firstName)
    .replace(/\{nome_completo\}/gi, fullName)
    .replace(/\{evento\}/gi, eventName || 'Amigo Secreto da Família 2026')
    .replace(/\{link\}/gi, link);
}

// ============================================================================
// 3. ELEMENTOS GEOMÉTRICOS / ARQUITETÔNICOS SWISS DESIGN (SVGs DE LINHA FINA)
// ============================================================================

const ArchitecturalLogoMark = ({ className = 'w-7 h-7' }) => (
  <svg viewBox="0 0 40 40" fill="none" className={className}>
    <rect
      x="1.5"
      y="1.5"
      width="37"
      height="37"
      stroke="currentColor"
      strokeWidth="1.2"
    />
    <line
      x1="1.5"
      y1="1.5"
      x2="38.5"
      y2="38.5"
      stroke="currentColor"
      strokeWidth="1"
    />
    <line
      x1="20"
      y1="1.5"
      x2="20"
      y2="38.5"
      stroke="currentColor"
      strokeWidth="1"
    />
    <line
      x1="1.5"
      y1="20"
      x2="38.5"
      y2="20"
      stroke="currentColor"
      strokeWidth="1"
    />
    <circle
      cx="20"
      cy="20"
      r="7"
      fill="#FAF8F5"
      stroke="#8E3B36"
      strokeWidth="1.2"
    />
    <path
      d="M20 15L16.5 22.5H23.5L20 15Z"
      fill="#2C4035"
    />
  </svg>
);

const MinimalBotanicalFrameSVG = ({ className = 'w-full h-full' }) => (
  <svg viewBox="0 0 320 380" fill="none" className={className}>
    {/* Fundo em tom Taupe / Marrom-Claro Amendoado */}
    <rect x="40" y="20" width="250" height="310" fill="#EBE5DC" />
    {/* Bloco Arquitetônico Verde-Pinho Suave */}
    <rect x="20" y="60" width="210" height="270" fill="#2C4035" />
    {/* Círculo Terracota Minimalista */}
    <circle cx="175" cy="145" r="46" fill="#8E3B36" opacity="0.88" />
    {/* Pinheiro Geométrico Minimalista */}
    <path
      d="M115 95L65 185H100L55 265H175L130 185H165L115 95Z"
      stroke="#FAF8F5"
      strokeWidth="1.5"
      fill="none"
    />
    <line
      x1="115"
      y1="95"
      x2="115"
      y2="295"
      stroke="#8C6D53"
      strokeWidth="1.5"
    />
    {/* Moldura Deslocada de 1px Estilo Editorial */}
    <rect
      x="55"
      y="40"
      width="235"
      height="310"
      stroke="#181816"
      strokeWidth="1.2"
    />
    <circle cx="245" cy="75" r="3" fill="#8C6D53" />
    <circle cx="260" cy="75" r="3" fill="#8C6D53" />
    <circle cx="245" cy="90" r="3" fill="#8C6D53" />
    <circle cx="260" cy="90" r="3" fill="#8C6D53" />
  </svg>
);

// ============================================================================
// 4. COMPONENTE PRINCIPAL DO SISTEMA
// ============================================================================

export default function App() {
  // Carrega dinamicamente as fontes editoriais (Cormorant Garamond + Plus Jakarta Sans)
  useEffect(() => {
    const linkId = 'editorial-swiss-fonts-2026';
    if (!document.getElementById(linkId)) {
      const link = document.createElement('link');
      link.id = linkId;
      link.rel = 'stylesheet';
      link.href =
        'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;0,600;0,700;1,400;1,600&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap';
      document.head.appendChild(link);
    }
  }, []);

  // Autenticação Firebase
  const [firebaseUser, setFirebaseUser] = useState(null);
  const [loadingFirebase, setLoadingFirebase] = useState(true);

  // Coleções sincronizadas do Firestore em Tempo Real
  const [systemConfig, setSystemConfig] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [accessTokens, setAccessTokens] = useState([]);

  // Roteamento entre os 2 Ambientes:
  // activeParticipantToken != null -> Ambiente 2 (Página Individual do Familiar)
  // activeParticipantToken == null -> Ambiente 1 (Login / Painel Administrativo)
  const [activeParticipantToken, setActiveParticipantToken] = useState(() =>
    extractTokenFromLocation()
  );
  const [isSimulatingParticipant, setIsSimulatingParticipant] = useState(false);

  // Estado de Autenticação do Administrador Único
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [adminUserInput, setAdminUserInput] = useState('');
  const [adminPassInput, setAdminPassInput] = useState('');
  const [adminConfirmPassInput, setAdminConfirmPassInput] = useState('');
  const [showAdminPass, setShowAdminPass] = useState(false);

  // Navegação Interna do Painel Administrativo
  // 'dashboard' | 'whatsapp_dispatch' | 'settings'
  const [adminTab, setAdminTab] = useState('dashboard');

  // Filtros e Buscas de Participantes
  const [searchQuery, setSearchQuery] = useState('');

  // Modal de Cadastro / Edição Simplificado (Apenas Nome e WhatsApp)
  const [participantModalOpen, setParticipantModalOpen] = useState(false);
  const [editingParticipantId, setEditingParticipantId] = useState(null);
  const [formName, setFormName] = useState('');
  const [formPhone, setFormPhone] = useState('');

  // Modal de Importação CSV Simplificado (Nome e Telefone)
  const [csvModalOpen, setCsvModalOpen] = useState(false);
  const [csvPreviewRows, setCsvPreviewRows] = useState([]);
  const [csvRawText, setCsvRawText] = useState('');
  const fileInputRef = useRef(null);

  // Estados do Motor de Disparo 100% Automático de WhatsApp
  const [waProvider, setWaProvider] = useState('ultramsg'); // 'ultramsg' | 'zapi' | 'evolution' | 'webhook' | 'wame_assist'
  const [waInstanceUrl, setWaInstanceUrl] = useState('');
  const [waInstanceId, setWaInstanceId] = useState('');
  const [waApiToken, setWaApiToken] = useState('');
  const [waClientToken, setWaClientToken] = useState('');
  const [waDelaySeconds, setWaDelaySeconds] = useState(4);
  const [customWaTemplate, setCustomWaTemplate] = useState(
    DEFAULT_WHATSAPP_TEMPLATE
  );
  const [isAutoDispatching, setIsAutoDispatching] = useState(false);
  const [dispatchProgress, setDispatchProgress] = useState({
    current: 0,
    total: 0,
  });
  const [dispatchLogs, setDispatchLogs] = useState([]);
  const abortDispatchRef = useRef(false);
  const [previewMessageModal, setPreviewMessageModal] = useState(null);

  // Configurações do Evento no Painel Admin
  const [eventTitleInput, setEventTitleInput] = useState(
    'Amigo Secreto da Família 2026'
  );
  const [eventDateInput, setEventDateInput] = useState('2026-12-24');
  const [eventValueInput, setEventValueInput] = useState(
    'R$ 100,00 a R$ 150,00'
  );
  const [urlFormatPreference, setUrlFormatPreference] = useState('path');

  // Estados da Página Individual do Participante (Ambiente 2 - Acesso Direto Sem Código)
  const [decryptedResult, setDecryptedResult] = useState(null);
  const [isDecryptingLink, setIsDecryptingLink] = useState(false);
  const [isDrawnNameVisible, setIsDrawnNameVisible] = useState(true);
  const [hasScrolledMobile, setHasScrolledMobile] = useState(false);
  const [myHintsModalOpen, setMyHintsModalOpen] = useState(false);
  const [friendHintsModalOpen, setFriendHintsModalOpen] = useState(false);
  const [myWant, setMyWant] = useState('');
  const [myDontWant, setMyDontWant] = useState('');
  const [myShirt, setMyShirt] = useState('');
  const [myPants, setMyPants] = useState('');
  const [myShoe, setMyShoe] = useState('');
  const [myNotes, setMyNotes] = useState('');
  const [savingMyHints, setSavingMyHints] = useState(false);

  const friendHintsRef = useRef(null);
  const myHintsSectionRef = useRef(null);
  const myWantInputRef = useRef(null);

  // Modais e Notificações Globais
  const [toast, setToast] = useState(null);
  const [confirmModal, setConfirmModal] = useState(null);
  const [isBusy, setIsBusy] = useState(false);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast((prev) => (prev?.message === message ? null : prev));
    }, 4500);
  };

  // ============================================================================
  // 5. INICIALIZAÇÃO DO FIREBASE E LISTENERS EM TEMPO REAL
  // ============================================================================

  useEffect(() => {
    const initAuth = async () => {
      try {
        if (
          typeof __initial_auth_token !== 'undefined' &&
          __initial_auth_token
        ) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (err) {
        console.error('Erro na autenticação Firebase:', err);
      }
    };
    initAuth();

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user);
      setLoadingFirebase(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!firebaseUser) return;

    const settingsRef = collection(
      db,
      'artifacts',
      appId,
      'public',
      'data',
      'system_settings'
    );
    const participantsRef = collection(
      db,
      'artifacts',
      appId,
      'public',
      'data',
      'participants'
    );
    const tokensRef = collection(
      db,
      'artifacts',
      appId,
      'public',
      'data',
      'access_tokens'
    );

    const unsubSettings = onSnapshot(
      settingsRef,
      (snap) => {
        const mainDoc = snap.docs.find((d) => d.id === 'main_config');
        if (mainDoc) {
          const data = mainDoc.data();
          setSystemConfig(data);
          if (data.eventName) setEventTitleInput(data.eventName);
          if (data.eventDate) setEventDateInput(data.eventDate);
          if (data.suggestedValue) setEventValueInput(data.suggestedValue);
          if (data.waProvider) setWaProvider(data.waProvider);
          if (data.waInstanceUrl) setWaInstanceUrl(data.waInstanceUrl);
          if (data.waInstanceId) setWaInstanceId(data.waInstanceId);
          if (data.waApiToken) setWaApiToken(data.waApiToken);
          if (data.waClientToken) setWaClientToken(data.waClientToken);
          if (data.customWaTemplate) setCustomWaTemplate(data.customWaTemplate);
          if (data.urlFormatPreference)
            setUrlFormatPreference(data.urlFormatPreference);
        } else {
          setSystemConfig(null);
        }
      },
      (err) => console.error('Erro ao ler configurações:', err)
    );

    const unsubParticipants = onSnapshot(
      participantsRef,
      (snap) => {
        const list = snap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .sort((a, b) =>
            String(a.fullName || '').localeCompare(
              String(b.fullName || ''),
              'pt-BR'
            )
          );
        setParticipants(list);
      },
      (err) => console.error('Erro ao ler participantes:', err)
    );

    const unsubTokens = onSnapshot(
      tokensRef,
      (snap) => {
        const list = snap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .sort((a, b) =>
            String(a.participantName || '').localeCompare(
              String(b.participantName || ''),
              'pt-BR'
            )
          );
        setAccessTokens(list);
      },
      (err) => console.error('Erro ao ler tokens:', err)
    );

    return () => {
      unsubSettings();
      unsubParticipants();
      unsubTokens();
    };
  }, [firebaseUser]);

  // ============================================================================
  // 6. DADOS DERIVADOS, DESCRIPTOGRAFIA AUTOMÁTICA E SINCRONIZAÇÃO EM TEMPO REAL
  // ============================================================================

  const eventName =
    systemConfig?.eventName || 'Amigo Secreto da Família 2026';
  const drawStatus = systemConfig?.drawStatus || 'waiting';

  const filteredParticipants = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const qDigits = sanitizePhone(searchQuery);
    if (!q) return participants;
    return participants.filter((p) => {
      const nameMatch = normalizeText(p.fullName).includes(normalizeText(q));
      const phoneMatch = qDigits && sanitizePhone(p.phone).includes(qDigits);
      return nameMatch || phoneMatch;
    });
  }, [participants, searchQuery]);

  const validatedCsvRows = useMemo(() => {
    const existingPhones = new Set(
      participants.map((p) => sanitizePhone(p.phone))
    );
    const existingNames = new Set(
      participants.map((p) => normalizeText(p.fullName))
    );

    const seenPhonesInBatch = new Set();
    const seenNamesInBatch = new Set();

    return csvPreviewRows.map((row) => {
      const errors = [];
      const cleanName = String(row.nome || '').trim();
      const cleanPhone = sanitizePhone(row.telefone);
      const normName = normalizeText(cleanName);

      if (cleanName.length < 2) {
        errors.push('Nome obrigatório');
      } else if (existingNames.has(normName)) {
        errors.push('Nome já cadastrado');
      } else if (seenNamesInBatch.has(normName)) {
        errors.push('Nome duplicado na planilha');
      }

      if (!isValidBrazilianPhone(cleanPhone)) {
        errors.push('Telefone inválido (DDD + número)');
      } else if (existingPhones.has(cleanPhone)) {
        errors.push('WhatsApp já cadastrado');
      } else if (seenPhonesInBatch.has(cleanPhone)) {
        errors.push('WhatsApp repetido na planilha');
      }

      if (cleanName.length >= 2) seenNamesInBatch.add(normName);
      if (isValidBrazilianPhone(cleanPhone)) seenPhonesInBatch.add(cleanPhone);

      return {
        ...row,
        cleanPhone,
        isValid: errors.length === 0,
        errorText: errors.join(' • '),
      };
    });
  }, [csvPreviewRows, participants]);

  // Token individual ativo quando um familiar acessa seu link exclusivo
  const currentParticipantTokenDoc = useMemo(() => {
    if (!activeParticipantToken) return null;
    return (
      accessTokens.find(
        (t) => t.token?.toLowerCase() === activeParticipantToken.toLowerCase()
      ) || null
    );
  }, [accessTokens, activeParticipantToken]);

  // Documento do PRÓPRIO participante dono do link (para preencher "Dar Dica de Presente")
  const myOwnParticipantDoc = useMemo(() => {
    if (!currentParticipantTokenDoc) return null;
    return (
      participants.find(
        (p) => p.id === currentParticipantTokenDoc.participantId
      ) || null
    );
  }, [participants, currentParticipantTokenDoc]);

  // Preenche automaticamente o formulário de dicas com os dados atuais do participante
  useEffect(() => {
    if (myOwnParticipantDoc) {
      setMyWant(myOwnParticipantDoc.wantToGet || '');
      setMyDontWant(myOwnParticipantDoc.dontWantToGet || '');
      setMyShirt(myOwnParticipantDoc.shirtSize || '');
      setMyPants(myOwnParticipantDoc.pantsSize || '');
      setMyShoe(myOwnParticipantDoc.shoeSize || '');
      setMyNotes(
        myOwnParticipantDoc.observations || myOwnParticipantDoc.notes || ''
      );
    }
  }, [myOwnParticipantDoc?.id, myOwnParticipantDoc?.hintsUpdatedAt]);

  // Detecta rolagem na tela do participante para ocultar o indicador flutuante inferior
  useEffect(() => {
    if (!activeParticipantToken) return;
    setHasScrolledMobile(false);

    const handleScroll = () => {
      if (window.scrollY > 45) {
        setHasScrolledMobile(true);
      } else {
        setHasScrolledMobile(false);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [activeParticipantToken]);

  // Documento em TEMPO REAL da PESSOA SORTEADA (sempre que ela atualizar as dicas, reflete aqui na hora)
  const drawnPersonLatestData = useMemo(() => {
    if (!decryptedResult) return null;
    const found = participants.find(
      (p) => p.id === decryptedResult.receiverId
    );
    return found || decryptedResult;
  }, [decryptedResult, participants]);

  // Descriptografa AUTOMATICAMENTE o Amigo Secreto assim que o familiar abre o link exclusivo (Sem código!)
  useEffect(() => {
    let isMounted = true;
    const autoRevealFromLink = async () => {
      if (!currentParticipantTokenDoc || !firebaseUser) {
        setDecryptedResult(null);
        return;
      }

      setIsDecryptingLink(true);
      try {
        const secretData = await decryptSecretResult(
          currentParticipantTokenDoc.token,
          currentParticipantTokenDoc.encryptedPayload,
          currentParticipantTokenDoc.iv
        );

        if (!isMounted) return;
        setDecryptedResult(secretData);

        if (
          !isSimulatingParticipant &&
          !currentParticipantTokenDoc.hasAccessedResult
        ) {
          await updateDoc(
            doc(
              db,
              'artifacts',
              appId,
              'public',
              'data',
              'access_tokens',
              currentParticipantTokenDoc.id
            ),
            {
              hasAccessedResult: true,
              lastAccessedAt: new Date().toISOString(),
            }
          );
        }
      } catch (err) {
        console.error('Erro ao descriptografar link direto:', err);
      } finally {
        if (isMounted) setIsDecryptingLink(false);
      }
    };

    autoRevealFromLink();
    return () => {
      isMounted = false;
    };
  }, [currentParticipantTokenDoc?.id, firebaseUser, isSimulatingParticipant]);

  // Gera a URL exclusiva de um participante
  const buildParticipantLink = (token) => {
    const origin = window.location.origin;
    if (urlFormatPreference === 'query') {
      return `${origin}/?amigo-secreto=${token}`;
    }
    return `${origin}/amigo-secreto/${token}`;
  };

  // ============================================================================
  // 7. AUTENTICAÇÃO DO ADMINISTRADOR ÚNICO
  // ============================================================================

  const handleSetupInitialAdmin = async (e) => {
    e.preventDefault();
    if (!firebaseUser) return;

    const cleanUser = adminUserInput.trim();
    if (cleanUser.length < 3) {
      showToast(
        'O usuário do administrador deve ter pelo menos 3 caracteres.',
        'error'
      );
      return;
    }
    if (adminPassInput.length < 4) {
      showToast('A senha deve ter pelo menos 4 caracteres.', 'error');
      return;
    }
    if (adminPassInput !== adminConfirmPassInput) {
      showToast('A confirmação da senha não confere.', 'error');
      return;
    }

    setIsBusy(true);
    try {
      const salt = `adm_salt_${Date.now()}`;
      const passwordHash = await sha256Hash(adminPassInput, salt);

      await setDoc(
        doc(
          db,
          'artifacts',
          appId,
          'public',
          'data',
          'system_settings',
          'main_config'
        ),
        {
          adminUsername: cleanUser,
          adminNormalizedUser: normalizeText(cleanUser),
          adminSalt: salt,
          adminPasswordHash: passwordHash,
          eventName: 'Amigo Secreto da Família 2026',
          eventDate: '2026-12-24',
          suggestedValue: 'R$ 100,00 a R$ 150,00',
          drawStatus: 'waiting',
          drawTimestamp: null,
          urlFormatPreference: 'path',
          customWaTemplate: DEFAULT_WHATSAPP_TEMPLATE,
          createdAt: new Date().toISOString(),
        }
      );

      setIsAdminAuthenticated(true);
      setAdminPassInput('');
      setAdminConfirmPassInput('');
      showToast('Credencial administrativa criada com sucesso.');
    } catch (err) {
      console.error('Erro ao configurar admin:', err);
      showToast('Erro ao salvar credenciais do administrador.', 'error');
    } finally {
      setIsBusy(false);
    }
  };

  const handleAdminLogin = async (e) => {
    e.preventDefault();
    if (!systemConfig) return;

    setIsBusy(true);
    try {
      const normUser = normalizeText(adminUserInput);
      if (normUser !== systemConfig.adminNormalizedUser) {
        showToast('Usuário administrativo incorreto.', 'error');
        setIsBusy(false);
        return;
      }

      const testHash = await sha256Hash(
        adminPassInput,
        systemConfig.adminSalt
      );
      if (testHash !== systemConfig.adminPasswordHash) {
        showToast('Senha administrativa incorreta.', 'error');
        setIsBusy(false);
        return;
      }

      setIsAdminAuthenticated(true);
      setAdminPassInput('');
      showToast('Sessão administrativa iniciada.');
    } catch (err) {
      console.error('Erro no login admin:', err);
      showToast('Falha ao validar login.', 'error');
    } finally {
      setIsBusy(false);
    }
  };

  // ============================================================================
  // 8. GERENCIAMENTO SIMPLIFICADO DE PARTICIPANTES (APENAS NOME E WHATSAPP)
  // ============================================================================

  const openNewParticipantModal = () => {
    setEditingParticipantId(null);
    setFormName('');
    setFormPhone('');
    setParticipantModalOpen(true);
  };

  const openEditParticipantModal = (p) => {
    setEditingParticipantId(p.id);
    setFormName(p.fullName || '');
    setFormPhone(formatPhoneDisplay(p.phone || ''));
    setParticipantModalOpen(true);
  };

  const handleSaveParticipant = async (e) => {
    e.preventDefault();
    if (!firebaseUser) return;

    const cleanName = formName.trim();
    const cleanPhone = sanitizePhone(formPhone);

    if (cleanName.length < 2) {
      showToast('Informe o nome completo do participante.', 'error');
      return;
    }
    if (!isValidBrazilianPhone(cleanPhone)) {
      showToast(
        'Informe um número de WhatsApp válido com DDD (ex: 31999999999).',
        'error'
      );
      return;
    }

    const duplicatePhone = participants.find(
      (p) =>
        p.id !== editingParticipantId && sanitizePhone(p.phone) === cleanPhone
    );
    if (duplicatePhone) {
      showToast(
        `O WhatsApp informado já pertence a ${duplicatePhone.fullName}.`,
        'error'
      );
      return;
    }

    const duplicateName = participants.find(
      (p) =>
        p.id !== editingParticipantId &&
        normalizeText(p.fullName) === normalizeText(cleanName)
    );
    if (duplicateName) {
      showToast(
        `Já existe um participante cadastrado com o nome "${cleanName}".`,
        'error'
      );
      return;
    }

    setIsBusy(true);
    try {
      const partId =
        editingParticipantId ||
        `part_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

      const payload = {
        id: partId,
        fullName: cleanName,
        phone: cleanPhone,
        active: true,
        updatedAt: new Date().toISOString(),
      };

      await setDoc(
        doc(db, 'artifacts', appId, 'public', 'data', 'participants', partId),
        payload,
        { merge: true }
      );

      const linkedToken = accessTokens.find((t) => t.participantId === partId);
      if (linkedToken) {
        await updateDoc(
          doc(
            db,
            'artifacts',
            appId,
            'public',
            'data',
            'access_tokens',
            linkedToken.id
          ),
          {
            participantName: cleanName,
            participantPhone: cleanPhone,
          }
        );
      }

      setParticipantModalOpen(false);
      showToast(
        editingParticipantId
          ? `Registro de ${cleanName} atualizado.`
          : `${cleanName} adicionado(a) à lista.`
      );
    } catch (err) {
      console.error('Erro ao salvar participante:', err);
      showToast('Erro ao salvar participante.', 'error');
    } finally {
      setIsBusy(false);
    }
  };

  const handleDeleteParticipant = (part) => {
    if (drawStatus === 'drawn') {
      showToast(
        'Não é permitido remover participantes após o sorteio. Reinicie o sorteio caso necessário.',
        'error'
      );
      return;
    }

    setConfirmModal({
      title: `Remover ${part.fullName}?`,
      description: `Esta ação excluirá ${part.fullName} (${formatPhoneDisplay(
        part.phone
      )}) da relação de participantes antes do sorteio.`,
      confirmText: 'Confirmar Exclusão',
      danger: true,
      onConfirm: async () => {
        await deleteDoc(
          doc(
            db,
            'artifacts',
            appId,
            'public',
            'data',
            'participants',
            part.id
          )
        );
        setConfirmModal(null);
        showToast(`${part.fullName} foi removido(a).`);
      },
    });
  };

  const handleDownloadCsvTemplate = () => {
    const sampleCsv = [
      'nome,telefone',
      'Pedro Henrique,31999999999',
      'Maria Silva,31988888888',
      'João Santos,31977777777',
    ].join('\n');

    const blob = new Blob(['\uFEFF' + sampleCsv], {
      type: 'text/csv;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'modelo_amigo_secreto_familia.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCsvFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const content = evt.target?.result || '';
      setCsvRawText(content);
      const parsed = parseCsvText(content);
      setCsvPreviewRows(parsed);
    };
    reader.readAsText(file, 'UTF-8');
  };

  const handleUpdateCsvCell = (tempId, field, value) => {
    setCsvPreviewRows((prev) =>
      prev.map((row) =>
        row.tempId === tempId ? { ...row, [field]: value } : row
      )
    );
  };

  const handleRemoveCsvRow = (tempId) => {
    setCsvPreviewRows((prev) => prev.filter((row) => row.tempId !== tempId));
  };

  const handleConfirmCsvImport = async () => {
    const validRows = validatedCsvRows.filter((r) => r.isValid);
    if (validRows.length === 0) {
      showToast('Nenhum registro válido disponível para importação.', 'error');
      return;
    }

    setIsBusy(true);
    try {
      for (const row of validRows) {
        const partId = `part_${Date.now()}_${Math.random()
          .toString(36)
          .substring(2, 7)}`;
        await setDoc(
          doc(db, 'artifacts', appId, 'public', 'data', 'participants', partId),
          {
            id: partId,
            fullName: row.nome.trim(),
            phone: row.cleanPhone,
            wantToGet: '',
            dontWantToGet: '',
            shoeSize: '',
            shirtSize: '',
            pantsSize: '',
            observations: '',
            active: true,
            updatedAt: new Date().toISOString(),
          }
        );
      }

      setCsvModalOpen(false);
      setCsvPreviewRows([]);
      setCsvRawText('');
      showToast(`${validRows.length} participante(s) importado(s).`);
    } catch (err) {
      console.error('Erro na importação CSV:', err);
      showToast('Erro ao salvar participantes importados.', 'error');
    } finally {
      setIsBusy(false);
    }
  };

  // ============================================================================
  // 9. SISTEMA DE SORTEIO COM PRIVACIDADE TOTAL (ZERO-KNOWLEDGE)
  // ============================================================================

  const handleRequestDraw = () => {
    if (participants.length < 2) {
      showToast(
        'Cadastre pelo menos 2 participantes antes de realizar o sorteio.',
        'error'
      );
      return;
    }

    setConfirmModal({
      title: 'Executar Sorteio Oficial?',
      description: `O sorteio será processado envolvendo ${participants.length} participantes ativos. Cada familiar receberá um link direto exclusivo: ao abrir o link no WhatsApp, verá imediatamente quem tirou e poderá cadastrar suas próprias dicas de presente.`,
      confirmText: `Confirmar Sorteio (${participants.length} Pessoas)`,
      danger: false,
      onConfirm: executeZeroKnowledgeDraw,
    });
  };

  const executeZeroKnowledgeDraw = async () => {
    setConfirmModal(null);
    setIsBusy(true);
    try {
      for (const oldToken of accessTokens) {
        await deleteDoc(
          doc(
            db,
            'artifacts',
            appId,
            'public',
            'data',
            'access_tokens',
            oldToken.id
          )
        );
      }

      const pairs = createSecretSantaDerangement(participants);
      const usedTokens = new Set();
      const nowIso = new Date().toISOString();

      for (const { giver, receiver } of pairs) {
        let token = generateSecureToken();
        while (usedTokens.has(token)) {
          token = generateSecureToken();
        }
        usedTokens.add(token);

        const secretPayload = {
          receiverId: receiver.id,
          receiverName: receiver.fullName,
          drawnAt: nowIso,
        };

        const { encryptedHex, ivHex } = await encryptSecretResult(
          token,
          secretPayload
        );

        await setDoc(
          doc(
            db,
            'artifacts',
            appId,
            'public',
            'data',
            'access_tokens',
            token
          ),
          {
            id: token,
            token,
            participantId: giver.id,
            participantName: giver.fullName,
            participantPhone: giver.phone,
            encryptedPayload: encryptedHex,
            iv: ivHex,
            whatsappStatus: 'pending',
            whatsappSentAt: null,
            hasAccessedResult: false,
            createdAt: nowIso,
          }
        );
      }

      await setDoc(
        doc(
          db,
          'artifacts',
          appId,
          'public',
          'data',
          'system_settings',
          'main_config'
        ),
        {
          drawStatus: 'drawn',
          drawTimestamp: nowIso,
          participantsCountInDraw: participants.length,
        },
        { merge: true }
      );

      setAdminTab('whatsapp_dispatch');
      showToast(
        'Sorteio concluído. Links diretos prontos para distribuição via WhatsApp.'
      );
    } catch (err) {
      console.error('Erro ao realizar sorteio:', err);
      showToast(err.message || 'Erro ao executar o sorteio.', 'error');
    } finally {
      setIsBusy(false);
    }
  };

  const handleResetDraw = () => {
    setConfirmModal({
      title: 'Invalidar e Reiniciar Sorteio?',
      description:
        'Atenção: todos os links exclusivos gerados anteriormente serão invalidados. As dicas de presentes já preenchidas pelos participantes serão mantidas.',
      confirmText: 'Confirmar Reinicialização',
      danger: true,
      onConfirm: async () => {
        setConfirmModal(null);
        setIsBusy(true);
        try {
          for (const tk of accessTokens) {
            await deleteDoc(
              doc(
                db,
                'artifacts',
                appId,
                'public',
                'data',
                'access_tokens',
                tk.id
              )
            );
          }

          await setDoc(
            doc(
              db,
              'artifacts',
              appId,
              'public',
              'data',
              'system_settings',
              'main_config'
            ),
            {
              drawStatus: 'waiting',
              drawTimestamp: null,
            },
            { merge: true }
          );

          setAdminTab('dashboard');
          showToast('Sorteio reiniciado com sucesso.');
        } catch (err) {
          console.error('Erro ao reiniciar sorteio:', err);
          showToast('Erro ao cancelar sorteio.', 'error');
        } finally {
          setIsBusy(false);
        }
      },
    });
  };

  const handleClearAllGiftHints = () => {
    const filledParticipants = participants.filter((p) =>
      hasFilledGiftHints(p)
    );
    if (filledParticipants.length === 0) {
      showToast(
        'Nenhuma dica de presente foi preenchida pelos familiares ainda.',
        'error'
      );
      return;
    }

    setConfirmModal({
      title: 'Limpar Todas as Dicas de Presentes?',
      description: `Esta ação apagará todas as dicas de presentes, restrições, tamanhos e observações preenchidas por ${filledParticipants.length} familiar(es). Os participantes e o sorteio atual serão mantidos.`,
      confirmText: 'Limpar Todas as Dicas',
      danger: true,
      onConfirm: async () => {
        setConfirmModal(null);
        setIsBusy(true);
        try {
          for (const p of participants) {
            await setDoc(
              doc(
                db,
                'artifacts',
                appId,
                'public',
                'data',
                'participants',
                p.id
              ),
              {
                wantToGet: '',
                dontWantToGet: '',
                shoeSize: '',
                shirtSize: '',
                pantsSize: '',
                observations: '',
                notes: '',
                hintsUpdatedAt: null,
              },
              { merge: true }
            );
          }
          showToast(
            'Todas as dicas de presentes dos familiares foram limpas com sucesso.'
          );
        } catch (err) {
          console.error('Erro ao limpar dicas de presentes:', err);
          showToast('Erro ao limpar as dicas de presentes.', 'error');
        } finally {
          setIsBusy(false);
        }
      },
    });
  };

  // ============================================================================
  // 10. SALVAR DICAS DE PRESENTE PELO PRÓPRIO PARTICIPANTE (EM TEMPO REAL)
  // ============================================================================

  const handleOpenMyGiftHintsModal = () => {
    setMyWant(myOwnParticipantDoc?.wantToGet || '');
    setMyDontWant(myOwnParticipantDoc?.dontWantToGet || '');
    setMyShirt(myOwnParticipantDoc?.shirtSize || '');
    setMyPants(myOwnParticipantDoc?.pantsSize || '');
    setMyShoe(myOwnParticipantDoc?.shoeSize || '');
    setMyNotes(
      myOwnParticipantDoc?.observations || myOwnParticipantDoc?.notes || ''
    );
    setMyHintsModalOpen(true);
  };

  const scrollToFriendHints = () => {
    setHasScrolledMobile(true);
    friendHintsRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  };

  const openMyHintsTab = () => {
    setHasScrolledMobile(true);
    setFriendHintsModalOpen(false);
    setMyHintsModalOpen(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setTimeout(() => {
      myWantInputRef.current?.focus();
    }, 250);
  };

  const closeMyHintsTab = () => {
    setMyHintsModalOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const openFriendHintsTab = () => {
    setHasScrolledMobile(true);
    setMyHintsModalOpen(false);
    setFriendHintsModalOpen(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const closeFriendHintsTab = () => {
    setFriendHintsModalOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSaveMyGiftHints = async (e) => {
    e.preventDefault();
    if (!currentParticipantTokenDoc?.participantId) return;

    setSavingMyHints(true);
    try {
      await setDoc(
        doc(
          db,
          'artifacts',
          appId,
          'public',
          'data',
          'participants',
          currentParticipantTokenDoc.participantId
        ),
        {
          wantToGet: myWant.trim(),
          dontWantToGet: myDontWant.trim(),
          shirtSize: myShirt.trim(),
          pantsSize: myPants.trim(),
          shoeSize: myShoe.trim(),
          observations: myNotes.trim(),
          notes: myNotes.trim(),
          hintsUpdatedAt: new Date().toISOString(),
        },
        { merge: true }
      );

      setMyHintsModalOpen(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      showToast(
        'Suas dicas foram salvas e já estão visíveis para quem tirou você!'
      );
    } catch (err) {
      console.error('Erro ao salvar dicas:', err);
      showToast('Erro ao salvar suas dicas. Tente novamente.', 'error');
    } finally {
      setSavingMyHints(false);
    }
  };

  // ============================================================================
  // 11. MOTOR DE DISPARO 100% AUTOMÁTICO DE WHATSAPP (ULTRAMSG, Z-API, EVOLUTION)
  // ============================================================================

  const handleSaveGatewayConfig = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!firebaseUser) return;

    setIsBusy(true);
    try {
      await setDoc(
        doc(
          db,
          'artifacts',
          appId,
          'public',
          'data',
          'system_settings',
          'main_config'
        ),
        {
          eventName:
            eventTitleInput.trim() || 'Amigo Secreto da Família 2026',
          eventDate: eventDateInput,
          suggestedValue: eventValueInput.trim(),
          urlFormatPreference,
          waProvider,
          waInstanceUrl: waInstanceUrl.trim(),
          waInstanceId: waInstanceId.trim(),
          waApiToken: waApiToken.trim(),
          waClientToken: waClientToken.trim(),
          customWaTemplate:
            customWaTemplate.trim() || DEFAULT_WHATSAPP_TEMPLATE,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
      showToast('Configurações e mensagem do WhatsApp salvas com sucesso.');
    } catch (err) {
      console.error('Erro ao salvar configurações:', err);
      showToast('Erro ao salvar configurações.', 'error');
    } finally {
      setIsBusy(false);
    }
  };

  const sendSingleApiWhatsAppMessage = async (tokenDoc) => {
    const phoneWithCountry = formatPhoneForWhatsApp(tokenDoc.participantPhone);
    const link = buildParticipantLink(tokenDoc.token);
    const messageText = buildWhatsAppMessage(
      tokenDoc.participantName,
      eventName,
      link,
      customWaTemplate
    );

    if (waProvider === 'ultramsg') {
      const rawId = waInstanceId.trim();
      if (!rawId || !waApiToken.trim()) {
        throw new Error(
          'Preencha o Instance ID e o Token da UltraMsg antes de disparar.'
        );
      }
      const instancePath = rawId.startsWith('instance')
        ? rawId
        : `instance${rawId}`;
      const endpoint = `https://api.ultramsg.com/${instancePath}/messages/chat`;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: waApiToken.trim(),
          to: `+${phoneWithCountry}`,
          body: messageText,
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (
        !response.ok ||
        data.error ||
        (data.sent && String(data.sent) !== 'true')
      ) {
        throw new Error(
          `UltraMsg: ${JSON.stringify(
            data.error || data || response.statusText
          )}`
        );
      }
      return true;
    }

    if (waProvider === 'zapi') {
      const rawUrl = waInstanceUrl.trim();
      const endpoint =
        rawUrl && rawUrl.startsWith('http')
          ? rawUrl
          : `https://api.z-api.io/instances/${waInstanceId.trim()}/token/${waApiToken.trim()}/send-text`;

      const headers = { 'Content-Type': 'application/json' };
      if (waClientToken.trim()) {
        headers['Client-Token'] = waClientToken.trim();
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          phone: phoneWithCountry,
          message: messageText,
        }),
      });

      if (!response.ok) {
        const errBody = await response.text().catch(() => '');
        throw new Error(`Z-API HTTP ${response.status}: ${errBody}`);
      }
      return true;
    }

    if (waProvider === 'evolution') {
      const baseUrl = (waInstanceUrl.trim() || '').replace(/\/$/, '');
      if (!baseUrl || !waInstanceId.trim() || !waApiToken.trim()) {
        throw new Error(
          'Preencha a URL do servidor, Nome da Instância e API Key da Evolution API.'
        );
      }
      const endpoint = `${baseUrl}/message/sendText/${encodeURIComponent(
        waInstanceId.trim()
      )}`;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: waApiToken.trim(),
        },
        body: JSON.stringify({
          number: phoneWithCountry,
          text: messageText,
        }),
      });

      if (!response.ok) {
        const errBody = await response.text().catch(() => '');
        throw new Error(`Evolution HTTP ${response.status}: ${errBody}`);
      }
      return true;
    }

    if (waProvider === 'webhook') {
      const endpoint = waInstanceUrl.trim();
      if (!endpoint) {
        throw new Error('Informe a URL do Webhook para disparo.');
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: tokenDoc.participantName,
          phone: phoneWithCountry,
          link,
          message: messageText,
        }),
      });

      if (!response.ok) {
        throw new Error(`Webhook HTTP ${response.status}`);
      }
      return true;
    }

    // Modo assistido wa.me
    const waUrl = `https://wa.me/${phoneWithCountry}?text=${encodeURIComponent(
      messageText
    )}`;
    window.open(waUrl, '_blank', 'noopener,noreferrer');
    return true;
  };

  const handleStartAutomaticBatchDispatch = async (onlyPending = true) => {
    const queue = onlyPending
      ? accessTokens.filter((t) => t.whatsappStatus !== 'sent')
      : [...accessTokens];

    const targetList = queue.length > 0 ? queue : [...accessTokens];
    if (targetList.length === 0) {
      showToast('Nenhum participante disponível para disparo.', 'error');
      return;
    }

    abortDispatchRef.current = false;
    setIsAutoDispatching(true);
    setDispatchProgress({ current: 0, total: targetList.length });
    setDispatchLogs([
      `🚀 Iniciando disparo automático para ${targetList.length} familiar(es)...`,
    ]);

    for (let i = 0; i < targetList.length; i++) {
      if (abortDispatchRef.current) {
        setDispatchLogs((prev) => [
          '⏸️ Fila pausada pelo administrador.',
          ...prev,
        ]);
        break;
      }

      const tk = targetList[i];
      setDispatchProgress({ current: i + 1, total: targetList.length });
      setDispatchLogs((prev) => [
        `📤 [${i + 1}/${targetList.length}] Enviando para ${
          tk.participantName
        } (${formatPhoneDisplay(tk.participantPhone)})...`,
        ...prev,
      ]);

      try {
        await sendSingleApiWhatsAppMessage(tk);
        await updateDoc(
          doc(
            db,
            'artifacts',
            appId,
            'public',
            'data',
            'access_tokens',
            tk.id
          ),
          {
            whatsappStatus: 'sent',
            whatsappSentAt: new Date().toISOString(),
          }
        );
        setDispatchLogs((prev) => [
          `✅ Entregue com sucesso para ${tk.participantName}!`,
          ...prev,
        ]);
      } catch (err) {
        console.error('Erro no envio individual:', err);
        await updateDoc(
          doc(
            db,
            'artifacts',
            appId,
            'public',
            'data',
            'access_tokens',
            tk.id
          ),
          {
            whatsappStatus: 'error',
            lastError: err.message,
          }
        );
        setDispatchLogs((prev) => [
          `❌ Falha ao enviar para ${tk.participantName}: ${err.message}`,
          ...prev,
        ]);
      }

      if (i < targetList.length - 1 && !abortDispatchRef.current) {
        await new Promise((r) => setTimeout(r, waDelaySeconds * 1000));
      }
    }

    setIsAutoDispatching(false);
    showToast('Processamento da fila de WhatsApp finalizado.');
  };

  const handleSendDirectWhatsApp = async (tk, openWindow = true) => {
    const phoneWithCountry = formatPhoneForWhatsApp(tk.participantPhone);
    const link = buildParticipantLink(tk.token);
    const msg = buildWhatsAppMessage(
      tk.participantName,
      eventName,
      link,
      customWaTemplate
    );

    if (openWindow) {
      const waUrl = `https://wa.me/${phoneWithCountry}?text=${encodeURIComponent(
        msg
      )}`;
      window.open(waUrl, '_blank', 'noopener,noreferrer');
    }

    try {
      await updateDoc(
        doc(db, 'artifacts', appId, 'public', 'data', 'access_tokens', tk.id),
        {
          whatsappStatus: 'sent',
          whatsappSentAt: new Date().toISOString(),
        }
      );
      showToast(`Envio para ${tk.participantName} registrado.`);
    } catch (err) {
      console.error('Erro ao atualizar status WhatsApp:', err);
    }
  };

  const handleLoadDemoParticipants = async () => {
    if (!firebaseUser) return;
    setIsBusy(true);
    try {
      const samples = [
        { fullName: 'Pedro Henrique', phone: '31999991111' },
        { fullName: 'Maria Clara Silva', phone: '31999992222' },
        { fullName: 'João Vitor Santos', phone: '31999993333' },
        { fullName: 'Vovó Helena', phone: '31999994444' },
      ];

      for (const item of samples) {
        const partId = `part_${Date.now()}_${Math.random()
          .toString(36)
          .substring(2, 6)}`;
        await setDoc(
          doc(db, 'artifacts', appId, 'public', 'data', 'participants', partId),
          {
            id: partId,
            fullName: item.fullName,
            phone: item.phone,
            active: true,
            updatedAt: new Date().toISOString(),
          }
        );
      }
      showToast('4 participantes de exemplo adicionados.');
    } catch (err) {
      console.error('Erro ao carregar exemplos:', err);
    } finally {
      setIsBusy(false);
    }
  };

  // ============================================================================
  // 12. DEFINIÇÕES TIPOGRÁFICAS EDITORIAIS E TELA DE CARREGAMENTO
  // ============================================================================

  const fontSansStyle = {
    fontFamily:
      "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif",
  };

  const fontSerifStyle = {
    fontFamily: "'Cormorant Garamond', Georgia, serif",
  };

  if (loadingFirebase) {
    return (
      <div
        style={fontSansStyle}
        className="min-h-screen bg-[#FAF8F5] text-[#181816] flex items-center justify-center p-6"
      >
        <div className="border border-[#DCD6CD] bg-[#F3EFEA] px-8 py-6 text-center space-y-2">
          <div className="w-8 h-[1px] bg-[#8C6D53] mx-auto animate-pulse" />
          <p className="text-xs uppercase tracking-[0.22em] text-[#5C5852]">
            Carregando Amigo Secreto...
          </p>
        </div>
      </div>
    );
  }

  // ============================================================================
  // 13. AMBIENTE 2: PÁGINA EXCLUSIVA DO PARTICIPANTE (MOBILE-FIRST & ULTRA CLEAN)
  // ============================================================================

  if (activeParticipantToken) {
    const drawnName =
      drawnPersonLatestData?.fullName || decryptedResult?.receiverName || '...';
    const drawnFirstName = String(drawnName).trim().split(' ')[0] || 'Amigo';
    const myFirstName =
      String(currentParticipantTokenDoc?.participantName || '')
        .trim()
        .split(' ')[0] || 'Familiar';
    const drawnHasHints = hasFilledGiftHints(drawnPersonLatestData);
    const iHaveFilledMyHints = hasFilledGiftHints(myOwnParticipantDoc);
    const drawnNotes =
      drawnPersonLatestData?.observations ||
      drawnPersonLatestData?.notes ||
      '';

    return (
      <div
        style={fontSansStyle}
        className="min-h-screen bg-[#FAF8F5] text-[#181816] flex flex-col selection:bg-[#2C4035] selection:text-[#FAF8F5] pb-16"
      >
        {/* Notificação Toast Editorial */}
        {toast && (
          <div className="fixed top-4 inset-x-4 sm:left-auto sm:right-6 z-50 max-w-sm mx-auto">
            <div
              className={`flex items-center gap-3 px-4 py-3.5 border shadow-lg ${
                toast.type === 'error'
                  ? 'bg-[#8E3B36] text-[#FAF8F5] border-[#181816]'
                  : 'bg-[#181816] text-[#FAF8F5] border-[#2C4035]'
              }`}
            >
              <span className="w-2 h-2 bg-[#8C6D53] shrink-0" />
              <p className="text-xs sm:text-sm font-medium">{toast.message}</p>
            </div>
          </div>
        )}

        {/* Faixa superior apenas quando o Administrador testa o link */}
        {isSimulatingParticipant && (
          <div className="border-b border-[#DCD6CD] bg-[#F3EFEA] px-4 py-2.5">
            <div className="max-w-md sm:max-w-lg mx-auto flex items-center justify-between gap-2 text-xs">
              <span className="text-[#5C5852] truncate">
                Modo Teste:{' '}
                <strong className="text-[#181816]">
                  {currentParticipantTokenDoc?.participantName}
                </strong>
              </span>
              <button
                type="button"
                onClick={() => {
                  setActiveParticipantToken(null);
                  setIsSimulatingParticipant(false);
                  setDecryptedResult(null);
                }}
                className="px-3 py-1 border border-[#181816] bg-[#181816] text-[#FAF8F5] uppercase tracking-wider text-[10px] font-semibold shrink-0 cursor-pointer"
              >
                ← Painel
              </button>
            </div>
          </div>
        )}

        {/* Topo Compacto Mobile-First */}
        <header className="border-b border-[#DCD6CD] bg-[#FAF8F5] px-4 py-3.5">
          <div className="max-w-md sm:max-w-lg mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <ArchitecturalLogoMark className="w-6 h-6 text-[#181816]" />
              <span
                style={fontSerifStyle}
                className="text-lg font-semibold text-[#181816] tracking-tight"
              >
                {eventName}
              </span>
            </div>

            {currentParticipantTokenDoc && (
              <span className="text-xs font-medium text-[#5C5852]">
                Olá, <strong className="text-[#181816]">{myFirstName}</strong>
              </span>
            )}
          </div>
        </header>

        {/* Container Centralizado na Proporção de Celular */}
        <main className="flex-1 w-full max-w-md sm:max-w-lg mx-auto px-4 pt-5 pb-10 space-y-5">
          {!currentParticipantTokenDoc ? (
            <div className="border border-[#DCD6CD] bg-[#F3EFEA]/60 p-8 text-center space-y-3 mt-6">
              <h2
                style={fontSerifStyle}
                className="text-2xl font-semibold text-[#181816]"
              >
                Link não encontrado
              </h2>
              <p className="text-sm text-[#5C5852] leading-relaxed">
                Confira a última mensagem enviada no seu WhatsApp pelo
                organizador da família.
              </p>
            </div>
          ) : isDecryptingLink ? (
            <div className="border border-[#DCD6CD] bg-[#FAF8F5] p-10 text-center space-y-4 mt-6">
              <div className="w-8 h-[1px] bg-[#8C6D53] mx-auto animate-pulse" />
              <h2
                style={fontSerifStyle}
                className="text-2xl font-semibold text-[#181816]"
              >
                Abrindo seu sorteio...
              </h2>
            </div>
          ) : myHintsModalOpen ? (
            /* ABA SEPARADA: DAR MINHAS DICAS DE PRESENTE */
            <section
              ref={myHintsSectionRef}
              id="minhas-dicas"
              className="border border-[#181816] bg-[#F3EFEA] p-5 sm:p-6 space-y-5"
            >
              <div className="flex items-center justify-between pb-3 border-b border-[#DCD6CD]">
                <button
                  type="button"
                  onClick={closeMyHintsTab}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-[#181816] bg-[#FAF8F5] text-xs font-semibold text-[#181816] hover:bg-[#181816] hover:text-[#FAF8F5] transition cursor-pointer"
                >
                  <span>← Voltar ao Amigo Secreto</span>
                </button>

                {iHaveFilledMyHints && (
                  <span className="px-2.5 py-1 bg-[#2C4035] text-[#FAF8F5] text-[10px] uppercase tracking-wider font-semibold">
                    ✓ Já preenchido
                  </span>
                )}
              </div>

              <div>
                <h2
                  style={fontSerifStyle}
                  className="text-2xl sm:text-3xl font-semibold text-[#181816]"
                >
                  Minhas Dicas de Presente
                </h2>
                <p className="text-xs text-[#5C5852] mt-1 leading-relaxed">
                  Preencha o que você gostaria de ganhar e seus tamanhos. Essas
                  informações aparecerão automaticamente para a pessoa que tirou
                  você.
                </p>
              </div>

              <form onSubmit={handleSaveMyGiftHints} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-[#2C4035] mb-1">
                    O que você gostaria de ganhar?
                  </label>
                  <textarea
                    ref={myWantInputRef}
                    rows={3}
                    value={myWant}
                    onChange={(e) => setMyWant(e.target.value)}
                    placeholder="Ex: Perfume, livro, camisa, bolsa, chocolates..."
                    className="w-full px-3.5 py-2.5 bg-[#FAF8F5] border border-[#DCD6CD] focus:border-[#181816] text-sm text-[#181816] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#8E3B36] mb-1">
                    O que você não gostaria de ganhar? (Opcional)
                  </label>
                  <input
                    type="text"
                    value={myDontWant}
                    onChange={(e) => setMyDontWant(e.target.value)}
                    placeholder="Ex: Perfumes doces, roupas escuras..."
                    className="w-full px-3.5 py-2.5 bg-[#FAF8F5] border border-[#DCD6CD] focus:border-[#181816] text-sm text-[#181816] outline-none"
                  />
                </div>

                <div className="grid grid-cols-3 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-semibold text-[#5C5852] mb-1">
                      Camisa/Blusa
                    </label>
                    <input
                      type="text"
                      value={myShirt}
                      onChange={(e) => setMyShirt(e.target.value)}
                      placeholder="P, M, G"
                      className="w-full px-3 py-2.5 bg-[#FAF8F5] border border-[#DCD6CD] focus:border-[#181816] text-sm font-semibold text-center outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-[#5C5852] mb-1">
                      Calça
                    </label>
                    <input
                      type="text"
                      value={myPants}
                      onChange={(e) => setMyPants(e.target.value)}
                      placeholder="38, 42"
                      className="w-full px-3 py-2.5 bg-[#FAF8F5] border border-[#DCD6CD] focus:border-[#181816] text-sm font-semibold text-center outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-[#5C5852] mb-1">
                      Calçado
                    </label>
                    <input
                      type="text"
                      value={myShoe}
                      onChange={(e) => setMyShoe(e.target.value)}
                      placeholder="37, 40"
                      className="w-full px-3 py-2.5 bg-[#FAF8F5] border border-[#DCD6CD] focus:border-[#181816] text-sm font-semibold text-center outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#5C5852] mb-1">
                    Observações ou cores preferidas (Opcional)
                  </label>
                  <input
                    type="text"
                    value={myNotes}
                    onChange={(e) => setMyNotes(e.target.value)}
                    placeholder="Ex: Tons neutros, dourado, romance..."
                    className="w-full px-3.5 py-2.5 bg-[#FAF8F5] border border-[#DCD6CD] focus:border-[#181816] text-sm text-[#181816] outline-none"
                  />
                </div>

                <div className="pt-2 space-y-2.5">
                  <button
                    type="submit"
                    disabled={savingMyHints}
                    className="w-full py-4 px-5 bg-[#2C4035] hover:bg-[#181816] text-[#FAF8F5] border border-[#181816] uppercase tracking-[0.15em] text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer"
                  >
                    <Gift className="w-4 h-4 text-[#8C6D53]" />
                    <span>
                      {savingMyHints
                        ? 'SALVANDO SUAS DICAS...'
                        : 'SALVAR MINHAS DICAS DE PRESENTE'}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={closeMyHintsTab}
                    className="w-full py-3 px-4 border border-[#DCD6CD] bg-[#FAF8F5] text-xs font-semibold text-[#5C5852] hover:text-[#181816] transition cursor-pointer"
                  >
                    Cancelar e voltar
                  </button>
                </div>
              </form>
            </section>
          ) : friendHintsModalOpen ? (
            /* ABA SEPARADA: DICAS DE PRESENTE DO AMIGO SECRETO */
            <section
              ref={friendHintsRef}
              id="dicas-amigo"
              className="border border-[#181816] bg-[#FAF8F5] p-5 sm:p-6 space-y-5"
            >
              <div className="pb-3 border-b border-[#DCD6CD] flex items-center justify-between gap-2">
                <h2
                  style={fontSerifStyle}
                  className="text-2xl sm:text-3xl font-semibold text-[#181816]"
                >
                  Dicas de presente de{' '}
                  {isSimulatingParticipant ? 'seu sorteado' : drawnName}
                </h2>

                {!isSimulatingParticipant && !drawnHasHints && (
                  <span className="px-2 py-0.5 bg-[#F3EFEA] border border-[#DCD6CD] text-[10px] uppercase tracking-wider text-[#8C6D53] font-semibold shrink-0">
                    Aguardando dicas
                  </span>
                )}
              </div>

              {isSimulatingParticipant ? (
                <p className="text-sm text-[#5C5852] py-2">
                  Oculto no modo de teste administrativo.
                </p>
              ) : (
                <div className="space-y-3.5">
                  {/* Gostaria de ganhar (Sempre exibido) */}
                  <div className="p-4 bg-[#F3EFEA] border-l-2 border-[#2C4035] space-y-1">
                    <span className="text-[11px] uppercase tracking-[0.15em] text-[#2C4035] font-bold block">
                      O que gostaria de ganhar
                    </span>
                    <p
                      className={`text-base sm:text-lg leading-snug ${
                        drawnPersonLatestData?.wantToGet?.trim()
                          ? 'font-semibold text-[#181816]'
                          : 'text-sm italic text-[#5C5852]'
                      }`}
                    >
                      {drawnPersonLatestData?.wantToGet?.trim() ||
                        'Ainda não informado pelo seu amigo secreto'}
                    </p>
                  </div>

                  {/* O que não gostaria de ganhar (Exibido somente quando preenchido) */}
                  {Boolean(drawnPersonLatestData?.dontWantToGet?.trim()) && (
                    <div className="p-3.5 bg-[#FAF8F5] border border-[#DCD6CD] border-l-2 border-l-[#8E3B36] space-y-0.5">
                      <span className="text-[11px] uppercase tracking-[0.15em] text-[#8E3B36] font-bold block">
                        O que não gostaria de ganhar
                      </span>
                      <p className="text-sm font-medium text-[#181816]">
                        {drawnPersonLatestData.dontWantToGet.trim()}
                      </p>
                    </div>
                  )}

                  {/* Tamanhos em grade (Exibido somente quando pelo menos um tamanho for preenchido) */}
                  {Boolean(
                    drawnPersonLatestData?.shirtSize?.trim() ||
                      drawnPersonLatestData?.pantsSize?.trim() ||
                      drawnPersonLatestData?.shoeSize?.trim()
                  ) && (
                    <div className="grid grid-cols-3 border border-[#DCD6CD] divide-x divide-[#DCD6CD] bg-[#FAF8F5]">
                      <div className="p-3 text-center">
                        <span className="text-[10px] uppercase tracking-wider text-[#5C5852] block">
                          Camisa/Blusa
                        </span>
                        <strong
                          style={fontSerifStyle}
                          className="text-xl font-bold text-[#181816] block mt-0.5"
                        >
                          {drawnPersonLatestData?.shirtSize?.trim() || '—'}
                        </strong>
                      </div>
                      <div className="p-3 text-center">
                        <span className="text-[10px] uppercase tracking-wider text-[#5C5852] block">
                          Calça
                        </span>
                        <strong
                          style={fontSerifStyle}
                          className="text-xl font-bold text-[#181816] block mt-0.5"
                        >
                          {drawnPersonLatestData?.pantsSize?.trim() || '—'}
                        </strong>
                      </div>
                      <div className="p-3 text-center">
                        <span className="text-[10px] uppercase tracking-wider text-[#5C5852] block">
                          Calçado
                        </span>
                        <strong
                          style={fontSerifStyle}
                          className="text-xl font-bold text-[#181816] block mt-0.5"
                        >
                          {drawnPersonLatestData?.shoeSize?.trim() || '—'}
                        </strong>
                      </div>
                    </div>
                  )}

                  {/* Observações adicionais (Exibido somente quando preenchido) */}
                  {Boolean(drawnNotes?.trim()) && (
                    <div className="p-3.5 bg-[#F3EFEA]/50 border border-[#DCD6CD] space-y-0.5">
                      <span className="text-[10px] uppercase tracking-[0.15em] text-[#8C6D53] font-bold block">
                        Observações adicionais
                      </span>
                      <p className="text-sm text-[#181816]">
                        {drawnNotes.trim()}
                      </p>
                    </div>
                  )}
                </div>
              )}

              <div className="pt-2 border-t border-[#DCD6CD]">
                <button
                  type="button"
                  onClick={closeFriendHintsTab}
                  className="w-full py-4 px-4 bg-[#181816] hover:bg-[#2C4035] text-[#FAF8F5] text-xs uppercase tracking-[0.16em] font-bold flex items-center justify-center gap-2 transition cursor-pointer"
                >
                  <span>← VOLTAR PARA A TELA INICIAL</span>
                </button>
              </div>
            </section>
          ) : (
            <>
              {/* 1. CARTÃO PRINCIPAL: QUEM VOCÊ TIROU */}
              <section className="border border-[#181816] bg-[#FAF8F5] p-5 sm:p-6 space-y-3.5">
                <p className="text-[11px] sm:text-xs uppercase tracking-[0.18em] text-[#8C6D53] font-bold text-center leading-relaxed">
                  NESTE NATAL, A PESSOA QUE VOCÊ TIROU NO AMIGO SECRETO É:
                </p>

                {/* CAIXA ÚNICA: NOME DO AMIGO SECRETO + BOTÃO DE VER DICA SEPARADO POR UMA LINHA */}
                <div className="border border-[#DCD6CD] bg-[#F3EFEA]">
                  <div className="px-4 py-6 text-center">
                    <div
                      style={fontSerifStyle}
                      className="text-4xl sm:text-5xl font-bold text-[#2C4035] tracking-tight break-words leading-tight"
                    >
                      {isSimulatingParticipant
                        ? '[ Nome Oculto no Teste ]'
                        : drawnName}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={openFriendHintsTab}
                    className="w-full py-3.5 px-4 border-t border-[#DCD6CD] bg-[#F3EFEA] hover:bg-[#EBE5DC]/70 text-[#181816] text-xs uppercase tracking-[0.14em] font-bold text-center flex items-center justify-center transition cursor-pointer"
                  >
                    <span>VER A DICA DE PRESENTE DO SEU AMIGO</span>
                  </button>
                </div>

                {/* BOTÃO DE AÇÃO: ABRIR ABA DE DAR DICAS */}
                <button
                  type="button"
                  onClick={openMyHintsTab}
                  className="w-full py-4 px-4 bg-[#2C4035] hover:bg-[#181816] text-[#FAF8F5] text-xs uppercase tracking-[0.14em] font-bold flex items-center justify-between transition cursor-pointer"
                >
                  <span>
                    {iHaveFilledMyHints
                      ? 'MINHAS DICAS DE PRESENTE'
                      : 'MINHAS DICAS DE PRESENTE'}
                  </span>
                  <ArrowRight className="w-4 h-4 text-[#8C6D53] shrink-0" />
                </button>
              </section>

              {/* 2. ILUSTRAÇÃO DA ÁRVORE DE NATAL MINIMALISTA CENTRALIZADA */}
              <div className="pt-3 pb-2 flex justify-center">
                <div className="w-full max-w-[250px] sm:max-w-[280px] mx-auto">
                  <MinimalBotanicalFrameSVG className="w-full h-auto" />
                </div>
              </div>
            </>
          )}
        </main>
      </div>
    );
  }

  // ============================================================================
  // 14. AMBIENTE 1 (PARTE A): LOGIN EDITORIAL DO ADMINISTRADOR ÚNICO
  // ============================================================================

  if (!isAdminAuthenticated) {
    const isFirstTimeSetup = !systemConfig || !systemConfig.adminPasswordHash;

    return (
      <div
        style={fontSansStyle}
        className="min-h-screen bg-[#FAF8F5] text-[#181816] flex flex-col justify-between selection:bg-[#2C4035] selection:text-[#FAF8F5]"
      >
        {toast && (
          <div className="fixed top-6 right-6 z-50 max-w-md">
            <div
              className={`flex items-center gap-3 px-6 py-4 border ${
                toast.type === 'error'
                  ? 'bg-[#8E3B36] text-[#FAF8F5] border-[#181816]'
                  : 'bg-[#181816] text-[#FAF8F5] border-[#2C4035]'
              }`}
            >
              <span className="w-2 h-2 bg-[#8C6D53] shrink-0" />
              <p className="text-sm font-medium">{toast.message}</p>
            </div>
          </div>
        )}

        {/* Header Editorial Minimalista */}
        <header className="border-b border-[#DCD6CD] px-6 sm:px-12 py-6">
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ArchitecturalLogoMark className="w-7 h-7 text-[#181816]" />
              <span className="text-xs uppercase tracking-[0.25em] font-semibold text-[#181816]">
                {eventName}
              </span>
            </div>
            <span className="text-[11px] uppercase tracking-[0.25em] text-[#8C6D53] font-semibold">
              Curadoria Familiar • 2026
            </span>
          </div>
        </header>

        {/* Composição Assimétrica Estilo Swiss / Interior Design Reference */}
        <main className="flex-1 max-w-6xl w-full mx-auto px-6 sm:px-12 py-12 sm:py-20 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Coluna Esquerda: Título Editorial + Formulário */}
          <div className="lg:col-span-6 space-y-8">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <span className="w-8 h-[1px] bg-[#181816]" />
                <span className="text-xs uppercase tracking-[0.25em] text-[#8E3B36] font-semibold">
                  01. Administração Centralizada
                </span>
              </div>
              <h1
                style={fontSerifStyle}
                className="text-4xl sm:text-6xl font-semibold tracking-tight text-[#181816] leading-[1.05]"
              >
                Amigo Secreto Familiar.
              </h1>
              <p className="text-sm text-[#5C5852] leading-relaxed max-w-md">
                {isFirstTimeSetup
                  ? 'Configure a credencial do Administrador Único para gerenciar a lista de familiares, executar o sorteio e disparar os convites diretos no WhatsApp.'
                  : 'Acesse o painel do organizador para gerenciar os participantes, realizar o sorteio com sigilo criptográfico e disparar os links individuais.'}
              </p>
            </div>

            <form
              onSubmit={
                isFirstTimeSetup ? handleSetupInitialAdmin : handleAdminLogin
              }
              className="border border-[#DCD6CD] bg-[#F3EFEA]/60 p-6 sm:p-8 space-y-5 max-w-md"
            >
              <div>
                <label className="block text-[11px] uppercase tracking-[0.2em] font-semibold text-[#181816] mb-2">
                  Usuário Administrativo
                </label>
                <input
                  type="text"
                  required
                  value={adminUserInput}
                  onChange={(e) => setAdminUserInput(e.target.value)}
                  placeholder="Ex: admin"
                  className="w-full px-4 py-3 bg-[#FAF8F5] border border-[#DCD6CD] focus:border-[#181816] outline-none text-sm"
                />
              </div>

              <div>
                <label className="block text-[11px] uppercase tracking-[0.2em] font-semibold text-[#181816] mb-2">
                  Senha de Acesso
                </label>
                <div className="relative">
                  <input
                    type={showAdminPass ? 'text' : 'password'}
                    required
                    value={adminPassInput}
                    onChange={(e) => setAdminPassInput(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-4 py-3 bg-[#FAF8F5] border border-[#DCD6CD] focus:border-[#181816] outline-none text-sm pr-11"
                  />
                  <button
                    type="button"
                    onClick={() => setShowAdminPass(!showAdminPass)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#5C5852] hover:text-[#181816]"
                  >
                    {showAdminPass ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {isFirstTimeSetup && (
                <div>
                  <label className="block text-[11px] uppercase tracking-[0.2em] font-semibold text-[#181816] mb-2">
                    Confirmar Senha
                  </label>
                  <input
                    type="password"
                    required
                    value={adminConfirmPassInput}
                    onChange={(e) => setAdminConfirmPassInput(e.target.value)}
                    placeholder="Repita a senha"
                    className="w-full px-4 py-3 bg-[#FAF8F5] border border-[#DCD6CD] focus:border-[#181816] outline-none text-sm"
                  />
                </div>
              )}

              <button
                type="submit"
                disabled={isBusy}
                className="w-full py-4 px-6 bg-[#181816] hover:bg-[#2C4035] text-[#FAF8F5] text-xs uppercase tracking-[0.22em] font-semibold flex items-center justify-between transition cursor-pointer"
              >
                <span>
                  {isBusy
                    ? 'Autenticando...'
                    : isFirstTimeSetup
                    ? 'Criar Credencial Admin'
                    : 'Acessar Painel'}
                </span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          </div>

          {/* Coluna Direita: Moldura Geométrica Arquitetônica Natalina */}
          <div className="lg:col-span-6 flex flex-col items-center justify-center">
            <div className="w-full max-w-md">
              <MinimalBotanicalFrameSVG className="w-full h-auto" />
              <div className="mt-4 flex items-center justify-between text-[11px] uppercase tracking-[0.2em] text-[#5C5852] px-2">
                <span>01 / Experiência Sem Senhas</span>
                <span>Acesso Direto via WhatsApp</span>
              </div>
            </div>
          </div>
        </main>

        <footer className="border-t border-[#DCD6CD] px-6 sm:px-12 py-5 text-xs text-[#5C5852] flex flex-wrap items-center justify-between gap-4 max-w-6xl w-full mx-auto">
          <span>01. Privacidade Zero-Knowledge</span>
          <span>02. Dicas em Tempo Real</span>
          <span>03. Disparo Automático UltraMsg</span>
        </footer>
      </div>
    );
  }

  // ============================================================================
  // 15. AMBIENTE 1 (PARTE B): PAINEL ADMINISTRATIVO SWISS DESIGN
  // ============================================================================

  const sentCount = accessTokens.filter(
    (t) => t.whatsappStatus === 'sent'
  ).length;
  const accessedCount = accessTokens.filter((t) => t.hasAccessedResult).length;
  const hintsFilledCount = participants.filter((p) =>
    hasFilledGiftHints(p)
  ).length;

  return (
    <div
      style={fontSansStyle}
      className="min-h-screen bg-[#FAF8F5] text-[#181816] flex flex-col selection:bg-[#2C4035] selection:text-[#FAF8F5]"
    >
      {/* Toast Editorial */}
      {toast && (
        <div className="fixed top-6 right-6 z-50 max-w-md">
          <div
            className={`flex items-center gap-3 px-6 py-4 border ${
              toast.type === 'error'
                ? 'bg-[#8E3B36] text-[#FAF8F5] border-[#181816]'
                : 'bg-[#181816] text-[#FAF8F5] border-[#2C4035]'
            }`}
          >
            <span className="w-2 h-2 bg-[#8C6D53] shrink-0" />
            <p className="text-sm font-medium">{toast.message}</p>
          </div>
        </div>
      )}

      {/* Navegação Superior Discreta e Geométrica */}
      <header className="border-b border-[#DCD6CD] bg-[#FAF8F5] sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-6 sm:px-10 py-5 flex flex-wrap items-center justify-between gap-6">
          <div className="flex items-center gap-3.5">
            <ArchitecturalLogoMark className="w-7 h-7 text-[#181816]" />
            <div>
              <span className="block text-[10px] uppercase tracking-[0.25em] text-[#8C6D53] font-semibold">
                Painel do Organizador
              </span>
              <h1
                style={fontSerifStyle}
                className="text-xl sm:text-2xl font-semibold text-[#181816] leading-none"
              >
                {eventName}
              </h1>
            </div>
          </div>

          <nav className="flex flex-wrap items-center gap-6 sm:gap-8 text-xs uppercase tracking-[0.2em]">
            <button
              type="button"
              onClick={() => setAdminTab('dashboard')}
              className={`pb-1 transition cursor-pointer ${
                adminTab === 'dashboard'
                  ? 'text-[#181816] font-bold border-b-2 border-[#8E3B36]'
                  : 'text-[#5C5852] hover:text-[#181816]'
              }`}
            >
              01. Participantes ({participants.length})
            </button>

            <button
              type="button"
              onClick={() => setAdminTab('whatsapp_dispatch')}
              className={`pb-1 transition cursor-pointer ${
                adminTab === 'whatsapp_dispatch'
                  ? 'text-[#181816] font-bold border-b-2 border-[#2C4035]'
                  : 'text-[#5C5852] hover:text-[#181816]'
              }`}
            >
              02. WhatsApp & Links ({sentCount}/{accessTokens.length})
            </button>

            <button
              type="button"
              onClick={() => setAdminTab('settings')}
              className={`pb-1 transition cursor-pointer ${
                adminTab === 'settings'
                  ? 'text-[#181816] font-bold border-b-2 border-[#8C6D53]'
                  : 'text-[#5C5852] hover:text-[#181816]'
              }`}
            >
              03. Evento
            </button>

            <button
              type="button"
              onClick={() => setIsAdminAuthenticated(false)}
              className="px-3.5 py-2 border border-[#DCD6CD] hover:border-[#181816] text-[11px] uppercase tracking-[0.2em] text-[#5C5852] hover:text-[#181816] transition cursor-pointer"
            >
              Sair
            </button>
          </nav>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-6 sm:px-10 py-10 space-y-12">
        {/* BLOCO ARQUITETÔNICO DE MÉTRICAS E AÇÃO DE SORTEIO */}
        <section className="grid grid-cols-1 lg:grid-cols-12 border border-[#DCD6CD] bg-[#FAF8F5] divide-y lg:divide-y-0 lg:divide-x divide-[#DCD6CD]">
          <div className="lg:col-span-3 p-6 sm:p-8 flex flex-col justify-between">
            <span className="text-[11px] uppercase tracking-[0.22em] text-[#8C6D53] font-semibold">
              01 / Cadastrados
            </span>
            <div
              style={fontSerifStyle}
              className="text-5xl font-semibold text-[#181816] my-3"
            >
              {String(participants.length).padStart(2, '0')}
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-[#5C5852]">
                {hintsFilledCount} com dicas de presente salvas
              </span>
              {hintsFilledCount > 0 && (
                <button
                  type="button"
                  onClick={handleClearAllGiftHints}
                  className="text-[10px] uppercase tracking-wider font-semibold text-[#8E3B36] hover:underline cursor-pointer shrink-0"
                >
                  Limpar dicas
                </button>
              )}
            </div>
          </div>

          <div className="lg:col-span-3 p-6 sm:p-8 flex flex-col justify-between">
            <span className="text-[11px] uppercase tracking-[0.22em] text-[#8C6D53] font-semibold">
              02 / Status do Sorteio
            </span>
            <div className="my-3">
              {drawStatus === 'drawn' ? (
                <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#2C4035] text-[#FAF8F5] text-xs uppercase tracking-[0.18em] font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Sorteio Realizado
                </span>
              ) : (
                <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#F3EFEA] border border-[#8C6D53] text-[#8C6D53] text-xs uppercase tracking-[0.18em] font-semibold">
                  <Clock className="w-3.5 h-3.5" />
                  Aguardando Sorteio
                </span>
              )}
            </div>
            <span className="text-xs text-[#5C5852]">
              {drawStatus === 'drawn'
                ? `${accessedCount} de ${accessTokens.length} já abriram o link`
                : 'Mínimo de 2 participantes'}
            </span>
          </div>

          <div className="lg:col-span-2 p-6 sm:p-8 flex flex-col justify-between">
            <span className="text-[11px] uppercase tracking-[0.22em] text-[#8C6D53] font-semibold">
              03 / WhatsApp
            </span>
            <div
              style={fontSerifStyle}
              className="text-4xl font-semibold text-[#2C4035] my-3"
            >
              {sentCount}/{accessTokens.length || participants.length}
            </div>
            <span className="text-xs text-[#5C5852]">
              Links diretos enviados
            </span>
          </div>

          <div className="lg:col-span-4 p-6 sm:p-8 bg-[#F3EFEA] flex flex-col justify-between space-y-4">
            <div>
              <span className="text-[10px] uppercase tracking-[0.25em] text-[#8E3B36] font-bold">
                Sigilo Total • Sem Senhas
              </span>
              <h3
                style={fontSerifStyle}
                className="text-2xl font-semibold text-[#181816] mt-1"
              >
                {drawStatus === 'drawn'
                  ? 'Links exclusivos gerados'
                  : 'Executar sorteio da família'}
              </h3>
              <p className="text-xs text-[#5C5852] mt-1 leading-relaxed">
                {drawStatus === 'drawn'
                  ? 'Os pares estão criptografados. Distribua os links pelo WhatsApp.'
                  : 'Gera um link único para cada familiar ver quem tirou e dar suas dicas.'}
              </p>
            </div>

            {drawStatus !== 'drawn' ? (
              <button
                type="button"
                disabled={isBusy || participants.length < 2}
                onClick={handleRequestDraw}
                className="w-full py-4 px-5 bg-[#2C4035] hover:bg-[#181816] disabled:bg-[#DCD6CD] disabled:text-[#5C5852] text-[#FAF8F5] text-xs uppercase tracking-[0.2em] font-bold flex items-center justify-between transition cursor-pointer"
              >
                <span>REALIZAR SORTEIO</span>
                <Shuffle className="w-4 h-4" />
              </button>
            ) : (
              <div className="flex flex-col sm:flex-row gap-2.5">
                <button
                  type="button"
                  onClick={() => setAdminTab('whatsapp_dispatch')}
                  className="flex-1 py-3.5 px-4 bg-[#2C4035] hover:bg-[#181816] text-[#FAF8F5] text-xs uppercase tracking-[0.18em] font-bold flex items-center justify-center gap-2 transition cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  Disparar WhatsApp
                </button>
                <button
                  type="button"
                  onClick={handleResetDraw}
                  className="py-3.5 px-4 border border-[#8E3B36] text-[#8E3B36] hover:bg-[#8E3B36] hover:text-[#FAF8F5] text-xs uppercase tracking-[0.15em] font-semibold transition cursor-pointer"
                >
                  Reiniciar
                </button>
              </div>
            )}
          </div>
        </section>

        {/* ABA 01: RELAÇÃO DE PARTICIPANTES */}
        {adminTab === 'dashboard' && (
          <section className="border border-[#DCD6CD] bg-[#FAF8F5] p-6 sm:p-10 space-y-8">
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pb-6 border-b border-[#DCD6CD]">
              <div>
                <span className="text-xs uppercase tracking-[0.25em] text-[#8C6D53] font-semibold">
                  01. Diretório da Família
                </span>
                <h2
                  style={fontSerifStyle}
                  className="text-3xl sm:text-4xl font-semibold text-[#181816] mt-1"
                >
                  Participantes Cadastrados
                </h2>
                <p className="text-xs sm:text-sm text-[#5C5852] mt-1">
                  Você só precisa cadastrar <strong>Nome e WhatsApp</strong>.
                  Cada familiar preenche suas próprias dicas de presente ao
                  abrir o link.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {participants.length === 0 && drawStatus !== 'drawn' && (
                  <button
                    type="button"
                    onClick={handleLoadDemoParticipants}
                    className="px-4 py-3 border border-[#8C6D53] text-[#8C6D53] hover:bg-[#8C6D53] hover:text-[#FAF8F5] text-xs uppercase tracking-[0.18em] font-semibold transition cursor-pointer"
                  >
                    Carregar Exemplos
                  </button>
                )}

                <button
                  type="button"
                  disabled={isBusy || hintsFilledCount === 0}
                  onClick={handleClearAllGiftHints}
                  className="px-4 py-3 border border-[#8E3B36] text-[#8E3B36] hover:bg-[#8E3B36] hover:text-[#FAF8F5] disabled:opacity-40 text-xs uppercase tracking-[0.18em] font-semibold flex items-center gap-2 transition cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                  Limpar Dicas de Presentes
                </button>

                <button
                  type="button"
                  disabled={drawStatus === 'drawn'}
                  onClick={() => setCsvModalOpen(true)}
                  className="px-5 py-3 border border-[#181816] bg-[#FAF8F5] hover:bg-[#F3EFEA] disabled:opacity-40 text-[#181816] text-xs uppercase tracking-[0.18em] font-semibold flex items-center gap-2 transition cursor-pointer"
                >
                  <FileSpreadsheet className="w-4 h-4 text-[#2C4035]" />
                  Importar CSV
                </button>

                <button
                  type="button"
                  disabled={drawStatus === 'drawn'}
                  onClick={openNewParticipantModal}
                  className="px-6 py-3 bg-[#181816] hover:bg-[#2C4035] disabled:opacity-40 text-[#FAF8F5] text-xs uppercase tracking-[0.18em] font-semibold flex items-center gap-2 transition cursor-pointer"
                >
                  <UserPlus className="w-4 h-4" />
                  Novo Participante
                </button>
              </div>
            </div>

            {/* Busca */}
            <div className="flex items-center justify-between">
              <div className="relative w-full sm:w-96">
                <Search className="w-4 h-4 text-[#5C5852] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filtrar por nome ou telefone..."
                  className="w-full pl-10 pr-4 py-2.5 bg-[#F3EFEA] border border-[#DCD6CD] focus:border-[#181816] text-sm outline-none"
                />
              </div>
            </div>

            {filteredParticipants.length === 0 ? (
              <div className="p-14 border border-dashed border-[#DCD6CD] bg-[#F3EFEA]/40 text-center space-y-3">
                <span className="text-xs uppercase tracking-[0.25em] text-[#8C6D53]">
                  Lista Vazia
                </span>
                <h3
                  style={fontSerifStyle}
                  className="text-2xl font-semibold text-[#181816]"
                >
                  Nenhum participante registrado
                </h3>
                <p className="text-xs text-[#5C5852] max-w-md mx-auto">
                  Adicione manualmente informando Nome e WhatsApp ou importe uma
                  planilha CSV simples.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto border border-[#DCD6CD]">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#F3EFEA] border-b border-[#DCD6CD] text-[10px] uppercase tracking-[0.22em] text-[#5C5852] font-bold">
                      <th className="py-4 px-5">#</th>
                      <th className="py-4 px-5">Nome Completo</th>
                      <th className="py-4 px-5">WhatsApp (DDD)</th>
                      <th className="py-4 px-5">Dicas de Presente</th>
                      <th className="py-4 px-5 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#DCD6CD] text-sm">
                    {filteredParticipants.map((p, idx) => {
                      const filled = hasFilledGiftHints(p);
                      return (
                        <tr key={p.id} className="hover:bg-[#F3EFEA]/50">
                          <td className="py-4 px-5 font-mono text-xs text-[#8C6D53]">
                            {String(idx + 1).padStart(2, '0')}
                          </td>
                          <td className="py-4 px-5 font-semibold text-[#181816]">
                            {p.fullName}
                          </td>
                          <td className="py-4 px-5 font-mono text-xs text-[#2C4035] font-medium">
                            {formatPhoneDisplay(p.phone)}
                          </td>
                          <td className="py-4 px-5">
                            {filled ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#2C4035]/10 text-[#2C4035] text-xs font-semibold">
                                <span className="w-1.5 h-1.5 bg-[#2C4035]" />
                                Preenchidas pelo familiar
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 text-xs text-[#5C5852]">
                                <span className="w-1.5 h-1.5 bg-[#8C6D53]" />
                                Preenche ao abrir o link
                              </span>
                            )}
                          </td>
                          <td className="py-4 px-5 text-right">
                            <div className="inline-flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => openEditParticipantModal(p)}
                                className="px-3 py-1.5 border border-[#DCD6CD] hover:border-[#181816] text-xs uppercase tracking-wider text-[#181816] cursor-pointer"
                              >
                                Editar
                              </button>
                              {drawStatus !== 'drawn' && (
                                <button
                                  type="button"
                                  onClick={() => handleDeleteParticipant(p)}
                                  className="px-3 py-1.5 border border-[#DCD6CD] hover:border-[#8E3B36] text-xs uppercase tracking-wider text-[#8E3B36] cursor-pointer"
                                >
                                  Remover
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {/* ABA 02: DISPARO AUTOMÁTICO DE WHATSAPP (ULTRAMSG) + PERSONALIZAÇÃO DE MENSAGEM */}
        {adminTab === 'whatsapp_dispatch' && (
          <div className="space-y-10">
            {drawStatus !== 'drawn' ? (
              <div className="border border-[#DCD6CD] bg-[#FAF8F5] p-12 text-center space-y-4">
                <span className="text-xs uppercase tracking-[0.25em] text-[#8C6D53]">
                  02. Distribuição de Acessos
                </span>
                <h3
                  style={fontSerifStyle}
                  className="text-3xl font-semibold text-[#181816]"
                >
                  Execute o Sorteio Primeiro
                </h3>
                <p className="text-sm text-[#5C5852] max-w-md mx-auto">
                  Após clicar em "REALIZAR SORTEIO", os links individuais sem
                  senha serão listados aqui para envio automático via UltraMsg
                  ou WhatsApp Web.
                </p>
              </div>
            ) : (
              <>
                {/* Painel de Configuração UltraMsg + Template de Mensagem Editável */}
                <section className="border border-[#181816] bg-[#F3EFEA] p-6 sm:p-10 space-y-8">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-[#DCD6CD]">
                    <div>
                      <span className="text-xs uppercase tracking-[0.25em] text-[#2C4035] font-bold">
                        02. Motor de Disparo Automático (UltraMsg / API)
                      </span>
                      <h2
                        style={fontSerifStyle}
                        className="text-3xl sm:text-4xl font-semibold text-[#181816] mt-1"
                      >
                        Distribuição de Links pelo WhatsApp
                      </h2>
                      <p className="text-xs sm:text-sm text-[#5C5852] mt-1">
                        O sistema adiciona automaticamente o DDI{' '}
                        <code>+55</code> e envia o link individual de cada
                        familiar.
                      </p>
                    </div>

                    <div>
                      {!isAutoDispatching ? (
                        <button
                          type="button"
                          onClick={() =>
                            handleStartAutomaticBatchDispatch(true)
                          }
                          className="px-7 py-4 bg-[#2C4035] hover:bg-[#181816] text-[#FAF8F5] text-xs uppercase tracking-[0.2em] font-bold flex items-center gap-3 transition cursor-pointer"
                        >
                          <Play className="w-4 h-4" />
                          DISPARAR TODOS AUTOMATICAMENTE (API)
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            abortDispatchRef.current = true;
                          }}
                          className="px-7 py-4 bg-[#8E3B36] text-[#FAF8F5] text-xs uppercase tracking-[0.2em] font-bold flex items-center gap-3 transition cursor-pointer"
                        >
                          <Pause className="w-4 h-4" />
                          PAUSAR FILA AUTOMÁTICA
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Grid de Credenciais API + Editor de Mensagem do WhatsApp */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* Credenciais da API */}
                    <div className="lg:col-span-6 space-y-4">
                      <span className="block text-xs uppercase tracking-[0.2em] font-bold text-[#181816]">
                        A. Conexão da Instância (UltraMsg / Gateway)
                      </span>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[11px] uppercase tracking-[0.15em] text-[#5C5852] mb-1.5">
                            Provedor de Envio
                          </label>
                          <select
                            value={waProvider}
                            onChange={(e) => setWaProvider(e.target.value)}
                            className="w-full px-3.5 py-2.5 bg-[#FAF8F5] border border-[#DCD6CD] text-xs font-semibold outline-none"
                          >
                            <option value="ultramsg">
                              UltraMsg API (100% Automático)
                            </option>
                            <option value="zapi">
                              Z-API Instância Web (Automático)
                            </option>
                            <option value="evolution">
                              Evolution API (Automático)
                            </option>
                            <option value="webhook">Webhook Customizado</option>
                            <option value="wame_assist">
                              WhatsApp Web Direto (wa.me)
                            </option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-[11px] uppercase tracking-[0.15em] text-[#5C5852] mb-1.5">
                            Intervalo entre Envios
                          </label>
                          <select
                            value={waDelaySeconds}
                            onChange={(e) =>
                              setWaDelaySeconds(Number(e.target.value))
                            }
                            className="w-full px-3.5 py-2.5 bg-[#FAF8F5] border border-[#DCD6CD] text-xs font-semibold outline-none"
                          >
                            <option value={2}>2 segundos</option>
                            <option value={4}>4 segundos (Recomendado)</option>
                            <option value={7}>7 segundos</option>
                          </select>
                        </div>
                      </div>

                      {(waProvider === 'evolution' ||
                        waProvider === 'webhook') && (
                        <div>
                          <label className="block text-[11px] uppercase tracking-[0.15em] text-[#5C5852] mb-1">
                            URL do Servidor / Webhook
                          </label>
                          <input
                            type="text"
                            value={waInstanceUrl}
                            onChange={(e) => setWaInstanceUrl(e.target.value)}
                            placeholder="https://sua-api.com"
                            className="w-full px-3.5 py-2.5 bg-[#FAF8F5] border border-[#DCD6CD] text-xs outline-none"
                          />
                        </div>
                      )}

                      {waProvider !== 'webhook' &&
                        waProvider !== 'wame_assist' && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-[11px] uppercase tracking-[0.15em] text-[#5C5852] mb-1">
                                Instance ID (Ex: instance115432)
                              </label>
                              <input
                                type="text"
                                value={waInstanceId}
                                onChange={(e) =>
                                  setWaInstanceId(e.target.value)
                                }
                                placeholder="instanceXXXXXX"
                                className="w-full px-3.5 py-2.5 bg-[#FAF8F5] border border-[#DCD6CD] text-xs font-mono outline-none"
                              />
                            </div>
                            <div>
                              <label className="block text-[11px] uppercase tracking-[0.15em] text-[#5C5852] mb-1">
                                Token da Instância
                              </label>
                              <input
                                type="password"
                                value={waApiToken}
                                onChange={(e) => setWaApiToken(e.target.value)}
                                placeholder="Token UltraMsg / API"
                                className="w-full px-3.5 py-2.5 bg-[#FAF8F5] border border-[#DCD6CD] text-xs font-mono outline-none"
                              />
                            </div>
                          </div>
                        )}
                    </div>

                    {/* Personalização da Mensagem direto no Painel */}
                    <div className="lg:col-span-6 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="block text-xs uppercase tracking-[0.2em] font-bold text-[#181816]">
                          B. Personalizar Texto da Mensagem
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            setCustomWaTemplate(DEFAULT_WHATSAPP_TEMPLATE)
                          }
                          className="text-[11px] uppercase tracking-wider text-[#8C6D53] hover:text-[#181816] underline cursor-pointer"
                        >
                          Restaurar Padrão
                        </button>
                      </div>

                      <textarea
                        rows={6}
                        value={customWaTemplate}
                        onChange={(e) => setCustomWaTemplate(e.target.value)}
                        className="w-full p-3.5 bg-[#FAF8F5] border border-[#DCD6CD] focus:border-[#181816] text-xs leading-relaxed outline-none font-sans"
                      />

                      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#5C5852]">
                        <span>
                          Variáveis automáticas: <code>{'{nome}'}</code>,{' '}
                          <code>{'{evento}'}</code>, <code>{'{link}'}</code>
                        </span>
                        <button
                          type="button"
                          onClick={handleSaveGatewayConfig}
                          className="px-4 py-2 bg-[#181816] hover:bg-[#2C4035] text-[#FAF8F5] text-[11px] uppercase tracking-[0.18em] font-semibold transition cursor-pointer"
                        >
                          Salvar API & Mensagem
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Barra de Progresso e Log */}
                  {(isAutoDispatching || dispatchLogs.length > 0) && (
                    <div className="border border-[#DCD6CD] bg-[#FAF8F5] p-5 space-y-3">
                      <div className="flex items-center justify-between text-xs uppercase tracking-[0.18em] font-bold">
                        <span>
                          Progresso: {dispatchProgress.current} /{' '}
                          {dispatchProgress.total}
                        </span>
                        <span>
                          {dispatchProgress.total > 0
                            ? Math.round(
                                (dispatchProgress.current /
                                  dispatchProgress.total) *
                                  100
                              )
                            : 0}
                          %
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-[#DCD6CD]">
                        <div
                          className="h-full bg-[#2C4035] transition-all duration-300"
                          style={{
                            width: `${
                              dispatchProgress.total > 0
                                ? (dispatchProgress.current /
                                    dispatchProgress.total) *
                                  100
                                : 0
                            }%`,
                          }}
                        />
                      </div>
                      <div className="max-h-32 overflow-y-auto font-mono text-xs text-[#5C5852] space-y-1 pt-1">
                        {dispatchLogs.map((log, i) => (
                          <div key={i}>{log}</div>
                        ))}
                      </div>
                    </div>
                  )}
                </section>

                {/* Tabela de Envios Individuais e Teste de Link */}
                <section className="border border-[#DCD6CD] bg-[#FAF8F5] p-6 sm:p-10 space-y-6">
                  <div>
                    <span className="text-xs uppercase tracking-[0.25em] text-[#8C6D53] font-semibold">
                      Relatório de Entregas
                    </span>
                    <h3
                      style={fontSerifStyle}
                      className="text-2xl sm:text-3xl font-semibold text-[#181816] mt-1"
                    >
                      Links Exclusivos por Participante
                    </h3>
                  </div>

                  <div className="overflow-x-auto border border-[#DCD6CD]">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-[#F3EFEA] border-b border-[#DCD6CD] text-[10px] uppercase tracking-[0.22em] text-[#5C5852] font-bold">
                          <th className="py-4 px-5">Participante</th>
                          <th className="py-4 px-5">WhatsApp</th>
                          <th className="py-4 px-5">Status Disparo</th>
                          <th className="py-4 px-5">Acesso ao Link</th>
                          <th className="py-4 px-5">Dicas Cadastradas</th>
                          <th className="py-4 px-5 text-right">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#DCD6CD] text-sm">
                        {accessTokens.map((tk) => {
                          const partDoc = participants.find(
                            (p) => p.id === tk.participantId
                          );
                          const hasHints = hasFilledGiftHints(partDoc);
                          return (
                            <tr key={tk.id} className="hover:bg-[#F3EFEA]/40">
                              <td className="py-4 px-5 font-semibold text-[#181816]">
                                {tk.participantName}
                              </td>
                              <td className="py-4 px-5 font-mono text-xs text-[#5C5852]">
                                {formatPhoneDisplay(tk.participantPhone)}
                              </td>
                              <td className="py-4 px-5">
                                {tk.whatsappStatus === 'sent' ? (
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#2C4035] text-[#FAF8F5] text-[11px] uppercase tracking-wider font-semibold">
                                    Enviado
                                  </span>
                                ) : tk.whatsappStatus === 'error' ? (
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#8E3B36] text-[#FAF8F5] text-[11px] uppercase tracking-wider font-semibold">
                                    Falha API
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#F3EFEA] border border-[#DCD6CD] text-[#5C5852] text-[11px] uppercase tracking-wider font-semibold">
                                    Pendente
                                  </span>
                                )}
                              </td>
                              <td className="py-4 px-5 text-xs">
                                {tk.hasAccessedResult ? (
                                  <span className="text-[#2C4035] font-semibold">
                                    ✓ Já visualizou
                                  </span>
                                ) : (
                                  <span className="text-[#5C5852]">
                                    Não aberto
                                  </span>
                                )}
                              </td>
                              <td className="py-4 px-5 text-xs">
                                {hasHints ? (
                                  <span className="text-[#2C4035] font-semibold">
                                    ✓ Preenchidas
                                  </span>
                                ) : (
                                  <span className="text-[#5C5852]">
                                    Em branco
                                  </span>
                                )}
                              </td>
                              <td className="py-4 px-5 text-right">
                                <div className="inline-flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => setPreviewMessageModal(tk)}
                                    className="px-3 py-1.5 border border-[#DCD6CD] hover:border-[#181816] text-[11px] uppercase tracking-wider text-[#181816] cursor-pointer"
                                  >
                                    Ver Msg
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      setIsSimulatingParticipant(true);
                                      setActiveParticipantToken(tk.token);
                                    }}
                                    className="px-3 py-1.5 border border-[#DCD6CD] hover:border-[#181816] text-[11px] uppercase tracking-wider text-[#5C5852] hover:text-[#181816] cursor-pointer"
                                    title="Testar página do participante sem revelar o nome sorteado"
                                  >
                                    Testar Link
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleSendDirectWhatsApp(tk, true)
                                    }
                                    className="px-3.5 py-1.5 bg-[#2C4035] hover:bg-[#181816] text-[#FAF8F5] text-[11px] uppercase tracking-wider font-semibold flex items-center gap-1.5 cursor-pointer"
                                  >
                                    <span>wa.me</span>
                                    <ArrowUpRight className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </section>
              </>
            )}
          </div>
        )}

        {/* ABA 03: CONFIGURAÇÕES DO EVENTO */}
        {adminTab === 'settings' && (
          <section className="max-w-3xl border border-[#DCD6CD] bg-[#FAF8F5] p-6 sm:p-10 space-y-8">
            <div className="pb-4 border-b border-[#DCD6CD]">
              <span className="text-xs uppercase tracking-[0.25em] text-[#8C6D53] font-semibold">
                03. Parâmetros Gerais
              </span>
              <h2
                style={fontSerifStyle}
                className="text-3xl font-semibold text-[#181816] mt-1"
              >
                Configurações da Edição
              </h2>
            </div>

            <form onSubmit={handleSaveGatewayConfig} className="space-y-5">
              <div>
                <label className="block text-xs uppercase tracking-[0.18em] font-semibold text-[#181816] mb-2">
                  Título do Evento Familiar
                </label>
                <input
                  type="text"
                  required
                  value={eventTitleInput}
                  onChange={(e) => setEventTitleInput(e.target.value)}
                  className="w-full px-4 py-3 bg-[#F3EFEA] border border-[#DCD6CD] focus:border-[#181816] text-sm outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs uppercase tracking-[0.18em] font-semibold text-[#181816] mb-2">
                    Data da Confraternização
                  </label>
                  <input
                    type="date"
                    value={eventDateInput}
                    onChange={(e) => setEventDateInput(e.target.value)}
                    className="w-full px-4 py-3 bg-[#F3EFEA] border border-[#DCD6CD] focus:border-[#181816] text-sm outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-[0.18em] font-semibold text-[#181816] mb-2">
                    Valor Sugerido do Presente
                  </label>
                  <input
                    type="text"
                    value={eventValueInput}
                    onChange={(e) => setEventValueInput(e.target.value)}
                    className="w-full px-4 py-3 bg-[#F3EFEA] border border-[#DCD6CD] focus:border-[#181816] text-sm outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs uppercase tracking-[0.18em] font-semibold text-[#181816] mb-2">
                  Estrutura dos Links Individuais
                </label>
                <select
                  value={urlFormatPreference}
                  onChange={(e) => setUrlFormatPreference(e.target.value)}
                  className="w-full px-4 py-3 bg-[#F3EFEA] border border-[#DCD6CD] text-sm outline-none"
                >
                  <option value="path">
                    Rota Limpa: https://seusite.com/amigo-secreto/8f7a2c91
                  </option>
                  <option value="query">
                    Parâmetro Universal:
                    https://seusite.com/?amigo-secreto=8f7a2c91
                  </option>
                </select>
              </div>

              <div className="flex justify-end pt-4 border-t border-[#DCD6CD]">
                <button
                  type="submit"
                  disabled={isBusy}
                  className="px-8 py-4 bg-[#181816] hover:bg-[#2C4035] text-[#FAF8F5] text-xs uppercase tracking-[0.2em] font-bold transition cursor-pointer"
                >
                  Salvar Alterações
                </button>
              </div>
            </form>
          </section>
        )}
      </main>

      {/* MODAL: CADASTRAR / EDITAR PARTICIPANTE (APENAS NOME E WHATSAPP) */}
      {participantModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#181816]/60 backdrop-blur-[2px] flex items-center justify-center p-4">
          <div className="bg-[#FAF8F5] border border-[#181816] max-w-md w-full p-6 sm:p-10 space-y-6">
            <div className="flex items-start justify-between pb-4 border-b border-[#DCD6CD]">
              <div>
                <span className="text-[10px] uppercase tracking-[0.25em] text-[#8C6D53] font-bold">
                  Cadastro Simplificado
                </span>
                <h3
                  style={fontSerifStyle}
                  className="text-2xl font-semibold text-[#181816] mt-1"
                >
                  {editingParticipantId
                    ? 'Editar Participante'
                    : 'Adicionar Familiar'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setParticipantModalOpen(false)}
                className="text-sm text-[#5C5852] hover:text-[#181816]"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveParticipant} className="space-y-4">
              <div>
                <label className="block text-[11px] uppercase tracking-[0.18em] font-semibold text-[#181816] mb-1.5">
                  Nome Completo *
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Ex: Pedro Henrique"
                  className="w-full px-4 py-3 bg-[#F3EFEA] border border-[#DCD6CD] focus:border-[#181816] text-sm outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] uppercase tracking-[0.18em] font-semibold text-[#181816] mb-1.5">
                  WhatsApp com DDD *
                </label>
                <input
                  type="text"
                  required
                  value={formPhone}
                  onChange={(e) => setFormPhone(e.target.value)}
                  placeholder="Ex: 31999999999"
                  className="w-full px-4 py-3 bg-[#F3EFEA] border border-[#DCD6CD] focus:border-[#181816] text-sm font-mono outline-none"
                />
              </div>

              <div className="p-4 bg-[#F3EFEA] border-l-2 border-[#8C6D53] text-xs text-[#5C5852] leading-relaxed">
                As dicas de presente e tamanhos de roupa serão preenchidas pelo
                próprio familiar ao acessar o link recebido no WhatsApp.
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-[#DCD6CD]">
                <button
                  type="button"
                  onClick={() => setParticipantModalOpen(false)}
                  className="px-5 py-3 border border-[#DCD6CD] text-xs uppercase tracking-[0.18em] text-[#5C5852]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isBusy}
                  className="px-6 py-3 bg-[#181816] hover:bg-[#2C4035] text-[#FAF8F5] text-xs uppercase tracking-[0.18em] font-semibold cursor-pointer"
                >
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: IMPORTAR PARTICIPANTES VIA CSV */}
      {csvModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#181816]/60 backdrop-blur-[2px] flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#FAF8F5] border border-[#181816] max-w-3xl w-full p-6 sm:p-10 space-y-6 my-8 max-h-[92vh] overflow-y-auto">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[#DCD6CD]">
              <div>
                <span className="text-[10px] uppercase tracking-[0.25em] text-[#8C6D53] font-bold">
                  Importação em Lote
                </span>
                <h3
                  style={fontSerifStyle}
                  className="text-2xl font-semibold text-[#181816] mt-1"
                >
                  Importar Arquivo CSV (Nome e Telefone)
                </h3>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleDownloadCsvTemplate}
                  className="px-4 py-2 border border-[#181816] text-xs uppercase tracking-[0.15em] font-semibold flex items-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  Modelo CSV
                </button>
                <button
                  type="button"
                  onClick={() => setCsvModalOpen(false)}
                  className="px-3 py-2 border border-[#DCD6CD] text-xs"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div
                onClick={() => fileInputRef.current?.click()}
                className="p-6 border border-dashed border-[#8C6D53] bg-[#F3EFEA]/50 hover:bg-[#F3EFEA] flex flex-col items-center justify-center text-center cursor-pointer transition"
              >
                <Upload className="w-6 h-6 text-[#2C4035] mb-2" />
                <strong className="text-xs uppercase tracking-[0.18em] text-[#181816]">
                  Selecionar Arquivo .CSV
                </strong>
                <span className="text-xs text-[#5C5852] mt-1">
                  Colunas: nome,telefone
                </span>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,text/csv,text/plain"
                  onChange={handleCsvFileSelect}
                  className="hidden"
                />
              </div>

              <div>
                <label className="block text-[11px] uppercase tracking-[0.15em] text-[#5C5852] mb-1">
                  Ou cole os dados (nome,telefone):
                </label>
                <textarea
                  rows={4}
                  value={csvRawText}
                  onChange={(e) => {
                    setCsvRawText(e.target.value);
                    setCsvPreviewRows(parseCsvText(e.target.value));
                  }}
                  placeholder={
                    'nome,telefone\nPedro Henrique,31999999999\nMaria Silva,31988888888'
                  }
                  className="w-full p-3 bg-[#F3EFEA] border border-[#DCD6CD] font-mono text-xs outline-none"
                />
              </div>
            </div>

            {validatedCsvRows.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center gap-6 p-3.5 bg-[#F3EFEA] border border-[#DCD6CD] text-xs uppercase tracking-wider">
                  <span>Total: {validatedCsvRows.length}</span>
                  <span className="text-[#2C4035] font-bold">
                    ✓ Válidos:{' '}
                    {validatedCsvRows.filter((r) => r.isValid).length}
                  </span>
                  <span className="text-[#8E3B36] font-bold">
                    ✕ Com Erro:{' '}
                    {validatedCsvRows.filter((r) => !r.isValid).length}
                  </span>
                </div>

                <div className="overflow-x-auto border border-[#DCD6CD] max-h-64">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-[#F3EFEA] border-b border-[#DCD6CD] uppercase tracking-wider text-[10px] text-[#5C5852]">
                        <th className="py-2.5 px-3">Validação</th>
                        <th className="py-2.5 px-3">Nome Completo</th>
                        <th className="py-2.5 px-3">WhatsApp (DDD)</th>
                        <th className="py-2.5 px-3">Ação</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#DCD6CD]">
                      {validatedCsvRows.map((row) => (
                        <tr
                          key={row.tempId}
                          className={
                            row.isValid ? 'bg-[#FAF8F5]' : 'bg-[#8E3B36]/10'
                          }
                        >
                          <td className="py-2 px-3">
                            {row.isValid ? (
                              <span className="text-[#2C4035] font-bold">
                                OK
                              </span>
                            ) : (
                              <span className="text-[#8E3B36] font-semibold">
                                {row.errorText}
                              </span>
                            )}
                          </td>
                          <td className="py-2 px-3">
                            <input
                              type="text"
                              value={row.nome}
                              onChange={(e) =>
                                handleUpdateCsvCell(
                                  row.tempId,
                                  'nome',
                                  e.target.value
                                )
                              }
                              className="w-full px-2 py-1 bg-[#FAF8F5] border border-[#DCD6CD]"
                            />
                          </td>
                          <td className="py-2 px-3">
                            <input
                              type="text"
                              value={row.telefone}
                              onChange={(e) =>
                                handleUpdateCsvCell(
                                  row.tempId,
                                  'telefone',
                                  e.target.value
                                )
                              }
                              className="w-full px-2 py-1 bg-[#FAF8F5] border border-[#DCD6CD] font-mono"
                            />
                          </td>
                          <td className="py-2 px-3">
                            <button
                              type="button"
                              onClick={() => handleRemoveCsvRow(row.tempId)}
                              className="text-[#8E3B36] underline"
                            >
                              Remover
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4 border-t border-[#DCD6CD]">
              <button
                type="button"
                onClick={() => setCsvModalOpen(false)}
                className="px-5 py-3 border border-[#DCD6CD] text-xs uppercase tracking-[0.18em]"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={
                  isBusy ||
                  validatedCsvRows.filter((r) => r.isValid).length === 0
                }
                onClick={handleConfirmCsvImport}
                className="px-6 py-3 bg-[#2C4035] hover:bg-[#181816] disabled:bg-[#DCD6CD] text-[#FAF8F5] text-xs uppercase tracking-[0.18em] font-semibold cursor-pointer"
              >
                Importar ({validatedCsvRows.filter((r) => r.isValid).length}{' '}
                Válidos)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: PRÉVIA DA MENSAGEM DO WHATSAPP */}
      {previewMessageModal && (
        <div className="fixed inset-0 z-50 bg-[#181816]/60 backdrop-blur-[2px] flex items-center justify-center p-4">
          <div className="bg-[#FAF8F5] border border-[#181816] max-w-lg w-full p-6 sm:p-10 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-[#DCD6CD]">
              <h3
                style={fontSerifStyle}
                className="text-2xl font-semibold text-[#181816]"
              >
                Mensagem • {previewMessageModal.participantName}
              </h3>
              <button
                type="button"
                onClick={() => setPreviewMessageModal(null)}
                className="text-sm text-[#5C5852]"
              >
                ✕
              </button>
            </div>

            <pre className="p-5 bg-[#F3EFEA] border border-[#DCD6CD] text-xs sm:text-sm text-[#181816] whitespace-pre-wrap font-sans leading-relaxed">
              {buildWhatsAppMessage(
                previewMessageModal.participantName,
                eventName,
                buildParticipantLink(previewMessageModal.token),
                customWaTemplate
              )}
            </pre>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setPreviewMessageModal(null)}
                className="px-5 py-2.5 border border-[#DCD6CD] text-xs uppercase tracking-[0.18em]"
              >
                Fechar
              </button>
              <button
                type="button"
                onClick={() => {
                  const tk = previewMessageModal;
                  setPreviewMessageModal(null);
                  handleSendDirectWhatsApp(tk, true);
                }}
                className="px-6 py-2.5 bg-[#2C4035] hover:bg-[#181816] text-[#FAF8F5] text-xs uppercase tracking-[0.18em] font-semibold cursor-pointer"
              >
                Abrir no WhatsApp
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE CONFIRMAÇÃO ADMINISTRATIVA */}
      {confirmModal && (
        <div className="fixed inset-0 z-50 bg-[#181816]/60 backdrop-blur-[2px] flex items-center justify-center p-4">
          <div className="bg-[#FAF8F5] border border-[#181816] max-w-md w-full p-6 sm:p-10 space-y-5">
            <span className="text-[10px] uppercase tracking-[0.25em] text-[#8E3B36] font-bold">
              Confirmação de Segurança
            </span>
            <h3
              style={fontSerifStyle}
              className="text-2xl font-semibold text-[#181816]"
            >
              {confirmModal.title}
            </h3>
            <p className="text-xs sm:text-sm text-[#5C5852] leading-relaxed">
              {confirmModal.description}
            </p>
            <div className="flex justify-end gap-3 pt-4 border-t border-[#DCD6CD]">
              <button
                type="button"
                onClick={() => setConfirmModal(null)}
                className="px-5 py-3 border border-[#DCD6CD] text-xs uppercase tracking-[0.18em]"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmModal.onConfirm}
                className={`px-6 py-3 text-[#FAF8F5] text-xs uppercase tracking-[0.18em] font-semibold cursor-pointer ${
                  confirmModal.danger
                    ? 'bg-[#8E3B36] hover:bg-[#181816]'
                    : 'bg-[#2C4035] hover:bg-[#181816]'
                }`}
              >
                {confirmModal.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}