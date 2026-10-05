import { useState, useEffect, ChangeEvent, FormEvent, MouseEvent, ReactElement } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Trash2, FileText, Search, Download, X, Link2, UploadCloud, BookOpen, Edit2, Lock } from 'lucide-react';
import { collection, addDoc, getDocs, deleteDoc, doc, query, orderBy, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db, storage } from '../lib/firebase';
import { encryptPayload, decryptPayload } from '../lib/protect';

interface ResourceItem {
  id: string;
  title: string;
  description?: string;
  fileUrl: string;
  fileName: string;
  fileType: string;
  createdAt: any;
  storagePath?: string;
  content?: string;
  images?: string[];
  locked?: boolean;
  lockSalt?: string;
  lockIv?: string;
  lockIter?: number;
  lockCipher?: string;
  category?: '대입' | '고입';
  pinned?: boolean;
}

const classifyResourceCategory = (item: ResourceItem): '대입' | '고입' => {
  if (item.category) return item.category;
  
  const title = item.title.toLowerCase();
  
  const 대입Keywords = ['학종', '생기부', '세특', '대입', '고1', '고2', '고3', '수행평가', '[탐구주제추천]'];
  for (const keyword of 대입Keywords) {
    if (title.includes(keyword)) {
      return '대입';
    }
  }
  
  const 고입Keywords = ['외고', '국제고', '자사고', '특목고', '특목자사고', '고입', '중학생', '중3'];
  for (const keyword of 고입Keywords) {
    if (title.includes(keyword)) {
      return '고입';
    }
  }
  
  return '대입';
};

