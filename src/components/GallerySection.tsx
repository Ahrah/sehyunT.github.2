import { useState, useEffect, ChangeEvent, FormEvent, MouseEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Trash2, Image as ImageIcon, X, Link2, UploadCloud, Eye } from 'lucide-react';
import { collection, addDoc, getDocs, deleteDoc, doc, query, orderBy } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db, storage } from '../lib/firebase';

interface GalleryItem {
  id: string;
  title: string;
  description?: string;
  imageUrl: string;
  createdAt: any;
  storagePath?: string;
}

export const GallerySection = ({ isAdmin: propIsAdmin }: { isAdmin?: boolean }) => {
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<GalleryItem | null>(null);
  const [isAdminState, setIsAdminState] = useState<boolean>(
    propIsAdmin !== undefined ? propIsAdmin : (auth.currentUser?.email === "ahrah0365@gmail.com")
  );

  // Upload Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [uploadMode, setUploadMode] = useState<'file' | 'link'>('file');
  const [externalUrl, setExternalUrl] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

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
      let fetched: GalleryItem[] = [];
      try {
        const q = query(collection(db, 'gallery'), orderBy('createdAt', 'desc'));
        const querySnapshot = await getDocs(q);
        querySnapshot.forEach((docSnap) => {
          fetched.push({ id: docSnap.id, ...docSnap.data() } as GalleryItem);
        });
      } catch (orderErr) {
        console.warn("Ordered query fallback to unordered:", orderErr);
        const querySnapshot = await getDocs(collection(db, 'gallery'));
        querySnapshot.forEach((docSnap) => {
          fetched.push({ id: docSnap.id, ...docSnap.data() } as GalleryItem);
        });
        fetched.sort((a, b) => {
          const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : (a.createdAt ? new Date(a.createdAt).getTime() : 0);
          const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : (b.createdAt ? new Date(b.createdAt).getTime() : 0);
          return timeB - timeA;
        });
      }
      setItems(fetched);
    } catch (err) {
      console.error("Error fetching gallery items:", err);
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
      if (selected.size > 8 * 1024 * 1024) {
        setErrorMsg("파일 크기는 최대 8MB까지만 지원됩니다.");
        return;
      }
      setFile(selected);
      setErrorMsg('');
    }
  };

  const handleUploadSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMsg("제목을 입력해주세요.");
      return;
    }

    setUploading(true);
    setErrorMsg('');

    try {
      let finalImageUrl = "";
      let storagePath = "";

      if (uploadMode === 'file') {
        if (!file) {
          setErrorMsg("업로드할 사진 파일을 선택해주세요.");
          setUploading(false);
          return;
        }

        try {
          const path = `gallery/${Date.now()}_${file.name}`;
          const fileRef = ref(storage, path);
          const uploadResult = await uploadBytes(fileRef, file);
          finalImageUrl = await getDownloadURL(uploadResult.ref);
          storagePath = path;
        } catch (storageErr: any) {
          console.warn("Storage upload failed, falling back to base64 encoding", storageErr);
          // If storage isn't provisioned or permissions are missing, fall back to Base64 (resilient)
          if (file.size > 800 * 1024) { // 800KB Limit for Firestore
            throw new Error("사진 파일이 너무 큽니다. 외부 인프라가 비활성화 상태이므로 800KB 이하의 이미지 또는 '외부 링크 등록' 탭을 이용해주시기 바랍니다.");
          }
          finalImageUrl = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(file);
          });
        }
      } else {
        if (!externalUrl.trim()) {
          setErrorMsg("직접 주소(URL)를 입력해주세요.");
          setUploading(false);
          return;
        }
        finalImageUrl = externalUrl.trim();
      }

      await addDoc(collection(db, 'gallery'), {
        title: title.trim(),
        description: description.trim(),
        imageUrl: finalImageUrl,
        storagePath: storagePath || null,
        createdAt: new Date()
      });

      // Reset
      setTitle('');
      setDescription('');
      setFile(null);
      setExternalUrl('');
      setIsUploadOpen(false);
      fetchItems();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "업로드 중 오류가 발생했습니다.");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (item: GalleryItem, e: MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm("정말로 이 이미지를 삭제하시겠습니까?")) return;

    try {
      await deleteDoc(doc(db, 'gallery', item.id));
      
      if (item.storagePath) {
        try {
          const fileRef = ref(storage, item.storagePath);
          await deleteObject(fileRef);
        } catch (err) {
          console.warn("Could not delete from storage bucket:", err);
        }
      }
      
      setItems(items.filter(i => i.id !== item.id));
      if (selectedItem?.id === item.id) {
        setSelectedItem(null);
      }
    } catch (err) {
      console.error("Error deleting gallery item:", err);
    }
  };

  return (
    <section id="gallery" className="py-40 px-6 lg:px-8 bg-brand-bg">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-24 pb-12 border-b-2 border-brand-text/10">
          <div className="space-y-4">
            <p className="text-[10px] uppercase tracking-[0.5em] text-brand-accent font-black">Admissions Laboratory Archive</p>
            <h2 className="text-5xl md:text-6xl font-extrabold tracking-[-0.05em] uppercase leading-none">Gallery</h2>
          </div>
          <div className="flex items-center gap-6 mt-8 md:mt-0">
            <p className="text-brand-gray text-sm font-light max-w-sm italic hidden md:block">
              활동 및 포럼, 학회 참여 공식 기록 아카이브.
            </p>
            {isAdmin && (
              <button 
                onClick={() => setIsUploadOpen(true)}
                className="h-14 px-8 bg-brand-text text-brand-bg text-[10px] font-black uppercase tracking-widest hover:bg-brand-accent transition-colors flex items-center gap-3 cursor-pointer"
              >
                <Plus size={16} /> Add Photo
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {Array(3).fill(0).map((_, i) => (
              <div key={i} className="aspect-square bg-brand-secondary/50 border border-brand-light-gray animate-pulse" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="py-24 border border-dashed border-brand-light-gray text-center text-brand-gray font-black uppercase tracking-widest text-xs">
            등록된 갤러리 사진이 없습니다.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {items.map((item) => (
              <motion.div
                key={item.id}
                layoutId={`gallery-card-${item.id}`}
                onClick={() => setSelectedItem(item)}
                className="group relative aspect-square bg-brand-secondary border border-brand-light-gray overflow-hidden cursor-pointer shadow-md hover:shadow-xl hover:border-brand-text transition-all duration-500"
              >
                <img 
                  src={item.imageUrl} 
                  alt={item.title} 
                  loading="lazy"
                  decoding="async"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
                />
                
                {/* Overlay details */}
                <div className="absolute inset-0 bg-brand-text/80 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-all duration-500 p-8 flex flex-col justify-end text-brand-bg">
                  <div className="absolute top-6 right-6 flex gap-3">
                    {isAdmin && (
                      <button 
                        onClick={(e) => handleDelete(item, e)}
                        className="p-3 bg-red-600/90 text-white hover:bg-red-700 transition-colors rounded-none"
                        title="Delete"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                    <div className="p-3 bg-brand-accent text-brand-bg">
                      <Eye size={16} />
                    </div>
                  </div>
                  <h3 className="text-xl font-extrabold mb-3 line-clamp-1">{item.title}</h3>
                  <p className="text-xs text-brand-bg/60 line-clamp-2 font-light leading-relaxed">{item.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Upload Dialog */}
      <AnimatePresence>
        {isUploadOpen && (
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
                <div className="flex h-10 w-10 items-center justify-center bg-brand-text text-brand-bg font-black text-sm mb-4">+IMG</div>
                <h2 className="text-3xl font-black uppercase tracking-tighter">Add Photo</h2>
                <p className="text-brand-gray text-[10px] uppercase tracking-widest font-black">갤러리에 공개할 새 사진을 등록합니다.</p>
              </div>

              {errorMsg && (
                <div className="mb-6 p-4 bg-red-50 text-red-700 text-xs font-bold leading-relaxed border border-red-200">
                  {errorMsg}
                </div>
              )}

              <form onSubmit={handleUploadSubmit} className="space-y-6">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest mb-3 text-brand-accent">제목</label>
                  <input 
                    type="text" 
                    value={title} 
                    onChange={e => setTitle(e.target.value)}
                    placeholder="사진 또는 활동 제목을 입력해주세요"
                    className="w-full bg-brand-secondary border border-brand-light-gray h-12 px-4 text-xs font-bold focus:border-brand-text outline-none transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest mb-3 text-brand-accent">설명 (선택)</label>
                  <textarea 
                    value={description} 
                    onChange={e => setDescription(e.target.value)}
                    placeholder="포토 메모 또는 간략할 설명을 한글로 작성합니다"
                    rows={3}
                    className="w-full bg-brand-secondary border border-brand-light-gray p-4 text-xs font-bold focus:border-brand-text outline-none transition-colors resize-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest mb-3 text-brand-accent">등록 방식</label>
                  <div className="flex gap-4 mb-4">
                    <button
                      type="button"
                      onClick={() => setUploadMode('file')}
                      className={`flex-1 h-12 text-xs font-black uppercase tracking-widest border transition-colors ${uploadMode === 'file' ? 'bg-brand-text text-brand-bg border-brand-text' : 'border-brand-light-gray text-brand-gray hover:border-brand-text hover:text-brand-text'}`}
                    >
                      <span className="flex items-center justify-center gap-2"><UploadCloud size={14} /> 파일 선택</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setUploadMode('link')}
                      className={`flex-1 h-12 text-xs font-black uppercase tracking-widest border transition-colors ${uploadMode === 'link' ? 'bg-brand-text text-brand-bg border-brand-text' : 'border-brand-light-gray text-brand-gray hover:border-brand-text hover:text-brand-text'}`}
                    >
                      <span className="flex items-center justify-center gap-2"><Link2 size={14} /> 링크 입력</span>
                    </button>
                  </div>

                  {uploadMode === 'file' ? (
                    <div className="border border-dashed border-brand-light-gray hover:border-brand-text transition-colors p-8 text-center bg-brand-secondary flex flex-col items-center justify-center cursor-pointer relative">
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={handleFileChange}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      />
                      <ImageIcon className="text-brand-gray mb-3" size={28} />
                      <p className="text-xs font-black uppercase text-brand-gray tracking-wider">
                        {file ? file.name : "컴퓨터나 휴대폰에서 사진 선택"}
                      </p>
                      <p className="text-[10px] text-brand-gray/50 mt-1 font-bold">PNG, JPG, WEBP (최대 8MB)</p>
                    </div>
                  ) : (
                    <div>
                      <input 
                        type="url" 
                        value={externalUrl} 
                        onChange={e => setExternalUrl(e.target.value)}
                        placeholder="https://example.com/image.jpg"
                        className="w-full bg-brand-secondary border border-brand-light-gray h-12 px-4 text-xs font-bold focus:border-brand-text outline-none transition-colors"
                      />
                      <p className="text-[10px] text-brand-gray/50 mt-2 font-bold">구글 드라이브나 오픈된 이미지 다이렉트 주소를 입력하세요.</p>
                    </div>
                  )}
                </div>

                <div className="pt-4">
                  <button
                    type="submit"
                    disabled={uploading}
                    className="w-full h-16 bg-brand-text text-brand-bg font-black uppercase tracking-widest hover:bg-brand-accent transition-colors disabled:opacity-50 flex items-center justify-center gap-3"
                  >
                    {uploading ? "Uploading..." : "Publish Item"}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Expanded Lightbox */}
      <AnimatePresence>
        {selectedItem && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedItem(null)}
            className="fixed inset-0 z-[250] flex items-center justify-center p-6 bg-brand-text/95 backdrop-blur-xl"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-brand-bg max-w-4xl w-full flex flex-col md:flex-row shadow-2xl relative"
            >
              <button 
                onClick={() => setSelectedItem(null)}
                className="absolute top-6 right-6 p-2 bg-brand-bg hover:bg-brand-secondary transition-colors z-10"
              >
                <X size={24} />
              </button>

              <div className="md:w-3/5 bg-black flex items-center justify-center max-h-[60vh] md:max-h-[80vh] overflow-hidden">
                <img 
                  src={selectedItem.imageUrl} 
                  alt={selectedItem.title} 
                  referrerPolicy="no-referrer"
                  className="max-h-[60vh] md:max-h-[80vh] w-auto object-contain"
                />
              </div>

              <div className="md:w-2/5 p-10 md:p-14 flex flex-col justify-between">
                <div>
                  <div className="flex h-10 w-10 items-center justify-center bg-brand-text text-brand-bg font-black text-sm mb-6">PIC</div>
                  <h3 className="text-3xl font-black tracking-tight mb-6">{selectedItem.title}</h3>
                  <div className="prose prose-sm text-brand-gray font-light leading-relaxed whitespace-pre-wrap">
                    {selectedItem.description || "이 사진에 대한 추가 설명이 없습니다."}
                  </div>
                </div>

                <div className="mt-12 pt-6 border-t border-brand-light-gray flex justify-between items-center text-[10px] font-black uppercase text-brand-gray tracking-wider">
                  <span>Admissions Archive</span>
                  <span>{selectedItem.createdAt?.toDate ? selectedItem.createdAt.toDate().toLocaleDateString() : 'N/A'}</span>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
};
