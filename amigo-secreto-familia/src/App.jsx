import React, { useState, useEffect, useMemo } from 'react';
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
  Unlock,
  Key,
  UserPlus,
  LogIn,
  LogOut,
  Copy,
  Check,
  Share2,
  Calendar,
  DollarSign,
  Heart,
  ThumbsDown,
  Shirt,
  FileText,
  AlertTriangle,
  RefreshCw,
  Eye,
  EyeOff,
  Settings,
  Trash2,
  Ban,
  CheckCircle2,
  Clock,
  Award,
  ChevronRight,
  ChevronLeft,
  Plus,
  Search,
  Info,
  HelpCircle,
  Home,
  Crown,
  Star,
  Code,
  Database,
  Server,
  UserCheck,
  UserX,
  Edit3,
  Send,
  Shuffle,
} from 'lucide-react';

// ============================================================================
// 1. INICIALIZAÇÃO DO FIREBASE E CONFIGURAÇÕES GLOBAIS
// ============================================================================
const firebaseConfig = {
  apiKey: "AIzaSyDROloG5oTL6x-mzAIUdfmldtwyMEnmNx8",
  authDomain: "amigo-secreto-familia-d3db6.firebaseapp.com",
  projectId: "amigo-secreto-familia-d3db6",
  storageBucket: "amigo-secreto-familia-d3db6.firebasestorage.app",
  messagingSenderId: "823718992830",
  appId: "1:823718992830:web:e77ce75b4adf4771abf7ef",
  measurementId: "G-JD70XVYV04"
};

const appId = "amigo-secreto-familia-2026";
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// ============================================================================
// 2. UTILITÁRIOS CRIPTOGRÁFICOS E DE SORTEIO (SHA-256 + DERANGEMENT)
// ============================================================================

/**
 * Gera um hash SHA-256 seguro utilizando a Web Crypto API com salt
 */
