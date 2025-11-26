
import React, { useState, useEffect, useRef } from "react";
import { createRoot } from "react-dom/client";
import { GoogleGenAI } from "@google/genai";
import { createClient } from "@supabase/supabase-js";
import { 
  Bot, 
  Package, 
  Users, 
  MapPin, 
  Plus, 
  Trash2, 
  Send, 
  X, 
  Cpu,
  Wrench,
  Box,
  AlertTriangle,
  ClipboardList,
  Truck,
  FileSpreadsheet,
  ArrowRightLeft,
  CheckCircle2,
  Undo2,
  Calendar,
  Search,
  Filter,
  Download,
  Smartphone,
  Share,
  Settings,
  Edit3,
  List,
  Type,
  BarChart3,
  PieChart,
  CalendarRange,
  FileDown,
  Lock,
  LogOut,
  Shield,
  UserPlus,
  UserCog,
  UserMinus,
  Key,
  Info,
  RefreshCcw,
  Database,
  Cloud,
  CloudOff,
  Copy,
  Check,
  Activity
} from "lucide-react";

// --- Types ---
type AssetStatus = 'Installed' | 'Spare' | 'Planned' | 'Defective' | 'Maintenance' | 'Returned' | 'Unknown';
type FieldType = 'text' | 'number' | 'date' | 'select' | 'textarea';
type UserRole = 'superadmin' | 'editor' | 'viewer';

interface User {
  username: string;
  password: string; 
  role: UserRole;
}

interface ColumnConfig {
  id: string; // The key used in the data object
  label: string; // Display name
  type: FieldType;
  options?: string[]; // For select inputs
  width?: string;
}

// Flexible Asset Record that allows dynamic keys
interface AssetRecord {
  id: string; // Internal ID
  [key: string]: any;
}

interface Message {
  role: 'user' | 'model';
  text: string;
}

interface DBConfig {
  url: string;
  key: string;
}

// --- Constants ---
const DEFAULT_USERS: User[] = [
  { username: 'admin', password: 'password', role: 'superadmin' },
  { username: 'staff', password: '123', role: 'editor' },
  { username: 'guest', password: 'guest', role: 'viewer' }
];

// --- Helper Functions ---
const getStatusColor = (status: string) => {
  if (!status) return 'bg-slate-700 text-slate-400';
  
  const s = status.toLowerCase();
  if (s.includes('install') || s.includes('deploy') || s.includes('active')) return 'bg-green-500/20 text-green-400 border-green-500/50';
  if (s.includes('return')) return 'bg-purple-500/20 text-purple-400 border-purple-500/50';
  if (s.includes('spare') || s.includes('stock') || s.includes('inventory')) return 'bg-blue-500/20 text-blue-400 border-blue-500/50';
  if (s.includes('plan') || s.includes('order') || s.includes('req')) return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50';
  if (s.includes('defect') || s.includes('broken') || s.includes('bad')) return 'bg-red-500/20 text-red-400 border-red-500/50';
  if (s.includes('maint') || s.includes('repair')) return 'bg-orange-500/20 text-orange-400 border-orange-500/50';
  
  return 'bg-slate-700 text-slate-400';
};

const getRoleBadgeColor = (role: UserRole) => {
  switch (role) {
    case 'superadmin': return 'bg-red-500/20 text-red-400 border-red-500/50';
    case 'editor': return 'bg-indigo-500/20 text-indigo-400 border-indigo-500/50';
    case 'viewer': return 'bg-slate-500/20 text-slate-400 border-slate-500/50';
    default: return 'bg-slate-500/20 text-slate-400';
  }
};

const getEnvApiKey = () => {
  try {
    // @ts-ignore
    return (typeof process !== 'undefined' && process.env) ? process.env.API_KEY : '';
  } catch (e) {
    return '';
  }
};

// Default Columns matching the original Excel structure
const INITIAL_COLUMNS: ColumnConfig[] = [
  { id: 'date', label: 'Date', type: 'date', width: 'w-24' },
  { id: 'assetId', label: 'Asset ID', type: 'text', width: 'w-32' },
  { id: 'materialType', label: 'Material Type', type: 'text' },
  { id: 'modelVariant', label: 'Model/Variant', type: 'text' }, 
  { id: 'nos', label: 'NOS', type: 'number', width: 'w-16' },   
  { id: 'circle', label: 'Circle', type: 'text' },              
  { id: 'division', label: 'Division', type: 'text' },          
  { id: 'substation', label: 'Substation', type: 'text' },      
  { id: 'status', label: 'Status', type: 'select', options: ['Installed', 'Spare', 'Returned', 'Planned', 'Defective', 'Maintenance'] }, 
  { id: 'assignedTo', label: 'Assigned To', type: 'text' },     
  { id: 'plannedDate', label: 'Planned Date', type: 'date' },
  { id: 'replacementDate', label: 'Replacement Date', type: 'date' },
  { id: 'remarks', label: 'Remarks', type: 'textarea' },
  { id: 'lastUpdatedBy', label: 'Updated By', type: 'text' }
];

const INITIAL_DATA: AssetRecord[] = [
  { id: '1', date: '2025-11-20', assetId: '1', materialType: 'BMU', modelVariant: '11kV DC', nos: 2, circle: 'HIMMATANAGAR', division: 'AGIYOL', substation: '', status: 'Installed', assignedTo: 'HARDIK THAKOR', plannedDate: '2025-11-20', replacementDate: '', remarks: 'REQUESTED TO SEND TO AKASH VAIRAGI', lastUpdatedBy: 'ADITYA' },
  { id: '2', date: '2025-11-20', assetId: '2', materialType: 'BMU', modelVariant: '11kV DC', nos: 1, circle: 'HIMMATANAGAR', division: 'DHANSURA', substation: '', status: 'Spare', assignedTo: 'PIYUSH', plannedDate: '', replacementDate: '', remarks: '11KV RDSS', lastUpdatedBy: 'ADITYA' },
  { id: '3', date: '2025-11-20', assetId: '3', materialType: 'BMU', modelVariant: '11kV DC', nos: 1, circle: 'HIMMATANAGAR', division: 'AGIYOL', substation: 'RAYGADH', status: 'Installed', assignedTo: 'HARSVARDHAN', plannedDate: '2025-11-20', replacementDate: '', remarks: '', lastUpdatedBy: 'ADITYA' },
  { id: '4', date: '2025-11-20', assetId: '4', materialType: 'BMU', modelVariant: '66kV', nos: 1, circle: 'HIMMATANAGAR', division: 'IDAR', substation: '', status: 'Spare', assignedTo: 'DAKSH', plannedDate: '', replacementDate: '', remarks: '', lastUpdatedBy: 'ADITYA' },
  { id: '5', date: '2025-11-20', assetId: '5', materialType: 'BMU', modelVariant: '11kV DC', nos: 1, circle: 'HIMMATANAGAR', division: 'IDAR', substation: 'HINGATIYA', status: 'Installed', assignedTo: 'DAKSH', plannedDate: '2025-11-20', replacementDate: '', remarks: '11kV PANCHMAHUDA', lastUpdatedBy: 'ADITYA' },
];

