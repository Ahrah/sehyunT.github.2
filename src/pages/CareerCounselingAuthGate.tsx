import { AnimatePresence } from 'motion/react';
import { AuthModal } from '../components/AuthModal';
import '../index.css';

export default function CareerCounselingAuthGate({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  return (
    <AnimatePresence>
      {open && (
        <div style={{ position: 'relative', zIndex: 1000 }}>
          <AuthModal onClose={onClose} />
        </div>
      )}
    </AnimatePresence>
  );
}