async function hashSecret(plainText, salt = 'natal-familia-salt-2026') {
  const normalized = `${salt}::${String(plainText).trim()}`;
  const msgBuffer = new TextEncoder().encode(normalized);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Normaliza nomes para evitar cadastros duplicados
 */
function normalizeName(str) {
  return String(str || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ');
}

/**
 * Gera um código único de convite natalino (Ex: NATAL-2026-A8F3)
 */
function generateInviteCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let suffix = '';
  for (let i = 0; i < 4; i++) {
    suffix += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `NATAL-2026-${suffix}`;
}

/**
 * Algoritmo de Sorteio (Derangement / Ciclo Hamiltoniano Aleatório)
 * Garante matematicamente:
 * 1. Ninguém tira a si mesmo.
 * 2. Cada participante tira exatamente 1 pessoa.
 * 3. Cada participante é sorteado por exatamente 1 pessoa.
 * 4. Todos os participantes ativos fazem parte de um ciclo fechado completo.
 */
function generateSecretSantaPairs(activeMembers) {
  if (!activeMembers || activeMembers.length < 2) {
    throw new Error('O sorteio exige pelo menos 2 participantes confirmados.');
  }

  // Embaralhamento Fisher-Yates com entropia criptográfica quando disponível
  const shuffled = [...activeMembers];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const randomBuffer = new Uint32Array(1);
    crypto.getRandomValues(randomBuffer);
    const j = randomBuffer[0] % (i + 1);
    const temp = shuffled[i];
    shuffled[i] = shuffled[j];
    shuffled[j] = temp;
  }

  // Cria os pares em um único ciclo fechado: shuffled[i] -> shuffled[(i + 1) % N]
  // Isso garante 100% que ninguém tire a si mesmo e todos sejam sorteados 1 única vez.
  const pairs = shuffled.map((giver, index) => {
    const receiver = shuffled[(index + 1) % shuffled.length];
    return {
      giverAccountId: giver.accountId,
      giverName: giver.memberName,
      receiverAccountId: receiver.accountId,
      receiverName: receiver.memberName,
    };
  });

  // Validação extra de integridade
  const receiversSet = new Set(pairs.map((p) => p.receiverAccountId));
  const selfDraw = pairs.some((p) => p.giverAccountId === p.receiverAccountId);
  if (selfDraw || receiversSet.size !== activeMembers.length) {
    throw new Error('Falha na validação de integridade do sorteio.');
  }

  return pairs;
}

// ============================================================================
// 3. ELEMENTOS VISUAIS NATALINOS (SVGs CUSTOMIZADOS)
// ============================================================================

const ChristmasTreeSVG = ({ className = 'w-8 h-8' }) => (
  <svg viewBox="0 0 64 64" fill="none" className={className}>
    <path d="M32 6L14 28H24L10 46H26L26 58H38V46H54L40 28H50L32 6Z" fill="#065F46" stroke="#F59E0B" strokeWidth="2.5" strokeLinejoin="round" />
    <rect x="27" y="48" width="10" height="10" rx="1" fill="#78350F" />
    <circle cx="32" cy="6" r="4" fill="#FBBF24" />
    <circle cx="26" cy="24" r="2.5" fill="#EF4444" />
    <circle cx="38" cy="32" r="2.5" fill="#FBBF24" />
    <circle cx="22" cy="40" r="2.5" fill="#EF4444" />
    <circle cx="41" cy="41" r="2.5" fill="#38BDF8" />
  </svg>
);

const FestiveGiftBoxSVG = ({ isOpening = false, isOpened = false, className = 'w-32 h-32' }) => (
  <svg
    viewBox="0 0 120 120"
    fill="none"
    className={`${className} transition-transform duration-500 ${
      isOpening ? 'animate-bounce scale-110' : ''
    }`}
  >
    {/* Brilho de fundo */}
    <circle cx="60" cy="65" r="48" fill="url(#goldGlow)" opacity={isOpened ? '0.9' : '0.35'} />
    {/* Tampa da caixa */}
    <g
      className={`transition-all duration-700 origin-center ${
        isOpened ? '-translate-y-8 -rotate-12 opacity-90' : isOpening ? '-translate-y-2 rotate-3' : ''
      }`}
    >
      {/* Laço Dourado */}
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
      <rect x="20" y="28" width="80" height="16" rx="4" fill="#DC2626" stroke="#991B1B" strokeWidth="2" />
      <rect x="53" y="28" width="14" height="16" fill="#FBBF24" />
    </g>

    {/* Estrelas saindo quando aberto */}
    {isOpened && (
      <g className="animate-pulse">
        <circle cx="40" cy="24" r="3" fill="#FDE047" />
        <circle cx="82" cy="20" r="4" fill="#FDE047" />
        <circle cx="60" cy="14" r="5" fill="#FEF08A" />
      </g>
    )}

    {/* Corpo da caixa */}
    <rect x="25" y="44" width="70" height="58" rx="5" fill="#B91C1C" stroke="#7F1D1D" strokeWidth="2" />
    <rect x="53" y="44" width="14" height="58" fill="#F59E0B" />
    <rect x="25" y="67" width="70" height="12" fill="#F59E0B" />

    <defs>
      <radialGradient id="goldGlow" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(60 65) rotate(90) scale(48)">
        <stop stopColor="#FDE047" />
        <stop offset="1" stopColor="#F59E0B" stopOpacity="0" />
      </radialGradient>
    </defs>
  </svg>
);

// ============================================================================
// 4. COMPONENTE PRINCIPAL DA APLICAÇÃO
// ============================================================================

export default function App() {
  // Estado de Autenticação Firebase (Camada de Infraestrutura)
  const [firebaseUser, setFirebaseUser] = useState(null);
  const [loadingFirebase, setLoadingFirebase] = useState(true);

  // Dados sincronizados em tempo real do Firestore
  const [accounts, setAccounts] = useState([]);
  const [groups, setGroups] = useState([]);
  const [memberships, setMemberships] = useState([]);
  const [drawResults, setDrawResults] = useState([]);

  // Estado do Usuário Logado na Aplicação e Grupo Ativo
  const [currentAccountId, setCurrentAccountId] = useState(null);
  const [activeGroupId, setActiveGroupId] = useState(null);

  // Navegação de Telas (Todas as 13 Telas do Escopo)
  // Telas:
  // 'login' (1), 'register' (2), 'create_group' (3), 'join_group' (4),
  // 'participant_home' (5), 'participant_list' (6), 'draw_animation' (7),
  // 'draw_result' (8), 'drawn_preferences' (9),
  // 'admin_dashboard' (10), 'admin_participants' (11), 'admin_results' (12), 'admin_settings' (13)
  const [currentScreen, setCurrentScreen] = useState('login');

  // Feedbacks Visuais (Toasts e Modais Customizados - Sem alert/confirm)
  const [toast, setToast] = useState(null);
  const [confirmModal, setConfirmModal] = useState(null);
  const [inspectParticipantModal, setInspectParticipantModal] = useState(null);
  const [editProfileModal, setEditProfileModal] = useState(false);
  const [recoveryModal, setRecoveryModal] = useState(false);
  const [techDocsModal, setTechDocsModal] = useState(false);

  // Estados de Formulários - Tela 1 (Login)
  const [loginName, setLoginName] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Estados de Formulários - Recuperação de Senha
  const [recoveryName, setRecoveryName] = useState('');
  const [recoveryKeyword, setRecoveryKeyword] = useState('');
  const [recoveryNewPassword, setRecoveryNewPassword] = useState('');

  // Estados de Formulários - Tela 2 (Cadastro de Participante + Preferências)
  const [regName, setRegName] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [regRecoveryWord, setRegRecoveryWord] = useState('');
  const [regInviteCode, setRegInviteCode] = useState('');
  const [regWantToGet, setRegWantToGet] = useState('');
  const [regDontWantToGet, setRegDontWantToGet] = useState('');
  const [regShoeSize, setRegShoeSize] = useState('');
  const [regShirtSize, setRegShirtSize] = useState('');
  const [regPantsSize, setRegPantsSize] = useState('');
  const [regOtherNotes, setRegOtherNotes] = useState('');

  // Estados de Formulários - Tela 3 (Criar Grupo Familiar)
  const [groupNameInput, setGroupNameInput] = useState('Amigo Secreto da Família 2026');
  const [groupAdminNameInput, setGroupAdminNameInput] = useState('');
  const [groupValueInput, setGroupValueInput] = useState('R$ 80,00 a R$ 150,00');
  const [groupDateInput, setGroupDateInput] = useState('2026-12-24');
  const [groupWelcomeInput, setGroupWelcomeInput] = useState(
    'Sejam bem-vindos ao nosso tradicional Amigo Secreto de Natal! Caprichem na lista de presentes para ajudar seu familiar!'
  );

  // Estados de Formulários - Tela 4 (Entrar em um Grupo)
  const [joinCodeInput, setJoinCodeInput] = useState('');

  // Estados de Formulários - Edição de Preferências Pessoais
  const [prefWant, setPrefWant] = useState('');
  const [prefDontWant, setPrefDontWant] = useState('');
  const [prefShoe, setPrefShoe] = useState('');
  const [prefShirt, setPrefShirt] = useState('');
  const [prefPants, setPrefPants] = useState('');
  const [prefNotes, setPrefNotes] = useState('');

  // Estados da Tela 7 & 8 (Animação de Sorteio e Revelação)
  const [animationStep, setAnimationStep] = useState(0); // 0: pronto, 1: sacudindo, 2: abrindo, 3: revelado
  const [hideResultNameOnScreen, setHideResultNameOnScreen] = useState(false);

  // Estados do Painel Admin (Telas 10, 11, 12, 13)
  const [adminShowAllResults, setAdminShowAllResults] = useState(false);
  const [adminRevealedRowIds, setAdminRevealedRowIds] = useState({});
  const [searchParticipantQuery, setSearchParticipantQuery] = useState('');
  const [copiedCode, setCopiedCode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Função auxiliar para exibir notificações amigáveis
  const showNotification = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast((prev) => (prev?.message === message ? null : prev));
    }, 4500);
  };

  // ============================================================================
  // 5. CICLO DE VIDA FIREBASE AUTH & FIRESTORE (SEGUINDO AS 3 REGRAS ESTRITAS)
  // ============================================================================

  // Passo 1: Autenticação inicial
  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (err) {
        console.error('Erro na autenticação inicial:', err);
      }
    };
    initAuth();

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user);
      setLoadingFirebase(false);
    });

    // Verifica se há código de convite na URL (?convite=NATAL-2026-XXXX)
    try {
      const params = new URLSearchParams(window.location.search);
      const urlInvite = params.get('convite');
      if (urlInvite) {
        setJoinCodeInput(urlInvite.toUpperCase());
        setRegInviteCode(urlInvite.toUpperCase());
      }
    } catch (e) {
      // Ignora erro de URL em iframes restritos
    }

    return () => unsubscribe();
  }, []);

  // Passo 2: Listeners em tempo real do Firestore após autenticação
  useEffect(() => {
    if (!firebaseUser) return;

    const accountsRef = collection(db, 'artifacts', appId, 'public', 'data', 'accounts');
    const groupsRef = collection(db, 'artifacts', appId, 'public', 'data', 'groups');
    const membershipsRef = collection(db, 'artifacts', appId, 'public', 'data', 'memberships');
    const drawResultsRef = collection(db, 'artifacts', appId, 'public', 'data', 'draw_results');

    const unsubAccounts = onSnapshot(
      accountsRef,
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setAccounts(list);
      },
      (err) => console.error('Erro ao ler contas:', err)
    );

    const unsubGroups = onSnapshot(
      groupsRef,
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setGroups(list);
      },
      (err) => console.error('Erro ao ler grupos:', err)
    );

    const unsubMemberships = onSnapshot(
      membershipsRef,
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setMemberships(list);
      },
      (err) => console.error('Erro ao ler participantes:', err)
    );

    const unsubDrawResults = onSnapshot(
      drawResultsRef,
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setDrawResults(list);
      },
      (err) => console.error('Erro ao ler resultados do sorteio:', err)
    );

    return () => {
      unsubAccounts();
      unsubGroups();
      unsubMemberships();
      unsubDrawResults();
    };
  }, [firebaseUser]);

  // ============================================================================
  // 6. SELETORES E DADOS DERIVADOS EM MEMÓRIA (CONTROLE DE ACESSO E PRIVACIDADE)
  // ============================================================================

  const currentAccount = useMemo(
    () => accounts.find((a) => a.id === currentAccountId) || null,
    [accounts, currentAccountId]
  );

  // Grupos dos quais o usuário logado faz parte
  const myMemberships = useMemo(() => {
    if (!currentAccount) return [];
    return memberships.filter((m) => m.accountId === currentAccount.id);
  }, [memberships, currentAccount]);

  const myGroups = useMemo(() => {
    const groupIds = new Set(myMemberships.map((m) => m.groupId));
    return groups.filter((g) => groupIds.has(g.id));
  }, [groups, myMemberships]);

  // Grupo familiar atualmente selecionado
  const activeGroup = useMemo(() => {
    if (!activeGroupId) return null;
    return groups.find((g) => g.id === activeGroupId) || null;
  }, [groups, activeGroupId]);

  // Minha inscrição no grupo ativo
  const myActiveMembership = useMemo(() => {
    if (!activeGroup || !currentAccount) return null;
    return (
      memberships.find(
        (m) => m.groupId === activeGroup.id && m.accountId === currentAccount.id
      ) || null
    );
  }, [memberships, activeGroup, currentAccount]);

  // Verifica estritamente se o usuário logado é o Administrador do grupo ativo
  const isGroupAdmin = useMemo(() => {
    if (!activeGroup || !currentAccount) return false;
    return (
      activeGroup.adminAccountId === currentAccount.id ||
      myActiveMembership?.role === 'admin'
    );
  }, [activeGroup, currentAccount, myActiveMembership]);

  // Todos os participantes do grupo ativo
  const groupParticipants = useMemo(() => {
    if (!activeGroup) return [];
    return memberships
      .filter((m) => m.groupId === activeGroup.id)
      .map((m) => {
        const acc = accounts.find((a) => a.id === m.accountId);
        return {
          ...m,
          memberName: acc?.fullName || m.memberName,
          preferences: acc?.preferences || {},
        };
      })
      .sort((a, b) => a.memberName.localeCompare(b.memberName, 'pt-BR'));
  }, [memberships, activeGroup, accounts]);

  // Participantes confirmados (ativos para o sorteio)
  const confirmedParticipants = useMemo(
    () => groupParticipants.filter((p) => p.status === 'confirmed'),
    [groupParticipants]
  );

  // PRIVACIDADE RIGOROSA: O participante comum só tem acesso ao seu próprio registro de sorteio
  const mySecretSantaResult = useMemo(() => {
    if (!activeGroup || !currentAccount || activeGroup.status !== 'drawn') return null;
    return (
      drawResults.find(
        (r) => r.groupId === activeGroup.id && r.giverAccountId === currentAccount.id
      ) || null
    );
  }, [drawResults, activeGroup, currentAccount]);

  // Dados e preferências exclusivas da pessoa que o participante logado tirou
  const myDrawnPersonAccount = useMemo(() => {
    if (!mySecretSantaResult) return null;
    return accounts.find((a) => a.id === mySecretSantaResult.receiverAccountId) || null;
  }, [mySecretSantaResult, accounts]);

  // Lista completa de resultados do grupo (acessível APENAS quando isGroupAdmin === true)
  const adminGroupDrawResults = useMemo(() => {
    if (!activeGroup || !isGroupAdmin) return [];
    return drawResults
      .filter((r) => r.groupId === activeGroup.id)
      .sort((a, b) => a.giverName.localeCompare(b.giverName, 'pt-BR'));
  }, [drawResults, activeGroup, isGroupAdmin]);

  // Pré-visualização do grupo ao digitar código na Tela 4 (Entrar em um Grupo)
  const previewGroupToJoin = useMemo(() => {
    const cleanCode = joinCodeInput.trim().toUpperCase();
    if (!cleanCode) return null;
    return groups.find((g) => g.code?.toUpperCase() === cleanCode) || null;
  }, [groups, joinCodeInput]);

  // Sincroniza os campos do formulário de preferências quando o usuário loga
  useEffect(() => {
    if (currentAccount) {
      const prefs = currentAccount.preferences || {};
      setPrefWant(prefs.wantToGet || '');
      setPrefDontWant(prefs.dontWantToGet || '');
      setPrefShoe(prefs.shoeSize || '');
      setPrefShirt(prefs.shirtSize || '');
      setPrefPants(prefs.pantsSize || '');
      setPrefNotes(prefs.otherNotes || '');
      setGroupAdminNameInput(currentAccount.fullName || '');
    }
  }, [currentAccount]);

  // Seleciona automaticamente o primeiro grupo do usuário se nenhum estiver ativo
  useEffect(() => {
    if (currentAccount && !activeGroupId && myGroups.length > 0) {
      setActiveGroupId(myGroups[0].id);
    }
  }, [currentAccount, activeGroupId, myGroups]);

  // ============================================================================
  // 7. AÇÕES DE AUTENTICAÇÃO, CADASTRO E RECUPERAÇÃO DE SENHA
  // ============================================================================

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!loginName.trim() || !loginPassword) {
      showNotification('Preencha seu nome e sua senha para entrar.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const normalizedInput = normalizeName(loginName);
      const foundAccount = accounts.find(
        (acc) => normalizeName(acc.fullName) === normalizedInput
      );

      if (!foundAccount) {
        showNotification(
          'Participante não encontrado. Verifique o nome digitado ou crie sua conta!',
          'error'
        );
        setIsSubmitting(false);
        return;
      }

      const hashedInput = await hashSecret(loginPassword, foundAccount.salt);
      if (hashedInput !== foundAccount.passwordHash) {
        showNotification('Senha incorreta. Tente novamente ou recupere sua senha.', 'error');
        setIsSubmitting(false);
        return;
      }

      setCurrentAccountId(foundAccount.id);
      const userGroups = memberships.filter((m) => m.accountId === foundAccount.id);

      if (joinCodeInput.trim()) {
        setCurrentScreen('join_group');
      } else if (userGroups.length > 0) {
        setActiveGroupId(userGroups[0].groupId);
        setCurrentScreen('participant_home');
      } else {
        setCurrentScreen('join_group');
      }

      showNotification(`Bem-vindo(a) de volta, ${foundAccount.fullName}! 🎄`);
    } catch (err) {
      console.error('Erro no login:', err);
      showNotification('Erro ao realizar login. Tente novamente.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!firebaseUser) return;

    const cleanName = regName.trim();
    if (cleanName.length < 3) {
      showNotification('Informe seu nome completo (mínimo 3 caracteres).', 'error');
      return;
    }
    if (regPassword.length < 4) {
      showNotification('A senha deve ter pelo menos 4 caracteres.', 'error');
      return;
    }
    if (regPassword !== regConfirmPassword) {
      showNotification('A confirmação de senha não confere.', 'error');
      return;
    }
    if (!regRecoveryWord.trim()) {
      showNotification(
        'Informe uma palavra-chave de segurança para caso precise recuperar sua senha.',
        'error'
      );
      return;
    }

    // Impede cadastros duplicados com o mesmo nome
    const normalizedNew = normalizeName(cleanName);
    const duplicate = accounts.find((a) => normalizeName(a.fullName) === normalizedNew);
    if (duplicate) {
      showNotification(
        'Já existe um participante cadastrado com este nome. Faça login ou adicione seu sobrenome.',
        'error'
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const accountId = `acc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const salt = `salt_${Date.now()}`;
      const passwordHash = await hashSecret(regPassword, salt);
      const recoveryHash = await hashSecret(normalizeName(regRecoveryWord), salt);

      const newAccount = {
        id: accountId,
        fullName: cleanName,
        normalizedName: normalizedNew,
        salt,
        passwordHash,
        recoveryHash,
        preferences: {
          wantToGet: regWantToGet.trim(),
          dontWantToGet: regDontWantToGet.trim(),
          shoeSize: regShoeSize.trim(),
          shirtSize: regShirtSize.trim(),
          pantsSize: regPantsSize.trim(),
          otherNotes: regOtherNotes.trim(),
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await setDoc(
        doc(db, 'artifacts', appId, 'public', 'data', 'accounts', accountId),
        newAccount
      );

      // Verifica se o participante já informou um código de convite no cadastro
      let joinedGroupId = null;
      if (regInviteCode.trim()) {
        const targetGroup = groups.find(
          (g) => g.code?.toUpperCase() === regInviteCode.trim().toUpperCase()
        );
        if (targetGroup && targetGroup.status === 'waiting') {
          const membershipId = `${targetGroup.id}_${accountId}`;
          await setDoc(
            doc(db, 'artifacts', appId, 'public', 'data', 'memberships', membershipId),
            {
              id: membershipId,
              groupId: targetGroup.id,
              accountId: accountId,
              memberName: cleanName,
              role: 'participant',
              status: 'confirmed',
              hasRevealed: false,
              joinedAt: new Date().toISOString(),
            }
          );
          joinedGroupId = targetGroup.id;
        }
      }

      setCurrentAccountId(accountId);
      if (joinedGroupId) {
        setActiveGroupId(joinedGroupId);
        setCurrentScreen('participant_home');
        showNotification('Cadastro concluído e entrada no grupo confirmada! 🎁');
      } else {
        setCurrentScreen('join_group');
        showNotification('Cadastro realizado com sucesso! Agora entre em um grupo ou crie o seu.');
      }
    } catch (err) {
      console.error('Erro ao cadastrar participante:', err);
      showNotification('Erro ao salvar seu cadastro. Tente novamente.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePasswordRecovery = async (e) => {
    e.preventDefault();
    if (!recoveryName.trim() || !recoveryKeyword.trim() || !recoveryNewPassword) {
      showNotification('Preencha todos os campos para redefinir sua senha.', 'error');
      return;
    }
    if (recoveryNewPassword.length < 4) {
      showNotification('A nova senha deve ter no mínimo 4 caracteres.', 'error');
      return;
    }

    const foundAccount = accounts.find(
      (a) => normalizeName(a.fullName) === normalizeName(recoveryName)
    );
    if (!foundAccount) {
      showNotification('Conta não encontrada com este nome.', 'error');
      return;
    }

    const testRecoveryHash = await hashSecret(
      normalizeName(recoveryKeyword),
      foundAccount.salt
    );
    if (testRecoveryHash !== foundAccount.recoveryHash) {
      showNotification(
        'Palavra-chave de segurança incorreta. Peça ajuda ao Administrador do grupo.',
        'error'
      );
      return;
    }

    const newPassHash = await hashSecret(recoveryNewPassword, foundAccount.salt);
    await updateDoc(
      doc(db, 'artifacts', appId, 'public', 'data', 'accounts', foundAccount.id),
      {
        passwordHash: newPassHash,
        updatedAt: new Date().toISOString(),
      }
    );

    setRecoveryModal(false);
    setRecoveryName('');
    setRecoveryKeyword('');
    setRecoveryNewPassword('');
    showNotification('Senha redefinida com sucesso! Você já pode entrar.');
  };

  const handleSavePreferences = async (e) => {
    e.preventDefault();
    if (!currentAccount) return;

    setIsSubmitting(true);
    try {
      const updatedPreferences = {
        wantToGet: prefWant.trim(),
        dontWantToGet: prefDontWant.trim(),
        shoeSize: prefShoe.trim(),
        shirtSize: prefShirt.trim(),
        pantsSize: prefPants.trim(),
        otherNotes: prefNotes.trim(),
      };

      await updateDoc(
        doc(db, 'artifacts', appId, 'public', 'data', 'accounts', currentAccount.id),
        {
          preferences: updatedPreferences,
          updatedAt: new Date().toISOString(),
        }
      );

      setEditProfileModal(false);
      showNotification('Suas preferências e tamanhos foram salvos com sucesso! 🎄');
    } catch (err) {
      console.error('Erro ao atualizar preferências:', err);
      showNotification('Não foi possível atualizar suas preferências.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogout = () => {
    setCurrentAccountId(null);
    setActiveGroupId(null);
    setLoginPassword('');
    setAdminShowAllResults(false);
    setAdminRevealedRowIds({});
    setCurrentScreen('login');
    showNotification('Você saiu da sua conta com segurança.');
  };

  // ============================================================================
  // 8. AÇÕES DE CRIAÇÃO E ENTRADA EM GRUPOS FAMILIARES
  // ============================================================================

  const handleCreateGroup = async (e) => {
    e.preventDefault();
    if (!currentAccount) return;

    if (!groupNameInput.trim()) {
      showNotification('Informe o nome do grupo familiar.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const groupId = `grp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const inviteCode = generateInviteCode();

      const newGroup = {
        id: groupId,
        code: inviteCode,
        name: groupNameInput.trim(),
        adminAccountId: currentAccount.id,
        adminName: groupAdminNameInput.trim() || currentAccount.fullName,
        suggestedValue: groupValueInput.trim() || 'Livre',
        eventDate: groupDateInput || '',
        welcomeMessage:
          groupWelcomeInput.trim() ||
          'Bem-vindos ao nosso Amigo Secreto Familiar! Preencham suas preferências de presente.',
        status: 'waiting', // 'waiting' | 'ready' | 'drawn'
        drawTimestamp: null,
        createdAt: new Date().toISOString(),
      };

      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'groups', groupId), newGroup);

      // Vincula automaticamente o Administrador como participante confirmado no grupo
      const membershipId = `${groupId}_${currentAccount.id}`;
      await setDoc(
        doc(db, 'artifacts', appId, 'public', 'data', 'memberships', membershipId),
        {
          id: membershipId,
          groupId,
          accountId: currentAccount.id,
          memberName: currentAccount.fullName,
          role: 'admin',
          status: 'confirmed',
          hasRevealed: false,
          joinedAt: new Date().toISOString(),
        }
      );

      setActiveGroupId(groupId);
      setCurrentScreen('admin_dashboard');
      showNotification(`Grupo "${newGroup.name}" criado! Código: ${inviteCode}`);
    } catch (err) {
      console.error('Erro ao criar grupo:', err);
      showNotification('Erro ao criar o grupo familiar.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleJoinGroup = async (e) => {
    if (e) e.preventDefault();
    if (!currentAccount) return;

    if (!previewGroupToJoin) {
      showNotification('Código de convite inválido ou grupo não encontrado.', 'error');
      return;
    }

    // Verifica se já está no grupo
    const existing = memberships.find(
      (m) =>
        m.groupId === previewGroupToJoin.id && m.accountId === currentAccount.id
    );
    if (existing) {
      setActiveGroupId(previewGroupToJoin.id);
      setCurrentScreen('participant_home');
      showNotification(`Você já faz parte do grupo "${previewGroupToJoin.name}"!`);
      return;
    }

    // Impede nomes duplicados dentro do mesmo grupo
    const duplicateNameInGroup = memberships.find(
      (m) =>
        m.groupId === previewGroupToJoin.id &&
        normalizeName(m.memberName) === normalizeName(currentAccount.fullName)
    );
    if (duplicateNameInGroup) {
      showNotification(
        'Já existe um participante com este mesmo nome dentro deste grupo familiar.',
        'error'
      );
      return;
    }

    // Impede entrada se o sorteio já foi realizado ou inscrições encerradas
    if (previewGroupToJoin.status !== 'waiting') {
      showNotification(
        'As inscrições para este grupo já foram encerradas ou o sorteio já foi realizado. Solicite auxílio ao administrador.',
        'error'
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const membershipId = `${previewGroupToJoin.id}_${currentAccount.id}`;
      await setDoc(
        doc(db, 'artifacts', appId, 'public', 'data', 'memberships', membershipId),
        {
          id: membershipId,
          groupId: previewGroupToJoin.id,
          accountId: currentAccount.id,
          memberName: currentAccount.fullName,
          role: 'participant',
          status: 'confirmed',
          hasRevealed: false,
          joinedAt: new Date().toISOString(),
        }
      );

      setActiveGroupId(previewGroupToJoin.id);
      setJoinCodeInput('');
      setCurrentScreen('participant_home');
      showNotification(`Você entrou no grupo "${previewGroupToJoin.name}"! 🎄`);
    } catch (err) {
      console.error('Erro ao entrar no grupo:', err);
      showNotification('Não foi possível entrar no grupo.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ============================================================================
  // 9. SISTEMA DE SORTEIO AUTOMATIZADO E GESTÃO ADMINISTRATIVA
  // ============================================================================

  const handleToggleGroupStatus = async (newStatus) => {
    if (!activeGroup || !isGroupAdmin) return;
    try {
      await updateDoc(
        doc(db, 'artifacts', appId, 'public', 'data', 'groups', activeGroup.id),
        { status: newStatus }
      );
      showNotification(
        newStatus === 'ready'
          ? 'Inscrições encerradas! Grupo pronto para realizar o sorteio.'
          : 'Inscrições reabertas para novos familiares.'
      );
    } catch (err) {
      console.error('Erro ao alterar status:', err);
      showNotification('Erro ao atualizar o status do grupo.', 'error');
    }
  };

  const handleExecuteOfficialDraw = async () => {
    if (!activeGroup || !isGroupAdmin) {
      showNotification('Apenas o administrador do grupo pode iniciar o sorteio.', 'error');
      return;
    }

    if (confirmedParticipants.length < 2) {
      showNotification(
        'O sorteio exige pelo menos 2 participantes ativos e confirmados no grupo.',
        'error'
      );
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Limpa eventuais resultados anteriores deste grupo
      const oldResults = drawResults.filter((r) => r.groupId === activeGroup.id);
      for (const old of oldResults) {
        await deleteDoc(
          doc(db, 'artifacts', appId, 'public', 'data', 'draw_results', old.id)
        );
      }

      // 2. Gera a combinação matemática perfeita (Ciclo Hamiltoniano / Derangement)
      const pairs = generateSecretSantaPairs(confirmedParticipants);
      const drawTime = new Date().toISOString();

      // 3. Salva cada par permanentemente no banco de dados
      for (const pair of pairs) {
        const resultId = `${activeGroup.id}_${pair.giverAccountId}`;
        await setDoc(
          doc(db, 'artifacts', appId, 'public', 'data', 'draw_results', resultId),
          {
            id: resultId,
            groupId: activeGroup.id,
            giverAccountId: pair.giverAccountId,
            giverName: pair.giverName,
            receiverAccountId: pair.receiverAccountId,
            receiverName: pair.receiverName,
            drawnAt: drawTime,
          }
        );
      }

      // 4. Reseta flag de animação de revelação dos membros e atualiza status do grupo
      for (const member of confirmedParticipants) {
        await updateDoc(
          doc(db, 'artifacts', appId, 'public', 'data', 'memberships', member.id),
          { hasRevealed: false }
        );
      }

      await updateDoc(
        doc(db, 'artifacts', appId, 'public', 'data', 'groups', activeGroup.id),
        {
          status: 'drawn',
          drawTimestamp: drawTime,
        }
      );

      showNotification(
        `Sorteio oficial realizado com sucesso entre ${confirmedParticipants.length} familiares! 🎁`
      );
      setCurrentScreen('admin_results');
    } catch (err) {
      console.error('Erro no sorteio:', err);
      showNotification(err.message || 'Erro ao realizar o sorteio.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetDraw = () => {
    if (!activeGroup || !isGroupAdmin) return;

    setConfirmModal({
      title: 'Cancelar e Reiniciar Sorteio?',
      description:
        'ATENÇÃO: Todos os resultados atuais do sorteio serão permanentemente invalidados e apagados do banco de dados. Os participantes precisarão aguardar um novo sorteio.',
      confirmText: 'Sim, Invalidar Sorteio Atual',
      danger: true,
      onConfirm: async () => {
        setIsSubmitting(true);
        try {
          const currentGroupResults = drawResults.filter(
            (r) => r.groupId === activeGroup.id
          );
          for (const res of currentGroupResults) {
            await deleteDoc(
              doc(db, 'artifacts', appId, 'public', 'data', 'draw_results', res.id)
            );
          }

          for (const member of groupParticipants) {
            await updateDoc(
              doc(db, 'artifacts', appId, 'public', 'data', 'memberships', member.id),
              { hasRevealed: false }
            );
          }

          await updateDoc(
            doc(db, 'artifacts', appId, 'public', 'data', 'groups', activeGroup.id),
            {
              status: 'waiting',
              drawTimestamp: null,
            }
          );

          setConfirmModal(null);
          showNotification(
            'Sorteio cancelado. As inscrições estão abertas novamente.'
          );
        } catch (err) {
          console.error('Erro ao cancelar sorteio:', err);
          showNotification('Erro ao cancelar o sorteio.', 'error');
        } finally {
          setIsSubmitting(false);
        }
      },
    });
  };

  const handleToggleParticipantStatus = async (participant) => {
    if (!activeGroup || !isGroupAdmin) return;
    if (activeGroup.status === 'drawn') {
      showNotification(
        'Não é permitido bloquear ou alterar participantes após o sorteio sem reiniciá-lo.',
        'error'
      );
      return;
    }
    if (participant.accountId === activeGroup.adminAccountId) {
      showNotification('O administrador do grupo não pode ser bloqueado.', 'error');
      return;
    }

    const nextStatus = participant.status === 'confirmed' ? 'blocked' : 'confirmed';
    await updateDoc(
      doc(db, 'artifacts', appId, 'public', 'data', 'memberships', participant.id),
      { status: nextStatus }
    );
    showNotification(
      nextStatus === 'confirmed'
        ? `${participant.memberName} foi confirmado(a) para o sorteio.`
        : `${participant.memberName} foi bloqueado(a) do sorteio.`
    );
  };

  const handleRemoveParticipant = (participant) => {
    if (!activeGroup || !isGroupAdmin) return;
    if (activeGroup.status === 'drawn') {
      showNotification(
        'Não é possível remover participantes após o sorteio realizado.',
        'error'
      );
      return;
    }
    if (participant.accountId === activeGroup.adminAccountId) {
      showNotification('Você não pode remover o administrador do grupo.', 'error');
      return;
    }

    setConfirmModal({
      title: `Remover ${participant.memberName}?`,
      description: `Deseja remover ${participant.memberName} do grupo "${activeGroup.name}" antes do sorteio?`,
      confirmText: 'Remover Participante',
      danger: true,
      onConfirm: async () => {
        await deleteDoc(
          doc(db, 'artifacts', appId, 'public', 'data', 'memberships', participant.id)
        );
        setConfirmModal(null);
        showNotification(`${participant.memberName} foi removido(a) do grupo.`);
      },
    });
  };

  const handleUpdateGroupSettings = async (e) => {
    e.preventDefault();
    if (!activeGroup || !isGroupAdmin) return;

    setIsSubmitting(true);
    try {
      await updateDoc(
        doc(db, 'artifacts', appId, 'public', 'data', 'groups', activeGroup.id),
        {
          name: groupNameInput.trim() || activeGroup.name,
          adminName: groupAdminNameInput.trim() || activeGroup.adminName,
          suggestedValue: groupValueInput.trim(),
          eventDate: groupDateInput,
          welcomeMessage: groupWelcomeInput.trim(),
        }
      );
      showNotification('Configurações do grupo atualizadas com sucesso! 🎄');
    } catch (err) {
      console.error('Erro ao salvar configurações:', err);
      showNotification('Erro ao atualizar configurações.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ============================================================================
  // 10. ANIMAÇÃO DE REVELAÇÃO DO PARTICIPANTE (TELA 7 -> TELA 8)
  // ============================================================================

  const startGiftRevealAnimation = async () => {
    if (!activeGroup) return;

    if (activeGroup.status !== 'drawn') {
      showNotification(
        'O administrador ainda está aguardando todos os familiares para liberar o sorteio oficial!',
        'error'
      );
      return;
    }

    if (!mySecretSantaResult) {
      showNotification(
        'Você não estava na lista de confirmados quando este sorteio foi realizado.',
        'error'
      );
      return;
    }

    setCurrentScreen('draw_animation');
    setAnimationStep(1); // Sacudindo caixa

    setTimeout(() => {
      setAnimationStep(2); // Abrindo fita dourada
    }, 1600);

    setTimeout(async () => {
      setAnimationStep(3); // Revelado!
      if (myActiveMembership && !myActiveMembership.hasRevealed) {
        try {
          await updateDoc(
            doc(
              db,
              'artifacts',
              appId,
              'public',
              'data',
              'memberships',
              myActiveMembership.id
            ),
            { hasRevealed: true }
          );
        } catch (e) {
          console.error(e);
        }
      }
    }, 3200);
  };

  // ============================================================================
  // 11. COMPARTILHAMENTO WHATSAPP & GERADOR DE FAMÍLIA DEMONSTRAÇÃO (1 CLIQUE)
  // ============================================================================

  const getInviteLink = (code) => {
    const baseUrl = window.location.origin + window.location.pathname;
    return `${baseUrl}?convite=${code}`;
  };

  const handleCopyInvite = (code) => {
    const textToCopy = `🎄 Convite para o ${activeGroup?.name || 'Amigo Secreto da Família'}!\nCódigo do Grupo: ${code}\nLink de acesso: ${getInviteLink(code)}`;
    navigator.clipboard?.writeText(textToCopy);
    setCopiedCode(true);
    showNotification('Convite e código copiados para a área de transferência!');
    setTimeout(() => setCopiedCode(false), 3000);
  };

  const handleWhatsAppShare = (group) => {
    if (!group) return;
    const message = encodeURIComponent(
      `🎄✨ *${group.name}* ✨🎁\n\nOlá, família! Nosso grupo de Amigo Secreto já está criado!\n\n👉 *Código do convite:* ${group.code}\n💰 *Valor sugerido:* ${group.suggestedValue || 'Livre'}\n📅 *Data:* ${
        group.eventDate
          ? new Date(group.eventDate + 'T12:00:00').toLocaleDateString('pt-BR')
          : 'A definir'
      }\n\nEntre pelo link para fazer seu cadastro, colocar o que gostaria de ganhar e participar do sorteio:\n${getInviteLink(group.code)}`
    );
    window.open(`https://wa.me/?text=${message}`, '_blank', 'noopener,noreferrer');
  };

  /**
   * Cria uma família completa de exemplo ("Família Silva 2026") para testes imediatos
   */
  const handleSeedDemoFamily = async () => {
    if (!firebaseUser) return;
    setIsSubmitting(true);
    try {
      const salt = 'demo_salt_2026';
      const defaultPassHash = await hashSecret('1234', salt);
      const defaultRecHash = await hashSecret('natal', salt);

      const demoMembers = [
        {
          id: 'demo_pedro',
          fullName: 'Pedro Silva (Admin)',
          wantToGet: 'Camisa polo azul, livro de suspense ou kit churrasco',
          dontWantToGet: 'Meias brancas ou perfumes muito doces',
          shoeSize: '41',
          shirtSize: 'G',
          pantsSize: '42',
          otherNotes: 'Adoro café especial em grãos!',
          role: 'admin',
        },
        {
          id: 'demo_maria',
          fullName: 'Maria Oliveira Silva',
          wantToGet: 'Bolsa tiracolo caramelo, hidratante corporal ou colar delicado',
          dontWantToGet: 'Roupas de frio pesado',
          shoeSize: '36',
          shirtSize: 'M',
          pantsSize: '38',
          otherNotes: 'Prefiro acessórios dourados.',
          role: 'participant',
        },
        {
          id: 'demo_joao',
          fullName: 'João Lucas Silva',
          wantToGet: 'Fone de ouvido Bluetooth, camiseta geek ou jogo de tabuleiro',
          dontWantToGet: 'Gravatas ou roupas sociais',
          shoeSize: '40',
          shirtSize: 'M',
          pantsSize: '40',
          otherNotes: 'Fã de Star Wars e tecnologia.',
          role: 'participant',
        },
        {
          id: 'demo_ana',
          fullName: 'Tia Ana Clara',
          wantToGet: 'Vaso de planta decorativo, jogo de xícaras ou difusor de aromas',
          dontWantToGet: 'Bebidas alcoólicas',
          shoeSize: '37',
          shirtSize: 'G',
          pantsSize: '42',
          otherNotes: 'Amo aromas de lavanda e baunilha.',
          role: 'participant',
        },
      ];

      for (const m of demoMembers) {
        await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'accounts', m.id), {
          id: m.id,
          fullName: m.fullName,
          normalizedName: normalizeName(m.fullName),
          salt,
          passwordHash: defaultPassHash,
          recoveryHash: defaultRecHash,
          preferences: {
            wantToGet: m.wantToGet,
            dontWantToGet: m.dontWantToGet,
            shoeSize: m.shoeSize,
            shirtSize: m.shirtSize,
            pantsSize: m.pantsSize,
            otherNotes: m.otherNotes,
          },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }

      const demoGroupId = 'grp_demo_familia_2026';
      const demoCode = 'NATAL-2026-FAM1';

      await setDoc(
        doc(db, 'artifacts', appId, 'public', 'data', 'groups', demoGroupId),
        {
          id: demoGroupId,
          code: demoCode,
          name: 'Amigo Secreto da Família 2026',
          adminAccountId: 'demo_pedro',
          adminName: 'Pedro Silva (Admin)',
          suggestedValue: 'R$ 100,00 a R$ 150,00',
          eventDate: '2026-12-24',
          welcomeMessage:
            'Ho Ho Ho! Bem-vindos ao Amigo Secreto da nossa família! Confira se seus tamanhos estão atualizados antes do sorteio na noite de Natal!',
          status: 'waiting',
          drawTimestamp: null,
          createdAt: new Date().toISOString(),
        }
      );

      for (const m of demoMembers) {
        const memId = `${demoGroupId}_${m.id}`;
        await setDoc(
          doc(db, 'artifacts', appId, 'public', 'data', 'memberships', memId),
          {
            id: memId,
            groupId: demoGroupId,
            accountId: m.id,
            memberName: m.fullName,
            role: m.role,
            status: 'confirmed',
            hasRevealed: false,
            joinedAt: new Date().toISOString(),
          }
        );
      }

      setCurrentAccountId('demo_pedro');
      setActiveGroupId(demoGroupId);
      setGroupNameInput('Amigo Secreto da Família 2026');
      setGroupAdminNameInput('Pedro Silva (Admin)');
      setGroupValueInput('R$ 100,00 a R$ 150,00');
      setGroupDateInput('2026-12-24');
      setCurrentScreen('participant_home');
      showNotification(
        'Família de demonstração criada! Você entrou como Pedro Silva (Admin) - Senha padrão dos membros: 1234'
      );
    } catch (err) {
      console.error('Erro ao criar demonstração:', err);
      showNotification('Erro ao carregar dados de demonstração.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ============================================================================
  // 12. RENDERIZAÇÃO DE CARREGAMENTO INICIAL
  // ============================================================================
  if (loadingFirebase) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-950 via-red-900 to-emerald-950 flex flex-col items-center justify-center p-6 text-white">
        <ChristmasTreeSVG className="w-20 h-20 animate-bounce mb-4" />
        <h1 className="text-2xl font-bold tracking-wide text-amber-300">
          Preparando a Árvore de Natal da Família...
        </h1>
        <p className="text-red-200 text-sm mt-2">
          Conectando ao banco de dados seguro do Amigo Secreto
        </p>
      </div>
    );
  }

  // ============================================================================
  // 13. ESTRUTURA VISUAL PRINCIPAL E BARRA DE NAVEGAÇÃO
  // ============================================================================
  return (
    <div className="min-h-screen bg-stone-50 text-stone-800 flex flex-col font-sans selection:bg-red-800 selection:text-amber-200">
      {/* Faixa Decorativa Natalina Superior */}
      <div className="h-2 bg-gradient-to-r from-red-800 via-amber-400 to-emerald-800" />

      {/* Notificação Flutuante (Toast) */}
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
              <AlertTriangle className="w-6 h-6 text-amber-300 shrink-0" />
            ) : (
              <Sparkles className="w-6 h-6 text-amber-300 shrink-0" />
            )}
            <p className="text-sm font-medium leading-snug">{toast.message}</p>
          </div>
        </div>
      )}

      {/* Cabeçalho Principal */}
      <header className="bg-gradient-to-r from-red-950 via-red-900 to-emerald-950 text-white shadow-xl sticky top-0 z-30 border-b border-amber-500/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex flex-wrap items-center justify-between gap-3">
          {/* Logo e Título */}
          <div
            onClick={() => {
              if (currentAccount && activeGroup) {
                setCurrentScreen('participant_home');
              } else if (currentAccount) {
                setCurrentScreen('join_group');
              } else {
                setCurrentScreen('login');
              }
            }}
            className="flex items-center gap-3 cursor-pointer group"
          >
            <div className="p-2 rounded-xl bg-white/10 border border-amber-400/40 group-hover:scale-105 transition">
              <ChristmasTreeSVG className="w-8 h-8" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg sm:text-xl tracking-tight text-white">
                  Amigo Secreto Familiar
                </span>
                <span className="hidden sm:inline-flex items-center px-2 py-0.5 text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-400/30 rounded-full">
                  Natal 2026
                </span>
              </div>
              <p className="text-xs text-red-200/80">
                Sorteio Criptografado & Lista de Presentes da Família
              </p>
            </div>
          </div>

          {/* Controles do Usuário Logado */}
          <div className="flex items-center flex-wrap gap-2 sm:gap-3">
            <button
              onClick={() => setTechDocsModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-amber-200 text-xs font-medium border border-amber-400/20 transition"
              title="Estrutura do Banco, .env e Guia de Hospedagem"
            >
              <Database className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Arquitetura & Deploy</span>
            </button>

            {currentAccount ? (
              <>
                {/* Seletor rápido de grupo caso participe de mais de um */}
                {myGroups.length > 0 && (
                  <select
                    value={activeGroupId || ''}
                    onChange={(e) => {
                      setActiveGroupId(e.target.value);
                      setCurrentScreen('participant_home');
                    }}
                    className="bg-emerald-950/90 text-amber-200 text-xs sm:text-sm font-medium px-3 py-2 rounded-xl border border-amber-400/40 focus:outline-none"
                  >
                    {myGroups.map((grp) => (
                      <option key={grp.id} value={grp.id}>
                        🎄 {grp.name}
                      </option>
                    ))}
                  </select>
                )}

                <button
                  onClick={() => setEditProfileModal(true)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs sm:text-sm font-medium border border-white/15 transition"
                >
                  <Gift className="w-4 h-4 text-amber-300" />
                  <span className="max-w-[120px] sm:max-w-[160px] truncate">
                    {currentAccount.fullName}
                  </span>
                </button>

                <button
                  onClick={handleLogout}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-800/80 hover:bg-red-700 text-red-100 text-xs sm:text-sm font-medium border border-red-500/30 transition"
                  title="Sair da conta"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="hidden sm:inline">Sair</span>
                </button>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentScreen('login')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition ${
                    currentScreen === 'login'
                      ? 'bg-amber-400 text-red-950 shadow'
                      : 'bg-white/10 text-white hover:bg-white/20'
                  }`}
                >
                  Entrar
                </button>
                <button
                  onClick={() => setCurrentScreen('register')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition ${
                    currentScreen === 'register'
                      ? 'bg-amber-400 text-red-950 shadow'
                      : 'bg-emerald-800 text-white hover:bg-emerald-700 border border-emerald-500/30'
                  }`}
                >
                  Criar Conta
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Sub-menu de Navegação das Telas do Grupo Ativo */}
        {currentAccount && activeGroup && (
          <div className="bg-black/25 border-t border-white/10">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2 flex items-center justify-between overflow-x-auto gap-2 no-scrollbar">
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setCurrentScreen('participant_home')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                    currentScreen === 'participant_home'
                      ? 'bg-amber-400 text-red-950 shadow'
                      : 'text-red-100 hover:bg-white/10'
                  }`}
                >
                  <Home className="w-3.5 h-3.5" />
                  Início do Grupo
                </button>

                <button
                  onClick={() => setCurrentScreen('participant_list')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                    currentScreen === 'participant_list'
                      ? 'bg-amber-400 text-red-950 shadow'
                      : 'text-red-100 hover:bg-white/10'
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  Participantes ({confirmedParticipants.length})
                </button>

                {activeGroup.status === 'drawn' && mySecretSantaResult && (
                  <>
                    <button
                      onClick={() => setCurrentScreen('draw_result')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                        currentScreen === 'draw_result' ||
                        currentScreen === 'draw_animation'
                          ? 'bg-amber-400 text-red-950 shadow'
                          : 'text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-400/30'
                      }`}
                    >
                      <Gift className="w-3.5 h-3.5" />
                      Meu Amigo Secreto
                    </button>

                    <button
                      onClick={() => setCurrentScreen('drawn_preferences')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                        currentScreen === 'drawn_preferences'
                          ? 'bg-amber-400 text-red-950 shadow'
                          : 'text-red-100 hover:bg-white/10'
                      }`}
                    >
                      <Heart className="w-3.5 h-3.5" />
                      Desejos do Sorteado
                    </button>
                  </>
                )}

                {/* Abas Exclusivas do Administrador do Grupo */}
                {isGroupAdmin && (
                  <div className="flex items-center gap-1.5 pl-2 ml-2 border-l border-white/20">
                    <button
                      onClick={() => setCurrentScreen('admin_dashboard')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                        currentScreen === 'admin_dashboard'
                          ? 'bg-emerald-500 text-emerald-950 shadow'
                          : 'text-emerald-300 hover:bg-emerald-800/40'
                      }`}
                    >
                      <Crown className="w-3.5 h-3.5" />
                      Painel Admin
                    </button>

                    <button
                      onClick={() => setCurrentScreen('admin_participants')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                        currentScreen === 'admin_participants'
                          ? 'bg-emerald-500 text-emerald-950 shadow'
                          : 'text-emerald-300 hover:bg-emerald-800/40'
                      }`}
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      Gerenciar Membros
                    </button>

                    <button
                      onClick={() => setCurrentScreen('admin_results')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                        currentScreen === 'admin_results'
                          ? 'bg-emerald-500 text-emerald-950 shadow'
                          : 'text-emerald-300 hover:bg-emerald-800/40'
                      }`}
                    >
                      <Shuffle className="w-3.5 h-3.5" />
                      Sorteio & Pares
                    </button>

                    <button
                      onClick={() => {
                        setGroupNameInput(activeGroup.name || '');
                        setGroupAdminNameInput(activeGroup.adminName || '');
                        setGroupValueInput(activeGroup.suggestedValue || '');
                        setGroupDateInput(activeGroup.eventDate || '');
                        setGroupWelcomeInput(activeGroup.welcomeMessage || '');
                        setCurrentScreen('admin_settings');
                      }}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                        currentScreen === 'admin_settings'
                          ? 'bg-emerald-500 text-emerald-950 shadow'
                          : 'text-emerald-300 hover:bg-emerald-800/40'
                      }`}
                    >
                      <Settings className="w-3.5 h-3.5" />
                      Configurações
                    </button>
                  </div>
                )}
              </div>

              {/* Botões rápidos para entrar em outro grupo ou criar novo */}
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={() => setCurrentScreen('join_group')}
                  className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-xs text-white whitespace-nowrap transition"
                >
                  + Código de Convite
                </button>
                <button
                  onClick={() => setCurrentScreen('create_group')}
                  className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-xs text-amber-200 border border-amber-400/30 whitespace-nowrap transition"
                >
                  + Novo Grupo
                </button>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* ========================================================================
          CONTEÚDO PRINCIPAL (SWITCH ENTRE AS 13 TELAS DO SISTEMA)
         ======================================================================== */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8">
        {/* ====================================================================
            TELA 1: LOGIN E ACESSO INICIAL
           ==================================================================== */}
        {currentScreen === 'login' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Coluna de Boas-vindas */}
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-red-100 text-red-900 border border-red-200 text-xs font-bold uppercase tracking-wider">
                <Sparkles className="w-4 h-4 text-amber-600" />
                Celebração de Natal em Família
              </div>

              <h1 className="text-3xl sm:text-5xl font-extrabold text-stone-900 leading-tight">
                Organize o{' '}
                <span className="text-red-800 underline decoration-amber-400 decoration-4 underline-offset-4">
                  Amigo Secreto
                </span>{' '}
                da sua família com magia e segurança.
              </h1>

              <p className="text-stone-600 text-base sm:text-lg leading-relaxed">
                Cada familiar faz seu próprio cadastro, preenche o que gostaria de
                ganhar, tamanhos de roupas e calçados, e participa do sorteio
                automatizado sem risco de ninguém tirar a si mesmo ou perder o
                resultado!
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-sm">
                  <div className="w-10 h-10 rounded-xl bg-red-50 text-red-800 flex items-center justify-center mb-3">
                    <Shield className="w-5 h-5" />
                  </div>
                  <h3 className="font-bold text-stone-900 text-sm">
                    Sorteio Criptografado
                  </h3>
                  <p className="text-xs text-stone-500 mt-1">
                    Algoritmo centralizado sem repetições e salvo permanentemente.
                  </p>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-sm">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-800 flex items-center justify-center mb-3">
                    <Shirt className="w-5 h-5" />
                  </div>
                  <h3 className="font-bold text-stone-900 text-sm">
                    Lista de Presentes
                  </h3>
                  <p className="text-xs text-stone-500 mt-1">
                    Tamanhos de calçado, camisa, calça e desejos visíveis a quem te tirou.
                  </p>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-sm">
                  <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-800 flex items-center justify-center mb-3">
                    <Share2 className="w-5 h-5" />
                  </div>
                  <h3 className="font-bold text-stone-900 text-sm">
                    Convite no WhatsApp
                  </h3>
                  <p className="text-xs text-stone-500 mt-1">
                    Envie o link para a família e acompanhe os confirmados em tempo real.
                  </p>
                </div>
              </div>

              {/* Botão Rápido de Demonstração */}
              <div className="bg-gradient-to-r from-emerald-950 via-emerald-900 to-red-950 p-5 rounded-2xl text-white shadow-lg border border-amber-400/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <span className="text-xs uppercase font-bold tracking-wider text-amber-300 flex items-center gap-1.5">
                    <Star className="w-3.5 h-3.5 fill-amber-300" />
                    Teste Rápido com 1 Clique
                  </span>
                  <h4 className="font-bold text-base mt-0.5">
                    Quer testar o sorteio e o painel agora mesmo?
                  </h4>
                  <p className="text-xs text-emerald-100/90 mt-0.5">
                    Gera o grupo "Família Silva 2026" com 4 participantes (Pedro, Maria,
                    João e Ana) prontos para sortear!
                  </p>
                </div>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleSeedDemoFamily}
                  className="px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-red-950 font-bold text-xs sm:text-sm shrink-0 shadow-md transition cursor-pointer"
                >
                  {isSubmitting ? 'Criando...' : 'Carregar Família Exemplo'}
                </button>
              </div>
            </div>

            {/* Coluna do Card de Login */}
            <div className="lg:col-span-5">
              <div className="bg-white rounded-3xl shadow-xl border border-stone-200 overflow-hidden">
                <div className="bg-gradient-to-r from-red-900 via-red-800 to-emerald-900 p-6 text-white text-center relative">
                  <div className="w-14 h-14 rounded-2xl bg-white/10 border border-amber-400/40 flex items-center justify-center mx-auto mb-3">
                    <Gift className="w-8 h-8 text-amber-300" />
                  </div>
                  <h2 className="text-xl font-bold">Entrar no Amigo Secreto</h2>
                  <p className="text-xs text-red-100 mt-1">
                    Acesse sua conta para ver seu grupo e seu amigo secreto
                  </p>
                </div>

                <form onSubmit={handleLogin} className="p-6 sm:p-8 space-y-5">
                  {joinCodeInput && (
                    <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center justify-between">
                      <span>
                        🎁 Convite detectado: <strong>{joinCodeInput}</strong>
                      </span>
                      <span className="text-[11px] font-semibold underline">
                        Entre ou cadastre-se
                      </span>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-2">
                      Nome do Participante
                    </label>
                    <input
                      type="text"
                      required
                      value={loginName}
                      onChange={(e) => setLoginName(e.target.value)}
                      placeholder="Ex: Maria Oliveira Silva"
                      className="w-full px-4 py-3 rounded-xl border border-stone-300 focus:border-red-700 focus:ring-2 focus:ring-red-700/20 outline-none text-sm transition"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-xs font-bold uppercase tracking-wider text-stone-700">
                        Sua Senha
                      </label>
                      <button
                        type="button"
                        onClick={() => setRecoveryModal(true)}
                        className="text-xs font-semibold text-red-800 hover:underline"
                      >
                        Esqueceu a senha?
                      </button>
                    </div>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        placeholder="Digite sua senha"
                        className="w-full px-4 py-3 rounded-xl border border-stone-300 focus:border-red-700 focus:ring-2 focus:ring-red-700/20 outline-none text-sm pr-11 transition"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                      >
                        {showPassword ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-red-800 to-red-700 hover:from-red-700 hover:to-red-600 text-white font-bold text-sm shadow-lg shadow-red-900/20 flex items-center justify-center gap-2 transition cursor-pointer"
                  >
                    <LogIn className="w-4 h-4" />
                    {isSubmitting ? 'Verificando credenciais...' : 'Entrar na Minha Conta'}
                  </button>

                  <div className="relative flex py-2 items-center">
                    <div className="flex-grow border-t border-stone-200"></div>
                    <span className="flex-shrink mx-3 text-xs text-stone-400 uppercase font-semibold">
                      Ainda não tem cadastro?
                    </span>
                    <div className="flex-grow border-t border-stone-200"></div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setCurrentScreen('register')}
                    className="w-full py-3 px-6 rounded-xl bg-emerald-900 hover:bg-emerald-800 text-white font-bold text-sm flex items-center justify-center gap-2 transition cursor-pointer"
                  >
                    <UserPlus className="w-4 h-4 text-amber-300" />
                    Criar Nova Conta de Participante
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* ====================================================================
            TELA 2: CADASTRO DE PARTICIPANTE E PREFERÊNCIAS
           ==================================================================== */}
        {currentScreen === 'register' && (
          <div className="max-w-3xl mx-auto">
            <div className="bg-white rounded-3xl shadow-xl border border-stone-200 overflow-hidden">
              <div className="bg-gradient-to-r from-emerald-950 via-emerald-900 to-red-950 p-6 sm:p-8 text-white">
                <button
                  type="button"
                  onClick={() => setCurrentScreen('login')}
                  className="inline-flex items-center gap-1.5 text-xs text-amber-300 hover:underline mb-3"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Voltar para tela de login
                </button>
                <h2 className="text-2xl sm:text-3xl font-extrabold flex items-center gap-3">
                  <UserPlus className="w-7 h-7 text-amber-300" />
                  Cadastro de Participante Familiar
                </h2>
                <p className="text-xs sm:text-sm text-emerald-100 mt-1">
                  Crie seu acesso seguro e preencha suas dicas de presente para ajudar
                  quem tirar você no sorteio!
                </p>
              </div>

              <form onSubmit={handleRegister} className="p-6 sm:p-8 space-y-8">
                {/* Seção 1: Informações Pessoais e Credenciais */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b border-stone-200">
                    <Lock className="w-4 h-4 text-red-800" />
                    <h3 className="font-bold text-stone-900 text-base">
                      1. Informações Pessoais e Senha de Acesso (Obrigatório)
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1.5">
                        Nome Completo *
                      </label>
                      <input
                        type="text"
                        required
                        value={regName}
                        onChange={(e) => setRegName(e.target.value)}
                        placeholder="Ex: Ana Clara Souza"
                        className="w-full px-4 py-3 rounded-xl border border-stone-300 focus:border-red-700 outline-none text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1.5">
                        Senha *
                      </label>
                      <input
                        type="password"
                        required
                        value={regPassword}
                        onChange={(e) => setRegPassword(e.target.value)}
                        placeholder="Mínimo 4 caracteres"
                        className="w-full px-4 py-3 rounded-xl border border-stone-300 focus:border-red-700 outline-none text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1.5">
                        Confirmar Senha *
                      </label>
                      <input
                        type="password"
                        required
                        value={regConfirmPassword}
                        onChange={(e) => setRegConfirmPassword(e.target.value)}
                        placeholder="Repita sua senha"
                        className="w-full px-4 py-3 rounded-xl border border-stone-300 focus:border-red-700 outline-none text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1.5">
                        Palavra de Segurança (Recuperar Senha) *
                      </label>
                      <input
                        type="text"
                        required
                        value={regRecoveryWord}
                        onChange={(e) => setRegRecoveryWord(e.target.value)}
                        placeholder="Ex: Nome do seu pet ou cidade natal"
                        className="w-full px-4 py-3 rounded-xl border border-stone-300 focus:border-red-700 outline-none text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-emerald-800 mb-1.5">
                        Código de Convite do Grupo (Opcional)
                      </label>
                      <input
                        type="text"
                        value={regInviteCode}
                        onChange={(e) => setRegInviteCode(e.target.value.toUpperCase())}
                        placeholder="Ex: NATAL-2026-XXXX"
                        className="w-full px-4 py-3 rounded-xl border border-emerald-300 bg-emerald-50/40 focus:border-emerald-700 outline-none text-sm font-mono uppercase"
                      />
                    </div>
                  </div>
                </div>

                {/* Seção 2: Preferências e Tamanhos para o Amigo Secreto */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-stone-200">
                    <div className="flex items-center gap-2">
                      <Gift className="w-4 h-4 text-emerald-800" />
                      <h3 className="font-bold text-stone-900 text-base">
                        2. Suas Dicas e Tamanhos para o Amigo Secreto (Opcional)
                      </h3>
                    </div>
                    <span className="text-xs text-stone-500">
                      Você poderá editar depois
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold uppercase tracking-wider text-emerald-900 mb-1.5">
                        🎁 O que você gostaria de ganhar?
                      </label>
                      <textarea
                        rows={2}
                        value={regWantToGet}
                        onChange={(e) => setRegWantToGet(e.target.value)}
                        placeholder="Ex: Livros de romance, perfume cítrico, camisa social, kit de jardinagem..."
                        className="w-full px-4 py-2.5 rounded-xl border border-stone-300 focus:border-emerald-700 outline-none text-sm"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold uppercase tracking-wider text-red-900 mb-1.5">
                        🚫 O que você NÃO gostaria de ganhar?
                      </label>
                      <textarea
                        rows={2}
                        value={regDontWantToGet}
                        onChange={(e) => setRegDontWantToGet(e.target.value)}
                        placeholder="Ex: Chocolates com amendoim (alergia), roupas pretas, canecas..."
                        className="w-full px-4 py-2.5 rounded-xl border border-stone-300 focus:border-red-700 outline-none text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1.5">
                        👟 Numeração do Calçado
                      </label>
                      <input
                        type="text"
                        value={regShoeSize}
                        onChange={(e) => setRegShoeSize(e.target.value)}
                        placeholder="Ex: 37 ou 41/42"
                        className="w-full px-4 py-2.5 rounded-xl border border-stone-300 focus:border-emerald-700 outline-none text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1.5">
                        👕 Tamanho de Camisa / Blusa
                      </label>
                      <input
                        type="text"
                        value={regShirtSize}
                        onChange={(e) => setRegShirtSize(e.target.value)}
                        placeholder="Ex: P, M, G, GG"
                        className="w-full px-4 py-2.5 rounded-xl border border-stone-300 focus:border-emerald-700 outline-none text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1.5">
                        👖 Tamanho de Calça / Bermudas
                      </label>
                      <input
                        type="text"
                        value={regPantsSize}
                        onChange={(e) => setRegPantsSize(e.target.value)}
                        placeholder="Ex: 38, 40, 44 ou M"
                        className="w-full px-4 py-2.5 rounded-xl border border-stone-300 focus:border-emerald-700 outline-none text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1.5">
                        ✨ Outros Tamanhos ou Preferências
                      </label>
                      <input
                        type="text"
                        value={regOtherNotes}
                        onChange={(e) => setRegOtherNotes(e.target.value)}
                        placeholder="Ex: Cores favoritas, time, anel nº 16..."
                        className="w-full px-4 py-2.5 rounded-xl border border-stone-300 focus:border-emerald-700 outline-none text-sm"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-4 border-t border-stone-200">
                  <button
                    type="button"
                    onClick={() => setCurrentScreen('login')}
                    className="w-full sm:w-auto px-6 py-3 rounded-xl border border-stone-300 text-stone-700 font-semibold text-sm hover:bg-stone-100 transition"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-gradient-to-r from-red-800 to-emerald-900 hover:from-red-700 hover:to-emerald-800 text-white font-bold text-sm shadow-lg transition cursor-pointer"
                  >
                    {isSubmitting ? 'Salvando Cadastro...' : 'Concluir Meu Cadastro 🎄'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ====================================================================
            TELA 3: CRIAÇÃO DE GRUPO FAMILIAR
           ==================================================================== */}
        {currentScreen === 'create_group' && currentAccount && (
          <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-3xl shadow-xl border border-stone-200 overflow-hidden">
              <div className="bg-gradient-to-r from-red-900 via-red-800 to-amber-700 p-6 sm:p-8 text-white">
                <h2 className="text-2xl font-extrabold flex items-center gap-2.5">
                  <Crown className="w-7 h-7 text-amber-300" />
                  Criar Novo Grupo Familiar
                </h2>
                <p className="text-xs sm:text-sm text-red-100 mt-1">
                  Configure o Amigo Secreto da sua família e gere o link exclusivo de
                  convite para o WhatsApp.
                </p>
              </div>

              <form onSubmit={handleCreateGroup} className="p-6 sm:p-8 space-y-5">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1.5">
                    Nome do Grupo Familiar *
                  </label>
                  <input
                    type="text"
                    required
                    value={groupNameInput}
                    onChange={(e) => setGroupNameInput(e.target.value)}
                    placeholder="Ex: Amigo Secreto da Família 2026"
                    className="w-full px-4 py-3 rounded-xl border border-stone-300 focus:border-red-700 outline-none text-sm"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1.5">
                      Nome do Administrador *
                    </label>
                    <input
                      type="text"
                      required
                      value={groupAdminNameInput}
                      onChange={(e) => setGroupAdminNameInput(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-stone-300 focus:border-red-700 outline-none text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1.5">
                      Valor Sugerido do Presente (Opcional)
                    </label>
                    <input
                      type="text"
                      value={groupValueInput}
                      onChange={(e) => setGroupValueInput(e.target.value)}
                      placeholder="Ex: R$ 80,00 a R$ 120,00"
                      className="w-full px-4 py-3 rounded-xl border border-stone-300 focus:border-red-700 outline-none text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1.5">
                    Data da Confraternização (Opcional)
                  </label>
                  <input
                    type="date"
                    value={groupDateInput}
                    onChange={(e) => setGroupDateInput(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-stone-300 focus:border-red-700 outline-none text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1.5">
                    Mensagem de Boas-vindas (Opcional)
                  </label>
                  <textarea
                    rows={3}
                    value={groupWelcomeInput}
                    onChange={(e) => setGroupWelcomeInput(e.target.value)}
                    placeholder="Escreva uma mensagem carinhosa para receber os familiares no grupo..."
                    className="w-full px-4 py-3 rounded-xl border border-stone-300 focus:border-red-700 outline-none text-sm"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-stone-200">
                  {activeGroup && (
                    <button
                      type="button"
                      onClick={() => setCurrentScreen('participant_home')}
                      className="px-5 py-3 rounded-xl border border-stone-300 text-stone-700 font-semibold text-sm hover:bg-stone-100"
                    >
                      Voltar
                    </button>
                  )}
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-7 py-3.5 rounded-xl bg-red-800 hover:bg-red-700 text-white font-bold text-sm shadow-lg transition cursor-pointer"
                  >
                    {isSubmitting ? 'Criando Grupo...' : 'Criar Grupo e Gerar Convite 🎁'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ====================================================================
            TELA 4: ENTRAR EM UM GRUPO FAMILIAR
           ==================================================================== */}
        {currentScreen === 'join_group' && currentAccount && (
          <div className="max-w-3xl mx-auto space-y-6">
            <div className="bg-white rounded-3xl shadow-xl border border-stone-200 overflow-hidden">
              <div className="bg-gradient-to-r from-emerald-950 via-emerald-900 to-emerald-800 p-6 sm:p-8 text-white">
                <h2 className="text-2xl font-extrabold flex items-center gap-2.5">
                  <Key className="w-7 h-7 text-amber-300" />
                  Ingressar em um Grupo Familiar
                </h2>
                <p className="text-xs sm:text-sm text-emerald-100 mt-1">
                  Digite o código de convite enviado pelo administrador da sua família
                  ou crie um novo grupo.
                </p>
              </div>

              <div className="p-6 sm:p-8 space-y-6">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-2">
                    Código do Convite do Grupo
                  </label>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <input
                      type="text"
                      value={joinCodeInput}
                      onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
                      placeholder="Ex: NATAL-2026-FAM1"
                      className="flex-1 px-4 py-3.5 rounded-xl border-2 border-stone-300 focus:border-emerald-700 outline-none text-base font-mono uppercase tracking-wider"
                    />
                  </div>
                </div>

                {/* Pré-visualização das informações básicas do grupo antes de confirmar */}
                {previewGroupToJoin ? (
                  <div className="p-6 rounded-2xl bg-emerald-50/80 border-2 border-emerald-600/30 space-y-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <span className="inline-block px-2.5 py-0.5 rounded-full bg-emerald-800 text-amber-200 text-xs font-bold uppercase mb-1">
                          Grupo Encontrado
                        </span>
                        <h3 className="text-xl font-extrabold text-stone-900">
                          {previewGroupToJoin.name}
                        </h3>
                        <p className="text-xs text-stone-600 mt-1">
                          Organizado por: <strong>{previewGroupToJoin.adminName}</strong>
                        </p>
                      </div>
                      <ChristmasTreeSVG className="w-12 h-12 shrink-0" />
                    </div>

                    <p className="text-sm text-stone-700 italic bg-white/80 p-3.5 rounded-xl border border-emerald-200">
                      "{previewGroupToJoin.welcomeMessage}"
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                      <div className="bg-white p-3 rounded-xl border border-stone-200">
                        <span className="text-stone-400 block">Valor Sugerido</span>
                        <strong className="text-stone-800">
                          {previewGroupToJoin.suggestedValue || 'Livre'}
                        </strong>
                      </div>
                      <div className="bg-white p-3 rounded-xl border border-stone-200">
                        <span className="text-stone-400 block">Confraternização</span>
                        <strong className="text-stone-800">
                          {previewGroupToJoin.eventDate
                            ? new Date(
                                previewGroupToJoin.eventDate + 'T12:00:00'
                              ).toLocaleDateString('pt-BR')
                            : 'A definir'}
                        </strong>
                      </div>
                      <div className="bg-white p-3 rounded-xl border border-stone-200">
                        <span className="text-stone-400 block">Status de Inscrição</span>
                        <strong
                          className={
                            previewGroupToJoin.status === 'waiting'
                              ? 'text-emerald-700'
                              : 'text-red-700'
                          }
                        >
                          {previewGroupToJoin.status === 'waiting'
                            ? 'Inscrições Abertas'
                            : 'Inscrições Encerradas'}
                        </strong>
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={
                        isSubmitting || previewGroupToJoin.status !== 'waiting'
                      }
                      onClick={handleJoinGroup}
                      className={`w-full py-3.5 px-6 rounded-xl font-bold text-sm shadow-lg flex items-center justify-center gap-2 transition ${
                        previewGroupToJoin.status === 'waiting'
                          ? 'bg-red-800 hover:bg-red-700 text-white cursor-pointer'
                          : 'bg-stone-300 text-stone-500 cursor-not-allowed'
                      }`}
                    >
                      <CheckCircle2 className="w-5 h-5" />
                      {previewGroupToJoin.status === 'waiting'
                        ? 'Confirmar e Entrar no Grupo Familiar'
                        : 'Sorteio já realizado / Inscrições fechadas'}
                    </button>
                  </div>
                ) : joinCodeInput.trim().length > 3 ? (
                  <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-900 text-sm">
                    Nenhum grupo encontrado com o código{' '}
                    <strong>{joinCodeInput}</strong>. Confira o código enviado no WhatsApp.
                  </div>
                ) : null}

                {/* Sugestão caso existam grupos abertos no ambiente */}
                {groups.length > 0 && (
                  <div className="pt-4 border-t border-stone-200">
                    <p className="text-xs font-bold uppercase tracking-wider text-stone-400 mb-3">
                      Ou selecione um grupo familiar ativo:
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {groups.map((g) => (
                        <div
                          key={g.id}
                          onClick={() => setJoinCodeInput(g.code)}
                          className="p-3.5 rounded-xl border border-stone-200 hover:border-emerald-600 bg-stone-50 hover:bg-emerald-50/40 cursor-pointer transition flex items-center justify-between"
                        >
                          <div>
                            <h4 className="font-bold text-sm text-stone-800">
                              {g.name}
                            </h4>
                            <span className="text-xs font-mono text-emerald-800">
                              Código: {g.code}
                            </span>
                          </div>
                          <ChevronRight className="w-4 h-4 text-stone-400" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="pt-4 border-t border-stone-200 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <span className="text-xs text-stone-500">
                    Você é o organizador do Amigo Secreto da sua família?
                  </span>
                  <button
                    type="button"
                    onClick={() => setCurrentScreen('create_group')}
                    className="px-5 py-2.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-950 border border-amber-500/40 font-bold text-xs sm:text-sm transition cursor-pointer"
                  >
                    + Criar Novo Grupo Familiar
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ====================================================================
            TELA 5: TELA INICIAL DE BOAS-VINDAS DO PARTICIPANTE
           ==================================================================== */}
        {currentScreen === 'participant_home' && currentAccount && activeGroup && (
          <div className="space-y-8">
            {/* Banner Hero do Grupo Familiar */}
            <div className="bg-gradient-to-br from-red-950 via-red-900 to-emerald-950 rounded-3xl p-6 sm:p-10 text-white shadow-2xl border border-amber-400/30 relative overflow-hidden">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10">
                <div className="lg:col-span-8 space-y-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                        activeGroup.status === 'drawn'
                          ? 'bg-amber-400 text-red-950'
                          : activeGroup.status === 'ready'
                          ? 'bg-sky-400 text-sky-950'
                          : 'bg-emerald-400 text-emerald-950'
                      }`}
                    >
                      <Clock className="w-3.5 h-3.5" />
                      {activeGroup.status === 'drawn'
                        ? 'Sorteio Realizado!'
                        : activeGroup.status === 'ready'
                        ? 'Pronto para Sorteio (Inscrições Encerradas)'
                        : 'Aguardando Participantes'}
                    </span>

                    <span className="px-3 py-1 rounded-full bg-white/10 text-amber-200 text-xs font-mono border border-white/15">
                      Código: {activeGroup.code}
                    </span>
                  </div>

                  <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white">
                    {activeGroup.name}
                  </h1>

                  <p className="text-red-100/95 text-sm sm:text-base leading-relaxed bg-black/20 p-4 rounded-2xl border border-white/10">
                    "{activeGroup.welcomeMessage}"
                  </p>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                    <div className="bg-white/10 backdrop-blur-sm p-3.5 rounded-2xl border border-white/10">
                      <span className="text-[11px] uppercase tracking-wider text-red-200 block">
                        Participante Logado
                      </span>
                      <strong className="text-sm sm:text-base text-amber-300 truncate block mt-0.5">
                        {currentAccount.fullName}
                      </strong>
                    </div>

                    <div className="bg-white/10 backdrop-blur-sm p-3.5 rounded-2xl border border-white/10">
                      <span className="text-[11px] uppercase tracking-wider text-red-200 block">
                        Confirmados
                      </span>
                      <strong className="text-sm sm:text-base text-white block mt-0.5">
                        {confirmedParticipants.length} familiares
                      </strong>
                    </div>

                    <div className="bg-white/10 backdrop-blur-sm p-3.5 rounded-2xl border border-white/10">
                      <span className="text-[11px] uppercase tracking-wider text-red-200 block">
                        Valor Sugerido
                      </span>
                      <strong className="text-sm sm:text-base text-white block mt-0.5">
                        {activeGroup.suggestedValue || 'Livre'}
                      </strong>
                    </div>

                    <div className="bg-white/10 backdrop-blur-sm p-3.5 rounded-2xl border border-white/10">
                      <span className="text-[11px] uppercase tracking-wider text-red-200 block">
                        Data do Evento
                      </span>
                      <strong className="text-sm sm:text-base text-white block mt-0.5">
                        {activeGroup.eventDate
                          ? new Date(
                              activeGroup.eventDate + 'T12:00:00'
                            ).toLocaleDateString('pt-BR')
                          : 'A definir'}
                      </strong>
                    </div>
                  </div>
                </div>

                {/* Card de Ação Principal: Sortear / Abrir Presente */}
                <div className="lg:col-span-4 bg-white/10 backdrop-blur-md p-6 rounded-3xl border border-amber-400/40 text-center space-y-4">
                  <FestiveGiftBoxSVG
                    isOpened={myActiveMembership?.hasRevealed}
                    className="w-28 h-28 mx-auto"
                  />

                  {activeGroup.status === 'drawn' ? (
                    <>
                      <h3 className="text-lg font-extrabold text-amber-300">
                        {myActiveMembership?.hasRevealed
                          ? 'Seu Amigo Secreto já foi sorteado!'
                          : 'O Sorteio Oficial está pronto!'}
                      </h3>
                      <p className="text-xs text-red-100">
                        {myActiveMembership?.hasRevealed
                          ? 'Consulte quantas vezes quiser o nome e a lista de presentes de quem você tirou.'
                          : 'Clique no botão abaixo para abrir sua caixa de presente e descobrir quem você tirou!'}
                      </p>
                      <button
                        type="button"
                        onClick={() =>
                          myActiveMembership?.hasRevealed
                            ? setCurrentScreen('draw_result')
                            : startGiftRevealAnimation()
                        }
                        className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-red-950 font-extrabold text-sm shadow-xl transition transform hover:-translate-y-0.5 cursor-pointer flex items-center justify-center gap-2"
                      >
                        <Sparkles className="w-5 h-5" />
                        {myActiveMembership?.hasRevealed
                          ? 'Consultar Meu Amigo Secreto'
                          : 'Sortear Meu Amigo Secreto'}
                      </button>
                    </>
                  ) : (
                    <>
                      <h3 className="text-lg font-bold text-white">
                        Aguardando Liberação do Sorteio
                      </h3>
                      <p className="text-xs text-red-100 leading-relaxed">
                        Enquanto todos os familiares entram no grupo, aproveite para
                        preencher suas preferências de presentes e tamanhos!
                      </p>
                      {isGroupAdmin ? (
                        <button
                          type="button"
                          onClick={handleExecuteOfficialDraw}
                          disabled={confirmedParticipants.length < 2 || isSubmitting}
                          className="w-full py-3.5 px-5 rounded-2xl bg-amber-400 hover:bg-amber-300 text-red-950 font-extrabold text-xs sm:text-sm shadow-lg transition cursor-pointer"
                        >
                          👑 Iniciar Sorteio Oficial Agora ({confirmedParticipants.length}{' '}
                          membros)
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setEditProfileModal(true)}
                          className="w-full py-3.5 px-5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm shadow-lg transition cursor-pointer"
                        >
                          ✏️ Preencher Minha Lista de Presentes
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Grid Inferior: Resumo de Participantes + Minhas Preferências */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Lista de Participantes do Grupo */}
              <div className="lg:col-span-7 bg-white rounded-3xl p-6 shadow-md border border-stone-200 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-extrabold text-stone-900 flex items-center gap-2">
                      <Users className="w-5 h-5 text-red-800" />
                      Familiares no Grupo ({confirmedParticipants.length})
                    </h3>
                    <p className="text-xs text-stone-500">
                      Lista atualizada automaticamente em tempo real
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setCurrentScreen('participant_list')}
                    className="text-xs font-bold text-red-800 hover:underline flex items-center gap-1"
                  >
                    Ver todos
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                <div className="divide-y divide-stone-100 max-h-80 overflow-y-auto pr-1">
                  {confirmedParticipants.map((part) => {
                    const hasWishlist = Boolean(
                      part.preferences?.wantToGet || part.preferences?.shirtSize
                    );
                    return (
                      <div
                        key={part.id}
                        className="py-3 flex items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-800 to-emerald-900 text-amber-200 font-bold text-sm flex items-center justify-center shrink-0">
                            {part.memberName.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-sm text-stone-900">
                                {part.memberName}
                              </span>
                              {part.accountId === currentAccount.id && (
                                <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-800 text-[10px] font-bold">
                                  Você
                                </span>
                              )}
                              {part.role === 'admin' && (
                                <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 text-[10px] font-bold">
                                  Admin
                                </span>
                              )}
                            </div>
                            <span className="text-xs text-stone-500">
                              {hasWishlist
                                ? '✅ Lista de tamanhos e presentes preenchida'
                                : '⏳ Ainda não preencheu preferências'}
                            </span>
                          </div>
                        </div>

                        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                          Confirmado
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Barra de Convite para compartilhar com a família */}
                <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="text-xs">
                    <span className="font-bold text-stone-800 block">
                      Convide mais familiares para o grupo!
                    </span>
                    <span className="text-stone-500">
                      Código de acesso: <strong className="font-mono">{activeGroup.code}</strong>
                    </span>
                  </div>
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <button
                      type="button"
                      onClick={() => handleCopyInvite(activeGroup.code)}
                      className="flex-1 sm:flex-initial px-3 py-2 rounded-xl bg-white border border-stone-300 hover:bg-stone-100 text-stone-800 font-semibold text-xs flex items-center justify-center gap-1.5 transition"
                    >
                      {copiedCode ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                      Copiar
                    </button>
                    <button
                      type="button"
                      onClick={() => handleWhatsAppShare(activeGroup)}
                      className="flex-1 sm:flex-initial px-3.5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      Enviar no WhatsApp
                    </button>
                  </div>
                </div>
              </div>

              {/* Card das Minhas Preferências Cadastradas */}
              <div className="lg:col-span-5 bg-white rounded-3xl p-6 shadow-md border border-stone-200 flex flex-col justify-between space-y-4">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-extrabold text-stone-900 flex items-center gap-2">
                      <Gift className="w-5 h-5 text-emerald-800" />
                      Meus Desejos e Tamanhos
                    </h3>
                    <button
                      type="button"
                      onClick={() => setEditProfileModal(true)}
                      className="text-xs font-bold text-emerald-800 hover:underline flex items-center gap-1"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      Editar
                    </button>
                  </div>

                  <p className="text-xs text-stone-500">
                    Essas informações ficarão visíveis exclusivamente para a pessoa que
                    tirar você no sorteio (e para o administrador).
                  </p>

                  <div className="space-y-2.5 text-xs">
                    <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200">
                      <span className="font-bold text-emerald-950 block mb-0.5">
                        🎁 O que gostaria de ganhar:
                      </span>
                      <p className="text-stone-700">
                        {currentAccount.preferences?.wantToGet ||
                          'Não informado (clique em Editar para adicionar)'}
                      </p>
                    </div>

                    <div className="p-3 rounded-xl bg-red-50/70 border border-red-200">
                      <span className="font-bold text-red-950 block mb-0.5">
                        🚫 O que NÃO gostaria de ganhar:
                      </span>
                      <p className="text-stone-700">
                        {currentAccount.preferences?.dontWantToGet || 'Nada especificado'}
                      </p>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <div className="p-2.5 rounded-xl bg-stone-50 border border-stone-200 text-center">
                        <span className="text-[10px] text-stone-400 uppercase block">
                          Calçado
                        </span>
                        <strong className="text-stone-800 text-sm">
                          {currentAccount.preferences?.shoeSize || '-'}
                        </strong>
                      </div>
                      <div className="p-2.5 rounded-xl bg-stone-50 border border-stone-200 text-center">
                        <span className="text-[10px] text-stone-400 uppercase block">
                          Camisa/Blusa
                        </span>
                        <strong className="text-stone-800 text-sm">
                          {currentAccount.preferences?.shirtSize || '-'}
                        </strong>
                      </div>
                      <div className="p-2.5 rounded-xl bg-stone-50 border border-stone-200 text-center">
                        <span className="text-[10px] text-stone-400 uppercase block">
                          Calça
                        </span>
                        <strong className="text-stone-800 text-sm">
                          {currentAccount.preferences?.pantsSize || '-'}
                        </strong>
                      </div>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setEditProfileModal(true)}
                  className="w-full py-3 px-4 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer"
                >
                  <Edit3 className="w-4 h-4 text-amber-300" />
                  Atualizar Minhas Preferências de Presente
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ====================================================================
            TELA 6: LISTA COMPLETA DE PARTICIPANTES DO GRUPO
           ==================================================================== */}
        {currentScreen === 'participant_list' && currentAccount && activeGroup && (
          <div className="space-y-6">
            <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-md border border-stone-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-stone-200">
                <div>
                  <h2 className="text-2xl font-extrabold text-stone-900 flex items-center gap-2.5">
                    <Users className="w-7 h-7 text-red-800" />
                    Participantes do Grupo ({confirmedParticipants.length})
                  </h2>
                  <p className="text-xs sm:text-sm text-stone-500 mt-1">
                    Veja todos os familiares confirmados em{' '}
                    <strong>{activeGroup.name}</strong>. Por segurança, os pares sorteados
                    são mantidos em sigilo absoluto.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setCurrentScreen('participant_home')}
                  className="self-start sm:self-auto px-4 py-2 rounded-xl border border-stone-300 text-xs font-bold text-stone-700 hover:bg-stone-100"
                >
                  ← Voltar ao Início
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-6">
                {confirmedParticipants.map((part) => {
                  const hasPrefs = Boolean(
                    part.preferences?.wantToGet ||
                      part.preferences?.shoeSize ||
                      part.preferences?.shirtSize
                  );
                  return (
                    <div
                      key={part.id}
                      className="p-5 rounded-2xl border border-stone-200 bg-stone-50/60 flex flex-col justify-between gap-4 hover:border-red-800/30 transition"
                    >
                      <div className="flex items-start gap-3.5">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-red-800 to-emerald-900 text-amber-300 font-extrabold text-lg flex items-center justify-center shrink-0 shadow">
                          {part.memberName.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-bold text-stone-900 text-sm truncate">
                            {part.memberName}
                          </h4>
                          <div className="flex flex-wrap items-center gap-1.5 mt-1">
                            {part.role === 'admin' && (
                              <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 text-[10px] font-bold">
                                👑 Organizador
                              </span>
                            )}
                            <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                              Confirmado
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="pt-3 border-t border-stone-200/80 flex items-center justify-between text-xs">
                        <span className="text-stone-500">
                          {hasPrefs
                            ? '🎁 Lista de desejos pronta'
                            : '📝 Lista em branco'}
                        </span>
                        {activeGroup.status === 'drawn' && (
                          <span
                            className={`font-semibold ${
                              part.hasRevealed ? 'text-emerald-700' : 'text-amber-700'
                            }`}
                          >
                            {part.hasRevealed ? 'Já viu seu par' : 'Presente fechado'}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ====================================================================
            TELA 7: TELA DE SORTEIO COM ANIMAÇÃO DE SUSPENSE
           ==================================================================== */}
        {currentScreen === 'draw_animation' && currentAccount && activeGroup && (
          <div className="max-w-xl mx-auto">
            <div className="bg-gradient-to-b from-red-950 via-red-900 to-emerald-950 rounded-3xl p-8 sm:p-12 text-white text-center shadow-2xl border-2 border-amber-400/50 space-y-6">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 text-amber-300 text-xs font-bold uppercase tracking-widest">
                <Sparkles className="w-4 h-4 animate-spin" />
                Momento de Suspense Natalino
              </div>

              <div className="py-6 flex justify-center">
                <FestiveGiftBoxSVG
                  isOpening={animationStep === 1 || animationStep === 2}
                  isOpened={animationStep === 3}
                  className="w-44 h-44"
                />
              </div>

              {animationStep === 1 && (
                <div className="space-y-2 animate-pulse">
                  <h2 className="text-2xl font-extrabold text-amber-300">
                    Embaralhando os laços dourados...
                  </h2>
                  <p className="text-sm text-red-200">
                    Conferindo a árvore de Natal do grupo {activeGroup.name}
                  </p>
                </div>
              )}

              {animationStep === 2 && (
                <div className="space-y-2 animate-pulse">
                  <h2 className="text-2xl font-extrabold text-amber-300">
                    Desamarrando a fita do seu presente...
                  </h2>
                  <p className="text-sm text-red-200">
                    Preparando o envelope exclusivo de {currentAccount.fullName}!
                  </p>
                </div>
              )}

              {animationStep === 3 && mySecretSantaResult && (
                <div className="space-y-6 animate-fade-in">
                  <p className="text-sm uppercase tracking-widest text-amber-200 font-bold">
                    ✨ Seu amigo secreto é... ✨
                  </p>
                  <div className="p-6 rounded-2xl bg-white/15 backdrop-blur-md border-2 border-amber-300 shadow-inner">
                    <h2 className="text-3xl sm:text-4xl font-black text-amber-300 tracking-tight">
                      {mySecretSantaResult.receiverName}
                    </h2>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setCurrentScreen('drawn_preferences')}
                      className="flex-1 py-4 px-6 rounded-2xl bg-amber-400 hover:bg-amber-300 text-red-950 font-extrabold text-sm shadow-xl transition cursor-pointer"
                    >
                      🎁 Ver Lista de Presentes e Tamanhos
                    </button>
                    <button
                      type="button"
                      onClick={() => setCurrentScreen('draw_result')}
                      className="py-4 px-5 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-bold text-sm transition cursor-pointer"
                    >
                      Ir para Tela de Resultado
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ====================================================================
            TELA 8: TELA DE RESULTADO DO PARTICIPANTE
           ==================================================================== */}
        {currentScreen === 'draw_result' && currentAccount && activeGroup && (
          <div className="max-w-2xl mx-auto">
            {mySecretSantaResult ? (
              <div className="bg-white rounded-3xl shadow-2xl border border-stone-200 overflow-hidden">
                <div className="bg-gradient-to-r from-red-950 via-red-900 to-emerald-950 p-8 text-white text-center space-y-3">
                  <FestiveGiftBoxSVG isOpened={true} className="w-28 h-28 mx-auto" />
                  <span className="inline-block px-3 py-1 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30 text-xs font-bold uppercase tracking-widest">
                    Resultado Oficial Salvo no Banco de Dados
                  </span>
                  <h2 className="text-lg font-medium text-red-100">
                    Olá, <strong>{currentAccount.fullName}</strong>! No grupo{' '}
                    <strong>{activeGroup.name}</strong>, seu amigo secreto é:
                  </h2>

                  <div className="py-4">
                    <div className="inline-flex items-center gap-3 px-8 py-5 rounded-2xl bg-white/10 border-2 border-amber-400/60 shadow-inner">
                      <span className="text-2xl sm:text-4xl font-black text-amber-300 tracking-tight">
                        {hideResultNameOnScreen
                          ? '••••••••••••••••'
                          : mySecretSantaResult.receiverName}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setHideResultNameOnScreen(!hideResultNameOnScreen)
                        }
                        className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-amber-200"
                        title="Ocultar/Mostrar nome na tela para ninguém espiar"
                      >
                        {hideResultNameOnScreen ? (
                          <Eye className="w-5 h-5" />
                        ) : (
                          <EyeOff className="w-5 h-5" />
                        )}
                      </button>
                    </div>
                  </div>

                  <p className="text-xs text-red-200 max-w-md mx-auto">
                    🔒 Este resultado é definitivo e exclusivo seu. Você pode atualizar a
                    página ou entrar novamente quando quiser sem perder seu sorteio.
                  </p>
                </div>

                <div className="p-6 sm:p-8 space-y-6">
                  <div className="flex flex-col sm:flex-row gap-3">
                    <button
                      type="button"
                      onClick={() => setCurrentScreen('drawn_preferences')}
                      className="flex-1 py-4 px-6 rounded-2xl bg-gradient-to-r from-emerald-800 to-emerald-700 hover:from-emerald-700 hover:to-emerald-600 text-white font-extrabold text-sm shadow-lg flex items-center justify-center gap-2 transition cursor-pointer"
                    >
                      <Heart className="w-5 h-5 text-amber-300" />
                      Visualizar Lista de Preferências e Tamanhos
                    </button>

                    <button
                      type="button"
                      onClick={() => startGiftRevealAnimation()}
                      className="py-4 px-5 rounded-2xl border border-stone-300 hover:bg-stone-100 text-stone-700 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition cursor-pointer"
                    >
                      <Sparkles className="w-4 h-4 text-amber-600" />
                      Rever Animação
                    </button>
                  </div>

                  <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-950 flex items-start gap-3">
                    <Shield className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
                    <div>
                      <strong>Garantia Anti-Manipulação:</strong> O sistema bloqueia
                      novos sorteios individuais para garantir que cada membro da família
                      seja sorteado exatamente uma única vez.
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-3xl p-8 text-center shadow border border-stone-200">
                <p className="text-stone-600">
                  O sorteio deste grupo ainda não foi realizado pelo administrador.
                </p>
              </div>
            )}
          </div>
        )}

        {/* ====================================================================
            TELA 9: TELA DE PREFERÊNCIAS DA PESSOA SORTEADA
           ==================================================================== */}
        {currentScreen === 'drawn_preferences' && currentAccount && activeGroup && (
          <div className="max-w-3xl mx-auto">
            {mySecretSantaResult && myDrawnPersonAccount ? (
              <div className="bg-white rounded-3xl shadow-xl border border-stone-200 overflow-hidden">
                <div className="bg-gradient-to-r from-emerald-950 via-emerald-900 to-red-950 p-6 sm:p-8 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <button
                      type="button"
                      onClick={() => setCurrentScreen('draw_result')}
                      className="inline-flex items-center gap-1 text-xs text-amber-300 hover:underline mb-2"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      Voltar para o resultado
                    </button>
                    <h2 className="text-2xl font-extrabold flex items-center gap-2.5">
                      <Gift className="w-7 h-7 text-amber-300" />
                      Preferências de {myDrawnPersonAccount.fullName}
                    </h2>
                    <p className="text-xs text-emerald-100 mt-1">
                      Informações privadas liberadas exclusivamente para você escolher o
                      presente ideal!
                    </p>
                  </div>
                  <div className="px-4 py-2 rounded-2xl bg-white/10 border border-white/15 text-xs text-amber-200 shrink-0">
                    Valor sugerido: <strong>{activeGroup.suggestedValue || 'Livre'}</strong>
                  </div>
                </div>

                <div className="p-6 sm:p-8 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-5 rounded-2xl bg-emerald-50/80 border border-emerald-200 space-y-2">
                      <div className="flex items-center gap-2 text-emerald-900 font-extrabold text-sm">
                        <Heart className="w-5 h-5 text-emerald-700" />
                        Sugestões de Presentes (O que gostaria de ganhar)
                      </div>
                      <p className="text-sm text-stone-800 leading-relaxed whitespace-pre-line">
                        {myDrawnPersonAccount.preferences?.wantToGet ||
                          'Este familiar ainda não escreveu sugestões específicas de presentes.'}
                      </p>
                    </div>

                    <div className="p-5 rounded-2xl bg-red-50/80 border border-red-200 space-y-2">
                      <div className="flex items-center gap-2 text-red-900 font-extrabold text-sm">
                        <ThumbsDown className="w-5 h-5 text-red-700" />
                        O que NÃO gostaria de receber
                      </div>
                      <p className="text-sm text-stone-800 leading-relaxed whitespace-pre-line">
                        {myDrawnPersonAccount.preferences?.dontWantToGet ||
                          'Nenhuma restrição informada.'}
                      </p>
                    </div>
                  </div>

                  {/* Tamanhos de Calçado, Camisa e Calça */}
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500 mb-3">
                      Tamanhos e Medidas Informados
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 flex items-center gap-3.5">
                        <div className="w-11 h-11 rounded-xl bg-amber-100 text-amber-900 flex items-center justify-center font-bold text-lg">
                          👟
                        </div>
                        <div>
                          <span className="text-xs text-stone-500 block">
                            Numeração do Calçado
                          </span>
                          <strong className="text-base text-stone-900">
                            {myDrawnPersonAccount.preferences?.shoeSize ||
                              'Não informado'}
                          </strong>
                        </div>
                      </div>

                      <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 flex items-center gap-3.5">
                        <div className="w-11 h-11 rounded-xl bg-emerald-100 text-emerald-900 flex items-center justify-center font-bold text-lg">
                          👕
                        </div>
                        <div>
                          <span className="text-xs text-stone-500 block">
                            Tamanho de Camisa/Blusa
                          </span>
                          <strong className="text-base text-stone-900">
                            {myDrawnPersonAccount.preferences?.shirtSize ||
                              'Não informado'}
                          </strong>
                        </div>
                      </div>

                      <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 flex items-center gap-3.5">
                        <div className="w-11 h-11 rounded-xl bg-red-100 text-red-900 flex items-center justify-center font-bold text-lg">
                          👖
                        </div>
                        <div>
                          <span className="text-xs text-stone-500 block">
                            Tamanho de Calça
                          </span>
                          <strong className="text-base text-stone-900">
                            {myDrawnPersonAccount.preferences?.pantsSize ||
                              'Não informado'}
                          </strong>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Outras Observações */}
                  <div className="p-5 rounded-2xl bg-stone-50 border border-stone-200 space-y-1.5">
                    <span className="text-xs font-bold uppercase tracking-wider text-stone-500 block">
                      ✨ Outras Observações e Preferências
                    </span>
                    <p className="text-sm text-stone-800">
                      {myDrawnPersonAccount.preferences?.otherNotes ||
                        'Nenhuma observação adicional cadastrada.'}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-3xl p-8 text-center border border-stone-200">
                <p className="text-stone-600">
                  Realize ou abra o sorteio primeiro para ver as preferências do seu
                  amigo secreto.
                </p>
              </div>
            )}
          </div>
        )}

        {/* ====================================================================
            TELA 10: PAINEL ADMINISTRATIVO - DASHBOARD
           ==================================================================== */}
        {currentScreen === 'admin_dashboard' && currentAccount && activeGroup && (
          <div>
            {!isGroupAdmin ? (
              <div className="bg-red-50 border border-red-200 rounded-3xl p-8 text-center text-red-900">
                <Shield className="w-12 h-12 mx-auto text-red-700 mb-3" />
                <h3 className="text-lg font-bold">Acesso Restrito ao Administrador</h3>
                <p className="text-sm mt-1">
                  Somente o administrador do grupo ({activeGroup.adminName}) possui
                  permissão para acessar este painel.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Cabeçalho do Painel Admin */}
                <div className="bg-gradient-to-r from-stone-900 via-red-950 to-emerald-950 rounded-3xl p-6 sm:p-8 text-white shadow-xl border border-amber-400/30 flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400/20 text-amber-300 text-xs font-bold uppercase mb-2">
                      <Crown className="w-3.5 h-3.5" />
                      Painel Administrativo Exclusivo
                    </span>
                    <h2 className="text-2xl sm:text-3xl font-extrabold">
                      {activeGroup.name}
                    </h2>
                    <p className="text-xs sm:text-sm text-stone-300 mt-1">
                      Gerencie os familiares inscritos, controle o encerramento das
                      inscrições e inicie o sorteio oficial.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    {activeGroup.status !== 'drawn' ? (
                      <>
                        <button
                          type="button"
                          onClick={() =>
                            handleToggleGroupStatus(
                              activeGroup.status === 'waiting' ? 'ready' : 'waiting'
                            )
                          }
                          className="px-4 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs border border-white/20 transition cursor-pointer"
                        >
                          {activeGroup.status === 'waiting'
                            ? '🔒 Encerrar Inscrições (Pronto p/ Sorteio)'
                            : '🔓 Reabrir Inscrições'}
                        </button>

                        <button
                          type="button"
                          disabled={confirmedParticipants.length < 2 || isSubmitting}
                          onClick={handleExecuteOfficialDraw}
                          className="px-5 py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-red-950 font-extrabold text-xs sm:text-sm shadow-lg transition cursor-pointer flex items-center gap-2"
                        >
                          <Shuffle className="w-4 h-4" />
                          Iniciar Sorteio Oficial
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setCurrentScreen('admin_results')}
                        className="px-5 py-3 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-emerald-950 font-extrabold text-xs sm:text-sm shadow-lg transition cursor-pointer flex items-center gap-2"
                      >
                        <Award className="w-4 h-4" />
                        Ver Tabela de Resultados
                      </button>
                    )}
                  </div>
                </div>

                {/* Cards de Métricas do Dashboard */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm">
                    <span className="text-xs font-bold uppercase text-stone-400">
                      Total Cadastrados
                    </span>
                    <div className="text-3xl font-black text-stone-900 mt-1">
                      {groupParticipants.length}
                    </div>
                    <span className="text-xs text-stone-500">
                      No grupo {activeGroup.code}
                    </span>
                  </div>

                  <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm">
                    <span className="text-xs font-bold uppercase text-emerald-700">
                      Confirmados p/ Sorteio
                    </span>
                    <div className="text-3xl font-black text-emerald-800 mt-1">
                      {confirmedParticipants.length}
                    </div>
                    <span className="text-xs text-stone-500">
                      Participantes ativos (mínimo 2)
                    </span>
                  </div>

                  <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm">
                    <span className="text-xs font-bold uppercase text-amber-700">
                      Status do Sorteio
                    </span>
                    <div className="text-lg font-extrabold text-stone-900 mt-2">
                      {activeGroup.status === 'drawn'
                        ? '✅ Sorteio Realizado'
                        : activeGroup.status === 'ready'
                        ? '⏳ Pronto p/ Sortear'
                        : '📝 Aguardando Membros'}
                    </div>
                    <span className="text-xs text-stone-500">
                      {activeGroup.drawTimestamp
                        ? `Em ${new Date(activeGroup.drawTimestamp).toLocaleString('pt-BR')}`
                        : 'Sorteio ainda não iniciado'}
                    </span>
                  </div>

                  <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm">
                    <span className="text-xs font-bold uppercase text-red-800">
                      Confraternização & Valor
                    </span>
                    <div className="text-base font-extrabold text-stone-900 mt-2">
                      {activeGroup.suggestedValue || 'Valor Livre'}
                    </div>
                    <span className="text-xs text-stone-500">
                      Data:{' '}
                      {activeGroup.eventDate
                        ? new Date(
                            activeGroup.eventDate + 'T12:00:00'
                          ).toLocaleDateString('pt-BR')
                        : 'A definir'}
                    </span>
                  </div>
                </div>

                {/* Central de Convite e Atalhos Administrativos */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  <div className="lg:col-span-7 bg-white p-6 rounded-3xl border border-stone-200 shadow-sm space-y-4">
                    <h3 className="font-extrabold text-stone-900 text-base flex items-center gap-2">
                      <Share2 className="w-5 h-5 text-emerald-800" />
                      Link e Código Exclusivo de Convite
                    </h3>
                    <p className="text-xs text-stone-500">
                      Envie este código ou link no grupo da família no WhatsApp. Cada
                      familiar faz o próprio cadastro sem que você precise cadastrar
                      ninguém manualmente.
                    </p>
                    <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 flex flex-col sm:flex-row items-center justify-between gap-3">
                      <div>
                        <span className="text-[11px] uppercase text-stone-400 block">
                          Código do Convite
                        </span>
                        <strong className="text-lg font-mono text-red-900">
                          {activeGroup.code}
                        </strong>
                      </div>
                      <div className="flex items-center gap-2 w-full sm:w-auto">
                        <button
                          type="button"
                          onClick={() => handleCopyInvite(activeGroup.code)}
                          className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <Copy className="w-3.5 h-3.5" />
                          Copiar Link
                        </button>
                        <button
                          type="button"
                          onClick={() => handleWhatsAppShare(activeGroup)}
                          className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <Share2 className="w-3.5 h-3.5" />
                          WhatsApp
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="lg:col-span-5 bg-white p-6 rounded-3xl border border-stone-200 shadow-sm space-y-3">
                    <h3 className="font-extrabold text-stone-900 text-base">
                      Ações Administrativas Rápidas
                    </h3>
                    <button
                      type="button"
                      onClick={() => setCurrentScreen('admin_participants')}
                      className="w-full p-3.5 rounded-2xl border border-stone-200 hover:border-red-800/40 flex items-center justify-between text-left transition cursor-pointer"
                    >
                      <div>
                        <strong className="text-sm text-stone-900 block">
                          Gerenciar Participantes e Tamanhos
                        </strong>
                        <span className="text-xs text-stone-500">
                          Ver preferências, bloquear ou remover antes do sorteio
                        </span>
                      </div>
                      <ChevronRight className="w-5 h-5 text-stone-400" />
                    </button>

                    <button
                      type="button"
                      onClick={() => setCurrentScreen('admin_results')}
                      className="w-full p-3.5 rounded-2xl border border-stone-200 hover:border-emerald-800/40 flex items-center justify-between text-left transition cursor-pointer"
                    >
                      <div>
                        <strong className="text-sm text-stone-900 block">
                          Gerenciar Sorteio e Tabela de Pares
                        </strong>
                        <span className="text-xs text-stone-500">
                          Iniciar sorteio, consultar quem tirou quem ou reiniciar
                        </span>
                      </div>
                      <ChevronRight className="w-5 h-5 text-stone-400" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ====================================================================
            TELA 11: TELA ADMINISTRATIVA DE PARTICIPANTES
           ==================================================================== */}
        {currentScreen === 'admin_participants' &&
          currentAccount &&
          activeGroup &&
          isGroupAdmin && (
            <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-md border border-stone-200 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-stone-200">
                <div>
                  <h2 className="text-2xl font-extrabold text-stone-900 flex items-center gap-2">
                    <UserCheck className="w-7 h-7 text-emerald-800" />
                    Gerenciamento de Participantes ({groupParticipants.length})
                  </h2>
                  <p className="text-xs sm:text-sm text-stone-500 mt-1">
                    Visualize as preferências cadastradas, confirme ou remova participantes
                    antes da realização do sorteio.
                  </p>
                </div>

                <div className="relative w-full sm:w-64">
                  <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchParticipantQuery}
                    onChange={(e) => setSearchParticipantQuery(e.target.value)}
                    placeholder="Buscar familiar..."
                    className="w-full pl-9 pr-4 py-2 rounded-xl border border-stone-300 text-xs outline-none focus:border-emerald-700"
                  />
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-stone-200 text-[11px] font-bold uppercase tracking-wider text-stone-400">
                      <th className="py-3 px-4">Participante</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Calçado / Camisa / Calça</th>
                      <th className="py-3 px-4">Lista de Desejos</th>
                      <th className="py-3 px-4 text-right">Ações do Admin</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100 text-sm">
                    {groupParticipants
                      .filter((p) =>
                        p.memberName
                          .toLowerCase()
                          .includes(searchParticipantQuery.toLowerCase())
                      )
                      .map((part) => (
                        <tr key={part.id} className="hover:bg-stone-50/80">
                          <td className="py-3.5 px-4 font-bold text-stone-900">
                            <div className="flex items-center gap-2">
                              <span>{part.memberName}</span>
                              {part.role === 'admin' && (
                                <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-900 text-[10px] font-bold">
                                  Admin
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3.5 px-4">
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                                part.status === 'confirmed'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-red-100 text-red-800'
                              }`}
                            >
                              {part.status === 'confirmed' ? 'Confirmado' : 'Bloqueado'}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-xs text-stone-600">
                            👟 {part.preferences?.shoeSize || '-'} | 👕{' '}
                            {part.preferences?.shirtSize || '-'} | 👖{' '}
                            {part.preferences?.pantsSize || '-'}
                          </td>
                          <td className="py-3.5 px-4 text-xs text-stone-600 max-w-xs truncate">
                            {part.preferences?.wantToGet || 'Não preenchido'}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <div className="inline-flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => setInspectParticipantModal(part)}
                                className="px-2.5 py-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold"
                                title="Ver detalhes e tamanhos completos"
                              >
                                Ver Fichas
                              </button>

                              {part.accountId !== activeGroup.adminAccountId &&
                                activeGroup.status !== 'drawn' && (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => handleToggleParticipantStatus(part)}
                                      className="p-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800"
                                      title={
                                        part.status === 'confirmed'
                                          ? 'Bloquear participante'
                                          : 'Desbloquear participante'
                                      }
                                    >
                                      <Ban className="w-4 h-4" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveParticipant(part)}
                                      className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-700"
                                      title="Remover participante antes do sorteio"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </>
                                )}
                            </div>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        {/* ====================================================================
            TELA 12: TELA ADMINISTRATIVA DE SORTEIO E TABELA DE RESULTADOS
           ==================================================================== */}
        {currentScreen === 'admin_results' &&
          currentAccount &&
          activeGroup &&
          isGroupAdmin && (
            <div className="space-y-6">
              <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-md border border-stone-200 space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-stone-200">
                  <div>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-red-100 text-red-900 text-xs font-bold uppercase mb-1">
                      <Lock className="w-3.5 h-3.5" />
                      Acesso Exclusivo do Administrador
                    </span>
                    <h2 className="text-2xl font-extrabold text-stone-900">
                      Gerenciamento do Sorteio & Tabela de Pares
                    </h2>
                    <p className="text-xs sm:text-sm text-stone-500 mt-1">
                      Somente você (administrador) pode consultar a tabela completa de
                      quem tirou quem. Os demais participantes só enxergam o próprio
                      resultado.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2.5">
                    {activeGroup.status !== 'drawn' ? (
                      <button
                        type="button"
                        disabled={confirmedParticipants.length < 2 || isSubmitting}
                        onClick={handleExecuteOfficialDraw}
                        className="px-5 py-3 rounded-xl bg-red-800 hover:bg-red-700 text-white font-bold text-xs sm:text-sm shadow-lg flex items-center gap-2 cursor-pointer"
                      >
                        <Shuffle className="w-4 h-4" />
                        Realizar Sorteio Oficial Agora ({confirmedParticipants.length}{' '}
                        ativos)
                      </button>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => setAdminShowAllResults(!adminShowAllResults)}
                          className="px-4 py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-amber-300 font-bold text-xs flex items-center gap-2 cursor-pointer"
                        >
                          {adminShowAllResults ? (
                            <>
                              <EyeOff className="w-4 h-4" />
                              Ocultar Nomes (Modo Anti-Spoiler)
                            </>
                          ) : (
                            <>
                              <Eye className="w-4 h-4" />
                              Revelar Todos os Pares da Tabela
                            </>
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={handleResetDraw}
                          className="px-4 py-2.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-800 border border-red-200 font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          Cancelar / Reiniciar Sorteio
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {activeGroup.status !== 'drawn' ? (
                  <div className="p-8 rounded-2xl bg-stone-50 border border-stone-200 text-center space-y-4">
                    <FestiveGiftBoxSVG className="w-24 h-24 mx-auto" />
                    <h3 className="text-lg font-bold text-stone-900">
                      O Sorteio ainda não foi iniciado
                    </h3>
                    <p className="text-xs sm:text-sm text-stone-600 max-w-md mx-auto">
                      Existem atualmente{' '}
                      <strong>{confirmedParticipants.length} participantes confirmados</strong>
                      . Assim que todos os familiares estiverem prontos, clique no botão
                      acima para gerar os pares.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="overflow-x-auto rounded-2xl border border-stone-200">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-stone-100 border-b border-stone-200 text-xs font-extrabold uppercase tracking-wider text-stone-600">
                            <th className="py-3.5 px-5">Participante</th>
                            <th className="py-3.5 px-5">Amigo Secreto Sorteado</th>
                            <th className="py-3.5 px-5">Status de Visualização</th>
                            <th className="py-3.5 px-5 text-right">Controle Individual</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-200 text-sm">
                          {adminGroupDrawResults.map((row) => {
                            const isRowVisible =
                              adminShowAllResults || Boolean(adminRevealedRowIds[row.id]);
                            const giverMember = groupParticipants.find(
                              (m) => m.accountId === row.giverAccountId
                            );
                            return (
                              <tr key={row.id} className="hover:bg-stone-50">
                                <td className="py-3.5 px-5 font-bold text-stone-900">
                                  {row.giverName}
                                </td>
                                <td className="py-3.5 px-5">
                                  {isRowVisible ? (
                                    <span className="font-extrabold text-emerald-900 bg-emerald-50 px-3 py-1 rounded-lg border border-emerald-200">
                                      🎁 {row.receiverName}
                                    </span>
                                  ) : (
                                    <span className="font-mono text-stone-400 select-none">
                                      ••••••••••••••••
                                    </span>
                                  )}
                                </td>
                                <td className="py-3.5 px-5 text-xs">
                                  {giverMember?.hasRevealed ? (
                                    <span className="text-emerald-700 font-semibold">
                                      ✅ Já abriu o presente
                                    </span>
                                  ) : (
                                    <span className="text-amber-700 font-semibold">
                                      ⏳ Ainda não abriu
                                    </span>
                                  )}
                                </td>
                                <td className="py-3.5 px-5 text-right">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setAdminRevealedRowIds((prev) => ({
                                        ...prev,
                                        [row.id]: !prev[row.id],
                                      }))
                                    }
                                    className="px-3 py-1 rounded-lg border border-stone-300 hover:bg-stone-100 text-xs font-semibold text-stone-700"
                                  >
                                    {isRowVisible ? 'Ocultar Par' : 'Revelar Par'}
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

        {/* ====================================================================
            TELA 13: TELA DE CONFIGURAÇÕES DO GRUPO
           ==================================================================== */}
        {currentScreen === 'admin_settings' &&
          currentAccount &&
          activeGroup &&
          isGroupAdmin && (
            <div className="max-w-2xl mx-auto">
              <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-md border border-stone-200 space-y-6">
                <div className="pb-4 border-b border-stone-200">
                  <h2 className="text-2xl font-extrabold text-stone-900 flex items-center gap-2">
                    <Settings className="w-7 h-7 text-red-800" />
                    Configurações do Grupo Familiar
                  </h2>
                  <p className="text-xs sm:text-sm text-stone-500 mt-1">
                    Atualize as informações de confraternização, valor sugerido e mensagem
                    de boas-vindas.
                  </p>
                </div>

                <form onSubmit={handleUpdateGroupSettings} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1.5">
                      Nome do Grupo
                    </label>
                    <input
                      type="text"
                      required
                      value={groupNameInput}
                      onChange={(e) => setGroupNameInput(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-stone-300 text-sm outline-none focus:border-red-700"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1.5">
                        Valor Sugerido do Presente
                      </label>
                      <input
                        type="text"
                        value={groupValueInput}
                        onChange={(e) => setGroupValueInput(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl border border-stone-300 text-sm outline-none focus:border-red-700"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1.5">
                        Data da Confraternização
                      </label>
                      <input
                        type="date"
                        value={groupDateInput}
                        onChange={(e) => setGroupDateInput(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl border border-stone-300 text-sm outline-none focus:border-red-700"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1.5">
                      Mensagem de Boas-vindas da Família
                    </label>
                    <textarea
                      rows={3}
                      value={groupWelcomeInput}
                      onChange={(e) => setGroupWelcomeInput(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-stone-300 text-sm outline-none focus:border-red-700"
                    />
                  </div>

                  <div className="flex justify-end gap-3 pt-4 border-t border-stone-200">
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="px-6 py-3 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white font-bold text-sm shadow transition cursor-pointer"
                    >
                      Salvar Alterações
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
      </main>

      {/* ========================================================================
          MODAIS INTERATIVOS (EDIÇÃO DE PREFERÊNCIAS, CONFIRMAÇÃO, FICHA E DOCS)
         ======================================================================== */}

      {/* Modal: Editar Minhas Preferências e Tamanhos */}
      {editProfileModal && currentAccount && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl border border-stone-200 space-y-5 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-stone-200">
              <h3 className="text-xl font-extrabold text-stone-900 flex items-center gap-2">
                <Gift className="w-6 h-6 text-red-800" />
                Minhas Preferências e Tamanhos
              </h3>
              <button
                type="button"
                onClick={() => setEditProfileModal(false)}
                className="text-stone-400 hover:text-stone-700 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSavePreferences} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-emerald-900 mb-1">
                  🎁 O que você gostaria de ganhar?
                </label>
                <textarea
                  rows={2}
                  value={prefWant}
                  onChange={(e) => setPrefWant(e.target.value)}
                  placeholder="Sugestões de presentes que você adoraria ganhar..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-red-900 mb-1">
                  🚫 O que você NÃO gostaria de ganhar?
                </label>
                <textarea
                  rows={2}
                  value={prefDontWant}
                  onChange={(e) => setPrefDontWant(e.target.value)}
                  placeholder="Itens que prefere evitar..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase text-stone-700 mb-1">
                    👟 Calçado
                  </label>
                  <input
                    type="text"
                    value={prefShoe}
                    onChange={(e) => setPrefShoe(e.target.value)}
                    placeholder="Ex: 39"
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-stone-700 mb-1">
                    👕 Camisa/Blusa
                  </label>
                  <input
                    type="text"
                    value={prefShirt}
                    onChange={(e) => setPrefShirt(e.target.value)}
                    placeholder="Ex: M / G"
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-stone-700 mb-1">
                    👖 Calça
                  </label>
                  <input
                    type="text"
                    value={prefPants}
                    onChange={(e) => setPrefPants(e.target.value)}
                    placeholder="Ex: 40"
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-stone-700 mb-1">
                  ✨ Outras Observações
                </label>
                <input
                  type="text"
                  value={prefNotes}
                  onChange={(e) => setPrefNotes(e.target.value)}
                  placeholder="Cores preferidas, aromas, livros, etc."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => setEditProfileModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-stone-300 text-xs font-bold text-stone-700"
                >
                  Fechar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer"
                >
                  Salvar Preferências
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Visualizar Ficha de Participante (Admin) */}
      {inspectParticipantModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-stone-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-stone-200">
              <h3 className="text-lg font-extrabold text-stone-900">
                Ficha de {inspectParticipantModal.memberName}
              </h3>
              <button
                type="button"
                onClick={() => setInspectParticipantModal(null)}
                className="text-stone-400 hover:text-stone-700 font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs sm:text-sm">
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200">
                <strong className="text-emerald-950 block">🎁 Gostaria de ganhar:</strong>
                <p className="text-stone-700 mt-0.5">
                  {inspectParticipantModal.preferences?.wantToGet || 'Não informado'}
                </p>
              </div>
              <div className="p-3.5 rounded-xl bg-red-50 border border-red-200">
                <strong className="text-red-950 block">🚫 Não gostaria de ganhar:</strong>
                <p className="text-stone-700 mt-0.5">
                  {inspectParticipantModal.preferences?.dontWantToGet || 'Não informado'}
                </p>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-2.5 rounded-xl bg-stone-100">
                  <span className="text-[10px] uppercase text-stone-500 block">
                    Calçado
                  </span>
                  <strong>{inspectParticipantModal.preferences?.shoeSize || '-'}</strong>
                </div>
                <div className="p-2.5 rounded-xl bg-stone-100">
                  <span className="text-[10px] uppercase text-stone-500 block">
                    Camisa
                  </span>
                  <strong>{inspectParticipantModal.preferences?.shirtSize || '-'}</strong>
                </div>
                <div className="p-2.5 rounded-xl bg-stone-100">
                  <span className="text-[10px] uppercase text-stone-500 block">
                    Calça
                  </span>
                  <strong>{inspectParticipantModal.preferences?.pantsSize || '-'}</strong>
                </div>
              </div>
              <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200">
                <strong className="text-stone-700 block">✨ Outras observações:</strong>
                <p className="text-stone-600 mt-0.5">
                  {inspectParticipantModal.preferences?.otherNotes || 'Nenhuma'}
                </p>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setInspectParticipantModal(null)}
                className="px-5 py-2.5 rounded-xl bg-stone-900 text-white text-xs font-bold"
              >
                Fechar Ficha
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Recuperação de Senha */}
      {recoveryModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-stone-200 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-stone-200">
              <h3 className="text-lg font-extrabold text-stone-900 flex items-center gap-2">
                <Key className="w-5 h-5 text-red-800" />
                Recuperar Senha de Acesso
              </h3>
              <button
                type="button"
                onClick={() => setRecoveryModal(false)}
                className="text-stone-400 hover:text-stone-700 font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handlePasswordRecovery} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-stone-700 mb-1">
                  Seu Nome Completo Cadastrado
                </label>
                <input
                  type="text"
                  required
                  value={recoveryName}
                  onChange={(e) => setRecoveryName(e.target.value)}
                  placeholder="Ex: Maria Oliveira Silva"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-stone-700 mb-1">
                  Palavra-Chave de Segurança
                </label>
                <input
                  type="text"
                  required
                  value={recoveryKeyword}
                  onChange={(e) => setRecoveryKeyword(e.target.value)}
                  placeholder="Informada no momento do cadastro"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-stone-700 mb-1">
                  Nova Senha
                </label>
                <input
                  type="password"
                  required
                  value={recoveryNewPassword}
                  onChange={(e) => setRecoveryNewPassword(e.target.value)}
                  placeholder="Mínimo 4 caracteres"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRecoveryModal(false)}
                  className="px-4 py-2 rounded-xl border border-stone-300 text-xs font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-red-800 text-white text-xs font-bold cursor-pointer"
                >
                  Redefinir Senha
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Confirmação Administrativa Customizada */}
      {confirmModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-stone-200 space-y-4">
            <div className="flex items-center gap-3 text-red-800">
              <AlertTriangle className="w-7 h-7 shrink-0" />
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
                className="px-5 py-2.5 rounded-xl bg-red-800 hover:bg-red-700 text-white text-xs font-bold cursor-pointer"
              >
                {confirmModal.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Documentação Técnica, Schema do Banco, .env.example e Deploy VPS */}
      {techDocsModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-stone-900 text-stone-100 rounded-3xl max-w-4xl w-full p-6 sm:p-8 shadow-2xl border border-amber-400/30 space-y-6 my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-stone-700">
              <div>
                <h3 className="text-xl font-extrabold text-amber-300 flex items-center gap-2">
                  <Server className="w-6 h-6" />
                  Documentação de Arquitetura, Banco de Dados e Deploy em Hospedagem Própria
                </h3>
                <p className="text-xs text-stone-400 mt-1">
                  Especificações completas para execução com persistência Cloud/Firestore
                  ou PostgreSQL + Prisma em VPS própria.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setTechDocsModal(false)}
                className="px-3 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-bold"
              >
                ✕ Fechar
              </button>
            </div>

            <div className="space-y-4 text-xs leading-relaxed">
              <div className="p-4 rounded-2xl bg-stone-800/90 border border-stone-700 space-y-2">
                <h4 className="font-bold text-emerald-400 text-sm">
                  1. Estrutura do Banco de Dados (Prisma Schema / PostgreSQL & Firestore)
                </h4>
                <pre className="bg-black/60 p-3.5 rounded-xl overflow-x-auto text-[11px] text-amber-200 font-mono">
{`// schema.prisma (Para deploy em VPS com PostgreSQL)
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

model User {
  id           String       @id @default(cuid())
  fullName     String       @unique
  passwordHash String       // Argon2id / bcrypt / SHA-256 + salt
  salt         String
  recoveryHash String
  wantToGet    String?
  dontWantToGet String?
  shoeSize     String?
  shirtSize    String?
  pantsSize    String?
  otherNotes   String?
  createdAt    DateTime     @default(now())
  memberships  Membership[]
}

model Group {
  id             String       @id @default(cuid())
  code           String       @unique
  name           String
  adminAccountId String
  suggestedValue String?
  eventDate      String?
  welcomeMessage String?
  status         String       @default("waiting") // waiting | ready | drawn
  drawTimestamp  DateTime?
  memberships    Membership[]
  drawResults    DrawResult[]
}

model DrawResult {
  id                String   @id @default(cuid())
  groupId           String
  giverAccountId    String
  receiverAccountId String
  drawnAt           DateTime @default(now())
  group             Group    @relation(fields: [groupId], references: [id], onDelete: Cascade)
  @@unique([groupId, giverAccountId])
  @@unique([groupId, receiverAccountId]) // Garante no BD que ninguém seja sorteado 2 vezes!
}`}
                </pre>
              </div>

              <div className="p-4 rounded-2xl bg-stone-800/90 border border-stone-700 space-y-2">
                <h4 className="font-bold text-emerald-400 text-sm">
                  2. Arquivo de Configuração de Ambiente (.env.example)
                </h4>
                <pre className="bg-black/60 p-3.5 rounded-xl overflow-x-auto text-[11px] text-emerald-200 font-mono">
{`# Banco de Dados PostgreSQL (ou variáveis do Firebase)
DATABASE_URL="postgresql://postgres:senha_segura@localhost:5432/amigo_secreto_familia?schema=public"

# Segredo de Sessão / JWT e Hash
SESSION_SECRET="chave-secreta-256-bits-natal-familia-2026"
PASSWORD_PEPPER="pepper-adicional-servidor"

# URL Pública da Hospedagem (HTTPS obrigatório em produção)
NEXT_PUBLIC_APP_URL="https://amigosecreto.suafamilia.com.br"
PORT=3000`}
                </pre>
              </div>

              <div className="p-4 rounded-2xl bg-stone-800/90 border border-stone-700 space-y-2">
                <h4 className="font-bold text-emerald-400 text-sm">
                  3. Instruções para Instalação Local e Publicação em Servidor Próprio (VPS)
                </h4>
                <pre className="bg-black/60 p-3.5 rounded-xl overflow-x-auto text-[11px] text-stone-200 font-mono">
{`# 1. Instalar dependências do projeto
npm install

# 2. Configurar variáveis de ambiente
cp .env.example .env

# 3. Criar tabelas e aplicar migrações no banco de dados
npx prisma migrate deploy
npx prisma generate

# 4. Executar em ambiente de desenvolvimento ou compilar para produção
npm run build && npm run start

# 5. Em servidor VPS (Ubuntu/Debian com Nginx + Certbot HTTPS + PM2):
pm2 start npm --name "amigo-secreto" -- start
sudo certbot --nginx -d amigosecreto.suafamilia.com.br`}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Rodapé Natalino */}
      <footer className="bg-stone-900 text-stone-400 border-t border-stone-800 py-6 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-2">
            <ChristmasTreeSVG className="w-5 h-5" />
            <span className="font-bold text-stone-200">
              Amigo Secreto da Família
            </span>
            <span>• Sistema Seguro com Persistência em Banco de Dados</span>
          </div>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setTechDocsModal(true)}
              className="text-amber-400 hover:underline"
            >
              Ver Schema do Banco, .env.example e Guia de Hospedagem
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}