const App = () => {
  // --- Auth State ---
  // Load user from localStorage to persist login session
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const savedUser = localStorage.getItem('app_session_user');
      return savedUser ? JSON.parse(savedUser) : null;
    } catch (e) { return null; }
  });

  const [users, setUsers] = useState<User[]>(() => {
    const saved = localStorage.getItem('app_users');
    return saved ? JSON.parse(saved) : DEFAULT_USERS;
  });
  const [loginForm, setLoginForm] = useState({ username: '', password: '', apiKey: '' });
  const [loginError, setLoginError] = useState('');

  // --- App State ---
  const [activeTab, setActiveTab] = useState<'inventory' | 'engineers' | 'charts' | 'history' | 'users'>('inventory');
  
  // Data State
  const [inventory, setInventory] = useState<AssetRecord[]>(INITIAL_DATA);
  const [columns, setColumns] = useState<ColumnConfig[]>(INITIAL_COLUMNS);
  
  // DB State
  const [dbConfig, setDbConfig] = useState<DBConfig | null>(null);
  const [isDbConnected, setIsDbConnected] = useState(false);
  const [showDbModal, setShowDbModal] = useState(false);
  const [dbLoading, setDbLoading] = useState(false);
  const [dbError, setDbError] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showInstallModal, setShowInstallModal] = useState(false);
  const [showCustomizeModal, setShowCustomizeModal] = useState(false);
  const [statusModalItem, setStatusModalItem] = useState<AssetRecord | null>(null);
  const [activeKPI, setActiveKPI] = useState<string | null>(null);
  const [activeEngineer, setActiveEngineer] = useState<string | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [chartConfig, setChartConfig] = useState({ groupBy: 'circle', metric: 'count' });
  const [newUserForm, setNewUserForm] = useState({ username: '', password: '', role: 'viewer' as UserRole });
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [messages, setMessages] = useState<Message[]>([
    { role: 'model', text: "LogisticsDroid Online. Connected to secure database grid." }
  ]);
  const [inputMessage, setInputMessage] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [formData, setFormData] = useState<Partial<AssetRecord>>({});
  const [sqlCopied, setSqlCopied] = useState(false);

  // --- Permissions Check ---
  const canEdit = currentUser && ['superadmin', 'editor'].includes(currentUser.role);
  const canManageUsers = currentUser && currentUser.role === 'superadmin';

  // --- DB Client Helper ---
  const getSupabase = () => {
    if (!dbConfig) return null;
    return createClient(dbConfig.url, dbConfig.key);
  };

  // --- Effects ---
  
  // 1. Initial Load of Local Configs & Data & Auto-Connect DB
  useEffect(() => {
    // Load API Key
    const savedKey = localStorage.getItem('user_gemini_key');
    if (savedKey) setLoginForm(prev => ({...prev, apiKey: savedKey}));

    // Load DB Config and Auto-Connect
    const savedDb = localStorage.getItem('app_db_config');
    if (savedDb) {
      try {
        const config = JSON.parse(savedDb);
        setDbConfig(config);
        setIsDbConnected(true);
        refreshDataFromDb(config);
      } catch (e) { console.error("Failed to load DB config", e); }
    } else {
      // Fallback to LocalStorage if no DB is configured
      try {
        const savedInv = localStorage.getItem('app_inventory');
        if (savedInv) setInventory(JSON.parse(savedInv));
        const savedCols = localStorage.getItem('app_columns');
        if (savedCols) setColumns(JSON.parse(savedCols));
      } catch(e) {}
    }
  }, []);

  // 2. Real-time Subscription Setup
  useEffect(() => {
    if (!isDbConnected || !dbConfig) return;

    const supabase = createClient(dbConfig.url, dbConfig.key);
    
    // Subscribe to ASSETS changes (Real-time Sync)
    const channel = supabase
      .channel('public:assets')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'assets' }, (payload) => {
        // Handle Realtime Updates
        if (payload.eventType === 'INSERT') {
            const newItem = { id: payload.new.id, ...payload.new.data };
            setInventory(prev => {
                if (prev.some(i => i.id === newItem.id)) return prev; // Avoid dupe
                return [...prev, newItem];
            });
        } else if (payload.eventType === 'UPDATE') {
            const updatedItem = { id: payload.new.id, ...payload.new.data };
            setInventory(prev => prev.map(item => item.id === updatedItem.id ? updatedItem : item));
        } else if (payload.eventType === 'DELETE') {
            setInventory(prev => prev.filter(item => item.id !== payload.old.id));
        }
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
           console.log("Realtime subscription active");
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isDbConnected, dbConfig]);


  // 3. Persist to LocalStorage (Backup) AND Database
  useEffect(() => {
    // Always save local backup
    if (!isDbConnected) {
       localStorage.setItem('app_inventory', JSON.stringify(inventory));
       localStorage.setItem('app_columns', JSON.stringify(columns));
    }
    localStorage.setItem('app_users', JSON.stringify(users));
  }, [inventory, columns, users, isDbConnected]);

  // --- Database Operations ---

  const refreshDataFromDb = async (config: DBConfig) => {
    setDbLoading(true);
    setDbError(null);
    try {
      const supabase = createClient(config.url, config.key);
      
      // 1. Fetch Assets
      const { data: assets, error: assetError } = await supabase.from('assets').select('*');
      if (assetError) throw new Error(`Assets Sync Failed: ${assetError.message}`);
      
      if (assets && assets.length > 0) {
        // Map DB 'data' column back to flat object
        const flatAssets = assets.map((row: any) => ({
             id: row.id,
             ...row.data // Spread the JSONB data
        }));
        setInventory(flatAssets);
      }

      // 2. Fetch Config (Columns & Users)
      const { data: configs, error: configError } = await supabase.from('app_config').select('*');
      if (configError) throw new Error(`Config Sync Failed: ${configError.message}`);
      
      if (configs) {
         const cols = configs.find((c: any) => c.key === 'columns');
         if (cols) setColumns(cols.value);

         const remoteUsers = configs.find((c: any) => c.key === 'users_list');
         if (remoteUsers) setUsers(remoteUsers.value);
      }

    } catch (e: any) {
      console.error("DB Sync Error:", e);
      setDbError(e.message || "Unknown Connection Error");
      // Fallback to local storage if DB fails
      try {
        const savedInv = localStorage.getItem('app_inventory');
        if (savedInv) setInventory(JSON.parse(savedInv));
      } catch(err) {}
    } finally {
      setDbLoading(false);
    }
  };

  const saveAssetToDb = async (asset: AssetRecord) => {
    if (!isDbConnected || !dbConfig) return;
    const supabase = getSupabase();
    if (!supabase) return;
    
    // Separate ID from Data for clean storage
    const { id, ...data } = asset;
    
    const { error } = await supabase.from('assets').upsert({ 
        id: String(id), 
        data: data 
    });

    if (error) {
       setMessages(prev => [...prev, { role: 'model', text: `Sync Error: ${error.message}` }]);
       alert(`Failed to save to cloud: ${error.message}. Check your internet or Table Permissions.`);
    }
  };

  const deleteAssetFromDb = async (id: string) => {
    if (!isDbConnected || !dbConfig) return;
    const supabase = getSupabase();
    if (!supabase) return;

    await supabase.from('assets').delete().eq('id', id);
  };

  const saveColumnsToDb = async (newColumns: ColumnConfig[]) => {
    if (!isDbConnected || !dbConfig) return;
    const supabase = getSupabase();
    if (!supabase) return;

    await supabase.from('app_config').upsert({ 
        key: 'columns', 
        value: newColumns 
    });
  };

  const saveUsersToDb = async (newUsers: User[]) => {
    if (!isDbConnected || !dbConfig) return;
    const supabase = getSupabase();
    if (!supabase) return;

    await supabase.from('app_config').upsert({ 
        key: 'users_list', 
        value: newUsers 
    });
  };

  const handleConnectDb = async (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const url = (form.elements.namedItem('dbUrl') as HTMLInputElement).value;
    const key = (form.elements.namedItem('dbKey') as HTMLInputElement).value;
    
    if(!url || !key) return;

    const newConfig = { url, key };
    setDbConfig(newConfig);
    localStorage.setItem('app_db_config', JSON.stringify(newConfig));
    setIsDbConnected(true);
    setShowDbModal(false);
    
    // Try to sync immediately
    await refreshDataFromDb(newConfig);
    alert("Cloud Connection Configured! The app is now attempting to sync.");
  };

  const handleDisconnectDb = () => {
    if(confirm("Disconnect from Cloud Database? App will revert to local offline mode.")) {
       localStorage.removeItem('app_db_config');
       setDbConfig(null);
       setIsDbConnected(false);
       setShowDbModal(false);
       setDbError(null);
    }
  };

  const copySql = () => {
    const sql = `
-- 1. Create Assets Table
create table if not exists assets (
  id text primary key,
  data jsonb not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Create Config Table
create table if not exists app_config (
  key text primary key,
  value jsonb not null
);

-- 3. Enable RLS but allow Public Access (Simplest for this app)
alter table assets enable row level security;
alter table app_config enable row level security;

-- 4. Policies to allow ALL operations (Select, Insert, Update, Delete)
create policy "Public Assets Access" on assets for all using (true) with check (true);
create policy "Public Config Access" on app_config for all using (true) with check (true);

-- 5. Enable Realtime (Vital for instant updates!)
alter publication supabase_realtime add table assets;
alter publication supabase_realtime add table app_config;
    `;
    navigator.clipboard.writeText(sql);
    setSqlCopied(true);
    setTimeout(() => setSqlCopied(false), 2000);
  };


  // --- Standard Handlers ---

  useEffect(() => {
    if (chatEndRef.current) chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isChatOpen]);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  useEffect(() => {
    if (showAddModal) {
      const initialForm: any = { date: new Date().toISOString().split('T')[0] };
      if (columns.some(c => c.id === 'nos')) initialForm.nos = 1;
      if (columns.some(c => c.id === 'status')) initialForm.status = 'Spare';
      if (columns.some(c => c.id === 'lastUpdatedBy')) initialForm.lastUpdatedBy = currentUser?.username || 'USER';
      setFormData(initialForm);
    }
  }, [showAddModal]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const user = users.find(u => u.username.toLowerCase() === loginForm.username.toLowerCase() && u.password === loginForm.password);
    if (user) {
      setCurrentUser(user);
      localStorage.setItem('app_session_user', JSON.stringify(user)); // Persist session
      setLoginError('');
      setActiveTab('inventory');
      if (loginForm.apiKey.trim()) localStorage.setItem('user_gemini_key', loginForm.apiKey.trim());
      
      // Attempt to refresh DB on login if connected
      if (isDbConnected && dbConfig) {
          refreshDataFromDb(dbConfig);
      }
    } else {
      setLoginError('Invalid credentials.');
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('app_session_user'); // Clear session
    setLoginForm(prev => ({ ...prev, password: '' }));
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (users.some(u => u.username === newUserForm.username)) {
      alert("Username already exists");
      return;
    }
    const newUser: User = { ...newUserForm };
    const updatedUsers = [...users, newUser];
    setUsers(updatedUsers);
    
    if(isDbConnected) await saveUsersToDb(updatedUsers);
    
    setNewUserForm({ username: '', password: '', role: 'viewer' });
  };

  const handleDeleteUser = async (username: string) => {
    if (username === 'admin') { alert("Cannot delete Super Admin."); return; }
    const updatedUsers = users.filter(u => u.username !== username);
    setUsers(updatedUsers);
    if(isDbConnected) await saveUsersToDb(updatedUsers);
  };

  const handleUpdateRole = async (username: string, newRole: UserRole) => {
    if (username === 'admin' && newRole !== 'superadmin') { alert("Cannot demote Super Admin."); return; }
    const updatedUsers = users.map(u => u.username === username ? { ...u, role: newRole } : u);
    setUsers(updatedUsers);
    if(isDbConnected) await saveUsersToDb(updatedUsers);
  };

  const handleInstallClick = () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then((choiceResult: any) => setDeferredPrompt(null));
    } else {
      setShowInstallModal(true);
    }
  };
  
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!canEdit) return;
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      const lines = text.split('\n');
      const newItems: AssetRecord[] = [];
      
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        const cols = line.includes('\t') ? line.split('\t') : line.split(',');
        
        const item: AssetRecord = { id: `imp-${Date.now()}-${i}` };
        columns.forEach((col, index) => {
          if (cols[index] !== undefined) {
             let val: any = cols[index].trim();
             if (col.type === 'number') val = parseFloat(val) || 0;
             item[col.id] = val;
          }
        });
        newItems.push(item);
        
        // Sync to DB if connected
        if (isDbConnected) await saveAssetToDb(item);
      }
      
      // Update local state if NOT connected (if connected, realtime will handle it, or we optimistically update)
      // For bulk import, optimistic update is safer
      setInventory(prev => [...prev, ...newItems]);
      setMessages(prev => [...prev, { role: 'model', text: `Imported ${newItems.length} records.` }]);
    };
    reader.readAsText(file);
  };

  const handleExportCSV = () => {
    const headers = columns.map(c => c.label).join(',');
    const rows = historyFilteredData.map(item => {
      return columns.map(col => `"${String(item[col.id] || '').replace(/"/g, '""')}"`).join(',');
    });
    const csvContent = [headers, ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `inventory_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit) return;
    const newItem: AssetRecord = {
      ...formData as AssetRecord,
      id: Date.now().toString(),
    };
    
    // Optimistic Update
    setInventory([...inventory, newItem]);
    
    // Sync DB
    if (isDbConnected) await saveAssetToDb(newItem);
    
    setShowAddModal(false);
    setMessages(prev => [...prev, { role: 'model', text: `Record added to database.` }]);
  };

  const handleDeleteItem = async (id: string) => {
    if (!canEdit) return;
    setInventory(inventory.filter(a => a.id !== id));
    
    // Sync DB
    if (isDbConnected) await deleteAssetFromDb(id);
  };

  const handleQuickStatusUpdate = async (newStatus: string) => {
    if (!canEdit) return;
    if (!statusModalItem) return;
    const updatedInv = inventory.map(item => {
        if (item.id === statusModalItem.id) {
            const updated = { ...item, status: newStatus };
            // Sync DB
            if (isDbConnected) saveAssetToDb(updated);
            return updated;
        }
        return item;
    });
    setInventory(updatedInv);
    setStatusModalItem(null);
    setMessages(prev => [...prev, { role: 'model', text: `Status updated to ${newStatus}.` }]);
  };

  const handleInputChange = (field: string, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // --- Column Customization Handlers ---
  const handleAddColumn = () => {
    if (!canManageUsers) return;
    const newId = `custom_${Date.now()}`;
    setColumns([...columns, { id: newId, label: 'New Field', type: 'text' }]);
  };

  const handleUpdateColumn = (index: number, updates: Partial<ColumnConfig>) => {
    if (!canManageUsers) return;
    const newCols = [...columns];
    newCols[index] = { ...newCols[index], ...updates };
    setColumns(newCols);
  };

  const handleDeleteColumn = (index: number) => {
    if (!canManageUsers) return;
    const newCols = columns.filter((_, i) => i !== index);
    setColumns(newCols);
  };
  
  const handleSaveColumns = async () => {
     setShowCustomizeModal(false);
     if (isDbConnected) await saveColumnsToDb(columns);
  };

  const handleResetData = () => {
    if(confirm("WARNING: This will delete ALL local data. Cloud data is safe but local cache will be cleared. Are you sure?")) {
        localStorage.removeItem('app_inventory');
        localStorage.removeItem('app_columns');
        setInventory(INITIAL_DATA);
        setColumns(INITIAL_COLUMNS);
        alert("Local Data Reset Complete.");
    }
  };

  // --- Derived State ---
  const totalAssets = inventory.reduce((acc, item) => acc + (Number(item.nos) || 0), 0);
  const installedCount = inventory.filter(i => String(i.status).toLowerCase() === 'installed').reduce((acc, item) => acc + (Number(item.nos) || 0), 0);
  const spareCount = inventory.filter(i => String(i.status).toLowerCase() === 'spare').reduce((acc, item) => acc + (Number(item.nos) || 0), 0);
  const plannedCount = inventory.filter(i => String(i.status).toLowerCase() === 'planned').reduce((acc, item) => acc + (Number(item.nos) || 0), 0);
  
  const engineers = Array.from(new Set(inventory.filter(i => i.assignedTo).map(i => i.assignedTo as string))).sort();

  const filteredInventory = inventory.filter(item => {
    const searchLower = searchTerm.toLowerCase();
    return columns.some(col => {
      const val = item[col.id];
      return val && String(val).toLowerCase().includes(searchLower);
    });
  });

  const historyFilteredData = inventory.filter(item => {
    if (!item.date) return false;
    const itemDate = new Date(item.date);
    const start = dateRange.start ? new Date(dateRange.start) : null;
    const end = dateRange.end ? new Date(dateRange.end) : null;
    if (start && itemDate < start) return false;
    if (end && itemDate > end) return false;
    return true;
  });

  const chartData = React.useMemo(() => {
    const data: Record<string, number> = {};
    inventory.forEach(item => {
       const key = String(item[chartConfig.groupBy] || 'Unknown');
       const val = chartConfig.metric === 'sum_nos' ? (Number(item.nos) || 0) : 1;
       data[key] = (data[key] || 0) + val;
    });
    return Object.entries(data).sort(([, a], [, b]) => b - a).slice(0, 15);
  }, [inventory, chartConfig]);

  const maxChartValue = Math.max(...chartData.map(([, v]) => v), 1);

  const getKPIBreakdown = (kpiType: string) => {
    let filtered = inventory;
    if (kpiType === 'Installed') filtered = inventory.filter(i => String(i.status).toLowerCase() === 'installed');
    if (kpiType === 'Spare') filtered = inventory.filter(i => String(i.status).toLowerCase() === 'spare');
    if (kpiType === 'Planned') filtered = inventory.filter(i => String(i.status).toLowerCase() === 'planned');
    
    const breakdown: Record<string, number> = {};
    filtered.forEach(item => {
      const type = item.materialType || 'Unknown';
      const model = item.modelVariant || 'Unknown';
      const key = `${type} - ${model}`;
      breakdown[key] = (breakdown[key] || 0) + (Number(item.nos) || 0);
    });
    return Object.entries(breakdown).sort((a, b) => b[1] - a[1]);
  };

  const getEngineerBreakdown = (engName: string) => {
    const items = inventory.filter(i => i.assignedTo === engName);
    const spares = items.filter(i => String(i.status).toLowerCase() === 'spare').length;
    const installed = items.filter(i => String(i.status).toLowerCase() === 'installed').length;
    const returned = items.filter(i => String(i.status).toLowerCase() === 'returned').length;
    const planned = items.filter(i => String(i.status).toLowerCase() === 'planned').length;
    return { items, spares, installed, returned, planned };
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;
    const apiKey = localStorage.getItem('user_gemini_key') || getEnvApiKey();

    if (!apiKey) {
        setMessages(prev => [...prev, { role: 'model', text: "Error: No API Key found." }]);
        return;
    }

    const userText = inputMessage;
    setInputMessage("");
    setMessages(prev => [...prev, { role: 'user', text: userText }]);
    setIsThinking(true);

    try {
      const ai = new GoogleGenAI({ apiKey: apiKey });
      const visibleColumns = columns.map(c => c.label).join(', ');
      
      const contextData = inventory.slice(0, 50).map(item => {
        let simplified: any = {};
        columns.forEach(col => { simplified[col.label] = item[col.id]; });
        return simplified;
      });

      const prompt = `
        You are "LogisticsDroid".
        Data Schema Fields: ${visibleColumns}.
        Inventory Sample: ${JSON.stringify(contextData)}
        User Query: ${userText}
      `;

      const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
      setMessages(prev => [...prev, { role: 'model', text: response.text || "Error." }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'model', text: "API Error." }]);
    } finally {
      setIsThinking(false);
    }
  };

  // --- Render ---

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-[#0f172a] flex items-center justify-center p-4 relative overflow-hidden font-sans">
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
          <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] bg-blue-600 rounded-full blur-[150px] opacity-20" />
          <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] bg-indigo-600 rounded-full blur-[150px] opacity-20" />
        </div>
        <div className="glass-panel w-full max-w-md p-8 rounded-2xl border border-indigo-500/30 shadow-2xl relative z-10">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-indigo-500/20 rounded-xl flex items-center justify-center mx-auto mb-4 neon-border shadow-[0_0_20px_rgba(99,102,241,0.4)]">
              <Shield className="w-8 h-8 text-indigo-400" />
            </div>
            <h1 className="text-2xl font-bold font-display tracking-wider text-white">SECURE<span className="text-indigo-400">LOGIN</span></h1>
            <p className="text-slate-400 text-sm mt-2 font-mono">Logistics Command Center</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs uppercase text-slate-500 font-bold mb-1.5 ml-1">Username</label>
              <div className="relative">
                <input type="text" value={loginForm.username} onChange={e => setLoginForm({...loginForm, username: e.target.value})} className="w-full bg-slate-800/50 border border-slate-600 rounded-lg pl-10 pr-4 py-3 text-white focus:outline-none focus:border-indigo-400" placeholder="Enter ID" />
                <Bot className="w-5 h-5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              </div>
            </div>
            <div>
              <label className="block text-xs uppercase text-slate-500 font-bold mb-1.5 ml-1">Password</label>
              <div className="relative">
                <input type="password" value={loginForm.password} onChange={e => setLoginForm({...loginForm, password: e.target.value})} className="w-full bg-slate-800/50 border border-slate-600 rounded-lg pl-10 pr-4 py-3 text-white focus:outline-none focus:border-indigo-400" placeholder="••••••••" />
                <Lock className="w-5 h-5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              </div>
            </div>
            <div className="pt-2 border-t border-slate-700/50">
               <label className="block text-[10px] uppercase text-indigo-400 font-bold mb-1.5 ml-1">Gemini API Key (Optional)</label>
               <div className="relative">
                  <input type="password" value={loginForm.apiKey} onChange={e => setLoginForm({...loginForm, apiKey: e.target.value})} className="w-full bg-slate-900/50 border border-slate-700 rounded-lg pl-10 pr-4 py-2 text-xs text-slate-300 focus:outline-none focus:border-indigo-400" placeholder="Enter key if hosting on GitHub Pages" />
                  <Key className="w-4 h-4 text-slate-600 absolute left-3 top-1/2 -translate-y-1/2" />
               </div>
            </div>
            {loginError && <div className="text-red-400 text-sm text-center bg-red-500/10 border border-red-500/20 p-3 rounded-lg flex items-center justify-center gap-2"><AlertTriangle className="w-4 h-4" /> {loginError}</div>}
            <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-lg shadow-[0_0_20px_rgba(99,102,241,0.4)] transition-all flex items-center justify-center gap-2 group mt-4"><span className="group-hover:tracking-widest transition-all duration-300">AUTHENTICATE</span><ArrowRightLeft className="w-4 h-4" /></button>
          </form>
          <div className="mt-8 text-center border-t border-slate-700/50 pt-4"><p className="text-[10px] text-slate-500 uppercase tracking-widest">Authorized Personnel Only</p><div className="mt-2 text-xs text-slate-600">Default: admin/password | staff/123 | guest/guest</div></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20 relative overflow-hidden text-slate-200 font-sans">
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 opacity-20 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[30%] h-[30%] bg-indigo-600 rounded-full blur-[100px]" />
      </div>

      <header className="px-6 py-4 flex flex-wrap gap-4 justify-between items-center glass-panel sticky top-0 z-30 mb-6 border-b border-indigo-500/20 backdrop-blur-xl bg-slate-900/80">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-500/20 p-2 rounded-lg neon-border shadow-[0_0_15px_rgba(99,102,241,0.3)]">
            <Cpu className="w-6 h-6 text-indigo-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-display tracking-wider text-white">GRID<span className="text-indigo-400">ASSETS</span></h1>
            <p className="text-[10px] text-indigo-300 font-mono tracking-[0.2em] uppercase">Material Management System</p>
          </div>
        </div>
        
        <div className="flex gap-3 items-center">
           {/* Cloud Database Button */}
           <button 
             onClick={() => setShowDbModal(true)}
             className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all text-xs font-mono uppercase tracking-wide ${isDbConnected ? 'bg-indigo-900/40 border-indigo-500/50 text-indigo-300 shadow-[0_0_10px_rgba(99,102,241,0.3)]' : 'bg-slate-800 border-slate-600 text-slate-400 hover:text-white'}`}
           >
             {isDbConnected ? <Cloud className="w-4 h-4 text-green-400" /> : <Database className="w-4 h-4" />}
             <span className="hidden sm:inline">{isDbConnected ? 'Cloud Sync' : 'Connect DB'}</span>
           </button>

           <div className={`hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium uppercase tracking-wide ${getRoleBadgeColor(currentUser.role)}`}>
              <Users className="w-3 h-3" />
              <span>{currentUser.username}</span>
           </div>

           <div className="relative hidden md:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input type="text" placeholder="Search database..." className="bg-slate-800/50 border border-slate-600 rounded-lg pl-9 pr-4 py-1.5 text-sm focus:outline-none focus:border-indigo-400 w-64 transition-all" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
           </div>

           {canManageUsers && (
             <button onClick={() => setShowCustomizeModal(true)} className="flex items-center gap-2 px-3 py-1.5 bg-indigo-900/40 hover:bg-indigo-900/60 rounded-lg cursor-pointer transition-colors border border-indigo-500/30 text-indigo-300 text-xs font-mono uppercase tracking-wide">
               <Settings className="w-4 h-4" /><span className="hidden sm:inline">Customize Fields</span>
             </button>
           )}

           <button onClick={handleInstallClick} className="flex items-center gap-2 px-3 py-1.5 bg-green-600/20 hover:bg-green-600/40 rounded-lg cursor-pointer transition-colors border border-green-500/40 text-green-400 text-xs font-mono uppercase tracking-wide group">
              <Download className="w-4 h-4" /><span className="hidden sm:inline">Install / Get App</span>
           </button>

           {canEdit && (
              <label className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg cursor-pointer transition-colors border border-slate-600 hover:border-indigo-400 text-xs font-mono uppercase tracking-wide">
                <FileSpreadsheet className="w-4 h-4 text-emerald-400" /><span className="hidden sm:inline">Import CSV</span>
                <input type="file" accept=".csv,.txt" onChange={handleFileUpload} className="hidden" />
              </label>
           )}

          <button onClick={handleLogout} className="p-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors border border-red-500/20"><LogOut className="w-4 h-4" /></button>
          <button onClick={() => setIsChatOpen(!isChatOpen)} className={`p-2 rounded-full transition-all duration-300 ${isChatOpen ? 'bg-indigo-500 text-white shadow-[0_0_15px_rgba(99,102,241,0.5)]' : 'bg-slate-800 hover:bg-slate-700 text-slate-300'}`}>
            {isChatOpen ? <X className="w-5 h-5"/> : <Bot className="w-5 h-5"/>}
          </button>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto px-4 md:px-6">
        <div className="flex gap-1 mb-6 bg-slate-800/50 p-1 rounded-xl w-fit border border-slate-700 flex-wrap">
          <button onClick={() => setActiveTab('inventory')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${activeTab === 'inventory' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'}`}><Package className="w-4 h-4" /> Master List</button>
          <button onClick={() => setActiveTab('engineers')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${activeTab === 'engineers' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'}`}><Users className="w-4 h-4" /> Engineer View</button>
          <button onClick={() => setActiveTab('charts')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${activeTab === 'charts' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'}`}><BarChart3 className="w-4 h-4" /> Analytics</button>
          <button onClick={() => setActiveTab('history')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${activeTab === 'history' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'}`}><CalendarRange className="w-4 h-4" /> History & Export</button>
          {canManageUsers && <button onClick={() => setActiveTab('users')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${activeTab === 'users' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'}`}><UserCog className="w-4 h-4" /> User Admin</button>}
        </div>

        {activeTab === 'inventory' && (
          <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div onClick={() => setActiveKPI('Total Assets')} className="glass-panel p-4 rounded-xl relative overflow-hidden group cursor-pointer hover:border-indigo-400/50 hover:scale-[1.02] transition-all">
              <div className="absolute right-0 top-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity"><Package className="w-16 h-16" /></div>
              <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1 flex items-center gap-1">Total Assets <Info className="w-3 h-3" /></p>
              <h2 className="text-3xl font-display font-bold text-white">{totalAssets}</h2>
            </div>
            <div onClick={() => setActiveKPI('Installed')} className="glass-panel p-4 rounded-xl relative overflow-hidden group border-l-4 border-l-green-500 cursor-pointer hover:border-l-green-400 hover:scale-[1.02] transition-all">
              <div className="absolute right-0 top-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity"><CheckCircle2 className="w-16 h-16" /></div>
              <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1 flex items-center gap-1">Installed <Info className="w-3 h-3" /></p>
              <h2 className="text-3xl font-display font-bold text-green-400">{installedCount}</h2>
            </div>
            <div onClick={() => setActiveKPI('Spare')} className="glass-panel p-4 rounded-xl relative overflow-hidden group border-l-4 border-l-blue-500 cursor-pointer hover:border-l-blue-400 hover:scale-[1.02] transition-all">
               <div className="absolute right-0 top-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity"><Box className="w-16 h-16" /></div>
              <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1 flex items-center gap-1">Spares <Info className="w-3 h-3" /></p>
              <h2 className="text-3xl font-display font-bold text-blue-400">{spareCount}</h2>
            </div>
            <div onClick={() => setActiveKPI('Planned')} className="glass-panel p-4 rounded-xl relative overflow-hidden group border-l-4 border-l-yellow-500 cursor-pointer hover:border-l-yellow-400 hover:scale-[1.02] transition-all">
               <div className="absolute right-0 top-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity"><Calendar className="w-16 h-16" /></div>
              <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1 flex items-center gap-1">Planned <Info className="w-3 h-3" /></p>
              <h2 className="text-3xl font-display font-bold text-yellow-400">{plannedCount}</h2>
            </div>
          </div>

          <div className="glass-panel rounded-xl overflow-hidden border border-slate-700/50 shadow-2xl">
            <div className="p-4 border-b border-slate-700/50 flex justify-between items-center bg-slate-800/40">
              <h3 className="font-display font-bold text-lg text-indigo-100 flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-indigo-400" /> Asset Registry 
                {isDbConnected && <span className="text-[10px] bg-green-900/40 text-green-400 border border-green-500/30 px-2 py-0.5 rounded-full flex items-center gap-1 animate-pulse"><Activity className="w-3 h-3"/> Live Sync</span>}
              </h3>
              {canEdit && <button onClick={() => setShowAddModal(true)} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-lg transition-colors text-sm font-medium shadow-[0_0_15px_rgba(99,102,241,0.4)]"><Plus className="w-4 h-4" /> Add Asset</button>}
            </div>
            {dbError && (
               <div className="p-4 bg-red-500/10 border-b border-red-500/30 text-red-400 text-sm flex items-center gap-2 justify-center">
                  <AlertTriangle className="w-4 h-4"/> Connection Error: {dbError}
               </div>
            )}
            {dbLoading ? (
               <div className="p-12 text-center text-indigo-400 flex flex-col items-center gap-4">
                  <RefreshCcw className="w-8 h-8 animate-spin" />
                  <p>Syncing with Cloud Database...</p>
               </div>
            ) : (
                <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                    <thead className="bg-slate-900/50 text-slate-400 text-xs uppercase tracking-wider font-semibold">
                    <tr>
                        {columns.map(col => <th key={col.id} className={`p-3 border-b border-slate-700 whitespace-nowrap ${col.width || ''}`}>{col.label}</th>)}
                        {canEdit && <th className="p-3 border-b border-slate-700 text-right">Action</th>}
                    </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700/30">
                    {filteredInventory.map((item) => (
                        <tr key={item.id} className="hover:bg-indigo-500/5 transition-colors group">
                        {columns.map(col => (
                            <td key={col.id} className="p-3 text-slate-300">
                            {col.id === 'status' || col.label.toLowerCase().includes('status') ? (
                                <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wide border ${getStatusColor(item[col.id])}`}>{item[col.id]}</span>
                            ) : col.type === 'date' ? (
                                <span className="font-mono text-xs text-slate-400">{item[col.id]}</span>
                            ) : (
                                <span className={col.id === 'assetId' ? 'font-mono text-white font-medium' : ''}>{item[col.id]}</span>
                            )}
                            </td>
                        ))}
                        {canEdit && (
                            <td className="p-3 text-right">
                            <div className="flex justify-end gap-1">
                                <button onClick={() => setStatusModalItem(item)} className="p-1.5 text-slate-400 hover:text-indigo-400 hover:bg-indigo-500/10 rounded transition-colors" title="Update Status"><ArrowRightLeft className="w-4 h-4" /></button>
                                <button onClick={() => handleDeleteItem(item.id)} className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors" title="Delete Item"><Trash2 className="w-4 h-4" /></button>
                            </div>
                            </td>
                        )}
                        </tr>
                    ))}
                    {filteredInventory.length === 0 && <tr><td colSpan={columns.length + (canEdit ? 1 : 0)} className="p-8 text-center text-slate-500">No assets found matching your search.</td></tr>}
                    </tbody>
                </table>
                </div>
            )}
          </div>
          </>
        )}

        {/* View: Engineers */}
        {activeTab === 'engineers' && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {engineers.map(eng => {
              const { items, spares, installed } = getEngineerBreakdown(eng);
              return (
                <div key={eng} onClick={() => setActiveEngineer(eng)} className="glass-panel rounded-xl overflow-hidden border border-indigo-500/20 hover:border-indigo-500/50 hover:scale-[1.01] transition-all group cursor-pointer">
                  <div className="p-4 bg-gradient-to-r from-indigo-900/40 to-slate-900/40 border-b border-indigo-500/20 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-indigo-600 flex items-center justify-center font-bold text-white text-lg shadow-lg">{eng.charAt(0)}</div>
                      <div><h3 className="font-bold text-white tracking-wide">{eng}</h3><p className="text-[10px] text-indigo-300 uppercase tracking-wider">Field Engineer</p></div>
                    </div>
                    <div className="flex gap-2">
                       <div className="text-center px-2 py-1 bg-slate-800 rounded"><div className="text-[10px] text-slate-500 uppercase">Spare</div><div className="font-mono font-bold text-blue-400">{spares}</div></div>
                       <div className="text-center px-2 py-1 bg-slate-800 rounded"><div className="text-[10px] text-slate-500 uppercase">Inst</div><div className="font-mono font-bold text-green-400">{installed}</div></div>
                    </div>
                  </div>
                  <div className="p-0">
                    <ul className="divide-y divide-slate-700/30 max-h-[300px] overflow-y-auto custom-scrollbar">
                      {items.slice(0, 5).map(item => (
                        <li key={item.id} className="p-3 hover:bg-slate-800/30 transition-colors">
                           <div className="flex justify-between items-start mb-1"><span className="font-medium text-slate-200 text-sm">{item.modelVariant || 'Unknown Item'}</span><span className={`text-[10px] px-1.5 rounded border ${getStatusColor(item.status)}`}>{item.status}</span></div>
                           <div className="flex justify-between items-end"><div className="text-xs text-slate-500">{item.circle} {item.division && ` > ${item.division}`}</div><div className="text-xs font-mono text-slate-400">ID: {item.assetId}</div></div>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* View: Analytics */}
        {activeTab === 'charts' && (
          <div className="space-y-6">
             <div className="glass-panel p-4 rounded-xl flex flex-wrap gap-4 items-center">
                <div>
                   <label className="text-xs text-slate-400 uppercase font-bold block mb-1">Group By</label>
                   <select value={chartConfig.groupBy} onChange={(e) => setChartConfig(prev => ({...prev, groupBy: e.target.value}))} className="bg-slate-800 border border-slate-600 rounded px-3 py-1.5 text-sm min-w-[150px] focus:border-indigo-400 outline-none">
                      {columns.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                   </select>
                </div>
                <div>
                   <label className="text-xs text-slate-400 uppercase font-bold block mb-1">Metric</label>
                   <select value={chartConfig.metric} onChange={(e) => setChartConfig(prev => ({...prev, metric: e.target.value}))} className="bg-slate-800 border border-slate-600 rounded px-3 py-1.5 text-sm min-w-[150px] focus:border-indigo-400 outline-none">
                      <option value="count">Count Records</option>
                      <option value="sum_nos">Sum of Quantities (NOS)</option>
                   </select>
                </div>
             </div>
             <div className="glass-panel p-6 rounded-xl border border-slate-700">
                <h3 className="text-lg font-bold mb-6 flex items-center gap-2"><BarChart3 className="text-indigo-400" /> Distribution by {columns.find(c => c.id === chartConfig.groupBy)?.label || chartConfig.groupBy}</h3>
                {chartData.length > 0 ? (
                  <div className="space-y-3">
                    {chartData.map(([label, value], idx) => (
                      <div key={label} className="relative">
                        <div className="flex justify-between text-xs mb-1"><span className="font-bold text-slate-300">{label}</span><span className="font-mono text-indigo-300">{value}</span></div>
                        <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden"><div className="h-full bg-indigo-500 rounded-full transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(99,102,241,0.5)]" style={{ width: `${(value / maxChartValue) * 100}%`, animationDelay: `${idx * 50}ms` }} /></div>
                      </div>
                    ))}
                  </div>
                ) : <div className="text-center py-10 text-slate-500">No data available for this grouping.</div>}
             </div>
          </div>
        )}

        {/* View: History */}
        {activeTab === 'history' && (
          <div className="space-y-6">
             <div className="glass-panel p-6 rounded-xl border-l-4 border-indigo-500">
                <div className="flex flex-col md:flex-row justify-between items-end gap-4">
                   <div className="flex flex-wrap gap-4 w-full md:w-auto">
                      <div><label className="text-xs text-slate-400 uppercase font-bold block mb-1">Start Date</label><input type="date" className="bg-slate-800 border border-slate-600 rounded px-3 py-2 text-sm w-full md:w-40 focus:border-indigo-400 outline-none" value={dateRange.start} onChange={(e) => setDateRange(prev => ({...prev, start: e.target.value}))} /></div>
                      <div><label className="text-xs text-slate-400 uppercase font-bold block mb-1">End Date</label><input type="date" className="bg-slate-800 border border-slate-600 rounded px-3 py-2 text-sm w-full md:w-40 focus:border-indigo-400 outline-none" value={dateRange.end} onChange={(e) => setDateRange(prev => ({...prev, end: e.target.value}))} /></div>
                   </div>
                   <button onClick={handleExportCSV} className="w-full md:w-auto px-6 py-2.5 bg-green-600 hover:bg-green-500 text-white rounded-lg font-medium shadow-lg flex items-center justify-center gap-2 transition-all"><FileDown className="w-4 h-4" /> Export Filtered CSV</button>
                </div>
             </div>
             <div className="glass-panel rounded-xl overflow-hidden border border-slate-700/50">
               <div className="p-4 bg-slate-800/40 border-b border-slate-700"><h3 className="font-bold flex items-center gap-2 text-indigo-100"><CalendarRange className="w-4 h-4 text-indigo-400" /> Filtered Registry ({historyFilteredData.length} records)</h3></div>
               <div className="overflow-x-auto max-h-[600px]">
                 <table className="w-full text-left text-sm">
                    <thead className="bg-slate-900/50 text-slate-400 text-xs uppercase tracking-wider font-semibold sticky top-0 z-10 backdrop-blur-md"><tr>{columns.map(col => <th key={col.id} className="p-3 border-b border-slate-700 whitespace-nowrap">{col.label}</th>)}</tr></thead>
                    <tbody className="divide-y divide-slate-700/30">
                      {historyFilteredData.map((item) => (
                        <tr key={item.id} className="hover:bg-indigo-500/5 transition-colors">{columns.map(col => <td key={col.id} className="p-3 text-slate-300 whitespace-nowrap">{item[col.id]}</td>)}</tr>
                      ))}
                    </tbody>
                 </table>
               </div>
             </div>
          </div>
        )}

        {/* View: User Management */}
        {activeTab === 'users' && canManageUsers && (
          <div className="space-y-6">
             <div className="glass-panel p-6 rounded-xl border border-indigo-500/30">
               <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2"><UserPlus className="w-5 h-5 text-indigo-400" /> Create New User</h3>
               <form onSubmit={handleCreateUser} className="flex flex-col md:flex-row gap-4 items-end">
                 <div className="flex-1 w-full"><label className="text-xs text-slate-400 uppercase font-bold block mb-1">Username</label><input type="text" required value={newUserForm.username} onChange={e => setNewUserForm({...newUserForm, username: e.target.value})} className="w-full bg-slate-800/50 border border-slate-600 rounded px-3 py-2 text-sm focus:border-indigo-400 outline-none" /></div>
                 <div className="flex-1 w-full"><label className="text-xs text-slate-400 uppercase font-bold block mb-1">Password</label><input type="text" required value={newUserForm.password} onChange={e => setNewUserForm({...newUserForm, password: e.target.value})} className="w-full bg-slate-800/50 border border-slate-600 rounded px-3 py-2 text-sm focus:border-indigo-400 outline-none" /></div>
                 <div className="flex-1 w-full"><label className="text-xs text-slate-400 uppercase font-bold block mb-1">Role</label><select value={newUserForm.role} onChange={e => setNewUserForm({...newUserForm, role: e.target.value as UserRole})} className="w-full bg-slate-800/50 border border-slate-600 rounded px-3 py-2 text-sm focus:border-indigo-400 outline-none"><option value="viewer">Viewer</option><option value="editor">Editor</option><option value="superadmin">Super Admin</option></select></div>
                 <button type="submit" className="w-full md:w-auto px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded font-medium shadow-lg transition-colors">Add User</button>
               </form>
             </div>
             <div className="glass-panel rounded-xl overflow-hidden border border-slate-700/50">
               <div className="p-4 bg-slate-800/40 border-b border-slate-700"><h3 className="font-bold flex items-center gap-2 text-indigo-100"><Users className="w-5 h-5 text-indigo-400" /> User Directory {isDbConnected && <span className="text-[10px] bg-green-900/40 text-green-400 px-2 rounded">Synced</span>}</h3></div>
               <div className="overflow-x-auto">
                 <table className="w-full text-left text-sm">
                    <thead className="bg-slate-900/50 text-slate-400 text-xs uppercase tracking-wider font-semibold"><tr><th className="p-3 border-b border-slate-700">Username</th><th className="p-3 border-b border-slate-700">Access Level</th><th className="p-3 border-b border-slate-700">Upgrade Access</th><th className="p-3 border-b border-slate-700 text-right">Actions</th></tr></thead>
                    <tbody className="divide-y divide-slate-700/30">
                      {users.map((u) => (
                        <tr key={u.username} className="hover:bg-indigo-500/5 transition-colors">
                          <td className="p-3 text-white font-medium">{u.username}</td>
                          <td className="p-3"><span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wide border ${getRoleBadgeColor(u.role)}`}>{u.role}</span></td>
                          <td className="p-3">{u.username !== 'admin' && (<select value={u.role} onChange={(e) => handleUpdateRole(u.username, e.target.value as UserRole)} className="bg-slate-800 border border-slate-600 rounded px-2 py-1 text-xs focus:border-indigo-400 outline-none"><option value="viewer">Viewer</option><option value="editor">Editor</option><option value="superadmin">Super Admin</option></select>)}</td>
                          <td className="p-3 text-right">{u.username !== 'admin' && <button onClick={() => handleDeleteUser(u.username)} className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"><Trash2 className="w-4 h-4" /></button>}</td>
                        </tr>
                      ))}
                    </tbody>
                 </table>
               </div>
             </div>
          </div>
        )}
      </main>

      {/* MODAL: Cloud Database Config */}
      {showDbModal && (
         <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[90] flex items-center justify-center p-4">
             <div className="glass-panel w-full max-w-lg rounded-2xl border border-indigo-500/30 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                 <div className="p-5 border-b border-slate-700 bg-slate-900/50 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2"><Database className="text-indigo-400"/> Database Setup</h2>
                    <button onClick={() => setShowDbModal(false)}><X className="text-slate-400 hover:text-white"/></button>
                 </div>
                 
                 <div className="p-6 overflow-y-auto">
                    {!isDbConnected ? (
                        <>
                           <div className="mb-6 bg-indigo-900/20 border border-indigo-500/30 p-4 rounded-xl text-sm text-indigo-200">
                               <p className="font-bold mb-2">Connect to Supabase (PostgreSQL)</p>
                               <p className="text-xs text-slate-400 mb-2">This will enable real-time cloud sync, backups, and multi-device access.</p>
                               <ol className="list-decimal pl-4 space-y-1 text-xs text-slate-300">
                                   <li>Create a free project at <a href="https://supabase.com" target="_blank" className="text-indigo-400 underline">supabase.com</a></li>
                                   <li>Go to <strong>Project Settings &gt; API</strong></li>
                                   <li>Copy <strong>Project URL</strong> and <strong>anon public key</strong> below</li>
                               </ol>
                           </div>
                           <form onSubmit={handleConnectDb} className="space-y-4">
                               <div>
                                   <label className="text-xs uppercase font-bold text-slate-500 block mb-1">Project URL</label>
                                   <input name="dbUrl" required type="url" placeholder="https://xyz.supabase.co" className="w-full bg-slate-800 border border-slate-600 rounded p-2 text-white text-sm" />
                               </div>
                               <div>
                                   <label className="text-xs uppercase font-bold text-slate-500 block mb-1">Anon Public Key</label>
                                   <input name="dbKey" required type="password" placeholder="eyJh..." className="w-full bg-slate-800 border border-slate-600 rounded p-2 text-white text-sm" />
                               </div>
                               <button type="submit" className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded font-medium shadow-lg">Connect & Sync</button>
                           </form>
                        </>
                    ) : (
                        <div className="text-center space-y-4">
                            <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto text-green-400"><Cloud className="w-8 h-8"/></div>
                            <div>
                                <h3 className="text-lg font-bold text-white">Cloud Connected</h3>
                                <p className="text-sm text-slate-400">Your data is syncing with Supabase.</p>
                            </div>
                            <button onClick={handleDisconnectDb} className="px-4 py-2 border border-red-500/40 text-red-400 hover:bg-red-500/10 rounded-lg text-sm">Disconnect</button>
                        </div>
                    )}
                    
                    <div className="mt-8 pt-6 border-t border-slate-700">
                        <h4 className="text-sm font-bold text-white mb-2 flex items-center gap-2"><Settings className="w-4 h-4"/> First Time Setup Script</h4>
                        <p className="text-xs text-slate-400 mb-3">Copy this SQL and run it in your Supabase <strong>SQL Editor</strong> to create the necessary tables.</p>
                        <div className="relative">
                            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-[10px] font-mono text-slate-400 h-32 overflow-y-auto">
                                <pre>
{`create table if not exists assets (
  id text primary key,
  data jsonb not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists app_config (
  key text primary key,
  value jsonb not null
);

-- IMPORTANT: Enable Realtime for these tables
alter publication supabase_realtime add table assets;
alter publication supabase_realtime add table app_config;

-- Public Access Policies
alter table assets enable row level security;
alter table app_config enable row level security;
create policy "Public Assets Access" on assets for all using (true) with check (true);
create policy "Public Config Access" on app_config for all using (true) with check (true);`}
                                </pre>
                            </div>
                            <button 
                                onClick={copySql} 
                                className="absolute top-2 right-2 p-1.5 bg-slate-700 hover:bg-slate-600 rounded text-white shadow-lg"
                                title="Copy SQL"
                            >
                                {sqlCopied ? <Check className="w-4 h-4 text-green-400"/> : <Copy className="w-4 h-4"/>}
                            </button>
                        </div>
                    </div>
                 </div>
             </div>
         </div>
      )}

      {/* MODAL: KPI Breakdown */}
      {activeKPI && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[80] flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-2xl max-h-[80vh] flex flex-col rounded-2xl border border-indigo-500/30 shadow-2xl">
             <div className="p-5 border-b border-slate-700 bg-slate-900/50 flex justify-between items-center"><h2 className="text-xl font-display font-bold text-white flex items-center gap-2"><Package className="text-indigo-400" /> {activeKPI} Details</h2><button onClick={() => setActiveKPI(null)} className="text-slate-400 hover:text-white p-2 hover:bg-slate-800 rounded-lg"><X /></button></div>
             <div className="flex-1 overflow-y-auto p-0"><table className="w-full text-left text-sm"><thead className="bg-slate-800 text-slate-400 text-xs uppercase font-bold sticky top-0 z-10"><tr><th className="p-4 border-b border-slate-700">Material Type / Model</th><th className="p-4 border-b border-slate-700 text-right">Quantity</th></tr></thead><tbody className="divide-y divide-slate-700/30">{getKPIBreakdown(activeKPI).map(([name, count]) => (<tr key={name} className="hover:bg-slate-800/30"><td className="p-4 text-slate-200 font-medium">{name}</td><td className="p-4 text-right font-mono text-indigo-300 font-bold">{count}</td></tr>))}{getKPIBreakdown(activeKPI).length === 0 && <tr><td colSpan={2} className="p-6 text-center text-slate-500">No records found.</td></tr>}</tbody></table></div>
          </div>
        </div>
      )}

      {/* MODAL: Engineer Detail */}
      {activeEngineer && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[80] flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-4xl max-h-[90vh] flex flex-col rounded-2xl border border-indigo-500/30 shadow-2xl">
             <div className="p-5 border-b border-slate-700 bg-slate-900/50 flex justify-between items-center"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-indigo-600 flex items-center justify-center font-bold text-white text-lg">{activeEngineer.charAt(0)}</div><div><h2 className="text-xl font-display font-bold text-white">{activeEngineer}</h2><p className="text-xs text-indigo-300 uppercase tracking-wider">Inventory Dashboard</p></div></div><button onClick={() => setActiveEngineer(null)} className="text-slate-400 hover:text-white p-2 hover:bg-slate-800 rounded-lg"><X /></button></div>
             <div className="flex-1 overflow-y-auto p-6 space-y-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                   <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700 text-center"><div className="text-xs text-slate-400 uppercase font-bold mb-1">Spares</div><div className="text-2xl font-bold text-blue-400">{getEngineerBreakdown(activeEngineer).spares}</div></div>
                   <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700 text-center"><div className="text-xs text-slate-400 uppercase font-bold mb-1">Installed</div><div className="text-2xl font-bold text-green-400">{getEngineerBreakdown(activeEngineer).installed}</div></div>
                   <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700 text-center"><div className="text-xs text-slate-400 uppercase font-bold mb-1">Returned</div><div className="text-2xl font-bold text-purple-400">{getEngineerBreakdown(activeEngineer).returned}</div></div>
                   <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700 text-center"><div className="text-xs text-slate-400 uppercase font-bold mb-1">Planned</div><div className="text-2xl font-bold text-yellow-400">{getEngineerBreakdown(activeEngineer).planned}</div></div>
                </div>
                <div>
                   <h3 className="text-sm font-bold text-slate-300 uppercase mb-3 flex items-center gap-2"><ClipboardList className="w-4 h-4" /> Complete Asset List</h3>
                   <div className="bg-slate-800/30 rounded-xl overflow-hidden border border-slate-700/50">
                      <table className="w-full text-left text-sm"><thead className="bg-slate-900/50 text-slate-400 text-xs uppercase font-bold"><tr><th className="p-3">Asset ID</th><th className="p-3">Material / Model</th><th className="p-3">Location</th><th className="p-3 text-right">Status</th></tr></thead><tbody className="divide-y divide-slate-700/30">{getEngineerBreakdown(activeEngineer).items.map(item => (<tr key={item.id} className="hover:bg-indigo-500/5"><td className="p-3 font-mono text-slate-400 text-xs">{item.assetId}</td><td className="p-3 font-medium text-slate-200">{item.materialType} <span className="text-slate-500">/</span> {item.modelVariant}</td><td className="p-3 text-slate-400 text-xs">{item.circle} {item.division && `> ${item.division}`}</td><td className="p-3 text-right"><span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wide border ${getStatusColor(item.status)}`}>{item.status}</span></td></tr>))}</tbody></table>
                   </div>
                </div>
             </div>
          </div>
        </div>
      )}

      {/* CUSTOMIZE FIELDS MODAL */}
      {showCustomizeModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-4xl h-[80vh] rounded-2xl border border-indigo-500/30 shadow-2xl flex flex-col overflow-hidden">
             <div className="p-5 border-b border-slate-700 bg-slate-900/50 flex justify-between items-center"><div><h2 className="text-xl font-display font-bold text-white flex items-center gap-2"><List className="text-indigo-400" /> Form & Table Builder</h2><p className="text-xs text-slate-400 mt-1">Design your inventory schema. All fields are fully customizable.</p></div><button onClick={() => setShowCustomizeModal(false)} className="text-slate-400 hover:text-white p-2 hover:bg-slate-800 rounded-lg"><X /></button></div>
             <div className="flex-1 overflow-y-auto p-6 bg-slate-900/30 space-y-4">
               {columns.map((col, index) => (
                 <div key={col.id} className="bg-slate-800/80 p-4 rounded-xl border border-slate-700 hover:border-indigo-500/50 transition-all shadow-md group">
                   <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
                     <div className="p-2 bg-slate-700 rounded text-slate-400 cursor-move"><List className="w-4 h-4" /></div>
                     <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
                       <div><label className="text-[10px] uppercase text-slate-500 font-bold mb-1 block">Field Label</label><input type="text" value={col.label} onChange={(e) => handleUpdateColumn(index, { label: e.target.value })} className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-sm text-white focus:border-indigo-400 focus:outline-none" /></div>
                       <div><label className="text-[10px] uppercase text-slate-500 font-bold mb-1 block">Data Type</label><select value={col.type} onChange={(e) => handleUpdateColumn(index, { type: e.target.value as FieldType })} className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-sm text-white focus:border-indigo-400 focus:outline-none"><option value="text">Short Text</option><option value="number">Number</option><option value="date">Date</option><option value="select">Dropdown</option><option value="textarea">Paragraph</option></select></div>
                       {col.type === 'select' && (<div><label className="text-[10px] uppercase text-slate-500 font-bold mb-1 block">Options (comma sep)</label><input type="text" value={col.options?.join(', ') || ''} onChange={(e) => handleUpdateColumn(index, { options: e.target.value.split(',').map(s => s.trim()) })} className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-sm text-white focus:border-indigo-400 focus:outline-none" /></div>)}
                     </div>
                     <div className="flex items-center gap-2 pt-5"><button onClick={() => handleDeleteColumn(index)} className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors" title="Delete Field"><Trash2 className="w-4 h-4" /></button></div>
                   </div>
                 </div>
               ))}
               <button onClick={handleAddColumn} className="w-full py-4 border-2 border-dashed border-slate-700 rounded-xl text-slate-400 hover:text-indigo-400 hover:border-indigo-500/50 hover:bg-slate-800/30 transition-all flex flex-col items-center justify-center gap-2"><Plus className="w-6 h-6" /><span className="font-medium text-sm">Add New Field</span></button>
             </div>
             <div className="p-5 border-t border-slate-700 bg-slate-900 flex justify-between items-center">
               <button onClick={handleResetData} className="px-4 py-2 border border-red-500/50 text-red-400 hover:bg-red-500/10 rounded-lg text-sm flex items-center gap-2"><RefreshCcw className="w-3 h-3" /> Reset / Clear Local Data</button>
               <button onClick={handleSaveColumns} className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium shadow-lg hover:shadow-indigo-500/25 transition-all">Save & Apply Schema</button>
             </div>
          </div>
        </div>
      )}

      {/* Manual Install Instructions Modal */}
      {showInstallModal && (
         <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-center justify-center p-6">
            <div className="glass-panel p-6 rounded-2xl w-full max-w-sm text-center border border-green-500/30 shadow-[0_0_50px_rgba(34,197,94,0.2)]">
               <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4"><Smartphone className="w-8 h-8 text-green-400" /></div>
               <h3 className="text-xl font-bold text-white mb-2">Install App</h3>
               <p className="text-slate-300 text-sm mb-6 leading-relaxed"><strong>Looking for an APK?</strong> <br/> This is a Progressive Web App (PWA). It installs directly from the browser and functions exactly like a native Android app.</p>
               <ol className="text-left text-sm text-slate-300 space-y-3 bg-slate-800/50 p-4 rounded-xl mb-6 border border-slate-700"><li className="flex gap-3 items-start"><span className="bg-slate-700 w-5 h-5 flex items-center justify-center rounded-full text-xs font-bold shrink-0">1</span><span>Tap the <span className="text-white font-bold">Menu</span> icon (3 dots) in your browser.</span></li><li className="flex gap-3 items-start"><span className="bg-slate-700 w-5 h-5 flex items-center justify-center rounded-full text-xs font-bold shrink-0">2</span><span>Select <span className="text-white font-bold flex items-center gap-1"><Share className="w-3 h-3" /> Add to Home Screen</span> or <span className="text-white font-bold">Install App</span>.</span></li></ol>
               <button onClick={() => setShowInstallModal(false)} className="w-full py-3 bg-slate-700 hover:bg-slate-600 rounded-xl text-white font-medium transition-colors">Got it</button>
            </div>
         </div>
      )}

      {/* QUICK STATUS UPDATE MODAL */}
      {statusModalItem && canEdit && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
          <div className="glass-panel p-6 rounded-2xl w-full max-w-sm border border-indigo-500/30">
              <h3 className="text-lg font-bold text-white mb-4">Update Status</h3>
              <p className="text-slate-400 text-sm mb-6">Select new status for item <span className="text-white font-mono">{statusModalItem.assetId || 'Unknown'}</span>:</p>
              <div className="grid grid-cols-1 gap-3">
                  {['Installed', 'Spare', 'Returned'].map(status => (<button key={status} onClick={() => handleQuickStatusUpdate(status)} className={`p-3 rounded-lg border text-left font-medium transition-all flex items-center justify-between group ${getStatusColor(status)} hover:bg-white/5`}>{status}<div className={`w-3 h-3 rounded-full ${getStatusColor(status).split(' ')[0].replace('/20', '')}`} /></button>))}
                  {columns.find(c => c.id === 'status')?.options?.filter(o => !['Installed', 'Spare', 'Returned'].includes(o)).map(status => (<button key={status} onClick={() => handleQuickStatusUpdate(status)} className="p-3 rounded-lg border border-slate-700 bg-slate-800/50 text-slate-300 hover:bg-slate-700 text-left text-sm">{status}</button>))}
              </div>
              <button onClick={() => setStatusModalItem(null)} className="mt-6 w-full py-2 text-slate-400 hover:text-white text-sm">Cancel</button>
          </div>
        </div>
      )}

      {/* Add Item Modal */}
      {showAddModal && canEdit && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-panel p-6 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col border border-indigo-500/30 shadow-[0_0_50px_rgba(99,102,241,0.2)]">
             <div className="flex justify-between items-center mb-6 border-b border-slate-700 pb-4 shrink-0"><h2 className="text-xl font-display font-bold text-white flex items-center gap-2"><Plus className="text-indigo-400" /> New Asset Entry</h2><button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white"><X /></button></div>
             <form onSubmit={handleAddItem} className="flex-1 overflow-y-auto pr-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 {columns.map(col => (
                   <div key={col.id} className={col.type === 'textarea' ? 'md:col-span-2' : ''}>
                      <label className="block text-xs uppercase text-slate-500 font-bold mb-1">{col.label}</label>
                      {col.type === 'select' ? (
                        <select className="w-full bg-slate-800/50 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-indigo-400 appearance-none" value={formData[col.id] || ''} onChange={e => handleInputChange(col.id, e.target.value)}><option value="">Select {col.label}...</option>{col.options?.map(opt => (<option key={opt} value={opt}>{opt}</option>))}</select>
                      ) : col.type === 'textarea' ? (
                        <textarea rows={3} className="w-full bg-slate-800/50 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-indigo-400" value={formData[col.id] || ''} onChange={e => handleInputChange(col.id, e.target.value)} />
                      ) : (
                        <input type={col.type === 'date' ? 'date' : col.type === 'number' ? 'number' : 'text'} className="w-full bg-slate-800/50 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-indigo-400" value={formData[col.id] || ''} onChange={e => handleInputChange(col.id, e.target.value)} placeholder={`Enter ${col.label}`} />
                      )}
                   </div>
                 ))}
              </div>
              <div className="flex gap-3 pt-6 mt-4 border-t border-slate-700 sticky bottom-0 bg-slate-900/0"><button type="button" onClick={() => setShowAddModal(false)} className="flex-1 px-4 py-2 rounded-lg border border-slate-600 text-slate-300 hover:bg-slate-700 transition-colors">Cancel</button><button type="submit" className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg font-medium transition-all shadow-[0_0_15px_rgba(99,102,241,0.3)]">Save Record</button></div>
            </form>
          </div>
        </div>
      )}

      {/* Chat Interface */}
      <div className={`fixed bottom-0 right-0 w-full md:w-[450px] h-[600px] transition-transform duration-500 transform ${isChatOpen ? 'translate-y-0' : 'translate-y-[110%]'} z-40 p-4`}>
        <div className="glass-panel w-full h-full rounded-2xl flex flex-col shadow-2xl border border-indigo-500/30 relative overflow-hidden bg-slate-900/90">
          <div className="p-4 bg-slate-800/80 border-b border-slate-700 flex justify-between items-center backdrop-blur-md"><div className="flex items-center gap-2"><Bot className="w-5 h-5 text-indigo-400" /><span className="font-display font-bold text-sm tracking-wider">LOGISTICS<span className="text-indigo-400">DROID</span></span></div><button onClick={() => setIsChatOpen(false)} className="text-slate-400 hover:text-white"><X className="w-4 h-4" /></button></div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
            {messages.map((msg, i) => (<div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}><div className={`max-w-[85%] p-3 rounded-xl text-sm leading-relaxed ${msg.role === 'user' ? 'bg-indigo-600 text-white rounded-br-none shadow-lg' : 'bg-slate-700/50 text-slate-200 rounded-bl-none border border-slate-600'}`}>{msg.text}</div></div>))}
            {isThinking && (<div className="flex justify-start"><div className="bg-slate-700/50 p-3 rounded-lg rounded-bl-none flex gap-1 items-center"><div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} /><div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} /><div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} /></div></div>)}
            <div ref={chatEndRef} />
          </div>
          <div className="p-3 bg-slate-800/80 border-t border-slate-700 backdrop-blur-md"><div className="flex gap-2"><input type="text" value={inputMessage} onChange={(e) => setInputMessage(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()} placeholder="Ask about stock, engineers, or locations..." className="flex-1 bg-slate-900/50 border border-slate-600 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-400 placeholder-slate-500" /><button onClick={handleSendMessage} disabled={!inputMessage.trim() || isThinking} className="p-2.5 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"><Send className="w-4 h-4" /></button></div></div>
        </div>
      </div>
    </div>
  );
};

const container = document.getElementById("root");
const root = createRoot(container!);
root.render(<App />);
