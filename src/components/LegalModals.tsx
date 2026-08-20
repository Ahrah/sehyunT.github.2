import { motion, AnimatePresence } from 'motion/react';
import { X, ShieldCheck, FileText } from 'lucide-react';

interface LegalModalProps {
  isOpen: boolean;
  type: 'privacy' | 'terms' | null;
  onClose: () => void;
}

export const LegalModal = ({ isOpen, type, onClose }: LegalModalProps) => {
  if (!isOpen || !type) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-[300] flex items-center justify-center p-4 sm:p-6 bg-brand-text/90 backdrop-blur-md"
      >
        <motion.div
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 30, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-brand-bg w-full max-w-3xl max-h-[85vh] flex flex-col border border-brand-light-gray shadow-2xl relative"
        >
          {/* Header */}
          <div className="p-6 sm:p-8 border-b border-brand-light-gray flex justify-between items-center bg-brand-secondary">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-brand-text text-brand-bg flex items-center justify-center">
                {type === 'privacy' ? <ShieldCheck size={20} /> : <FileText size={20} />}
              </div>
              <div>
                <h3 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-brand-text">
                  {type === 'privacy' ? '개인정보처리방침 (Privacy Policy)' : '이용약관 (Terms of Use)'}
                </h3>
                <p className="text-[10px] text-brand-gray font-bold tracking-widest uppercase mt-0.5">
                  입시는세연쌤 (SEH-YUN T.)
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2.5 text-brand-text hover:bg-brand-light-gray transition-colors cursor-pointer"
              aria-label="Close modal"
            >
              <X size={22} />
            </button>
          </div>

          {/* Body */}
          <div className="p-6 sm:p-10 overflow-y-auto space-y-8 text-xs sm:text-sm text-brand-text/80 leading-relaxed font-light">
            {type === 'privacy' ? (
              <>
                <div>
                  <h4 className="text-sm sm:text-base font-extrabold text-brand-text mb-3">제 1 조 (목적)</h4>
                  <p>
                    '입시는세연쌤'(이하 '회사' 또는 '서비스')은 정보주체의 자유와 권리 보호를 위해 「개인정보 보호법」 및 관계 법령이 정한 바를 준수하여, 적법하게 개인정보를 처리하고 안전하게 관리하고 있습니다. 본 방침은 이용자가 제공하는 개인정보가 어떠한 용도와 방식으로 이용되고 있으며 개인정보 보호를 위해 어떠한 조치가 취해지고 있는지 알려드립니다.
                  </p>
                </div>

                <div>
                  <h4 className="text-sm sm:text-base font-extrabold text-brand-text mb-3">제 2 조 (수집하는 개인정보 항목 및 수집방법)</h4>
                  <p className="mb-2">회사는 상담 신청, 회원가입 및 입시 컨설팅 서비스 제공을 위해 다음과 같은 최소한의 개인정보를 수집합니다.</p>
                  <ul className="list-disc pl-5 space-y-1 text-brand-text/70">
                    <li><strong>필수 수집 항목:</strong> 학부모/학생 성명, 연락처(휴대전화번호), 이메일 주소, 자녀 이름 및 학년/학교</li>
                    <li><strong>선택 수집 항목:</strong> 관심 컨설팅 프로그램, 목표 대학/학과, 성적 및 비교과 진로 관심사</li>
                    <li><strong>서비스 이용 과정에서 자동 생성/수집되는 항목:</strong> 접속 IP 정보, 쿠키, 서비스 이용 기록, 접속 로그</li>
                  </ul>
                </div>

                <div>
                  <h4 className="text-sm sm:text-base font-extrabold text-brand-text mb-3">제 3 조 (개인정보의 처리 목적)</h4>
                  <ul className="list-disc pl-5 space-y-1 text-brand-text/70">
                    <li>1:1 맞춤형 입시·학습 컨설팅 상담 접수 및 서비스 일정 조율</li>
                    <li>회원 가입 의사 확인, 본인 식별·인증, 회원자격 유지·관리</li>
                    <li>입시 분석 자료, 세미나 일정 및 신규 교육 프로그램 정보 안내</li>
                    <li>민원 처리 및 분쟁 조정을 위한 기록 보존</li>
                  </ul>
                </div>

                <div>
                  <h4 className="text-sm sm:text-base font-extrabold text-brand-text mb-3">제 4 조 (개인정보의 보유 및 이용 기간)</h4>
                  <p>
                    회사는 법령에 따른 개인정보 보유·이용기간 또는 정보주체로부터 개인정보를 수집 시에 동의받은 개인정보 보유·이용기간 내에서 개인정보를 처리·보유합니다.
                  </p>
                  <ul className="list-disc pl-5 space-y-1 mt-2 text-brand-text/70">
                    <li><strong>회원 가입 및 관리:</strong> 회원 탈퇴 시까지 (단, 관계 법령 위반에 따른 수사·조사 등이 진행 중인 경우에는 해당 수사·조사 종료 시까지)</li>
                    <li><strong>상담 및 컨설팅 문의 내역:</strong> 상담 및 컨설팅 계약 종료 후 3년 (전자상거래 등에서의 소비자보호에 관한 법률)</li>
                  </ul>
                </div>

                <div>
                  <h4 className="text-sm sm:text-base font-extrabold text-brand-text mb-3">제 5 조 (개인정보의 제3자 제공 및 위탁)</h4>
                  <p>
                    회사는 이용자의 개인정보를 제3자에게 무단으로 제공하지 않으며, 서비스 운영 및 데이터 보안을 위해 검증된 클라우드 인프라(Google Cloud / Firebase)에 한하여 안전하게 처리 및 보관을 위탁하고 있습니다.
                  </p>
                </div>

                <div>
                  <h4 className="text-sm sm:text-base font-extrabold text-brand-text mb-3">제 6 조 (개인정보 보호책임자 및 문의처)</h4>
                  <div className="bg-brand-secondary p-4 border border-brand-light-gray space-y-1 text-brand-text/80">
                    <p><strong>상호명:</strong> 입시는세연쌤 (SEH-YUN T.)</p>
                    <p><strong>사업자등록번호:</strong> 612-69-00756</p>
                    <p><strong>개인정보 보호책임자:</strong> 조세연</p>
                    <p><strong>문의 이메일:</strong> consultantsyssam@gmail.com</p>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div>
                  <h4 className="text-sm sm:text-base font-extrabold text-brand-text mb-3">제 1 조 (목적)</h4>
                  <p>
                    본 약관은 '입시는세연쌤'(이하 '회사')이 운영하는 온라인 플랫폼 및 입시·자기주도학습 컨설팅 서비스(이하 '서비스')의 이용과 관련하여 회사와 이용자 간의 권리, 의무 및 책임사항을 규정함을 목적으로 합니다.
                  </p>
                </div>

                <div>
                  <h4 className="text-sm sm:text-base font-extrabold text-brand-text mb-3">제 2 조 (용어의 정의)</h4>
                  <ul className="list-disc pl-5 space-y-1 text-brand-text/70">
                    <li><strong>"서비스"</strong>란 회사가 웹사이트를 통해 제공하는 교육 정보, 컨설팅 프로그램 안내, 자료실, 갤러리 및 회원 서비스 일체를 의미합니다.</li>
                    <li><strong>"이용자"</strong>란 웹사이트에 접속하여 본 약관에 따라 회사가 제공하는 서비스를 이용하는 회원 및 비회원을 말합니다.</li>
                    <li><strong>"컨설팅 계약"</strong>이란 1:1 진로/진학/학습 컨설팅을 위해 회사와 이용자 간에 별도로 체결하는 유·무상 서비스 약정을 의미합니다.</li>
                  </ul>
                </div>

                <div>
                  <h4 className="text-sm sm:text-base font-extrabold text-brand-text mb-3">제 3 조 (약관의 효력 및 개정)</h4>
                  <p>
                    회사는 본 약관의 내용을 이용자가 쉽게 알 수 있도록 사이트 하단에 게시합니다. 회사는 합리적인 사유가 발생할 경우 관련 법령을 위배하지 않는 범위 내에서 본 약관을 개정할 수 있으며, 개정된 약관은 공지 후 효력이 발생합니다.
                  </p>
                </div>

                <div>
                  <h4 className="text-sm sm:text-base font-extrabold text-brand-text mb-3">제 4 조 (지식재산권의 보호)</h4>
                  <p>
                    회사가 작성한 저작물(컨설팅 로드맵, 분석 리포트, 자료실 PDF 및 게시물, 사진 등)에 대한 저작권 및 기타 지식재산권은 회사에 귀속됩니다. 이용자는 회사의 사전 승낙 없이 복제, 송신, 출판, 배포, 방송 기타 방법에 의하여 영리목적으로 이용하거나 제3자에게 이용하게 하여서는 안 됩니다.
                  </p>
                </div>

                <div>
                  <h4 className="text-sm sm:text-base font-extrabold text-brand-text mb-3">제 5 조 (서비스 이용 및 제한)</h4>
                  <p>
                    이용자는 타인의 명의나 정보를 도용하여 가입하거나 자료를 무단 다운로드/재배포하는 등의 행위를 하여서는 안 되며, 회사는 부정 이용이 확인된 경우 서비스 이용을 제한할 수 있습니다.
                  </p>
                </div>

                <div>
                  <h4 className="text-sm sm:text-base font-extrabold text-brand-text mb-3">제 6 조 (사업자 정보 및 분쟁 해결)</h4>
                  <div className="bg-brand-secondary p-4 border border-brand-light-gray space-y-1 text-brand-text/80">
                    <p><strong>상호명:</strong> 입시는세연쌤</p>
                    <p><strong>사업자등록번호:</strong> 612-69-00756</p>
                    <p><strong>대표:</strong> 조세연</p>
                    <p><strong>고객 문의:</strong> consultantsyssam@gmail.com</p>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-brand-light-gray flex justify-end bg-brand-secondary">
            <button
              onClick={onClose}
              className="h-12 px-8 bg-brand-text text-brand-bg text-xs font-black uppercase tracking-widest hover:bg-brand-accent transition-colors cursor-pointer"
            >
              확인 (Close)
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
