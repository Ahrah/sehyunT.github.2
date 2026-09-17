import { useState, useEffect, ChangeEvent, FormEvent, MouseEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Trash2, FileText, Search, Download, X, Link2, UploadCloud, BookOpen } from 'lucide-react';
import { collection, addDoc, getDocs, deleteDoc, doc, query, orderBy } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db, storage } from '../lib/firebase';

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
}

export const ResourcesSection = ({ isAdmin: propIsAdmin }: { isAdmin?: boolean }) => {
  const [items, setItems] = useState<ResourceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isAdminState, setIsAdminState] = useState<boolean>(
    propIsAdmin !== undefined ? propIsAdmin : (auth.currentUser?.email === "ahrah0365@gmail.com")
  );
  const [selectedArticle, setSelectedArticle] = useState<ResourceItem | null>(null);

  // Upload Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [fileType, setFileType] = useState('pdf');
  const [uploadMode, setUploadMode] = useState<'file' | 'link'>('file');
  const [externalUrl, setExternalUrl] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [articleContent, setArticleContent] = useState('');

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

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      if (selected.size > 15 * 1024 * 1024) {
        setErrorMsg("파일 크기는 최대 15MB까지만 지원됩니다.");
        return;
      }
      setFile(selected);
      setErrorMsg('');
    }
  };

  const handleUploadSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    // Security: Only admin can upload
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

      if (uploadMode === 'file') {
        if (!file) {
          setErrorMsg("업로드할 자료 파일을 선택해주세요.");
          setUploading(false);
          return;
        }

        finalFileName = file.name;
        try {
          const path = `resources/${Date.now()}_${file.name}`;
          const fileRef = ref(storage, path);
          const uploadResult = await uploadBytes(fileRef, file);
          finalFileUrl = await getDownloadURL(uploadResult.ref);
          storagePath = path;
        } catch (storageErr: any) {
          console.warn("Storage upload failed, falling back to base64 encoding", storageErr);
          // Standard Firestore limit: 1MB. Max base64 payload should be < 800KB.
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
        if (!externalUrl.trim()) {
          setErrorMsg("자료 다운로드 URL 혹은 공유 링크를 입력해주세요.");
          setUploading(false);
          return;
        }
        finalFileUrl = externalUrl.trim();
        finalFileName = title.trim() + (fileType === 'pdf' ? '.pdf' : '.xlsx');
      }

      await addDoc(collection(db, 'resources'), {
        title: title.trim(),
        description: description.trim(),
        fileUrl: finalFileUrl,
        fileName: finalFileName,
        fileType: fileType,
        storagePath: storagePath || null,
        content: fileType === 'article' ? articleContent.trim() : null,
        createdAt: new Date()
      });

      // Reset Form
      setTitle('');
      setDescription('');
      setFileType('pdf');
      setFile(null);
      setExternalUrl('');
      setArticleContent('');
      setIsUploadOpen(false);
      fetchItems();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "자료 등록 중 오류가 발생했습니다.");
    } finally {
      setUploading(false);
    }
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
    // If it's an article, open in modal instead
    if (item.fileType === 'article') {
      setSelectedArticle(item);
      return;
    }
    
    // If it's a data url / base64 or self-hosted, we can trigger direct download
    if (item.fileUrl.startsWith('data:')) {
      const link = document.createElement("a");
      link.href = item.fileUrl;
      link.download = item.fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      // Normal external URL or raw cloud endpoint, open or trigger download in new tab
      window.open(item.fileUrl, '_blank');
    }
  };

  const parseArticleContent = (content: string) => {
    if (!content) return null;
    
    const lines = content.split('\n');
    const elements: JSX.Element[] = [];
    let key = 0;

    lines.forEach((line, idx) => {
      // Parse [H]...[/H] subheadings
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

      // Parse [HIGHLIGHT]...[/HIGHLIGHT] within text
      if (line.includes('[HIGHLIGHT]')) {
        const parts: (string | JSX.Element)[] = [];
        let remaining = line;
        let partKey = 0;

        while (remaining.includes('[HIGHLIGHT]')) {
          const startIdx = remaining.indexOf('[HIGHLIGHT]');
          const endIdx = remaining.indexOf('[/HIGHLIGHT]');
          
          if (endIdx === -1) break;

          // Text before highlight
          if (startIdx > 0) {
            parts.push(remaining.substring(0, startIdx));
          }

          // Highlighted text
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

      // Regular paragraph
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

  const filteredItems = items.filter(item => 
    item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <section id="resources" className="py-40 px-6 lg:px-8 bg-brand-secondary">
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
                className="group bg-brand-bg border border-brand-light-gray p-8 hover:border-brand-text transition-all duration-300 flex flex-col md:flex-row justify-between items-start md:items-center gap-8 relative overflow-hidden"
              >
                <div className="flex items-center gap-6">
                  <div className="h-14 w-14 bg-brand-secondary border border-brand-light-gray flex items-center justify-center text-brand-text shrink-0">
                    <FileText size={24} className="text-brand-accent group-hover:scale-110 transition-transform" />
                  </div>
                  <div>
                    <div className="flex items-center gap-4 mb-2">
                      <span className="text-[9px] font-black uppercase tracking-widest px-2.5 py-1 bg-brand-secondary text-brand-accent rounded-none">
                        {item.fileType.toUpperCase()}
                      </span>
                      <span className="text-[10px] text-brand-gray/60 font-bold">
                        {item.createdAt?.toDate ? item.createdAt.toDate().toLocaleDateString() : 'N/A'}
                      </span>
                    </div>
                    <h3 className="text-xl font-extrabold tracking-tight mb-2 group-hover:text-brand-accent transition-colors">
                      {item.title}
                    </h3>
                    <p className="text-xs text-brand-gray font-light max-w-2xl leading-relaxed">
                      {item.description || "이 학습자료에 대한 추가 설명이 기재되어 있지 않습니다."}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4 w-full md:w-auto md:shrink-0 pt-6 md:pt-0 border-t md:border-transparent border-brand-light-gray">
                  <button 
                    onClick={() => handleDownload(item)}
                    className="flex-1 md:flex-initial h-12 px-6 bg-brand-text text-brand-bg hover:bg-brand-accent transition-all text-xs font-black uppercase tracking-widest flex items-center justify-center gap-3 cursor-pointer"
                  >
                    {item.fileType === 'article' ? (
                      <><BookOpen size={14} /> Read Article</>
                    ) : (
                      <><Download size={14} /> Download File</>
                    )}
                  </button>
                  {isAdmin && (
                    <button 
                      onClick={(e) => handleDelete(item, e)}
                      className="p-3 border border-red-200 text-red-600 hover:bg-red-50 transition-colors"
                      title="자료 영구 삭제"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Upload Dialog */}
      <AnimatePresence>
        {isUploadOpen && isAdmin && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => { if (!uploading) setIsUploadOpen(false); }}
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
                onClick={() => setIsUploadOpen(false)}
                disabled={uploading}
                className="absolute top-8 right-8 p-2 hover:bg-brand-secondary transition-colors"
              >
                <X size={24} />
              </button>

              <div className="mb-8">
                <div className="flex h-10 w-10 items-center justify-center bg-brand-text text-brand-bg font-black text-sm mb-4">+DOC</div>
                <h2 className="text-3xl font-black uppercase tracking-tighter">Add Resource</h2>
                <p className="text-brand-gray text-[10px] uppercase tracking-widest font-black">자료실용 프리미엄 배포 자료를 등록합니다.</p>
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
                )}

                <div>
                  {fileType === 'article' ? null : uploadMode === 'file' ? (
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-widest mb-3 text-brand-accent">파일 선택</label>
                      <div className="border border-dashed border-brand-light-gray hover:border-brand-text transition-colors p-8 text-center bg-brand-secondary flex flex-col items-center justify-center cursor-pointer relative">
                        <input 
                          type="file" 
                          onChange={handleFileChange}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                        <FileText className="text-brand-gray mb-3" size={28} />
                        <p className="text-xs font-black uppercase text-brand-gray tracking-wider">
                          {file ? file.name : "컴퓨터나 모바일에서 학습 자료 선택"}
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

                <div className="pt-4">
                  <button
                    type="submit"
                    disabled={uploading}
                    className="w-full h-16 bg-brand-text text-brand-bg font-black uppercase tracking-widest hover:bg-brand-accent transition-colors disabled:opacity-50 flex items-center justify-center gap-3"
                  >
                    {uploading ? "Publishing Database..." : "Add to Library"}
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
                    {selectedArticle.createdAt?.toDate ? selectedArticle.createdAt.toDate().toLocaleDateString() : 'N/A'}
                  </span>
                </div>
                <h2 className="text-3xl md:text-4xl font-black uppercase tracking-tight mb-4 leading-tight">{selectedArticle.title}</h2>
                {selectedArticle.description && (
                  <p className="text-sm text-brand-gray leading-relaxed mb-8">
                    {selectedArticle.description}
                  </p>
                )}
              </div>

              <div className="prose prose-lg max-w-none">
                {parseArticleContent(selectedArticle.content || '')}
              </div>

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
    </section>
  );
};
