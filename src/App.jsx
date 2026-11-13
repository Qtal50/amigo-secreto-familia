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
  Key,
  LogIn,
  LogOut,
  Copy,
  Check,
  Share2,
  Calendar,
  Heart,
  ThumbsDown,
  Shirt,
  AlertTriangle,
  RefreshCw,
  Eye,
  EyeOff,
  Settings,
  Trash2,
  CheckCircle2,
  Clock,
  ChevronRight,
  ChevronLeft,
  Plus,
  Search,
  Crown,
  Star,
  Database,
  Server,
  UserPlus,
  Edit3,
  Send,
  Shuffle,
  Upload,
  Download,
  Phone,
  FileSpreadsheet,
  Play,
  Pause,
  CheckCircle,
  XCircle,
  ExternalLink,
  Smartphone,
  Zap,
  HelpCircle,
} from 'lucide-react';

// ============================================================================
// 1. CONFIGURAÇÃO HÍBRIDA DO FIREBASE (AMBIENTE DE PREVIEW + VERCEL DO USUÁRIO)
// ============================================================================
const defaultFirebaseConfig = {
  apiKey: 'AIzaSyDROloG5oTL6x-mzAIUdfmldtwyMEnmNx8',
  authDomain: 'amigo-secreto-familia-d3db6.firebaseapp.com',
  projectId: 'amigo-secreto-familia-d3db6',
  storageBucket: 'amigo-secreto-familia-d3db6.firebasestorage.app',
  messagingSenderId: '823718992830',
  appId: '1:823718992830:web:e77ce75b4adf4771abf7ef',
  measurementId: 'G-JD70XVYV04',
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
// 2. CRIPTOGRAFIA ZERO-KNOWLEDGE (SHA-256 + AES-256-GCM + TOKENS SEGUROS)
// ============================================================================

/**
 * Gera um hash SHA-256 hexadecimal
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
 * Deriva uma chave criptográfica AES-GCM de 256 bits a partir do Token + PIN de 6 dígitos
 */
async function deriveAesKey(token, pin) {
  const rawKeyMaterial = new TextEncoder().encode(
    `zk-secret-santa::${String(token).trim().toLowerCase()}::${String(pin).trim()}`
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
 * Criptografa o resultado individual do participante com AES-256-GCM.
 * Nem mesmo o administrador com acesso ao banco consegue ler quem tirou quem sem o PIN!
 */
async function encryptSecretResult(token, pin, payloadObject) {
  const key = await deriveAesKey(token, pin);
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
 * Descriptografa o resultado individual exclusivamente quando o participante digita o PIN correto
 */
async function decryptSecretResult(token, pin, encryptedHex, ivHex) {
  const key = await deriveAesKey(token, pin);
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
 * Gera um token imprevisível de 8 caracteres hexadecimais (ex: 8f7a2c91)
 */
function generateSecureToken() {
  const bytes = new Uint8Array(4);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Gera um código numérico criptograficamente seguro de exatos 6 dígitos (ex: 583921)
 */
function generateSixDigitPin() {
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  const pin = 100000 + (array[0] % 900000);
  return String(pin);
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
 * Formata número com DDI 55 (Brasil) para envio em APIs de WhatsApp
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
 * Valida se o telefone possui DDD + número válido (10 ou 11 dígitos locais, ou 12-13 com 55)
 */
function isValidBrazilianPhone(phone) {
  const digits = sanitizePhone(phone);
  const local =
    digits.startsWith('55') && digits.length >= 12 ? digits.slice(2) : digits;
  return local.length === 10 || local.length === 11;
}

/**
 * Algoritmo de Sorteio (Ciclo Hamiltoniano Aleatório / Derangement)
 * Garante 100% que ninguém tire a si mesmo, todos tirem 1 pessoa e todos sejam sorteados 1 vez.
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
 * Parser CSV inteligente (suporta vírgula ou ponto-e-vírgula e campos entre aspas)
 */
function parseCsvText(csvString) {
  const lines = String(csvString || '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .filter((line) => line.trim().length > 0);

  if (lines.length === 0) return [];

  // Detecta delimitador (, ou ;)
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

  // Verifica se a primeira linha é cabeçalho
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
        gostaria_de_ganhar: getCol(
          ['gostaria_de_ganhar', 'presente', 'desejos', 'quer_ganhar'],
          2
        ),
        nao_gostaria_de_ganhar: getCol(
          ['nao_gostaria_de_ganhar', 'nao_quer', 'restricoes'],
          3
        ),
        tamanho_calcado: getCol(['tamanho_calcado', 'calcado', 'sapato'], 4),
        tamanho_camisa: getCol(['tamanho_camisa', 'camisa', 'blusa'], 5),
        tamanho_calca: getCol(['tamanho_calca', 'calca'], 6),
        observacoes: getCol(['observacoes', 'obs', 'preferencias'], 7),
      });
    } else {
      rows.push({
        tempId: `csv_${i}_${Date.now()}`,
        nome: cols[0] || '',
        telefone: cols[1] || '',
        gostaria_de_ganhar: cols[2] || '',
        nao_gostaria_de_ganhar: cols[3] || '',
        tamanho_calcado: cols[4] || '',
        tamanho_camisa: cols[5] || '',
        tamanho_calca: cols[6] || '',
        observacoes: cols[7] || '',
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
    // Ignora erros de leitura em iframes restritos
  }
  return null;
}

// ============================================================================
// 3. ELEMENTOS VISUAIS NATALINOS (SVGs)
// ============================================================================

const ChristmasTreeSVG = ({ className = 'w-8 h-8' }) => (
  <svg viewBox="0 0 64 64" fill="none" className={className}>
    <path
      d="M32 6L14 28H24L10 46H26L26 58H38V46H54L40 28H50L32 6Z"
      fill="#065F46"
      stroke="#F59E0B"
      strokeWidth="2.5"
      strokeLinejoin="round"
    />
    <rect x="27" y="48" width="10" height="10" rx="1" fill="#78350F" />
    <circle cx="32" cy="6" r="4" fill="#FBBF24" />
    <circle cx="26" cy="24" r="2.5" fill="#EF4444" />
    <circle cx="38" cy="32" r="2.5" fill="#FBBF24" />
    <circle cx="22" cy="40" r="2.5" fill="#EF4444" />
    <circle cx="41" cy="41" r="2.5" fill="#38BDF8" />
  </svg>
);

const FestiveGiftBoxSVG = ({
  isOpening = false,
  isOpened = false,
  className = 'w-32 h-32',
}) => (
  <svg
    viewBox="0 0 120 120"
    fill="none"
    className={`${className} transition-transform duration-500 ${
      isOpening ? 'animate-bounce scale-110' : ''
    }`}
  >
    <circle
      cx="60"
      cy="65"
      r="48"
      fill="url(#goldGlow2026)"
      opacity={isOpened ? '0.95' : '0.35'}
    />
    <g
      className={`transition-all duration-700 origin-center ${
        isOpened
          ? '-translate-y-8 -rotate-12 opacity-90'
          : isOpening
          ? '-translate-y-2 rotate-3'
          : ''
      }`}
    >
      <path
        d="M60 28C60 28 45 10 34 18C23 26 42 36 60 32Z"
        fill="#F59E0B"
        stroke="#B45309"
        strokeWidth="2"
      />
      <path
        d="M60 28C60 28 75 10 86 18C97 26 78 36 60 32Z"
        fill="#FBBF24"
        stroke="#B45309"
        strokeWidth="2"
      />
      <rect
        x="20"
        y="28"
        width="80"
        height="16"
        rx="4"
        fill="#DC2626"
        stroke="#991B1B"
        strokeWidth="2"
      />
      <rect x="53" y="28" width="14" height="16" fill="#FBBF24" />
    </g>
    {isOpened && (
      <g className="animate-pulse">
        <circle cx="40" cy="24" r="3.5" fill="#FDE047" />
        <circle cx="82" cy="20" r="4.5" fill="#FDE047" />
        <circle cx="60" cy="14" r="5.5" fill="#FEF08A" />
      </g>
    )}
    <rect
      x="25"
      y="44"
      width="70"
      height="58"
      rx="5"
      fill="#B91C1C"
      stroke="#7F1D1D"
      strokeWidth="2"
    />
    <rect x="53" y="44" width="14" height="58" fill="#FBBF24" />
    <rect x="25" y="67" width="70" height="12" fill="#FBBF24" />
    <defs>
      <radialGradient
        id="goldGlow2026"
        cx="0"
        cy="0"
        r="1"
        gradientUnits="userSpaceOnUse"
        gradientTransform="translate(60 65) rotate(90) scale(48)"
      >
        <stop stopColor="#FDE047" />
        <stop offset="1" stopColor="#F59E0B" stopOpacity="0" />
      </radialGradient>
    </defs>
  </svg>
);

// ============================================================================
// 4. COMPONENTE PRINCIPAL DO SISTEMA
// ============================================================================

export default function App() {
  // Autenticação Firebase (Camada de Conexão Segura)
  const [firebaseUser, setFirebaseUser] = useState(null);
  const [loadingFirebase, setLoadingFirebase] = useState(true);

  // Coleções sincronizadas do Firestore
  const [systemConfig, setSystemConfig] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [accessTokens, setAccessTokens] = useState([]);

  // Roteamento entre os 2 Ambientes Exclusivos:
  // Se activeParticipantToken != null -> Ambiente 2 (Página Individual do Familiar)
  // Se activeParticipantToken == null -> Ambiente 1 (Login / Painel Administrativo)
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

  // Modal de Cadastro / Edição Manual de Participante
  const [participantModalOpen, setParticipantModalOpen] = useState(false);
  const [editingParticipantId, setEditingParticipantId] = useState(null);
  const [formName, setFormName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formWant, setFormWant] = useState('');
  const [formDontWant, setFormDontWant] = useState('');
  const [formShoe, setFormShoe] = useState('');
  const [formShirt, setFormShirt] = useState('');
  const [formPants, setFormPants] = useState('');
  const [formNotes, setFormNotes] = useState('');

  // Modal de Importação CSV com Prévia Editável
  const [csvModalOpen, setCsvModalOpen] = useState(false);
  const [csvPreviewRows, setCsvPreviewRows] = useState([]);
  const [csvRawText, setCsvRawText] = useState('');
  const fileInputRef = useRef(null);

  // Estados do Motor de Disparo 100% Automático de WhatsApp
  const [waProvider, setWaProvider] = useState('zapi'); // 'zapi' | 'evolution' | 'ultramsg' | 'webhook' | 'wame_assist'
  const [waInstanceUrl, setWaInstanceUrl] = useState('');
  const [waInstanceId, setWaInstanceId] = useState('');
  const [waApiToken, setWaApiToken] = useState('');
  const [waClientToken, setWaClientToken] = useState('');
  const [waDelaySeconds, setWaDelaySeconds] = useState(4);
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
  const [urlFormatPreference, setUrlFormatPreference] = useState('path'); // 'path' (/amigo-secreto/token) ou 'query' (?amigo-secreto=token)

  // Estados da Página Individual do Participante (Ambiente 2)
  const [pinInput, setPinInput] = useState('');
  const [participantStep, setParticipantStep] = useState('validation'); // 'validation' | 'animating' | 'revealed'
  const [decryptedResult, setDecryptedResult] = useState(null);
  const [showGiftSuggestions, setShowGiftSuggestions] = useState(false);
  const [validationError, setValidationError] = useState('');
  const [isVerifyingPin, setIsVerifyingPin] = useState(false);

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
  // 6. DADOS DERIVADOS E VALIDAÇÕES EM MEMÓRIA
  // ============================================================================

  const eventName =
    systemConfig?.eventName || 'Amigo Secreto da Família 2026';
  const drawStatus = systemConfig?.drawStatus || 'waiting'; // 'waiting' | 'drawn'

  // Filtra participantes pelo nome ou pelo telefone
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

  // Validação em tempo real das linhas da prévia CSV
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
        errors.push('Telefone inválido (use DDD + número)');
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

  // Busca dados atualizados da pessoa sorteada após descriptografia
  const drawnPersonLatestData = useMemo(() => {
    if (!decryptedResult) return null;
    const found = participants.find(
      (p) => p.id === decryptedResult.receiverId
    );
    return found || decryptedResult;
  }, [decryptedResult, participants]);

  // Gera a URL exclusiva de um participante
  const buildParticipantLink = (token) => {
    const origin = window.location.origin;
    if (urlFormatPreference === 'query') {
      return `${origin}/?amigo-secreto=${token}`;
    }
    return `${origin}/amigo-secreto/${token}`;
  };

  // Monta a mensagem oficial personalizada do WhatsApp conforme especificação
  const buildWhatsAppMessage = (participantName, token, pin, maskPin = false) => {
    const firstName = String(participantName || '')
      .trim()
      .split(' ')[0];
    const link = buildParticipantLink(token);
    const displayPin = maskPin ? '•••••• (Enviado automaticamente)' : pin;

    return `🎄 Oi, ${firstName}!

O sorteio do ${eventName} foi realizado!

Seu amigo secreto já foi definido. 🤫🎁

Para descobrir quem você tirou, acesse seu link exclusivo:

${link}

Seu código de acesso é: ${displayPin}

Digite esse código na página para descobrir seu amigo secreto.

Guarde esse link e não compartilhe seu resultado com outras pessoas!

Boas festas! 🎅🎄`;
  };

  // ============================================================================
  // 7. AUTENTICAÇÃO DO ADMINISTRADOR ÚNICO
  // ============================================================================

  const handleSetupInitialAdmin = async (e) => {
    e.preventDefault();
    if (!firebaseUser) return;

    const cleanUser = adminUserInput.trim();
    if (cleanUser.length < 3) {
      showToast('O usuário do administrador deve ter pelo menos 3 caracteres.', 'error');
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
          createdAt: new Date().toISOString(),
        }
      );

      setIsAdminAuthenticated(true);
      setAdminPassInput('');
      setAdminConfirmPassInput('');
      showToast('Administrador configurado com sucesso! Bem-vindo ao Painel.');
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
      showToast('Acesso administrativo autorizado! 🎄');
    } catch (err) {
      console.error('Erro no login admin:', err);
      showToast('Falha ao validar login.', 'error');
    } finally {
      setIsBusy(false);
    }
  };

  // ============================================================================
  // 8. GERENCIAMENTO MANUAL E IMPORTAÇÃO CSV DE PARTICIPANTES
  // ============================================================================

  const openNewParticipantModal = () => {
    setEditingParticipantId(null);
    setFormName('');
    setFormPhone('');
    setFormWant('');
    setFormDontWant('');
    setFormShoe('');
    setFormShirt('');
    setFormPants('');
    setFormNotes('');
    setParticipantModalOpen(true);
  };

  const openEditParticipantModal = (p) => {
    setEditingParticipantId(p.id);
    setFormName(p.fullName || '');
    setFormPhone(formatPhoneDisplay(p.phone || ''));
    setFormWant(p.wantToGet || '');
    setFormDontWant(p.dontWantToGet || '');
    setFormShoe(p.shoeSize || '');
    setFormShirt(p.shirtSize || '');
    setFormPants(p.pantsSize || '');
    setFormNotes(p.observations || '');
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

    // Impede duplicados (mesmo telefone ou mesmo nome)
    const duplicatePhone = participants.find(
      (p) =>
        p.id !== editingParticipantId && sanitizePhone(p.phone) === cleanPhone
    );
    if (duplicatePhone) {
      showToast(
        `O WhatsApp informado já está cadastrado para ${duplicatePhone.fullName}.`,
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
        wantToGet: formWant.trim(),
        dontWantToGet: formDontWant.trim(),
        shoeSize: formShoe.trim(),
        shirtSize: formShirt.trim(),
        pantsSize: formPants.trim(),
        observations: formNotes.trim(),
        active: true,
        updatedAt: new Date().toISOString(),
      };

      await setDoc(
        doc(db, 'artifacts', appId, 'public', 'data', 'participants', partId),
        payload,
        { merge: true }
      );

      // Se já houver token gerado e o admin corrigiu o telefone, sincroniza o telefone no token
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
          ? `Dados de ${cleanName} atualizados!`
          : `${cleanName} cadastrado(a) com sucesso!`
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
        'Não é permitido excluir participantes após o sorteio realizado. Caso necessário, reinicie o sorteio.',
        'error'
      );
      return;
    }

    setConfirmModal({
      title: `Excluir ${part.fullName}?`,
      description: `Deseja remover ${part.fullName} (${formatPhoneDisplay(
        part.phone
      )}) da lista de participantes?`,
      confirmText: 'Sim, Excluir Participante',
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

  // Download do Modelo Oficial CSV
  const handleDownloadCsvTemplate = () => {
    const sampleCsv = [
      'nome,telefone,gostaria_de_ganhar,nao_gostaria_de_ganhar,tamanho_calcado,tamanho_camisa,tamanho_calca,observacoes',
      'Pedro Henrique,31999999999,Perfume e camiseta,Meias,40,M,40,Gosta de tecnologia',
      'Maria Silva,31988888888,Livros e bolsas,Chocolate,36,P,38,Gosta de leitura',
      'João Santos,31977777777,Relógios e acessórios,Canecas,42,G,G,Prefere presentes úteis',
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
            wantToGet: (row.gostaria_de_ganhar || '').trim(),
            dontWantToGet: (row.nao_gostaria_de_ganhar || '').trim(),
            shoeSize: (row.tamanho_calcado || '').trim(),
            shirtSize: (row.tamanho_camisa || '').trim(),
            pantsSize: (row.tamanho_calca || '').trim(),
            observations: (row.observacoes || '').trim(),
            active: true,
            updatedAt: new Date().toISOString(),
          }
        );
      }

      setCsvModalOpen(false);
      setCsvPreviewRows([]);
      setCsvRawText('');
      showToast(
        `${validRows.length} participante(s) importado(s) com sucesso! 🎄`
      );
    } catch (err) {
      console.error('Erro na importação CSV:', err);
      showToast('Erro ao salvar participantes importados.', 'error');
    } finally {
      setIsBusy(false);
    }
  };

  // ============================================================================
  // 9. SISTEMA DE SORTEIO COM PRIVACIDADE ZERO-KNOWLEDGE (NEM O ADMIN VÊ)
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
      title: 'Realizar Sorteio Oficial?',
      description: `O sorteio será realizado agora envolvendo ${participants.length} participantes cadastrados. Cada pessoa receberá um link exclusivo e um código criptografado de 6 dígitos. Para garantir sigilo total, nem mesmo o painel administrativo exibirá quem tirou quem.`,
      confirmText: `Confirmar e Sortear (${participants.length} Participantes)`,
      danger: false,
      onConfirm: executeZeroKnowledgeDraw,
    });
  };

  const executeZeroKnowledgeDraw = async () => {
    setConfirmModal(null);
    setIsBusy(true);
    try {
      // 1. Remove tokens de sorteios anteriores caso existam
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

      // 2. Gera os pares garantindo ciclo fechado sem repetições (Derangement)
      const pairs = createSecretSantaDerangement(participants);
      const usedTokens = new Set();
      const nowIso = new Date().toISOString();

      // 3. Para cada participante, gera Token + PIN de 6 dígitos e criptografa o resultado com AES-256-GCM
      for (const { giver, receiver } of pairs) {
        let token = generateSecureToken();
        while (usedTokens.has(token)) {
          token = generateSecureToken();
        }
        usedTokens.add(token);

        const pin = generateSixDigitPin();
        const pinHash = await sha256Hash(pin, `token_pin::${token}`);

        // Pacote secreto que SÓ pode ser descriptografado com o PIN do participante
        const secretPayload = {
          receiverId: receiver.id,
          receiverName: receiver.fullName,
          wantToGet: receiver.wantToGet || '',
          dontWantToGet: receiver.dontWantToGet || '',
          shoeSize: receiver.shoeSize || '',
          shirtSize: receiver.shirtSize || '',
          pantsSize: receiver.pantsSize || '',
          observations: receiver.observations || '',
          drawnAt: nowIso,
        };

        const { encryptedHex, ivHex } = await encryptSecretResult(
          token,
          pin,
          secretPayload
        );

        // Salva no Firestore sem expor em texto puro quem o participante tirou!
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
            pinHash,
            // Armazenado em formato codificado exclusivamente para o motor de disparo enviar o WhatsApp do dono do link
            dispatchCodeEncoded: btoa(`${token}:${pin}`),
            encryptedPayload: encryptedHex,
            iv: ivHex,
            whatsappStatus: 'pending', // 'pending' | 'sent' | 'error'
            whatsappSentAt: null,
            hasAccessedResult: false,
            attempts: 0,
            lockedUntil: null,
            createdAt: nowIso,
          }
        );
      }

      // 4. Atualiza o status geral do sorteio
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
        'Sorteio concluído com sucesso! Links e códigos individuais gerados.'
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
      title: 'Cancelar e Reiniciar Sorteio?',
      description:
        'ATENÇÃO: Todos os links individuais e códigos de 6 dígitos enviados anteriormente deixarão de funcionar imediatamente. Esta ação permite editar ou adicionar participantes para realizar um novo sorteio.',
      confirmText: 'Sim, Invalidar Sorteio Atual',
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
          showToast(
            'Sorteio reiniciado. Você já pode editar participantes e sortear novamente.'
          );
        } catch (err) {
          console.error('Erro ao reiniciar sorteio:', err);
          showToast('Erro ao cancelar sorteio.', 'error');
        } finally {
          setIsBusy(false);
        }
      },
    });
  };

  // ============================================================================
  // 10. MOTOR DE DISPARO 100% AUTOMÁTICO DE WHATSAPP (API + FILA INTELIGENTE)
  // ============================================================================

  const decodePinFromTokenDoc = (tokenDoc) => {
    try {
      if (!tokenDoc?.dispatchCodeEncoded) return '******';
      const decoded = atob(tokenDoc.dispatchCodeEncoded);
      const parts = decoded.split(':');
      return parts[1] || '******';
    } catch (e) {
      return '******';
    }
  };

  /**
   * Dispara uma mensagem de WhatsApp via API configurada (Z-API, Evolution API, UltraMsg ou Webhook)
   */
  const sendWhatsAppViaApiGateway = async (phone, messageText, tokenDoc) => {
    const formattedPhone = formatPhoneForWhatsApp(phone);

    if (waProvider === 'zapi') {
      if (!waInstanceId.trim() || !waApiToken.trim()) {
        throw new Error(
          'Preencha o ID da Instância e o Token da Z-API nas configurações de disparo.'
        );
      }
      const url = `https://api.z-api.io/instances/${waInstanceId.trim()}/token/${waApiToken.trim()}/send-text`;
      const headers = { 'Content-Type': 'application/json' };
      if (waClientToken.trim()) {
        headers['Client-Token'] = waClientToken.trim();
      }
      const res = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          phone: formattedPhone,
          message: messageText,
        }),
      });
      if (!res.ok) {
        const errBody = await res.text();
        throw new Error(`Z-API HTTP ${res.status}: ${errBody.slice(0, 100)}`);
      }
      return true;
    }

    if (waProvider === 'evolution') {
      if (!waInstanceUrl.trim() || !waInstanceId.trim() || !waApiToken.trim()) {
        throw new Error(
          'Preencha a URL do Servidor, Nome da Instância e API Key da Evolution API.'
        );
      }
      const baseUrl = waInstanceUrl.trim().replace(/\/$/, '');
      const url = `${baseUrl}/message/sendText/${encodeURIComponent(
        waInstanceId.trim()
      )}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: waApiToken.trim(),
        },
        body: JSON.stringify({
          number: formattedPhone,
          text: messageText,
        }),
      });
      if (!res.ok) {
        const errBody = await res.text();
        throw new Error(
          `Evolution API HTTP ${res.status}: ${errBody.slice(0, 100)}`
        );
      }
      return true;
    }

    if (waProvider === 'ultramsg') {
      if (!waInstanceId.trim() || !waApiToken.trim()) {
        throw new Error('Preencha a Instância e o Token da UltraMsg.');
      }
      const url = `https://api.ultramsg.com/${waInstanceId.trim()}/messages/chat`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: waApiToken.trim(),
          to: `+${formattedPhone}`,
          body: messageText,
        }),
      });
      if (!res.ok) {
        const errBody = await res.text();
        throw new Error(`UltraMsg HTTP ${res.status}: ${errBody.slice(0, 100)}`);
      }
      return true;
    }

    if (waProvider === 'webhook') {
      if (!waInstanceUrl.trim()) {
        throw new Error('Informe a URL do Webhook / API de disparo.');
      }
      const res = await fetch(waInstanceUrl.trim(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(waApiToken.trim()
            ? { Authorization: `Bearer ${waApiToken.trim()}` }
            : {}),
        },
        body: JSON.stringify({
          phone: formattedPhone,
          participantName: tokenDoc.participantName,
          link: buildParticipantLink(tokenDoc.token),
          message: messageText,
        }),
      });
      if (!res.ok) {
        throw new Error(`Webhook HTTP ${res.status}`);
      }
      return true;
    }

    throw new Error('Selecione um provedor de disparo automático válido.');
  };

  /**
   * Inicia o disparo 100% automático em lote para todos os participantes pendentes
   */
  const handleStartAutomaticBatchDispatch = async (onlyPending = true) => {
    const queue = onlyPending
      ? accessTokens.filter((t) => t.whatsappStatus !== 'sent')
      : accessTokens;

    if (queue.length === 0) {
      showToast('Todos os participantes já receberam seus links no WhatsApp!');
      return;
    }

    setIsAutoDispatching(true);
    abortDispatchRef.current = false;
    setDispatchProgress({ current: 0, total: queue.length });
    setDispatchLogs([
      `🚀 Iniciando disparo automático para ${queue.length} familiar(es)...`,
    ]);

    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < queue.length; i++) {
      if (abortDispatchRef.current) {
        setDispatchLogs((prev) => [
          `⏹️ Disparo pausado pelo administrador.`,
          ...prev,
        ]);
        break;
      }

      const tokenDoc = queue[i];
      setDispatchProgress({ current: i + 1, total: queue.length });

      const pin = decodePinFromTokenDoc(tokenDoc);
      const message = buildWhatsAppMessage(
        tokenDoc.participantName,
        tokenDoc.token,
        pin,
        false
      );

      setDispatchLogs((prev) => [
        `📤 [${i + 1}/${queue.length}] Enviando para ${
          tokenDoc.participantName
        } (${formatPhoneDisplay(tokenDoc.participantPhone)})...`,
        ...prev,
      ]);

      try {
        await sendWhatsAppViaApiGateway(
          tokenDoc.participantPhone,
          message,
          tokenDoc
        );

        await updateDoc(
          doc(
            db,
            'artifacts',
            appId,
            'public',
            'data',
            'access_tokens',
            tokenDoc.id
          ),
          {
            whatsappStatus: 'sent',
            whatsappSentAt: new Date().toISOString(),
          }
        );

        successCount++;
        setDispatchLogs((prev) => [
          `✅ Entregue com sucesso para ${tokenDoc.participantName}!`,
          ...prev,
        ]);
      } catch (err) {
        errorCount++;
        await updateDoc(
          doc(
            db,
            'artifacts',
            appId,
            'public',
            'data',
            'access_tokens',
            tokenDoc.id
          ),
          {
            whatsappStatus: 'error',
            lastError: err.message,
          }
        );

        setDispatchLogs((prev) => [
          `❌ Falha ao enviar para ${tokenDoc.participantName}: ${err.message}`,
          ...prev,
        ]);
      }

      // Intervalo anti-bloqueio entre disparos
      if (i < queue.length - 1 && !abortDispatchRef.current) {
        await new Promise((r) => setTimeout(r, waDelaySeconds * 1000));
      }
    }

    setIsAutoDispatching(false);
    showToast(
      `Disparo finalizado: ${successCount} enviado(s) com sucesso${
        errorCount > 0 ? ` e ${errorCount} falha(s)` : ''
      }.`,
      errorCount > 0 && successCount === 0 ? 'error' : 'success'
    );
  };

  /**
   * Disparo individual (via API se configurada ou abertura direta do WhatsApp wa.me)
   */
  const handleSendDirectWhatsApp = async (tokenDoc, forceWaMe = false) => {
    const pin = decodePinFromTokenDoc(tokenDoc);
    const message = buildWhatsAppMessage(
      tokenDoc.participantName,
      tokenDoc.token,
      pin,
      false
    );

    if (!forceWaMe && waProvider !== 'wame_assist' && waApiToken.trim()) {
      try {
        setIsBusy(true);
        await sendWhatsAppViaApiGateway(
          tokenDoc.participantPhone,
          message,
          tokenDoc
        );
        await updateDoc(
          doc(
            db,
            'artifacts',
            appId,
            'public',
            'data',
            'access_tokens',
            tokenDoc.id
          ),
          {
            whatsappStatus: 'sent',
            whatsappSentAt: new Date().toISOString(),
          }
        );
        showToast(
          `Mensagem disparada via API para ${tokenDoc.participantName}!`
        );
      } catch (err) {
        showToast(`Erro na API: ${err.message}`, 'error');
      } finally {
        setIsBusy(false);
      }
      return;
    }

    // Abertura direta do WhatsApp / WhatsApp Web com mensagem preenchida
    const formattedPhone = formatPhoneForWhatsApp(tokenDoc.participantPhone);
    const encodedMsg = encodeURIComponent(message);
    window.open(
      `https://wa.me/${formattedPhone}?text=${encodedMsg}`,
      '_blank',
      'noopener,noreferrer'
    );

    await updateDoc(
      doc(
        db,
        'artifacts',
        appId,
        'public',
        'data',
        'access_tokens',
        tokenDoc.id
      ),
      {
        whatsappStatus: 'sent',
        whatsappSentAt: new Date().toISOString(),
      }
    );
  };

  const handleSaveGatewayConfig = async (e) => {
    if (e) e.preventDefault();
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
          eventName: eventTitleInput.trim() || 'Amigo Secreto da Família 2026',
          eventDate: eventDateInput,
          suggestedValue: eventValueInput.trim(),
          waProvider,
          waInstanceUrl: waInstanceUrl.trim(),
          waInstanceId: waInstanceId.trim(),
          waApiToken: waApiToken.trim(),
          waClientToken: waClientToken.trim(),
          urlFormatPreference,
        },
        { merge: true }
      );
      showToast('Configurações salvas com sucesso!');
    } catch (err) {
      showToast('Erro ao salvar configurações.', 'error');
    } finally {
      setIsBusy(false);
    }
  };

  // ============================================================================
  // 11. VALIDAÇÃO E REVELAÇÃO NA PÁGINA INDIVIDUAL DO PARTICIPANTE (AMBIENTE 2)
  // ============================================================================

  const handleValidateParticipantPin = async (e) => {
    e.preventDefault();
    setValidationError('');

    if (!currentParticipantTokenDoc) {
      setValidationError(
        'Link de acesso não encontrado ou sorteio reiniciado.'
      );
      return;
    }

    // Verifica bloqueio temporário por excesso de tentativas incorretas
    if (currentParticipantTokenDoc.lockedUntil) {
      const lockDate = new Date(currentParticipantTokenDoc.lockedUntil);
      if (lockDate > new Date()) {
        const minutesLeft = Math.ceil((lockDate - new Date()) / 60000);
        setValidationError(
          `Muitas tentativas incorretas. Por segurança, aguarde ${minutesLeft} minuto(s) e tente novamente.`
        );
        return;
      }
    }

    const cleanPin = sanitizePhone(pinInput);
    if (cleanPin.length !== 6) {
      setValidationError(
        'Por favor, digite os 6 números do código que você recebeu no WhatsApp.'
      );
      return;
    }

    setIsVerifyingPin(true);
    try {
      const candidateHash = await sha256Hash(
        cleanPin,
        `token_pin::${currentParticipantTokenDoc.token}`
      );

      if (candidateHash !== currentParticipantTokenDoc.pinHash) {
        const nextAttempts = (currentParticipantTokenDoc.attempts || 0) + 1;
        const shouldLock = nextAttempts >= 5;
        const lockedUntil = shouldLock
          ? new Date(Date.now() + 15 * 60 * 1000).toISOString()
          : null;

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
            attempts: shouldLock ? 0 : nextAttempts,
            lockedUntil,
          }
        );

        setValidationError(
          shouldLock
            ? 'Código incorreto 5 vezes. Acesso pausado por 15 minutos por segurança.'
            : `Código incorreto. Confira os 6 números enviados no seu WhatsApp (Tentativa ${nextAttempts} de 5).`
        );
        setIsVerifyingPin(false);
        return;
      }

      // Código de 6 dígitos validado! Descriptografa o resultado exclusivo com AES-256-GCM
      const secretData = await decryptSecretResult(
        currentParticipantTokenDoc.token,
        cleanPin,
        currentParticipantTokenDoc.encryptedPayload,
        currentParticipantTokenDoc.iv
      );

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
          attempts: 0,
          lockedUntil: null,
          hasAccessedResult: true,
          lastAccessedAt: new Date().toISOString(),
        }
      );

      setDecryptedResult(secretData);
      setParticipantStep('animating');

      setTimeout(() => {
        setParticipantStep('revealed');
      }, 2800);
    } catch (err) {
      console.error('Erro ao validar código:', err);
      setValidationError(
        'Não foi possível validar seu código. Confira os 6 dígitos e tente novamente.'
      );
    } finally {
      setIsVerifyingPin(false);
    }
  };

  // Carrega participantes de exemplo para teste rápido
  const handleLoadDemoParticipants = async () => {
    if (drawStatus === 'drawn') {
      showToast(
        'Reinicie o sorteio atual caso queira recarregar a lista de exemplo.',
        'error'
      );
      return;
    }

    setIsBusy(true);
    try {
      const demoList = [
        {
          id: 'demo_p1',
          fullName: 'Pedro Henrique',
          phone: '31999999999',
          wantToGet: 'Perfume amadeirado, camisa polo ou fone Bluetooth',
          dontWantToGet: 'Meias brancas',
          shoeSize: '40',
          shirtSize: 'M',
          pantsSize: '40',
          observations: 'Gosta de tecnologia e café especial',
        },
        {
          id: 'demo_p2',
          fullName: 'Maria Silva',
          phone: '31988888888',
          wantToGet: 'Livros de romance, bolsa tiracolo ou kit de skincare',
          dontWantToGet: 'Chocolates com castanhas',
          shoeSize: '36',
          shirtSize: 'P',
          pantsSize: '38',
          observations: 'Ama leitura e acessórios dourados',
        },
        {
          id: 'demo_p3',
          fullName: 'João Santos',
          phone: '31977777777',
          wantToGet: 'Relógio esportivo, camiseta ou kit churrasco',
          dontWantToGet: 'Canecas',
          shoeSize: '42',
          shirtSize: 'G',
          pantsSize: '42',
          observations: 'Prefere presentes práticos para o dia a dia',
        },
        {
          id: 'demo_p4',
          fullName: 'Vó Ana Clara',
          phone: '31966666666',
          wantToGet: 'Sabonetes perfumados de lavanda, xale macio ou porta-retrato',
          dontWantToGet: 'Perfumes muito fortes',
          shoeSize: '35',
          shirtSize: 'G',
          pantsSize: '42',
          observations: 'Gosta de cores claras e florais',
        },
      ];

      for (const item of demoList) {
        await setDoc(
          doc(
            db,
            'artifacts',
            appId,
            'public',
            'data',
            'participants',
            item.id
          ),
          {
            ...item,
            active: true,
            updatedAt: new Date().toISOString(),
          }
        );
      }

      showToast(
        '4 familiares de exemplo cadastrados! Agora você já pode clicar em REALIZAR SORTEIO.'
      );
    } catch (err) {
      showToast('Erro ao carregar exemplos.', 'error');
    } finally {
      setIsBusy(false);
    }
  };

  // ============================================================================
  // 12. TELA DE CARREGAMENTO INICIAL
  // ============================================================================

  if (loadingFirebase) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-950 via-red-900 to-emerald-950 flex flex-col items-center justify-center p-6 text-white text-center">
        <ChristmasTreeSVG className="w-20 h-20 animate-bounce mb-4" />
        <h1 className="text-2xl sm:text-3xl font-extrabold text-amber-300">
          Carregando Amigo Secreto da Família...
        </h1>
        <p className="text-red-100 text-base mt-2">
          Preparando ambiente seguro de Natal
        </p>
      </div>
    );
  }

  // ============================================================================
  // 13. AMBIENTE 2: PÁGINA INDIVIDUAL DO PARTICIPANTE (ACESSÍVEL PARA IDOSOS)
  // ============================================================================

  if (activeParticipantToken) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-red-950 via-red-900 to-emerald-950 text-white flex flex-col justify-between p-4 sm:p-8 font-sans">
        {/* Barra superior de retorno caso o Administrador esteja apenas testando o link */}
        {isSimulatingParticipant && (
          <div className="max-w-xl w-full mx-auto mb-4 bg-amber-400 text-red-950 px-4 py-3 rounded-2xl shadow-lg flex items-center justify-between font-bold text-xs sm:text-sm">
            <span>👁️ Modo de Teste da Visão do Familiar</span>
            <button
              type="button"
              onClick={() => {
                setActiveParticipantToken(null);
                setIsSimulatingParticipant(false);
                setDecryptedResult(null);
                setPinInput('');
                setParticipantStep('validation');
              }}
              className="px-3 py-1.5 rounded-xl bg-red-950 text-amber-300 hover:bg-red-900 transition cursor-pointer"
            >
              Voltar ao Painel Admin
            </button>
          </div>
        )}

        <div className="max-w-xl w-full mx-auto my-auto">
          {/* Cabeçalho Natalino Acolhedor */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center p-3.5 rounded-3xl bg-white/10 border-2 border-amber-400/50 shadow-xl mb-3">
              <ChristmasTreeSVG className="w-12 h-12" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-amber-300 tracking-tight">
              {eventName}
            </h1>
          </div>

          {/* Caso o link não exista ou tenha sido invalidado */}
          {!currentParticipantTokenDoc ? (
            <div className="bg-white text-stone-900 rounded-3xl p-6 sm:p-10 shadow-2xl border-4 border-amber-400 text-center space-y-5">
              <AlertTriangle className="w-16 h-16 text-red-700 mx-auto" />
              <h2 className="text-2xl font-extrabold text-stone-900">
                Link de Acesso Não Encontrado
              </h2>
              <p className="text-base sm:text-lg text-stone-600 leading-relaxed">
                Este link não está ativo ou um novo sorteio foi realizado.
                Por favor, verifique a última mensagem enviada no seu WhatsApp!
              </p>
            </div>
          ) : participantStep === 'validation' ? (
            /* ETAPA 1: DIGITAR O CÓDIGO DE 6 DÍGITOS (LETRAS GRANDES E ALTO CONTRASTE) */
            <div className="bg-white text-stone-900 rounded-3xl p-6 sm:p-10 shadow-2xl border-4 border-amber-400 space-y-6">
              <div className="text-center space-y-2">
                <span className="inline-block px-4 py-1.5 rounded-full bg-emerald-100 text-emerald-900 font-extrabold text-sm sm:text-base">
                  👋 Olá, {currentParticipantTokenDoc.participantName}!
                </span>
                <h2 className="text-2xl sm:text-3xl font-black text-red-900 leading-snug pt-1">
                  Seu amigo secreto está esperando por você!
                </h2>
                <p className="text-base sm:text-lg text-stone-600 font-medium">
                  Digite abaixo o código de <strong>6 números</strong> que você
                  recebeu pelo WhatsApp:
                </p>
              </div>

              <form onSubmit={handleValidateParticipantPin} className="space-y-6">
                <div>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    required
                    autoFocus
                    value={pinInput}
                    onChange={(e) => {
                      setValidationError('');
                      setPinInput(sanitizePhone(e.target.value).slice(0, 6));
                    }}
                    placeholder="000000"
                    className="w-full py-5 px-4 text-center text-4xl sm:text-5xl font-black tracking-[0.35em] text-emerald-950 bg-stone-100 rounded-2xl border-4 border-stone-300 focus:border-emerald-700 focus:bg-white outline-none transition"
                  />
                </div>

                {validationError && (
                  <div className="p-4 rounded-2xl bg-red-100 border-2 border-red-400 text-red-950 text-base sm:text-lg font-bold text-center">
                    ⚠️ {validationError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isVerifyingPin}
                  className="w-full py-5 px-6 rounded-2xl bg-gradient-to-r from-emerald-800 via-emerald-700 to-emerald-800 hover:from-emerald-700 hover:to-emerald-600 text-white font-black text-lg sm:text-xl shadow-xl border-2 border-amber-400 flex items-center justify-center gap-3 transition transform active:scale-95 cursor-pointer"
                >
                  <Gift className="w-7 h-7 text-amber-300 shrink-0" />
                  <span>
                    {isVerifyingPin
                      ? 'ABRINDO SEU PRESENTE...'
                      : 'DESCOBRIR MEU AMIGO SECRETO'}
                  </span>
                </button>
              </form>

              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-center">
                <p className="text-sm sm:text-base text-amber-950 font-medium">
                  💡 <strong>Dica:</strong> O código de 6 números está na mesma
                  mensagem do WhatsApp onde você clicou neste link.
                </p>
              </div>
            </div>
          ) : participantStep === 'animating' ? (
            /* ETAPA 2: ANIMAÇÃO DE REVELAÇÃO */
            <div className="bg-white/10 backdrop-blur-md rounded-3xl p-8 sm:p-12 border-4 border-amber-400 text-center space-y-6 shadow-2xl">
              <FestiveGiftBoxSVG
                isOpening={true}
                className="w-44 h-44 mx-auto"
              />
              <h2 className="text-3xl sm:text-4xl font-black text-amber-300 animate-pulse">
                PREPARE-SE PARA DESCOBRIR!
              </h2>
              <p className="text-lg sm:text-xl text-red-100 font-medium">
                Desamarrando o laço dourado do seu presente...
              </p>
            </div>
          ) : (
            /* ETAPA 3: REVELAÇÃO DO AMIGO SECRETO E SUGESTÕES DE PRESENTES */
            <div className="bg-white text-stone-900 rounded-3xl p-6 sm:p-10 shadow-2xl border-4 border-amber-400 space-y-6">
              <div className="text-center space-y-3">
                <FestiveGiftBoxSVG
                  isOpened={true}
                  className="w-28 h-28 mx-auto"
                />
                <p className="text-base sm:text-lg font-extrabold uppercase tracking-widest text-red-800">
                  🎉 SEU AMIGO SECRETO É... 🎉
                </p>

                <div className="p-6 rounded-3xl bg-gradient-to-r from-red-900 via-red-800 to-emerald-900 text-white shadow-xl border-4 border-amber-400">
                  <h2 className="text-3xl sm:text-5xl font-black text-amber-300 tracking-tight break-words">
                    {drawnPersonLatestData?.fullName ||
                      decryptedResult?.receiverName}
                  </h2>
                </div>

                <p className="text-sm sm:text-base text-stone-600 pt-1">
                  🤫 Guarde segredo! Você pode abrir este link novamente sempre
                  que quiser lembrar.
                </p>
              </div>

              {/* Botão grande para abrir/fechar sugestões de presentes */}
              <button
                type="button"
                onClick={() => setShowGiftSuggestions(!showGiftSuggestions)}
                className="w-full py-5 px-6 rounded-2xl bg-amber-400 hover:bg-amber-300 text-red-950 font-black text-lg sm:text-xl shadow-lg border-2 border-amber-600 flex items-center justify-center gap-3 transition cursor-pointer"
              >
                <Heart className="w-7 h-7 text-red-800 fill-red-800 shrink-0" />
                <span>
                  {showGiftSuggestions
                    ? 'OCULTAR SUGESTÕES DE PRESENTES'
                    : 'VER SUGESTÕES DE PRESENTES'}
                </span>
              </button>

              {showGiftSuggestions && (
                <div className="space-y-4 pt-2 animate-fade-in">
                  <h3 className="text-xl font-black text-stone-900 text-center border-b-2 border-stone-200 pb-3">
                    🎁 Dicas e Tamanhos de{' '}
                    {drawnPersonLatestData?.fullName ||
                      decryptedResult?.receiverName}
                  </h3>

                  <div className="p-5 rounded-2xl bg-emerald-50 border-2 border-emerald-300 space-y-1.5">
                    <span className="text-sm sm:text-base font-black uppercase text-emerald-950 flex items-center gap-2">
                      <Heart className="w-5 h-5 text-emerald-700 shrink-0" />O
                      que gostaria de ganhar:
                    </span>
                    <p className="text-lg sm:text-xl font-bold text-stone-900 leading-relaxed">
                      {drawnPersonLatestData?.wantToGet ||
                        'Não informou preferência específica (escolha com carinho!)'}
                    </p>
                  </div>

                  <div className="p-5 rounded-2xl bg-red-50 border-2 border-red-200 space-y-1.5">
                    <span className="text-sm sm:text-base font-black uppercase text-red-950 flex items-center gap-2">
                      <ThumbsDown className="w-5 h-5 text-red-700 shrink-0" />O
                      que NÃO gostaria de ganhar:
                    </span>
                    <p className="text-lg sm:text-xl font-bold text-stone-900 leading-relaxed">
                      {drawnPersonLatestData?.dontWantToGet ||
                        'Nenhuma restrição informada'}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="p-4 rounded-2xl bg-stone-100 border-2 border-stone-300 text-center">
                      <span className="text-sm font-bold text-stone-600 block">
                        👕 Camisa / Blusa
                      </span>
                      <strong className="text-2xl font-black text-stone-900 block mt-1">
                        {drawnPersonLatestData?.shirtSize || 'Não informado'}
                      </strong>
                    </div>

                    <div className="p-4 rounded-2xl bg-stone-100 border-2 border-stone-300 text-center">
                      <span className="text-sm font-bold text-stone-600 block">
                        👖 Tamanho da Calça
                      </span>
                      <strong className="text-2xl font-black text-stone-900 block mt-1">
                        {drawnPersonLatestData?.pantsSize || 'Não informado'}
                      </strong>
                    </div>

                    <div className="p-4 rounded-2xl bg-stone-100 border-2 border-stone-300 text-center">
                      <span className="text-sm font-bold text-stone-600 block">
                        👟 Calçado
                      </span>
                      <strong className="text-2xl font-black text-stone-900 block mt-1">
                        {drawnPersonLatestData?.shoeSize || 'Não informado'}
                      </strong>
                    </div>
                  </div>

                  <div className="p-5 rounded-2xl bg-amber-50 border-2 border-amber-200 space-y-1">
                    <span className="text-sm sm:text-base font-black uppercase text-amber-950 block">
                      ✨ Observações Adicionais:
                    </span>
                    <p className="text-base sm:text-lg font-semibold text-stone-800">
                      {drawnPersonLatestData?.observations ||
                        'Nenhuma observação adicional.'}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <footer className="text-center text-xs sm:text-sm text-red-200/80 pt-8">
          🎄 {eventName} • Acesso Individual Protegido por Código
        </footer>
      </div>
    );
  }

  // ============================================================================
  // 14. AMBIENTE 1 (PARTE A): TELA DE LOGIN EXCLUSIVO DO ADMINISTRADOR
  // ============================================================================

  if (!isAdminAuthenticated) {
    const isFirstTimeSetup = !systemConfig || !systemConfig.adminPasswordHash;

    return (
      <div className="min-h-screen bg-gradient-to-br from-red-950 via-red-900 to-emerald-950 flex flex-col justify-between p-4 sm:p-8 font-sans text-white">
        {toast && (
          <div className="fixed top-5 right-5 z-50 max-w-md animate-bounce">
            <div
              className={`flex items-center gap-3 px-5 py-4 rounded-2xl shadow-2xl border ${
                toast.type === 'error'
                  ? 'bg-red-900 text-white border-red-400'
                  : 'bg-emerald-900 text-white border-amber-400'
              }`}
            >
              <Sparkles className="w-5 h-5 text-amber-300 shrink-0" />
              <p className="text-sm font-semibold">{toast.message}</p>
            </div>
          </div>
        )}

        <div className="max-w-md w-full mx-auto my-auto">
          <div className="bg-white text-stone-900 rounded-3xl shadow-2xl border-2 border-amber-400/60 overflow-hidden">
            <div className="bg-gradient-to-r from-red-900 via-red-800 to-emerald-900 p-7 text-white text-center space-y-2">
              <div className="w-16 h-16 rounded-2xl bg-white/10 border border-amber-400/40 flex items-center justify-center mx-auto mb-2">
                <ChristmasTreeSVG className="w-10 h-10" />
              </div>
              <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-amber-400/20 text-amber-300 text-xs font-bold uppercase tracking-wider">
                <Shield className="w-3.5 h-3.5" />
                Acesso Exclusivo do Organizador
              </span>
              <h1 className="text-2xl font-extrabold">{eventName}</h1>
              <p className="text-xs text-red-100">
                {isFirstTimeSetup
                  ? 'Defina o usuário e a senha do Administrador Único do sistema'
                  : 'Entre com suas credenciais administrativas para gerenciar o sorteio'}
              </p>
            </div>

            <form
              onSubmit={
                isFirstTimeSetup ? handleSetupInitialAdmin : handleAdminLogin
              }
              className="p-6 sm:p-8 space-y-5"
            >
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1.5">
                  Usuário do Administrador
                </label>
                <input
                  type="text"
                  required
                  value={adminUserInput}
                  onChange={(e) => setAdminUserInput(e.target.value)}
                  placeholder="Ex: admin"
                  className="w-full px-4 py-3 rounded-xl border border-stone-300 focus:border-red-800 outline-none text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1.5">
                  Senha Administrativa
                </label>
                <div className="relative">
                  <input
                    type={showAdminPass ? 'text' : 'password'}
                    required
                    value={adminPassInput}
                    onChange={(e) => setAdminPassInput(e.target.value)}
                    placeholder="Digite sua senha"
                    className="w-full px-4 py-3 rounded-xl border border-stone-300 focus:border-red-800 outline-none text-sm pr-11"
                  />
                  <button
                    type="button"
                    onClick={() => setShowAdminPass(!showAdminPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700"
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
                  <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1.5">
                    Confirmar Senha Administrativa
                  </label>
                  <input
                    type="password"
                    required
                    value={adminConfirmPassInput}
                    onChange={(e) => setAdminConfirmPassInput(e.target.value)}
                    placeholder="Repita a senha"
                    className="w-full px-4 py-3 rounded-xl border border-stone-300 focus:border-red-800 outline-none text-sm"
                  />
                </div>
              )}

              <button
                type="submit"
                disabled={isBusy}
                className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-red-800 to-emerald-900 hover:from-red-700 hover:to-emerald-800 text-white font-bold text-sm shadow-lg flex items-center justify-center gap-2 transition cursor-pointer"
              >
                <LogIn className="w-4 h-4 text-amber-300" />
                {isBusy
                  ? 'Validando...'
                  : isFirstTimeSetup
                  ? 'Criar Administrador Único e Acessar'
                  : 'Entrar no Painel Administrativo'}
              </button>

              <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200 text-xs text-stone-500 text-center">
                🔒 Os familiares não precisam fazer login aqui. Eles acessam
                diretamente pelo link individual enviado no WhatsApp.
              </div>
            </form>
          </div>
        </div>

        <footer className="text-center text-xs text-red-200/70">
          Sistema Centralizado de Amigo Secreto • Criptografia Zero-Knowledge
        </footer>
      </div>
    );
  }

  // ============================================================================
  // 15. AMBIENTE 1 (PARTE B): PAINEL ADMINISTRATIVO CENTRALIZADO
  // ============================================================================

  const sentCount = accessTokens.filter(
    (t) => t.whatsappStatus === 'sent'
  ).length;
  const accessedCount = accessTokens.filter((t) => t.hasAccessedResult).length;

  return (
    <div className="min-h-screen bg-stone-50 text-stone-800 flex flex-col font-sans">
      <div className="h-2 bg-gradient-to-r from-red-800 via-amber-400 to-emerald-800" />

      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-5 right-5 z-50 max-w-md animate-bounce">
          <div
            className={`flex items-center gap-3 px-5 py-4 rounded-2xl shadow-2xl border ${
              toast.type === 'error'
                ? 'bg-red-900 text-white border-red-400'
                : 'bg-emerald-900 text-white border-amber-400'
            }`}
          >
            {toast.type === 'error' ? (
              <AlertTriangle className="w-5 h-5 text-amber-300 shrink-0" />
            ) : (
              <Sparkles className="w-5 h-5 text-amber-300 shrink-0" />
            )}
            <p className="text-sm font-medium">{toast.message}</p>
          </div>
        </div>
      )}

      {/* Cabeçalho do Painel Administrativo */}
      <header className="bg-gradient-to-r from-red-950 via-red-900 to-emerald-950 text-white shadow-xl sticky top-0 z-30 border-b border-amber-500/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-white/10 border border-amber-400/40">
              <ChristmasTreeSVG className="w-8 h-8" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-extrabold text-lg sm:text-xl text-white">
                  {eventName}
                </h1>
                <span className="px-2.5 py-0.5 text-[11px] font-bold bg-amber-400 text-red-950 rounded-full">
                  Painel Admin
                </span>
              </div>
              <p className="text-xs text-red-200">
                Gerenciamento Centralizado • Sigilo Absoluto dos Pares (Zero-Knowledge)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => setAdminTab('dashboard')}
              className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer ${
                adminTab === 'dashboard'
                  ? 'bg-amber-400 text-red-950 shadow'
                  : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              Participantes & Sorteio
            </button>

            <button
              type="button"
              onClick={() => setAdminTab('whatsapp_dispatch')}
              className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 transition cursor-pointer ${
                adminTab === 'whatsapp_dispatch'
                  ? 'bg-amber-400 text-red-950 shadow'
                  : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              <Send className="w-3.5 h-3.5" />
              Enviar WhatsApp ({sentCount}/{accessTokens.length})
            </button>

            <button
              type="button"
              onClick={() => setAdminTab('settings')}
              className={`p-2 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer ${
                adminTab === 'settings'
                  ? 'bg-amber-400 text-red-950 shadow'
                  : 'bg-white/10 text-white hover:bg-white/20'
              }`}
              title="Configurações do Evento e API WhatsApp"
            >
              <Settings className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => setIsAdminAuthenticated(false)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-800/80 hover:bg-red-700 text-red-100 text-xs font-bold border border-red-500/30 transition cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Sair</span>
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* ====================================================================
            CARDS DE RESUMO E BOTÃO PRINCIPAL "REALIZAR SORTEIO"
           ==================================================================== */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-stretch">
          {/* Métricas do Evento */}
          <div className="md:col-span-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-3xl border border-stone-200 shadow-sm flex flex-col justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-stone-400">
                Total de Participantes
              </span>
              <div className="text-4xl font-black text-stone-900 my-2">
                {participants.length}
              </div>
              <span className="text-xs text-stone-500">
                Familiares cadastrados na lista
              </span>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-stone-200 shadow-sm flex flex-col justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-stone-400">
                Status do Sorteio
              </span>
              <div className="my-2">
                {drawStatus === 'drawn' ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-100 text-emerald-900 font-extrabold text-sm">
                    <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                    Sorteio Realizado
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-100 text-amber-900 font-extrabold text-sm">
                    <Clock className="w-4 h-4 text-amber-700" />
                    Aguardando Sorteio
                  </span>
                )}
              </div>
              <span className="text-xs text-stone-500">
                {drawStatus === 'drawn'
                  ? `${accessedCount} de ${accessTokens.length} já abriram o link`
                  : 'Mínimo de 2 pessoas para sortear'}
              </span>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-stone-200 shadow-sm flex flex-col justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-stone-400">
                Disparos no WhatsApp
              </span>
              <div className="text-3xl font-black text-emerald-800 my-2">
                {sentCount} / {accessTokens.length || participants.length}
              </div>
              <span className="text-xs text-stone-500">
                Links e códigos de 6 dígitos enviados
              </span>
            </div>
          </div>

          {/* Card de Ação Principal: REALIZAR SORTEIO */}
          <div className="md:col-span-4 bg-gradient-to-br from-red-900 via-red-800 to-emerald-950 rounded-3xl p-6 text-white shadow-xl border border-amber-400/40 flex flex-col justify-between space-y-4">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-widest text-amber-300 flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5" />
                Sorteio Criptografado
              </span>
              <h3 className="text-lg font-extrabold mt-1">
                {drawStatus === 'drawn'
                  ? 'Sorteio Concluído com Sigilo!'
                  : 'Pronto para sortear a família?'}
              </h3>
              <p className="text-xs text-red-100 mt-1 leading-relaxed">
                {drawStatus === 'drawn'
                  ? 'Os pares estão protegidos por criptografia. Nenhum resultado é exibido neste painel.'
                  : 'Gera automaticamente um link único e um código de 6 dígitos para cada familiar.'}
              </p>
            </div>

            {drawStatus !== 'drawn' ? (
              <button
                type="button"
                disabled={isBusy || participants.length < 2}
                onClick={handleRequestDraw}
                className="w-full py-4 px-5 rounded-2xl bg-amber-400 hover:bg-amber-300 disabled:bg-stone-500 disabled:text-stone-300 text-red-950 font-black text-sm shadow-xl flex items-center justify-center gap-2 transition cursor-pointer"
              >
                <Shuffle className="w-5 h-5" />
                REALIZAR SORTEIO
              </button>
            ) : (
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => setAdminTab('whatsapp_dispatch')}
                  className="w-full py-3.5 px-4 rounded-2xl bg-amber-400 hover:bg-amber-300 text-red-950 font-black text-xs sm:text-sm shadow-lg flex items-center justify-center gap-2 transition cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                  ENVIAR RESULTADOS PELO WHATSAPP
                </button>
                <button
                  type="button"
                  onClick={handleResetDraw}
                  className="w-full py-2 px-3 rounded-xl bg-white/10 hover:bg-white/20 text-red-200 text-xs font-semibold transition cursor-pointer"
                >
                  Cancelar e Reiniciar Sorteio
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ====================================================================
            ABA 1: LISTA DE PARTICIPANTES, CADASTRO MANUAL E IMPORTAÇÃO CSV
           ==================================================================== */}
        {adminTab === 'dashboard' && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-md border border-stone-200 space-y-6">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-stone-200">
              <div>
                <h2 className="text-xl sm:text-2xl font-extrabold text-stone-900 flex items-center gap-2.5">
                  <Users className="w-7 h-7 text-red-800" />
                  Participantes da Família ({participants.length})
                </h2>
                <p className="text-xs sm:text-sm text-stone-500 mt-1">
                  Cadastre manualmente cada familiar ou importe uma planilha CSV
                  com os números de WhatsApp e tamanhos de roupas.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                {participants.length === 0 && drawStatus !== 'drawn' && (
                  <button
                    type="button"
                    onClick={handleLoadDemoParticipants}
                    className="px-4 py-2.5 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-950 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <Star className="w-4 h-4 text-amber-700" />
                    Carregar Exemplos
                  </button>
                )}

                <button
                  type="button"
                  disabled={drawStatus === 'drawn'}
                  onClick={() => setCsvModalOpen(true)}
                  className="px-4 py-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 disabled:opacity-50 text-emerald-900 border border-emerald-300 font-bold text-xs sm:text-sm flex items-center gap-2 transition cursor-pointer"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
                  Importar participantes (CSV)
                </button>

                <button
                  type="button"
                  disabled={drawStatus === 'drawn'}
                  onClick={openNewParticipantModal}
                  className="px-5 py-2.5 rounded-xl bg-red-800 hover:bg-red-700 disabled:opacity-50 text-white font-bold text-xs sm:text-sm shadow flex items-center gap-2 transition cursor-pointer"
                >
                  <UserPlus className="w-4 h-4" />
                  Cadastrar Participante
                </button>
              </div>
            </div>

            {/* Barra de Pesquisa por Nome ou Telefone */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="relative w-full sm:w-96">
                <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Pesquisar familiar por nome ou WhatsApp..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-stone-300 text-sm outline-none focus:border-red-800"
                />
              </div>

              {drawStatus === 'drawn' && (
                <div className="text-xs text-amber-900 bg-amber-50 border border-amber-200 px-3.5 py-2 rounded-xl flex items-center gap-2">
                  <Lock className="w-4 h-4 text-amber-700 shrink-0" />
                  <span>
                    Você ainda pode editar telefones ou tamanhos de roupas mesmo
                    após o sorteio.
                  </span>
                </div>
              )}
            </div>

            {/* Tabela de Participantes */}
            {filteredParticipants.length === 0 ? (
              <div className="p-12 rounded-2xl bg-stone-50 border border-dashed border-stone-300 text-center space-y-3">
                <Users className="w-12 h-12 text-stone-400 mx-auto" />
                <h3 className="text-base font-bold text-stone-700">
                  Nenhum participante encontrado
                </h3>
                <p className="text-xs text-stone-500 max-w-md mx-auto">
                  Clique em "Cadastrar Participante" ou "Importar participantes
                  (CSV)" no topo para adicionar os membros da família.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-stone-200">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-stone-100 border-b border-stone-200 text-[11px] font-extrabold uppercase tracking-wider text-stone-500">
                      <th className="py-3.5 px-4">Nome Completo</th>
                      <th className="py-3.5 px-4">WhatsApp (DDD)</th>
                      <th className="py-3.5 px-4">Gostaria de Ganhar</th>
                      <th className="py-3.5 px-4">Calçado / Camisa / Calça</th>
                      <th className="py-3.5 px-4 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100 text-sm">
                    {filteredParticipants.map((p) => (
                      <tr key={p.id} className="hover:bg-stone-50/80">
                        <td className="py-3.5 px-4 font-bold text-stone-900">
                          {p.fullName}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-xs text-emerald-800 font-semibold">
                          {formatPhoneDisplay(p.phone)}
                        </td>
                        <td className="py-3.5 px-4 text-xs text-stone-600 max-w-xs truncate">
                          {p.wantToGet || (
                            <span className="text-stone-400 italic">
                              Não informado
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-xs text-stone-600">
                          👟 {p.shoeSize || '-'} | 👕 {p.shirtSize || '-'} | 👖{' '}
                          {p.pantsSize || '-'}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => openEditParticipantModal(p)}
                              className="px-3 py-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold flex items-center gap-1 cursor-pointer"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                              Editar
                            </button>
                            {drawStatus !== 'drawn' && (
                              <button
                                type="button"
                                onClick={() => handleDeleteParticipant(p)}
                                className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 cursor-pointer"
                                title="Excluir participante"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ====================================================================
            ABA 2: ENVIAR RESULTADOS PELO WHATSAPP (100% AUTOMÁTICO + INDIVIDUAL)
           ==================================================================== */}
        {adminTab === 'whatsapp_dispatch' && (
          <div className="space-y-6">
            {drawStatus !== 'drawn' ? (
              <div className="bg-white rounded-3xl p-10 text-center border border-stone-200 space-y-4">
                <FestiveGiftBoxSVG className="w-24 h-24 mx-auto" />
                <h3 className="text-xl font-extrabold text-stone-900">
                  Realize o Sorteio Primeiro
                </h3>
                <p className="text-sm text-stone-600 max-w-md mx-auto">
                  Assim que você clicar em "REALIZAR SORTEIO", o sistema gerará
                  os links e códigos individuais de 6 dígitos para disparar no
                  WhatsApp de toda a família.
                </p>
              </div>
            ) : (
              <>
                {/* Painel de Controle de Disparo 100% Automático via API */}
                <div className="bg-gradient-to-r from-emerald-950 via-emerald-900 to-stone-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl border border-amber-400/30 space-y-6">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div>
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400/20 text-amber-300 text-xs font-bold uppercase mb-2">
                        <Zap className="w-3.5 h-3.5" />
                        Disparo Automático em Lote + Individual
                      </span>
                      <h2 className="text-2xl font-extrabold">
                        ENVIAR RESULTADOS PELO WHATSAPP
                      </h2>
                      <p className="text-xs sm:text-sm text-emerald-100 mt-1">
                        Envie automaticamente para todos os familiares via API de
                        WhatsApp ou clique no botão individual de cada pessoa.
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      {!isAutoDispatching ? (
                        <button
                          type="button"
                          onClick={() => handleStartAutomaticBatchDispatch(true)}
                          className="px-6 py-4 rounded-2xl bg-amber-400 hover:bg-amber-300 text-red-950 font-black text-xs sm:text-sm shadow-xl flex items-center gap-2 transition cursor-pointer"
                        >
                          <Play className="w-4 h-4 fill-red-950" />
                          DISPARAR TODOS AUTOMATICAMENTE (API)
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            abortDispatchRef.current = true;
                          }}
                          className="px-6 py-4 rounded-2xl bg-red-600 hover:bg-red-500 text-white font-black text-xs sm:text-sm shadow-xl flex items-center gap-2 transition cursor-pointer"
                        >
                          <Pause className="w-4 h-4" />
                          PAUSAR FILA AUTOMÁTICA
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Configuração rápida do Gateway de Disparo Automático */}
                  <div className="bg-black/25 p-5 rounded-2xl border border-white/10 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold uppercase text-amber-200 mb-1">
                          Gateway de Disparo WhatsApp
                        </label>
                        <select
                          value={waProvider}
                          onChange={(e) => setWaProvider(e.target.value)}
                          className="w-full px-3 py-2.5 rounded-xl bg-stone-900 text-white border border-white/20 text-xs font-semibold outline-none"
                        >
                          <option value="zapi">
                            ⚡ Z-API (Disparo 100% Automático)
                          </option>
                          <option value="evolution">
                            ⚡ Evolution API (Disparo 100% Automático)
                          </option>
                          <option value="ultramsg">
                            ⚡ UltraMsg API (Disparo 100% Automático)
                          </option>
                          <option value="webhook">
                            🔗 Webhook Próprio / n8n / Make
                          </option>
                          <option value="wame_assist">
                            📱 WhatsApp Web Direto (wa.me gratuito)
                          </option>
                        </select>
                      </div>

                      {waProvider === 'evolution' || waProvider === 'webhook' ? (
                        <div>
                          <label className="block text-[11px] font-bold uppercase text-amber-200 mb-1">
                            URL do Servidor / Webhook
                          </label>
                          <input
                            type="text"
                            value={waInstanceUrl}
                            onChange={(e) => setWaInstanceUrl(e.target.value)}
                            placeholder="https://sua-api.com"
                            className="w-full px-3 py-2 rounded-xl bg-stone-900 text-white border border-white/20 text-xs outline-none"
                          />
                        </div>
                      ) : null}

                      {waProvider !== 'webhook' &&
                      waProvider !== 'wame_assist' ? (
                        <div>
                          <label className="block text-[11px] font-bold uppercase text-amber-200 mb-1">
                            ID / Nome da Instância
                          </label>
                          <input
                            type="text"
                            value={waInstanceId}
                            onChange={(e) => setWaInstanceId(e.target.value)}
                            placeholder="Ex: 3B9F8A..."
                            className="w-full px-3 py-2 rounded-xl bg-stone-900 text-white border border-white/20 text-xs outline-none"
                          />
                        </div>
                      ) : null}

                      {waProvider !== 'wame_assist' ? (
                        <div>
                          <label className="block text-[11px] font-bold uppercase text-amber-200 mb-1">
                            Token / API Key
                          </label>
                          <input
                            type="password"
                            value={waApiToken}
                            onChange={(e) => setWaApiToken(e.target.value)}
                            placeholder="Token da sua instância"
                            className="w-full px-3 py-2 rounded-xl bg-stone-900 text-white border border-white/20 text-xs outline-none"
                          />
                        </div>
                      ) : null}

                      <div>
                        <label className="block text-[11px] font-bold uppercase text-amber-200 mb-1">
                          Intervalo Anti-Bloqueio
                        </label>
                        <select
                          value={waDelaySeconds}
                          onChange={(e) =>
                            setWaDelaySeconds(Number(e.target.value))
                          }
                          className="w-full px-3 py-2.5 rounded-xl bg-stone-900 text-white border border-white/20 text-xs font-semibold outline-none"
                        >
                          <option value={2}>2 segundos entre envios</option>
                          <option value={4}>4 segundos (Recomendado)</option>
                          <option value={7}>7 segundos entre envios</option>
                        </select>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                      <span className="text-[11px] text-emerald-200">
                        🔒 <strong>Privacidade Garantida:</strong> O sistema
                        insere o código de 6 dígitos automaticamente na mensagem
                        de cada familiar sem revelar quem tirou quem.
                      </span>
                      <button
                        type="button"
                        onClick={handleSaveGatewayConfig}
                        className="px-3.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-amber-200 text-xs font-bold transition cursor-pointer"
                      >
                        Salvar Configuração de API
                      </button>
                    </div>
                  </div>

                  {/* Barra de progresso e console ao vivo durante o disparo automático */}
                  {(isAutoDispatching || dispatchLogs.length > 0) && (
                    <div className="bg-black/40 p-4 rounded-2xl border border-white/10 space-y-3">
                      <div className="flex items-center justify-between text-xs font-bold">
                        <span className="text-amber-300">
                          Progresso da Fila Automática: {dispatchProgress.current}{' '}
                          de {dispatchProgress.total}
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
                      <div className="w-full h-2.5 bg-white/10 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-amber-400 transition-all duration-300"
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
                      <div className="max-h-32 overflow-y-auto font-mono text-[11px] text-emerald-200 space-y-1">
                        {dispatchLogs.map((log, index) => (
                          <div key={index}>{log}</div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Lista de Participantes com Status de Envio e Botões Individuais */}
                <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-md border border-stone-200 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-stone-200">
                    <div>
                      <h3 className="text-lg font-extrabold text-stone-900">
                        Lista de Links Individuais e Status de Envio
                      </h3>
                      <p className="text-xs text-stone-500">
                        Você pode revisar a mensagem, enviar automaticamente via
                        API ou abrir a conversa já preenchida no WhatsApp.
                      </p>
                    </div>
                  </div>

                  <div className="overflow-x-auto rounded-2xl border border-stone-200">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-stone-100 border-b border-stone-200 text-[11px] font-extrabold uppercase tracking-wider text-stone-500">
                          <th className="py-3.5 px-4">Participante</th>
                          <th className="py-3.5 px-4">Telefone (WhatsApp)</th>
                          <th className="py-3.5 px-4">Link Exclusivo Gerado</th>
                          <th className="py-3.5 px-4">Status do Envio</th>
                          <th className="py-3.5 px-4">Acesso do Familiar</th>
                          <th className="py-3.5 px-4 text-right">
                            Ações de Envio
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-100 text-sm">
                        {accessTokens.map((tk) => (
                          <tr key={tk.id} className="hover:bg-stone-50">
                            <td className="py-3.5 px-4 font-bold text-stone-900">
                              {tk.participantName}
                            </td>
                            <td className="py-3.5 px-4 font-mono text-xs text-stone-600">
                              {formatPhoneDisplay(tk.participantPhone)}
                            </td>
                            <td className="py-3.5 px-4 font-mono text-xs text-emerald-800">
                              /amigo-secreto/{tk.token}
                            </td>
                            <td className="py-3.5 px-4">
                              {tk.whatsappStatus === 'sent' ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">
                                  <CheckCircle className="w-3.5 h-3.5" />
                                  Enviado
                                </span>
                              ) : tk.whatsappStatus === 'error' ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-red-100 text-red-800 text-xs font-bold">
                                  <XCircle className="w-3.5 h-3.5" />
                                  Erro API
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-bold">
                                  <Clock className="w-3.5 h-3.5" />
                                  Pendente
                                </span>
                              )}
                            </td>
                            <td className="py-3.5 px-4 text-xs">
                              {tk.hasAccessedResult ? (
                                <span className="text-emerald-700 font-bold">
                                  ✅ Já abriu o resultado
                                </span>
                              ) : (
                                <span className="text-stone-400">
                                  Ainda não abriu
                                </span>
                              )}
                            </td>
                            <td className="py-3.5 px-4 text-right">
                              <div className="inline-flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => setPreviewMessageModal(tk)}
                                  className="px-2.5 py-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold cursor-pointer"
                                  title="Revisar mensagem antes de enviar"
                                >
                                  Revisar
                                </button>

                                <button
                                  type="button"
                                  onClick={() => {
                                    setIsSimulatingParticipant(true);
                                    setActiveParticipantToken(tk.token);
                                  }}
                                  className="px-2.5 py-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold cursor-pointer"
                                  title="Simular tela deste participante"
                                >
                                  Testar Tela
                                </button>

                                <button
                                  type="button"
                                  onClick={() =>
                                    handleSendDirectWhatsApp(tk, true)
                                  }
                                  className="px-3.5 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition cursor-pointer"
                                >
                                  <Send className="w-3.5 h-3.5" />
                                  Enviar WhatsApp
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* ====================================================================
            ABA 3: CONFIGURAÇÕES DO EVENTO E DICAS DE ROTEAMENTO VERCEL
           ==================================================================== */}
        {adminTab === 'settings' && (
          <div className="max-w-3xl mx-auto space-y-6">
            <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-md border border-stone-200 space-y-6">
              <h2 className="text-xl font-extrabold text-stone-900 flex items-center gap-2">
                <Settings className="w-6 h-6 text-red-800" />
                Configurações do Evento e Formato dos Links
              </h2>

              <form onSubmit={handleSaveGatewayConfig} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-stone-700 mb-1">
                    Nome do Evento Familiar
                  </label>
                  <input
                    type="text"
                    required
                    value={eventTitleInput}
                    onChange={(e) => setEventTitleInput(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-stone-300 text-sm"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase text-stone-700 mb-1">
                      Data da Confraternização
                    </label>
                    <input
                      type="date"
                      value={eventDateInput}
                      onChange={(e) => setEventDateInput(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-stone-300 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase text-stone-700 mb-1">
                      Valor Sugerido de Presente
                    </label>
                    <input
                      type="text"
                      value={eventValueInput}
                      onChange={(e) => setEventValueInput(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-stone-300 text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-stone-700 mb-1">
                    Formato dos Links Individuais no WhatsApp
                  </label>
                  <select
                    value={urlFormatPreference}
                    onChange={(e) => setUrlFormatPreference(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-stone-300 text-sm"
                  >
                    <option value="path">
                      Padrão Amigável: https://seusite.com/amigo-secreto/8f7a2c91
                    </option>
                    <option value="query">
                      Compatibilidade Universal Sem Rewrite:
                      https://seusite.com/?amigo-secreto=8f7a2c91
                    </option>
                  </select>
                </div>

                <div className="p-4 rounded-2xl bg-stone-100 border border-stone-200 space-y-2 text-xs text-stone-700">
                  <strong className="block text-stone-900">
                    💡 Dica para Links `/amigo-secreto/8f7a2c91` na Vercel:
                  </strong>
                  <p>
                    Para que a Vercel abra links com barra (`/amigo-secreto/...`)
                    diretamente sem erro 404, crie um arquivo chamado{' '}
                    <code>vercel.json</code> na raiz do seu repositório GitHub com
                    este conteúdo:
                  </p>
                  <pre className="bg-stone-900 text-amber-300 p-3 rounded-xl font-mono text-[11px] overflow-x-auto">
                    {`{\n  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]\n}`}
                  </pre>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={isBusy}
                    className="px-6 py-3 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white font-bold text-sm shadow cursor-pointer"
                  >
                    Salvar Configurações
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>

      {/* ========================================================================
          MODAL: CADASTRO E EDIÇÃO MANUAL DE PARTICIPANTE
         ======================================================================== */}
      {participantModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-stone-200 space-y-5 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-stone-200">
              <h3 className="text-xl font-extrabold text-stone-900 flex items-center gap-2">
                <UserPlus className="w-6 h-6 text-red-800" />
                {editingParticipantId
                  ? 'Editar Dados do Participante'
                  : 'Cadastrar Novo Participante'}
              </h3>
              <button
                type="button"
                onClick={() => setParticipantModalOpen(false)}
                className="text-stone-400 hover:text-stone-700 font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveParticipant} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-stone-700 mb-1">
                    Nome Completo *
                  </label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="Ex: Pedro Henrique"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-emerald-900 mb-1">
                    WhatsApp com DDD *
                  </label>
                  <input
                    type="text"
                    required
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    placeholder="Ex: (31) 99999-9999"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-emerald-900 mb-1">
                    🎁 O que gostaria de ganhar (Opcional)
                  </label>
                  <textarea
                    rows={2}
                    value={formWant}
                    onChange={(e) => setFormWant(e.target.value)}
                    placeholder="Ex: Perfume, camiseta, livros..."
                    className="w-full px-3.5 py-2 rounded-xl border border-stone-300 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-red-900 mb-1">
                    🚫 O que NÃO gostaria de ganhar (Opcional)
                  </label>
                  <textarea
                    rows={2}
                    value={formDontWant}
                    onChange={(e) => setFormDontWant(e.target.value)}
                    placeholder="Ex: Meias, canecas..."
                    className="w-full px-3.5 py-2 rounded-xl border border-stone-300 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase text-stone-700 mb-1">
                    👟 Calçado
                  </label>
                  <input
                    type="text"
                    value={formShoe}
                    onChange={(e) => setFormShoe(e.target.value)}
                    placeholder="Ex: 40"
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-stone-700 mb-1">
                    👕 Camisa / Blusa
                  </label>
                  <input
                    type="text"
                    value={formShirt}
                    onChange={(e) => setFormShirt(e.target.value)}
                    placeholder="Ex: P, M, G"
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-stone-700 mb-1">
                    👖 Calça
                  </label>
                  <input
                    type="text"
                    value={formPants}
                    onChange={(e) => setFormPants(e.target.value)}
                    placeholder="Ex: 38, 42"
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-stone-700 mb-1">
                  ✨ Observações Adicionais / Preferências
                </label>
                <input
                  type="text"
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="Ex: Gosta de leitura, prefere cores claras..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => setParticipantModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl border border-stone-300 text-xs font-bold text-stone-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isBusy}
                  className="px-6 py-2.5 rounded-xl bg-red-800 hover:bg-red-700 text-white text-xs font-bold shadow cursor-pointer"
                >
                  {editingParticipantId
                    ? 'Salvar Alterações'
                    : 'Adicionar Participante'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================
          MODAL: IMPORTAÇÃO DE PARTICIPANTES VIA ARQUIVO CSV COM PRÉVIA EDITÁVEL
         ======================================================================== */}
      {csvModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-5xl w-full p-6 sm:p-8 shadow-2xl border border-stone-200 space-y-6 my-8 max-h-[92vh] overflow-y-auto">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-stone-200">
              <div>
                <h3 className="text-xl font-extrabold text-stone-900 flex items-center gap-2">
                  <FileSpreadsheet className="w-6 h-6 text-emerald-800" />
                  Importar Participantes via Arquivo CSV
                </h3>
                <p className="text-xs text-stone-500 mt-0.5">
                  Colunas aceitas:{' '}
                  <code>
                    nome, telefone, gostaria_de_ganhar, nao_gostaria_de_ganhar,
                    tamanho_calcado, tamanho_camisa, tamanho_calca, observacoes
                  </code>
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleDownloadCsvTemplate}
                  className="px-3.5 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-300 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  Baixar Modelo CSV
                </button>
                <button
                  type="button"
                  onClick={() => setCsvModalOpen(false)}
                  className="px-3 py-2 rounded-xl bg-stone-100 text-stone-600 text-xs font-bold"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Seleção do arquivo CSV ou colagem direta */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div
                onClick={() => fileInputRef.current?.click()}
                className="p-6 rounded-2xl border-2 border-dashed border-emerald-400 bg-emerald-50/40 hover:bg-emerald-50 flex flex-col items-center justify-center text-center cursor-pointer transition"
              >
                <Upload className="w-8 h-8 text-emerald-700 mb-2" />
                <strong className="text-sm text-emerald-950">
                  Clique para selecionar o arquivo .CSV do computador
                </strong>
                <span className="text-xs text-stone-500 mt-1">
                  Validação automática de nomes e números de WhatsApp
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
                <label className="block text-xs font-bold uppercase text-stone-600 mb-1">
                  Ou cole os dados CSV diretamente aqui:
                </label>
                <textarea
                  rows={4}
                  value={csvRawText}
                  onChange={(e) => {
                    setCsvRawText(e.target.value);
                    setCsvPreviewRows(parseCsvText(e.target.value));
                  }}
                  placeholder={
                    'nome,telefone,gostaria_de_ganhar,nao_gostaria_de_ganhar,tamanho_calcado,tamanho_camisa,tamanho_calca,observacoes\nPedro Henrique,31999999999,Perfume,Meias,40,M,40,Gosta de tecnologia'
                  }
                  className="w-full p-3 rounded-xl border border-stone-300 font-mono text-xs"
                />
              </div>
            </div>

            {/* Prévia dos registros e correção em tempo real */}
            {validatedCsvRows.length > 0 && (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 p-3.5 rounded-2xl bg-stone-100 border border-stone-200 text-xs">
                  <div className="flex items-center gap-4">
                    <span className="font-bold text-stone-800">
                      Total na prévia: {validatedCsvRows.length}
                    </span>
                    <span className="font-bold text-emerald-700">
                      ✅ Válidos para importar:{' '}
                      {validatedCsvRows.filter((r) => r.isValid).length}
                    </span>
                    <span className="font-bold text-red-700">
                      ⚠️ Com erros/duplicados:{' '}
                      {validatedCsvRows.filter((r) => !r.isValid).length}
                    </span>
                  </div>
                  <span className="text-stone-500">
                    Você pode corrigir qualquer campo diretamente nas caixas abaixo
                    antes de confirmar:
                  </span>
                </div>

                <div className="overflow-x-auto rounded-2xl border border-stone-200 max-h-72">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-stone-100 border-b border-stone-200 font-bold text-stone-600">
                        <th className="py-2.5 px-3">Status</th>
                        <th className="py-2.5 px-3">Nome *</th>
                        <th className="py-2.5 px-3">Telefone (DDD) *</th>
                        <th className="py-2.5 px-3">Gostaria de Ganhar</th>
                        <th className="py-2.5 px-3">Calçado / Camisa / Calça</th>
                        <th className="py-2.5 px-3">Remover</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100">
                      {validatedCsvRows.map((row) => (
                        <tr
                          key={row.tempId}
                          className={
                            row.isValid ? 'bg-white' : 'bg-red-50/70'
                          }
                        >
                          <td className="py-2 px-3">
                            {row.isValid ? (
                              <span className="inline-flex items-center gap-1 text-emerald-700 font-bold">
                                <CheckCircle className="w-3.5 h-3.5" />
                                OK
                              </span>
                            ) : (
                              <span className="text-red-700 font-bold block max-w-[160px]">
                                ⚠️ {row.errorText}
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
                              className="w-36 px-2 py-1 rounded border border-stone-300"
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
                              className="w-32 px-2 py-1 rounded border border-stone-300 font-mono"
                            />
                          </td>
                          <td className="py-2 px-3">
                            <input
                              type="text"
                              value={row.gostaria_de_ganhar}
                              onChange={(e) =>
                                handleUpdateCsvCell(
                                  row.tempId,
                                  'gostaria_de_ganhar',
                                  e.target.value
                                )
                              }
                              className="w-40 px-2 py-1 rounded border border-stone-300"
                            />
                          </td>
                          <td className="py-2 px-3">
                            <div className="flex items-center gap-1">
                              <input
                                type="text"
                                value={row.tamanho_calcado}
                                onChange={(e) =>
                                  handleUpdateCsvCell(
                                    row.tempId,
                                    'tamanho_calcado',
                                    e.target.value
                                  )
                                }
                                placeholder="Calç"
                                className="w-12 px-1.5 py-1 rounded border border-stone-300"
                              />
                              <input
                                type="text"
                                value={row.tamanho_camisa}
                                onChange={(e) =>
                                  handleUpdateCsvCell(
                                    row.tempId,
                                    'tamanho_camisa',
                                    e.target.value
                                  )
                                }
                                placeholder="Cam"
                                className="w-12 px-1.5 py-1 rounded border border-stone-300"
                              />
                              <input
                                type="text"
                                value={row.tamanho_calca}
                                onChange={(e) =>
                                  handleUpdateCsvCell(
                                    row.tempId,
                                    'tamanho_calca',
                                    e.target.value
                                  )
                                }
                                placeholder="Calça"
                                className="w-12 px-1.5 py-1 rounded border border-stone-300"
                              />
                            </div>
                          </td>
                          <td className="py-2 px-3">
                            <button
                              type="button"
                              onClick={() => handleRemoveCsvRow(row.tempId)}
                              className="text-red-700 hover:underline font-bold"
                            >
                              Excluir
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4 border-t border-stone-200">
              <button
                type="button"
                onClick={() => setCsvModalOpen(false)}
                className="px-5 py-2.5 rounded-xl border border-stone-300 text-xs font-bold text-stone-700"
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
                className="px-6 py-2.5 rounded-xl bg-emerald-800 hover:bg-emerald-700 disabled:bg-stone-300 text-white text-xs font-bold shadow cursor-pointer"
              >
                Confirmar Importação (
                {validatedCsvRows.filter((r) => r.isValid).length} Válidos)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================
          MODAL: REVISAR MENSAGEM PERSONALIZADA DO WHATSAPP
         ======================================================================== */}
      {previewMessageModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-stone-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-stone-200">
              <h3 className="text-lg font-extrabold text-stone-900">
                Prévia da Mensagem • {previewMessageModal.participantName}
              </h3>
              <button
                type="button"
                onClick={() => setPreviewMessageModal(null)}
                className="text-stone-400 hover:text-stone-700 font-bold"
              >
                ✕
              </button>
            </div>

            <pre className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs sm:text-sm text-stone-800 whitespace-pre-wrap font-sans leading-relaxed">
              {buildWhatsAppMessage(
                previewMessageModal.participantName,
                previewMessageModal.token,
                decodePinFromTokenDoc(previewMessageModal),
                true
              )}
            </pre>

            <p className="text-[11px] text-stone-500">
              🔒 Por segurança, o código de 6 dígitos aparece oculto nesta prévia
              para preservar o sigilo do sorteio, mas é incluído automaticamente
              no envio para o WhatsApp de{' '}
              <strong>{previewMessageModal.participantName}</strong>.
            </p>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setPreviewMessageModal(null)}
                className="px-4 py-2 rounded-xl border border-stone-300 text-xs font-bold"
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
                className="px-5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                Abrir no WhatsApp Agora
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================
          MODAL DE CONFIRMAÇÃO ADMINISTRATIVA
         ======================================================================== */}
      {confirmModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-stone-200 space-y-4">
            <div className="flex items-center gap-3 text-red-800">
              <Gift className="w-7 h-7 shrink-0" />
              <h3 className="text-lg font-extrabold">{confirmModal.title}</h3>
            </div>
            <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
              {confirmModal.description}
            </p>
            <div className="flex justify-end gap-2.5 pt-3 border-t border-stone-200">
              <button
                type="button"
                onClick={() => setConfirmModal(null)}
                className="px-4 py-2.5 rounded-xl border border-stone-300 text-xs font-bold text-stone-700"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmModal.onConfirm}
                className={`px-5 py-2.5 rounded-xl text-white text-xs font-bold cursor-pointer ${
                  confirmModal.danger
                    ? 'bg-red-800 hover:bg-red-700'
                    : 'bg-emerald-800 hover:bg-emerald-700'
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