export const ResourcesSection = ({ isAdmin: propIsAdmin }: { isAdmin?: boolean }) => {
  const [items, setItems] = useState<ResourceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTab, setSelectedTab] = useState<'대입' | '고입'>('대입');
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isAdminState, setIsAdminState] = useState<boolean>(
    propIsAdmin !== undefined ? propIsAdmin : (auth.currentUser?.email === "ahrah0365@gmail.com")
  );
  const [selectedArticle, setSelectedArticle] = useState<ResourceItem | null>(null);

  // Upload/Edit Form State
  const [editingItem, setEditingItem] = useState<ResourceItem | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<'대입' | '고입'>('대입');
  const [fileType, setFileType] = useState('pdf');
  const [uploadMode, setUploadMode] = useState<'file' | 'link'>('file');
  const [externalUrl, setExternalUrl] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [articleContent, setArticleContent] = useState('');
  const [htmlContent, setHtmlContent] = useState('');
  const [resourcePassword, setResourcePassword] = useState('');
  const [unlockExisting, setUnlockExisting] = useState(false);
  const [publishDate, setPublishDate] = useState('');
  const [pinned, setPinned] = useState(false);
  const [passwordPromptItem, setPasswordPromptItem] = useState<ResourceItem | null>(null);
  const [attemptPassword, setAttemptPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [existingImages, setExistingImages] = useState<string[]>([]);

  useEffect(() => {
    if (propIsAdmin !== undefined) {
      setIsAdminState(propIsAdmin);
      return;
    }
    const unsub = onAuthStateChanged(auth, (u) => {
      setIsAdminState(u?.email === "ahrah0365@gmail.com");
    });
    return () => unsub();
  }, [propIsAdmin]);

  const isAdmin = propIsAdmin !== undefined ? propIsAdmin : isAdminState;

  const fetchItems = async () => {
    setLoading(true);
    try {
      let fetched: ResourceItem[] = [];
      try {
        const q = query(collection(db, 'resources'), orderBy('createdAt', 'desc'));
        const querySnapshot = await getDocs(q);
        querySnapshot.forEach((docSnap) => {
          fetched.push({ id: docSnap.id, ...docSnap.data() } as ResourceItem);
        });
      } catch (orderErr) {
        console.warn("Ordered query fallback to unordered:", orderErr);
        const querySnapshot = await getDocs(collection(db, 'resources'));
        querySnapshot.forEach((docSnap) => {
          fetched.push({ id: docSnap.id, ...docSnap.data() } as ResourceItem);
        });
        fetched.sort((a, b) => {
          const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : (a.createdAt ? new Date(a.createdAt).getTime() : 0);
          const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : (b.createdAt ? new Date(b.createdAt).getTime() : 0);
          return timeB - timeA;
        });
      }
      setItems(fetched);
    } catch (err) {
      console.error("Error fetching resource items:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  // Deep link: /?cat=goip#resources (고입) or /?cat=daeip#resources (대입)
  // The section renders after the page loads, so the browser's own #hash jump misses it.
  useEffect(() => {
    const cat = new URLSearchParams(window.location.search).get('cat');
    if (cat === 'goip') setSelectedTab('고입');
    else if (cat === 'daeip') setSelectedTab('대입');

    const scrollToResources = () => {
      if (window.location.hash === '#resources') {
        document.getElementById('resources')?.scrollIntoView({ block: 'start' });
      }
    };
    const timers = [0, 400, 1200].map(ms => window.setTimeout(scrollToResources, ms));
    window.addEventListener('hashchange', scrollToResources);
    return () => {
      timers.forEach(t => window.clearTimeout(t));
      window.removeEventListener('hashchange', scrollToResources);
    };
  }, []);

  useEffect(() => {
    if (!loading && window.location.hash === '#resources') {
      window.setTimeout(() => document.getElementById('resources')?.scrollIntoView({ block: 'start' }), 100);
    }
  }, [loading]);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      if (selected.size > 15 * 1024 * 1024) {
        setErrorMsg("파일 크기는 최대 15MB까지만 지원됩니다.");
        return;
      }
      setFile(selected);
      
      if (fileType === 'html' && selected.name.endsWith('.html')) {
        const reader = new FileReader();
        reader.onload = (evt) => {
          if (evt.target?.result) {
            setHtmlContent(evt.target.result as string);
          }
        };
        reader.readAsText(selected);
      }
      
      setErrorMsg('');
    }
  };

  const handleImageFilesChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      const oversizedFiles = selectedFiles.filter(f => f.size > 18 * 1024 * 1024);
      
      if (oversizedFiles.length > 0) {
        setErrorMsg(`일부 이미지 파일이 너무 큽니다 (최대 18MB): ${oversizedFiles.map(f => f.name).join(', ')}`);
        return;
      }
      
      setImageFiles(prev => [...prev, ...selectedFiles]);
      setErrorMsg('');
    }
  };

  const removeImageFile = (index: number) => {
    setImageFiles(prev => prev.filter((_, i) => i !== index));
  };

  const removeExistingImage = (url: string) => {
    setExistingImages(prev => prev.filter(img => img !== url));
  };

  const handleUploadSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    if (!isAdmin) {
      setErrorMsg("권한이 없습니다. 관리자만 자료를 등록할 수 있습니다.");
      setUploading(false);
      return;
    }
    
    if (!title.trim()) {
      setErrorMsg("자료 명칭을 입력해주세요.");
      return;
    }

    setUploading(true);
    setErrorMsg('');

    try {
      let finalFileUrl = "";
      let finalFileName = "";
      let storagePath = "";
      let finalContent = fileType === 'article' ? articleContent.trim() : (fileType === 'html' ? htmlContent.trim() : null);

      if (editingItem && uploadMode === 'file' && !file) {
        finalFileUrl = editingItem.fileUrl;
        finalFileName = editingItem.fileName;
        storagePath = editingItem.storagePath || "";
      } else if (uploadMode === 'file') {
        if (!file && fileType !== 'article' && fileType !== 'html') {
          setErrorMsg("업로드할 자료 파일을 선택해주세요.");
          setUploading(false);
          return;
        }

        if (file) {
          finalFileName = file.name;
          try {
            const path = `resources/${Date.now()}_${file.name}`;
            const fileRef = ref(storage, path);
            const uploadResult = await uploadBytes(fileRef, file);
            finalFileUrl = await getDownloadURL(uploadResult.ref);
            storagePath = path;
          } catch (storageErr: any) {
            console.warn("Storage upload failed, falling back to base64 encoding", storageErr);
            if (file.size > 800 * 1024) {
              throw new Error("자료 파일이 너무 큽니다 (800KB 초과). Firebase Storage 인프라가 미연동 상태인 경우, 구글 드라이브 대용량 공유 다운로드 링크를 생성하신 뒤 '링크 입력' 방식을 활용해주세요.");
            }
            finalFileUrl = await new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () => resolve(reader.result as string);
              reader.onerror = reject;
              reader.readAsDataURL(file);
            });
          }
        } else {
          finalFileName = title.trim() + (fileType === 'html' ? '.html' : '.txt');
          finalFileUrl = '';
        }
      } else {
        if (!externalUrl.trim()) {
          setErrorMsg("자료 다운로드 URL 혹은 공유 링크를 입력해주세요.");
          setUploading(false);
          return;
        }
        finalFileUrl = externalUrl.trim();
        finalFileName = title.trim() + (fileType === 'pdf' ? '.pdf' : '.xlsx');
      }

      let resourceData: any = {
        title: title.trim(),
        description: description.trim(),
        fileType: fileType,
        storagePath: storagePath || null,
        category: category,
        pinned: pinned,
      };

      // Upload images for Article type
      let uploadedImageUrls: string[] = [...existingImages];
      if (fileType === 'article' && imageFiles.length > 0) {
        for (const imgFile of imageFiles) {
          try {
            const imgPath = `resources/images/${Date.now()}_${imgFile.name}`;
            const imgRef = ref(storage, imgPath);
            const uploadResult = await uploadBytes(imgRef, imgFile);
            const imgUrl = await getDownloadURL(uploadResult.ref);
            uploadedImageUrls.push(imgUrl);
          } catch (imgErr) {
            console.warn("Image upload failed, skipping:", imgErr);
          }
        }
      }

      const shouldEncrypt = resourcePassword.trim() && !unlockExisting;
      const wasLocked = editingItem?.locked;

      if (shouldEncrypt) {
        const payload = {
          content: finalContent,
          fileUrl: finalFileUrl,
          fileName: finalFileName,
          images: uploadedImageUrls
        };
        const encrypted = await encryptPayload(payload, resourcePassword.trim());
        resourceData.locked = true;
        resourceData.lockSalt = encrypted.lockSalt;
        resourceData.lockIv = encrypted.lockIv;
        resourceData.lockIter = encrypted.lockIter;
        resourceData.lockCipher = encrypted.lockCipher;
        resourceData.content = null;
        resourceData.fileUrl = '';
        resourceData.fileName = '';
        resourceData.images = null;
      } else if (unlockExisting && wasLocked) {
        resourceData.locked = false;
        resourceData.lockSalt = null;
        resourceData.lockIv = null;
        resourceData.lockIter = null;
        resourceData.lockCipher = null;
        resourceData.content = finalContent;
        resourceData.fileUrl = finalFileUrl;
        resourceData.fileName = finalFileName;
        resourceData.images = uploadedImageUrls.length > 0 ? uploadedImageUrls : null;
      } else if (wasLocked && !resourcePassword.trim() && !unlockExisting) {
        if (editingItem.lockCipher) {
          resourceData.locked = true;
          resourceData.lockSalt = editingItem.lockSalt;
          resourceData.lockIv = editingItem.lockIv;
          resourceData.lockIter = editingItem.lockIter;
          resourceData.lockCipher = editingItem.lockCipher;
          resourceData.content = null;
          resourceData.fileUrl = '';
          resourceData.fileName = '';
          resourceData.images = null;
        }
      } else {
        resourceData.locked = false;
        resourceData.content = finalContent;
        resourceData.fileUrl = finalFileUrl;
        resourceData.fileName = finalFileName;
        resourceData.images = uploadedImageUrls.length > 0 ? uploadedImageUrls : null;
      }

      const finalDate = publishDate ? (() => {
        const [year, month, day] = publishDate.split('-').map(Number);
        const koreaDate = new Date(year, month - 1, day, 0, 0, 0, 0);
        const offset = koreaDate.getTimezoneOffset();
        const koreaOffset = -540;
        const diff = koreaOffset - offset;
        return new Date(koreaDate.getTime() + diff * 60 * 1000);
      })() : new Date();

      if (editingItem) {
        await updateDoc(doc(db, 'resources', editingItem.id), {
          ...resourceData,
          createdAt: finalDate
        });
      } else {
        await addDoc(collection(db, 'resources'), {
          ...resourceData,
          createdAt: finalDate
        });
      }

      setTitle('');
      setDescription('');
      setCategory('대입');
      setFileType('pdf');
      setFile(null);
      setExternalUrl('');
      setArticleContent('');
      setHtmlContent('');
      setResourcePassword('');
      setUnlockExisting(false);
      setPublishDate('');
      setPinned(false);
      setEditingItem(null);
      setImageFiles([]);
      setExistingImages([]);
      setIsUploadOpen(false);
      fetchItems();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || (editingItem ? "자료 수정 중 오류가 발생했습니다." : "자료 등록 중 오류가 발생했습니다."));
    } finally {
      setUploading(false);
    }
  };

  const handleEdit = (item: ResourceItem, e: MouseEvent) => {
    e.stopPropagation();
    setEditingItem(item);
    setTitle(item.title);
    setDescription(item.description || '');
    setCategory(item.category || '대입');
    setFileType(item.fileType);
    setPinned(item.pinned || false);
    
    if (item.fileType === 'article' && item.content) {
      setArticleContent(item.content);
    } else {
      setArticleContent('');
    }

    if (item.fileType === 'html' && item.content) {
      setHtmlContent(item.content);
    } else {
      setHtmlContent('');
    }
    
    // Populate existing images
    if (item.images && item.images.length > 0) {
      setExistingImages(item.images);
    } else {
      setExistingImages([]);
    }
    
    if (item.fileUrl.startsWith('http://') || item.fileUrl.startsWith('https://')) {
      if (!item.storagePath || item.storagePath === 'null') {
        setUploadMode('link');
        setExternalUrl(item.fileUrl);
      } else {
        setUploadMode('file');
        setExternalUrl('');
      }
    } else {
      setUploadMode('file');
      setExternalUrl('');
    }
    
    if (item.createdAt) {
      const date = item.createdAt.toDate ? item.createdAt.toDate() : new Date(item.createdAt);
      const localDate = new Date(date.toLocaleString('en-US', { timeZone: 'Asia/Seoul' }));
      const year = localDate.getFullYear();
      const month = String(localDate.getMonth() + 1).padStart(2, '0');
      const day = String(localDate.getDate()).padStart(2, '0');
      setPublishDate(`${year}-${month}-${day}`);
    } else {
      setPublishDate('');
    }
    
    setFile(null);
    setImageFiles([]);
    setErrorMsg('');
    setResourcePassword('');
    setUnlockExisting(false);
    setIsUploadOpen(true);
  };

  const handleDelete = async (item: ResourceItem, e: MouseEvent) => {
    e.stopPropagation();
    
    // Security: Only admin can delete
    if (!isAdmin) {
      alert("권한이 없습니다. 관리자만 자료를 삭제할 수 있습니다.");
      return;
    }
    
    if (!window.confirm("정말로 이 학습 자료파일을 영구 삭제하시겠습니까?")) return;

    try {
      await deleteDoc(doc(db, 'resources', item.id));
      
      if (item.storagePath) {
        try {
          const fileRef = ref(storage, item.storagePath);
          await deleteObject(fileRef);
        } catch (err) {
          console.warn("Could not delete file from Storage bucket:", err);
        }
      }
      
      setItems(items.filter(i => i.id !== item.id));
    } catch (err) {
      console.error("Error deleting resource items:", err);
    }
  };

  const handleDownload = (item: ResourceItem) => {
    if (item.locked) {
      setPasswordPromptItem(item);
      setAttemptPassword('');
      setPasswordError('');
      return;
    }
    
    if (item.fileType === 'article') {
      setSelectedArticle(item);
      return;
    }

    if (item.fileType === 'html') {
      setSelectedArticle(item);
      return;
    }
    
    if (item.fileUrl.startsWith('data:')) {
      const link = document.createElement("a");
      link.href = item.fileUrl;
      link.download = item.fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      window.open(item.fileUrl, '_blank');
    }
  };

  const handlePasswordSubmit = async () => {
    if (!passwordPromptItem || !attemptPassword.trim()) {
      setPasswordError('비밀번호를 입력해주세요.');
      return;
    }

    try {
      const decrypted = await decryptPayload(
        passwordPromptItem.lockSalt!,
        passwordPromptItem.lockIv!,
        passwordPromptItem.lockCipher!,
        attemptPassword.trim()
      );

      const unlockedItem: ResourceItem = {
        ...passwordPromptItem,
        content: decrypted.content,
        fileUrl: decrypted.fileUrl,
        fileName: decrypted.fileName,
        images: decrypted.images || [],
        locked: false
      };

      setPasswordPromptItem(null);
      setAttemptPassword('');
      setPasswordError('');

      if (unlockedItem.fileType === 'article' || unlockedItem.fileType === 'html') {
        setSelectedArticle(unlockedItem);
      } else {
        if (unlockedItem.fileUrl.startsWith('data:')) {
          const link = document.createElement("a");
          link.href = unlockedItem.fileUrl;
          link.download = unlockedItem.fileName;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        } else {
          window.open(unlockedItem.fileUrl, '_blank');
        }
      }
    } catch (err) {
      setPasswordError('비밀번호가 올바르지 않습니다.');
    }
  };

  const parseArticleContent = (content: string) => {
    if (!content) return null;
    
    const lines = content.split('\n');
    const elements: ReactElement[] = [];
    let key = 0;

    lines.forEach((line, idx) => {
      const headingMatch = line.match(/\[H\](.*?)\[\/H\]/);
      if (headingMatch) {
        const text = headingMatch[1];
        elements.push(
          <h3 key={key++} className="text-xl font-black mt-8 mb-4 text-brand-text" style={{ fontSize: '1.25rem' }}>
            {text}
          </h3>
        );
        return;
      }

      if (line.includes('[HIGHLIGHT]')) {
        const parts: (string | ReactElement)[] = [];
        let remaining = line;
        let partKey = 0;

        while (remaining.includes('[HIGHLIGHT]')) {
          const startIdx = remaining.indexOf('[HIGHLIGHT]');
          const endIdx = remaining.indexOf('[/HIGHLIGHT]');
          
          if (endIdx === -1) break;

          if (startIdx > 0) {
            parts.push(remaining.substring(0, startIdx));
          }

          const highlightText = remaining.substring(startIdx + 11, endIdx);
          parts.push(
            <span key={partKey++} className="text-[#1a4f8b] font-bold">
              {highlightText}
            </span>
          );

          remaining = remaining.substring(endIdx + 12);
        }

        if (remaining) {
          parts.push(remaining);
        }

        elements.push(
          <p key={key++} className="text-base leading-relaxed mb-4 text-brand-text">
            {parts}
          </p>
        );
        return;
      }

      if (line.trim()) {
        elements.push(
          <p key={key++} className="text-base leading-relaxed mb-4 text-brand-text">
            {line}
          </p>
        );
      } else {
        elements.push(<div key={key++} className="h-2" />);
      }
    });

    return elements;
  };

  const filteredItems = items
    .filter(item => {
      const matchesTab = classifyResourceCategory(item) === selectedTab;
      const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesTab && matchesSearch;
    })
    .sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      
      const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : (a.createdAt ? new Date(a.createdAt).getTime() : 0);
      const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : (b.createdAt ? new Date(b.createdAt).getTime() : 0);
      return timeB - timeA;
    });

  return (
    <section id="resources" className="py-40 px-6 lg:px-8 bg-brand-secondary scroll-mt-20">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-24 pb-12 border-b-2 border-brand-text/10">
          <div className="space-y-4">
            <p className="text-[10px] uppercase tracking-[0.5em] text-brand-accent font-black">Strategic Library Database</p>
            <h2 className="text-5xl md:text-6xl font-extrabold tracking-[-0.05em] uppercase leading-none">Resources</h2>
          </div>
          <div className="flex items-center gap-6 mt-8 md:mt-0 w-full md:w-auto">
            {/* Search Input Bar */}
            <div className="relative flex-grow md:flex-initial md:w-64">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-gray/50" size={16} />
              <input 
                type="text"
                placeholder="자료실 내 검색"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-brand-bg border border-brand-light-gray h-12 pl-12 pr-4 text-xs font-bold outline-none focus:border-brand-text transition-colors"
              />
            </div>
            {isAdmin && (
              <button 
                onClick={() => setIsUploadOpen(true)}
                className="h-12 px-6 bg-brand-text text-brand-bg text-[10px] font-black uppercase tracking-widest hover:bg-brand-accent transition-colors flex items-center gap-3 shrink-0 cursor-pointer"
              >
                <Plus size={16} /> Add Resource
              </button>
            )}
          </div>
        </div>

        {/* Category Tabs */}
        <div className="mb-8 flex gap-2 sm:gap-4">
          <button
            onClick={() => setSelectedTab('대입')}
            className={`flex-1 sm:flex-initial px-6 sm:px-12 py-4 text-base sm:text-lg font-black uppercase tracking-tight transition-all ${
              selectedTab === '대입'
                ? 'bg-brand-text text-brand-bg'
                : 'bg-brand-bg text-brand-text border border-brand-light-gray hover:border-brand-text'
            }`}
          >
            대입
          </button>
          <button
            onClick={() => setSelectedTab('고입')}
            className={`flex-1 sm:flex-initial px-6 sm:px-12 py-4 text-base sm:text-lg font-black uppercase tracking-tight transition-all ${
              selectedTab === '고입'
                ? 'bg-brand-text text-brand-bg'
                : 'bg-brand-bg text-brand-text border border-brand-light-gray hover:border-brand-text'
            }`}
          >
            고입
          </button>
        </div>

        {loading ? (
          <div className="space-y-4">
            {Array(3).fill(0).map((_, i) => (
              <div key={i} className="h-24 bg-brand-bg/60 border border-brand-light-gray animate-pulse" />
            ))}
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="py-24 border border-dashed border-brand-light-gray text-center text-brand-gray font-black uppercase tracking-widest text-xs bg-brand-bg">
            {searchQuery ? "검색 조건과 일치하는 학습 자료가 없습니다." : "등록된 전략 가이드 및 다운로드 자료가 없습니다."}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {filteredItems.map((item) => (
              <div 
                key={item.id}
                className={`group bg-brand-bg border p-8 hover:border-brand-text transition-all duration-300 flex flex-col md:flex-row justify-between items-start md:items-center gap-8 relative overflow-hidden ${
                  item.pinned 
                    ? 'border-[#1a4f8b] border-2 bg-[#1a4f8b]/5' 
                    : 'border-brand-light-gray'
                }`}
              >
                <div className="flex items-center gap-6">
                  <div className="h-14 w-14 bg-brand-secondary border border-brand-light-gray flex items-center justify-center text-brand-text shrink-0">
                    <FileText size={24} className="text-brand-accent group-hover:scale-110 transition-transform" />
                  </div>
                  <div>
                    <div className="flex items-center gap-4 mb-2">
                      {item.pinned && (
                        <span className="text-[9px] font-black uppercase tracking-widest px-2.5 py-1 bg-[#1a4f8b] text-white rounded-none">
                          공지
                        </span>
                      )}
                      <span className="text-[9px] font-black uppercase tracking-widest px-2.5 py-1 bg-brand-secondary text-brand-accent rounded-none">
                        {item.fileType.toUpperCase()}
                      </span>
                      <span className="text-[14px] text-[#71717A] font-bold">
                        {item.createdAt?.toDate ? item.createdAt.toDate().toLocaleDateString('ko-KR', { timeZone: 'Asia/Seoul' }) : ''}
                      </span>
                      {item.locked && (
                        <div className="flex items-center gap-1 text-brand-accent" title="비밀번호 보호">
                          <Lock size={14} />
                          <span className="text-[9px] font-black uppercase">LOCKED</span>
                        </div>
                      )}
                    </div>
                    <h3 className="text-xl font-extrabold tracking-tight mb-2 group-hover:text-brand-accent transition-colors flex items-center gap-2">
                      {item.locked && <Lock size={16} className="text-brand-accent shrink-0" />}
                      {item.title}
                    </h3>
                    <p className="text-[14px] text-[#52525B] font-normal max-w-2xl leading-relaxed">
                      {item.description || ""}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4 w-full md:w-auto md:shrink-0 pt-6 md:pt-0 border-t md:border-transparent border-brand-light-gray">
                  <button 
                    onClick={() => handleDownload(item)}
                    className="flex-1 md:flex-initial h-12 px-6 bg-brand-text text-brand-bg hover:bg-brand-accent transition-all text-xs font-black uppercase tracking-widest flex items-center justify-center gap-3 cursor-pointer"
                  >
                    {item.locked ? (
                      <><Lock size={14} /> 비밀번호 입력</>
                    ) : item.fileType === 'article' ? (
                      <><BookOpen size={14} /> Read Article</>
                    ) : item.fileType === 'html' ? (
                      <><BookOpen size={14} /> Open Page</>
                    ) : (
                      <><Download size={14} /> Download File</>
                    )}
                  </button>
                  {isAdmin && (
                    <>
                      <button 
                        onClick={(e) => handleEdit(item, e)}
                        className="p-3 border border-blue-200 text-blue-600 hover:bg-blue-50 transition-colors"
                        title="자료 수정"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button 
                        onClick={(e) => handleDelete(item, e)}
                        className="p-3 border border-red-200 text-red-600 hover:bg-red-50 transition-colors"
                        title="자료 영구 삭제"
                      >
                        <Trash2 size={16} />
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Upload/Edit Dialog */}
      <AnimatePresence>
        {isUploadOpen && isAdmin && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
              onClick={() => { 
              if (!uploading) {
                setIsUploadOpen(false);
                setEditingItem(null);
                setTitle('');
                setDescription('');
                setCategory('대입');
                setArticleContent('');
                setHtmlContent('');
                setResourcePassword('');
                setUnlockExisting(false);
                setPublishDate('');
                setPinned(false);
                setImageFiles([]);
                setExistingImages([]);
              }
            }}
            className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-brand-text/95 backdrop-blur-md"
          >
            <motion.div 
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 50, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-brand-bg w-full max-w-lg p-10 relative border border-brand-light-gray"
            >
              <button 
                onClick={() => {
                  setIsUploadOpen(false);
                  setEditingItem(null);
                  setTitle('');
                  setDescription('');
                  setCategory('대입');
                  setArticleContent('');
                  setHtmlContent('');
                  setResourcePassword('');
                  setUnlockExisting(false);
                  setPublishDate('');
                  setPinned(false);
                  setImageFiles([]);
                  setExistingImages([]);
                }}
                disabled={uploading}
                className="absolute top-8 right-8 p-2 hover:bg-brand-secondary transition-colors"
              >
                <X size={24} />
              </button>

              <div className="mb-8">
                <div className="flex h-10 w-10 items-center justify-center bg-brand-text text-brand-bg font-black text-sm mb-4">
                  {editingItem ? '✎' : '+DOC'}
                </div>
                <h2 className="text-3xl font-black uppercase tracking-tighter">
                  {editingItem ? 'Edit Resource' : 'Add Resource'}
                </h2>
                <p className="text-brand-gray text-[10px] uppercase tracking-widest font-black">
                  {editingItem ? '기존 자료 정보를 수정합니다.' : '자료실용 프리미엄 배포 자료를 등록합니다.'}
                </p>
              </div>

              {errorMsg && (
                <div className="mb-6 p-4 bg-red-50 text-red-700 text-xs font-bold leading-relaxed border border-red-200">
                  {errorMsg}
                </div>
              )}

              <form onSubmit={handleUploadSubmit} className="space-y-6">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest mb-3 text-brand-accent">자료 명칭</label>
                  <input 
                    type="text" 
                    value={title} 
                    onChange={e => setTitle(e.target.value)}
                    placeholder="예: 경기외고 내신 공략집 / 2026 대입 설명회 리포트"
                    className="w-full bg-brand-secondary border border-brand-light-gray h-12 px-4 text-xs font-bold focus:border-brand-text outline-none transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest mb-3 text-brand-accent">자료 개요 및 구성 설명 (선택)</label>
                  <textarea 
                    value={description} 
                    onChange={e => setDescription(e.target.value)}
                    placeholder="자료 목차, 가독 대상자, 기획 의도를 간결히 적으면 회원의 클릭 및 학구열이 상승합니다."
                    rows={3}
                    className="w-full bg-brand-secondary border border-brand-light-gray p-4 text-xs font-bold focus:border-brand-text outline-none transition-colors resize-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest mb-3 text-brand-accent">게시일 (선택)</label>
                  <input 
                    type="date" 
                    value={publishDate} 
                    onChange={e => setPublishDate(e.target.value)}
                    className="w-full bg-brand-secondary border border-brand-light-gray h-12 px-4 text-xs font-bold focus:border-brand-text outline-none transition-colors"
                  />
                  <p className="text-[10px] text-brand-gray/50 mt-2 font-bold">빈 칸으로 두면 오늘 날짜가 자동 설정됩니다. 과거 날짜 선택 가능.</p>
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest mb-3 text-brand-accent">카테고리</label>
                  <select
                    value={category}
                    onChange={e => setCategory(e.target.value as '대입' | '고입')}
                    className="w-full bg-brand-secondary border border-brand-light-gray h-12 px-4 text-xs font-bold focus:border-brand-text outline-none transition-colors"
                  >
                    <option value="대입">대입</option>
                    <option value="고입">고입</option>
                  </select>
                  <p className="text-[10px] text-brand-gray/50 mt-2 font-bold">자료가 표시될 탭을 선택하세요.</p>
                </div>

                <div className="pt-4">
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <input 
                      type="checkbox" 
                      checked={pinned} 
                      onChange={e => setPinned(e.target.checked)}
                      className="w-5 h-5 accent-brand-text cursor-pointer"
                    />
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-brand-text group-hover:text-brand-accent transition-colors">
                        공지로 고정 (상단 고정)
                      </span>
                      <p className="text-[10px] text-brand-gray/50 mt-1 font-bold">체크하면 이 자료가 목록 최상단에 고정되어 표시됩니다.</p>
                    </div>
                  </label>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest mb-3 text-brand-accent">확장자 구분</label>
                    <select
                      value={fileType}
                      onChange={e => setFileType(e.target.value)}
                      className="w-full bg-brand-secondary border border-brand-light-gray h-12 px-4 text-xs font-bold focus:border-brand-text outline-none transition-colors"
                    >
                      <option value="pdf">PDF File (.pdf)</option>
                      <option value="xlsx">Excel File (.xlsx)</option>
                      <option value="docx">Word File (.docx)</option>
                      <option value="hwpx">Hangul File (.hwpx)</option>
                      <option value="article">Article (온라인 기사)</option>
                      <option value="html">HTML 페이지 (인터랙티브)</option>
                      <option value="link">External Resource</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest mb-3 text-brand-accent">연계 방식</label>
                    <select
                      value={uploadMode}
                      onChange={e => setUploadMode(e.target.value as 'file' | 'link')}
                      className="w-full bg-brand-secondary border border-brand-light-gray h-12 px-4 text-xs font-bold focus:border-brand-text outline-none transition-colors"
                    >
                      <option value="file">파일 신규 업로드</option>
                      <option value="link">공유 링크 연동 (추천)</option>
                    </select>
                  </div>
                </div>

                {fileType === 'article' && (
                  <>
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-widest mb-3 text-brand-accent">기사 본문 내용</label>
                      <textarea 
                        value={articleContent} 
                        onChange={e => setArticleContent(e.target.value)}
                        placeholder="기사 본문을 입력하세요. [H]제목[/H]으로 소제목, [HIGHLIGHT]강조 텍스트[/HIGHLIGHT]로 강조 표시"
                        rows={12}
                        className="w-full bg-brand-secondary border border-brand-light-gray p-4 text-xs font-bold focus:border-brand-text outline-none transition-colors resize-none font-mono"
                      />
                      <p className="text-[10px] text-brand-gray/50 mt-2 font-bold">[H]...[/H]는 부제목으로, [HIGHLIGHT]...[/HIGHLIGHT]는 강조 텍스트로 표시됩니다.</p>
                    </div>

                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-widest mb-3 text-brand-accent">
                        첨부 이미지 (합격 인증, 인포그래픽 등)
                      </label>
                      
                      {/* Existing Images */}
                      {existingImages.length > 0 && (
                        <div className="mb-4 space-y-2">
                          <p className="text-[10px] font-bold text-brand-gray">기존 첨부 이미지:</p>
                          {existingImages.map((imgUrl, idx) => (
                            <div key={idx} className="flex items-center gap-3 p-2 bg-brand-bg border border-brand-light-gray">
                              <img src={imgUrl} alt={`첨부 이미지 ${idx + 1}`} className="w-16 h-16 object-cover" />
                              <span className="text-[10px] flex-1 truncate">{imgUrl.split('/').pop()}</span>
                              <button
                                type="button"
                                onClick={() => removeExistingImage(imgUrl)}
                                className="text-red-600 text-xs font-bold hover:underline"
                              >
                                삭제
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* New Image Upload */}
                      <div className="border border-dashed border-brand-light-gray hover:border-brand-text transition-colors p-6 text-center bg-brand-secondary">
                        <input 
                          type="file" 
                          id="imageUpload"
                          multiple
                          accept="image/*"
                          onChange={handleImageFilesChange}
                          className="hidden"
                        />
                        <label htmlFor="imageUpload" className="cursor-pointer flex flex-col items-center">
                          <UploadCloud className="text-brand-gray mb-2" size={32} />
                          <p className="text-xs font-black uppercase text-brand-text tracking-wider mb-1">
                            이미지 파일 선택 (복수 선택 가능)
                          </p>
                          <p className="text-[10px] text-brand-gray/50 font-bold">
                            PNG, JPG, WebP 등 · 최대 18MB/파일
                          </p>
                        </label>
                      </div>

                      {/* Selected New Images Preview */}
                      {imageFiles.length > 0 && (
                        <div className="mt-4 space-y-2">
                          <p className="text-[10px] font-bold text-brand-gray">업로드 예정 이미지:</p>
                          {imageFiles.map((file, idx) => (
                            <div key={idx} className="flex items-center gap-3 p-2 bg-brand-bg border border-blue-200">
                              <FileText className="text-blue-600" size={16} />
                              <span className="text-[10px] flex-1">{file.name} ({(file.size / 1024 / 1024).toFixed(2)}MB)</span>
                              <button
                                type="button"
                                onClick={() => removeImageFile(idx)}
                                className="text-red-600 text-xs font-bold hover:underline"
                              >
                                제거
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      <p className="text-[10px] text-brand-gray/50 mt-3 font-bold">
                        기사 본문 하단에 첨부 이미지가 표시됩니다. 18MB 이상 PNG는 압축 후 업로드를 권장합니다.
                      </p>
                    </div>
                  </>
                )}

                {fileType === 'html' && (
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest mb-3 text-brand-accent">HTML 페이지 내용</label>
                    <textarea 
                      value={htmlContent} 
                      onChange={e => setHtmlContent(e.target.value)}
                      placeholder="HTML 코드를 직접 입력하거나 아래에서 .html 파일을 선택하세요"
                      rows={12}
                      className="w-full bg-brand-secondary border border-brand-light-gray p-4 text-xs font-bold focus:border-brand-text outline-none transition-colors resize-none font-mono"
                    />
                    <p className="text-[10px] text-brand-gray/50 mt-2 font-bold">HTML 파일을 업로드하거나 코드를 직접 입력할 수 있습니다.</p>
                  </div>
                )}

                <div>
                  {(fileType === 'article' || fileType === 'html') ? null : uploadMode === 'file' ? (
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-widest mb-3 text-brand-accent">
                        파일 선택 {editingItem && '(선택사항: 새 파일로 교체하려면 선택)'}
                      </label>
                      <div className="border border-dashed border-brand-light-gray hover:border-brand-text transition-colors p-8 text-center bg-brand-secondary flex flex-col items-center justify-center cursor-pointer relative">
                        <input 
                          type="file" 
                          onChange={handleFileChange}
                          accept={fileType === 'html' ? '.html,.htm' : undefined}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                        <FileText className="text-brand-gray mb-3" size={28} />
                        <p className="text-xs font-black uppercase text-brand-gray tracking-wider">
                          {file ? file.name : (editingItem ? `기존 파일: ${editingItem.fileName}` : "컴퓨터나 모바일에서 학습 자료 선택")}
                        </p>
                        <p className="text-[10px] text-brand-gray/50 mt-1 font-bold">최대 15MB 용량 지원</p>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-widest mb-3 text-brand-accent">자료 공유 URL 주소</label>
                      <input 
                        type="url" 
                        value={externalUrl} 
                        onChange={e => setExternalUrl(e.target.value)}
                        placeholder="https://drive.google.com/file/d/.../view?usp=sharing"
                        className="w-full bg-brand-secondary border border-brand-light-gray h-12 px-4 text-xs font-bold focus:border-brand-text outline-none transition-colors"
                      />
                      <p className="text-[10px] text-brand-gray/50 mt-2 font-bold">구글 드라이브, Dropbox 또는 네이버 밴드 등에 올리신 대용량 다운로드 링크 주소를 입력하세요.</p>
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t border-brand-light-gray">
                  <label className="block text-[10px] font-black uppercase tracking-widest mb-3 text-brand-accent">열람 비밀번호 (선택)</label>
                  <input 
                    type="password" 
                    value={resourcePassword} 
                    onChange={e => setResourcePassword(e.target.value)}
                    placeholder={editingItem?.locked ? "비밀번호를 입력하지 않으면 기존 잠금 유지" : "자료에 비밀번호를 설정하려면 입력"}
                    className="w-full bg-brand-secondary border border-brand-light-gray h-12 px-4 text-xs font-bold focus:border-brand-text outline-none transition-colors"
                  />
                  <p className="text-[10px] text-brand-gray/50 mt-2 font-bold">
                    비밀번호를 설정하면 자료 내용이 암호화되어 저장됩니다. {editingItem?.locked && "비밀번호를 입력하지 않으면 기존 잠금이 유지됩니다."}
                  </p>
                  {editingItem?.locked && (
                    <label className="flex items-center gap-2 mt-3 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={unlockExisting} 
                        onChange={e => setUnlockExisting(e.target.checked)}
                        className="w-4 h-4"
                      />
                      <span className="text-[10px] font-black uppercase tracking-wider text-brand-text">잠금 해제 (비밀번호 보호 제거)</span>
                    </label>
                  )}
                </div>

                <div className="pt-4">
                  <button
                    type="submit"
                    disabled={uploading}
                    className="w-full h-16 bg-brand-text text-brand-bg font-black uppercase tracking-widest hover:bg-brand-accent transition-colors disabled:opacity-50 flex items-center justify-center gap-3"
                  >
                    {uploading ? (editingItem ? "Updating..." : "Publishing Database...") : (editingItem ? "Update Resource" : "Add to Library")}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Article Reading Modal */}
      <AnimatePresence>
        {selectedArticle && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedArticle(null)}
            className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-brand-text/95 backdrop-blur-md overflow-y-auto"
          >
            <motion.div 
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 50, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-brand-bg w-full max-w-4xl max-h-[90vh] overflow-y-auto p-10 lg:p-16 relative border border-brand-light-gray my-6"
            >
              <button 
                onClick={() => setSelectedArticle(null)}
                className="absolute top-8 right-8 p-2 hover:bg-brand-secondary transition-colors"
              >
                <X size={24} />
              </button>

              <div className="mb-8">
                <div className="flex items-center gap-4 mb-4">
                  <span className="text-[9px] font-black uppercase tracking-widest px-2.5 py-1 bg-brand-secondary text-brand-accent">
                    {selectedArticle.fileType.toUpperCase()}
                  </span>
                  <span className="text-[10px] text-brand-gray/60 font-bold">
                    {selectedArticle.createdAt?.toDate ? selectedArticle.createdAt.toDate().toLocaleDateString('ko-KR', { timeZone: 'Asia/Seoul' }) : 'N/A'}
                  </span>
                </div>
                <h2 className="text-3xl md:text-4xl font-black uppercase tracking-tight mb-4 leading-tight">{selectedArticle.title}</h2>
                {selectedArticle.description && (
                  <p className="text-sm text-brand-gray leading-relaxed mb-8">
                    {selectedArticle.description}
                  </p>
                )}
              </div>

              {selectedArticle.fileType === 'html' ? (
                <div className="w-full" style={{ height: 'calc(90vh - 240px)', minHeight: '400px' }}>
                  <iframe
                    sandbox="allow-scripts"
                    srcDoc={selectedArticle.content || ''}
                    className="w-full h-full border border-brand-light-gray"
                    title={selectedArticle.title}
                  />
                </div>
              ) : (
                <>
                  <div className="prose prose-lg max-w-none">
                    {parseArticleContent(selectedArticle.content || '')}
                  </div>

                  {/* Display attached images */}
                  {selectedArticle.images && selectedArticle.images.length > 0 && (
                    <div className="mt-12 pt-8 border-t border-brand-light-gray">
                      <h3 className="text-lg font-black uppercase tracking-tight mb-6 text-brand-accent">
                        첨부 이미지
                      </h3>
                      <div className="space-y-6">
                        {selectedArticle.images.map((imgUrl, idx) => (
                          <div key={idx} className="border border-brand-light-gray p-4 bg-brand-secondary">
                            <img 
                              src={imgUrl} 
                              alt={`${selectedArticle.title} 첨부 이미지 ${idx + 1}`}
                              className="w-full h-auto object-contain max-h-[600px]"
                              loading="lazy"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}

              <div className="mt-12 pt-8 border-t border-brand-light-gray flex justify-center">
                <button
                  onClick={() => setSelectedArticle(null)}
                  className="h-12 px-8 bg-brand-text text-brand-bg text-xs font-black uppercase tracking-widest hover:bg-brand-accent transition-colors"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Password Prompt Modal */}
      <AnimatePresence>
        {passwordPromptItem && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => {
              setPasswordPromptItem(null);
              setAttemptPassword('');
              setPasswordError('');
            }}
            className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-brand-text/95 backdrop-blur-md"
          >
            <motion.div 
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 50, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-brand-bg w-full max-w-md p-10 relative border border-brand-light-gray"
            >
              <button 
                onClick={() => {
                  setPasswordPromptItem(null);
                  setAttemptPassword('');
                  setPasswordError('');
                }}
                className="absolute top-8 right-8 p-2 hover:bg-brand-secondary transition-colors"
              >
                <X size={24} />
              </button>

              <div className="mb-8">
                <div className="flex h-10 w-10 items-center justify-center bg-brand-text text-brand-bg font-black text-sm mb-4">
                  <Lock size={20} />
                </div>
                <h2 className="text-2xl font-black uppercase tracking-tight mb-2">
                  비밀번호 입력
                </h2>
                <p className="text-brand-gray text-sm">
                  이 자료는 비밀번호로 보호되어 있습니다.
                </p>
              </div>

              {passwordError && (
                <div className="mb-6 p-4 bg-red-50 text-red-700 text-xs font-bold leading-relaxed border border-red-200">
                  {passwordError}
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest mb-3 text-brand-accent">비밀번호</label>
                  <input 
                    type="password" 
                    value={attemptPassword} 
                    onChange={e => setAttemptPassword(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handlePasswordSubmit()}
                    placeholder="자료 열람 비밀번호를 입력하세요"
                    autoFocus
                    className="w-full bg-brand-secondary border border-brand-light-gray h-12 px-4 text-xs font-bold focus:border-brand-text outline-none transition-colors"
                  />
                </div>

                <button
                  onClick={handlePasswordSubmit}
                  className="w-full h-12 bg-brand-text text-brand-bg font-black uppercase tracking-widest hover:bg-brand-accent transition-colors flex items-center justify-center gap-3"
                >
                  <Lock size={14} /> 확인
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
};
